// B095 (lock-fix) — the editor "หมวด" (category) field is LOCKED to exactly the 3 canonical
// books (เล่มใหญ่ / อนุชน / เด็กเล็ก). It is NOT flexible: `allow-custom` was removed from the
// หมวด ComboSelect, so a value not in the list must NOT stick (P'Aim 12 ก.ค., via PM). Extending
// the taxonomy is an admin job (B096, deferred), not a free-text field.
//
// These tests mount EditorMode itself (not a bare ComboSelect) so they exercise the REAL editor
// wiring — the same <ComboSelect v-model="meta.category" :options="CATEGORY_OPTIONS"> the author
// sees. A fake test that mounts a stand-alone ComboSelect without allow-custom would pass no
// matter what the editor renders, so we go through EditorMode on purpose.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import ComboSelect from './ComboSelect.vue'

// a minimal v2 song; no `category` field → editor defaults meta.category to 'anuchon'
const SONG = {
  id: 's1',
  number: 3,
  title_th: 'เพลงทดสอบ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

// mount the real editor with the real ComboSelect (only unrelated children stubbed)
function mountEd() {
  return mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true } }, // ComboSelect is REAL
  })
}

// the หมวด ComboSelect is the one wired to the 3 canonical books (CATEGORY_OPTIONS)
function categoryCombo(w) {
  return w.findAllComponents(ComboSelect).find((c) => {
    const opts = c.props('options')
    return Array.isArray(opts) && opts.length === 3 && opts[0]?.value === 'lem-yai'
  })
}

describe('หมวด ComboSelect in EditorMode — LOCKED to the 3 canonical books', () => {
  it('offers exactly the 3 canonical books, in order', async () => {
    const w = mountEd()
    await nextTick()
    const combo = categoryCombo(w)
    expect(combo).toBeTruthy()
    await combo.find('input').trigger('focus')
    const items = combo.findAll('.combo-item').map((n) => n.text())
    expect(items).toEqual(['เล่มใหญ่', 'อนุชน', 'เด็กเล็ก'])
    w.unmount()
  })

  it('picking a book updates the model to its code', async () => {
    const w = mountEd()
    await nextTick()
    const combo = categoryCombo(w)
    await combo.find('input').trigger('focus')
    await combo.findAll('.combo-item')[0].trigger('mousedown') // เล่มใหญ่
    expect(combo.props('modelValue')).toBe('lem-yai')
    w.unmount()
  })

  it('LOCK: an off-list value ("เยาวชน") does NOT stick — reverts to a book after blur', async () => {
    vi.useFakeTimers()
    const w = mountEd()
    await nextTick()
    const combo = categoryCombo(w)
    expect(combo.props('modelValue')).toBe('anuchon') // default book before we type
    const input = combo.find('input')
    await input.trigger('focus')
    await input.setValue('เยาวชน') // a name not in the 3 books — must be rejected
    await input.trigger('blur')
    vi.runAllTimers()
    await nextTick()
    // the combo never emitted the off-list value, and the model is still a canonical book
    const emitted = combo.emitted('update:modelValue') || []
    expect(emitted.flat()).not.toContain('เยาวชน')
    expect(combo.props('modelValue')).toBe('anuchon')
    expect(['lem-yai', 'anuchon', 'dek-lek']).toContain(combo.props('modelValue'))
    // the input text snapped back to the selected book's label, not the typed junk
    expect(input.element.value).toBe('อนุชน')
    w.unmount()
    vi.useRealTimers()
  })
})
