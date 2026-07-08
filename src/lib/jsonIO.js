// WT-C — carry a song as your own JSON file.
// One place for the "song ↔ JSON file" logic so every download button (navbar
// DownloadTool, editor "จัดการ" menu) behaves the same. US-C02/C04 will add
// importSong()/validate() here; US-C01 is export + download only.
import { songBasename } from './songName.js'

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
