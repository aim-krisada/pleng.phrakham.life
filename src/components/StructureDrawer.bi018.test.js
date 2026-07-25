// BI-018 — melody A/B clarity. The โครงเพลง drawer is master-detail: the ทำนอง list is the
// explicit selector for the outline below, and the outline always names its melody + shows a
// sync-aware breadcrumb. These prove: (1) a single melody stays a plain static row; (2) with ≥2
// melodies each row is a selectable button that switches the active melody; (3) selecting a melody
// other than the cursor's shows the desync breadcrumb + a jump-to-cursor that re-syncs.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StructureDrawer from './StructureDrawer.vue'

// two melodies (A, B), cursor sitting in A's first section
const content2 = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [
    { id: 'A', lines: [[{ type: 'segment', note: '1 2 3' }]] },
    { id: 'B', lines: [[{ type: 'segment', note: '4 5 6' }]] },
  ],
  arrangement: [
    { stanza: 'A', label: 'ข้อ 1', syllables: ['a', 'b', 'c'] },
    { stanza: 'B', label: 'ข้อ 2', syllables: ['d', 'e', 'f'] },
  ],
})
const cursorA = { stanzaId: 'A', lineIndex: 0, barOrdinal: 0, entryIndex: 0 }

function mountDrawer(over = {}) {
  return mount(StructureDrawer, {
    props: { open: true, content: content2(), cursor: cursorA, clip: null, ...over },
    global: { stubs: { Icon: true } },
  })
}

describe('BI-018 — melody selector (master-detail)', () => {
  it('single melody → row is a static, non-selectable label (no pick button)', () => {
    const one = {
      version: 2, stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1' }]] }],
      arrangement: [{ stanza: 'A', label: 'ท่อน', syllables: ['a'] }],
    }
    const w = mount(StructureDrawer, {
      props: { open: true, content: one, cursor: null, clip: null },
      global: { stubs: { Icon: true } },
    })
    expect(w.find('.sd-mel .sd-mel-pick.static').exists()).toBe(true)
    expect(w.find('button.sd-mel-pick').exists()).toBe(false)
    expect(w.find('.sd-mel-now').exists()).toBe(false)
  })

  it('≥2 melodies → each row is a selectable button; the cursor melody is active by default', () => {
    const w = mountDrawer()
    const picks = w.findAll('button.sd-mel-pick')
    expect(picks.length).toBe(2)
    const rows = w.findAll('.sd-mel')
    // A (cursor's melody) is active, carries the "กำลังแก้" text pill + aria-pressed
    expect(rows[0].classes()).toContain('active')
    expect(picks[0].attributes('aria-pressed')).toBe('true')
    expect(rows[0].find('.sd-mel-now').text()).toContain('กำลังแก้')
    expect(rows[1].classes()).not.toContain('active')
    // outline titles the active melody
    expect(w.find('.sd-outline-title').text()).toContain('โครงทำนอง A')
    // synced breadcrumb names melody + resolved section label, NOT desync
    expect(w.find('.sd-crumb').classes()).not.toContain('desync')
    expect(w.find('.sd-crumb').text()).toContain('ข้อ 1')
    expect(w.find('.sd-crumb-jump').exists()).toBe(false)
  })

  it('selecting the non-cursor melody switches the outline + shows the desync breadcrumb', async () => {
    const w = mountDrawer()
    await w.findAll('button.sd-mel-pick')[1].trigger('click') // pick ♫B
    expect(w.find('.sd-outline-title').text()).toContain('โครงทำนอง B')
    expect(w.findAll('.sd-mel')[1].classes()).toContain('active')
    expect(w.findAll('.sd-mel')[0].classes()).not.toContain('active')
    const crumb = w.find('.sd-crumb')
    expect(crumb.classes()).toContain('desync')
    expect(crumb.text()).toContain('♫B')            // viewing B
    expect(crumb.text()).toContain('(♫A)')          // cursor still in A
    expect(w.find('.sd-crumb-jump').exists()).toBe(true)
  })

  it('ไปที่เคอร์เซอร์ re-syncs the outline back to the cursor melody', async () => {
    const w = mountDrawer()
    await w.findAll('button.sd-mel-pick')[1].trigger('click') // to B
    await w.find('.sd-crumb-jump').trigger('click')           // jump back
    expect(w.find('.sd-outline-title').text()).toContain('โครงทำนอง A')
    expect(w.find('.sd-crumb').classes()).not.toContain('desync')
  })

  it('a copied position names its melody in the คัดลอก hint', () => {
    const w = mountDrawer()
    expect(w.find('.sd-hint').text()).toContain('♫A')
  })
})
