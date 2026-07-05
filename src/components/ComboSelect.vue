<script setup>
import { ref, computed, watch } from 'vue'

// Type-to-filter dropdown. options: [{ value, label, search? }] or plain strings.
// allowCustom lets the typed text itself become the value (e.g. custom time signature).
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '' },
  allowCustom: { type: Boolean, default: false },
  width: { type: String, default: '160px' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const text = ref('')
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

function onFocus() {
  open.value = true
  text.value = ''
}
function pick(o) {
  emit('update:modelValue', o.value)
  text.value = o.label
  open.value = false
}
function onBlur() {
  // delay so a click on an option lands first
  setTimeout(() => {
    if (!open.value) return
    open.value = false
    const q = text.value.trim()
    if (props.allowCustom && q && !norm.value.some((o) => o.label === q)) {
      emit('update:modelValue', q)
    } else if (filtered.value.length === 1) {
      pick(filtered.value[0])
    } else {
      text.value = selectedLabel.value
    }
  }, 150)
}
function onEnter() {
  if (filtered.value.length >= 1 && !props.allowCustom) pick(filtered.value[0])
  else if (props.allowCustom && text.value.trim()) {
    emit('update:modelValue', text.value.trim())
    open.value = false
  }
}
</script>

<template>
  <span class="combo" :style="{ width }">
    <input
      v-model="text"
      :placeholder="placeholder"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.enter.prevent="onEnter"
      @keydown.esc="open = false; text = selectedLabel"
    />
    <div v-if="open && filtered.length" class="combo-list">
      <div
        v-for="o in filtered"
        :key="o.value"
        :class="['combo-item', o.value === modelValue ? 'active' : '']"
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
  right: 0;
  max-height: 260px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.combo-item { padding: 7px 10px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.combo-item:hover { background: #edf2f7; }
.combo-item.active { background: #e6fffa; font-weight: 600; }
</style>
