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

// ---- /v2 side-by-side deploy -------------------------------------------------------------------
// `PLENG_V2=1 npm run build` produces the SAME app rooted at `/v2/` instead of the site root, so
// the new version can live beside the current one on one GitHub Pages site, one Supabase database
// (docs/deploy-v2.md). Everything downstream reads BASE, never a hard-coded '/':
//   · vite `base`     → hashed assets, index.html links, import.meta.env.BASE_URL
//   · asset-manifest  → the SW precache list must point at THIS build's assets, not the other one's
//   · site.webmanifest→ start_url/scope are already relative; only the app NAME is disambiguated
//   · __APP_VARIANT__ → the in-app version badge/switcher (VersionSwitch.vue) renders only on v2
const IS_V2 = process.env.PLENG_V2 === '1'
const BASE = IS_V2 ? '/v2/' : './'
// The runtime URL prefix (what './' actually resolves to when deployed at the site root).
const URL_BASE = IS_V2 ? '/v2/' : '/'

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
        .map((f) => URL_BASE + f)
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify(files) })
    },
  }
}

// The /v2 build gets its own PWA identity. site.webmanifest is a static public/ file shared by both
// builds, but two installable apps on one origin must not present as the same app — the browser
// would show two identical "เพลง.พระคำ" entries with no way to tell them apart. scope/start_url are
// already relative ('./' → /v2/), so only the display names need disambiguating; done on the built
// copy so the source file stays the single (v1) truth.
function v2Manifest() {
  return {
    name: 'pleng-v2-manifest',
    apply: 'build',
    async closeBundle() {
      if (!IS_V2) return
      const { readFile, writeFile } = await import('node:fs/promises')
      const p = 'dist/site.webmanifest'
      try {
        const m = JSON.parse(await readFile(p, 'utf8'))
        m.name = m.name + ' (v2 ทดลอง)'
        m.short_name = m.short_name + ' v2'
        m.id = '/v2/'
        await writeFile(p, JSON.stringify(m, null, 2))
      } catch { /* no manifest in dist → nothing to disambiguate */ }
    },
  }
}

// base './' works both on GitHub Pages project path and the custom domain; '/v2/' pins the
// side-by-side new-version build to its subfolder (PLENG_V2=1).
export default defineConfig({
  base: BASE,
  plugins: [vue(), assetManifest(), v2Manifest()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(info.commit),
    __BUILD_TIME__: JSON.stringify(info.time),
    // '' on the current/root build, 'v2' on the side-by-side build. Drives the version badge.
    __APP_VARIANT__: JSON.stringify(IS_V2 ? 'v2' : ''),
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
