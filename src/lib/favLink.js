// ส่งเพลงที่ชอบเป็นลิงก์ — m1.wpa.24.fav.02 (ใบ v3/pleng#153)
//
// No server, no account: the list travels INSIDE the link, as the song ids joined by commas —
//   https://pleng.phrakham.life/#/?fav=<id>,<id>,…
// Only ids of songs anyone can already open; no name, no device, nothing personal (Security N/A).
// Opening the link shows the list and offers to add it to this device's เพลงที่ชอบ (favorites.js
// addFavorites — merge, never replace).

// A song id is a uuid (catalog) or a short number (sample data). Anything else in the link is
// treated as damage, not guessed at.
const ID_RE = /^[A-Za-z0-9-]{1,64}$/

export function favListLink(ids, base) {
  const root = base.endsWith('/') ? base : base + '/'
  return `${root}#/?fav=${(ids || []).map(String).join(',')}`
}

// The `fav` query value → the ids it carries, in order, without repeats.
// `ok: false` = the link is broken or empty: nothing usable in it (AC 7).
export function parseFavParam(raw) {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (typeof v !== 'string') return { ok: false, ids: [] }
  const parts = v.split(',').map((x) => x.trim()).filter(Boolean)
  const ids = [...new Set(parts)].filter((x) => ID_RE.test(x))
  return { ok: ids.length > 0, ids }
}
