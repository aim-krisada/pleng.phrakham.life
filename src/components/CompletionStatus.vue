<script setup>
// BI-007 (DS edit-completion-flow §5 D-A) — the "you-are-here" bar that sits ABOVE the edit
// header, persistent + inline (NOT inside the dock, which auto-hides on scroll and resets its
// message on reload — G2/G4). It answers three things at a glance: where this song is in the
// แก้ → ส่ง → อนุมัติ → เผยแพร่ pipeline, what its current status is, and what the next step is.
//
// Dumb by design: every fact is computed by EditorMode (which owns the draft/role getters) and
// passed in. This component only lays it out to a world-class, accessible standard.
//   • WCAG 1.4.1 — status never rides on colour alone: each step carries a ✓/number + a word,
//     and the status chip carries an icon glyph + Thai label.
//   • WCAG 4.1.3 — the status line is role="status" aria-live="polite" so a screen reader hears
//     "รอตรวจ" the moment ส่งตรวจ succeeds (same precedent as the pending-alert banner).
//   • aria-current="step" marks the active node (M3 / Apple stepper guidance).
//   • Targets: this bar is read-only text; the only control is the compact ⓘ, kept ≥24px.
import { computed, ref } from 'vue'

const props = defineProps({
  // ordered pipeline labels, e.g. ['แก้ไข','เก็บร่าง','ส่งตรวจ','รออนุมัติ','เผยแพร่แล้ว']
  steps: { type: Array, default: () => [] },
  // index of the step the song is AT now (steps before it read as done)
  current: { type: Number, default: 0 },
  // drives the status chip skin + glyph: draft|pending|rejected|approved|anon|review
  tone: { type: String, default: 'draft' },
  statusText: { type: String, default: '' }, // the "you are here" line
  nextText: { type: String, default: '' }, // one-line "what happens next"
  rejectComment: { type: String, default: '' }, // shown persistently when a draft was sent back
  autoSave: { type: String, default: 'idle' }, // idle | saving | saved  (editor draft only)
})

// glyph is TEXT (not an icon font) so it can't silently vanish, per the repo's Icon.vue caveat.
const TONE = {
  draft: { glyph: '✎', label: 'ร่าง' },
  pending: { glyph: '⏳', label: 'รอตรวจ' },
  rejected: { glyph: '↩', label: 'ถูกส่งกลับ' },
  approved: { glyph: '✓', label: 'เผยแพร่แล้ว' },
  anon: { glyph: '⭳', label: 'เก็บในเครื่อง' },
  review: { glyph: '🔍', label: 'กำลังตรวจ' },
}
const toneInfo = computed(() => TONE[props.tone] || TONE.draft)
const autoText = computed(() =>
  props.autoSave === 'saving' ? 'กำลังเก็บอัตโนมัติ…' : props.autoSave === 'saved' ? 'เก็บอัตโนมัติแล้ว' : '',
)
// G-review #4 — on a phone the full 5-node timeline is noise (M3/HIG: context > timeline). The bar
// collapses to the status PILL + one-line next-step; the whole ladder is one tap away. Desktop
// shows the ladder inline (the toggle is hidden by CSS), so this state is phone-only in effect.
const expanded = ref(false)
</script>

<template>
  <div class="cs-bar no-print" :class="['t-' + tone, { 'cs-expanded': expanded }]">
    <!-- status + next: one live region so the change is announced once, coherently. On a phone this
         PILL is the whole bar; the ladder below is one tap away. -->
    <div class="cs-say" role="status" aria-live="polite">
      <span class="cs-chip"><span aria-hidden="true">{{ toneInfo.glyph }}</span> {{ statusText || toneInfo.label }}</span>
      <!-- phone-only toggle to reveal the full ladder (hidden on desktop, where it's always shown) -->
      <button class="cs-toggle" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
        {{ expanded ? 'ซ่อนขั้นตอน ▴' : 'ดูขั้นตอน ▾' }}
      </button>
      <span v-if="autoText" class="cs-auto">· {{ autoText }}</span>
      <span v-if="nextText" class="cs-next"><b>ขั้นต่อไป:</b> {{ nextText }}</span>
    </div>

    <!-- the pipeline: ✓ done · ● current (aria-current) · ○ future. Always shown on desktop; on a
         phone it hides until the toggle expands it (cs-expanded). -->
    <ol class="cs-steps" aria-label="ขั้นตอนการทำงานของเพลงนี้">
      <li
        v-for="(s, i) in steps"
        :key="i"
        class="cs-step"
        :class="{ done: i < current, cur: i === current, todo: i > current }"
        :aria-current="i === current ? 'step' : undefined"
      >
        <span class="cs-node" aria-hidden="true">{{ i < current ? '✓' : i + 1 }}</span>
        <span class="cs-label">{{ s }}</span>
      </li>
    </ol>

    <!-- a returned draft keeps its reviewer comment on the surface (was a saveMsg that flickered) -->
    <p v-if="rejectComment" class="cs-reject">↩ ผู้ตรวจส่งกลับ: “{{ rejectComment }}”</p>
  </div>
</template>

<style scoped>
.cs-bar {
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 4px solid var(--brand);
  border-radius: 12px;
  padding: 10px 14px;
  margin: 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* left accent hints the tone without carrying meaning alone (WCAG 1.4.1) */
.cs-bar.t-pending { border-left-color: #d69e2e; }
.cs-bar.t-rejected { border-left-color: var(--secondary); }
.cs-bar.t-approved { border-left-color: var(--cat-green); }
.cs-bar.t-review { border-left-color: #d69e2e; }

/* ===== stepper ===== */
.cs-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 2px;
}
.cs-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}
/* connector between nodes */
.cs-step:not(:first-child)::before {
  content: '';
  width: 16px;
  height: 2px;
  background: var(--line);
  border-radius: 2px;
  flex: 0 0 auto;
}
.cs-step.done:not(:first-child)::before { background: var(--cat-green); }
.cs-node {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--line);
  background: var(--surface);
  font-size: 12px;
  line-height: 1;
  flex: 0 0 auto;
}
.cs-step.done { color: var(--ink); }
.cs-step.done .cs-node { border-color: var(--cat-green); background: var(--cat-green); color: #fff; }
.cs-step.cur { color: var(--brand); }
.cs-step.cur .cs-node { border-color: var(--brand); background: var(--brand); color: #fff; }
.cs-step.cur .cs-label { font-weight: 800; }

/* ===== status + next ===== */
.cs-say {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: 13.5px;
  color: var(--ink);
}
.cs-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--cream);
  color: var(--ink);
}
.t-pending .cs-chip { background: #fefcbf; }
.t-rejected .cs-chip { background: #fed7d7; }
.t-approved .cs-chip { background: #d7f2dd; }
.t-review .cs-chip { background: #fefcbf; }
.cs-auto { color: var(--muted); font-size: 12.5px; }
.cs-next { color: var(--muted); flex-basis: 100%; }
.cs-next b { color: var(--ink); font-weight: 700; }
.cs-reject {
  margin: 0;
  padding: 6px 10px;
  background: #fed7d7;
  border-radius: 8px;
  color: #822;
  font-size: 13px;
}
/* G-review #4 — the phone-only "ดูขั้นตอน" toggle. Hidden on desktop (the ladder shows inline). */
.cs-toggle {
  display: none;
  margin-inline-start: auto;
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* ===== phone (พี่เปา's device) — context > timeline (G-review #4 · M3/HIG). The bar becomes a
   status PILL + one-line next-step; the full ladder is behind the "ดูขั้นตอน" toggle, and expands
   as a VERTICAL stepper (a compact bottom-sheet feel, in-flow so it needs no overlay). */
@media (max-width: 480px) {
  .cs-toggle { display: inline-block; }
  .cs-steps { display: none; }
  .cs-expanded .cs-steps {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-top: 4px;
  }
  /* vertical ladder: the connector runs DOWN the left of each node, and every label shows */
  .cs-expanded .cs-step:not(:first-child)::before {
    width: 2px;
    height: 12px;
    margin: -6px 0 -2px 10px;
  }
  .cs-expanded .cs-step { align-items: center; }
}
</style>
