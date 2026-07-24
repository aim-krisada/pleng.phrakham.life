<script setup>
import { ref, computed } from 'vue'
import { currentSong, soundMode } from '../store.js'
import { downloadSong } from '../lib/jsonIO.js'
import { songBasename } from '../lib/songName.js'
import { PAPER_SIZES, paperSize, setPaperSize } from '../lib/paperSize.js'

// Chosen paper's label ("A4"/"Letter"/"A5") for the print button — the on-screen
// echo of what the printout will use.
const paperLabel = computed(
  () => PAPER_SIZES.find((p) => p.id === paperSize.value)?.label || 'A4',
)

// Top-right navbar download tool (like phrakham.life2's) — shown only while a
// song is open in the viewer.
const open = ref(false)

// MP3 export state. Encoding a whole song can take several seconds, so — per de-facto
// long-task UX — we (1) show an up-front estimate (length + size) so the wait has an
// expectation, (2) report staged, near-real-time progress with a bar + ETA so nobody
// thinks it hung and hits refresh, and (3) surface a plain-Thai reason on failure.
const mp3Stage = ref('') // '' | 'render' | 'encode' | 'done'
const mp3Pct = ref(0) // 0–100, meaningful during 'encode'
const mp3Est = ref(null) // { seconds, bytes } computed before the slow work starts
const mp3Eta = ref(null) // seconds remaining during 'encode' (null until we can estimate)
const mp3Error = ref('')
const mp3Busy = computed(() => mp3Stage.value !== '')

function fmtDur(s) {
  s = Math.max(0, Math.round(s))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m ? `${m} นาที ${sec} วิ` : `${sec} วิ`
}
function fmtSize(bytes) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
    : Math.round(bytes / 1024) + ' KB'
}

// Build the melody MP3 in the browser and trigger a download. audioExport (and the
// lamejs encoder it pulls in) is imported on demand so it stays out of the initial
// bundle — the cost is paid only when someone actually downloads audio.
async function downloadMp3() {
  if (mp3Busy.value || !currentSong.value) return
  mp3Error.value = ''
  mp3Eta.value = null
  mp3Pct.value = 0
  const content = currentSong.value.content
  try {
    const { songToMp3Blob, mp3Filename, estimateMp3 } = await import('../lib/audioExport.js')
    mp3Est.value = estimateMp3(content) // up-front "≈ length · ~size"
    mp3Stage.value = 'render'
    let encodeStart = 0
    const { blob } = await songToMp3Blob(content, {
      voices: soundMode.value, // B104: match the chosen sound mode (melody / chords / both)
      onProgress: ({ stage, fraction }) => {
        mp3Stage.value = stage
        if (stage === 'encode') {
          mp3Pct.value = Math.round(fraction * 100)
          if (!encodeStart) encodeStart = performance.now()
          else if (fraction > 0.02) {
            const elapsed = (performance.now() - encodeStart) / 1000
            mp3Eta.value = (elapsed * (1 - fraction)) / fraction
          }
        }
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = mp3Filename(currentSong.value)
    a.click()
    URL.revokeObjectURL(url)
    open.value = false
  } catch (e) {
    mp3Error.value = e?.message || 'สร้างไฟล์เสียงไม่สำเร็จ'
  } finally {
    mp3Stage.value = ''
    mp3Eta.value = null
  }
}

// Save-as-PDF: the browser's print dialog suggests document.title as the filename,
// so set it to the shared song basename first (same name the JSON download uses),
// then restore the site title once the dialog is done.
function printPdf() {
  open.value = false
  const prev = document.title
  document.title = songBasename(currentSong.value)
  const restore = () => {
    document.title = prev
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}

function downloadJson() {
  open.value = false
  downloadSong(currentSong.value)
}
</script>

<template>
  <div v-if="currentSong" class="pk-tool no-print">
    <button
      class="pk-tool-btn"
      :aria-expanded="open"
      aria-label="ดาวน์โหลดเพลงนี้"
      @click="open = !open"
      @keydown.esc="open = false"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
    <div v-if="open" class="pk-tool-menu" role="menu">
      <!-- Paper size for print / Save-as-PDF. Radiogroup = keyboard + screen-reader
           friendly (arrow keys move, label announces the group). Choice is remembered
           (localStorage); the print button below echoes it. -->
      <fieldset class="pk-paper">
        <legend class="pk-paper-lbl">ขนาดกระดาษ</legend>
        <div class="pk-paper-opts">
          <label v-for="p in PAPER_SIZES" :key="p.id" class="pk-paper-opt">
            <input
              type="radio"
              name="pk-paper-size"
              :value="p.id"
              :checked="paperSize === p.id"
              @change="setPaperSize(p.id)"
            />
            <span>{{ p.label }}</span>
          </label>
        </div>
      </fieldset>
      <button role="menuitem" @click="printPdf">🖨️ พิมพ์ / บันทึกเป็น PDF ({{ paperLabel }})</button>
      <button role="menuitem" @click="downloadJson">⬇️ ดาวน์โหลดข้อมูลเพลง (JSON)</button>
      <button role="menuitem" :disabled="mp3Busy" @click="downloadMp3">
        <template v-if="!mp3Busy">⬇️ ดาวน์โหลดเสียง (MP3)</template>
        <template v-else-if="mp3Stage === 'encode'">⏳ กำลังบีบอัด MP3 · {{ mp3Pct }}%</template>
        <template v-else>⏳ กำลังเตรียมเสียง…</template>
      </button>
      <!-- staged progress: up-front estimate → determinate bar + ETA while encoding -->
      <div v-if="mp3Busy" class="pk-mp3-prog" role="status" aria-live="polite">
        <p v-if="mp3Est" class="pk-mp3-est">
          ไฟล์เสียง ~{{ fmtSize(mp3Est.bytes) }} · ยาว {{ fmtDur(mp3Est.seconds) }}
        </p>
        <progress
          v-if="mp3Stage === 'encode'"
          :value="mp3Pct"
          max="100"
          :aria-label="`บีบอัด MP3 ${mp3Pct}%`"
        ></progress>
        <progress v-else aria-label="กำลังเรนเดอร์เสียง"></progress>
        <p class="pk-mp3-step">
          <template v-if="mp3Stage === 'encode'">
            บีบอัด MP3 · {{ mp3Pct }}%<template v-if="mp3Eta != null"> · เหลือ ~{{ fmtDur(mp3Eta) }}</template>
          </template>
          <template v-else>กำลังเรนเดอร์เสียง…</template>
        </p>
      </div>
      <p v-if="mp3Error" class="pk-tool-err" role="alert">{{ mp3Error }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Base look lives in styles.css (.pk-tool*, shared with the navbar). Scoped here:
   responsive polish only — no styles.css edits (S4). */
/* menu items are tap targets → meet the 44 floor (global padding gives ~40) */
.pk-tool-menu button {
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
}
/* never let the right-anchored dropdown exceed a narrow viewport (it opens from the
   top-right tool button, so cap its width and let long labels wrap instead of overflow) */
.pk-tool-menu {
  max-width: calc(100vw - var(--sp-4));
}
/* Paper-size picker — a compact segmented radiogroup at the top of the menu. Native
   radios (accessible + keyboard) styled as pill segments; the checked one fills brand. */
.pk-paper {
  border: 0;
  margin: 0;
  padding: var(--sp-1) var(--sp-2) var(--sp-2);
}
.pk-paper-lbl {
  padding: 0 0 var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--muted);
}
.pk-paper-opts {
  display: flex;
  gap: var(--sp-1);
}
.pk-paper-opt {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--touch-min);
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: var(--fs-sm);
  cursor: pointer;
  user-select: none;
}
/* keep the native radio in the a11y tree (focus + SR) but let the pill be the visual */
.pk-paper-opt input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.pk-paper-opt:has(input:checked) {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  font-weight: 700;
}
.pk-paper-opt:has(input:focus-visible) {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
/* MP3 export: dim the item while encoding; show any failure reason below the menu */
.pk-tool-menu button[disabled] {
  opacity: 0.6;
  cursor: progress;
}
/* staged progress block under the MP3 item — estimate line, bar, step + ETA */
.pk-mp3-prog {
  padding: var(--sp-1) var(--sp-2);
  max-width: 15rem;
}
.pk-mp3-prog progress {
  width: 100%;
  height: 0.5rem;
  display: block;
}
.pk-mp3-est {
  margin: 0 0 var(--sp-1);
  font-size: 0.85em;
  opacity: 0.75;
}
.pk-mp3-step {
  margin: var(--sp-1) 0 0;
  font-size: 0.8em;
  opacity: 0.9;
}
.pk-tool-err {
  margin: var(--sp-1) var(--sp-2) 0;
  color: var(--danger, #c0392b);
  font-size: 0.85em;
  max-width: 15rem;
}
</style>
