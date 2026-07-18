// SPIKE — the LISTENING page (docs/spikes/cello-listen.html). The clean player P'Aim liked (one clip
// at a time, a Stop button, a transport clock that names the note sounding now) — but with EVERY tuning
// knob available, each labelled in one line with what it does and what left/right mean. Treble taming
// sits on top; the rest fold into an "ขั้นสูง" section so the page stays clean.
// The engineer's original dump is still at cello-marcato.html. Everything not touched by a knob stays
// baked to P'Aim's approved values.
import { supabase } from '../supabase.js'
import { MARCATO, VIB_MIN_SEC, VIBRATO, renderClip, bufferToMp3,
  excerptRange, calibrateLevels, normalizeBuffer, buildPerformance } from './celloBakeoff.js'

const $ = (s) => document.querySelector(s)
const q = new URLSearchParams(location.search)
const SONG_NO = Number(q.get('song') || 1)
const FULL = q.get('full') != null
const log = (m) => { $('#log').textContent = m }

// live tuning state — starts at the values P'Aim approved / the measured fixes
const state = {
  tame: 8, vib: VIBRATO.maxDepthCents, head: 0.05, headKind: 'mp', shift: 10, arc: 0, balance: 1,
  vibGain: 0, vibUnsteady: 0, vibBow: 0, vibMin: VIB_MIN_SEC, fileLevel: 1,
  resonance: false, roundRobin: false,
}

// build the cello render config from the live knobs
const celloCfg = () => ({
  variantId: 'marcato-mp',
  headId: state.head > 0 ? (state.headKind === 'mf' ? 'staccato-mf' : 'staccato-mp') : null,
  headStrength: state.head, bodyShiftMs: state.shift,
  vibratoCents: state.vib, vibMinNoteSec: state.vibMin, vibGainDb: state.vibGain,
  vibUnsteady: state.vibUnsteady, vibBowPressure: state.vibBow,
  fileLevelAmount: state.fileLevel, trebleTameDb: state.tame,
  arcSpreadDb: state.arc, bowRoundRobin: state.roundRobin, pianoResonance: state.resonance,
})

// ── the knobs: label = what it is + what it helps; hint = ◀ left · right ▶ ─────────────────────
const pct = (v) => `${Math.round(v * 100)}%`
const KNOBS = [
  { key: 'tame',  label: '🎛 ความสม่ำเสมอ — กดโน้ต "แหบ" (ที่ถูกดึงเสียง) ให้เท่าโน้ต "ทุ้ม"', L: 'แหบ (เดิม)', R: 'สม่ำเสมอ',
    min: 0, max: 28, step: 1, fmt: (v) => v === 0 ? 'แหบ (เดิม)' : v >= 28 ? 'เท่ากันสุด' : `${v}` },
  { key: 'vib',   label: 'สั่นนิ้ว — ความโหยหวน/มีชีวิต', L: 'ไม่สั่น', R: 'สั่นลึก',
    min: 0, max: 22, step: 1, fmt: (v) => v === 0 ? 'ไม่สั่น' : `${v}` },
  { key: 'head',  label: 'ความแรงหัวโน้ต — ความเป็นจังหวะ', L: 'ไม่มีหัว (นุ่ม)', R: 'หัวชัด',
    min: 0, max: 0.5, step: 0.01, fmt: (v) => v === 0 ? 'ไม่มีหัว' : pct(v) },
  { key: 'shift', label: 'เลื่อนเวลาตัวโน้ต — กันฟังเหมือนช้า', L: 'ตรงบีต', R: 'มาก่อน',
    min: 0, max: 200, step: 5, fmt: (v) => `${v} ms` },
  { key: 'arc',   label: 'เส้นดัง-ค่อย — มิติทั้งเพลง (ชัดตอนฟังทั้งเพลง)', L: 'เรียบ', R: 'ดัง-ค่อยชัด',
    min: 0, max: 15, step: 1, fmt: (v) => v === 0 ? 'เรียบ' : `${v} dB` },
  { key: 'balance', label: 'ความดังเชลโล (เทียบเปียโน)', L: 'เบา', R: 'ดัง',
    min: 0.4, max: 2.4, step: 0.05, fmt: (v) => v === 1 ? 'ปกติ' : `${(20 * Math.log10(v)).toFixed(1)} dB` },
  // ── advanced ──
  { key: 'vibGain', adv: true, label: 'หรี่เสียงตอนสั่นนิ้ว', L: 'ไม่หรี่', R: 'หรี่ลง',
    min: -6, max: 0, step: 0.5, fmt: (v) => v === 0 ? 'ไม่หรี่' : `${v} dB` },
  { key: 'vibUnsteady', adv: true, label: 'สั่นไม่สม่ำเสมอ — เหมือนคนจริง', L: 'สม่ำเสมอ', R: 'ไม่สม่ำเสมอ',
    min: 0, max: 1, step: 0.05, fmt: (v) => v === 0 ? 'ปิด' : pct(v) },
  { key: 'vibBow', adv: true, label: 'แรงคันชักตอนสั่น — เนื้อเสียงขยับ', L: 'นิ่ง', R: 'ขยับมาก',
    min: 0, max: 1, step: 0.05, fmt: (v) => v === 0 ? 'ปิด' : pct(v) },
  { key: 'vibMin', adv: true, label: 'สั่นเฉพาะโน้ตยาวกว่า', L: 'สั่นทุกโน้ต', R: 'เฉพาะยาวมาก',
    min: 0, max: 1, step: 0.05, fmt: (v) => v === 0 ? 'สั่นทุกโน้ต' : `> ${v.toFixed(2)} วิ` },
  { key: 'fileLevel', adv: true, label: 'แก้ "วินาที-14" — ปรับไฟล์ให้ดังเท่ากัน', L: 'ปิด (บั๊กเดิม)', R: 'แก้เต็ม',
    min: 0, max: 1, step: 0.1, fmt: (v) => v === 0 ? 'ปิด' : v >= 1 ? 'แก้เต็ม' : pct(v) },
  { key: 'headKind', adv: true, type: 'select', label: 'ชนิดหัวโน้ต',
    options: [['mp', 'mp (นุ่มกว่า)'], ['mf', 'mf (แรงกว่า)']] },
  { key: 'resonance', adv: true, type: 'toggle', label: 'เสียงสายเปียโนกังวาน (เพิ่มความอิ่ม · ฟรี)' },
  { key: 'roundRobin', adv: true, type: 'toggle', label: 'คันชักคู่ขึ้น-ลง (ลดความเป็นหุ่น · อาจกระตุก)' },
]

// ── transport clock + which note is sounding ───────────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const KARO_PITCHES = [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84]
const noteName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
const nearestFile = (m) => KARO_PITCHES.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a, KARO_PITCHES[0])
let melTimeline = []
let timer = 0, curAudio = null
const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`
function tick() {
  if (!curAudio) return
  const t = curAudio.currentTime
  $('#tclock').textContent = fmtT(t)
  const n = melTimeline.filter((x) => x.t <= t + 0.03).slice(-1)[0]
  $('#tnote').innerHTML = n ? `โน้ต <b>${n.name}</b> · ไฟล์ ${n.file}` : '—'
}
function startClock(audio) { clearInterval(timer); curAudio = audio; tick(); timer = setInterval(tick, 100) }
function stopClock() { clearInterval(timer); curAudio = null }
function stopAll() {
  document.querySelectorAll('audio').forEach((a) => { a.pause(); a.currentTime = 0 })
  document.querySelectorAll('.card').forEach((c) => c.classList.remove('on'))
  document.querySelectorAll('.play').forEach((b) => { b.innerHTML = '▶︎ <span>เล่น</span>' })
  stopClock()
}

let song = null, range = null, baseMakeup = 1, songBpm = null, renderSeq = 0

async function loadSong() {
  const { data, error } = await supabase.from('songs').select('*').eq('number', SONG_NO).limit(1).single()
  if (error) throw new Error('โหลดเพลงไม่ได้: ' + error.message)
  return data
}

const PRESETS = [
  { id: 'piano', ref: true, label: '🎹 เปียโนอย่างเดียว', sub: 'เส้นเปรียบเทียบ', cfg: () => ({ variantId: 'none' }) },
  { id: 'cello', label: '🎻 เปียโน + เชลโล', sub: 'ปรับปุ่มข้างล่าง แล้วกดเล่นอันนี้ซ้ำ', cfg: celloCfg },
]

function card(p) {
  const el = document.createElement('div')
  el.className = 'card' + (p.ref ? ' ref' : '')
  el.innerHTML = `
    <button class="play" data-play="${p.id}" disabled>▶︎ <span>เล่น</span></button>
    <div class="txt"><b>${p.label}</b><div class="sub" data-sub="${p.id}">${p.sub}</div></div>
    <audio data-audio="${p.id}"></audio>`
  return el
}

async function renderPreset(p) {
  const btn = $(`[data-play="${p.id}"]`), audio = $(`[data-audio="${p.id}"]`)
  const seq = ++renderSeq
  btn.disabled = true
  try {
    const makeup = baseMakeup * (p.id === 'cello' ? state.balance : 1)
    const { buffer } = await renderClip(song.content, { bpm: songBpm, range, songId: song.id, celloMakeup: makeup, ...p.cfg() })
    if (seq !== renderSeq && p.id === 'cello') return
    normalizeBuffer(buffer)
    const blob = await bufferToMp3(buffer)
    if (audio.dataset.url) URL.revokeObjectURL(audio.dataset.url)
    const url = URL.createObjectURL(blob); audio.dataset.url = url; audio.src = url
    btn.disabled = false
    btn.onclick = () => {
      const wasPlaying = !audio.paused
      stopAll()
      if (!wasPlaying) {
        audio.play(); btn.closest('.card').classList.add('on')
        btn.innerHTML = '⏸ <span>หยุด</span>'; startClock(audio)
      }
    }
    audio.onended = () => { btn.closest('.card').classList.remove('on'); btn.innerHTML = '▶︎ <span>เล่น</span>'; stopClock() }
  } catch (e) {
    $(`[data-sub="${p.id}"]`).innerHTML = `<b class="warn">สร้างเสียงไม่ได้: ${e.message}</b>`
    console.error(p.id, e)
  }
}

const cello = () => PRESETS.find((p) => p.id === 'cello')
let reRenderReq = 0
async function reRenderCello() {   // any knob change → stop + rebuild just the cello clip
  stopAll()
  const my = ++reRenderReq
  log('กำลังปรับเสียง …')
  await renderPreset(cello())
  if (my === reRenderReq) log('พร้อม — กด "เล่น" อันเชลโลเพื่อฟังค่าใหม่')
}

// build the knob UI from the config
function buildKnobs() {
  for (const k of KNOBS) {
    const box = document.createElement('div')
    box.className = 'knob'
    if (k.type === 'toggle') {
      box.innerHTML = `<label class="ktog"><input type="checkbox" data-k="${k.key}"> ${k.label}</label>`
    } else if (k.type === 'select') {
      const opts = k.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')
      box.innerHTML = `<div class="klab">${k.label}</div><select data-k="${k.key}">${opts}</select>`
    } else {
      box.innerHTML = `<div class="klab">${k.label}</div>
        <div class="krow"><input type="range" data-k="${k.key}" min="${k.min}" max="${k.max}" step="${k.step}">
          <span class="kval" data-kv="${k.key}"></span></div>
        <div class="khint">◀ ${k.L} · ${k.R} ▶</div>`
    }
    ;(k.adv ? $('#knobsAdv') : $('#knobs')).appendChild(box)
    // init + wire
    if (k.type === 'toggle') {
      const el = box.querySelector('input')
      el.checked = !!state[k.key]
      el.addEventListener('change', (e) => { state[k.key] = e.target.checked; reRenderCello() })
    } else if (k.type === 'select') {
      const el = box.querySelector('select')
      el.value = state[k.key]
      el.addEventListener('change', (e) => { state[k.key] = e.target.value; reRenderCello() })
    } else {
      const el = box.querySelector('input'), val = box.querySelector(`[data-kv="${k.key}"]`)
      el.value = String(state[k.key])
      const show = () => { val.textContent = k.fmt ? k.fmt(state[k.key]) : `${state[k.key]}` }
      el.addEventListener('input', (e) => { state[k.key] = Number(e.target.value); show() })
      el.addEventListener('change', reRenderCello)
      show()
    }
  }
}

async function main() {
  try {
    buildKnobs()
    $('#stopBtn')?.addEventListener('click', stopAll)
    log('กำลังโหลดเพลง …')
    song = await loadSong()
    songBpm = song.content?.bpm
    range = FULL ? null : excerptRange(song.content, { bpm: songBpm, targetSec: 20 })
    $('#songname').textContent = `เพลง #${song.number} ${song.title_th || ''} · คีย์ ${song.content?.key ?? '?'} · ${songBpm ?? 92} bpm`
      + (range ? ' · ท่อนแรก ~20 วิ' : ' · ทั้งเพลง ~80 วิ')

    $('#cards').innerHTML = ''
    for (const p of PRESETS) $('#cards').appendChild(card(p))

    const { perf, bpm: useBpm } = buildPerformance(song.content, { bpm: songBpm, range, songId: song.id })
    const spb = 60 / useBpm
    melTimeline = perf.filter((e) => e.role === 'melody').map((e) => {
      const t = e.startBeat * spb + (e.timeShift || 0) / 1000
      return { t, midi: e.midi, name: noteName(e.midi), file: nearestFile(e.midi) }
    })

    log('กำลังปรับให้เชลโลดังพอดีกับเปียโน …')
    const marc = MARCATO.find((m) => m.id === 'marcato-mp')
    const cal = await calibrateLevels(song.content, { bpm: songBpm, range, songId: song.id, variants: [marc] })
    baseMakeup = cal.leadMakeup * (cal.gains['marcato-mp'] ?? 1)

    for (const p of PRESETS) { log(`กำลังสร้างเสียง ${p.label} …`); await renderPreset(p) }
    log('พร้อมฟังแล้ว — ปรับปุ่มแล้วกด "เล่น" อันเชลโลซ้ำเพื่อฟังผล')
  } catch (e) { log('พัง: ' + e.message); console.error(e) }
}

main()
