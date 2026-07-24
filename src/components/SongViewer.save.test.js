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
    expect(w.find('.sv-save-btn').text()).toContain('ดาวน์โหลด JSON')
    expect(w.find('.sv-save-note').text()).toContain('เข้าสู่ระบบ')
    await w.find('.sv-save-btn').trigger('click')
    expect(downloadSpy).toHaveBeenCalled()
    expect(w.emitted('save')[0]).toEqual(['file'])
  })

  // เสร็จ moved off the floating ✓ FAB and into the editor's own header row beside the save
  // state (24 ก.ค.): a fixed round button is one more thing sitting on top of the sheet, and it
  // collided with the tool dock once the dock stopped floating. The ✏️ FAB is now the way IN only.
  it('เสร็จ lives in the editor header; the ✏️ FAB is only the way in', async () => {
    const w = mountViewer({ saveState: 'clean' })
    expect(w.find('.sv-fab').exists()).toBe(true)
    await enterEdit(w)
    expect(w.find('.sv-done-btn').exists()).toBe(true)
    expect(w.find('.sv-fab').exists()).toBe(false) // nothing floats over the sheet while editing
  })

  // What decides whether leaving asks: can the work still be got back? (G cross-check 24 ก.ค.,
  // Apple HIG Alerts / NN/g on confirmation dialogs — a modal you answer "yes" to twenty times a
  // day protects nothing.) The shell mirrors every keystroke into localStorage, so the normal
  // answer is "yes, recoverable" and leaving is a non-event that the shell announces in flow.
  it('unsaved but recoverable → leaves without a dialog, and tells the shell', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const w = mountViewer({ saveState: 'dirty', recoverable: true })
    await enterEdit(w)
    await w.find('.sv-done-btn').trigger('click')
    expect(confirm).not.toHaveBeenCalled()
    expect(w.find('.sv-save-bar').exists()).toBe(false)
    expect(w.emitted('left-dirty')).toBeTruthy() // the shell shows "work is safe · back to editing"
    confirm.mockRestore()
  })

  it('unsaved AND unrecoverable (storage blocked) → asks, and stays put if refused', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const w = mountViewer({ saveState: 'dirty', recoverable: false })
    await enterEdit(w)
    await w.find('.sv-done-btn').trigger('click') // press เสร็จ
    expect(confirm).toHaveBeenCalled()
    expect(w.find('.sv-save-bar').exists()).toBe(true) // refused → still editing
    confirm.mockReturnValue(true)
    await w.find('.sv-done-btn').trigger('click')
    expect(w.find('.sv-save-bar').exists()).toBe(false)
    confirm.mockRestore()
  })

  it('nothing to lose → เสร็จ leaves without a prompt or a banner', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const w = mountViewer({ saveState: 'clean' })
    await enterEdit(w)
    await w.find('.sv-done-btn').trigger('click')
    expect(confirm).not.toHaveBeenCalled()
    expect(w.find('.sv-save-bar').exists()).toBe(false)
    expect(w.emitted('left-dirty')).toBeFalsy()
    confirm.mockRestore()
  })

  // The shell's mode tabs are the other way out of the editor, and they were the hole: ฝึกร้อง
  // did nothing at all (the editor lives inside ฝึกร้อง), and the other two walked out without a
  // word even with unsaved work on screen. Both now go through this ONE gate.
  it('requestExitEdit is the single gate the shell tabs can use', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const w = mountViewer({ saveState: 'dirty', recoverable: false })
    await enterEdit(w)
    expect(w.emitted('update:editing').at(-1)).toEqual([true]) // the shell is told
    expect(w.vm.requestExitEdit()).toBe(false) // refused → the tab must not switch
    await nextTick()
    expect(w.find('.sv-save-bar').exists()).toBe(true)
    confirm.mockReturnValue(true)
    expect(w.vm.requestExitEdit()).toBe(true)
    await nextTick()
    expect(w.find('.sv-save-bar').exists()).toBe(false)
    expect(w.emitted('update:editing').at(-1)).toEqual([false])
    confirm.mockRestore()
  })
})
