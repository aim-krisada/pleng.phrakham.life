<script setup>
// SongHead — the song's title and its head line (คีย์ · จังหวะ · อ้างอิง). ONE head for every surface that
// shows the song: แผ่นเพลง (inside SongSheet, on screen and on paper) and ฝึกร้อง (SongViewer, at the top
// of the page) — ใบ v3/pleng#144 "ใช้หัวเดียวกับแผ่นเพลง จะได้หน้าตาเหมือนกัน". What goes in the line comes
// from lib/songHead.js; this component only lays it out.
//   - title: printed centered above the song (ใบ#123); on screen only with `screenTitle` (ใบ#144).
//   - head line: only items the song HAS — no key, no meter, no refs → that item is simply left out, and a
//     song with none of them gets no line at all (no blank, no dash).
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  info: { type: Object, default: () => ({ key: '', meter: '', refs: '' }) }, // songHeadInfo()
  head: { type: Boolean, default: true }, // show the คีย์ · จังหวะ · อ้างอิง line
  screenTitle: { type: Boolean, default: false },
})
const hasHead = computed(() => props.head && !!(props.info.key || props.info.meter || props.info.refs))
</script>

<template>
  <h1 v-if="title" class="sheet-print-title" :class="{ 'has-head': hasHead, 'on-screen': screenTitle }">{{ title }}</h1>
  <!-- ใบ v3/pleng#123 — the song's key and meter, once, at the top left above the first line of music
       (where a printed score and a โน้ตตัวเลข book put them). On screen and on paper. -->
  <p v-if="hasHead" class="sheet-head">
    <span v-if="info.key" class="sheet-head-item">คีย์ <b>{{ info.key }}</b></span>{{ info.key && info.meter ? ' ' : '' }}<span v-if="info.meter" class="sheet-head-item">จังหวะ <b>{{ info.meter }}</b></span>{{ (info.key || info.meter) && info.refs ? ' ' : '' }}<span v-if="info.refs" class="sheet-head-item sheet-head-refs">อ้างอิง <b>{{ info.refs }}</b></span>
  </p>
</template>

<style scoped>
/* ใบ v3/pleng#123 — the key + meter head. Left, above the first line, plain text that wraps (never runs off a
   narrow screen or a 200% reading size); the values bold like the printed signs. */
.sheet-head {
  margin: 0 0 0.8em;
  font-size: 0.95em;
  line-height: 1.4;
  color: var(--ink);
}
.sheet-head-item { display: inline-block; white-space: nowrap; margin-right: 1em; }
.sheet-head b {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
/* On paper the head lives INSIDE the gap the title always left above the music (6mm): 0.5mm + a 4mm line +
   1.5mm = the same 6mm, so nothing below it moves and no song gets a page more (ใบ#101). Measured on all 653
   published songs: a head on a line of its own pushed 29 one-page songs onto a second page. */
@media print {
  .sheet-head {
    font-size: 10pt;
    line-height: 4mm;
    height: 4mm;
    white-space: nowrap;
    color: #000;
    margin: 0 0 1.5mm;
  }
  /* ใบ#128 — อ้างอิง shares that one fixed-height, no-wrap line. A song with an unusually long
     list would otherwise run off the right edge and be clipped by the page with nothing to show
     for it, so the refs are the item that gives: they shrink and end in an ellipsis, which at
     least says there is more. Key and meter never shrink — they are the ones a singer needs. */
  .sheet-head-refs {
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }
}
/* Printed title heading — shown centered above the song on paper; hidden on screen unless the page asks
   for it (`.on-screen`, ใบ#144: the top bar no longer shows the song's name). */
.sheet-print-title {
  display: none;
}
@media print {
  .sheet-print-title {
    display: block;
    text-align: center;
    font-size: 16pt;
    font-weight: 700;
    color: #000;
    margin: 0 0 6mm;
  }
  /* ใบ#123 — the key + meter head sits in this gap (see .sheet-head): 0.5mm here + 4mm + 1.5mm = 6mm */
  .sheet-print-title.has-head { margin-bottom: 0.5mm; }
}
/* ใบ#144 — the on-screen title: full name, wraps instead of being cut, sized in em so it follows Aa */
@media screen {
  .sheet-print-title.on-screen {
    display: block;
    margin: 0 0 0.35em;
    text-align: center;
    color: var(--brand);
    font-size: 1.35em;
    font-weight: 700;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
}
</style>
