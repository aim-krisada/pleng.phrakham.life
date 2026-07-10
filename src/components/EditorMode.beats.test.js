// B055 — the beat checker must count ACROSS bars so intentionally-partial bars are not
// falsely flagged red. Two mechanisms:
//   • ห้องยก (pickup): bars flagged `pickup` are validated as a group — their beats must
//     sum to a whole number of full bars (covers a stanza-opening pickup paired with the
//     short final bar, which are NOT adjacent so the line-level `cont` join can't help).
//   • cont: an adjacent line marked `cont` joins its first bar to the previous line's last.
// These assert the rendered per-bar status (✓ / ❌ via the `.bad` class) — the exact thing
// the user saw wrongly red.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import { vi } from 'vitest'
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

// a 4/4 stanza whose lines cover every case we care about:
//   line 0 — pickup(2) | full(4) | pickup(2)   → 2+2 = 4 = one whole bar → all ✓
//   line 1 — short(2), NOT flagged            → 2/4 → ❌ (must still catch real errors)
//   line 2 — last bar short(2)                 ┐ split across the line break, line 3 cont
//   line 3 — cont, first bar short(2)          ┘ → joined 4 → both ✓
const SONG = {
  id: 'song-1',
  number: 1,
  title_th: 'ทดสอบห้องยก',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      {
        id: 'A',
        lines: [
          [
            { type: 'pickup' },
            { type: 'segment', note: '34' },
            { type: 'bar' },
            { type: 'segment', note: '1234' },
            { type: 'bar' },
            { type: 'pickup' },
            { type: 'segment', note: '12' },
          ],
          [{ type: 'segment', note: '12' }],
          [{ type: 'segment', note: '12' }],
          [{ type: 'continue' }, { type: 'segment', note: '34' }],
        ],
      },
    ],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

const statusOf = (bar) => bar?.querySelector('.ed-bar-status')
const isBad = (bar) => statusOf(bar)?.classList.contains('bad')

function mountEditor() {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  return mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    global: { stubs: { Icon: true } },
  })
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

describe('B055 — beat check counts across bars', () => {
  it('pickup group (non-adjacent first↔last) is not falsely red', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const el = wrapper.element
    const bar = (li, bi) => el.querySelector(`.ed-bar[data-bar="${li}-${bi}"]`)

    // pickup bars 2 + 2 = 4 → both valid
    expect(isBad(bar(0, 0))).toBe(false)
    expect(statusOf(bar(0, 0)).textContent).toContain('ห้องต่อกัน')
    expect(isBad(bar(0, 2))).toBe(false)
    // the full middle bar is unaffected
    expect(isBad(bar(0, 1))).toBe(false)
  })

  it('a genuinely short bar (not flagged, not continued) is still red', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const bar = wrapper.element.querySelector('.ed-bar[data-bar="1-0"]')
    expect(isBad(bar)).toBe(true)
  })

  it('offers the ↻ ห้องต่อกัน quick toggle on a short bar', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const bar = wrapper.element.querySelector('.ed-bar[data-bar="1-0"]')
    expect(bar.querySelector('.ed-bar-pickup')).toBeTruthy()
  })

  it('cross-line cont join makes the split bar valid on both lines', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const el = wrapper.element
    expect(isBad(el.querySelector('.ed-bar[data-bar="2-0"]'))).toBe(false)
    expect(isBad(el.querySelector('.ed-bar[data-bar="3-0"]'))).toBe(false)
  })

  it('persists the pickup flag through the change() round-trip', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const out = wrapper.emitted('change').at(-1)[0]
    const items = out.content.stanzas[0].lines[0]
    expect(items.some((it) => it.type === 'pickup')).toBe(true)
  })
})

// B073 — a cross-line "ห้องต่อกัน" pair that completes a whole bar must NOT be dragged
// red by OTHER, unrelated pickup bars in the same stanza. The old check summed EVERY
// pickup bar in the stanza into one number, so a stray/incomplete pickup elsewhere made
// a genuinely-complete pair show a nonsense over-count (P'Aim saw 11/4 on a 2+2 pair).
// Fix: pickup bars are validated per-GROUP — a run of adjacent pickup bars (across the
// line break) is one group; non-adjacent isolated pickups (classic anacrusis) share
// another. Independent groups no longer poison each other.
const B073_SONG = {
  id: 'song-2',
  number: 2,
  title_th: 'ห้องต่อกันข้ามบรรทัด',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      {
        id: 'A',
        lines: [
          // line 0 — a full bar + two adjacent pickup bars (3 + 4 = 7, an unrelated,
          // NOT-whole group) → the stray pickups that used to inflate the global sum
          [
            { type: 'segment', note: '1234' },
            { type: 'bar' },
            { type: 'pickup' },
            { type: 'segment', note: '123' },
            { type: 'bar' },
            { type: 'pickup' },
            { type: 'segment', note: '1234' },
          ],
          [{ type: 'segment', note: '1234' }], // line 1 — full
          // line 2 last bar (pickup, 2) ┐ split across the line break → 2 + 2 = 4 = one
          // line 3 first bar (pickup, 2) ┘ whole bar → BOTH must be ✓ (P'Aim's case)
          [{ type: 'pickup' }, { type: 'segment', note: '12' }],
          [{ type: 'pickup' }, { type: 'segment', note: '12' }],
        ],
      },
    ],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

describe('B073 — cross-line pickup pair not poisoned by unrelated pickups', () => {
  function mount073() {
    document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
    return mount(EditorMode, {
      props: { song: B073_SONG, tier: 'approver', active: true },
      global: { stubs: { Icon: true } },
    })
  }

  it('the split-across-lines pair (2+2=4) shows ✓, not an over-count like 11/4', async () => {
    const wrapper = mount073()
    await nextTick()
    const el = wrapper.element
    const bar = (li, bi) => el.querySelector(`.ed-bar[data-bar="${li}-${bi}"]`)
    // the genuinely-complete cross-line pair is green on BOTH lines
    expect(isBad(bar(2, 0))).toBe(false)
    expect(isBad(bar(3, 0))).toBe(false)
    // and its status is the healthy "ห้องต่อกัน" text — never the lumped over-count
    expect(statusOf(bar(2, 0)).textContent).not.toContain('/4')
  })

  it('an unrelated incomplete pickup group (3+4=7) is still flagged red', async () => {
    const wrapper = mount073()
    await nextTick()
    const el = wrapper.element
    const bar = (li, bi) => el.querySelector(`.ed-bar[data-bar="${li}-${bi}"]`)
    expect(isBad(bar(0, 1))).toBe(true)
    expect(isBad(bar(0, 2))).toBe(true)
  })
})
