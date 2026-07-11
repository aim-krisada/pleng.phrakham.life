// B093 — publishing runs notationLint on the melody: a song with note problems still
// publishes (never blocked), but gets a ⚠️ warning + a lint flag in review_flags; a clean
// song publishes silently with no lint flag. Existing (non-lint) flags are preserved.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// shared holder so the test can read the row written to `songs`
const H = vi.hoisted(() => ({ captured: null }))

vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'delete', 'limit']) q[m] = () => q
    q.update = (row) => {
      if (table === 'songs') H.captured = row
      return q
    }
    q.insert = (row) => {
      if (table === 'songs') H.captured = row
      return q
    }
    q.single = () => Promise.resolve({ data: { id: 'new-1' }, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (t) => makeQuery(t),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

// 4/4. A bar of "1 2 3 4" = 4 beats (complete); "1 2" = 2 beats (incomplete → lint 'beats').
function song({ note, flags } = {}) {
  return {
    id: 'song-1',
    number: 5,
    title_th: 'เพลงทดสอบ',
    title_en: '',
    review_flags: flags ?? [],
    content: {
      version: 2,
      key: 'C',
      timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note }]] }],
      arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
    },
  }
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  H.captured = null
})

function mountEd(s) {
  return mount(EditorMode, {
    props: { song: s, tier: 'approver', active: true },
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

describe('B093 — lint on publish (warn + flag, never block)', () => {
  it('an incomplete-beat song still publishes, with a ⚠️ warning and a lint flag', async () => {
    const w = mountEd(song({ note: '1 2' })) // 2 of 4 beats
    await nextTick()
    const ok = await w.vm.saveDirect()
    await nextTick()
    expect(ok).toBe(true) // NOT blocked — publish went through
    expect(H.captured).toBeTruthy()
    expect(H.captured.review_flags).toContain('lint:beats')
    expect(w.vm.saveMsg).toMatch(/^⚠️ เผยแพร่แล้ว/)
    expect(w.vm.saveMsg).toContain('พบปัญหาโน้ต')
  })

  it('a clean song publishes silently with no lint flag', async () => {
    const w = mountEd(song({ note: '1 2 3 4' })) // full 4/4 bar
    await nextTick()
    const ok = await w.vm.saveDirect()
    await nextTick()
    expect(ok).toBe(true)
    expect(H.captured.review_flags).toEqual([]) // no lint flag
    expect(w.vm.saveMsg).toBe('✅ เผยแพร่แล้ว')
  })

  it('existing non-lint flags (DA) are kept; lint flags are added alongside', async () => {
    const w = mountEd(song({ note: '1 2', flags: ['repeat:R8'] }))
    await nextTick()
    await w.vm.saveDirect()
    await nextTick()
    expect(H.captured.review_flags).toContain('repeat:R8') // DA flag preserved
    expect(H.captured.review_flags).toContain('lint:beats')
  })

  it('re-publishing a fixed song drops the old lint flag (kept flags stay)', async () => {
    // load a song that already carries a stale lint flag + a DA flag, but whose notes are now clean
    const w = mountEd(song({ note: '1 2 3 4', flags: ['repeat:R8', 'lint:beats'] }))
    await nextTick()
    await w.vm.saveDirect()
    await nextTick()
    expect(H.captured.review_flags).toEqual(['repeat:R8']) // stale lint:beats gone, DA flag kept
  })
})
