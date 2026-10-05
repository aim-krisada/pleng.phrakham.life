// ใบ v3/pleng#101 — แผ่นเพลง gets the same "แยกพยางค์ / ติดกันเป็นวรรค" choice as ฝึกร้อง (ใบ#100). The menu shows only
// while the sheet has lyrics-only lines to write that way (สมุดเพลง, or แสดงผล = เนื้อล้วน); the pick reaches
// SongSheet and is remembered for แผ่นเพลง alone (store.sheetLyricJoin) — พี่เอม 5 ต.ค. 2569: each page keeps its own.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }), useRouter: () => ({ push() {} }) }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return { supabase: { from: () => makeQuery(), auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }
})

import Studio from './Studio.vue'
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'
import { lyricJoin, sheetLyricJoin } from '../store.js'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle', 'songbook', 'lyricJoin', 'showLyric', 'showNote', 'showChord', 'mode'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  Icon: true,
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  lyricJoin.value = 'split'
  sheetLyricJoin.value = 'split'
})

async function openSheet() {
  const w = mount(Studio, { global: { stubs }, attachTo: document.body })
  await nextTick()
  w.findComponent(EditorMode).vm.$emit('change', { id: null, number: null, title_th: 'x', title_en: '', content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] } })
  await nextTick()
  document.querySelectorAll('#shell-menus .sb-mode-btn')[1].click()
  await nextTick()
  return w
}
const gear = (w) => w.find('.sheet-workspace ~ * .dk-gear, .dk-gear')
async function settingRows(w) {
  if (!w.find('.dk-panel').exists()) { await gear(w).trigger('click'); await nextTick() }
  return w.findAll('.dk-panel [data-setting]').map((r) => r.attributes('data-setting'))
}

describe('ใบ#101 — แผ่นเพลง: แยกพยางค์ / ติดกันเป็นวรรค', () => {
  it('สมุดเพลง (the default): the เนื้อร้อง menu is there, and picking ติดกันเป็นวรรค reaches the sheet', async () => {
    const w = await openSheet()
    expect(w.findComponent(SongSheet).props('songbook')).toBe(true)
    expect(w.findComponent(SongSheet).props('lyricJoin')).toBe(false)
    expect(await settingRows(w)).toContain('lyricjoin')
    const sel = w.find('.dk-panel [data-setting="lyricjoin"] select')
    await sel.setValue('join')
    await nextTick()
    expect(w.findComponent(SongSheet).props('lyricJoin')).toBe(true)
    expect(sheetLyricJoin.value).toBe('join') // remembered for แผ่นเพลง
    expect(lyricJoin.value).toBe('split') // ฝึกร้อง's own choice is untouched
  })
  it('แบบเต็ม with notes shown: no lyrics-only lines → no เนื้อร้อง menu', async () => {
    const w = await openSheet()
    await settingRows(w)
    await w.find('.dk-panel [data-setting="book"] select').setValue('full')
    await nextTick()
    expect(w.findAll('.dk-panel [data-setting]').map((r) => r.attributes('data-setting'))).not.toContain('lyricjoin')
  })
  it('a choice made on ฝึกร้อง does NOT change แผ่นเพลง (each page keeps its own)', async () => {
    lyricJoin.value = 'join'
    const w = await openSheet()
    expect(w.findComponent(SongSheet).props('lyricJoin')).toBe(false)
  })
  it('แผ่นเพลง opens with its own remembered choice', async () => {
    sheetLyricJoin.value = 'join'
    const w = await openSheet()
    expect(w.findComponent(SongSheet).props('lyricJoin')).toBe(true)
  })
})
