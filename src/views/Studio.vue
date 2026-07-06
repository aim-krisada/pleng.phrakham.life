<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase.js'
import { KEYS, TIME_SIGNATURES, chordOptions } from '../lib/chords.js'
import { parseNotes, beatCount, expectedBeats } from '../lib/notation.js'
import { songHaystack } from '../lib/songSearch.js'
import { diffSongRows } from '../lib/diff.js'
import { playSong, stopPlayback } from '../lib/midi.js'
import SongSheet from '../components/SongSheet.vue'
import NoteRow from '../components/NoteRow.vue'
import NoteBoxes from '../components/NoteBoxes.vue'
import ComboSelect from '../components/ComboSelect.vue'

// ---------- auth + role (shared with the navbar profile tool) ----------
import { session, profile, legacy, initAuth } from '../store.js'

const isApprover = computed(() => legacy.value || profile.value?.role === 'approver')

onMounted(async () => {
  await initAuth()
  loadSongList()
  loadDrafts()
  loadProfilesMap()
})
onUnmounted(stopPlayback)

// login/logout happen in the navbar — refresh Studio data when auth changes
watch(session, () => {
  loadDrafts()
  loadProfilesMap()
})

// ---------- editing model (lines -> bars -> segments) ----------
function newSegment() {
  return { chord: '', note: '', lyric: '' }
}
function newBar() {
  return { segments: [newSegment()] }
}
function newLine() {
  return { marker: '', cont: false, bars: [newBar()] }
}

function deserializeLine(items) {
  const line = { marker: '', cont: false, bars: [] }
  let bar = { segments: [] }
  for (const it of items) {
    if (it.type === 'continue') line.cont = true
    else if (it.type === 'marker') line.marker = it.label || '***'
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
  if (line.cont) items.push({ type: 'continue' })
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

// valid chords only, diatonic chords of the current key listed first
const chordOpts = computed(() => chordOptions(opts.key))

// beats per bar vs. time signature — honest: unreadable input is an error, never a pass.
// A line marked "cont" continues the previous line's last bar: those two bars are
// counted as ONE bar (the sheet just broke it at the line end).
const expBeats = computed(() => expectedBeats(opts.timeSignature))
function barTokensAt(li, bi) {
  return lines.value[li]?.bars[bi]?.segments.flatMap((s) => parseNotes(s.note)) ?? []
}
function barStatus(li, bi) {
  const line = lines.value[li]
  const bar = line.bars[bi]
  let tokens = bar.segments.flatMap((s) => parseNotes(s.note))
  let hasText = bar.segments.some((s) => s.note.trim())
  let joined = false
  if (bi === 0 && line.cont && li > 0) {
    const prev = lines.value[li - 1]
    tokens = [...barTokensAt(li - 1, prev.bars.length - 1), ...tokens]
    joined = true
  } else if (bi === line.bars.length - 1 && lines.value[li + 1]?.cont) {
    tokens = [...tokens, ...barTokensAt(li + 1, 0)]
    joined = true
  }
  if (joined) hasText = tokens.length > 0
  const pre = joined ? '⤷ ' : ''
  if (!hasText) return { text: 'ว่าง', ok: true }
  const rawTokens = tokens.filter((t) => t.type === 'raw')
  if (rawTokens.length) {
    return { text: `${pre}อ่านไม่ได้: ${rawTokens.map((t) => t.text).join(' ')}`, ok: false }
  }
  const got = beatCount(tokens)
  if (expBeats.value == null) return { text: pre + fmt(got), ok: true }
  const ok = Math.abs(got - expBeats.value) < 0.01
  return { text: `${pre}${fmt(got)}/${fmt(expBeats.value)} จังหวะ`, ok }
}
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// ---------- symbol palette ----------
const PALETTE = ['1', '2', '3', '4', '5', '6', '7', '0', '-', '.', "'", '_', '~', '(', ')', '{', '}', '#', 'b']
let activeInput = null
const activeLine = ref(0) // line the user last touched — target of the floating ▶
function editorFocusIn(e, li) {
  if (li != null) activeLine.value = li
  if (e.target.classList?.contains('note-box') && e.target.tagName === 'INPUT') {
    activeInput = e.target
  }
}
function insertSym(sym) {
  if (!activeInput || !activeInput.isConnected) return
  const start = activeInput.selectionStart ?? activeInput.value.length
  const end = activeInput.selectionEnd ?? start
  activeInput.setRangeText(sym, start, end, 'end')
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
  nextTick(resetHistory)
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
  nextTick(resetHistory)
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
  nextTick(resetHistory)
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
    // publishing from one's own draft closes that draft
    if (currentDraftId.value && !reviewingDraft.value) {
      await supabase
        .from('song_drafts')
        .update({ status: 'approved', song_id: editingId.value })
        .eq('id', currentDraftId.value)
      currentDraftId.value = null
      loadDrafts()
    }
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

const AUDIO_BLOCKED_MSG = '🔇 อุปกรณ์ปิดเสียงอยู่ — ตรวจปุ่มปิดเสียง/โหมดเงียบของเครื่อง แล้วลองใหม่'
const playingBar = ref(null) // "li-bi" of the bar currently sounding
let playSeq = 0 // invalidates stale playbacks so `playing` can't flip out of sync

function stopAll() {
  stopPlayback()
  playSeq++
  playing.value = false
  playingBar.value = null
}

function followBar(liOffset) {
  return (n) => {
    const key = `${n.li + liOffset}-${n.bi}`
    if (playingBar.value === key) return
    playingBar.value = key
    const el = document.querySelector(`[data-bar="${key}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 90 || r.bottom > window.innerHeight - 110) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }
}

async function runPlay(content, liOffset) {
  if (playing.value) return stopAll()
  const id = ++playSeq
  playing.value = true
  const ok = await playSong(content, { bpm: opts.bpm || 80, onNote: followBar(liOffset) })
  if (ok === false) saveMsg.value = AUDIO_BLOCKED_MSG
  if (id === playSeq) {
    playing.value = false
    playingBar.value = null
  }
}

function playAll() {
  return runPlay(previewContent.value, 0)
}
function playLine(li) {
  return runPlay({ key: opts.key, lines: [serializeLine(lines.value[li])] }, li)
}

// ---------- undo / redo ----------
// Debounced JSON snapshots of the whole editing state (meta + opts + lines).
const history = ref([])
const histPos = ref(-1)
let applyingHistory = false
let histTimer = null

function snapshotState() {
  return JSON.stringify({ meta: { ...meta }, opts: { ...opts }, lines: lines.value })
}
function commitSnapshot() {
  const snap = snapshotState()
  if (history.value[histPos.value] === snap) return
  history.value.splice(histPos.value + 1) // typing after undo drops the redo tail
  history.value.push(snap)
  if (history.value.length > 100) history.value.shift()
  histPos.value = history.value.length - 1
}
watch(snapshotState, () => {
  if (applyingHistory) return
  clearTimeout(histTimer)
  histTimer = setTimeout(commitSnapshot, 400)
})
function resetHistory() {
  clearTimeout(histTimer)
  history.value = [snapshotState()]
  histPos.value = 0
}
function applyState(snap) {
  applyingHistory = true
  const s = JSON.parse(snap)
  Object.assign(meta, s.meta)
  Object.assign(opts, s.opts)
  lines.value = s.lines
  nextTick(() => (applyingHistory = false))
}
const canUndo = computed(() => histPos.value > 0)
const canRedo = computed(() => histPos.value < history.value.length - 1)
function undo() {
  clearTimeout(histTimer)
  commitSnapshot()
  if (histPos.value > 0) {
    histPos.value--
    applyState(history.value[histPos.value])
  }
}
function redo() {
  if (histPos.value < history.value.length - 1) {
    histPos.value++
    applyState(history.value[histPos.value])
  }
}
function onUndoKeys(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return
  const k = e.key.toLowerCase()
  if (k === 'z') {
    e.preventDefault()
    e.shiftKey ? redo() : undo()
  } else if (k === 'y') {
    e.preventDefault()
    redo()
  }
}
onMounted(() => {
  window.addEventListener('keydown', onUndoKeys)
  resetHistory()
})
onUnmounted(() => window.removeEventListener('keydown', onUndoKeys))

// ---------- floating toolbar + sheet overlay ----------
const showSheet = ref(false)
const primaryLabel = computed(() =>
  reviewingDraft.value ? '✅ อนุมัติ' : isApprover.value ? '✅ เผยแพร่' : '📨 ส่งตรวจ'
)
function primaryAction() {
  if (reviewingDraft.value) return approve()
  if (isApprover.value) return saveDirect()
  return saveDraft('pending')
}

const STATUS_TH = { draft: 'ร่าง', pending: 'รอตรวจ', rejected: 'ถูกส่งกลับ', approved: 'อนุมัติแล้ว' }
</script>

<template>
  <div style="padding-bottom: 84px">
    <!-- not signed in: gentle hint (login lives in the navbar profile button) -->
    <div v-if="!session" class="card no-print">
      <p class="muted" style="margin: 0">
        ทีมงาน: กด "เข้าสู่ระบบ" ที่มุมขวาบนก่อน จึงจะบันทึกเพลงได้ ·
        คนทั่วไปก็ใช้หน้านี้คีย์เพลงได้เลย — เสร็จแล้วกด "ดาวน์โหลด JSON" ส่งให้ทีมงาน
      </p>
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
        <input v-model.number="meta.number" type="number" placeholder="เลขเพลง" aria-label="เลขเพลง" style="width: 90px" />
        <input v-model="meta.title_th" placeholder="ชื่อเพลง (ไทย)" aria-label="ชื่อเพลงภาษาไทย" style="flex: 1; min-width: 180px" />
        <input v-model="meta.title_en" placeholder="ชื่อเพลง (อังกฤษ ถ้ามี)" aria-label="ชื่อเพลงภาษาอังกฤษ" style="flex: 1; min-width: 160px" />
        <label style="display: inline-flex; align-items: center; gap: 4px">คีย์:
          <ComboSelect v-model="opts.key" :options="KEYS" aria-label="คีย์เพลง" width="80px" />
        </label>
        <label style="display: inline-flex; align-items: center; gap: 4px">จังหวะ:
          <ComboSelect v-model="opts.timeSignature" :options="TIME_SIGNATURES" allow-custom aria-label="จังหวะของเพลง" width="90px" />
        </label>
        <label style="display: inline-flex; align-items: center; gap: 4px">♩=
          <input v-model.number="opts.bpm" type="number" min="30" max="240" placeholder="BPM" aria-label="ความเร็วเพลง BPM" style="width: 75px" />
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
      <span class="muted" style="margin-left: 6px">
        1 ช่อง = 1 โน้ต · Enter/เว้นวรรค = ช่องถัดไป · ลูกศร ← → เลื่อนช่อง · แตะช่องแล้วจิ้มสัญลักษณ์ได้
      </span>
      <router-link class="pk-info" :to="{ path: '/guide', hash: '#notation' }" aria-label="คู่มือโน้ตตัวเลข">i</router-link>
    </div>

    <!-- line editor -->
    <div v-for="(line, li) in lines" :key="li" class="card" :class="{ 'line-active': li === activeLine }" @focusin="editorFocusIn($event, li)">
      <div class="muted" style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
        <strong>บรรทัด {{ li + 1 }}</strong>
        <label style="display: inline-flex; align-items: center; gap: 4px">
          <input type="checkbox" :checked="!!line.marker" @change="line.marker = $event.target.checked ? '***' : ''" />
          ท่อนฮุก ***
        </label>
        <label v-if="li > 0" style="display: inline-flex; align-items: center; gap: 4px">
          <input v-model="line.cont" type="checkbox" />
          ⤷ ต่อห้องจากบรรทัดก่อน
        </label>
        <button class="secondary" @click="playLine(li)">▶ ฟังบรรทัดนี้</button>
        <button class="secondary" @click="copyLine(li)">คัดลอกโครง</button>
        <button class="danger" @click="removeLine(li)">ลบบรรทัด</button>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: stretch">
        <div
          v-for="(bar, bi) in line.bars"
          :key="bi"
          class="bar-box"
          :class="{ 'bar-playing': playingBar === `${li}-${bi}` }"
          :data-bar="`${li}-${bi}`"
        >
          <div class="bar-head">
            <span :style="{ color: barStatus(li, bi).ok ? 'var(--muted)' : 'var(--red)', fontWeight: barStatus(li, bi).ok ? 400 : 700 }">
              ห้อง {{ bi + 1 }} <template v-if="barStatus(li, bi).text">· {{ barStatus(li, bi).text }} {{ barStatus(li, bi).ok ? '✓' : '❌' }}</template>
            </span>
            <button class="secondary tiny" @click="removeBar(line, bi)">✕</button>
          </div>
          <!-- live render of this bar, exactly as the song sheet will show it -->
          <div class="bar-preview">
            <span v-for="(seg, si) in bar.segments" :key="'p' + si" class="segment">
              <span class="chord">{{ seg.chord }}&nbsp;</span>
              <span class="note"><NoteRow :notes="seg.note" />&nbsp;</span>
              <span class="lyric">{{ seg.lyric }}&nbsp;</span>
            </span>
          </div>
          <div v-for="(seg, si) in bar.segments" :key="si" class="seg-row">
            <ComboSelect v-model="seg.chord" :options="chordOpts" placeholder="คอร์ด" aria-label="เลือกคอร์ด" width="86px" />
            <NoteBoxes v-model="seg.note" />
            <input v-model="seg.lyric" placeholder="เนื้อร้อง" aria-label="เนื้อร้อง" class="seg-lyric" />
            <button class="secondary tiny" aria-label="ลบช่องนี้" @click="removeSegment(bar, si)">✕</button>
          </div>
          <button class="secondary tiny" @click="addSegment(bar)">+ คอร์ดใหม่ในห้องนี้</button>
        </div>
        <button class="secondary" style="align-self: center" @click="addBar(line)">+ ห้อง</button>
      </div>
    </div>
    <button class="secondary" @click="addLine">+ เพิ่มบรรทัด</button>

    <!-- secondary actions -->
    <div class="card" style="margin-top: 12px">
      <button :class="playing ? 'danger' : 'secondary'" @click="playAll">
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
      <span v-if="!session" class="muted" style="margin-left: 8px">(เข้าสู่ระบบที่มุมขวาบนก่อนจึงบันทึกได้)</span>
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
      <h2 style="color: var(--brand)">{{ meta.number != null ? meta.number + '. ' : '' }}{{ meta.title_th || '(ยังไม่มีชื่อเพลง)' }}</h2>
      <p class="muted">Key {{ opts.key }} · {{ opts.timeSignature }}<template v-if="opts.bpm"> · ♩= {{ opts.bpm }}</template></p>
      <SongSheet :content="previewContent" mode="full" chord-system="letter" :display-key="opts.key" />
    </div>

    <!-- floating toolbar: the everyday tools reachable from any scroll position -->
    <p v-if="saveMsg" class="float-msg no-print" role="status">{{ saveMsg }}</p>
    <div class="float-bar no-print" role="toolbar" aria-label="เครื่องมือหลัก">
      <button class="secondary" :disabled="!canUndo" aria-label="เลิกทำ (Ctrl+Z)" title="เลิกทำ (Ctrl+Z)" @click="undo">↩</button>
      <button class="secondary" :disabled="!canRedo" aria-label="ทำซ้ำ (Ctrl+Shift+Z)" title="ทำซ้ำ (Ctrl+Shift+Z)" @click="redo">↪</button>
      <button v-if="session && !legacy" class="secondary" @click="saveDraft('draft')">💾 ร่าง</button>
      <button :disabled="!session" @click="primaryAction">{{ primaryLabel }}</button>
      <button v-if="playing" class="danger" @click="stopAll">⏹ หยุด</button>
      <template v-else>
        <button class="secondary" @click="playLine(activeLine)">▶ บรรทัด {{ activeLine + 1 }}</button>
        <button class="secondary" @click="playAll">▶ ทั้งเพลง</button>
      </template>
      <button class="secondary" @click="showSheet = true">👁 แผ่นเพลง</button>
    </div>

    <!-- full sheet overlay -->
    <div v-if="showSheet" class="sheet-overlay no-print" role="dialog" aria-label="แผ่นเพลง" @click.self="showSheet = false" @keydown.esc="showSheet = false">
      <div class="sheet-panel">
        <button class="secondary" style="float: right" aria-label="ปิดแผ่นเพลง" @click="showSheet = false">✕ ปิด</button>
        <h2 style="margin-top: 0; color: var(--brand)">{{ meta.number != null ? meta.number + '. ' : '' }}{{ meta.title_th || '(ยังไม่มีชื่อเพลง)' }}</h2>
        <p class="muted">Key {{ opts.key }} · {{ opts.timeSignature }}<template v-if="opts.bpm"> · ♩= {{ opts.bpm }}</template></p>
        <SongSheet :content="previewContent" mode="full" chord-system="letter" :display-key="opts.key" />
      </div>
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
.bar-preview {
  min-height: 58px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 6px;
  padding-bottom: 4px;
  white-space: nowrap;
  overflow-x: auto;
}
.seg-row { display: flex; gap: 4px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; }
.seg-row :deep(.combo input) { color: var(--chord-red); font-weight: 700; }
.seg-lyric { width: 110px; }
/* small buttons still meet the 24x24 target size (WCAG 2.2 2.5.8) */
.tiny { padding: 4px 10px; font-size: 13px; min-height: 28px; min-width: 28px; }
.role-badge {
  background: var(--cream);
  color: var(--brand);
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
.line-active { border-color: var(--brand); }
.bar-playing {
  border: 1.5px solid var(--brand);
  background: var(--cream);
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.15);
}
/* floating toolbar (save/play/sheet from any scroll position) */
.float-bar {
  position: fixed;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  max-width: calc(100vw - 16px);
}
.float-msg {
  position: fixed;
  bottom: 76px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  background: var(--ink);
  color: #fff;
  padding: 8px 16px;
  border-radius: 10px;
  max-width: 92vw;
  margin: 0;
}
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 42, 38, 0.55);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px 8px;
  overflow: auto;
}
.sheet-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 920px;
  width: 100%;
  max-height: calc(100vh - 40px);
  overflow: auto;
}
</style>
