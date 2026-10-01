// ใบ v3/pleng#96 — in the editor a melody gets its own meter from the ท่อน header (shared by every ท่อน
// on that melody). The live bar check and the publish lint measure each melody against ITS meter, the
// value survives save → reopen, and a song with no melody meter saves exactly as before.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy } = vi.hoisted(() => ({ playSongSpy: vi.fn(() => Promise.resolve(true)) }))
vi.mock('../lib/midi.js', async (importOriginal) => ({ ...(await importOriginal()), playSong: playSongSpy, playEnsemble: vi.fn(() => Promise.resolve(true)), stopPlayback: () => {} }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return { supabase: { from: () => makeQuery(), auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }
})

import EditorMode from './EditorMode.vue'

// 306-like: song 6/8 · ข้อ on melody V (6/8 bars of 3 quarter-beats) · รับ on melody R written in 4/4
const SONG = {
  id: 's-96', number: 306, title_th: 'รักปรารถนา (ทดสอบ)', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '6/8',
    stanzas: [
      { id: 'V', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3' }, { type: 'bar' }, { type: 'segment', chord: 'C', note: '3 2 1' }]] },
      { id: 'R', lines: [[{ type: 'segment', chord: 'F', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', chord: 'G', note: '5 4 3 2' }]] },
    ],
    arrangement: [
      { stanza: 'V', label: 'ข้อ 1', syllables: [] },
      { stanza: 'R', label: 'รับ', syllables: [] },
    ],
  },
}
const withRMeter = (ts = '4/4') => JSON.parse(JSON.stringify({ ...SONG, content: { ...SONG.content, stanzas: [SONG.content.stanzas[0], { ...SONG.content.stanzas[1], timeSignature: ts }] } }))

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  playSongSpy.mockClear()
})
async function mountEd(song) {
  const w = mount(EditorMode, { props: { song, tier: 'approver', active: true }, attachTo: document.body, global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } } })
  await nextTick(); await nextTick()
  return w
}
const contentOf = (w) => w.emitted('change').at(-1)[0].content
const barTexts = (w) => w.findAll('.ed-bar-status').map((s) => s.text())
async function select(w, i) { w.vm.focusRow(i); await nextTick(); await nextTick() }

describe('ใบ#96 เสร็จเมื่อ 1 + 2 — set a melody meter; the bar check follows it', () => {
  it('without it, รับ’s 4-beat bars read 4/3 ❌ in this 6/8 song', async () => {
    const w = await mountEd(SONG)
    await select(w, 1)
    expect(barTexts(w).every((t) => t.includes('4/3') && t.includes('❌'))).toBe(true)
  })

  it('setting รับ’s melody to 4/4 on the header → its bars read 4/4 ✓; ข้อ’s 6/8 bars still read 3/3 ✓', async () => {
    const w = await mountEd(SONG)
    await select(w, 1)
    w.vm.stanzas[w.vm.activeStanza].timeSignature = '4/4' // what the header picker writes
    await nextTick()
    expect(barTexts(w).every((t) => t.includes('4/4') && t.includes('✓'))).toBe(true)
    await select(w, 0)
    expect(barTexts(w).every((t) => t.includes('3/3') && t.includes('✓'))).toBe(true)
  })

  it('the header picker exists only as ONE per melody: both ท่อน on melody R show the same value', async () => {
    const song = withRMeter()
    song.content.arrangement.push({ stanza: 'R', label: 'รับ 2', syllables: [] })
    const w = await mountEd(song)
    await select(w, 1)
    expect(w.find('[aria-label="จังหวะของทำนองนี้"]').exists()).toBe(true)
    expect(w.vm.stanzas[w.vm.activeStanza].timeSignature).toBe('4/4')
    await select(w, 2)
    expect(w.vm.stanzas[w.vm.activeStanza].timeSignature).toBe('4/4')
  })
})

describe('ใบ#96 เสร็จเมื่อ 2 — the publish lint uses each melody’s own meter', () => {
  it('รับ’s 4-beat bars are beat errors under the song’s 6/8, and clean once its melody is 4/4', async () => {
    const w = await mountEd(SONG)
    const before = w.vm.lintSong()
    expect(before.codes).toContain('beats')
    expect(before.count).toBe(2) // the 2 bars of รับ; ข้อ’s bars are fine in 6/8
    const w2 = await mountEd(withRMeter())
    expect(w2.vm.lintSong()).toEqual({ count: 0, codes: [] })
  })
})

describe('ใบ#96 เสร็จเมื่อ 3 — ฟังท่อน plays in the melody’s meter', () => {
  it('ฟังท่อนนี้ on รับ passes 4/4; on ข้อ passes the song meter', async () => {
    const w = await mountEd(withRMeter())
    await select(w, 1)
    await w.find('button[aria-label="ฟังท่อนนี้"]').trigger('click')
    expect(playSongSpy.mock.calls.at(-1)[0].timeSignature).toBe('4/4')
    await nextTick(); await nextTick()
    await select(w, 0)
    await w.find('button[aria-label="ฟังท่อนนี้"]').trigger('click')
    expect(playSongSpy.mock.calls.at(-1)[0].timeSignature).toBe('6/8')
  })
})

describe('ใบ#96 เสร็จเมื่อ 6 — save → reopen keeps it; no melody meter saves as before', () => {
  it('a melody meter is saved on that stanza only, and reopening keeps it', async () => {
    const w = await mountEd(withRMeter())
    const saved = contentOf(w)
    expect(saved.stanzas.map((s) => s.timeSignature)).toEqual([undefined, '4/4'])
    expect(saved.timeSignature).toBe('6/8')
    w.unmount()
    const w2 = await mountEd({ ...SONG, content: saved })
    expect(contentOf(w2).stanzas[1].timeSignature).toBe('4/4')
  })

  it('clearing it (ตามเพลง) removes the key; a song that never had one emits no timeSignature on any stanza', async () => {
    const w = await mountEd(withRMeter())
    await select(w, 1)
    delete w.vm.stanzas[w.vm.activeStanza].timeSignature // what picking ตามเพลง does
    await nextTick()
    expect(contentOf(w).stanzas.some((s) => 'timeSignature' in s)).toBe(false)
    const w2 = await mountEd(SONG)
    expect(contentOf(w2).stanzas.some((s) => 'timeSignature' in s)).toBe(false)
  })

  it('an unknown per-stanza key still round-trips next to it (v3 data is not lost)', async () => {
    const song = withRMeter()
    song.content.stanzas[1].mystery = { from: 'v3' }
    const w = await mountEd(song)
    expect(contentOf(w).stanzas[1]).toMatchObject({ timeSignature: '4/4', mystery: { from: 'v3' } })
  })
})
