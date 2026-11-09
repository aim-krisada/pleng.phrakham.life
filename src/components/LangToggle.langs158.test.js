// ใบ v1#158 — the shared language buttons (ไทย · English · 中文).
// One row, used by แผ่นเพลง, ฝึกร้อง and แก้ไข; one choice for all three, kept on this device.
import { describe, it, expect, beforeEach, vi } from 'vitest'

// store.js imports supabase at module load — stub it so nothing hits the network.
vi.mock('../supabase.js', () => ({ supabase: { auth: {}, from: () => ({}) } }))
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LangToggle from './LangToggle.vue'
import { songLangChoice, setSongLangChoice, readSongLangs } from '../store.js'

beforeEach(() => {
  setSongLangChoice(['th'])
})
const btn = (w, l) => w.find(`.lang-btn[data-lang="${l}"]`)

describe('LangToggle', () => {
  it('a song in one language shows no row at all', () => {
    const w = mount(LangToggle, { props: { has: ['th'] } })
    expect(w.find('.lang-row').exists()).toBe(false)
    expect(w.html()).not.toContain('lang-btn')
  })

  it('only the languages the song has get a button, in the fixed order', () => {
    const w = mount(LangToggle, { props: { has: ['en', 'th'] } })
    expect(w.findAll('.lang-btn').map((b) => b.text())).toEqual(['ไทย', 'English'])
  })

  it('multi-select: tapping English adds it next to Thai; the choice is shared (store)', async () => {
    const w = mount(LangToggle, { props: { has: ['th', 'en'] } })
    await btn(w, 'en').trigger('click')
    expect(songLangChoice.value).toEqual(['th', 'en'])
    expect(btn(w, 'th').attributes('aria-pressed')).toBe('true')
    expect(btn(w, 'en').attributes('aria-pressed')).toBe('true')
    // a second screen mounted later sees the same choice
    const other = mount(LangToggle, { props: { has: ['th', 'en'] } })
    expect(btn(other, 'en').attributes('aria-pressed')).toBe('true')
  })

  it('the last language on cannot be turned off', async () => {
    const w = mount(LangToggle, { props: { has: ['th', 'en'] } })
    expect(btn(w, 'th').attributes('aria-disabled')).toBe('true')
    await btn(w, 'th').trigger('click')
    expect(songLangChoice.value).toEqual(['th'])
    expect(btn(w, 'th').attributes('aria-pressed')).toBe('true')
  })

  it('says which chosen language the song lacks, and its buttons still work', async () => {
    setSongLangChoice(['th', 'zh'])
    const w = mount(LangToggle, { props: { has: ['th', 'en'] } })
    await nextTick()
    expect(w.find('.lang-note').text()).toBe('เพลงนี้ยังไม่มี 中文 · มี ไทย · English')
    await btn(w, 'en').trigger('click')
    expect(songLangChoice.value).toEqual(['th', 'en', 'zh'])
  })

  it('none of the chosen languages → the song’s own languages are shown', () => {
    setSongLangChoice(['zh'])
    const w = mount(LangToggle, { props: { has: ['th', 'en'] } })
    expect(btn(w, 'th').attributes('aria-pressed')).toBe('true')
    expect(btn(w, 'en').attributes('aria-pressed')).toBe('true')
  })

  it('editor: a Thai-only song offers + English / + 中文, which switch the language on', async () => {
    const w = mount(LangToggle, { props: { has: ['th'], editor: true } })
    expect(w.findAll('.lang-add').map((b) => b.text())).toEqual(['+ English', '+ 中文'])
    await w.find('[data-add-lang="en"]').trigger('click')
    expect(w.emitted('add')[0]).toEqual(['en'])
    expect(songLangChoice.value).toEqual(['th', 'en'])
  })
})

describe('the choice is kept on this device', () => {
  it('is saved to localStorage as a list under pleng.songLangs', async () => {
    setSongLangChoice(['en', 'th'])
    await nextTick()
    expect(JSON.parse(localStorage.getItem('pleng.songLangs'))).toEqual(['th', 'en'])
  })
  it('an unreadable or empty stored value falls back to Thai', () => {
    expect(readSongLangs(null)).toEqual(['th'])
    expect(readSongLangs('not json')).toEqual(['th'])
    expect(readSongLangs('[]')).toEqual(['th'])
    expect(readSongLangs('["zh","xx"]')).toEqual(['zh'])
  })
})
