// volta (จบรอบ 1. / 2.) must be settable, clearable, and survive save → reload.
// Probe test written BEFORE touching the UI, to find out what actually works today.
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
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import SongSheet from './SongSheet.vue'
import { songToNotes } from '../lib/midi.js'
import { lintRepeatVolta } from '../lib/notationLint.js'

const SONG = {
  id: 's-volta',
  number: 9,
  title_th: 'เพลงทดสอบจบรอบ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', chord: 'G', note: '5 6 7 1.' }]] }],
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
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const items = (w) => w.vm.previewContent.stanzas[0].lines[0]

describe('volta — insert / clear / persist', () => {
  const voltaBtn = (w) => w.find('button.ed-volta')

  it('the จบรอบ button sits in the header quick-structure row, next to ‖: :‖', async () => {
    const w = mountEd()
    await nextTick()
    const b = voltaBtn(w)
    expect(b.exists()).toBe(true)
    expect(b.element.closest('.ed-quick')).toBeTruthy()
    expect(b.attributes('aria-label')).toContain('จบรอบ')
  })

  it('one tap makes the whole line จบรอบ 1, the next 2, the next clears it', async () => {
    const w = mountEd()
    await nextTick()
    await voltaBtn(w).trigger('click')
    await nextTick()
    // every bar of the line is tagged (so playback skips the WHOLE ending), and the button
    // shows which round it is
    const line = w.vm.previewContent.stanzas[0].lines[0]
    expect(line.filter((it) => it.type === 'volta').map((it) => it.num)).toEqual([1, 1])
    expect(voltaBtn(w).classes()).toContain('on')
    expect(voltaBtn(w).text()).toContain('1')

    await voltaBtn(w).trigger('click')
    await nextTick()
    expect(items(w).filter((it) => it.type === 'volta').map((it) => it.num)).toEqual([2, 2])

    await voltaBtn(w).trigger('click')
    await nextTick()
    expect(items(w).some((it) => it.type === 'volta')).toBe(false)
    expect(voltaBtn(w).classes()).not.toContain('on')
  })

  it('setting จบรอบ on bar 2 writes a volta item into the saved content', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('button[aria-label^="เครื่องมือห้องนี้"]')[1].trigger('click')
    await nextTick()
    const sel = w.find('.ed-bar-menu select')
    expect(sel.exists()).toBe(true)
    await sel.setValue('1')
    await nextTick()
    expect(items(w).some((it) => it.type === 'volta' && it.num === 1)).toBe(true)
  })

  it('clearing it removes the volta item again', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('button[aria-label^="เครื่องมือห้องนี้"]')[1].trigger('click')
    await nextTick()
    const sel = w.find('.ed-bar-menu select')
    await sel.setValue('2')
    await nextTick()
    expect(items(w).some((it) => it.type === 'volta')).toBe(true)
    await sel.setValue('0')
    await nextTick()
    expect(items(w).some((it) => it.type === 'volta')).toBe(false)
  })

  it('the sheet prints the number once per ending, not once per bar', async () => {
    const line = [
      { type: 'volta', num: 1 },
      { type: 'segment', note: '1 2 3 4' },
      { type: 'bar' },
      { type: 'volta', num: 1 },
      { type: 'segment', note: '5 6 7 1.' },
      { type: 'repeat-end' },
      { type: 'volta', num: 2 },
      { type: 'segment', note: '3 3 2 1' },
    ]
    const w = mount(SongSheet, { props: { content: { version: 1, key: 'C', lines: [line] }, mode: 'full' } })
    await nextTick()
    expect(w.findAll('.volta-tag').map((t) => t.text())).toEqual(['1.', '2.'])
  })

  it('playback plays the 1st ending on pass 1 and the 2nd on pass 2', () => {
    const content = {
      version: 1,
      key: 'C',
      timeSignature: '4/4',
      lines: [[
        { type: 'repeat-start' },
        { type: 'segment', note: '1 1 1 1' },
        { type: 'bar' },
        { type: 'volta', num: 1 },
        { type: 'segment', note: '2 2 2 2' },
        { type: 'repeat-end' },
        { type: 'bar' },
        { type: 'volta', num: 2 },
        { type: 'segment', note: '3 3 3 3' },
      ]],
    }
    // degrees in play order: body, 1st ending, body again, 2nd ending
    const degrees = songToNotes(content).map((n) => n.midi)
    const uniqRuns = degrees.filter((m, i) => m !== degrees[i - 1])
    expect(uniqRuns).toEqual([60, 62, 60, 64]) // C, D(จบ1), C, E(จบ2)
  })

  it('a multi-bar ending is not linted as "the same round twice"', () => {
    const marks = [
      { type: 'repeat-start' },
      { type: 'volta', num: 1 },
      { type: 'volta', num: 1 },
      { type: 'repeat-end' },
      { type: 'volta', num: 2 },
      { type: 'volta', num: 2 },
    ]
    expect(lintRepeatVolta(marks)).toEqual([])
  })

  it('round-trip: saved content re-loaded into the editor keeps the volta', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('button[aria-label^="เครื่องมือห้องนี้"]')[1].trigger('click')
    await nextTick()
    await w.find('.ed-bar-menu select').setValue('2')
    await nextTick()
    const saved = JSON.parse(JSON.stringify(w.vm.previewContent))
    const w2 = mountEd({ ...SONG, content: saved })
    await nextTick()
    expect(items(w2).some((it) => it.type === 'volta' && it.num === 2)).toBe(true)
  })
})
