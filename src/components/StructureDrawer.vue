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
  copyBar, copyLine, pasteBarInLine, pasteLineInStanza, pasteLineAsStanza,
  duplicateBar, duplicateLine, moveBar, moveLine,
} from '../lib/songStructure.js'

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

// cursor context, in words — "ห้อง 2 · บรรทัด 1 · ท่อน 3". null when nothing is selected.
const cursorText = computed(() => {
  const c = props.cursor
  if (!c || c.stanzaId == null) return ''
  const parts = [`ห้อง ${(c.barOrdinal ?? 0) + 1}`, `บรรทัด ${(c.lineIndex ?? 0) + 1}`]
  if (c.entryIndex != null) parts.push(`ท่อน ${c.entryIndex + 1}`)
  return parts.join(' · ')
})
const hasCursor = computed(() => !!(props.cursor && props.cursor.stanzaId != null))

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

// ---- melody (stanza) actions ----
function onAddStanza() { apply(addStanza(props.content)) }
function onRemoveStanza(id) {
  if (stanzas.value.length <= 1) return
  apply(removeStanza(props.content, id))
}

// ---- copy / paste / move / duplicate at the cursor ----
function cursorAddr() {
  const c = props.cursor
  return c ? { stanzaId: c.stanzaId, lineIndex: c.lineIndex ?? 0, barOrdinal: c.barOrdinal ?? 0 } : null
}
function onCopyBar() {
  const a = cursorAddr(); if (!a) return
  const frag = copyBar(props.content, { ...a, from: `ห้อง ${a.barOrdinal + 1} · บรรทัด ${a.lineIndex + 1}` })
  if (frag) emit('set-clip', frag)
}
function onCopyLine() {
  const a = cursorAddr(); if (!a) return
  const frag = copyLine(props.content, { ...a, from: `บรรทัด ${a.lineIndex + 1}` })
  if (frag) emit('set-clip', frag)
}
function onDupBar() { const a = cursorAddr(); if (a) apply(duplicateBar(props.content, a.stanzaId, a.lineIndex, a.barOrdinal)) }
function onDupLine() { const a = cursorAddr(); if (a) apply(duplicateLine(props.content, a.stanzaId, a.lineIndex)) }
function onMoveBar(dir) { const a = cursorAddr(); if (a) apply(moveBar(props.content, a.stanzaId, a.lineIndex, a.barOrdinal, dir)) }
function onMoveLine(dir) { const a = cursorAddr(); if (a) apply(moveLine(props.content, a.stanzaId, a.lineIndex, dir)) }
function onPasteBar() { const a = cursorAddr(); if (a && props.clip?.kind === 'bar') apply(pasteBarInLine(props.content, a.stanzaId, a.lineIndex, props.clip)) }
function onPasteLine() { const a = cursorAddr(); if (a && props.clip?.kind === 'line') apply(pasteLineInStanza(props.content, a.stanzaId, props.clip)) }
function onPasteAsStanza() { if (props.clip?.kind === 'line') apply(pasteLineAsStanza(props.content, props.clip)) }
function onClearClip() { emit('set-clip', null) }

// ---- drag reorder (pointer enhancement; ▲▼ is the accessible primary) ----
const dragFrom = ref(-1)
const dragOver = ref(-1)
function onDragStart(i, e) { dragFrom.value = i; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move' }
function onDragOver(i, e) { e.preventDefault(); dragOver.value = i }
function onDrop(i) {
  if (dragFrom.value >= 0 && dragFrom.value !== i) {
    const arr = arrangement.value
    // moveVerse(from, to) — dropping onto card i places the dragged row at i's slot
    apply(moveVerseBy(props.content, dragFrom.value, i - dragFrom.value))
  }
  dragFrom.value = -1; dragOver.value = -1
}
function onDragEnd() { dragFrom.value = -1; dragOver.value = -1 }

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
              <button class="sd-icon" type="button" :disabled="card.i === 0" aria-label="เลื่อนขึ้น" title="เลื่อนขึ้น" @click="onMove(card.i, -1)"><Icon name="chevron-up" :size="15" /></button>
              <button class="sd-icon" type="button" :disabled="card.i === cards.length - 1" aria-label="เลื่อนลง" title="เลื่อนลง" @click="onMove(card.i, 1)"><Icon name="chevron-down" :size="15" /></button>
              <button class="sd-icon" type="button" aria-label="ทำซ้ำท่อนนี้" title="ทำซ้ำท่อน (เนื้อ+ทำนองเดิม)" @click="onDuplicate(card.i)"><Icon name="copy" :size="15" /></button>
              <button class="sd-icon danger" type="button" :disabled="cards.length <= 1" aria-label="ลบท่อนนี้" title="ลบท่อน" @click="onDelete(card.i)"><Icon name="trash-2" :size="15" /></button>
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
        <ul class="sd-mels" role="list">
          <li v-for="s in stanzas" :key="s.id" class="sd-mel" :class="{ hl: hlStanza === s.id }" @mouseenter="hlStanza = s.id" @mouseleave="hlStanza = ''">
            <span class="sd-mel-tag">♫ {{ s.id }}</span>
            <span class="sd-mel-use">{{ stanzaUse[s.id] || 0 }} ท่อน · {{ (s.lines || []).length }} บรรทัด</span>
            <button class="sd-icon danger" type="button" :disabled="stanzas.length <= 1" aria-label="ลบทำนองนี้" :title="(stanzaUse[s.id]||0) > 0 ? 'ลบทำนอง (ท่อนที่ใช้จะถูกลบด้วย)' : 'ลบทำนอง'" @click="onRemoveStanza(s.id)"><Icon name="trash-2" :size="14" /></button>
          </li>
        </ul>
      </section>

      <!-- ── คัดลอก / วาง (ตามเคอร์เซอร์) ───────────────────────────────── -->
      <section class="sd-sec">
        <div class="sd-sec-head"><span class="sd-sec-title">คัดลอก / วาง</span></div>
        <p class="sd-hint" v-if="hasCursor">ตำแหน่งที่เลือก: <b>{{ cursorText }}</b></p>
        <p class="sd-hint muted" v-else>แตะโน้ตบนแผ่นเพลงก่อน แล้วจึงคัดลอก / ทำซ้ำ / ย้าย</p>

        <div class="sd-cp">
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="คัดลอกห้องนี้" @click="onCopyBar"><Icon name="clipboard-copy" :size="14" /> คัดลอกห้อง</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="คัดลอกบรรทัดนี้" @click="onCopyLine"><Icon name="clipboard-copy" :size="14" /> คัดลอกบรรทัด</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="ทำซ้ำห้องนี้ตรงนี้" @click="onDupBar"><Icon name="copy" :size="14" /> ทำซ้ำห้อง</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="ทำซ้ำบรรทัดนี้ตรงนี้" @click="onDupLine"><Icon name="copy" :size="14" /> ทำซ้ำบรรทัด</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="ย้ายห้องไปทางซ้าย/บรรทัดก่อน" @click="onMoveBar(-1)">◀ ห้อง</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="ย้ายห้องไปทางขวา/บรรทัดถัดไป" @click="onMoveBar(1)">ห้อง ▶</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="ย้ายบรรทัดขึ้น" @click="onMoveLine(-1)">▲ บรรทัด</button>
          <button class="sd-cp-btn" type="button" :disabled="!hasCursor" title="ย้ายบรรทัดลง" @click="onMoveLine(1)">บรรทัด ▼</button>
        </div>

        <div v-if="clip" class="sd-clip">
          <span class="sd-clip-what">คลิป: {{ clip.kind === 'bar' ? 'ห้อง' : 'บรรทัด' }}<span v-if="clip.from"> ({{ clip.from }})</span></span>
          <div class="sd-clip-acts">
            <button v-if="clip.kind === 'bar'" class="sd-cp-btn paste" type="button" :disabled="!hasCursor" title="วางห้องต่อท้ายบรรทัดที่เลือก" @click="onPasteBar"><Icon name="clipboard-paste" :size="14" /> วางห้อง</button>
            <button v-if="clip.kind === 'line'" class="sd-cp-btn paste" type="button" :disabled="!hasCursor" title="วางบรรทัดต่อท้ายทำนองที่เลือก" @click="onPasteLine"><Icon name="clipboard-paste" :size="14" /> วางบรรทัด</button>
            <button v-if="clip.kind === 'line'" class="sd-cp-btn paste" type="button" title="วางเป็นทำนอง/ท่อนใหม่" @click="onPasteAsStanza"><Icon name="file-plus" :size="14" /> วางเป็นท่อนใหม่</button>
            <button class="sd-cp-btn ghost" type="button" title="ล้างคลิป" @click="onClearClip"><Icon name="x" :size="14" /> ล้าง</button>
          </div>
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
  display: flex; align-items: stretch; gap: 6px;
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
.sd-icon:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }

.sd-mels { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.sd-mel {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px; border: 1px solid var(--line, #e2e8f0); border-radius: 8px;
}
.sd-mel.hl { border-color: var(--brand, #b45309); background: color-mix(in srgb, var(--brand, #b45309) 7%, var(--surface, #fff)); }
.sd-mel-tag { font-weight: 700; color: var(--brand, #b45309); font-size: var(--fs-sm, 0.9rem); }
.sd-mel-use { flex: 1; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }

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
.sd-clip-what { font-size: var(--fs-xs, 0.8rem); color: var(--ink, #0f172a); }
.sd-clip-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.sd-foot { margin: 0; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }

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
}
</style>
