<script setup>
import { ref } from 'vue'
import { currentSong } from '../store.js'
import { downloadSong } from '../lib/jsonIO.js'
import { songBasename } from '../lib/songName.js'

// Top-right navbar download tool (like phrakham.life2's) — shown only while a
// song is open in the viewer.
const open = ref(false)

// MP3 export state: encoding a whole song takes a couple of seconds, so disable the
// item + show "กำลังสร้าง…" while it runs (guards against double-taps), and surface a
// plain-Thai reason if it fails.
const mp3Busy = ref(false)
const mp3Error = ref('')

// Build the melody MP3 in the browser and trigger a download. audioExport (and the
// lamejs encoder it pulls in) is imported on demand so it stays out of the initial
// bundle — the cost is paid only when someone actually downloads audio.
async function downloadMp3() {
  if (mp3Busy.value || !currentSong.value) return
  mp3Busy.value = true
  mp3Error.value = ''
  try {
    const { songToMp3Blob, mp3Filename } = await import('../lib/audioExport.js')
    const { blob } = await songToMp3Blob(currentSong.value.content)
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
    mp3Busy.value = false
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
      <button role="menuitem" @click="printPdf">🖨️ พิมพ์ / บันทึกเป็น PDF (A4)</button>
      <button role="menuitem" @click="downloadJson">⬇️ ดาวน์โหลดข้อมูลเพลง (JSON)</button>
      <button role="menuitem" :disabled="mp3Busy" aria-live="polite" @click="downloadMp3">
        {{ mp3Busy ? '⏳ กำลังสร้างไฟล์เสียง…' : '⬇️ ดาวน์โหลดเสียง (MP3)' }}
      </button>
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
/* MP3 export: dim the item while encoding; show any failure reason below the menu */
.pk-tool-menu button[disabled] {
  opacity: 0.6;
  cursor: progress;
}
.pk-tool-err {
  margin: var(--sp-1) var(--sp-2) 0;
  color: var(--danger, #c0392b);
  font-size: 0.85em;
  max-width: 15rem;
}
</style>
