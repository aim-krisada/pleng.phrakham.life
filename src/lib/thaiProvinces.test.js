// ใบ v3/pleng#166 stat.05 — จังหวัด in Thai (พี่เอม 17 พ.ย. 2569)
import { describe, it, expect } from 'vitest'
import { thaiProvince, PROVINCE_COUNT } from './thaiProvinces.js'
import { regions } from './gaStats.js'

describe('Thai province names', () => {
  it('has all 77 provinces, each with its own Thai name', () => {
    expect(PROVINCE_COUNT).toBe(77)
  })

  it('reads the spellings Google uses, with or without "Province" and spaces', () => {
    expect(thaiProvince('Bangkok')).toBe('กรุงเทพมหานคร')
    expect(thaiProvince('Krung Thep Maha Nakhon')).toBe('กรุงเทพมหานคร')
    expect(thaiProvince('Chiang Mai Province')).toBe('เชียงใหม่')
    expect(thaiProvince('Chon Buri')).toBe('ชลบุรี')
    expect(thaiProvince('Chonburi')).toBe('ชลบุรี')
    expect(thaiProvince('Buriram')).toBe('บุรีรัมย์')
    expect(thaiProvince('Phra Nakhon Si Ayutthaya')).toBe('พระนครศรีอยุธยา')
    expect(thaiProvince('Ayutthaya')).toBe('พระนครศรีอยุธยา')
    expect(thaiProvince('Nakhon Ratchasima')).toBe('นครราชสีมา')
    expect(thaiProvince('Samut Prakan')).toBe('สมุทรปราการ')
    expect(thaiProvince('Si Sa Ket')).toBe('ศรีสะเกษ')
    expect(thaiProvince('Sisaket')).toBe('ศรีสะเกษ')
    expect(thaiProvince('Changwat Nonthaburi')).toBe('นนทบุรี')
  })

  it('a name not in the list stays as Google sent it, so it still shows', () => {
    expect(thaiProvince('Somewhere New Province')).toBe('Somewhere New')
  })

  it('two spellings of one province add up to one row on the card', () => {
    const r = regions({ reports: { regions: [[['Thailand', 'Chon Buri'], 2], [['Thailand', 'Chonburi Province'], 3]] } })
    expect(r.rows.map((x) => [x.name, x.n])).toEqual([['ชลบุรี', 5]])
  })
})
