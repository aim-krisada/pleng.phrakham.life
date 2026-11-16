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
        <div class="card st-card st-wait">ยังไม่ได้เชื่อมตัวเลขจาก Google ⇒ ตัวเลขชุดนี้จะขึ้นเมื่อเชื่อมเสร็จ</div>
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
        <div class="card st-card st-wait">ยังไม่ได้เชื่อมตัวเลขจาก Google ⇒ ตัวเลขชุดนี้จะขึ้นเมื่อเชื่อมเสร็จ</div>
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
</style>
