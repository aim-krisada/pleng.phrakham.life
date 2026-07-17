// B102 DoD — prove, against the LIVE catalogue, that the MP3 export renders the same notes
// the "ฟัง" button plays, for every published song.
//
// The unit test (src/lib/audioExport.order.test.js) pins the invariant on a fixture; this
// pins it on the real data, which is where the bug actually lived: 11 published songs sang a
// "ร้องรับทุกข้อ" refrain the export silently dropped (up to 116s of a 297s song), live for
// 19 deploys with nothing erroring. Re-run after any change to the export or play-order path.
//
//   run:  node tools/audit-mp3-order.mjs        (exit 1 if any song mismatches)
//
// Read-only: the public key the app already ships. No DB writes, no auth.
import { buildPlayNotes } from '../src/lib/midi.js'
import { resolveContent, resolvePlayOrder } from '../src/lib/songModel.js'
import { exportPlayNotes, notesDurationSec } from '../src/lib/audioExport.js'

const KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'
const URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co/rest/v1/songs?select=number,title_th,content&order=number'

const res = await fetch(URL, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`)
const songs = await res.json()

// what "ฟัง" schedules — SongViewer.vue's fullNotes: the whole song in its real play order.
// Rebuilt from the same public seams rather than imported, so this still binds if the viewer
// is refactored: it encodes the requirement, not the current call graph.
const viewerNotes = (content) =>
  buildPlayNotes({ ...content, lines: resolveContent(content) }, { order: resolvePlayOrder(content) ?? undefined })

// identity, not just count — a reordered list of equal length must not pass
const sig = (ns) => ns.map((n) => `${n.li}:${n.si}:${n.midi}`).join(',')

const rows = []
for (const s of songs) {
  if (!s.content) continue
  const bpm = Number(s.content.bpm) || 92
  const live = viewerNotes(s.content)
  const mp3 = exportPlayNotes(s.content)
  rows.push({
    number: s.number,
    title: s.title_th,
    strophic: !!resolvePlayOrder(s.content),
    liveN: live.length,
    mp3N: mp3.length,
    liveSec: +notesDurationSec(live, bpm).toFixed(1),
    mp3Sec: +notesDurationSec(mp3, bpm).toFixed(1),
    ok: sig(live) === sig(mp3),
  })
}

const strophic = rows.filter((r) => r.strophic)
const bad = rows.filter((r) => !r.ok)

console.log(`checked ${rows.length} published songs · ${strophic.length} sing a section more than the sheet prints it\n`)
console.log('  num | live s | mp3 s  | liveN | mp3N  |')
console.log('------|--------|--------|-------|-------|------------------------------')
for (const r of strophic) {
  console.log(
    `${r.ok ? ' ok ' : ' 🔴 '} ${String(r.number).padStart(3)} | ${String(r.liveSec).padStart(6)} | ${String(r.mp3Sec).padStart(6)} | ${String(r.liveN).padStart(5)} | ${String(r.mp3N).padStart(5)} | ${r.title}`,
  )
}
console.log(`\nstrophic songs matching: ${strophic.filter((r) => r.ok).length}/${strophic.length}`)
console.log(`ALL songs matching:      ${rows.length - bad.length}/${rows.length}`)
if (bad.length) {
  console.log(`\n🔴 MP3 would not match "ฟัง" on: ${bad.map((b) => `#${b.number} ${b.title}`).join(' · ')}`)
  process.exitCode = 1
} else {
  console.log('\n✅ every published song exports exactly what it plays')
}
