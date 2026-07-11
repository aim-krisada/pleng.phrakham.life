<script setup>
import { ref, watch, nextTick } from 'vue'

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

// A #/b typed (or tapped) AFTER the digit is auto-moved to its correct place
// in front of it: "4#" -> "#4", ".4b" -> "b.4", "~4#" -> "~#4"
function fixAccidental(v) {
  const chars = v.split('')
  const digitIdx = chars.findIndex((c) => c >= '0' && c <= '7')
  if (digitIdx === -1) return v
  const accIdx = chars.findIndex((c, idx) => (c === '#' || c === 'b') && idx > digitIdx)
  if (accIdx === -1) return v
  const acc = chars.splice(accIdx, 1)[0]
  const insertAt = chars[0] === '~' ? 1 : 0
  chars.splice(insertAt, 0, acc)
  return chars.join('')
}

function onInput(i, e) {
  const v = e.target.value
  if (/\s/.test(v)) {
    // pasted text with spaces -> split into boxes
    const parts = v.split(/\s+/).filter(Boolean).map(fixAccidental)
    boxes.value.splice(i, 1, ...(parts.length ? parts : ['']))
    sync()
    focusBox(i + Math.max(parts.length - 1, 0))
  } else {
    boxes.value[i] = fixAccidental(v)
    sync()
  }
}

function onKey(i, e) {
  const el = e.target
  if (e.key === ' ') {
    // Space splits at the caret: text before stays in this box, text after moves to a
    // new box at i+1 (so "345" with the caret before "5" -> "34" | "5"). With nothing
    // after the caret it just advances to / creates the next box, as before.
    e.preventDefault()
    const c = el.selectionStart ?? el.value.length
    const after = el.value.slice(c)
    if (after) {
      boxes.value[i] = fixAccidental(el.value.slice(0, c))
      boxes.value.splice(i + 1, 0, fixAccidental(after))
      sync()
      focusBox(i + 1, 0)
    } else {
      if (i === boxes.value.length - 1) boxes.value.push('')
      focusBox(i + 1)
    }
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
  } else if (e.key === 'Backspace' && el.value === '' && boxes.value.length > 1) {
    e.preventDefault()
    boxes.value.splice(i, 1)
    sync()
    focusBox(i - 1)
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
      :value="b"
      autocomplete="off"
      autocapitalize="off"
      @input="onInput(i, $event)"
      @keydown="onKey(i, $event)"
    />
    <button type="button" class="note-box add" tabindex="-1" @click="addBox">+</button>
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
