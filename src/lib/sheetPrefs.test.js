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
  it('defaults: ครบ, แยกพยางค์ (nothing changes for someone who never picks)', async () => {
    const st = await storeWith()
    expect(st.sheetDisplay.value).toBe('all')
    expect(st.lyricJoin.value).toBe('split')
  })
  it('a pick is written to this device, and a fresh load (another song, a reopened browser) reads it back', async () => {
    let st = await storeWith()
    st.sheetDisplay.value = 'lyric'
    st.lyricJoin.value = 'join'
    await nextTick()
    expect(localStorage.getItem('pleng.sheetDisplay')).toBe('lyric')
    expect(localStorage.getItem('pleng.lyricJoin')).toBe('join')
    vi.resetModules()
    st = await import('../store.js')
    expect(st.sheetDisplay.value).toBe('lyric')
    expect(st.lyricJoin.value).toBe('join')
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
  it('ใบ#101 — a new reader (nothing stored) gets แยกพยางค์ on both pages', async () => {
    const st = await storeWith()
    expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual(['split', 'split'])
  })
  it('a stale or broken stored value falls back to the default', async () => {
    const st = await storeWith({ 'pleng.sheetDisplay': 'karaoke', 'pleng.lyricJoin': 'yes', 'pleng.sheetLyricJoin': 'yes' })
    expect(st.sheetDisplay.value).toBe('all')
    expect(st.lyricJoin.value).toBe('split')
    expect(st.sheetLyricJoin.value).toBe('split')
  })
})
