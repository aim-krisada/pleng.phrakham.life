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

// base './' works both on GitHub Pages project path and the custom domain
export default defineConfig({
  base: './',
  plugins: [vue()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(info.commit),
    __BUILD_TIME__: JSON.stringify(info.time),
  },
})
