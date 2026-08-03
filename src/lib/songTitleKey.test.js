// B-DUP — the three rules P'Aim ruled on (27 ก.ค.), with the Thai drift a book converted
// by AI actually produces. If one of these goes red the guard is not protecting the library.
import { describe, it, expect } from 'vitest'
import {
  titleKeyExact,
  titleKeyLoose,
  isSimilarTitle,
  bookKey,
  findTitleConflicts,
  editDistance,
  findEarlyTitleMatches,
  earlyDupNote,
} from './songTitleKey.js'

const song = (o) => ({
  id: o.id,
  number: o.number ?? null,
  title_th: o.t,
  category: 'b' in o ? o.b : 'anuchon',
})
const LIB = [
  song({ id: 'a', number: 91, t: 'เรามาประชุมพร้อมหน้า', b: 'anuchon' }),
  song({ id: 'b', number: 12, t: 'พระเยซูทรงรักเด็กๆ', b: 'lem-yai' }),
  song({ id: 'c', number: null, t: 'พระดำรัสชิมหวานสักปานใด', b: 'dek-lek' }),
]

describe('title keys — same name typed differently', () => {
  it('ignores leading/trailing and inner spacing', () => {
    expect(titleKeyExact('  เรามา ประชุม พร้อมหน้า ')).toBe(titleKeyExact('เรามาประชุมพร้อมหน้า'))
  })
  it('ignores a catalog number pasted into the name (Arabic and Thai digits)', () => {
    expect(titleKeyExact('12. เรามาประชุมพร้อมหน้า')).toBe(titleKeyExact('เรามาประชุมพร้อมหน้า'))
    expect(titleKeyExact('๑๒ เรามาประชุมพร้อมหน้า')).toBe(titleKeyExact('เรามาประชุมพร้อมหน้า'))
    expect(titleKeyExact('032 - เรามาประชุมพร้อมหน้า')).toBe(titleKeyExact('เรามาประชุมพร้อมหน้า'))
  })
  it('folds the สระอำ encoding variant (นิคหิต + สระอา)', () => {
    // 'ดํา' (U+0E4D U+0E32) is what several converters emit for 'ดำ' (U+0E33)
    expect(titleKeyExact('พระดํารัสชิมหวานสักปานใด')).toBe(titleKeyExact('พระดำรัสชิมหวานสักปานใด'))
  })
  it('drops zero-width characters', () => {
    expect(titleKeyExact('เรามา​ประชุมพร้อมหน้า')).toBe(titleKeyExact('เรามาประชุมพร้อมหน้า'))
  })
  it('keeps tone marks apart — a different tone is a different word', () => {
    expect(titleKeyExact('ข้าเชื่อ')).not.toBe(titleKeyExact('ขาเชื่อ'))
  })
})

describe('similar (warn) tier', () => {
  it('treats tone-mark drift as similar, not identical', () => {
    expect(titleKeyLoose('ข้าเชื่อ')).toBe(titleKeyLoose('ขาเชือ'))
    expect(isSimilarTitle('ข้าเชื่อวางใจ', 'ขาเชือวางใจ')).toBe(true)
  })
  it('treats a swapped vowel length as similar (สระอู/อุ · อี/อิ)', () => {
    expect(isSimilarTitle('พระเยซูทรงรักเด็กๆ', 'พระเยซุทรงรักเด็กๆ')).toBe(true)
  })
  it('treats one typo as similar', () => {
    expect(isSimilarTitle('เรามาประชุมพร้อมหน้า', 'เรามาประชุมพร้อมหนา')).toBe(true)
  })
  it('does NOT call two genuinely different songs similar', () => {
    expect(isSimilarTitle('พระเยซูทรงรักเด็กๆ', 'เรามาประชุมพร้อมหน้า')).toBe(false)
    expect(isSimilarTitle('รักพระเจ้า', 'รักแม่')).toBe(false)
  })
  it('is strict about very short names (one character = another word)', () => {
    expect(isSimilarTitle('รัก', 'รู้')).toBe(false)
    // G's alert-fatigue case: a short title whose LOOSE key matches is still not a warning
    expect(titleKeyLoose('สิบ')).toBe(titleKeyLoose('สีบ'))
    expect(isSimilarTitle('สิบ', 'สีบ')).toBe(false)
  })
  it('editDistance caps out instead of walking the whole matrix', () => {
    expect(editDistance('abcdefgh', 'zzzzzzzz', 1)).toBe(2)
    expect(editDistance('abc', 'abd', 1)).toBe(1)
  })
})

describe('เล่ม (book) is taken off the data, never hard-coded', () => {
  it('uses the category column, with unfiled songs in their own bucket', () => {
    expect(bookKey({ category: 'dek-lek' })).toBe('dek-lek')
    expect(bookKey({ category: '  lem-yai ' })).toBe('lem-yai')
    expect(bookKey({ category: null })).toBe('__none__')
    expect(bookKey({})).toBe('__none__')
  })
  it('works for a เล่ม nobody has written code for yet', () => {
    const lib = [song({ id: 'x', number: 1, t: 'เพลงใหม่', b: 'book-2027' })]
    const r = findTitleConflicts({ title_th: 'เพลงใหม่', category: 'book-2027' }, lib)
    expect(r.level).toBe('block')
  })
})

describe('the three rules', () => {
  it('BLOCKS an identical title in the same เล่ม', () => {
    const r = findTitleConflicts({ title_th: ' 91. เรามา ประชุมพร้อมหน้า', category: 'anuchon' }, LIB)
    expect(r.level).toBe('block')
    expect(r.blocking.map((s) => s.id)).toEqual(['a'])
  })
  it('WARNS (does not block) on a similar title in the same เล่ม', () => {
    const r = findTitleConflicts({ title_th: 'เรามาประชุมพร้อมหนา', category: 'anuchon' }, LIB)
    expect(r.level).toBe('warn')
    expect(r.warning.map((s) => s.id)).toEqual(['a'])
    expect(r.blocking).toEqual([])
  })
  it('PASSES an identical title in a different เล่ม, but says where else it lives', () => {
    const r = findTitleConflicts({ title_th: 'เรามาประชุมพร้อมหน้า', category: 'dek-lek' }, LIB)
    expect(r.level).toBe('info')
    expect(r.info.map((s) => s.id)).toEqual(['a'])
    expect(r.blocking).toEqual([])
  })
  it('is quiet for a genuinely new song', () => {
    expect(findTitleConflicts({ title_th: 'เพลงที่ยังไม่มีใครใส่', category: 'anuchon' }, LIB).level).toBe('ok')
  })
  it('never fights the song being edited (its own row is skipped)', () => {
    const r = findTitleConflicts({ id: 'a', title_th: 'เรามาประชุมพร้อมหน้า', category: 'anuchon' }, LIB)
    expect(r.level).toBe('ok')
  })
  it('says nothing while the name is still empty', () => {
    expect(findTitleConflicts({ title_th: '   ', category: 'anuchon' }, LIB).level).toBe('ok')
    expect(findTitleConflicts({ title_th: '12. ', category: 'anuchon' }, LIB).level).toBe('ok')
  })
  it('carries the number/title of what it clashed with, so the UI can point at it', () => {
    const r = findTitleConflicts({ title_th: 'พระเยซูทรงรักเด็กๆ', category: 'lem-yai' }, LIB)
    expect(r.blocking[0]).toMatchObject({ id: 'b', number: 12 })
  })
  it('survives junk rows without throwing', () => {
    const r = findTitleConflicts({ title_th: 'x' }, [null, {}, { id: 'z', title_th: null }])
    expect(r.level).toBe('ok')
  })
  it('unfiled songs are compared with each other, not with a filed one', () => {
    const lib = [song({ id: 'u', t: 'เพลงไม่มีเล่ม', b: null }), song({ id: 'f', t: 'เพลงไม่มีเล่ม', b: 'anuchon' })]
    expect(findTitleConflicts({ title_th: 'เพลงไม่มีเล่ม', category: null }, lib).blocking.map((s) => s.id)).toEqual(['u'])
  })
})

// NEGATIVE CONTROL — the real duplicates the library is carrying today (เด็กเล็ก: two
// "พระเยซูทรงรักเด็กๆ", two "พระดำรัสชิมหวานสักปานใด"). With the guard in place, entering
// either of those names into เด็กเล็ก again must come back 'block'. If the comparison core is
// gutted (keys stop normalising), this is the test that goes red.
describe('negative control — the pairs already in the library', () => {
  const dekLek = [
    song({ id: 'd1', t: 'พระเยซูทรงรักเด็กๆ', b: 'dek-lek' }),
    song({ id: 'd2', t: 'พระดำรัสชิมหวานสักปานใด', b: 'dek-lek' }),
  ]
  it('a third copy of either cannot be saved', () => {
    expect(findTitleConflicts({ title_th: 'พระเยซูทรงรักเด็กๆ ', category: 'dek-lek' }, dekLek).level).toBe('block')
    expect(findTitleConflicts({ title_th: 'พระดํารัสชิมหวานสักปานใด', category: 'dek-lek' }, dekLek).level).toBe('block')
  })
})

// ---------- B128 — the EARLY hint (prefix, from 5 typed characters) ----------
// The behaviour P'Aim signed off on: quiet under 5 typed characters, prefix-only matching,
// at most 3 listed, and it never touches the block verdict above.
describe('B128 early hint — "does a song already start like this?"', () => {
  const EARLY = [
    song({ id: 'e1', number: 3, t: 'หากใกล้ชิดพระองค์', b: 'dek-lek' }),
    song({ id: 'e2', number: 4, t: 'หากใกล้ชิดพระองค์ทุกวัน', b: 'dek-lek' }),
    song({ id: 'e3', number: 5, t: 'หากใกล้ชิดพระองค์เสมอไป', b: 'anuchon' }),
    song({ id: 'e4', number: 6, t: 'หากใกล้ชิดพระองค์ยิ่งขึ้น', b: 'anuchon' }),
    song({ id: 'e5', number: 7, t: 'พระองค์ทรงเป็นที่พึ่ง', b: 'anuchon' }),
  ]

  it('is silent at 3 and 4 typed characters', () => {
    for (const typed of ['หาก', 'หากใ']) {
      expect(findEarlyTitleMatches({ title_th: typed, category: 'dek-lek' }, EARLY).level).toBe('ok')
      expect(earlyDupNote({ title_th: typed, category: 'dek-lek' }, EARLY)).toBe(null)
    }
  })

  it('fires at exactly 5 typed characters', () => {
    const r = findEarlyTitleMatches({ title_th: 'หากใก', category: 'dek-lek' }, EARLY)
    expect(r.level).toBe('early')
    expect(r.sameBook.map((s) => s.id)).toEqual(['e1', 'e2'])
    expect(r.otherBook.map((s) => s.id).sort()).toEqual(['e3', 'e4'])
  })

  it('counts TYPED characters, not normalised-key characters', () => {
    // 'หากใกล้' is 7 typed characters but only 5 in the loose key (tone mark dropped). Gating
    // on the key would silently demand more keystrokes than the 5 that were asked for.
    expect([...'หากใกล้'].length).toBe(7)
    expect(titleKeyLoose('หากใกล้').length).toBeLessThan(7)
    expect(findEarlyTitleMatches({ title_th: 'หากใกล้', category: 'dek-lek' }, EARLY).level).toBe('early')
  })

  it('matches on a PREFIX only — a name that merely contains the text does not count', () => {
    // 'พระอง' is inside every หากใกล้ชิด… title but starts only e5.
    const r = findEarlyTitleMatches({ title_th: 'พระอง', category: 'anuchon' }, EARLY)
    expect([...r.sameBook, ...r.otherBook].map((s) => s.id)).toEqual(['e5'])
  })

  it('lists at most 3 and says how many there are in total', () => {
    const note = earlyDupNote({ title_th: 'หากใก', category: 'dek-lek' }, EARLY)
    expect(note.level).toBe('info')
    expect(note.links).toHaveLength(3)
    expect(note.message).toContain('4 เพลง')
    expect(note.message).toContain('แสดง 3 แรก')
  })

  it('puts the same เล่ม first and the closest name first inside each group', () => {
    const note = earlyDupNote({ title_th: 'หากใก', category: 'dek-lek' }, EARLY)
    // เด็กเล็ก (the book being edited) first, shortest — i.e. closest to what was typed — first
    // inside the group. The third slot is whichever of the two other-book songs has the
    // shorter loose key, so assert the RULE rather than a hand-guessed id.
    expect(note.links.slice(0, 2).map((s) => s.id)).toEqual(['e1', 'e2'])
    const others = [EARLY[2], EARLY[3]].sort(
      (a, b) => titleKeyLoose(a.title_th).length - titleKeyLoose(b.title_th).length,
    )
    expect(note.links[2].id).toBe(others[0].id)
  })

  it('does not list the song being edited itself', () => {
    const r = findEarlyTitleMatches({ id: 'e1', title_th: 'หากใกล้ชิดพระองค์', category: 'dek-lek' }, EARLY)
    expect(r.sameBook.map((s) => s.id)).toEqual(['e2'])
  })

  it('stays quiet when nothing in the library starts that way', () => {
    expect(earlyDupNote({ title_th: 'เพลงที่ยังไม่มีใครใส่', category: 'anuchon' }, EARLY)).toBe(null)
  })

  it('survives blank input and junk rows', () => {
    expect(earlyDupNote({ title_th: '        ', category: 'anuchon' }, EARLY)).toBe(null)
    expect(earlyDupNote({ title_th: '12. ', category: 'anuchon' }, EARLY)).toBe(null)
    expect(() => earlyDupNote({ title_th: 'หากใก' }, [null, {}, { id: 'z', title_th: null }])).not.toThrow()
  })

  it('does NOT weaken the block verdict — the full name in the same เล่ม still blocks', () => {
    // The two must be able to coexist: the early hint is only ever read when the verdict is 'ok'.
    expect(findTitleConflicts({ title_th: 'หากใกล้ชิดพระองค์', category: 'dek-lek' }, EARLY).level).toBe('block')
  })
})
