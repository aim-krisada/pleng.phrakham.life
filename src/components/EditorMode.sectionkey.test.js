// ใบ v3/pleng#95 ข้อ 2–3 — the editor's players use the ท่อน key. ฟังท่อน / ฟังบรรทัด play a
// MELODY that several ท่อน may share in different keys, so the key comes from the ท่อน selected
// on the header; ฟังทั้งเพลง plays the resolved song, whose keyed ท่อน lines carry `_key`.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, playEnsembleSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => Promise.resolve(true)),
  playEnsembleSpy: vi.fn(() => Promise.resolve(true)),
}))
vi.mock('../lib/midi.js', () => ({ playSong: playSongSpy, playEnsemble: playEnsembleSpy, stopPlayback: () => {} }))
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

// รับ 1 and รับ 2 share melody A; only รับ 2 sets its own key (like พี่เปา's song 85)
const SONG = {
  id: 's-95',
  number: 85,
  title_th: 'ลองคีย์ท่อน',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }], [{ type: 'segment', chord: 'G', note: '5 5 5 5' }]] }],
    arrangement: [
      { stanza: 'A', label: 'รับ 1', syllables: [] },
      { stanza: 'A', label: 'รับ 2', syllables: [], key: 'A' },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  playSongSpy.mockClear()
  playEnsembleSpy.mockClear()
})

async function mountEd() {
  const w = mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, ExportTool: true, DockKey: true, ComboSelect: true, SongSheet: true, StudioDock: true } },
  })
  await nextTick()
  await nextTick()
  return w
}
const lastContent = () => (playSongSpy.mock.calls.at(-1) || playEnsembleSpy.mock.calls.at(-1))[0]
async function select(w, i) {
  w.vm.focusRow(i)
  await nextTick()
  await nextTick()
}
async function click(w, aria, k = 0) {
  await w.findAll(`button[aria-label="${aria}"]`)[k].trigger('click')
  await nextTick()
  await nextTick() // runPlay resolves → playing=false, so the next click starts (not stops) a play
}

describe('ใบ#95 ข้อ 3 — ฟังท่อน plays in the selected ท่อน key', () => {
  it('รับ 2 selected → A · รับ 1 selected (same melody) → the song key C', async () => {
    const w = await mountEd()
    await select(w, 1)
    await click(w, 'ฟังท่อนนี้')
    expect(lastContent().key).toBe('A')

    await select(w, 0)
    await click(w, 'ฟังท่อนนี้')
    expect(lastContent().key).toBe('C')
  })

  it('ฟังบรรทัด follows the selected ท่อน too', async () => {
    const w = await mountEd()
    await select(w, 1)
    await click(w, 'ฟังบรรทัดนี้')
    expect(lastContent().key).toBe('A')
  })

  it('changing the ท่อน key on the header is heard on the next ฟังท่อน (no save needed)', async () => {
    const w = await mountEd()
    await select(w, 0)
    w.vm.arrangement[0].key = 'D'
    await nextTick()
    await click(w, 'ฟังท่อนนี้')
    expect(lastContent().key).toBe('D')
  })
})

describe('ใบ#95 ข้อ 2 — ฟังทั้งเพลง hands the player the ท่อน keys', () => {
  it('the resolved lines of รับ 2 carry its key; รับ 1 lines carry none; the song key stays C', async () => {
    const w = await mountEd()
    const playFull = w.findAll('button').find((b) => /ฟังทั้งเพลง/.test(b.attributes('aria-label') || b.attributes('title') || b.text()))
    if (playFull) {
      await playFull.trigger('click')
    } else {
      // the dock button is rendered by StudioDock (stubbed) — drive the same item it runs
      w.vm.editItems.find((it) => /ทั้งเพลง/.test(it.name || it.label || '')).run()
    }
    await nextTick()
    const c = lastContent()
    expect(c.key).toBe('C')
    expect(c.lines.map((l) => l._key)).toEqual([undefined, undefined, 'A', 'A'])
  })
})
