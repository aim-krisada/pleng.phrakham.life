// ใบ v3/pleng#132 — แผ่นเพลง fills the page and keeps the author's line breaks.
// The arithmetic is covered in lib/fitLine.test.js; this holds the wiring and the rule that
// makes it possible — a music line that does NOT wrap, with its bars spread to both margins.
// jsdom lays nothing out, so the CSS half is read from the source, as ใบ#129 and ใบ#130 do.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'

const SRC = fs.readFileSync(path.resolve(__dirname, 'SongSheet.vue'), 'utf8')
const STUDIO = fs.readFileSync(path.resolve(__dirname, '../views/Studio.vue'), 'utf8')

const seg = (note) => ({ type: 'segment', chord: 'C', note })
const CONTENT = { key: 'G', timeSignature: '4/4', lines: [[seg('1 2 3'), { type: 'bar' }, seg('3 2 1')]] }
const render = (props = {}) => mount(SongSheet, {
  props: { content: CONTENT, mode: 'full', ...props },
  global: { stubs: { Icon: true } },
})

function rule(css, selector) {
  const re = new RegExp(`(?:^|\\n)[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`)
  const m = css.match(re)
  expect(m, `ไม่เจอกฎ ${selector}`).not.toBeNull()
  const i = m.index + m[0].indexOf(selector[0])
  return css.slice(i, css.indexOf('}', i) + 1)
}

describe('ใบ#132 — one entered line, one row, filling the page', () => {
  it('the bars of a music line reach both margins', () => {
    const body = rule(SRC, '.sheet-fit-lines .song-line:not(.song-line-lyrics)')
    expect(body).toMatch(/justify-content:\s*space-between/)
  })

  it('a bar keeps its natural size — squeezing one breaks its words inside their own cell', () => {
    const body = rule(SRC, '.sheet-fit-lines .song-line:not(.song-line-lyrics) > .bar-group')
    expect(body).toMatch(/flex-shrink:\s*0/)
  })

  it('the row still wraps, because a ท่อน heading needs a row of its own above the bars', () => {
    // forcing nowrap put the heading beside the bars; a headed line then measured about twice
    // too wide and the fit chased an impossible number down to a quarter size (song 77).
    const body = rule(SRC, '.sheet-fit-lines .song-line:not(.song-line-lyrics)')
    expect(body).not.toMatch(/flex-wrap:\s*nowrap/)
  })

  it('so the fit measures the BARS, and counts the heading only when it shares their row', () => {
    const fn = SRC.slice(SRC.indexOf('function fitLineWidths()'), SRC.indexOf('function measureSheet()'))
    expect(fn).toMatch(/:scope > \.bar-group/)
    expect(fn).toMatch(/section-label/)
    expect(fn).toMatch(/Math\.abs\(lr\.top - gr\.top\)/) // "is it on the same row?"
  })

  it('reused-verse lines are left out — spreading stacked words would only pull them apart', () => {
    expect(SRC).toContain('.sheet-fit-lines .song-line:not(.song-line-lyrics)')
    // and the measure pass skips them too, so they are never scaled either
    expect(SRC).toMatch(/classList\.contains\('song-line-lyrics'\)/)
  })

  it('the sheet only behaves this way when asked — ฝึกร้อง and the editor preview are untouched', () => {
    expect(render().find('.sheet-root').classes()).not.toContain('sheet-fit-lines')
    expect(render({ fitLines: true }).find('.sheet-root').classes()).toContain('sheet-fit-lines')
  })

  it('แผ่นเพลง is the surface that asks for it', () => {
    const sheetTag = STUDIO.slice(STUDIO.indexOf('<SongSheet'), STUDIO.indexOf('/>', STUDIO.indexOf('<SongSheet')))
    expect(sheetTag).toMatch(/\bfit-lines\b/)
    expect(sheetTag).toMatch(/\bsong-head\b/) // the same print sheet ใบ#123 and ใบ#128 wired
  })

  it('the fit runs before the ties are drawn, so the arcs land on the settled layout', () => {
    const body = SRC.slice(SRC.indexOf('function measureSheet()'))
    const fit = body.indexOf('fitLineWidths()')
    const ties = body.indexOf('measureTies()')
    expect(fit).toBeGreaterThan(-1)
    expect(ties).toBeGreaterThan(fit)
  })

  it('the measure pass is NOT called fitLines — that name is the prop, and it would shadow it', () => {
    // a function of that name wins over the prop inside the template, so the class would be
    // pinned on for every sheet, ฝึกร้อง included. Caught by the test above on first run.
    expect(SRC).not.toMatch(/function fitLines\s*\(/)
  })

  it('a reset comes first, so a line is always measured at the page size, not at last pass’s', () => {
    const fn = SRC.slice(SRC.indexOf('function fitLineWidths()'), SRC.indexOf('function measureSheet()'))
    const reset = fn.indexOf("line.style.fontSize = ''")
    const guard = fn.indexOf('if (!props.fitLines')
    expect(reset).toBeGreaterThan(-1)
    expect(guard).toBeGreaterThan(reset) // turning the prop off puts every line back
  })

  it('printing re-measures, so the paper gets the fitted layout and not the screen’s', () => {
    expect(SRC).toMatch(/addEventListener\('beforeprint', measureSheet\)/)
    expect(SRC).toMatch(/removeEventListener\('beforeprint', measureSheet\)/)
  })
})
