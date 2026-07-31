// เครื่องมืออัดไฟล์เสียงเทียบ "ก่อนแก้ / หลังแก้" ตามกฎมือซ้าย 3 ข้อของพี่เปา (30 ก.ค. 2569)
// ไม่ใช่ส่วนของแอป — ไม่มี route ไม่มีลิงก์ · ลบทิ้งได้เมื่อครูฟังจบแล้ว
//
// ทั้งสองฝั่งเดินผ่าน arrange() ตัวเดียวกัน ต่างกันแค่ "เปิด/ปิดกฎ 3 ข้อ" เท่านั้น จึงมั่นใจได้ว่า
// เสียงที่ต่างกันมาจากกฎ ไม่ได้มาจากอย่างอื่น (พิสูจน์แล้วด้วย tools/diag-lefthand-rules.mjs --before
// ซึ่งให้ตัวเลขตรงกับโค้ดก่อนแก้จริงทุกตัว ยกเว้นป้ายวินิจฉัยที่ไม่มีเสียง)
import { playableContent, songToMp3Blob } from './lib/audioExport.js'
import { presetCfg } from './lib/arranger/presets.js'

const log = (m) => { document.getElementById('log').textContent = String(m); console.log('[ab]', m) }

// "ก่อน" = ปิดกฎทั้ง 3 ข้อ → ได้พฤติกรรมเดิมก่อนแก้เป๊ะ
export const BEFORE_FLAGS = {
  lockDownbeats: false,    // กฎ 1 — ไม่ตรึงหัวห้อง
  leftHandCeiling: false,  // กฎ 2 — ไม่มีเพดานโดกลาง
  leftHandNoUnison: false, // กฎ 3 — ไม่ห้ามซ้ำเสียงกับทำนอง
  breathBothHands: false,  // การหายใจต้นวรรคขยับเฉพาะมือขวาแบบเดิม
}

window.abRender = async function abRender(song, side, filename) {
  const content = song.content
  const base = presetCfg('piano-arrangement') // พรีเซ็ตที่ผู้ใช้ได้ยินจริงเป็นค่าเริ่มต้น
  const cfg = side === 'before' ? { ...base, ...BEFORE_FLAGS } : base
  log(`render ${filename} · ${side} · bpm=${content.bpm}`)
  const { blob, seconds } = await songToMp3Blob(playableContent(content), {
    bpm: Number(content.bpm) || 92,
    transpose: 0,
    voices: 'both',
    arranger: true,
    arrangeCfg: cfg,
    instrument: 'grand',
    songId: song.id,
    kbps: 192,
  })
  // ส่งไฟล์กลับไปให้ node เขียนลงดิสก์เอง ⛔ ไม่ใช้ระบบ "ดาวน์โหลด" ของเบราว์เซอร์
  // (ลองแล้วเบราว์เซอร์กลืนไฟล์หายเงียบ ๆ ทั้งที่ตั้ง Browser.setDownloadBehavior ไว้แล้ว — เสียเวลาไป 2 รอบ
  //  จึงเลิกใช้ทางนั้น แล้วส่งเป็น POST ธรรมดาแทน ซึ่งตรวจได้ว่าเขียนสำเร็จจริงจากรหัสตอบกลับ)
  const res = await fetch(`${window.AB_SINK}/save?name=${encodeURIComponent(filename)}`, { method: 'POST', body: blob })
  if (!res.ok) throw new Error(`เขียนไฟล์ไม่สำเร็จ: ${res.status}`)
  const saved = await res.json()
  log(`done ${filename} · ${blob.size} bytes · ${seconds.toFixed(1)}s`)
  return { filename, side, seconds, bytes: blob.size, savedBytes: saved.bytes }
}
window.abReady = true
log('พร้อม (abRender)')
