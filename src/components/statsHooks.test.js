// พี่เอม 18 พ.ย. 2569 — the buttons that feed the new หน้าสถิติ counts really call the counter.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const calls = vi.hoisted(() => [])
vi.mock('../lib/analytics.js', async (orig) => ({
  ...(await orig()),
  trackFeature: (f) => calls.push(['feature', f]),
  trackAction: (a, id) => calls.push(['action', a, id]),
}))
import LangToggle from './LangToggle.vue'
import FavStar from './FavStar.vue'
import { setSongLangChoice } from '../store.js'
import { _reloadFavorites } from '../lib/favorites.js'

beforeEach(() => {
  calls.length = 0
  localStorage.clear()
  _reloadFavorites()
  setSongLangChoice(['th'])
})

describe('counters behind the buttons', () => {
  it('switching English or Chinese ON counts once; switching off, Thai, or the editor does not', async () => {
    const w = mount(LangToggle, { props: { has: ['th', 'en', 'zh'] } })
    await w.find('[data-lang="en"]').trigger('click') // on
    await w.find('[data-lang="en"]').trigger('click') // off
    await w.find('[data-lang="zh"]').trigger('click') // on
    await w.find('[data-lang="th"]').trigger('click') // Thai
    expect(calls).toEqual([['feature', 'lang_en'], ['feature', 'lang_zh']])
    calls.length = 0
    setSongLangChoice(['th'])
    const ed = mount(LangToggle, { props: { has: ['th', 'en'], editor: true } })
    await ed.find('[data-lang="en"]').trigger('click')
    expect(calls).toEqual([])
  })

  it('a star counts when it is given, not when it is taken off', async () => {
    const w = mount(FavStar, { props: { id: 's9', title: 'เพลง' } })
    await w.find('button').trigger('click')
    await w.find('button').trigger('click')
    expect(calls).toEqual([['action', 'star', 's9']])
  })
})
