// B109 — keyboard navigation in the editor (พี่เปา: hop across bars/lines from the keyboard) +
// Enter=confirm chord / Esc=cancel. Scheme: Ctrl+←/→ = bar, Ctrl+↑/↓ = line, Home/End = bar edge,
// Tab = next note/syllable. Every nav key preventDefaults (no page scroll → no hide-on-scroll flicker).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return { supabase: { from: () => makeQuery(), auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }
})

import EditorMode from './EditorMode.vue'

// 2 lines × 2 bars × 1 note each: notes 1,2 (line 0) and 3,4 (line 1)
const SONG = {
  id: 's-kbd', number: 9, title_th: 'ทดสอบคีย์', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [
      [{ type: 'segment', chord: '', note: '1' }, { type: 'bar' }, { type: 'segment', chord: '', note: '2' }],
      [{ type: 'segment', chord: '', note: '3' }, { type: 'bar' }, { type: 'segment', chord: '', note: '4' }],
    ] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true } },
  })
}
const barOf = () => document.activeElement?.closest('[data-bar]')?.getAttribute('data-bar')
const noteInBar = (w, key) => w.find(`[data-bar="${key}"] .note-box`).element
async function key(opts) {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...opts })
  window.dispatchEvent(e)
  await nextTick()
  return e
}

describe('B109 — bar / line keyboard navigation', () => {
  it('Ctrl+→ / Ctrl+← hop to the next / previous bar (and preventDefault)', async () => {
    const w = mountEd()
    await nextTick()
    noteInBar(w, '0-0').focus()
    expect(barOf()).toBe('0-0')
    const e1 = await key({ key: 'ArrowRight', ctrlKey: true })
    expect(barOf()).toBe('0-1') // next bar
    expect(e1.defaultPrevented).toBe(true) // no native scroll
    await key({ key: 'ArrowLeft', ctrlKey: true })
    expect(barOf()).toBe('0-0') // back
  })

  it('Ctrl+→ at the last bar of a line wraps to the first bar of the next line', async () => {
    const w = mountEd()
    await nextTick()
    noteInBar(w, '0-1').focus() // last bar of line 0
    await key({ key: 'ArrowRight', ctrlKey: true })
    expect(barOf()).toBe('1-0') // first bar of line 1
  })

  it('Ctrl+↓ / Ctrl+↑ hop to the next / previous line (first bar)', async () => {
    const w = mountEd()
    await nextTick()
    noteInBar(w, '0-1').focus()
    await key({ key: 'ArrowDown', ctrlKey: true })
    expect(barOf()).toBe('1-0') // next line, first bar
    await key({ key: 'ArrowUp', ctrlKey: true })
    expect(barOf()).toBe('0-0') // prev line, first bar
  })

  it('does not move past the last line / first bar (bounds)', async () => {
    const w = mountEd()
    await nextTick()
    noteInBar(w, '0-0').focus()
    await key({ key: 'ArrowUp', ctrlKey: true }) // already at line 0
    expect(barOf()).toBe('0-0')
    noteInBar(w, '1-1').focus()
    await key({ key: 'ArrowRight', ctrlKey: true }) // already at the very last bar
    expect(barOf()).toBe('1-1')
  })

  it('Ctrl+Home / Ctrl+End jump to song start / end; PLAIN Home/End is left to native caret', async () => {
    const w = mountEd()
    await nextTick()
    noteInBar(w, '1-0').focus()
    // Ctrl+Home → first note of the whole song (0-0), preventDefault
    const eCH = await key({ key: 'Home', ctrlKey: true })
    expect(barOf()).toBe('0-0')
    expect(eCH.defaultPrevented).toBe(true)
    // plain Home is NOT intercepted (world-class: caret home/end stays native · P'Aim/UX call)
    const ePlain = await key({ key: 'Home' })
    expect(ePlain.defaultPrevented).toBe(false)
    // a Ctrl+Arrow with focus OUTSIDE the editor is ignored
    document.getElementById('shell-title').setAttribute('tabindex', '-1')
    document.getElementById('shell-title').focus()
    const eOut = await key({ key: 'ArrowRight', ctrlKey: true })
    expect(eOut.defaultPrevented).toBe(false)
  })

  it('a jump carries the contextual toolbox to the new note automatically (focus → onSegFocus)', async () => {
    const w = mountEd()
    await nextTick()
    noteInBar(w, '0-0').focus() // focusin → onSegFocus → focusedSeg = "0-0-0" → toolbox renders
    await nextTick()
    let tb = w.find('.slot-tools')
    expect(tb.exists()).toBe(true)
    expect(tb.element.closest('[data-bar]')?.getAttribute('data-bar')).toBe('0-0')
    await key({ key: 'ArrowRight', ctrlKey: true }) // jumpBar → focusBar → .focus() on 0-1's note
    await nextTick()
    tb = w.find('.slot-tools')
    expect(tb.exists()).toBe(true)
    // the ONE toolbox now lives in the jumped-to seg-col — UX gets anchor-follow for free (no need
    // to set selSlot/focusedSeg manually: jump focuses a real element, which fires the handlers)
    expect(tb.element.closest('[data-bar]')?.getAttribute('data-bar')).toBe('0-1')
  })
})

describe('B109 — Enter=confirm chord (allow-custom) + Esc=cancel', () => {
  it('the chord picker opts into allow-custom so Enter confirms the typed value', async () => {
    const w = mountEd()
    await nextTick()
    // open the chord picker on the first note (target the CHORD ComboSelect via .chord-pick —
    // the editor has other ComboSelects, so findComponent by name alone would grab the wrong one)
    await w.find('.chord-btn').trigger('click')
    await nextTick()
    const combo = w.findComponent('.chord-pick')
    expect(combo.exists()).toBe(true)
    expect(combo.props('allowCustom')).toBe(true)
  })

  it('Esc on the chord-cell closes the picker (editingChord cleared) — not emitted into ComboSelect', async () => {
    const w = mountEd()
    await nextTick()
    await w.find('.chord-btn').trigger('click')
    await nextTick()
    expect(w.find('.chord-pick').exists()).toBe(true)
    await w.find('.chord-cell').trigger('keydown.esc')
    await nextTick()
    expect(w.find('.chord-pick').exists()).toBe(false) // picker closed
  })
})
