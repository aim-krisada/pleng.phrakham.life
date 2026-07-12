// prepare-samples-cc0.mjs — build the CC0 "quality upgrade" leads for B107 P2 (violin, cello, nylon).
//
// P'Aim chose the CC0 upgrade over GM for the 3 exposed solo instruments. This downloads the CC0
// sources, converts each sampled note to per-note ogg (mono + makeup gain so levels match the
// GM/Grand set), and writes a smplr `SmplrPreset` per instrument. Output = self-host mirror, ready
// to publish to the `pleng-samples` host. Re-runnable; no binaries in git.
//
//   FFMPEG=<ffmpeg.exe> SEVENZIP=<7z.exe> node tools/prepare-samples-cc0.mjs [outDir] [workDir]
//     outDir  default ./samples-mirror/CC0
//     workDir default ./cc0-src  (raw downloads; can delete after)
//
// Requires: Node 18+ (global fetch), ffmpeg (libvorbis), 7-Zip (for the FreePats .7z).
// Sources (all CC0): FreePats Spanish Classical guitar · Bigcat cello · VSCO-2-CE solo violin.

import { mkdirSync, writeFileSync, statSync, readdirSync, createWriteStream } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, basename } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const FF = process.env.FFMPEG || 'ffmpeg'
const SZ = process.env.SEVENZIP || '7z'
const OUT = process.argv[2] || './samples-mirror/CC0'
const WORK = process.argv[3] || './cc0-src'
const Q = '5' // libvorbis ~160 kbps

const SEMI = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }
const noteToMidi = (t) => { const m = t.match(/([A-G])(b|#)?(-?\d+)/); if (!m) return null; let s = SEMI[m[1]]; if (m[2]==='b')s--; if (m[2]==='#')s++; return s + (parseInt(m[3],10)+1)*12 } // C1=24, A4=69

async function download(url, dest) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); await pipeline(Readable.fromWeb(r.body), createWriteStream(dest)) }

// Bigcat cello — sustained, 17 pitches (minor thirds), one dyn/take: *_mf_d.wav
const CELLO_URL = 'https://raw.githubusercontent.com/sfzinstruments/karoryfer-bigcat.cello/master/Samples/sus'
const CELLO_PITCHES = ['C1','Eb1','Gb1','A1','C2','Eb2','Gb2','A2','C3','Eb3','Gb3','A3','C4','Eb4','Gb4','A4','C5']
// VSCO-2-CE solo violin — Arco Vib, 15 pitches, 'f' dynamic (clearer for a lead than soft 'p')
const VIOLIN_URL = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/Strings/Solo%20Violin/Arco%20Vib'
const VIOLIN_PITCHES = ['G3','A3','C4','E4','G4','A4','C5','E5','G5','A5','C6','E6','G6','A6','C7']
// FreePats Spanish Classical (nylon) guitar — SFZ+FLAC .7z, 48 chromatic FLAC
const GUITAR_7Z = 'https://freepats.zenvoid.org/Guitar/SpanishClassicalGuitar/SpanishClassicalGuitar-SFZ+FLAC-20190618.7z'

async function fetchSources() {
  mkdirSync(join(WORK, 'cello'), { recursive: true })
  mkdirSync(join(WORK, 'violin'), { recursive: true })
  for (const p of CELLO_PITCHES) await download(`${CELLO_URL}/${p}_mf_d.wav`, join(WORK, 'cello', `${p}_mf_d.wav`))
  for (const p of VIOLIN_PITCHES) await download(`${VIOLIN_URL}/LLVln_ArcoVib_${p}_f.wav`, join(WORK, 'violin', `LLVln_ArcoVib_${p}_f.wav`))
  const sevenz = join(WORK, 'nylon.7z')
  await download(GUITAR_7Z, sevenz)
  const r = spawnSync(SZ, ['x', '-y', `-o${WORK}`, sevenz], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error('7z extract failed (set SEVENZIP=path to 7z.exe): ' + r.stderr)
}

// instrument recipes: source dir + note-from-filename + makeup gain (dB) to match the GM/Grand level
// (measured via `ffmpeg -af volumedetect`: nylon already ~-0.2 dB, cello ~-13 dB, violin 'f' ~-10 dB).
const INSTR = [
  { id:'nylon',  dir:'SpanishClassicalGuitar-SFZ+FLAC-20190618/samples', ext:'.flac', note:f=>basename(f,'.flac'), gainDb:0 },
  { id:'cello',  dir:'cello',  ext:'.wav', note:f=>basename(f).split('_')[0], gainDb:10 },
  { id:'violin', dir:'violin', ext:'.wav', note:f=>basename(f).replace(/^LLVln_ArcoVib_/,'').split('_')[0], gainDb:9 },
]

function convert(inFile, outFile, gainDb) {
  const af = gainDb ? `volume=${gainDb}dB,alimiter=limit=0.97` : 'anull' // makeup + clip guard
  const r = spawnSync(FF, ['-y','-i',inFile,'-ac','1','-af',af,'-c:a','libvorbis','-q:a',Q,outFile], { encoding:'utf8' })
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + inFile + '\n' + r.stderr?.slice(-300))
}

// Tile sampled pitches so every played note maps to a region (nearest sample pitch-shifts).
function tileRegions(pitches) {
  const p = [...pitches].sort((a,b)=>a-b)
  return p.map((cur,i)=>({
    sample: String(cur),
    keyRange: [ i===0 ? Math.max(0,p[0]-7) : Math.floor((p[i-1]+cur)/2)+1,
                i===p.length-1 ? Math.min(108,p.at(-1)+7) : Math.floor((cur+p[i+1])/2) ],
    pitch: cur,
  }))
}

async function main() {
  await fetchSources()
  let grand = 0
  for (const inst of INSTR) {
    const dir = join(WORK, inst.dir)
    const outDir = join(OUT, inst.id); mkdirSync(outDir, { recursive: true })
    const byMidi = new Map()
    for (const f of readdirSync(dir).filter(f=>f.endsWith(inst.ext))) { const midi = noteToMidi(inst.note(f)); if (midi!=null) byMidi.set(midi, join(dir,f)) }
    let bytes = 0
    for (const [midi, inFile] of byMidi) { const o = join(outDir, midi+'.ogg'); convert(inFile, o, inst.gainDb); bytes += statSync(o).size }
    const preset = { name: inst.id, samples: { baseUrl: '', formats: ['ogg'] }, groups: [{ regions: tileRegions([...byMidi.keys()]) }] }
    writeFileSync(join(outDir, 'preset.json'), JSON.stringify(preset, null, 1))
    grand += bytes
    console.log(`${inst.id}: ${byMidi.size} notes  ${(bytes/1e6).toFixed(2)} MB  range ${Math.min(...byMidi.keys())}..${Math.max(...byMidi.keys())}`)
  }
  console.log(`CC0 TOTAL: ${(grand/1e6).toFixed(2)} MB`)
}
main().catch(e => { console.error(e); process.exit(1) })
