// P'Pao hotfix — the chord field uses ComboSelect with `allow-custom` + a `validate` fn so the
// user can TYPE any standard chord (not just quick-pick items). These tests exercise the generic
// gate on a bare ComboSelect: a value that passes `validate` commits; junk is rejected and the
// field snaps back. (The category field, which has NO allow-custom, is covered separately.)
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { parseChord } from '../lib/chords.js'
import ComboSelect from './ComboSelect.vue'

const OPTIONS = [
  { value: '', label: '— none —' },
  { value: 'C', label: 'C' },
  { value: 'Am', label: 'Am' },
]
const isValidChord = (t) => parseChord(t) != null

function mountCombo() {
  return mount(ComboSelect, {
    props: { modelValue: '', options: OPTIONS, allowCustom: true, validate: isValidChord },
    attachTo: document.body,
  })
}

describe('ComboSelect allow-custom + validate', () => {
  it('commits a valid custom chord on blur (F#m7b5)', async () => {
    vi.useFakeTimers()
    const w = mountCombo()
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('F#m7b5')
    await input.trigger('blur')
    vi.runAllTimers()
    expect((w.emitted('update:modelValue') || []).flat()).toContain('F#m7b5')
    w.unmount()
    vi.useRealTimers()
  })

  it('commits a valid custom chord on Enter (Cmaj7 — confirms the typed value)', async () => {
    const w = mountCombo()
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('Cmaj7')
    await input.trigger('keydown', { key: 'Enter' })
    expect((w.emitted('update:modelValue') || []).flat()).toContain('Cmaj7')
    w.unmount()
  })

  // P'Pao — Enter must "select/confirm" fully, keyboard-only. Two cases below.
  it('Enter picks the HIGHLIGHTED quick-pick item after arrowing (no mouse)', async () => {
    const w = mountCombo()
    const input = w.find('input')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'ArrowDown' }) // highlight first option: value ''
    await input.trigger('keydown', { key: 'ArrowDown' }) // highlight second: value 'C'
    await input.trigger('keydown', { key: 'Enter' })
    const emitted = (w.emitted('update:modelValue') || []).flat()
    expect(emitted[emitted.length - 1]).toBe('C') // picked the highlighted list item, not typed text
    w.unmount()
  })

  it('Enter after typing a filter + arrowing picks the highlighted match', async () => {
    const w = mount(ComboSelect, {
      props: { modelValue: '', options: [{ value: '', label: '— none —' }, { value: 'Am', label: 'Am' }, { value: 'Am7', label: 'Am7' }], allowCustom: true, validate: isValidChord },
      attachTo: document.body,
    })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('Am') // filters to Am, Am7
    await input.trigger('keydown', { key: 'ArrowDown' }) // highlight first filtered = Am
    await input.trigger('keydown', { key: 'ArrowDown' }) // highlight second filtered = Am7
    await input.trigger('keydown', { key: 'Enter' })
    const emitted = (w.emitted('update:modelValue') || []).flat()
    expect(emitted[emitted.length - 1]).toBe('Am7')
    w.unmount()
  })

  it('Enter confirms a typed custom value when nothing is highlighted', async () => {
    const w = mountCombo()
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('F#m7b5') // no arrowing, hi = -1
    await input.trigger('keydown', { key: 'Enter' })
    expect((w.emitted('update:modelValue') || []).flat()).toContain('F#m7b5')
    w.unmount()
  })

  it('Enter does nothing for invalid typed text (list stays, nothing committed)', async () => {
    const w = mountCombo()
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('Zzq')
    await input.trigger('keydown', { key: 'Enter' })
    expect((w.emitted('update:modelValue') || []).flat()).not.toContain('Zzq')
    w.unmount()
  })

  it('commits a slash chord (G/B)', async () => {
    const w = mountCombo()
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('G/B')
    await input.trigger('keydown', { key: 'Enter' })
    expect((w.emitted('update:modelValue') || []).flat()).toContain('G/B')
    w.unmount()
  })

  it('rejects junk on blur — no emit, snaps back to the selected label', async () => {
    vi.useFakeTimers()
    const w = mount(ComboSelect, {
      props: { modelValue: 'C', options: OPTIONS, allowCustom: true, validate: isValidChord },
      attachTo: document.body,
    })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('Hqz') // no valid root -> parseChord null
    await input.trigger('blur')
    vi.runAllTimers()
    await w.vm.$nextTick()
    expect((w.emitted('update:modelValue') || []).flat()).not.toContain('Hqz')
    expect(input.element.value).toBe('C') // reverted to the current value's label
    w.unmount()
    vi.useRealTimers()
  })

  it('rejects junk on Enter — no emit', async () => {
    const w = mountCombo()
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('123')
    await input.trigger('keydown', { key: 'Enter' })
    expect((w.emitted('update:modelValue') || []).flat()).not.toContain('123')
    w.unmount()
  })

  it('without validate, any non-empty custom text still commits (time-signature style)', async () => {
    vi.useFakeTimers()
    const w = mount(ComboSelect, {
      props: { modelValue: '4/4', options: ['4/4', '3/4'], allowCustom: true },
      attachTo: document.body,
    })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('7/16')
    await input.trigger('blur')
    vi.runAllTimers()
    expect((w.emitted('update:modelValue') || []).flat()).toContain('7/16')
    w.unmount()
    vi.useRealTimers()
  })
})
