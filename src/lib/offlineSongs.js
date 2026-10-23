// Offline song library — the installed app must open and show songs with no internet (a church
// with no signal). The service worker (public/sw.js) already keeps the app files and instrument
// samples; it never touches the song database, which lives on another host. So the pages keep
// their own copy: every time the catalog loads from the database it is saved here, and when the
// database cannot be reached the pages read this copy instead.
//
// Only VERIFIED songs are kept — exactly what a visitor who is not logged in may see. A team
// member's device therefore never holds unfinished songs that could later show to someone else
// on the same device after logout. Each save REPLACES the whole copy, so a song that was deleted
// or un-verified drops out on the next online visit.
//
// IndexedDB, not localStorage: the catalog is ~3.8 MB of JSON (mostly Thai) and growing, which
// is already near localStorage's 5 MB cap. Not the Cache API either: sw.js prunes every `pleng-*`
// cache it does not know about when it updates.
import { ref } from 'vue'

// The one column list both catalog fetches use (home page + the song page's picker), so either
// page can fill the copy and the copy holds everything the song page needs to show a song.
export const CATALOG_COLUMNS =
  'id, number, title_th, title_en, content, category, theme, verified, book_refs, scripture, review_flags'

const DB_NAME = 'pleng-offline'
const STORE = 'kv'
const KEY = 'catalog'

function idbBackend() {
  let dbp = null
  const open = () => (dbp ||= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => { dbp = null; reject(r.error) }
  }))
  const run = async (mode, fn) => {
    const db = await open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const r = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(r.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }
  return {
    get: (k) => run('readonly', (s) => s.get(k)),
    put: (k, v) => run('readwrite', (s) => s.put(v, k)),
  }
}

let backend = idbBackend()
// tests only — jsdom has no IndexedDB
export function _setBackend(b) { backend = b }

// When the page is showing the saved copy because the database could not be reached: the time
// that copy was saved (ms). 0 = the page is showing live data. Pages read it for their notice.
export const offlineSince = ref(0)

// A supabase result that failed because the request never reached the server (no internet, DNS,
// blocked) — as opposed to the server answering "no such row" or refusing. postgrest-js reports
// a network failure as status 0.
export function isNetworkFailure(res) {
  return !!res && !!res.error && !res.status
}

export function publicRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((r) => r && r.verified && !r.deleted_at)
}

export async function saveCatalog(rows) {
  const keep = publicRows(rows)
  if (!keep.length) return false
  try {
    await backend.put(KEY, { at: Date.now(), rows: keep })
    return true
  } catch { return false } // private mode / storage full — the app still works online
}

export async function readCatalog() {
  try {
    const v = await backend.get(KEY)
    return v && Array.isArray(v.rows) && v.rows.length ? v : null
  } catch { return null }
}

export async function readSong(id) {
  const c = await readCatalog()
  return (c && c.rows.find((r) => String(r.id) === String(id))) || null
}

// "ล่าสุด 23 ต.ค. 2569" — when the copy being shown was saved.
export function savedDateLabel(ms) {
  if (!ms) return ''
  try {
    return new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '' }
}
