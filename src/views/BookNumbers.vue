<script setup>
// ใส่เลขเพลงทั้งเล่ม (ใบ v3/pleng#182) — every song of one book on one page, ก-ฮ by title, each
// with its own number box. พี่เปาเปิดเล่มกระดาษไปด้วย เจอเพลงไหนก็พิมพ์เลขลงช่องของเพลงนั้น
// ใส่ไม่ครบก็บันทึกได้ (พี่เอม 24 พ.ย. 2569). Helpers + the why: lib/bookNumbers.js.
//
// Who: approvers only — only they may write `songs` (RLS db/002). Each change is its own update of
// the `number` column alone, so the database trigger (db/004) logs it like any other edit and it
// shows on /changes. A duplicate number is WARNED, not blocked: while the old numbers are still in
// the boxes, a correct new number will often clash with a wrong old one for a while.
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { supabase } from '../supabase.js'
import { session, canApprove } from '../store.js'
import { fetchFullCatalog } from '../lib/catalogSource.js'
import { categoryName } from '../lib/bookshelf.js'
import {
  bookRows, duplicateNumbers, rowState, pendingChanges, parseNumberInput, titleMatches,
} from '../lib/bookNumbers.js'

const route = useRoute()
const book = computed(() => String(route.params.book || ''))
const bookName = computed(() => categoryName(book.value))

const loggedIn = computed(() => !!session.value)
const rows = ref([])
const loading = ref(false)
const loadError = ref('')
const query = ref('')
const saving = ref(false)
const result = ref(null) // { saved, failed } after a save

async function load() {
  if (!canApprove.value || loading.value) return
  loading.value = true
  loadError.value = ''
  const { data, error } = await fetchFullCatalog()
  loading.value = false
  if (error) { loadError.value = 'อ่านรายการเพลงไม่ได้ ลองโหลดหน้าใหม่'; return }
  rows.value = bookRows(data, book.value)
}
watch([canApprove, book], () => { result.value = null; if (canApprove.value) load(); else rows.value = [] }, { immediate: true })

const dups = computed(() => duplicateNumbers(rows.value))
const changes = computed(() => pendingChanges(rows.value))
const badCount = computed(() => rows.value.filter((r) => rowState(r, null) === 'bad').length)
const numbered = computed(() => rows.value.filter((r) => parseNumberInput(r.input).value != null).length)
const shown = computed(() => rows.value.filter((r) => titleMatches(r.title, query.value)))

// number → titles that carry it, to say WHICH song a duplicate clashes with
const byNumber = computed(() => {
  const m = new Map()
  for (const r of rows.value) {
    const v = parseNumberInput(r.input).value
    if (v == null) continue
    if (!m.has(v)) m.set(v, [])
    m.get(v).push(r)
  }
  return m
})
function clashWith(r) {
  const v = parseNumberInput(r.input).value
  return (byNumber.value.get(v) || []).filter((o) => o.id !== r.id).map((o) => o.title).join(' · ')
}

function stateOf(r) { return rowState(r, dups.value) }

function clearAll() {
  for (const r of rows.value) r.input = ''
  result.value = null
}
function restoreAll() {
  for (const r of rows.value) r.input = r.saved == null ? '' : String(r.saved)
  result.value = null
}

async function save() {
  if (saving.value || !changes.value.length || badCount.value) return
  saving.value = true
  result.value = null
  let saved = 0
  let failed = 0
  for (const c of changes.value) {
    // .select() returns the row written — an empty answer means the database refused it quietly
    // (RLS), which must count as a failure, not a success.
    const { data, error } = await supabase.from('songs').update({ number: c.number }).eq('id', c.id).select('id')
    const row = rows.value.find((r) => r.id === c.id)
    if (!error && data && data.length) {
      saved++
      if (row) row.saved = c.number
    } else {
      failed++
    }
  }
  saving.value = false
  result.value = { saved, failed }
}

// Unsaved numbers must not vanish by a stray tap on a link or the back button.
const LEAVE_MSG = 'ยังมีเลขที่ยังไม่ได้บันทึก ออกจากหน้านี้เลยไหม'
onBeforeRouteLeave(() => (changes.value.length ? window.confirm(LEAVE_MSG) : true))
function beforeUnload(e) {
  if (!changes.value.length) return
  e.preventDefault()
  e.returnValue = LEAVE_MSG
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <div class="bn-page">
    <h2 class="bn-title">ใส่เลขเพลง · {{ bookName }}</h2>

    <div v-if="!loggedIn" class="card" data-test="bn-login">
      <p style="margin: 0">หน้านี้สำหรับทีมทำเพลง ต้องเข้าระบบก่อน</p>
    </div>
    <div v-else-if="!canApprove" class="card" data-test="bn-approver">
      <p style="margin: 0">หน้านี้สำหรับผู้อนุมัติ เพราะเลขที่บันทึกจะขึ้นเว็บทันที</p>
    </div>

    <template v-else>
      <p class="muted bn-why">เปิดเล่มไปด้วย เจอเพลงไหนก็พิมพ์เลขลงช่องของเพลงนั้น ใส่ไม่ครบก็กดบันทึกได้ ไว้มาใส่ต่อวันหลัง</p>

      <p v-if="loadError" class="card bn-err" role="alert">{{ loadError }}</p>
      <p v-else-if="loading && !rows.length" class="card muted">กำลังโหลด…</p>
      <p v-else-if="!rows.length" class="card muted">เล่มนี้ยังไม่มีเพลง</p>

      <template v-else>
        <div class="bn-tools">
          <label class="bn-find">
            <span class="bn-find-label">หาชื่อเพลง</span>
            <input v-model="query" type="search" class="bn-find-input" data-test="bn-find" placeholder="พิมพ์บางคำของชื่อเพลง" />
          </label>
          <div class="bn-tool-btns">
            <button type="button" class="bn-btn" data-test="bn-clear" @click="clearAll">ล้างเลขทุกช่อง</button>
            <button type="button" class="bn-btn" data-test="bn-restore" :disabled="!changes.length" @click="restoreAll">คืนเลขเดิมทั้งหมด</button>
          </div>
        </div>
        <p class="muted bn-count" data-test="bn-count">
          มีเลขแล้ว {{ numbered }} จาก {{ rows.length }} เพลง
          <template v-if="dups.size"> · <span class="bn-warn">เลขซ้ำ {{ dups.size }} เลข</span></template>
        </p>

        <ul class="card bn-list">
          <li
            v-for="r in shown"
            :key="r.id"
            class="bn-item"
            :class="'is-' + stateOf(r)"
            data-test="bn-row"
          >
            <div class="bn-row">
              <input
                v-model="r.input"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                class="bn-num"
                :aria-label="'เลขเพลง ' + r.title"
                :aria-invalid="stateOf(r) === 'bad' || stateOf(r) === 'dup' ? 'true' : 'false'"
                data-test="bn-input"
              />
              <a :href="'#/song/' + r.id" target="_blank" rel="noopener" class="bn-song">{{ r.title }}</a>
              <span v-if="!r.verified" class="bn-tag muted">ยังไม่ตรวจ</span>
            </div>
            <p v-if="stateOf(r) === 'bad'" class="bn-msg bn-warn" data-test="bn-bad">ใส่ได้แค่ตัวเลข 1 ขึ้นไป หรือเว้นว่าง</p>
            <p v-else-if="stateOf(r) === 'dup'" class="bn-msg bn-warn" data-test="bn-dup">เลขซ้ำกับ {{ clashWith(r) }}</p>
            <p v-else-if="stateOf(r) === 'changed'" class="bn-msg muted">
              ยังไม่บันทึก · เดิม {{ r.saved == null ? 'ไม่มีเลข' : r.saved }}
            </p>
          </li>
          <li v-if="!shown.length" class="bn-item muted">ไม่เจอเพลงชื่อนี้ในเล่ม</li>
        </ul>

        <div class="bn-save-bar">
          <p class="bn-save-msg" aria-live="polite" data-test="bn-status">
            <template v-if="saving">กำลังบันทึก…</template>
            <template v-else-if="result && result.failed">
              <span class="bn-warn">บันทึกไม่ได้ {{ result.failed }} เพลง</span>
              <template v-if="result.saved"> · บันทึกแล้ว {{ result.saved }} เพลง</template> ลองกดบันทึกอีกครั้ง
            </template>
            <template v-else-if="result && !changes.length">บันทึกแล้ว {{ result.saved }} เพลง</template>
            <template v-else-if="badCount"><span class="bn-warn">มีช่องที่ไม่ใช่ตัวเลข {{ badCount }} ช่อง แก้ก่อนบันทึก</span></template>
            <template v-else-if="changes.length">ยังไม่บันทึก {{ changes.length }} เพลง</template>
            <template v-else>ยังไม่มีอะไรเปลี่ยน</template>
          </p>
          <button
            type="button"
            class="bn-save"
            data-test="bn-save"
            :disabled="saving || !changes.length || badCount > 0"
            @click="save"
          >บันทึก{{ changes.length ? ' ' + changes.length + ' เพลง' : '' }}</button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.bn-page { max-width: 720px; margin-inline: auto; padding: 0 16px 24px; }
.bn-title { margin: 8px 0 4px; }
.bn-why { margin: 0 0 12px; font-size: 0.92em; }
.bn-err, .bn-warn { color: var(--red, #b3261e); }
.bn-tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 6px; }
.bn-find { flex: 1 1 220px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.bn-find-label { font-size: 0.9em; font-weight: 600; }
.bn-find-input, .bn-num {
  font: inherit; color: var(--ink); background: var(--card, #fff);
  border: 1px solid var(--line); border-radius: 8px; min-height: 44px; padding: 0 10px;
}
.bn-tool-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.bn-btn, .bn-save {
  min-height: 44px; padding: 0 14px; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer;
  background: var(--card, #fff); color: var(--ink); border: 1px solid var(--line);
}
.bn-btn:disabled, .bn-save:disabled { opacity: 0.55; cursor: default; }
.bn-count { margin: 4px 0 8px; font-size: 0.92em; }
.bn-list { list-style: none; margin: 0; padding: 2px 12px; }
.bn-item { padding: 8px 0; border-top: 1px solid var(--line); }
.bn-item:first-child { border-top: 0; }
.bn-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.bn-num { flex: 0 0 76px; width: 76px; text-align: center; font-variant-numeric: tabular-nums; font-weight: 700; }
.is-changed .bn-num { border-color: var(--brand, #8b4513); border-width: 2px; }
.is-dup .bn-num, .is-bad .bn-num { border-color: var(--red, #b3261e); border-width: 2px; }
.bn-song { flex: 1 1 auto; min-width: 0; color: var(--ink); text-decoration: none; overflow-wrap: anywhere; }
.bn-song:hover { text-decoration: underline; }
.bn-tag { flex: 0 0 auto; font-size: 0.82em; }
.bn-msg { margin: 4px 0 0 86px; font-size: 0.88em; overflow-wrap: anywhere; }
.bn-find-input:focus-visible, .bn-num:focus-visible, .bn-btn:focus-visible, .bn-save:focus-visible, .bn-song:focus-visible {
  outline: 3px solid var(--brand, #8b4513); outline-offset: 2px;
}
/* the save button stays in reach while scrolling a 74-song list */
.bn-save-bar {
  position: sticky; bottom: 0; z-index: 2; margin-top: 12px; padding: 10px 0;
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;
  background: var(--bg, #fffaf3); border-top: 1px solid var(--line);
}
.bn-save-msg { margin: 0; flex: 1 1 200px; }
.bn-save { background: var(--brand, #8b4513); color: #fff; border-color: var(--brand, #8b4513); }
@media (max-width: 420px) { .bn-msg { margin-left: 0; } }
</style>
