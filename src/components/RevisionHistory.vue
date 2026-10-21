<script setup>
// B028 — "ประวัติการแก้ไข": the read-only timeline of who did what to a song, across both
// the draft (editor) and published (approver) sides. Reads through lib/auditLog.js, which
// unifies the two tables by song_ref and collapses "approve+publish" into one line. Names
// come from the write-time snapshot (actor_name), so they never vanish if a user is removed.
import { ref, watch, computed } from 'vue'
import Icon from './Icon.vue'
import SongSheet from './SongSheet.vue'
import { loadSongHistory, eventMeta, actorLabel, rowDiff } from '../lib/auditLog.js'
import { migrateToV2, resolveContent } from '../lib/songModel.js'

const props = defineProps({
  songId: { type: String, default: null },
  draftId: { type: String, default: null },
  canRestore: { type: Boolean, default: false }, // approvers may roll a published song back
  profilesMap: { type: Object, default: () => ({}) }, // fallback names for pre-004 rows only
  // ใบ v3/pleng#133 — what just happened, shown INSIDE the panel. The editor's own status line
  // sits behind this panel, so a message left there after pressing ย้อน is invisible: พี่เปา
  // pressed it, the song really was rolled back, and she saw nothing at all (21 ต.ค. 2569).
  notice: { type: String, default: '' },
})
const emit = defineEmits(['restore'])

const entries = ref([])
const loading = ref(false)

async function reload() {
  if (!props.songId && !props.draftId) {
    entries.value = []
    return
  }
  loading.value = true
  entries.value = await loadSongHistory({ songId: props.songId, draftId: props.draftId })
  loading.value = false
}
watch(() => [props.songId, props.draftId], reload, { immediate: true })
defineExpose({ reload })

const isEmpty = computed(() => !loading.value && entries.value.length === 0)

// ใบ v3/pleng#134 — พี่เปา: "ควรมีปุ่ม preview ว่าถ้าเอาจะได้อะไร".
// Someone recovering a song saved over by mistake has to find WHICH version still has the whole
// song, and the one-line summary beside each row cannot tell them: it was written for the old
// song shape and reads `content.lines`, which a v2 song does not have — so for today's songs it
// says nothing but the title, number, key and meter. She pressed ย้อน once, got a version with
// the same short content back, and lost the trip. Every row already carries the full snapshot,
// so showing it costs no extra query and writes nothing.
const previewId = ref(null)
function togglePreview(e) {
  previewId.value = previewId.value === e.id ? null : e.id
}

// The snapshot of a row, read for display only. v1 rows are migrated first so one renderer
// covers both shapes; anything unreadable returns null and the row simply offers no preview.
function previewOf(e) {
  const row = e.after ?? e.new_row
  if (!row || !row.content) return null
  try {
    const { content: raw } = migrateToV2(row.content)
    // An old snapshot can carry a blank slot as `null`, which the expander chokes on
    // (`null.startsWith`). Preview is read-only and is wanted precisely on the messy versions,
    // so normalise a missing word to an empty one rather than losing the whole preview.
    const content = {
      ...raw,
      arrangement: (raw.arrangement || []).map((a) => ({
        ...a,
        syllables: (a.syllables || []).map((x) => String(x ?? '')),
      })),
    }
    const stanzas = content.stanzas || []
    const arrangement = content.arrangement || []
    return {
      title: (row.number != null ? row.number + '. ' : '') + (row.title_th || 'เพลง'),
      parts: arrangement.length,
      melodyLines: stanzas.reduce((n, st) => n + ((st.lines || []).length), 0),
      words: arrangement.reduce((n, a) => n + a.syllables.filter((x) => x.trim()).length, 0),
      content: { ...content, lines: resolveContent(content) },
    }
  } catch {
    return null
  }
}
const previews = computed(() => {
  const out = {}
  for (const e of entries.value) out[e.id] = previewOf(e)
  return out
})

function fmtTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return ts
  }
}
</script>

<template>
  <div class="rev-hist">
    <p v-if="notice" class="rev-notice" role="status">{{ notice }}</p>
    <p v-if="loading" class="rev-muted">กำลังโหลดประวัติ…</p>
    <p v-else-if="isEmpty" class="rev-muted">ยังไม่มีประวัติการแก้ไขสำหรับเพลงนี้</p>

    <ol v-else class="rev-list">
      <li v-for="e in entries" :key="e.id" class="rev-item" :class="'hand-' + eventMeta(e.event).hand">
        <span class="rev-ico" :class="'hand-' + eventMeta(e.event).hand" aria-hidden="true">
          <Icon :name="eventMeta(e.event).icon" :size="16" />
        </span>
        <div class="rev-body">
          <div class="rev-line1">
            <span class="rev-event">{{ eventMeta(e.event).label }}</span>
            <span class="rev-by">โดย {{ actorLabel(e, profilesMap) }}</span>
            <span class="rev-time">{{ fmtTime(e.created_at) }}</span>
            <button
              v-if="previews[e.id]"
              type="button"
              class="rev-peek"
              :aria-expanded="previewId === e.id"
              @click="togglePreview(e)"
            >
              <Icon name="eye" :size="13" />
              {{ previewId === e.id ? 'ปิดตัวอย่าง' : 'ดูก่อน' }}
            </button>
            <button
              v-if="canRestore && (e.after || e.new_row)"
              type="button"
              class="rev-restore"
              @click="emit('restore', e)"
            >
              <Icon name="rotate-ccw" :size="13" /> ย้อนมาเวอร์ชันนี้
            </button>
          </div>
          <p v-if="e.note" class="rev-note">“{{ e.note }}”</p>
          <ul v-if="rowDiff(e).length" class="rev-diff">
            <li v-for="(d, i) in rowDiff(e)" :key="i">{{ d }}</li>
          </ul>
          <!-- ใบ#134 — the numbers first: someone comparing several versions reads those faster
               than a picture. The sheet below is the proof behind them. -->
          <div v-if="previewId === e.id && previews[e.id]" class="rev-preview">
            <p class="rev-preview-sum">
              <b>{{ previews[e.id].title }}</b>
              · {{ previews[e.id].parts }} ท่อน
              · ทำนอง {{ previews[e.id].melodyLines }} บรรทัด
              · {{ previews[e.id].words }} คำ
            </p>
            <div class="rev-preview-sheet">
              <SongSheet :content="previews[e.id].content" mode="full" />
            </div>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.rev-hist {
  font-size: var(--fs-sm, 0.9rem);
}
.rev-muted {
  color: var(--muted);
  margin: 8px 0;
}
.rev-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rev-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-left-width: 3px;
  border-radius: 8px;
  background: var(--bg);
}
/* editor stage vs approver stage — a glance tells you which hand did it (US-3) */
.rev-item.hand-editor {
  border-left-color: var(--note-blue, #2f6fed);
}
.rev-item.hand-approver {
  border-left-color: var(--brand);
}
.rev-ico {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
}
.rev-ico.hand-editor {
  background: var(--note-blue, #2f6fed);
}
.rev-ico.hand-approver {
  background: var(--brand);
}
.rev-body {
  flex: 1 1 auto;
  min-width: 0;
}
.rev-line1 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}
.rev-event {
  font-weight: 600;
  color: var(--ink);
}
.rev-by {
  color: var(--ink);
}
.rev-time {
  color: var(--muted);
  font-size: var(--fs-xs, 0.8rem);
}
.rev-note {
  margin: 4px 0 0;
  color: var(--ink);
  font-style: italic;
}
.rev-diff {
  margin: 4px 0 0 18px;
  padding: 0;
  color: var(--muted);
}
/* ใบ#133 — what just happened, at the top of the panel where the reader is already looking */
.rev-notice {
  margin: 0 0 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--cream, #faf7f2);
  font-size: 0.9em;
}
/* ใบ#134 — "ดูก่อน" sits beside ย้อนมาเวอร์ชันนี้ and reads as the quieter of the two */
.rev-peek {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 0.85em;
  cursor: pointer;
}
.rev-peek:hover { color: var(--ink); }
.rev-peek[aria-expanded='true'] { color: var(--ink); border-color: var(--ink); }
/* when both buttons are there, only the FIRST one takes the leftover space */
.rev-peek + .rev-restore { margin-left: 6px; }
.rev-preview {
  margin: 6px 0 2px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}
.rev-preview-sum { margin: 0 0 6px; font-size: 0.9em; }
/* the sheet is a LOOK, not a workspace: let a wide song scroll rather than reflow the panel */
.rev-preview-sheet {
  overflow-x: auto;
  font-size: 0.85em;
}
.rev-restore {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font-size: var(--fs-xs, 0.8rem);
}
.rev-restore:hover {
  background: var(--cream-hover, rgba(0, 0, 0, 0.05));
}
</style>
