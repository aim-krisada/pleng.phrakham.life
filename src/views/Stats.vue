<script setup>
// หน้าสถิติ (ใบ v3/pleng#163 stat.02 · #170 stat.09) — the team sees how the site is used without
// opening Google Analytics. Team only: logged out, the page shows no numbers at all (AC 3).
//
// Three sections (AC 1). The Google cards (ภาพรวม · การใช้งานแอป) need a server-side middleman that
// holds the read key (Security 1) and P'Aim's grant in Google — not built yet, so they say so plainly
// instead of showing 0 (AC 5). The team-drafts card (stat.09) reads our own song_drafts and works now.
import { ref, computed, watch } from 'vue'
import { supabase } from '../supabase.js'
import { session, tier, legacy } from '../store.js'
import { RANGES, rangeLabel, draftStats } from '../lib/teamStats.js'
import { overview, gaErrorText } from '../lib/gaStats.js'

const days = ref(28)
const loggedIn = computed(() => !!session.value)
const label = computed(() => rangeLabel(days.value))

const drafts = ref(null) // null = not read yet
const draftsError = ref('')
async function loadDrafts() {
  if (!loggedIn.value || legacy.value) return
  // '*' so deleted_at (db/015) comes along; RLS gives an approver every draft, an editor only their own
  const { data, error } = await supabase.from('song_drafts').select('*').order('updated_at', { ascending: false })
  draftsError.value = error ? 'อ่านงานร่างไม่ได้ ลองใหม่ภายหลัง' : ''
  drafts.value = error ? [] : data || []
}
watch(loggedIn, (v) => v && loadDrafts(), { immediate: true })

const work = computed(() => (drafts.value ? draftStats(drafts.value, days.value) : null))

// ── Google numbers, through the ga-stats Edge Function (it holds the key and checks the login) ──
const ga = ref(null) // the bundle, or null while loading / on error
const gaError = ref('')
let gaAsk = 0
async function loadGa() {
  if (!loggedIn.value) return
  const ask = ++gaAsk
  ga.value = null
  gaError.value = ''
  let status = 0
  let data = null
  try {
    const res = await supabase.functions.invoke('ga-stats', { body: { days: days.value } })
    data = res.data
    status = res.error ? res.error.context?.status || 500 : 200
  } catch {
    status = 500
  }
  if (ask !== gaAsk) return // the range changed while we waited
  if (status !== 200 || !data?.reports) gaError.value = gaErrorText(status)
  else ga.value = data
}
watch([loggedIn, days], ([v]) => v && loadGa(), { immediate: true })
const ov = computed(() => (ga.value ? overview(ga.value, days.value) : null))
const fetchedAt = computed(() =>
  ga.value?.fetchedAt
    ? new Date(ga.value.fetchedAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '',
)
const barTitle = (b) => {
  const d = `${+b.date.slice(6)}/${+b.date.slice(4, 6)}`
  return b.started ? `${d} · ${b.web + b.app} คน (แอป ${b.app})` : `${d} · ยังไม่ได้เริ่มนับ`
}
</script>

<template>
  <div class="stats-page">
    <h2 class="st-title">สถิติ</h2>

    <div v-if="!loggedIn" class="card">
      <p style="margin: 0">หน้านี้สำหรับทีมทำเพลง ต้องเข้าระบบก่อน</p>
    </div>

    <template v-else>
      <div class="st-head">
        <div class="st-range" role="group" aria-label="ช่วงวันที่">
          <button
            v-for="r in RANGES"
            :key="r"
            class="st-chip"
            :class="{ on: days === r }"
            :aria-pressed="days === r"
            @click="days = r"
          >{{ r }} วัน</button>
        </div>
        <p class="st-label">{{ label }}</p>
        <p class="muted st-note">ตัวเลขการใช้งานนับเฉพาะคนที่กดยอมรับการนับ</p>
      </div>

      <section class="st-sec">
        <h3>ภาพรวม</h3>
        <p class="muted st-why">ใช้ดูว่าเว็บมีคนใช้มากขึ้นหรือน้อยลง</p>
        <div v-if="gaError" class="card st-card st-wait">{{ gaError }}</div>
        <div v-else-if="!ov" class="card st-card muted">กำลังโหลด…</div>
        <div v-else class="card st-card st-overview">
          <h4>คนใช้เว็บ</h4>
          <div class="st-big">
            <b class="st-n">{{ ov.users.toLocaleString('th-TH') }}</b>
            <span>คน ใน {{ days }} วันนี้</span>
            <span v-if="ov.change != null" class="st-chg" :class="ov.change >= 0 ? 'up' : 'down'">
              {{ ov.change >= 0 ? '+' : '' }}{{ ov.change }}% จาก {{ days }} วันก่อน
            </span>
            <span v-else class="muted st-chg">ยังเทียบกับช่วงก่อนไม่ได้ ⇒ ตอนนั้นยังไม่ได้เริ่มนับ</span>
          </div>
          <p v-if="ov.appShare != null" class="st-app">
            เปิดจากแอป {{ ov.appShare }}%<template v-if="ov.prevAppShare != null"> · {{ days }} วันก่อน {{ ov.prevAppShare }}%</template>
          </p>
          <div class="st-bars" role="img" :aria-label="`คนใช้รายวัน ${days} วัน`">
            <div v-for="b in ov.bars" :key="b.date" class="st-bar" :class="{ off: !b.started, we: b.weekend }" :title="barTitle(b)">
              <template v-if="b.started">
                <span class="st-bar-web" :style="{ height: (b.web / ov.max) * 100 + '%' }"></span>
                <span class="st-bar-app" :style="{ height: (b.app / ov.max) * 100 + '%' }"></span>
              </template>
            </div>
          </div>
          <p class="st-legend">
            <span><i class="sw web"></i> เว็บ วันธรรมดา</span>
            <span><i class="sw web we"></i> เว็บ เสาร์อาทิตย์</span>
            <span><i class="sw app"></i> แอปที่ติดตั้ง</span>
          </p>
          <p v-if="ov.notStartedDays" class="muted st-small">ช่องว่างทางซ้าย {{ ov.notStartedDays }} วัน ⇒ ยังไม่ได้เริ่มนับ</p>
          <p v-if="ov.weekdayAvg != null">
            วันธรรมดาเฉลี่ยวันละ {{ ov.weekdayAvg }} คน<template v-if="ov.weekendAvg != null"> · เสาร์อาทิตย์เฉลี่ยวันละ {{ ov.weekendAvg }} คน</template>
          </p>
          <div v-if="ov.busiest" class="st-parts">
            <span v-for="p in ov.dayParts" :key="p.name" :class="{ top: p.name === ov.busiest }">{{ p.name }} {{ p.share }}%</span>
          </div>
          <p class="muted st-small">ตัวเลข ณ {{ fetchedAt }}<template v-if="ga.stale"> ⇒ ดึงรอบล่าสุดไม่สำเร็จ นี่คือตัวเลขรอบก่อน</template></p>
        </div>
      </section>

      <section class="st-sec">
        <h3>งานเพลง</h3>
        <p class="muted st-why">ใช้ตัดสินว่าสัปดาห์นี้ควรเร่งพิมพ์เพลงใหม่ หรือเคลียร์งานที่รอตรวจก่อน</p>
        <div class="card st-card st-drafts">
          <h4>งานที่ค้างอยู่</h4>
          <p v-if="tier !== 'approver'" class="muted st-own">คุณเห็นเฉพาะงานของคุณเอง</p>
          <p v-if="draftsError" class="st-err">{{ draftsError }}</p>
          <p v-else-if="!work" class="muted">กำลังโหลด…</p>
          <template v-else>
            <div class="st-nums">
              <div><b class="st-n">{{ work.draft }}</b><span>ร่าง</span></div>
              <div><b class="st-n">{{ work.pending }}</b><span>รอตรวจ</span></div>
              <div><b class="st-n">{{ work.approved }}</b><span>อนุมัติใน {{ days }} วันนี้</span></div>
            </div>
            <p v-if="!work.oldest.length" class="muted st-none">ไม่มีงานรอตรวจ</p>
            <template v-else>
              <p class="st-sub">รอตรวจนานที่สุด</p>
              <router-link
                v-for="d in work.oldest"
                :key="d.id"
                class="st-row"
                :to="`/studio?draft=${encodeURIComponent(d.id)}`"
              >
                <span class="st-row-t">{{ d.number != null ? d.number + '. ' : '' }}{{ d.title }}</span>
                <span class="st-row-d">{{ d.days }} วัน</span>
              </router-link>
            </template>
          </template>
        </div>
      </section>

      <section class="st-sec">
        <h3>การใช้งานแอป</h3>
        <p class="muted st-why">ใช้ตัดสินว่าควรปรับปุ่มไหน หรือเพิ่มเพลงอะไร</p>
        <div v-if="gaError" class="card st-card st-wait">{{ gaError }}</div>
        <div v-else class="card st-card st-wait">การ์ดชุดนี้กำลังทำ ⇒ รอตัวเลขสะสมสักระยะ</div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats-page { max-width: 820px; margin-inline: auto; padding: 0 16px 32px; }
.st-title { margin: 8px 0 12px; }
.st-head { margin-bottom: 8px; }
.st-range { display: flex; gap: 8px; flex-wrap: wrap; }
.st-chip {
  appearance: none; min-height: 38px; padding: 0 14px; border-radius: 999px;
  border: 1px solid var(--line); background: var(--card, #fff); color: inherit; font: inherit; cursor: pointer;
}
.st-chip.on { background: var(--accent, #2b6cb0); border-color: var(--accent, #2b6cb0); color: #fff; font-weight: 600; }
.st-label { margin: 10px 0 2px; font-weight: 600; }
.st-note { margin: 0; font-size: 0.9em; }
.st-sec { margin-top: 22px; }
.st-sec h3 { margin: 0; }
.st-why { margin: 2px 0 10px; font-size: 0.9em; }
.st-card h4 { margin: 0 0 8px; }
.st-wait { color: var(--muted, #666); }
.st-own { margin: 0 0 8px; font-size: 0.9em; }
.st-err { color: var(--red, #c0392b); margin: 0; }
.st-nums { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.st-nums > div { display: flex; flex-direction: column; align-items: flex-start; }
.st-n { font-size: 1.8em; line-height: 1.1; }
.st-nums span { font-size: 0.9em; color: var(--muted, #666); }
.st-sub { margin: 14px 0 4px; font-weight: 600; }
.st-none { margin: 14px 0 0; }
.st-row {
  display: flex; justify-content: space-between; gap: 12px; padding: 10px 0;
  border-top: 1px solid var(--line); color: inherit; text-decoration: none;
}
.st-row-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-row-d { flex: 0 0 auto; font-weight: 600; }
.st-big { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.st-chg { font-size: 0.9em; }
.st-chg.up { color: var(--green, #2f855a); }
.st-chg.down { color: var(--red, #c0392b); }
.st-app { margin: 6px 0 10px; }
.st-bars { display: flex; align-items: flex-end; gap: 2px; height: 120px; border-bottom: 1px solid var(--line); }
.st-bar { flex: 1 1 0; min-width: 0; height: 100%; display: flex; flex-direction: column-reverse; }
.st-bar.off { background: repeating-linear-gradient(45deg, transparent 0 3px, var(--line) 3px 4px); opacity: 0.6; }
.st-bar-web { background: #8fb3d9; }
.st-bar.we .st-bar-web { background: #d9a35f; }
.st-bar-app { background: #2b6cb0; }
.st-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 8px 0 4px; font-size: 0.85em; }
.sw { display: inline-block; width: 10px; height: 10px; margin-right: 4px; vertical-align: middle; background: #8fb3d9; }
.sw.we { background: #d9a35f; }
.sw.app { background: #2b6cb0; }
.st-small { font-size: 0.85em; margin: 4px 0; }
.st-parts { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.st-parts span { padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); font-size: 0.9em; }
.st-parts span.top { background: var(--accent, #2b6cb0); border-color: var(--accent, #2b6cb0); color: #fff; font-weight: 600; }
</style>
