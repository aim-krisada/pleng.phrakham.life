// @ts-nocheck — plain JS on purpose (pasted into the Supabase editor as is; tested under Node)
// ga-stats — the middleman between หน้าสถิติ and Google Analytics (ใบ v3/pleng#163 Security 1–2, #164–#174).
//
// WHY A MIDDLEMAN: the Google read key must never be in the web page (ISO 27001 A 5.17). It lives only
// in this function's secrets. The function answers a logged-in team member only (A 8.3), and only ever
// asks Google for numbers of pleng.phrakham.life — the GA property is shared with the main site.
//
// ONE FILE, NO IMPORTS on purpose: P'Aim pastes it into Supabase ▸ Edge Functions ▸ Deploy a new
// function ▸ Via Editor. The pure helpers are exported so the repo tests (ga-stats.test.js) run them.
//
// PUBLIC NUMBERS (ใบ v3/pleng#180, พี่เอม 19 พ.ย. 2569): a call with { public: true } needs no login and
// gets only PUBLIC_REPORTS — how many people, the top songs, where they are and how they came. Search
// words, the songs that need fixing, buttons, devices and the team's work never leave this function on
// that door: they are cut here, not just hidden on the page.
//
// SECRETS (Supabase ▸ Edge Functions ▸ Secrets):
//   GA_PROPERTY_ID — the numeric property id (Admin ▸ Property details), not the G-… measurement id
//   GA_SA_KEY      — the whole JSON key file of the service account that has Viewer on the property
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.
//
// CACHE: db/017 stats_cache — one row per range (7/28/90 days), refreshed when older than CACHE_HOURS,
// so the page opens fast and Google is asked a few times a day at most.

export const HOST = 'pleng.phrakham.life'
export const RANGES = [7, 28, 90]
export const CACHE_HOURS = 6
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

// ── what we ask Google ────────────────────────────────────────────────────────────────────────
const exact = (fieldName, value) => ({ filter: { fieldName, stringFilter: { matchType: 'EXACT', value } } })
const onHost = exact('hostName', HOST)
const onEvent = (name) => ({ andGroup: { expressions: [onHost, exact('eventName', name)] } })
const ce = (n) => ({ name: 'customEvent:' + n })

export function dateRanges(days) {
  return {
    cur: { name: 'cur', startDate: `${days - 1}daysAgo`, endDate: 'today' },
    prev: { name: 'prev', startDate: `${2 * days - 1}daysAgo`, endDate: `${days}daysAgo` },
  }
}

// Each report: [name, request]. batchRunReports takes at most 5 per call.
export function reportList(days) {
  const { cur, prev } = dateRanges(days)
  const r = (dims, metric, filter, ranges = [cur], limit = 250) => ({
    dateRanges: ranges,
    dimensions: dims.map((d) => (typeof d === 'string' ? { name: d } : d)),
    metrics: [{ name: metric }],
    dimensionFilter: filter,
    limit,
  })
  return [
    ['totals', r([], 'activeUsers', onHost, [cur, prev])], // stat.03 ตัวเลขใหญ่ + เทียบช่วงก่อน
    ['totalsByMode', r([ce('display_mode')], 'activeUsers', onHost, [cur, prev])], // stat.03 ข้อ 5
    ['daily', r(['date', ce('display_mode')], 'activeUsers', onHost)], // stat.03 กราฟรายวัน
    ['hours', r(['hour'], 'activeUsers', onHost)], // stat.03 ช่วงเวลา
    ['songs', r(['pagePath'], 'eventCount', onEvent('page_view'), [cur, prev], 500)], // stat.04 · .07
    ['regions', r(['country', 'region'], 'activeUsers', onHost)], // stat.05
    ['sources', r(['sessionSource', 'sessionMedium'], 'sessions', onHost)], // stat.05
    ['searches', r([ce('search_term'), ce('search_found')], 'eventCount', onEvent('search'), [cur], 500)], // stat.06 · .08
    ['searchPicks', r([ce('search_term')], 'eventCount', onEvent('search_select'), [cur], 500)], // stat.08
    ['features', r([ce('feature')], 'eventCount', onEvent('feature_use'))], // stat.10
    ['deadEnds', r([ce('dead_end'), ce('song_id')], 'eventCount', onEvent('dead_end'))], // stat.11
    ['keyChanges', r([ce('song_id'), ce('key_to')], 'eventCount', onEvent('key_change'))], // stat.07
    ['openFrom', r([ce('open_from')], 'eventCount', onEvent('page_view'))], // stat.12
    ['devices', r(['deviceCategory', 'operatingSystem', ce('display_mode')], 'activeUsers', onHost)], // stat.13
    ['featureSongs', r([ce('feature'), ce('song_id')], 'eventCount', onEvent('feature_use'), [cur], 500)], // พี่เอม 18 พ.ย. 2569 — which song a star / English switch was for
  ]
}

// the reports anyone may see (ใบ v3/pleng#180); `songs` keeps song pages only
export const PUBLIC_REPORTS = ['totals', 'totalsByMode', 'daily', 'hours', 'songs', 'regions', 'sources']
export function publicBundle(bundle) {
  const reports = {}
  for (const name of PUBLIC_REPORTS) reports[name] = bundle?.reports?.[name] || []
  reports.songs = reports.songs.filter(([d]) => /^\/song\/[^/?#]+$/.test(String(d?.[0] || '')))
  const out = { days: bundle?.days, fetchedAt: bundle?.fetchedAt, public: true, reports }
  if (bundle?.stale) out.stale = true
  return out
}

// Google's rows → [[...dimension values], number]; a multi-range report ends each row with its range name
export function compact(report) {
  return (report?.rows || []).map((row) => [
    (row.dimensionValues || []).map((v) => v.value),
    Number(row.metricValues?.[0]?.value || 0),
  ])
}

// ── signing in to Google as the service account (OAuth 2 JWT bearer, RS256 via WebCrypto) ──────────
const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64urlText = (s) => b64url(new TextEncoder().encode(s))

export async function signedAssertion(key, nowSec = Math.floor(Date.now() / 1000)) {
  const header = b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64urlText(
    JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: nowSec, exp: nowSec + 3600 }),
  )
  const pem = String(key.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(`${header}.${claims}`))
  return `${header}.${claims}.${b64url(sig)}`
}

async function googleToken(key) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await signedAssertion(key) }),
  })
  if (!res.ok) throw new Error('google_token ' + res.status)
  return (await res.json()).access_token
}

export async function fetchBundle(days, { propertyId, key }) {
  const token = await googleToken(key)
  const list = reportList(days)
  const reports = {}
  for (let i = 0; i < list.length; i += 5) {
    const part = list.slice(i, i + 5)
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: part.map(([, req]) => req) }),
    })
    if (!res.ok) throw new Error('google_report ' + res.status + ' ' + (await res.text()).slice(0, 300))
    const body = await res.json()
    part.forEach(([name], j) => (reports[name] = compact(body.reports?.[j])))
  }
  return { days, fetchedAt: new Date().toISOString(), reports }
}

// ── the HTTP door ─────────────────────────────────────────────────────────────────────────────
export const CORS = {
  'Access-Control-Allow-Origin': '*', // the team answer is gated by the caller's login, not by origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export function fresh(row, now = Date.now()) {
  return !!row && now - new Date(row.fetched_at).getTime() < CACHE_HOURS * 3600 * 1000
}

export async function handle(req, env, net = fetch) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = env
  const auth = req.headers.get('Authorization') || ''
  const svc = { apikey: service, Authorization: 'Bearer ' + service }
  let ask = {}
  try { ask = (await req.json()) || {} } catch { /* no body = 28 days, team door */ }
  const pub = ask.public === true

  if (!pub) {
    // 1. who is asking — a real logged-in user (the anon key alone is not a user)
    const who = await net(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } })
    if (!who.ok) return reply(401, { error: 'login_required' })
    const uid = (await who.json())?.id
    if (!uid) return reply(401, { error: 'login_required' })

    // 2. on the team — has a profiles row (db/002)
    const prof = await net(`${url}/rest/v1/profiles?id=eq.${uid}&select=id`, { headers: svc })
    if (!prof.ok || !(await prof.json()).length) return reply(403, { error: 'team_only' })
  }
  const answer = (status, body) => reply(status, pub && status === 200 ? publicBundle(body) : body)

  // 3. which range
  const days = Number(ask.days) || 28
  if (!RANGES.includes(days)) return reply(400, { error: 'bad_range' })

  if (!env.GA_PROPERTY_ID || !env.GA_SA_KEY) return reply(503, { error: 'not_configured' })

  // 4. cache first
  const cached = await net(`${url}/rest/v1/stats_cache?days=eq.${days}&select=data,fetched_at`, { headers: svc })
  const row = cached.ok ? (await cached.json())[0] : null
  if (fresh(row)) return answer(200, row.data)

  // 5. ask Google, keep the answer
  let bundle
  try {
    bundle = await fetchBundle(days, { propertyId: env.GA_PROPERTY_ID, key: JSON.parse(env.GA_SA_KEY) })
  } catch (e) {
    console.error(e)
    if (row) return answer(200, { ...row.data, stale: true }) // an older answer beats none
    return reply(502, { error: 'google_failed' })
  }
  await net(`${url}/rest/v1/stats_cache`, {
    method: 'POST',
    headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ days, data: bundle, fetched_at: bundle.fetchedAt }),
  })
  return answer(200, bundle)
}

// Deno only — the repo tests import this file under Node and never start a server
const D = globalThis.Deno
if (D?.serve) D.serve((req) => handle(req, D.env.toObject()))
