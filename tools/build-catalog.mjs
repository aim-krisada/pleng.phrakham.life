// Save the public song catalog as dist/catalog.json, so readers get it from GitHub Pages instead of
// the database (Supabase free plan quota — see src/lib/catalogSource.js for the whole story).
//
// Runs in deploy.yml after `npm run build`, at every deploy and once a day. Uses the site's own
// publishable key, so it sees exactly what a visitor who is not signed in sees: checked songs only.
//
//   node tools/build-catalog.mjs [outDir=dist]
import { writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = process.argv[2] || 'dist'
// The same URL + key the app uses (src/supabase.js) — read from there so they never drift apart.
const src = readFileSync(new URL('../src/supabase.js', import.meta.url), 'utf8')
const URL_ = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1]
const KEY = src.match(/SUPABASE_KEY\s*=\s*'([^']+)'/)?.[1]
const COLS = readFileSync(new URL('../src/lib/offlineSongs.js', import.meta.url), 'utf8')
  .match(/CATALOG_COLUMNS\s*=\s*\n?\s*'([^']+)'/)?.[1]
if (!URL_ || !KEY || !COLS) throw new Error('cannot read the Supabase URL/key or CATALOG_COLUMNS')

const PAGE = 1000
const rows = []
for (let from = 0; ; from += PAGE) {
  const q = `${URL_}/rest/v1/songs?select=${encodeURIComponent(COLS + ',updated_at')}` +
    `&deleted_at=is.null&order=number.asc,id.asc`
  const res = await fetch(q, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + PAGE - 1}` },
  })
  if (!res.ok) throw new Error(`songs read failed: ${res.status} ${await res.text()}`)
  const page = await res.json()
  rows.push(...page)
  if (page.length < PAGE) break
}

const pub = rows.filter((r) => r.verified !== false)
if (pub.length < 100) throw new Error(`only ${pub.length} songs — refusing to publish a short catalog`)
// `at` = the newest change in the file; pages ask the database only for songs changed after it.
const at = pub.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '')
const out = pub.map(({ updated_at, ...r }) => r)
const body = JSON.stringify({ v: 1, at, count: out.length, rows: out })
writeFileSync(join(outDir, 'catalog.json'), body)
console.log(`catalog.json: ${out.length} songs, newest change ${at}, ${(body.length / 1e6).toFixed(2)} MB`)
