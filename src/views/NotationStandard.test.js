// "มาตรฐานการเขียนโน้ต" (/#/notation) — the song-makers' central spec (GATE 1).
// Asserts: route resolves to the page · 7 section anchors present · every content section
// (§1–§6) carries the ⭐ 🎵/▶ callout · §7 flagship table has all its rows · and that Guide
// was actually TRIMMED (detailed rules moved out, not duplicated) while keeping ② + the bridge.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import router from '../router.js'
import NotationStandard from './NotationStandard.vue'
import Guide from './Guide.vue'

const stubs = { NoteRow: true, Icon: true, RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

describe('router — /notation', () => {
  it('resolves /notation to the NotationStandard page', () => {
    const r = router.resolve('/notation')
    expect(r.matched.length).toBeGreaterThan(0)
    expect(r.matched[0].components.default).toBe(NotationStandard)
  })
  it('still resolves /guide', () => {
    expect(router.resolve('/guide').matched[0].components.default).toBe(Guide)
  })
})

describe('NotationStandard — content contract', () => {
  const mountPage = () => mount(NotationStandard, { global: { stubs } })

  it('has all 7 section anchors + the intro anchor', () => {
    const w = mountPage()
    for (const id of ['start', 'roots', 'rhythm', 'form', 'chords', 'lyrics', 'house-rules', 'write-to-result']) {
      expect(w.find('#' + id).exists()).toBe(true)
    }
  })

  it('every content section §1–§6 ends with a ⭐ callout naming both results (🎵 sheet + ▶ play)', () => {
    const w = mountPage()
    // one .callout per content section (§1..§6) plus the §0 "how to use" callout = 7 total
    const callouts = w.findAll('.callout')
    const dual = callouts.filter((c) => c.text().includes('🎵') && c.text().includes('▶'))
    expect(dual.length).toBe(6)
    for (const c of dual) {
      expect(c.text()).toContain('ผลบนแผ่น')
      expect(c.text()).toContain('ผลตอนเล่น')
    }
  })

  it('§7 flagship table maps every input row (input · sheet · play · ref)', () => {
    const w = mountPage()
    const rows = w.findAll('#write-to-result .map-table tbody tr')
    expect(rows.length).toBe(12)
    // the strongest playback-effect rows are highlighted
    expect(w.findAll('#write-to-result .map-table tbody tr.hot').length).toBeGreaterThanOrEqual(5)
  })

  it('has a single h1 and uses h2 for sections (heading order)', () => {
    const w = mountPage()
    expect(w.findAll('h1').length).toBe(1)
    expect(w.findAll('h2').length).toBeGreaterThanOrEqual(8) // §0–§7 + refs
  })

  it('references SSOT docs (song-model-v2 / golden-piano) without duplicating them', () => {
    const w = mountPage()
    const t = w.text()
    expect(t).toContain('song-model-v2.md')
    expect(t).toContain('golden-piano.md')
    // aligned-up international standards cited
    expect(t).toContain('Numbered musical notation')
  })
})

describe('Guide — trimmed to ② + short intro + bridge (rules moved to /notation)', () => {
  const mountGuide = () => mount(Guide, { global: { stubs } })

  it('keeps the ② how-to anchor and the short-note intro anchor', () => {
    const w = mountGuide()
    expect(w.find('#howto').exists()).toBe(true)
    expect(w.find('#notation').exists()).toBe(true)
  })

  it('no longer holds the detailed writing rules (no symbol table / no ♮-trap warn-box)', () => {
    const w = mountGuide()
    expect(w.find('.guide-table').exists()).toBe(false)
    expect(w.find('.warn-box').exists()).toBe(false)
    // the detailed combined-symbols / accidentals prose is gone from this page
    expect(w.text()).not.toContain('การผสมสัญลักษณ์')
    expect(w.text()).not.toContain('กับดักที่พบบ่อย')
  })

  it('has a bridge link to the song-makers guide (/notation)', () => {
    const w = mountGuide()
    const hrefs = w.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('#/notation')
  })
})
