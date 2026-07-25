// item 6 — ComboSelect can delegate matching+ordering to a real engine (:rank-fn), so the song
// picker reaches songSearch's note-aware / fuzzy / book-ref ranking instead of a plain substring
// (a substring can't find "5561" inside "5 5 6 1"). This proves the delegation: the rendered list
// is exactly what rankFn returns, in that order — not ComboSelect's own `.includes` filter.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ComboSelect from './ComboSelect.vue'

const opts = [
  { value: 1, label: '1. เพลงหนึ่ง', search: 'เพลงหนึ่ง 5 5 6 1' },
  { value: 2, label: '2. เพลงสอง', search: 'เพลงสอง 1 2 3' },
  { value: 3, label: '3. เพลงสาม', search: 'เพลงสาม 5 5 6 1 3' },
]

describe('ComboSelect :rank-fn', () => {
  it('delegates to rankFn and renders exactly its ids, in order', async () => {
    // a fake engine that only "matches" the note query and ranks song 3 before song 1
    const rankFn = (q) => (q.replace(/\s/g, '') === '5561' ? [3, 1] : [])
    const w = mount(ComboSelect, { props: { options: opts, rankFn, ariaLabel: 'ค้นหา' } })
    await w.find('input').trigger('focus')
    await w.find('input').setValue('5561')
    await nextTick()
    const items = w.findAll('.combo-item').map((el) => el.text())
    expect(items).toEqual(['3. เพลงสาม', '1. เพลงหนึ่ง']) // rankFn order, substring would find neither
  })

  it('with no rankFn it keeps the built-in substring filter (unchanged)', async () => {
    const w = mount(ComboSelect, { props: { options: opts, ariaLabel: 'ค้นหา' } })
    await w.find('input').trigger('focus')
    await w.find('input').setValue('สอง')
    await nextTick()
    const items = w.findAll('.combo-item').map((el) => el.text())
    expect(items).toEqual(['2. เพลงสอง'])
  })

  it('picking a ranked result emits its value', async () => {
    const rankFn = () => [3, 1]
    const w = mount(ComboSelect, { props: { options: opts, rankFn, ariaLabel: 'ค้นหา' } })
    await w.find('input').trigger('focus')
    await w.find('input').setValue('x')
    await nextTick()
    await w.findAll('.combo-item')[0].trigger('mousedown')
    expect(w.emitted('update:modelValue')[0]).toEqual([3])
  })
})
