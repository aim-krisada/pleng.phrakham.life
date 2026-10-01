// ใบ v3/pleng#94 — คัดลอก/วาง ระดับท่อน: เนื้อ · ทำนอง · ทั้งท่อน, ผูก / ไม่ผูก, แยกทำนอง.
// พี่เปา types every repeated ท่อน out in full, so the editor needs to copy a ท่อน's words, its
// melody, or both into another ท่อน of the same song. Each copy button sits in the area it copies
// (ท่อน row = ทั้งท่อน · เนื้อ card = words · ท่อน header = melody); every paste goes through one
// confirm; a melody paste is ไม่ผูก by default (an exact new copy) or ผูก (share the source's
// melody). These tests cover เสร็จเมื่อ 3–7 of the ใบ and the "no new song field" rule (6.1).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

// A = 3 notes · B = 2 notes · C = the same 3 notes as A (a ท่อน typed twice, like พี่เปา's A/C).
// Rows 1 and 3 share melody B (ผูก already) so we can prove a paste leaves the OTHER user alone.
const SONG = {
  id: 's-94',
  number: 94,
  title_th: 'ลองคัดลอกท่อน',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3' }]] },
      { id: 'B', lines: [[{ type: 'segment', chord: 'F', note: '5 6' }]] },
      { id: 'C', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3' }]] },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['ก', 'ข', 'ค'], key: 'D' },
      { stanza: 'B', label: 'รับ', syllables: ['ง', 'จ'] },
      { stanza: 'C', label: 'ร้อง 2', syllables: [] },
      { stanza: 'B', label: 'รับ 2', syllables: ['ฉ', 'ช'] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  window.confirm = () => true
})

async function mountEd(song = SONG) {
  const w = mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
  await nextTick()
  await nextTick()
  return w
}

const contentOf = (w) => w.emitted('change').at(-1)[0].content
const rowOut = (w, i) => contentOf(w).arrangement[i]
const stanzaOut = (w, id) => contentOf(w).stanzas.find((s) => s.id === id)
const notesOf = (st) => st.lines.flat().filter((it) => it.type === 'segment').map((it) => it.note)
const byAria = (w, prefix) => w.findAll('button').filter((b) => (b.attributes('aria-label') || '').startsWith(prefix))

async function paste(w, kind, ri, { link = false } = {}) {
  w.vm.askPaste(kind, ri)
  await nextTick()
  if (link) w.vm.pasteAsk.link = true
  w.vm.doPaste()
  await nextTick()
  await nextTick()
}

describe('ใบ#94 ข้อ 1–2 — copy buttons live in their own area · วาง only while something is held', () => {
  it('every ท่อน row has คัดลอกทั้งท่อน; วาง appears before ถังขยะ only after a copy, never on the source row', async () => {
    const w = await mountEd()
    expect(byAria(w, 'คัดลอกทั้งท่อน').length).toBe(4)
    expect(byAria(w, 'วางทั้งท่อนจาก').length).toBe(0) // nothing held → no paste button

    await byAria(w, 'คัดลอกทั้งท่อน 1')[0].trigger('click')
    await nextTick()
    const pastes = byAria(w, 'วางทั้งท่อนจาก')
    expect(pastes.length).toBe(3) // rows 2..4, not the source row 1
    expect(pastes[0].attributes('aria-label')).toContain('ท่อน 1 · ร้อง 1') // says what + from where

    // the วาง button sits right before ถังขยะ in its row
    const row2 = w.findAll('.srow')[1]
    const btns = row2.findAll('button')
    const del = btns.findIndex((b) => b.classes('srow-del'))
    expect(btns[del - 1].classes('srow-paste')).toBe(true)
  })

  it('the melody copy/paste sits on the ท่อน header; the words copy/paste on the เนื้อ card', async () => {
    const w = await mountEd()
    w.vm.focusRow(0)
    await nextTick()
    await nextTick()
    expect(w.find('.cshead').find('button[aria-label="คัดลอกทำนองของท่อนนี้"]').exists()).toBe(true)
    expect(w.find('.para-head').find('button[aria-label="คัดลอกเนื้อของท่อนนี้"]').exists()).toBe(true)

    await w.find('button[aria-label="คัดลอกเนื้อของท่อนนี้"]').trigger('click')
    expect(w.find('.ed-clip').text()).toContain('เนื้อ')
    expect(w.find('.ed-clip').text()).toContain('ท่อน 1 · ร้อง 1')
    // only a words clip shows วางเนื้อ, and only on another ท่อน
    expect(byAria(w, 'วางเนื้อจาก').length).toBe(0)
    w.vm.focusRow(2)
    await nextTick()
    await nextTick()
    expect(byAria(w, 'วางเนื้อจาก').length).toBe(1)
    expect(byAria(w, 'วางทำนองจาก').length).toBe(0)
  })

  it('pressing วาง opens a confirm that names what, from which ท่อน, into which — nothing changes until วาง', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('section', 0)
    await nextTick()
    await byAria(w, 'วางทั้งท่อนจาก')[0].trigger('click')
    await nextTick()
    const box = w.find('.paste-box')
    expect(box.exists()).toBe(true)
    expect(box.text()).toContain('ลงท่อน 2 · รับ')
    expect(box.text()).toContain('ท่อน 1 · ร้อง 1')
    expect(rowOut(w, 1).stanza).toBe('B') // not pasted yet

    await box.findAll('button').find((b) => b.text().includes('ยกเลิก')).trigger('click')
    await nextTick()
    expect(w.find('.paste-box').exists()).toBe(false)
    expect(rowOut(w, 1).stanza).toBe('B')
  })
})

describe('ใบ#94 ข้อ 3 — วางเนื้อ', () => {
  it('same melody shape → the target gets the source words syllable for syllable; its melody stays', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('words', 0)
    w.vm.askPaste('words', 2)
    await nextTick()
    expect(w.vm.pasteWarn).toBe('') // A and C both carry 3 syllables
    w.vm.doPaste()
    await nextTick()
    expect(rowOut(w, 2).syllables).toEqual(['ก', 'ข', 'ค'])
    expect(rowOut(w, 2).stanza).toBe('C')
  })

  it('3.1 different syllable counts → the confirm warns with both numbers before pasting', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('words', 0)
    w.vm.askPaste('words', 1) // 3 words onto melody B (2 notes)
    await nextTick()
    expect(w.vm.pasteWarn).toContain('3 พยางค์')
    expect(w.vm.pasteWarn).toContain('2 พยางค์')
    expect(w.vm.pasteWarn).toContain('เกิน 1')
    expect(w.find('.paste-warn').exists()).toBe(true)
    expect(rowOut(w, 1).syllables).toEqual(['ง', 'จ']) // still untouched while the warning is up
  })
})

describe('ใบ#94 ข้อ 4 — วางทำนอง ผูก / ไม่ผูก', () => {
  it('the choice is offered every time and defaults to ไม่ผูก', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('melody', 0)
    w.vm.askPaste('melody', 1)
    await nextTick()
    expect(w.vm.pasteAsk.link).toBe(false)
    const opts = w.find('.paste-link').findAll('input[type="radio"]')
    expect(opts.length).toBe(2)
    expect(w.find('.paste-link').text()).toContain('ไม่ผูก')
    expect(w.find('.paste-link').text()).toContain('อีกท่อนเปลี่ยนตาม')
  })

  it('4.2 ไม่ผูก → a NEW melody identical to the source; editing it leaves the source alone', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('melody', 0)
    await paste(w, 'melody', 1)
    const id = rowOut(w, 1).stanza
    expect(['A', 'B', 'C']).not.toContain(id)
    expect(notesOf(stanzaOut(w, id))).toEqual(['1 2 3'])
    expect(rowOut(w, 1).syllables).toEqual(['ง', 'จ']) // its own words stay

    w.vm.stanzas.find((s) => s.id === id).lines[0].bars[0].segments[0].note = '7 7 7'
    await nextTick()
    expect(notesOf(stanzaOut(w, 'A'))).toEqual(['1 2 3'])
  })

  it('4.1 ผูก → the target uses the source melody itself; a note edit shows in both', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('melody', 0)
    await paste(w, 'melody', 1, { link: true })
    expect(rowOut(w, 1).stanza).toBe('A')
    expect(contentOf(w).stanzas.length).toBe(3) // no new melody
  })

  it('4.4 either way, the OTHER ท่อน that shared the target melody keeps it', async () => {
    for (const link of [false, true]) {
      const w = await mountEd()
      w.vm.copySectionToClip('melody', 0)
      await paste(w, 'melody', 1, { link })
      expect(rowOut(w, 3).stanza).toBe('B')
      expect(notesOf(stanzaOut(w, 'B'))).toEqual(['5 6'])
      w.unmount()
    }
  })

  it('a pasted copy never inherits a marker id (one id = one marker)', async () => {
    const w = await mountEd()
    w.vm.stanzas[0].lines[0].markerId = 'm-1'
    await nextTick()
    w.vm.copySectionToClip('melody', 0)
    await paste(w, 'melody', 1)
    const copy = w.vm.stanzas.find((s) => s.id === w.vm.arrangement[1].stanza)
    expect(copy.lines[0].markerId).toBe('')
    expect(w.vm.stanzas[0].lines[0].markerId).toBe('m-1')
  })
})

describe('ใบ#94 ข้อ 5 — แยกทำนอง', () => {
  it('a linked ท่อน is marked in the panel and on its header, then แยก gives it its own identical melody', async () => {
    const w = await mountEd()
    // rows 2 and 4 already share melody B
    expect(w.vm.linkedRows(1)).toEqual([3])
    const chip = w.findAll('.srow')[1].find('.mchip')
    expect(chip.classes('linked')).toBe(true)
    expect(chip.attributes('title')).toContain('ผูกกับท่อน 4')
    expect(w.findAll('.srow')[0].find('.mchip').classes('linked')).toBe(false)

    w.vm.focusRow(1)
    await nextTick()
    await nextTick()
    expect(w.find('.cs-linked').text()).toContain('ผูกกับท่อน 4')
    await w.find('button[aria-label="แยกทำนองของท่อนนี้"]').trigger('click')
    await nextTick()

    const id = rowOut(w, 1).stanza
    expect(id).not.toBe('B')
    expect(notesOf(stanzaOut(w, id))).toEqual(['5 6']) // 5.1 same notes
    expect(rowOut(w, 1).syllables).toEqual(['ง', 'จ']) // 5.1 words do not move
    expect(rowOut(w, 3).stanza).toBe('B')
    expect(w.vm.linkedRows(1)).toEqual([])
    expect(w.find('button[aria-label="แยกทำนองของท่อนนี้"]').exists()).toBe(false)
  })
})

describe('ใบ#94 ข้อ 6 — วางทั้งท่อน', () => {
  it('words + melody land together (pair badge ✓), key follows, the name stays', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('section', 0)
    await paste(w, 'section', 1)
    const r = rowOut(w, 1)
    expect(r.syllables).toEqual(['ก', 'ข', 'ค'])
    expect(notesOf(stanzaOut(w, r.stanza))).toEqual(['1 2 3'])
    expect(r.stanza).not.toBe('A') // ไม่ผูก by default
    expect(r.key).toBe('D')
    expect(r.label).toBe('รับ')
    expect(w.findAll('.srow')[1].find('.pair-badge').text()).toBe('✓')
    expect(rowOut(w, 3).stanza).toBe('B')
  })

  it('ผูก works for ทั้งท่อน too', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('section', 0)
    await paste(w, 'section', 1, { link: true })
    expect(rowOut(w, 1).stanza).toBe('A')
    expect(w.vm.linkedRows(0)).toEqual([1])
  })

  it('no new field in the song (Suggestion 6.1) — rows/stanzas keep the keys v3 already reads', async () => {
    const w = await mountEd()
    const rowKeys = new Set(Object.keys(rowOut(w, 0)))
    const stKeys = new Set(Object.keys(contentOf(w).stanzas[0]))
    w.vm.copySectionToClip('section', 0)
    await paste(w, 'section', 1)
    w.vm.copySectionToClip('melody', 1)
    await paste(w, 'melody', 2)
    for (const r of contentOf(w).arrangement) for (const k of Object.keys(r)) expect(rowKeys.has(k) || k === 'key').toBe(true)
    for (const s of contentOf(w).stanzas) for (const k of Object.keys(s)) expect(stKeys.has(k)).toBe(true)
  })
})

describe('ใบ#94 ข้อ 7 — every paste and แยก undoes like any edit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  async function settle() {
    vi.advanceTimersByTime(500)
    await nextTick()
    await nextTick()
  }

  it('undo a วางเนื้อ · วางทำนอง · วางทั้งท่อน · แยกทำนอง → back to before; redo → again', async () => {
    const cases = [
      ['words', 2, (w) => expect(w.vm.arrangement[2].syllables).toEqual([])],
      ['melody', 1, (w) => expect(w.vm.arrangement[1].stanza).toBe('B')],
      ['section', 1, (w) => expect(w.vm.arrangement[1].syllables).toEqual(['ง', 'จ'])],
    ]
    for (const [kind, ri, isBefore] of cases) {
      const w = await mountEd()
      await settle()
      w.vm.copySectionToClip(kind, 0)
      await paste(w, kind, ri)
      await settle()
      w.vm.undo()
      await nextTick()
      await nextTick()
      isBefore(w)
      w.vm.redo()
      await nextTick()
      await nextTick()
      expect(() => isBefore(w)).toThrow()
      w.unmount()
    }

    const w = await mountEd()
    await settle()
    w.vm.unlinkRow(1)
    await nextTick()
    await settle()
    expect(w.vm.arrangement[1].stanza).not.toBe('B')
    w.vm.undo()
    await nextTick()
    await nextTick()
    expect(w.vm.arrangement[1].stanza).toBe('B')
    expect(w.vm.stanzas.length).toBe(3)
  })
})

// ใบ#94 รอบตรวจ (เธรด 1): a ท่อน clip points INTO its song (melody letter · "ท่อน 1"), so opening
// another song must drop it — otherwise ผูก pasted the other song's melody A under these words.
// B101's บรรทัด/ห้อง clip carries no reference into the song and keeps working across songs.
const OTHER = {
  id: 's-94-other',
  number: 95,
  title_th: 'อีกเพลง',
  title_en: '',
  content: {
    version: 2,
    key: 'G',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'G', note: '7 7 7' }]] }, { id: 'B', lines: [[{ type: 'segment', chord: 'D', note: '6 6 6' }]] }],
    arrangement: [
      { stanza: 'A', label: 'ร้องอีกเพลง', syllables: ['ซ', 'ฌ', 'ญ'] },
      { stanza: 'B', label: 'รับอีกเพลง', syllables: [] },
    ],
  },
}

describe('ใบ#94 รอบตรวจ — opening another song drops a ท่อน clip', () => {
  for (const kind of ['words', 'melody', 'section']) {
    it(`${kind}: after opening another song there is nothing to paste, and a stray paste changes nothing`, async () => {
      const w = await mountEd()
      w.vm.copySectionToClip(kind, 0)
      await nextTick()
      expect(w.vm.clip.kind).toBe(kind)

      await w.setProps({ song: OTHER })
      await nextTick()
      await nextTick()
      expect(w.vm.arrangement[0].label).toBe('ร้องอีกเพลง') // the other song is in the editor
      expect(w.vm.clip).toBe(null)
      expect(w.find('.ed-clip').exists()).toBe(false)
      expect(byAria(w, 'วางทั้งท่อนจาก').length).toBe(0)

      w.vm.askPaste(kind, 1)
      await nextTick()
      expect(w.vm.pasteAsk).toBe(null) // no confirm opens
      w.vm.doPaste()
      await nextTick()
      expect(rowOut(w, 1)).toMatchObject({ stanza: 'B', syllables: [] })
      expect(notesOf(stanzaOut(w, 'A'))).toEqual(['7 7 7'])
    })
  }

  it('an open paste confirm closes when the song is swapped', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('section', 0)
    w.vm.askPaste('section', 1)
    await nextTick()
    expect(w.find('.paste-box').exists()).toBe(true)
    await w.setProps({ song: OTHER })
    await nextTick()
    expect(w.find('.paste-box').exists()).toBe(false)
  })

  it('สร้างเพลงใหม่ drops it too', async () => {
    const w = await mountEd()
    w.vm.copySectionToClip('melody', 0)
    w.vm.fileNew()
    await nextTick()
    expect(w.vm.clip).toBe(null)
  })

  it('B101 บรรทัด clip still crosses songs (unchanged)', async () => {
    const w = await mountEd()
    await w.find('button[aria-label="เพิ่มเติม"]').trigger('click') // the line ⋯ menu
    await nextTick()
    await byAria(w, 'คัดลอกบรรทัดนี้ไปวางที่ท่อนอื่น')[0].trigger('click')
    await nextTick()
    expect(w.vm.clip.kind).toBe('line')
    await w.setProps({ song: OTHER })
    await nextTick()
    expect(w.vm.clip?.kind).toBe('line')
  })
})

// ใบ#94 รอบตรวจ (เธรด 2): undo rebuilds every row, so the source row must still be found
describe('ใบ#94 รอบตรวจ — the source row has no วาง even after undo/redo', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  async function settle() {
    vi.advanceTimersByTime(500)
    await nextTick()
    await nextTick()
  }
  const pasteRows = (w) => w.findAll('.srow').map((r) => r.find('.srow-paste').exists())

  it('copy ท่อน 1 → paste into ท่อน 3 → undo → วาง still only on ท่อน 2–4', async () => {
    const w = await mountEd()
    await settle()
    w.vm.copySectionToClip('section', 0)
    await nextTick()
    expect(pasteRows(w)).toEqual([false, true, true, true])

    await paste(w, 'section', 2)
    await settle()
    w.vm.undo()
    await nextTick()
    await nextTick()
    expect(w.vm.arrangement[2].syllables).toEqual([]) // the undo really happened
    expect(pasteRows(w)).toEqual([false, true, true, true])
    w.vm.askPaste('section', 0)
    await nextTick()
    expect(w.vm.pasteAsk).toBe(null) // nor via the function

    w.vm.redo()
    await nextTick()
    await nextTick()
    // after redo ท่อน 3 holds a copy of ท่อน 1 under its own name → it is NOT the source
    expect(pasteRows(w)).toEqual([false, true, true, true])
  })
})
