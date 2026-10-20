// ใบ v3/pleng#129 — every mark on แผ่นเพลง that carries MEANING must be drawn with a border (or be
// real text), never with a background colour. A browser drops background colour when it prints
// unless the reader ticks "Background graphics", and that is off by default — so a background-drawn
// mark is invisible on paper while looking perfect on screen, with nothing to warn anyone.
//
// พี่เปา 20 ต.ค. 2569: "พิมพ์ออกมาจุดล่างใต้โน้ตหาย". The octave dot is not decoration — it IS the
// pitch, so a printed sheet without it is wrong, not just plainer. The same sweep found the closing
// double bar and the whole repeat mark (both strokes + both dots) missing from paper as well.
//
// This test reads the stylesheets as text on purpose: jsdom computes styles but never prints, so
// the only thing that can actually hold this line is the source itself. ใบ#99 made the same choice
// for the beam ("drawn as a BORDER so it prints even with the browser's background graphics off").
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8')
const NOTE_ROW = read('NoteRow.vue')
const SONG_SHEET = read('SongSheet.vue')
const STYLES = read('../styles.css')

// the body of one CSS rule, by selector, from a stylesheet's text
function rule(css, selector) {
  const i = css.indexOf(selector + ' {')
  expect(i, `ไม่เจอกฎ ${selector}`).toBeGreaterThan(-1)
  return css.slice(i, css.indexOf('}', i) + 1)
}

// Each mark that has to reach paper: where it lives, and the selector that paints it.
const MUST_PRINT = [
  ['จุดบอกระดับเสียง (octave dot)', NOTE_ROW, '.odot'],
  ['จุดกลางของเฟอร์มาตา', NOTE_ROW, '.fermata::after'],
  ['เส้นจบท้ายเพลง เส้นบาง', SONG_SHEET, '.bar-final .bf-thin'],
  ['เส้นจบท้ายเพลง เส้นหนา', SONG_SHEET, '.bar-final .bf-thick'],
  ['เส้นหนาของเครื่องหมายย้อนกลับ', STYLES, '.repeat-mark .rep-bar'],
  ['เส้นบางของเครื่องหมายย้อนกลับ', STYLES, '.repeat-mark .rep-thin'],
]

describe('ใบ#129 — marks that must survive printing are drawn with a border', () => {
  for (const [label, css, selector] of MUST_PRINT) {
    it(`${label} — ${selector} uses a border, not a background`, () => {
      const body = rule(css, selector)
      expect(body).toMatch(/border(-left|-top|-right|-bottom)?:\s*[^;]*solid/)
      // `background-image`, gradients and shorthand all count: none of them print either.
      expect(body).not.toMatch(/(^|[\s;{])background(-color|-image)?:/)
    })
  }

  it('the two dots of a repeat mark use a border too (they share one rule)', () => {
    const i = STYLES.indexOf('.repeat-mark .rep-dots::before,')
    expect(i).toBeGreaterThan(-1)
    const body = STYLES.slice(i, STYLES.indexOf('}', i) + 1)
    expect(body).toMatch(/border:\s*[\d.]+px solid/)
    expect(body).not.toMatch(/(^|[\s;{])background(-color|-image)?:/)
  })

  it('an octave dot keeps the size and offset it had, so nothing on the row moves', () => {
    const body = rule(NOTE_ROW, '.odot')
    expect(body).toContain('width: 0.16em')
    expect(body).toContain('height: 0.16em')
    expect(body).toContain('margin-left: -0.08em')
    expect(body).toContain('border-radius: 50%')
    // border-box (styles.css `* { box-sizing: border-box }`) ⇒ a 0.08em border on a 0.16em box
    // fills it exactly, so the dot is the same filled circle it always was.
    expect(body).toMatch(/border:\s*0\.08em solid currentColor/)
    expect(STYLES).toMatch(/\*\s*\{\s*box-sizing:\s*border-box/)
  })

  it('screen-only highlights may still use a background — this rule is about paper', () => {
    // the sounding note's pill and the sounding syllable are feedback while playing; they are
    // never on paper, so they are deliberately left alone.
    expect(rule(NOTE_ROW, '.nt-playing .num')).toMatch(/background:/)
  })
})
