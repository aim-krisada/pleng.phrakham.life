// Send one song draft through the import door of db/014 (ใบ v1#158).
//
//   node tools/import-draft.mjs <draft.json> [--dry-run]
//
// The draft lands in พี่เปา's review queue (status 'pending'), owned by the import account.
// It cannot publish anything — an approver still has to open it and approve it.
//
// draft.json — one object with these fields (anything else is refused):
//   title_th  (required) Thai title, at most 200 characters
//   content   (required) the song content object (see docs/importing-songs.md)
//   song_id   id of an existing song on the site → a draft OF that song (e.g. adding English
//             lyrics). Leave out for a brand-new song.
//   number, title_en, category ('lem-yai' | 'anuchon' | 'dek-lek'), theme — optional
//   note      short message for the approver, shown as "นำเข้าอัตโนมัติ: <note>"
//
// The key comes ONLY from the environment variable PLENG_IMPORT_KEY — never from the command
// line (it would land in shell history) — and is never printed.
// --dry-run checks the file here and prints a summary; it sends nothing and needs no key.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

// The same rules import_draft() enforces in the database (db/014) — checked here first so a
// mistake is caught before anything is sent. The database stays the real gate.
export const ALLOWED = ['song_id', 'number', 'title_th', 'title_en', 'content', 'category', 'theme', 'note']
export const CATEGORIES = ['lem-yai', 'anuchon', 'dek-lek']
export const MAX_BYTES = 300 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const optText = (v, max) => v == null || (typeof v === 'string' && [...v].length <= max)

export function validateDraft(d) {
  const errors = []
  if (!isObj(d)) return ['draft must be a JSON object']
  const unknown = Object.keys(d).filter((k) => !ALLOWED.includes(k)).sort()
  if (unknown.length) errors.push(`unknown field(s): ${unknown.join(', ')}`)
  // Postgres measures jsonb as text; Buffer length of the compact JSON is a close stand-in
  if (Buffer.byteLength(JSON.stringify(d), 'utf8') > MAX_BYTES) errors.push('draft is larger than 300 kB')
  if (typeof d.title_th !== 'string' || !d.title_th.trim()) errors.push('title_th is required')
  else if ([...d.title_th.trim()].length > 200) errors.push('title_th is longer than 200 characters')
  if (!isObj(d.content)) errors.push('content must be a JSON object')
  if (!optText(d.title_en, 200)) errors.push('title_en must be text of at most 200 characters')
  if (d.number != null && !(Number.isInteger(d.number) && d.number >= 1 && d.number <= 99999))
    errors.push('number must be a whole number from 1 to 99999')
  if (d.category != null && !CATEGORIES.includes(d.category))
    errors.push('category must be lem-yai, anuchon or dek-lek')
  if (!optText(d.theme, 100)) errors.push('theme must be text of at most 100 characters')
  if (!optText(d.note, 1000)) errors.push('note must be text of at most 1000 characters')
  if (d.song_id != null && !(typeof d.song_id === 'string' && UUID.test(d.song_id)))
    errors.push('song_id must be a song id')
  return errors
}

export function summarize(d) {
  const lines = Array.isArray(d.content?.lines) ? `${d.content.lines.length} lines (v1)` : null
  const stanzas = Array.isArray(d.content?.stanzas) ? `${d.content.stanzas.length} stanzas (v2)` : null
  return [
    `title_th : ${d.title_th}`,
    `title_en : ${d.title_en ?? '-'}`,
    `song     : ${d.song_id ? `draft of existing song ${d.song_id}` : 'new song'}`,
    `number   : ${d.number ?? '-'}   category: ${d.category ?? '-'}   theme: ${d.theme ?? '-'}`,
    `content  : ${lines || stanzas || 'object'}${d.content?.key ? `, key ${d.content.key}` : ''}`,
    `size     : ${(Buffer.byteLength(JSON.stringify(d), 'utf8') / 1024).toFixed(1)} kB`,
    `note     : ${d.note ?? '-'}`,
  ].join('\n')
}

// The site's own publishable key + URL, read from src/supabase.js so there is one source.
export function siteEndpoint() {
  const src = readFileSync(join(HERE, '..', 'src', 'supabase.js'), 'utf8')
  const url = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1]
  const key = src.match(/SUPABASE_KEY\s*=\s*'([^']+)'/)?.[1]
  if (!url || !key) throw new Error('could not read the site URL/key from src/supabase.js')
  return { url, key }
}

export async function sendDraft(draft, importKey, { fetchImpl = fetch } = {}) {
  const { url, key } = siteEndpoint()
  const res = await fetchImpl(`${url}/rest/v1/rpc/import_draft`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: importKey, p_draft: draft }),
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  if (!res.ok) {
    const msg = (isObj(body) && (body.message || body.hint)) || `HTTP ${res.status}`
    throw new Error(String(msg).split(importKey).join('***')) // belt and braces: never echo the key
  }
  return body // the new draft id
}

async function main(argv) {
  const args = argv.slice(2)
  const dry = args.includes('--dry-run')
  const files = args.filter((a) => a !== '--dry-run')
  if (files.length !== 1 || files[0].startsWith('-')) {
    console.error('usage: node tools/import-draft.mjs <draft.json> [--dry-run]\n(the key is read from PLENG_IMPORT_KEY, never from the command line)')
    return 2
  }
  let draft
  try {
    draft = JSON.parse(readFileSync(resolve(files[0]), 'utf8').replace(/^﻿/, ''))
  } catch (e) {
    console.error(`cannot read ${files[0]}: ${e.message}`)
    return 2
  }
  const errors = validateDraft(draft)
  if (errors.length) {
    console.error(`not sent — fix these first:\n- ${errors.join('\n- ')}`)
    return 1
  }
  if (dry) {
    console.log(`${summarize(draft)}\n\nOK — dry run, nothing sent.`)
    return 0
  }
  const importKey = (process.env.PLENG_IMPORT_KEY || '').trim()
  if (!importKey) {
    console.error('PLENG_IMPORT_KEY is not set — nothing sent.')
    return 2
  }
  try {
    const id = await sendDraft(draft, importKey)
    console.log(id)
    return 0
  } catch (e) {
    console.error(`not sent: ${e.message}`)
    return 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv).then((code) => process.exit(code))
}
