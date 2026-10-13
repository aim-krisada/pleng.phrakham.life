// ใบ v3/pleng#119 — พี่เอม: "น่าจะมีการปรับขนาด fonts ได้ เหมือนหน้าร้อง". The แก้ไข bar gets the SAME Aa
// button + popover as ฝึกร้อง (FontScaleControl), driving the editor's OWN remembered size. It grows the
// notes / chords / words (edit cells + previews) and never the keypad, the bar or the tools.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('../lib/midi.js', () => ({ playSong: vi.fn(), playEnsemble: vi.fn(), stopPlayback: () => {} }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
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
import { editorFontScale, readingFontScale } from '../store.js'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const SONG = {
  id: 's1', number: 5, title_th: 'เพลงทดสอบ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', chord: 'G', note: '5 - 3 -' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['พระ', 'เจ้า', 'ทรง', 'รัก', 'โลก', 'นี้'] }],
  },
}

const realMM = window.matchMedia
function setWidth(px) {
  window.matchMedia = (q) => {
    const m = /max-width:\s*(\d+)px/.exec(q)
    return { matches: m ? px <= +m[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}
beforeEach(() => {
  localStorage.clear()
  editorFontScale.value = 1
  readingFontScale.value = 1
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})
afterEach(() => { window.matchMedia = realMM })

const mountEd = () => mount(EditorMode, {
  props: { song: SONG, tier: 'approver', active: true },
  attachTo: document.body,
  global: { stubs: { Icon: true, 'router-link': true, ExportTool: true, ComboSelect: true } },
})
const canvas = (w) => w.find('.content.ed-read-scale')

describe('ใบ#119 — Aa on the แก้ไข bar', () => {
  for (const [label, px] of [['phone 360', 360], ['phone 375', 375], ['phone 412', 412], ['Fold 712', 712], ['desktop 1280', 1280]]) {
    it(`${label}: the bar carries the same Aa button as ฝึกร้อง, closed until tapped`, async () => {
      setWidth(px)
      const w = mountEd()
      await nextTick()
      const cell = w.find('.dk-host [data-cell="scale"]')
      expect(cell.exists()).toBe(true)
      const btn = cell.find('button.st-aa')
      expect(btn.attributes('aria-label')).toBe('ขนาดตัวอักษร')
      expect(btn.attributes('aria-expanded')).toBe('false')
      expect(btn.text()).toBe('Aa')
      expect(w.find('.st-fontpop').exists()).toBe(false)
      w.unmount()
    })
  }

  it('sits at the end of the first group, like ฝึกร้อง (right after เสียงดนตรี, before the second row)', async () => {
    const w = mountEd()
    await nextTick()
    const ids = w.findAll('.dk-host .dk-btnrow > [data-cell]').map((c) => c.attributes('data-cell'))
    expect(ids.indexOf('scale')).toBe(ids.indexOf('soundctl') + 1)
    expect(ids.indexOf('scale')).toBeLessThan(ids.indexOf('save'))
    w.unmount()
  })

  it('the popover sets the EDITOR size only (ฝึกร้อง keeps its own) and the canvas follows', async () => {
    readingFontScale.value = 1.3
    const w = mountEd()
    await nextTick()
    await w.find('[data-cell="scale"] .st-aa').trigger('click')
    const slider = w.find('.st-fontpop .st-fontslider')
    expect(slider.exists()).toBe(true)
    slider.element.value = '200'
    await slider.trigger('input')
    expect(editorFontScale.value).toBe(2)
    expect(readingFontScale.value).toBe(1.3)
    expect(w.find('.st-fontval').text()).toContain('200%')
    const style = canvas(w).attributes('style') || ''
    expect(style).toMatch(/font-size:\s*2rem/)
    expect(style).toMatch(/--ed-fs:\s*2/)
    await w.find('.st-fontreset').trigger('click')
    expect(editorFontScale.value).toBe(1)
    w.unmount()
  })

  it('Esc closes the popover', async () => {
    const w = mountEd()
    await nextTick()
    await w.find('[data-cell="scale"] .st-aa').trigger('click')
    expect(w.find('.st-fontpop').exists()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(w.find('.st-fontpop').exists()).toBe(false)
    w.unmount()
  })

  it('the whole-song preview window follows the editor size (fewer ems per line = bigger text)', async () => {
    const w = mountEd()
    await nextTick()
    const btn = w.findAll('button').find((b) => b.text().includes('ดูผลทั้งเพลง'))
    await btn.trigger('click')
    const em = () => {
      const m = /calc\(100cqw\s*\/\s*([\d.]+)\)|calc\(([\d.]+)cqw\)/.exec(w.find('.ed-float-page').attributes('style') || '')
      return m[1] ? +m[1] : 100 / +m[2]
    }
    const at100 = em()
    editorFontScale.value = 2
    await nextTick()
    expect(em()).toBeCloseTo(at100 / 2, 1)
    w.unmount()
  })
})

describe('ใบ#119 — what grows and what does not', () => {
  it('the note, chord and word cells sit INSIDE the scaled canvas; the keypad and the bar sit outside it', async () => {
    const w = mountEd()
    await nextTick()
    const c = canvas(w).element
    expect(c.contains(w.find('input.note-box').element)).toBe(true)
    expect(c.contains(w.find('.chord-btn').element)).toBe(true)
    expect(c.contains(w.find('input.syl-box').element)).toBe(true)
    expect(c.contains(w.find('.dk-host').element)).toBe(false)
    expect(c.contains(w.find('.dk-keys').element)).toBe(false)
    w.unmount()
  })

  it('every note is one column: its chord above, its word below — so a wrapped row keeps them lined up', async () => {
    const w = mountEd()
    await nextTick()
    const cols = w.findAll('.seg-col .note-col:not(.note-col-add)')
    expect(cols.length).toBe(8)
    for (const col of cols) {
      expect(col.find('.chord-cell').exists()).toBe(true)
      expect(col.findAll('input.note-box').length).toBe(1)
      expect(col.find('.syl-box, .syl-spacer').exists()).toBe(true)
    }
    // the words still read in order under their notes
    expect(w.findAll('input.syl-box').map((i) => i.element.value).slice(0, 4)).toEqual(['พระ', 'เจ้า', 'ทรง', 'รัก'])
    // and the note keys still step box → box (the word / chord fields in the column are skipped)
    const notes = w.findAll('.seg-col')[0].findAll('input.note-box')
    notes[0].element.focus()
    notes[0].element.setSelectionRange(1, 1)
    await notes[0].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(notes[1].element)
    w.unmount()
  })

  // jsdom computes no CSS, so read the sizes from the source: the cells are sized in px × --ed-fs
  // (all three with the SAME 46px width, so they line up at every size), while the keypad, the
  // bar buttons and the Aa button itself never read --ed-fs.
  it('cells are sized × --ed-fs; keypad / bar / Aa are not', () => {
    const read = (f) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
    const nb = read('NoteBoxes.vue'), ed = read('EditorMode.vue'), dk = read('DockKey.vue'), aa = read('FontScaleControl.vue')
    expect(nb).toMatch(/\.note-box \{[^}]*width: calc\(46px \* var\(--ed-fs, 1\)\)[^}]*font-size: calc\(15px \* var\(--ed-fs, 1\)\)/)
    expect(ed).toMatch(/\.syl-box \{[^}]*width: calc\(46px \* var\(--ed-fs, 1\)\)[^}]*font-size: calc\(0\.95rem \* var\(--ed-fs, 1\)\)/)
    expect(ed).toMatch(/\.chord-cell \{[^}]*width: calc\(46px \* var\(--ed-fs, 1\)\)/)
    expect(ed).toMatch(/\.chord-btn \{[^}]*font-size: calc\(var\(--fs-base\) \* var\(--ed-fs, 1\)\)/)
    expect(ed).toMatch(/\.syl-spacer \{[^}]*width: calc\(46px \* var\(--ed-fs, 1\)\)/)
    expect(dk).not.toMatch(/--ed-fs/)
    expect(aa).not.toMatch(/--ed-fs/)
  })
})
