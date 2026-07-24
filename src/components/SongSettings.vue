<script setup>
// ⚙ ตั้งค่าเพลง — the song's own settings, INSIDE the inline (✏️) editor. B060: พี่เปา asked
// for this on 9 ก.ค.; until now the only way to change a song's เลข/ชื่อ/คีย์/จังหวะ/ธีม/หมวด
// was to leave the sheet for the old grid editor (docs: pm-inbox ui-gap-audit §17).
//
// Shape (see the G consult, work/b060-song-settings/meetings/…): a NON-MODAL side panel on a
// wide screen, a full-screen sheet on a phone.
//   • non-modal, docked beside the sheet — คีย์/จังหวะ change what the sheet RENDERS, so the
//     user must see the sheet while turning the dial. A modal that covers the page would hide
//     the very thing being edited (Material: side sheets are for content that co-exists with
//     the page; dialogs are for a decision that must interrupt).
//   • phone: full-screen — a 340px panel on a 360px screen IS the screen (ux-platform-patterns
//     §1: desktop popup → mobile full-screen page, เปิด → เลือก → เสร็จ → กลับที่เดิม).
// Every field commits AS YOU TYPE (no OK button): the editor already states บันทึกแล้ว/ยังไม่
// บันทึก at all times and owns the save, so a second "apply" step would be a second truth.
import { ref, watch, nextTick } from 'vue'
import { KEYS, TIME_SIGNATURES } from '../lib/chords.js'
import { THEME_OPTIONS, CATEGORY_OPTIONS } from '../lib/songMeta.js'
import ComboSelect from './ComboSelect.vue'
import Icon from './Icon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  // the song row's catalog fields
  number: { type: [Number, String], default: null },
  titleTh: { type: String, default: '' },
  titleEn: { type: String, default: '' },
  category: { type: String, default: '' },
  theme: { type: String, default: '' },
  // …and the musical ones, which live in content
  songKey: { type: String, default: 'C' },
  timeSignature: { type: String, default: '4/4' },
  bpm: { type: [Number, String], default: null },
})
// `meta` = a patch of ROW fields · `music` = a patch of CONTENT fields. Two events because the
// two halves are stored in two places (songs row vs songs.content jsonb) — the owner (Studio)
// routes each to where it belongs instead of this panel guessing the storage shape.
const emit = defineEmits(['meta', 'music', 'close'])

const panel = ref(null)
const firstField = ref(null)
// focus the first field when the panel opens — a keyboard user lands IN the panel, not behind it
watch(
  () => props.open,
  // preventScroll: focusing must not scroll the panel body — it opened at the top and the
  // first field belongs at the top (measured: without it the header clipped เลขเพลง)
  (on) => { if (on) nextTick(() => firstField.value?.focus?.({ preventScroll: true })) },
)

// เลขเพลง — a blank box means "no number" (null), never 0. Anything non-numeric is ignored
// rather than silently stored, so the catalog can't end up with a NaN.
function setNumber(e) {
  const raw = (e.target.value ?? '').trim()
  if (raw === '') return emit('meta', { number: null })
  const n = Number(raw)
  if (Number.isFinite(n)) emit('meta', { number: n })
}
function setBpm(e) {
  const raw = (e.target.value ?? '').trim()
  if (raw === '') return emit('music', { bpm: null })
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) emit('music', { bpm: n })
}
</script>

<template>
  <aside
    v-if="open"
    ref="panel"
    class="ss-panel no-print"
    role="region"
    aria-label="ตั้งค่าเพลง"
    @keydown.esc.stop="emit('close')"
  >
    <header class="ss-head">
      <h2 class="ss-title"><Icon name="settings" :size="16" /> ตั้งค่าเพลง</h2>
      <button class="ss-close" type="button" aria-label="ปิดตั้งค่าเพลง" title="ปิด" @click="emit('close')">
        <Icon name="x" :size="16" />
      </button>
    </header>

    <div class="ss-body">
      <label class="ss-field">
        <span class="ss-lbl">เลขเพลง</span>
        <input
          ref="firstField"
          class="ss-input"
          type="number"
          inputmode="numeric"
          :value="number ?? ''"
          placeholder="เช่น 141"
          @input="setNumber"
        />
      </label>

      <label class="ss-field">
        <span class="ss-lbl">ชื่อเพลง (ไทย)</span>
        <input
          class="ss-input"
          type="text"
          :value="titleTh"
          placeholder="ชื่อเพลงภาษาไทย"
          @input="emit('meta', { title_th: $event.target.value })"
        />
      </label>

      <label class="ss-field">
        <span class="ss-lbl">ชื่อเพลง (อังกฤษ)</span>
        <input
          class="ss-input"
          type="text"
          :value="titleEn || ''"
          placeholder="ถ้ามี"
          @input="emit('meta', { title_en: $event.target.value })"
        />
      </label>

      <div class="ss-field">
        <span class="ss-lbl">คีย์</span>
        <ComboSelect
          :model-value="songKey"
          :options="KEYS"
          width="100%"
          aria-label="คีย์ของเพลง"
          @update:model-value="emit('music', { key: $event })"
        />
        <!-- say what changing it DOES, before it is changed: the numbers stay (they are scale
             degrees), the chords move with the key, so the song simply sounds higher/lower. -->
        <p class="ss-note">เปลี่ยนคีย์ = ย้ายทั้งเพลง — โน้ตตัวเลขเท่าเดิม คอร์ดขยับตามคีย์ใหม่</p>
      </div>

      <div class="ss-field">
        <span class="ss-lbl">จังหวะ</span>
        <ComboSelect
          :model-value="timeSignature"
          :options="TIME_SIGNATURES"
          allow-custom
          width="100%"
          aria-label="จังหวะ (เลขบอกจังหวะ)"
          @update:model-value="emit('music', { timeSignature: $event })"
        />
      </div>

      <label class="ss-field">
        <span class="ss-lbl">ความเร็ว (BPM)</span>
        <input
          class="ss-input"
          type="number"
          inputmode="numeric"
          min="30"
          max="240"
          :value="bpm ?? ''"
          placeholder="เช่น 92"
          @input="setBpm"
        />
      </label>

      <div class="ss-field">
        <span class="ss-lbl">ธีม</span>
        <ComboSelect
          :model-value="theme || ''"
          :options="THEME_OPTIONS"
          width="100%"
          aria-label="ธีมของเพลง"
          @update:model-value="emit('meta', { theme: $event })"
        />
      </div>

      <div class="ss-field">
        <span class="ss-lbl">หมวด</span>
        <ComboSelect
          :model-value="category || ''"
          :options="CATEGORY_OPTIONS"
          width="100%"
          aria-label="หมวด (สมุดเพลง)"
          @update:model-value="emit('meta', { category: $event })"
        />
      </div>

      <p class="ss-foot">ทุกช่องบันทึกพร้อมกับเพลง — ดูสถานะ “บันทึกแล้ว / ยังไม่บันทึก” ที่แถบด้านบน</p>
    </div>
  </aside>
</template>

<style scoped>
/* Wide screen: a docked side panel on the right — the sheet keeps rendering next to it, so a
   คีย์/จังหวะ change is visible the moment it is made. In flow above the dock, never over it. */
.ss-panel {
  position: fixed;
  top: var(--ss-top, 96px);
  right: 12px;
  /* --z-drawer, not --z-popover: on a phone this IS a full-screen page, and the two surfaces it
     has to cover — the sticky save bar and the note-input bar — both sit at popover level. It
     was measured overlapping them at 412 (the save bar cut straight across ชื่อ/คีย์) before
     this. On a wide screen it is docked in its own column, so nothing changes there. */
  z-index: var(--z-drawer, 1050);
  display: flex;
  flex-direction: column;
  width: 320px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - var(--ss-top, 96px) - var(--dock-h, 96px) - 16px);
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
}
.ss-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line, #e2e8f0);
}
.ss-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  flex: 1;
  font-size: var(--fs-base, 1rem);
  font-weight: 700;
  color: var(--brand, #b45309);
}
/* ≥24px (WCAG 2.2 AA 2.5.8) and the same 30px scale as the editor's other small controls —
   deliberately NOT pushed to 44 on desktop, so it sits with its siblings. */
.ss-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  min-height: 30px;
  padding: 0 6px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
  background: transparent;
  color: var(--ink, #0f172a);
  cursor: pointer;
}
.ss-close:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }

.ss-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow-y: auto;
}
.ss-field { display: flex; flex-direction: column; gap: 4px; }
.ss-lbl { font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }
.ss-input {
  min-height: 34px;
  padding: 4px 8px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
  background: var(--surface, #fff);
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: var(--fs-sm, 0.9rem);
  width: 100%;
}
.ss-input:focus-visible { outline: 2px solid var(--brand, #b45309); outline-offset: 1px; }
.ss-note { margin: 2px 0 0; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }
.ss-foot { margin: 4px 0 0; font-size: var(--fs-xs, 0.8rem); color: var(--muted, #64748b); }

/* Phone / narrow: a full-screen settings page (Material full-screen dialog · iOS pushed
   settings). A 320px panel on a 360px screen would BE the screen with none of the benefits. */
@media (max-width: 760px) {
  .ss-panel {
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    width: auto;
    max-width: none;
    max-height: none;
    border: none;
    border-radius: 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  /* full-screen = the ✕ is the only way back, so give it a full touch target here */
  .ss-close { min-width: var(--touch-min, 44px); min-height: var(--touch-min, 44px); }
  .ss-input { min-height: 40px; }
}
</style>
