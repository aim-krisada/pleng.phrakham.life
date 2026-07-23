import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'

// Build stamp: git commit at BUILD time (what is actually deployed, not source
// HEAD read later) — same principle as phrakham.life2's etl/gen_version.py.
function buildInfo() {
  let commit = 'dev'
  let dirty = ''
  try {
    commit = execSync('git rev-parse --short HEAD').toString().trim()
    dirty = execSync('git status --porcelain').toString().trim() ? '*' : ''
  } catch {
    /* no git (e.g. tarball build) — keep 'dev' */
  }
  return { commit: commit + dirty, time: new Date().toISOString() }
}

const info = buildInfo()

// B107 step 9 — emit dist/asset-manifest.json listing every built /assets/* file (hashed JS/CSS
// chunks). The service worker precaches this list at install so the FIRST offline launch can boot
// the app AND load the audio engine (smplr) chunk — not just the samples. Without it the SW would
// only have the shell, and offline boot fails on the hashed entry bundle (its name is unknown to a
// hand-written SW). Runs only at build (no-op in dev/serve).
function assetManifest() {
  return {
    name: 'pleng-asset-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => f.startsWith('assets/'))
        .map((f) => '/' + f)
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify(files) })
    },
  }
}

// base './' works both on GitHub Pages project path and the custom domain
export default defineConfig({
  base: './',
  plugins: [vue(), assetManifest()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(info.commit),
    __BUILD_TIME__: JSON.stringify(info.time),
  },
  // Default config runs EVERYTHING (`npm run test:all`). The db/ carve-out lives in the `test` /
  // `test:watch` scripts as a CLI --exclude, because vitest's CLI --exclude appends to the config
  // list rather than replacing it — so an exclusion put here could not be lifted again from a script.
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
