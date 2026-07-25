// The inline editor's chord surface must NOT cap the vocabulary (the reason for the main-branch
// hotfix 5661068, ported here): P'Pao types chords the quick-pick doesn't list. Junk must still be
// refused in place — a typo must never reach the song.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteInputBar from './NoteInputBar.vue'

const CHORDS = [{ value: '', label: '— ไม่มีคอร์ด —' }, { value: 'C', label: 'C' }, { value: 'G', label: 'G' }]

function mountBar() {
  return mount(NoteInputBar, { props: { variant: 'bar', layer: 'note', chords: CHORDS } })
}
async function openChordBox(w) {
  await w.find('.nib-chord').trigger('click')
  return w.find('.nib-chordinput')
}
async function typeChord(w, text) {
  const input = await openChordBox(w)
  await input.setValue(text)
  await input.trigger('input')
  return input
}

describe('NoteInputBar — chord free text', () => {
  it('opening the chord box offers a type-your-own field alongside the quick-pick', async () => {
    const w = mountBar()
    expect(w.find('.nib-chordinput').exists()).toBe(false)
    await openChordBox(w)
    expect(w.find('.nib-chordinput').exists()).toBe(true)
    expect(w.findAll('.nib-chorditem')).toHaveLength(CHORDS.length)
  })

  it('quick-pick still emits its value (unchanged behaviour)', async () => {
    const w = mountBar()
    await openChordBox(w)
    await w.findAll('.nib-chorditem')[1].trigger('click')
    expect(w.emitted('chord')).toEqual([['C']])
    expect(w.find('.nib-chordbox').exists()).toBe(false) // picking closes the box
  })

  // the vocabulary the fixed engine understands but the quick-pick never lists
  it.each(['F#m7b5', 'G/B', 'Cmaj7', 'Dsus4', 'Bbadd9', 'A13', 'C#°', 'Eb+'])(
    'Enter commits the valid chord %s',
    async (chord) => {
      const w = mountBar()
      const input = await typeChord(w, chord)
      await input.trigger('keydown.enter')
      expect(w.emitted('chord')).toEqual([[chord]])
    },
  )

  it('the ✓ button commits the typed chord too (no keyboard Enter needed)', async () => {
    const w = mountBar()
    await typeChord(w, 'G/B')
    await w.find('.nib-chordok').trigger('click')
    expect(w.emitted('chord')).toEqual([['G/B']])
  })

  it.each(['zzz', 'H7', '   ', '/B', '7'])('refuses junk (%s): nothing is emitted', async (junk) => {
    const w = mountBar()
    const input = await typeChord(w, junk)
    await input.trigger('keydown.enter')
    expect(w.emitted('chord')).toBeUndefined()
    expect(w.find('.nib-chordbox').exists()).toBe(true) // stays open so it can be corrected
  })

  it('invalid input flags the field and explains, then clears the flag on the next keystroke', async () => {
    const w = mountBar()
    const input = await typeChord(w, 'zzz')
    await input.trigger('keydown.enter')
    expect(w.find('.nib-chordinput').classes()).toContain('bad')
    expect(w.find('.nib-chorderr').exists()).toBe(true)
    await input.setValue('C')
    await input.trigger('input')
    expect(w.find('.nib-chordinput').classes()).not.toContain('bad')
    expect(w.find('.nib-chorderr').exists()).toBe(false)
  })

  it('a committed chord leaves the field empty for the next one', async () => {
    const w = mountBar()
    const input = await typeChord(w, 'Cmaj7')
    await input.trigger('keydown.enter')
    await openChordBox(w)
    expect(w.find('.nib-chordinput').element.value).toBe('')
  })

  it('surrounding whitespace is trimmed before it reaches the song', async () => {
    const w = mountBar()
    const input = await typeChord(w, '  Am7  ')
    await input.trigger('keydown.enter')
    expect(w.emitted('chord')).toEqual([['Am7']])
  })
})
