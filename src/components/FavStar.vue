<script setup>
// ★ toggle for one song — used on song rows/cards (and reusable on the song page later).
// Self-contained: reads/writes the shared favorites store (lib/favorites.js · localStorage,
// no account). Not colour-alone (WCAG 1.4.1): the star FILLS when on + aria-pressed carries
// the state to assistive tech. A generous 44×44 hit area even though the glyph is small
// (WCAG 2.5.8), so it's easy to tap on a phone.
import { computed } from 'vue'
import { isFavorite, toggleFavorite, favorites } from '../lib/favorites.js'

const props = defineProps({
  id: { type: [String, Number], required: true },
})

// `favorites` referenced so the computed re-runs on every toggle (the store swaps the Set).
const on = computed(() => (favorites.value, isFavorite(props.id)))

function toggle(e) {
  // rows/cards are links — a star tap must not also navigate into the song.
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
    :aria-pressed="on"
    :aria-label="on ? 'เอาออกจากรายการโปรด' : 'เพิ่มเข้ารายการโปรด'"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
      :fill="on ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.75a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 10.535a.53.53 0 0 1 .294-.904l5.166-.755a2.12 2.12 0 0 0 1.597-1.16z"/>
    </svg>
  </button>
</template>

<style scoped>
.fav-star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--touch-min);
  height: var(--touch-min);
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--muted);          /* empty star = quiet grey */
  min-height: var(--touch-min);
}
.fav-star.on { color: var(--accent); }  /* filled = vivid marigold */
@media (hover: hover) {
  .fav-star:hover { background: var(--cream-hover); color: var(--accent); }
}
.fav-star:active { transform: scale(0.9); }
</style>
