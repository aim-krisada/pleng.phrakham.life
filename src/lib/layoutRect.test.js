// ใบ v3/pleng#146 — ก่อนพิมพ์ shrinks only the PICTURE of the paper. A box measured inside it must come
// back at its layout size, or the sheet would fit its lines to the picture instead of the page.
import { describe, it, expect } from 'vitest'
import { layoutRect, layoutScale } from './layoutRect.js'

const box = (el, r) => { el.getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height }); return el }

function scaledPaper(k) {
  const paper = document.createElement('div')
  paper.setAttribute('data-layout-scale', '')
  Object.defineProperty(paper, 'offsetWidth', { value: 794 })
  box(paper, { left: 10, top: 20, width: 794 * k, height: 1123 * k })
  const line = box(document.createElement('div'), { left: 10 + 60 * k, top: 20 + 100 * k, width: 672 * k, height: 50 * k })
  paper.appendChild(line)
  document.body.appendChild(paper)
  return { paper, line }
}

describe('layoutRect', () => {
  it('outside ก่อนพิมพ์ it is getBoundingClientRect itself', () => {
    const el = box(document.createElement('div'), { left: 3, top: 4, width: 50, height: 6 })
    expect(layoutScale(el)).toBe(1)
    expect(layoutRect(el).width).toBe(50)
  })

  it('inside a picture shrunk to 44%, a box is its real size again', () => {
    const { line } = scaledPaper(0.44)
    expect(layoutScale(line)).toBeCloseTo(0.44, 6)
    expect(layoutRect(line).width).toBeCloseTo(672, 6)
    expect(layoutRect(line).height).toBeCloseTo(50, 6)
  })

  it('distances between two boxes come back at real size too', () => {
    const { paper, line } = scaledPaper(0.5)
    expect(layoutRect(line).top - layoutRect(paper).top).toBeCloseTo(100, 6)
    expect(layoutRect(line).left - layoutRect(paper).left).toBeCloseTo(60, 6)
  })

  it('a zoom above real size works the same way', () => {
    const { line } = scaledPaper(2)
    expect(layoutRect(line).width).toBeCloseTo(672, 6)
  })
})
