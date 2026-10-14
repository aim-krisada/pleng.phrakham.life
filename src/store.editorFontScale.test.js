// @vitest-environment jsdom
// ใบ v3/pleng#119 — the แก้ไข page remembers its OWN text size (ใบ#101 "แต่ละหน้าจำค่าของตัวเอง").
// The first time it has no value of its own it starts from ฝึกร้อง's size (what the editor followed until
// now, so nothing changes the day this ships) and writes it down at once; from then on the two live apart.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

// no real Supabase client here: its auth would read the (deliberately broken) storage in the
// background and fail the run for a reason that has nothing to do with the text size
vi.mock('./supabase.js', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

async function storeWith(seed = {}) {
  localStorage.clear()
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
  vi.resetModules()
  return import('./store.js')
}
const reload = async () => { vi.resetModules(); return import('./store.js') }

describe('ใบ#119 — editorFontScale: seeded once from ฝึกร้อง, then its own, survives a reload', () => {
  beforeEach(() => { localStorage.clear() })

  it('a new reader (nothing stored) starts at 100% on both pages', async () => {
    const st = await storeWith()
    expect(st.readingFontScale.value).toBe(1)
    expect(st.editorFontScale.value).toBe(1)
    expect(localStorage.getItem('pleng.editorFontScale')).toBe('1')
  })

  it('the day this ships: no editor value yet → it starts from the ฝึกร้อง size and writes it down at once', async () => {
    for (const v of ['0.8', '1.4', '2.2']) {
      const st = await storeWith({ 'pleng.readingFontScale': v })
      expect(st.editorFontScale.value).toBe(+v)
      expect(localStorage.getItem('pleng.editorFontScale')).toBe(v)
      expect(localStorage.getItem('pleng.readingFontScale')).toBe(v) // ฝึกร้อง's key untouched
    }
  })

  it('after that first start the two live apart — in both directions, and after a reload', async () => {
    let st = await storeWith({ 'pleng.readingFontScale': '1.4' })
    expect(st.editorFontScale.value).toBe(1.4)
    st.setFontScale(1.8) // pick on ฝึกร้อง
    await nextTick()
    expect(st.editorFontScale.value).toBe(1.4)
    st.setEditorFontScale(2) // pick on แก้ไข
    await nextTick()
    expect(st.readingFontScale.value).toBe(1.8)
    expect(localStorage.getItem('pleng.editorFontScale')).toBe('2')
    expect(localStorage.getItem('pleng.readingFontScale')).toBe('1.8')
    st = await reload()
    expect([st.readingFontScale.value, st.editorFontScale.value]).toEqual([1.8, 2])
  })

  it('a later ฝึกร้อง pick never reaches an editor that already has its own value, even after a reload', async () => {
    let st = await storeWith({ 'pleng.readingFontScale': '1.2' })
    expect(st.editorFontScale.value).toBe(1.2)
    st.setFontScale(2.2)
    await nextTick()
    st = await reload()
    expect([st.readingFontScale.value, st.editorFontScale.value]).toEqual([2.2, 1.2])
  })

  it('setEditorFontScale clamps to 80%–220% in 10% steps, like ฝึกร้อง', async () => {
    const st = await storeWith()
    st.setEditorFontScale(5)
    expect(st.editorFontScale.value).toBe(2.2)
    st.setEditorFontScale(0.1)
    expect(st.editorFontScale.value).toBe(0.8)
    st.setEditorFontScale(1.234)
    expect(st.editorFontScale.value).toBe(1.2)
  })

  it('a broken or out-of-range stored value falls back to the ฝึกร้อง size', async () => {
    for (const bad of ['huge', '9', '0.1', '']) {
      const st = await storeWith({ 'pleng.readingFontScale': '1.5', 'pleng.editorFontScale': bad })
      expect(st.editorFontScale.value).toBe(1.5)
    }
  })

  it('blocked storage (private mode) never breaks the page — it just starts at the ฝึกร้อง size', async () => {
    localStorage.clear()
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      vi.resetModules()
      const st = await import('./store.js')
      expect(st.editorFontScale.value).toBe(1)
      st.setEditorFontScale(1.6)
      await nextTick() // the watcher's write throws inside its try/catch
      expect(st.editorFontScale.value).toBe(1.6)
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
  })
})
