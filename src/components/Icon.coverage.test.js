// Icon.vue renders `ICONS[name] || ''` — an unknown name yields an EMPTY <svg>, so a missing
// glyph disappears silently instead of failing. That is how the R4 orphan-flow warning shipped
// with no triangle (tester, 24 ก.ค.). This test is the guard: every icon name reachable from
// source must exist in ICONS.
//   - static  `<Icon name="x">`            → scanned from the templates
//   - dynamic `<Icon :name="a ? 'x':'y'">` → the string literals inside the expression
//   - data    `{ icon: 'x' }` descriptors  → every icon-valued literal in src (DockKey /
//                                            SoundControl / Studio / auditLog feed these)
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(vue|js)$/.test(name) && !/\.test\.js$/.test(name) ? [p] : []
  })
}

const iconKeys = (() => {
  const src = readFileSync(join(SRC, 'components/Icon.vue'), 'utf8')
  const map = src.slice(src.indexOf('const ICONS'), src.indexOf('const VIEWBOX'))
  return new Set([...map.matchAll(/^ {2}'?([a-z0-9-]+)'?: '/gm)].map((m) => m[1]))
})()

const files = sourceFiles(SRC)

// name → the files that ask for it
function collect(pattern, pick) {
  const found = new Map()
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(pattern)) {
      for (const name of pick(m)) {
        if (!found.has(name)) found.set(name, new Set())
        found.get(name).add(f.slice(SRC.length + 1).replace(/\\/g, '/'))
      }
    }
  }
  return found
}

function expectAllKnown(found) {
  const missing = [...found]
    .filter(([name]) => !iconKeys.has(name))
    .map(([name, where]) => `${name} (${[...where].join(', ')})`)
  expect(missing).toEqual([])
}

describe('Icon coverage — no name renders an empty <svg>', () => {
  it('has glyphs for the ICONS map itself', () => {
    expect(iconKeys.size).toBeGreaterThan(60)
  })

  it('every static <Icon name="…"> resolves', () => {
    const found = collect(/<Icon\b[\s\S]*?\/?>/g, (m) => {
      const name = m[0].match(/(?<![:\w-])name="([^"]+)"/)
      return name ? [name[1]] : []
    })
    expect(found.size).toBeGreaterThan(40)
    expectAllKnown(found)
  })

  it('every string literal inside a dynamic :name expression resolves', () => {
    const found = collect(/<Icon\b[\s\S]*?\/?>/g, (m) => {
      const expr = m[0].match(/:name="([^"]+)"/)
      return expr ? [...expr[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]) : []
    })
    expectAllKnown(found)
  })

  it('every `icon: \'…\'` descriptor value resolves', () => {
    expectAllKnown(collect(/\bicon: '([a-z0-9-]+)'/g, (m) => [m[1]]))
  })
})
