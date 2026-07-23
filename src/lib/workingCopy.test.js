// A-fix (23 ก.ค.) — the local working copy that stops โหมดแก้ inline losing work on reload.
import { describe, it, expect } from 'vitest'
import { keyFor, writeWorkingCopy, readWorkingCopy, clearWorkingCopy, hasRecoverable, contentStamp } from './workingCopy.js'

// minimal Storage stand-in (the real one is injectable so this needs no browser)
function fakeStore(broken = false) {
  const map = new Map()
  return {
    getItem: (k) => (broken ? (() => { throw new Error('blocked') })() : (map.has(k) ? map.get(k) : null)),
    setItem: (k, v) => { if (broken) throw new Error('quota'); map.set(k, v) },
    removeItem: (k) => { if (!broken) map.delete(k) },
    _map: map,
  }
}
const content = { key: 'C', stanzas: [{ id: 's1', lines: [] }] }

describe('contentStamp — "is this the same music?"', () => {
  it('ignores object key order (Postgres jsonb reorders; a rebuilt object does not)', () => {
    // found live: the loaded song read as ยังไม่บันทึก, and ย้อน could not get back to บันทึกแล้ว
    const fromDb = { bpm: 60, key: 'G', stanzas: [{ id: 'A', lines: [] }], version: 2 }
    const rebuilt = { version: 2, key: 'G', bpm: 60, stanzas: [{ lines: [], id: 'A' }] }
    expect(contentStamp(fromDb)).toBe(contentStamp(rebuilt))
  })

  it('still sees a real edit, and never reorders arrays (order IS the music)', () => {
    const a = { stanzas: [{ id: 'A', lines: [['1', '2']] }] }
    expect(contentStamp(a)).not.toBe(contentStamp({ stanzas: [{ id: 'A', lines: [['1', '3']] }] }))
    expect(contentStamp(a)).not.toBe(contentStamp({ stanzas: [{ id: 'A', lines: [['2', '1']] }] }))
  })
})

describe('workingCopy', () => {
  it('round-trips a copy under a per-song key', () => {
    const st = fakeStore()
    expect(writeWorkingCopy(7, content, 1000, st)).toBe(true)
    expect(st._map.has(keyFor(7))).toBe(true)
    const wc = readWorkingCopy(7, st)
    expect(wc.content).toEqual(content)
    expect(wc.savedAt).toBe(1000)
    expect(readWorkingCopy(8, st)).toBe(null) // another song is unaffected
  })

  it('a new (unsaved) song gets its own slot, not a real song\'s', () => {
    const st = fakeStore()
    writeWorkingCopy(null, content, 1, st)
    expect(readWorkingCopy(null, st).content).toEqual(content)
    expect(readWorkingCopy(1, st)).toBe(null)
  })

  it('clear removes it (what a successful save does)', () => {
    const st = fakeStore()
    writeWorkingCopy(7, content, 1, st)
    clearWorkingCopy(7, st)
    expect(readWorkingCopy(7, st)).toBe(null)
  })

  it('blocked/full storage never throws — editing keeps working without recovery', () => {
    const st = fakeStore(true)
    expect(writeWorkingCopy(7, content, 1, st)).toBe(false)
    expect(readWorkingCopy(7, st)).toBe(null)
    expect(() => clearWorkingCopy(7, st)).not.toThrow()
  })

  it('garbage / an old shape is ignored rather than restored', () => {
    const st = fakeStore()
    st.setItem(keyFor(7), 'not json')
    expect(readWorkingCopy(7, st)).toBe(null)
    st.setItem(keyFor(7), JSON.stringify({ v: 99, content }))
    expect(readWorkingCopy(7, st)).toBe(null)
  })

  it('only offers recovery when the local copy DIFFERS from the server song', () => {
    const st = fakeStore()
    writeWorkingCopy(7, content, 1, st)
    expect(hasRecoverable(7, content, st)).toBe(null) // identical → no nagging
    const edited = { ...content, key: 'G' }
    writeWorkingCopy(7, edited, 2, st)
    expect(hasRecoverable(7, content, st).content).toEqual(edited)
  })
})
