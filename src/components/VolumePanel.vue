<script setup>
// ใบ v3/pleng#135 — the volume panel: เสียงโน้ต + เสียงคอร์ด, a link button, and คืนค่าเริ่มต้น.
// ONE panel for both sides (พี่เอม 22 ต.ค. 2569: "สองฝั่งใช้แผงหน้าตาเดียวกันเป๊ะ") — the listener's, in the
// เสียงดนตรี popover (SoundControl), and the approver's site default, in the profile menu (ProfileTool).
// Presentational: the owner passes the value and decides what a move, a release and a reset mean.
//   update(v) — every slider step and the link button: the owner applies it at once (heard while playing)
//   commit(v) — the slider is let go: the owner may store it (the approver's side saves to the server here)
//   reset()   — คืนค่าเริ่มต้น
// The link button keeps the RATIO between the two (lib/volume.js moveVolume), never the difference.
import { watch } from 'vue'
import Icon from './Icon.vue'
import { VOL_MIN, VOL_MAX, VOL_STEP, moveVolume } from '../lib/volume.js'

const props = defineProps({
  value: { type: Object, required: true }, // { melody, chord, linked } in percent of today's sound
  // one quiet line under the sliders saying where the level comes from (e.g. "ตามค่าเริ่มต้นของเว็บ")
  note: { type: String, default: '' },
  // false = the value already IS the default, so the reset button has nothing to do
  canReset: { type: Boolean, default: true },
})
const emit = defineEmits(['update', 'commit', 'reset'])

const ROWS = [
  { key: 'melody', label: 'เสียงโน้ต', hint: 'ความดังของทำนอง' },
  { key: 'chord', label: 'เสียงคอร์ด', hint: 'ความดังของคอร์ดที่เล่นประกอบ' },
]
// The last value this panel sent, until the owner's answer comes back as `value`. A slider's `change`
// (let go) can arrive before the owner has re-rendered from the last `input`; committing `value` then
// would save the level from one step BEFORE — the approver's site default came out one step behind.
let latest = null
watch(() => props.value, () => { latest = null })
const current = () => latest || props.value
function move(which, raw) {
  latest = moveVolume(current(), which, Number(raw))
  emit('update', latest)
}
function release() {
  emit('commit', current())
}
function toggleLink() {
  latest = { ...current(), linked: !current().linked }
  emit('update', latest)
  emit('commit', latest)
}
</script>

<template>
  <div class="vp" role="group" aria-label="ระดับเสียง">
    <!-- the label WRAPS its slider (no id), so the panel can sit twice on one page — popover and profile menu -->
    <label v-for="r in ROWS" :key="r.key" class="vp-row" :title="r.hint">
      <span class="vp-label">{{ r.label }}</span>
      <input
        type="range"
        :min="VOL_MIN" :max="VOL_MAX" :step="VOL_STEP"
        :value="value[r.key]"
        :aria-valuetext="value[r.key] + ' เปอร์เซ็นต์'"
        @input="move(r.key, $event.target.value)"
        @change="release"
      />
      <span class="vp-val">{{ value[r.key] }}%</span>
    </label>
    <div class="vp-foot">
      <button
        type="button"
        class="vp-link"
        :class="{ on: value.linked }"
        :aria-pressed="value.linked"
        :title="value.linked ? 'ขยับไปด้วยกัน — กดเพื่อปรับแยก' : 'ปรับแยกกันอยู่ — กดเพื่อให้ขยับไปด้วยกัน'"
        @click="toggleLink"
      >
        <Icon :name="value.linked ? 'link' : 'unlink'" :size="15" />
        {{ value.linked ? 'ขยับไปด้วยกัน' : 'ปรับแยก' }}
      </button>
      <button type="button" class="vp-reset" :disabled="!canReset" @click="emit('reset')">คืนค่าเริ่มต้น</button>
    </div>
    <p v-if="note" class="vp-note">{{ note }}</p>
  </div>
</template>

<style scoped>
.vp { display: flex; flex-direction: column; gap: 4px; }
.vp-row { display: flex; align-items: center; gap: 9px; min-height: 36px; }
.vp-label { flex: 0 0 auto; min-width: 5.2em; font-size: 12.5px; color: var(--ink); }
.vp-row input[type="range"] { flex: 1 1 auto; min-width: 110px; accent-color: var(--brand); cursor: pointer; }
.vp-val { font-size: 12.5px; font-weight: 700; color: var(--brand); min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; }
.vp-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 2px; }
.vp-link, .vp-reset {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; padding: 4px 10px; font: inherit; font-size: 12px; min-height: 34px; cursor: pointer;
}
.vp-link.on { border-color: var(--brand); color: var(--brand); background: var(--cream); font-weight: 700; }
.vp-reset:disabled { opacity: 0.45; cursor: default; }
@media (hover: hover) {
  .vp-link:hover, .vp-reset:not(:disabled):hover { border-color: var(--brand); color: var(--brand); }
}
.vp-note { margin: 0; font-size: 11px; line-height: 1.45; color: var(--muted); }
</style>
