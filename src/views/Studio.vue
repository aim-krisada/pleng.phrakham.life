<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase.js'
import { KEYS, TIME_SIGNATURES } from '../lib/chords.js'
import { parseNotes, beatCount, expectedBeats } from '../lib/notation.js'
import { songHaystack } from '../lib/songSearch.js'
import { diffSongRows } from '../lib/diff.js'
import { playSong, stopPlayback } from '../lib/midi.js'
import SongSheet from '../components/SongSheet.vue'
import ComboSelect from '../components/ComboSelect.vue'

// ---------- auth + role ----------
const session = ref(null)
const profile = ref(null) // { role, display_name }
const legacy = ref(false) // true when draft tables are not installed yet
const email = ref('')
const password = ref('')
const authError = ref('')

const isApprover = computed(() => legacy.value || profile.value?.role === 'approver')

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  supabase.auth.onAuthStateChange((_e, s) => {
    session.value = s
    loadProfile()
  })
  loadSongList()
  loadProfile()
})
onUnmounted(stopPlayback)

async function loadProfile() {
  profile.value = null
  if (!session.value) return
  const { data, error } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', session.value.user.id)
    .single()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') legacy.value = true
    else profile.value = { role: 'editor', display_name: session.value.user.email }
  } else {
    profile.value = data
  }
  loadDrafts()
  loadProfilesMap()
}

async function login() {
  authError.value = ''
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  if (error) authError.value = 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message
}
async function logout() {
  await supabase.auth.signOut()
}

// ---------- editing model (lines -> bars -> segments) ----------
function newSegment() {
  return { chord: '', note: '', lyric: '' }
}
function newBar() {
  return { segments: [newSegment()] }
}
function newLine() {
  return { marker: '', bars: [newBar()] }
}

function deserializeLine(items) {
  const line = { marker: '', bars: [] }
  let bar = { segments: [] }
  for (const it of items) {
    if (it.type === 'marker') line.marker = it.label || '***'
    else if (it.type === 'bar') {
      line.bars.push(bar)
      bar = { segments: [] }
    } else if (it.type === 'segment') {
      bar.segments.push({ chord: it.chord || '', note: it.note || '', lyric: it.lyric || '' })
    }
  }
  line.bars.push(bar)
  line.bars = line.bars.filter((b) => b.segments.length)
  if (!line.bars.length) line.bars = [newBar()]
  return line
}

function serializeLine(line) {
  const items = []
  if (line.marker) items.push({ type: 'marker', label: line.marker })
  line.bars.forEach((b, i) => {
    if (i > 0) items.push({ type: 'bar' })
    for (const s of b.segments) {
      items.push({ type: 'segment', chord: s.chord, note: s.note, lyric: s.lyric })
    }
  })
  return items
}

const editingId = ref(null)
const currentDraftId = ref(null)
const reviewingDraft = ref(null)
const reviewComment = ref('')
const pickerId = ref('')
const meta = reactive({ number: null, title_th: '', title_en: '' })
const opts = reactive({ key: 'C', timeSignature: '4/4', bpm: null })
const lines = ref([newLine()])
const saveMsg = ref('')
const playing = ref(false)

const previewContent = computed(() => ({
  key: opts.key,
  timeSignature: opts.timeSignature,
  bpm: opts.bpm || undefined,
  lines: lines.value.map(serializeLine),
}))

// beats per bar vs. time signature
const expBeats = computed(() => expectedBeats(opts.timeSignature))
function barBeats(bar) {
  return bar.segments.reduce((sum, s) => sum + beatCount(parseNotes(s.note)), 0)
}
function barStatus(bar) {
  const got = barBeats(bar)
  if (expBeats.value == null || got === 0) return { text: got ? `${fmt(got)}` : '', ok: true }
  const ok = Math.abs(got - expBeats.value) < 0.01
  return { text: `${fmt(got)}/${fmt(expBeats.value)}`, ok }
}
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// ---------- symbol palette ----------
const PALETTE = ['1', '2', '3', '4', '5', '6', '7', '0', '-', '.', "'", '_', '(', ')', '{', '}', '#', 'b', '␣']
let activeInput = null
function noteFocus(e) {
  activeInput = e.target
}
function insertSym(sym) {
  if (!activeInput) return
  const s = sym === '␣' ? ' ' : sym
  const start = activeInput.selectionStart ?? activeInput.value.length
  const end = activeInput.selectionEnd ?? start
  activeInput.setRangeText(s, start, end, 'end')
  activeInput.dispatchEvent(new Event('input', { bubbles: true }))
  activeInput.focus()
}

// ---------- line/bar/segment operations ----------
function addBar(line) {
  line.bars.push(newBar())
}
function removeBar(line, bi) {
  line.bars.splice(bi, 1)
  if (!line.bars.length) line.bars.push(newBar())
}
function addSegment(bar) {
  bar.segments.push(newSegment())
}
function removeSegment(bar, si) {
  bar.segments.splice(si, 1)
  if (!bar.segments.length) bar.segments.push(newSegment())
}
function addLine() {
  lines.value.push(newLine())
}
function copyLine(li) {
  const copy = JSON.parse(JSON.stringify(lines.value[li]))
  copy.bars.forEach((b) => b.segments.forEach((s) => (s.lyric = '')))
  lines.value.splice(li + 1, 0, copy)
}
function removeLine(li) {
  lines.value.splice(li, 1)
  if (!lines.value.length) lines.value.push(newLine())
}

// ---------- song list / picker ----------
const songList = ref([])

async function loadSongList() {
  const { data } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content')
    .order('number', { ascending: true })
  songList.value = data ?? []
}

const pickerOptions = computed(() => [
  { value: '', label: '— เพลงใหม่ —', search: 'เพลงใหม่ new' },
  ...songList.value.map((s) => ({
    value: s.id,
    label: (s.number != null ? s.number + '. ' : '') + s.title_th,
    search: songHaystack(s),
  })),
])

watch(pickerId, (id) => loadSong(id))

async function loadSong(id) {
  if (!id) return resetForm()
  const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
  if (error || !data) return
  applyRow(data)
  editingId.value = data.id
  currentDraftId.value = null
  reviewingDraft.value = null
  saveMsg.value = ''
  loadRevisions()
}

function applyRow(data) {
  meta.number = data.number
  meta.title_th = data.title_th
  meta.title_en = data.title_en
  opts.key = data.content.key || 'C'
  opts.timeSignature = data.content.timeSignature || '4/4'
  opts.bpm = data.content.bpm ?? null
  lines.value = (data.content.lines || []).map(deserializeLine)
  if (!lines.value.length) lines.value = [newLine()]
}

function resetForm() {
  editingId.value = null
  currentDraftId.value = null
  reviewingDraft.value = null
  meta.number = null
  meta.title_th = ''
  meta.title_en = ''
  opts.key = 'C'
  opts.timeSignature = '4/4'
  opts.bpm = null
  lines.value = [newLine()]
  saveMsg.value = ''
  revisions.value = []
}

// ---------- drafts ----------
const myDrafts = ref([])
const pendingDrafts = ref([])
const profilesMap = ref({})

async function loadProfilesMap() {
  if (legacy.value || !session.value) return
  const { data } = await supabase.from('profiles').select('id, display_name')
  profilesMap.value = Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]))
}

async function loadDrafts() {
  myDrafts.value = []
  pendingDrafts.value = []
  if (legacy.value || !session.value) return
  const { data, error } = await supabase
    .from('song_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') legacy.value = true
    return
  }
  const uid = session.value.user.id
  myDrafts.value = (data ?? []).filter((d) => d.author_id === uid && d.status !== 'approved')
  pendingDrafts.value = (data ?? []).filter((d) => d.status === 'pending')
}

function loadDraft(d) {
  applyRow(d)
  editingId.value = d.song_id
  currentDraftId.value = d.id
  reviewingDraft.value = isApprover.value && d.status === 'pending' ? d : null
  reviewComment.value = d.review_comment || ''
  saveMsg.value = d.status === 'rejected' && d.review_comment ? '↩ ถูกส่งกลับ: ' + d.review_comment : ''
  loadRevisions()
}

const draftRow = () => ({
  song_id: editingId.value,
  number: meta.number || null,
  title_th: meta.title_th.trim(),
  title_en: meta.title_en?.trim() || null,
  content: JSON.parse(JSON.stringify(previewContent.value)),
})

async function saveDraft(status) {
  saveMsg.value = ''
  const row = draftRow()
  if (!row.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return
  }
  row.status = status
  // reuse an existing own draft for this song if we did not start from one
  if (!currentDraftId.value && editingId.value) {
    const { data } = await supabase
      .from('song_drafts')
      .select('id')
      .eq('author_id', session.value.user.id)
      .eq('song_id', editingId.value)
      .in('status', ['draft', 'pending', 'rejected'])
      .limit(1)
    if (data?.[0]) currentDraftId.value = data[0].id
  }
  let error
  if (currentDraftId.value) {
    ;({ error } = await supabase.from('song_drafts').update(row).eq('id', currentDraftId.value))
  } else {
    const res = await supabase.from('song_drafts').insert(row).select('id').single()
    error = res.error
    if (res.data) currentDraftId.value = res.data.id
  }
  saveMsg.value = error
    ? '❌ บันทึกไม่สำเร็จ: ' + error.message
    : status === 'pending'
      ? '📨 ส่งตรวจแล้ว — รอผู้อนุมัติ'
      : '💾 บันทึกร่างแล้ว (ยังไม่เผยแพร่)'
  loadDrafts()
}

// ---------- publish (approver) ----------
async function saveDirect() {
  saveMsg.value = ''
  const row = draftRow()
  delete row.song_id
  delete row.status
  if (!row.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return
  }
  let error
  if (editingId.value) {
    ;({ error } = await supabase.from('songs').update(row).eq('id', editingId.value))
  } else {
    row.author_id = session.value?.user?.id
    const res = await supabase.from('songs').insert(row).select('id').single()
    error = res.error
    if (res.data) editingId.value = res.data.id
  }
  saveMsg.value = error ? '❌ บันทึกไม่สำเร็จ: ' + error.message : '✅ เผยแพร่แล้ว'
  if (!error) {
    loadSongList()
    loadRevisions()
  }
}

async function approve() {
  const d = reviewingDraft.value
  await saveDirect()
  if (saveMsg.value.startsWith('❌') || saveMsg.value.startsWith('⚠️')) return
  await supabase
    .from('song_drafts')
    .update({ status: 'approved', song_id: editingId.value, review_comment: reviewComment.value || null })
    .eq('id', d.id)
  saveMsg.value = '✅ อนุมัติและเผยแพร่แล้ว'
  reviewingDraft.value = null
  currentDraftId.value = null
  loadDrafts()
}

async function reject() {
  const d = reviewingDraft.value
  const { error } = await supabase
    .from('song_drafts')
    .update({ status: 'rejected', review_comment: reviewComment.value || null })
    .eq('id', d.id)
  saveMsg.value = error ? '❌ ' + error.message : '↩ ส่งกลับให้ผู้เขียนแก้แล้ว'
  reviewingDraft.value = null
  currentDraftId.value = null
  loadDrafts()
}

async function deleteSong() {
  if (!editingId.value) return
  if (!window.confirm(`ลบเพลง "${meta.title_th}" ออกจากรายการเพลงถาวร?`)) return
  const { error } = await supabase.from('songs').delete().eq('id', editingId.value)
  saveMsg.value = error ? '❌ ลบไม่สำเร็จ: ' + error.message : '🗑️ ลบแล้ว'
  if (!error) {
    resetForm()
    pickerId.value = ''
    loadSongList()
  }
}

function save() {
  if (legacy.value || (isApprover.value && !reviewingDraft.value)) return saveDirect()
  return saveDraft(reviewingDraft.value ? 'pending' : 'draft')
}

// ---------- history ----------
const revisions = ref([])
const showHistory = ref(false)

async function loadRevisions() {
  revisions.value = []
  if (legacy.value || !session.value || !editingId.value) return
  const { data, error } = await supabase
    .from('song_revisions')
    .select('*')
    .eq('song_id', editingId.value)
    .order('id', { ascending: false })
    .limit(30)
  if (!error) revisions.value = data ?? []
}

function revName(rev) {
  return profilesMap.value[rev.editor_id] || 'ไม่ทราบชื่อ'
}
function revDiff(rev) {
  return diffSongRows(rev.old_row, rev.new_row)
}
async function restore(rev) {
  if (!rev.new_row) return
  if (!window.confirm('ย้อนเพลงกลับไปเป็นเวอร์ชันนี้?')) return
  const r = rev.new_row
  const { error } = await supabase
    .from('songs')
    .update({ number: r.number, title_th: r.title_th, title_en: r.title_en, content: r.content })
    .eq('id', editingId.value)
  saveMsg.value = error ? '❌ ' + error.message : '⏪ ย้อนเวอร์ชันแล้ว'
  if (!error) loadSong(editingId.value)
}

// ---------- misc ----------
function downloadJson() {
  const data = { ...meta, content: JSON.parse(JSON.stringify(previewContent.value)) }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = (meta.title_th || 'song') + '.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function playAll() {
  if (playing.value) {
    stopPlayback()
    playing.value = false
    return
  }
  playing.value = true
  await playSong(previewContent.value, { bpm: opts.bpm || 80 })
  playing.value = false
}
async function playLine(li) {
  stopPlayback()
  playing.value = true
  await playSong({ key: opts.key, lines: [serializeLine(lines.value[li])] }, { bpm: opts.bpm || 80 })
  playing.value = false
}

const STATUS_TH = { draft: 'ร่าง', pending: 'รอตรวจ', rejected: 'ถูกส่งกลับ', approved: 'อนุมัติแล้ว' }
</script>

<template>
  <div>
    <!-- auth bar -->
    <div class="card no-print">
      <template v-if="session">
        <span>
          👤 {{ profile?.display_name || session.user.email }}
          <span v-if="profile" class="role-badge">{{ profile.role === 'approver' ? 'ผู้อนุมัติ' : 'ผู้ช่วยคีย์เพลง' }}</span>
        </span>
        <button class="secondary" style="margin-left: 10px" @click="logout">ออกจากระบบ</button>
      </template>
      <template v-else>
        <form style="display: flex; gap: 8px; flex-wrap: wrap" @submit.prevent="login">
          <input v-model="email" type="email" placeholder="อีเมลทีมงาน" required />
          <input v-model="password" type="password" placeholder="รหัสผ่าน" required />
          <button type="submit">เข้าสู่ระบบ</button>
        </form>
        <p class="muted" style="margin: 8px 0 0">
          ไม่ได้เป็นทีมงานก็ใช้หน้านี้คีย์เพลงได้ — แล้วกด "ดาวน์โหลด JSON" ส่งให้ทีมงานนำเข้าระบบ
        </p>
        <p v-if="authError" style="color: var(--red); margin: 8px 0 0">{{ authError }}</p>
      </template>
    </div>

    <!-- review queue (approver) + my drafts (everyone logged in) -->
    <div v-if="session && !legacy && (pendingDrafts.length || myDrafts.length)" class="card no-print">
      <template v-if="isApprover && pendingDrafts.length">
        <strong>📨 รออนุมัติ ({{ pendingDrafts.length }})</strong>
        <div v-for="d in pendingDrafts" :key="d.id" class="draft-row">
          <a href="#" @click.prevent="loadDraft(d)">
            {{ d.number != null ? d.number + '. ' : '' }}{{ d.title_th }}
          </a>
          <span class="muted"> — โดย {{ profilesMap[d.author_id] || '?' }} · {{ new Date(d.updated_at).toLocaleString('th-TH') }}</span>
        </div>
        <hr v-if="myDrafts.length" style="border: none; border-top: 1px solid var(--line)" />
      </template>
      <template v-if="myDrafts.length">
        <strong>📝 งานร่างของฉัน</strong>
        <div v-for="d in myDrafts" :key="d.id" class="draft-row">
          <a href="#" @click.prevent="loadDraft(d)">
            {{ d.number != null ? d.number + '. ' : '' }}{{ d.title_th }}
          </a>
          <span :class="['status-chip', 's-' + d.status]">{{ STATUS_TH[d.status] }}</span>
        </div>
      </template>
    </div>

    <!-- review banner -->
    <div v-if="reviewingDraft" class="card review-banner no-print">
      <strong>🔍 กำลังตรวจฉบับร่างของ {{ profilesMap[reviewingDraft.author_id] || '?' }}</strong>
      <span class="muted"> — แก้ไขในฟอร์มด้านล่างได้ก่อนอนุมัติ</span>
      <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; align-items: center">
        <button @click="approve">✅ อนุมัติและเผยแพร่</button>
        <button class="danger" @click="reject">↩ ส่งกลับให้แก้</button>
        <input v-model="reviewComment" placeholder="ความเห็นถึงผู้เขียน (ถ้ามี)" style="flex: 1; min-width: 200px" />
      </div>
    </div>

    <!-- song picker -->
    <div class="card no-print">
      <label style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap">
        เลือกเพลง:
        <ComboSelect
          v-model="pickerId"
          :options="pickerOptions"
          placeholder="พิมพ์ค้นหา: ชื่อ เลข เนื้อร้อง โน้ต…"
          width="300px"
        />
      </label>
      <button class="secondary" style="margin-left: 8px" @click="pickerId = ''; resetForm()">เริ่มเพลงใหม่</button>
      <a href="#/guide" class="muted" style="margin-left: 12px">📖 คู่มือโน้ตตัวเลข</a>
    </div>

    <!-- metadata -->
    <div class="card">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">
        <input v-model.number="meta.number" type="number" placeholder="เลขเพลง" style="width: 90px" />
        <input v-model="meta.title_th" placeholder="ชื่อเพลง (ไทย)" style="flex: 1; min-width: 180px" />
        <input v-model="meta.title_en" placeholder="ชื่อเพลง (อังกฤษ ถ้ามี)" style="flex: 1; min-width: 160px" />
        <label style="display: inline-flex; align-items: center; gap: 4px">คีย์:
          <ComboSelect v-model="opts.key" :options="KEYS" width="80px" />
        </label>
        <label style="display: inline-flex; align-items: center; gap: 4px">จังหวะ:
          <ComboSelect v-model="opts.timeSignature" :options="TIME_SIGNATURES" allow-custom width="90px" />
        </label>
        <label style="display: inline-flex; align-items: center; gap: 4px">♩=
          <input v-model.number="opts.bpm" type="number" min="30" max="240" placeholder="BPM" style="width: 75px" />
        </label>
      </div>
    </div>

    <!-- symbol palette (sticky) -->
    <div class="card palette no-print">
      <button
        v-for="sym in PALETTE"
        :key="sym"
        class="secondary pal-btn"
        @mousedown.prevent="insertSym(sym)"
      >
        {{ sym }}
      </button>
      <span class="muted" style="margin-left: 6px">แตะช่องโน้ตก่อน แล้วจิ้มสัญลักษณ์</span>
    </div>

    <!-- line editor -->
    <div v-for="(line, li) in lines" :key="li" class="card">
      <div class="muted" style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
        <strong>บรรทัด {{ li + 1 }}</strong>
        <label style="display: inline-flex; align-items: center; gap: 4px">
          <input type="checkbox" :checked="!!line.marker" @change="line.marker = $event.target.checked ? '***' : ''" />
          ท่อนฮุก ***
        </label>
        <button class="secondary" @click="playLine(li)">▶ ฟังบรรทัดนี้</button>
        <button class="secondary" @click="copyLine(li)">คัดลอกโครง</button>
        <button class="danger" @click="removeLine(li)">ลบบรรทัด</button>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: stretch">
        <div v-for="(bar, bi) in line.bars" :key="bi" class="bar-box">
          <div class="bar-head">
            <span :style="{ color: barStatus(bar).ok ? 'var(--muted)' : 'var(--red)', fontWeight: barStatus(bar).ok ? 400 : 700 }">
              ห้อง {{ bi + 1 }} <template v-if="barStatus(bar).text">· {{ barStatus(bar).text }} {{ barStatus(bar).ok ? '✓' : '❌' }}</template>
            </span>
            <button class="secondary tiny" @click="removeBar(line, bi)">✕</button>
          </div>
          <div v-for="(seg, si) in bar.segments" :key="si" class="seg-row">
            <input v-model="seg.chord" placeholder="คอร์ด" class="seg-chord" />
            <input v-model="seg.note" placeholder="โน้ต" class="seg-note" @focus="noteFocus" />
            <input v-model="seg.lyric" placeholder="เนื้อร้อง" class="seg-lyric" />
            <button class="secondary tiny" @click="removeSegment(bar, si)">✕</button>
          </div>
          <button class="secondary tiny" @click="addSegment(bar)">+ คอร์ดใหม่ในห้องนี้</button>
        </div>
        <button class="secondary" style="align-self: center" @click="addBar(line)">+ ห้อง</button>
      </div>
    </div>
    <button class="secondary" @click="addLine">+ เพิ่มบรรทัด</button>

    <!-- actions -->
    <div class="card" style="margin-top: 12px">
      <template v-if="!session || legacy || isApprover">
        <button :disabled="!session" @click="save">💾 {{ reviewingDraft ? 'บันทึกร่างที่ตรวจอยู่' : 'บันทึกขึ้นระบบ' }}</button>
      </template>
      <template v-else>
        <button @click="saveDraft('draft')">💾 บันทึกร่าง</button>
        <button style="margin-left: 8px" @click="saveDraft('pending')">📨 ส่งตรวจ</button>
      </template>
      <button :class="playing ? 'danger' : ''" style="margin-left: 8px" @click="playAll">
        {{ playing ? '⏹ หยุด' : '▶ ฟังทั้งเพลง' }}
      </button>
      <button class="secondary" style="margin-left: 8px" @click="downloadJson">⬇️ ดาวน์โหลด JSON</button>
      <button
        v-if="isApprover && session && editingId && !reviewingDraft"
        class="danger"
        style="margin-left: 8px"
        @click="deleteSong"
      >
        🗑️ ลบเพลงนี้
      </button>
      <span v-if="!session" class="muted" style="margin-left: 8px">(ต้องเข้าสู่ระบบก่อนจึงบันทึกได้)</span>
      <p v-if="saveMsg" style="margin: 8px 0 0">{{ saveMsg }}</p>
    </div>

    <!-- history -->
    <div v-if="session && !legacy && editingId && revisions.length" class="card no-print">
      <button class="secondary" @click="showHistory = !showHistory">
        🕘 ประวัติการแก้ไข ({{ revisions.length }}) {{ showHistory ? '▲' : '▼' }}
      </button>
      <template v-if="showHistory">
        <div v-for="rev in revisions" :key="rev.id" class="rev-row">
          <div>
            <strong>{{ revName(rev) }}</strong>
            <span class="muted"> · {{ new Date(rev.created_at).toLocaleString('th-TH') }}</span>
            <button v-if="isApprover && rev.new_row" class="secondary tiny" style="margin-left: 8px" @click="restore(rev)">⏪ ย้อนมาเวอร์ชันนี้</button>
          </div>
          <ul class="muted" style="margin: 4px 0 0 18px">
            <li v-for="(d, i) in revDiff(rev)" :key="i">{{ d }}</li>
          </ul>
        </div>
      </template>
    </div>

    <!-- live preview -->
    <div class="card">
      <h3 style="margin-top: 0">ตัวอย่างแผ่นเพลง</h3>
      <h2 style="color: var(--blue)">{{ meta.number != null ? meta.number + '. ' : '' }}{{ meta.title_th || '(ยังไม่มีชื่อเพลง)' }}</h2>
      <p class="muted">Key {{ opts.key }} · {{ opts.timeSignature }}<template v-if="opts.bpm"> · ♩= {{ opts.bpm }}</template></p>
      <SongSheet :content="previewContent" mode="full" chord-system="letter" :display-key="opts.key" />
    </div>
  </div>
</template>

<style scoped>
.palette {
  position: sticky;
  top: 8px;
  z-index: 20;
  padding: 8px 10px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.pal-btn {
  min-width: 34px;
  padding: 6px 0;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 16px;
}
.bar-box {
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 8px;
  min-width: 150px;
}
.bar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 6px;
  gap: 6px;
}
.seg-row { display: flex; gap: 4px; margin-bottom: 4px; align-items: center; }
.seg-chord { width: 64px; color: var(--red); font-weight: 700; }
.seg-note { width: 120px; color: var(--blue); font-family: 'Courier New', monospace; font-weight: 700; }
.seg-lyric { width: 110px; }
.tiny { padding: 2px 8px; font-size: 12px; }
.role-badge {
  background: #e6fffa;
  color: #234e52;
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 13px;
  margin-left: 6px;
}
.draft-row { margin-top: 6px; }
.status-chip { border-radius: 10px; padding: 1px 10px; font-size: 12px; margin-left: 8px; }
.s-draft { background: #edf2f7; }
.s-pending { background: #fefcbf; }
.s-rejected { background: #fed7d7; }
.review-banner { background: #fffbeb; border-color: #f6e05e; }
.rev-row { border-top: 1px solid var(--line); padding: 8px 0; margin-top: 8px; }
</style>
