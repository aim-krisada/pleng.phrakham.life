// @vitest-environment jsdom
// PIANO-ONLY (P'Aim 2026-07-27) — a choice group with one selectable value is not a choice. The
// popover must DROP the whole group rather than render a lone radio button, so หน้าจอ shows only
// the groups the listener can actually act on.
//
// The rule lives in SoundControl (not in either page) on purpose: ฝึกร้อง and แก้เพลง both render
// this component with their own groups, and แก้เพลง's groups carry NO `kind` field — a rule that
// only recognised kind === 'menu' would silently skip that entire page.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SoundControl from './SoundControl.vue'

const G = (key, label, values, extra = {}) => ({
  key, label, value: values[0]?.value,
  options: values, onPick: () => {}, ...extra,
})
const one = [{ value: 'grand', label: 'เปียโน', short: 'เปียโน' }]
const three = [
  { value: 'arrangement', label: 'บรรเลง', short: 'บรรเลง' },
  { value: 'calm', label: 'สงบ', short: 'สงบ' },
  { value: 'plain', label: 'ตรงโน้ต', short: 'ตรงโน้ต' },
]

const labels = (w) => w.findAll('.sc-glabel').map((n) => n.text().trim())

describe('SoundControl — groups with a single option are hidden', () => {
  it('drops the one-option groups, keeps the real choice (ฝึกร้อง shape, with `kind`)', () => {
    const w = mount(SoundControl, {
      props: {
        open: true,
        groups: [
          G('ensemble', 'การบรรเลง', [{ value: 'solo', label: 'เดี่ยว', short: 'เดี่ยว' }], { kind: 'menu' }),
          G('instrument', 'เครื่องดนตรี', one, { kind: 'menu' }),
          G('style', 'อารมณ์ / สไตล์', three, { kind: 'menu' }),
        ],
      },
      global: { stubs: { Icon: true } },
    })
    expect(labels(w)).toEqual(['อารมณ์ / สไตล์'])
    expect(w.findAll('.sc-opt')).toHaveLength(3)
  })

  it('applies to the แก้เพลง shape too, where groups carry no `kind`', () => {
    const w = mount(SoundControl, {
      props: {
        open: true,
        groups: [
          G('instrument', 'เครื่องดนตรี', one),
          G('style', 'อารมณ์ / สไตล์', three),
        ],
      },
      global: { stubs: { Icon: true } },
    })
    expect(labels(w)).toEqual(['อารมณ์ / สไตล์'])
  })

  it('a group whose extra options are all "เร็ว ๆ นี้" (disabled) counts as one option', () => {
    const w = mount(SoundControl, {
      props: {
        open: true,
        groups: [
          G('instrument', 'เครื่องดนตรี', [
            ...one,
            { value: 'cello', label: 'เชลโล — เร็ว ๆ นี้', short: 'เชลโล', disabled: true },
          ]),
          G('style', 'อารมณ์ / สไตล์', three),
        ],
      },
      global: { stubs: { Icon: true } },
    })
    expect(labels(w)).toEqual(['อารมณ์ / สไตล์'])
  })

  it('brings a group back as soon as it has two real options again (the restore path)', () => {
    const w = mount(SoundControl, {
      props: {
        open: true,
        groups: [
          G('instrument', 'เครื่องดนตรี', [
            ...one,
            { value: 'cello', label: 'เชลโล', short: 'เชลโล' },
          ]),
          G('style', 'อารมณ์ / สไตล์', three),
        ],
      },
      global: { stubs: { Icon: true } },
    })
    expect(labels(w)).toEqual(['เครื่องดนตรี', 'อารมณ์ / สไตล์'])
  })

  it('never hides the non-choice groups (slider / ปรับละเอียด carry no options)', () => {
    const w = mount(SoundControl, {
      props: {
        open: true,
        groups: [
          { key: 'sparkle', label: 'ประกายเสียงสูง', kind: 'slider', control: { min: 0, max: 100, value: 40, onInput: () => {} } },
          G('style', 'อารมณ์ / สไตล์', three, { kind: 'menu' }),
        ],
      },
      global: { stubs: { Icon: true } },
    })
    expect(labels(w)).toEqual(['ประกายเสียงสูง', 'อารมณ์ / สไตล์'])
  })
})
