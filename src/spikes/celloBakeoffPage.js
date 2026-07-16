// SPIKE page controller — shared by two listening tests, both of which ask P'Aim's ear ONE question
// and hold everything else identical (see src/spikes/celloBakeoff.js for the fairness contract):
//   /docs/spikes/cello-bakeoff.html — which cello LIBRARY? (A/B/C + D piano-only reference)
//   /docs/spikes/cello-soften.html  — which BOW WEIGHT of the chosen library? (p/mp/mf + D)
// The page picks its variant set from `window.SPIKE_VARIANTS`; everything else is the same harness.
import { supabase } from '../supabase.js'
import { VARIANTS, DYN_LAYERS, PIANO_ONLY, renderClip, bufferToMp3, measure, excerptRange,
  calibrateLevels, normalizeBuffer } from './celloBakeoff.js'

const IS_DYN = window.SPIKE_VARIANTS === 'dynamics'
const VARIANT_SET = IS_DYN ? DYN_LAYERS : VARIANTS
const SPIKE_SLUG = IS_DYN ? 'cello-soften' : 'cello-bakeoff'

const $ = (s) => document.querySelector(s)
const q = new URLSearchParams(location.search)
// songs.id is a uuid; the human-facing handle is songs.number, so ?song= takes the NUMBER
// ("เพลงจริงในแอพ เช่น id 1" in the brief = song #1 พระเจ้าเป็นความรัก).
const SONG_NO = Number(q.get('song') || 1)
// ~15–20s excerpt (brief §ตัวแปร). Auto-picked on a line boundary; ?to= overrides.
const TO_LI = q.get('to') != null ? Number(q.get('to')) : null

// `balance` is a RELATIVE nudge (×) around the measured lead-level default from calibrateLevels().
const state = { song: null, range: null, clips: {}, balance: 1, correctTuning: true,
  pianoKeepsMelody: false, negativeDelay: true, cal: null }
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
  $('#cal').textContent = `${IS_DYN ? 'ทั้ง 3 ชั้นเสียง' : 'เชลโล 3 ตัว'}ถูกปรับให้ดังเท่ากันแล้ว (${dbs}) · `
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
      })
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
        + `${celloReport ? ` · เชลโล ${celloReport.melodyNotes} โน้ต · หัวเสียงไต่ ${celloReport.attackMs}ms`
          + `${celloReport.shiftMs ? ` → เลื่อนก่อน ${celloReport.shiftMs}ms` : ' → ไม่เลื่อน'}` : ''}${oor}`
        + ` · ${((performance.now() - t0) / 1000).toFixed(1)}s · ${perf.length} events`
    } catch (e) {
      document.querySelector(`[data-meta="${v.id}"]`).innerHTML = `<b class="warn">พัง: ${e.message}</b>`
      console.error(v.id, e)
    }
  }
  log(IS_DYN ? 'พร้อมฟังแล้ว — สลับ p / mp / mf ไปมาได้เลย' : 'พร้อมฟังแล้ว — สลับ A/B/C/D ไปมาได้เลย')
}

async function main() {
  try {
    log('กำลังโหลดเพลง …')
    state.song = await loadSong()
    const bpm = state.song.content?.bpm
    state.range = TO_LI != null ? { fromLi: 0, toLi: TO_LI } : excerptRange(state.song.content, { bpm, targetSec: 20 })
    $('#songname').textContent = `เพลง #${state.song.number} ${state.song.title_th || ''} · คีย์ ${state.song.content?.key ?? '?'} · ${bpm ?? 92} bpm · ท่อนที่ตัดมา: บรรทัด ${state.range.fromLi}–${state.range.toLi}`
    await renderAll()
  } catch (e) { log('พัง: ' + e.message); console.error(e) }
}

const showBalance = () => {
  const db = 20 * Math.log10(state.balance)
  $('#makeupVal').textContent = state.balance === 1 ? 'ปกติ' : `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`
}
$('#makeup').addEventListener('input', (e) => { state.balance = Number(e.target.value); showBalance() })
$('#makeup').addEventListener('change', renderAll)
// tuning changes the cello audio → the fairness calibration must be re-measured for it
$('#tuning').addEventListener('change', (e) => { state.correctTuning = e.target.checked; state.cal = null; renderAll() })
$('#unison').addEventListener('change', (e) => { state.pianoKeepsMelody = e.target.checked; renderAll() })
$('#negdelay').addEventListener('change', (e) => { state.negativeDelay = e.target.checked; renderAll() })
$('#makeup').value = '1'
showBalance()

main()
