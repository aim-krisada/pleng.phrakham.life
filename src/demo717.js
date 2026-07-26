// PREVIEW-ONLY harness (717 multi-lyric UX gate). Mounts the REAL SongViewer with a demo
// song that declares two lyric sets over ONE shared melody (stanza A). Not part of the app
// build; used to render the tab-bar UX for P'Aim's sign-off before any model/data work.
import { createApp, h, ref } from 'vue'
import SongViewer from './components/SongViewer.vue'
import './styles.css'

// One melody (stanza A), two full lyric sets that SWITCH via the tabs. Generic worship
// syllables (NOT a specific copyrighted song) — this proves the interaction, not content.
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

const demoSong = {
  id: 'demo-717',
  number: 717,
  title_th: 'ตัวอย่าง 717 — ทำนองเดียว เนื้อสองชุด',
  title_en: 'Demo 717',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    bpm: 88,
    // >1 set → SongViewer shows the segmented tabs. Labels per P'Aim's spec.
    lyricSets: [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }],
    stanzas: [stanzaA],
    arrangement: [
      {
        stanza: 'A',
        set: 0,
        label: '',
        syllables: ['รัก', 'พระ', 'องค์', 'ผู้', 'ทรง', 'เมต', 'ตา', 'นำ', 'ชี', 'วิต', 'ข้า', 'สู่', 'ความ', 'รัก'],
      },
      {
        stanza: 'A',
        set: 1,
        label: '',
        syllables: ['ขอบ', 'พระ', 'คุณ', 'พระ', 'เจ้า', 'นิ', 'รันดร์', 'ทรง', 'ประ', 'ทาน', 'พระ', 'พร', 'มาก', 'มาย'],
      },
    ],
  },
}

// The ORDINARY case — one set of words, i.e. nearly every song in the library. Used to prove
// the progressive disclosure: the reader shows no switcher at all, and the editor shows only
// the light ＋ เพิ่มชุดเนื้อร้อง way in (?sets=1).
const oneSetSong = {
  ...demoSong,
  id: 'demo-plain',
  number: 1,
  title_th: 'ตัวอย่างเพลงปกติ — เนื้อชุดเดียว',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    bpm: 88,
    stanzas: [stanzaA],
    arrangement: [{ stanza: 'A', label: '', syllables: demoSong.content.arrangement[0].syllables }],
  },
}

// The owner holds the song; SongViewer (the editor) PROPOSES a new content up via
// update-content and the owner applies it — the real editor→owner path. Same id → the
// active tab is preserved across edits (e.g. ＋ เพิ่มชุด keeps you on the new set).
const song = ref(new URLSearchParams(location.search).get('sets') === '1' ? oneSetSong : demoSong)
function onUpdateContent(content) {
  song.value = { ...song.value, content }
}

createApp({
  render: () => h('div', { style: 'max-width:820px;margin:0 auto;padding:12px' }, [
    h(SongViewer, { song: song.value, tier: 'team', 'onUpdate-content': onUpdateContent }),
  ]),
}).mount('#app')

// Harness-only URL params so a headless screenshot can capture each state via the REAL
// controls (same path a user's tap takes):
//   ?set=N     — select lyric-set tab N (view)
//   ?open=1    — leave the lyric-set disclosure EXPANDED
//   ?mode=edit — enter แก้ไข (click the ✏️ FAB)
//   &add=1     — then click ＋ เพิ่มชุด (adds a 3rd set on the same melody)
const q = new URLSearchParams(location.search)
setTimeout(() => {
  if (q.get('mode') === 'edit') document.querySelector('.sv-fab')?.click()
  const set = Number(q.get('set') || 0)
  // the tabs live inside the collapsed disclosure now — open it first, the way a tap does
  if (set || q.get('open') === '1') document.querySelector('.lset-summary')?.click()
  if (set) setTimeout(() => document.querySelectorAll('.lset-tab')[set]?.click(), 120)
  if (q.get('add') === '1') setTimeout(() => document.querySelector('.lset-add')?.click(), 220)
  // &pick=<word> — select the syllable with that text, so the screenshot shows the caret +
  // the per-set "แก้เนื้อ = เฉพาะชุดนี้" hint.
  const pick = q.get('pick')
  if (pick) setTimeout(() => [...document.querySelectorAll('.sheet-scale .syl')].find((s) => s.textContent === pick)?.click(), 320)
}, 150)
