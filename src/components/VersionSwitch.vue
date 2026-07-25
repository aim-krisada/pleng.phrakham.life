<script setup>
// "You are on the trial version" badge + one-tap switch back (docs/deploy-v2.md).
//
// While the new app is shepherded to readiness it is deployed BESIDE the current one on the same
// domain and the same Supabase database: current = pleng.phrakham.life/ · new = /v2/. A reader who
// lands on /v2 must be able to answer two questions without being taught anything:
//   1. "which one am I looking at?"  → the badge is in the app header, on every page, every width
//   2. "how do I get back?"          → the badge IS the switch (one tap), and it is a real <a>,
//                                      so keyboard/middle-click/long-press all behave normally
//
// Renders NOTHING on the current (root) build — __APP_VARIANT__ is '' there — so this component is
// inert for today's live site and cannot regress it. When /v2 is promoted to the root the constant
// goes back to '' and the badge disappears on its own; no code has to be removed under pressure.
//
// A11y: a labelled link (not a bare "v2" glyph) · min 36px target — above the WCAG 2.2 AA 24px
// floor and in step with the sibling header controls · never gated on `@media (hover:hover)`,
// which reports `none` on P'Aim's touchscreen laptop and would delete the control outright.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '../i18n/index.js'
import Icon from './Icon.vue'

const route = useRoute()
const isV2 = __APP_VARIANT__ === 'v2'

// Carry the reader across to the same place in the other version — the point of running the two
// side by side is comparing THE SAME SONG. Only routes that exist in BOTH versions are carried
// over; anything newer lands on the other version's home page rather than a blank unmatched route.
const SHARED_ROUTES = [/^\/$/, /^\/song\/[^/]+$/]
const target = computed(() => {
  const path = route.path || '/'
  const keep = SHARED_ROUTES.some((re) => re.test(path))
  return '/' + (keep && path !== '/' ? '#' + path : '')
})
</script>

<template>
  <a
    v-if="isV2"
    class="ver-switch no-print"
    :href="target"
    :aria-label="t('version.switchAria')"
    :title="t('version.switchAria')"
  >
    <span class="ver-tag">{{ t('version.badge') }}</span>
    <span class="ver-word">{{ t('version.trial') }}</span>
    <Icon class="ver-ico" name="arrow-left-right" :size="16" />
  </a>
</template>

<style scoped>
/* Outlined amber pill — reads as a STATE marker next to the brand, not as another action button
   competing with ＋สร้างเพลงใหม่. Colour is only a reinforcement: the word "รุ่นทดลอง" (and the
   aria-label) carry the meaning for anyone who cannot separate the hues. */
.ver-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 4px 10px;
  border: 1px solid var(--brand, #b45309);
  border-radius: 999px;
  background: var(--accent-soft, #fdecc8);
  /* --ink, not --brand: amber-on-amber measures 4.33:1, and at 14.4px bold this is SMALL text
     (AA "large" starts at 18.66px bold), so it would miss the 4.5:1 floor. --ink is 11.3:1. */
  color: var(--ink, #362f28);
  font: inherit;
  font-size: var(--fs-sm, 0.9rem);
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  flex: 0 0 auto;
}
.ver-tag {
  /* the version itself, boxed so "v2" reads as a label and not as part of the sentence */
  background: var(--brand, #b45309);
  color: #fff;
  border-radius: 999px;
  padding: 1px 7px;
  font-variant-numeric: tabular-nums;
}
.ver-ico { flex: 0 0 auto; opacity: 0.9; }

@media (hover: hover) {
  .ver-switch:hover { background: var(--cream-hover, #ecdec7); }
}
.ver-switch:focus-visible {
  outline: 2px solid var(--brand, #b45309);
  outline-offset: 2px;
}

/* Narrow phones: the header is already carrying the app mark, 🔍, ☰ and login. Drop the word and
   keep the pill — "v2" + the swap arrows still answer both questions, and the aria-label/title
   keep the full sentence for assistive tech. Target stays 36px (AA floor is 24px). */
@media (max-width: 480px) {
  .ver-word { display: none; }
  .ver-switch { padding: 4px 8px; gap: 4px; }
}

/* NO `prefers-color-scheme` override here. The app ships ONE (light) palette, so a component that
   listened to the OS would paint a dark pill onto a cream header the moment the machine reports
   dark — measured live: the pill came back rgb(58,42,18) on an unchanged light bar. The colours
   above are tokens, so the pill follows whatever the dark palette sets when that work lands. */
</style>
