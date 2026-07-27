// READ-ONLY audit — which songs in the live library already share a title?
// Uses the same comparison core the app now guards with (src/lib/songTitleKey.js), so the
// report and the guard can never disagree. Reads through the public publishable key; it
// writes nothing, anywhere.
//
//   node tools/audit-duplicate-titles.mjs            # summary
//   node tools/audit-duplicate-titles.mjs --json     # machine-readable
import { titleKeyExact, isSimilarTitle, bookKey } from '../src/lib/songTitleKey.js'
import { categoryName } from '../src/lib/bookshelf.js'

const URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co/rest/v1/songs'
const KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'

const res = await fetch(
  `${URL}?select=id,number,title_th,title_en,category,verified&order=number.asc&limit=2000`,
  { headers: { apikey: KEY } },
)
const songs = await res.json()
if (!Array.isArray(songs)) throw new Error('read failed: ' + JSON.stringify(songs))

const exact = []
const similar = []
for (let i = 0; i < songs.length; i++) {
  for (let j = i + 1; j < songs.length; j++) {
    const a = songs[i]
    const b = songs[j]
    if (bookKey(a) !== bookKey(b)) continue // same title in another เล่ม is normal
    if (titleKeyExact(a.title_th) === titleKeyExact(b.title_th)) exact.push([a, b])
    else if (isSimilarTitle(a.title_th, b.title_th)) similar.push([a, b])
  }
}

const label = (s) => `${categoryName(s.category) || '(ยังไม่จัดเล่ม)'} ${s.number ?? '?'} · ${s.title_th}`
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total: songs.length, exact, similar }, null, 2))
} else {
  console.log(`ทั้งคลัง ${songs.length} เพลง`)
  console.log(`\nชื่อเหมือนเป๊ะ ในเล่มเดียวกัน: ${exact.length} คู่`)
  for (const [a, b] of exact) console.log(`  · ${label(a)}   ==   ${label(b)}`)
  console.log(`\nชื่อคล้ายกัน ในเล่มเดียวกัน: ${similar.length} คู่`)
  for (const [a, b] of similar) console.log(`  · ${label(a)}   ~~   ${label(b)}`)
}
