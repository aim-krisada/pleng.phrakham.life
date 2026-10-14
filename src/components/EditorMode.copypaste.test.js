// B101 — คัดลอก→วาง a whole บรรทัด / ห้อง anywhere, including into a NEW ท่อน. This is the
// "ย้ายไปที่อื่น" twin of B098's ทำซ้ำ-in-place: คัดลอก loads one in-memory slot, วาง places a
// deep copy wherever you are. วางเป็นท่อนใหม่ is MELODY-ONLY (a new melody has no ข้อ yet), so that
// test asserts the arrangement syllables are UNCHANGED. A ห้อง or บรรทัด paste keeps every word
// under its note (ใบ v3/pleng#121 · #122: same melody → the copied words, other melody → empty
// slots) — see EditorMode.bartools121.test.js and EditorMode.notetools122.test.js.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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

// one melody A · two lines (3 + 2 attack notes) · one verse with distinct words
const SONG = {
  id: 's-cp',
  number: 3,
  title_th: 'ลองคัดลอก',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      {
        id: 'A',
        lines: [
          [{ type: 'segment', chord: 'C', note: '1 2 3' }],
          [{ type: 'segment', chord: 'F', note: '4 5' }],
        ],
      },
    ],
    arrangement: [{ stanza: 'A', label: 'ร้อง', syllables: ['a', 'b', 'c', 'd', 'e'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  window.confirm = () => true
})

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const contentOf = (w) => w.emitted('change').at(-1)[0].content
// notes of a serialized line (drop bar/marker items, keep segment order)
const lineNotes = (line) => line.filter((it) => it.type === 'segment').map((it) => it.note)
const byAria = (w, substr) => w.findAll('button').filter((b) => (b.attributes('aria-label') || '').includes(substr))

async function copyActiveLine(w) {
  await w.find('button[aria-label="เพิ่มเติม"]').trigger('click') // open the line ⋯ menu
  await nextTick()
  await byAria(w, 'คัดลอกบรรทัดนี้ไปวางที่ท่อนอื่น')[0].trigger('click')
  await nextTick()
}
async function copyBar(w, k = 0) {
  await w.findAll('button[aria-label^="เครื่องมือห้องนี้"]')[k].trigger('click') // open that bar's ⋯
  await nextTick()
  await byAria(w, 'คัดลอกห้องนี้ไปวางที่ท่อนหรือบรรทัดอื่น')[k].trigger('click')
  await nextTick()
}

describe('B101 — คัดลอก→วาง บรรทัด / ห้อง (ข้ามท่อนได้ · โน้ตเท่านั้น)', () => {
  it('no clipboard → no วาง buttons and no tray', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.find('.ed-clip').exists()).toBe(false)
    expect(w.findAll('.ed-paste').length).toBe(0)
  })

  it('คัดลอกบรรทัด → วางเป็นท่อนใหม่: new stanza holds the copied melody, words do NOT follow', async () => {
    const w = mountEd()
    await nextTick()
    await copyActiveLine(w) // active line defaults to 0 → "1 2 3"
    expect(w.find('.ed-clip').exists()).toBe(true) // tray shows what is held
    await w.find('.ed-clip-new').trigger('click') // วางเป็นท่อนใหม่
    await nextTick()

    const c = contentOf(w)
    expect(c.stanzas.length).toBe(2) // a brand-new ท่อน appeared
    expect(lineNotes(c.stanzas[1].lines[0])).toEqual(['1 2 3']) // the copied line's melody
    expect(c.stanzas[0].lines.length).toBe(2) // original ท่อน untouched
    // melody-only: the verse still has exactly its 5 syllables (no lyric was carried over)
    expect(c.arrangement.length).toBe(1)
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('คัดลอกบรรทัด → วางบรรทัด: appended to the active ท่อน, its words come along (ใบ#122)', async () => {
    const w = mountEd()
    await nextTick()
    await copyActiveLine(w)
    await w.find('.ed-addline.ed-paste').trigger('click') // วางบรรทัด (this ท่อน)
    await nextTick()

    const c = contentOf(w)
    expect(c.stanzas[0].lines.map((l) => lineNotes(l)[0])).toEqual(['1 2 3', '4 5', '1 2 3'])
    // same melody → the pasted บรรทัด brings its words (ใบ#122); the words before stay put
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'd', 'e', 'a', 'b', 'c'])
  })

  it('คัดลอกห้อง → วางห้อง: the copied ห้อง lands at the end of the chosen บรรทัด', async () => {
    const w = mountEd()
    await nextTick()
    await copyBar(w, 0) // ห้องแรก of บรรทัด 1 = "1 2 3"
    // paste into line 1 (index 1) — the second line's own "วางห้อง"
    const pasteBtns = w.findAll('button[aria-label="วางห้องที่นี่"]')
    expect(pasteBtns.length).toBe(2) // one per บรรทัด
    await pasteBtns[1].trigger('click')
    await nextTick()

    const c = contentOf(w)
    expect(lineNotes(c.stanzas[0].lines[1])).toEqual(['4 5', '1 2 3']) // ห้อง pasted after 4 5
    expect(lineNotes(c.stanzas[0].lines[0])).toEqual(['1 2 3']) // source line unchanged
  })

  it('ยกเลิก clears the clipboard (tray + วาง buttons disappear)', async () => {
    const w = mountEd()
    await nextTick()
    await copyActiveLine(w)
    expect(w.find('.ed-clip').exists()).toBe(true)
    await w.find('.ed-clip-x').trigger('click')
    await nextTick()
    expect(w.find('.ed-clip').exists()).toBe(false)
    expect(w.findAll('.ed-paste').length).toBe(0)
  })
})
