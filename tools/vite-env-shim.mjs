// Node module hook so the diagnostics can import src/lib/* directly.
// src/lib/sampler.js reads `import.meta.env.BASE_URL`, which Vite injects at build time and
// plain Node leaves undefined (TypeError on import). This rewrites that ONE expression to a
// literal for the diag runs only — nothing is written to disk and the app build is untouched.
//   run: node --import ./tools/vite-env-shim.mjs tools/<diag>.mjs …
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

export async function load(url, context, nextLoad) {
  const res = await nextLoad(url, context)
  if (url.includes('/src/') && typeof res.source !== 'undefined' && res.format === 'module') {
    const src = res.source.toString()
    if (src.includes('import.meta.env')) {
      res.source = src.replaceAll('import.meta.env', "({ BASE_URL: '/', MODE: 'test', DEV: false, PROD: true })")
    }
  }
  return res
}

if (!process.env.__VITE_ENV_SHIM__) {
  process.env.__VITE_ENV_SHIM__ = '1'
  register(pathToFileURL(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')))
}
