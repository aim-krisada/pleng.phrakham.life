<script setup>
// The "ติดตั้งแอพ" row in the ☰ drawer's เครื่องมือ section. Same logic and the same sheet as
// the home page card (lib/pwaInstall.js startInstall · InstallSheet.vue, ใบ v3/pleng#156), so
// it still works after the card was closed with ✕ (design rule 5).
//   • already installed / standalone → renders nothing. "Installed" also counts when seen from a
//     normal browser tab after installing (lib/pwaInstall.js appInstalled · ใบ v3/pleng#158).
//   • otherwise → one row; a tap closes the drawer, then opens the browser's own install dialog
//     or the steps sheet. Focus returns to ☰ when the sheet closes.
// Placement + shape follow docs/ds/menu-drawer-spec.md §3: an action = flat row (icon + label).
import Icon from './Icon.vue'
import { isStandalone, appInstalled, startInstall } from '../lib/pwaInstall.js'
import { shellMenu } from '../store.js'

function onInstall() {
  // Close the drawer first (ShellBar closes it when the shared menu channel leaves 'site');
  // PKDrawer then hands focus back to ☰, which is where it should land after the sheet too.
  if (shellMenu.value === 'site') shellMenu.value = null
  const burger = typeof document !== 'undefined' ? document.querySelector('.sb-burger') : null
  startInstall(burger || undefined)
}
</script>

<template>
  <!-- v-if on the root: when installed this renders no element at all, so the drawer's
       flex-gap leaves no empty slot. -->
  <div v-if="!isStandalone && !appInstalled" class="ia">
    <button type="button" class="ia-btn" @click="onInstall">
      <Icon name="smartphone" :size="20" />
      <span>ติดตั้งแอพ</span>
    </button>
  </div>
</template>

<style scoped>
/* Match the drawer nav row metrics (styles.css .sb-drawer-nav a): px-pinned padding, 44px
   touch target, brand hover — so the install action reads as one of the drawer's rows. */
.ia-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: var(--touch-min);
  padding: 10.2px 21.25px;
  background: none;
  border: none;
  border-radius: 10px;
  color: var(--brand);
  font: inherit;
  font-size: 17.34px;
  font-weight: 700;
  text-align: start;
  cursor: pointer;
}
.ia-btn:hover { background: rgba(139, 69, 19, 0.08); }
.ia-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.ia-btn .icn { flex: 0 0 auto; }
</style>
