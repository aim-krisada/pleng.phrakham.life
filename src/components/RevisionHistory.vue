<script setup>
// B028 — "ประวัติการแก้ไข": the read-only timeline of who did what to a song, across both
// the draft (editor) and published (approver) sides. Reads through lib/auditLog.js, which
// unifies the two tables by song_ref and collapses "approve+publish" into one line. Names
// come from the write-time snapshot (actor_name), so they never vanish if a user is removed.
import { ref, watch, computed } from 'vue'
import Icon from './Icon.vue'
import { loadSongHistory, eventMeta, actorLabel, rowDiff } from '../lib/auditLog.js'

const props = defineProps({
  songId: { type: String, default: null },
  draftId: { type: String, default: null },
  canRestore: { type: Boolean, default: false }, // approvers may roll a published song back
  profilesMap: { type: Object, default: () => ({}) }, // fallback names for pre-004 rows only
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
