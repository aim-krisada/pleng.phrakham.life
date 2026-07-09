// ShellBar — the one app-wide header. S1/B007: the site menu is pages only —
// "รายการเพลง" replaces "ทำเพลง" (song creation lives on the "เพลง ▾" panel / แก้ไข mode).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/' }) }))

import ShellBar from './ShellBar.vue'
import { shellMenu } from '../store.js'

const stubs = {
  ProfileTool: true,
  DownloadTool: true,
  FontTool: true,
  Icon: true,
  RouterLink: { template: '<a><slot /></a>' },
}

beforeEach(() => { shellMenu.value = null })

describe('ShellBar — site menu (S1 / B007)', () => {
  it('the site menu lists pages, with รายการเพลง and NOT ทำเพลง', async () => {
    const w = mount(ShellBar, { global: { stubs } })
    await w.find('.sb-caret').trigger('click')
    await nextTick()
    const text = w.find('.sb-dropdown').text()
    expect(text).toContain('รายการเพลง')
    expect(text).toContain('คู่มือ')
    expect(text).toContain('เกี่ยวกับเรา')
    expect(text).not.toContain('ทำเพลง')
  })

  it('exposes the teleport targets every mode shares (#shell-title / #shell-menus)', () => {
    const w = mount(ShellBar, { global: { stubs } })
    expect(w.find('#shell-title').exists()).toBe(true)
    expect(w.find('#shell-menus').exists()).toBe(true)
  })
})
