// Verify phrase-first search ranking against the REAL live corpus (read-only SELECT).
// Before = matched songs in catalog order (how the old filterSongs displayed them).
// After  = current filterSongs (ranked). Reports the target song's index in each.
import { filterSongs, scoreSong, normalize } from '../src/lib/songSearch.js'

const URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'

// Read-only fetch of the whole catalog, ordered by number (mirrors the app's list order).
const res = await fetch(`${URL}/rest/v1/songs?select=number,title_th,title_en,content,book_refs,scripture&order=number.asc`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
})
if (!res.ok) { console.error('fetch failed', res.status, await res.text()); process.exit(1) }
const songs = await res.json()
console.log(`corpus: ${songs.length} songs (read-only)\n`)

const TARGET = 'ยามพระเจ้าอยู่ร่วมกับเรา'
const idxOf = (list) => list.findIndex((s) => s.title_th === TARGET)

// "Before": old filterSongs kept catalog order — i.e. matched songs, catalog-sorted.
function beforeRank(songs, q) {
  const nq = normalize(q)
  return songs.filter((s) => scoreSong(s, nq) !== null) // catalog order preserved
}

function line(label, q) {
  const before = beforeRank(songs, q)
  const after = filterSongs(songs, q)
  const bi = idxOf(before), ai = idxOf(after)
  const topAfter = after.slice(0, 3).map((s) => `#${s.number} ${s.title_th}`).join('  |  ')
  console.log(`"${q}" (${[...q].length} ต.อ.) → ผลทั้งหมด ${after.length}`)
  console.log(`   ก่อน: target index ${bi} (จาก ${before.length})`)
  console.log(`   หลัง: target index ${ai}   ← top3: ${topAfter}`)
  console.log('')
}

console.log('=== เป้าหมาย: ' + TARGET + ' ===\n')
for (const q of ['ยามพระ', 'ยามพระเจ้า', 'ยามพระเจ้าอยู่']) line('', q)

// Spot-check other queries don't regress: target song still found, top result sensible.
console.log('=== spot-check (ไม่พังของเดิม) ===\n')
for (const q of ['พระเจ้า', 'ความรัก', 'สรรเสริญ', 'ยาม']) {
  const after = filterSongs(songs, q)
  const top = after.slice(0, 3).map((s) => `#${s.number} ${s.title_th}`).join('  |  ')
  console.log(`"${q}" → ${after.length} ผล · top3: ${top}`)
}
