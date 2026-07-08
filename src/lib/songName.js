// Core: turn a song into its human-readable name / safe file base. One place so
// every "save this song" surface names the file the same way — JSON download,
// Save-as-PDF (via document.title), and any future export. Matches the "12. ชื่อเพลง"
// form the song list shows on screen.

// Characters Windows forbids inside a filename.
const ILLEGAL = /[\\/:*?"<>|]/g

// Readable name: "12. ชื่อเพลง" (number prefix only when the song has one). Falls
// back to the English title, then a generic Thai label, so it is never empty —
// safe to drop straight into document.title for the PDF save dialog.
export function songName(song) {
  const s = song || {}
  const title = (s.title_th || s.title_en || '').trim()
  const prefix = s.number != null && s.number !== '' ? String(s.number).trim() + '. ' : ''
  return (prefix + title).trim() || 'เพลง'
}

// File base (no extension): songName() with filesystem-illegal characters removed
// and whitespace collapsed. Append '.json' / rely on the PDF dialog for the ext.
export function songBasename(song) {
  return songName(song).replace(ILLEGAL, '').replace(/\s+/g, ' ').trim() || 'เพลง'
}
