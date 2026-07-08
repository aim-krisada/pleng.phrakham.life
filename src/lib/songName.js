// Core: turn a song into its human-readable name / safe file base. One place so
// every "save this song" surface names the file the same way — JSON download and
// Save-as-PDF (via document.title). Two DISTINCT jobs, kept separate on purpose:
//   songName()     — screen DISPLAY in the song list: "12. ชื่อเพลง" (with number)
//   songBasename() — the FILENAME: "เพลง.พระคำ.ชีวิต - ชื่อเพลง" (NO number)

// The site name — single source of truth for the filename prefix (US-I2). Anything
// that stamps the site onto a file should import this, never re-type the string.
export const SITE_NAME = 'เพลง.พระคำ.ชีวิต'

// Characters Windows forbids inside a filename.
const ILLEGAL = /[\\/:*?"<>|]/g

// Readable list name: "12. ชื่อเพลง" (number prefix only when the song has one). Falls
// back to the English title, then a generic Thai label, so it is never empty. This is
// for on-screen display in the catalog — it is NOT the filename (see songBasename).
export function songName(song) {
  const s = song || {}
  const title = (s.title_th || s.title_en || '').trim()
  const prefix = s.number != null && s.number !== '' ? String(s.number).trim() + '. ' : ''
  return (prefix + title).trim() || 'เพลง'
}

// File base (no extension): "เพลง.พระคำ.ชีวิต - <ชื่อเพลง>" so every download tells you
// at a glance which site + which song it came from. Deliberately has NO song number
// (a downloaded file stands on its own — the catalog number means nothing off-site).
// Illegal characters stripped and whitespace collapsed so it is a valid filename.
// Append '.json' for JSON; the PDF dialog adds the extension itself.
export function songBasename(song) {
  const title = (song?.title_th || '').trim() || 'แผ่นเพลง'
  return `${SITE_NAME} - ${title}`.replace(ILLEGAL, '').replace(/\s+/g, ' ').trim()
}
