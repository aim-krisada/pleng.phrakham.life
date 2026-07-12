// B095 — the editor "หมวด" (category) ComboSelect must be LOCKED to the 3 canonical books
// (เล่มใหญ่ / อนุชน / เด็กเล็ก): editors pick one, and typing a code that isn't in the list
// must NOT become the value. EditorMode renders this exact combo WITHOUT `allow-custom`, so
// these tests pin that behaviour at the component level (the editor page itself is behind
// team login). Contrast case: WITH `allow-custom` the typed text would stick — proving the
// removal of `allow-custom` is what enforces the lock.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ComboSelect from './ComboSelect.vue'

// Mirrors EditorMode.vue CATEGORY_OPTIONS (the 3 books) — kept in sync by intent.
const CATEGORY_OPTIONS = [
  { value: 'lem-yai', label: 'เล่มใหญ่' },
  { value: 'anuchon', label: 'อนุชน' },
  { value: 'dek-lek', label: 'เด็กเล็ก' },
]

const mountCombo = (props = {}) =>
  mount(ComboSelect, { props: { options: CATEGORY_OPTIONS, modelValue: '', ...props } })

describe('หมวด ComboSelect — locked to the 3 books (no allow-custom)', () => {
  it('offers exactly the 3 canonical books, in order', async () => {
    const w = mountCombo()
    await w.find('input').trigger('focus')
    const items = w.findAll('.combo-item').map((n) => n.text())
    expect(items).toEqual(['เล่มใหญ่', 'อนุชน', 'เด็กเล็ก'])
  })

  it('picking a book emits its code', async () => {
    const w = mountCombo()
    await w.find('input').trigger('focus')
    await w.findAll('.combo-item')[2].trigger('mousedown') // เด็กเล็ก
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['dek-lek'])
  })

  it('typing a code NOT in the list never becomes the value (blur reverts)', async () => {
    vi.useFakeTimers()
    const w = mountCombo({ modelValue: 'anuchon' })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('yuwachon') // an old/removed code — must not stick
    await input.trigger('blur')
    vi.runAllTimers()
    await w.vm.$nextTick()
    // no custom value was emitted; the field snaps back to the current selection label
    const emits = w.emitted('update:modelValue') || []
    expect(emits.some((e) => e[0] === 'yuwachon')).toBe(false)
    expect(input.element.value).toBe('อนุชน')
    vi.useRealTimers()
  })

  it('CONTRAST: with allow-custom the typed code WOULD stick — so removing it is the lock', async () => {
    vi.useFakeTimers()
    const w = mountCombo({ modelValue: 'anuchon', allowCustom: true })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('yuwachon')
    await input.trigger('blur')
    vi.runAllTimers()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['yuwachon'])
    vi.useRealTimers()
  })
})
