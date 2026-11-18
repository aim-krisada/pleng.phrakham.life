// พี่เอม 17 พ.ย. 2569 — "ไทย · English · 中文" when a song has more than one language, '' otherwise
// (a Thai-only song shows nothing, like the language buttons on the song page · ใบ v3/pleng#158 AC 2).
// ONE place for this label: the search card and every song row (SongRow.vue) read it from here.
// Kept per content object so a long list does not re-scan every song on each render.
import { songLangs, LANG_LABEL } from './songModel.js'

export const LANG_SHORT = { th: 'ไทย', en: 'EN', zh: '中' }
const cache = new WeakMap()

export function songLangNames(s, short = false) {
  const c = s && s.content
  if (!c || typeof c !== 'object') return ''
  if (!cache.has(c)) cache.set(c, songLangs(c))
  const has = cache.get(c)
  return has.length > 1 ? has.map((l) => (short ? LANG_SHORT : LANG_LABEL)[l]).join(' · ') : ''
}
