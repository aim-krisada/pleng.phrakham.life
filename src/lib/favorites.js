// ★ เพลงที่ชอบ — m1.wpa.24.fav.01 (ใบ v3/pleng#152)
//
// One list per device, like a bookmark (พี่เอม 5 พ.ย. 2569: "มองว่าเป็น bookmark ... รายการเดียว").
// No account, no server, no personal data: a favorite is just a song id kept in localStorage on this
// device. Nothing leaves the browser. Revived from the July "สาย 2" trial (commit 252b2ba5), which
// never reached the live site.
//
// One shared reactive Set, so every ★ on the page and the "เพลงที่ชอบ" row on the home page show the
// same state the moment it changes. Ids are kept as STRINGS: the catalog uses uuids, the sample data
// uses numbers, and the route param is always a string — one form means `has()` never misses.
import { ref } from 'vue'

export const FAV_KEY = 'pleng.favorites'

// Can this device remember anything? Some browsers block storage outright (blocked site data,
// some private modes) — then the stars still work for this visit but are gone on reload, and the
// favorites page says so (AC 8) instead of silently forgetting.
function probeStorage() {
  try {
    const k = FAV_KEY + '.probe'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY))
    if (Array.isArray(raw)) return new Set(raw.filter((x) => x != null && x !== '').map(String))
  } catch { /* corrupt / no storage — start empty */ }
  return new Set()
}

export const storageOk = ref(probeStorage())

// The single source of truth. Every change REPLACES the Set so Vue sees it (Sets aren't deeply reactive).
export const favorites = ref(load())

function persist() {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favorites.value]))
  } catch {
    storageOk.value = false // quota / blocked — the in-memory Set still works this visit
  }
}

export function isFavorite(id) {
  return id != null && favorites.value.has(String(id))
}

// Add or remove one song; returns the new state (true = now a favorite).
export function toggleFavorite(id) {
  if (id == null || id === '') return false
  const key = String(id)
  const next = new Set(favorites.value)
  const nowOn = !next.has(key)
  if (nowOn) next.add(key)
  else next.delete(key)
  favorites.value = next
  persist()
  return nowOn
}

// The favorite songs that still exist in `songs` (the catalog this reader can see), sorted by Thai
// title so a long list is easy to scan. A song that was removed from the site — or that this reader
// may not see — simply isn't listed (AC 7): no blank row, no "unknown song".
export function favoriteSongs(songs, favs = favorites.value) {
  return (songs || [])
    .filter((s) => s && favs.has(String(s.id)))
    .sort((a, b) => String(a.title_th || '').localeCompare(String(b.title_th || ''), 'th'))
}

// Keep this tab in sync when another tab toggles a star. Guarded for non-DOM hosts (unit tests).
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (e) => {
    if (e.key === FAV_KEY) favorites.value = load()
  })
}

// test hook — re-read storage as if the page had just loaded
export function _reloadFavorites() {
  storageOk.value = probeStorage()
  favorites.value = load()
}
