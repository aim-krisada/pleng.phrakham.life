// G1 — the TYPING side of order-free. Modifiers typed in any order are sorted into the
// canonical form right away, and the box shows it happened (docs/ds/note-symbol-set.md
// §1.2.1: normalize while someone is there to see it — never behind their back).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NoteBoxes from './NoteBoxes.vue'

const mountT = (modelValue = '') =>
  mount(NoteBoxes, { props: { modelValue, 'onUpdate:modelValue': () => {} }, attachTo: document.body })

const inputs = (w) => w.findAll('input')

async function type(w, i, value) {
  const el = inputs(w)[i].element
  el.value = value
  await inputs(w)[i].trigger('input')
  await nextTick()
}

describe('typing modifiers in any order', () => {
  it.each([
    ['5^.', '5.^'],
    ['#4^_', '#4_^'],
    ['.#4', '#.4'],
    ['4#', '#4'], // the old fixAccidental case still works
    ['_^#4', '#4_^'],
  ])('%s becomes %s in the box and in the emitted value', async (typed, canonical) => {
    const w = mountT('')
    await type(w, 0, typed)
    expect(inputs(w)[0].element.value).toBe(canonical)
    expect(w.emitted('update:modelValue').at(-1)).toEqual([canonical])
    w.unmount()
  })

  it('leaves a box it cannot read alone, so the error stays loud', async () => {
    const w = mountT('')
    await type(w, 0, '5x')
    expect(inputs(w)[0].element.value).toBe('5x')
    w.unmount()
  })

  it('does not touch a box that is already canonical', async () => {
    const w = mountT('')
    await type(w, 0, '#4_^')
    expect(inputs(w)[0].element.value).toBe('#4_^')
    expect(w.find('input').classes()).not.toContain('tidied')
    w.unmount()
  })
})

describe('the tidy-up is visible, not silent', () => {
  it('marks the box and announces the form it was tidied into', async () => {
    const w = mountT('')
    await type(w, 0, '5^.')
    const el = inputs(w)[0]
    expect(el.classes()).toContain('tidied')
    expect(el.attributes('title')).toContain('5.^')
    expect(w.find('[role="status"]').text()).toContain('5.^')
    w.unmount()
  })

  it('splitting a box with Space tidies each part and flags the one that changed', async () => {
    const w = mountT('5^.7')
    const el = inputs(w)[0].element
    el.focus()
    el.setSelectionRange(3, 3) // "5^." | "7"
    await inputs(w)[0].trigger('keydown', { key: ' ' })
    await nextTick()
    expect(inputs(w).map((n) => n.element.value)).toEqual(['5.^', '7'])
    expect(inputs(w)[0].classes()).toContain('tidied')
    expect(inputs(w)[1].classes()).not.toContain('tidied')
    w.unmount()
  })
})
