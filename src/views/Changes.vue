<script setup>
// ประวัติการแก้เพลง (ใบ v3/pleng#179) — the team sees every change to the PUBLISHED song library,
// newest first: when, which song, who, and what changed (old → new). It answers "อัปเดตเพลงให้แล้ว
// อัตโนมัติ · แก้ 6 เพลง — แก้อะไร ใครแก้" (พี่เปา, via P'Aim 19 พ.ย. 2569).
//
// Source: song_revisions, written by the database trigger on every change to `songs` (db/004) — so
// changes made from the import key or by hand in the database show too. Team only: the table can be
// read by logged-in users only (db/002 policy), and the page shows nothing to a visitor.
// Drafts are left out: a visitor's device never gets them, so they never make the green line move.
import { ref, computed, watch } from 'vue'
import { supabase } from '../supabase.js'
import { session } from '../store.js'
import { collapseOpGroups, eventMeta, actorLabel } from '../lib/auditLog.js'
import { changedParts, changeDetails, dayLabel, timeLabel } from '../lib/changeLog.js'

const PAGE = 50

const loggedIn = computed(() => !!session.value)
const rows = ref([])       // raw song_revisions rows, newest first
const loading = ref(false)
const error = ref('')
const more = ref(true)     // the last read returned a full page
const open = ref({})       // { entryId: true } — details shown

async function load(reset) {
  if (!loggedIn.value || loading.value) return
  loading.value = true
  error.value = ''
  const from = reset ? 0 : rows.value.length
  const { data, error: err } = await supabase
    .from('song_revisions')
    .select('id, created_at, song_ref, entity, event, actor_id, actor_name, before, after, note, op_group')
    .eq('entity', 'song')
    .order('id', { ascending: false })
    .range(from, from + PAGE - 1)
  loading.value = false
  if (err) { error.value = 'อ่านประวัติไม่ได้ ลองใหม่ภายหลัง'; return }
  const got = data || []
  rows.value = reset ? got : rows.value.concat(got)
  more.value = got.length === PAGE
}
watch(loggedIn, (v) => { if (v) load(true); else rows.value = [] }, { immediate: true })

// One entry per change, grouped by day.
const days = computed(() => {
  const out = []
  for (const r of collapseOpGroups(rows.value)) {
    const before = r.before ?? null
    const after = r.after ?? null
    const song = after || before || {}
    const entry = {
      id: r.id,
      at: r.created_at,
      songId: song.id || r.song_ref,
      number: song.number ?? null,
      title: song.title_th || song.title_en || 'เพลงไม่มีชื่อ',
      label: eventMeta(r.event).label,
      who: actorLabel(r) === 'ไม่ทราบชื่อ' ? 'ระบบ (ไม่มีชื่อคนแก้)' : actorLabel(r),
      parts: before && after ? changedParts(before, after) : [],
      details: changeDetails(before, after),
      gone: !after,
      note: r.note || '',
    }
    const day = dayLabel(r.created_at)
    if (!out.length || out[out.length - 1].day !== day) out.push({ day, entries: [] })
    out[out.length - 1].entries.push(entry)
  }
  return out
})

function toggle(id) { open.value = { ...open.value, [id]: !open.value[id] } }
</script>

<template>
  <div class="changes-page">
    <h2 class="ch-title">ประวัติการแก้เพลง</h2>
    <p class="muted ch-why">ทุกครั้งที่เพลงในคลังเปลี่ยน ใครแก้ และแก้อะไร ⇒ ใช้ตอบว่าข้อความ “อัปเดตเพลงให้แล้วอัตโนมัติ” หมายถึงอะไร</p>

    <div v-if="!loggedIn" class="card" data-test="ch-login">
      <p style="margin: 0">หน้านี้สำหรับทีมทำเพลง ต้องเข้าระบบก่อน</p>
    </div>

    <template v-else>
      <p v-if="error" class="card ch-err" role="alert">{{ error }}</p>
      <p v-else-if="!rows.length && loading" class="card muted">กำลังโหลด…</p>
      <p v-else-if="!rows.length" class="card muted">ยังไม่มีประวัติการแก้เพลง</p>

      <section v-for="d in days" :key="d.day" class="ch-day">
        <h3 class="ch-day-h">{{ d.day }}</h3>
        <ul class="card ch-list">
          <li v-for="e in d.entries" :key="e.id" class="ch-item" data-test="ch-item">
            <div class="ch-row">
              <span class="ch-time">{{ timeLabel(e.at) }}</span>
              <router-link v-if="!e.gone" :to="'/song/' + e.songId" class="ch-song">
                <span v-if="e.number != null" class="ch-num">{{ e.number }}</span>{{ e.title }}
              </router-link>
              <span v-else class="ch-song">
                <span v-if="e.number != null" class="ch-num">{{ e.number }}</span>{{ e.title }}
              </span>
            </div>
            <p class="ch-what">
              <b>{{ e.label }}</b> โดย <span data-test="ch-who">{{ e.who }}</span>
              <template v-if="e.parts.length"> · แก้{{ e.parts.join(' · แก้') }}</template>
            </p>
            <p v-if="e.note" class="ch-note">หมายเหตุ: {{ e.note }}</p>
            <button
              v-if="e.details.length"
              type="button"
              class="ch-more"
              :aria-expanded="open[e.id] ? 'true' : 'false'"
              data-test="ch-detail-btn"
              @click="toggle(e.id)"
            >{{ open[e.id] ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด' }}</button>
            <ol v-if="open[e.id]" class="ch-details" data-test="ch-details">
              <li v-for="(t, i) in e.details" :key="i">{{ t }}</li>
            </ol>
          </li>
        </ul>
      </section>

      <button v-if="rows.length && more" type="button" class="ch-load" :disabled="loading" @click="load(false)">
        {{ loading ? 'กำลังโหลด…' : 'โหลดเพิ่ม' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.changes-page { max-width: 820px; margin-inline: auto; padding: 0 16px 32px; }
.ch-title { margin: 8px 0 4px; }
.ch-why { margin: 0 0 14px; font-size: 0.9em; }
.ch-err { color: var(--red, #c0392b); }
.ch-day { margin-top: 18px; }
.ch-day-h { margin: 0 0 6px; font-size: var(--fs-md, 1rem); }
.ch-list { list-style: none; margin: 0; padding: 4px 14px; }
.ch-item { padding: 10px 0; border-top: 1px solid var(--line); }
.ch-item:first-child { border-top: 0; }
.ch-row { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.ch-time { flex: 0 0 auto; color: var(--muted, #666); font-variant-numeric: tabular-nums; font-size: 0.9em; }
.ch-song { font-weight: 700; color: var(--ink); text-decoration: none; min-width: 0; overflow-wrap: anywhere; }
a.ch-song:hover { text-decoration: underline; }
.ch-num { margin-right: 6px; color: var(--muted, #666); font-weight: 600; }
.ch-what { margin: 2px 0 0; overflow-wrap: anywhere; }
.ch-note { margin: 2px 0 0; color: var(--muted, #666); overflow-wrap: anywhere; }
.ch-more {
  margin-top: 4px; min-height: 36px; padding: 0 10px; background: none;
  border: 1px solid var(--line); border-radius: 8px; color: var(--brand, #8b4513);
  font: inherit; font-size: 0.9em; font-weight: 600; cursor: pointer;
}
.ch-more:focus-visible, .ch-load:focus-visible { outline: 3px solid var(--brand, #8b4513); outline-offset: 2px; }
.ch-details { margin: 8px 0 0; padding-left: 1.6em; font-size: 0.92em; line-height: 1.6; overflow-wrap: anywhere; }
.ch-load {
  display: block; margin: 18px auto 0; min-height: 44px; padding: 0 18px;
  background: var(--card, #fff); border: 1px solid var(--line); border-radius: 10px;
  font: inherit; font-weight: 600; cursor: pointer;
}
</style>
