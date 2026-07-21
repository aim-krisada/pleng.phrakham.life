<script setup>
// Inline WYSIWYG melody editor (P'Aim 21 ก.ค. — "หน้าแก้แบบ inline").
// STEP 1 (this file): render the active stanza's melody as text glyphs — exactly like the
// printed sheet (digit + octave dots + accidental + เขบ็ต underline) — with ONE blinking
// caret and a highlight on the note being edited. Click a note, or press ←/→, to move the
// caret. NOT typeable yet (typing + ripple + chord/symbol popups come in later steps).
//
// Technique (from the locked design): "text render + an invisible key-catcher on top + draw
// the caret/highlight BETWEEN the note glyphs" — the same way a code/Word editor works. So
// each note token is its OWN element in the flow and the caret is a real DOM node inserted at
// the caret index — no fragile pixel overlay to keep in sync with wrapping / font swaps.
import { computed, ref } from 'vue'
import { parseNotes } from '../lib/notation.js'

const props = defineProps({
  // the active stanza: { id, lines: [{ section, bars: [{ segments: [{ note, ... }], ... }] }] }
  stanza: { type: Object, required: true },
})

const ACC_GLYPH = { '#': '♯', b: '♭', n: '♮' }

// ---- flatten the stanza's melody into a linear list of atoms -------------------------
// The caret is an integer index into this list (it sits BEFORE the atom whose pos === caret,
// or at the very end when caret === total). Each atom carries its source address so a later
// step can map an edit back to stanzas[].lines[li].bars[bi].segments[si] note token `ti`.
// Rendered per line (rows) so the melody wraps line by line like the sheet.
const rows = computed(() => {
  const out = []
  let pos = 0
  const lines = props.stanza?.lines || []
  lines.forEach((line, li) => {
    const cells = []
    ;(line.bars || []).forEach((bar, bi) => {
      // a bar line before every bar except the very first of the line (matches the sheet:
      // the left bar-line of bar N closes bar N-1). repeatStart draws one before bar 0 too.
      if (bi > 0 || bar.repeatStart) {
        cells.push({ pos: pos++, kind: 'bar', addr: { li, bi } })
      }
      ;(bar.segments || []).forEach((seg, si) => {
        const tokens = parseNotes(seg.note || '')
        tokens.forEach((tok, ti) => {
          cells.push({ pos: pos++, kind: tok.type, tok, addr: { li, bi, si, ti } })
        })
      })
    })
    out.push({ li, section: line.section || '', cells })
  })
  return out
})

// total number of atoms → the caret can rest at [0 .. total]
const total = computed(() => {
  let n = 0
  for (const r of rows.value) n += r.cells.length
  return n
})

// ---- caret + selection ---------------------------------------------------------------
const caret = ref(0) // index in [0, total]; the caret sits just left of the atom at this pos
const rootEl = ref(null)

// the NOTE atom the caret is "on" = the atom to the RIGHT of the caret (the one a keystroke
// would act on). Used to draw the highlight box. null at the very end of the melody.
const selectedPos = computed(() => (caret.value < total.value ? caret.value : -1))

function clampCaret(p) {
  caret.value = Math.max(0, Math.min(p, total.value))
}

// click a glyph → drop the caret before it (so it becomes the highlighted note)
function placeCaret(atomPos) {
  clampCaret(atomPos)
  rootEl.value?.focus()
}

// ←/→ move the caret one atom at a time (navigation only — no data change in step 1)
function onKey(e) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    clampCaret(caret.value - 1)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    clampCaret(caret.value + 1)
  } else if (e.key === 'Home') {
    e.preventDefault()
    clampCaret(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    clampCaret(total.value)
  }
}

// caret shows before the atom at this pos (or after the last atom when at the end)
function caretHere(atomPos) {
  return caret.value === atomPos
}
const caretAtEnd = computed(() => caret.value >= total.value)

// glyph helpers (mirror NoteRow so the look matches the sheet)
function accGlyph(a) {
  return ACC_GLYPH[a] || ''
}
</script>

<template>
  <div
    ref="rootEl"
    class="ise"
    tabindex="0"
    role="textbox"
    aria-label="แก้โน้ตแบบพิมพ์บนแผ่นเพลง"
    aria-multiline="true"
    @keydown="onKey"
  >
    <div v-for="row in rows" :key="row.li" class="ise-line">
      <span v-if="row.section" class="ise-section">♦ {{ row.section }}</span>
      <span
        v-for="cell in row.cells"
        :key="cell.pos"
        class="ise-atom-wrap"
      >
        <!-- the caret sits just LEFT of this atom when the caret index points here -->
        <span v-if="caretHere(cell.pos)" class="ise-caret" aria-hidden="true"></span>

        <!-- bar line -->
        <span
          v-if="cell.kind === 'bar'"
          class="ise-bar"
          :class="{ 'ise-sel': cell.pos === selectedPos }"
          @mousedown.prevent="placeCaret(cell.pos)"
          aria-hidden="true"
        ></span>

        <!-- a played note: octave dots + digit (with accidental / aug dots) + เขบ็ต underline -->
        <span
          v-else-if="cell.kind === 'note'"
          class="ise-nt"
          :class="{ 'ise-sel': cell.pos === selectedPos }"
          @mousedown.prevent="placeCaret(cell.pos)"
        >
          <span class="ise-dots-hi"><span v-for="k in cell.tok.high" :key="k" class="ise-odot"></span></span>
          <span :class="['ise-num', 'u' + cell.tok.underlines]"
            ><span v-if="cell.tok.accidental" class="ise-acc">{{ accGlyph(cell.tok.accidental) }}</span
            >{{ cell.tok.pitch }}<span v-if="cell.tok.dots" class="ise-aug">{{ '•'.repeat(cell.tok.dots) }}</span></span>
          <span class="ise-dots-lo"><span v-for="k in cell.tok.low" :key="k" class="ise-odot"></span></span>
        </span>

        <!-- a held note ("-") -->
        <span
          v-else-if="cell.kind === 'ext'"
          class="ise-nt ise-ext"
          :class="{ 'ise-sel': cell.pos === selectedPos }"
          @mousedown.prevent="placeCaret(cell.pos)"
        >
          <span class="ise-dots-hi"></span>
          <span class="ise-num">–</span>
          <span class="ise-dots-lo"></span>
        </span>

        <!-- slur/triplet brackets + anything unreadable: show the raw mark, still selectable -->
        <span
          v-else
          class="ise-mark"
          :class="{ 'ise-sel': cell.pos === selectedPos }"
          @mousedown.prevent="placeCaret(cell.pos)"
        >{{ cell.kind === 'open' ? (cell.tok.group === 'triplet' ? '{' : '(') : cell.kind === 'close' ? (cell.tok.group === 'triplet' ? '}' : ')') : cell.tok?.text }}</span>
      </span>

      <!-- caret parked at the very end of the melody -->
      <span v-if="caretAtEnd && row.li === rows.length - 1" class="ise-caret" aria-hidden="true"></span>
    </div>

    <div v-if="total === 0" class="ise-empty">
      <span class="ise-caret" aria-hidden="true"></span>
      <span class="ise-hint">ยังไม่มีโน้ต</span>
    </div>
  </div>
</template>

<style scoped>
.ise {
  padding: 18px 16px;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 10px;
  outline: none;
  cursor: text;
  /* room for the melody to breathe; wraps line by line, never scrolls sideways */
  overflow-wrap: anywhere;
}
.ise:focus-visible {
  border-color: var(--brand, #8b4513);
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.12);
}
.ise-line {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 2px 0;
  min-height: 2.4em;
  margin-bottom: 14px;
}
.ise-section {
  display: block;
  width: 100%;
  color: var(--brand, #8b4513);
  font-weight: 700;
  margin-bottom: 4px;
}
.ise-atom-wrap {
  display: inline-flex;
  align-items: stretch;
}
/* ---- the caret: a thin blinking bar between glyphs ---- */
.ise-caret {
  display: inline-block;
  width: 2px;
  align-self: stretch;
  min-height: 1.8em;
  margin: 0 1px;
  background: var(--brand, #8b4513);
  animation: ise-blink 1.05s step-end infinite;
}
.ise:focus-within .ise-caret,
.ise:focus .ise-caret {
  animation: ise-blink 1.05s step-end infinite;
}
@keyframes ise-blink {
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .ise-caret { animation: none; opacity: 1; }
}
/* ---- a note glyph (mirrors NoteRow so it reads like the printed sheet) ---- */
.ise-nt {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 1.15em;
  padding: 3px 3px;
  border-radius: 7px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 17px;
  line-height: 1.05;
  color: var(--note-blue, #1d4ed8);
  cursor: pointer;
}
.ise-ext { color: var(--note-blue, #1d4ed8); }
.ise-mark {
  align-self: center;
  padding: 3px 2px;
  border-radius: 7px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 17px;
  color: var(--muted, #64748b);
  cursor: pointer;
}
/* the note being edited — a soft filled box, a big easy tap target on mobile */
.ise-sel {
  background: rgba(139, 69, 19, 0.14);
  outline: 1.5px solid rgba(139, 69, 19, 0.35);
}
/* octave-dot bands above/below the digit — one dot level of reserved height each, so a
   note with 0/1/2 dots keeps the same height and the digits stay aligned (as in NoteRow) */
.ise-dots-hi, .ise-dots-lo { display: block; height: 0.46em; position: relative; width: 1em; }
.ise-odot {
  position: absolute; left: 50%;
  width: 0.16em; height: 0.16em;
  margin-left: -0.08em;
  border-radius: 50%;
  background: currentColor;
}
.ise-dots-hi .ise-odot { bottom: 0.08em; }
.ise-dots-hi .ise-odot:nth-child(2) { bottom: 0.30em; }
.ise-dots-lo .ise-odot { top: 0.08em; }
.ise-dots-lo .ise-odot:nth-child(2) { top: 0.30em; }
.ise-num { display: block; padding: 0 1px; position: relative; }
.ise-num.u1 { border-bottom: 1.5px solid currentColor; }
.ise-num.u2 { border-bottom: 4px double currentColor; }
.ise-acc {
  position: absolute;
  font-size: 0.62em;
  top: -0.2em;
  left: -0.75em;
}
.ise-aug {
  position: absolute;
  left: 100%;
  bottom: 0.12em;
  margin-left: 0.1em;
  font-size: 0.55em;
  line-height: 1;
}
/* ---- bar line ---- */
.ise-bar {
  display: inline-block;
  align-self: stretch;
  width: 2px;
  min-height: 1.5em;
  margin: 0 6px;
  background: var(--line-strong, #94a3b8);
  cursor: pointer;
}
.ise-bar.ise-sel {
  background: var(--brand, #8b4513);
  outline: none;
}
.ise-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted, #64748b);
}
.ise-hint { font-size: 14px; }
</style>
