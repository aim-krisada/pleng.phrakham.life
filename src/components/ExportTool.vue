<script setup>
// ExportTool — the DockKey "ดาวน์โหลด/ส่งออก" control: one menu = PDF · JSON · MP3, shared by
// every page's dock (ฝึกร้อง/แผ่นเพลง/แก้ไข). Mounted inside a DockKey #cell-export slot, so it
// rides the engine's one-popover-at-a-time (open/toggle/close) + on-screen clamp (.dk-pop).
// MP3 encodes in the browser (audioExport, imported on demand) with the same staged
// estimate + progress + ETA UX as the navbar DownloadTool (long-task de-facto pattern).
import { ref, computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  content: { type: Object, default: null }, // playable song content → MP3
  filenameBase: { type: String, default: 'song' }, // shared basename for PDF/MP3
  onJson: { type: Function, default: null }, // page-specific JSON download (meta differs)
  open: { type: Boolean, default: false }, // from the DockKey slot (one popover at a time)
  label: { type: String, default: 'ดาวน์โหลด' },
  // MP3 render key/tempo (ฝึกร้อง exports in the chosen key/speed = matches "ฟัง"; print/edit
  // omit → the song's native key/bpm).
  bpm: { type: Number, default: 0 },
  transpose: { type: Number, default: 0 },
  voices: { type: String, default: 'melody' }, // B104: 'melody' | 'chords' | 'both' — MP3 matches "ฟัง"
  // golden-piano — when the page plays through the arranger, hand the MP3 the SAME recipe so the
  // download carries the full arrangement (referee, legato, ลูกเล่น, humanize, rubato), not a plain
  // synth melody. arranger:false (default) keeps the legacy plain export for print/editor callers.
  arranger: { type: Boolean, default: false },
  arrangeCfg: { type: Object, default: () => ({}) },
  instrument: { type: String, default: 'synth' },
  songId: { type: [String, Number], default: undefined },
})
const emit = defineEmits(['toggle', 'close'])

// ---------- MP3 export state (mirrors DownloadTool) ----------
const mp3Stage = ref('') // '' | 'render' | 'encode' | 'done'
const mp3Pct = ref(0)
const mp3Est = ref(null)
const mp3Eta = ref(null)
const mp3Error = ref('')
const mp3Busy = computed(() => mp3Stage.value !== '')

function fmtDur(s) {
  s = Math.max(0, Math.round(s))
  const m = Math.floor(s / 60)
  return m ? `${m} นาที ${s % 60} วิ` : `${s % 60} วิ`
}
function fmtSize(b) {
  return b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'
}

function printPdf() {
  emit('close')
  const prev = document.title
  document.title = props.filenameBase
  const restore = () => { document.title = prev; window.removeEventListener('afterprint', restore) }
  window.addEventListener('afterprint', restore)
  window.print()
}
function downloadJson() {
  emit('close')
  props.onJson?.()
}
async function downloadMp3() {
  if (mp3Busy.value || !props.content) return
  mp3Error.value = ''
  mp3Eta.value = null
  mp3Pct.value = 0
  try {
    const { songToMp3Blob, estimateMp3 } = await import('../lib/audioExport.js')
    const bpm = props.bpm || undefined
    mp3Est.value = estimateMp3(props.content, { bpm })
    mp3Stage.value = 'render'
    let encodeStart = 0
    const { blob } = await songToMp3Blob(props.content, {
      bpm,
      transpose: props.transpose || 0,
      voices: props.voices || 'melody',
      arranger: props.arranger,
      arrangeCfg: props.arrangeCfg,
      instrument: props.instrument,
      songId: props.songId,
      onProgress: ({ stage, fraction }) => {
        mp3Stage.value = stage
        if (stage === 'encode') {
          mp3Pct.value = Math.round(fraction * 100)
          if (!encodeStart) encodeStart = performance.now()
          else if (fraction > 0.02) mp3Eta.value = (((performance.now() - encodeStart) / 1000) * (1 - fraction)) / fraction
        }
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.filenameBase + '.mp3'
    a.click()
    URL.revokeObjectURL(url)
    emit('close')
  } catch (e) {
    mp3Error.value = e?.message || 'สร้างไฟล์เสียงไม่สำเร็จ'
  } finally {
    mp3Stage.value = ''
    mp3Eta.value = null
  }
}
</script>

<template>
  <span class="et-wrap">
    <!-- icon-only ghost button (§A · B7): download is a tool, not the primary action -->
    <button
      class="dk-btn et-trig"
      :class="{ on: open }"
      :aria-expanded="open"
      :aria-label="label"
      :title="label"
      @click.stop="emit('toggle')"
    ><Icon name="download" :size="20" /></button>

    <div v-if="open" class="dk-pop et-menu" role="menu" @click.stop>
      <button class="et-row" role="menuitem" @click="printPdf"><Icon name="printer" :size="16" /> พิมพ์ / บันทึก PDF (A4)</button>
      <button class="et-row" role="menuitem" @click="downloadJson"><Icon name="download" :size="16" /> ข้อมูลเพลง (JSON)</button>
      <button class="et-row" role="menuitem" :disabled="mp3Busy" @click="downloadMp3">
        <Icon name="music" :size="16" />
        <template v-if="!mp3Busy">เสียง (MP3)</template>
        <template v-else-if="mp3Stage === 'encode'">กำลังบีบอัด · {{ mp3Pct }}%</template>
        <template v-else>กำลังเตรียมเสียง…</template>
      </button>
      <div v-if="mp3Busy" class="et-prog" role="status" aria-live="polite">
        <p v-if="mp3Est" class="et-est">ไฟล์เสียง ~{{ fmtSize(mp3Est.bytes) }} · ยาว {{ fmtDur(mp3Est.seconds) }}</p>
        <progress v-if="mp3Stage === 'encode'" :value="mp3Pct" max="100" :aria-label="`บีบอัด MP3 ${mp3Pct}%`"></progress>
        <progress v-else aria-label="กำลังเรนเดอร์เสียง"></progress>
        <p class="et-step">
          <template v-if="mp3Stage === 'encode'">บีบอัด MP3 · {{ mp3Pct }}%<template v-if="mp3Eta != null"> · เหลือ ~{{ fmtDur(mp3Eta) }}</template></template>
          <template v-else>กำลังเรนเดอร์เสียง…</template>
        </p>
      </div>
      <p v-if="mp3Error" class="et-err" role="alert">{{ mp3Error }}</p>
    </div>
  </span>
</template>

<style scoped>
/* not position:relative → the menu anchors to the DOCK (same spot as every popover · §A) */
.et-wrap { display: inline-flex; flex: 0 0 auto; }
/* full ghost-icon styling here (DockKey's scoped .dk-btn can't reach this slot content, so
   without this the button falls through to a global filled style — the "only brown button"
   bug · §A button hierarchy). Ghost like the transport buttons; ▶ stays the lone accent. */
.et-trig {
  width: var(--touch-min); height: var(--touch-min); min-width: var(--touch-min); min-height: 0; padding: 0;
  border: 0; background: transparent; color: var(--ink);
  display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; flex: 0 0 auto;
}
@media (hover: hover) { .et-trig:hover { background: var(--cream); } }
.et-trig.on { color: var(--brand); background: var(--cream); }
/* the popover carries its own position (slot content = parent scope; DockKey clamps by .dk-pop) */
.et-menu {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px); right: 8px; left: auto;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: 30;
  width: max-content; min-width: 200px; max-width: calc(100vw - 24px); padding: 6px;
}
.et-row {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 10px; border: 0;
  background: transparent; border-radius: 8px; cursor: pointer; text-align: left; color: var(--ink);
  font: inherit; font-size: 13px; min-height: var(--touch-min); white-space: nowrap;
}
@media (hover: hover) { .et-row:hover { background: var(--cream); } }
.et-row:disabled { opacity: 0.6; cursor: progress; }
.et-prog { padding: 4px 10px; }
.et-prog progress { width: 100%; height: 8px; display: block; }
.et-est { margin: 0 0 4px; font-size: 11.5px; color: var(--muted); }
.et-step { margin: 4px 0 0; font-size: 11.5px; color: var(--muted); }
.et-err { margin: 4px 10px 0; color: var(--red); font-size: 12px; max-width: 15rem; }
</style>
