// ใบ v3/pleng#182 — ใส่เลขเพลงทั้งเล่มในหน้าเดียว: the pure rules behind the page
import { describe, it, expect } from 'vitest'
import {
  parseNumberInput, bookRows, duplicateNumbers, rowState, pendingChanges, titleMatches,
} from './bookNumbers.js'

const songs = [
  { id: 'c', number: 5, title_th: 'ค เพลง', category: 'dek-lek', verified: true },
  { id: 'a', number: null, title_th: 'ก เพลง', category: 'dek-lek', verified: false },
  { id: 'b', number: 2, title_th: 'ข เพลง', category: 'dek-lek', verified: true },
  { id: 'x', number: 1, title_th: 'อื่น', category: 'anuchon', verified: true },
]

describe('parseNumberInput', () => {
  it('blank = no number, which is allowed', () => {
    expect(parseNumberInput('')).toEqual({ ok: true, value: null })
    expect(parseNumberInput('   ')).toEqual({ ok: true, value: null })
  })
  it('reads plain and Thai digits', () => {
    expect(parseNumberInput(' 51 ')).toEqual({ ok: true, value: 51 })
    expect(parseNumberInput('๕๑')).toEqual({ ok: true, value: 51 })
  })
  it('refuses anything that is not a whole number from 1 up', () => {
    for (const bad of ['0', '-3', '4.5', '12a', 'ห้า', '100000']) expect(parseNumberInput(bad).ok).toBe(false)
  })
})

describe('bookRows', () => {
  it('only the chosen book, ก-ฮ by title (not by number)', () => {
    const rows = bookRows(songs, 'dek-lek')
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(rows[0]).toMatchObject({ saved: null, input: '', verified: false })
    expect(rows[2]).toMatchObject({ saved: 5, input: '5' })
  })
})

describe('duplicates, states and what a save writes', () => {
  const rows = () => bookRows(songs, 'dek-lek')

  it('nothing typed → nothing to save, no duplicates', () => {
    const r = rows()
    expect(pendingChanges(r)).toEqual([])
    expect(duplicateNumbers(r).size).toBe(0)
    expect(r.map((x) => rowState(x, new Set()))).toEqual(['same', 'same', 'same'])
  })

  it('the same number in two boxes is flagged on both', () => {
    const r = rows()
    r[0].input = '5' // ก takes 5, which ค still has
    const d = duplicateNumbers(r)
    expect([...d]).toEqual([5])
    expect(rowState(r[0], d)).toBe('dup')
    expect(rowState(r[2], d)).toBe('dup')
  })

  it('a duplicate does not stop the save; a non-number row is left out', () => {
    const r = rows()
    r[0].input = '5'
    r[1].input = 'abc'
    expect(pendingChanges(r)).toEqual([{ id: 'a', number: 5 }])
    expect(rowState(r[1], new Set())).toBe('bad')
  })

  it('clearing a box writes "no number"', () => {
    const r = rows()
    r[2].input = ''
    expect(pendingChanges(r)).toEqual([{ id: 'c', number: null }])
  })

  it('typing the same number back is not a change', () => {
    const r = rows()
    r[1].input = ' 2 '
    expect(pendingChanges(r)).toEqual([])
  })
})

describe('titleMatches', () => {
  it('ignores spaces on both sides', () => {
    expect(titleMatches('ดูซิเธอดูซิ', 'ดูซิ เธอ')).toBe(true)
    expect(titleMatches('โด เร มี', 'โดเร')).toBe(true)
    expect(titleMatches('โด เร มี', 'ฟา')).toBe(false)
    expect(titleMatches('อะไรก็ได้', '')).toBe(true)
  })
})
