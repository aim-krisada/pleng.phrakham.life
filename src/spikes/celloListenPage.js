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

// DEFAULT tune — P'Aim's own settings (18 ก.ค. tuning session) + the measured fix: arc → 0.
// arc=10 was proven to be the "แสบ/ลำโพงแตก" driver on solo cello (it pushes the 40-55s climax notes
// +3 dB in level AND treble; the same G#4 is warm when arc leaves it soft). vibrato measured innocent
// (vib0 == vib20 at every harsh spot) so it stays where P'Aim had it (20). Reset button restores these.
const DEFAULTS = {
  tame: 18, even: 0.10, vib: 20, head: 0, headKind: 'mp', shift: 10, arc: 0, trading: 0, balance: 1,
  chamber: 0, vibGain: 0, vibUnsteady: 0, vibBow: 0, vibMin: VIB_MIN_SEC, fileLevel: 1,
  resonance: false, roundRobin: false,
}
const DEFAULT_KEYS = Object.keys(DEFAULTS)

// persist the whole tune across reloads (this page is now P'Aim's cello tuning bench, not a one-shot)
const LS_KEY = 'cello-tune-v1'
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
const saveState = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch {} }

// live tuning state = DEFAULTS ← saved (localStorage) ← URL params (a shared ?song/?full link still wins)
const state = { songNo: SONG_NO, full: FULL, ...DEFAULTS }
Object.assign(state, loadSaved())
if (q.get('song') != null) state.songNo = SONG_NO
if (q.get('full') != null) state.full = true

// build the cello render config from the live knobs
const celloCfg = () => ({
  variantId: 'marcato-mp',
  headId: state.head > 0 ? (state.headKind === 'mf' ? 'staccato-mf' : 'staccato-mp') : null,
  headStrength: state.head, bodyShiftMs: state.shift,
  vibratoCents: state.vib, vibMinNoteSec: state.vibMin, vibGainDb: state.vibGain,
  vibUnsteady: state.vibUnsteady, vibBowPressure: state.vibBow,
  fileLevelAmount: state.fileLevel, trebleTameDb: state.tame, celloEven: state.even,
  arcSpreadDb: state.arc, trading: state.trading, bowRoundRobin: state.roundRobin, pianoResonance: state.resonance,
  chamberWet: state.chamber,
})

// ── the knobs: label = what it is + what it helps; hint = ◀ left · right ▶ ─────────────────────
const pct = (v) => `${Math.round(v * 100)}%`
const KNOBS = [
  { key: 'tame',  label: '🎛 ความสม่ำเสมอเนื้อเสียง — กดโน้ต "แหบ" (ถูกดึงเสียง) ให้เท่าโน้ต "ทุ้ม"', L: 'แหบ (เดิม)', R: 'สม่ำเสมอ',
    min: 0, max: 28, step: 1, fmt: (v) => v === 0 ? 'แหบ (เดิม)' : v >= 28 ? 'เท่ากันสุด' : `${v}` },
  { key: 'even',  label: '🎚 ความสม่ำเสมอความดัง — ลดโน้ตที่ดังโดดออกมา', L: 'มีดัง-เบา (เดิม)', R: 'นิ่ง/เรียบ',
    min: 0, max: 1, step: 0.05, fmt: (v) => v === 0 ? 'เดิม' : `${Math.round(v * 100)}%` },
  { key: 'vib',   label: 'สั่นนิ้ว / vibrato — ความโหยหวน (5-8 = โหยหวนพอดี · 22 = เทปยืด · วัดแล้วไม่ทำให้แสบ)',
    L: 'ปิด (นิ่ง)', R: 'สั่นลึก', min: 0, max: 22, step: 1, fmt: (v) => v === 0 ? 'ปิด' : `${v}${v >= 18 ? ' (เทปยืด)' : ''}` },
  { key: 'head',  label: 'ความแรงหัวโน้ต — ความเป็นจังหวะ', L: 'ไม่มีหัว (นุ่ม)', R: 'หัวชัด',
    min: 0, max: 0.5, step: 0.01, fmt: (v) => v === 0 ? 'ไม่มีหัว' : pct(v) },
  { key: 'shift', label: 'เลื่อนเวลาตัวโน้ต — กันฟังเหมือนช้า', L: 'ตรงบีต', R: 'มาก่อน',
    min: 0, max: 200, step: 5, fmt: (v) => `${v} ms` },
  { key: 'arc',   label: '🌊 เส้นเดินทางอารมณ์ — เบา→ไคลแมกซ์→คลาย (เปิด "ทั้งเพลง" จะชัด)', L: 'แบน (เดิม)', R: 'เดินทางกว้าง',
    min: 0, max: 15, step: 1, fmt: (v) => v === 0 ? 'แบน (เดิม)' : `${v} dB` },
  { key: 'trading', label: '💬 พลัดกันโต้ตอบ — เปียโนกับเชลโลผลัดกันร้องวรรค', L: 'เชลโลนำตลอด (เดิม)', R: 'สลับกันมาก',
    min: 0, max: 1, step: 0.1, fmt: (v) => v === 0 ? 'เชลโลนำตลอด' : `${Math.round(v * 100)}%` },
  { key: 'balance', label: 'ความดังเชลโล (เทียบเปียโน)', L: 'เบา (ให้เปียโนออก)', R: 'ดัง',
    min: 0.08, max: 2.4, step: 0.02, fmt: (v) => v === 1 ? 'ปกติ' : `${(20 * Math.log10(v)).toFixed(1)} dB` },
  { key: 'chamber', label: '🏛 ระยะห่าง/ห้อง (G แนะนำ) — ดันเสียงให้ห่าง ลดความจ่อหู', L: 'ชิด (เดิม)', R: 'ห่าง/อุ่น',
    min: 0, max: 0.7, step: 0.05, fmt: (v) => v === 0 ? 'ชิด (เดิม)' : `${Math.round(v * 100)}%` },
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
  const { data, error } = await supabase.from('songs').select('*').eq('number', state.songNo).limit(1).single()
  if (error) throw new Error('โหลดเพลงไม่ได้: ' + error.message)
  return data
}

// populate the song picker once (number + title), so P'Aim can audition across the whole library
async function loadSongList() {
  const sel = $('#songSel'); if (!sel) return
  const { data } = await supabase.from('songs').select('number,title_th').order('number')
  for (const s of (data || [])) {
    const o = document.createElement('option')
    o.value = s.number; o.textContent = `#${s.number} ${s.title_th || ''}`
    if (s.number === state.songNo) o.selected = true
    sel.appendChild(o)
  }
  sel.addEventListener('change', (e) => { state.songNo = Number(e.target.value); saveState(); stopAll(); main() })
}

const PRESETS = [
  { id: 'celloSolo', label: '🎻 เชลโลเดี่ยว (ไม่มีเปียโน)', sub: 'ฟังเชลโลล้วน ๆ ให้มั่นใจก่อนรวมวง',
    cfg: () => ({ ...celloCfg(), pianoRoles: 'none' }) },
  { id: 'cello', label: '🎹🎻 เปียโน + เชลโล (duo)', sub: 'เสียงรวมวงจริง', cfg: celloCfg },
  { id: 'piano', ref: true, label: '🎹 เปียโนอย่างเดียว', sub: 'เส้นเปรียบเทียบ', cfg: () => ({ variantId: 'none' }) },
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

let reRenderReq = 0
async function reRenderCello() {   // any knob change → stop + rebuild the cello clips (solo + duo)
  stopAll()
  const my = ++reRenderReq
  log('กำลังปรับเสียง …')
  for (const p of PRESETS.filter((p) => p.id !== 'piano')) {
    if (my !== reRenderReq) return
    await renderPreset(p)
  }
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
    // init + wire (every change also persists the tune to localStorage)
    if (k.type === 'toggle') {
      const el = box.querySelector('input')
      el.checked = !!state[k.key]
      el.addEventListener('change', (e) => { state[k.key] = e.target.checked; saveState(); reRenderCello() })
    } else if (k.type === 'select') {
      const el = box.querySelector('select')
      el.value = state[k.key]
      el.addEventListener('change', (e) => { state[k.key] = e.target.value; saveState(); reRenderCello() })
    } else {
      const el = box.querySelector('input'), val = box.querySelector(`[data-kv="${k.key}"]`)
      el.value = String(state[k.key])
      const show = () => { val.textContent = k.fmt ? k.fmt(state[k.key]) : `${state[k.key]}` }
      el.addEventListener('input', (e) => { state[k.key] = Number(e.target.value); show() })
      el.addEventListener('change', () => { saveState(); reRenderCello() })
      show()
    }
  }
}

// push the current state back onto every knob's DOM (after Import / Reset)
function applyStateToUI() {
  for (const k of KNOBS) {
    const el = document.querySelector(`[data-k="${k.key}"]`)
    if (!el) continue
    if (k.type === 'toggle') el.checked = !!state[k.key]
    else if (k.type === 'select') el.value = state[k.key]
    else {
      el.value = String(state[k.key])
      const val = document.querySelector(`[data-kv="${k.key}"]`)
      if (val) val.textContent = k.fmt ? k.fmt(state[k.key]) : `${state[k.key]}`
    }
  }
  const fs = document.querySelector('#fullSong'); if (fs) fs.checked = state.full
}

// ── Export / Import the tune as a JSON file (a permanent, shareable tuning preset) ────────────────
function exportSettings() {
  const payload = { app: 'cello-tune', v: 1, savedAt: new Date().toISOString(), settings: state }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `cello-tune-song${state.songNo}.json`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  log('บันทึกไฟล์ตั้งค่าแล้ว — cello-tune-song' + state.songNo + '.json')
}
function importSettings(file) {
  const r = new FileReader()
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result)
      const s = obj && obj.settings ? obj.settings : obj   // accept the wrapped payload or a bare state
      if (!s || typeof s !== 'object') throw new Error('รูปแบบไฟล์ไม่ถูก')
      const songChanged = s.songNo != null && Number(s.songNo) !== Number(state.songNo)
      Object.assign(state, s)
      applyStateToUI()
      saveState()
      if (songChanged) {
        const sel = document.querySelector('#songSel'); if (sel) sel.value = String(state.songNo)
        stopAll(); main()
      } else { reRenderCello() }
      log('โหลดค่าจากไฟล์แล้ว ✓')
    } catch (e) { log('โหลดไฟล์ไม่ได้: ' + e.message) }
  }
  r.readAsText(file)
}
function resetSettings() {
  Object.assign(state, DEFAULTS)
  applyStateToUI(); saveState(); reRenderCello()
  log('คืนค่าเริ่มต้นแล้ว (arc=0 · vib=20 · tame=18)')
}

async function main() {
  try {
    log('กำลังโหลดเพลง …')
    song = await loadSong()
    songBpm = song.content?.bpm
    range = state.full ? null : excerptRange(song.content, { bpm: songBpm, targetSec: 20 })
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
    // NOTE: the ×0.2 balance scaling (b6a5c09) is reverted to ×1 = the exact "นุ่มมาก" baseline for the
    // regression hunt. It drowns the piano (~+9 dB over accompaniment) — that "cello covers piano" fix
    // needs redoing WITHOUT a post-gain-then-normalize (which is a suspect). Use the balance knob for now.
    baseMakeup = cal.leadMakeup * (cal.gains['marcato-mp'] ?? 1)

    for (const p of PRESETS) { log(`กำลังสร้างเสียง ${p.label} …`); await renderPreset(p) }
    log('พร้อมฟังแล้ว — ปรับปุ่มแล้วกด "เล่น" อันเชลโลซ้ำเพื่อฟังผล')
  } catch (e) { log('พัง: ' + e.message); console.error(e) }
}

// one-time setup (NOT re-run on song change): knobs, stop button, song picker, length toggle
buildKnobs()
$('#stopBtn')?.addEventListener('click', stopAll)
$('#fullSong')?.addEventListener('change', (e) => { state.full = e.target.checked; saveState(); stopAll(); main() })
if ($('#fullSong')) $('#fullSong').checked = state.full
$('#exportBtn')?.addEventListener('click', exportSettings)
$('#importBtn')?.addEventListener('click', () => $('#importFile')?.click())
$('#importFile')?.addEventListener('change', (e) => { if (e.target.files[0]) importSettings(e.target.files[0]); e.target.value = '' })
$('#resetBtn')?.addEventListener('click', resetSettings)
loadSongList()
main()
