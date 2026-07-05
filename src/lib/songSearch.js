// Shared song-search logic used by the catalog page and the Studio song picker.

export function lyricsText(content) {
  return (content.lines || [])
    .flat()
    .filter((i) => i.type === 'segment')
    .map((i) => i.lyric)
    .join(' ')
}

export function notesText(content) {
  return (content.lines || [])
    .flat()
    .filter((i) => i.type === 'segment')
    .map((i) => i.note)
    .join(' ')
    .replace(/[.\-_'(){}#b]/g, '')
    .replace(/\s+/g, ' ')
}

export function snippet(content, len = 60) {
  return lyricsText(content).replace(/\s+/g, ' ').slice(0, len)
}

export function songHaystack(song) {
  return [
    String(song.number ?? ''),
    song.title_th,
    song.title_en ?? '',
    song.content?.key ?? '',
    lyricsText(song.content ?? {}),
    notesText(song.content ?? {}),
  ]
    .join(' ')
    .toLowerCase()
}

export function filterSongs(songs, query) {
  const q = query.trim().toLowerCase()
  if (!q) return songs
  return songs.filter((s) => songHaystack(s).includes(q))
}
