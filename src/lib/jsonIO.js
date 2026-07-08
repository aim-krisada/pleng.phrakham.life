// WT-C — carry a song as your own JSON file.
// One place for the "song ↔ JSON file" logic so every download/upload surface
// (navbar DownloadTool, editor "จัดการ" menu) behaves the same:
//   exportSong / downloadSong  — US-C01 (song → file)
//   validateSong / parseSongText / importSong — US-C02 + US-C04 (file → song)
// Pure logic only — no store/Supabase/network here, so an upload never touches the
// shared library (on-demand, as US-C02 requires).
import { songBasename, songName } from './songName.js'
import { migrateToV2 } from './songModel.js'

// US-C03 — where an external maker's "submit for approval" email is addressed.
// Central constant: change this one line to point at a different team inbox.
// TODO(P'Aim): confirm the real team address (interim: pleng@phrakham.life).
export const TEAM_EMAIL = 'pleng@phrakham.life'

// The serialisable shape of a song: exactly what we write to a .json file.
// Round-trips — JSON.parse(JSON.stringify(exportSong(song))) deep-equals this.
export function exportSong(song) {
  return {
    number: song.number ?? null,
    title_th: song.title_th || '',
    title_en: song.title_en || '',
    content: song.content ?? null,
  }
}

// The download name: the shared song basename ("12. ชื่อเพลง") + .json, so the
// JSON file is named exactly like the Save-as-PDF file (same core: songName.js).
export function songFilename(song) {
  return songBasename(song) + '.json'
}

// Trigger a browser download of the song as a JSON file. Side-effecting (DOM +
// Blob); the serialisation it relies on lives in exportSong() so it stays testable.
export function downloadSong(song) {
  const data = exportSong(song)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = songFilename(song)
  a.click()
  URL.revokeObjectURL(url)
}

// ---- US-C02 upload / US-C04 validate (file → song) ------------------------------

// Check a parsed object is a usable song and normalise it to the portable shape
// with v2 content. v1 content is migrated to v2 via songModel (call-only). Returns
// { ok, song, warnings } on success, or { ok:false, error } with a plain-Thai reason
// so the caller can tell the user why a file was rejected (never throws — US-C04).
export function validateSong(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, error: 'ไฟล์นี้ไม่ใช่ข้อมูลเพลง' }
  }
  // content sits at obj.content (our export) or is the object itself (older raw dumps).
  const content = obj.content && typeof obj.content === 'object' ? obj.content : obj
  const looksLikeSong = Array.isArray(content.lines) || Array.isArray(content.stanzas)
  if (!looksLikeSong) {
    return { ok: false, error: 'ไฟล์นี้ไม่มีเนื้อเพลง/ทำนอง (ไม่พบ lines หรือ stanzas)' }
  }
  // migrateToV2 short-circuits when already v2; otherwise converts v1 → v2 + warnings.
  const { content: v2, warnings } = migrateToV2(content)
  return {
    ok: true,
    warnings: warnings || [],
    song: {
      number: obj.number ?? null,
      title_th: obj.title_th || '',
      title_en: obj.title_en || '',
      content: v2,
    },
  }
}

// Parse raw JSON text into a validated song. Wraps JSON.parse so a corrupt file
// yields a friendly reason instead of a thrown SyntaxError.
export function parseSongText(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    return { ok: false, error: 'ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้ (โครงสร้างเสีย)' }
  }
  return validateSong(obj)
}

// Read an uploaded File and import it as a song — the one call the upload menu makes.
// On-demand: returns the song object for the caller to open in Studio; it never
// saves to the store/DB. Same { ok, song, error } contract as validateSong.
export async function importSong(file) {
  if (!file) return { ok: false, error: 'ไม่พบไฟล์' }
  let text
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: 'อ่านไฟล์ไม่สำเร็จ' }
  }
  return parseSongText(text)
}

// ---- US-C03 submit for approval by email (external makers, nothing stored) -------

// Build the mailto: link for "propose this song to the library". Prefills the
// subject + body: which song, and — because mailto cannot attach a file — a clear
// reminder to attach the JSON the user just downloaded. Pure/testable; opening it
// is submitForApproval()'s job.
export function buildSubmitMailto(song, email = TEAM_EMAIL) {
  const name = songName(song)
  const file = songFilename(song)
  const subject = `ขอเสนอเพลงเข้าคลัง: ${name}`
  const body =
    'ถึงทีมเพลง.พระคำ.ชีวิต\n\n' +
    `ขอเสนอเพลง "${name}" เข้าคลังครับ/ค่ะ\n\n` +
    `⚠️ กรุณาแนบไฟล์ "${file}" ที่เพิ่งดาวน์โหลด มากับอีเมลนี้ด้วย\n` +
    '(ระบบแนบไฟล์ให้อัตโนมัติไม่ได้ ต้องแนบเอง)\n'
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Run the two-step submit: (1) download the JSON so the user has the file to attach,
// (2) open their email client with the prefilled message. Side-effecting; stores
// nothing (US-C03 is entirely out-of-system).
export function submitForApproval(song, email = TEAM_EMAIL) {
  downloadSong(song)
  window.location.href = buildSubmitMailto(song, email)
}
