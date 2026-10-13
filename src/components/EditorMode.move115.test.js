// ใบ v3/pleng#115 — "เวลาต้องการย้ายบรรทัด กดลงแล้วไม่ลง" (พี่เอม, phone, the ▼ in the ท่อน header).
// The move happened but nothing on screen showed it; with the keyboard the rail ▲▼ and the bar
// ← → even moved the item BACK on the second press (focus stayed on the old place). These tests
// fail on the old code:
//  1. an unnamed ท่อน ("ข้อ 1" = its place) moved down was renamed "ข้อ 2" — it must keep its name
//  2. a visible message says what moved, and Ctrl+Z puts order + names back
//  3. keyboard ▼ ▼ in the rail moves the SAME ท่อน two places (not down-then-back)
//  4. with lyric sets, ▼ moves past rows of other sets (hidden) instead of swapping with them
//  5. keyboard → → on a ห้อง moves the SAME ห้อง two places
//  6. a button that becomes disabled (top/bottom) hands focus to its twin, never to <body>
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

// the owner's case: a 6/8 song, ONE melody linked to all 7 ท่อน, the first one unnamed
// (shown as "ข้อ 1"), the others named ข้อ2…ข้อ7 — like song 627 on the live site
const verse = (label, w) => ({ stanza: 'A', label, syllables: [w + '1', w + '2', w + '3'] })
const SONG = {
  id: 's-115',
  number: 627,
  title_th: 'ทดสอบย้ายท่อน',
  title_en: '',
  content: {
    version: 2,
    key: 'D',
    timeSignature: '6/8',
    stanzas: [
      {
        id: 'A',
        lines: [
          [{ type: 'segment', chord: 'D', note: '3. 4 4' }, { type: 'segment', note: '5. 6.' }],
          [{ type: 'segment', chord: 'G', note: '2. 5' }],
          [{ type: 'segment', chord: 'A', note: '4. 3' }],
        ],
      },
    ],
    arrangement: [verse('', 'ก'), verse('ข้อ2', 'ข'), verse('ข้อ3', 'ค'), verse('ข้อ4', 'ง'), verse('ข้อ5', 'จ'), verse('ข้อ6', 'ฉ'), verse('ข้อ7', 'ช')],
  },
}

let w
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  w?.unmount()
  w = null
  vi.useRealTimers()
})

async function mountEd(song = SONG) {
  w = mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, ComboSelect: true } },
  })
  await nextTick()
  await nextTick()
  return w
}
const flush = async () => { await nextTick(); await nextTick() }
const railNames = () => [...document.querySelectorAll('#studioRail .srow')].map((r) => r.querySelector('.sname').textContent.trim())
const firstWords = () => w.vm.arrangement.map((r) => r.syllables[0])
const head = () => document.querySelector('.cshead')
// a real keyboard user: focus the button, press it (Enter on a <button> = click), read where focus went
async function press(el) {
  el.focus()
  el.click()
  await flush()
  return document.activeElement
}
function ctrlZ() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
}

describe('ใบ #115 — ▲▼ moves the ท่อน and the screen shows it', () => {
  it('owner repro: ▼ in the ท่อน header on ข้อ 1 (unnamed, melody linked to 2–7) moves it down and it KEEPS its name', async () => {
    await mountEd()
    expect(head().querySelector('.cs-num').textContent).toBe('1')
    expect(head().querySelector('.cs-name').textContent.trim()).toBe('ข้อ 1')
    expect(head().querySelector('.cs-linked').textContent).toContain('ผูกกับท่อน 2, 3, 4, 5, 6, 7')
    const up = head().querySelector('button[aria-label="ย้ายท่อนขึ้น"]')
    const down = head().querySelector('button[aria-label="ย้ายท่อนลง"]')
    expect(up.disabled).toBe(true) // first ท่อน: ▲ cannot be pressed
    expect(down.disabled).toBe(false)

    await press(down)

    // the words of ข้อ 1 are now second — the move really happened
    expect(firstWords().slice(0, 3)).toEqual(['ข1', 'ก1', 'ค1'])
    // …and the moved ท่อน is still CALLED ข้อ 1 (old code renamed it "ข้อ 2" by its new place,
    // right next to the real ข้อ2 — so it looked as if nothing had moved)
    expect(railNames().slice(0, 3)).toEqual(['ข้อ2', 'ข้อ 1', 'ข้อ3'])
    expect(head().querySelector('.cs-num').textContent).toBe('2')
    expect(head().querySelector('.cs-name').textContent.trim()).toBe('ข้อ 1')
    expect(w.vm.lensChoice).toBe(1) // the canvas follows the moved ท่อน
    // the author is TOLD (visible line above the bottom bar + the screen-reader line)
    expect(document.querySelector('.dk-msg')?.textContent).toContain('ย้าย “ข้อ 1” ลงไปเป็นท่อนที่ 2 แล้ว')
    expect(w.vm.reorderMsg).toContain('ย้าย “ข้อ 1” ลงไปเป็นท่อนที่ 2 แล้ว')
    // the sheet keeps printing those words under "ข้อ 1"
    const saved = w.emitted('change').at(-1)[0].content.arrangement
    expect(saved[1]).toMatchObject({ label: 'ข้อ 1', syllables: ['ก1', 'ก2', 'ก3'] })
  })

  it('▲ moves it back up; Ctrl+Z undoes a move (order AND names)', async () => {
    vi.useFakeTimers()
    await mountEd()
    const down = head().querySelector('button[aria-label="ย้ายท่อนลง"]')
    await press(down)
    vi.advanceTimersByTime(500)
    await flush()
    expect(firstWords().slice(0, 2)).toEqual(['ข1', 'ก1'])

    ctrlZ()
    await flush()
    expect(firstWords().slice(0, 2)).toEqual(['ก1', 'ข1'])
    expect(w.vm.arrangement[0].label).toBe('') // the name written in by the move is undone too

    // ▲ after a ▼ returns it
    await press(head().querySelector('button[aria-label="ย้ายท่อนลง"]'))
    vi.advanceTimersByTime(500)
    await flush()
    await press(head().querySelector('button[aria-label="ย้ายท่อนขึ้น"]'))
    expect(firstWords().slice(0, 2)).toEqual(['ก1', 'ข1'])
    expect(document.querySelector('.dk-msg')?.textContent).toContain('ขึ้นไปเป็นท่อนที่ 1')
    vi.advanceTimersByTime(7000) // the visible line clears itself
    await flush()
    expect(document.querySelector('.dk-msg')).toBeNull()
  })

  it('keyboard in the rail: ▼ then ▼ again moves the SAME ท่อน two places (old code moved it back)', async () => {
    await mountEd()
    const first = document.querySelectorAll('#studioRail .srow')[0].querySelector('button[aria-label="ย้ายท่อนลง"]')
    const after1 = await press(first)
    // focus followed the ท่อน to its new row
    expect(after1.closest('.srow')).toBe(document.querySelectorAll('#studioRail .srow')[1])
    expect(after1.getAttribute('aria-label')).toBe('ย้ายท่อนลง')
    await press(after1)
    expect(firstWords().slice(0, 3)).toEqual(['ข1', 'ค1', 'ก1'])
    expect(railNames()[2]).toBe('ข้อ 1')
  })

  it('last place: ▼ is disabled and focus moves to ▲ (not dropped to the page)', async () => {
    await mountEd()
    const rows = document.querySelectorAll('#studioRail .srow')
    const btn = rows[5].querySelector('button[aria-label="ย้ายท่อนลง"]')
    const after = await press(btn)
    const last = document.querySelectorAll('#studioRail .srow')[6]
    expect(last.querySelector('button[aria-label="ย้ายท่อนลง"]').disabled).toBe(true)
    expect(after).toBe(last.querySelector('button[aria-label="ย้ายท่อนขึ้น"]'))
    // same in the ท่อน header
    w.vm.focusRow(5)
    await flush()
    const after2 = await press(head().querySelector('button[aria-label="ย้ายท่อนลง"]'))
    expect(head().querySelector('button[aria-label="ย้ายท่อนลง"]').disabled).toBe(true)
    expect(after2).toBe(head().querySelector('button[aria-label="ย้ายท่อนขึ้น"]'))
  })

  it('lyric sets: ▼ moves past the hidden rows of another set (old code swapped with a hidden row = nothing visible moved)', async () => {
    const song = JSON.parse(JSON.stringify(SONG))
    song.content.lyricSets = [{ label: 'ชุด ๑' }, { label: 'ชุด ๒' }]
    song.content.arrangement = [
      { stanza: 'A', label: 'หนึ่ง', set: 0, syllables: ['a'] },
      { stanza: 'A', label: 'หนึ่ง', set: 1, syllables: ['b'] },
      { stanza: 'A', label: 'สอง', set: 0, syllables: ['c'] },
      { stanza: 'A', label: 'สอง', set: 1, syllables: ['d'] },
    ]
    await mountEd(song)
    const visible = () => [...document.querySelectorAll('#studioRail .srow')].filter((r) => r.style.display !== 'none').map((r) => r.querySelector('.sname').textContent.trim() + ':' + w.vm.arrangement[[...document.querySelectorAll('#studioRail .srow')].indexOf(r)].syllables[0])
    expect(visible()).toEqual(['หนึ่ง:a', 'สอง:c'])
    const rows = document.querySelectorAll('#studioRail .srow')
    // the last VISIBLE row of the set has ▼ disabled even though hidden rows follow it
    expect(rows[2].querySelector('button[aria-label="ย้ายท่อนลง"]').disabled).toBe(true)
    await press(rows[0].querySelector('button[aria-label="ย้ายท่อนลง"]'))
    expect(visible()).toEqual(['สอง:c', 'หนึ่ง:a'])
    // the other set's order is untouched
    expect(w.vm.arrangement.filter((r) => r.set === 1).map((r) => r.syllables[0])).toEqual(['b', 'd'])
  })
})

describe('ใบ #115 item 5 — the other move controls', () => {
  const barNotes = () => w.vm.stanzas[0].lines.map((l) => l.bars.map((b) => b.segments[0].note).join(' / '))

  it('ห้อง → by keyboard twice moves the SAME ห้อง two places (old code moved it back)', async () => {
    const song = JSON.parse(JSON.stringify(SONG))
    // one line, three bars (a bar = an object with segments); v2 lines are loaded into bars
    song.content.stanzas[0].lines = [[
      { type: 'segment', chord: 'D', note: '1 1 1' }, { type: 'bar' },
      { type: 'segment', chord: 'G', note: '2 2 2' }, { type: 'bar' },
      { type: 'segment', chord: 'A', note: '3 3 3' },
    ]]
    await mountEd(song)
    expect(barNotes()[0]).toBe('1 1 1 / 2 2 2 / 3 3 3')
    const right0 = document.querySelector('.ed-bar-mv[data-mvbar="0-0"][aria-label^="ย้ายห้องไปทางขวา"]')
    const after1 = await press(right0)
    expect(barNotes()[0]).toBe('2 2 2 / 1 1 1 / 3 3 3')
    expect(after1.getAttribute('data-mvbar')).toBe('0-1') // focus followed the ห้อง
    await press(after1)
    expect(barNotes()[0]).toBe('2 2 2 / 3 3 3 / 1 1 1')
  })

  it('บรรทัด ▼ onto the last line: says so, and focus goes to ▲ instead of the page', async () => {
    await mountEd()
    const down = document.querySelector('button[aria-label="ย้ายบรรทัดลง"]')
    const after1 = await press(down)
    expect(after1).toBe(down) // still enabled (line 2 of 3) → focus stays
    const after2 = await press(down)
    expect(down.disabled).toBe(true)
    expect(after2).toBe(document.querySelector('button[aria-label="ย้ายบรรทัดขึ้น"]'))
    expect(w.vm.stanzas[0].lines.map((l) => l.bars[0].segments[0].note)).toEqual(['2. 5', '4. 3', '3. 4 4'])
    expect(document.querySelector('.dk-msg')?.textContent).toContain('ย้ายบรรทัด 2 ลงไปเป็นบรรทัดที่ 3 แล้ว')
  })
})
