// ใบ v3/pleng#110 — the page the wrap audit drives (run.mjs). It mounts the REAL SongSheet with the props the
// ฝึกร้อง page (SongViewer) or the แผ่นเพลง page (Studio) hands it, in a box exactly as wide as that page's
// sheet, then reads back where the browser actually broke every joined line — letter by letter.
import { createApp, h, nextTick } from 'vue'
import '../../src/styles.css'
import SongSheet from '../../src/components/SongSheet.vue'
import { resolveContent, inLyricSet } from '../../src/lib/songModel.js'
import anuchon from '../../src/data/bookPhrases.anuchon.json'
import { audit } from './audit.js'

// the site's own @font-face rules live in index.html — take them from there so the letters are the same
const fontsReady = fetch('/index.html').then((r) => r.text()).then((html) => {
  for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    const el = document.createElement('style')
    el.textContent = m[1].replace(/<!--[\s\S]*?-->/g, '').replace(/url\('fonts\//g, "url('/fonts/")
    document.head.appendChild(el)
  }
  return document.fonts.ready
})


// = lib/bookPhrases.js bookPhraseMap (only เล่มอนุชน has book phrasing so far)
function bookMapOf(song) {
  if (song.category !== 'anuchon') return null
  const s = String(song.number == null ? '' : song.number).trim()
  const m = (anuchon.songs || {})[/^\d+$/.test(s) ? String(Number(s)) : s]
  return m && Object.keys(m).length ? m : null
}

// the lyric sets a reader can switch between (SongViewer: content.lyricSets with >1 entry)
function setContents(content) {
  const ls = content.lyricSets
  if (!Array.isArray(ls) || ls.length < 2 || !Array.isArray(content.arrangement)) return [content]
  return ls.map((_, i) => ({ ...content, arrangement: content.arrangement.filter((e) => inLyricSet(e, i)) }))
}

const stage = document.getElementById('stage')

// surface: 'sing' (ฝึกร้อง, เนื้อล้วน) | 'sheet' (แผ่นเพลง, สมุดเพลง layout, display ครบ)
// way: 'join' | 'book' · width: the sheet's own width in px · scale: the Aa reading size (rem)
window.renderAndAudit = async function renderAndAudit(song, opts) {
  const { surface, way, width, scale } = opts
  await fontsReady
  const book = way === 'book' ? bookMapOf(song) : null
  const out = { sets: 0, book: !!book, lines: 0, breaks: 0, atWord: 0, atSpaceOnly: 0, bad: [], fitSplit: [], overflow: [], layout: [] }
  for (const c of setContents(song.content)) {
    out.sets++
    const content = { ...c, lines: resolveContent(c) }
    const props = surface === 'sing'
      ? { content, mode: 'lyrics', showChord: false, showNote: false, showLyric: true, lyricJoin: true, bookPhrases: book, interactive: true }
      : { content, mode: 'full', showChord: true, showNote: true, showLyric: true, songbook: true, lyricJoin: true, bookPhrases: book }
    stage.innerHTML = ''
    const host = document.createElement('div')
    host.className = surface === 'sing' ? 'sheet-scale' : 'sheet-read-scale'
    host.style.cssText = `width:${width}px;font-size:${scale}rem`
    stage.appendChild(host)
    const app = createApp({ render: () => h(SongSheet, props) })
    app.mount(host)
    await nextTick()
    const r = audit(host)
    app.unmount()
    for (const k of ['lines', 'breaks', 'atWord', 'atSpaceOnly']) out[k] += r[k]
    out.bad.push(...r.bad)
    out.fitSplit.push(...r.fitSplit)
    out.overflow.push(...r.overflow)
    if (opts.layout) out.layout.push(...r.layout)
  }
  return out
}
window.harnessReady = true
