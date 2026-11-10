// @vitest-environment node
// ใบ v1#158 — the import CLI's local checks match db/014, the key is never echoed, and the
// key maker's hash is the SHA-256 the database compares against.
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { validateDraft, sendDraft, siteEndpoint, summarize } from './import-draft.mjs'
import { makeImportKey } from './make-import-key.mjs'

const OK = { title_th: 'เพลง', content: { lines: [] } }

describe('validateDraft — same rules as import_draft()', () => {
  it('accepts a minimal and a full draft', () => {
    expect(validateDraft(OK)).toEqual([])
    const full = { ...OK, song_id: '44444444-4444-4444-4444-444444444444', number: 12, title_en: 'Song', category: 'lem-yai', theme: 'พระเจ้า', note: 'n' }
    expect(validateDraft(full)).toEqual([])
  })
  it('refuses what the database refuses', () => {
    expect(validateDraft([])).toEqual(['draft must be a JSON object'])
    expect(validateDraft({ ...OK, status: 'approved' })).toContain('unknown field(s): status')
    expect(validateDraft({ content: {} })).toContain('title_th is required')
    expect(validateDraft({ ...OK, title_th: 'ก'.repeat(201) })).toContain('title_th is longer than 200 characters')
    expect(validateDraft({ title_th: 'x', content: [] })).toContain('content must be a JSON object')
    expect(validateDraft({ ...OK, number: 1.5 })).toContain('number must be a whole number from 1 to 99999')
    expect(validateDraft({ ...OK, category: 'x' })).toContain('category must be lem-yai, anuchon or dek-lek')
    expect(validateDraft({ ...OK, song_id: 'nope' })).toContain('song_id must be a song id')
    expect(validateDraft({ ...OK, content: { pad: 'ก'.repeat(110_000) } })).toContain('draft is larger than 300 kB')
  })
  it('summarizes without the key', () => {
    expect(summarize(OK)).toMatch(/new song/)
  })
})

describe('sendDraft', () => {
  it('posts to rpc/import_draft with the site publishable key and returns the id', async () => {
    let seen
    const fetchImpl = async (url, init) => {
      seen = { url, init }
      return { ok: true, status: 200, text: async () => '"abc-id"' }
    }
    const id = await sendDraft(OK, 'secret-key', { fetchImpl })
    expect(id).toBe('abc-id')
    const { url, key } = siteEndpoint()
    expect(seen.url).toBe(`${url}/rest/v1/rpc/import_draft`)
    expect(seen.init.headers.apikey).toBe(key)
    expect(JSON.parse(seen.init.body)).toEqual({ p_key: 'secret-key', p_draft: OK })
  })
  it('reports the database message and never echoes the key', async () => {
    const fetchImpl = async () => ({ ok: false, status: 400, text: async () => '{"message":"bad secret-key here"}' })
    await expect(sendDraft(OK, 'secret-key', { fetchImpl })).rejects.toThrow('bad *** here')
  })
})

describe('makeImportKey', () => {
  it('gives a 64-hex key and its SHA-256', () => {
    const { key, hash } = makeImportKey()
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(createHash('sha256').update(key, 'utf8').digest('hex'))
  })
})
