// PREVIEW-ONLY harness for "ชื่อชุดเนื้อร้อง" (lyric-set names). Mounts the REAL components
// (SongViewer · EditorMode · SongList) with fixture data, so the screenshots are the actual
// app UI at the actual widths — not a mock-up. Not part of the app build (vite builds only
// index.html), and it never writes: the catalog mode stubs `fetch` so nothing hits the DB.
//
//   (no param)  reader — the set tabs above the sheet
//   ?ed=1       editor — the set tab strip (＋ เพิ่มชุด · ✏ ตั้งชื่อชุด · 🗑 ลบชุดนี้)
//   ?ed=1&rename=1   editor with the rename field open on the active set
//   ?list=1&q=…      catalog + search box pre-filled (real filterSongs over fixtures)
import { createApp, h, ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import SongViewer from './components/SongViewer.vue'
import EditorMode from './components/EditorMode.vue'
import SongList from './views/SongList.vue'
import './styles.css'

// The real names of song 717's two lyric sets — the case that forced this feature: same
// melody, genuinely different words, so genuinely different names (P'Aim, 26 ก.ค.).
const SET1 = 'บรรดาคนบาป เชิญท่านเข้ามา'
const SET2 = 'ผู้ที่ถูกบาปทำร้ายจงมา'

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

// the shape the merge SQL writes: BOTH `name` and `label`, same value
const content717 = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  bpm: 88,
  lyricSets: [{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }],
  stanzas: [stanzaA],
  arrangement: [
    {
      stanza: 'A', set: 0, label: '',
      syllables: ['บรร', '-ดา', 'คน', 'บาป', 'เชิญ', 'ท่าน', 'เข้า', 'มา', 'พระ', 'เย', '-ซู', 'ทรง', 'เรียก', 'หา'],
    },
    {
      stanza: 'A', set: 1, label: '',
      syllables: ['ผู้', 'ที่', 'ถูก', 'บาป', 'ทำ', 'ร้าย', 'จง', 'มา', 'พระ', 'องค์', 'จะ', 'ทรง', 'เยียว', 'ยา'],
    },
  ],
}

const song717 = {
  id: 'demo-717', number: 717, title_th: SET1, title_en: '',
  category: 'lem-yai', theme: '', verified: true, book_refs: [], scripture: '', review_flags: [],
  content: content717,
}
// two ordinary songs so the catalog shows a real list and the search really filters
const otherSongs = [
  {
    id: 'demo-1', number: 1, title_th: 'พระเจ้าทรงเป็นความรัก', title_en: '',
    category: 'lem-yai', theme: '', verified: true, book_refs: [], scripture: '', review_flags: [],
    content: {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3' }]] }],
      arrangement: [{ stanza: 'A', label: '', syllables: ['พระ', 'เจ้า', 'รัก'] }],
    },
  },
  {
    id: 'demo-2', number: 2, title_th: 'สรรเสริญพระนามพระองค์', title_en: '',
    category: 'lem-yai', theme: '', verified: true, book_refs: [], scripture: '', review_flags: [],
    content: {
      version: 2, key: 'G', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'G', note: '5 5 6' }]] }],
      arrangement: [{ stanza: 'A', label: '', syllables: ['สรร', '-เสริญ', 'นาม'] }],
    },
  },
]

const q = new URLSearchParams(location.search)
const mode = q.get('list') === '1' ? 'list' : q.get('ed') === '1' ? 'edit' : 'read'

// Catalog mode: answer the songs SELECT from fixtures so the harness is fully offline and
// provably writes nothing. Everything else (search ranking, cards, gating) is the real code.
if (mode === 'list') {
  const rows = [otherSongs[0], song717, otherSongs[1]]
  const realFetch = window.fetch.bind(window)
  window.fetch = (url, opts) =>
    String(url).includes('/rest/v1/songs')
      ? Promise.resolve(new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : realFetch(url, opts)
}

const song = ref(song717)
function onUpdateContent(content) {
  song.value = { ...song.value, content }
}

const Root = {
  render() {
    if (mode === 'list') return h(SongList)
    if (mode === 'edit') return h(EditorMode, { song: song.value, tier: 'approver', active: true })
    return h('div', { style: 'max-width:820px;margin:0 auto;padding:12px' }, [
      h(SongViewer, { song: song.value, tier: 'team', 'onUpdate-content': onUpdateContent }),
    ])
  },
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: Root }],
})
// #shell-title / #shell-menus (EditorMode's teleport targets) live in the HTML, not here —
// see the comment in demo-lyricset-names.html.
createApp(Root).use(router).mount('#app')

// Harness-only params so a headless screenshot captures each state through the REAL controls.
setTimeout(() => {
  const set = Number(q.get('set') || 0)
  if (set) document.querySelectorAll('.lset-tab')[set]?.click()
  if (q.get('rename') === '1') document.querySelector('.eset-rename-btn')?.click()
  const query = q.get('q')
  if (query) {
    const box = document.querySelector('input[type="search"], .search-input, #song-search')
    if (box) {
      box.value = query
      box.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}, 400)
