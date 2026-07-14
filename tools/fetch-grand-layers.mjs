// fetch-grand-layers.mjs — self-host the FULL velocity-layer set for the Splendid Grand (audio R2 STEP 0).
//
// P1 shipped only the PP layer (vel 41–67) → the arranger's comp floor hit vel 41 and the left hand
// "couldn't get softer". smplr's Splendid Grand has FIVE contiguous velocity layers; loading them all
// makes any velocity 1–127 land in a real recorded layer (the "mute bug" becomes structurally
// impossible) and gives round 2 real per-velocity TIMBRE to tune from, not just a volume knob.
//
//   PPP [1–40]   PP [41–67]   MP [68–84]   MF [85–100]   FF [101–127]
//
// KEY SAVING: the PPP layer REUSES the PP sample files (smplr just adds a ~1 kHz low-pass) — so PPP
// costs 0 new bytes. Only MP / MF / FF are new downloads. This script downloads exactly the MP/MF/FF
// files for the loaded note range into public/samples/, skips PP (already shipped), then rewrites
// public/samples/manifest.json (velocityRange + precache + totalMB) by walking the tree.
//
//   node tools/fetch-grand-layers.mjs            # download missing layers + rebuild manifest
//
// PUBLIC DOMAIN (Splendid Grand, AKAI) — redistributable, self-hosted, no runtime CDN. Source host is
// smplr's own sample host; we mirror to public/samples/ so the PWA service worker can precache it.
// LAYERS below is copied VERBATIM from smplr src/splendid-grand-piano.ts (the authoritative filenames,
// incl. the MF layer's mixed MF/Mf casing which the case-sensitive host requires). Re-runnable.

import { mkdir, writeFile, readdir, stat, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const GRAND_DIR = join(ROOT, 'public', 'samples', 'splendid-grand', 'samples')
const SAMPLES_ROOT = join(ROOT, 'public', 'samples')
const HOST = 'https://smpldsnds.github.io/sfzinstruments-splendid-grand-piano/samples'

// The note range we load (E2..C6 span — matches P1's Grand; smplr pitch-shifts outside it). Keeping
// the range small is how we hold the 4-layer download to a sane offline-cache size.
const LO = 40, HI = 84

// ---- smplr LAYERS (verbatim from src/splendid-grand-piano.ts) --------------------------------------
// PPP reuses the PP samples (+ low-pass) → not downloaded here. We fetch MP/MF/FF; PP is already shipped.
const LAYERS = {
  PP: [[23,'PP B-1'],[27,'PP D#0'],[29,'PP F0'],[31,'PP G0'],[33,'PP A0'],[35,'PP B0'],[37,'PP C#1'],[38,'PP D1'],[40,'PP E1'],[41,'PP F1'],[43,'PP G1'],[45,'PP A1'],[47,'PP B1'],[48,'PP C2'],[50,'PP D2'],[52,'PP E2'],[53,'PP F2'],[55,'PP G2'],[56,'PP G#2'],[57,'PP A2'],[58,'PP A#2'],[59,'PP B2'],[60,'PP C3'],[62,'PP D3'],[64,'PP E3'],[65,'PP F3'],[67,'PP G3'],[69,'PP A3'],[71,'PP B3'],[72,'PP C4'],[74,'PP D4'],[76,'PP E4'],[77,'PP F4'],[79,'PP G4'],[80,'PP G#4'],[81,'PP A4'],[82,'PP A#4'],[83,'PP B4']],
  MP: [[23,'Mp B-1'],[27,'Mp D#0'],[29,'Mp F0'],[31,'Mp G0'],[33,'Mp A0'],[35,'Mp B0'],[37,'Mp C#1'],[38,'Mp D1'],[40,'Mp E1'],[41,'Mp F1'],[43,'Mp G1'],[45,'Mp A1'],[47,'Mp B1'],[48,'Mp C2'],[50,'Mp D2'],[52,'Mp E2'],[53,'Mp F2'],[55,'Mp G2'],[56,'Mp G#2'],[57,'Mp A2'],[58,'Mp A#2'],[59,'Mp B2'],[60,'Mp C3'],[62,'Mp D3'],[64,'Mp E3'],[65,'Mp F3'],[67,'Mp G3'],[69,'Mp A3'],[71,'Mp B3'],[72,'Mp C4'],[74,'Mp D4'],[76,'Mp E4'],[77,'Mp F4'],[79,'Mp G4'],[80,'Mp G#4'],[81,'Mp A4'],[82,'Mp A#4'],[83,'Mp B4']],
  MF: [[23,'Mf B-1'],[27,'Mf D#0'],[29,'Mf F0'],[31,'Mf G0'],[33,'Mf A0'],[35,'Mf B0'],[37,'MF C#1'],[38,'MF D1'],[40,'MF E1'],[41,'MF F1'],[43,'MF G1'],[45,'MF A1'],[47,'MF B1'],[48,'MF C2'],[50,'MF D2'],[52,'MF E2'],[53,'MF F2'],[55,'MF G2'],[56,'MF G#2'],[57,'MF A2'],[58,'MF A#2'],[59,'MF B2'],[60,'MF C3'],[62,'MF D3'],[64,'MF E3'],[65,'MF F3'],[67,'MF G3'],[69,'MF A3'],[71,'MF B3'],[72,'MF C4'],[74,'Mf D4'],[76,'Mf E4'],[77,'Mf F4'],[79,'Mf G4'],[80,'Mf G#4'],[81,'Mf A4'],[82,'Mf A#4'],[83,'Mf B4']],
  FF: [[23,'FF B-1'],[27,'FF D#0'],[29,'FF F0'],[31,'FF G0'],[33,'FF A0'],[35,'FF B0'],[37,'FF C#1'],[38,'FF D1'],[40,'FF E1'],[41,'FF F1'],[43,'FF G1'],[45,'FF A1'],[47,'FF B1'],[48,'FF C2'],[50,'FF D2'],[52,'FF E2'],[53,'FF F2'],[55,'FF G2'],[56,'FF G#2'],[57,'FF A2'],[58,'FF A#2'],[59,'FF B2'],[60,'FF C3'],[62,'FF D3'],[64,'FF E3'],[65,'FF F3'],[67,'FF G3'],[69,'FF A3'],[71,'FF B3'],[72,'FF C4'],[74,'FF D4'],[76,'FF E4'],[77,'FF F4'],[79,'FF G4'],[80,'FF G#4'],[81,'FF A4'],[82,'FF A#4'],[83,'FF B4']],
}

async function fetchBuf(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()) }

async function download() {
  await mkdir(GRAND_DIR, { recursive: true })
  const report = {}
  for (const layer of ['MP', 'MF', 'FF']) {
    let bytes = 0, got = 0, skip = 0
    const files = LAYERS[layer].filter(([m]) => m >= LO && m <= HI).map(([, f]) => f)
    for (const name of files) {
      const dest = join(GRAND_DIR, `${name}.ogg`)
      if (existsSync(dest)) { const s = await stat(dest); bytes += s.size; skip++; continue }
      const buf = await fetchBuf(`${HOST}/${encodeURIComponent(name)}.ogg`)
      await writeFile(dest, buf); bytes += buf.length; got++
    }
    report[layer] = { files: files.length, downloaded: got, skipped: skip, MB: +(bytes / 1e6).toFixed(2) }
    console.log(`${layer}: ${files.length} files (${got} new, ${skip} present)  ${(bytes / 1e6).toFixed(2)} MB`)
  }
  return report
}

// Rewrite manifest.json to reflect what is now on disk: grand loads all layers ([1,127]); precache +
// totalMB recomputed by walking public/samples/. Everything else in the manifest is preserved.
async function rebuildManifest() {
  const manPath = join(SAMPLES_ROOT, 'manifest.json')
  const man = JSON.parse(await readFile(manPath, 'utf8'))
  man.instruments.grand.velocityRange = [1, 127] // load ALL five layers (PPP..FF)
  man.instruments.grand.velocityLayers = ['PPP[1-40]', 'PP[41-67]', 'MP[68-84]', 'MF[85-100]', 'FF[101-127]']

  async function walk(dir) {
    const out = []
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) out.push(...await walk(p))
      else out.push(relative(SAMPLES_ROOT, p).split('\\').join('/'))
    }
    return out
  }
  const files = (await walk(SAMPLES_ROOT)).filter(f => f !== 'manifest.json' && f !== 'README.md' && f !== '.gitattributes')
  man.precache = files.map(f => '/samples/' + f.split('/').map(encodeURIComponent).join('/')).sort()
  let total = 0
  for (const f of files) total += (await stat(join(SAMPLES_ROOT, f))).size
  man.totalMB = +(total / 1e6).toFixed(2)
  await writeFile(manPath, JSON.stringify(man, null, 2) + '\n')
  return { totalMB: man.totalMB, precacheCount: man.precache.length }
}

const dl = await download()
const mf = await rebuildManifest()
const grandBytes = (await Promise.all((await readdir(GRAND_DIR)).map(async f => (await stat(join(GRAND_DIR, f))).size))).reduce((a, b) => a + b, 0)
console.log(`\nGrand total on disk: ${(await readdir(GRAND_DIR)).length} files, ${(grandBytes / 1e6).toFixed(2)} MB`)
console.log(`Catalog total: ${mf.totalMB} MB · precache ${mf.precacheCount} entries`)
console.log(JSON.stringify(dl))
