// Publish English / 中文 words of an existing song straight to the site (db/018, ใบ v3/pleng#177).
//
//   node tools/publish-langs.mjs <song.json>
//
// song.json — { "song_id": "<uuid>", "content": { …the whole song content… }, "title_en": "…" (optional) }
// The database refuses unless the content differs from the live song ONLY in English / Chinese
// words (Thai, notes, structure and the ตรวจแล้ว marks must be identical). Anything else — Thai
// fixes, a new song — goes through tools/import-draft.mjs and review instead.
// The key comes ONLY from PLENG_IMPORT_KEY and is never printed.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { siteEndpoint } from './import-draft.mjs'

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validatePublish(d) {
  const errors = []
  if (!isObj(d)) return ['file must hold a JSON object']
  const unknown = Object.keys(d).filter((k) => !['song_id', 'content', 'title_en'].includes(k))
  if (unknown.length) errors.push(`unknown field(s): ${unknown.sort().join(', ')}`)
  if (!(typeof d.song_id === 'string' && UUID.test(d.song_id))) errors.push('song_id must be a song id')
  if (!isObj(d.content)) errors.push('content must be a JSON object')
  if (d.title_en != null && !(typeof d.title_en === 'string' && [...d.title_en].length <= 200)) errors.push('title_en must be text of at most 200 characters')
  return errors
}

export async function publishLangs(d, importKey, { fetchImpl = fetch } = {}) {
  const { url, key } = siteEndpoint()
  const res = await fetchImpl(`${url}/rest/v1/rpc/import_publish_langs`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: importKey, p_song_id: d.song_id, p_content: d.content, p_title_en: d.title_en ?? null }),
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  if (!res.ok) {
    const msg = (isObj(body) && (body.message || body.hint)) || `HTTP ${res.status}`
    throw new Error(String(msg).split(importKey).join('***'))
  }
  return body
}

async function main(argv) {
  const files = argv.slice(2)
  if (files.length !== 1 || files[0].startsWith('-')) {
    console.error('usage: node tools/publish-langs.mjs <song.json>\n(the key is read from PLENG_IMPORT_KEY)')
    return 2
  }
  let d
  try {
    d = JSON.parse(readFileSync(resolve(files[0]), 'utf8').replace(/^﻿/, ''))
  } catch (e) {
    console.error(`cannot read ${files[0]}: ${e.message}`)
    return 2
  }
  const errors = validatePublish(d)
  if (errors.length) {
    console.error(`not sent — fix these first:\n- ${errors.join('\n- ')}`)
    return 1
  }
  const importKey = (process.env.PLENG_IMPORT_KEY || '').trim()
  if (!importKey) {
    console.error('PLENG_IMPORT_KEY is not set — nothing sent.')
    return 2
  }
  try {
    console.log(await publishLangs(d, importKey))
    return 0
  } catch (e) {
    console.error(`not published: ${e.message}`)
    return 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv).then((code) => process.exit(code))
}
