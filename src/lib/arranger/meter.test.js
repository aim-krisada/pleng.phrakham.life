// Meter — locked against the STANDARD, not against what the code happens to produce.
//
// Every expectation below is written from conventional metrical theory first (see the header
// of meter.js for the rules and why each one holds), then run. The bug this guards against is
// exactly the opposite habit: the old code placed the secondary stress at
// Math.floor(beatsPerBar / 2), which reproduces the right answer for 4/4 and the wrong one for
// every other meter — a mistake that survives forever if the test is written by reading the
// output. So: 3/4 has NO secondary stress (a waltz is strong-weak-weak), 6/8 is TWO dotted-quarter
// beats in a 3-quarter bar, and 12/8 is four such beats with the secondary on the third.
import { describe, it, expect } from 'vitest'
import { meterOf, stressAt } from './meter.js'

// the stress of every half-beat of one bar, as a compact string
const bar = (ts) => {
  const m = meterOf(ts)
  const out = []
  for (let b = 0; b < m.barBeats - 1e-9; b += 0.5) {
    out.push({ strong: 'S', medium: 'M', weak: 'w', off: '.' }[stressAt(m, b)])
  }
  return out.join('')
}

describe('meterOf — bar length in quarter-note beats', () => {
  it.each([
    // simple meters: the beat is the denominator's note, n of them per bar
    ['4/4', 4, 4, 1, false],
    ['3/4', 3, 3, 1, false],
    ['2/4', 2, 2, 1, false],
    ['5/4', 5, 5, 1, false],
    ['8/4', 8, 8, 1, false],
    ['7/8', 3.5, 7, 0.5, false],
    ['2/2', 4, 2, 2, false],
    // 3/2 = simple triple, each beat a HALF note → 3 beats, bar 6 quarter-notes
    ['3/2', 6, 3, 2, false],
    // compound: the beat is a DOTTED note = three of the denominator's notes
    ['6/8', 3, 2, 1.5, true],
    ['9/8', 4.5, 3, 1.5, true],
    ['12/8', 6, 4, 1.5, true],
    ['6/4', 6, 2, 3, true],
    ['9/4', 9, 3, 3, true],
  ])('%s → bar %f beats, %i pulses of %f', (ts, barBeats, pulses, pulseBeats, compound) => {
    const m = meterOf(ts)
    expect(m.barBeats).toBeCloseTo(barBeats, 6)
    expect(m.pulses).toBe(pulses)
    expect(m.pulseBeats).toBeCloseTo(pulseBeats, 6)
    expect(m.compound).toBe(compound)
  })

  it('falls back to 4/4 when the signature is missing or unreadable', () => {
    for (const bad of [undefined, null, '', 'x', '4', '0/4', '4/0']) {
      const m = meterOf(bad)
      expect(m.barBeats).toBe(4)
      expect(m.known).toBe(false)
    }
    expect(meterOf('4/4').known).toBe(true)
  })
})

describe('stressAt — where the standard puts the weight', () => {
  // 4/4 quadruple: strong 1, secondary 3. The ONE meter the old floor(n/2) rule got right.
  it('4/4 = strong · weak · MEDIUM · weak', () => {
    expect(bar('4/4')).toBe('S.w.M.w.')
  })

  // 3/4 triple: strong-weak-weak. A waltz has NO accent on beat 2 — this is the 3/4 bug.
  it('3/4 = strong · weak · weak, with NO secondary stress', () => {
    expect(bar('3/4')).toBe('S.w.w.')
    expect(meterOf('3/4').mediumAt).toBeNull()
  })

  // 2/4 duple: nothing to sub-divide, so no secondary stress either.
  it('2/4 = strong · weak', () => {
    expect(bar('2/4')).toBe('S.w.')
    expect(meterOf('2/4').mediumAt).toBeNull()
  })

  // 6/8 compound duple: two dotted-quarter beats inside a 3-quarter bar. The second beat lands
  // 1.5 quarter-notes in — a position the old integer-beat rule could not even express.
  it('6/8 = two dotted-quarter beats, second at 1.5 (no secondary stress)', () => {
    expect(bar('6/8')).toBe('S..w..')
    expect(meterOf('6/8').mediumAt).toBeNull()
    expect(stressAt(meterOf('6/8'), 1.5)).toBe('weak')
    expect(stressAt(meterOf('6/8'), 3)).toBe('strong') // next bar
  })

  // 12/8 compound quadruple: four dotted-quarter beats, secondary on the third (beat 3 of 4).
  it('12/8 = four dotted-quarter beats, MEDIUM on the third', () => {
    expect(bar('12/8')).toBe('S..w..M..w..')
    expect(meterOf('12/8').mediumAt).toBeCloseTo(3, 6)
  })

  // 9/8 compound triple: three beats, strong-weak-weak like any triple meter.
  it('9/8 = three dotted-quarter beats, no secondary stress', () => {
    expect(bar('9/8')).toBe('S..w..w..')
    expect(meterOf('9/8').mediumAt).toBeNull()
  })

  // 3/2: triple, so strong-weak-weak — but each beat is a half note, so the weak beats sit at
  // 2 and 4 quarter-notes. The old rule made this bar repeat its pattern twice per bar.
  it('3/2 = strong · weak · weak with half-note beats', () => {
    expect(bar('3/2')).toBe('S...w...w...')
    expect(meterOf('3/2').mediumAt).toBeNull()
  })

  // 6/4 compound duple (two dotted halves), 9/4 compound triple (three dotted halves).
  it('6/4 = two dotted-half beats · 9/4 = three', () => {
    expect(bar('6/4')).toBe('S.....w.....')
    expect(bar('9/4')).toBe('S.....w.....w.....')
  })

  // 8/4: eight quarter beats, halves evenly → secondary on beat 5.
  it('8/4 = MEDIUM on beat 5', () => {
    expect(meterOf('8/4').mediumAt).toBeCloseTo(4, 6)
  })

  // Irregular meters group unevenly (5 = 3+2 or 2+3; 7 = 2+2+3 or 3+2+2) and the grouping is a
  // per-piece choice. We deliberately mark only the downbeat rather than stress a guessed beat.
  it('5/4 and 7/8 get a downbeat only — the grouping is not ours to guess', () => {
    expect(meterOf('5/4').mediumAt).toBeNull()
    expect(meterOf('7/8').mediumAt).toBeNull()
    expect(bar('5/4')).toBe('S.w.w.w.w.')
    expect(bar('7/8')).toBe('Swwwwww')
  })

  it('a pickup shifts the whole bar grid', () => {
    const m = meterOf('3/4')
    // song opens with a 1-beat pickup → the real downbeats are at 1, 4, 7 …
    expect(stressAt(m, 0, 1)).toBe('weak')
    expect(stressAt(m, 1, 1)).toBe('strong')
    expect(stressAt(m, 4, 1)).toBe('strong')
  })
})
