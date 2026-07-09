// FontTool — the top-nav "Aa" reader-text-size control (B043). Shown only while a song is
// open; drives the global store.readingFontScale (A− [%] A+ + reset). Mirrors phrakham.life.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FontTool from './FontTool.vue'
import { currentSong, readingFontScale } from '../store.js'

const mountT = () => mount(FontTool, { global: { stubs: { Icon: true } } })

beforeEach(() => {
  localStorage.clear()
  readingFontScale.value = 1
  currentSong.value = { number: 1, title_th: 'x', content: {} }
})

describe('FontTool (Aa)', () => {
  it('is hidden until a song is open', async () => {
    currentSong.value = null
    const w = mountT()
    expect(w.find('.ft-btn').exists()).toBe(false)
    currentSong.value = { number: 2, title_th: 'y', content: {} }
    await nextTick()
    expect(w.find('.ft-btn').exists()).toBe(true)
  })

  it('A− / A+ change the global scale; the popup shows the %', async () => {
    const w = mountT()
    await w.find('.ft-btn').trigger('click')
    await nextTick()
    expect(w.find('.ft-pct').text()).toBe('100%')
    await w.find('[aria-label="ตัวใหญ่ขึ้น"]').trigger('click')
    expect(readingFontScale.value).toBeCloseTo(1.1, 5)
    expect(w.find('.ft-pct').text()).toBe('110%')
    await w.find('[aria-label="ตัวเล็กลง"]').trigger('click')
    await w.find('[aria-label="ตัวเล็กลง"]').trigger('click')
    expect(readingFontScale.value).toBeCloseTo(0.9, 5)
  })

  it('reset returns to 100%', async () => {
    readingFontScale.value = 1.6
    const w = mountT()
    await w.find('.ft-btn').trigger('click')
    await nextTick()
    await w.find('.ft-reset').trigger('click')
    expect(readingFontScale.value).toBe(1)
  })

  it('clamps at the 80%–220% ends (buttons disable)', async () => {
    readingFontScale.value = 2.2
    const w = mountT()
    await w.find('.ft-btn').trigger('click')
    await nextTick()
    expect(w.find('[aria-label="ตัวใหญ่ขึ้น"]').attributes('disabled')).toBeDefined()
    expect(w.find('.ft-pct').text()).toBe('220%')
  })
})
