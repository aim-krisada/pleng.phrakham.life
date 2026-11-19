<script setup>
// Top of the home page (ใบ v3/pleng#156 · #155 · #157 · #158 · install-design.html figures 1, 7, 8).
//   Not installed → the card "ติดตั้งเป็นแอพ ใช้ได้แม้ไม่มีเน็ต" + ONE ติดตั้งแอพ button + ✕.
//     The same card on every device; what the button does is decided in lib/pwaInstall.js.
//     The offline status rides inside the card as a small line (no ✕ of its own there).
//   Installed, seen from a normal browser tab (lib/pwaInstall.js appInstalled) → no card; a small
//     line "ติดตั้งแอพในเครื่องนี้แล้ว…" in its place, with a ✕ that is remembered for good.
//   Card closed with ✕, or app installed → no card, and the status line by these rules
//     (lib/offlineReady.js standaloneLine):
//     amber lines (saving %, not ready, at risk) always show, no ✕. The green "ready" line shows
//     with a ✕ until the reader closes it (remembered on this device); after that it comes back
//     by itself only when the saved song list changed (songs added, fixed or removed), saying so.
// Install from the ☰ menu still works after ✕ (design rule 5).
// ใบ v3/pleng#179 — when the green line says songs were updated, a "ดู" button opens the list of
// those songs and which part of each changed. Anyone sees it; who made the change is team-only, on
// the ประวัติการแก้เพลง page (/changes), which the list links to when the reader is logged in.
import { computed, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import {
  isStandalone, installCardDismissed, dismissInstallCard, startInstall,
  appInstalled, installedNoteDismissed, dismissInstalledNote,
} from '../lib/pwaInstall.js'
import {
  offlineStatus, statusText, watchOfflineStatus, standaloneLine, readyNews, dismissReadyLine, readyNewsList,
} from '../lib/offlineReady.js'
import { session } from '../store.js'
import { RouterLink } from 'vue-router'
import { GROUPS } from '../lib/changeLog.js'

const showCard = computed(() => !isStandalone.value && !appInstalled.value && !installCardDismissed.value)
const showInstalledNote = computed(() => !isStandalone.value && appInstalled.value && !installedNoteDismissed.value)
const status = computed(() => statusText(offlineStatus.value, readyNews.value))
const line = computed(() => standaloneLine(status.value, readyNews.value))

function onInstall(e) { startInstall(e.currentTarget) }

// the "ดู" list under the green line (ใบ #179)
const news = computed(() => (line.value && line.value.tone === 'ok' ? readyNewsList.value : null))
const newsOpen = ref(false)
watch(news, (v) => { if (!v) newsOpen.value = false })
const loggedIn = computed(() => !!session.value)
// the list in groups, most important first (changeLog.js GROUPS)
const groups = computed(() => {
  if (!news.value) return []
  return GROUPS.map((g) => ({ ...g, items: news.value.items.filter((it) => it.group === g.key) }))
    .filter((g) => g.items.length)
})
function partText(it) {
  return it.kind === 'edited' && it.parts.length ? 'แก้' + it.parts.join(' · แก้') : ''
}

onMounted(() => watchOfflineStatus())
</script>

<template>
  <section v-if="showCard" class="ic-card no-print" aria-labelledby="ic-title" data-test="install-card">
    <button type="button" class="ic-x" aria-label="ปิดกล่องติดตั้งแอพ" @click="dismissInstallCard">
      <Icon name="x" :size="20" />
    </button>
    <h2 id="ic-title" class="ic-title">ติดตั้งเป็นแอพ ใช้ได้แม้ไม่มีเน็ต</h2>
    <p class="ic-sub">มีไอคอนบนหน้าจอ เปิดเพลงได้ในโบสถ์ที่ไม่มีสัญญาณ</p>
    <p
      v-if="status"
      class="ic-status"
      :class="'ic-' + status.tone"
      role="status"
      data-test="offline-status"
    >{{ status.text }}</p>
    <button type="button" class="ic-btn" @click="onInstall">
      <Icon name="smartphone" :size="20" />
      <span>ติดตั้งแอพ</span>
    </button>
  </section>
  <template v-else>
    <div v-if="showInstalledNote" class="ic-line ic-note no-print" data-test="installed-note">
      <p class="ic-line-text">ติดตั้งแอพในเครื่องนี้แล้ว · เปิดจากไอคอน เพลง.พระคำ บนหน้าจอ ใช้ได้แม้ไม่มีเน็ต</p>
      <button type="button" class="ic-x ic-line-x" aria-label="ปิดข้อความติดตั้งแล้ว" @click="dismissInstalledNote">
        <Icon name="x" :size="20" />
      </button>
    </div>
    <div v-if="line" class="ic-line no-print" :class="'ic-' + line.tone" data-test="offline-line">
      <p class="ic-line-text" role="status" data-test="offline-status">{{ line.text }}</p>
      <button
        v-if="news"
        type="button"
        class="ic-see"
        :aria-expanded="newsOpen ? 'true' : 'false'"
        aria-controls="ic-news"
        data-test="news-see"
        @click="newsOpen = !newsOpen"
      >{{ newsOpen ? 'ซ่อน' : 'ดู' }}</button>
      <button
        v-if="line.closable"
        type="button"
        class="ic-x ic-line-x"
        aria-label="ปิดข้อความพร้อมใช้"
        data-test="ready-close"
        @click="dismissReadyLine"
      >
        <Icon name="x" :size="20" />
      </button>
    </div>
    <div v-if="news && newsOpen" id="ic-news" class="ic-news no-print" data-test="news-list">
      <p class="ic-news-head">เพลงที่เปลี่ยนตั้งแต่ครั้งก่อนที่ปิดข้อความนี้</p>
      <div class="ic-news-groups">
        <section v-for="g in groups" :key="g.key" class="ic-news-group" :data-test="'news-group-' + g.key">
          <h3 class="ic-news-gh">{{ g.label }} {{ g.items.length }} เพลง</h3>
          <ul class="ic-news-list">
            <li v-for="it in g.items" :key="it.id" data-test="news-item">
              <RouterLink :to="'/song/' + it.id" class="ic-news-song">
                <span v-if="it.number != null" class="ic-news-num">{{ it.number }}</span>{{ it.title || 'เพลงไม่มีชื่อ' }}
              </RouterLink>
              <span v-if="g.key === 'minor' && partText(it)" class="ic-news-kind">{{ partText(it) }}</span>
            </li>
          </ul>
        </section>
      </div>
      <p v-if="news.removed" class="ic-news-removed" data-test="news-removed">ถอนออกจากคลัง {{ news.removed }} เพลง</p>
      <RouterLink v-if="loggedIn" to="/changes" class="ic-news-team" data-test="news-team">
        ดูว่าใครแก้อะไร (เฉพาะทีม)
      </RouterLink>
    </div>
  </template>
</template>

<style scoped>
.ic-card {
  position: relative;
  margin: 0 0 var(--sp-4);
  padding: 14px 16px 16px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ic-title {
  margin: 0;
  padding-right: 40px; /* room for ✕ */
  font-size: var(--fs-lg);
  line-height: var(--lh-snug);
  color: var(--ink);
}
.ic-sub { margin: 0; color: var(--muted); font-size: var(--fs-sm); line-height: var(--lh-normal); }
.ic-x {
  position: absolute;
  top: 4px;
  right: 4px;
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  background: none;
  border: none;
  border-radius: 10px;
  color: var(--muted);
  cursor: pointer;
}
.ic-x:hover { background: rgba(139, 69, 19, 0.08); color: var(--ink); }
.ic-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--touch-min);
  margin-top: 4px;
  padding: 8px 16px;
  background: var(--brand);
  color: #fff;
  border: 1px solid var(--brand);
  border-radius: 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.ic-btn:hover { filter: brightness(1.08); }
.ic-x:focus-visible, .ic-btn:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
/* the offline line — green when ready, amber while saving or when not ready (design fig. 7–8) */
.ic-status, .ic-line {
  margin: 0;
  padding: 6px 10px;
  border-radius: 9px;
  font-size: var(--fs-sm);
  font-weight: 600;
  line-height: var(--lh-snug);
}
.ic-line {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: var(--sp-3);
  padding-right: 0;
}
.ic-line-text { margin: 0; flex: 1 1 auto; min-width: 0; }
/* the line's ✕ — same 44px target as the card's, sitting at the end of the line (ใบ #158) */
.ic-line-x {
  position: static;
  flex: 0 0 auto;
  margin: -6px 0;
  color: inherit;
}
/* "ดู" — a plain text button on the green line (ใบ #179), same 44px height as the ✕ */
.ic-see {
  flex: 0 0 auto;
  min-height: var(--touch-min);
  margin: -6px 0;
  padding: 0 10px;
  background: none;
  border: none;
  border-radius: 10px;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.ic-see:hover { background: rgba(34, 102, 62, 0.1); }
.ic-see:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
.ic-news {
  margin: calc(-1 * var(--sp-2)) 0 var(--sp-3);
  padding: 10px 12px;
  background: #f4faf6;
  border: 1px solid #cfe6d7;
  border-radius: 9px;
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
  color: var(--ink);
}
.ic-news-head { margin: 0 0 6px; font-weight: 700; color: #22663e; }
.ic-news-groups { max-height: 360px; overflow-y: auto; }
.ic-news-group + .ic-news-group { margin-top: 10px; }
.ic-news-gh { margin: 0 0 2px; font-size: var(--fs-sm); font-weight: 700; color: var(--ink); }
.ic-news-list { margin: 0; padding: 0; list-style: none; }
.ic-news-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  padding: 6px 0;
  border-top: 1px solid #e1efe6;
}
.ic-news-list li:first-child { border-top: none; }
.ic-news-song { color: var(--ink); font-weight: 600; text-decoration: none; min-width: 0; overflow-wrap: anywhere; }
.ic-news-song:hover { text-decoration: underline; }
.ic-news-num { display: inline-block; margin-right: 6px; color: var(--muted); font-variant-numeric: tabular-nums; }
.ic-news-kind { color: var(--muted); }
.ic-news-removed { margin: 6px 0 0; color: var(--muted); }
.ic-news-team { display: inline-block; margin-top: 8px; color: var(--brand); font-weight: 600; }
.ic-note { background: var(--cream); color: var(--ink); border: 1px solid var(--line); }
.ic-ok { background: #e8f4ec; color: #22663e; }
.ic-wait { background: #fff6e5; color: #7a4f00; }
</style>
