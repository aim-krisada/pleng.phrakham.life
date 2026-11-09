// ใบ v1#166 — rebuild samples/manifest.json `precache` from the files on disk, keeping only the
// instruments the site can play (PRECACHE_INSTRUMENTS in src/lib/soundOptions.js).
//
//   npm run samples:precache   → rewrites the committed public/samples/manifest.json
//
// vite.config.js calls buildSamplesManifest() at every build too, so the deployed list always
// follows soundOptions.js even if this script was not run. See src/lib/samplePrecache.js.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPrecache } from '../src/lib/samplePrecache.js'
import { PRECACHE_INSTRUMENTS } from '../src/lib/soundOptions.js'

export const SAMPLES_ROOT = fileURLToPath(new URL('../public/samples/', import.meta.url))

// Every file under `root`, relative and '/'-separated, with its size in bytes.
export async function samplesOnDisk(root = SAMPLES_ROOT) {
  const files = []
  const sizes = {}
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { await walk(p); continue }
      const f = relative(root, p).split('\\').join('/')
      files.push(f)
      sizes[f] = (await stat(p)).size
    }
  }
  await walk(root)
  return { files: files.sort(), sizes }
}

// The manifest as it should be for `names` (default: what soundOptions.js says).
export async function buildSamplesManifest(root = SAMPLES_ROOT, names = PRECACHE_INSTRUMENTS) {
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
  const { files, sizes } = await samplesOnDisk(root)
  return withPrecache(manifest, files, sizes, names)
}

export const manifestText = (m) => JSON.stringify(m, null, 2) + '\n'

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const m = await buildSamplesManifest()
  await writeFile(join(SAMPLES_ROOT, 'manifest.json'), manifestText(m))
  console.log(`manifest.json: precache ${m.precache.length} files · ${m.precacheMB} MB (all samples on disk: ${m.totalMB} MB)`)
}
