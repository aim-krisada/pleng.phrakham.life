// ใบ v3/pleng#110 — read back where the browser broke every joined line (.song-line-join) under root, letter by
// letter, and check each break against the browser's own Thai word breaker. Used by harness.js, and loaded
// into the real site page by check-real.mjs to show the harness reads the same as the site.
const WJ = String.fromCharCode(0x2060)
const wordSeg = new Intl.Segmenter('th', { granularity: 'word' })
const graphSeg = new Intl.Segmenter('th', { granularity: 'grapheme' })

// Read every joined line in `root`: where did the browser break it, and is each break at a word end?
export function audit(root) {
  const res = { lines: 0, breaks: 0, atWord: 0, atSpaceOnly: 0, bad: [], fitSplit: [], overflow: [], layout: [] }
  for (const line of root.querySelectorAll('.song-line-join')) {
    if (!line.offsetParent && getComputedStyle(line).display === 'none') continue
    const lr = line.getBoundingClientRect()
    if (!lr.width) continue
    const fs = parseFloat(getComputedStyle(line).fontSize)
    const gs = [] // { g, mid, left, right, spaceBefore }
    let pendingSpace = false
    // every text node of the line in order; only the words count (a ♦ heading / *** marker / label is a
    // separator, never part of a word)
    const tw = document.createTreeWalker(line, NodeFilter.SHOW_TEXT)
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.parentElement.closest('.lyric-words')) { if (n.data.trim()) pendingSpace = true; continue }
      for (const { segment, index } of graphSeg.segment(n.data)) {
        const g = segment.split(WJ).join('')
        if (!g.trim()) { if (/\s/.test(segment)) pendingSpace = true; continue }
        const r = document.createRange()
        r.setStart(n, index)
        r.setEnd(n, index + segment.length)
        const rect = r.getBoundingClientRect()
        if (!rect.width && !rect.height) continue
        gs.push({ g, top: rect.top, left: rect.left, right: rect.right, spaceBefore: pendingSpace })
        pendingSpace = false
      }
    }
    if (gs.length < 2) continue
    res.lines++
    const text = gs.map((x) => x.g).join('')
    const bounds = new Set()
    for (const p of wordSeg.segment(text)) bounds.add(p.index)
    let off = 0
    let row = 0
    let rowTop = gs[0].top
    const rows = [0]
    gs.forEach((x, i) => {
      if (i > 0 && x.top > rowTop + fs * 0.5) {
        row++
        rowTop = x.top
        res.breaks++
        if (bounds.has(off)) res.atWord++
        else if (x.spaceBefore) res.atSpaceOnly++
        else res.bad.push(`${text.slice(Math.max(0, off - 12), off)}|${text.slice(off, off + 12)}`)
      }
      rows.push(row)
      if (x.right > lr.right + 0.5 || x.left < lr.left - 0.5) res.overflow.push(x.g)
      off += x.g.length
    })
    // the line as it was laid out: its words, with / where the browser started a new row
    res.layout.push(gs.map((x, i) => (i > 0 && rows[i + 1] > rows[i] ? '/' : x.spaceBefore && i > 0 ? ' ' : '') + x.g).join(''))
    // ใบ#104: a วรรค (the words between two spaces) that fits the line must never be split over two rows
    let start = 0
    const phrases = []
    gs.forEach((x, i) => { if (i > 0 && x.spaceBefore) { phrases.push([start, i]); start = i } })
    phrases.push([start, gs.length])
    for (const [a, b] of phrases) {
      const r0 = rows[a + 1]
      const r1 = rows[b]
      if (r0 === r1) continue
      const probe = document.createElement('span')
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0'
      probe.textContent = gs.slice(a, b).map((x) => x.g).join('')
      line.appendChild(probe)
      const w = probe.getBoundingClientRect().width
      probe.remove()
      if (w <= line.clientWidth - 1) res.fitSplit.push(`${probe.textContent} (${Math.round(w)}px of ${line.clientWidth}px)`)
    }
  }
  return res
}

if (typeof window !== 'undefined') window.wrapAudit = audit
