// MIGRATION TOLERANCE (/v2 line) — the full editor (⋮ → ตัวแก้แบบเต็ม) must not eat the
// permanent lyric-set ids on save. This editor does not model lyric sets at all; it relies
// on `contentExtras` (unknown top-level keys captured on load, spread back on save), so the
// whole `lyricSets` array — ids included — should ride through untouched.
//
// Fixture = the real #717 row read off live 2026-07-26, before/after the migration's two ids.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import live from './__fixtures__/717-live.json'
import withIds from './__fixtures__/717-withids.json'

vi.mock('../supabase.js', () => {
  const q = {}
  for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
  q.single = () => Promise.resolve({ data: null, error: null })
  q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
  return {
    supabase: {
      from: () => q,
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { session } from '../store.js'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'ed-1', email: 'e@x.com' } }
  localStorage.clear()
})
const mountWith = (song) =>
  mount(EditorMode, { props: { song, tier: 'approver', active: true }, global: { stubs: { Icon: true } } })

describe('/v2 full editor vs. migrated lyric-set ids', () => {
  it('opening #717 and saving untouched keeps the ids (and changes nothing else new)', async () => {
    const w = mountWith(withIds)
    await nextTick()
    expect(w.vm.previewContent.lyricSets).toEqual(withIds.content.lyricSets)
    expect(w.vm.previewContent.lyricSets.map((s) => s.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
    // The editor DOES stamp one thing on this song: mintMarkerIds gives the *** marker an id.
    // That is pre-existing behaviour on the un-migrated row too, so pin it exactly rather than
    // asserting a blanket byte-for-byte equality that would hide a future new mutation.
    const norm = (c) => {
      const d = JSON.parse(JSON.stringify(c))
      delete d.stanzas[1].lines[0][0].id
      return d
    }
    expect(norm(w.vm.previewContent)).toEqual(withIds.content)
    expect(w.vm.previewContent.stanzas[1].lines[0][0].id).toBe('m1')
  })

  it('the ids are the ONLY difference the editor sees vs. the un-migrated row', async () => {
    const a = mountWith(live)
    await nextTick()
    const b = mountWith(withIds)
    await nextTick()
    const strip = (c) => JSON.stringify({ ...c, lyricSets: c.lyricSets.map(({ id, ...r }) => r) })
    expect(strip(b.vm.previewContent)).toBe(strip(a.vm.previewContent))
  })
})
