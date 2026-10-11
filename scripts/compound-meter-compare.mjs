// ใบ v3/pleng#106 — did the compound-meter change (6/8 9/8 12/8 grouped in pulses of 3 eighths) leave every
// OTHER song exactly as it was? Runs the golden piano's arranger from two checkouts on the same songs and
// compares every note event (pitch, start, length, loudness, timing nudge) one by one.
//
//   git archive origin/main src | tar -x -C ../before         # the code before (any folder; needs node_modules
//                                                             # next to it or above it — a link to this one is fine)
//   node scripts/compound-meter-compare.mjs songs.json ../before
//
// songs.json = [{ id, number, content }, ...] (the same file scripts/downbeat-audit.mjs takes).
// Prints how many songs use 6/8, 9/8 or 12/8 anywhere (the whole song or one melody), how many songs with
// none of them were compared and whether all came out identical, and how many compound songs changed.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [file, beforeDir] = process.argv.slice(2)
if (!file || !beforeDir) {
  console.error('usage: node scripts/compound-meter-compare.mjs <songs.json> <folder holding the old src/>')
  process.exit(2)
}
const here = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const load = async (root) => {
  const at = (p) => import(pathToFileURL(path.join(root, 'src', 'lib', p)).href)
  const [midi, arr, model, presets, exp] = await Promise.all([at('midi.js'), at('arranger/index.js'), at('songModel.js'), at('arranger/presets.js'), at('audioExport.js')])
  return { ...midi, ...arr, ...model, ...presets, exportPlayNotes: exp.exportPlayNotes }
}
const OLD = await load(path.resolve(beforeDir))
const NEW = await load(here)

const KEY_MIDI = { C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65, 'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71 }
// what the site can play on the golden piano: the two presets, note-check (ลูกเล่นปิด), and every choice in
// the ปรับละเอียด menu for the left hand (pattern × bass)
const CFGS = (L) => {
  const out = [
    { name: 'บรรเลง', cfg: { ...L.presetCfg('piano-arrangement'), voices: 'both' } },
    { name: 'สงบ', cfg: { ...L.presetCfg('piano-calm'), voices: 'both' } },
    { name: 'ตรงโน้ต', cfg: { arranger: false, voices: 'both' } },
  ]
  for (const pattern of ['flowing', 'arpeggio', 'sustained']) {
    for (const bass of ['pedalWalk', 'pedal', 'walking', 'root']) {
      out.push({ name: `${pattern}+${bass}`, cfg: { ...L.presetCfg('piano-arrangement'), voices: 'both', pattern, bass, fillLevel: 0.8 } })
    }
  }
  return out
}
const COMPOUND = /^\s*(6|9|12)\s*\/\s*8\s*$/
const metersOf = (c) => [c.timeSignature, ...(c.stanzas || []).map((s) => s.timeSignature)].filter(Boolean)

function play(L, content, songId, cfg) {
  const notes = L.exportPlayNotes(content)
  const playable = Array.isArray(content.lines) && content.lines.length ? content : { ...content, lines: L.resolveContent(content) }
  const sections = L.resolveSections(playable, notes)
  return L.arrange(notes, L.buildChordVoice(notes), { chordGain: 0.055, ...cfg },
    { songId, pass: 0, timeSignature: content.timeSignature, keyRoot: KEY_MIDI[content.key] ?? 60, sections })
}

const songs = JSON.parse(fs.readFileSync(file, 'utf8')).filter((s) => s && s.content)
const t = { compound: [], plainSame: 0, plainDiff: [], compoundDiff: 0, errors: [] }
for (const s of songs) {
  const isCompound = metersOf(s.content).some((m) => COMPOUND.test(String(m)))
  if (isCompound) t.compound.push(s.number ?? s.id)
  let same = true
  try {
    const a = CFGS(OLD)
    const b = CFGS(NEW)
    for (let i = 0; i < a.length && same; i++) {
      if (JSON.stringify(play(OLD, s.content, s.id, a[i].cfg)) !== JSON.stringify(play(NEW, s.content, s.id, b[i].cfg))) same = false
    }
  } catch (e) {
    t.errors.push(`${s.number ?? s.id}: ${e.message}`)
    continue
  }
  if (isCompound) { if (!same) t.compoundDiff++ } else if (same) t.plainSame++
  else t.plainDiff.push(s.number ?? s.id)
}
const plain = songs.length - t.compound.length
console.log(`songs read: ${songs.length}`)
console.log(`use 6/8, 9/8 or 12/8 anywhere: ${t.compound.length}${t.compound.length ? ` (${t.compound.join(', ')})` : ''}`)
console.log(`no compound meter: ${plain} compared × ${CFGS(NEW).length} settings → identical ${t.plainSame}, different ${t.plainDiff.length}${t.plainDiff.length ? ` (${t.plainDiff.join(', ')})` : ''}`)
console.log(`compound songs that now play differently: ${t.compoundDiff} of ${t.compound.length}`)
if (t.errors.length) console.log(`could not play: ${t.errors.length}\n  ${t.errors.join('\n  ')}`)
process.exit(t.plainDiff.length ? 1 : 0)
