// m1.wpa.24.us01 — how each BOOK is left sorted: which sort, and which way round.
//
// พี่เปา confirmed (3 ส.ค. · issue v3/pleng#1): "เล่มใหญ่เลือกตามเลข เล่มเด็กเล็กเลือกตาม
// ตัวอักษรไว้ ก็ให้จำแยกเล่มไป" — so this is a MAP keyed by book code, not one global
// setting. A single global value was the team's earlier guess and is explicitly wrong.
//
// พี่เอม added the direction (3 ส.ค.): "เหลือแค่ มากไปน้อย น้อยไปมาก แล้วคงไว้ กดสลับแค่
// 2 สถานะพอ" — two states, no third "off" state, and the choice persists. `chooseSort()`
// below IS that rule, in one place, so no screen re-implements it.
//
// Storage + the tap rule only. It does NOT know how to order anything — that stays in
// songSort.js (the one place allowed to sort songs); this file only stores ids it recognises.
//
// Shape mirrors lib/paperSize.js (reactive ref + a watcher that persists) and the
// `pleng.*` key naming used by favorites/playlists/siteFont.
import { ref, watch } from 'vue'
import { PICKABLE_SORTS, DEFAULT_SORT, DEFAULT_DIR, isDir, flipDir } from './songSort.js'

const KEY = 'pleng.sortByBook'
const PICKABLE_IDS = PICKABLE_SORTS.map((o) => o.id)

// Only sorts the user can actually pick are storable: a stale id from an older build (or
// hand-edited storage) must never leave a book stuck on a sort with no button.
function isPickable(id) {
  return PICKABLE_IDS.includes(id)
}

// One book's stored entry, or null. Tolerates the older `'<sort id>'` string form as well as
// the current `{ by, dir }` object so an existing browser keeps its choice instead of silently
// resetting.
function normalise(entry) {
  if (typeof entry === 'string') return isPickable(entry) ? { by: entry, dir: DEFAULT_DIR } : null
  if (entry && typeof entry === 'object' && isPickable(entry.by)) {
    return { by: entry.by, dir: isDir(entry.dir) ? entry.dir : DEFAULT_DIR }
  }
  return null
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const clean = {}
      for (const [code, entry] of Object.entries(raw)) {
        const e = normalise(entry)
        if (e) clean[code] = e
      }
      return clean
    }
  } catch {
    /* corrupt / no storage (private mode, SSR) — start empty */
  }
  return {}
}

// The single source of truth: { '<category code>': { by, dir } }. A book that was never
// touched is simply absent → it falls back to the defaults, so the very first visit to any
// book still lists by number, low to high.
export const sortByBook = ref(load())

watch(
  sortByBook,
  (map) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(map))
    } catch {
      /* quota / private mode — the in-memory choice still works this session */
    }
  },
  { deep: true, flush: 'sync' },
)

// How a book should be shown right now. Always returns a usable pair, never null.
export function bookSortState(code) {
  const e = code ? normalise(sortByBook.value[code]) : null
  return e || { by: DEFAULT_SORT, dir: DEFAULT_DIR }
}

export function bookSort(code) {
  return bookSortState(code).by
}

export function bookDir(code) {
  return bookSortState(code).dir
}

// THE TAP RULE, in one place (พี่เอม: two states, nothing else):
//   tap the sort you are NOT on  → switch to it, starting low-to-high
//   tap the sort you ARE on      → flip it round
// There is no third tap that turns sorting off — see songSort.js on why an unordered list
// is the bug, not a feature.
export function chooseSort(code, id) {
  if (!code || !isPickable(id)) return
  const cur = bookSortState(code)
  const next = cur.by === id ? { by: id, dir: flipDir(cur.dir) } : { by: id, dir: DEFAULT_DIR }
  sortByBook.value = { ...sortByBook.value, [code]: next }
}

// Set a book's state outright (used by tests / any caller that knows exactly what it wants).
export function setBookSort(code, id, dir = DEFAULT_DIR) {
  if (!code || !isPickable(id)) return
  sortByBook.value = { ...sortByBook.value, [code]: { by: id, dir: isDir(dir) ? dir : DEFAULT_DIR } }
}
