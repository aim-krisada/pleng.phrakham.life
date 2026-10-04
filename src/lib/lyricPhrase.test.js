// ใบ v3/pleng#100 — เนื้อล้วน "ติดกันเป็นวรรค": syllables of a line written together, a space only where the tune
// breathes (a rest · a syllable held ≥ 1.5 beats · a fermata), and never inside a word.
import { describe, it, expect } from 'vitest'
import { phraseBreaks, slotTimes, songBreathBeats, BREATH_BEATS } from './lyricPhrase.js'
import { syllableSlots } from './notation.js'

const write = (segs, opts) => {
  const br = phraseBreaks(segs, opts)
  let out = ''
  segs.forEach((s) => (s.syllables || []).forEach((w, k) => { if (w) out += w + (br.has(`${s.si}-${k}`) ? ' ' : '') }))
  return out.trim()
}
const S = (si, note, syllables) => ({ si, note, syllables })

describe('ใบ#100 เสร็จเมื่อ 2 — joined, a space only where the tune breathes', () => {
  it('ตัวอย่างในใบ: "ข้า เชื่อ พระ องค์ ข้า เชื่อ พระ องค์" → "ข้าเชื่อพระองค์ ข้าเชื่อพระองค์" (องค์ held 2 beats)', () => {
    const segs = [S(0, '1 2_. 3__ 5 -', ['ข้า', 'เชื่อ', 'พระ', 'องค์', '']), S(1, '1 2_. 3__ 5 -', ['ข้า', 'เชื่อ', 'พระ', 'องค์', ''])]
    expect(write(segs)).toBe('ข้าเชื่อพระองค์ ข้าเชื่อพระองค์')
  })
  it('a rest breaks · a fermata breaks · a short note does not', () => {
    expect(write([S(0, '1 2 0 3 4', ['ข้า', 'เดิน', '', 'ทาง', 'ไกล'])])).toBe('ข้าเดิน ทางไกล')
    expect(write([S(0, '1 2^ 3 4', ['ข้า', 'เดิน', 'ทาง', 'ไกล'])])).toBe('ข้าเดิน ทางไกล')
    expect(write([S(0, '1 2 3 4', ['ข้า', 'เดิน', 'ทาง', 'ไกล'])])).toBe('ข้าเดินทางไกล')
  })
  it('เอื้อน and "-" count toward how long the syllable is held', () => {
    expect(write([S(0, '1 2_ 3_ 4_ 5', ['ข้า', 'เดิน', '', '', 'ไกล'])])).toBe('ข้าเดิน ไกล') // เดิน sung on 3 eighths = 1.5 beats
    expect(write([S(0, '1 2 - 3', ['ข้า', 'เดิน', '', 'ไกล'])])).toBe('ข้าเดิน ไกล')
  })
  it('the threshold is 1.5 beats (a dotted quarter)', () => {
    expect(BREATH_BEATS).toBe(1.5)
    expect(write([S(0, '1 2. 3_', ['ข้า', 'เดิน', 'ไกล'])])).toBe('ข้าเดิน ไกล')
    expect(write([S(0, '1 2_. 3__', ['ข้า', 'เดิน', 'ไกล'])])).toBe('ข้าเดินไกล')
  })
  it('a bracketed aside stays set apart: "ฉัน (อยู่ไหน) อยู่ในใจ" (เด็กเล็ก 18)', () => {
    expect(write([S(0, '1 2 3 4 5', ['ฉัน', '(อยู่ไหน)', 'อยู่', 'ใน', 'ใจ'])])).toBe('ฉัน (อยู่ไหน) อยู่ในใจ')
  })
  it('a breath across two chord segments still counts (the line is one run)', () => {
    expect(write([S(0, '1 2', ['ข้า', 'เดิน']), S(1, '- 3 4', ['', 'ทาง', 'ไกล'])])).toBe('ข้าเดิน ทางไกล')
  })
})

describe('ใบ#100 — "long" is measured against the song itself', () => {
  it('a slow song whose every syllable is a dotted note: those are not breaths (เพลง 729 read choppy)', () => {
    const lines = [[S(0, '1. 2. 3. 4.', ['พระ', 'เยซู', 'คน', 'รัก'])], [S(0, '1. 2. 3. 5 - -', ['ของ', 'ข้า', 'ขอ', 'ซ่อน'])]]
    const breathBeats = songBreathBeats(lines)
    expect(breathBeats).toBe(3) // twice the usual 1.5
    expect(write(lines[0], { breathBeats })).toBe('พระเยซูคนรัก')
  })
  it('a song of quarters and eighths keeps the 1.5-beat floor (เพลง 519)', () => {
    expect(songBreathBeats([[S(0, '1 2_. 3__ 1 3_. 5__', ['เมื่อ', 'ข้า', 'เดิน', 'ทาง', 'นั้น', 'ประ'])]])).toBe(BREATH_BEATS)
  })
})

describe('ใบ#100 เสร็จเมื่อ 2.2 — never a space inside a word', () => {
  it('เพลง 519 "ภาระแม้หนักใหญ่": a long note on ภา does NOT split ภาระ', () => {
    expect(write([S(0, '1. 2_ 3 4', ['ภา', 'ระ', 'แม้', 'หนัก'])])).toBe('ภาระแม้หนัก')
  })
  it('"พระเมตตา" held on เมต is not split', () => {
    expect(write([S(0, '1 2 - 3 4', ['พระ', 'เมต', '', 'ตา', 'มา'])]).includes('เมต ตา')).toBe(false)
  })
  it('with no word breaker (an old browser) only rests and fermatas break', () => {
    expect(write([S(0, '1 2 - 3 0 4', ['ก', 'ข', '', 'ค', '', 'ง'])], { segmenter: null })).toBe('กขค ง')
  })
  it('a rest that falls inside a word does not split it either (ซา–ตาน)', () => {
    expect(write([S(0, '1 0 2 3', ['ซา', '', 'ตาน', 'มาร'])])).toBe('ซาตานมาร')
  })
})

describe('ใบ#100 — the syllable slots line up with the song model', () => {
  it('slotTimes has one entry per syllable slot, triplets and brackets included', () => {
    for (const n of ['1 2 3', '1_ {2 3 4} 5_', '( 1_ 2_ ) 3', '1 - 0 2^', '{ 1 2 3 }', '(6_ 5_) 4']) expect(slotTimes(n).length).toBe(syllableSlots(n))
  })
  it('a triplet eighth is 1/3 of a beat', () => {
    expect(slotTimes('{1_ 2_ 3_}').map((s) => +s.beats.toFixed(4))).toEqual([0.3333, 0.3333, 0.3333])
  })
})
