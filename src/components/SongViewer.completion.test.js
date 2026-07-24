// BI-007 completion flow (spec docs/ds/edit-completion-flow.md) on the inline editor: ONE primary
// finish button that does the best thing the tier allows (never a disabled dead-button), the
// you-are-here stepper fed by a role×status model, a post-submit card, and the anon "ส่งให้ทีม"
// route. Drives the REAL SongViewer.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})),
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: () => {},
  setTranspose: () => {},
  keyTranspose: () => 0,
  songToNotes: () => [],
  buildPlayNotes: () => [],
  effectiveOrder: () => undefined,
  TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
}))
const downloadSpy = vi.hoisted(() => vi.fn())
vi.mock('../lib/jsonIO.js', () => ({ downloadSong: downloadSpy, importSong: vi.fn() }))

window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'

const song = {
  number: 1,
  title_th: 'ทดสอบ',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1', chord: 'C' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['ก'] }],
  },
}
const mountViewer = (props = {}) => mount(SongViewer, { props: { song, tier: 'editor', ...props } })
async function enterEdit(w) { await w.find('.sv-fab').trigger('click'); await nextTick() }
const finish = (w) => w.find('.sv-finish-btn')
const stepper = (w) => w.findComponent({ name: 'CompletionStatus' })

beforeEach(() => downloadSpy.mockClear())

describe('BI-007 — the primary finish button, adaptive by role + state', () => {
  it('is ALWAYS present + enabled while editing, at every tier (never stuck, never a dead button)', async () => {
    for (const tier of ['anon', 'editor', 'approver']) {
      const w = mountViewer({ tier, saveState: 'clean' })
      await enterEdit(w)
      expect(finish(w).exists()).toBe(true)
      expect(finish(w).attributes('disabled')).toBeUndefined()
    }
  })

  it('approver → "เผยแพร่" emits save publish', async () => {
    const w = mountViewer({ tier: 'approver', saveState: 'dirty' })
    await enterEdit(w)
    expect(finish(w).text()).toContain('เผยแพร่')
    await finish(w).trigger('click')
    expect(w.emitted('save').at(-1)).toEqual(['publish'])
  })

  it('editor (draft) → "ส่งตรวจ" emits save pending AND shows the post-submit card', async () => {
    const w = mountViewer({ tier: 'editor', saveState: 'dirty', draftStatus: 'draft' })
    await enterEdit(w)
    expect(finish(w).text()).toContain('ส่งตรวจ')
    await finish(w).trigger('click')
    expect(w.emitted('save').at(-1)).toEqual(['pending'])
    await w.setProps({ draftStatus: 'pending' })
    expect(w.find('.sv-flow-card').exists()).toBe(true)
    expect(w.find('.sv-flow-card').text()).toContain('ส่งตรวจแล้ว')
  })

  it('editor viewing a รอตรวจ draft → "ถอนกลับมาแก้" emits withdraw (not another submit)', async () => {
    const w = mountViewer({ tier: 'editor', draftStatus: 'pending' })
    await enterEdit(w)
    expect(finish(w).text()).toContain('ถอนกลับมาแก้')
    await finish(w).trigger('click')
    expect(w.emitted('withdraw')).toBeTruthy()
    expect(w.emitted('save')).toBeFalsy()
  })

  it('anon → "ส่งให้ทีม" opens the download+email flow (enabled route, not a disabled publish)', async () => {
    const w = mountViewer({ tier: 'anon', saveState: 'dirty' })
    await enterEdit(w)
    expect(finish(w).text()).toContain('ส่งให้ทีม')
    await finish(w).trigger('click')
    const card = w.find('.sv-flow-anon')
    expect(card.exists()).toBe(true)
    await card.find('.sv-flow-act').trigger('click')
    expect(downloadSpy).toHaveBeenCalled()
    expect(w.emitted('save').at(-1)).toEqual(['file'])
    expect(card.find('a.sv-flow-act').attributes('href')).toMatch(/^mailto:pleng(@|%40)phrakham\.life/)
  })
})

describe('BI-007 — the you-are-here stepper (role×status model)', () => {
  it('editor lane = 5 steps; the current node tracks draftStatus', async () => {
    const w = mountViewer({ tier: 'editor', draftStatus: 'pending' })
    await enterEdit(w)
    expect(stepper(w).props('steps')).toEqual(['แก้ไข', 'เก็บร่าง', 'ส่งตรวจ', 'รออนุมัติ', 'เผยแพร่แล้ว'])
    expect(stepper(w).props('current')).toBe(3) // รออนุมัติ
    expect(stepper(w).props('tone')).toBe('pending')
  })

  it('approver lane = 2 steps (แก้ไข → เผยแพร่แล้ว); no review step they skip', async () => {
    const w = mountViewer({ tier: 'approver' })
    await enterEdit(w)
    expect(stepper(w).props('steps')).toEqual(['แก้ไข', 'เผยแพร่แล้ว'])
  })

  it('anon lane = the ส่งให้ทีม path (5 steps), tone anon', async () => {
    const w = mountViewer({ tier: 'anon' })
    await enterEdit(w)
    expect(stepper(w).props('tone')).toBe('anon')
    expect(stepper(w).props('steps')).toContain('ส่งให้ทีม')
  })

  it('rejected → the model carries the reviewer comment through to the stepper', async () => {
    const w = mountViewer({ tier: 'editor', draftStatus: 'rejected', reviewComment: 'คีย์ยังผิด' })
    await enterEdit(w)
    expect(stepper(w).props('tone')).toBe('rejected')
    expect(stepper(w).props('rejectComment')).toBe('คีย์ยังผิด')
  })

  it('เสร็จ is still exit-only — it never publishes/submits (distinct from finish)', async () => {
    const w = mountViewer({ tier: 'approver', saveState: 'clean' })
    await enterEdit(w)
    await w.find('.sv-done-btn').trigger('click')
    expect(w.emitted('save')).toBeFalsy()
    expect(w.find('.sv-save-bar').exists()).toBe(false)
  })
})
