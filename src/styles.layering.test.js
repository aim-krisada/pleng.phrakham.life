// Guard for the layering ladder (bug: ป๊อปอัปแถบเครื่องมือไปอยู่หลังเมนูบนสุด · 23 ก.ค.).
// Root cause was two bare z-index numbers drifting apart: .nib (45) < .shell-bar (50), so the
// note toolbar and its คอร์ด ▾ picker painted BEHIND the sticky header. The fix is a single
// ladder of tokens in styles.css; these tests keep it single and keep it ordered.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// jsdom gives import.meta.url a non-file scheme, so anchor on the project root instead.
const SRC = join(process.cwd(), 'src')
const CSS = readFileSync(join(SRC, 'styles.css'), 'utf8')

function ladder() {
  const out = {}
  for (const m of CSS.matchAll(/^\s*(--z-[a-z-]+):\s*(\d+);/gm)) out[m[1]] = Number(m[2])
  return out
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') walk(p, acc) }
    else if (/\.(vue|css|js)$/.test(name) && !/\.test\.js$/.test(name)) acc.push(p)
  }
  return acc
}

describe('z-index ladder', () => {
  const L = ladder()

  it('defines every tier exactly once, in styles.css', () => {
    for (const t of ['--z-sheet', '--z-raised', '--z-sticky', '--z-dock', '--z-inline-edit',
      '--z-nav', '--z-popover', '--z-scrim', '--z-drawer', '--z-modal', '--z-toast']) {
      expect(L[t], `${t} missing from the :root ladder`).toBeTypeOf('number')
    }
  })

  it('is strictly ascending', () => {
    const order = ['--z-sheet', '--z-raised', '--z-sticky', '--z-dock', '--z-inline-edit',
      '--z-nav', '--z-popover', '--z-scrim', '--z-drawer', '--z-modal', '--z-toast']
    for (let i = 1; i < order.length; i++) {
      expect(L[order[i]], `${order[i]} must sit above ${order[i - 1]}`).toBeGreaterThan(L[order[i - 1]])
    }
  })

  // THE bug, stated as an invariant: anchored popovers must out-rank the sticky app header,
  // or anything that scrolls up to the header band disappears behind it.
  it('puts popovers above the app header', () => {
    expect(L['--z-popover']).toBeGreaterThan(L['--z-nav'])
  })

  it('keeps fixed docks below the app header', () => {
    expect(L['--z-dock']).toBeLessThan(L['--z-nav'])
  })

  it('has no bare z-index number left anywhere in src/', () => {
    const offenders = []
    for (const file of walk(SRC)) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/z-index\s*:\s*([^;'"\n]+)/g)) {
        const value = m[1].trim()
        if (!value.startsWith('var(--z-')) offenders.push(`${relative(SRC, file)}: z-index: ${value}`)
      }
    }
    expect(offenders, 'every z-index must read a --z-* token from the styles.css ladder').toEqual([])
  })
})

describe('the components that broke', () => {
  // 24 ก.ค. — the toolbar no longer floats AT ALL. It used to be a popup anchored to the
  // selected note (hence the z-index fights above); hit-testing the real app showed it hiding
  // up to 92 of 279 visible note/word cells, i.e. the line being typed on. It is a docked flex
  // child of the editing frame now, so the only way it can go back to covering the sheet is if
  // someone gives it a position/z-index again. That is what this test forbids.
  it('NoteInputBar is DOCKED — it never positions itself over the sheet', () => {
    const nib = readFileSync(join(SRC, 'components/NoteInputBar.vue'), 'utf8')
    const style = nib.slice(nib.indexOf('<style'))
    expect(style, 'the tool dock must not be fixed/absolute — it takes its own room in the frame')
      .not.toMatch(/position:\s*(fixed|absolute)/)
    expect(style, 'a docked toolbar needs no stacking tier: nothing is under it')
      .not.toMatch(/z-index\s*:/)
  })

  it('the editing frame keeps the sheet in its own scroll region', () => {
    const sv = readFileSync(join(SRC, 'components/SongViewer.vue'), 'utf8')
    // the frame sits one tier BELOW the shell bar, so the mode tabs stay clickable while editing
    expect(sv).toMatch(/\.sv-frame\s*\{[^}]*position:\s*fixed/)
    expect(sv).toMatch(/\.sv-frame\s*\{[^}]*z-index:\s*var\(--z-dock\)/)
    expect(sv).toMatch(/\.sv-frame\s*>\s*\.sv-doc\s*\{[^}]*overflow-y:\s*auto/)
  })

  it('the shell bar owns --z-nav', () => {
    expect(CSS).toMatch(/\.shell-bar\s*\{[^}]*z-index:\s*var\(--z-nav\)/)
  })

  // Shared with phrakham, which does not load styles.css → the token needs its old value as a
  // fallback there, or phrakham's drawer/dock silently drops to z-index:auto.
  it('shared pk-* cores keep a fallback value', () => {
    const drawer = readFileSync(join(SRC, 'lib/pk-drawer.js'), 'utf8')
    expect(drawer).toMatch(/var\(--z-drawer,\s*1050\)/)
    expect(drawer).toMatch(/var\(--z-scrim,\s*1040\)/)
    const dock = readFileSync(join(SRC, 'components/DockKey.vue'), 'utf8')
    expect(dock).toMatch(/var\(--z-dock,\s*90\)/)
  })
})
