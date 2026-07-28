<script setup>
// iOS "Add to Home Screen" instruction sheet. iOS Safari has no beforeinstallprompt, so tapping
// any promoted install affordance (home banner / top-bar button) on iOS opens THIS instead of
// replaying a prompt — a tap is never a dead end (lib/pwaInstall.js openInstall()). App-wide:
// ShellBar mounts it once so it works from every route. Bottom-sheet on mobile / centred dialog
// on desktop, mirroring ShareSheet (scrim · role=dialog · aria-modal · Esc · focus).
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { t } from '../i18n/index.js'
import Icon from './Icon.vue'
import { closeInstallSheet } from '../lib/pwaInstall.js'

const dialog = ref(null)

function onKey(e) { if (e.key === 'Escape') closeInstallSheet() }
onMounted(() => {
  document.addEventListener('keydown', onKey)
  // move focus into the dialog so Esc/close work and a screen reader lands on the heading
  nextTick(() => dialog.value && dialog.value.focus())
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="is-scrim no-print" @click.self="closeInstallSheet">
    <div ref="dialog" class="is-sheet" role="dialog" aria-modal="true" :aria-labelledby="'is-title'" tabindex="-1">
      <div class="is-head">
        <h2 id="is-title" class="is-title">{{ t('install.iosTitle') }}</h2>
        <button type="button" class="is-x" :aria-label="t('install.close')" @click="closeInstallSheet">
          <Icon name="x" :size="20" />
        </button>
      </div>

      <ol class="is-steps">
        <li>
          <span class="is-step-txt">{{ t('install.iosStep1') }}</span>
          <Icon name="share" :size="18" class="is-inline" aria-hidden="true" />
        </li>
        <li><span class="is-step-txt">{{ t('install.iosStep2') }}</span></li>
        <li><span class="is-step-txt">{{ t('install.iosStep3') }}</span></li>
      </ol>

      <button type="button" class="is-done" @click="closeInstallSheet">{{ t('install.gotIt') }}</button>
    </div>
  </div>
</template>

<style scoped>
.is-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;          /* mobile = bottom-sheet */
  justify-content: center;
}
.is-sheet {
  width: 100%;
  max-width: 420px;
  max-height: 92vh;
  overflow-y: auto;
  background: var(--surface);
  color: var(--ink);
  border-radius: 16px 16px 0 0;
  padding: var(--sp-4) var(--sp-4) calc(var(--sp-4) + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25);
}
@media (min-width: 640px) {
  .is-scrim { align-items: center; }   /* desktop = centred dialog */
  .is-sheet { border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); }
}
.is-head { display: flex; align-items: flex-start; gap: var(--sp-2); }
.is-title { font-size: var(--fs-lg); margin: 0; flex: 1; color: var(--brand); }
.is-x {
  flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; color: var(--muted); cursor: pointer;
  min-width: var(--touch-min); min-height: var(--touch-min); border-radius: 10px;
}
@media (hover: hover) { .is-x:hover { background: var(--cream-hover); color: var(--ink); } }
.is-x:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.is-steps {
  margin: var(--sp-3) 0 var(--sp-4);
  padding-left: 1.4em;
  display: flex; flex-direction: column; gap: var(--sp-3);
}
.is-steps li { color: var(--ink); font-size: var(--fs-md); line-height: 1.5; }
.is-step-txt { vertical-align: middle; }
.is-inline { display: inline-block; vertical-align: -3px; margin-left: 4px; color: var(--brand); }

.is-done {
  width: 100%;
  background: var(--accent); color: var(--ink);
  border: none; border-radius: 14px;
  padding: 12px 16px; min-height: var(--touch-min);
  font: inherit; font-size: var(--fs-md); font-weight: 700; cursor: pointer;
}
@media (hover: hover) { .is-done:hover { background: var(--accent-hover); } }
.is-done:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
</style>
