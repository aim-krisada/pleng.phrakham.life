// B095 (fix) — the editor "หมวด" (category) ComboSelect offers ONLY the 3 canonical books
// (เล่มใหญ่ / อนุชน / เด็กเล็ก) and is a HARD LOCK: `allow-custom` is OFF so a value typed
// outside the list is rejected on blur and the previous value is kept (data-integrity —
// guards against misspelled book names). P'Aim 12 ก.ค. via PM = ล็อก 3 เล่ม. These tests pin
// both halves: the 3 books are the offered options, AND an off-list value never sticks.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ComboSelect from './ComboSelect.vue'

// Mirrors EditorMode.vue CATEGORY_OPTIONS (the 3 books) — kept in sync by intent.
const CATEGORY_OPTIONS = [
  { value: 'lem-yai', label: 'เล่มใหญ่' },
  { value: 'anuchon', label: 'อนุชน' },
  { value: 'dek-lek', label: 'เด็กเล็ก' },
]

// The editor renders it WITHOUT allow-custom (locked) — matches EditorMode.vue.
const mountCombo = (props = {}) =>
  mount(ComboSelect, { props: { options: CATEGORY_OPTIONS, modelValue: '', ...props } })

describe('หมวด ComboSelect — locked to the 3 canonical books', () => {
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

  it('locked: an off-list value never sticks — previous value is kept', async () => {
    vi.useFakeTimers()
    const w = mountCombo({ modelValue: 'anuchon' })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('เยาวชน') // a name not in the list — must be REJECTED
    await input.trigger('blur')
    vi.runAllTimers()
    await w.vm.$nextTick()
    // No new emit off-list; and the input reverts to the current selection's label.
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(input.element.value).toBe('อนุชน')
    vi.useRealTimers()
  })

  it('locked: a latin off-list value (e.g. "yuwachon") is rejected too', async () => {
    vi.useFakeTimers()
    const w = mountCombo({ modelValue: 'lem-yai' })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('yuwachon')
    await input.trigger('blur')
    vi.runAllTimers()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(input.element.value).toBe('เล่มใหญ่')
    vi.useRealTimers()
  })
})
