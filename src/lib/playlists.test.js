// Playlist portability + CRUD — pure logic, no browser. Guards the "no account, no PII"
// round-trip (encode→decode a shared list) and the localStorage-backed CRUD.
import { describe, it, expect, beforeEach } from 'vitest'
import { encodeState, decodeState } from './urlState.js'
import {
  playlists, createList, renameList, deleteList, toggleSong, inList,
  encodeList, decodeList, saveSharedList, listToFile, fileToList,
} from './playlists.js'

beforeEach(() => {
  localStorage.clear()
  playlists.value = []
})

describe('urlState round-trip', () => {
  it('encodes/decodes unicode + arrays losslessly', () => {
    const obj = { n: 'นมัสการเช้าอาทิตย์', i: ['a1b2', 12, 'uuid-x'] }
    expect(decodeState(encodeState(obj))).toEqual(obj)
  })
  it('is url-safe (no + / =)', () => {
    const s = encodeState({ n: 'ทีม/นมัสการ+เช้า', i: [1, 2, 3] })
    expect(s).not.toMatch(/[+/=]/)
  })
  it('returns null on garbage', () => {
    expect(decodeState('!!!not base64!!!')).toBe(null)
  })
})

describe('playlist share encode/decode', () => {
  it('round-trips a list to a link blob and back (name + ids only)', () => {
    const list = { id: 'pl_x', name: 'เพลงฝึกทีม', songIds: ['s1', 's2'] }
    const decoded = decodeList(encodeList(list))
    expect(decoded).toEqual({ name: 'เพลงฝึกทีม', songIds: ['s1', 's2'] })
    // no id / device info leaks into the blob
    expect(JSON.stringify(decoded)).not.toContain('pl_x')
  })
  it('rejects a corrupt blob', () => {
    expect(decodeList('garbage')).toBe(null)
  })
})

describe('CRUD + persistence', () => {
  it('creates, renames, toggles songs, deletes; persists to localStorage', () => {
    const id = createList('เช้าอาทิตย์')
    expect(playlists.value).toHaveLength(1)
    expect(toggleSong(id, 's1')).toBe(true)
    expect(inList(id, 's1')).toBe(true)
    expect(toggleSong(id, 's1')).toBe(false) // toggle off
    expect(inList(id, 's1')).toBe(false)
    renameList(id, 'เช้าวันอาทิตย์')
    expect(playlists.value[0].name).toBe('เช้าวันอาทิตย์')
    // persisted
    expect(JSON.parse(localStorage.getItem('pleng.playlists'))[0].name).toBe('เช้าวันอาทิตย์')
    deleteList(id)
    expect(playlists.value).toHaveLength(0)
  })
  it('saveSharedList adds a fresh local copy', () => {
    const id = saveSharedList({ name: 'ที่แชร์มา', songIds: ['a', 'b'] })
    expect(getListName(id)).toBe('ที่แชร์มา')
  })
})

describe('file backup', () => {
  it('listToFile/fileToList round-trip; rejects foreign files', () => {
    const f = listToFile({ id: 'x', name: 'สำรอง', songIds: ['s1'] })
    expect(f.type).toBe('pleng.playlist')
    expect(fileToList(f)).toEqual({ name: 'สำรอง', songIds: ['s1'] })
    expect(fileToList({ type: 'something-else' })).toBe(null)
  })
})

function getListName(id) {
  return playlists.value.find((l) => l.id === id)?.name
}
