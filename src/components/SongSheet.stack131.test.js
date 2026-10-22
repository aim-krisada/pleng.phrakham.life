// ใบ v3/pleng#131 (2) — พี่เปา 22 ต.ค. 2569: "บรรทัดที่ 7 ตัวอักษรทำแยกให้ตรงกับโน้ตในบรรทัดที่ 6 ด้วยได้มั้ย".
// On แผ่นเพลง (songbook), a line sung to the same tune as the line just above it used to print as one run of
// text under the music. Its words now stack under that line's notes as one more row, slot for slot.
// Driven through resolveContent, so the flag and the sheet are tested together, the way the page uses them.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import { resolveContent } from '../lib/songModel.js'

const seg = (note, chord = 'C') => ({ type: 'segment', chord, note })
const bar = { type: 'bar' }
const A = [seg('1 2 3 4'), bar, seg('5 - - -', 'G')]
// the same tune, its chords split differently: the signature ignores chords, so this still repeats A
const A2 = [seg('1 2', 'C'), seg('3 4', 'F'), bar, seg('5 - - -', 'G')]
const B = [seg('3 3 2 2'), bar, seg('1 - - -')]
const song = (lines, syllables, more = []) => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'V', lines }],
  arrangement: [{ stanza: 'V', label: 'ข้อ 1', syllables }, ...more],
})
// A then A again (A2), then B — 8 slots per A line (4 notes + 5 and its 3 holds), 8 for B
const words1 = ['ข้า', 'เดิน', 'ทาง', 'ไกล', 'ไป', '', '', '']
const words2 = ['พระ', 'องค์', 'ทรง', 'นำ', 'ทาง', '', '', '']
const words3 = ['จน', 'ถึง', 'บ้าน', 'เรา', 'แล้ว', '', '', '']
const base = song([A, A2, B], [...words1, ...words2, ...words3])

const mountSheet = (content, props = {}) =>
  mount(SongSheet, { props: { content: { ...content, lines: resolveContent(content) }, mode: 'full', songbook: true, ...props } })
const rowsOf = (w) => w.findAll('.song-line').filter((l) => l.isVisible())
const words = (els) => els.map((s) => s.text()).filter(Boolean)

describe('ใบ#131 (2) — resolveContent marks a line that repeats the tune just above it', () => {
  it('flags only the adjacent repeat inside a ท่อน that prints its notes', () => {
    const lines = resolveContent(base)
    expect(lines.map((l) => !!l._sameTuneAbove)).toEqual([false, true, false])
  })
  it('a whole reused stanza is NOT flagged — it still prints as words below, as before', () => {
    const c = song([A, A2], [...words1, ...words2], [{ stanza: 'V', label: 'ข้อ 2', syllables: [...words3, ...words1] }])
    const lines = resolveContent(c)
    expect(lines.map((l) => !!l._sameTuneAbove)).toEqual([false, true, false, false])
    expect(lines[2]._melodyFirst).toBe(false) // ข้อ 2 — still lyrics only
  })
})

describe('ใบ#131 (2) — แผ่นเพลง stacks those words under the notes above', () => {
  it('the repeat has no row of its own; its words are a second row inside the line above', () => {
    const w = mountSheet(base)
    const rows = rowsOf(w)
    expect(rows.length).toBe(2) // A (with A2 under it) and B
    const host = rows[0]
    expect(host.classes()).toContain('song-line-stacked')
    expect(words(host.findAll('.lyric-syl .syl:not(.syl-stacked)'))).toEqual(['ข้า', 'เดิน', 'ทาง', 'ไกล', 'ไป'])
    expect(words(host.findAll('.syl-stacked'))).toEqual(['พระ', 'องค์', 'ทรง', 'นำ', 'ทาง'])
    // the paragraph the reader used to get is gone
    expect(w.findAll('.song-line-lyrics').length).toBe(0)
  })
  it('each segment holds both rows, so a word sits under the same note as the word above it', () => {
    const host = rowsOf(mountSheet(base))[0]
    const segs = host.findAll('.segment')
    expect(words(segs[0].findAll('.syl-stacked'))).toEqual(['พระ', 'องค์', 'ทรง', 'นำ'])
    expect(words(segs[1].findAll('.syl-stacked'))).toEqual(['ทาง'])
    // same number of slots per segment in both rows, laid in ONE grid of that many columns
    segs.forEach((s) => {
      expect(s.find('.lyric-grid').attributes('style')).toContain(`repeat(${s.findAll('.lyric-syl .syl:not(.syl-stacked)').length}, auto)`)
      expect(s.findAll('.syl-stacked').length).toBe(s.findAll('.lyric-syl .syl:not(.syl-stacked)').length)
    })
  })
  it('a stacked word keeps its own line\'s address, so karaoke and tap-to-seek still reach it', async () => {
    const w = mountSheet(base, { interactive: true, playingSyl: { li: 1, si: 1, syk: 0 } })
    const host = rowsOf(w)[0]
    // A2 is split "1 2" | "3 4" | "5 - - -", so its 3rd word ทรง is si 1, k 0 — under A's si 0, k 2
    const lit = host.find('.syl-stacked.syl-playing')
    expect(lit.text()).toBe('ทรง')
    expect(lit.attributes('data-syl')).toBe('1-1-0')
    await lit.trigger('click')
    expect(w.emitted('seek').at(-1)).toEqual([{ li: 1, si: 1, syk: 0 }])
  })
  it('three lines on one tune: both later lines stack, in order', () => {
    const w = mountSheet(song([A, A, A], [...words1, ...words2, ...words3]))
    const rows = rowsOf(w)
    expect(rows.length).toBe(1)
    const stacked = rows[0].findAll('.segment')[0].findAll('.syl-stacked')
    const row = (li) => words(stacked.filter((s) => s.attributes('data-syl').startsWith(`${li}-`))).join(' ')
    expect([row(1), row(2)]).toEqual(['พระ องค์ ทรง นำ', 'จน ถึง บ้าน เรา'])
    // grid order: row 1 first, then each stacked line in turn
    expect(stacked.map((s) => s.attributes('data-syl')[0])).toEqual(['1', '1', '1', '1', '2', '2', '2', '2'])
  })
  it('a silent pickup gives the same tune but more slots → the line keeps its paragraph, never misplaced words', () => {
    const P = [seg('0 0'), bar, ...A]
    const w = mountSheet(song([A, P], [...words1, '', '', ...words2]))
    const rows = rowsOf(w)
    expect(rows.length).toBe(2)
    expect(rows[0].findAll('.syl-stacked').length).toBe(0)
    expect(rows[1].classes()).toContain('song-line-lyrics')
  })
  it('ฝึกร้อง (not songbook) and a words-only sheet are untouched: nothing stacks', () => {
    expect(rowsOf(mountSheet(base, { songbook: false })).length).toBe(3)
    const lyricsOnly = mountSheet(base, { showNote: false, showChord: false, showLyric: true })
    expect(lyricsOnly.findAll('.syl-stacked').length).toBe(0)
    expect(rowsOf(lyricsOnly).length).toBe(3)
  })
})
