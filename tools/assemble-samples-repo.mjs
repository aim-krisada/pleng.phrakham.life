// assemble-samples-repo.mjs — assemble the FINAL in-app sample catalog into public/samples/ (B107 P2).
//
// pleng ships samples IN-APP under public/samples/ (P'Aim's final call: one repo, served same-origin
// at https://pleng.phrakham.life/samples/... — no external Pages/token/CDN, simplest offline PWA).
// Combines the built mirror into public/samples/ and writes:
//   - manifest.json : per-instrument loader/license + a flat same-origin `precache` list (`/samples/...`)
//                     for the PWA service worker.
//   - README.md     : what this is + licenses/attribution + how to regenerate.
//
// FINAL SHIP SET (per P'Aim): Grand (PD) · felt = filter Grand (no files) · nylon/cello/violin = CC0
// leads · steel + string ensemble = GM (FluidR3_GM, CC-BY 3.0). GM nylon/cello/violin/pad from the
// A/B are NOT shipped.
//
//   node tools/assemble-samples-repo.mjs [mirrorDir] [outDir]
//     mirrorDir default ./samples-mirror  (built by prepare-samples.mjs + prepare-samples-cc0.mjs)
//     outDir    default ./public/samples
//
// Prereq (reproducible from scratch):
//   node tools/prepare-samples.mjs ./samples-mirror
//   FFMPEG=<ffmpeg> SEVENZIP=<7z> node tools/prepare-samples-cc0.mjs ./samples-mirror/CC0
//   node tools/assemble-samples-repo.mjs ./samples-mirror ./public/samples

import { cpSync, mkdirSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const MIRROR = process.argv[2] || './samples-mirror'
const OUT = process.argv[3] || './public/samples'
// Served same-origin from the app: https://pleng.phrakham.life/samples/  → precache paths are /samples/...
const SAMPLES_BASE = '/samples/'

// The kept GM patches (only these two ship; the 3 leads are CC0).
const GM_KEEP = ['acoustic_guitar_steel-mp3.js', 'string_ensemble_1-mp3.js']

function copyInto() {
  mkdirSync(OUT, { recursive: true })
  cpSync(join(MIRROR, 'splendid-grand'), join(OUT, 'splendid-grand'), { recursive: true })
  mkdirSync(join(OUT, 'FluidR3_GM'), { recursive: true })
  for (const f of GM_KEEP) cpSync(join(MIRROR, 'FluidR3_GM', f), join(OUT, 'FluidR3_GM', f))
  cpSync(join(MIRROR, 'CC0'), join(OUT, 'CC0'), { recursive: true })
}

// Walk outDir → every file's repo-relative URL path (for the SW precache list).
function walk(dir, base = OUT) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p, base))
    else out.push(relative(base, p).split('\\').join('/'))
  }
  return out
}

function main() {
  copyInto()
  const files = walk(OUT).filter(f => f !== 'manifest.json' && f !== 'README.md' && f !== '.gitattributes')
  // Same-origin absolute precache URLs: /samples/<encoded path> (fed straight to the service worker).
  const precache = files.map(f => SAMPLES_BASE + f.split('/').map(encodeURIComponent).join('/'))
  const totalMB = (files.reduce((s, f) => s + statSync(join(OUT, f)).size, 0) / 1e6).toFixed(2)

  // Per-instrument playback metadata for the arranger (measured, ffprobe mid-note):
  //  durationSec = representative one-shot sample length. NONE of these loop (loops:false), so a single
  //    held note decays/ends at ~durationSec — a longer chord/pad must re-trigger or overlap notes.
  //    The arranger can derive its re-trigger interval from durationSec instead of hardcoding.
  //  bakedMakeupDb = gain ALREADY applied when the file was built (do NOT re-apply). The CC0 solo strings
  //    were recorded ~10-13 dB below GM/Grand; this makeup levels them so all instruments sit comparably.
  const meta = {
    grand:  { durationSec: 4.2,  loops: false, bakedMakeupDb: 0 },
    felt:   { durationSec: 4.2,  loops: false, bakedMakeupDb: 0 },
    steel:  { durationSec: 3.1,  loops: false, bakedMakeupDb: 0 },
    string_ensemble: { durationSec: 3.1, loops: false, bakedMakeupDb: 0 },
    nylon:  { durationSec: 2.4,  loops: false, bakedMakeupDb: 0 },
    cello:  { durationSec: 4.3,  loops: false, bakedMakeupDb: 10 },
    violin: { durationSec: 14.1, loops: false, bakedMakeupDb: 9 },
  }
  const manifest = {
    baseUrl: SAMPLES_BASE,
    generated: 'run tools/assemble-samples-repo.mjs to regenerate',
    totalMB: Number(totalMB),
    notes: 'All instruments are one-shot (loops:false). durationSec = per-note sustain ceiling; longer holds need re-trigger/overlap. bakedMakeupDb is already applied in the files (do not re-apply). Ranges/velocities per instrument are in the CC0 preset.json / the Grand velocityRange.',
    instruments: {
      grand:  { loader: 'SplendidGrandPiano', baseUrl: 'splendid-grand/samples', format: 'ogg', velocityRange: [41, 67], sampledRange: [40, 84], license: 'Public Domain', attribution: null, ...meta.grand },
      felt:   { loader: 'SplendidGrandPiano+lowpass', reuses: 'grand', note: 'low-pass ~2 kHz on output; no files of its own', license: 'Public Domain', attribution: null, ...meta.felt },
      steel:  { loader: 'Soundfont', instrumentUrl: 'FluidR3_GM/acoustic_guitar_steel-mp3.js', sampledRange: [36, 90], license: 'CC-BY-3.0', attribution: 'FluidR3 GM soundfont © Frank Wen, CC-BY 3.0', ...meta.steel },
      string_ensemble: { loader: 'Soundfont', instrumentUrl: 'FluidR3_GM/string_ensemble_1-mp3.js', sampledRange: [36, 90], license: 'CC-BY-3.0', attribution: 'FluidR3 GM soundfont © Frank Wen, CC-BY 3.0', ...meta.string_ensemble },
      nylon:  { loader: 'Sampler', preset: 'CC0/nylon/preset.json', baseUrl: 'CC0/nylon', sampledRange: [31, 84], license: 'CC0', attribution: null, source: 'FreePats Spanish Classical guitar', ...meta.nylon },
      cello:  { loader: 'Sampler', preset: 'CC0/cello/preset.json', baseUrl: 'CC0/cello', sampledRange: [24, 72], license: 'CC0', attribution: null, source: 'Bigcat cello', ...meta.cello },
      violin: { loader: 'Sampler', preset: 'CC0/violin/preset.json', baseUrl: 'CC0/violin', sampledRange: [55, 96], license: 'CC0', attribution: null, source: 'VSCO-2-CE Solo Violin', ...meta.violin },
    },
    precache,
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const readme = `# In-app instrument samples (\`public/samples/\`)

Self-hosted instrument samples for **pleng.phrakham.life** (B107 P2 curated orchestration), shipped
**in-app** and served same-origin at \`${SAMPLES_BASE}...\` (e.g. <https://pleng.phrakham.life/samples/manifest.json>).
The app never fetches samples from an external CDN — so the PWA service worker can precache them for
fully **offline** playback.

**Do not edit by hand.** This tree is generated by \`tools/*.mjs\` in this repo
(\`prepare-samples.mjs\` + \`prepare-samples-cc0.mjs\` + \`assemble-samples-repo.mjs\`) and is
fully reproducible. \`manifest.json\` lists every file (same-origin \`/samples/...\` URLs) for the
service worker to precache. The binaries are committed intentionally (a required PWA asset, like fonts
or images); \`.gitattributes\` marks them \`-text -diff\`.

## Instruments (${totalMB} MB total, loaded lazily per preset)

| Instrument | Loader (smplr) | Source | License |
|---|---|---|---|
| Grand piano | SplendidGrandPiano | Splendid Grand (AKAI) | Public Domain |
| Felt | SplendidGrandPiano + low-pass | = Grand (no files) | Public Domain |
| Nylon guitar | Sampler (preset) | FreePats Spanish Classical | CC0 |
| Cello | Sampler (preset) | Bigcat cello | CC0 |
| Violin | Sampler (preset) | VSCO-2-CE Solo Violin | CC0 |
| Steel guitar | Soundfont | FluidR3_GM | CC-BY 3.0 |
| String ensemble | Soundfont | FluidR3_GM | CC-BY 3.0 |

## Attribution

Only the two FluidR3_GM instruments require credit:

> FluidR3 GM soundfont © Frank Wen — Creative Commons Attribution 3.0 (CC-BY 3.0).

The CC0 leads (FreePats / Bigcat / VSCO-2-CE) and the Public-Domain Grand require none.
`
  writeFileSync(join(OUT, 'README.md'), readme)

  // Treat everything here as binary — no EOL normalization, no diffs. The base64-in-.js soundfonts and
  // preset JSON must ship byte-for-byte (a CRLF rewrite would alter them), and these are assets, not source.
  writeFileSync(join(OUT, '.gitattributes'), '* -text -diff\n')

  console.log(`Staged ${files.length} files (${totalMB} MB) → ${OUT}`)
  console.log(`manifest.json: ${precache.length} precache entries`)
}
main()
