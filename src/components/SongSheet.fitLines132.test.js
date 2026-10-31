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
  // พี่เปา 22 ต.ค. 2569: "ถ้าสั้นเกินก็ขยายช่องไฟออก แทน" — the slack goes INSIDE the bars, not between them
  it('a short line reaches both margins by widening the spacing inside its bars, not by holes between them', () => {
    expect(SRC).not.toMatch(/justify-content:\s*space-between/)
    expect(rule(SRC, '.sheet-fit-lines .song-line:not(.song-line-lyrics) > .bar-group')).toMatch(/flex:\s*1 0 auto/)
    // the chord segments grow with their bar, so the notes and words inside spread out
    expect(rule(SRC, '.sheet-fit-lines .song-line:not(.song-line-lyrics) > .bar-group > .segment')).toMatch(/flex:\s*1 0 auto/)
  })

  it('nothing shrinks — squeezing a bar breaks its words inside their own cell', () => {
    expect(rule(SRC, '.sheet-fit-lines .song-line:not(.song-line-lyrics) > .bar-group')).toMatch(/1 0 auto/) // flex-shrink 0
  })

  it('the fit measures the NATURAL width — growth is switched off while it measures', () => {
    const fn = SRC.slice(SRC.indexOf('function fitLineWidths()'), SRC.indexOf('function measureSheet()'))
    expect(fn.indexOf("classList.add('fit-measure')")).toBeGreaterThan(-1)
    expect(fn.indexOf("classList.add('fit-measure')")).toBeLessThan(fn.indexOf('fitScale('))
    expect(fn.indexOf("classList.remove('fit-measure')")).toBeGreaterThan(fn.indexOf('fitScale('))
    expect(SRC).toMatch(/\.song-line\.fit-measure > \.bar-group,[\s\S]*?flex-grow:\s*0/)
  })

  it('the row still wraps, because a ท่อน heading needs a row of its own above the bars', () => {
    // forcing nowrap put the heading beside the bars; a headed line then measured about twice
    // too wide and the fit chased an impossible number down to a quarter size (song 77).
    // no sheet-fit-lines rule may turn wrapping off
    expect(SRC).not.toMatch(/\.sheet-fit-lines[^{]*\{[^}]*flex-wrap:\s*nowrap/)
  })

  it('so the fit measures what shares the row with the bars, and counts the heading only when it does too', () => {
    const fn = SRC.slice(SRC.indexOf('function naturalWidth('), SRC.indexOf('function spreadBars('))
    expect(fn).toMatch(/line\.children/) // every item on the row — since ใบ#140 the end mark too
    expect(fn).toMatch(/\.tie-overlay, \.section-label/) // neither is measured as a row item
    expect(fn).toMatch(/Math\.abs\(label\.getBoundingClientRect\(\)\.top - first\.getBoundingClientRect\(\)\.top\)/) // "is it on the same row?"
  })

  it('reused-verse lines are left out — spreading stacked words would only pull them apart', () => {
    expect(SRC).toContain('.sheet-fit-lines .song-line:not(.song-line-lyrics)')
    // and the measure pass skips them too, so they are never fitted or spread (ใบ#140 still gives
    // them the song's one size, so their words match the words under the notes)
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
