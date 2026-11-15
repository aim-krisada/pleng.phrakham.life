import { describe, it, expect } from 'vitest'
import { songBookName } from './bookshelf.js'

// พี่เอม 15 พ.ย. 2569 — a search card says which เล่ม the song comes from
describe('songBookName', () => {
  it('names the เล่ม', () => {
    expect(songBookName({ category: 'lem-yai' })).toBe('เล่มใหญ่')
    expect(songBookName({ category: ' anuchon ' })).toBe('อนุชน')
  })
  it('an unmapped code shows as it is; none → ยังไม่จัดเล่ม', () => {
    expect(songBookName({ category: 'new-book' })).toBe('new-book')
    expect(songBookName({ category: '' })).toBe('ยังไม่จัดเล่ม')
    expect(songBookName({})).toBe('ยังไม่จัดเล่ม')
  })
})
