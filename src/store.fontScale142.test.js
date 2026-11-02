// @vitest-environment jsdom
// ใบ v3/pleng#142 — ONE text size for the whole site (พี่เอม 2 พ.ย. 2569). The แก้ไข page's own size
// (ใบ#119) is retired: its stored key is cleared once, and the ฝึกร้อง value — the page a song opens
// on — is the one that stays for every page.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

// no real Supabase client here: its auth would read storage in the background and fail the run
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

describe('ใบ#142 — one text size, remembered on this device', () => {
  beforeEach(() => { localStorage.clear() })

  it('a new reader starts at 100%', async () => {
    const st = await storeWith()
    expect(st.readingFontScale.value).toBe(1)
  })

  it('the separate แก้ไข size is gone: no export, and its old key is cleared on load', async () => {
    const st = await storeWith({ 'pleng.readingFontScale': '1.4', 'pleng.editorFontScale': '2' })
    expect(st.editorFontScale).toBeUndefined()
    expect(st.setEditorFontScale).toBeUndefined()
    expect(localStorage.getItem('pleng.editorFontScale')).toBeNull()
    expect(st.readingFontScale.value).toBe(1.4) // the ฝึกร้อง value is the one that stays
  })

  it('a pick is written down and survives a reload', async () => {
    let st = await storeWith()
    st.bumpFontScale(0.1)
    st.bumpFontScale(0.1)
    await nextTick()
    expect(localStorage.getItem('pleng.readingFontScale')).toBe('1.2')
    vi.resetModules()
    st = await import('./store.js')
    expect(st.readingFontScale.value).toBe(1.2)
  })

  it('steps stay in 10% steps between 80% and 220%', async () => {
    const st = await storeWith({ 'pleng.readingFontScale': '2.1' })
    st.bumpFontScale(0.1)
    st.bumpFontScale(0.1)
    expect(st.readingFontScale.value).toBe(2.2)
    st.setFontScale(0.1)
    expect(st.readingFontScale.value).toBe(0.8)
    st.bumpFontScale(-0.1)
    expect(st.readingFontScale.value).toBe(0.8)
  })

  it('blocked storage (private mode) never breaks the page', async () => {
    localStorage.clear()
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const rm = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      vi.resetModules()
      const st = await import('./store.js')
      expect(st.readingFontScale.value).toBe(1)
      st.bumpFontScale(0.1)
      await nextTick()
      expect(st.readingFontScale.value).toBe(1.1)
    } finally {
      get.mockRestore(); set.mockRestore(); rm.mockRestore()
    }
  })
})
