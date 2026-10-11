// ใบ v3/pleng#104 — "ถ้าวรรคเดียวกันตกไปบรรทัดใหม่ ให้ไปทั้งวรรค" (พี่เอม 11 ต.ค. 2569).
// ใบ v3/pleng#110 — …but a วรรค WIDER than the whole line must then wrap between two WORDS, never inside one.
// Before ใบ#110 every joint inside a วรรค carried a WORD JOINER (U+2060), so an over-long วรรค had nowhere left
// to wrap, and the last resort (overflow-wrap: anywhere) cut it at any letter: "ประจัก|ษ์", "ทั้งม|วล" (เพลง 141
// on a phone). Now:
//   * each วรรค is its own box (.phrase — an inline-block no wider than the line), so a วรรค that fits the line
//     moves to the next line whole (ใบ#104), and one that does not fit wraps inside its own box;
//   * inside the box, the end of each word (the browser's own Thai word breaker) carries a <wbr> — the only
//     place it may wrap — and every joint INSIDE a word keeps the WORD JOINER;
//   * a syllable itself never wraps, and nothing in the rules may cut a word any more.
// jsdom does no layout, so the real wrapping was measured in Chromium for ใบ#110 (tools/wrap-audit/): every
// published song, both joined ways, at 360 · 375 · 390 · 712 px — 0 breaks inside a word.
//
// The printed page count must not grow (ใบ#101): the joiner and <wbr> are zero-width and invisible, and the
// วรรค box adds no width — the same words sit in the same places on a line wide enough to hold them.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import songSheetSource from './SongSheet.vue?raw'

const WJ = String.fromCharCode(0x2060)
const strip = (s) => s.split(WJ).join('')
const seg = (note, syllables) => ({ type: 'segment', chord: 'C', note, syllables })
const line = (melodyFirst, ...items) => Object.assign(items, { _melodyFirst: melodyFirst })

// "ข้าเชื่อพระองค์ ข้าเชื่อจริง" — a rest (0) after องค์ is a breath, so ONE space falls there.
const content = {
  key: 'C', timeSignature: '4/4',
  lines: [
    line(true, seg('1 2 3 4', ['ข้า', 'เชื่อ', 'พระ', 'องค์']), { type: 'bar' }, seg('0 5 6 7', ['', 'ข้า', 'เชื่อ', 'จริง'])),
    line(false, seg('1 2 3 4', ['ข้า', 'เชื่อ', 'พระ', 'องค์']), { type: 'bar' }, seg('0 5 6 7', ['', 'ข้า', 'เชื่อ', 'จริง'])),
  ],
}
const mountJoined = (props) => mount(SongSheet, { props: { content, mode: 'full', songbook: true, lyricJoin: true, ...props } })
const joinedText = (w) => w.findAll('.song-line-join .lyric-words').map((x) => x.element.textContent).join('')
// what sits inside one วรรค box, joint by joint: the syllable, then | (<wbr>: may wrap) or + (joiner: never)
function joints(phraseEl) {
  const out = []
  for (const n of phraseEl.childNodes) {
    if (n.nodeType === 1 && n.tagName === 'WBR') out.push('|')
    else if (n.nodeType === 8) continue // a Vue placeholder comment, not on the page
    else if (n.nodeType === 1) out.push(n.textContent)
    else if (n.textContent === WJ) out.push('+')
    else if (n.textContent) out.push(`?${n.textContent}`)
  }
  return out.join('')
}
// a song 141 line that is wider than a phone screen: two วรรค with a rest between them
const longLine = {
  key: 'C', timeSignature: '4/4',
  lines: [[
    seg('1 1 1 1', ['เฝ้า', 'หวัง', 'ถูก', 'รับ']), { type: 'bar' }, seg('1 1 1 1', ['ถึง', 'เบื้อง', 'พระ', 'พักตร์']), { type: 'bar' },
    seg('0 1 1 1', ['', 'ประ', 'จักษ์', 'ข้าง']), { type: 'bar' }, seg('1 1 1 -', ['กาย', 'ที่', 'รัก', '']),
  ]],
}
const mountLong = (props) => mount(SongSheet, { props: { content: longLine, showChord: false, showNote: false, showLyric: true, lyricJoin: true, ...props } })

describe('ใบ#104 — a วรรค that fits the line moves to the next line whole', () => {
  it('each วรรค is ONE box; the breath space between two boxes is the only real space', () => {
    const w = mountJoined()
    const reused = w.findAll('.song-line-join')
    expect(reused.length).toBe(1) // verse 1 keeps its notes; the reused verse is the joined one
    const boxes = reused[0].findAll('.phrase')
    expect(boxes.map((b) => strip(b.text()))).toEqual(['ข้าเชื่อพระองค์', 'ข้าเชื่อจริง'])
    for (const b of boxes) expect(b.element.textContent).not.toMatch(/\s/) // no space inside a วรรค
    expect(strip(joinedText(w))).toBe('ข้าเชื่อพระองค์ ข้าเชื่อจริง') // the space sits between the boxes
  })

  it('the box is an inline-block no wider than the line, so a วรรค that fits is never split', () => {
    const rules = songSheetSource.split('<style')[1] || ''
    expect(rules).toMatch(/\.song-line-join \.phrase\s*\{[^}]*display:\s*inline-block/)
    expect(rules).toMatch(/\.song-line-join \.phrase\s*\{[^}]*max-width:\s*100%/)
  })

  it('the joiner and <wbr> are invisible: the words and the boxes are the same as before — paper cannot grow', () => {
    const w = mountJoined()
    const syls = w.findAll('.song-line-join .syl')
    expect(syls.map((s) => s.text()).filter(Boolean)).toEqual(['ข้า', 'เชื่อ', 'พระ', 'องค์', 'ข้า', 'เชื่อ', 'จริง'])
    for (const s of syls) expect(s.text()).not.toContain(WJ)
    // nothing but the syllables, the joiner (inside พระองค์, one word) and the one space reaches the page
    expect(joinedText(w).replace(/\p{Script=Thai}/gu, '')).toBe(`${WJ} `)
  })
})

describe('ใบ#110 — a วรรค wider than the line wraps only between two words', () => {
  it('inside a วรรค, every word end carries <wbr> and every joint inside a word keeps the joiner', () => {
    const w = mountLong()
    const boxes = w.findAll('.phrase')
    expect(boxes.length).toBe(2) // the rest after พักตร์ is the breath
    // | = may wrap here (a word ends) · + = never (inside a word). ประ+จักษ์ is one word, so it never wraps there
    // — the "ประจัก|ษ์" cut. (Only joints every version of the Thai dictionary agrees on are spelled out here;
    // the next test checks every joint against the word breaker itself.)
    expect(joints(boxes[0].element)).toMatch(/^เฝ้า\|หวัง\|ถูก\|รับ\|ถึง\|เบื้อง\|/)
    expect(joints(boxes[1].element)).toMatch(/^ประ\+จักษ์\|ข้าง\|กาย\|/)
  })

  it("the wrap points are exactly the word ends the browser's Thai word breaker reads off the line", () => {
    const w = mountLong()
    const words = []
    for (const p of new Intl.Segmenter('th', { granularity: 'word' }).segment('เฝ้าหวังถูกรับถึงเบื้องพระพักตร์ประจักษ์ข้างกายที่รัก')) words.push(p.segment)
    // read the boxes back as words: split at <wbr> and at the space between boxes
    const back = w.findAll('.phrase').flatMap((b) => joints(b.element).split('|').map((x) => x.split('+').join('')))
    expect(back).toEqual(words)
  })

  it('a syllable never wraps, and no rule may cut a word any more (no overflow-wrap / word-break)', () => {
    const rules = songSheetSource.split('<style')[1] || ''
    expect(rules).toMatch(/\.song-line-join \.lyric-words \.syl\s*\{[^}]*white-space:\s*nowrap/)
    const joinRules = rules.match(/\.song-line-join[^{]*\{[^}]*\}/g) || []
    expect(joinRules.length).toBeGreaterThan(0)
    for (const r of joinRules) expect(r).not.toMatch(/overflow-wrap|word-break|line-break/)
  })

  // A slot can hold a whole note with spaces in it ("(เปลี่ยนเป็นคีย์ A Major)", อนุชน 85). Kept on one row it ran past
  // the edge of a phone at the biggest text size, so it may wrap at its OWN spaces — each word still whole.
  it('a slot with spaces inside may wrap at those spaces, never inside one of its words', () => {
    const c = { key: 'C', timeSignature: '4/4', lines: [[seg('1 2 3', ['อ', 'รุณ', '(เปลี่ยนเป็นคีย์ A Major)'])]] }
    const w = mount(SongSheet, { props: { content: c, showChord: false, showNote: false, showLyric: true, lyricJoin: true } })
    const syl = w.find('[data-syl="0-0-2"]')
    expect(syl.classes()).toContain('syl-spaced')
    expect(syl.findAll('.syl-word').map((x) => x.text())).toEqual(['(เปลี่ยนเป็นคีย์', 'A', 'Major)'])
    expect(syl.text()).toBe('(เปลี่ยนเป็นคีย์ A Major)') // the same words and spaces as before
    const rules = songSheetSource.split('<style')[1] || ''
    expect(rules).toMatch(/\.syl\.syl-spaced\s*\{[^}]*white-space:\s*normal/)
    expect(rules).toMatch(/\.syl-word\s*\{[^}]*white-space:\s*nowrap/)
  })

  it('the karaoke still walks syllable by syllable: one span per syllable, with its own address', () => {
    const w = mountLong({ playingSyl: { li: 0, si: 2, syk: 2 } })
    expect(w.find('[data-syl="0-2-2"]').text()).toBe('จักษ์')
    expect(w.find('[data-syl="0-2-2"]').classes()).toContain('syl-playing')
    expect(w.find('[data-syl="0-3-3"]').exists()).toBe(true) // the held, empty slot is still there
  })
})

describe('ใบ#110 — what stays as it was', () => {
  it('แยกพยางค์ is untouched: a plain space after every syllable, no joiner, no box, no <wbr>', () => {
    const w = mount(SongSheet, { props: { content, mode: 'full', songbook: true, lyricJoin: false } })
    const t = w.findAll('.lyric-words').map((x) => x.element.textContent).join('')
    expect(t).not.toContain(WJ)
    expect(t).toBe('ข้า เชื่อ พระ องค์ ข้า เชื่อ จริง ') // the reused verse; verse 1 keeps its notes
    expect(w.find('.phrase').exists()).toBe(false)
    expect(w.find('wbr').exists()).toBe(false)
  })

  it('lines that show notes stay split (เนื้อ+โน้ต · ครบ · โน้ตล้วน are untouched)', () => {
    const w = mount(SongSheet, { props: { content, mode: 'full', songbook: false, lyricJoin: true } })
    expect(w.find('.song-line-join').exists()).toBe(false)
    expect(w.findAll('.lyric-syl').length).toBeGreaterThan(0)
    expect(w.find('.phrase').exists()).toBe(false)
    expect(w.find('wbr').exists()).toBe(false)
    expect(w.findAll('.lyric-words').map((x) => x.element.textContent).join('')).not.toContain(WJ)
  })
})
