// Dependency-free test for notationLint. Run: `node src/lib/notationLint.test.mjs`
// Exits non-zero on any failure. No test framework is installed in this project.

import { lintBar, lintLine, SEVERITY } from './notationLint.js'

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

console.log(`\nnotationLint: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
