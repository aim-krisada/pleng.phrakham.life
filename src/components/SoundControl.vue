<script setup>
// SoundControl — the single "เสียงดนตรี" dock button + its popover (B107 step 9 · P'Aim 13 ก.ค.).
// Consolidates the four sound axes (เสียงที่เล่น · การบรรเลง · เครื่องดนตรี · อารมณ์/สไตล์) that
// used to be four separate ⚙ menu items into ONE bar button that opens a small grouped popover.
// Used by BOTH docks (ฝึกร้อง = SingTransport, แก้เพลง = EditorMode) via a DockKey #cell-<id> slot,
// so the engine lays it out + clamps the .dk-pop. Presentational only — each page owns the state
// and passes the groups (value/options/onPick), so ฝึกร้อง and แก้เพลง remember independently.
import Icon from './Icon.vue'

const props = defineProps({
  // engine-provided popover state for this cell
  open: { type: Boolean, default: false },
  // one entry per axis: { key, label, icon, value, options:[{value,label,disabled?}], onPick(v) }
  groups: { type: Array, default: () => [] },
  // short text shown on the bar button (the current instrument), e.g. "เปียโน"
  summary: { type: String, default: '' },
})
const emit = defineEmits(['toggle', 'close'])

const labelOf = (g) => {
  const o = g.options.find((x) => x.value === g.value)
  return o ? o.short || o.label : ''
}
function pick(g, o) {
  if (o.disabled) return
  g.onPick?.(o.value)
}
</script>

<template>
  <button
    class="sc-trig"
    :class="{ on: open }"
    :aria-expanded="open"
    aria-label="เสียงดนตรี"
    title="เสียงดนตรี — เลือกเครื่อง เสียง และสไตล์"
    @click.stop="emit('toggle')"
  >
    <Icon name="audio-lines" :size="18" />
    <b v-if="summary" class="sc-sum">{{ summary }}</b>
  </button>

  <div v-if="open" class="dk-pop sc-pop" role="group" aria-label="เสียงดนตรี" @click.stop>
    <div class="sc-head">เสียงดนตรี</div>
    <div v-for="g in groups" :key="g.key" class="sc-grp">
      <div class="sc-glabel"><Icon v-if="g.icon" :name="g.icon" :size="14" /> {{ g.label }}</div>
      <div class="sc-opts" role="radiogroup" :aria-label="g.label">
        <button
          v-for="o in g.options"
          :key="o.value"
          class="sc-opt"
          :class="{ on: o.value === g.value, dis: o.disabled }"
          role="radio"
          :aria-checked="o.value === g.value"
          :disabled="o.disabled"
          :title="o.label"
          @click="pick(g, o)"
        >{{ o.short || o.label }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* trigger — same chip shape as the other dock buttons (icon + short current-instrument badge) */
.sc-trig {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 10px; height: var(--touch-min); min-height: 0; font: inherit; cursor: pointer; flex: 0 0 auto;
}
@media (hover: hover) { .sc-trig:hover { border-color: var(--brand); } }
.sc-trig.on { border-color: var(--brand); color: var(--brand); }
.sc-sum { font-size: 12.5px; font-weight: 700; white-space: nowrap; }

/* popover — anchors to the dock right edge like every .dk-pop (engine clamps on-screen +8px) */
.sc-pop { width: max-content; min-width: 210px; max-width: calc(100vw - 24px); padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
.sc-head { font-weight: 700; font-size: 13px; }
.sc-grp { display: flex; flex-direction: column; gap: 5px; }
.sc-grp + .sc-grp { border-top: 1px solid var(--line); padding-top: 9px; }
.sc-glabel { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--muted); }
.sc-glabel :deep(svg) { color: var(--brand); }
.sc-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.sc-opt {
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; padding: 6px 11px; font: inherit; font-size: 12.5px; cursor: pointer;
  min-height: var(--touch-min); display: inline-flex; align-items: center;
}
@media (hover: hover) { .sc-opt:not(.dis):hover { border-color: var(--brand); color: var(--brand); } }
.sc-opt.on { border-color: var(--brand); color: var(--brand); background: var(--cream); font-weight: 700; }
.sc-opt.dis { opacity: 0.4; cursor: default; }
</style>
