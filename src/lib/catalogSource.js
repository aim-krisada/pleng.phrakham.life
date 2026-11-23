// Where the song catalog comes from — kept cheap for the database (Supabase free plan).
//
// WHY (พี่เอม 23 พ.ย. 2569): Supabase mailed that the project went past the free plan's 5.5 GB of
// data sent out per month. Every visit to the home page — and every song page, to keep the offline
// copy fresh — pulled the WHOLE catalog from the database: ~5.5 MB (≈1.1 MB zipped) each time.
// From 23 ธ.ค. 2569 going past the limit gets the site restricted, so the catalog had to move off
// the database for the people who only read songs.
//
// HOW: at every deploy and every night (`npm run build`, deploy.yml) tools/build-catalog.mjs saves the catalog as
// `catalog.json` beside the site on GitHub Pages, which has no such quota. A reader's page:
//   1. reads that file from GitHub,
//   2. asks the database only for songs changed AFTER the file was made, plus a count of songs
//      (tiny answers — usually zero rows),
//   3. only if the count says a song disappeared (trashed or un-checked), asks for the list of ids
//      (~40 KB) to drop it.
// So a team edit still shows to readers at once, while the database sends almost nothing.
//
// The team (signed in) still reads the full list from the database: they must see unchecked songs,
// which the public file never holds, and there are only a handful of them.
import { supabase } from '../supabase.js'
import { fetchAllRows } from './fetchAllRows.js'
import { CATALOG_COLUMNS } from './offlineSongs.js'

export const CATALOG_FILE = 'catalog.json'
// More changes than this since the file was made → just read the full list (the file is stale).
export const MAX_DELTA = 150

// The order both the database query and the merged list use: number ascending with blank numbers
// last (Postgres' default for ascending), then id — a total order, so lists compare equal.
export function catalogOrder(a, b) {
  const an = a.number ?? null
  const bn = b.number ?? null
  if (an !== bn) {
    if (an === null) return 1
    if (bn === null) return -1
    return an < bn ? -1 : 1
  }
  return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0
}

// Pure: the file's rows with the changed rows laid over them (replace by id, add new ones), then
// — when the database's list of ids is known — anything no longer in it dropped. Sorted.
export function mergeCatalog(fileRows, changed, keepIds = null) {
  const byId = new Map(fileRows.map((r) => [r.id, r]))
  for (const r of changed) {
    const { updated_at, ...row } = r // the stamp is for the query only; rows match CATALOG_COLUMNS
    byId.set(row.id, row)
  }
  let rows = [...byId.values()]
  if (keepIds) {
    const keep = new Set(keepIds)
    rows = rows.filter((r) => keep.has(r.id))
  }
  // never show an unchecked song to a reader, even if one slipped into an answer
  return rows.filter((r) => r.verified !== false).sort(catalogOrder)
}

// The whole list straight from the database — the team's path, and the fallback.
export function fetchFullCatalog({ quick = false } = {}) {
  return fetchAllRows(() => {
    let q = supabase
      .from('songs')
      .select(CATALOG_COLUMNS)
      .is('deleted_at', null) // db/012: trashed songs never show in the catalog
      .order('number', { ascending: true })
      .order('id', { ascending: true }) // a total order, so pages never overlap or skip
    // A copy is already on screen → give up at the first failure instead of retrying ~7 s.
    if (quick && typeof q.retry === 'function') q = q.retry(false)
    return q
  })
}

// One read per page load: the home page, the song page and its editor all ask within seconds.
// Kept for a minute, so a long-open tab still picks up the next day's file.
let filePromise = null
let fileAt = 0
export function _forgetCatalogFile() { filePromise = null }
function readCatalogFile() {
  if (!filePromise || Date.now() - fileAt > 60_000) {
    fileAt = Date.now()
    filePromise = loadCatalogFile().then((f) => { if (!f) filePromise = null; return f })
  }
  return filePromise
}

async function loadCatalogFile() {
  try {
    // no-cache = ask GitHub whether the file changed (a tiny "not modified" when it did not)
    const res = await fetch(CATALOG_FILE, { cache: 'no-cache' })
    if (!res.ok) return null
    const file = await res.json()
    if (!file || !Array.isArray(file.rows) || !file.rows.length || !file.at) return null
    return file
  } catch {
    return null
  }
}

// → { data, error } like a Supabase read.
export async function fetchCatalog({ signedIn = false, quick = false } = {}) {
  if (signedIn) return fetchFullCatalog({ quick })
  const file = await readCatalogFile()
  if (!file) return fetchFullCatalog({ quick })

  let changedQ = supabase
    .from('songs')
    .select(CATALOG_COLUMNS + ', updated_at')
    .is('deleted_at', null)
    .gt('updated_at', file.at)
    .limit(MAX_DELTA + 1)
  let countQ = supabase.from('songs').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  if (quick) {
    if (typeof changedQ.retry === 'function') changedQ = changedQ.retry(false)
    if (typeof countQ.retry === 'function') countQ = countQ.retry(false)
  }
  const [changed, counted] = await Promise.all([changedQ, countQ])
  // The database cannot be reached: the file alone is still a good, recent list.
  if (changed.error || counted.error) return { data: mergeCatalog(file.rows, []), error: null }
  if ((changed.data || []).length > MAX_DELTA) return fetchFullCatalog({ quick })

  let rows = mergeCatalog(file.rows, changed.data || [])
  if (typeof counted.count === 'number' && rows.length !== counted.count) {
    // A song left the public list (trashed or un-checked) — learn which by its id.
    const ids = await fetchAllRows(() =>
      supabase.from('songs').select('id').is('deleted_at', null).order('id', { ascending: true }))
    if (ids.error) return { data: rows, error: null }
    rows = mergeCatalog(file.rows, changed.data || [], ids.data.map((r) => r.id))
    // still not matching → something the file cannot explain; read the real list
    if (rows.length !== counted.count) return fetchFullCatalog({ quick })
  }
  return { data: rows, error: null }
}
