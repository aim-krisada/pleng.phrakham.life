// Every off-beat bar of one song, with a proposed correction that is VERIFIED bar by bar rather
// than assumed from the pattern. PM's point: telling the content owner "the pattern repeats, go
// find the other 39 yourself" hands the work back; and assuming 40 bars are identical because
// three of them were is exactly the kind of guess that has to be checked, not trusted.
//   run: node tools/diag-108-table.mjs <songs.json> <number>
import { readFileSync } from 'node:fs'
import { beatCount, parseNotes, expectedBeats } from '../src/lib/notation.js'
import { offBarsOf } from './diag-bars.mjs'

const [songsPath, num] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const s = songs.find((x) => String(x.number) === String(num))
const c = s.content
const exp = expectedBeats(c.timeSignature)
const B = (str) => beatCount(parseNotes(str))

// The correction under test: a note carrying an augmentation dot on a beamed note (`X_.` = ¾ of a
// beat) must be answered by a SIXTEENTH (`Y__` = ¼) to complete the beat. Where the data writes an
// eighth (`Y_` = ½) instead, the bar runs over by ¼. Applied only to the box immediately after a
// `_.` box, and every result is re-counted before it is reported.
function fixBar(notes) {
  const boxes = notes.join(' ').trim().split(/\s+/)
  const out = boxes.slice()
  const changes = []
  for (let i = 0; i < boxes.length - 1; i++) {
    if (!/_\.$/.test(boxes[i])) continue
    const nxt = boxes[i + 1]
    if (!/_$/.test(nxt) || /__$/.test(nxt)) continue
    out[i + 1] = `${nxt}_`
    changes.push({ from: nxt, to: `${nxt}_` })
  }
  return { text: out.join(' '), changes }
}

const off = offBarsOf(c)
console.log(`#${s.number} ${s.title_th} · ${c.timeSignature} → ห้องละ ${exp} จังหวะ · ห้องที่ผิด ${off.length} ห้อง\n`)
console.log('| บรรทัด | ห้อง | ตอนนี้พิมพ์ไว้ | ได้ | แก้เป็น | ได้หลังแก้ |')
console.log('|---|---|---|---|---|---|')
let ok = 0
let noRule = 0
for (const b of off) {
  const cur = b.notes.join(' ')
  const f = fixBar(b.notes)
  const after = B(f.text)
  const good = Math.abs(after - exp) < 1e-6
  if (!f.changes.length) { noRule++ }
  else if (good) ok++
  console.log(`| ${b.lineNo} | ${b.barNo}/${b.ofBars} | \`${cur}\` | ${B(cur)} | ${f.changes.length ? `\`${f.text}\`` : '**ไม่เข้ากฎ — ต้องดูเอง**'} | ${f.changes.length ? `${after}${good ? ' ✅' : ' ❌'}` : '—'} |`)
}
console.log(`\nสรุป: ${off.length} ห้อง · แก้ตามกฎแล้วลงตัวพอดี ${ok} ห้อง · ไม่เข้ากฎต้องดูเอง ${noRule} ห้อง`)
