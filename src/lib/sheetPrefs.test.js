// @vitest-environment jsdom
// ใบ v3/pleng#100 เสร็จเมื่อ 3 — พี่เอม: "มันไม่จำ เปิดเพลงใหม่ต้อง set ทุกครั้ง". The แสดงผล choice and the เนื้อล้วน
// writing (แยก/ติด) are remembered on this device (localStorage), no login; a stale value falls back.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

async function storeWith(seed = {}) {
  localStorage.clear()
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
  vi.resetModules()
  return import('../store.js')
}

describe('ใบ#100 — the sheet display + lyric writing are remembered', () => {
  beforeEach(() => { localStorage.clear() })
  it('defaults: ครบ, ติดกันเป็นวรรคตามทำนอง (ใบ#161 — was แยกพยางค์)', async () => {
    const st = await storeWith()
    expect(st.sheetDisplay.value).toBe('all')
    expect(st.lyricJoin.value).toBe('join')
  })
  it('a pick is written to this device, and a fresh load (another song, a reopened browser) reads it back', async () => {
    let st = await storeWith()
    st.sheetDisplay.value = 'lyric'
    st.lyricJoin.value = 'split' // ใบ#161 — join is the default now, so pick a different one
    await nextTick()
    expect(localStorage.getItem('pleng.sheetDisplay')).toBe('lyric')
    expect(localStorage.getItem('pleng.lyricJoin')).toBe('split')
    vi.resetModules()
    st = await import('../store.js')
    expect(st.sheetDisplay.value).toBe('lyric')
    expect(st.lyricJoin.value).toBe('split')
  })
  it('ใบ#101 — แผ่นเพลง has its own remembered value; picking on one page never changes the other, both survive a reload', async () => {
    let st = await storeWith({ 'pleng.lyricJoin': 'join', 'pleng.sheetLyricJoin': 'split' })
    expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual(['join', 'split'])
    st.sheetLyricJoin.value = 'book' // pick on แผ่นเพลง
    await nextTick()
    expect(st.lyricJoin.value).toBe('join')
    expect(localStorage.getItem('pleng.lyricJoin')).toBe('join')
    expect(localStorage.getItem('pleng.sheetLyricJoin')).toBe('book')
    st.lyricJoin.value = 'split' // pick on ฝึกร้อง
    await nextTick()
    expect(st.sheetLyricJoin.value).toBe('book')
    expect(localStorage.getItem('pleng.sheetLyricJoin')).toBe('book')
    expect(localStorage.getItem('pleng.lyricJoin')).toBe('split')
    vi.resetModules()
    st = await import('../store.js')
    expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual(['split', 'book'])
  })
  it('ใบ#101 — accepts every way of writing (split · join · book) for แผ่นเพลง', async () => {
    for (const v of ['split', 'join', 'book']) {
      const st = await storeWith({ 'pleng.lyricJoin': 'split', 'pleng.sheetLyricJoin': v })
      expect(st.sheetLyricJoin.value).toBe(v)
    }
  })
  it("ใบ#101 — the day this ships: a sheet with no value of its own starts from the ฝึกร้อง value (no reader's sheet changes)", async () => {
    for (const v of ['split', 'join', 'book']) {
      const st = await storeWith({ 'pleng.lyricJoin': v })
      expect(st.sheetLyricJoin.value).toBe(v)
      expect(localStorage.getItem('pleng.sheetLyricJoin')).toBe(v) // written down at once
      expect(localStorage.getItem('pleng.lyricJoin')).toBe(v) // ฝึกร้อง's key is kept as it was
    }
  })
  it('ใบ#101 — after that first start the two live apart: a later ฝึกร้อง pick does not reach the sheet, even after a reload', async () => {
    let st = await storeWith({ 'pleng.lyricJoin': 'join' })
    expect(st.sheetLyricJoin.value).toBe('join')
    st.lyricJoin.value = 'book'
    await nextTick()
    vi.resetModules()
    st = await import('../store.js')
    expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual(['book', 'join'])
  })
  it('ใบ#161 — a new reader (nothing stored) gets ติดกันเป็นวรรคตามทำนอง on both pages', async () => {
    const st = await storeWith()
    expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual(['join', 'join'])
    expect(localStorage.getItem('pleng.lyricJoin')).toBe(null) // ฝึกร้อง writes only on a pick
  })
  it('a stale or broken stored value falls back to the default', async () => {
    const st = await storeWith({ 'pleng.sheetDisplay': 'karaoke', 'pleng.lyricJoin': 'yes', 'pleng.sheetLyricJoin': 'yes' })
    expect(st.sheetDisplay.value).toBe('all')
    expect(st.lyricJoin.value).toBe('join')
    expect(st.sheetLyricJoin.value).toBe('join')
  })
})

describe('ใบ#161 — เนื้อล้วน starts as ติดกันเป็นวรรคตามทำนอง; real picks are kept', () => {
  beforeEach(() => { localStorage.clear() })
  it('a real ฝึกร้อง pick (split · join · book) is kept on both pages', async () => {
    for (const v of ['split', 'join', 'book']) {
      let st = await storeWith({ 'pleng.lyricJoin': v, 'pleng.sheetLyricJoin': v })
      expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual([v, v])
      st = await storeWith({ 'pleng.lyricJoin': v }) // sheet unset → starts from the ฝึกร้อง pick
      expect(st.sheetLyricJoin.value).toBe(v)
    }
  })
  it('a sheet "join" or "book" with no ฝึกร้อง key is kept (only the old seed value split is moved)', async () => {
    for (const v of ['join', 'book']) {
      const st = await storeWith({ 'pleng.sheetLyricJoin': v })
      expect(st.sheetLyricJoin.value).toBe(v)
    }
  })
  it('the old seed — sheet "split" with no ฝึกร้อง key — becomes join, is written, and the flag is set', async () => {
    const st = await storeWith({ 'pleng.sheetLyricJoin': 'split' })
    expect(st.sheetLyricJoin.value).toBe('join')
    expect(localStorage.getItem('pleng.sheetLyricJoin')).toBe('join')
    expect(localStorage.getItem('pleng.lyricJoinDefaultV2')).toBe('1')
    expect(localStorage.getItem('pleng.lyricJoin')).toBe(null)
  })
  it('the move runs once: a later real pick of split on แผ่นเพลง stays split after a reload', async () => {
    let st = await storeWith({ 'pleng.sheetLyricJoin': 'split' })
    expect(st.sheetLyricJoin.value).toBe('join')
    st.sheetLyricJoin.value = 'split' // the reader picks แยกพยางค์ on แผ่นเพลง
    await nextTick()
    vi.resetModules()
    st = await import('../store.js')
    expect(st.sheetLyricJoin.value).toBe('split')
    expect(st.lyricJoin.value).toBe('join')
  })
  it('flag already set: a stored sheet split with no ฝึกร้อง key stays split', async () => {
    const st = await storeWith({ 'pleng.sheetLyricJoin': 'split', 'pleng.lyricJoinDefaultV2': '1' })
    expect(st.sheetLyricJoin.value).toBe('split')
  })
  it('a new reader gets the flag too, so a later split pick is never moved', async () => {
    const st = await storeWith()
    expect(st.sheetLyricJoin.value).toBe('join')
    expect(localStorage.getItem('pleng.lyricJoinDefaultV2')).toBe('1')
  })
  it('an unknown stored value → join (both pages)', async () => {
    const st = await storeWith({ 'pleng.lyricJoin': 'weird', 'pleng.sheetLyricJoin': 'weird', 'pleng.lyricJoinDefaultV2': '1' })
    expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual(['join', 'join'])
  })
})
