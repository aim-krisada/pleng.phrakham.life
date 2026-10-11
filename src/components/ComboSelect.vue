<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// Type-to-filter dropdown, keyboard-operable (WCAG 2.1.1):
// ArrowDown/Up move the highlight, Enter picks, Esc closes.
// options: [{ value, label, search? }] or plain strings.
// allowCustom lets the typed text itself become the value (e.g. custom time signature).
// validate (only with allowCustom) gates that free text: a custom value is committed only
// when validate(text) is truthy, so odd-but-valid input passes (e.g. a chord like "F#m7b5")
// while genuine junk is rejected and the field snaps back. No validate = accept any text.
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  allowCustom: { type: Boolean, default: false },
  validate: { type: Function, default: null },
  // normalize (only with allowCustom): the typed text is run through this before it is
  // committed, so what gets saved is the canonical form ("g / a" is stored as "G/A").
  normalize: { type: Function, default: null },
  // errorFor (only with allowCustom): given the refused text, return a plain-language reason.
  // Without it the field just snapped back in silence and the user had no idea what was wrong.
  errorFor: { type: Function, default: null },
  width: { type: String, default: '160px' },
  autofocus: { type: Boolean, default: false }, // open + focus on mount (inline pickers)
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const text = ref('')
const hi = ref(-1) // highlighted option index
const errMsg = ref('') // why the last typed value was refused (shown under the field)
const listId = `combo-${Math.random().toString(36).slice(2, 8)}`

const norm = computed(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }))
)
const selectedLabel = computed(
  () => norm.value.find((o) => o.value === props.modelValue)?.label ?? String(props.modelValue ?? '')
)
watch(selectedLabel, (l) => { if (!open.value) text.value = l }, { immediate: true })

const filtered = computed(() => {
  const q = text.value.trim().toLowerCase()
  if (!q || q === selectedLabel.value.toLowerCase()) return norm.value
  return norm.value.filter((o) => (o.search ?? o.label).toLowerCase().includes(q))
})
watch(filtered, () => { if (hi.value >= filtered.value.length) hi.value = filtered.value.length - 1 })

function onFocus() {
  open.value = true
  text.value = ''
  hi.value = -1
  errMsg.value = ''
}
// the message clears as soon as the user types again (a watch on `text` would also fire
// when blur snaps the field back, wiping the message we just put up)
function onInput() {
  errMsg.value = ''
}
// a refused custom value explains itself instead of silently snapping back
function refuse(q) {
  errMsg.value = (props.errorFor && props.errorFor(q)) || ''
}
// what a committed custom value is actually saved as
function customValue(q) {
  return props.normalize ? (props.normalize(q) ?? q) : q
}
// After picking, mousedown.prevent keeps focus on the input, so clicking it again
// fires no `focus` event and the list wouldn't reopen. Reopen on click instead.
function onClick() {
  if (!open.value) onFocus()
}
function pick(o) {
  errMsg.value = ''
  emit('update:modelValue', o.value)
  text.value = o.label
  open.value = false
  hi.value = -1
}
// A typed value is a committable custom entry when allowCustom is on, it's non-empty, it isn't
// already an option label, and (if a validate fn is given) it passes. Keeps invalid junk out.
function customOk(q) {
  return (
    props.allowCustom &&
    !!q &&
    !norm.value.some((o) => o.label === q) &&
    (!props.validate || props.validate(q))
  )
}
function onBlur() {
  // delay so a click on an option lands first
  setTimeout(() => {
    if (!open.value) return
    open.value = false
    const q = text.value.trim()
    if (customOk(q)) {
      emit('update:modelValue', customValue(q))
    } else if (filtered.value.length === 1) {
      pick(filtered.value[0])
    } else {
      text.value = selectedLabel.value
      if (q) refuse(q)
    }
  }, 150)
}
function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!open.value) return onFocus()
    hi.value = Math.min(hi.value + 1, filtered.value.length - 1)
    scrollToHi()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    hi.value = Math.max(hi.value - 1, 0)
    scrollToHi()
  } else if (e.key === 'Enter') {
    // Enter = "select/confirm", keyboard-only (no mouse needed):
    //  1. an item is highlighted (arrowed to) → pick it
    //  2. the typed text exactly matches an option label → pick that option
    //  3. non-custom picker with matches → pick the first
    //  4. allow-custom + the typed text is valid → confirm the typed value
    // (invalid/empty custom falls through: nothing commits, the list stays open to fix)
    e.preventDefault()
    const q = text.value.trim()
    const exact = norm.value.find((o) => o.label === q)
    if (hi.value >= 0 && filtered.value[hi.value]) pick(filtered.value[hi.value])
    else if (exact) pick(exact)
    else if (filtered.value.length >= 1 && !props.allowCustom) pick(filtered.value[0])
    else if (customOk(q)) {
      emit('update:modelValue', customValue(q))
      open.value = false
    } else if (q) refuse(q)
  } else if (e.key === 'Escape') {
    open.value = false
    text.value = selectedLabel.value
    errMsg.value = ''
  }
}
const inputEl = ref(null)
onMounted(() => {
  if (props.autofocus) inputEl.value?.focus()
})
const listEl = ref(null)
function scrollToHi() {
  const el = listEl.value?.children[hi.value]
  el?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <span class="combo" :style="{ width }">
    <input
      ref="inputEl"
      v-model="text"
      role="combobox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-label="ariaLabel || placeholder || 'เลือกตัวเลือก'"
      :aria-activedescendant="hi >= 0 ? `${listId}-${hi}` : undefined"
      :aria-invalid="errMsg ? 'true' : undefined"
      :aria-describedby="errMsg ? `${listId}-err` : undefined"
      autocomplete="off"
      :placeholder="placeholder"
      @input="onInput"
      @focus="onFocus"
      @click="onClick"
      @blur="onBlur"
      @keydown="onKeydown"
    />
    <p v-if="errMsg" :id="`${listId}-err`" class="combo-err" role="alert">{{ errMsg }}</p>
    <div v-if="open && filtered.length" :id="listId" ref="listEl" class="combo-list" role="listbox">
      <div
        v-for="(o, i) in filtered"
        :id="`${listId}-${i}`"
        :key="o.value"
        role="option"
        :aria-selected="o.value === modelValue"
        :class="['combo-item', o.value === modelValue ? 'active' : '', i === hi ? 'hi' : '']"
        @mousedown.prevent="pick(o)"
      >
        {{ o.label }}
      </div>
    </div>
  </span>
</template>

<style scoped>
.combo { position: relative; display: inline-block; }
.combo input { width: 100%; }
.combo-list {
  position: absolute;
  z-index: 30;
  top: 100%;
  left: 0;
  min-width: 100%;
  max-height: 260px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.combo-err {
  position: absolute;
  z-index: 31;
  top: 100%;
  left: 0;
  margin: 2px 0 0;
  min-width: 100%;
  max-width: 260px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid var(--red, #c0392b);
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  color: var(--red, #c0392b);
  font-size: 0.82rem;
  font-weight: 400;
  line-height: 1.35;
}
.combo-item { padding: 8px 10px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.combo-item:hover, .combo-item.hi { background: var(--cream-hover); }
.combo-item.active { background: var(--cream); font-weight: 700; color: var(--brand); }
</style>
