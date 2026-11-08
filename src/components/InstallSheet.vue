<script setup>
// The "how to install" bottom sheet (ใบ v3/pleng#156 · install-design.html figures 3–6).
// Mounted ONCE in App.vue; opened by lib/pwaInstall.js startInstall() from any ติดตั้งแอพ button
// (home card or ☰ drawer). Shows at most 3 numbered steps for THIS browser, or — inside LINE /
// Facebook — a button that opens the page in the real browser.
//
// A dialog by WAI-ARIA APG (Dialog (Modal) pattern): role=dialog + aria-modal + a title;
// focus moves into the sheet when it opens, Tab stays inside, Esc and the scrim close it, and
// focus returns to the button that opened it (closeInstallSheet). Every target ≥ 44px.
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import { installSheet, closeInstallSheet } from '../lib/pwaInstall.js'

const panel = ref(null)

function focusables() {
  return panel.value
    ? Array.from(panel.value.querySelectorAll('a[href], button:not([disabled])'))
    : []
}
function onKey(e) {
  if (!installSheet.value) return
  if (e.key === 'Escape') { e.preventDefault(); closeInstallSheet(); return }
  if (e.key !== 'Tab') return
  const f = focusables()
  if (!f.length) return
  const first = f[0]
  const last = f[f.length - 1]
  const active = document.activeElement
  if (e.shiftKey && (active === first || !panel.value.contains(active))) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && (active === last || !panel.value.contains(active))) { e.preventDefault(); first.focus() }
}

watch(installSheet, async (s) => {
  if (s) {
    document.addEventListener('keydown', onKey, true)
    await nextTick()
    const f = focusables()
    ;(f[0] || panel.value)?.focus()
  } else {
    document.removeEventListener('keydown', onKey, true)
  }
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey, true))
</script>

<template>
  <div v-if="installSheet" class="is-root no-print">
    <div class="is-scrim" aria-hidden="true" @click="closeInstallSheet"></div>
    <div
      ref="panel"
      class="is-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="is-title"
      tabindex="-1"
      :data-sheet="installSheet.id"
    >
      <h2 id="is-title" class="is-title">{{ installSheet.title }}</h2>
      <p v-if="installSheet.intro" class="is-intro">{{ installSheet.intro }}</p>

      <ol v-if="installSheet.steps && installSheet.steps.length" class="is-steps">
        <li v-for="(step, i) in installSheet.steps" :key="i" class="is-step">
          <span class="is-n" aria-hidden="true">{{ i + 1 }}</span>
          <span class="is-txt">
            <template v-for="(p, j) in step" :key="j">
              <span v-if="p.k != null" class="is-key">
                <Icon v-if="p.icon" :name="p.icon" :size="15" class="is-key-ico" />
                <span v-if="p.icon && !p.k" class="sr-only">แชร์</span>{{ p.k }}
              </span>
              <template v-else>{{ p.t }}</template>
            </template>
          </span>
        </li>
      </ol>

      <a
        v-if="installSheet.action && installSheet.action.href"
        class="is-btn is-primary"
        :href="installSheet.action.href"
      >{{ installSheet.action.label }}</a>
      <p v-if="installSheet.note" class="is-note">{{ installSheet.note }}</p>

      <button type="button" class="is-btn is-close" @click="closeInstallSheet">เข้าใจแล้ว</button>
    </div>
  </div>
</template>

<style scoped>
/* Above everything the site has (drawer, docks, consent bar): it is a modal. */
.is-root { position: fixed; inset: 0; z-index: 3000; }
.is-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.35); }
.is-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0 auto;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  background: var(--bg);
  color: var(--ink);
  border-radius: 16px 16px 0 0;
  border-top: 1px solid var(--line);
  box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.18);
  padding: 18px max(16px, env(safe-area-inset-left, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-right, 0px));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.is-sheet:focus { outline: none; }
.is-title {
  margin: 0;
  font-size: var(--fs-lg);
  line-height: var(--lh-snug);
  color: var(--brand);
}
.is-intro, .is-note { margin: 0; line-height: var(--lh-normal); }
.is-note { color: var(--muted); font-size: var(--fs-sm); }
.is-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.is-step { display: flex; gap: 10px; align-items: flex-start; line-height: var(--lh-loose); }
.is-n {
  flex: 0 0 28px;
  height: 28px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 15px;
}
.is-txt { min-width: 0; overflow-wrap: anywhere; }
.is-key {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0 7px;
  background: var(--cream);
  font-weight: 700;
  line-height: 1.6;
  vertical-align: baseline;
}
.is-key-ico { color: var(--brand); }
.is-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--touch-min);
  border-radius: 10px;
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
  padding: 8px 16px;
}
.is-primary { background: var(--brand); color: #fff; border: 1px solid var(--brand); }
.is-close { background: var(--bg); color: var(--ink); border: 1px solid var(--line); }
.is-btn:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
</style>
