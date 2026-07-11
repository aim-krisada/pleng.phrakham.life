// Self-test for the reusable ui-invariants helper. Uses a synthetic fixture (NOT any real
// component) so the helper is proven correct + reusable on its own — independent of DockKey.
// Real components import these same functions in their *.invariants.test.js.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  axeViolations,
  expectNoAxeViolations,
  caretOnTriggerViolations,
  openPopups,
  popupHeaderProse,
  pressEscape,
  pressKey,
  focusables,
  hasLayout,
  noScroll,
  smallTargets,
} from './ui-invariants.js'

// A minimal, ACCESSIBLE popup toolbar: a labelled trigger with aria-expanded, a popup that
// Esc closes. Toggle `bad` to inject the exact violations ui-standards forbids.
const Fixture = defineComponent({
  props: { bad: { type: Boolean, default: false } },
  setup(props) {
    const open = ref(false)
    const onKey = (e) => { if (e.key === 'Escape') open.value = false }
    return () =>
      h('div', { class: 'fx-host', onKeydown: onKey }, [
        h('button',
          { class: 'trig', 'aria-label': 'คีย์', 'aria-expanded': String(open.value), onClick: () => (open.value = !open.value) },
          [ h('span', 'C'), props.bad ? h('span', { class: 'dk-caret' }, '▾') : null ],
        ),
        open.value
          ? h('div', { class: 'dk-pop', role: 'menu' }, [
              props.bad ? h('div', { class: 'dk-ptitle' }, 'เลือกได้ที่นี่ · วิธีใช้…') : null,
              h('button', { class: 'dk-ddrow', role: 'menuitemradio', 'aria-checked': 'true' }, 'C'),
            ])
          : null,
        // an unlabelled icon-only button → axe "button must have accessible name" when bad
        props.bad ? h('button', { class: 'nolabel' }) : h('button', { 'aria-label': 'ปิด' }, '×'),
      ])
  },
})

const mountFx = (bad = false) => mount(Fixture, { props: { bad }, attachTo: document.body })

describe('ui-invariants helper — TIER A (jsdom-trustworthy)', () => {
  it('axe: clean fixture has zero WCAG violations', async () => {
    const w = mountFx(false)
    // open the popup so its contents are covered too
    await w.find('.trig').trigger('click')
    await expectNoAxeViolations(w)
  })

  it('axe: catches an unlabelled control (accessible-name) in the bad fixture', async () => {
    const w = mountFx(true)
    const v = await axeViolations(w)
    expect(v.some((r) => r.id === 'button-name')).toBe(true)
  })

  it('caretOnTriggerViolations: clean = none, bad = the caret trigger by label', async () => {
    const good = mountFx(false)
    await good.find('.trig').trigger('click')
    expect(caretOnTriggerViolations(good)).toEqual([])

    const bad = mountFx(true)
    await bad.find('.trig').trigger('click')
    expect(caretOnTriggerViolations(bad)).toContain('คีย์')
  })

  it('openPopups: none when closed, exactly one when opened', async () => {
    const w = mountFx(false)
    expect(openPopups(w)).toHaveLength(0)
    await w.find('.trig').trigger('click')
    expect(openPopups(w)).toHaveLength(1)
  })

  it('popupHeaderProse: flags a how-to header, silent when the header is absent', async () => {
    const bad = mountFx(true)
    await bad.find('.trig').trigger('click')
    expect(popupHeaderProse(bad).join()).toMatch(/วิธีใช้/)

    const good = mountFx(false)
    await good.find('.trig').trigger('click')
    expect(popupHeaderProse(good)).toEqual([])
  })

  it('pressEscape closes the popup (keyboard dismissible)', async () => {
    const w = mountFx(false)
    await w.find('.trig').trigger('click')
    expect(openPopups(w)).toHaveLength(1)
    pressKey(w.find('.fx-host'), 'Escape')
    await w.vm.$nextTick()
    expect(openPopups(w)).toHaveLength(0)
  })

  it('focusables: finds the reachable controls', async () => {
    const w = mountFx(false)
    expect(focusables(w).length).toBeGreaterThanOrEqual(1)
    expect(focusables(w).every((n) => n.tagName === 'BUTTON' || n.tabIndex >= 0)).toBe(true)
  })
})

describe('ui-invariants helper — TIER B (guards on layout, honest in jsdom)', () => {
  it('hasLayout is false under jsdom (so Tier-B never fakes a pass)', () => {
    const w = mountFx(false)
    expect(hasLayout(w.element)).toBe(false)
  })

  it('noScroll reports available:false in jsdom (spec must skip, not pass)', () => {
    const w = mountFx(false)
    expect(noScroll(w).available).toBe(false)
  })

  it('smallTargets reports available:false in jsdom', () => {
    const w = mountFx(false)
    expect(smallTargets(w).available).toBe(false)
  })
})
