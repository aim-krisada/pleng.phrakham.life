// ใบ v3/pleng#116 — เนื้อล้วน: a sheet line clearly longer than the song's normal line is cut into lyric lines
// where a วรรค ends on a bar line. Normal lines, and long lines with nowhere fair to cut, are never touched.
import { describe, it, expect } from 'vitest'
import { lyricLineSplits, lineShape, LONG_RATIO, LONG_TEXT_RATIO } from './lyricLineSplit.js'
import { phraseBreaks, songBreathBeats } from './lyricPhrase.js'
import { resolveContent } from './songModel.js'
import { song627 } from './lyricLineSplit.fixture.js'

// the breaks a reader sees in ติดกันเป็นวรรค (what SongSheet hands in)
function tuneBreaks(lines, ts) {
  const segLists = lines.map((l) => lineShape(l, ts).segs.filter((s) => Array.isArray(s.syllables)))
  const breathBeats = songBreathBeats(segLists)
  return segLists.map((segs) => phraseBreaks(segs, { breathBeats }))
}
// the words of line li, with ' / ' where a cut falls
function cutText(lines, li, cuts) {
  let t = ''
  for (const s of lineShape(lines[li]).segs) {
    if (cuts[li] && cuts[li].has(s.si)) t += ' / '
    for (const w of s.syllables || []) t += (w || '').trim()
  }
  return t
}

const seg = (note, syllables) => ({ type: 'segment', chord: '', note, syllables })
const bar = { type: 'bar' }
// one 4/4 bar of four quarter notes on four syllables
const q4 = (a, b, c, d) => seg('1 2 3 4', [a, b, c, d])
// a bar that holds the last word for the whole bar
const held = (w) => seg('5 - - -', [w, '', '', ''])

describe('ใบ#116 — เพลง 627 (เสร็จเมื่อ 1)', () => {
  const lines = resolveContent(song627)
  const cuts = lyricLineSplits(lines, { timeSignature: song627.timeSignature, breaks: tuneBreaks(lines, song627.timeSignature) })

  it('the 8-bar line of every verse is cut once, after "ศูนย์กลาง" and before "ไม่ใช่"', () => {
    expect(lines).toHaveLength(21) // 7 verses × 3 sheet lines
    expect(Object.keys(cuts).map(Number)).toEqual([1, 4, 7, 10, 13, 16, 19])
    expect(cutText(lines, 1, cuts)).toBe('มีพระคริสต์ทรงเป็นแกนสารและศูนย์กลาง / ไม่ใช่เพื่อหลักธรรมหรือพิธีศักดิ์สิทธิ์')
    expect(cutText(lines, 4, cuts)).toBe('ติดตามพระองค์ไปทรงฉายส่องหนทาง / พระคริสต์ทรงเป็นน้ำชีวิตทิพย์อาหาร')
  })

  it('the 4-bar lines are left as they are', () => {
    for (let li = 0; li < 21; li++) if (li % 3 !== 1) expect(cuts[li]).toBeUndefined()
  })

  it('verse 6 has fewer letters on that line (1.56 × the normal line) but the same tune, so it is cut alike', () => {
    expect(cutText(lines, 16, cuts)).toBe('โดยน้ำมันชโลมสรรเสริญอธิษฐาน / ไม่ใช่สำเร็จด้วยสมองหรือพิธี')
  })

  it('the cut follows the วรรค the reader sees: no วรรค end there (e.g. the book drew none) = no cut', () => {
    const noBreak = tuneBreaks(lines, song627.timeSignature).map(() => new Set())
    expect(lyricLineSplits(lines, { timeSignature: song627.timeSignature, breaks: noBreak })).toEqual({})
  })
})

describe('ใบ#116 — what counts as long (เสร็จเมื่อ 2)', () => {
  const normal = (n) => [q4('ข้า', 'เดิน', 'ทาง', 'ไกล'), bar, q4('ข้า', 'เดิน', 'ทาง', 'ไกล'), bar, q4('ข้า', 'เดิน', 'ทาง', 'ไกล'), bar, held(n)]
  const words = ['ใน', 'ชี', 'วิต', 'ทุก']

  it('the thresholds are the audited ones', () => {
    expect([LONG_RATIO, LONG_TEXT_RATIO]).toEqual([1.75, 1.6])
  })

  it('an 8-bar line among 4-bar lines, with a breath on the middle bar line, is cut there', () => {
    const long = [q4(...words), bar, q4(...words), bar, q4(...words), bar, held('วัน'), bar, q4(...words), bar, q4(...words), bar, q4(...words), bar, held('นี้')]
    const lines = [normal('ไป'), long, normal('มา')]
    const cuts = lyricLineSplits(lines, { timeSignature: '4/4', breaks: tuneBreaks(lines, '4/4') })
    expect(Object.keys(cuts)).toEqual(['1'])
    expect([...cuts[1]]).toEqual([4]) // the segment that opens bar 5
  })

  it('a long line of few words (held notes, "เยซู เยซู") reads as a normal line and is not cut', () => {
    const fewWords = [held('เย'), bar, held('ซู'), bar, held('เย'), bar, held('ซู'), bar, held('เย'), bar, held('ซู'), bar, held('เย'), bar, held('ซู')]
    const lines = [normal('ไป'), fewWords, normal('มา')]
    expect(lyricLineSplits(lines, { timeSignature: '4/4', breaks: tuneBreaks(lines, '4/4') })).toEqual({})
  })

  it('a line only a little longer (6 bars among 4) is not cut', () => {
    const six = [q4(...words), bar, q4(...words), bar, held('วัน'), bar, q4(...words), bar, q4(...words), bar, held('นี้')]
    const lines = [normal('ไป'), six, normal('มา')]
    expect(lyricLineSplits(lines, { timeSignature: '4/4', breaks: tuneBreaks(lines, '4/4') })).toEqual({})
  })

  it('no breath on a bar line near the middle (the note is held over it) = the line stays whole', () => {
    // the 4th bar's last note is tied into bar 5, so the วรรค ends inside bar 5, not on the bar line
    const tied = [q4(...words), bar, q4(...words), bar, q4(...words), bar, seg('1 2 3 4~', ['ข้า', 'เดิน', 'ทาง', 'ไกล']), bar,
      seg('~4 - 0 1', ['', '', '', 'และ']), bar, q4(...words), bar, q4(...words), bar, held('นี้')]
    const lines = [normal('ไป'), tied, normal('มา')]
    expect(lyricLineSplits(lines, { timeSignature: '4/4', breaks: tuneBreaks(lines, '4/4') })).toEqual({})
  })

  it('a cut never lands inside a word: a bar line inside "ศูนย์|กลาง" is not a วรรค end', () => {
    // same 8 bars, but bar 5 starts on the 2nd syllable of a word and the tune's breaks know no วรรค there
    const mid = [q4(...words), bar, q4(...words), bar, q4(...words), bar, seg('1 2 3 4', ['แกน', 'สาร', 'และ', 'ศูนย์']), bar,
      q4('กลาง', 'ไม่', 'ใช่', 'เพื่อ'), bar, q4(...words), bar, q4(...words), bar, held('นี้')]
    const lines = [normal('ไป'), mid, normal('มา')]
    const breaks = tuneBreaks(lines, '4/4')
    expect([...breaks[1]].includes('6-3')).toBe(false) // nothing to cut after "ศูนย์"
    expect(lyricLineSplits(lines, { timeSignature: '4/4', breaks })).toEqual({})
  })

  it('lineShape opens a bar exactly where SongSheet starts a new bar box (the editor `pickup` flag does not)', () => {
    const shape = lineShape([{ type: 'pickup' }, seg('1', ['ก']), seg('2', ['ข']), bar, { type: 'pickup' }, seg('3 4 5 6', ['ค', 'ง', 'จ', 'ฉ'])], '4/4')
    expect(shape.segs.map((s) => s.barStart)).toEqual([true, false, true])
    expect([shape.beats, shape.barBeats]).toEqual([6, 4])
  })
})
