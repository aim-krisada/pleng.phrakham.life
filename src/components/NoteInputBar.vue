<script setup>
// The contextual toolbar of SPECIAL controls — only the things the device keyboard can't type
// (octave dots, ♯ ♭, แทรก/ทับ), plus arrow keys on mobile (on-screen keyboards have no arrows).
// Digits + Thai text come from the native keyboard (see SongViewer's capture input). Two forms,
// chosen by viewport width (never hover/pointer — a touch laptop reports coarse with a mouse):
//   • variant "popup" (desktop) — floats by the selected note; fades while typing.
//   • variant "bar" (mobile) — a keyboard-accessory that rides ABOVE the on-screen keyboard
//     (positioned via visualViewport) and adds the ← ↑ ↓ → keys.
// Buttons use @mousedown.prevent so tapping one never blurs the capture input → the keyboard
// stays open on a phone.
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Icon from './Icon.vue'
import { isValidChord } from '../lib/chords.js'
import { readHints } from '../lib/keyHints.js'

const props = defineProps({
  variant: { type: String, default: 'bar' }, // 'bar' | 'popup'
  layer: { type: String, default: 'note' }, // 'note' | 'word' — which controls to show
  anchor: { type: Object, default: null }, // selected-cell rect {top,bottom,left,width} (popup)
  dimmed: { type: Boolean, default: false }, // fade + click-through while typing (popup)
  mode: { type: String, default: 'overwrite' }, // 'insert' | 'overwrite' — the แทรก/ทับ state
  chords: { type: Array, default: () => [] }, // [{value,label}] for the key ('' = ไม่มีคอร์ด)
  hintNonce: { type: Number, default: 0 }, // bumped by the host when a new key position is learned
})
const emit = defineEmits(['octave', 'accidental', 'toggle-mode', 'nav', 'chord', 'symbol'])
const helpOpen = ref(false)

// ---- the symbol keys (DS note-symbol-set §4.1 / G17) ------------------------------------
// The 12 characters the inline editor accepts. พี่เปา types happily but cannot FIND the
// characters ("^ ไม่รู้อยู่ตรงไหนใน keyboard"), so each button is a key-equivalent label in the
// Apple-HIG sense: line 1 IS the character it types (here the shortcut and the result are the
// same thing), line 2 names it in Thai, line 3 shows where that key lives — measured on this
// machine, never a guessed table, and omitted whenever we are not certain (lib/keyHints.js).
// ⛔ No tooltip/hover anywhere: this laptop reports hover:none with a mouse attached.
// ⛔ ',' and '!' are absent on purpose — the parser gives them no meaning yet.
const SYMBOL_GROUPS = [
  {
    name: 'ความยาว',
    keys: [
      { ch: '_', th: 'เขบ็ต' },
      { ch: '.', th: 'จุดเพิ่ม' },
      { ch: '-', th: 'ลากเสียง' },
      { ch: '~', th: 'โยงเสียง' },
      { ch: '^', th: 'ยืดเสียง' },
    ],
  },
  {
    name: 'เสียง',
    keys: [
      { ch: 'n', th: 'เนเชอรัล' },
      { ch: "'", th: 'สูงหนึ่งช่วง' },
    ],
  },
  {
    name: 'กลุ่ม/ห้อง',
    keys: [
      { ch: '(', th: 'เอื้อน เปิด' },
      { ch: ')', th: 'เอื้อน ปิด' },
      { ch: '{', th: 'สามพยางค์ เปิด' },
      { ch: '}', th: 'สามพยางค์ ปิด' },
      { ch: '|', th: 'กั้นห้อง' },
    ],
  },
]
// char → "⇧ + 6" style label, filled in as the user actually types each character
const keyHints = ref(readHints())
function refreshHints() { keyHints.value = readHints() }
const chordOpen = ref(false)
function pickChord(v) { chordOpen.value = false; chordText.value = ''; chordBad.value = false; emit('chord', v) }
// Free text beside the quick-pick: the quick-pick only lists the key's common chords, but worship
// music also uses maj7, m7b5, sus2/4, add9, slash bass (G/B), °/+ … Anything `isValidChord` accepts
// (lib/chords.js — the same gate the grid editor's chord cell uses) commits on Enter/✓; junk is
// refused in place so a typo never lands in the song.
const chordText = ref('')
const chordBad = ref(false)
function commitChordText() {
  const q = chordText.value.trim()
  if (!q) return
  if (!isValidChord(q)) { chordBad.value = true; return }
  pickChord(q)
}
// which controls to show: arrows on mobile only; note ops only on the note layer; accidentals
// only on mobile (desktop types # / b). The (i) keyboard help shows on the desktop popup.


// ---- popup positioning (desktop): float above the note's line, else below; clamp on-screen ----
const rootEl = ref(null)
const pos = ref({ top: 0, left: 0 })
function place() {
  if (props.variant !== 'popup' || !props.anchor || !rootEl.value) return
  const el = rootEl.value
  const w = el.offsetWidth || 240
  const h = el.offsetHeight || 48
  const a = props.anchor
  const gap = 10
  // don't let the popup slide under the sticky app header — flip below the note when there's
  // no room to clear it (P'Aim: "ไม่อยากให้ popup โดนบัง").
  const bar = document.querySelector('.shell-bar')
  const topMin = (bar ? bar.getBoundingClientRect().bottom : 0) + 6
  let top = a.top - h - gap
  if (top < topMin) top = a.bottom + gap // no room above the header → go below the note
  if (top + h > window.innerHeight - 6) top = Math.max(topMin, window.innerHeight - h - 6)
  let left = a.left + a.width / 2 - w / 2
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
  pos.value = { top: Math.round(top), left: Math.round(left) }
}
// ---- drag (desktop popup): a grip lets you nudge the popup out of the way. The offset
// persists (added on top of the auto-anchored position) so it stays where you put it. ----
const dragDx = ref(0)
const dragDy = ref(0)
let dragStart = null
function onGripDown(e) {
  dragStart = { x: e.clientX, y: e.clientY, dx: dragDx.value, dy: dragDy.value }
  window.addEventListener('pointermove', onGripMove)
  window.addEventListener('pointerup', onGripUp)
}
function onGripMove(e) {
  if (!dragStart) return
  dragDx.value = dragStart.dx + (e.clientX - dragStart.x)
  dragDy.value = dragStart.dy + (e.clientY - dragStart.y)
}
function onGripUp() {
  dragStart = null
  window.removeEventListener('pointermove', onGripMove)
  window.removeEventListener('pointerup', onGripUp)
}
// ---- keyboard-accessory positioning (mobile): sit just above the on-screen keyboard ----
const kbInset = ref(0)
function onVV() {
  const vv = window.visualViewport
  kbInset.value = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0
}
// a newly learned key position must appear on its button straight away
watch(() => props.hintNonce, () => { refreshHints(); nextTick(place) })
watch(() => props.anchor, () => nextTick(place), { deep: true })
watch(() => props.variant, () => nextTick(place))
// opening/closing the chord picker or the (i) help changes the popup's HEIGHT, and place()
// clamps against the header + the viewport bottom using that height — so re-place after both.
watch([chordOpen, helpOpen], () => nextTick(place))
onMounted(() => {
  nextTick(place)
  window.addEventListener('resize', place)
  // The popup is position:fixed but anchored to a note in the FLOW, so every scroll moves the
  // note out from under it. Without this it kept its old viewport position and drifted into the
  // sticky header band (P'Aim 23 ก.ค.: "ป๊อปอัปไปอยู่หลังเมนูบน"). Re-placing keeps it glued to
  // the note and, when there's no room, parked just BELOW the header instead of behind it.
  // capture:true so it also fires for scrolls inside any scrolling ancestor.
  window.addEventListener('scroll', place, { capture: true, passive: true })
  const vv = window.visualViewport
  if (vv) { vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV); onVV() }
})
onUnmounted(() => {
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', place, { capture: true })
  window.removeEventListener('pointermove', onGripMove)
  window.removeEventListener('pointerup', onGripUp)
  const vv = window.visualViewport
  if (vv) { vv.removeEventListener('resize', onVV); vv.removeEventListener('scroll', onVV) }
})
</script>

<template>
  <div
    ref="rootEl"
    class="nib no-print"
    :class="[variant === 'popup' ? 'nib-pop' : 'nib-bar', { dimmed: variant === 'popup' && dimmed }]"
    :style="variant === 'popup' ? { top: (pos.top + dragDy) + 'px', left: (pos.left + dragDx) + 'px' } : { bottom: kbInset + 'px' }"
    role="toolbar"
    aria-label="เครื่องมือแก้โน้ต"
    @mousedown.prevent
  >
    <div class="nib-scroll">
      <!-- drag grip (desktop popup) — nudge the toolbar out of the way -->
      <button v-if="variant === 'popup'" class="nib-key nib-grip" aria-label="ลากย้ายแถบ" title="ลากเพื่อย้าย" @pointerdown="onGripDown"><Icon name="grip-vertical" :size="16" /></button>
      <!-- arrows — mobile only (on-screen keyboards have none; desktop uses the physical keys) -->
      <template v-if="variant === 'bar'">
        <button class="nib-key nib-nav" aria-label="ซ้าย" title="ซ้าย" @click="emit('nav', 'left')">←</button>
        <button class="nib-key nib-nav" aria-label="ขึ้น" title="ขึ้น" @click="emit('nav', 'up')">↑</button>
        <button class="nib-key nib-nav" aria-label="ลง" title="ลง" @click="emit('nav', 'down')">↓</button>
        <button class="nib-key nib-nav" aria-label="ขวา" title="ขวา" @click="emit('nav', 'right')">→</button>
        <span v-if="layer === 'note'" class="nib-sep" aria-hidden="true"></span>
      </template>

      <!-- note ops (octave has no keyboard key → button on both; accidentals only on mobile,
           desktop types # / b; toggle also a status indicator). Hidden on the word layer. -->
      <template v-if="layer === 'note'">
        <button class="nib-key" title="สูงขึ้นหนึ่งช่วง (จุดบนโน้ต)" aria-label="สูงขึ้นหนึ่งช่วง" @click="emit('octave', 1)"><b>สูง</b> ↑</button>
        <button class="nib-key" title="ต่ำลงหนึ่งช่วง (จุดล่างโน้ต)" aria-label="ต่ำลงหนึ่งช่วง" @click="emit('octave', -1)"><b>ต่ำ</b> ↓</button>
        <template v-if="variant === 'bar'">
          <button class="nib-key nib-acc" title="ครึ่งเสียงขึ้น (ชาร์ป)" aria-label="ชาร์ป" @click="emit('accidental', '#')">♯</button>
          <button class="nib-key nib-acc" title="ครึ่งเสียงลง (แฟลต)" aria-label="แฟลต" @click="emit('accidental', 'b')">♭</button>
        </template>
        <button class="nib-key nib-chord" :class="{ on: chordOpen }" :aria-expanded="chordOpen" title="ใส่/เปลี่ยน/ลบคอร์ด" aria-label="คอร์ด" @click="chordOpen = !chordOpen">คอร์ด ▾</button>
        <button
          class="nib-key nib-mode" :class="{ ins: mode === 'insert' }"
          :aria-label="mode === 'insert' ? 'โหมดแทรก (แตะเปลี่ยนเป็นทับ)' : 'โหมดทับ (แตะเปลี่ยนเป็นแทรก)'"
          :title="mode === 'insert' ? 'แทรก — พิมพ์แล้วเพิ่มโน้ต ดันตัวอื่นไปขวา' : 'ทับ — พิมพ์แล้วเปลี่ยนเฉพาะโน้ตที่เลือก'"
          @click="emit('toggle-mode')"
        >{{ mode === 'insert' ? 'แทรก' : 'ทับ' }}</button>
      </template>

      <!-- (i) keyboard help — desktop popup: which keys do what (things with no button) -->
      <button v-if="variant === 'popup'" class="nib-key nib-help" :class="{ on: helpOpen }" :aria-expanded="helpOpen" aria-label="คีย์ลัดคีย์บอร์ด" title="คีย์ลัดคีย์บอร์ด" @click="helpOpen = !helpOpen"><Icon name="info" :size="18" /></button>
    </div>

    <!-- the symbol keys — grouped so 12 buttons read in about a second, and every button states
         its own character + Thai name (+ the physical key, once this machine has told us). -->
    <div v-if="layer === 'note'" class="nib-syms" role="group" aria-label="สัญลักษณ์โน้ต">
      <div v-for="g in SYMBOL_GROUPS" :key="g.name" class="nib-symgroup">
        <span class="nib-symlabel" aria-hidden="true">{{ g.name }}</span>
        <div class="nib-symrow">
          <button
            v-for="k in g.keys"
            :key="k.ch"
            class="nib-sym"
            :aria-label="`${k.th} (พิมพ์ ${k.ch})`"
            @click="emit('symbol', k.ch)"
          >
            <span class="nib-symch">{{ k.ch }}</span>
            <span class="nib-symth">{{ k.th }}</span>
            <span v-if="keyHints[k.ch]" class="nib-symkey">{{ keyHints[k.ch] }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="chordOpen" class="nib-chordbox" aria-label="เลือกคอร์ด">
      <!-- type-your-own: the quick-pick below is a shortcut, not the vocabulary limit -->
      <div class="nib-chordtype">
        <input
          v-model="chordText"
          class="nib-chordinput"
          :class="{ bad: chordBad }"
          type="text"
          inputmode="text"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="พิมพ์คอร์ดเอง เช่น F#m7b5, G/B"
          aria-label="พิมพ์คอร์ดเอง"
          :aria-invalid="chordBad"
          @mousedown.stop
          @touchstart.stop
          @input="chordBad = false"
          @keydown.enter.prevent="commitChordText"
        />
        <button class="nib-chordok" title="ใส่คอร์ดที่พิมพ์" aria-label="ใส่คอร์ดที่พิมพ์" @click="commitChordText">✓</button>
      </div>
      <div v-if="chordBad" class="nib-chorderr" role="alert">ไม่ใช่คอร์ดที่อ่านได้ — ต้องขึ้นต้นด้วย A–G (เช่น Bb, C#m7, G/B)</div>
      <div class="nib-chordlist" role="listbox" aria-label="คอร์ดที่ใช้บ่อย">
        <button v-for="c in chords" :key="c.value" class="nib-chorditem" :class="{ none: c.value === '' }" @click="pickChord(c.value)">{{ c.value === '' ? '— ไม่มีคอร์ด —' : c.value }}</button>
      </div>
    </div>
    <div v-if="variant === 'popup' && helpOpen" class="nib-helpbox" role="note">
      <b>คีย์บอร์ด (โหมดแก้):</b><br />
      <b>1–7</b> = โน้ต · <b>#</b> = ชาร์ป · <b>b</b> = แฟลต<br />
      <b>← → ↑ ↓</b> = เลื่อน · <b>Ctrl+← → / ↑ ↓</b> = ข้ามห้อง/บรรทัด<br />
      <b>Insert</b> = สลับแทรก/ทับ · <b>Delete</b> = ลบอยู่กับที่ · <b>Backspace</b> = เอาออกทั้งช่อง
    </div>
  </div>
</template>

<style scoped>
.nib {
  background: var(--surface, #fff);
  border: 1px solid var(--line, #d9d0c4);
  box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.12);
  /* ABOVE the sticky app header (--z-nav): this toolbar is anchored to the selected note and
     follows the page as it scrolls, so it WILL reach the header band. At --z-nav-minus it
     disappeared behind the top menu and its คอร์ด ▾ picker was unclickable (P'Aim 23 ก.ค.). */
  z-index: var(--z-popover);
}
/* mobile — keyboard-accessory pinned to the bottom (bottom offset = keyboard height, inline) */
.nib-bar {
  position: fixed;
  left: 0;
  right: 0;
  border-left: none;
  border-right: none;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
}
/* desktop — a small floating popup by the selected note (top/left inline) */
.nib-pop {
  position: fixed;
  width: max-content;
  max-width: calc(100vw - 16px);
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.22);
  padding: 6px;
  transition: opacity 0.15s ease;
}
.nib-pop.dimmed { opacity: 0.12; pointer-events: none; }
.nib-scroll {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.nib-key {
  flex: 0 0 auto;
  min-width: var(--touch-min, 44px);
  height: var(--touch-min, 44px);
  padding: 0 10px;
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 10px;
  background: var(--cream, #faf6ef);
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  white-space: nowrap;
}
.nib-key:active { transform: translateY(1px); }
.nib-key:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.nib-key b { font-size: 12px; font-weight: 700; }
.nib-nav { font-size: 20px; font-weight: 700; min-width: 40px; }
.nib-acc { font-size: 20px; }
.nib-mode {
  font-size: 13px; font-weight: 700;
  border-color: var(--brand, #8b4513); color: var(--brand, #8b4513);
}
.nib-mode.ins { background: var(--brand, #8b4513); color: #fff; }
.nib-sep { flex: 0 0 auto; width: 1px; align-self: stretch; background: var(--line, #d9d0c4); margin: 4px 2px; }
/* ---- symbol keys (DS §4.1) ------------------------------------------------------------
   Grouped with a small caption per group so a dozen buttons stay scannable, and WRAPPING
   rather than one long row — the bar was already 543px wide on a 412px phone (Tester), so
   adding keys in a single line would have made that worse. Each key is a 3-line stack:
   character (the answer) · Thai name · where that key is (only once measured). */
.nib-syms { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.nib-symgroup { display: flex; align-items: flex-start; gap: 6px; }
.nib-symlabel {
  flex: 0 0 auto;
  min-width: 52px;
  padding-top: 10px;
  font-size: 11px;
  color: var(--muted, #64748b);
}
.nib-symrow { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.nib-sym {
  flex: 0 0 auto;
  min-width: 52px;
  min-height: var(--touch-min, 44px);
  padding: 3px 6px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 8px;
  background: var(--cream, #faf6ef);
  color: var(--ink, #0f172a);
  font: inherit;
  cursor: pointer;
}
.nib-sym:active { transform: translateY(1px); }
.nib-sym:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
/* the character line is the ANSWER, so it must be legible on its own: a monospace face with a
   fixed box keeps '_' and '.' — which otherwise sit on the baseline as near-invisible specks —
   the same visual weight as '(' or '^'. */
.nib-symch {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  min-height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nib-symth { font-size: 10px; line-height: 1.2; color: var(--muted, #64748b); white-space: nowrap; }
/* the key equivalent — pinned to the button, never a tooltip (hover does not exist here) */
.nib-symkey {
  font-size: 10px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--brand, #8b4513);
  white-space: nowrap;
}
/* (i) keyboard help — the standard blue info affordance (matches phrakham) */
.nib-help { min-width: 36px; padding: 0 6px; color: #2563eb; border-color: #bfdbfe; background: #eff6ff; }
.nib-help.on { background: #2563eb; color: #fff; border-color: #2563eb; }
/* drag grip */
.nib-grip { min-width: 28px; padding: 0 4px; color: var(--muted, #64748b); cursor: grab; touch-action: none; }
.nib-grip:active { cursor: grabbing; }
/* chord button + picker */
.nib-chord { font-size: 13px; font-weight: 700; }
.nib-chord.on { background: var(--brand, #8b4513); color: #fff; border-color: var(--brand, #8b4513); }
.nib-chordbox {
  margin-top: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
  background: var(--cream, #faf6ef);
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 8px;
}
/* type-your-own row — stays put while the quick-pick list below scrolls */
.nib-chordtype { display: flex; gap: 4px; }
.nib-chordinput {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 34px;
  padding: 0 8px;
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 6px;
  background: #fff;
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: 13px;
}
.nib-chordinput:focus { outline: 2px solid var(--brand, #8b4513); outline-offset: -1px; }
.nib-chordinput.bad { border-color: #b91c1c; }
.nib-chordok {
  min-width: 34px;
  min-height: 34px;
  border: 1px solid var(--brand, #8b4513);
  border-radius: 6px;
  background: var(--brand, #8b4513);
  color: #fff;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}
.nib-chorderr { font-size: 12px; line-height: 1.5; color: #b91c1c; }
.nib-chordlist {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 176px;
  overflow-y: auto;
}
.nib-chorditem {
  min-width: 40px;
  min-height: 34px;
  padding: 0 8px;
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 6px;
  background: #fff;
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.nib-chorditem:hover { border-color: var(--brand, #8b4513); color: var(--brand, #8b4513); }
.nib-chorditem.none { flex: 1 0 100%; color: var(--muted, #64748b); }
.nib-helpbox {
  margin-top: 6px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink, #0f172a);
  background: var(--cream, #faf6ef);
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 8px;
  max-width: 320px;
}
.nib-helpbox b { color: var(--brand, #8b4513); }
</style>
