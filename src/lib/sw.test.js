// ใบ v3/pleng#164 — public/sw.js run in a sandbox with a fake network and fake caches.
// The worker must always say "done", fetch only what is missing when the page asks ('pleng-fill'),
// not hang on a stalled file, and not delete another install's files.
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const SRC = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')
const ORIGIN = 'https://pleng.test'

function makeCaches() {
  const store = new Map()
  const key = (u) => new URL(typeof u === 'string' ? u : u.url, ORIGIN).href
  const open = async (name) => {
    if (!store.has(name)) store.set(name, new Map())
    const m = store.get(name)
    return {
      match: async (u) => (m.has(key(u)) ? m.get(key(u)).clone() : undefined),
      put: async (u, r) => { m.set(key(u), r.clone()) },
      keys: async () => [...m.keys()].map((url) => ({ url })),
      delete: async (r) => m.delete(key(r)),
    }
  }
  return {
    store,
    api: {
      open,
      has: async (n) => store.has(n),
      keys: async () => [...store.keys()],
      delete: async (n) => store.delete(n),
      match: async (u) => { for (const m of store.values()) if (m.has(key(u))) return m.get(key(u)).clone() },
    },
    paths: (name) => [...(store.get(name) || new Map()).keys()].map((u) => new URL(u).pathname).sort(),
  }
}

// files: { '/path': body | 404 | 'hang' } — any other path answers 200 (the shell's icons, fonts…);
// files = null → offline (every fetch fails)
function boot(files, cachesObj = makeCaches()) {
  const listeners = {}
  const posted = []
  const fetched = []
  const fetch = vi.fn((u, opts = {}) => {
    const p = new URL(u, ORIGIN).pathname
    fetched.push(p)
    if (files === null) return Promise.reject(new TypeError('offline'))
    const f = p in files ? files[p] : 'other'
    if (f === 'hang') {
      return new Promise((_, reject) => {
        if (opts.signal) opts.signal.addEventListener('abort', () => reject(new Error('aborted')))
      })
    }
    if (f === 404) return Promise.resolve(new Response('nope', { status: 404 }))
    return Promise.resolve(new Response(typeof f === 'string' ? f : JSON.stringify(f), { status: 200 }))
  })
  const self = {
    registration: { scope: ORIGIN + '/' },
    location: { origin: ORIGIN },
    addEventListener: (t, fn) => { listeners[t] = fn },
    skipWaiting: vi.fn(async () => {}),
    clients: {
      claim: async () => {},
      matchAll: async () => [{ postMessage: (m) => posted.push(m) }],
    },
  }
  vm.runInNewContext(SRC, {
    self, caches: cachesObj.api, fetch, URL, Response, AbortController, setTimeout, clearTimeout,
    Promise, JSON, Set, Array, String, console,
  })
  const run = async (type, data) => {
    let job = null
    listeners[type]({ data, waitUntil: (p) => { job = p }, request: {} })
    await job
  }
  return { run, posted, fetched, fetch, self, caches: cachesObj }
}

const SAMPLES = ['/samples/a.ogg', '/samples/b.ogg']
function site(assets, extra = {}) {
  const f = {
    '/samples/manifest.json': { precache: SAMPLES },
    '/samples/a.ogg': 'A', '/samples/b.ogg': 'B',
    '/asset-manifest.json': assets,
    ...extra,
  }
  for (const a of assets) if (!(a in f)) f[a] = 'js'
  return f
}

describe('sw.js install', () => {
  it('a sample that 404s does not stop the install: it still says done and takes over', async () => {
    const w = boot(site(['/assets/x.js'], { '/samples/b.ogg': 404 }))
    await w.run('install')
    expect(w.posted.at(-1)).toMatchObject({ type: 'pleng-cache', done: true })
    expect(w.self.skipWaiting).toHaveBeenCalled()
    expect(w.caches.paths('pleng-samples-v1')).toEqual(['/samples/a.ogg', '/samples/manifest.json'])
  })

  it('a file that never answers is given up after the timeout — the install still finishes', async () => {
    vi.useFakeTimers()
    const w = boot(site(['/assets/x.js'], { '/samples/b.ogg': 'hang' }))
    const job = w.run('install')
    await vi.advanceTimersByTimeAsync(31000)
    await job
    vi.useRealTimers()
    expect(w.posted.at(-1)).toMatchObject({ done: true })
    expect(w.caches.paths('pleng-app-v1')).toContain('/assets/x.js')
  })

  it('a new deploy drops the old build files but keeps the new ones', async () => {
    const c = makeCaches()
    await boot(site(['/assets/old.js']), c).run('install')
    await boot(site(['/assets/new.js']), c).run('install')
    const app = c.paths('pleng-app-v1')
    expect(app).toContain('/assets/new.js')
    expect(app).not.toContain('/assets/old.js')
  })
})

describe("sw.js 'pleng-fill' — the page asks the active worker to top up", () => {
  it('fetches only the missing files and answers done + fill', async () => {
    const c = makeCaches()
    await boot(site(['/assets/x.js', '/assets/y.js'], { '/samples/b.ogg': 404, '/assets/y.js': 404 }), c).run('install')
    const w = boot(site(['/assets/x.js', '/assets/y.js']), c)
    await w.run('message', { type: 'pleng-fill' })
    expect(w.posted.at(-1)).toMatchObject({ type: 'pleng-cache', done: true, fill: true })
    // only the two that were missing (plus the two lists, read fresh)
    expect(w.fetched.filter((p) => !p.endsWith('manifest.json')).sort()).toEqual(['/assets/y.js', '/samples/b.ogg'])
    expect(c.paths('pleng-samples-v1')).toContain('/samples/b.ogg')
    expect(c.paths('pleng-app-v1')).toContain('/assets/y.js')
  })

  it('after a deploy: the kept list is the new build → its missing files are fetched (the 98% case)', async () => {
    const c = makeCaches()
    await boot(site(['/assets/old.js']), c).run('install')
    // new build's list kept, only part of its files arrived (install cut short)
    const app = await c.api.open('pleng-app-v1')
    await app.put('/asset-manifest.json', new Response(JSON.stringify(['/assets/n1.js', '/assets/n2.js'])))
    await app.put('/assets/n1.js', new Response('js'))
    const w = boot(site(['/assets/n1.js', '/assets/n2.js']), c)
    await w.run('message', { type: 'pleng-fill' })
    const paths = c.paths('pleng-app-v1')
    expect(paths).toContain('/assets/n2.js')
    expect(paths).not.toContain('/assets/old.js')
  })

  it('offline: uses the kept lists, still answers', async () => {
    const c = makeCaches()
    await boot(site(['/assets/x.js']), c).run('install')
    const w = boot(null, c) // every fetch fails
    await w.run('message', { type: 'pleng-fill' })
    expect(w.posted.at(-1)).toMatchObject({ done: true, fill: true })
    expect(c.paths('pleng-app-v1')).toContain('/assets/x.js') // nothing deleted
  })

  it('other messages are ignored', async () => {
    const w = boot(site([]))
    await w.run('message', { type: 'something-else' })
    await w.run('message', null)
    expect(w.fetch).not.toHaveBeenCalled()
    expect(w.posted).toEqual([])
  })
})
