// A-fix (23 ก.ค.) — โหมดแก้ inline must always SAY whether the work is kept, and offer the
// save path that fits the tier. Before this it had one button ("เสร็จ") and no save at all,
// so a reload lost everything silently (Tester: docs/reports/editor-gap-audit.md).
// Editing itself stays open to every tier — only STORING is gated (mission 3-tier model).
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
vi.mock('../lib/jsonIO.js', () => ({ downloadSong: downloadSpy }))

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
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['ก', 'ข'] }],
  },
}
const mountViewer = (props = {}) => mount(SongViewer, { props: { song, tier: 'editor', ...props } })
// enter โหมดแก้ via the ✏️ FAB, exactly as a user does
async function enterEdit(w) {
  await w.find('.sv-fab').trigger('click')
  await nextTick()
}

beforeEach(() => downloadSpy.mockClear())

describe('SongViewer — inline save state', () => {
  it('shows no save bar while reading, and one the moment ✏️ is on', async () => {
    const w = mountViewer()
    expect(w.find('.sv-save-bar').exists()).toBe(false)
    await enterEdit(w)
    expect(w.find('.sv-save-bar').exists()).toBe(true)
  })

  it('states ยังไม่บันทึก / บันทึกแล้ว from the shell-owned state', async () => {
    const w = mountViewer({ saveState: 'dirty' })
    await enterEdit(w)
    expect(w.find('.sv-save-state').text()).toContain('ยังไม่บันทึก')
    expect(w.find('.sv-save-state').classes()).toContain('pending')
    await w.setProps({ saveState: 'saved' })
    expect(w.find('.sv-save-state').text()).toContain('บันทึกแล้ว')
    expect(w.find('.sv-save-state').classes()).toContain('ok')
    await w.setProps({ saveState: 'saving' })
    expect(w.find('.sv-save-state').text()).toContain('กำลังบันทึก')
    expect(w.find('.sv-save-btn').attributes('disabled')).toBeDefined()
  })

  it('a failed save is reported, not swallowed', async () => {
    const w = mountViewer({ saveState: 'error', saveError: 'network down' })
    await enterEdit(w)
    expect(w.find('.sv-save-state').text()).toContain('บันทึกไม่สำเร็จ')
    expect(w.find('.sv-save-err').text()).toBe('network down')
  })

  it('logged in → บันทึกร่าง asks the shell to save', async () => {
    const w = mountViewer({ tier: 'editor', saveState: 'dirty' })
    await enterEdit(w)
    expect(w.find('.sv-save-btn').text()).toContain('บันทึกร่าง')
    await w.find('.sv-save-btn').trigger('click')
    expect(w.emitted('save')).toBeTruthy()
    expect(downloadSpy).not.toHaveBeenCalled()
  })

  it('anon → may still EDIT; their save is the JSON file (gate is on storing only)', async () => {
    const w = mountViewer({ tier: 'anon', saveState: 'dirty' })
    expect(w.find('.sv-fab').exists()).toBe(true) // ✏️ open to every tier
    await enterEdit(w)
    expect(w.find('.sv-save-btn').text()).toContain('บันทึกเป็นไฟล์')
    expect(w.find('.sv-save-note').text()).toContain('เข้าสู่ระบบ')
    await w.find('.sv-save-btn').trigger('click')
    expect(downloadSpy).toHaveBeenCalled()
    expect(w.emitted('save')[0]).toEqual(['file'])
  })

  it('leaving แก้ with unsaved work warns first, and stays put if refused', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const w = mountViewer({ saveState: 'dirty' })
    await enterEdit(w)
    await w.find('.sv-fab').trigger('click') // press เสร็จ
    expect(confirm).toHaveBeenCalled()
    expect(w.find('.sv-save-bar').exists()).toBe(true) // refused → still editing
    confirm.mockReturnValue(true)
    await w.find('.sv-fab').trigger('click')
    expect(w.find('.sv-save-bar').exists()).toBe(false)
    confirm.mockRestore()
  })

  it('nothing to lose → เสร็จ leaves without a prompt', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const w = mountViewer({ saveState: 'clean' })
    await enterEdit(w)
    await w.find('.sv-fab').trigger('click')
    expect(confirm).not.toHaveBeenCalled()
    expect(w.find('.sv-save-bar').exists()).toBe(false)
    confirm.mockRestore()
  })
})
