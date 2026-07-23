// P'Pao hotfix — the CURRENT editor's chord field must accept ANY standard chord, not just the
// fixed quick-pick. These tests mount the REAL editor (real ComboSelect) and drive the real chord
// cell: open it, type a non-basic chord, blur, and confirm the chord PERSISTS on the segment
// (the button re-renders showing exactly what was typed). Junk must be rejected. Mirrors the
// ComboSelect.category test wiring so it exercises the actual editor, not a stand-in.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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
import ComboSelect from './ComboSelect.vue'

const SONG = {
  id: 's1',
  number: 3,
  title_th: 'เพลงทดสอบ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

function mountEd() {
  return mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true } }, // ComboSelect is REAL
  })
}

// the OPEN chord picker is the ComboSelect that has a validate fn (allow-custom + validate) —
// distinct from key/timeSignature (no validate) and หมวด (no allow-custom).
const openChordCombo = (w) => w.findAllComponents(ComboSelect).find((c) => typeof c.props('validate') === 'function')

// commit a chord through the real UI: open the first chord cell, type, blur, let the timer fire.
async function typeChord(w, value) {
  const firstBtn = w.findAll('.chord-btn')[0]
  await firstBtn.trigger('click')
  await nextTick()
  const combo = openChordCombo(w)
  expect(combo, 'chord picker should open').toBeTruthy()
  const input = combo.find('input')
  await input.trigger('focus')
  await input.setValue(value)
  await input.trigger('blur')
  vi.runAllTimers()
  await nextTick()
}

describe('current editor accepts every standard chord (free-text chord cell)', () => {
  it('the first chord cell starts on the seeded chord "C"', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.findAll('.chord-btn')[0].text()).toBe('C')
    w.unmount()
  })

  it.each(['F#m7b5', 'Cmaj7', 'Dsus4', 'Bb13', 'A°', 'G/B'])(
    'persists a typed non-basic chord: %s',
    async (chord) => {
      vi.useFakeTimers()
      const w = mountEd()
      await nextTick()
      await typeChord(w, chord)
      // picker closed and the cell button now shows exactly what was typed
      expect(openChordCombo(w)).toBeFalsy()
      expect(w.findAll('.chord-btn')[0].text()).toBe(chord)
      w.unmount()
      vi.useRealTimers()
    }
  )

  it('rejects junk — no invalid value is committed, seeded "C" is untouched', async () => {
    vi.useFakeTimers()
    const w = mountEd()
    await nextTick()
    // open the first chord cell and type junk
    await w.findAll('.chord-btn')[0].trigger('click')
    await nextTick()
    const combo = openChordCombo(w)
    const input = combo.find('input')
    await input.trigger('focus')
    await input.setValue('Zqx') // no valid root -> parseChord null
    await input.trigger('blur')
    vi.runAllTimers()
    await nextTick()
    // nothing invalid was emitted, the cell's bound chord is still "C", and the field snapped back
    expect((combo.emitted('update:modelValue') || []).flat()).not.toContain('Zqx')
    expect(combo.props('modelValue')).toBe('C') // seeded chord untouched
    expect(input.element.value).not.toContain('Zqx') // field snapped back off the junk
    w.unmount()
    vi.useRealTimers()
  })

  // P'Pao — keyboard-only: open the cell, arrow to a quick-pick chord, Enter selects it (no mouse).
  it('Enter selects a highlighted quick-pick chord in the real editor', async () => {
    const w = mountEd()
    await nextTick()
    await w.findAll('.chord-btn')[0].trigger('click') // open cell 0 (seeded "C")
    await nextTick()
    const combo = openChordCombo(w)
    const input = combo.find('input')
    await input.trigger('focus')
    // options for key C: [none, C, Dm, Em, ...] → arrow 3× highlights "Dm"
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(openChordCombo(w)).toBeFalsy() // picker closed on select
    expect(w.findAll('.chord-btn')[0].text()).toBe('Dm')
    w.unmount()
  })
})
