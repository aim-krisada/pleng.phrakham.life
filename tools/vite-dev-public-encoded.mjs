// Dev-only rescue for public/ files whose NAME contains a URI-reserved character.
//
// The trap: vite 5's `servePublicMiddleware` turns the request path into a file path with
// `decodeURI()`. By spec `decodeURI` leaves URI-RESERVED characters escaped — `%20` becomes a
// space, but `%23` stays `%23`. So a request for `.../FF%20G%232.ogg` is looked up as
// `.../FF G%232.ogg`, misses the `publicFiles` set, falls through every later middleware and is
// finally answered by the SPA fallback: **HTTP 200, content-type text/html, index.html bytes**.
//
// GitHub Pages serves those same files correctly (200 · audio/ogg — verified against production),
// so nothing ships broken. But the dev server silently hands back an HTML page where a session
// expects audio, and `decodeAudioData()` then fails for reasons that look like a real audio bug.
// Three sessions lost time to it. This is tooling repair, not a feature.
//
// Scope is deliberately the narrowest thing that fixes it: we take over ONLY when
// `decodeURI(path) !== decodeURIComponent(path)` — i.e. exactly the paths vite decodes wrongly —
// and only when the fully-decoded path is a real file inside publicDir. Plain names, `%20`-only
// names, SPA routes and anything resolving outside publicDir are handed straight back to vite.

import fs from 'node:fs'
import path from 'node:path'

// Only the extensions that can actually appear under public/, plus the usual web set. Anything
// unknown falls back to octet-stream rather than guessing (never text/html — that is the bug).
const MIME = {
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.mid': 'audio/midi',
  '.midi': 'audio/midi',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
}

// vite queries that mean "transform this, don't hand me the bytes" — leave those to vite.
const VITE_QUERY_RE = /(^|&)(import|url|raw|inline|worker|sharedworker)(=|&|$)/

export function contentTypeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

/**
 * Decide whether this request is one vite mis-decodes, and if so where the file lives.
 * Pure + synchronous so it can be unit-tested without a server.
 *
 * @param {string} publicRoot absolute path of publicDir
 * @param {string} rawUrl     raw `req.url` (may carry query / hash)
 * @param {(p: string) => boolean} isFile existence probe (injectable for tests)
 * @returns {string|null} absolute file path to serve, or null to let vite handle it
 */
export function resolveEncodedPublicFile(publicRoot, rawUrl, isFile) {
  if (typeof rawUrl !== 'string' || rawUrl === '') return null

  const hash = rawUrl.indexOf('#')
  const withoutHash = hash === -1 ? rawUrl : rawUrl.slice(0, hash)
  const q = withoutHash.indexOf('?')
  const rawPath = q === -1 ? withoutHash : withoutHash.slice(0, q)
  const query = q === -1 ? '' : withoutHash.slice(q + 1)

  if (!rawPath.includes('%')) return null // nothing encoded — vite is fine
  if (query && VITE_QUERY_RE.test(query)) return null // vite wants to transform it

  let loose
  let full
  try {
    loose = decodeURI(rawPath)
    full = decodeURIComponent(rawPath)
  } catch {
    return null // malformed escape — same answer vite gives today
  }
  if (loose === full) return null // vite decodes this path correctly already

  const root = path.resolve(publicRoot)
  const file = path.join(root, full)

  // Containment: `..%2f..%2fpackage.json` decodes to an escape only under decodeURIComponent, so it
  // reaches here — it must not reach the disk.
  const rel = path.relative(root, file)
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null

  return isFile(file) ? file : null
}

function statFile(p) {
  try {
    return fs.statSync(p)
  } catch {
    return null
  }
}

/** Parse a single `bytes=` range against a known size. null = ignore, false = unsatisfiable. */
export function parseRange(header, size) {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m) return null
  const [, rawStart, rawEnd] = m
  if (rawStart === '' && rawEnd === '') return null

  let start
  let end
  if (rawStart === '') {
    const suffix = Number(rawEnd)
    if (suffix === 0) return false
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  }
  if (start > end || start >= size) return false
  return { start, end }
}

export default function devServeEncodedPublicNames() {
  return {
    name: 'pleng-dev-serve-encoded-public-names',
    apply: 'serve', // never part of a production build
    configureServer(server) {
      const publicDir = server.config.publicDir
      if (!publicDir) return
      const root = path.resolve(publicDir)

      // Registered inside configureServer, so it runs BEFORE vite's own public/static/SPA-fallback
      // middlewares — which is the whole point: we must answer before the fallback does.
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()

        const file = resolveEncodedPublicFile(root, req.url, (p) => !!statFile(p)?.isFile())
        if (!file) return next()

        const stat = statFile(file)
        if (!stat) return next()

        res.setHeader('Content-Type', contentTypeFor(file))
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('Last-Modified', stat.mtime.toUTCString())

        const range = parseRange(req.headers.range, stat.size)
        if (range === false) {
          res.statusCode = 416
          res.setHeader('Content-Range', `bytes */${stat.size}`)
          return res.end()
        }

        const start = range ? range.start : 0
        const end = range ? range.end : stat.size - 1
        if (range) {
          res.statusCode = 206
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
        } else {
          res.statusCode = 200
        }
        res.setHeader('Content-Length', String(end - start + 1))

        if (req.method === 'HEAD') return res.end()

        const stream = fs.createReadStream(file, { start, end })
        stream.on('error', () => res.end())
        stream.pipe(res)
      })
    },
  }
}
