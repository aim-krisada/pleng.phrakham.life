// Rhythm sweep, round 2 — READ-ONLY. Round 1 measured only two things (does a bar's written
// beats add up, and does a note onset land on the 1/4-beat grid) and it measured them on the
// WRONG note list: it called songToNotes() directly, while playback calls buildPlayNotes() with
// resolvePlayOrder() — so a strophic song (ท่อนรับ ร้องทุกข้อ) was never measured in the order it
// is actually played. Round 2 fixes that and adds the criteria an ear catches but those two miss.
//
//   run: node tools/diag-rhythm2.mjs <songs.json> <srcDir>
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [songsPath, dir] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const midi = await import(pathToFileURL(`${dir}/src/lib/midi.js`).href)
const model = await import(pathToFileURL(`${dir}/src/lib/songModel.js`).href)

// quarter-note beats in ONE bar of this time signature — the honest bar length. NOT the
// numerator: a 6/8 bar is 3 quarter-beats, not 6.
function barBeats(ts) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(ts || '')
  return m ? (Number(m[1]) * 4) / Number(m[2]) : null
}
const near = (a, b) => Math.abs(a - b) < 1e-6
const rnd = (x) => Math.round(x * 1000) / 1000

const rows = []
for (const s of songs) {
  const c = s.content || {}
  const lines = Array.isArray(c.lines) && c.lines.length ? c.lines : model.resolveContent(c)
  const res = { ...c, lines }
  const order = model.resolvePlayOrder(c) ?? undefined
  const ts = c.timeSignature
  const bb = barBeats(ts)
  const findings = []

  // ── 1. the arranger's bar grid. Everything that locks to the bar (metric accent, the
  //       hold-pulse, the comping patterns, the answer fills) is handed beatsPerBar =
  //       parseInt(timeSignature) — the NUMERATOR. For a compound meter that is not the bar,
  //       so the strong beat lands on the wrong note while every duration stays correct.
  const numerator = parseInt(ts, 10)
  if (bb != null && numerator > 0 && !near(numerator, bb)) {
    findings.push({ kind: 'arranger-bar-grid', why: `arranger ใช้ ${numerator} จังหวะ/ห้อง แต่ห้องจริง ${bb}`, weight: 100 })
  }

  // ── 2. play-order seams. Each range of the play order is concatenated end-to-end. If a range
  //       does not contain a whole number of bars, the NEXT range starts part-way through a bar
  //       — the refrain comes in off the beat every time it repeats. Round 1 could not see this
  //       at all, because it never applied the order.
  //       A range that ends short is NORMAL when the next range opens with a pickup (ห้องยก) of
  //       exactly the missing length — that is how a verse hands over to a refrain. So a seam only
  //       counts when the leftover and the next range's OPENING partial bar do not complete one bar.
  let seams = []
  if (order && order.length && bb) {
    const all = midi.songToNotes(res)
    const ofRange = (r) => all.filter((n) => n.li >= r.fromLi && n.li <= r.toLi)
    // beats before the first bar line of a range = the pickup it opens with
    const leadIn = (r) => {
      const ns = ofRange(r)
      if (!ns.length) return 0
      const firstBar = `${ns[0].li}|${ns[0].bi}`
      let t = 0
      for (const n of ns) { if (`${n.li}|${n.bi}` !== firstBar) break; t += n.beats }
      return t < bb ? t : 0 // a full opening bar is no pickup
    }
    order.forEach((r, i) => {
      if (i >= order.length - 1) return
      const beats = ofRange(r).reduce((t, n) => t + n.beats, 0)
      const rem = ((beats % bb) + bb) % bb
      if (near(rem, 0)) return
      const pick = leadIn(order[i + 1])
      if (near(rem + pick, bb) || near(rem + pick, 0)) return // the next ท่อน's pickup completes it
      seams.push({ i, range: `${r.fromLi}-${r.toLi}`, beats: rnd(beats), short: rnd(bb - rem), pick: rnd(pick) })
    })
    if (seams.length) findings.push({ kind: 'order-seam', why: `รอยต่อท่อนเข้าไม่ตรงต้นห้อง ${seams.length} จุด`, weight: 80, detail: seams })
  }

  // ── 3. NOT measurable this way: "a bar plays longer than the bar". Summing played beats per
  //       (li,bi) over-counts every tie that crosses a bar line, because mergeTies folds the
  //       later note into the earlier one and the merged note keeps the EARLIER bar's label.
  //       That artifact flagged ~90 songs in the first draft of this sweep and every sample I
  //       opened was a plain, correct cross-bar tie (e.g. #33 `5~ - -` → `~5 - 0`). Written bar
  //       lengths are already checked by diag-rhythm.mjs, which counts the notation, not the
  //       merged playback list — so the check belongs there and is deliberately not repeated here.
  const played = midi.buildPlayNotes(res, { order })

  // ── 3b. THE BIG ONE: the arranger's bar grid is anchored at played beat 0 — the first note.
  //       When the song opens with a pickup (ห้องยก), beat 0 is NOT a downbeat, so every bar-locked
  //       layer (metric accent, hold pulse, comping pattern, walking bass, answer fills) puts its
  //       strong beat `bb - pickup` beats away from the real one, for the whole song. Nothing in
  //       the arranger compensates — there is no pickup/anchor/offset term anywhere in it.
  //       The melody itself is untouched, which is why every duration measures correct: the tune is
  //       right and the accompaniment is leaning on the wrong beat. That is what an ear calls
  //       "จังหวะแปลก" and what neither of round 1's two criteria could see.
  if (bb && played.length) {
    const k0 = `${played[0].li}|${played[0].bi}`
    let first = 0
    for (const n of played) { if (`${n.li}|${n.bi}` !== k0) break; first += n.beats }
    if (first < bb - 1e-6) {
      findings.push({ kind: 'grid-shift', why: `เปิดด้วยห้องยก ${rnd(first)} จังหวะ → จังหวะหนักของเครื่องดนตรีคลอเหลื่อมไป ${rnd(bb - first)} จังหวะทั้งเพลง`, weight: 120 })
    }
  }

  // ── 4. tempo. No bpm → playback falls back to a fixed default that may be far from the song.
  if (!Number(c.bpm)) findings.push({ kind: 'no-bpm', why: 'ไม่มี bpm → ใช้ค่าตั้งต้น', weight: 20 })

  // ── 5. a refrain marked ร้องรับทุกข้อ whose order did NOT expand (the directive is ignored).
  const hasAfterEach = (c.arrangement || []).some((e) => e && e.afterEachVerse)
  if (hasAfterEach && !(order && order.length > (c.arrangement || []).length)) {
    findings.push({ kind: 'refrain-not-repeated', why: 'มี ร้องรับทุกข้อ แต่ลำดับเล่นไม่ได้ซ้ำท่อนรับ', weight: 70 })
  }

  if (findings.length) {
    rows.push({ n: s.number, t: s.title_th, ts, bb, notes: played.length,
      score: findings.reduce((a, f) => a + f.weight, 0), findings })
  }
}

rows.sort((a, b) => b.score - a.score)
const L = []
const say = (x = '') => { L.push(x); console.log(x) }
say(`ตรวจ ${songs.length} เพลง · พบที่น่าสงสัย ${rows.length} เพลง (เรียงจากน่าจะได้ยินชัดที่สุด)`)
say()
for (const r of rows) {
  say(`#${String(r.n).padStart(4)} ${r.t}  [${r.ts}]  ${r.notes} โน้ต  · คะแนน ${r.score}`)
  for (const f of r.findings) {
    say(`      ${f.kind}: ${f.why}`)
    if (f.detail) for (const d of f.detail.slice(0, 4)) say(`          ท่อนบรรทัด ${d.range} = ${d.beats} จังหวะ (ขาดอีก ${d.short} ถึงจะเต็มห้อง)`)
  }
}
writeFileSync(process.env.OUT2 || 'diag-rhythm2.txt', L.join('\n'))
