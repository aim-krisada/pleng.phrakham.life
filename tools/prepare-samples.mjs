// prepare-samples.mjs — build the pleng PWA instrument-sample mirror (B107 P2).
//
// pleng is becoming an offline PWA, so every instrument sample must be SELF-HOSTED (no runtime
// CDN). This script is the reproducible SSOT: it downloads the redistributable sources, trims
// them to pleng's pitch range, and lays them out under an output dir ready to publish to our
// mirror host (see docs/reports/cc-instrument-samples.md). Re-runnable; no binaries live in git.
//
//   node tools/prepare-samples.mjs [outDir]      (default: ./samples-mirror)
//
// Requires Node 18+ (global fetch). No npm deps.
//
// Output layout (point smplr baseUrl / instrumentUrl at these, then precache via service worker):
//   <outDir>/FluidR3_GM/<patch>-mp3.js      per-note mp3 GM patches (CC-BY 3.0, trimmed)
//   <outDir>/splendid-grand/samples/*.ogg   Splendid Grand PP layer, notes 40..84 (Public Domain)

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = process.argv[2] || './samples-mirror'

// --- GM instruments (FluidR3_GM, CC-BY 3.0). Per-note mp3, mirrored + trimmed. ---
const GM_HOST = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM'
const GM_PATCHES = [
  'acoustic_guitar_nylon', 'acoustic_guitar_steel',
  'violin', 'cello', 'string_ensemble_1', 'pad_2_warm',
]
// pleng plays ~E2..C6 and smplr pitch-shifts from the nearest sample, so trimming to C2..F#6
// (with transpose headroom) sounds identical while cutting each file ~35%.
const LO = 36, HI = 90 // C2 .. F#6
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const noteToMidi = (n) => { const m = n.match(/^([A-G])(b|#)?(-?\d+)$/); if (!m) return null; let s = SEMI[m[1]]; if (m[2] === 'b') s--; if (m[2] === '#') s++; return s + (parseInt(m[3], 10) + 1) * 12 }

function trimGm(src) {
  // Anchor on `MIDI.Soundfont.<name> = {` (not the earlier `var MIDI = {}`).
  const m = src.match(/MIDI\.Soundfont\.[A-Za-z0-9_]+\s*=\s*\{/)
  const head = src.slice(0, m.index + m[0].length)
  const pairs = [...src.matchAll(/"([A-G][b#]?-?\d+)":\s*"([^"]*)"/g)]
  const kept = pairs.filter(([, note]) => { const mi = noteToMidi(note); return mi != null && mi >= LO && mi <= HI })
  const body = kept.map(([, note, data]) => `"${note}": "${data}"`).join(',\n')
  // CRITICAL: keep a TRAILING comma after the last note — smplr's midiJsToJson slices to the last
  // comma and appends "}". Without it smplr cuts into the final note's base64 (unterminated string).
  return { text: head + '\n' + body + ',\n\n}\n', notes: kept.length }
}

// --- Splendid Grand (Public Domain). smplr's default host; per-note ogg. ---
// R2 STEP 0: mirror ALL FIVE velocity layers (PPP reuses the PP files + low-pass → not downloaded;
// MP/MF/FF are extra). Filenames are the exact smplr strings (incl. the MF layer's mixed MF/Mf case,
// which the case-sensitive host requires). Same set as tools/fetch-grand-layers.mjs (the direct-to-
// public runner); kept here so a from-scratch `prepare → assemble` reproduces the full grand.
const GRAND_HOST = 'https://smpldsnds.github.io/sfzinstruments-splendid-grand-piano/samples'
const GRAND_PP = ['PP E1','PP F1','PP G1','PP A1','PP B1','PP C2','PP D2','PP E2','PP F2','PP G2','PP G#2','PP A2','PP A#2','PP B2','PP C3','PP D3','PP E3','PP F3','PP G3','PP A3','PP B3','PP C4','PP D4','PP E4','PP F4','PP G4','PP G#4','PP A4','PP A#4','PP B4']
const GRAND_MP = GRAND_PP.map(n => n.replace('PP ', 'Mp '))
// MF layer: notes ≤ C4 use 'MF', notes > C4 use 'Mf' (smplr's exact casing).
const GRAND_MF = ['MF E1','MF F1','MF G1','MF A1','MF B1','MF C2','MF D2','MF E2','MF F2','MF G2','MF G#2','MF A2','MF A#2','MF B2','MF C3','MF D3','MF E3','MF F3','MF G3','MF A3','MF B3','MF C4','Mf D4','Mf E4','Mf F4','Mf G4','Mf G#4','Mf A4','Mf A#4','Mf B4']
const GRAND_FF = GRAND_PP.map(n => n.replace('PP ', 'FF '))
const GRAND_SAMPLES = [...GRAND_PP, ...GRAND_MP, ...GRAND_MF, ...GRAND_FF]

async function fetchBuf(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()) }

async function main() {
  let total = 0
  await mkdir(join(OUT, 'FluidR3_GM'), { recursive: true })
  for (const patch of GM_PATCHES) {
    const raw = (await fetchBuf(`${GM_HOST}/${patch}-mp3.js`)).toString('utf8')
    const { text, notes } = trimGm(raw)
    const out = join(OUT, 'FluidR3_GM', `${patch}-mp3.js`)
    await writeFile(out, text)
    const kb = Buffer.byteLength(text) / 1024; total += kb
    console.log(`FluidR3_GM/${patch}-mp3.js  ${notes} notes  ${(kb / 1024).toFixed(2)} MB`)
  }
  await mkdir(join(OUT, 'splendid-grand', 'samples'), { recursive: true })
  for (const name of GRAND_SAMPLES) {
    const buf = await fetchBuf(`${GRAND_HOST}/${encodeURIComponent(name)}.ogg`)
    await writeFile(join(OUT, 'splendid-grand', 'samples', `${name}.ogg`), buf)
    total += buf.length / 1024
  }
  console.log(`splendid-grand/samples  ${GRAND_SAMPLES.length} ogg files`)
  console.log(`\nTOTAL MIRROR: ${(total / 1024).toFixed(2)} MB  (felt = reuse grand, 0 extra)`)
}
main().catch(e => { console.error(e); process.exit(1) })
