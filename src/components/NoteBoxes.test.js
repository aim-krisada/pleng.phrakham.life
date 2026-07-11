// NoteBoxes — ID-card note entry (one small box per note token). B084: Space must SPLIT
// at the caret (พี่เปา: type "345", move the "5" out) — not just jump to the next box.
// Follow-up (P'Aim): Space must RIPPLE exactly like the lyric box (EditorMode onSylKey) —
// always insert a box at the caret and push right, even with nothing after the caret.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NoteBoxes from './NoteBoxes.vue'

const mountT = (modelValue = '') =>
  mount(NoteBoxes, {
    props: { modelValue, 'onUpdate:modelValue': () => {} },
    attachTo: document.body, // real focus() needs the element in the document
  })

const inputs = (w) => w.findAll('input')

// Put the caret at `pos` in box `i`, then press Space (jsdom needs the value/caret set on
// the real element before the keydown fires, mirroring what a user typed).
async function spaceAt(w, i, pos) {
  const el = inputs(w)[i].element
  el.focus()
  el.setSelectionRange(pos, pos)
  await inputs(w)[i].trigger('keydown', { key: ' ' })
  await nextTick()
}

describe('NoteBoxes — Space splits/ripples at the caret (B084 + ripple follow-up)', () => {
  it('"345" with the caret before "5" splits into "34" | "5" and focuses the new box', async () => {
    const w = mountT('345')
    expect(inputs(w).map((n) => n.element.value)).toEqual(['345'])
    await spaceAt(w, 0, 2) // caret between "4" and "5"
    expect(inputs(w).map((n) => n.element.value)).toEqual(['34', '5'])
    expect(document.activeElement).toBe(inputs(w)[1].element)
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['34 5'])
    w.unmount()
  })

  it('caret at the end inserts an empty box after and ripples (like the lyric box)', async () => {
    const w = mountT('345')
    await spaceAt(w, 0, 3) // caret after "5"
    const vals = inputs(w).map((n) => n.element.value)
    expect(vals).toEqual(['345', ''])
    expect(document.activeElement).toBe(inputs(w)[1].element)
    w.unmount()
  })

  it('caret at the end of a MIDDLE box inserts an empty box in place and ripples right', async () => {
    const w = mountT('1 2')
    await spaceAt(w, 0, 1) // caret after "1" — a middle box, not the last
    expect(inputs(w).map((n) => n.element.value)).toEqual(['1', '', '2'])
    expect(document.activeElement).toBe(inputs(w)[1].element) // the fresh empty box
    w.unmount()
  })

  it('caret at the very start pushes the whole token to the new box', async () => {
    const w = mountT('345')
    await spaceAt(w, 0, 0)
    expect(inputs(w).map((n) => n.element.value)).toEqual(['', '345'])
    expect(document.activeElement).toBe(inputs(w)[1].element)
    w.unmount()
  })

  it('applies fixAccidental to the split parts ("4#5" caret@2 -> "#4" | "5")', async () => {
    const w = mountT('4#5')
    await spaceAt(w, 0, 2) // before "4#" | after "5"
    expect(inputs(w).map((n) => n.element.value)).toEqual(['#4', '5'])
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['#4 5'])
    w.unmount()
  })

  it('splits a middle box without disturbing its neighbours', async () => {
    const w = mountT('1 345 7')
    await spaceAt(w, 1, 2) // split the "345" box
    expect(inputs(w).map((n) => n.element.value)).toEqual(['1', '34', '5', '7'])
    expect(document.activeElement).toBe(inputs(w)[2].element)
    w.unmount()
  })
})

describe('NoteBoxes — unchanged behaviours still hold', () => {
  it('pasted spaces still split into boxes', async () => {
    const w = mountT('')
    const el = inputs(w)[0]
    el.element.value = '1 2 3'
    await el.trigger('input')
    expect(inputs(w).map((n) => n.element.value)).toEqual(['1', '2', '3'])
    w.unmount()
  })

  it('Backspace on an empty box removes it and steps back', async () => {
    const w = mountT('1 2')
    inputs(w)[1].element.value = ''
    await inputs(w)[1].trigger('keydown', { key: 'Backspace' })
    await nextTick()
    expect(inputs(w).map((n) => n.element.value)).toEqual(['1'])
    w.unmount()
  })

  it('Enter still advances to the next box (no split)', async () => {
    const w = mountT('345')
    const el = inputs(w)[0].element
    el.focus()
    el.setSelectionRange(2, 2)
    await inputs(w)[0].trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(inputs(w).map((n) => n.element.value)).toEqual(['345', ''])
    w.unmount()
  })
})
