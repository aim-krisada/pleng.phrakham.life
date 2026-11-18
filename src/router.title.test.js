// The tab (and so the printed PDF's name) says which page it is — P'Aim 18 พ.ย. 2569 (ใบ v3/pleng#163).
import { describe, it, expect } from 'vitest'
import router, { pageTitle } from './router.js'

describe('page title', () => {
  it('names each page after the site + page', () => {
    const t = (p) => pageTitle(router.resolve(p))
    expect(t('/stats')).toBe('เพลง.พระคำ.ชีวิต - สถิติ')
    expect(t('/about')).toBe('เพลง.พระคำ.ชีวิต - เกี่ยวกับเรา')
    expect(t('/guide')).toBe('เพลง.พระคำ.ชีวิต - คู่มือใช้งานโปรแกรม')
    expect(t('/notation')).toBe('เพลง.พระคำ.ชีวิต - คู่มือทำเพลง')
  })
  it('sets the tab title on navigation, and back to the site title on the list', async () => {
    const site = document.title
    await router.push('/stats')
    expect(document.title).toBe('เพลง.พระคำ.ชีวิต - สถิติ')
    await router.push('/')
    expect(document.title).toBe(site)
  })
})
