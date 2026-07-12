// B095 — the editor "หมวด" (category) ComboSelect offers the 3 canonical books
// (เล่มใหญ่ / อนุชน / เด็กเล็ก) as the main choices, but stays FLEXIBLE, not a hard cage:
// `allow-custom` is kept on so a name can still be nurtured/extended (a rename, or a 4th
// book) without a code change ("เลี้ยงได้", P'Aim 12 ก.ค.). These tests pin both halves:
// the 3 books are the offered options, AND a custom value still sticks.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ComboSelect from './ComboSelect.vue'

// Mirrors EditorMode.vue CATEGORY_OPTIONS (the 3 books) — kept in sync by intent.
const CATEGORY_OPTIONS = [
  { value: 'lem-yai', label: 'เล่มใหญ่' },
  { value: 'anuchon', label: 'อนุชน' },
  { value: 'dek-lek', label: 'เด็กเล็ก' },
]

// The editor renders it WITH allow-custom (flexible).
const mountCombo = (props = {}) =>
  mount(ComboSelect, { props: { options: CATEGORY_OPTIONS, allowCustom: true, modelValue: '', ...props } })

describe('หมวด ComboSelect — 3 canonical books, but flexible ("เลี้ยงได้")', () => {
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

  it('stays flexible: a custom book name still sticks (not locked to the 3)', async () => {
    vi.useFakeTimers()
    const w = mountCombo({ modelValue: 'anuchon' })
    const input = w.find('input')
    await input.trigger('focus')
    await input.setValue('เยาวชน') // a name not in the list — must be allowed
    await input.trigger('blur')
    vi.runAllTimers()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['เยาวชน'])
    vi.useRealTimers()
  })
})
