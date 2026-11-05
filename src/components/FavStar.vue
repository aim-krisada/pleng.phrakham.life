<script setup>
// ★ one song's star — m1.wpa.24.fav.01 (ใบ v3/pleng#152). Used on the home rows, the search cards,
// the "เพลงที่ชอบ" list and the song page. Reads/writes the shared store (lib/favorites.js).
//
// Not colour alone (WCAG 1.4.1): OFF = an outline star, ON = a FILLED yellow star, and aria-pressed
// tells a screen reader which. Yellow alone is too light on white, so the star keeps a dark amber rim
// (#a16207, 5:1 on white — WCAG 1.4.11 needs 3:1 for a graphic). 44×44 hit area (WCAG 2.5.8).
// It is a SIBLING of the row link, never inside it (a button in a link = the nesting this list
// already avoids for ✏️), so a tap never also opens the song.
import { computed } from 'vue'
import { isFavorite, toggleFavorite, favorites } from '../lib/favorites.js'

const props = defineProps({
  id: { type: [String, Number], required: true },
  title: { type: String, default: '' },
})

// `favorites.value` read so the computed re-runs on every toggle (the store swaps the Set).
const on = computed(() => (favorites.value, isFavorite(props.id)))
const label = computed(() => {
  const name = props.title ? ` ${props.title}` : ''
  return on.value ? `เอา${name} ออกจากเพลงที่ชอบ` : `เก็บ${name} ไว้ในเพลงที่ชอบ`
})

function toggle(e) {
  e.preventDefault()
  e.stopPropagation()
  toggleFavorite(props.id)
}
</script>

<template>
  <button
    type="button"
    class="fav-star"
    :class="{ on }"
    :aria-pressed="on ? 'true' : 'false'"
    :aria-label="label"
    :title="label"
    data-test="fav-star"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"
      :fill="on ? '#facc15' : 'none'" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.75a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 10.535a.53.53 0 0 1 .294-.904l5.166-.755a2.12 2.12 0 0 0 1.597-1.16z"/>
    </svg>
  </button>
</template>

<style scoped>
.fav-star {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-min);
  height: var(--touch-min);
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--muted);       /* empty star = quiet grey outline */
}
.fav-star.on { color: #a16207; } /* rim of the filled yellow star */
.fav-star:hover { background: var(--cream-hover); }
.fav-star:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.fav-star:active { transform: scale(0.9); }
@media print { .fav-star { display: none; } }
</style>
