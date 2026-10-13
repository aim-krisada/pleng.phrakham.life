// ใบ v3/pleng#114 — the editor (แก้ไข) on a phone: more room to see notes and type.
//   ข้อ 1  the note keypad is tied to the note cells (DockKey `showFor`)
//   ข้อ 2  ฟังท่อน · หยุด · ฟังทั้งเพลง · บันทึกร่าง go icon-only on a phone; the main action keeps its words
//   ข้อ 3  sticky things pin under what is VISIBLE of the site header (0 while it is slid away)
//   ข้อ 4  the pinned ท่อน header is one row on a phone: name · toggle · ▲▼; the rest opens on demand
// jsdom has no layout: sizes are stubbed, the CSS half is checked in the stylesheet itself.
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
import { headerHidden } from '../lib/headerHide.js'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const SONG = {
  id: 's1', number: 5, title_th: 'เพลงทดสอบ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: [] },
      { stanza: 'A', label: 'ร้อง 2', syllables: [] },
    ],
  },
}

const realMM = window.matchMedia
function setWidth(px) {
  window.matchMedia = (q) => {
    const m = /max-width:\s*(\d+)px/.exec(q)
    return { matches: m ? px <= +m[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}
let realRect
beforeEach(() => {
  localStorage.clear()
  headerHidden.value = false
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div><header class="shell-bar"></header>'
  realRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList?.contains('shell-bar')) return { height: 122, width: 375, top: 0, bottom: 122, left: 0, right: 375 }
    if (this.classList?.contains('edhead')) return { height: 94, width: 1160, top: 122, bottom: 216, left: 0, right: 1160 }
    return realRect.call(this)
  }
})
afterEach(() => {
  window.matchMedia = realMM
  Element.prototype.getBoundingClientRect = realRect
  headerHidden.value = false
})

const mountEd = () => mount(EditorMode, {
  props: { song: SONG, tier: 'approver', active: true },
  attachTo: document.body,
  global: { stubs: { Icon: true, 'router-link': true, ExportTool: true, ComboSelect: true } },
})
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }

describe('ข้อ 1–2 — what the editor hands the bar', () => {
  it('the keypad shows for note cells only; ฟังท่อน / ฟังทั้งเพลง / บันทึกร่าง are icon-only on a phone; เผยแพร่ keeps its words', async () => {
    setWidth(375)
    const w = mountEd()
    await flush()
    const dock = w.findComponent({ name: 'DockKey' })
    const byId = Object.fromEntries(dock.props('items').map((i) => [i.id, i]))
    expect(byId.keys.showFor).toBe('input.note-box')
    for (const id of ['play', 'stop', 'playAll', 'draft']) expect(byId[id].phoneIcon).toBe(true)
    expect(byId.save.phoneIcon).toBeFalsy()
    // every one still has its name (aria-label + tooltip on the bar)
    for (const id of ['play', 'playAll', 'draft', 'save']) {
      const b = w.find(`.dk-host [data-cell="${id}"]`)
      expect(b.attributes('aria-label')).toBe(byId[id].name)
      expect(b.attributes('title')).toBe(byId[id].name)
    }
    // all the buttons are still on the bar (none moved into ⚙)
    const onBar = w.findAll('.dk-host .dk-btnrow [data-cell]').map((c) => c.attributes('data-cell'))
    expect(onBar).toEqual(expect.arrayContaining(['undo', 'redo', 'play', 'soundctl', 'save', 'playAll', 'export', 'draft', 'setting']))
    w.unmount()
  })
})

describe('ข้อ 3 — sticky offsets follow the phone header', () => {
  it('phone: the ท่อน header pins right under the header (122px) — and at 0 while it is slid away', async () => {
    setWidth(375)
    const w = mountEd()
    await flush()
    expect(w.find('.cshead').attributes('style')).toContain('top: 122px')
    headerHidden.value = true
    await flush()
    expect(w.find('.cshead').attributes('style')).toContain('top: 0px')
    // ใบ#120: the edit header is not pinned on a phone, so it carries no `top` at all (a `top` on
    // its position: relative pushed it over the ท่อน header and jumped as the site header slid)
    expect(w.find('.edhead').attributes('style') || '').not.toContain('top')
    expect(w.find('#studioRail').attributes('style')).toContain('--rail-top: 0px')
    headerHidden.value = false
    await flush()
    expect(w.find('.cshead').attributes('style')).toContain('top: 122px')
    w.unmount()
  })
  it('712px (between phone and desktop): unchanged — the stylesheet top, no inline offset', async () => {
    setWidth(712)
    const w = mountEd()
    await flush()
    expect(w.find('.cshead').attributes('style') || '').not.toContain('top')
    w.unmount()
  })
  it('desktop: unchanged — under the header AND the sticky edit header', async () => {
    setWidth(1280)
    const w = mountEd()
    await flush()
    expect(w.find('.cshead').attributes('style')).toContain('top: 216px') // 122 + 94
    expect(w.find('.edhead').attributes('style')).toContain('top: 122px')
    w.unmount()
  })
})

describe('ข้อ 4 — the ท่อน header: one row on a phone, the rest behind a toggle', () => {
  it('the toggle says what it opens and whether it is open (aria-expanded · aria-controls)', async () => {
    setWidth(375)
    const w = mountEd()
    await flush()
    const head = w.find('.cshead')
    const t = head.find('.cs-moretgl')
    expect(t.exists()).toBe(true)
    expect(t.attributes('aria-label')).toBe('ตั้งค่าท่อนนี้')
    expect(t.attributes('aria-expanded')).toBe('false')
    expect(t.attributes('aria-controls')).toBe('cs-more')
    const more = head.find('#cs-more')
    expect(more.exists()).toBe(true)
    // what moves behind the toggle: ทำนอง · ผูก/แยกทำนอง · จังหวะ · คีย์ · ร้องรับทุกข้อ
    expect(more.find('.cs-mel').exists()).toBe(true)
    expect(more.find('.cs-mel-acts').exists()).toBe(true)
    expect(more.findAll('.cs-key')).toHaveLength(2)
    expect(more.find('.cs-refrain').exists()).toBe(true)
    // what stays in the row: the name and ▲▼ (same buttons, same labels as before)
    expect(more.find('.cs-name').exists()).toBe(false)
    expect(more.find('.updown').exists()).toBe(false)
    expect(head.find('.cs-name').exists()).toBe(true)
    expect(head.find('button[aria-label="ย้ายท่อนขึ้น"]').exists()).toBe(true)
    expect(head.find('button[aria-label="ย้ายท่อนลง"]').exists()).toBe(true)
    await t.trigger('click')
    expect(t.attributes('aria-expanded')).toBe('true')
    expect(head.classes()).toContain('cs-open')
    await t.trigger('click')
    expect(t.attributes('aria-expanded')).toBe('false')
    expect(head.classes()).not.toContain('cs-open')
    w.unmount()
  })
  it('▲▼ still move the ท่อน (their handler is untouched)', async () => {
    setWidth(375)
    const w = mountEd()
    await flush()
    expect(w.find('.cshead .cs-name').text()).toBe('ร้อง 1')
    await w.find('.cshead button[aria-label="ย้ายท่อนลง"]').trigger('click')
    await flush()
    expect(w.find('.cshead .cs-name').text()).toBe('ร้อง 1')
    expect(w.find('.cshead .cs-num').text()).toBe('2')
    w.unmount()
  })
  it('stylesheet: from 600px up the settings sit in the row as before; below 600px they hide until opened', () => {
    const css = fs.readFileSync(path.resolve(__dirname, 'EditorMode.vue'), 'utf8').replace(/\r\n/g, '\n').split('<style scoped>')[1]
    // wide screens: the wrapper is transparent to the layout and the toggle is not shown
    expect(css).toMatch(/\n\.cs-moretgl \{ display: none; \}\n\.cs-more \{ display: contents; \}/)
    const i = css.indexOf('ใบ v3/pleng#114 — phone')
    const block = css.slice(i, css.indexOf('</style>', i) > 0 ? css.indexOf('</style>', i) : undefined)
    expect(block).toMatch(/@media \(max-width: 599px\) \{/)
    expect(block).toMatch(/\.cshead:not\(\.cs-open\) \.cs-more,\n\s+\.cshead:not\(\.cs-open\) \.cs-del \{ display: none; \}/)
    expect(block).toMatch(/\.cs-moretgl \{\n\s+display: inline-flex;[^}]*min-width: var\(--touch-min\); min-height: var\(--touch-min\)/)
    expect(block).toMatch(/prefers-reduced-motion: reduce/)
  })
})
