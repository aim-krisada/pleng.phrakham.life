// SPIKE page controller — shared by two listening tests, both of which ask P'Aim's ear ONE question
// and hold everything else identical (see src/spikes/celloBakeoff.js for the fairness contract):
//   /docs/spikes/cello-bakeoff.html — which cello LIBRARY? (A/B/C + D piano-only reference)
//   /docs/spikes/cello-soften.html  — which BOW WEIGHT of the chosen library? (p/mp/mf + D)
// The page picks its variant set from `window.SPIKE_VARIANTS`; everything else is the same harness.
import { supabase } from '../supabase.js'
import { VARIANTS, DYN_LAYERS, MARCATO, PAIM_MARCATO, VIBRATO, VIB_MIN_SEC, PIANO_ONLY, renderClip,
  bufferToMp3, measure, excerptRange, calibrateLevels, normalizeBuffer } from './celloBakeoff.js'
import { spreadDb } from './verifyVibArc.js'

const MODE = window.SPIKE_VARIANTS || 'libraries'
const IS_DYN = MODE === 'dynamics'
const IS_MARC = MODE === 'marcato'
const VARIANT_SET = IS_MARC ? MARCATO : IS_DYN ? DYN_LAYERS : VARIANTS
const SPIKE_SLUG = IS_MARC ? 'cello-marcato' : IS_DYN ? 'cello-soften' : 'cello-bakeoff'

const $ = (s) => document.querySelector(s)
const q = new URLSearchParams(location.search)
// songs.id is a uuid; the human-facing handle is songs.number, so ?song= takes the NUMBER
// ("เพลงจริงในแอพ เช่น id 1" in the brief = song #1 พระเจ้าเป็นความรัก).
const SONG_NO = Number(q.get('song') || 1)
// ~15–20s excerpt (brief §ตัวแปร). Auto-picked on a line boundary; ?to= overrides.
const TO_LI = q.get('to') != null ? Number(q.get('to')) : null

// `balance` is a RELATIVE nudge (×) around the measured lead-level default from calibrateLevels().
const state = { song: null, range: null, clips: {}, balance: 1, correctTuning: true,
  pianoKeepsMelody: false, negativeDelay: true, cal: null,
  // P'Aim's two marcato knobs — start at the values HE turned them to and approved (PAIM_MARCATO)
  headStrength: PAIM_MARCATO.headStrength, bodyShiftMs: PAIM_MARCATO.bodyShiftMs,
  // vibrato: 0 = off, exactly how the library ships it. P'Aim's third knob.
  vibratoCents: 0,
  // 5.2 — the two things P'Aim asked for after approving vibrato at 22. These start at 0 = today's
  // sound, so each A/Bs against the exact clip he approved (verified bit-identical).
  vibGainDb: 0, vibUnsteady: 0, vibBowPressure: 0,
  // ...except the length rule, which starts ON at the physics threshold (354 ms), because it IS the
  // thing P'Aim asked for ("ห้ามใส่คงที่ทุกโน้ต · ทำกฎอัตโนมัติ") rather than an extra to try. Safe to
  // default ON: vibrato itself defaults to OFF, so the "bit-identical to his approved clip" contract
  // is untouched — the rule can only act once he turns vibrato up. Slide it to 0 to hear the
  // every-note vibrato he first called "มิติชัดขึ้นจริง ๆ".
  vibMinNoteSec: VIB_MIN_SEC,
  // 5.4 — the "โน้ตวินาที 14 ดังผิดปกติ" fix. Defaults ON (full) because P'Aim reported it as a BUG
  // and the source is a measurement, not a taste: the library's level zigzags 10 direction-flips /
  // 16 steps (worst 12.6 dB between neighbouring files) = take-to-take variation, not a cello's
  // natural contour. The 4 values he locked (head 5% · shift 10ms · body p · head mp) are untouched.
  // Slide to 0 for the exact pre-fix sound.
  fileLevelAmount: 1,
  // 5.3 — loud-soft arc. 0 = today. `fullSong` matters: the 20s clip is only the first 24% of the
  // song, so the arc barely shows in it — he has to hear the whole song for the knob to mean anything.
  arcSpreadDb: 0, fullSong: false,
  // bow round-robin: off = today's sound, so A/B is direct
  bowRoundRobin: false,
  // piano string resonance: off = today's sound
  pianoResonance: false }
const log = (m) => { $('#log').textContent = m }

async function loadSong() {
  const { data, error } = await supabase.from('songs').select('*').eq('number', SONG_NO).limit(1).single()
  if (error) throw new Error('โหลดเพลงไม่ได้: ' + error.message)
  return data
}

function card(v, isRef) {
  const el = document.createElement('div')
  el.className = 'card' + (isRef ? ' ref' : '')
  el.innerHTML = `
    <div class="hd"><b>${v.label}</b><span class="lic">${v.licence}</span></div>
    <div class="note">${v.note}</div>
    <div class="controls"><button data-play="${v.id}" disabled>▶︎ เล่น</button>
      <a class="dl" data-dl="${v.id}" hidden download>⬇︎ โหลดไฟล์</a></div>
    <audio data-audio="${v.id}" controls hidden></audio>
    <div class="meta" data-meta="${v.id}"></div>`
  return el
}

async function renderAll() {
  const all = [...VARIANT_SET, PIANO_ONLY]
  $('#cards').innerHTML = ''
  for (const v of all) $('#cards').appendChild(card(v, v.id === 'none'))

  // level-match the 3 cellos over THIS phrase before anything is heard (see calibrateLevels)
  if (!state.cal) {
    log('กำลังปรับให้ทั้ง 3 แบบดังเท่ากัน (เพื่อความยุติธรรม) …')
    state.cal = await calibrateLevels(state.song.content, {
      bpm: state.song.content?.bpm, range: state.range, songId: state.song.id,
      correctTuning: state.correctTuning, variants: VARIANT_SET,
    })
  }
  const dbs = Object.entries(state.cal.gains)
    .map(([k, g]) => `${k} ${(20 * Math.log10(g)).toFixed(1)}dB`).join(' · ')
  const calEl = $('#cal')
  if (calEl) calEl.textContent = IS_MARC
    ? `ตัวโน้ต (p) เหมือนกันทั้ง 3 คลิป — ต่างกันแค่หัวโน้ต · ทุกคลิปดังเท่ากันตอนเล่น`
    : `${IS_DYN ? 'ทั้ง 3 ชั้นเสียง' : 'เชลโล 3 ตัว'}ถูกปรับให้ดังเท่ากันแล้ว (${dbs}) · `
      + `ระดับเริ่มต้นตั้งเท่ากับ "ทำนองของเปียโน" ที่วัดได้ · ทุกคลิปถูกปรับให้ดังเท่ากันตอนเล่น`

  for (const v of all) {
    log(`กำลังสร้างเสียง ${v.label} …`)
    try {
      const t0 = performance.now()
      const { buffer, celloReport, perf } = await renderClip(state.song.content, {
        variantId: v.id, bpm: state.song.content?.bpm, range: state.range,
        // songId seeds the arranger's RNG -> identical piano performance in every clip (fairness)
        songId: state.song.id, correctTuning: state.correctTuning,
        // measured lead-level default × P'Aim's nudge × this library's fairness gain
        celloMakeup: state.cal.leadMakeup * state.balance * (state.cal.gains[v.id] ?? 1),
        pianoKeepsMelody: state.pianoKeepsMelody, negativeDelay: state.negativeDelay,
        headId: v.head || null, headStrength: state.headStrength, bodyShiftMs: state.bodyShiftMs,
        vibratoCents: state.vibratoCents, bowRoundRobin: state.bowRoundRobin,
        pianoResonance: state.pianoResonance,
        vibGainDb: state.vibGainDb, vibUnsteady: state.vibUnsteady,
        vibBowPressure: state.vibBowPressure, vibMinNoteSec: state.vibMinNoteSec,
        arcSpreadDb: state.arcSpreadDb, fileLevelAmount: state.fileLevelAmount,
      })
      // MEASURE the loud-soft line that actually came out, and show it. The arc knob asks for a dB;
      // the sound has to be checked against it rather than assumed (the request does NOT arrive
      // intact — the arranger's velocity map eats part of it). Measured BEFORE normalize; a single
      // gain can't change a spread, but measuring the thing itself beats reasoning about it.
      const sp = spreadDb(buffer)
      normalizeBuffer(buffer)          // all 4 clips play at one loudness (see normalizeBuffer)
      const m = measure(buffer)
      const blob = await bufferToMp3(buffer)
      if (state.clips[v.id]?.url) URL.revokeObjectURL(state.clips[v.id].url)
      const url = URL.createObjectURL(blob)
      state.clips[v.id] = { url, m }
      const audio = document.querySelector(`[data-audio="${v.id}"]`)
      audio.src = url; audio.hidden = false
      const dl = document.querySelector(`[data-dl="${v.id}"]`)
      dl.href = url; dl.download = `${SPIKE_SLUG}-${v.id}.mp3`; dl.hidden = false
      const btn = document.querySelector(`[data-play="${v.id}"]`)
      btn.disabled = false
      btn.onclick = () => { document.querySelectorAll('audio').forEach((a) => { a.pause(); a.currentTime = 0 }); audio.play() }
      const oor = celloReport?.outOfRange?.length
        ? ` · <b class="warn">โน้ตนอกช่วงเชลโลจริง: ${celloReport.outOfRange.join(', ')}</b>` : ''
      document.querySelector(`[data-meta="${v.id}"]`).innerHTML =
        `${m.seconds.toFixed(1)}s · ${(blob.size / 1024).toFixed(0)} KB · peak ${m.peakDb.toFixed(1)}dB`
        + ` · RMS ${m.rmsDb.toFixed(1)}dB${m.clipped ? ' · <b class="warn">CLIP!</b>' : ''}`
        + `${celloReport ? ` · เชลโล ${celloReport.melodyNotes} โน้ต · ตัวโน้ตไต่ ${celloReport.attackMs}ms`
          + `${celloReport.shiftMs ? ` → เลื่อนก่อน ${celloReport.shiftMs}ms` : ' → ไม่เลื่อน'}`
          + `${celloReport.head ? ` · หัวโน้ต ${celloReport.head.headId.replace('staccato-','')} ไต่ ${celloReport.head.attackMs}ms × ${Math.round(celloReport.head.strength*100)}%` : ''}`
          + `${celloReport.vib ? ` · สั่นนิ้ว ${celloReport.vib.vibrated}/${celloReport.vib.vibrated+celloReport.vib.plain} โน้ต (${celloReport.vib.pct}% · กฎอัตโนมัติ)` : ''}` : ''}${oor}`
        + ` · <b>เส้นดัง-ค่อยที่วัดได้จริง ${sp.spread.toFixed(1)} dB</b> (ของจริง 13.4–15.1)`
        + ` · ${((performance.now() - t0) / 1000).toFixed(1)}s · ${perf.length} events`
    } catch (e) {
      document.querySelector(`[data-meta="${v.id}"]`).innerHTML = `<b class="warn">พัง: ${e.message}</b>`
      console.error(v.id, e)
    }
  }
  log(IS_MARC ? 'พร้อมฟังแล้ว — หมุนปุ่มจนพอดีหูแล้วบอกค่ามาได้เลยครับ '
    + '("สั่นนิ้ว" เริ่มที่ปิด = เสียงเดิมที่เคาะไว้เป๊ะทุกบิต · เปิดสั่นเมื่อไหร่ กฎ ④ จะทำงานให้เอง)'
    : IS_DYN ? 'พร้อมฟังแล้ว — สลับ p / mp / mf ไปมาได้เลย' : 'พร้อมฟังแล้ว — สลับ A/B/C/D ไปมาได้เลย')
}

async function main() {
  try {
    log('กำลังโหลดเพลง …')
    state.song = await loadSong()
    const bpm = state.song.content?.bpm
    // range null = the WHOLE song. Needed for the arc knob to mean anything (see #fullsong).
    state.range = state.fullSong ? null
      : TO_LI != null ? { fromLi: 0, toLi: TO_LI }
        : excerptRange(state.song.content, { bpm, targetSec: 20 })
    $('#songname').textContent = `เพลง #${state.song.number} ${state.song.title_th || ''} · คีย์ ${state.song.content?.key ?? '?'} · ${bpm ?? 92} bpm · `
      + (state.range ? `ท่อนที่ตัดมา: บรรทัด ${state.range.fromLi}–${state.range.toLi} (≈20 วิ = 24% แรกของเพลง)` : 'ทั้งเพลง (≈80 วิ)')
    await renderAll()
  } catch (e) { log('พัง: ' + e.message); console.error(e) }
}

// controls differ per page → bind only what exists
const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn) }

const showBalance = () => {
  const db = 20 * Math.log10(state.balance)
  const el = $('#makeupVal')
  if (el) el.textContent = state.balance === 1 ? 'ปกติ' : `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`
}
on('#makeup', 'input', (e) => { state.balance = Number(e.target.value); showBalance() })
on('#makeup', 'change', renderAll)
// tuning changes the cello audio → the fairness calibration must be re-measured for it
on('#tuning', 'change', (e) => { state.correctTuning = e.target.checked; state.cal = null; renderAll() })
on('#unison', 'change', (e) => { state.pianoKeepsMelody = e.target.checked; renderAll() })
on('#negdelay', 'change', (e) => { state.negativeDelay = e.target.checked; renderAll() })

// ── P'Aim's 2 marcato knobs ──────────────────────────────────────────────────────────────────
// The point of these being knobs: "how hard should the head be" and "does the body still need
// shifting once the head marks the beat" are both things SA cannot hear. So P'Aim turns them until
// it sits right and we record the number — instead of me guessing and looping.
const showHead = () => {
  const el = $('#headVal')
  if (el) el.textContent = state.headStrength === 0 ? 'ปิด (p ล้วน)' : `${Math.round(state.headStrength * 100)}%`
}
const showShift = () => {
  const el = $('#shiftVal')
  if (el) el.textContent = state.bodyShiftMs === null ? 'อัตโนมัติ (200ms)' : `${state.bodyShiftMs} ms`
}
on('#head', 'input', (e) => { state.headStrength = Number(e.target.value); showHead() })
on('#head', 'change', renderAll)
on('#shift', 'input', (e) => { state.bodyShiftMs = Number(e.target.value); showShift() })
on('#shift', 'change', renderAll)

// vibrato knob — the library ships this OFF with the recordist's own numbers; P'Aim decides if the
// "ขาดมิติลุ่มลึก" he described wants it on.
const showVib = () => {
  const el = $('#vibVal')
  if (el) el.textContent = state.vibratoCents === 0
    ? 'ปิด (เหมือนที่คนอัดตั้งมา)'
    : `${state.vibratoCents} cents${state.vibratoCents >= VIBRATO.maxDepthCents ? ' (สุดที่เขาแนะนำ)' : ''}`
}
on('#vib', 'input', (e) => { state.vibratoCents = Number(e.target.value); showVib() })
on('#vib', 'change', renderAll)
showVib()

// ── 5.2 · the two fixes P'Aim asked for after approving vibrato at 22 ────────────────────────────
// (ก) "เสียงดังขึ้นด้วย ต้องลด volume แต่ยังโหยหวนได้". Measured: vibrato adds NO energy (RMS −0.09 dB,
//     >2 kHz −0.05 dB), so there was no bug to fix — the shake makes the line stand out, and a trim
//     takes the level back without touching the shake the โหยหวน lives in. How much = his ear.
// (ข) "ต้องไม่ใส่เหมือนกันคงที่เสมอไป มันจะน่ารำคาญ" → the recordist built three answers to exactly
//     this and we had taken only one (delay/fade). The other two are the next two knobs, plus the
//     long-notes-only rule P'Aim asked for.
const bindKnob = (sel, key, fmt, opts = {}) => {
  const valEl = $(sel + 'Val')
  const show = () => { if (valEl) valEl.textContent = fmt(state[key]) }
  on(sel, 'input', (e) => { state[key] = Number(e.target.value); show() })
  on(sel, 'change', () => { if (opts.recal) state.cal = null; renderAll() })
  show()
}
bindKnob('#vibgain', 'vibGainDb', (v) => (v === 0 ? 'ไม่หรี่ (เท่าตอนนี้)' : `${v.toFixed(1)} dB`), { recal: true })
bindKnob('#vibuns', 'vibUnsteady', (v) => (v === 0 ? 'ปิด (สั่นเท่ากันทุกโน้ต)' : `${Math.round(v * 100)}%`))
bindKnob('#vibbow', 'vibBowPressure', (v) => (v === 0 ? 'ปิด (คันชักนิ่ง)' : `${Math.round(v * 100)}%`))
// ④ is the auto rule's threshold, not an on/off. The rule decides per note by itself (that is
// P'Aim's "กฎอัตโนมัติ · 124 เพลงไม่ต้องจูนทีละเพลง"); this knob is his "แต่ถ้าคนใช้อยากปรับก็ปรับได้" half.
bindKnob('#vibmin', 'vibMinNoteSec', (v) => (v === 0 ? 'ปิดกฎ = สั่นทุกโน้ต'
  : Math.abs(v - VIB_MIN_SEC) < 0.005 ? `อัตโนมัติ (${v.toFixed(2)} วิ — ค่าที่ฟิสิกส์บอก)`
    : `ยาวกว่า ${v.toFixed(2)} วิ`))

// ── 5.3 · the loud-soft arc ──────────────────────────────────────────────────────────────────────
bindKnob('#arc', 'arcSpreadDb', (v) => (v === 0 ? 'ปิด (เท่าตอนนี้)' : `กว้าง ${v.toFixed(0)} dB`))
// ⑥ the bug fix, not a taste knob — but still turnable so P'Aim can hear the "before".
bindKnob('#flvl', 'fileLevelAmount', (v) => (v === 0 ? '⛔ ปิด = เสียงเดิมที่มีบั๊ก'
  : v >= 1 ? 'แก้เต็ม (แนะนำ)' : `แก้ ${Math.round(v * 100)}%`))
// The 20s clip is only the FIRST 24% of the song (measured) and the climax sits at 58% — so inside
// the short clip the arc has almost nothing to do. Without this switch P'Aim would turn the arc
// knob, hear nothing, and correctly conclude it was a dud, for the wrong reason.
on('#fullsong', 'change', (e) => { state.fullSong = e.target.checked; state.cal = null; main() })

// bow round-robin — P'Aim asked for a button to TRY it. The numbers say the condition is real
// (~31% of notes replay the same file), but he has never once complained of it, so the measurement
// only proves the disease exists, not that the ear is sick. Off by default = direct A/B.
on('#rr', 'change', (e) => { state.bowRoundRobin = e.target.checked; state.cal = null; renderAll() })

// piano string resonance — Splendid shipped the map, we never loaded it. +0 MB (reuses PP).
on('#res', 'change', (e) => { state.pianoResonance = e.target.checked; renderAll() })

if ($('#makeup')) $('#makeup').value = '1'
showBalance()
if (IS_MARC) {
  state.headStrength = PAIM_MARCATO.headStrength
  state.bodyShiftMs = PAIM_MARCATO.bodyShiftMs
  if ($('#shift')) $('#shift').value = String(PAIM_MARCATO.bodyShiftMs)
  if ($('#head')) $('#head').value = String(PAIM_MARCATO.headStrength)
  // the auto rule ships ON — push its value INTO the slider so the control agrees with what is
  // actually rendering. A slider parked at 0 while the engine runs the rule is a lying UI.
  if ($('#vibmin')) {
    $('#vibmin').value = String(VIB_MIN_SEC)
    $('#vibmin').dispatchEvent(new Event('input'))
  }
}
showHead(); showShift()

main()
