// ★ Favorites — a reader's own list of songs, kept in the browser only.
//
// No account, no server, no PII (mission's 3-tier model: reading + personal marks are open
// to everyone; login gates only WRITING to the shared library). A favorite is just a song id
// held in localStorage on this device — nothing leaves the browser. One shared reactive Set
// so every ★ on the page (the row/card star + the "รายการโปรด" filter chip) reflects the
// same state the instant it changes, and it survives reloads.
import { ref } from 'vue'

const KEY = 'pleng.favorites'

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    // ids are strings (Supabase uuid) or numbers (sample data) — keep as-is in a Set.
    if (Array.isArray(raw)) return new Set(raw)
  } catch { /* corrupt / no storage — start empty */ }
  return new Set()
}

// The single source of truth. Components read `favorites.value` (a Set) reactively; every
// mutation replaces the Set instance so Vue sees the change (Sets aren't deeply reactive).
export const favorites = ref(load())

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...favorites.value]))
  } catch { /* private mode / quota — the in-memory Set still works this session */ }
}

export function isFavorite(id) {
  return favorites.value.has(id)
}

// Add or remove one song; returns the new state (true = now a favorite).
export function toggleFavorite(id) {
  const next = new Set(favorites.value)
  const nowOn = !next.has(id)
  if (nowOn) next.add(id)
  else next.delete(id)
  favorites.value = next
  persist()
  return nowOn
}

export function favoriteCount() {
  return favorites.value.size
}

// Keep this tab in sync when another tab toggles a star (same-origin storage event). Guarded
// for non-DOM hosts (unit tests / SSR) where addEventListener is absent.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) favorites.value = load()
  })
}
