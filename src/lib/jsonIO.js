// WT-C — carry a song as your own JSON file.
// One place for the "song ↔ JSON file" logic so every download button (navbar
// DownloadTool, editor "จัดการ" menu) behaves the same. US-C02/C04 will add
// importSong()/validate() here; US-C01 is export + download only.

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

// A human-meaningful download name derived from the song. Prefixes the song
// number when present ("012 ชื่อเพลง.json"), strips characters a filesystem
// dislikes, and always falls back to "song.json" so a blank title never yields
// an empty or dotfile name.
export function songFilename(song) {
  const parts = []
  if (song.number != null && song.number !== '') parts.push(String(song.number))
  const title = (song.title_th || song.title_en || '').trim()
  if (title) parts.push(title)
  const base = parts
    .join(' ')
    .replace(/[\\/:*?"<>|]/g, '') // characters illegal in Windows filenames
    .replace(/\s+/g, ' ')
    .trim()
  return (base || 'song') + '.json'
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
