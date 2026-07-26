// MIGRATION TOLERANCE (v1) — does the LIVE v1 site survive a lyric set that carries a
// permanent `id`?  The `?set=<id>` feature lives on the /v2 line only; v1 has no share
// code at all, so the ONLY thing that matters here is that the extra field is inert:
// it must not change what v1 renders, and — critically — v1's editor must not SILENTLY
// EAT it on save, because that would break every link already handed out.
//
// Fixture = the real #717 row read off live 2026-07-26 (backup
// C:/gl/pm-inbox/pleng/backup/717-ids-before-20260726-2145.json) with the two ids the
// migration would add.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import live from './__fixtures__/717-live.json'
import withIds from './__fixtures__/717-withids.json'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})
const mountEd = (song) =>
  mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, DockKey: true, ComboSelect: true } },
  })

describe('v1 editor vs. migrated lyric-set ids', () => {
  it('the extra id changes NOTHING the editor renders or saves, apart from the id itself', () => {
    const a = mountEd(live).vm.previewContent
    const b = mountEd(withIds).vm.previewContent
    const strip = (c) => JSON.stringify({ ...c, lyricSets: c.lyricSets.map(({ id, ...r }) => r) })
    expect(strip(b)).toBe(strip(a))
  })

  it('saving from the v1 editor KEEPS the permanent ids (a dropped id breaks live links)', () => {
    const pc = mountEd(withIds).vm.previewContent
    expect(pc.lyricSets.map((s) => s.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
  })
})
