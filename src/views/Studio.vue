<script setup>
// Studio = the single song SURFACE (US-01 / US-04). It is a THIN shell: it owns the
// current song + which of the three modes is shown, and mounts one component per mode.
// All editing lives in EditorMode; reading lives in SongViewer / SongSheet. A/B/C/D can
// evolve their own mode file without touching this shell (that is the whole point of
// DS-04's contract: every mode takes { song, tier } and emits change / save).
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { supabase } from '../supabase.js'
import { migrateToV2, resolveContent } from '../lib/songModel.js'
import { withSongKey } from '../lib/songEdit.js'
import { songHaystack, searchSongs } from '../lib/songSearch.js'
import { visibleSongs } from '../lib/bookshelf.js'
import { songBasename } from '../lib/songName.js'
import { stopPlayback } from '../lib/midi.js'
import { KEYS } from '../lib/chords.js'
import { downloadSong, importSong } from '../lib/jsonIO.js'
import { writeWorkingCopy, clearWorkingCopy, hasRecoverable, contentStamp } from '../lib/workingCopy.js'
import { tier, canStore, session, saveDraftRow, initAuth, shellMenu, currentSong, readingFontScale, setFontScale } from '../store.js'
import Icon from '../components/Icon.vue'
import ComboSelect from '../components/ComboSelect.vue'
import SongViewer from '../components/SongViewer.vue'
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'
import DockKey from '../components/DockKey.vue'
import ExportTool from '../components/ExportTool.vue'
import ShareSheet from '../components/ShareSheet.vue'
import { buildSongUrl } from '../lib/share.js'
import { t } from '../i18n/index.js'

const route = useRoute()
const router = useRouter()

// ---------- ↗ แชร์ (EPIC H) — link + QR for the open song ----------
// A song link is the hash route this page is already on, plus the key it is being read at when
// that differs from the song's own (lib/share.js builds it). NO account / NO PII: nothing is
// sent anywhere — the sheet only shows a URL the user already holds.
// The incoming half of the same round-trip: a link opened at ?key= starts BOTH reading modes on
// that key. Read once at setup so it is ready before either surface mounts.
const linkKey = KEYS.includes(route.query?.key) ? String(route.query.key) : ''
let linkKeyPending = !!linkKey
// ฝึกร้อง owns its own คีย์ (SongViewer.displayKey) and reports it up; แผ่นเพลง's is sheetKey
// here. Share whichever surface the user is actually looking at.
const viewKey = ref('')
const shareOpen = ref(false)
const shareKey = computed(() => (mode.value === 'sheet' ? sheetKey.value : viewKey.value))
const shareTarget = computed(() => {
  const s = liveSong.value
  if (!s?.id) return null
  const name = titleText.value
  // ?key= only when transposed away from the song's own key — an untouched song shares a clean link
  const k = shareKey.value && shareKey.value !== s.content?.key ? shareKey.value : ''
  return {
    url: buildSongUrl(s.id, k),
    title: t('share.songTitle', { name }),
    shareText: name,
  }
})

// three views on one surface: ดู (ร้องตาม) · แผ่น (พิมพ์) · แก้ (แก้ไข)
const mode = ref('view')
// bumped to force a fresh (blank) EditorMode when "สร้างเพลงใหม่" is used from the
// "เพลง ▾" panel — remounting is the clean way to reset the editor from the shell
// without reaching into its internal state (S2 create-new).
const editorNonce = ref(0)

// central song state — lifted to the shell so switching modes never loses work (US-01).
//   loadedSong : the raw DB row · changes only on load · hands the editor a song to (re)load
//   liveSong   : the current song incl. unsaved edits (editor emits `change`) · feeds ดู/แผ่น
const loadedSong = ref(null)
const liveSong = ref(null)
// on-demand JSON import (US-C02): a status line for the ⋮ → "เปิดไฟล์ JSON" result —
// friendly Thai reason on a bad file, or v1→v2 warnings the human should eyeball.
const importMsg = ref('')
const importWarn = ref(false)

async function loadSong(id) {
  const { data } = await supabase.from('songs').select('*').eq('id', id).single()
  if (!data) return
  loadedSong.value = data
  const { content } = migrateToV2(data.content)
  liveSong.value = {
    id: data.id,
    number: data.number,
    title_th: data.title_th,
    title_en: data.title_en,
    // B060 — หมวด/ธีม are catalog columns on the row (not in `content`), and the inline
    // ⚙ ตั้งค่าเพลง edits them, so the live song has to carry them or an edit would have
    // nowhere to land. B108 knownness: a value READ OFF THE ROW is genuine; null means the
    // song has none stored, and stays null until a human picks one (see saveInlineDraft).
    category: data.category ?? null,
    theme: data.theme ?? null,
    content,
  }
  // A-fix: a fresh load = clean, and any local work left over from a crash/reload is OFFERED
  // (never auto-applied — the published song may have moved on since it was written).
  inlineState.value = 'clean'
  cleanContent.value = stamp(content) // the checkpoint "ยังไม่บันทึก" is measured against
  cleanMeta.value = stamp(metaOf(liveSong.value)) // …and the same checkpoint for the settings
  // B108 knownness, per field: a value we READ off this row is genuine; a null is not a value,
  // so it stays unknown until a human picks one in ⚙ ตั้งค่าเพลง.
  metaKnown.category = data.category != null
  metaKnown.theme = data.theme != null
  inlineError.value = ''
  inlineDraftId.value = null
  recovery.value = hasRecoverable(data.id, content, undefined, metaOf(liveSong.value))
}

onMounted(async () => {
  initAuth()
  loadSongList()
  if (route.params.id) {
    await loadSong(route.params.id)
    mode.value = 'view' // a routed song opens in a reading view (US-01 AC1)
  } else {
    // a bare /studio is a brand-new song → straight to the editor
    loadedSong.value = null
    liveSong.value = null
    mode.value = 'edit'
  }
})
// Switching songs while the shell stays mounted (the "เปิดเพลง" picker, or browser
// back/forward) keeps the CURRENT mode — US-05: a reader in ดู/แผ่น must not be
// bounced out, and picking a song must not jump into แก้. A fresh routed entry from a
// link still opens in ดู via onMounted above (that component mounts anew).
watch(
  () => route.params.id,
  async (id) => {
    if (id) await loadSong(id)
  },
)

// Each mode may play audio (ดู listen-along · แก้ preview). The mode components stay
// mounted (v-show), so their own onUnmounted stop never fires on a switch — the shell
// stops any sound when you leave a mode. midi is a single global player, so one call does it.
watch(mode, () => stopPlayback())

// Name the browser tab after the open song, so ANY print path (our button OR Ctrl+P)
// gets the right PDF filename — the print dialog suggests document.title. Restore the
// site's own title when leaving the surface. (US-I2: same "เพลง.พระคำ.ชีวิต - ชื่อ" base.)
const SITE_TITLE = document.title
watch(
  liveSong,
  (s) => {
    document.title = s ? songBasename(s) : SITE_TITLE
    // I1: the open song is the store SSOT for the navbar (title + DownloadTool) — every
    // mode + the editor feed liveSong, so this stays in sync as the song/title changes.
    currentSong.value = s
  },
  { immediate: true },
)
onUnmounted(() => {
  document.title = SITE_TITLE
  currentSong.value = null
})

// the editor pushes every edit up here → previews follow + no work is lost on a switch.
// EditorMode's payload has no หมวด/ธีม (it keeps those in its own meta and writes them on its
// own publish path), so carry the ones we loaded rather than letting a mode switch blank them.
function onChange(song) {
  const keep = liveSong.value
  liveSong.value = { category: keep?.category ?? null, theme: keep?.theme ?? null, ...song }
}
// ฝึกร้อง's inline pencil edits the SAME live song, but hands up only the new v2 content
// (it can't see id/title_en). Merge it onto liveSong so the SSOT keeps every field and all
// surfaces (แผ่นเพลง, Download JSON, save) see the edit — exactly like the editor's change.
function onViewerContent(content) {
  if (!liveSong.value) return
  liveSong.value = { ...liveSong.value, content }
  syncInlineState()
}
// B060 — the inline ⚙ ตั้งค่าเพลง edits the song's ROW fields (เลข · ชื่อไทย · ชื่ออังกฤษ ·
// ธีม · หมวด); คีย์/จังหวะ/ความเร็ว live in `content` and come through onViewerContent above.
// Same rule as an edit to the music: it lands on the live song, marks ยังไม่บันทึก, and is
// mirrored into the local working copy so a crash cannot take it silently.
function onViewerMeta(patch) {
  if (!liveSong.value || !patch) return
  liveSong.value = { ...liveSong.value, ...patch }
  // B108 — a value a HUMAN picked is genuine, so that field may be written on save. Judged
  // strictly per field: picking a ธีม says nothing about whether the หมวด on screen is real.
  if ('category' in patch) metaKnown.category = true
  if ('theme' in patch) metaKnown.theme = true
  syncInlineState()
}
// B060 — the musical half of ⚙ ตั้งค่าเพลง (คีย์ · จังหวะ · ความเร็ว), which lives in
// `content`. Applied HERE, on the live song, so two settings changed in quick succession both
// land (the viewer's `song` prop is a snapshot of the last render).
//   คีย์ = a real transpose: withSongKey moves the chords with the key (lib/songEdit → the same
//   lib/chords the reading transpose uses). The numbers are scale degrees and stay as printed.
function onViewerMusic(patch) {
  const cur = liveSong.value?.content
  if (!cur || !patch) return
  let next = cur
  if (patch.key) next = withSongKey(next, patch.key)
  if (patch.timeSignature && (next.timeSignature || '') !== patch.timeSignature) {
    next = { ...next, timeSignature: patch.timeSignature }
  }
  if ('bpm' in patch) {
    const bpm = patch.bpm == null ? null : Number(patch.bpm)
    if ((next.bpm ?? null) !== bpm) {
      next = { ...next }
      if (bpm == null) delete next.bpm // "no tempo stored" is an absent key, not a null
      else next.bpm = bpm
    }
  }
  if (next !== cur) onViewerContent(next)
}
// "ยังไม่บันทึก" is a COMPARISON against the last saved checkpoint, not a one-way flag — so
// undoing back to the saved state honestly reads "บันทึกแล้ว" again (same rule as the
// editor's B100 dirty check). A flag would lie the moment ย้อน came along. Both halves of the
// document count: the music AND the settings.
function syncInlineState() {
  const s = liveSong.value
  if (!s) return
  const same = stamp(s.content) === cleanContent.value && stamp(metaOf(s)) === cleanMeta.value
  inlineState.value = same ? 'clean' : 'dirty'
  // the local copy follows the document, undo included — never a stale snapshot of a state the
  // user has already stepped away from
  if (same) { clearWorkingCopy(s.id); workCopySafe.value = true }
  // กันหาย: mirrored on every keystroke. writeWorkingCopy tells us whether it LANDED (private
  // mode / quota make it fail), and that answer decides how hard we have to argue when the user
  // leaves the editor with unsaved work — see SongViewer.requestExitEdit. B060: the ⚙ settings
  // half (metaOf) rides along so a rename/คีย์ change survives a crash too.
  else workCopySafe.value = writeWorkingCopy(s.id, s.content, undefined, undefined, metaOf(s))
}

// ---------- A-fix (23 ก.ค.): the inline editor's SAVE path ----------
// โหมดแก้ inline shipped with one button ("เสร็จ") and no way to keep the work at all — a
// reload wiped it silently (Tester, docs/reports/editor-gap-audit.md). The locked design
// (ux-groundup-design.md, journey M-edit) calls for "สถานะ บันทึกแล้ว✓/ยังไม่บันทึก เห็นตลอด +
// autosave working-copy กันหาย" and separate meanings for ร่าง/ส่งตรวจ/เผยแพร่. So:
//   • every inline edit → local working copy (all tiers, incl. anon) + state 'dirty'
//   • บันทึกร่าง (logged in) writes a DRAFT row — never the published song, so พี่เปา's live
//     library cannot be overwritten from the reading surface. ส่งตรวจ/เผยแพร่ stay in แก้ไข,
//     which owns the review flow.
//   • anon → ดาวน์โหลด JSON (mission's tier-0 path). The gate is on STORING only; entering
//     edit stays open to everyone.
// The shell owns this because it holds the song row + the tier; SongViewer only shows the
// state and asks.
const inlineState = ref('clean') // clean | dirty | saving | saved | error
const inlineError = ref('')
const inlineDraftId = ref(null)
// did the last mirror to localStorage actually land? false = private mode / quota, i.e. the
// work exists ONLY in this page's memory and a reload really would lose it.
const workCopySafe = ref(true)
// the content as of the last load / successful save — what "ยังไม่บันทึก" is measured against.
// contentStamp (not JSON.stringify) so the comparison is about the MUSIC, not about the key
// order Postgres happens to return — that mismatch kept an untouched song marked ยังไม่บันทึก.
const stamp = contentStamp
const cleanContent = ref(stamp(null))
// B060 — the settings half of the same checkpoint. The row fields the inline ⚙ panel can edit;
// `content` (คีย์/จังหวะ/ความเร็ว) is covered by cleanContent, so the two together are the
// whole document the inline editor can change.
const metaOf = (s) => ({
  number: s?.number ?? null,
  title_th: s?.title_th ?? '',
  title_en: s?.title_en ?? null,
  category: s?.category ?? null,
  theme: s?.theme ?? null,
})
const cleanMeta = ref(stamp(metaOf(null)))
// B108 knownness, per field (see loadSong / onViewerMeta): only a field we positively
// established may be written on save — never a fallback, or the library gets re-filed silently.
const metaKnown = reactive({ category: false, theme: false })
function markInlineSaved() {
  cleanContent.value = stamp(liveSong.value?.content)
  cleanMeta.value = stamp(metaOf(liveSong.value))
  inlineState.value = 'saved'
}
// a local copy newer than the server's, offered for recovery when the song (re)opens
const recovery = ref(null)

async function saveInlineDraft(kind) {
  const s = liveSong.value
  if (!s) return
  if (kind === 'file') {
    // anon path — the JSON download IS their save; the work is now kept outside the browser
    markInlineSaved()
    inlineError.value = ''
    clearWorkingCopy(s.id)
    return
  }
  if (!canStore.value) return
  inlineState.value = 'saving'
  inlineError.value = ''
  const row = {
    song_id: s.id ?? null,
    number: s.number ?? null,
    title_th: (s.title_th || '').trim(),
    title_en: s.title_en?.trim() || null,
    content: JSON.parse(JSON.stringify(s.content)),
    status: 'draft',
    // B108 — send หมวด/ธีม ONLY when that field is genuine (read off the row, or picked by a
    // human in ⚙ ตั้งค่าเพลง). A guess written here would be published over what is stored and
    // silently re-file the song / wipe its theme — the exact bug db/010 + the knownness flags
    // exist to stop. An omitted field lands as null = "unknown", which the publish path preserves.
    ...(metaKnown.category && s.category ? { category: s.category } : {}),
    ...(metaKnown.theme && s.theme ? { theme: s.theme } : {}),
  }
  if (!row.title_th) {
    inlineState.value = 'error'
    // B060 — the name is now settable right here (⚙ ตั้งค่าเพลง), so point at that, not at
    // the other editor
    inlineError.value = 'เพลงนี้ยังไม่มีชื่อภาษาไทย — ใส่ชื่อใน ⚙ ตั้งค่าเพลง ก่อน'
    return
  }
  // reuse this author's own open draft for the song instead of piling up new rows
  if (!inlineDraftId.value && s.id) {
    const { data } = await supabase
      .from('song_drafts')
      .select('id')
      .eq('author_id', session.value.user.id)
      .eq('song_id', s.id)
      .in('status', ['draft', 'pending', 'rejected'])
      .limit(1)
    if (data?.[0]) inlineDraftId.value = data[0].id
  }
  const { id, error } = await saveDraftRow(row, inlineDraftId.value)
  if (error) {
    inlineState.value = 'error'
    inlineError.value = error.message || 'บันทึกไม่สำเร็จ'
    return // the local working copy stays — nothing is lost by a failed save
  }
  inlineDraftId.value = id
  markInlineSaved()
  clearWorkingCopy(s.id) // stored on the server now; the recovery copy has done its job
}
// offered after a crash/reload: take the local copy, or drop it
function acceptRecovery() {
  if (recovery.value && liveSong.value) {
    // B060 — the copy carries the ⚙ settings too when it was written by a version that stored
    // them; an older copy has none, and then the loaded row's values stand (never blanked).
    const meta = recovery.value.meta || {}
    liveSong.value = { ...liveSong.value, ...meta, content: recovery.value.content }
    if (meta.category != null) metaKnown.category = true
    if (meta.theme != null) metaKnown.theme = true
    inlineState.value = 'dirty'
  }
  recovery.value = null
}
function discardRecovery() {
  clearWorkingCopy(liveSong.value?.id)
  recovery.value = null
}
const recoveryWhen = computed(() =>
  recovery.value ? new Date(recovery.value.savedAt).toLocaleString('th-TH') : '',
)

// Leaving with work that is not stored anywhere must never be silent (same guard EditorMode
// has for its own surface — B100). The local working copy survives a reload, but the user
// still has to be TOLD, or they will not know to come back for it.
function onBeforeUnload(e) {
  if (inlineState.value !== 'dirty') return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
onBeforeRouteLeave(() => {
  if (inlineState.value !== 'dirty') return true
  return window.confirm('งานที่แก้ในโหมดแก้ (✏️) ยังไม่ได้บันทึก — ออกจากหน้านี้เลยไหม?')
})
// save persistence stays inside the editor (it owns the editing state + Supabase writes);
// this is the contract's observability hook, kept so the shell can react later if needed
function onSave() {}

// each reading surface wants the song in a slightly different shape
// B053 — carry the song's source books (book_refs) + scripture reference through to the
// reading view so ฝึกร้อง shows the same "แหล่งเพลง"/📖 captions as the catalog card. These
// live on the raw DB row (loadedSong), not on liveSong, so read them from there.
// B060 — the ⚙ ตั้งค่าเพลง panel inside ฝึกร้อง's ✏️ editor edits ชื่ออังกฤษ/ธีม/หมวด too, so
// they travel down with the rest (they come back up as an `update-meta` patch). NOT `id`: the
// reading surface seeds MP3 export/arranger from what it is handed, and this stays a display
// shape, not the row.
const viewerSong = computed(() =>
  liveSong.value
    ? {
        number: liveSong.value.number,
        title_th: liveSong.value.title_th,
        title_en: liveSong.value.title_en,
        category: liveSong.value.category,
        theme: liveSong.value.theme,
        content: liveSong.value.content,
        book_refs: loadedSong.value?.book_refs,
        scripture: loadedSong.value?.scripture,
      }
    : null,
)
const sheetContent = computed(() => {
  const c = liveSong.value?.content
  if (!c) return { key: 'C', timeSignature: '4/4', lines: [] }
  return { ...c, lines: resolveContent(c) } // SongSheet reads v1-shaped `lines`
})
const titleText = computed(() => {
  const s = liveSong.value
  if (!s) return 'เพลง'
  return (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
})

// ---------- แผ่นเพลง (print) dock — DockKey fed ITEMS_PRINT (DS dockkey-print-edit §1) ----------
// The sheet used to be locked to ครบ · สมุดเพลง · ตัวอักษร · คีย์เดิม. These controls let the
// user tune what the paper prints; defaults keep the old locked behavior.
const DISPLAY_OPTS = [
  { value: 'all', label: 'ครบ (เนื้อ+คอร์ด+โน้ต)', chord: true, note: true, lyric: true },
  { value: 'chord', label: 'เนื้อ+คอร์ด', chord: true, note: false, lyric: true },
  { value: 'note', label: 'เนื้อ+โน้ต', chord: false, note: true, lyric: true },
  { value: 'lyric', label: 'เนื้อล้วน', chord: false, note: false, lyric: true },
  { value: 'noteonly', label: 'โน้ตล้วน', chord: false, note: true, lyric: false },
]
const CHORD_OPTS = [
  { value: 'letter', label: 'คอร์ดตัวอักษร (A B C)' },
  { value: 'roman', label: 'คอร์ดโรมัน (I IV V)' },
  { value: 'hidden', label: 'ซ่อนคอร์ด' },
]
const sheetDisplay = ref('all')
const sheetChord = ref('letter')
const sheetBook = ref('songbook') // 'songbook' = ทำนองครั้งเดียว · 'full' = โน้ตทุกเที่ยว
const sheetKey = ref('C')
const printAlpha = ref(0.96)
// Follow the open song's key. Keyed on the SONG (id) as well as the key itself: the editor is
// mounted alongside and emits a blank draft (key 'C') before the routed song lands, so watching
// the key value alone silently misses every song stored in C — the value never changes.
watch(() => (liveSong.value ? `${liveSong.value.id}|${liveSong.value.content?.key}` : ''), () => {
  const s = liveSong.value
  const k = s?.content?.key
  if (!k) return
  // A shared link's ?key= wins ONCE, for the song it was opened on (EPIC H round-trip) — and
  // only for a REAL song: spending it on the blank draft would leave the sheet on the stored key.
  if (linkKeyPending && (s.number != null || (s.title_th || '').trim())) {
    sheetKey.value = linkKey
    linkKeyPending = false
    return
  }
  sheetKey.value = k
}, { immediate: true })

const printDisplayDef = computed(() => DISPLAY_OPTS.find((o) => o.value === sheetDisplay.value) || DISPLAY_OPTS[0])
const printShowChord = computed(() => printDisplayDef.value.chord && sheetChord.value !== 'hidden')
const printShowNote = computed(() => printDisplayDef.value.note)
const printShowLyric = computed(() => printDisplayDef.value.lyric)
const sheetPrintChordSystem = computed(() => (sheetChord.value === 'roman' ? 'roman' : 'letter'))
const sheetPrintMode = computed(() => (printShowLyric.value && !printShowNote.value && !printShowChord.value ? 'lyrics' : 'full'))
const keyOptions = computed(() =>
  KEYS.map((k) => ({ value: k, label: k + (k === liveSong.value?.content?.key ? ' (ต้นฉบับ)' : '') })),
)
const printBasename = computed(() => (liveSong.value ? songBasename(liveSong.value) : 'song'))

const printItems = computed(() => [
  { id: 'grip', kind: 'grip', name: 'ย้าย/ย่อ', place: { anchor: 'left', row: 1 } },
  { id: 'print', kind: 'btn', name: 'พิมพ์ / บันทึก PDF', icon: 'printer', prime: true, place: { anchor: 'rightOf:grip', row: 1 }, run: printSheet },
  { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', place: { anchor: 'rightOf:print', row: 1 } },
  { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'display', kind: 'menu', name: 'แสดงผล', icon: 'layers', default: 'inSetting', pinnable: true, control: { options: DISPLAY_OPTS.map((o) => ({ value: o.value, label: o.label })), value: sheetDisplay.value, onPick: (v) => (sheetDisplay.value = v) } },
  { id: 'book', kind: 'menu', name: 'แบบแผ่น', icon: 'book-open', default: 'inSetting', pinnable: true, control: { options: [{ value: 'songbook', label: 'สมุดเพลง (ทำนองครั้งเดียว)' }, { value: 'full', label: 'เต็ม (โน้ตทุกเที่ยว)' }], value: sheetBook.value, onPick: (v) => (sheetBook.value = v) } },
  { id: 'chord', kind: 'menu', name: 'คอร์ด', icon: 'guitar', default: 'inSetting', pinnable: true, control: { options: CHORD_OPTS, value: sheetChord.value, onPick: (v) => (sheetChord.value = v) } },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', default: 'inSetting', pinnable: true, control: { options: keyOptions.value, value: sheetKey.value, badge: sheetKey.value, onPick: (v) => (sheetKey.value = v) } },
  { id: 'download', kind: 'btn', name: 'ดาวน์โหลด JSON', icon: 'download', default: 'inSetting', pinnable: true, run: () => downloadSong(liveSong.value) },
])

// Aa font popover state for the print dock (mirrors the sing dock's Aa)
const printFontPct = computed(() => Math.round(readingFontScale.value * 100))

// B002 (P'Aim-approved names): ฝึกร้อง · แผ่นเพลง · แก้ไข (ids stay view/sheet/edit)
// S1 icons (Lucide): ฝึกร้อง=mic · แผ่นเพลง=music · แก้ไข=pencil
const MODES = [
  { id: 'view', label: 'ฝึกร้อง', icon: 'mic', title: 'ฝึกร้อง (ร้องตาม)' },
  { id: 'sheet', label: 'แผ่นเพลง', icon: 'music', title: 'แผ่นเพลง (ไว้พิมพ์)' },
  { id: 'edit', label: 'แก้ไข', icon: 'pencil', title: 'แก้ไข' },
]

// ---------- the mode tabs vs the inline (✏️) editor — 24 ก.ค. ----------
// The ✏️ editor lives INSIDE ฝึกร้อง, so while it is open the tab strip was lying twice over:
// "ฝึกร้อง" showed as the current view although the user was clearly in an editor, and pressing
// it did literally nothing (verified: no state change, no dialog) — a dead control in the middle
// of the screen, which reads as "the site is broken". The other two tabs did switch, but walked
// out of the editor without a word even with unsaved work on screen.
// So: the tabs are the shell's ONE way of saying where you are. While the inline editor is open
// no tab is current, and pressing ANY of them means "take me out of the editor" — routed through
// the editor's own exit gate, which asks only when there is unsaved work (an always-on confirm
// is one people learn to click through).
const viewerRef = ref(null)
const viewerEditing = ref(false)
// Leaving the editor with unsaved work is announced HERE, not with a dialog, and not with a
// floating toast either: this whole task was about taking floating things off the sheet, so it
// is an in-flow banner in the same shape as the recovery offer below it. It says where the work
// went and gives one click back — and it stays until the user acts, because an auto-dismissing
// message about unsaved work is a message half the people never see.
const leftDirty = ref(false)
function onLeftDirty() { leftDirty.value = true }
function resumeEditing() {
  leftDirty.value = false
  mode.value = 'view'
  nextTick(() => viewerRef.value?.toggleEdit?.())
}
// saving (or undoing back to the saved state) makes the banner untrue — drop it
watch(inlineState, (s) => { if (s !== 'dirty') leftDirty.value = false })

function setMode(id) {
  if (viewerEditing.value) {
    // requestExitEdit returns false when the user chose "let me save first" — then we stay put
    if (viewerRef.value?.requestExitEdit && !viewerRef.value.requestExitEdit()) return
  }
  mode.value = id
}

// ---------- shell song picker (US-05) ----------
// "เปิด/เลือกเพลง" lives on the shell (not inside the editor) so it works in EVERY mode:
// a reader in ดู/แผ่น can jump to another song without first entering แก้. Picking a song
// navigates to /song/:id — the route watcher above loads it while KEEPING the current mode.
const songList = ref([])
async function loadSongList() {
  const { data } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content, verified')
    .order('number', { ascending: true })
  songList.value = data ?? []
}
// GATE (reuse bookshelf.visibleSongs — same source SongList + EditorMode use): anon sees only
// verified songs, team sees all. computed on tier so it re-filters on login/logout without
// reloading the list. Without this the shell's "เปิดเพลงอื่น" picker leaks unverified songs to
// the public — a separate code path from EditorMode's own picker (round-24 leak #2). Both the
// option list AND the ranked search below read this SAME gated list, so neither can leak.
const gatedSongs = computed(() => visibleSongs(songList.value, tier.value !== 'anon'))
// searchable options (ชื่อ · เลข · เนื้อร้อง · โน้ต — same haystack as the catalog page).
const pickerOptions = computed(() =>
  gatedSongs.value.map((s) => ({
    value: s.id,
    label: (s.number != null ? s.number + '. ' : '') + s.title_th,
    search: songHaystack(s),
  })),
)
// Ranked matching for the picker — hand ComboSelect the note-aware / fuzzy / book-ref engine
// (songSearch.searchSongs) instead of its substring `.includes`, so "5561" finds the melody
// "5 5 6 1", a 1-char typo still lands, and "ล.282" resolves by book reference. Returns the
// gated song ids best-first; ComboSelect renders those options in that order.
function rankSongs(query) {
  return searchSongs(gatedSongs.value, query).map((r) => r.song.id)
}

// the ⋮ เพิ่มเติม (overflow) menu shares the app-wide one-menu-at-a-time state (shellMenu).
// Locked design (ux-groundup-design.md): the shell actions read ‹back · title · ✏️edit ·
// ↗share · ⋮more — "less-common actions" (Material overflow pattern) live behind ⋮, and
// "สร้างเพลงใหม่" is GONE from here (create lives on the home catalog only, per P'Aim).
const openMenu = shellMenu
// "เปิดเพลงอื่น…" expands to a search box INSIDE the menu (no stacked dialog); reset each open.
const openOther = ref(false)
// B018: on a phone the panel is a viewport-inset sheet (see CSS) anchored just under
// the shell bar. The bar height varies (2-row on mobile · login wraps), so we read its
// real bottom on open instead of hard-coding a value that would overlap or gap.
const panelTop = ref(56)
function toggleMoreMenu() {
  openMenu.value = openMenu.value === 'more' ? null : 'more'
  if (openMenu.value === 'more') {
    openOther.value = false
    nextTick(() => {
      const bar = document.querySelector('.shell-bar')
      if (bar) panelTop.value = Math.round(bar.getBoundingClientRect().bottom)
    })
  }
}
function closeMore() { openMenu.value = null; openOther.value = false }
// S2: จิ้มเพลง = เปิดเลย (no OK button). ComboSelect emits the id on click/Enter; we open
// it right away, keeping the current mode (US-05). Same-song pick just closes the menu.
function openSong(id) {
  closeMore()
  if (!id || id === liveSong.value?.id) return
  router.push('/song/' + id)
}

// เปิดไฟล์ JSON (US-C02, on-demand) — bring a downloaded/parser-produced song file back
// into the SAME inline editor surface, without touching the DB. Routed through jsonIO's
// importSong → validateSong (v1→v2 migrate + friendly Thai errors), so a bad file never
// crashes and warnings surface. id stays null → it keeps the anon "ดาวน์โหลด JSON" path,
// never a server row, until a Tier-1+ user chooses บันทึกร่าง.
function openFile() {
  closeMore()
  // non-destructive: an unsaved ✏️ edit must not be clobbered by opening another file.
  if (inlineState.value === 'dirty' &&
      !window.confirm('งานที่แก้ (✏️) ยังไม่ได้บันทึก — เปิดไฟล์อื่นทับเลยไหม?')) return
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'application/json,.json'
  inp.onchange = async () => {
    const file = inp.files && inp.files[0]
    if (!file) return
    const res = await importSong(file)
    if (!res.ok) { importWarn.value = true; importMsg.value = res.error; return }
    loadedSong.value = null // a file has no catalog row (no book_refs/scripture)
    liveSong.value = {
      id: null,
      number: res.song.number,
      title_th: res.song.title_th,
      title_en: res.song.title_en,
      category: null,
      theme: null,
      content: res.song.content,
    }
    inlineState.value = 'clean'
    cleanContent.value = stamp(res.song.content)
    cleanMeta.value = stamp(metaOf(liveSong.value))
    metaKnown.category = false
    metaKnown.theme = false
    inlineError.value = ''
    inlineDraftId.value = null
    recovery.value = null
    mode.value = 'view' // open on the reading/✏️ surface, not the old grid
    importWarn.value = res.warnings.length > 0
    importMsg.value = res.warnings.length
      ? 'เปิดไฟล์แล้ว — มีจุดที่ควรตรวจ: ' + res.warnings.join(' · ')
      : '📂 เปิดไฟล์ JSON แล้ว — แก้ต่อได้เลย'
  }
  inp.click()
}

// ---------- print (US-06 / US-I3) ----------
// Just open the print dialog. The filename comes from document.title (set to the song
// on load, above); the page layout — centered title + running footer — is owned by
// SongSheet + lib/printChrome.js. Tell users to switch off the browser's own headers.
function printSheet() {
  window.print()
}

// ---------- the ONE shared dock (dock-core / N1) ----------
// Each of the three modes mounts its OWN DockKey — ฝึกร้อง in SongViewer, แผ่นเพลง here
// (ITEMS_PRINT), แก้ไข in EditorMode (ITEMS_EDIT). They share the DockKey ENGINE (one file),
// so collapse/drag/Setting feel identical across modes while each keeps its own descriptor
// list. The old single shared <StudioDock> has been removed.
</script>

<template>
  <div>
    <!-- left the ✏️ editor with unsaved work — say so in flow, above whatever mode they went to,
         with the way straight back. No dialog (the work is mirrored locally, so nothing is at
         stake) and no floating toast (nothing floats over the sheet any more). -->
    <div v-if="leftDirty" class="sv-leftdirty no-print" role="status">
      <Icon name="pencil" :size="16" />
      <span>ออกจากโหมดแก้แล้ว · งานที่ยังไม่บันทึกยังอยู่ครบ (เก็บสำเนาไว้ในเครื่องให้แล้ว)</span>
      <button class="rec-btn primary" @click="resumeEditing">กลับไปแก้ต่อ</button>
      <button class="rec-btn" @click="leftDirty = false">ปิด</button>
    </div>

    <!-- เปิดไฟล์ JSON result — a bad file's plain-Thai reason, or v1→v2 warnings to eyeball.
         Persistent (role=status), not a disappearing toast (WCAG 3.3.1). -->
    <div v-if="importMsg" class="sv-import-msg no-print" :class="{ warn: importWarn }" role="status">
      <Icon :name="importWarn ? 'triangle-alert' : 'folder-open'" :size="16" />
      <span>{{ importMsg }}</span>
      <button class="rec-btn" @click="importMsg = ''">ปิด</button>
    </div>

    <!-- shell chrome teleported into the app-wide ShellBar: static title (ดู/แผ่น) + the
         3-way mode switch (always visible). The editor teleports its own title input +
         เพลง/จัดการ menus while it is the active mode. -->
    <Teleport to="#shell-title">
      <template v-if="mode !== 'edit'">
        <span class="sb-sep" aria-hidden="true"></span>
        <span class="sb-title-static">{{ titleText }}</span>
      </template>
    </Teleport>
    <Teleport to="#shell-menus">
      <!-- ↗ แชร์ — one action for the open song, in EVERY mode (a reader in ฝึกร้อง/แผ่นเพลง
           should not have to go anywhere to send the song on). Icon-only: the label lives in
           aria-label + title, and the target is a full 44px on touch (see CSS). -->
      <button
        v-if="shareTarget"
        type="button"
        class="sb-share-btn"
        :aria-label="t('share.songBtn')"
        :title="t('share.songBtn')"
        :aria-expanded="shareOpen"
        aria-haspopup="dialog"
        @click.stop="shareOpen = true"
      >
        <Icon name="share" :size="16" />
      </button>
      <!-- ⋮ เพิ่มเติม (overflow) — the "less-common actions" for the open song (Material overflow
           pattern), rightmost of the shell actions per the locked design. This lane builds the
           CONTAINER + "เปิดเพลงอื่น…"; print/download/★/➕/⚙ slots are wired by their own lanes.
           ⛔ no "สร้างเพลงใหม่" here (create = home catalog). Shown in อ่าน/แผ่น; in แก้ไข the editor
           teleports its own richer menus, so ⋮ steps aside. -->
      <div v-if="mode !== 'edit'" class="sb-menu">
        <button
          class="sb-text sb-more-btn"
          :aria-expanded="openMenu === 'more'"
          aria-haspopup="menu"
          aria-label="เพิ่มเติม"
          title="เพิ่มเติม"
          @click.stop="toggleMoreMenu"
        >
          <Icon name="more-vertical" :size="18" />
        </button>
        <div
          v-if="openMenu === 'more'"
          class="sb-dropdown sb-more-panel"
          :style="{ '--sb-panel-top': panelTop + 'px' }"
          role="menu"
          @click.stop
          @keydown.esc="closeMore"
        >
          <button class="sb-more-item" role="menuitem" :aria-expanded="openOther" @click="openOther = !openOther">
            <Icon name="search" :size="16" /> เปิดเพลงอื่น…
          </button>
          <div v-if="openOther" class="sb-more-search">
            <ComboSelect
              :model-value="''"
              :options="pickerOptions"
              :rank-fn="rankSongs"
              placeholder="พิมพ์ค้นหา: ชื่อ เลข เนื้อร้อง โน้ต…"
              aria-label="ค้นหาเพลงเพื่อเปิด — จิ้มเพลงเพื่อเปิดทันที"
              width="100%"
              autofocus
              @update:model-value="openSong"
            />
          </div>
          <!-- ไฟล์ (File) group — import/export a song as its own JSON. "เปิดไฟล์ JSON" is a
               sibling of "เปิดเพลงอื่น…" (both = open something into this surface); the divider
               marks the File actions off from the library-open above. Anon carries their work
               as a file; the gate is only บันทึกร่าง (server), owned by the editor. -->
          <div class="sb-more-sep" role="separator"></div>
          <button class="sb-more-item" role="menuitem" @click="openFile">
            <Icon name="folder-open" :size="16" /> เปิดไฟล์ JSON…
          </button>
          <button v-if="liveSong" class="sb-more-item" role="menuitem" @click="closeMore(); downloadSong(liveSong)">
            <Icon name="download" :size="16" /> ดาวน์โหลด JSON
          </button>
        </div>
      </div>
      <!-- the 3-way mode switch — HIDDEN while the inline (✏️) editor is open (item 2): the
           editor has its own "เสร็จ"/Esc way out, and a tab that reads as current while you are
           in an editor lies. Slide-fade only (opacity/transform), never display/width — so the
           shell-bar height is unchanged and the sheet below never shifts (AC-2.3). -->
      <span
        class="sb-modes"
        :class="{ 'sb-modes-hidden': viewerEditing }"
        role="group"
        aria-label="เลือกมุมมอง"
        :aria-hidden="viewerEditing"
      >
        <button
          v-for="m in MODES"
          :key="m.id"
          class="sb-mode-btn"
          :class="{ on: mode === m.id && !viewerEditing }"
          :aria-pressed="mode === m.id && !viewerEditing"
          :tabindex="viewerEditing ? -1 : 0"
          :title="viewerEditing ? m.title + ' — ออกจากโหมดแก้' : m.title"
          @click="setMode(m.id)"
        >
          <Icon :name="m.icon" :size="16" /><span class="sb-mode-label">{{ m.label }}</span>
        </button>
      </span>
    </Teleport>

    <!-- ===== ดู — reading / sing-along view (WT-A owns SongViewer) ===== -->
    <div v-show="mode === 'view'">
      <!-- A-fix: work left in the browser from a crash/reload — offered, never auto-applied -->
      <div v-if="recovery" class="sv-recover no-print" role="status">
        <span>พบงานที่แก้ไว้ในเครื่องแต่ยังไม่ได้บันทึก ({{ recoveryWhen }})</span>
        <button class="rec-btn primary" @click="acceptRecovery">กู้คืนงานนั้น</button>
        <button class="rec-btn" @click="discardRecovery">ทิ้ง ใช้ฉบับปัจจุบัน</button>
      </div>
      <SongViewer
        v-if="viewerSong"
        ref="viewerRef"
        :song="viewerSong"
        :tier="tier"
        :save-state="inlineState"
        :save-error="inlineError"
        :recoverable="workCopySafe"
        :start-key="linkKey"
        @update-content="onViewerContent"
        @update-meta="onViewerMeta"
        @update-music="onViewerMusic"
        @save="saveInlineDraft"
        @key-change="viewKey = $event"
        @update:editing="viewerEditing = $event"
        @left-dirty="onLeftDirty"
      />
      <p v-else class="muted" style="padding: 16px">ยังไม่มีเพลงให้แสดง — ไปที่ “แก้” เพื่อเริ่มสร้างเพลง</p>
    </div>

    <!-- ===== แผ่น — print sheet (WT-B owns SongSheet) · พิมพ์ = the shared dock (N1) ===== -->
    <div v-show="mode === 'sheet'" class="sheet-workspace">
      <div class="card">
        <h2 class="sheet-title no-print">{{ titleText }}</h2>
        <!-- the top-nav "Aa" reader size (store.readingFontScale) scales แผ่นเพลง on screen
             too (B043 · was only wired in ฝึกร้อง). Reset to 1rem for print so the A4 sheet
             keeps its fixed layout regardless of the on-screen reading size. -->
        <div class="sheet-read-scale" :style="{ fontSize: readingFontScale + 'rem' }">
          <!-- B059: แผ่นเพลง prints like a hymn book — each melody once, reused verses as
               lyrics only (songbook). The DockKey ITEMS_PRINT controls tune what prints. -->
          <SongSheet
            :content="sheetContent"
            :mode="sheetPrintMode"
            :chord-system="sheetPrintChordSystem"
            :show-chord="printShowChord"
            :show-note="printShowNote"
            :show-lyric="printShowLyric"
            :display-key="sheetKey"
            :song-title="titleText"
            :songbook="sheetBook === 'songbook'"
          />
        </div>
      </div>

      <!-- แผ่นเพลง dock — DockKey engine fed ITEMS_PRINT (grip · พิมพ์ · export · Aa · ⚙) -->
      <DockKey :items="printItems" store-key="print" v-model:alpha="printAlpha">
        <template #cell-export="{ open, toggle, close }">
          <ExportTool
            :content="liveSong && liveSong.content"
            :filename-base="printBasename"
            :on-json="() => downloadSong(liveSong)"
            :open="open"
            @toggle="toggle"
            @close="close"
          />
        </template>
        <template #cell-scale="{ open, toggle }">
          <button
            class="st-aa-btn"
            :class="{ on: open }"
            :aria-expanded="open"
            :title="'ขนาดตัวอักษร ' + printFontPct + '%'"
            aria-label="ขนาดตัวอักษร"
            @click.stop="toggle"
          ><b>Aa</b></button>
          <div v-if="open" class="dk-pop st-fontpop" role="menu" aria-label="ขนาดตัวอักษร" @click.stop>
            <div class="st-fonttitle">ขนาดตัวอักษร</div>
            <div class="st-fontrow">
              <span class="st-fonta-sm" aria-hidden="true">A</span>
              <input class="st-fontslider" type="range" min="80" max="220" step="10" :value="printFontPct" aria-label="ปรับขนาดตัวอักษร" @input="setFontScale(+$event.target.value / 100)" />
              <span class="st-fonta-lg" aria-hidden="true">A</span>
            </div>
            <div class="st-fontfoot">
              <span class="st-fontval">{{ printFontPct }}%</span>
              <button class="st-fontreset" :disabled="printFontPct === 100" @click="setFontScale(1)">↺ 100%</button>
            </div>
          </div>
        </template>
      </DockKey>
    </div>

    <!-- ===== แก้ — the editor (WT-D owns EditorMode). v-show keeps it mounted so its
         in-progress state survives every mode switch. -->
    <EditorMode
      v-show="mode === 'edit'"
      :key="editorNonce"
      :song="loadedSong"
      :tier="tier"
      :active="mode === 'edit'"
      @change="onChange"
      @save="onSave"
    />
    <!-- each mode now mounts its OWN DockKey (ฝึกร้อง=SongViewer · แผ่นเพลง=above · แก้ไข=EditorMode);
         the shared StudioDock is retired. -->

    <!-- ↗ แชร์เพลงนี้ — the shared surface (link + QR + OS share). No email/backup row: that is
         the playlist's shape; a song is just its link. -->
    <ShareSheet v-if="shareOpen && shareTarget" v-bind="shareTarget" @close="shareOpen = false" />
  </div>
</template>

<style scoped>
/* A-fix: the recovery offer for local work found on (re)open. In flow above the sheet — it is
   a decision to make once, not a floating layer, so it needs no z-index. */
.sv-recover {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--warn-line, #fcd34d);
  background: var(--warn-bg, #fffbeb);
  color: var(--warn-text, #92400e);
  font-size: 14px;
}
.rec-btn {
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--surface, #fff);
  color: var(--ink, #0f172a);
  font-size: 13px;
  cursor: pointer;
}
.rec-btn.primary {
  margin-inline-start: auto;
  border-color: var(--brand, #8b4513);
  background: var(--brand, #8b4513);
  color: #fff;
  font-weight: 600;
}

/* "you left the editor, the work is safe, here is the way back" — same in-flow shape as the
   recovery offer above, one tone calmer (this is information, not a decision that can go wrong) */
.sv-leftdirty {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--cream, #faf6ef);
  color: var(--ink, #0f172a);
  font-size: 14px;
}

/* เปิดไฟล์ JSON result banner — same in-flow shape as sv-leftdirty; the .warn tone
   flags a rejected file or v1→v2 caveats the human should check. */
.sv-import-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--cream, #faf6ef);
  color: var(--ink, #0f172a);
  font-size: 14px;
}
.sv-import-msg.warn { border-color: #d97706; background: #fffbeb; }

/* teleported into #shell-title / #shell-menus — scoped styles still apply to elements
   this component renders, even when they live in the shared ShellBar */
.sb-sep {
  width: 1px;
  align-self: stretch;
  background: var(--line);
  min-height: 22px;
}
.sb-title-static {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ink);
  padding: 4px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sb-modes {
  display: inline-flex;
  gap: 2px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 2px;
  /* item 2 — slide-fade when the inline editor hides/shows the tabs. Opacity + transform ONLY
     (never display/width), so the box keeps its space and the shell-bar height never changes →
     the sheet below does not shift (AC-2.3). */
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.sb-modes-hidden {
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .sb-modes { transition: none; }
}
.sb-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: var(--muted);
  font: inherit;
  font-size: 0.95rem;
  padding: 6px 10px;
  border-radius: 8px;
  min-height: 34px;
  cursor: pointer;
}
.sb-mode-btn.on {
  background: #fff;
  color: var(--brand);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
@media (hover: hover) {
  .sb-mode-btn:not(.on):hover {
    color: var(--ink);
  }
}
/* ↗ แชร์ — sits next to the mode switch; same 34px height as .sb-mode-btn so the two chrome
   controls read as one row (WCAG 2.2 AA target size = 24px min; 34 desktop / 44 touch). */
.sb-share-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--muted);
  min-height: 34px;
  min-width: 34px;
  padding: 0 8px;
  cursor: pointer;
}
@media (hover: hover) {
  .sb-share-btn:hover { color: var(--brand); border-color: var(--brand); }
}
.sb-share-btn[aria-expanded='true'] { color: var(--brand); border-color: var(--brand); }

.sheet-title {
  margin: 0 0 var(--sp-3);
  color: var(--brand);
  text-align: center;
  font-size: var(--fs-xl);
}

/* ⋮ เพิ่มเติม (overflow) — teleported into the shared ShellBar. The trigger is an icon button
   sized like ↗ แชร์ (same 34px height, 44px touch) so the shell actions read as one row. */
.sb-more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--muted);
  min-height: 34px;
  min-width: 34px;
  padding: 0 8px;
  cursor: pointer;
}
@media (hover: hover) {
  .sb-more-btn:hover { color: var(--brand); border-color: var(--brand); }
}
.sb-more-btn[aria-expanded='true'] { color: var(--brand); border-color: var(--brand); }
.sb-more-panel {
  min-width: 300px;
  gap: 6px;
}
/* menu rows — a plain full-width item; "เปิดเพลงอื่น…" reveals the search box below it */
.sb-more-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 12px;
  font: inherit;
  min-height: 40px;
  cursor: pointer;
  text-align: start;
}
.sb-more-item:hover { border-color: var(--brand); color: var(--brand); }
.sb-more-search { padding-top: 2px; }
.sb-more-sep { height: 1px; background: var(--line); margin: 6px 2px; }

/* โหมดแผ่น (US-06): พิมพ์ is now the shared dock's print tool (N1). Leave room so the
   fixed dock never covers the last staff line. */
.sheet-workspace {
  /* the dock MEASURES itself into --dock-h (DockKey) — a hard-coded 88px was smaller than
     the dock really is on a phone (214px at 360w), so the last staff line stayed covered. */
  padding-bottom: calc(var(--dock-h, 88px) + 16px);
}
/* Aa scales the sheet on screen; print keeps the fixed A4 size (protect pagination) */
.sheet-read-scale { font-size: inherit; }
@media print {
  .sheet-read-scale { font-size: 1rem !important; }
}

@media (max-width: 760px) {
  .sb-mode-label {
    display: none;
  }
  .sb-title-static {
    font-size: var(--fs-base);
  }
  /* the mode switch (ฝึกร้อง·แผ่นเพลง·แก้ไข) goes icon-only on a phone — give each
     a full 44px touch target so the three are comfortably tappable */
  .sb-mode-btn { min-height: var(--touch-min); min-width: var(--touch-min); justify-content: center; }
  /* ↗ แชร์ · ⋮ เพิ่มเติม are icon-only at every width — full touch target on a phone */
  .sb-share-btn { min-height: var(--touch-min); min-width: var(--touch-min); }
  .sb-more-btn { min-height: var(--touch-min); min-width: var(--touch-min); }
  .sb-more-item { min-height: var(--touch-min); }
  /* B008/B018: on a phone the panel is a viewport-inset sheet under the bar — full-width,
     can't run off either edge, whatever the button's x position. */
  .sb-more-panel {
    position: fixed;
    top: var(--sb-panel-top, 56px);
    left: var(--sp-2);
    right: var(--sp-2);
    min-width: 0;
    max-width: none;
    width: auto;
  }
}

/* ---------- แผ่นเพลง dock: Aa font-size slot (mirrors the sing dock) ---------- */
.st-aa-btn {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 8px; height: var(--touch-min); min-height: 0; min-width: var(--touch-min); cursor: pointer;
}
.st-aa-btn b { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; }
.st-aa-btn.on { border-color: var(--brand); color: var(--brand); }
/* slot popovers carry their own position; DockKey clamps them by the .dk-pop class */
.st-fontpop {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px); right: 8px; left: auto;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: var(--z-popover);
  width: max-content; min-width: 230px; max-width: calc(100vw - 24px); padding: 12px;
}
.st-fonttitle { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.st-fontrow { display: flex; align-items: center; gap: 10px; }
.st-fonta-sm { font-size: 13px; flex: 0 0 auto; }
.st-fonta-lg { font-size: 22px; font-weight: 700; flex: 0 0 auto; }
.st-fontslider { flex: 1; min-width: 0; accent-color: var(--brand); height: var(--touch-min); }
.st-fontfoot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.st-fontval { font-size: 11px; color: var(--muted); }
.st-fontreset { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 8px; padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; min-height: 32px; }
.st-fontreset:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.st-fontreset:disabled { opacity: 0.4; cursor: default; }
</style>
