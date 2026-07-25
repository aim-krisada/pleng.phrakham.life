<script setup>
// The ⚙/☰ preference controls, in ONE place (rendered both in the desktop ⚙ popover and the
// mobile drawer, so they never drift). Two compact SEGMENTED controls (P'Aim 22 ก.ค.: world-
// class = compact — not tall full-width blocks): UI language + Thai typeface. Density ~36px per
// docs/ui-standards.md; still an easy tap (WCAG 2.5.8 AA floor is 24px). Class names .sb-font-*
// are kept for ShellBar.font.test.js.
import { computed } from 'vue'
import { t, locale, setLocale, isReady, LOCALES } from '../i18n/index.js'
import { siteFont, setSiteFont } from '../store.js'

// Languages without a dict yet → one small faint hint under the row (not a block per option).
const soonLangs = computed(() =>
  LOCALES.filter((l) => !isReady(l.code)).map((l) => l.native).join(' · '),
)
</script>

<template>
  <div class="sb-set">
    <!-- ภาษา — one row of segments (ไทย · 中文 · English); zh/en disabled + a small hint -->
    <div class="sb-lang">
      <div class="sb-lang-lbl">{{ t('lang.label') }}</div>
      <div class="sb-lang-opts sb-seg" role="radiogroup" :aria-label="t('lang.label')">
        <button
          v-for="l in LOCALES"
          :key="l.code"
          type="button"
          role="radio"
          :aria-checked="locale === l.code"
          :class="{ on: locale === l.code }"
          :disabled="!isReady(l.code)"
          @click="setLocale(l.code)"
        >{{ l.native }}</button>
      </div>
      <div v-if="soonLangs" class="sb-lang-soon">{{ soonLangs }} — {{ t('lang.soon') }}</div>
    </div>

    <!-- ตัวอักษรไทย — segmented; the ก ข ค sample renders in its own cut so it previews itself -->
    <div class="sb-font">
      <div class="sb-font-lbl">{{ t('font.label') }}</div>
      <div class="sb-font-opts sb-seg" role="radiogroup" :aria-label="t('font.label')">
        <button type="button" role="radio" :aria-checked="siteFont === 'default'" :class="{ on: siteFont === 'default' }" @click="setSiteFont('default')">
          <span class="sb-font-eg">ก&nbsp;ข&nbsp;ค</span> {{ t('font.loopless') }}
        </button>
        <button type="button" role="radio" :aria-checked="siteFont === 'looped'" :class="{ on: siteFont === 'looped' }" @click="setSiteFont('looped')">
          <span class="sb-font-eg looped">ก&nbsp;ข&nbsp;ค</span> {{ t('font.looped') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sb-set { display: flex; flex-direction: column; gap: var(--sp-3); }
.sb-lang-lbl,
.sb-font-lbl { font-size: var(--fs-xs); color: var(--muted); padding: 0 2px var(--sp-1); }

/* segmented control — one bordered pill split into segments, sized to content (compact) */
.sb-seg {
  display: inline-flex;
  flex-wrap: nowrap;
  max-width: 100%;
  border: 1px solid var(--line);
  border-radius: 9px;
  overflow: hidden;
  background: var(--surface);
}
.sb-seg button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 0 12px;
  background: transparent;
  color: var(--ink);
  border: none;
  border-left: 1px solid var(--line);
  border-radius: 0;
  font: inherit;
  font-size: var(--fs-sm);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}
.sb-seg button:first-child { border-left: none; }
.sb-seg button.on { background: var(--accent); color: var(--ink); font-weight: 700; }
.sb-seg button:disabled { color: var(--muted); opacity: 0.55; cursor: not-allowed; }
@media (hover: hover) {
  .sb-seg button:not(.on):not(:disabled):hover { background: var(--cream-hover); }
}

.sb-lang-soon { font-size: 0.7rem; color: var(--muted); padding: var(--sp-1) 2px 0; }
.sb-font-eg { font-size: 1em; font-family: 'Noto Sans Thai', sans-serif; }
.sb-font-eg.looped { font-family: 'Noto Sans Thai Looped', 'Noto Sans Thai', sans-serif; }
</style>
