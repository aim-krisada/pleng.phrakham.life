<script setup>
// SoundControl — the single "เสียงดนตรี" dock button + its popover (B107 step 9 · P'Aim 13 ก.ค.).
// Consolidates the four sound axes (เสียงที่เล่น · การบรรเลง · เครื่องดนตรี · อารมณ์/สไตล์) that
// used to be four separate ⚙ menu items into ONE bar button that opens a small grouped popover.
// Used by BOTH docks (ฝึกร้อง = SingTransport, แก้เพลง = EditorMode) via a DockKey #cell-<id> slot,
// so the engine lays it out + clamps the .dk-pop. Presentational only — each page owns the state
// and passes the groups (value/options/onPick), so ฝึกร้อง and แก้เพลง remember independently.
import { ref } from 'vue'
import Icon from './Icon.vue'

// "ปรับละเอียด" starts collapsed (2-layer UX: simple presets on top, advanced hidden until asked).
const advOpen = ref(false)

const props = defineProps({
  // engine-provided popover state for this cell
  open: { type: Boolean, default: false },
  // one entry per axis: { key, label, icon, value, options:[{value,label,disabled?}], onPick(v) }
  groups: { type: Array, default: () => [] },
  // the bar button is ICON-ONLY (P'Aim 13 ก.ค.): the glyph reflects the current instrument/mode
  // (piano / guitar / users(เต็มวง) / music) so no text label is needed.
  icon: { type: String, default: 'audio-lines' },
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
    <Icon :name="icon" :size="19" />
  </button>

  <div v-if="open" class="dk-pop sc-pop" role="group" aria-label="เสียงดนตรี" @click.stop>
    <div class="sc-head">เสียงดนตรี</div>
    <div v-for="g in groups" :key="g.key" class="sc-grp">
      <!-- ปรับละเอียด (ROUND 2): a collapsible panel of per-technique controls (toggle/slider/choice)
           so the listener switches each on/off to find what's the problem (P'Aim 14 ก.ค.) -->
      <template v-if="g.kind === 'advanced'">
        <button class="sc-advhead" :aria-expanded="advOpen" @click="advOpen = !advOpen">
          <Icon v-if="g.icon" :name="g.icon" :size="14" /> {{ g.label }}
          <Icon :name="advOpen ? 'chevron-up' : 'chevron-down'" :size="15" class="sc-advchev" />
        </button>
        <div v-if="advOpen" class="sc-adv">
          <div v-for="row in g.rows" :key="row.key" class="sc-row">
            <div class="sc-rowlabel" :title="row.hint">{{ row.label }}</div>
            <!-- toggle -->
            <button
              v-if="row.type === 'toggle'"
              class="sc-switch" :class="{ on: row.value }"
              role="switch" :aria-checked="row.value" :aria-label="row.label"
              @click="g.onSet(row.key, !row.value)"
            ><span class="sc-knob" /></button>
            <!-- slider (0 = off) -->
            <div v-else-if="row.type === 'slider'" class="sc-rowslider">
              <input
                type="range" :min="row.slider.min" :max="row.slider.max" :step="row.slider.step || 1"
                :value="row.value" :aria-label="row.label"
                @input="g.onSet(row.key, Number($event.target.value))"
              />
              <span class="sc-slval">{{ row.value ? row.value + '%' : 'ปิด' }}</span>
            </div>
            <!-- choice chips -->
            <div v-else class="sc-rowopts" role="radiogroup" :aria-label="row.label">
              <button
                v-for="o in row.options" :key="o.value"
                class="sc-chip" :class="{ on: o.value === row.value }"
                role="radio" :aria-checked="o.value === row.value" :title="o.label"
                @click="g.onSet(row.key, o.value)"
              >{{ o.label }}</button>
            </div>
          </div>
          <button v-if="g.canReset" class="sc-reset" @click="g.onReset()">คืนค่าเริ่มต้น</button>
        </div>
      </template>
      <template v-else>
        <div class="sc-glabel"><Icon v-if="g.icon" :name="g.icon" :size="14" /> {{ g.label }}</div>
        <!-- slider group (e.g. ประกายเสียงสูง · B107 P2 ข้อ 3): a live-tune range instead of radios -->
        <div v-if="g.kind === 'slider'" class="sc-slider">
          <input
            type="range"
            :min="g.control.min" :max="g.control.max" :step="g.control.step || 1"
            :value="g.control.value"
            :aria-label="g.label"
            @input="g.control.onInput(Number($event.target.value))"
          />
          <span class="sc-slval">{{ g.control.value }}%</span>
        </div>
        <div v-else class="sc-opts" role="radiogroup" :aria-label="g.label">
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
      </template>
    </div>
  </div>
</template>

<style scoped>
/* trigger — an ICON-ONLY square button (the glyph = the current instrument/mode · P'Aim 13 ก.ค.) */
.sc-trig {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0; width: var(--touch-min); height: var(--touch-min); min-height: 0; cursor: pointer; flex: 0 0 auto;
}
@media (hover: hover) { .sc-trig:hover { border-color: var(--brand); color: var(--brand); } }
.sc-trig.on { border-color: var(--brand); color: var(--brand); }

/* popover — an OVERLAY above the dock's right edge. CRITICAL: `.dk-pop`'s positioning lives in
   DockKey's SCOPED styles, which do NOT reach this component's element — so the full overlay CSS
   (position/anchor/background/shadow/z-index) MUST be declared here, or the panel renders in-flow
   INSIDE the dock and inflates it (P'Aim bug 13 ก.ค.: the popover overlapped the transport). We keep
   the `dk-pop` class only so DockKey's clampPops() still finds + keeps it on-screen (+8px).
   Up to 5 groups make it tall → cap by the viewport (see max-height below) so it never grows over
   the dock/sheet, yet shows every group without a scrollbar whenever the screen has the room. */
.sc-pop {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px); right: 8px; left: auto;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: 30;
  width: max-content; min-width: 210px; max-width: calc(100vw - 24px);
  /* Cap by the VIEWPORT minus the room the dock needs below (~200px covers the tallest dock + its
     bottom gutter), NOT a flat 360px. The old cap forced a scrollbar on ordinary screens and clipped
     the top "เสียงที่เล่น" heading (P'Aim 14 ก.ค.). The panel opens above the dock (bottom:100%+8px),
     so `100dvh - 200px` is the space it can grow into without overlapping the dock/sheet or spilling
     off the top (clampPops still nudges the last +8px). Normal-height screens show all 5 groups with
     NO scrollbar; only a genuinely short viewport (≈<620px tall) falls back to scrolling. */
  max-height: min(90vh, calc(100vh - 200px));   /* fallback where dvh is unsupported */
  max-height: min(90dvh, calc(100dvh - 200px));
  overflow-y: auto; overscroll-behavior: contain;
  padding: 9px 11px; display: flex; flex-direction: column; gap: 8px;
}
.sc-head { font-weight: 700; font-size: 12.5px; position: sticky; top: 0; background: #fff; padding-bottom: 2px; }
.sc-grp { display: flex; flex-direction: column; gap: 5px; }
.sc-grp + .sc-grp { border-top: 1px solid var(--line); padding-top: 7px; }
.sc-glabel { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }
.sc-glabel :deep(svg) { color: var(--brand); }
.sc-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.sc-opt {
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; padding: 5px 11px; font: inherit; font-size: 12.5px; cursor: pointer;
  min-height: 36px; display: inline-flex; align-items: center;
}
@media (hover: hover) { .sc-opt:not(.dis):hover { border-color: var(--brand); color: var(--brand); } }
.sc-opt.on { border-color: var(--brand); color: var(--brand); background: var(--cream); font-weight: 700; }
.sc-opt.dis { opacity: 0.4; cursor: default; }
/* slider group (ประกายเสียงสูง) — range fills the row, value shown to its right */
.sc-slider { display: flex; align-items: center; gap: 9px; min-height: 36px; }
.sc-slider input[type="range"] { flex: 1 1 auto; min-width: 120px; accent-color: var(--brand); cursor: pointer; }
.sc-slval { font-size: 12.5px; font-weight: 700; color: var(--brand); min-width: 34px; text-align: right; }

/* ปรับละเอียด (ROUND 2) — collapsible technique panel */
.sc-advhead {
  display: flex; align-items: center; gap: 5px; width: 100%; background: transparent; border: 0;
  color: var(--muted); font: inherit; font-size: 11px; cursor: pointer; padding: 2px 0; min-height: 30px;
}
.sc-advhead :deep(svg) { color: var(--brand); }
.sc-advchev { margin-left: auto; }
.sc-adv { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
.sc-row { display: flex; align-items: center; gap: 8px; min-height: 34px; }
.sc-rowlabel { flex: 1 1 auto; font-size: 12px; color: var(--ink); }
/* toggle switch — a PILL track + knob. `min-height/min-width` are pinned so the app-wide
   touch-target rule (min-height ~40px on buttons) can't inflate it into a 40×40 circle
   (P'Aim 14 ก.ค. "ดูเพี้ยน"). The whole row is the comfortable tap area; the pill is the state. */
.sc-switch {
  flex: 0 0 auto; box-sizing: border-box; position: relative; width: 46px; height: 26px;
  min-width: 46px; min-height: 26px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--cream); cursor: pointer; padding: 0; transition: background 0.15s, border-color 0.15s;
}
.sc-switch.on { background: var(--brand); border-color: var(--brand); }
.sc-knob {
  position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); transition: left 0.15s;
}
.sc-switch.on .sc-knob { left: 22px; }
/* per-row slider (ลูกรับส่ง) */
.sc-rowslider { flex: 0 0 auto; display: flex; align-items: center; gap: 7px; width: 132px; }
.sc-rowslider input[type="range"] { flex: 1 1 auto; min-width: 84px; accent-color: var(--brand); cursor: pointer; }
.sc-rowslider .sc-slval { min-width: 30px; font-size: 11.5px; }
/* choice chips (ลีลามือซ้าย / เบส) */
.sc-rowopts { flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; max-width: 156px; }
.sc-chip {
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 7px; padding: 4px 8px; font: inherit; font-size: 11.5px; cursor: pointer; min-height: 30px;
}
.sc-chip.on { border-color: var(--brand); color: var(--brand); background: var(--cream); font-weight: 700; }
.sc-reset {
  align-self: flex-start; margin-top: 4px; border: 1px solid var(--line); background: transparent;
  color: var(--muted); border-radius: 7px; padding: 5px 10px; font: inherit; font-size: 11.5px; cursor: pointer; min-height: 32px;
}
@media (hover: hover) { .sc-reset:hover { border-color: var(--brand); color: var(--brand); } }
</style>
