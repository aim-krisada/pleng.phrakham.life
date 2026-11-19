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
import {
  overview, gaErrorText, songIds, topSongs, regions, sources, notFound, foundNoPick, needsFix, keyChanges,
  features, deadEnds, openFrom, devices, dayTicks, actions, visitors, featureSongs, advice, summaryText,
} from '../lib/gaStats.js'
import { readCatalog, CATALOG_COLUMNS } from '../lib/offlineSongs.js'
import { fetchAllRows } from '../lib/fetchAllRows.js'
import { filterSongs } from '../lib/songSearch.js'
import { songParts } from '../lib/analytics.js'
import { categoryName } from '../lib/bookshelf.js'

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
const ticks = computed(() => (ov.value ? dayTicks(ov.value.bars.map((b) => b.date)) : []))
// an edge label is pinned to the edge instead of centred, so it never sticks out of the card
const tickStyle = (t) =>
  t.at > 92 ? { right: '0' } : t.at < 8 ? { left: '0' } : { left: t.at + '%', transform: 'translateX(-50%)' }
const barTitle = (b) => {
  const d = `${+b.date.slice(6)}/${+b.date.slice(4, 6)}`
  return b.started ? `${d} · ${b.web + b.app} คน (แอป ${b.app})` : `${d} · ยังไม่ได้เริ่มนับ`
}

// ── the songs the numbers point at (ใบ v3/pleng#165–#174) ──
// Google only knows song ids. Names, books and content come from the catalog this device already keeps
// for offline use (no extra download when it is there); anything not in it — a song still waiting for
// ตรวจแล้ว, or one in the trash — is read by id. A song found nowhere was removed for good.
const songs = ref(new Map())
const catalog = ref([])
async function loadSongs(bundle) {
  let rows = (await readCatalog())?.rows || []
  if (!rows.length) {
    const { data } = await fetchAllRows(() =>
      supabase.from('songs').select(CATALOG_COLUMNS).is('deleted_at', null).order('number', { ascending: true }).order('id', { ascending: true }),
    )
    rows = data || []
  }
  catalog.value = rows
  const map = new Map(rows.map((r) => [String(r.id), r]))
  const missing = songIds(bundle).filter((id) => !map.has(String(id)))
  if (missing.length) {
    const { data } = await supabase.from('songs').select('id, number, title_th, category, content, deleted_at').in('id', missing.slice(0, 300))
    for (const r of data || []) map.set(String(r.id), r)
  }
  songs.value = map
}
watch(ga, (b) => b && loadSongs(b))

const songLabel = (s) => (s ? `${s.number != null ? s.number + '. ' : ''}${s.title_th || ''}` : 'เพลงที่ลบไปแล้ว')
const bookOf = (s) => (s ? categoryName(s.category) : '')
const firstSong = (term) => filterSongs(catalog.value, term)[0] || null

const cards = computed(() => {
  const b = ga.value
  if (!b) return null
  const m = songs.value
  return {
    top: topSongs(b, m, { prevComparable: !!ov.value?.prevComparable }),
    regions: regions(b),
    sources: sources(b),
    notFound: notFound(b),
    noPick: foundNoPick(b, firstSong),
    fix: needsFix(b, m, songParts),
    keys: keyChanges(b, m),
    features: features(b, m),
    dead: deadEnds(b, m),
    from: openFrom(b),
    devices: devices(b),
    actions: actions(b),
    visitors: visitors(b),
    starred: featureSongs(b, m, 'star'),
    english: featureSongs(b, m, 'lang_en'),
  }
})

// พี่เอม 18 พ.ย. 2569 — one line under each section: what to do about these numbers
const tips = computed(() => advice({ ov: ov.value, cards: cards.value, work: work.value }))

// a short summary to send on (LINE) — พี่เปา reads it without opening this page
const summary = computed(() =>
  ov.value || cards.value
    ? summaryText({ days: days.value, label: label.value, ov: ov.value, cards: cards.value, work: work.value, tips: tips.value })
    : '')
const summaryNote = ref('')
async function sendSummary() {
  const text = summary.value
  if (!text) return
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text })
      summaryNote.value = ''
      return
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return
  }
  try {
    await navigator.clipboard.writeText(text)
    summaryNote.value = 'คัดลอกแล้ว ⇒ ไปวางในไลน์ได้เลย'
  } catch {
    summaryNote.value = 'คัดลอกไม่ได้ ⇒ กดค้างที่ข้อความแล้วเลือกคัดลอก'
  }
}
</script>

<template>
  <div class="stats-page">
    <h2 class="st-title">สถิติ</h2>

    <div v-if="!loggedIn" class="card">
      <p style="margin: 0">หน้านี้สำหรับทีมทำเพลง ต้องเข้าระบบก่อน</p>
    </div>

    <template v-else>
      <!-- ใบ v3/pleng#179 — who changed which song, and what -->
      <router-link to="/changes" class="st-changes" data-test="st-changes">ประวัติการแก้เพลง ⇒ ใครแก้เพลงไหน แก้อะไร</router-link>
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

      <!-- พี่เอม 18 พ.ย. 2569 — สรุปสั้น ๆ ส่งต่อในไลน์ได้ ไม่ต้องเปิดหน้านี้ก็รู้เรื่อง -->
      <section v-if="summary" class="st-sec" data-test="st-summary">
        <h3>สรุปสั้น ๆ</h3>
        <p class="muted st-why">ส่งต่อในไลน์ได้ คนที่ไม่ได้เปิดหน้านี้ก็รู้เรื่อง</p>
        <div class="card st-card">
          <pre class="st-summary">{{ summary }}</pre>
          <button type="button" class="st-send" data-test="st-send" @click="sendSummary">ส่งสรุปนี้</button>
          <p v-if="summaryNote" class="muted st-small" role="status">{{ summaryNote }}</p>
        </div>
      </section>

      <section class="st-sec">
        <h3>ภาพรวม</h3>
        <p class="muted st-why">ใช้ดูว่าเว็บมีคนใช้มากขึ้นหรือน้อยลง</p>
        <p v-if="tips.overview" class="st-tip" data-test="tip-overview">{{ tips.overview }}</p>
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
          <div class="st-ticks" aria-hidden="true">
            <span v-for="t in ticks" :key="t.i" :style="tickStyle(t)">{{ t.label }}</span>
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

        <template v-if="cards">
          <!-- ใบ v3/pleng#165 stat.04 -->
          <div class="card st-card st-top">
            <h4>เพลงที่คนเปิดมากที่สุด</h4>
            <p v-if="!cards.top.length" class="muted st-none">ยังไม่มีคนเปิดเพลงในช่วงนี้</p>
            <ol v-else class="st-ol">
              <li v-for="r in cards.top" :key="r.id" :class="{ gone: r.removed }">
                <router-link v-if="!r.removed" :to="'/song/' + r.id" class="st-li-t">{{ songLabel(r.song) }}</router-link>
                <span v-else class="st-li-t">{{ songLabel(r.song) }} <em>ลบแล้ว</em></span>
                <span v-if="bookOf(r.song)" class="st-book">{{ bookOf(r.song) }}</span>
                <span v-if="r.isNew" class="st-new">ใหม่</span>
                <b class="st-li-n">{{ r.opens }} ครั้ง</b>
              </li>
            </ol>
          </div>

          <!-- ใบ v3/pleng#166 stat.05 -->
          <div class="card st-card st-where">
            <h4>คนใช้อยู่ที่ไหน</h4>
            <p v-if="!cards.regions.total" class="muted st-none">ยังไม่มีตัวเลข</p>
            <div v-for="r in cards.regions.rows" :key="r.name" class="st-li">
              <span class="st-li-t">{{ r.name }}</span><span class="st-meter"><i :style="{ width: r.pct + '%' }"></i></span><b class="st-li-n">{{ r.pct }}%</b>
            </div>
            <p class="muted st-small">จังหวัดเป็นค่าประมาณ ⇒ Google เดาจากเครือข่ายเน็ต คนใช้เน็ตมือถือมักถูกเดาเป็นกรุงเทพ</p>
            <p class="st-sub">มาถึงเว็บทางไหน</p>
            <p v-if="!cards.sources.total" class="muted st-none">ยังไม่มีตัวเลข</p>
            <div v-for="r in cards.sources.rows" :key="r.name" class="st-li">
              <span class="st-li-t">{{ r.name }}</span><span class="st-meter"><i :style="{ width: r.pct + '%' }"></i></span><b class="st-li-n">{{ r.pct }}%</b>
            </div>
          </div>
        </template>
      </section>

      <section class="st-sec">
        <h3>งานเพลง</h3>
        <p class="muted st-why">ใช้ตัดสินว่าสัปดาห์นี้ควรเร่งพิมพ์เพลงใหม่ หรือเคลียร์งานที่รอตรวจก่อน</p>
        <p v-if="tips.songs" class="st-tip" data-test="tip-songs">{{ tips.songs }}</p>
        <div v-if="gaError" class="card st-card st-wait">{{ gaError }}</div>
        <template v-else-if="cards">
          <!-- ใบ v3/pleng#167 stat.06 -->
          <div class="card st-card st-notfound">
            <h4>คำที่คนค้นแล้วไม่เจอเพลง</h4>
            <p v-if="!cards.notFound.anySearch" class="muted st-none">ยังไม่มีคนค้นในช่วงนี้</p>
            <p v-else-if="!cards.notFound.rows.length" class="st-none">ทุกคำค้นเจอเพลง</p>
            <div v-for="r in cards.notFound.rows" :key="r.term" class="st-li">
              <span class="st-li-t st-term">{{ r.term }}</span><b class="st-li-n">{{ r.notFound }} ครั้ง</b>
            </div>
          </div>

          <!-- ใบ v3/pleng#169 stat.08 -->
          <div class="card st-card st-nopick">
            <h4>ค้นเจอเพลง แต่ไม่มีใครกดเข้าไป</h4>
            <p v-if="!cards.noPick.length" class="muted st-none">ยังไม่มีคำแบบนี้ ⇒ นับเฉพาะคำที่ค้น 3 ครั้งขึ้นไป</p>
            <div v-for="r in cards.noPick" :key="r.term" class="st-li st-li-2">
              <span class="st-li-t"><span class="st-term">{{ r.term }}</span> <span class="muted">ขึ้นเพลงแรกเป็น {{ r.first ? songLabel(r.first) : '?' }}</span></span>
              <b class="st-li-n">{{ r.searches }} ครั้ง</b>
            </div>
          </div>

          <!-- ใบ v3/pleng#168 stat.07 -->
          <div class="card st-card st-fix">
            <h4>เพลงที่คนเปิดบ่อย แต่ยังต้องแก้</h4>
            <p v-if="!cards.fix.length" class="muted st-none">เพลงที่คนเปิดมีโน้ตและคอร์ดครบ</p>
            <div v-for="r in cards.fix" :key="r.id" class="st-li st-li-2">
              <router-link :to="'/song/' + r.id" class="st-li-t">{{ songLabel(r.song) }} <span class="st-miss">ยังไม่มี{{ r.missing.join('และ') }}</span></router-link>
              <b class="st-li-n">{{ r.opens }} ครั้ง</b>
            </div>
            <p class="st-sub">เพลงที่คนเปลี่ยนคีย์บ่อย</p>
            <p v-if="!cards.keys.length" class="muted st-none">ยังไม่มีใครเปลี่ยนคีย์</p>
            <div v-for="r in cards.keys" :key="r.id" class="st-li st-li-2">
              <router-link :to="'/song/' + r.id" class="st-li-t">{{ songLabel(r.song) }} <span class="muted">ตั้งไว้ {{ r.setKey || '?' }} ⇒ คนเปลี่ยนเป็น {{ r.topTo }} บ่อยสุด</span></router-link>
              <b class="st-li-n">{{ r.n }} ครั้ง</b>
            </div>
          </div>
        </template>
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
        <p v-if="tips.app" class="st-tip" data-test="tip-app">{{ tips.app }}</p>
        <div v-if="gaError" class="card st-card st-wait">{{ gaError }}</div>
        <div v-else-if="!cards" class="card st-card muted">กำลังโหลด…</div>
        <template v-else>
          <!-- ใบ v3/pleng#171 stat.10 -->
          <div class="card st-card st-features">
            <h4>ในทุก 100 ครั้งที่เปิดเพลง ใช้ปุ่มไหนบ้าง</h4>
            <p v-if="cards.features.every((f) => f.low)" class="muted st-none">ข้อมูลยังน้อย ⇒ เปิดเพลงไม่ถึง 30 ครั้ง</p>
            <template v-else>
              <div v-for="f in cards.features" :key="f.key" class="st-li">
                <span class="st-li-t">{{ f.name }}</span>
                <span v-if="f.low" class="muted st-li-n">ข้อมูลยังน้อย</span>
                <template v-else><span class="st-meter"><i :style="{ width: f.pct + '%' }"></i></span><b class="st-li-n">{{ f.pct }}%</b></template>
              </div>
              <p class="muted st-small">ข้ามท่อน นับเฉพาะเพลงที่มีหลายท่อน · เนื้ออังกฤษ เนื้อจีน นับเฉพาะเพลงที่มีภาษานั้น</p>
            </template>
          </div>

          <!-- ใบ v3/pleng#172 stat.11 -->
          <div class="card st-card st-dead">
            <h4>จุดที่คนเปิดเพลงแล้วติด</h4>
            <p v-if="!cards.dead.total" class="st-none">ยังไม่มีใครติด</p>
            <template v-else>
              <div v-for="k in cards.dead.kinds" :key="k.key" class="st-li">
                <span class="st-li-t">{{ k.name }}</span><b class="st-li-n">{{ k.n }} ครั้ง</b>
              </div>
              <p class="st-sub">เพลงที่เจอบ่อยที่สุด</p>
              <div v-for="r in cards.dead.songs" :key="r.id" class="st-li st-li-2">
                <router-link :to="'/song/' + r.id" class="st-li-t">{{ songLabel(r.song) }} <span class="muted">{{ r.kinds.join(' · ') }}</span></router-link>
                <b class="st-li-n">{{ r.n }} ครั้ง</b>
              </div>
            </template>
          </div>

          <!-- ใบ v3/pleng#173 stat.12 -->
          <div class="card st-card st-from">
            <h4>คนหาเพลงด้วยวิธีไหน</h4>
            <p v-if="cards.from.low" class="muted st-none">ข้อมูลยังน้อย ⇒ เปิดเพลงไม่ถึง 30 ครั้ง</p>
            <template v-else>
              <div v-for="r in cards.from.rows" :key="r.key" class="st-li">
                <span class="st-li-t">{{ r.name }}</span><span class="st-meter"><i :style="{ width: r.pct + '%' }"></i></span><b class="st-li-n">{{ r.pct }}%</b>
              </div>
            </template>
          </div>

          <!-- ใบ v3/pleng#174 stat.13 -->
          <div class="card st-card st-devices">
            <h4>คนใช้เครื่องอะไร</h4>
            <p v-if="cards.devices.low" class="muted st-none">ข้อมูลยังน้อย ⇒ คนใช้ไม่ถึง 30 คน</p>
            <template v-else>
              <div v-for="r in cards.devices.devices" :key="r.name" class="st-li">
                <span class="st-li-t">{{ r.name }} <span class="muted">⇒ จากแอป {{ r.appPct }}%</span></span><span class="st-meter"><i :style="{ width: r.pct + '%' }"></i></span><b class="st-li-n">{{ r.pct }}%</b>
              </div>
              <p class="st-sub">ระบบของเครื่อง</p>
              <div v-for="r in cards.devices.systems" :key="r.name" class="st-li">
                <span class="st-li-t">{{ r.name }} <span class="muted">⇒ จากแอป {{ r.appPct }}%</span></span><span class="st-meter"><i :style="{ width: r.pct + '%' }"></i></span><b class="st-li-n">{{ r.pct }}%</b>
              </div>
            </template>
          </div>
        </template>
      </section>

      <!-- พี่เอม 18 พ.ย. 2569 — คนใหม่กับคนที่กลับมา · ดาว · การส่งต่อ · ขนาดตัวหนังสือ (เริ่มนับ 18 พ.ย. 2569) -->
      <section class="st-sec" data-test="st-more">
        <h3>คนใช้แบบไหน</h3>
        <p class="muted st-why">ใช้ดูว่าคนกลับมาใช้ซ้ำไหม และของที่เพิ่งเพิ่มมีคนใช้จริงไหม · เริ่มนับ 18 พ.ย. 2569</p>
        <p v-if="tips.more" class="st-tip" data-test="tip-more">{{ tips.more }}</p>
        <div v-if="gaError" class="card st-card st-wait">{{ gaError }}</div>
        <div v-else-if="!cards" class="card st-card muted">กำลังโหลด…</div>
        <template v-else>
          <div class="card st-card" data-test="st-visitors">
            <h4>คนใหม่ กับ คนที่กลับมาใช้ซ้ำ</h4>
            <p v-if="!cards.visitors.total" class="muted st-none">ยังไม่มีตัวเลข ⇒ เริ่มนับวันนี้ พรุ่งนี้จะเริ่มเห็น</p>
            <template v-else>
              <div class="st-li"><span class="st-li-t">เครื่องที่เข้ามาครั้งแรก</span><b class="st-li-n">{{ cards.visitors.fresh }} เครื่อง</b></div>
              <div class="st-li"><span class="st-li-t">กลับมาใช้ซ้ำ</span><b class="st-li-n">{{ cards.visitors.back }} ครั้ง</b></div>
              <p class="muted st-small">นับวันละครั้งต่อเครื่อง ⇒ คนเดียวใช้ 2 เครื่อง นับเป็น 2</p>
            </template>
          </div>
          <div class="card st-card" data-test="st-actions">
            <h4>ดาว การส่งต่อ และขนาดตัวหนังสือ</h4>
            <p v-if="!cards.actions.total" class="muted st-none">ยังไม่มีตัวเลข ⇒ เริ่มนับวันนี้ พรุ่งนี้จะเริ่มเห็น</p>
            <template v-else>
              <div v-for="r in cards.actions.rows" :key="r.key" class="st-li">
                <span class="st-li-t">{{ r.name }}</span><b class="st-li-n">{{ r.n }} ครั้ง</b>
              </div>
            </template>
            <template v-if="cards.starred && cards.starred.length">
              <p class="st-sub">เพลงที่คนกดดาวมากที่สุด</p>
              <div v-for="r in cards.starred" :key="r.id" class="st-li">
                <router-link :to="'/song/' + r.id" class="st-li-t">{{ songLabel(r.song) }}</router-link><b class="st-li-n">{{ r.n }} ครั้ง</b>
              </div>
            </template>
            <template v-if="cards.english && cards.english.length">
              <p class="st-sub">เพลงที่คนเปิดเนื้ออังกฤษมากที่สุด</p>
              <div v-for="r in cards.english" :key="r.id" class="st-li">
                <router-link :to="'/song/' + r.id" class="st-li-t">{{ songLabel(r.song) }}</router-link><b class="st-li-n">{{ r.n }} ครั้ง</b>
              </div>
            </template>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats-page { max-width: 820px; margin-inline: auto; padding: 0 16px 32px; }
.st-title { margin: 8px 0 12px; }
.st-changes { display: inline-block; margin: 0 0 12px; color: var(--brand, #8b4513); font-weight: 600; }
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
/* คำแนะนำ 1 บรรทัดต่อหัวข้อ — แถบซ้ายสีเดียวกับปุ่มหลัก ไม่ใช่สีอย่างเดียว (มีลูกศร ⇒ ในข้อความด้วย) */
.st-tip { margin: 0 0 10px; padding: 8px 12px; border-left: 4px solid var(--brand, #8b4513); background: var(--cream, #faf6ef); border-radius: 6px; font-weight: 600; overflow-wrap: anywhere; }
.st-summary { margin: 0 0 10px; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.6; }
.st-send { min-height: 44px; padding: 0 18px; border-radius: 8px; border: 1px solid var(--brand, #8b4513); background: var(--brand, #8b4513); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
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
.st-ticks { position: relative; height: 1.5em; font-size: 0.8em; color: var(--muted, #666); }
.st-ticks span { position: absolute; top: 3px; white-space: nowrap; }
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
.st-card + .st-card { margin-top: 12px; }
.st-ol { margin: 0; padding-left: 1.6em; }
.st-ol li { padding: 6px 0; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }
.st-ol li:first-child { border-top: 0; }
.st-ol li::marker { color: var(--muted, #666); }
.st-ol li.gone .st-li-t { color: var(--muted, #888); }
.st-ol li em { font-style: normal; font-size: 0.85em; }
.st-li { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid var(--line); }
.st-li-2 { align-items: flex-start; }
.st-li-t { flex: 1 1 auto; min-width: 0; color: inherit; text-decoration: none; overflow-wrap: anywhere; }
a.st-li-t:hover { text-decoration: underline; }
.st-li-n { flex: 0 0 auto; min-width: 4.2em; margin-left: auto; text-align: right; font-weight: 600; }
.st-meter { flex: 0 0 30%; height: 8px; background: var(--line); border-radius: 999px; overflow: hidden; }
.st-meter i { display: block; height: 100%; background: #2b6cb0; }
.st-book { font-size: 0.85em; color: var(--muted, #666); }
.st-new { font-size: 0.75em; padding: 1px 8px; border-radius: 999px; background: #2f855a; color: #fff; font-weight: 600; }
.st-term { font-weight: 600; }
.st-miss { display: inline-block; font-size: 0.85em; color: var(--red, #c0392b); }
.st-parts span.top { background: var(--accent, #2b6cb0); border-color: var(--accent, #2b6cb0); color: #fff; font-weight: 600; }
</style>
