<script setup>
// TempoControl — the ฝึกร้อง dock's "ความเร็ว" cell (ใบ v3/pleng#102).
//
// Replaces the old 9-item dropdown. What changed and WHY:
//   ① ตั้งได้ทุกเลข — the old menu could only land on the nine TEMPO_MARKS, so a singer who wanted
//      84 had to accept 92. Now −/+ walks the number by TEMPO_STEP (1 · ใบ v3/pleng#143) anywhere in
//      TEMPO_MIN..TEMPO_MAX. The nine marks are still one tap away as quick-pick chips, so nothing a
//      listener could reach before got taken away.
//      ใบ#143 — no slider any more (พี่เอม: "ผมไม่ชอบแถบเลื่อน ใช้ยาก ปุ่มกด บวก ลบ ง่ายกว่า" · NN/g: a
//      slider is poor for an exact value · WCAG 2.5.7). For a big move HOLD − or +: one step at once,
//      then the number keeps walking by 1 and speeds up until you let go (พี่เอมเคาะ 2 พ.ย. 2569).
//   ② เคาะเอาจังหวะ — "เคาะตามที่ร้อง" pad: tap along with how YOU sing and the number follows.
//      The math lives in lib/tapTempo.js (pure + unit-tested). Tapping works while the song plays,
//      because every tap just sets the bpm and the page reschedules from the current note.
//   ③ เห็นตลอด — the bar button always shows the number (♩=108), so the current speed is readable
//      without opening anything (it sits on dock row 2 next to คีย์, not hidden in ⚙).
//   ④ แตะ ≤3 ครั้ง ด้วยมือเดียว — from the song page: tap the button (1) → tap + or − (2). Every
//      control here is a full 44px target and the popover needs no typing and no two-finger gesture.
//
// Presentational: the page owns `tempo` and passes value + onSet, exactly like the other dock cells.
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import { TEMPO_MARKS, TEMPO_MIN, TEMPO_MAX, TEMPO_STEP, clampTempo } from '../lib/midi.js'
import { createTapper, TAP_MIN } from '../lib/tapTempo.js'

const props = defineProps({
  open: { type: Boolean, default: false }, // engine-provided popover state for this cell
  value: { type: Number, default: 92 }, // the bpm sounding now
  songBpm: { type: Number, default: 0 }, // the song's own stored bpm (0 = none) → "ตามเพลง" chip
  // ใบ v3/pleng#103 ข้อ 1 — อัตราจังหวะของเพลง ('3/4', '6/8', …). The tap pad needs it: in a waltz
  // or a 6/8 people tap the BAR, and one bar is 3 ♩, not 1. Without it a 3/4 song read 3× too slow.
  timeSignature: { type: String, default: '' },
})
// `set` carries WHERE the change came from ('tap' | 'ui') so the page can tell a tap run apart
// from a slider drag (ใบ#103 ข้อ 2 — a tap must not restart the song on every tap).
const emit = defineEmits(['toggle', 'set'])

const bpm = computed(() => clampTempo(props.value))
const atMin = computed(() => bpm.value <= TEMPO_MIN)
const atMax = computed(() => bpm.value >= TEMPO_MAX)
const isSongBpm = computed(() => !!props.songBpm && bpm.value === clampTempo(props.songBpm))

function set(n, src = 'ui') {
  const v = clampTempo(n)
  if (v !== bpm.value) emit('set', v, src)
}
function step(d) { set(bpm.value + d * TEMPO_STEP) }

// ---------- กดค้าง = เลขวิ่งเอง และเร็วขึ้นเรื่อย ๆ (ใบ#143 Notes ข้อ 2) ----------
// pointerdown steps once right away (a plain tap = exactly one step), then after HOLD_DELAY the number
// keeps walking by 1; each tick comes sooner (HOLD_TICKS), so 92 → 140 is a ~3 s hold, not 48 taps.
// It stops on release, on leaving the button, on a cancelled touch, or at the end of the window.
// The click that follows a pointer press is swallowed (it already stepped); a keyboard Enter/Space
// arrives as a click with no pointer before it, so it still steps once.
const HOLD_DELAY = 400
const HOLD_TICKS = [150, 150, 150, 100, 100, 100, 100, 70, 70, 70, 70, 45] // then 45 ms each
let holdTimer = null
let holdDir = 0
let holdN = 0
let fromPointer = false
function stopHold() {
  clearTimeout(holdTimer)
  holdTimer = null
  holdDir = 0
}
function tick() {
  if (!holdDir) return
  const next = clampTempo(bpm.value + holdDir * TEMPO_STEP)
  if (next === bpm.value) return stopHold()
  set(next)
  // reached the end of the window: stop here — the button turns disabled and may never see pointerup
  if (next <= TEMPO_MIN || next >= TEMPO_MAX) return stopHold()
  holdTimer = setTimeout(tick, HOLD_TICKS[Math.min(holdN++, HOLD_TICKS.length - 1)])
}
function holdStart(d, e) {
  if (e && e.button != null && e.button !== 0) return // right / middle button: not a press
  fromPointer = true
  stopHold()
  step(d)
  holdDir = d
  holdN = 0
  holdTimer = setTimeout(tick, HOLD_DELAY)
}
function onStepClick(d) {
  if (fromPointer) { fromPointer = false; return }
  step(d)
}
watch(() => props.open, (o) => { if (!o) stopHold() })
onBeforeUnmount(stopHold)

// ---------- quick-pick chips: ตามเพลง + the classic marks (every old menu value survives) ----------
const MARK_SHORT = { 40: 'Grave', 50: 'Largo', 60: 'Larghetto', 70: 'Adagio', 92: 'Andante', 110: 'Moderato', 130: 'Allegro', 150: 'Vivace', 180: 'Presto' }
const chips = computed(() => {
  const out = []
  if (props.songBpm) out.push({ value: clampTempo(props.songBpm), name: 'ตามเพลง' })
  for (const m of TEMPO_MARKS) {
    if (out.some((c) => c.value === m.value)) continue
    out.push({ value: m.value, name: MARK_SHORT[m.value] || '' })
  }
  return out
})

// ---------- เคาะตามจังหวะ (tap tempo) ----------
const tapper = createTapper()
const tapState = ref({ ok: false, bpm: null, taps: 0, reason: 'few' })
const tapFlash = ref(false)
let flashTimer = null

function onTap() {
  const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
  // the song's อัตราจังหวะ + its stored speed go in with every tap: together they say whether one
  // tap means one beat or one whole bar (ใบ#103 ข้อ 1)
  const r = tapper.tap(now, { timeSignature: props.timeSignature, nearBpm: props.songBpm })
  tapState.value = r
  // the pad blinks on every tap so you can see your own beat land (useful while the song plays)
  tapFlash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { tapFlash.value = false }, 110)
  // ⚠ A bad run must NOT quietly move the number. Only a confident reading is applied; เคาะมั่ว /
  // เคาะไม่ครบ leaves the bpm alone and the line below says what to do.
  if (r.ok && r.bpm != null) set(r.bpm, 'tap')
}
function resetTaps() {
  tapper.reset()
  tapState.value = { ok: false, bpm: null, taps: 0, reason: 'few' }
}
// closing the popover forgets the run, so the next session starts clean
watch(() => props.open, (o) => { if (!o) resetTaps() })

const tapHint = computed(() => {
  const s = tapState.value
  // when a tap was read as a whole BAR we say so, so the singer can see the web understood
  // the waltz/6-8 the way they are counting it
  if (s.ok) return `ได้ ♩=${s.bpm} แล้ว${s.perBar ? ' (นับ 1 เคาะ = 1 ห้อง)' : ''} — เคาะต่อได้เพื่อให้แม่นขึ้น`
  if (s.reason === 'uneven') return 'เคาะไม่สม่ำเสมอ — เริ่มเคาะใหม่อีกครั้ง'
  if (s.reason === 'range') return 'เร็วหรือช้าเกินกว่าจะร้องตามได้ — เริ่มเคาะใหม่'
  const left = Math.max(1, TAP_MIN - s.taps)
  return s.taps ? `เคาะอีก ${left} ครั้ง` : `แตะตามจังหวะที่ร้อง อย่างน้อย ${TAP_MIN} ครั้ง`
})
const tapBad = computed(() => !tapState.value.ok && (tapState.value.reason === 'uneven' || tapState.value.reason === 'range'))
</script>

<template>
  <!-- bar cell — the number is ALWAYS on show (ข้อ 4 "เห็นตลอดว่าตอนนี้ความเร็วเท่าไร") -->
  <button
    class="tc-trig"
    :class="{ on: open }"
    :aria-expanded="open"
    :aria-label="`ความเร็ว ${bpm} ต่อนาที — แตะเพื่อปรับ`"
    title="ความเร็ว — ปรับ หรือเคาะตามจังหวะที่ร้อง"
    @click.stop="emit('toggle')"
  >
    <Icon name="gauge" :size="17" /><b class="tc-num">{{ bpm }}</b>
  </button>

  <div v-if="open" class="dk-pop tc-pop" role="group" aria-label="ความเร็ว" @click.stop>
    <div class="tc-head">ความเร็ว</div>

    <!-- ① ลด / เพิ่ม — one tap = 1, hold = keeps walking faster · 44px targets, reachable with a thumb -->
    <div class="tc-main">
      <button
        class="tc-step" :disabled="atMin" aria-label="ช้าลง"
        @pointerdown="holdStart(-1, $event)" @pointerup="stopHold" @pointerleave="stopHold" @pointercancel="stopHold"
        @click="onStepClick(-1)" @contextmenu.prevent
      ><Icon name="minus" :size="22" /></button>
      <div class="tc-read" aria-live="polite">
        <b class="tc-big">{{ bpm }}</b>
        <span class="tc-unit">ครั้ง/นาที</span>
      </div>
      <button
        class="tc-step" :disabled="atMax" aria-label="เร็วขึ้น"
        @pointerdown="holdStart(1, $event)" @pointerup="stopHold" @pointerleave="stopHold" @pointercancel="stopHold"
        @click="onStepClick(1)" @contextmenu.prevent
      ><Icon name="plus" :size="22" /></button>
    </div>

    <!-- ② เคาะตามจังหวะที่ร้องจริง -->
    <button
      class="tc-tap"
      :class="{ hit: tapFlash }"
      aria-label="เคาะตามจังหวะ"
      @click.stop="onTap"
    >เคาะตามจังหวะ</button>
    <div class="tc-taprow">
      <span class="tc-taphint" :class="{ bad: tapBad }" aria-live="polite">{{ tapHint }}</span>
      <button v-if="tapState.taps" class="tc-tapreset" aria-label="เริ่มเคาะใหม่" @click.stop="resetTaps"><Icon name="undo-2" :size="14" /></button>
    </div>

    <!-- ③ ค่าที่เลือกได้เร็ว ๆ — ของเดิมทุกค่ายังอยู่ครบ -->
    <div class="tc-chips">
      <button
        v-for="c in chips"
        :key="c.value"
        class="tc-chip"
        :class="{ on: bpm === c.value, song: c.name === 'ตามเพลง' && isSongBpm }"
        :aria-pressed="bpm === c.value"
        @click="set(c.value)"
      >{{ c.value }}<i v-if="c.name">{{ c.name }}</i></button>
    </div>
  </div>
</template>

<style scoped>
/* ----- bar cell ----- */
.tc-trig {
  display: inline-flex; align-items: center; gap: 4px;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 8px; height: var(--touch-min); min-height: 0; font: inherit; cursor: pointer; flex: 0 0 auto;
}
@media (hover: hover) { .tc-trig:hover { border-color: var(--brand); } }
.tc-trig.on { border-color: var(--brand); color: var(--brand); }
.tc-num { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }

/* ----- popover (anchored to the dock's right edge, like every other dock popup) ----- */
.tc-pop {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px); right: 8px; left: auto;
  width: 268px; max-width: calc(100vw - 24px);
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: 30; padding: 12px;
}
.tc-head { font-size: 12px; color: var(--muted); margin-bottom: 8px; }

/* ----- − [ 108 ] + ----- */
.tc-main { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tc-step {
  flex: 0 0 auto; width: 52px; height: 48px; min-height: 0; padding: 0;
  border: 1px solid var(--line); border-radius: 12px; background: transparent; color: var(--ink);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
  /* a long press must hold the number, not select text or pop the phone's press menu */
  touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
@media (hover: hover) { .tc-step:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); } }
.tc-step:disabled { opacity: 0.35; cursor: default; }
.tc-read { flex: 1 1 auto; text-align: center; line-height: 1.1; }
.tc-big { font-size: 28px; font-weight: 800; color: var(--brand); font-variant-numeric: tabular-nums; }
.tc-unit { display: block; font-size: 11px; color: var(--muted); }


/* ----- tap pad ----- */
.tc-tap {
  width: 100%; height: 52px; min-height: 0; margin-top: 6px;
  border: 1.5px dashed var(--brand); border-radius: 12px; background: transparent; color: var(--brand);
  font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; touch-action: manipulation;
}
.tc-tap.hit { background: var(--cream); }
.tc-taprow { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.tc-taphint { flex: 1 1 auto; font-size: 11px; color: var(--muted); }
.tc-taphint.bad { color: var(--red, #b3261e); font-weight: 600; }
.tc-tapreset {
  flex: 0 0 auto; width: 32px; height: 32px; min-height: 0; padding: 0;
  border: 1px solid var(--line); border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}

/* ----- quick-pick chips ----- */
.tc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.tc-chip {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: 46px; min-height: var(--touch-min); padding: 2px 7px;
  border: 1px solid var(--line); border-radius: 9px; background: transparent; color: var(--ink);
  font: inherit; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; cursor: pointer; line-height: 1.15;
}
.tc-chip i { font-style: normal; font-size: 9px; font-weight: 400; color: var(--muted); }
@media (hover: hover) { .tc-chip:hover { border-color: var(--brand); } }
.tc-chip.on { border-color: var(--brand); color: var(--brand); background: var(--cream); }
.tc-chip.on i { color: var(--brand); }
</style>
