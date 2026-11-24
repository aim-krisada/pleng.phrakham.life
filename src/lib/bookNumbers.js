// ใส่เลขเพลงทั้งเล่มในหน้าเดียว (ใบ v3/pleng#182)
//
// WHY: พี่เปาจะใส่เลขเพลงเล่มเด็กเล็กใหม่ให้ตรงกับเล่มกระดาษที่ถืออยู่ — ไม่มีไฟล์รายการเลข ต้องเปิดเล่ม
// แล้วใส่ทีละเพลง. ผ่านหน้าแก้เพลงต้องเปิด → แก้ → บันทึก ทีละเพลง × 74 เพลง. หน้านี้วางทุกเพลงของเล่ม
// เรียงตามชื่อ มีช่องเลขของตัวเอง ใส่ไม่ครบก็บันทึกได้ (พี่เอม 24 พ.ย. 2569).
//
// Pure helpers only — the page (views/BookNumbers.vue) owns the reads and writes.
import { sortSongs } from './songSort.js'

// The highest number the import door accepts (db/014: ^[1-9][0-9]{0,4}$) — the same bound here,
// so a number typed on this page can always travel through the other doors too.
export const MAX_NUMBER = 99999

// What is typed in a box → { ok, value }. Blank = "no number" (value null), which is allowed:
// a song not yet found in the paper book simply has none. Thai digits are accepted, since a
// Thai keyboard may type them.
export function parseNumberInput(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)))
  if (s === '') return { ok: true, value: null }
  if (!/^[0-9]+$/.test(s)) return { ok: false, value: null }
  const n = Number(s)
  if (n < 1 || n > MAX_NUMBER) return { ok: false, value: null }
  return { ok: true, value: n }
}

// The songs of one book, ก-ฮ by title — the order the person searches the list in while turning
// the pages of the paper book (the number cannot be the order: it is the thing being typed).
export function bookRows(songs, code) {
  const inBook = (songs || []).filter((s) => s && s.category === code)
  return sortSongs(inBook, 'title', 'asc').map((s) => ({
    id: s.id,
    title: s.title_th || s.title_en || 'เพลงไม่มีชื่อ',
    verified: !!s.verified,
    saved: s.number ?? null, // what the library holds now
    input: s.number == null ? '' : String(s.number), // what the box shows
  }))
}

// Numbers typed into more than one box → Set of those numbers. Only valid, non-blank values count.
export function duplicateNumbers(rows) {
  const seen = new Set()
  const dup = new Set()
  for (const r of rows || []) {
    const { ok, value } = parseNumberInput(r.input)
    if (!ok || value == null) continue
    if (seen.has(value)) dup.add(value)
    seen.add(value)
  }
  return dup
}

// The row's state, for the screen: 'bad' (not a number) · 'dup' · 'changed' · 'same'.
export function rowState(row, dups) {
  const { ok, value } = parseNumberInput(row.input)
  if (!ok) return 'bad'
  if (value != null && dups && dups.has(value)) return 'dup'
  return value === row.saved ? 'same' : 'changed'
}

// What a save would write: [{ id, number }] for every row whose box differs from the library.
// Rows that are not a valid number are left out (the page blocks saving while any exist).
export function pendingChanges(rows) {
  const out = []
  for (const r of rows || []) {
    const { ok, value } = parseNumberInput(r.input)
    if (ok && value !== r.saved) out.push({ id: r.id, number: value })
  }
  return out
}

// Does a title match what is typed in the find box? Spaces are ignored on both sides, since
// a printed title and the stored one often differ only in spacing.
export function titleMatches(title, query) {
  const q = String(query || '').replace(/\s+/g, '').toLowerCase()
  if (!q) return true
  return String(title || '').replace(/\s+/g, '').toLowerCase().includes(q)
}
