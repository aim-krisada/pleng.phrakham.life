<script setup>
// TempoControl — the ฝึกร้อง dock's "ความเร็ว" cell (ใบ v3/pleng#102).
//
// Replaces the old 9-item dropdown. What changed and WHY:
//   ① ตั้งได้ทุกเลข — the old menu could only land on the nine TEMPO_MARKS, so a singer who wanted
//      84 had to accept 92. Now −/+ walks the number by TEMPO_STEP and a slider covers the whole
//      TEMPO_MIN..TEMPO_MAX window. The nine marks are still one tap away as quick-pick chips, so
//      nothing a listener could reach before got taken away.
//   ② เคาะเอาจังหวะ — "เคาะตามที่ร้อง" pad: tap along with how YOU sing and the number follows.
//      The math lives in lib/tapTempo.js (pure + unit-tested). Tapping works while the song plays,
//      because every tap just sets the bpm and the page reschedules from the current note.
//   ③ เห็นตลอด — the bar button always shows the number (♩=108), so the current speed is readable
//      without opening anything (it sits on dock row 2 next to คีย์, not hidden in ⚙).
//   ④ แตะ ≤3 ครั้ง ด้วยมือเดียว — from the song page: tap the button (1) → tap + or − (2). Every
//      control here is a full 44px target and the popover needs no typing and no two-finger gesture.
//
// Presentational: the page owns `tempo` and passes value + onSet, exactly like the other dock cells.
import { ref, computed, watch } from 'vue'
import Icon from './Icon.vue'
import { TEMPO_MARKS, TEMPO_MIN, TEMPO_MAX, TEMPO_STEP, clampTempo } from '../lib/midi.js'
import { createTapper, TAP_MIN } from '../lib/tapTempo.js'

const props = defineProps({
  open: { type: Boolean, default: false }, // engine-provided popover state for this cell
  value: { type: Number, default: 92 }, // the bpm sounding now
  songBpm: { type: Number, default: 0 }, // the song's own stored bpm (0 = none) → "ตามเพลง" chip
})
const emit = defineEmits(['toggle', 'set'])

const bpm = computed(() => clampTempo(props.value))
const atMin = computed(() => bpm.value <= TEMPO_MIN)
const atMax = computed(() => bpm.value >= TEMPO_MAX)
const isSongBpm = computed(() => !!props.songBpm && bpm.value === clampTempo(props.songBpm))

function set(n) {
  const v = clampTempo(n)
  if (v !== bpm.value) emit('set', v)
}
function step(d) { set(bpm.value + d * TEMPO_STEP) }

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
  const r = tapper.tap(now)
  tapState.value = r
  // the pad blinks on every tap so you can see your own beat land (useful while the song plays)
  tapFlash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { tapFlash.value = false }, 110)
  // ⚠ A bad run must NOT quietly move the number. Only a confident reading is applied; เคาะมั่ว /
  // เคาะไม่ครบ leaves the bpm alone and the line below says what to do.
  if (r.ok && r.bpm != null) set(r.bpm)
}
function resetTaps() {
  tapper.reset()
  tapState.value = { ok: false, bpm: null, taps: 0, reason: 'few' }
}
// closing the popover forgets the run, so the next session starts clean
watch(() => props.open, (o) => { if (!o) resetTaps() })

const tapHint = computed(() => {
  const s = tapState.value
  if (s.ok) return `ได้ ♩=${s.bpm} แล้ว — เคาะต่อได้เพื่อให้แม่นขึ้น`
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

    <!-- ① ลด / เพิ่ม — one tap each, 44px targets, reachable with a thumb -->
    <div class="tc-main">
      <button class="tc-step" :disabled="atMin" aria-label="ช้าลง" @click="step(-1)"><Icon name="minus" :size="22" /></button>
      <div class="tc-read" aria-live="polite">
        <b class="tc-big">{{ bpm }}</b>
        <span class="tc-unit">ครั้ง/นาที</span>
      </div>
      <button class="tc-step" :disabled="atMax" aria-label="เร็วขึ้น" @click="step(1)"><Icon name="plus" :size="22" /></button>
    </div>

    <!-- slider = จับลากทีเดียวถึงเลขไหนก็ได้ ในช่วงที่ร้องกันจริง -->
    <input
      class="tc-slider"
      type="range"
      :min="TEMPO_MIN"
      :max="TEMPO_MAX"
      step="1"
      :value="bpm"
      aria-label="เลื่อนปรับความเร็ว"
      @input="set(+$event.target.value)"
    />

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
}
@media (hover: hover) { .tc-step:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); } }
.tc-step:disabled { opacity: 0.35; cursor: default; }
.tc-read { flex: 1 1 auto; text-align: center; line-height: 1.1; }
.tc-big { font-size: 28px; font-weight: 800; color: var(--brand); font-variant-numeric: tabular-nums; }
.tc-unit { display: block; font-size: 11px; color: var(--muted); }

.tc-slider { width: 100%; margin: 10px 0 2px; accent-color: var(--brand); height: var(--touch-min); }

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
