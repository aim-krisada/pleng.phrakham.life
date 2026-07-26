// 717 multi-lyric — the แผ่นเพลง (print) surface must print the set the reader chose.
//
// แผ่นเพลง has no set switcher of its own, so it follows the set the reader last picked in ดู
// (SongViewer emits it, the shell holds it). Before this, the shell handed SongSheet the RAW
// song: on this line nothing filtered it, so both sets ran together as ข้อ 1..13 and the
// singer got a sheet of words nobody sings in that order.
//
// Studio is tested in isolation, as the rest of this folder does — the mode components are
// stubbed, so what is exercised is the shell's own job: pick the set, feed each surface.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }), useRouter: () => ({ push() {} }) }))
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
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})

import Studio from './Studio.vue'
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], emits: ['set'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active', 'initialSet'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  ExportTool: { name: 'ExportTool', props: ['content', 'filenameBase'], template: '<div class="stub-export" />' },
  Icon: true,
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

const line = (n) => [{ type: 'segment', note: n, chord: 'C' }]
const entry = (set, label) => ({ stanza: label === 'รับ' ? 'B' : 'A', set, label, syllables: [] })
// set 0 = 2 blocks · set 1 = 3 blocks, so a wrong set is visible as a wrong line count
const song717 = {
  id: 's717', number: 717, title_th: 'สองชุดเนื้อ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ name: 'ชุดหนึ่ง' }, { name: 'ชุดสอง' }],
    stanzas: [
      { id: 'A', lines: [line('1'), line('2')] },
      { id: 'B', lines: [line('3'), line('4')] },
    ],
    arrangement: [
      entry(0, ''), entry(0, 'รับ'),
      entry(1, ''), entry(1, 'รับ'), entry(1, 'ข้อ2'),
    ],
  },
}
const modeButtons = () => [...document.querySelectorAll('#shell-menus .sb-mode-btn')]

// load a song into the shell, switch to แผ่นเพลง, optionally after the reader picked a set
async function openSheet(song, readerSet) {
  const w = mount(Studio, { global: { stubs } })
  await nextTick()
  w.findComponent(EditorMode).vm.$emit('change', song)
  await nextTick()
  const [view, sheet] = modeButtons()
  view.click()
  await nextTick()
  if (readerSet != null) {
    w.findComponent({ name: 'SongViewer' }).vm.$emit('set', readerSet)
    await nextTick()
  }
  sheet.click()
  await nextTick()
  return w
}
// which set each printed line came from, read back through its provenance tag
const printedSets = (w) => {
  const c = w.findComponent(SongSheet).props('content')
  return (c.lines || [])
    .map((l) => (l._entryIndex == null ? null : c.arrangement[l._entryIndex]?.set))
    .filter((s) => s != null)
}

describe('Studio แผ่นเพลง — prints the selected lyric set (717)', () => {
  it.each([0, 1])('reader on set %i → the paper carries only that set', async (set) => {
    const w = await openSheet(song717, set)
    const sets = printedSets(w)
    expect(sets.length).toBeGreaterThan(0)
    expect(sets.every((s) => s === set), `leaked: ${sets.join(',')}`).toBe(true)
  })

  it('the two sets produce DIFFERENT papers (2 blocks vs 3)', async () => {
    const a = w0 => w0.findComponent(SongSheet).props('content').lines.length
    expect(a(await openSheet(song717, 0))).toBe(4) // 2 blocks × 2 melody lines
    expect(a(await openSheet(song717, 1))).toBe(6) // 3 blocks × 2
  })

  it('never runs the sets together as ข้อ 1..N — the bug this fixes', async () => {
    const w = await openSheet(song717, 0)
    // all 5 entries resolved would be 10 lines; one set is 4
    expect(w.findComponent(SongSheet).props('content').lines).toHaveLength(4)
  })

  it('going straight to แผ่นเพลง without visiting ดู prints the FIRST set', async () => {
    const w = await openSheet(song717) // no reader pick
    expect(printedSets(w).every((s) => s === 0)).toBe(true)
  })

  it('the printed heading carries the set, so two papers are told apart', async () => {
    // by NUMBER since 26 ก.ค. — the paper says what the singer read on screen. The stored names
    // ('ชุดหนึ่ง'/'ชุดสอง' in this fixture) must not reach the heading.
    const t0 = (await openSheet(song717, 0)).findComponent(SongSheet).props('songTitle')
    const t1 = (await openSheet(song717, 1)).findComponent(SongSheet).props('songTitle')
    expect(t0).toContain('เนื้อร้องที่ 1')
    expect(t1).toContain('เนื้อร้องที่ 2')
    expect(t0).not.toContain('ชุดหนึ่ง')
    expect(t0).not.toBe(t1)
  })

  it('the sheet’s MP3/PDF export gets the same set as the paper', async () => {
    const w = await openSheet(song717, 1)
    const exported = w.findComponent({ name: 'ExportTool' }).props('content')
    expect(exported.arrangement).toHaveLength(3)
    expect(exported.arrangement.every((e) => e.set === 1)).toBe(true)
  })

  it('back-compat — an ordinary song prints unchanged, heading unstamped', async () => {
    const plain = {
      id: 'p', number: 9, title_th: 'ธรรมดา', title_en: '',
      content: { ...song717.content, lyricSets: undefined, arrangement: [entry(undefined, ''), entry(undefined, 'รับ')] },
    }
    const w = await openSheet(plain, 0)
    expect(w.findComponent(SongSheet).props('content').lines).toHaveLength(4)
    expect(w.findComponent(SongSheet).props('songTitle')).toBe('9. ธรรมดา') // no " — set" suffix
  })

  it('a `set` written as a STRING still prints a complete sheet', async () => {
    const strung = {
      ...song717,
      content: { ...song717.content, arrangement: song717.content.arrangement.map((e) => ({ ...e, set: String(e.set) })) },
    }
    const w = await openSheet(strung, 1)
    expect(w.findComponent(SongSheet).props('content').lines).toHaveLength(6) // not 0, not 10
  })
})
