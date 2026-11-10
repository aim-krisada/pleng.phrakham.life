<script setup>
// ใบ v1#158 — the ONE row of language buttons (ไทย · English · 中文) used by แผ่นเพลง, ฝึกร้อง and แก้ไข.
// Each button turns a language's line of words on or off; several can be on at once. The choice is one
// setting for all three pages and carries on to the next song (store.songLangChoice). Only languages the
// song HAS get a button, and a song in one language shows no row at all — it looks exactly as before.
// In the editor (`editor`) the row also offers "+ English" / "+ 中文" to start a language the song lacks.
import { computed } from 'vue'
import { songLangChoice, setSongLangChoice } from '../store.js'
import { LANG_LABEL, EXTRA_LANGS, orderLangs, shownLangs, toggleLangChoice, missingLangText } from '../lib/songModel.js'

const props = defineProps({
  has: { type: Array, default: () => ['th'] }, // the languages this song has (songModel.songLangs)
  editor: { type: Boolean, default: false },
  // small marks under a language's name, team only (songModel.langMarks): { en: ['ยังไม่ได้ตรวจ'] }
  marks: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['add'])

const hasList = computed(() => orderLangs(props.has))
const shown = computed(() => shownLangs(songLangChoice.value, hasList.value).shown)
const note = computed(() => missingLangText(songLangChoice.value, hasList.value))
const addable = computed(() => (props.editor ? EXTRA_LANGS.filter((l) => !hasList.value.includes(l)) : []))
const showRow = computed(() => hasList.value.length > 1 || addable.value.length > 0)

function tap(l) {
  setSongLangChoice(toggleLangChoice(songLangChoice.value, hasList.value, l))
}
function add(l) {
  // a new language is switched on straight away, so its boxes appear to type into
  setSongLangChoice([...songLangChoice.value, ...shown.value, l])
  emit('add', l)
}
const isLast = (l) => shown.value.length === 1 && shown.value[0] === l
const markText = (l) => (Array.isArray(props.marks?.[l]) ? props.marks[l].join(' · ') : '')
</script>

<template>
  <div v-if="showRow" class="lang-row no-print" role="group" aria-label="ภาษาของเนื้อร้อง">
    <div class="lang-btns">
      <template v-if="hasList.length > 1">
        <button
          v-for="l in hasList"
          :key="l"
          type="button"
          class="lang-btn"
          :class="{ on: shown.includes(l) }"
          :lang="l"
          :data-lang="l"
          :aria-pressed="shown.includes(l) ? 'true' : 'false'"
          :aria-disabled="isLast(l) ? 'true' : null"
          :title="isLast(l) ? 'ต้องเปิดไว้อย่างน้อย 1 ภาษา' : (shown.includes(l) ? 'ซ่อน' : 'แสดง') + 'เนื้อ ' + LANG_LABEL[l]"
          @click="tap(l)"
        >{{ LANG_LABEL[l] }}<small v-if="markText(l)" class="lang-mark" :data-mark-lang="l" lang="th">{{ markText(l) }}</small></button>
      </template>
      <button
        v-for="l in addable"
        :key="'add-' + l"
        type="button"
        class="lang-btn lang-add"
        :data-add-lang="l"
        :title="'เพิ่มเนื้อร้อง ' + LANG_LABEL[l] + ' ใต้โน้ตเดิม'"
        @click="add(l)"
      >+ {{ LANG_LABEL[l] }}</button>
    </div>
    <p v-if="note" class="lang-note" role="status">{{ note }}</p>
  </div>
</template>

<style scoped>
.lang-row { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 0 0 var(--sp-2, 8px); max-width: 100%; }
.lang-btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.lang-btn {
  min-height: 38px;
  min-width: 64px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--ink, #333);
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
}
.lang-btn.on { background: var(--cream, #faf7f2); border-color: var(--brand); color: var(--brand); font-weight: 700; }
.lang-btn.on::before { content: '✓ '; }
.lang-btn[aria-disabled='true'] { cursor: default; }
.lang-add { border-style: dashed; color: var(--brand); }
.lang-mark { display: block; margin-top: -2px; font-size: 0.72rem; font-weight: 400; line-height: 1.2; color: var(--warn-ink, #8a5a00); }
.lang-btn:has(.lang-mark) { padding-top: 3px; padding-bottom: 3px; border-radius: 14px; }
@media (hover: hover) { .lang-btn:hover { border-color: var(--brand); } }
@media (pointer: coarse) { .lang-btn { min-height: var(--touch-min, 44px); } }
.lang-note { margin: 0; font-size: 0.9rem; color: var(--muted); text-align: center; }
</style>
