// พี่เอม 18 พ.ย. 2569 — "ถ้าทำที่เดียวกันมันก็จะต้องเปลี่ยนที่เดียวและทุกที่ได้หมด":
// every list of songs on the home page draws its rows with SongRow.vue, never its own copy.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mount } from '@vue/test-utils'

vi.mock('vue-router', () => ({ useRouter: () => ({ push() {} }) }))
import SongRow from './SongRow.vue'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIST = readFileSync(join(HERE, '..', 'views', 'SongList.vue'), 'utf8')
const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a :href="to"><slot /></a>' }
const song = (lyrics) => ({
  id: 'x', number: 7, title_th: 'ดวงตะวัน', verified: true,
  content: { version: 2, key: 'D', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }],
    arrangement: [{ stanza: 'A', syllables: ['ดวง', 'ตะวัน'], ...(lyrics ? { lyrics } : {}) }] },
})
const row = (s, loggedIn = false) => mount(SongRow, { props: { song: s, loggedIn }, global: { stubs: { RouterLink, 'router-link': RouterLink } } })

describe('one song row for every list', () => {
  it('the book, เพลงที่ชอบ and a sent list all use SongRow — no list keeps its own row', () => {
    for (const list of ['inBook', 'incomingSongs', 'favList']) {
      expect(LIST).toMatch(new RegExp(`<SongRow v-for="s in ${list}"`))
    }
    expect(LIST).not.toMatch(/<router-link[^>]*class="song-row"/)
  })

  it('a row shows number, title, languages and key; ✏️ only when logged in', () => {
    const w = row(song({ en: ['Sun', 'shine'] }))
    expect(w.find('.no').text()).toBe('7')
    expect(w.find('.ttl').text()).toBe('ดวงตะวัน')
    expect(w.find('.lang').attributes('aria-label')).toBe('ภาษา ไทย · English')
    expect(w.find('.key').text()).toBe('คีย์ D')
    expect(w.find('.row-edit').exists()).toBe(false)
    expect(row(song(), true).find('.row-edit').exists()).toBe(true)
  })

  it('a Thai-only song has no language label', () => {
    expect(row(song()).find('.lang').exists()).toBe(false)
  })
})
