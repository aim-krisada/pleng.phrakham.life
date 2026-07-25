<script setup>
import { ref, watch, nextTick } from 'vue'
import { canonicalizeNote } from '../lib/notation.js'

// ID-card-style note entry: one small box per note token.
// Enter / space -> next box (created if needed) · arrows move across boxes ·
// Backspace on an empty box removes it and steps back.
// v-model stays the plain space-joined note string, so storage is unchanged.
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

function toBoxes(s) {
  const t = (s || '').trim()
  return t ? t.split(/\s+/) : ['']
}

const boxes = ref(toBoxes(props.modelValue))
const root = ref(null)
let internalUpdate = false

watch(
  () => props.modelValue,
  (v) => {
    if (internalUpdate) {
      internalUpdate = false
      return
    }
    boxes.value = toBoxes(v)
  }
)

function sync() {
  internalUpdate = true
  emit('update:modelValue', boxes.value.map((b) => b.trim()).filter(Boolean).join(' '))
}

function inputEls() {
  return root.value ? [...root.value.querySelectorAll('input')] : []
}

function focusBox(i, caret) {
  nextTick(() => {
    const el = inputEls()[Math.max(0, Math.min(i, boxes.value.length - 1))]
    if (el) {
      el.focus()
      const pos = caret == null ? el.value.length : caret
      el.setSelectionRange(pos, pos)
    }
  })
}

// Modifiers may be typed in any order and are sorted into the canonical form as you
// type — "4#" -> "#4", "5^." -> "5.^", ".#4" -> "#.4" (canonicalizeNote in notation.js;
// this replaces the old accidental-only fixAccidental). The box briefly flashes and
// announces the tidy-up so it reads as something the editor did, not as the text
// mysteriously changing under the caret. Library data is never rewritten this way —
// there the same mismatch is reported by lint (R10) for a person to decide on.
const tidied = ref(new Map()) // box index -> the form it was tidied into
const tidyTimers = new Map()

function fixOrder(v, i) {
  const out = canonicalizeNote(v)
  if (out !== v && i != null) flashTidy(i, out)
  return out
}

function flashTidy(i, out) {
  clearTimeout(tidyTimers.get(i))
  tidied.value = new Map(tidied.value).set(i, out)
  tidyTimers.set(
    i,
    setTimeout(() => {
      const next = new Map(tidied.value)
      next.delete(i)
      tidied.value = next
    }, 1600)
  )
}

function onInput(i, e) {
  const v = e.target.value
  if (/\s/.test(v)) {
    // pasted text with spaces -> split into boxes
    const parts = v.split(/\s+/).filter(Boolean).map((p, k) => fixOrder(p, i + k))
    boxes.value.splice(i, 1, ...(parts.length ? parts : ['']))
    sync()
    focusBox(i + Math.max(parts.length - 1, 0))
  } else {
    boxes.value[i] = fixOrder(v, i)
    sync()
  }
}

function onKey(i, e) {
  const el = e.target
  if (e.key === ' ') {
    // Space inserts a note break at the caret and ripples right — same as the lyric
    // box (EditorMode.vue onSylKey): text before stays here, text after (even empty)
    // moves to a new box at i+1 and everything shifts right, focus lands on it. So
    // "345" with the caret before "5" -> "34" | "5"; a space at the very end inserts an
    // empty box after; a space at the very start pushes the whole token right.
    e.preventDefault()
    const c = el.selectionStart ?? el.value.length
    boxes.value[i] = fixOrder(el.value.slice(0, c), i)
    boxes.value.splice(i + 1, 0, fixOrder(el.value.slice(c), i + 1))
    sync()
    focusBox(i + 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (i === boxes.value.length - 1) boxes.value.push('')
    focusBox(i + 1)
  } else if (e.key === 'ArrowRight' && el.selectionStart >= el.value.length && i < boxes.value.length - 1) {
    e.preventDefault()
    focusBox(i + 1)
  } else if (e.key === 'ArrowLeft' && el.selectionStart === 0 && i > 0) {
    e.preventDefault()
    focusBox(i - 1)
  } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0 && i > 0) {
    // At the very start, Backspace merges this box into the previous one (like the lyric
    // box) — so it also removes an empty box and steps back, as before.
    e.preventDefault()
    const prevLen = (boxes.value[i - 1] ?? '').length
    boxes.value[i - 1] = (boxes.value[i - 1] ?? '') + el.value
    boxes.value.splice(i, 1)
    sync()
    focusBox(i - 1, prevLen)
  } else if (e.key === 'Delete' && el.selectionStart === el.value.length && el.selectionEnd === el.value.length && i < boxes.value.length - 1) {
    // At the very end, Delete pulls the next box in (like the lyric box).
    e.preventDefault()
    const curLen = el.value.length
    boxes.value[i] = el.value + (boxes.value[i + 1] ?? '')
    boxes.value.splice(i + 1, 1)
    sync()
    focusBox(i, curLen)
  }
}

function addBox() {
  boxes.value.push('')
  focusBox(boxes.value.length - 1)
}
</script>

<template>
  <span ref="root" class="note-boxes">
    <input
      v-for="(b, i) in boxes"
      :key="i"
      class="note-box"
      :class="{ tidied: tidied.has(i) }"
      :value="b"
      :title="tidied.has(i) ? `จัดลำดับให้เป็น ${tidied.get(i)}` : null"
      autocomplete="off"
      autocapitalize="off"
      @input="onInput(i, $event)"
      @keydown="onKey(i, $event)"
    />
    <button type="button" class="note-box add" tabindex="-1" @click="addBox">+</button>
    <span class="sr-only" role="status" aria-live="polite">
      {{ tidied.size ? `จัดลำดับให้เป็น ${[...tidied.values()].join(' ')}` : '' }}
    </span>
  </span>
</template>

<style scoped>
.note-boxes { display: inline-flex; gap: 3px; flex-wrap: wrap; align-items: center; }
.note-box {
  width: 46px;
  text-align: center;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 15px;
  color: var(--note-blue);
  background: #f7fafc;
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 7px 2px;
}
.note-box:focus { background: #fff; border-color: var(--brand); outline: none; }
/* the editor just re-ordered this box's modifiers — say so instead of changing the
   text silently under the caret (docs/ds/note-symbol-set.md §1.2.1) */
.note-box.tidied { animation: note-tidied 1.6s ease-out; }
@keyframes note-tidied {
  0%, 55% { background: #fff7ed; border-color: var(--brand); }
  100% { background: #f7fafc; border-color: var(--line); }
}
@media (prefers-reduced-motion: reduce) {
  .note-box.tidied { animation: none; background: #fff7ed; border-color: var(--brand); }
}
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.note-box.add {
  width: 30px;
  color: var(--muted);
  cursor: pointer;
  background: transparent;
  border-style: dashed;
}
/* on a phone the "+" add-note button gets a wider, comfortable tap area */
@media (max-width: 760px) {
  .note-box.add { width: 40px; }
}
</style>
