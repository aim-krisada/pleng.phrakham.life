<script setup>
// The editor's tool dock — undo/redo, octave, ♯♭, the chord picker, แทรก/ทับ and the 12
// jianpu symbol keys. Digits + Thai text come from the native keyboard (see SongViewer's
// capture input); this holds only what a keyboard cannot type.
//
// It is DOCKED, never floating. It used to be a popup glued to the selected note on desktop
// (and a keyboard-accessory bar on a phone), and it covered the words being edited: measured
// 24 ก.ค., up to 92 of 279 visible note/word cells were hidden behind it at 1280, and every
// single visible cell at 360. SongViewer now puts the editing surface in a frame — the sheet
// scrolls in its own region and this dock sits BESIDE it — so it can never cover a cell at
// any scroll position, and it stops moving (the same tool is always in the same place, which
// is what a person keying songs all day needs: กล้ามเนื้อมือจำได้).
//
// Buttons use @mousedown.prevent so tapping one never blurs the capture input → the phone
// keyboard stays open.
import { ref, watch } from 'vue'
import Icon from './Icon.vue'
import { isValidChord } from '../lib/chords.js'
import { readHints } from '../lib/keyHints.js'

const props = defineProps({
  layer: { type: String, default: 'note' }, // 'note' | 'word' — which controls apply
  // false on a phone-width screen: the on-screen keyboard has no arrows and no ♯ ♭, so those
  // get buttons there. Chosen by VIEWPORT WIDTH upstream, never hover/pointer (this laptop
  // reports hover:none with a mouse attached).
  wide: { type: Boolean, default: true },
  mode: { type: String, default: 'overwrite' }, // 'insert' | 'overwrite' — the แทรก/ทับ state
  chords: { type: Array, default: () => [] }, // [{value,label}] for the key ('' = ไม่มีคอร์ด)
  hintNonce: { type: Number, default: 0 }, // bumped by the host when a new key position is learned
  canUndo: { type: Boolean, default: false }, // ย้อน/ทำซ้ำ availability — the buttons must tell the truth
  canRedo: { type: Boolean, default: false },
  // วิธีใช้ starts OPEN for someone who has never edited before and CLOSED afterwards; the
  // host owns the memory (localStorage) so the dock stays presentational.
  helpOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['octave', 'accidental', 'toggle-mode', 'nav', 'chord', 'symbol', 'undo', 'redo', 'update:helpOpen'])

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
watch(() => props.hintNonce, () => { keyHints.value = readHints() })

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
</script>

<template>
  <div class="nib no-print" :class="{ 'nib-wide': wide }" role="toolbar" aria-label="เครื่องมือแก้โน้ต" @mousedown.prevent>
    <!-- วิธีใช้ — the only long-form text in the editor. It used to sit above the sheet
         PERMANENTLY (72px at 1280 · 226px at 360 = 28% of the phone screen). It is one ? away
         now, and it opens by itself the first time anyone edits, so a newcomer still meets it. -->
    <div v-if="helpOpen" class="nib-helpbox" role="note">
      <div class="nib-helphead">
        <b>วิธีใช้ (โหมดแก้)</b>
        <button class="nib-helpclose" aria-label="ปิดวิธีใช้" @click="emit('update:helpOpen', false)"><Icon name="x" :size="16" /></button>
      </div>
      แตะโน้ตแล้วพิมพ์เลข <b>1–7</b> · แตะคำแล้วพิมพ์เนื้อ (คีย์บอร์ดขึ้นเอง)<br />
      <b>← → ↑ ↓</b> เลื่อน · <b>Ctrl+← →</b> ข้ามห้อง · <b>Ctrl+↑ ↓</b> ข้ามบรรทัด<br />
      <b>Insert</b> สลับแทรก/ทับ · <b>Delete</b> ลบอยู่กับที่ · <b>Backspace</b> เอาออกทั้งช่อง<br />
      <b>#</b> ชาร์ป · <b>b</b> แฟลต · <b>Ctrl+Z / Ctrl+Y</b> ย้อน/ทำซ้ำ<br />
      สัญลักษณ์อื่นกดจากปุ่มด้านล่างได้เลย — บนปุ่มมีทั้งตัวอักษร ชื่อไทย และตำแหน่งบนคีย์บอร์ด
    </div>

    <div class="nib-row">
      <!-- ย้อน / ทำซ้ำ — same name, icon and order as the editor's dock on `main` (พี่เปาคุ้นมือ
           อยู่แล้ว) with the shortcut printed ON the button, like the symbol keys. Disabled when
           there is nothing to undo/redo: a control must never accept a press and do nothing. -->
      <button class="nib-key nib-hist" :disabled="!canUndo" aria-label="ย้อน (Ctrl+Z)" @click="emit('undo')">
        <Icon name="undo-2" :size="16" /><span class="nib-histtxt">ย้อน<em>Ctrl+Z</em></span>
      </button>
      <button class="nib-key nib-hist" :disabled="!canRedo" aria-label="ทำซ้ำ (Ctrl+Y)" @click="emit('redo')">
        <Icon name="redo-2" :size="16" /><span class="nib-histtxt">ทำซ้ำ<em>Ctrl+Y</em></span>
      </button>
      <span class="nib-sep" aria-hidden="true"></span>

      <!-- arrows — phone only (on-screen keyboards have none; a desktop uses the physical keys) -->
      <template v-if="!wide">
        <button class="nib-key nib-nav" aria-label="ซ้าย" title="ซ้าย" @click="emit('nav', 'left')">←</button>
        <button class="nib-key nib-nav" aria-label="ขึ้น" title="ขึ้น" @click="emit('nav', 'up')">↑</button>
        <button class="nib-key nib-nav" aria-label="ลง" title="ลง" @click="emit('nav', 'down')">↓</button>
        <button class="nib-key nib-nav" aria-label="ขวา" title="ขวา" @click="emit('nav', 'right')">→</button>
        <span v-if="layer === 'note'" class="nib-sep" aria-hidden="true"></span>
      </template>

      <!-- note ops (octave has no keyboard key → button on both; accidentals only on a phone,
           a desktop types # / b; แทรก/ทับ is also a status indicator). Hidden on the word layer. -->
      <template v-if="layer === 'note'">
        <button class="nib-key" title="สูงขึ้นหนึ่งช่วง (จุดบนโน้ต)" aria-label="สูงขึ้นหนึ่งช่วง" @click="emit('octave', 1)"><b>สูง</b> ↑</button>
        <button class="nib-key" title="ต่ำลงหนึ่งช่วง (จุดล่างโน้ต)" aria-label="ต่ำลงหนึ่งช่วง" @click="emit('octave', -1)"><b>ต่ำ</b> ↓</button>
        <template v-if="!wide">
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

        <!-- the symbol keys — grouped so 12 buttons read in about a second, and every button
             states its own character + Thai name (+ the physical key, once this machine has
             told us). On the same line as the controls when the dock is wide enough. -->
        <span class="nib-sep" aria-hidden="true"></span>
        <div v-for="g in SYMBOL_GROUPS" :key="g.name" class="nib-symgroup" role="group" :aria-label="'สัญลักษณ์ ' + g.name">
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
      </template>

      <!-- วิธีใช้ toggle — pushed to the end of the row, always visible. Never a menu item:
           a control you cannot see does not exist. -->
      <button
        class="nib-key nib-help" :class="{ on: helpOpen }" :aria-expanded="helpOpen"
        aria-label="วิธีใช้ / คีย์ลัด" title="วิธีใช้ / คีย์ลัด"
        @click="emit('update:helpOpen', !helpOpen)"
      ><Icon name="circle-help" :size="18" /><span class="nib-helptxt">วิธีใช้</span></button>
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
  </div>
</template>

<style scoped>
/* DOCKED — a normal flex child of SongViewer's editing frame. No position/z-index of its own:
   it is part of the layout, so it can never sit on top of the sheet. Its own height is capped
   so a short window can never leave the sheet with no room. */
.nib {
  flex: 0 0 auto;
  /* the dock can never take more than this: the song has to stay the bigger half of the screen.
     Anything past the cap scrolls inside the dock. */
  max-height: 40vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--surface, #fff);
  border-top: 1px solid var(--line, #d9d0c4);
  box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.08);
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
}
.nib-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
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
.nib-key:disabled { opacity: 0.4; cursor: default; }
.nib-key:disabled:active { transform: none; }
/* ย้อน / ทำซ้ำ — icon + Thai name + the shortcut, printed on the button (never a tooltip) */
.nib-hist { padding: 0 8px; gap: 5px; }
.nib-histtxt { display: inline-flex; flex-direction: column; align-items: flex-start; line-height: 1.1; font-size: 12px; font-weight: 700; }
.nib-histtxt em { font-style: normal; font-size: 10px; font-weight: 700; color: var(--brand, #8b4513); }
.nib-hist:disabled .nib-histtxt em { color: var(--muted, #64748b); }
.nib-key:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.nib-key b { font-size: 12px; font-weight: 700; }
.nib-nav { font-size: 20px; font-weight: 700; min-width: 40px; }
.nib-acc { font-size: 20px; }
.nib-mode {
  font-size: 13px; font-weight: 700;
  border-color: var(--brand, #8b4513); color: var(--brand, #8b4513);
}
.nib-mode.ins { background: var(--brand, #8b4513); color: #fff; }
.nib-sep { flex: 0 0 auto; width: 1px; align-self: stretch; min-height: 32px; background: var(--line, #d9d0c4); margin: 0 2px; }
/* ---- symbol keys (DS §4.1) ----------------------------------------------------------
   Each key is a 3-line stack: character (the answer) · Thai name · where that key is (only
   once measured). The groups sit on the SAME row as the controls when the dock is wide,
   and wrap onto their own lines when it is not. */
.nib-symgroup { display: flex; align-items: center; gap: 6px; min-width: 0; }
.nib-symlabel {
  flex: 0 0 auto;
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
/* วิธีใช้ — the standard blue info affordance (matches phrakham). It flows with the row (no
   auto margin: pushed to the far edge it wrapped onto a line of its own and read as a floating
   help widget rather than part of the toolbar). */
.nib-help { color: #2563eb; border-color: #bfdbfe; background: #eff6ff; }
.nib-help.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.nib-helptxt { font-size: 13px; font-weight: 700; }
.nib-helpbox {
  margin: 0 0 6px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ink, #0f172a);
  background: var(--cream, #faf6ef);
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 8px;
}
.nib-helpbox b { color: var(--brand, #8b4513); }
.nib-helphead { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
.nib-helpclose {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 30px; min-height: 30px;
  border: 1px solid var(--line, #d9d0c4); border-radius: 8px;
  background: var(--surface, #fff); color: var(--muted, #64748b); cursor: pointer;
}
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

/* ---- phone: the dock now takes real room from the song, so buy it back ------------------
   The group captions (ความยาว · เสียง · กลุ่ม/ห้อง) each force their own line break here, and
   every key already carries its own Thai name — so on a narrow screen the caption is a line of
   screen for information that is already on the buttons. Dropping them plus a slightly tighter
   key took the dock from 368px to about half that at 360, which is the difference between
   seeing two lines of the song and seeing four. */
@media (max-width: 767px) {
  .nib-symlabel { display: none; }
  .nib-sym { min-width: 46px; padding: 2px 4px; }
  .nib-symth { font-size: 9px; }
  .nib-key { padding: 0 8px; }
}
</style>
