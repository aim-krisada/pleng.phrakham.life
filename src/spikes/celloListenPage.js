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

// A/B for treble taming (P'Aim 18 ก.ค.): he confirmed the cello is worth it, but "ดังเกินตั้งแต่
// วินาที 8" — measured as the melody's ascent into the bright upper register, not a level problem.
// So both cello clips are P'Aim's approved sound (body p · head mp 5% · shift 10ms · vibrato 22 gated
// to long notes · second-14 fix) held IDENTICAL, and the ONLY difference is trebleTameDb: a high-shelf
// cut that grows with pitch, darkening the high notes and leaving the warm low ones alone.
const CELLO_BASE = { variantId: 'marcato-mp', headId: 'staccato-mp', headStrength: 0.05,
  bodyShiftMs: 10, fileLevelAmount: 1, vibratoCents: VIBRATO.maxDepthCents, vibMinNoteSec: VIB_MIN_SEC }

const PRESETS = [
  { id: 'piano', label: '🎹 เปียโนอย่างเดียว', ref: true,
    sub: 'เส้นเปรียบเทียบ (เสียงที่ใช้จริงตอนนี้)',
    cfg: { variantId: 'none' } },
  { id: 'now', label: '🎻 เชลโล — ตอนนี้',
    sub: 'ที่พี่เอมเพิ่งฟัง · โน้ตสูง (ราววินาที 8) ยังแสบ',
    cfg: { ...CELLO_BASE, trebleTameDb: 0 } },
  { id: 'soft', label: '🎻 เชลโล — นุ่มขึ้น ⭐',
    sub: 'ลดความแสบเฉพาะโน้ตสูง (อัตโนมัติตามระดับเสียง · โน้ตต่ำที่อุ่นไม่แตะ)',
    cfg: { ...CELLO_BASE, trebleTameDb: 8 } },
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
