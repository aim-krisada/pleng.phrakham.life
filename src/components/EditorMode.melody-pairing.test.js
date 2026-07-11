// B083 — จับคู่ทำนอง↔เนื้อ. Four enhancements to the existing editor (no new screen):
// MP1 changing a ท่อน's melody in the header keeps the panel (activeStanza follows the tune),
// MP2 the melody picker shows a derived note preview, MP3 a ✂ button splits a lyric blob into
// syllables (Intl.Segmenter), MP4 a rail badge flags melody↔lyric mismatch (rowStatus).
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

// two melodies: A = 4 attack notes, B = 3 attack notes. row0 uses A with all 4 words (fits),
// row1 uses A but only 1 word (mismatch → red badge).
const SONG = {
  id: 's-mp',
  number: 2,
  title_th: 'ของขวัญ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 5' }]] },
      { id: 'B', lines: [[{ type: 'segment', chord: 'G', note: '5 6 5' }]] },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['ของ', 'ขวัญ', 'จาก', 'ฟ้า'] },
      { stanza: 'A', label: 'ร้อง 2', syllables: ['เพียง'] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

// real ComboSelect so we can drive the melody picker; stub the heavy renderers only
function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true } },
  })
}

const arrOf = (w) => w.emitted('change').at(-1)[0].content.arrangement

describe('B083 — melody↔lyric pairing', () => {
  it('MP1: changing the melody in the header keeps the header + word boxes (activeStanza follows)', async () => {
    const w = mountEd()
    await nextTick()
    // row0 (stanza A) is the lens on load → header present
    expect(w.find('.cshead').exists()).toBe(true)
    // open the header melody picker and choose ทำนอง B
    const combo = w.find('.cs-mel input')
    await combo.trigger('focus')
    await nextTick()
    const optB = w.findAll('.cs-mel .combo-item').find((o) => o.text().includes('ทำนอง B'))
    expect(optB).toBeTruthy()
    await optB.trigger('mousedown')
    await nextTick()
    await nextTick()
    // the row's melody changed AND the header is still shown (the old bug hid it)
    expect(arrOf(w)[0].stanza).toBe('B')
    expect(w.find('.cshead').exists()).toBe(true)
    // activeStanza followed the new melody → the breadcrumb + header reflect ทำนอง B
    expect(w.find('.ed-crumb').text()).toContain('ทำนอง B')
    expect(w.find('.cs-mel input').element.value).toContain('ทำนอง B')
  })

  it('MP2: the melody picker options carry a derived note preview (A vs B read apart)', async () => {
    const w = mountEd()
    await nextTick()
    await w.find('.cs-mel input').trigger('focus')
    await nextTick()
    const texts = w.findAll('.cs-mel .combo-item').map((o) => o.text())
    // each option shows its first notes after "ทำนอง X ·"
    expect(texts.some((t) => t.includes('ทำนอง A') && t.includes('1 2 3 5'))).toBe(true)
    expect(texts.some((t) => t.includes('ทำนอง B') && t.includes('5 6 5'))).toBe(true)
  })

  it('MP4: the rail shows a pairing badge — ✓ when words fit, red count when they do not', async () => {
    const w = mountEd()
    await nextTick()
    const badges = w.findAll('.srow .pair-badge')
    expect(badges.length).toBe(2)
    // row0 has all 4 words on melody A (4 attack notes) → good ✓
    expect(badges[0].classes()).toContain('good')
    expect(badges[0].text()).toContain('✓')
    // row1 has 1 word of 4 → bad, shows the count + ✗
    expect(badges[1].classes()).toContain('bad')
    expect(badges[1].text()).toBe('1/4 ✗')
  })

  it('MP3: ✂ splits a lyric blob into syllables mapped onto the melody, and announces the count', async () => {
    const w = mountEd()
    await nextTick()
    // select row1, open the paragraph panel
    await w.findAll('.srow')[1].trigger('click')
    await nextTick()
    const paraBtn = w.findAll('button').find((b) => b.text().includes('แก้เนื้อแบบย่อหน้า'))
    await paraBtn.trigger('click')
    await nextTick()
    // paste a blob: comma between phrases, spaces inside (works with or without Intl.Segmenter)
    const ta = w.find('textarea.arr-lyric')
    await ta.setValue('ของ ขวัญ, จาก ฟ้า')
    await nextTick()
    const scissors = w.find('.auto-syl')
    expect(scissors.exists()).toBe(true)
    await scissors.trigger('click')
    await nextTick()
    // the blob became multiple syllable slots (was collapsed before)
    const syl = arrOf(w)[1].syllables.filter((t) => (t || '').trim())
    expect(syl.length).toBeGreaterThanOrEqual(2)
    // an aria-live status announced the result
    expect(w.find('[aria-live="polite"]').exists()).toBe(true)
    expect(w.html()).toContain('แยกได้')
  })
})
