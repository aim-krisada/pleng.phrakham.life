// ใบ v3/pleng#140 — แผ่นเพลง looks the same in every song: one type size for the whole song, the end
// mark stays on its line, and a short line spreads evenly instead of pulling one note far away.
// พี่เปา 31 ต.ค. 2569: "ทั้งเพลงเดี๋ยวตัวเล็กตัวใหญ่ ดูแล้วไม่เป็นระเบียบ … เลือกทั้งเพลงให้ฟ้อนเท่ากัน".
// jsdom lays nothing out, so the wiring is read from the source, as the ใบ#132 test does; the
// arithmetic is in lib/fitLine.test.js. Checked by hand on 22 songs in the browser (31 ต.ค. 2569).
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const SRC = fs.readFileSync(path.resolve(__dirname, 'SongSheet.vue'), 'utf8')
const body = (name, next) => SRC.slice(SRC.indexOf(`function ${name}(`), SRC.indexOf(`function ${next}(`))

describe('ใบ#140 — one size for the whole song', () => {
  const fn = body('fitLineWidths', 'naturalWidth')

  it('every line is fitted first, then the whole song takes the SMALLEST size', () => {
    expect(fn).toMatch(/songScale = Math\.min\(songScale, fitScale\(/)
    // applied after the loop that fits, to every line — words-only lines included
    expect(fn.indexOf('for (const line of lines) apply(line, songScale)')).toBeGreaterThan(fn.indexOf('fitScale('))
  })

  it('the bars are spread at that one size, while growth is still switched off for measuring', () => {
    const spread = fn.indexOf('spreadBars(line)')
    expect(spread).toBeGreaterThan(fn.indexOf('apply(line, songScale)'))
    expect(fn.indexOf("classList.remove('fit-measure')")).toBeGreaterThan(spread)
  })

  it('a re-measure starts clean — no size, no spacing, no empty end left from last time', () => {
    const reset = fn.slice(0, fn.indexOf('if (!props.fitLines'))
    expect(reset).toMatch(/fontSize = ''/)
    expect(reset).toMatch(/paddingRight = ''/)
    expect(reset).toMatch(/flexGrow = ''/)
  })
})

describe('ใบ#140 — the end mark stays on its line', () => {
  const fn = body('naturalWidth', 'spreadBars')

  it('the fit counts everything on the row, not just the bars — the end mark ‖ was left out', () => {
    expect(fn).toMatch(/for \(const el of line\.children\)/)
    expect(fn).not.toMatch(/querySelectorAll\(':scope > \.bar-group, :scope > \.stack-labels'\)/)
  })

  it('margins count — the end mark sits 0.6em off the last bar on each side', () => {
    expect(fn).toMatch(/marginLeft/)
    expect(fn).toMatch(/marginRight/)
  })

  it('a line the author split in two (.lyric-cut) must fit by its wider half, not by both together', () => {
    expect(fn).toMatch(/lyric-cut/)
    expect(fn).toMatch(/widest = Math\.max\(widest, row\)/)
  })
})

describe('ใบ#140 — a short line spreads evenly', () => {
  const fn = body('spreadBars', 'measureSheet')

  it('each bar and chord segment grows in proportion to its own width, so the gaps stay even', () => {
    expect(fn).toMatch(/:scope > \.bar-group, :scope > \.bar-group > \.segment/)
    expect(fn).toMatch(/style\.flexGrow = String\(/)
  })

  it('the natural width is read BEFORE flex-grow goes inline — inline outranks fit-measure', () => {
    expect(fn.indexOf('naturalWidth(line)')).toBeGreaterThan(-1)
    expect(fn.indexOf('naturalWidth(line)')).toBeLessThan(fn.indexOf('style.flexGrow ='))
  })

  it('a line too short to fill the page stops at the limit and leaves the rest of the row empty', () => {
    expect(fn).toMatch(/spreadPadding\(line\.clientWidth, naturalWidth\(line\)\)/)
    expect(fn).toMatch(/paddingRight = pad \+ 'px'/)
  })
})
