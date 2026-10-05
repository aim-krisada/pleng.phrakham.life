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
  it('ใบ#101 — แผ่นเพลง has its own remembered แยก/ติด, separate from ฝึกร้อง; a ฝึกร้อง pick from ใบ#100 is kept', async () => {
    let st = await storeWith({ 'pleng.lyricJoin': 'join' }) // someone who already chose on ฝึกร้อง
    expect(st.lyricJoin.value).toBe('join')
    expect(st.sheetLyricJoin.value).toBe('split') // แผ่นเพลง starts at its own default
    st.sheetLyricJoin.value = 'join'
    st.lyricJoin.value = 'split'
    await nextTick()
    expect(localStorage.getItem('pleng.sheetLyricJoin')).toBe('join')
    expect(localStorage.getItem('pleng.lyricJoin')).toBe('split')
    vi.resetModules()
    st = await import('../store.js')
    expect([st.lyricJoin.value, st.sheetLyricJoin.value]).toEqual(['split', 'join'])
  })
  it('a stale or broken stored value falls back to the default', async () => {
    const st = await storeWith({ 'pleng.sheetDisplay': 'karaoke', 'pleng.lyricJoin': 'yes' })
    expect(st.sheetDisplay.value).toBe('all')
    expect(st.lyricJoin.value).toBe('split')
  })
})
