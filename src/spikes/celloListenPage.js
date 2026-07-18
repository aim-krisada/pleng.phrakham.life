// SPIKE — the LISTENING page (docs/spikes/cello-listen.html). P'Aim's decision surface, not the
// engineer's debug page (cello-marcato.html has every knob). Kept to the MINIMUM he needs right now:
//   • a reference (piano only) + the cello, level-matched, same golden piano / song / excerpt
//   • ONE knob — "ความนุ่ม" = trebleTameDb — because taming the cello's bright upper notes is a taste
//     amount only P'Aim's ear can set (he asked to turn it himself, 18 ก.ค.). 0 = today (แสบ).
//   • a transport CLOCK + the note sounding right now, so he can point at the exact moment an artifact
//     appears ("horn sound at 0:08 = this note") and I map it straight to a note + sample file.
// Everything else stays baked to his approved values (body p · head mp 5% · shift 10ms · vibrato 22
// gated to long notes · second-14 fix).
import { supabase } from '../supabase.js'
import { MARCATO, VIB_MIN_SEC, VIBRATO, renderClip, bufferToMp3,
  excerptRange, calibrateLevels, normalizeBuffer, buildPerformance } from './celloBakeoff.js'

const CELLO_BASE = { variantId: 'marcato-mp', headId: 'staccato-mp', headStrength: 0.05,
  bodyShiftMs: 10, fileLevelAmount: 1, vibratoCents: VIBRATO.maxDepthCents, vibMinNoteSec: VIB_MIN_SEC }

const PRESETS = [
  { id: 'piano', ref: true, label: '🎹 เปียโนอย่างเดียว', sub: 'เส้นเปรียบเทียบ (เสียงที่ใช้จริงตอนนี้)',
    cfg: () => ({ variantId: 'none' }) },
  { id: 'cello', label: '🎻 เปียโน + เชลโล', sub: 'ปรับ "ความนุ่ม" ด้วยแถบข้างล่าง แล้วกดเล่นซ้ำ',
    cfg: () => ({ ...CELLO_BASE, trebleTameDb: state.tame }) },
]

const $ = (s) => document.querySelector(s)
const q = new URLSearchParams(location.search)
const SONG_NO = Number(q.get('song') || 1)
const FULL = q.get('full') != null    // ?full = whole song (~80s) so the whole arc is audible
const log = (m) => { $('#log').textContent = m }

const state = { tame: 8 }              // ความนุ่ม (dB high-shelf cut at the top note); 0 = today (แสบ)
let song = null, range = null, celloMakeup = 1, songBpm = null, renderSeq = 0

// ── transport clock + which note is sounding (P'Aim 18 ก.ค.) ──────────────────────────────────
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
// setInterval, not requestAnimationFrame — rAF is paused when the tab is backgrounded; a 100ms timer
// keeps ticking, and P'Aim needs the clock reliable while he watches for the artifact.
function startClock(audio) { clearInterval(timer); curAudio = audio; tick(); timer = setInterval(tick, 100) }
function stopClock() { clearInterval(timer); curAudio = null }   // keep last time on screen

async function loadSong() {
  const { data, error } = await supabase.from('songs').select('*').eq('number', SONG_NO).limit(1).single()
  if (error) throw new Error('โหลดเพลงไม่ได้: ' + error.message)
  return data
}

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
    const { buffer } = await renderClip(song.content, { bpm: songBpm, range, songId: song.id, celloMakeup, ...p.cfg() })
    if (seq !== renderSeq && p.id === 'cello') return   // a newer slider change superseded this render
    normalizeBuffer(buffer)
    const blob = await bufferToMp3(buffer)
    if (audio.dataset.url) URL.revokeObjectURL(audio.dataset.url)
    const url = URL.createObjectURL(blob); audio.dataset.url = url; audio.src = url
    btn.disabled = false
    btn.onclick = () => {
      const playing = !audio.paused
      document.querySelectorAll('audio').forEach((a) => { a.pause(); a.currentTime = 0 })
      document.querySelectorAll('.card').forEach((c) => c.classList.remove('on'))
      stopClock()
      if (!playing) { audio.play(); btn.closest('.card').classList.add('on'); startClock(audio) }
    }
    audio.onended = () => { btn.closest('.card').classList.remove('on'); stopClock() }
    audio.onpause = () => stopClock()
  } catch (e) {
    $(`[data-sub="${p.id}"]`).innerHTML = `<b class="warn">สร้างเสียงไม่ได้: ${e.message}</b>`
    console.error(p.id, e)
  }
}

async function main() {
  try {
    log('กำลังโหลดเพลง …')
    song = await loadSong()
    songBpm = song.content?.bpm
    range = FULL ? null : excerptRange(song.content, { bpm: songBpm, targetSec: 20 })
    $('#songname').textContent = `เพลง #${song.number} ${song.title_th || ''} · คีย์ ${song.content?.key ?? '?'} · ${songBpm ?? 92} bpm`
      + (range ? ' · ท่อนแรก ~20 วิ' : ' · ทั้งเพลง ~80 วิ')

    $('#cards').innerHTML = ''
    for (const p of PRESETS) $('#cards').appendChild(card(p))

    // melody timeline (same deterministic notes in every clip) for the transport clock
    const { perf, bpm: useBpm } = buildPerformance(song.content, { bpm: songBpm, range, songId: song.id })
    const spb = 60 / useBpm
    melTimeline = perf.filter((e) => e.role === 'melody').map((e) => {
      const t = e.startBeat * spb + (e.timeShift || 0) / 1000
      return { t, midi: e.midi, name: noteName(e.midi), file: nearestFile(e.midi) }
    })

    log('กำลังปรับให้เชลโลดังพอดีกับเปียโน (เพื่อความยุติธรรม) …')
    const marc = MARCATO.find((m) => m.id === 'marcato-mp')
    const cal = await calibrateLevels(song.content, { bpm: songBpm, range, songId: song.id, variants: [marc] })
    celloMakeup = cal.leadMakeup * (cal.gains['marcato-mp'] ?? 1)

    for (const p of PRESETS) { log(`กำลังสร้างเสียง ${p.label} …`); await renderPreset(p) }
    log('พร้อมฟังแล้ว — เลื่อน "ความนุ่ม" แล้วกด "เล่น" อันเชลโลซ้ำเพื่อฟังผล')
  } catch (e) { log('พัง: ' + e.message); console.error(e) }
}

// ── the one knob: ความนุ่ม (trebleTameDb) ─────────────────────────────────────────────────────
const showTame = () => {
  const el = $('#tameVal')
  if (el) el.textContent = state.tame === 0 ? '0 = ตอนนี้ (แสบ)' : `${state.tame} dB`
}
$('#tame')?.addEventListener('input', (e) => { state.tame = Number(e.target.value); showTame() })
// re-render only the cello clip on release (not the reference) — one render, ~2s
$('#tame')?.addEventListener('change', async () => {
  log(`กำลังปรับความนุ่มเป็น ${state.tame} dB …`)
  await renderPreset(PRESETS.find((p) => p.id === 'cello'))
  log('พร้อม — กด "เล่น" อันเชลโลเพื่อฟังค่าใหม่')
})
if ($('#tame')) $('#tame').value = String(state.tame)
showTame()

main()
