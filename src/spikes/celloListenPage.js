// SPIKE — the LISTENING page (docs/spikes/cello-listen.html). This is P'Aim's *decision* surface,
// not the engineer's debug surface (that is cello-marcato.html, with every knob exposed). P'Aim's
// only ear-questions the measurements cannot answer are two:
//   (ก) does adding the cello sound BETTER or busier than the piano alone?
//   (ข) does he prefer it plain, or with gentle vibrato?
// So this page renders exactly THREE clips and hides every other control. Every setting inside each
// clip is baked to the value P'Aim already approved, or to what the measurements decided — see the
// per-preset notes below. All three ride the SAME golden piano, SAME song, SAME excerpt, level-
// matched, so the only thing that changes is what the question is about.
import { supabase } from '../supabase.js'
import { MARCATO, PIANO_ONLY, VIB_MIN_SEC, VIBRATO, renderClip, bufferToMp3, measure,
  excerptRange, calibrateLevels, normalizeBuffer } from './celloBakeoff.js'

// The cello body/head/timing are P'Aim's four locked values (head mp · 5% · shift 10ms · body p),
// and fileLevelAmount:1 is the measured "second-14" bug fix (not a taste). marcato-mp resolves to
// body karoryfer-p + head staccato-mp inside renderClip. vibrato at 22 cents is P'Aim's own stated
// preference ("มิติชัดขึ้นจริง ๆ โหยหวนดีกว่า"), gated to long notes only by the auto rule so it is
// not the "คงที่ทุกโน้ต = น่ารำคาญ" he warned against.
const CELLO_BASE = { variantId: 'marcato-mp', headId: 'staccato-mp', headStrength: 0.05,
  bodyShiftMs: 10, fileLevelAmount: 1 }

const PRESETS = [
  { id: 'piano', label: '🎹 เปียโนอย่างเดียว', ref: true,
    sub: 'เสียงที่ใช้จริงตอนนี้ — ไว้เทียบว่าเติมเชลโลแล้วดีขึ้นหรือรกขึ้น',
    cfg: { variantId: 'none' } },
  { id: 'cello', label: '🎻 เปียโน + เชลโล — เรียบ',
    sub: 'เชลโลร้องนำ · ไม่สั่นนิ้ว',
    cfg: { ...CELLO_BASE, vibratoCents: 0 } },
  { id: 'cello-vib', label: '🎻 เปียโน + เชลโล — สั่นนิ้วนุ่ม ๆ',
    sub: 'เชลโลร้องนำ · มีสั่นนิ้ว เฉพาะโน้ตที่ลากยาว (โน้ตสั้นไม่สั่น)',
    cfg: { ...CELLO_BASE, vibratoCents: VIBRATO.maxDepthCents, vibMinNoteSec: VIB_MIN_SEC } },
]

const $ = (s) => document.querySelector(s)
const q = new URLSearchParams(location.search)
const SONG_NO = Number(q.get('song') || 1)
const FULL = q.get('full') != null    // ?full = whole song (~80s) so the whole arc is audible
const log = (m) => { $('#log').textContent = m }

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
    <div class="txt"><b>${p.label}</b><div class="sub">${p.sub}</div></div>
    <audio data-audio="${p.id}"></audio>`
  return el
}

async function main() {
  try {
    log('กำลังโหลดเพลง …')
    const song = await loadSong()
    const bpm = song.content?.bpm
    const range = FULL ? null : excerptRange(song.content, { bpm, targetSec: 20 })
    $('#songname').textContent = `เพลง #${song.number} ${song.title_th || ''} · คีย์ ${song.content?.key ?? '?'} · ${bpm ?? 92} bpm`
      + (range ? ' · ท่อนแรก ~20 วิ' : ' · ทั้งเพลง ~80 วิ')

    $('#cards').innerHTML = ''
    for (const p of PRESETS) $('#cards').appendChild(card(p))

    // one fairness calibration for the cello body, then the same makeup for both cello clips
    log('กำลังปรับให้เชลโลดังพอดีกับเปียโน (เพื่อความยุติธรรม) …')
    const marc = MARCATO.find((m) => m.id === 'marcato-mp')
    const cal = await calibrateLevels(song.content, {
      bpm, range, songId: song.id, variants: [marc],
    })
    const celloMakeup = cal.leadMakeup * (cal.gains['marcato-mp'] ?? 1)

    for (const p of PRESETS) {
      log(`กำลังสร้างเสียง ${p.label} …`)
      try {
        const { buffer } = await renderClip(song.content, {
          bpm, range, songId: song.id, celloMakeup, ...p.cfg,
        })
        normalizeBuffer(buffer)             // all clips at one loudness (louder ≠ better)
        const blob = await bufferToMp3(buffer)
        const url = URL.createObjectURL(blob)
        const audio = $(`[data-audio="${p.id}"]`)
        audio.src = url
        const btn = $(`[data-play="${p.id}"]`)
        btn.disabled = false
        btn.onclick = () => {
          const playing = !audio.paused
          document.querySelectorAll('audio').forEach((a) => { a.pause(); a.currentTime = 0 })
          document.querySelectorAll('.card').forEach((c) => c.classList.remove('on'))
          if (!playing) { audio.play(); btn.closest('.card').classList.add('on') }
        }
        audio.onended = () => btn.closest('.card').classList.remove('on')
      } catch (e) {
        $(`[data-audio="${p.id}"]`).closest('.card').querySelector('.sub').innerHTML =
          `<b class="warn">สร้างเสียงไม่ได้: ${e.message}</b>`
        console.error(p.id, e)
      }
    }
    log('พร้อมฟังแล้ว — กดสลับฟังทั้ง 3 อันได้เลยครับ')
  } catch (e) { log('พัง: ' + e.message); console.error(e) }
}

main()
