// ใบ v3/pleng#135 — the approver's side: the site's default volume, set from the profile menu with the
// SAME panel a listener sees, saved to the server when a slider is let go. Others never see it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const writes = []
let upsertError = null
vi.mock('../supabase.js', () => {
  const q = {}
  for (const m of ['select', 'eq', 'limit']) q[m] = () => q
  q.upsert = (row) => { writes.push(row); return Promise.resolve({ error: upsertError }) }
  q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
  return { supabase: { from: () => q, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }
})

import ProfileTool from './ProfileTool.vue'
import { session, profile, siteVolume, playVolume, resetListenerVolume } from '../store.js'

async function openMenu(role) {
  session.value = { user: { email: 'pow@example.com' } }
  profile.value = { display_name: 'พี่เปา', role }
  const w = mount(ProfileTool, { global: { stubs: { Icon: true } } })
  await w.find('.avatar-btn').trigger('click')
  return w
}
const siteVolButton = (w) => w.findAll('.menu-actions > button').find((b) => b.text() === 'ระดับเสียงเริ่มต้นของเว็บ')

beforeEach(() => {
  writes.length = 0
  upsertError = null
  siteVolume.value = null
  resetListenerVolume()
})

describe('ใบ#135 — site default volume in the profile menu', () => {
  it('an editor (not an approver) does not see it', async () => {
    const w = await openMenu('editor')
    expect(siteVolButton(w)).toBeUndefined()
  })
  it('an approver opens the same panel, at today\'s level while nothing is saved', async () => {
    const w = await openMenu('approver')
    await siteVolButton(w).trigger('click')
    expect(w.findAll('.site-vol .vp-label').map((x) => x.text())).toEqual(['เสียงโน้ต', 'เสียงคอร์ด'])
    expect(w.findAll('.site-vol .vp-val').map((x) => x.text())).toEqual(['100%', '100%'])
  })
  it('dragging is heard at once; letting go saves it for everyone', async () => {
    const w = await openMenu('approver')
    await siteVolButton(w).trigger('click')
    const melody = w.findAll('.site-vol input[type="range"]')[0]
    // a drag = `input` events only (setValue would also fire `change`, i.e. let go)
    melody.element.value = '150'
    await melody.trigger('input') // linked → chords follow to 150
    expect(playVolume.value).toEqual({ melody: 150, chord: 150, linked: true }) // the approver hears it now
    expect(writes).toHaveLength(0) // nothing stored while dragging
    await melody.trigger('change')
    await nextTick()
    await nextTick()
    expect(writes.at(-1)).toEqual({ key: 'playback_volume', value: { melody: 150, chord: 150, linked: true } })
    expect(w.find('.site-vol .ok').text()).toContain('บันทึกแล้ว')
  })
  it('when the table is not installed yet, the approver is told so plainly', async () => {
    upsertError = { code: 'PGRST205', message: 'not found' }
    const w = await openMenu('approver')
    await siteVolButton(w).trigger('click')
    await w.findAll('.site-vol input[type="range"]')[1].trigger('change')
    await nextTick()
    await nextTick()
    expect(w.find('.site-vol .err').text()).toContain('ยังไม่ได้ติดตั้ง')
  })
  it('คืนค่าเริ่มต้น saves today\'s level (100 / 100) as the site default', async () => {
    siteVolume.value = { melody: 160, chord: 90, linked: false }
    const w = await openMenu('approver')
    await siteVolButton(w).trigger('click')
    await w.find('.site-vol .vp-reset').trigger('click')
    await nextTick()
    expect(writes.at(-1).value).toEqual({ melody: 100, chord: 100, linked: true })
  })
})
