// The song's head — the facts a singer needs before the first note: the key and meter the song OPENS
// in, and its อ้างอิง (other books' numbers). ONE definition for every surface that shows it: แผ่นเพลง
// (SongSheet, on screen and on paper) and ฝึกร้อง (SongViewer) both read it from here, so the two heads
// can never disagree (ใบ v3/pleng#123 · #128 · #144).
import { transposeKey } from './chords.js'
import { bookRefsCodeText } from './bookCodes.js'

// ใบ#123 — the key and meter the song OPENS in: the first line's own, when its ท่อน sets one (ใบ#95/#96),
// else the song's. `content` is the resolved (v1-shaped `lines`) content.
export function openingKey(content) {
  const first = (content?.lines || [])[0]
  return (first && first._key) || content?.key || ''
}
export function openingMeter(content) {
  const first = (content?.lines || [])[0]
  return (first && first._ts) || content?.timeSignature || ''
}

// { key, meter, refs } as shown. The key follows the key the song is shown in (displayKey), exactly like
// the chords, so a song played in D says คีย์ D. A missing item is '' — the head simply leaves it out.
export function songHeadInfo(content, displayKey, bookRefs) {
  const songKey = content?.key
  const k = openingKey(content)
  return {
    key: k ? transposeKey(k, songKey, displayKey || songKey) : '',
    meter: openingMeter(content),
    refs: bookRefsCodeText(bookRefs),
  }
}
