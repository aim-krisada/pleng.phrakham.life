// @vitest-environment node
// ga-stats Edge Function (ใบ v3/pleng#163 Security 1–2) — run under Node with a fake network:
//   * only a logged-in team member gets an answer; no login → 401, not on the team → 403
//   * every report asks Google for pleng.phrakham.life only (the GA property is shared)
//   * the signature Google checks is a real RS256 signature by the service account key
//   * a fresh cached answer is used without asking Google; a Google failure falls back to the old one
import { describe, it, expect } from 'vitest'
import { handle, reportList, compact, signedAssertion, fresh, dateRanges, HOST, CACHE_HOURS } from './index.ts'

const ENV = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  GA_PROPERTY_ID: '123',
  GA_SA_KEY: '{"client_email":"a@b.iam.gserviceaccount.com","private_key":"x"}',
}
const json = (status, body) => new Response(JSON.stringify(body), { status })
const post = (body, auth = 'Bearer user-jwt') =>
  new Request('https://fn/ga-stats', { method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(body) })

// a fake network: who the token belongs to, whether they are on the team, what the cache holds
function net({ user = { id: 'u1' }, team = true, cache = null } = {}) {
  const seen = []
  const f = async (url, init = {}) => {
    seen.push(String(url))
    if (url.endsWith('/auth/v1/user')) return user ? json(200, user) : json(401, {})
    if (url.includes('/rest/v1/profiles')) {
      expect(init.headers.apikey).toBe('service')
      return json(200, team ? [{ id: 'u1' }] : [])
    }
    if (url.includes('/rest/v1/stats_cache')) return json(200, cache ? [cache] : [])
    if (url.includes('googleapis')) return json(500, {})
    return json(404, {})
  }
  f.seen = seen
  return f
}

describe('who may ask', () => {
  it('no login → 401, and Google is never asked', async () => {
    const n = net({ user: null })
    const r = await handle(post({ days: 28 }), ENV, n)
    expect(r.status).toBe(401)
    expect(n.seen.some((u) => u.includes('googleapis'))).toBe(false)
  })

  it('logged in but not on the team → 403', async () => {
    const r = await handle(post({ days: 28 }), ENV, net({ team: false }))
    expect(r.status).toBe(403)
  })

  it('a range other than 7 / 28 / 90 is refused', async () => {
    expect((await handle(post({ days: 365 }), ENV, net())).status).toBe(400)
  })

  it('secrets not set yet → 503 not_configured, so the page can say "not connected"', async () => {
    const r = await handle(post({ days: 28 }), { ...ENV, GA_SA_KEY: '' }, net())
    expect(r.status).toBe(503)
    expect((await r.json()).error).toBe('not_configured')
  })

  it('answers the browser preflight with CORS headers', async () => {
    const r = await handle(new Request('https://fn', { method: 'OPTIONS' }), ENV, net())
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('cache', () => {
  const data = { days: 28, reports: { totals: [] } }
  it('a fresh cached answer comes back without asking Google', async () => {
    const n = net({ cache: { data, fetched_at: new Date().toISOString() } })
    const r = await handle(post({ days: 28 }), ENV, n)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual(data)
    expect(n.seen.some((u) => u.includes('googleapis'))).toBe(false)
  })

  it('Google failing: an old answer is returned marked stale; with none → 502', async () => {
    const old = new Date(Date.now() - (CACHE_HOURS + 1) * 3600e3).toISOString()
    const r = await handle(post({ days: 28 }), ENV, net({ cache: { data, fetched_at: old } }))
    expect(r.status).toBe(200)
    expect((await r.json()).stale).toBe(true)
    const none = await handle(post({ days: 28 }), ENV, net())
    expect(none.status).toBe(502)
  })

  it('fresh() is CACHE_HOURS', () => {
    const now = Date.parse('2026-11-16T12:00:00Z')
    expect(fresh({ fetched_at: '2026-11-16T07:00:00Z' }, now)).toBe(true)
    expect(fresh({ fetched_at: '2026-11-16T05:00:00Z' }, now)).toBe(false)
    expect(fresh(null, now)).toBe(false)
  })
})

describe('what Google is asked', () => {
  it('every report is limited to pleng.phrakham.life', () => {
    for (const [name, req] of reportList(28)) {
      const s = JSON.stringify(req.dimensionFilter)
      expect(s, name).toContain(`"fieldName":"hostName"`)
      expect(s, name).toContain(`"value":"${HOST}"`)
    }
  })

  it('this range and the one before it, back to back', () => {
    expect(dateRanges(28)).toEqual({
      cur: { name: 'cur', startDate: '27daysAgo', endDate: 'today' },
      prev: { name: 'prev', startDate: '55daysAgo', endDate: '28daysAgo' },
    })
  })

  it('compact() turns Google rows into [dims, number]', () => {
    const rep = { rows: [{ dimensionValues: [{ value: '20261116' }, { value: 'app' }], metricValues: [{ value: '7' }] }] }
    expect(compact(rep)).toEqual([[['20261116', 'app'], 7]])
    expect(compact(undefined)).toEqual([])
  })
})

describe('signing in to Google', () => {
  it('makes a JWT whose RS256 signature verifies with the key pair', async () => {
    const pair = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )
    const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64')
    const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`
    const jwt = await signedAssertion({ client_email: 'a@b.iam.gserviceaccount.com', private_key: pem }, 1000)
    const [h, c, s] = jwt.split('.')
    const claims = JSON.parse(Buffer.from(c, 'base64url').toString())
    expect(claims).toMatchObject({ iss: 'a@b.iam.gserviceaccount.com', iat: 1000, exp: 4600 })
    expect(claims.scope).toContain('analytics.readonly')
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', pair.publicKey, Buffer.from(s, 'base64url'), new TextEncoder().encode(`${h}.${c}`),
    )
    expect(ok).toBe(true)
  })
})
