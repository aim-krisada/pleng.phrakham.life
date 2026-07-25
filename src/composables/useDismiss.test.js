// useDismiss — the one shared "close this popover" behaviour (BI-016). These prove the four
// contract points every migrated menu relies on: outside-close, inside-safe, Esc + focus-return,
// and the `enabled` guard that lets a dirty form keep an accidental click from closing it.
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h, nextTick } from 'vue'
import { useDismiss } from './useDismiss.js'

function harness(extra = {}) {
  const open = ref(true)
  const Comp = defineComponent({
    setup() {
      const wrap = ref(null)
      const btn = ref(null)
      useDismiss(open, { inside: wrap, trigger: btn, onDismiss: () => { open.value = false }, ...extra })
      return () =>
        h('div', {}, [
          h('div', { ref: wrap, class: 'wrap' }, [
            h('button', { ref: btn, class: 'trig' }, 'open'),
            open.value ? h('div', { class: 'panel' }, [h('button', { class: 'item' }, 'x')]) : null,
          ]),
          h('button', { class: 'outside' }, 'outside'),
        ])
    },
  })
  return { open, w: mount(Comp, { attachTo: document.body }) }
}

const pointerDownOn = (el) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }))
const escOn = (el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

let wrapper
afterEach(() => { wrapper?.unmount(); wrapper = null })

describe('useDismiss', () => {
  it('closes on a pointerdown OUTSIDE the menu', async () => {
    const { open, w } = harness(); wrapper = w
    expect(open.value).toBe(true)
    pointerDownOn(w.find('.outside').element)
    await nextTick()
    expect(open.value).toBe(false)
  })

  it('does NOT close on a pointerdown INSIDE the panel or on the trigger', async () => {
    const { open, w } = harness(); wrapper = w
    pointerDownOn(w.find('.item').element) // inside the panel
    await nextTick()
    expect(open.value).toBe(true)
    pointerDownOn(w.find('.trig').element) // the trigger itself
    await nextTick()
    expect(open.value).toBe(true)
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const { open, w } = harness(); wrapper = w
    escOn(document)
    await nextTick()
    expect(open.value).toBe(false)
    expect(document.activeElement).toBe(w.find('.trig').element)
  })

  it('enabled:()=>false suppresses the OUTSIDE click but Esc still closes', async () => {
    const { open, w } = harness({ enabled: () => false }); wrapper = w
    pointerDownOn(w.find('.outside').element)
    await nextTick()
    expect(open.value).toBe(true) // outside-close was gated off (e.g. a dirty form)
    escOn(document)
    await nextTick()
    expect(open.value).toBe(false) // Esc ignores the gate
  })

  it('detaches its listeners once closed (no close-after-close, no leak)', async () => {
    const { open, w } = harness(); wrapper = w
    pointerDownOn(w.find('.outside').element)
    await nextTick()
    expect(open.value).toBe(false)
    // with the menu closed, a stray Escape must not throw or re-run anything
    expect(() => escOn(document)).not.toThrow()
    expect(open.value).toBe(false)
  })
})
