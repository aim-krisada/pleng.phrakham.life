// m1.wpa.24.us01 — which sort each BOOK is left on, remembered per book.
//
// พี่เปา confirmed (3 ส.ค. · issue v3/pleng#1): "เล่มใหญ่เลือกตามเลข เล่มเด็กเล็กเลือกตาม
// ตัวอักษรไว้ ก็ให้จำแยกเล่มไป" — so this is a MAP keyed by book code, not one global
// setting. A single global value was the team's earlier guess and is explicitly wrong.
//
// Storage only. It does NOT know how to sort — the order itself comes from songSort.js
// (the one place allowed to sort songs), and this file only ever stores an id that
// songSort.js recognises as pickable.
//
// Shape mirrors lib/paperSize.js (reactive ref + a watcher that persists) and the
// `pleng.*` key naming used by favorites/playlists/siteFont.
import { ref, watch } from 'vue'
import { PICKABLE_SORTS, DEFAULT_SORT } from './songSort.js'

const KEY = 'pleng.sortByBook'
const PICKABLE_IDS = PICKABLE_SORTS.map((o) => o.id)

// Only ids the user can actually pick are storable: a stale key from an older build
// (or hand-edited storage) must never leave a book stuck on a sort with no button.
function isPickable(id) {
  return PICKABLE_IDS.includes(id)
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const clean = {}
      for (const [code, id] of Object.entries(raw)) if (isPickable(id)) clean[code] = id
      return clean
    }
  } catch {
    /* corrupt / no storage (private mode, SSR) — start empty */
  }
  return {}
}

// The single source of truth: { '<category code>': '<sort id>' }. A book that was never
// touched is simply absent → it falls back to DEFAULT_SORT, so the very first visit to any
// book still lists by number.
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

// The sort a book should be shown with right now.
export function bookSort(code) {
  const id = code ? sortByBook.value[code] : null
  return isPickable(id) ? id : DEFAULT_SORT
}

// Remember a book's choice. Replaces the object so the watcher fires even where a plain
// property write on a shallow ref would not.
export function setBookSort(code, id) {
  if (!code || !isPickable(id)) return
  sortByBook.value = { ...sortByBook.value, [code]: id }
}
