// B118 A8 — sweep the readable song library for curves that run from one ห้อง into the next:
//   · cross-bar SLURS — '(' and ')' land in different bars
//   · cross-bar TIES  — a '~' receiver whose source digit sits in the previous bar
// Those are exactly the curves the EDITOR used to break into two stubs, because it renders
// one mini-SongSheet PER BAR (barContent) so no single component could span the barline.
// (The แผ่นเพลง sheet was always fine — there a whole line lives in one SongSheet.)
//
//   node tools/audit-cross-bar-slurs.mjs           → the report
//   node tools/audit-cross-bar-slurs.mjs --json F  → also write the raw hits to F
//
// SCOPE LIMIT (must stay in any report built from this): it reads Supabase with the
// PUBLISHABLE (anon) key, so it only sees rows the anon role may read. Draft / unverified
// songs behind an auth RLS policy are NOT covered — never call this a 100% sweep.
import { supabase } from '../src/supabase.js'
import { parseNotes } from '../src/lib/notation.js'
import { resolveContent } from '../src/lib/songModel.js'

// Walk one resolved LINE (flat array of {type:segment|bar|...}) and return every curve that
// crosses a barline. Bars are counted the way the editor lays them out, so `bi` here is the
// same ห้อง index the editor's .ed-bar[data-bar] carries.
function crossBarCurves(line) {
  const out = []
  const stack = []
  const flat = [] // note/ext tokens in reading order, tagged with their bar
  let bi = 0
  let si = -1
  let lastNote = null

  for (const item of line || []) {
    if (item.type === 'bar') { bi++; continue }
    if (item.type !== 'segment') continue
    si++
    for (const t of parseNotes(item.note || '')) {
      if (t.type === 'open' && t.group === 'slur') {
        stack.push({ bi, si })
      } else if (t.type === 'close' && t.group === 'slur') {
        const open = stack.pop()
        if (open && lastNote && open.bi !== bi) {
          out.push({ kind: 'slur', openBi: open.bi, openSi: open.si, closeBi: bi, closeSi: si })
        }
      } else if (t.type === 'note' || t.type === 'ext') {
        if (t.type === 'note') lastNote = t
        flat.push({ t, bi, si })
      }
    }
  }

  // a tie's SOURCE is the previous DIGIT — skip back over the '-' extension dashes, the same
  // walk both overlays do, so "2 - - - | ~2" pairs the digits and not the last dash
  flat.forEach((x, i) => {
    if (!(x.t.type === 'note' && x.t.tieEnd)) return
    let p = i - 1
    while (p >= 0 && flat[p].t.type === 'ext') p--
    if (p >= 0 && flat[p].bi !== x.bi) {
      out.push({ kind: 'tie', openBi: flat[p].bi, openSi: flat[p].si, closeBi: x.bi, closeSi: x.si })
    }
  })
  return out
}

const { data, error } = await supabase.from('songs').select('id,number,title_th,content')
if (error) { console.error('supabase:', error.message); process.exit(1) }

const hits = []
let songs = 0
const totals = { slur: 0, tie: 0 }
for (const s of [...data].sort((a, b) => (a.number || 0) - (b.number || 0))) {
  songs++
  let lines
  try { lines = resolveContent(s.content) } catch (e) { console.error(`#${s.number}: ${e.message}`); continue }
  const songHits = []
  ;(lines || []).forEach((line, li) => {
    for (const c of crossBarCurves(line)) { totals[c.kind]++; songHits.push({ li, ...c }) }
  })
  if (songHits.length) hits.push({ id: s.id, number: s.number, title: s.title_th, spans: songHits })
}

const bySlur = hits.filter((h) => h.spans.some((s) => s.kind === 'slur'))
const byTie = hits.filter((h) => h.spans.some((s) => s.kind === 'tie'))
console.log(`songs read (anon-readable only) : ${songs}`)
console.log(`cross-bar SLUR points           : ${totals.slur}  in ${bySlur.length} song(s)`)
console.log(`cross-bar TIE points            : ${totals.tie}  in ${byTie.length} song(s)`)
console.log(`TOTAL affected points           : ${totals.slur + totals.tie}  in ${hits.length} song(s)`)
console.log('')
for (const h of hits) {
  const n = { slur: h.spans.filter((s) => s.kind === 'slur').length, tie: h.spans.filter((s) => s.kind === 'tie').length }
  console.log(`#${h.number ?? '-'} ${h.title}  — ${n.slur} slur · ${n.tie} tie  (id=${h.id})`)
}

const ji = process.argv.indexOf('--json')
if (ji !== -1 && process.argv[ji + 1]) {
  const fs = await import('node:fs')
  fs.writeFileSync(process.argv[ji + 1], JSON.stringify(hits, null, 2))
  console.log(`\nraw hits → ${process.argv[ji + 1]}`)
}
