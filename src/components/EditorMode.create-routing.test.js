// BI-017 — the legacy full editor's "⚙ ตั้งค่าเพลง" card carries a "สร้างเพลงใหม่" button
// (the one in P'Aim's screenshot). It used to reset the old grid IN PLACE (fileNew → resetForm),
// keeping the author on the legacy surface. Now it must route to the app's ONE create flow: it
// emits 'new-song', and the shell (Studio.createNewSong) opens the inline editor with a blank
// song. This asserts the EMITTER half (the Studio receiver is covered in Studio.mode.test.js).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => {
      const q = {}
      for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
      q.single = () => Promise.resolve({ data: null, error: null })
      q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
      return q
    },
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  },
}))

import EditorMode from './EditorMode.vue'
import { session, legacy } from '../store.js'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'editor-1', email: 'e@x.com' } }
  legacy.value = false
  localStorage.clear()
})

describe('BI-017 — legacy editor สร้างเพลงใหม่ routes to the single create flow', () => {
  it('the "สร้างเพลงใหม่" button emits new-song (does not stay in the old grid)', async () => {
    const w = mount(EditorMode, {
      props: { song: null, tier: 'editor', active: true },
      global: { stubs: { Icon: true } },
    })
    // the button lives in the always-visible ⚙ ตั้งค่าเพลง card header, beside "เลือกเพลง"
    const createBtn = w.findAll('.ed-song-act').find((b) => /สร้างเพลงใหม่/.test(b.text()))
    expect(createBtn, 'the ตั้งค่าเพลง card should render a "สร้างเพลงใหม่" button').toBeTruthy()

    await createBtn.trigger('click')
    expect(w.emitted('new-song')).toBeTruthy()
    expect(w.emitted('new-song').length).toBe(1)
  })
})
