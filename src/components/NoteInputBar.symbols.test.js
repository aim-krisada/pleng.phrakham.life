// DS note-symbol-set §4.1 (G17) — the symbol keys on the note toolbar.
// P'Aim tried v2 and sent it back: "ไม่เห็นปุ่ม key ที่จำเป็นต้องใช้เลย". พี่เปา likes typing but
// cannot FIND the characters, so every symbol needs a button that states its own character
// (line 1 = the answer, not a hint), its Thai name, and — once measured — where that key is.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NoteInputBar from './NoteInputBar.vue'
import { learnKey } from '../lib/keyHints.js'

const WIRED = ['_', '.', '-', '~', '^', 'n', "'", '(', ')', '{', '}', '|']
const mountBar = (props = {}) => mount(NoteInputBar, { props: { variant: 'popup', layer: 'note', ...props } })
const chars = (w) => w.findAll('.nib-sym .nib-symch').map((n) => n.text())

beforeEach(() => localStorage.clear())

describe('NoteInputBar — symbol keys', () => {
  it('shows a button for every wired symbol', () => {
    expect(chars(mountBar())).toEqual(expect.arrayContaining(WIRED))
  })

  it("never offers ',' or '!' — the parser gives them no meaning yet", () => {
    const c = chars(mountBar())
    expect(c).not.toContain(',')
    expect(c).not.toContain('!')
    expect(c).toHaveLength(WIRED.length)
  })

  it('a tap asks the host to apply that exact character', async () => {
    const w = mountBar()
    const caret = w.findAll('.nib-sym').find((b) => b.find('.nib-symch').text() === '^')
    await caret.trigger('click')
    expect(w.emitted('symbol')[0]).toEqual(['^'])
  })

  it('every button carries its Thai name and an accessible label (no hover needed)', () => {
    const w = mountBar()
    for (const b of w.findAll('.nib-sym')) {
      expect(b.find('.nib-symth').text().length).toBeGreaterThan(0)
      expect(b.attributes('aria-label')).toBeTruthy()
      expect(b.attributes('title')).toBeUndefined() // ⛔ never a tooltip — hover:none here
    }
  })

  it('shows the physical key ONLY once this machine has taught it', async () => {
    const w = mountBar()
    const caretKey = () => w.findAll('.nib-sym').find((b) => b.find('.nib-symch').text() === '^').find('.nib-symkey')
    expect(caretKey().exists()).toBe(false) // never typed → no guess
    learnKey('^', 'Digit6', true, new Map([['Digit6', '6']]))
    await w.setProps({ hintNonce: 1 })
    await nextTick()
    expect(caretKey().text()).toBe('⇧ + 6')
  })

  it('keeps the controls พี่เปา already knows, in place', () => {
    const w = mountBar({ chords: [] })
    const text = w.text()
    for (const label of ['สูง', 'ต่ำ', 'คอร์ด', 'ทับ']) expect(text).toContain(label)
  })

  it('hides the symbol keys on the word layer (they are note marks)', () => {
    expect(mountBar({ layer: 'word' }).findAll('.nib-sym')).toHaveLength(0)
  })

  it('the mobile bar gets them too, in wrapping groups (no single 12-key row)', () => {
    const w = mountBar({ variant: 'bar' })
    expect(chars(w)).toEqual(expect.arrayContaining(WIRED))
    expect(w.findAll('.nib-symgroup').length).toBeGreaterThan(1)
  })
})
