// ใบ v3/pleng#135 — the volume panel, and the listener's side of it in เสียงดนตรี (SoundControl + store).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const q = {}
  for (const m of ['select', 'eq', 'limit', 'upsert']) q[m] = () => q
  q.then = (res) => Promise.resolve({ data: [{ value: { melody: 140, chord: 70, linked: true } }], error: null }).then(res)
  return { supabase: { from: () => q, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }
})

import VolumePanel from './VolumePanel.vue'
import SoundControl from './SoundControl.vue'
import { listenerVolume, siteVolume, playVolume, resetListenerVolume, loadSiteVolume } from '../store.js'
import { onLevels } from '../lib/volume.js'

const sliders = (w) => w.findAll('input[type="range"]')

describe('ใบ#135 — VolumePanel', () => {
  it('two sliders (เสียงโน้ต · เสียงคอร์ด) with their percent, a link button and a reset', () => {
    const w = mount(VolumePanel, { props: { value: { melody: 120, chord: 80, linked: true } }, global: { stubs: { Icon: true } } })
    expect(w.findAll('.vp-label').map((x) => x.text())).toEqual(['เสียงโน้ต', 'เสียงคอร์ด'])
    expect(w.findAll('.vp-val').map((x) => x.text())).toEqual(['120%', '80%'])
    expect(w.find('.vp-link').attributes('aria-pressed')).toBe('true')
    expect(w.find('.vp-reset').exists()).toBe(true)
  })
  it('linked: moving one slider moves the other in proportion', async () => {
    const w = mount(VolumePanel, { props: { value: { melody: 100, chord: 50, linked: true } }, global: { stubs: { Icon: true } } })
    await sliders(w)[0].setValue('150')
    expect(w.emitted('update').at(-1)[0]).toEqual({ melody: 150, chord: 75, linked: true })
  })
  it('the link button switches linking off (and says so)', async () => {
    const w = mount(VolumePanel, { props: { value: { melody: 100, chord: 50, linked: true } }, global: { stubs: { Icon: true } } })
    await w.find('.vp-link').trigger('click')
    expect(w.emitted('update').at(-1)[0].linked).toBe(false)
    expect(w.emitted('commit').at(-1)[0].linked).toBe(false)
  })
  it('letting go of a slider is a commit (the approver side saves there)', async () => {
    const w = mount(VolumePanel, { props: { value: { melody: 100, chord: 50, linked: false } }, global: { stubs: { Icon: true } } })
    await sliders(w)[1].trigger('change')
    expect(w.emitted('commit')).toHaveLength(1)
  })
  it('let go in the same tick as the last move: the commit carries the value just set, not the one before', () => {
    const w = mount(VolumePanel, { props: { value: { melody: 100, chord: 100, linked: true } }, global: { stubs: { Icon: true } } })
    const s = sliders(w)[0]
    s.element.value = '150'
    s.element.dispatchEvent(new Event('input'))
    s.element.dispatchEvent(new Event('change')) // no re-render in between — the owner has not answered yet
    expect(w.emitted('commit').at(-1)[0]).toEqual({ melody: 150, chord: 150, linked: true })
  })
  it('the reset button is off when there is nothing to reset', () => {
    const w = mount(VolumePanel, { props: { value: { melody: 100, chord: 100, linked: true }, canReset: false }, global: { stubs: { Icon: true } } })
    expect(w.find('.vp-reset').attributes('disabled')).toBeDefined()
  })
})

describe('ใบ#135 — the listener\'s panel in เสียงดนตรี', () => {
  beforeEach(() => {
    resetListenerVolume()
    siteVolume.value = null
    localStorage.clear()
  })
  const mountSC = () => mount(SoundControl, { props: { open: true, groups: [] }, global: { stubs: { Icon: true } } })

  it('someone who never set a level follows the site default, read from the server', async () => {
    await loadSiteVolume({ force: true })
    const w = mountSC()
    await nextTick()
    expect(playVolume.value).toEqual({ melody: 140, chord: 70, linked: true })
    expect(w.findAll('.vp-val').map((x) => x.text())).toEqual(['140%', '70%'])
    expect(w.find('.vp-note').text()).toBe('ตามค่าเริ่มต้นของเว็บ')
    expect(w.find('.vp-reset').attributes('disabled')).toBeDefined()
  })
  it('moving a slider makes it their own: kept in this browser, wins over the site, and is heard at once', async () => {
    siteVolume.value = { melody: 140, chord: 70, linked: true }
    const heard = []
    const off = onLevels((l) => heard.push(l))
    const w = mountSC()
    await sliders(w)[0].setValue('100') // linked: 140→100 takes chords 70→50
    expect(listenerVolume.value).toEqual({ melody: 100, chord: 50, linked: true })
    expect(JSON.parse(localStorage.getItem('pleng.volume.v1'))).toEqual({ melody: 100, chord: 50, linked: true })
    expect(heard.at(-1)).toEqual({ melody: 1, chord: 0.5 })
    // the approver changes the site default later — this listener keeps their own
    siteVolume.value = { melody: 180, chord: 90, linked: true }
    expect(playVolume.value).toEqual({ melody: 100, chord: 50, linked: true })
    await nextTick()
    expect(w.find('.vp-note').text()).toContain('ตั้งเองแล้ว')
    off()
  })
  it('คืนค่าเริ่มต้น drops their own level, and they follow the site again', async () => {
    siteVolume.value = { melody: 140, chord: 70, linked: true }
    const w = mountSC()
    await sliders(w)[1].setValue('20')
    expect(listenerVolume.value).not.toBe(null)
    await w.find('.vp-reset').trigger('click')
    expect(listenerVolume.value).toBe(null)
    expect(localStorage.getItem('pleng.volume.v1')).toBe(null)
    expect(playVolume.value).toEqual({ melody: 140, chord: 70, linked: true })
  })
})
