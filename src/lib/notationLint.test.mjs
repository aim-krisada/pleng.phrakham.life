// Dependency-free test for notationLint. Run: `node src/lib/notationLint.test.mjs`
// Exits non-zero on any failure. No test framework is installed in this project.

import { lintBar, lintLine, lintRepeatVolta, SEVERITY } from './notationLint.js'

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++ } else { fail++; console.error('  ✗ FAIL:', name) }
}
const codes = (findings) => findings.map((f) => f.code).sort()
const has = (findings, code) => findings.some((f) => f.code === code)

// --- natural (♮) misuse: the พี่เปา case ---
check('n3 alone → warns natural-no-effect',
  has(lintBar('n3'), 'natural-no-effect'))
check('natural finding is a WARNING',
  lintBar('n3').find((f) => f.code === 'natural-no-effect')?.severity === SEVERITY.WARNING)
check('#3 n3 (valid cancel) → no natural warning',
  !has(lintBar('#3 n3'), 'natural-no-effect'))
check('b3 n3 (valid cancel of a flat) → no natural warning',
  !has(lintBar('b3 n3'), 'natural-no-effect'))
check('plain 3 does NOT satisfy the cancel (3 n3 still warns)',
  has(lintBar('3 n3'), 'natural-no-effect'))
check('octave-aware: #3 then n3\' (different octave) still warns',
  has(lintBar("#3 n3'"), 'natural-no-effect'))
check('octave-matched: #3\' n3\' → no warning',
  !has(lintBar("#3' n3'"), 'natural-no-effect'))
check('two naturals, one valid one not: #3 n3 n3 → exactly one warning',
  lintBar('#3 n3 n3').filter((f) => f.code === 'natural-no-effect').length === 1)

// --- beats vs time signature ---
check('3 beats in 4/4 → beats warning',
  has(lintBar('1 2 3', { timeSignature: '4/4' }), 'beats'))
check('4 beats in 4/4 → no beats warning',
  !has(lintBar('1 2 3 4', { timeSignature: '4/4' }), 'beats'))
check('extend counts: 1 - - - = 4 beats in 4/4 → clean',
  !has(lintBar('1 - - -', { timeSignature: '4/4' }), 'beats'))
check('no time signature → no beats warning',
  !has(lintBar('1 2 3'), 'beats'))
check('6/8 expects 3 quarter-beats: 1 2 3 → clean',
  !has(lintBar('1 2 3', { timeSignature: '6/8' }), 'beats'))

// --- unreadable tokens ---
check('stray letter x → unreadable ERROR',
  lintBar('1 x 3').find((f) => f.code === 'unreadable')?.severity === SEVERITY.ERROR)
check('unreadable suppresses the beats check (no double-noise)',
  !has(lintBar('1 x 3', { timeSignature: '4/4' }), 'beats'))

// --- empty / whitespace ---
check('empty string → no findings', lintBar('').length === 0)
check('whitespace only → no findings', lintBar('   ').length === 0)

// --- clean, valid bars produce nothing ---
check('clean 4/4 bar with a valid cancel → no findings',
  lintBar('#4 4 n4 4', { timeSignature: '4/4' }).length === 0)

// --- lintLine tags bars ---
const line = lintLine('n3 | #4 n4', { timeSignature: '4/4' })
check('lintLine: natural warning tagged to bar 0',
  line.some((f) => f.code === 'natural-no-effect' && f.bar === 0))
check('lintLine: bar 1 (#4 n4) has NO natural warning',
  !line.some((f) => f.code === 'natural-no-effect' && f.bar === 1))
check('lintLine: bar indices present on every finding',
  line.every((f) => typeof f.bar === 'number'))

// --- R4: slur (เอื้อน) must open+close inside one bar ---
check('R4: ( with no ) → slur-crosses-bar',
  has(lintBar('( 1 2'), 'slur-crosses-bar'))
check('R4: ) with no ( → slur-crosses-bar',
  has(lintBar('1 2 )'), 'slur-crosses-bar'))
check('R4: balanced ( 1 2 ) → no slur warning',
  !has(lintBar('( 1 2 )'), 'slur-crosses-bar'))
check('R4: nested balanced (( 1 2 )) → no slur warning',
  !has(lintBar('(( 1 2 ))'), 'slur-crosses-bar'))
check('R4: severity is WARNING',
  lintBar('( 1').find((f) => f.code === 'slur-crosses-bar')?.severity === SEVERITY.WARNING)
check('R4: triplet {} does not trigger the slur rule',
  !has(lintBar('{ 1 2 3'), 'slur-crosses-bar'))
check('R4: lintLine catches a slur split across a barline',
  has(lintLine('( 1 2 | 3 )'), 'slur-crosses-bar'))

// --- R5: tie (~) between different pitches ---
check('R5: 1~ ~2 (tie to a different degree) → tie-cross-pitch',
  has(lintBar('1~ ~2'), 'tie-cross-pitch'))
check('R5: 1~ ~1 (same pitch tie) → no warning',
  !has(lintBar('1~ ~1'), 'tie-cross-pitch'))
check("R5: 1~ ~1' (tie across octave) → tie-cross-pitch",
  has(lintBar("1~ ~1'"), 'tie-cross-pitch'))
check('R5: severity is WARNING',
  lintBar('1~ ~2').find((f) => f.code === 'tie-cross-pitch')?.severity === SEVERITY.WARNING)
check('R5: #1~ ~1 (same degree, inherited accidental) → no warning',
  !has(lintBar('#1~ ~1'), 'tie-cross-pitch'))
check('R5: no tie marks (1 2) → no warning',
  !has(lintBar('1 2'), 'tie-cross-pitch'))

// --- R6: rest (0) carrying accidental / octave dot / augmentation dot ---
check('R6: #0 (rest with sharp) → rest-decorated',
  has(lintBar('#0'), 'rest-decorated'))
check('R6: n0 (rest with natural) → rest-decorated',
  has(lintBar('n0'), 'rest-decorated'))
check('R6: 0. (dotted rest) → rest-decorated',
  has(lintBar('0.'), 'rest-decorated'))
check('R6: .0 (low-octave rest) → rest-decorated',
  has(lintBar('.0'), 'rest-decorated'))
check("R6: 0' (high-octave rest) → rest-decorated",
  has(lintBar("0'"), 'rest-decorated'))
check('R6: plain rest 0 → no warning',
  !has(lintBar('0'), 'rest-decorated'))
check('R6: severity is WARNING',
  lintBar('#0').find((f) => f.code === 'rest-decorated')?.severity === SEVERITY.WARNING)

// --- R7: #3 / b4 / #7 / b1 — accidentals that are really a plain neighbour ---
check('R7: #3 → accidental-not-in-scale',
  has(lintBar('#3'), 'accidental-not-in-scale'))
check('R7: b4 → accidental-not-in-scale',
  has(lintBar('b4'), 'accidental-not-in-scale'))
check('R7: #7 → accidental-not-in-scale',
  has(lintBar('#7'), 'accidental-not-in-scale'))
check('R7: b1 → accidental-not-in-scale',
  has(lintBar('b1'), 'accidental-not-in-scale'))
check("R7: #7' (any octave) still flagged",
  has(lintBar("#7'"), 'accidental-not-in-scale'))
check('R7: real accidental #4 → no warning',
  !has(lintBar('#4'), 'accidental-not-in-scale'))
check('R7: real accidental b3 → no warning',
  !has(lintBar('b3'), 'accidental-not-in-scale'))
check('R7: plain degree 3 → no warning',
  !has(lintBar('3'), 'accidental-not-in-scale'))
check('R7: severity is WARNING',
  lintBar('#3').find((f) => f.code === 'accidental-not-in-scale')?.severity === SEVERITY.WARNING)

// --- combined clean bar (all R1-R7 quiet) ---
check('clean bar with slur, valid tie, real accidental → no findings',
  lintBar('( #4 4 ) 1~ ~1', { timeSignature: '4/4' }).length === 0)

// --- R8: repeat marks (‖: / :‖) must pair up (flat, alternating) ---
const rStart = { type: 'repeat-start' }
const rEnd = { type: 'repeat-end' }
const v = (num) => ({ type: 'volta', num })

check('R8: balanced ‖: :‖ → no findings',
  lintRepeatVolta([rStart, rEnd]).length === 0)
check('R8: ‖: alone (no close) → repeat-unbalanced',
  has(lintRepeatVolta([rStart]), 'repeat-unbalanced'))
check('R8: :‖ alone (no open) → repeat-unbalanced',
  has(lintRepeatVolta([rEnd]), 'repeat-unbalanced'))
check('R8: ‖: ‖: :‖ (double open, one close) → repeat-unbalanced',
  has(lintRepeatVolta([rStart, rStart, rEnd]), 'repeat-unbalanced'))
check('R8: ‖: :‖ :‖ (extra close) → repeat-unbalanced',
  has(lintRepeatVolta([rStart, rEnd, rEnd]), 'repeat-unbalanced'))
check('R8: two clean sequential sections ‖: :‖ ‖: :‖ → no findings',
  lintRepeatVolta([rStart, rEnd, rStart, rEnd]).length === 0)
check('R8: severity is WARNING',
  lintRepeatVolta([rStart]).find((f) => f.code === 'repeat-unbalanced')?.severity === SEVERITY.WARNING)
check('R8: :‖ ‖: (close before open, both stray) → two repeat-unbalanced findings',
  lintRepeatVolta([rEnd, rStart]).filter((f) => f.code === 'repeat-unbalanced').length === 2)
check('R8: non-marker items are ignored',
  lintRepeatVolta([{ type: 'note' }, rStart, { type: 'bar' }, rEnd]).length === 0)

// --- R9: volta (จบรอบ N) endings must be a complete, ordered set ---
check('R9: จบรอบ 1 + 2 in order → no findings',
  lintRepeatVolta([v(1), v(2)]).length === 0)
check('R9: no voltas at all → no findings',
  lintRepeatVolta([rStart, rEnd]).length === 0)
check('R9: lone จบรอบ 1 (missing รอบ 2) → volta-incomplete',
  has(lintRepeatVolta([v(1)]), 'volta-incomplete'))
check('R9: lone จบรอบ 2 (missing รอบ 1) → volta-incomplete',
  has(lintRepeatVolta([v(2)]), 'volta-incomplete'))
check('R9: จบรอบ 2 before จบรอบ 1 → volta-order',
  has(lintRepeatVolta([v(2), v(1)]), 'volta-order'))
check('R9: duplicate จบรอบ 1 1 2 → volta-order',
  has(lintRepeatVolta([v(1), v(1), v(2)]), 'volta-order'))
check('R9: three complete endings 1 2 3 → no findings',
  lintRepeatVolta([v(1), v(2), v(3)]).length === 0)
check('R9: 1 2 (complete) does NOT flag volta-order',
  !has(lintRepeatVolta([v(1), v(2)]), 'volta-order'))
check('R9: severity is WARNING',
  lintRepeatVolta([v(1)]).find((f) => f.code === 'volta-incomplete')?.severity === SEVERITY.WARNING)

// --- combined: full valid repeat with two endings → clean ---
check('R8+R9: ‖: ... 1. :‖ 2. → clean',
  lintRepeatVolta([rStart, v(1), rEnd, v(2)]).length === 0)

// --- edge: non-array / empty input ---
check('lintRepeatVolta(undefined) → no findings', lintRepeatVolta(undefined).length === 0)
check('lintRepeatVolta([]) → no findings', lintRepeatVolta([]).length === 0)

console.log(`\nnotationLint: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
