// ใบ v3/pleng#130 — แผ่นเพลง on screen must break its lines exactly where the paper will.
// พี่เปา 20 ต.ค. 2569: "บางเพลงแสดงหน้าจอไม่ตกแต่ปริ้นแล้วตก".
//
// Wrapping depends on ONE ratio: how many font-sizes wide the text box is. On paper that ratio
// is fixed — A4 is 210mm, @page leaves 16mm each side, and print pins the sheet's font to 1rem
// (16px), so the page is 178mm / 16px font-sizes wide. Give the sheet that same width in `em`
// and the ratio holds at every reading size, because width and font scale together.
//
// ใบ v3/pleng#146 turned แผ่นเพลง into ก่อนพิมพ์: the sheet is laid out ON the A4 page itself, at real
// size — 210mm wide, the @page margins as padding, the print font — and only the picture is scaled
// to the window or the zoom. So the ratio is not just kept, it is the paper's own.
//
// That only works while everything ON the line scales with the font too. A width left in `px`
// would stay put as the type grew, the line would hold more than the paper does, and the bug
// would come back quietly at any size other than the paper's. So the second half of this test
// walks the sheet's own layout rules and refuses a fixed px width among them.
//
// jsdom lays nothing out and never prints, so the source is the only place this can be held.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8')
const STUDIO = read('Studio.vue')
const STYLES = read('../styles.css')
const SONG_SHEET = read('../components/SongSheet.vue')
const NOTE_ROW = read('../components/NoteRow.vue')

// A4 portrait, minus the margins @page actually sets, over the font size print actually pins.
const A4_WIDTH_MM = 210
const PAGE_MARGIN_MM = 16 // left and right, from `@page { margin: 15mm 16mm 16mm }`
const PRINT_FONT_PX = 16 // `.sheet-read-scale { font-size: 1rem !important }` in print
const paperEm = (((A4_WIDTH_MM - 2 * PAGE_MARGIN_MM) / 25.4) * 96) / PRINT_FONT_PX

// Every rule whose selector list STARTS with this exact selector, anchored at a line start so
// `.num` never picks up `.nt-playing .num`. Plural because a selector may appear twice — once
// plainly and once inside @media screen.
function rules(css, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const out = []
  for (const m of css.matchAll(new RegExp(`(?:^|\\n)[ \\t]*${esc}\\s*\\{`, 'g'))) {
    const i = m.index + m[0].indexOf(selector[0])
    out.push(css.slice(i, css.indexOf('}', i) + 1))
  }
  expect(out.length, `ไม่เจอกฎ ${selector}`).toBeGreaterThan(0)
  return out
}
// the one rule carrying this property (a property lives in exactly one of them)
function rule(css, selector, prop) {
  const all = rules(css, selector)
  const hit = prop ? all.find((b) => b.includes(prop + ':')) : all[0]
  expect(hit, `ไม่เจอกฎ ${selector} ที่มี ${prop}`).toBeTruthy()
  return hit
}

describe('ใบ#130 · ใบ#146 — the sheet on screen is the page', () => {
  const paper = () => rule(STUDIO, '.pv-paper', 'transform-origin')

  it('the page is 42.0472 font-sizes wide — the number the margins and the print font give', () => {
    expect(paperEm).toBeCloseTo(42.0472, 4)
    // the preview paper is that page: real A4 width, the text box inside the padding, the print font
    expect(paper()).toMatch(/width:\s*210mm/)
    expect(paper()).toMatch(/box-sizing:\s*border-box/)
    expect(paper()).toMatch(/font-size:\s*1rem/)
  })

  it('the margins and the print font this number is built from are still what the CSS says', () => {
    expect(STYLES).toMatch(/@page \{ margin: 15mm 16mm 16mm; \}/)
    expect(paper()).toMatch(/padding:\s*15mm 16mm 16mm/)
    // a border would eat into the text box — the edge is drawn as a shadow
    expect(paper()).toMatch(/border:\s*0/)
    // and print pins the sheet to 1rem whatever the screen did
    expect(STUDIO).toMatch(/\.pv-paper \{ font-size: 1rem !important; \}/)
  })

  it('the sheet fills the paper\'s text box and takes the paper\'s font, never its own', () => {
    const root = rule(STUDIO, '.pv-paper :deep(.sheet-root)')
    expect(root).toMatch(/width:\s*100%/)
    expect(root).toMatch(/font-size:\s*inherit/)
  })

  it('only the picture is scaled: a transform the sheet\'s measuring knows about, gone in print', () => {
    expect(STUDIO).toMatch(/data-layout-scale :style="\{ transform: `scale\(\$\{scale\}\)`/)
    expect(SONG_SHEET).not.toMatch(/getBoundingClientRect/) // every box goes through lib/layoutRect.js
    expect(NOTE_ROW).toMatch(/layoutRect\(/)
    expect(STUDIO).toMatch(/\.pv-paper \{ transform: none !important; \}/)
  })

  it('the top-bar Aa does not enlarge the paper (ใบ#140 locks its size · พี่เอม 2 พ.ย. 2569: no size setting)', () => {
    expect(STUDIO).not.toMatch(/readingFontScale/)
    expect(STUDIO).not.toMatch(/--sheet-aa/)
  })
})

// Every rule below sits on a music line and takes room along it. One px among them and the
// screen stops matching the paper as soon as the reader changes the size.
const ON_THE_LINE = [
  ['ระยะห่างข้างตัวเลขโน้ต', NOTE_ROW, '.num', ['padding']],
  ['เส้นจบท้ายเพลง เส้นบาง', SONG_SHEET, '.bar-final .bf-thin', ['width', 'border-left']],
  ['เส้นจบท้ายเพลง เส้นหนา', SONG_SHEET, '.bar-final .bf-thick', ['width', 'border-left']],
  ['เส้นแบ่งห้อง', STYLES, '.bar-line', ['border-left']],
  ['เส้นจบท้ายเพลง (ไฟล์กลาง)', STYLES, '.bar-final', ['width', 'border-left', 'border-right']],
  ['เส้นหนาของเครื่องหมายย้อนกลับ', STYLES, '.repeat-mark .rep-bar', ['width', 'border-left']],
  ['เส้นบางของเครื่องหมายย้อนกลับ', STYLES, '.repeat-mark .rep-thin', ['width', 'border-left']],
  ['ช่องจุดของเครื่องหมายย้อนกลับ', STYLES, '.repeat-mark .rep-dots', ['width']],
  ['ป้ายจบ 1. 2.', STYLES, '.volta-tag', ['padding', 'margin', 'border-top', 'border-left']],
]

describe('ใบ#130 — nothing on a music line is measured in px', () => {
  for (const [label, css, selector, props] of ON_THE_LINE) {
    it(`${label} — ${selector}: ${props.join(' · ')} ใช้ em`, () => {
      for (const prop of props) {
        const decl = rule(css, selector, prop).match(new RegExp(`${prop}:([^;]+)`))[1]
        expect(decl, `${selector} ${prop} ยังเป็น px`).not.toMatch(/\d\s*px/)
        expect(decl, `${selector} ${prop} ไม่มีค่า em`).toMatch(/[\d.]+em/)
      }
    })
  }

  it('the gaps that hold a two-stroke bar apart are em as well', () => {
    expect(rule(SONG_SHEET, '.bar-final', 'gap')).toMatch(/gap:\s*[\d.]+em/)
    expect(rule(STYLES, '.repeat-mark', 'gap')).toMatch(/gap:\s*[\d.]+em/)
  })

  it('each converted length is still the size it was at the print font (16px)', () => {
    // the LAST em in the declaration — `padding: 0 0.0625em` means the horizontal one
    const px = (css, selector, prop) => {
      const decl = rule(css, selector, prop).match(new RegExp(`${prop}:([^;]+)`))[1]
      const ems = [...decl.matchAll(/([\d.]+)em/g)].map((m) => Number(m[1]))
      expect(ems.length, `${selector} ${prop} ไม่มีค่า em`).toBeGreaterThan(0)
      return ems[ems.length - 1] * 16
    }
    expect(px(NOTE_ROW, '.num', 'padding')).toBeCloseTo(1, 2)
    expect(px(STYLES, '.bar-line', 'border-left')).toBeCloseTo(2, 2)
    expect(px(SONG_SHEET, '.bar-final .bf-thick', 'width')).toBeCloseTo(4, 2)
    expect(px(STYLES, '.repeat-mark .rep-dots', 'width')).toBeCloseTo(5, 2)
  })
})
