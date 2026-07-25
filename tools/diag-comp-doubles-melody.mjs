// พี่เปา (3/4): "หยิบโน้ตตรง melody มือขวา … เหมือนเล่นโน้ตตัวเดียวกัน".
// This measures exactly that: how often an accompaniment note sounds the SAME pitch as the
// melody note sounding at that moment. Grouped by time signature, because the question PM
// asked is whether this happens in 4/4 too — if it does, it is not a meter bug at all.
// READ-ONLY, no DB.
//   run: node tools/diag-comp-doubles-melody.mjs <songs.json> <srcDir>
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [songsPath, dir] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const midi = await import(pathToFileURL(`${dir}/src/lib/midi.js`).href)
const model = await import(pathToFileURL(`${dir}/src/lib/songModel.js`).href)
const arr = await import(pathToFileURL(`${dir}/src/lib/arranger/index.js`).href)
const mods = await import(pathToFileURL(`${dir}/src/lib/arranger/instruments/index.js`).href)

function perform(content, songId) {
  const lines = Array.isArray(content?.lines) && content.lines.length ? content.lines : model.resolveContent(content)
  const res = { ...content, lines }
  const order = model.resolvePlayOrder(content) ?? undefined
  const notes = midi.buildPlayNotes(res, { order })
  if (!notes.length) return null
  const chords = midi.buildChordVoice(notes)
  const sections = midi.resolveSections(res, notes)
  return arr.arrange(notes, chords, { arranger: true, voices: 'both', module: mods.moduleForInstrument('grand') },
    { songId, pass: 0, timeSignature: content.timeSignature, keyRoot: 60, sections })
}

const byTs = {}
for (const s of songs) {
  const ts = s.content?.timeSignature || '(none)'
  let perf
  try { perf = perform(s.content, `song-${s.number}`) } catch { continue }
  if (!perf) continue
  const mel = perf.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  const comp = perf.filter((e) => e.role !== 'melody')
  // the melody pitch sounding at time t
  const melAt = (t) => {
    let cur = null
    for (const m of mel) { if (m.startBeat <= t + 1e-6 && t < m.startBeat + m.beats - 1e-6) cur = m; if (m.startBeat > t) break }
    return cur ? cur.midi : null
  }
  let unison = 0, octave = 0, inMelRange = 0
  const melLo = Math.min(...mel.map((m) => m.midi))
  const melHi = Math.max(...mel.map((m) => m.midi))
  for (const c of comp) {
    const m = melAt(c.startBeat)
    if (m == null) continue
    if (c.midi === m) unison++
    else if (Math.abs(c.midi - m) % 12 === 0) octave++
    if (c.midi >= melLo && c.midi <= melHi) inMelRange++
  }
  const b = (byTs[ts] = byTs[ts] || { songs: 0, comp: 0, unison: 0, octave: 0, inRange: 0 })
  b.songs++; b.comp += comp.length; b.unison += unison; b.octave += octave; b.inRange += inMelRange
}

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : '0.0').padStart(5)
console.log('เครื่องคลอเล่นโน้ตซ้ำกับทำนองบ่อยแค่ไหน (แยกตาม time signature)')
console.log('')
console.log('ts      เพลง   โน้ตคลอ   เสียงเดียวกันเป๊ะ   ห่างกันคู่แปด   อยู่ในช่วงเสียงทำนอง')
for (const [ts, b] of Object.entries(byTs).sort((x, y) => y[1].songs - x[1].songs)) {
  console.log(`${ts.padEnd(7)} ${String(b.songs).padStart(4)} ${String(b.comp).padStart(9)}   ${pct(b.unison, b.comp)}%          ${pct(b.octave, b.comp)}%           ${pct(b.inRange, b.comp)}%`)
}
const tot = Object.values(byTs).reduce((a, b) => ({ comp: a.comp + b.comp, unison: a.unison + b.unison, octave: a.octave + b.octave, inRange: a.inRange + b.inRange }), { comp: 0, unison: 0, octave: 0, inRange: 0 })
console.log('')
console.log(`รวมทั้งคลัง: เสียงเดียวกันเป๊ะ ${pct(tot.unison, tot.comp)}% · คู่แปด ${pct(tot.octave, tot.comp)}% · อยู่ในช่วงทำนอง ${pct(tot.inRange, tot.comp)}%`)
