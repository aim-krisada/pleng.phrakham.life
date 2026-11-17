// @vitest-environment node
// ใบ v3/pleng#177 — tools/publish-langs.mjs: checks the file before sending, sends the RPC of db/018,
// and never lets the key show up in an error.
import { describe, it, expect } from 'vitest'
import { validatePublish, publishLangs } from './publish-langs.mjs'

const ID = '44444444-4444-4444-4444-444444444444'
const OK = { song_id: ID, content: { version: 2 }, title_en: 'A Gift' }

describe('publish-langs', () => {
  it('accepts song_id + content (+ title_en)', () => {
    expect(validatePublish(OK)).toEqual([])
    expect(validatePublish({ song_id: ID, content: {} })).toEqual([])
  })

  it('refuses unknown fields, a bad id, missing content', () => {
    expect(validatePublish({ ...OK, number: 2 })).toEqual(['unknown field(s): number'])
    expect(validatePublish({ ...OK, song_id: 'x' })).toEqual(['song_id must be a song id'])
    expect(validatePublish({ song_id: ID })).toEqual(['content must be a JSON object'])
  })

  it('calls import_publish_langs with the key in the body, not the URL', async () => {
    let seen
    const fetchImpl = async (url, init) => {
      seen = { url, body: JSON.parse(init.body) }
      return { ok: true, text: async () => JSON.stringify(ID) }
    }
    expect(await publishLangs(OK, 'k'.repeat(64), { fetchImpl })).toBe(ID)
    expect(seen.url).toMatch(/\/rest\/v1\/rpc\/import_publish_langs$/)
    expect(seen.body).toEqual({ p_key: 'k'.repeat(64), p_song_id: ID, p_content: { version: 2 }, p_title_en: 'A Gift' })
  })

  it('an error never echoes the key', async () => {
    const key = 'k'.repeat(64)
    const fetchImpl = async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ message: `bad ${key}` }) })
    await expect(publishLangs(OK, key, { fetchImpl })).rejects.toThrow('bad ***')
  })
})
