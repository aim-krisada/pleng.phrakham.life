// PREVIEW-ONLY harness (717 multi-lyric on /v2). Mounts the REAL SongViewer with a demo song
// that declares two lyric sets over ONE shared melody, so the tab bar + set filtering can be
// rendered and MEASURED in a real browser at desktop and 360px. Not part of the app build
// (vite only builds index.html) — evidence only.
import { createApp, h, ref } from 'vue'
import SongViewer from './components/SongViewer.vue'
import './styles.css'

// Set names sized like the real thing: a full Thai phrase (~25 chars), not the old
// "ทำนอง ๑" caption — that length is exactly what makes the 360px wrap test meaningful.
const SET1 = 'เนื้อร้องชุดที่หนึ่งของเพลงนี้'
const SET2 = 'เนื้อร้องชุดที่สองของเพลงนี้'

// One melody (stanza A) shared by both sets, plus a refrain stanza (B) with NO `set` — the
// shared entry that must appear under BOTH tabs. Placeholder syllables (คำที่ ๑ …), not any
// real song's words: this proves the interaction and the layout, not content.
const stanzaA = {
  id: 'A',
  lines: [
    [
      { type: 'segment', chord: 'C', note: '5 5 6 5' },
      { type: 'bar' },
      { type: 'segment', chord: 'G', note: "1' 7 6" },
    ],
    [
      { type: 'segment', chord: 'F', note: '5 5 6 5' },
      { type: 'bar' },
      { type: 'segment', chord: 'C', note: '3 2 1' },
    ],
  ],
}
const stanzaB = {
  id: 'B',
  lines: [[{ type: 'segment', chord: 'G', note: '3 3 2 1' }]],
}

const syl = (tag, n) => Array.from({ length: n }, (_, i) => `${tag}${i + 1}`)

const demoSong = {
  id: 'demo-v2-717',
  number: 717,
  title_th: SET1,
  title_en: '',
  category: 'lem-yai', theme: '', verified: true, book_refs: [], scripture: '', review_flags: [],
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    bpm: 88,
    lyricSets: [{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }],
    stanzas: [stanzaA, stanzaB],
    arrangement: [
      { stanza: 'A', set: 0, label: '', syllables: syl('หนึ่ง', 14) },
      { stanza: 'A', set: 1, label: '', syllables: syl('สอง', 14) },
      { stanza: 'B', label: 'ท่อนรับ', syllables: syl('รับ', 4) }, // no `set` → shared
    ],
  },
}

// an ORDINARY song (no lyricSets) so the back-compat case is on screen in the same run
const plainSong = {
  id: 'demo-plain', number: 1, title_th: 'เพลงปกติ (ไม่มีเนื้อหลายชุด)', title_en: '',
  category: 'lem-yai', theme: '', verified: true, book_refs: [], scripture: '', review_flags: [],
  content: {
    version: 2, key: 'C', timeSignature: '4/4', bpm: 88,
    stanzas: [stanzaA],
    arrangement: [{ stanza: 'A', label: '', syllables: syl('ปกติ', 14) }],
  },
}

const q = new URLSearchParams(location.search)
const which = q.get('song') === 'plain' ? plainSong : demoSong
// evidence-only switch: ?open=1 captures the disclosure in its EXPANDED state

createApp({
  setup() {
    const song = ref(which)
    return () => h('div', { style: 'padding:8px' }, [h(SongViewer, { song: song.value, tier: 'guest' })])
  },
}).mount('#app')

if (q.get('open') === '1') setTimeout(() => document.querySelector('.lset-summary')?.click(), 200)
