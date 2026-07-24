<script setup>
// 🎼 โครงเพลง — the structure drawer for the INLINE editor (SongViewer). It brings the two
// things that used to live ONLY in the old boxed editor onto the one-surface pencil flow:
//   1. the SECTION list (ข้อ1 · รับ · ข้อ2 …): reorder, add, delete, duplicate, retag melody
//      (♫A/♫B), and แยกทำนอง (make a shared melody independent).
//   2. the MELODY list (ทำนอง A/B) + a คัดลอก/วาง panel for the bar/line/verse under the cursor.
//
// It is a DUMB surface over the pure engine (lib/songStructure.js): every action computes a NEW
// v2 content and emits `update-content` (the same channel SongViewer's note/word edits use), so
// undo/save/the sheet all react exactly as they do for any other edit. The clip (คัดลอก buffer)
// is view state owned by the parent, passed back down, so it survives the drawer closing.
//
// Shape mirrors SongSettings: a docked side panel on a wide screen (the sheet stays visible so a
// reorder is seen as it happens), a full-screen page on a phone (ux-platform-patterns §1).
import { ref, computed, nextTick, watch } from 'vue'
import Icon from './Icon.vue'
import {
  addVerse, deleteVerse, moveVerseBy, duplicateVerse, setVerseStanza, makeVerseUnique,
  setVerseLabel, setAfterEachVerse, addStanza, removeStanza,
  copyBar, copyLine, pasteLineAsStanza,
  pasteBarAt, pasteLineAt, moveBarTo, moveLineTo,
  duplicateBar, duplicateLine,
  previewBars, previewLine,
} from '../lib/songStructure.js'
import { verseLyricText, withVerseText, segmentThai } from '../lib/songLyrics.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  content: { type: Object, default: null },
  // { stanzaId, lineIndex, barOrdinal, entryIndex } of the note under the cursor — for คัดลอก/วาง.
  cursor: { type: Object, default: null },
  // the current clip: { kind:'bar'|'line', data, from } | null — parent-owned view state.
  clip: { type: Object, default: null },
})
const emit = defineEmits(['update-content', 'set-clip', 'select-verse', 'close'])

const stanzas = computed(() => props.content?.stanzas || [])
const arrangement = computed(() => props.content?.arrangement || [])
const multi = computed(() => arrangement.value.length > 1)

// how many sections use each melody — drives the badge tally + gates แยกทำนอง (only meaningful
// when a melody is SHARED) and 🗑 melody (never orphan a melody a section still points at).
const stanzaUse = computed(() => {
  const m = {}
  for (const s of stanzas.value) m[s.id] = 0
  for (const r of arrangement.value) m[r.stanza] = (m[r.stanza] || 0) + 1
  return m
})
const stanzaOptions = computed(() => stanzas.value.map((s) => ({ value: s.id, label: '♫ ' + s.id })))

// the card model — label as shown (default ข้อ N like resolveContent), its melody, shared?
const cards = computed(() =>
  arrangement.value.map((r, i) => ({
    i,
    label: (r.label || '').trim(),
    shown: (r.label || '').trim() || (multi.value ? `ข้อ ${i + 1}` : 'ท่อน'),
    stanza: r.stanza,
    refrain: !!r.afterEachVerse,
    shared: (stanzaUse.value[r.stanza] || 0) > 1,
  })),
)

// cross-highlight (design: touching melody A lights every A card so the user sees the blast
// radius). Set on card focus/hover; cleared on leave.
const hlStanza = ref('')

// cursor context, in words — "♫A · ห้อง 2 · บรรทัด 1 · ท่อน 3". Leads with the melody so a copied
// bar/line always says which melody it came from (BI-018). null when nothing is selected.
const cursorText = computed(() => {
  const c = props.cursor
  if (!c || c.stanzaId == null) return ''
  const parts = [`♫${c.stanzaId}`, `ห้อง ${(c.barOrdinal ?? 0) + 1}`, `บรรทัด ${(c.lineIndex ?? 0) + 1}`]
  if (c.entryIndex != null) parts.push(`ท่อน ${c.entryIndex + 1}`)
  return parts.join(' · ')
})
const hasCursor = computed(() => !!(props.cursor && props.cursor.stanzaId != null))
// which section (ข้อ N / รับ) the cursor's syllable belongs to — entryIndex is the arrangement
// index, same index `cards` uses. Falls back to a plain "ท่อน N" if it can't be resolved.
const cursorVerseLabel = computed(() => {
  const c = props.cursor
  if (!c || c.entryIndex == null) return ''
  return cards.value[c.entryIndex]?.shown || `ท่อน ${c.entryIndex + 1}`
})

// ---- section actions (each emits a NEW content) ----
const apply = (next) => { if (next && next !== props.content) emit('update-content', next) }
function onAdd(afterIndex = null) { apply(addVerse(props.content, afterIndex)) }
function onDelete(i) { apply(deleteVerse(props.content, i)) }
function onMove(i, dir) { apply(moveVerseBy(props.content, i, dir)) }
function onDuplicate(i) { apply(duplicateVerse(props.content, i)) }
function onRetag(i, stanzaId) { apply(setVerseStanza(props.content, i, stanzaId)) }
function onMakeUnique(i) { apply(makeVerseUnique(props.content, i)) }
function onRename(i, e) { apply(setVerseLabel(props.content, i, e.target.value)) }
function onRefrain(i, e) { apply(setAfterEachVerse(props.content, i, e.target.checked)) }

// แก้เนื้อทั้งข้อ — the bulk-lyric textarea (ported from the old boxed editor's per-verse "type the
// words" box). One verse open at a time; a LOCAL buffer holds the text so typing / Thai IME never
// fights a props-driven re-render, and the mapping onto the melody's attack notes only happens when
// the author commits (ลงโน้ต / ✂). See lib/songLyrics.js for the mapping.
const lyricEditing = ref(-1) // arrangement index whose textarea is open (-1 = none)
const lyricBuf = ref('')
function openLyric(i) {
  if (lyricEditing.value === i) { lyricEditing.value = -1; return } // toggle closed
  const r = arrangement.value[i]
  lyricBuf.value = r ? verseLyricText(props.content, r.stanza, r.syllables || []) : ''
  lyricEditing.value = i
}
function applyLyric(i) { apply(withVerseText(props.content, i, lyricBuf.value)) }
function autoSegmentLyric(i) {
  lyricBuf.value = segmentThai(lyricBuf.value).join(' ') // show the split in the box…
  apply(withVerseText(props.content, i, lyricBuf.value)) // …and land it on the notes
}
watch(() => props.open, (o) => { if (!o) lyricEditing.value = -1 }) // close with the drawer

// ---- melody (stanza) actions ----
function onAddStanza() { apply(addStanza(props.content)) }
function onRemoveStanza(id) {
  if (stanzas.value.length <= 1) return
  apply(removeStanza(props.content, id))
}

// ---- section-card drag reorder (pointer enhancement; ▲▼ is the accessible primary) ----
const dragFrom = ref(-1)
const dragOver = ref(-1)
function onDragStart(i, e) { dragFrom.value = i; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move' }
function onDragOver(i, e) { e.preventDefault(); dragOver.value = i }
function onDrop(i) {
  if (dragFrom.value >= 0 && dragFrom.value !== i) {
    // moveVerse(from, to) — dropping onto card i places the dragged row at i's slot
    apply(moveVerseBy(props.content, dragFrom.value, i - dragFrom.value))
  }
  dragFrom.value = -1; dragOver.value = -1
}
function onDragEnd() { dragFrom.value = -1; dragOver.value = -1 }

// ======================================================================================
// คัดลอก / วาง · จัดลำดับ — a visible structure OUTLINE (BI-004)
// The old panel pasted a bar/line onto the END of the cursor's line/melody: the user never saw
// WHERE it would land. Here the melody's lines (and the selected line's bars) render as a
// reorderable outline; a held clip lights ▸ "วางที่นี่" slots at every insertion point, and each
// row/chip drags to reorder. Every action still routes through the pure engine.
// ======================================================================================

// which melody the outline shows (BI-018 — the drawer is master-detail): an EXPLICIT pick from the
// ทำนอง list wins; else it follows the sheet cursor; else the first (so reorder works with no note
// pick). Tapping a note on the sheet clears the override → the outline re-syncs to that melody.
const selStanzaOverride = ref('')
const activeStanzaId = computed(() => {
  const ids = stanzas.value.map((s) => s.id)
  if (selStanzaOverride.value && ids.includes(selStanzaOverride.value)) return selStanzaOverride.value
  return props.cursor?.stanzaId ?? stanzas.value[0]?.id ?? ''
})
function selectStanza(id) { selStanzaOverride.value = id }
function jumpToCursor() { selStanzaOverride.value = '' } // re-sync the outline to the cursor's melody
// the outline shows a DIFFERENT melody than the one the cursor sits in (user switched via the list)
const desynced = computed(() =>
  hasCursor.value && props.cursor.stanzaId && activeStanzaId.value !== props.cursor.stanzaId)
const activeLines = computed(() => (stanzas.value.find((x) => x.id === activeStanzaId.value)?.lines) || [])

// the line whose bars are expanded — follows the cursor, overridable by tapping a line row. The
// selected bar (for its ◀▶ move controls) likewise follows the cursor until a chip is tapped.
const selLineOverride = ref(null)
const selBarOverride = ref(null)
watch(() => [props.cursor?.stanzaId, props.cursor?.lineIndex, props.cursor?.barOrdinal], () => {
  selLineOverride.value = null; selBarOverride.value = null
  selStanzaOverride.value = '' // tapping a note on the sheet re-syncs the outline to its melody (BI-018)
})
const selLine = computed(() => {
  const n = activeLines.value.length
  const c = selLineOverride.value != null ? selLineOverride.value : (props.cursor?.lineIndex ?? 0)
  return n ? Math.max(0, Math.min(n - 1, c)) : 0
})
const selBar = computed(() => (selBarOverride.value != null ? selBarOverride.value : (props.cursor?.barOrdinal ?? -1)))
function selectLine(li) { selLineOverride.value = li; selBarOverride.value = null }
function selectBar(bi) { selBarOverride.value = bi }

const pasteLineMode = computed(() => props.clip?.kind === 'line')
const pasteBarMode = computed(() => props.clip?.kind === 'bar')
function barsOf(line) { return previewBars(line) }
function linePreview(line) { return previewLine(line) || '—' }

// copy straight from the outline (or from the cursor via the two top buttons + tests)
function onCopyLineAt(li) {
  const frag = copyLine(props.content, { stanzaId: activeStanzaId.value, lineIndex: li, from: `บรรทัด ${li + 1}` })
  if (frag) emit('set-clip', frag)
}
function onCopyBarAt(li, bi) {
  const frag = copyBar(props.content, { stanzaId: activeStanzaId.value, lineIndex: li, barOrdinal: bi, from: `ห้อง ${bi + 1} · บรรทัด ${li + 1}` })
  if (frag) emit('set-clip', frag)
}
function onCopyBar() { const c = props.cursor; if (c && c.stanzaId != null) onCopyBarAt(c.lineIndex ?? 0, c.barOrdinal ?? 0) }
function onCopyLine() { const c = props.cursor; if (c && c.stanzaId != null) onCopyLineAt(c.lineIndex ?? 0) }

// duplicate-in-place (quick action on a row / chip)
function onDupLineAt(li) { apply(duplicateLine(props.content, activeStanzaId.value, li)) }
function onDupBarAt(li, bi) { apply(duplicateBar(props.content, activeStanzaId.value, li, bi)) }

// paste at a CHOSEN slot (index = insert before that line/bar; === count → at the end)
function onPasteLineAt(index) { if (props.clip?.kind === 'line') apply(pasteLineAt(props.content, activeStanzaId.value, index, props.clip)) }
function onPasteBarAt(li, index) { if (props.clip?.kind === 'bar') apply(pasteBarAt(props.content, activeStanzaId.value, li, index, props.clip)) }
function onPasteAsStanza() { if (props.clip?.kind === 'line') apply(pasteLineAsStanza(props.content, props.clip)) }
function onClearClip() { emit('set-clip', null) }

// accessible reorder (single-pointer alternative to drag — WCAG 2.5.7). `to` is a final index.
function onMoveLineTo(li, to) { apply(moveLineTo(props.content, activeStanzaId.value, li, to)); if (selLineOverride.value != null) selLineOverride.value = Math.max(0, Math.min(activeLines.value.length - 1, to)) }
function onMoveBarTo(li, bi, to) { apply(moveBarTo(props.content, activeStanzaId.value, li, bi, to)); selBarOverride.value = to }

// drag reorder — bars within a line, lines within the melody. ▸ slots + ◀▶/▲▼ stay the primary.
const dragKind = ref(null)     // 'line' | 'bar' | null
const dragLineFrom = ref(-1)
const dragBarLine = ref(-1)
const dragBarFrom = ref(-1)
const dropSlot = ref(-1)       // which slot is hovered, for the drop-here highlight
function onLineDragStart(li, e) { dragKind.value = 'line'; dragLineFrom.value = li; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move' }
function onLineDragEnd() { dragKind.value = null; dragLineFrom.value = -1; dropSlot.value = -1 }
function onDropLine(slot) {
  const from = dragLineFrom.value
  if (from >= 0) { const dest = slot > from ? slot - 1 : slot; apply(moveLineTo(props.content, activeStanzaId.value, from, dest)) }
  onLineDragEnd()
}
function onBarDragStart(li, bi, e) {
  dragKind.value = 'bar'; dragBarLine.value = li; dragBarFrom.value = bi
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  e.stopPropagation()
}
function onBarDragEnd() { dragKind.value = null; dragBarLine.value = -1; dragBarFrom.value = -1; dropSlot.value = -1 }
function onDropBar(li, slot) {
  const from = dragBarFrom.value
  if (from >= 0 && li === dragBarLine.value) { const dest = slot > from ? slot - 1 : slot; apply(moveBarTo(props.content, activeStanzaId.value, li, from, dest)) }
  onBarDragEnd()
}

// focus the first card's rename when the drawer opens (parity with SongSettings)
const body = ref(null)
watch(() => props.open, (on) => { if (on) nextTick(() => body.value?.querySelector('.sd-rename')?.focus?.({ preventScroll: true })) })

// anchor below the editor's save-bar on desktop (measured), like SongSettings
const topPx = ref(96)
watch(() => props.open, (on) => {
  if (!on) return
  nextTick(() => {
    const bar = document.querySelector('.sv-save-bar')
    if (bar) topPx.value = Math.round(bar.getBoundingClientRect().bottom + 8)
  })
})
</script>

<template>
  <aside
    v-if="open"
    class="sd-panel no-print"
    role="region"
    aria-label="โครงเพลง"
    :style="{ '--sd-top': topPx + 'px' }"
    @keydown.esc.stop="emit('close')"
  >
    <header class="sd-head">
      <h2 class="sd-title"><Icon name="list-ordered" :size="16" /> โครงเพลง</h2>
      <button class="sd-close" type="button" aria-label="ปิดโครงเพลง" title="ปิด" @click="emit('close')">
        <Icon name="x" :size="16" />
      </button>
    </header>

    <div ref="body" class="sd-body">
      <!-- ── ท่อน / sections ─────────────────────────────────────────── -->
      <section class="sd-sec">
        <div class="sd-sec-head">
          <span class="sd-sec-title">ลำดับท่อน</span>
          <button class="sd-add" type="button" title="เพิ่มท่อนใหม่ (ทำนองเดียวกับท่อนก่อน)" @click="onAdd(null)">
            <Icon name="plus" :size="14" /> เพิ่มท่อน
          </button>
        </div>

        <ul class="sd-cards" role="list">
          <li
            v-for="card in cards"
            :key="card.i"
            class="sd-card"
            :class="{ hl: hlStanza && hlStanza === card.stanza, drop: dragOver === card.i, dragging: dragFrom === card.i }"
            draggable="true"
            @dragstart="onDragStart(card.i, $event)"
            @dragover="onDragOver(card.i, $event)"
            @drop="onDrop(card.i)"
            @dragend="onDragEnd"
            @mouseenter="hlStanza = card.stanza"
            @mouseleave="hlStanza = ''"
          >
            <span class="sd-grip" aria-hidden="true" title="ลากเพื่อจัดลำดับ"><Icon name="grip-vertical" :size="14" /></span>

            <div class="sd-card-main">
              <div class="sd-card-row1">
                <input
                  class="sd-rename"
                  type="text"
                  :value="card.label"
                  :placeholder="card.shown"
                  :aria-label="`ชื่อท่อนที่ ${card.i + 1}`"
                  @focus="hlStanza = card.stanza"
                  @input="onRename(card.i, $event)"
                />
                <label class="sd-badge" :title="`ทำนองของท่อนนี้ (♫${card.stanza})`">
                  <select
                    class="sd-badge-sel"
                    :value="card.stanza"
                    :aria-label="`ทำนองของท่อนที่ ${card.i + 1}`"
                    @focus="hlStanza = card.stanza"
                    @change="onRetag(card.i, $event.target.value)"
                  >
                    <option v-for="o in stanzaOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </label>
              </div>
              <div class="sd-card-row2">
                <label class="sd-refrain" title="ร้องรับหลังทุกข้อ">
                  <input type="checkbox" :checked="card.refrain" @change="onRefrain(card.i, $event)" /> รับทุกข้อ
                </label>
                <button
                  v-if="card.shared"
                  class="sd-mini"
                  type="button"
                  title="แยกทำนองท่อนนี้ให้เป็นอิสระ — แก้แล้วไม่กระทบท่อนอื่นที่ใช้ทำนองเดียวกัน"
                  @click="onMakeUnique(card.i)"
                ><Icon name="layers" :size="13" /> แยกทำนอง</button>
                <span v-else class="sd-solo" title="ทำนองนี้ใช้ท่อนเดียว">ทำนองเดี่ยว</span>
              </div>
            </div>

            <div class="sd-card-acts">
              <button class="sd-icon" type="button" :class="{ on: lyricEditing === card.i }" :aria-expanded="lyricEditing === card.i" :aria-label="`แก้เนื้อทั้งข้อที่ ${card.i + 1}`" title="แก้เนื้อทั้งข้อ — วาง/พิมพ์เนื้อทั้งท่อน แล้วลงโน้ตอัตโนมัติ" @click="openLyric(card.i)"><Icon name="file-text" :size="15" /></button>
              <button class="sd-icon" type="button" :disabled="card.i === 0" aria-label="เลื่อนขึ้น" title="เลื่อนขึ้น" @click="onMove(card.i, -1)"><Icon name="chevron-up" :size="15" /></button>
              <button class="sd-icon" type="button" :disabled="card.i === cards.length - 1" aria-label="เลื่อนลง" title="เลื่อนลง" @click="onMove(card.i, 1)"><Icon name="chevron-down" :size="15" /></button>
              <button class="sd-icon" type="button" aria-label="ทำซ้ำท่อนนี้" title="ทำซ้ำท่อน (เนื้อ+ทำนองเดิม)" @click="onDuplicate(card.i)"><Icon name="copy" :size="15" /></button>
              <button class="sd-icon danger" type="button" :disabled="cards.length <= 1" aria-label="ลบท่อนนี้" title="ลบท่อน" @click="onDelete(card.i)"><Icon name="trash-2" :size="15" /></button>
            </div>

            <!-- แก้เนื้อทั้งข้อ — paste/type a whole verse; each space-separated word lands on the next
                 attack note (held/rest notes stay blank). ✂ splits spaceless Thai first. Ported from
                 the old boxed editor's per-verse textarea; the mapping is lib/songLyrics.js. -->
            <div v-if="lyricEditing === card.i" class="sd-lyric no-print">
              <label class="sd-lyric-lbl" :for="`sd-lyric-${card.i}`">เนื้อทั้งข้อ — เว้นวรรคระหว่างคำ (แต่ละคำลงโน้ตถัดไป)</label>
              <textarea
                :id="`sd-lyric-${card.i}`"
                class="sd-lyric-ta"
                v-model="lyricBuf"
                rows="3"
                spellcheck="false"
                placeholder="วางหรือพิมพ์เนื้อร้องทั้งท่อนที่นี่ แล้วกด “ลงโน้ต”…"
                @keydown.esc="lyricEditing = -1"
              ></textarea>
              <div class="sd-lyric-acts">
                <button class="sd-mini" type="button" title="แยกคำไทยที่พิมพ์/วางติดกันให้เป็นคำ ๆ (ใช้พจนานุกรมในเบราว์เซอร์)" @click="autoSegmentLyric(card.i)">✂ แยกคำไทย</button>
                <button class="sd-mini primary" type="button" title="ลงเนื้อนี้บนโน้ตของท่อน" @click="applyLyric(card.i)"><Icon name="check" :size="13" /> ลงโน้ต</button>
                <button class="sd-mini ghost" type="button" @click="lyricEditing = -1">ปิด</button>
              </div>
              <p class="sd-lyric-hint">แต่ละคำไปลงโน้ตตัวถัดไป · โน้ตลาก/พักเว้นว่าง · ใช้ยัติภังค์ (-) เชื่อมพยางค์ในคำเดียว</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- ── ทำนอง / melodies ─────────────────────────────────────────── -->
      <section class="sd-sec">
        <div class="sd-sec-head">
          <span class="sd-sec-title">ทำนอง</span>
          <button class="sd-add" type="button" title="เพิ่มทำนองใหม่ (ว่าง)" @click="onAddStanza"><Icon name="plus" :size="14" /> ทำนองใหม่</button>
        </div>
        <p v-if="multi" class="sd-mels-hint">เลือกทำนองที่จะดู/แก้ — โครงทำนองด้านล่างจะสลับตาม</p>
        <ul class="sd-mels" role="list">
          <li v-for="s in stanzas" :key="s.id" class="sd-mel" :class="{ hl: hlStanza === s.id, active: multi && s.id === activeStanzaId }">
            <button
              v-if="multi"
              class="sd-mel-pick"
              type="button"
              :aria-pressed="s.id === activeStanzaId"
              :title="`ดู/แก้โครงทำนอง ${s.id}`"
              @click="selectStanza(s.id)"
              @mouseenter="hlStanza = s.id"
              @mouseleave="hlStanza = ''"
            >
              <span class="sd-mel-tag">♫ {{ s.id }}</span>
              <span class="sd-mel-use">{{ stanzaUse[s.id] || 0 }} ท่อน · {{ (s.lines || []).length }} บรรทัด</span>
              <span v-if="s.id === activeStanzaId" class="sd-mel-now">● กำลังแก้</span>
            </button>
            <div v-else class="sd-mel-pick static">
              <span class="sd-mel-tag">♫ {{ s.id }}</span>
              <span class="sd-mel-use">{{ stanzaUse[s.id] || 0 }} ท่อน · {{ (s.lines || []).length }} บรรทัด</span>
            </div>
            <button class="sd-icon danger" type="button" :disabled="stanzas.length <= 1" aria-label="ลบทำนองนี้" :title="(stanzaUse[s.id]||0) > 0 ? 'ลบทำนอง (ท่อนที่ใช้จะถูกลบด้วย)' : 'ลบทำนอง'" @click="onRemoveStanza(s.id)"><Icon name="trash-2" :size="14" /></button>
          </li>
        </ul>
      </section>

      <!-- ── คัดลอก / วาง · จัดลำดับ — visible insertion points + drag reorder (BI-004) ──── -->
      <section class="sd-sec">
        <div class="sd-sec-head"><span class="sd-sec-title">คัดลอก / วาง · จัดลำดับ</span></div>

        <p class="sd-hint" v-if="hasCursor">ตำแหน่งที่เลือก: <b>{{ cursorText }}</b></p>
        <p class="sd-hint muted" v-else>แตะโน้ตบนแผ่นเพลง หรือแตะบรรทัด/ห้องด้านล่าง เพื่อเลือกก่อนคัดลอก</p>

        <div class="sd-cp">
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="คัดลอกห้องที่เลือก" @click="onCopyBar"><Icon name="clipboard-copy" :size="14" /> คัดลอกห้อง</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="คัดลอกบรรทัดที่เลือก" @click="onCopyLine"><Icon name="clipboard-copy" :size="14" /> คัดลอกบรรทัด</button>
        </div>

        <div v-if="clip" class="sd-clip">
          <span class="sd-clip-what"><Icon name="clipboard-copy" :size="13" /> คลิป: <b>{{ clip.kind === 'bar' ? 'ห้อง' : 'บรรทัด' }}</b><span v-if="clip.from" class="muted"> ({{ clip.from }})</span></span>
          <p class="sd-clip-tip">{{ clip.kind === 'bar' ? 'แตะจุด ▸ ในบรรทัดที่เลือกด้านล่าง เพื่อวางห้องตรงนั้น' : 'แตะจุด ▸ ระหว่างบรรทัดด้านล่าง เพื่อวางบรรทัดตรงนั้น' }}</p>
          <div class="sd-clip-acts">
            <button v-if="clip.kind === 'line'" class="sd-cp-btn paste" type="button" title="วางเป็นทำนอง/ท่อนใหม่" @click="onPasteAsStanza"><Icon name="file-plus" :size="14" /> วางเป็นท่อนใหม่</button>
            <button class="sd-cp-btn ghost" type="button" title="ล้างคลิป" @click="onClearClip"><Icon name="x" :size="14" /> ล้างคลิป</button>
          </div>
        </div>

        <!-- โครงทำนอง outline: lines (+ the selected line's bars) as a reorderable list with
             visible ▸ insertion points. Tap ▸ to paste; drag a row/chip or use ◀▶/▲▼ to reorder. -->
        <div class="sd-outline" v-if="activeLines.length">
          <div class="sd-outline-title"><span class="sd-mel-badge">♫{{ activeStanzaId }}</span> โครงทำนอง {{ activeStanzaId }}</div>
          <!-- breadcrumb: says which melody the outline is + where the cursor is. Two states —
               synced (outline == cursor's melody) shows the full path; desynced (user switched to
               another melody via the list) says so + offers a jump back to the cursor's melody. -->
          <p class="sd-crumb" :class="{ desync: desynced }">
            <template v-if="desynced">
              กำลังดู <b>♫{{ activeStanzaId }}</b> · <span class="muted">เคอร์เซอร์อยู่ที่ {{ cursorVerseLabel }} (♫{{ cursor.stanzaId }})</span>
              <button class="sd-crumb-jump" type="button" @click="jumpToCursor">ไปที่เคอร์เซอร์</button>
            </template>
            <template v-else-if="hasCursor">
              กำลังแก้: <b>♫{{ activeStanzaId }}</b> › {{ cursorVerseLabel }} › บรรทัด {{ (cursor.lineIndex ?? 0) + 1 }} · ห้อง {{ (cursor.barOrdinal ?? 0) + 1 }}
            </template>
            <template v-else>
              กำลังดูทำนอง <b>♫{{ activeStanzaId }}</b>
            </template>
          </p>
          <div class="sd-outline-cap"><span class="muted">ลากจับ <Icon name="grip-vertical" :size="11" /> หรือใช้ ▲▼ เพื่อจัดลำดับ</span></div>

          <!-- insertion slot BEFORE the first line -->
          <button v-if="pasteLineMode" class="sd-slot line" type="button" aria-label="วางบรรทัดที่ตำแหน่งบนสุด" @click="onPasteLineAt(0)"><span class="sd-slot-mark">▸</span> วางบรรทัดที่นี่</button>
          <div v-else-if="dragKind === 'line'" class="sd-slot line drop" @dragover.prevent @drop="onDropLine(0)" aria-hidden="true"></div>

          <template v-for="(ln, li) in activeLines" :key="li">
            <div
              class="sd-line"
              :class="{ sel: li === selLine, dragging: dragLineFrom === li }"
              draggable="true"
              @dragstart="onLineDragStart(li, $event)"
              @dragend="onLineDragEnd"
              @click="selectLine(li)"
            >
              <span class="sd-grip" aria-hidden="true" title="ลากเพื่อจัดลำดับบรรทัด"><Icon name="grip-vertical" :size="13" /></span>
              <span class="sd-line-tag">บรรทัด {{ li + 1 }}</span>
              <span class="sd-line-preview">{{ linePreview(ln) }}</span>
              <span class="sd-line-acts">
                <button class="sd-icon" type="button" :disabled="li === 0" aria-label="เลื่อนบรรทัดขึ้น" title="เลื่อนขึ้น" @click.stop="onMoveLineTo(li, li - 1)"><Icon name="chevron-up" :size="14" /></button>
                <button class="sd-icon" type="button" :disabled="li === activeLines.length - 1" aria-label="เลื่อนบรรทัดลง" title="เลื่อนลง" @click.stop="onMoveLineTo(li, li + 1)"><Icon name="chevron-down" :size="14" /></button>
                <button class="sd-icon" type="button" aria-label="คัดลอกบรรทัดนี้" title="คัดลอกบรรทัดนี้" @click.stop="onCopyLineAt(li)"><Icon name="clipboard-copy" :size="13" /></button>
                <button class="sd-icon" type="button" aria-label="ทำซ้ำบรรทัดนี้" title="ทำซ้ำบรรทัดนี้ตรงนี้" @click.stop="onDupLineAt(li)"><Icon name="copy" :size="13" /></button>
              </span>
            </div>

            <!-- the selected line's bars — a reorderable strip with ▸ bar insertion points -->
            <div v-if="li === selLine" class="sd-bars">
              <button v-if="pasteBarMode" class="sd-slot bar" type="button" aria-label="วางห้องที่ต้นบรรทัด" title="วางห้องที่นี่" @click="onPasteBarAt(li, 0)">▸</button>
              <span v-else-if="dragKind === 'bar' && dragBarLine === li" class="sd-slot bar drop" @dragover.prevent @drop="onDropBar(li, 0)" aria-hidden="true"></span>
              <template v-for="(b, bi) in barsOf(ln)" :key="bi">
                <span
                  class="sd-bar"
                  :class="{ sel: bi === selBar, dragging: dragBarLine === li && dragBarFrom === bi }"
                  draggable="true"
                  @dragstart="onBarDragStart(li, bi, $event)"
                  @dragend="onBarDragEnd"
                  @click.stop="selectBar(bi)"
                  :title="`ห้อง ${bi + 1}`"
                >
                  <span class="sd-bar-notes">{{ b.notes || '·' }}</span>
                  <span v-if="bi === selBar" class="sd-bar-move">
                    <button class="sd-bar-mv" type="button" :disabled="bi === 0" aria-label="ย้ายห้องไปทางซ้าย" title="ย้ายซ้าย" @click.stop="onMoveBarTo(li, bi, bi - 1)">◀</button>
                    <button class="sd-bar-mv" type="button" :disabled="bi === barsOf(ln).length - 1" aria-label="ย้ายห้องไปทางขวา" title="ย้ายขวา" @click.stop="onMoveBarTo(li, bi, bi + 1)">▶</button>
                  </span>
                  <button class="sd-bar-copy" type="button" aria-label="คัดลอกห้องนี้" title="คัดลอกห้องนี้" @click.stop="onCopyBarAt(li, bi)"><Icon name="clipboard-copy" :size="11" /></button>
                </span>
                <button v-if="pasteBarMode" class="sd-slot bar" type="button" :aria-label="`วางห้องหลังห้อง ${bi + 1}`" title="วางห้องที่นี่" @click="onPasteBarAt(li, bi + 1)">▸</button>
                <span v-else-if="dragKind === 'bar' && dragBarLine === li" class="sd-slot bar drop" @dragover.prevent @drop="onDropBar(li, bi + 1)" aria-hidden="true"></span>
              </template>
            </div>

            <!-- insertion slot AFTER this line -->
            <button v-if="pasteLineMode" class="sd-slot line" type="button" :aria-label="`วางบรรทัดหลังบรรทัด ${li + 1}`" @click="onPasteLineAt(li + 1)"><span class="sd-slot-mark">▸</span> วางบรรทัดที่นี่</button>
            <div v-else-if="dragKind === 'line'" class="sd-slot line drop" @dragover.prevent @drop="onDropLine(li + 1)" aria-hidden="true"></div>
          </template>
        </div>
      </section>

      <p class="sd-foot">ทุกการเปลี่ยนแปลงบันทึกพร้อมเพลง — ดูสถานะ “บันทึกแล้ว / ยังไม่บันทึก” ที่แถบด้านบน</p>
    </div>
  </aside>
</template>

<style scoped>
.sd-panel {
  position: fixed;
  top: var(--sd-top, 96px);
  right: 12px;
  z-index: var(--z-drawer, 1050);
  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - var(--sd-top, 96px) - var(--dock-h, 96px) - 16px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
}
.sd-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid var(--line, #e2e8f0);
}
.sd-title { display: flex; align-items: center; gap: 6px; margin: 0; flex: 1; font-size: var(--fs-base, 1rem); font-weight: 700; color: var(--brand, #b45309); }
.sd-close {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 30px; min-height: 30px; padding: 0 6px;
  border: 1px solid var(--line, #e2e8f0); border-radius: 8px;
  background: transparent; color: var(--ink, #0f172a); cursor: pointer;
}
.sd-close:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }

.sd-body { display: flex; flex-direction: column; gap: 16px; padding: 12px; overflow-y: auto; }
.sd-sec { display: flex; flex-direction: column; gap: 8px; }
.sd-sec-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sd-sec-title { font-size: var(--fs-xs, 0.8rem); font-weight: 700; color: var(--muted, #64748b); text-transform: none; }
.sd-add {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 30px; padding: 2px 10px;
  border: 1px solid var(--brand, #b45309); border-radius: 8px;
  background: transparent; color: var(--brand, #b45309); font: inherit; font-size: var(--fs-sm, 0.9rem); font-weight: 600; cursor: pointer;
}
.sd-add:hover { background: color-mix(in srgb, var(--brand, #b45309) 10%, transparent); }
.sd-add:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }

.sd-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sd-card {
  display: flex; align-items: stretch; gap: 6px; flex-wrap: wrap;
  padding: 6px; border: 1px solid var(--line, #e2e8f0); border-radius: 10px;
  background: var(--surface, #fff); transition: border-color .12s, background .12s, box-shadow .12s;
}
.sd-card.hl { border-color: var(--brand, #b45309); background: color-mix(in srgb, var(--brand, #b45309) 7%, var(--surface, #fff)); }
.sd-card.dragging { opacity: .5; }
.sd-card.drop { box-shadow: 0 -2px 0 0 var(--brand, #b45309) inset; }
.sd-grip { display: flex; align-items: center; color: var(--muted, #94a3b8); cursor: grab; }
.sd-card-main { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.sd-card-row1 { display: flex; align-items: center; gap: 6px; }
.sd-rename {
  flex: 1; min-width: 0; min-height: 30px; padding: 2px 8px;
  border: 1px solid var(--line, #e2e8f0); border-radius: 8px;
  background: var(--surface, #fff); color: var(--ink, #0f172a); font: inherit; font-size: var(--fs-sm, 0.9rem);
}
.sd-rename:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-badge-sel {
  min-height: 30px; padding: 2px 4px;
  border: 1px solid var(--brand, #b45309); border-radius: 8px;
  background: color-mix(in srgb, var(--brand, #b45309) 8%, var(--surface, #fff));
  color: var(--brand, #b45309); font: inherit; font-size: var(--fs-sm, 0.9rem); font-weight: 700; cursor: pointer;
}
.sd-card-row2 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sd-refrain { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-xs, 0.8rem); color: var(--ink, #0f172a); cursor: pointer; }
.sd-mini {
  display: inline-flex; align-items: center; gap: 3px;
  min-height: 26px; padding: 1px 8px;
  border: 1px solid var(--line, #e2e8f0); border-radius: 999px;
  background: transparent; color: var(--muted, #64748b); font: inherit; font-size: var(--fs-xs, 0.8rem); cursor: pointer;
}
.sd-mini:hover { border-color: var(--brand, #b45309); color: var(--brand, #b45309); }
.sd-solo { font-size: var(--fs-xs, 0.8rem); color: var(--muted, #94a3b8); }
.sd-card-acts { display: flex; flex-direction: column; gap: 2px; justify-content: center; }
.sd-icon {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 30px; min-height: 26px; padding: 0 4px;
  border: 1px solid transparent; border-radius: 7px;
  background: transparent; color: var(--ink, #0f172a); cursor: pointer;
}
.sd-icon:hover:not(:disabled) { border-color: var(--line, #e2e8f0); background: color-mix(in srgb, var(--ink, #0f172a) 5%, transparent); }
.sd-icon:disabled { opacity: .35; cursor: default; }
.sd-icon.danger:hover:not(:disabled) { color: #dc2626; border-color: #fca5a5; }
.sd-icon.on { border-color: var(--brand, #b45309); color: var(--brand, #b45309); background: color-mix(in srgb, var(--brand, #b45309) 8%, transparent); }
.sd-icon:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }

/* แก้เนื้อทั้งข้อ — the per-verse bulk-lyric textarea, wraps full-width below the card row */
.sd-lyric { flex: 1 0 100%; display: flex; flex-direction: column; gap: 6px; margin-top: 4px; padding: 8px; border: 1px solid color-mix(in srgb, var(--brand, #b45309) 30%, var(--line, #e2e8f0)); border-radius: 8px; background: color-mix(in srgb, var(--brand, #b45309) 4%, var(--surface, #fff)); }
.sd-lyric-lbl { font-size: var(--fs-xs, 0.8rem); font-weight: 600; color: var(--ink, #362f28); }
.sd-lyric-ta { width: 100%; box-sizing: border-box; resize: vertical; min-height: 3.2em; padding: 6px 8px; border: 1px solid var(--line, #e2e8f0); border-radius: 6px; background: var(--surface, #fff); color: var(--ink, #362f28); font: inherit; font-size: var(--fs-sm, 0.9rem); line-height: 1.5; }
.sd-lyric-ta:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-lyric-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.sd-mini.primary { border-color: var(--brand, #b45309); color: var(--brand, #b45309); font-weight: 600; }
.sd-mini.primary:hover { background: color-mix(in srgb, var(--brand, #b45309) 10%, transparent); }
.sd-mini.ghost { color: var(--muted, #64748b); }
.sd-mini:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-lyric-hint { margin: 0; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #6f6455); line-height: 1.4; }

.sd-mels-hint { margin: 0 0 2px; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }
.sd-mels { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.sd-mel {
  display: flex; align-items: center; gap: 4px;
  padding: 2px 6px 2px 2px; border: 1px solid var(--line, #e2e8f0); border-radius: 9px;
  transition: border-color .12s, background .12s;
}
.sd-mel.hl { border-color: color-mix(in srgb, var(--brand, #b45309) 55%, var(--line, #e2e8f0)); }
/* the ACTIVE melody — the one the outline below is showing. Border + tint + the text pill together
   carry the state so it never depends on colour alone (WCAG 1.4.1). */
.sd-mel.active { border-color: var(--brand, #b45309); background: color-mix(in srgb, var(--brand, #b45309) 8%, var(--surface, #fff)); }
.sd-mel-pick {
  flex: 1; min-width: 0;
  display: flex; align-items: center; gap: 8px;
  min-height: 34px; padding: 3px 6px;
  border: none; border-radius: 6px; background: transparent;
  font: inherit; text-align: left; color: inherit; cursor: pointer;
}
.sd-mel-pick.static { cursor: default; }
button.sd-mel-pick:hover { background: color-mix(in srgb, var(--brand, #b45309) 6%, transparent); }
.sd-mel-pick:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-mel-tag { font-weight: 700; color: var(--brand, #b45309); font-size: var(--fs-sm, 0.9rem); white-space: nowrap; }
.sd-mel-use { flex: 1; min-width: 0; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }
.sd-mel-now {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 8px; border-radius: 999px;
  background: var(--brand, #b45309); color: #fff;
  font-size: var(--fs-xs, 0.8rem); font-weight: 700; white-space: nowrap;
}

.sd-hint { margin: 0; font-size: var(--fs-xs, 0.8rem); color: var(--ink, #0f172a); }
.sd-hint.muted { color: var(--muted, #64748b); }
.sd-cp { display: flex; flex-wrap: wrap; gap: 6px; }
.sd-cp-btn {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 32px; padding: 2px 10px;
  border: 1px solid var(--line, #e2e8f0); border-radius: 8px;
  background: var(--surface, #fff); color: var(--ink, #0f172a); font: inherit; font-size: var(--fs-sm, 0.9rem); cursor: pointer;
}
.sd-cp-btn:hover:not(:disabled) { border-color: var(--brand, #b45309); }
.sd-cp-btn:disabled { opacity: .4; cursor: default; }
.sd-cp-btn:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-cp-btn.paste { border-color: var(--brand, #b45309); color: var(--brand, #b45309); font-weight: 600; }
.sd-cp-btn.ghost { color: var(--muted, #64748b); }
.sd-clip {
  margin-top: 8px; padding: 8px; border: 1px dashed var(--brand, #b45309); border-radius: 8px;
  display: flex; flex-direction: column; gap: 6px;
  background: color-mix(in srgb, var(--brand, #b45309) 6%, var(--surface, #fff));
}
.sd-clip-what { display: flex; align-items: center; gap: 5px; font-size: var(--fs-xs, 0.8rem); color: var(--ink, #0f172a); }
.sd-clip-what .muted { color: var(--muted, #64748b); }
.sd-clip-tip { margin: 0; font-size: var(--fs-xs, 0.8rem); color: var(--brand, #b45309); font-weight: 600; }
.sd-clip-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.sd-foot { margin: 0; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }

/* ── โครงทำนอง outline — reorderable lines + bars with visible insertion points (BI-004) ── */
.sd-outline { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
/* the outline's own title + breadcrumb — always names the melody being edited (BI-018) */
.sd-outline-title { display: flex; align-items: center; gap: 6px; font-size: var(--fs-sm, 0.9rem); font-weight: 700; color: var(--ink, #0f172a); }
.sd-mel-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 26px; min-height: 22px; padding: 0 6px;
  border-radius: 6px; background: var(--brand, #b45309); color: #fff;
  font-size: var(--fs-xs, 0.8rem); font-weight: 800;
}
.sd-crumb { margin: 2px 0 0; font-size: var(--fs-xs, 0.8rem); color: var(--ink, #0f172a); line-height: 1.5; }
.sd-crumb b { color: var(--brand, #b45309); }
.sd-crumb .muted { color: var(--muted, #64748b); }
.sd-crumb.desync {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
  padding: 4px 8px; border-radius: 8px;
  background: color-mix(in srgb, var(--brand, #b45309) 7%, var(--surface, #fff));
  border: 1px dashed color-mix(in srgb, var(--brand, #b45309) 45%, var(--line, #e2e8f0));
}
.sd-crumb-jump {
  margin-left: auto; min-height: 24px; padding: 1px 8px;
  border: 1px solid var(--brand, #b45309); border-radius: 999px;
  background: transparent; color: var(--brand, #b45309);
  font: inherit; font-size: var(--fs-xs, 0.8rem); font-weight: 600; cursor: pointer;
}
.sd-crumb-jump:hover { background: color-mix(in srgb, var(--brand, #b45309) 10%, transparent); }
.sd-crumb-jump:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-outline-cap { font-size: var(--fs-xs, 0.8rem); color: var(--ink, #0f172a); font-weight: 600; margin-bottom: 2px; }
.sd-outline-cap .muted { color: var(--muted, #64748b); font-weight: 400; }

/* a line row */
.sd-line {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 6px; border: 1px solid var(--line, #e2e8f0); border-radius: 9px;
  background: var(--surface, #fff); cursor: pointer;
  transition: border-color .12s, background .12s;
}
.sd-line:hover { border-color: color-mix(in srgb, var(--brand, #b45309) 55%, var(--line, #e2e8f0)); }
.sd-line.sel { border-color: var(--brand, #b45309); background: color-mix(in srgb, var(--brand, #b45309) 8%, var(--surface, #fff)); }
.sd-line.dragging { opacity: .45; }
.sd-line .sd-grip { cursor: grab; color: var(--muted, #94a3b8); }
.sd-line-tag { font-size: var(--fs-xs, 0.8rem); font-weight: 700; color: var(--brand, #b45309); white-space: nowrap; }
.sd-line-preview { flex: 1; min-width: 0; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-line-acts { display: flex; align-items: center; gap: 1px; }

/* a bar strip under the selected line */
.sd-bars { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; padding: 3px 4px 3px 22px; }
.sd-bar {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 30px; padding: 2px 6px;
  border: 1px solid var(--line, #e2e8f0); border-radius: 7px;
  background: var(--surface, #fff); cursor: grab;
  font-size: var(--fs-xs, 0.8rem); color: var(--ink, #0f172a);
}
.sd-bar:hover { border-color: color-mix(in srgb, var(--brand, #b45309) 55%, var(--line, #e2e8f0)); }
.sd-bar.sel { border-color: var(--brand, #b45309); background: color-mix(in srgb, var(--brand, #b45309) 10%, var(--surface, #fff)); }
.sd-bar.dragging { opacity: .45; }
.sd-bar-notes { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sd-bar-move { display: inline-flex; gap: 1px; }
.sd-bar-mv {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; min-height: 24px; padding: 0;
  border: 1px solid var(--brand, #b45309); border-radius: 5px;
  background: transparent; color: var(--brand, #b45309); font-size: 0.7rem; cursor: pointer;
}
.sd-bar-mv:disabled { opacity: .35; cursor: default; }
.sd-bar-mv:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-bar-copy {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; min-height: 24px; padding: 0;
  border: 1px solid transparent; border-radius: 5px;
  background: transparent; color: var(--muted, #64748b); cursor: pointer;
}
.sd-bar-copy:hover { color: var(--brand, #b45309); border-color: var(--line, #e2e8f0); }
.sd-bar-copy:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }

/* an insertion slot — a "paste here ▸" target (clip held) or a drop zone (dragging) */
.sd-slot { font: inherit; }
.sd-slot.line {
  display: flex; align-items: center; gap: 6px;
  min-height: 30px; padding: 2px 10px; margin: 1px 0;
  border: 1px dashed var(--brand, #b45309); border-radius: 8px;
  background: color-mix(in srgb, var(--brand, #b45309) 8%, var(--surface, #fff));
  color: var(--brand, #b45309); font-size: var(--fs-xs, 0.8rem); font-weight: 600; cursor: pointer;
}
.sd-slot.line:hover { background: color-mix(in srgb, var(--brand, #b45309) 18%, var(--surface, #fff)); }
.sd-slot.line:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.sd-slot-mark { font-weight: 800; }
.sd-slot.bar {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 26px; min-height: 30px; padding: 0 4px; /* ≥24px WCAG 2.2 AA target (2.5.8) */
  border: 1px dashed var(--brand, #b45309); border-radius: 6px;
  background: color-mix(in srgb, var(--brand, #b45309) 8%, var(--surface, #fff));
  color: var(--brand, #b45309); font-weight: 800; cursor: pointer;
}
.sd-slot.bar:hover { background: color-mix(in srgb, var(--brand, #b45309) 18%, var(--surface, #fff)); }
.sd-slot.bar:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
/* drop zones shown while dragging — thin until hovered */
.sd-slot.line.drop { min-height: 10px; padding: 0; border-style: dashed; border-width: 2px; background: transparent; }
.sd-slot.bar.drop { min-width: 12px; min-height: 30px; padding: 0; border-width: 2px; background: transparent; }
.sd-slot.drop:hover { background: color-mix(in srgb, var(--brand, #b45309) 22%, var(--surface, #fff)); }

/* Phone / narrow: full-screen page (parity with SongSettings). */
@media (max-width: 760px) {
  .sd-panel {
    top: var(--sd-top, 56px); right: 0; left: 0; bottom: 0;
    width: auto; max-width: none; max-height: none;
    border: none; border-radius: 0; padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .sd-close { min-width: var(--touch-min, 44px); min-height: var(--touch-min, 44px); }
  .sd-icon { min-height: 34px; min-width: 34px; }
  .sd-cp-btn { min-height: 40px; }
  .sd-mel-pick { min-height: 44px; }
  .sd-crumb-jump { min-height: 34px; }
  .sd-slot.line, .sd-slot.bar { min-height: 40px; }
  .sd-bar { min-height: 38px; }
  .sd-bar-mv, .sd-bar-copy { min-height: 34px; min-width: 30px; }
}
</style>
