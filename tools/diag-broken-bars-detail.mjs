// Locate every bar whose written beats don't match the time signature, and describe WHERE it is in
// terms the content owner can point at on the sheet: which ท่อน (stanza) the melody belongs to,
// which line of that ท่อน, which bar of that line — never an array index. READ-ONLY, no DB writes.
//
// It walks the RESOLVED lines, the same base the library sweep (diag-rhythm.mjs) uses, because the
// pickup (ห้องยก) markers that make a short bar legitimate are added by resolveContent and are NOT
// present on the raw stanza lines. Reading the raw stanzas instead flagged 58 songs where the sweep
// flags 12 — every extra one a declared pickup or a bar wrapped across a line break.
//   run: node tools/diag-broken-bars-detail.mjs <songs.json> [number]
import { readFileSync } from 'node:fs'
import { beatCount, parseNotes, expectedBeats } from '../src/lib/notation.js'
import { resolveContent } from '../src/lib/songModel.js'

const [songsPath, only] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const rnd = (x) => Math.round(x * 1000) / 1000
const near = (a, b) => Math.abs(a - b) < 1e-6

for (const s of songs) {
  const c = s.content || {}
  if (only && String(s.number) !== String(only)) continue
  const exp = expectedBeats(c.timeSignature)
  if (!exp) continue
  const lines = Array.isArray(c.lines) && c.lines.length ? c.lines : resolveContent(c)
  if (!lines.length) continue

  // which verses sing each ท่อน — a broken bar in a shared melody is heard in every one of them
  const sungBy = {}
  for (const e of c.arrangement || []) {
    if (!e || !e.stanza) continue
    const l = e.label || '(ไม่มีชื่อ)'
    if (!(sungBy[e.stanza] || []).includes(l)) (sungBy[e.stanza] = sungBy[e.stanza] || []).push(l)
  }
  // lines per ท่อน, so "line 2 of 4" counts within the ท่อน the owner sees, not the whole song
  const linesPerStanza = {}
  for (const ln of lines) if (ln._stanza != null) linesPerStanza[ln._stanza] = Math.max(linesPerStanza[ln._stanza] || 0, (ln._stanzaLine ?? 0) + 1)

  const barsOf = (line) => {
    const bars = []
    let cur = { notes: [], beats: 0, pickup: false }
    const push = () => { bars.push(cur); cur = { notes: [], beats: 0, pickup: false } }
    for (const it of line || []) {
      if (it.type === 'bar') { push(); continue }
      if (it.type === 'pickup') { cur.pickup = true; continue }
      if (it.type !== 'segment' || !it.note) continue
      cur.notes.push(it.note)
      cur.beats += beatCount(parseNotes(it.note))
    }
    push()
    return bars.filter((b) => b.notes.length)
  }
  const perLine = lines.map(barsOf)

  // A ท่อน that several verses sing appears once per verse in the resolved output. Its bars are
  // therefore judged several times, and at a verse boundary the neighbouring line belongs to a
  // DIFFERENT ท่อน — so a bar that legitimately wraps into its own ท่อน's next line can look broken
  // in the one occurrence where the neighbour is the refrain instead. Judging each occurrence and
  // keeping only the bars that come out short in EVERY one of them removes that artefact; it was
  // the difference between this tool reporting 55 songs and the library sweep reporting 12.
  const verdicts = new Map() // stanza|line|bar -> { off, total, info }
  lines.forEach((line, li) => {
    const real = perLine[li]
    real.forEach((b, bi) => {
      const st = line._stanza ?? '?'
      const lineNo = (line._stanzaLine ?? li) + 1
      const key = `${st}|${lineNo}|${bi}`
      const prevLast = li > 0 ? perLine[li - 1][perLine[li - 1].length - 1] : null
      const nextFirst = perLine[li + 1] ? perLine[li + 1][0] : null
      let off = !near(b.beats, exp)
      if (b.pickup && b.beats < exp) off = false
      if (bi === real.length - 1 && nextFirst && near(b.beats + nextFirst.beats, exp)) off = false
      if (bi === 0 && prevLast && near(b.beats + prevLast.beats, exp)) off = false
      const v = verdicts.get(key) || { off: 0, total: 0, info: null }
      v.total++
      if (off) v.off++
      v.info = { stanza: st, lineNo, ofLines: linesPerStanza[st] ?? '?', barNo: bi + 1, ofBars: real.length,
        beats: rnd(b.beats), diff: rnd(b.beats - exp), notes: b.notes.join('  '), sungBy: sungBy[st] || [] }
      verdicts.set(key, v)
    })
  })
  const found = [...verdicts.values()].filter((v) => v.off === v.total && v.off > 0).map((v) => v.info)
  if (!found.length) continue
  console.log(`\n#${s.number} ${s.title_th}  [${c.timeSignature} → ห้องละ ${exp} จังหวะ]`)
  for (const f of found) {
    console.log(`  ท่อน ${f.stanza} (ร้อง: ${f.sungBy.join(', ') || '—'}) · บรรทัดที่ ${f.lineNo}/${f.ofLines} · ห้องที่ ${f.barNo}/${f.ofBars}`)
    console.log(`      ได้ ${f.beats} ควรได้ ${exp} (${f.diff > 0 ? '+' : ''}${f.diff})   โน้ตในห้อง: ${f.notes}`)
  }
}
