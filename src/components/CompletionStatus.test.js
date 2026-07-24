// BI-007 D-A — the dumb you-are-here stepper. Props in, layout out. It must state the current
// step, mark it for AT, keep a rejection note persistent, and never lean on colour alone.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CompletionStatus from './CompletionStatus.vue'

const EDITOR_STEPS = ['แก้ไข', 'เก็บร่าง', 'ส่งตรวจ', 'รออนุมัติ', 'เผยแพร่แล้ว']
const mountCS = (props) => mount(CompletionStatus, { props })
const labels = (w) => w.findAll('.cs-step .cs-label').map((n) => n.text())

describe('CompletionStatus — the you-are-here stepper', () => {
  it('renders the given steps and marks the current one (class + aria-current)', () => {
    const w = mountCS({ steps: EDITOR_STEPS, current: 3, tone: 'pending', statusText: 'รอตรวจ' })
    expect(labels(w)).toEqual(EDITOR_STEPS)
    expect(w.find('.cs-step.cur .cs-label').text()).toBe('รออนุมัติ')
    expect(w.find('[aria-current="step"] .cs-label').text()).toBe('รออนุมัติ')
  })

  it('steps before current read as done (✓, not just colour)', () => {
    const w = mountCS({ steps: EDITOR_STEPS, current: 2 })
    const done = w.findAll('.cs-step.done')
    expect(done).toHaveLength(2)
    expect(w.findAll('.cs-step.done .cs-node').every((n) => n.text() === '✓')).toBe(true)
  })

  it('the status chip carries a glyph + the status word (WCAG 1.4.1)', () => {
    const w = mountCS({ steps: EDITOR_STEPS, current: 0, tone: 'rejected', statusText: 'ถูกส่งกลับให้แก้' })
    expect(w.find('.cs-chip').text()).toContain('ถูกส่งกลับให้แก้')
    expect(w.find('.cs-bar').classes()).toContain('t-rejected')
  })

  it('a rejection comment stays on the surface (was a flickering toast)', () => {
    const w = mountCS({ steps: EDITOR_STEPS, current: 0, tone: 'rejected', rejectComment: 'คีย์ยังผิด' })
    expect(w.find('.cs-reject').text()).toContain('คีย์ยังผิด')
  })

  it('shows the next-step line', () => {
    const w = mountCS({ steps: EDITOR_STEPS, current: 0, nextText: 'กด “ส่งตรวจ”' })
    expect(w.find('.cs-next').text()).toContain('ส่งตรวจ')
  })

  it('surfaces the auto-save micro-state', () => {
    expect(mountCS({ steps: EDITOR_STEPS, autoSave: 'saving' }).find('.cs-auto').text()).toContain('กำลังเก็บ')
    expect(mountCS({ steps: EDITOR_STEPS, autoSave: 'saved' }).find('.cs-auto').text()).toContain('เก็บอัตโนมัติแล้ว')
    expect(mountCS({ steps: EDITOR_STEPS, autoSave: 'idle' }).find('.cs-auto').exists()).toBe(false)
  })

  // G-review #4 — the phone "ดูขั้นตอน" toggle expands the ladder (mobile shows a pill by default;
  // desktop hides the toggle via CSS and shows the ladder inline).
  it('the ดูขั้นตอน toggle flips the expanded state', async () => {
    const w = mountCS({ steps: EDITOR_STEPS, current: 1 })
    const toggle = w.find('.cs-toggle')
    expect(toggle.exists()).toBe(true)
    expect(w.find('.cs-bar').classes()).not.toContain('cs-expanded')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(w.find('.cs-bar').classes()).toContain('cs-expanded')
    expect(toggle.attributes('aria-expanded')).toBe('true')
  })
})
