// ใบ v1#166 — the home page's offline line counts the samples list the site ships: with PIANO_ONLY
// on that is the 120 piano files, so "ready" comes with 120 (not 205) samples on the device.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { probeDevice } from './offlineReady.js'
import MANIFEST from '../../public/samples/manifest.json'

function fakeCaches(content) {
  const key = (u) => new URL(typeof u === 'string' ? u : u.url, location.origin).href
  const stores = new Map(Object.entries(content).map(([n, m]) => [n, new Map(Object.entries(m).map(([u, v]) => [key(u), v]))]))
  return {
    has: async (n) => stores.has(n),
    open: async (n) => ({ keys: async () => [...(stores.get(n) || new Map()).keys()].map((url) => ({ url })) }),
    match: async (u) => {
      for (const m of stores.values()) if (m.has(key(u))) return new Response(JSON.stringify(m.get(key(u))))
    },
  }
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('probeDevice — samples expected = the shipped precache list', () => {
  it('the list is the 120 piano files, and 120 on the device = all samples here', async () => {
    expect(MANIFEST.precache).toHaveLength(120)
    const samples = { '/samples/manifest.json': MANIFEST }
    for (const u of MANIFEST.precache) samples[u] = 'ogg'
    vi.stubEnv('PROD', true)
    vi.stubGlobal('caches', fakeCaches({
      'pleng-samples-v1': samples,
      'pleng-app-v1': { '/asset-manifest.json': ['/assets/x.js'], '/assets/x.js': 'js' },
    }))
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: { getRegistration: async () => ({ scope: location.origin + '/', active: {} }) },
    })
    const p = await probeDevice()
    expect(p.samples).toEqual({ expected: 120, have: 120 })
    expect(p.shell).toEqual({ expected: 1, have: 1 })
    expect(p.swActive).toBe(true)
  })
})
