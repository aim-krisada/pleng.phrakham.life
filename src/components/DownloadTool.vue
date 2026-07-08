<script setup>
import { ref } from 'vue'
import { currentSong } from '../store.js'
import { downloadSong } from '../lib/jsonIO.js'

// Top-right navbar download tool (like phrakham.life2's) — shown only while a
// song is open in the viewer.
const open = ref(false)

function printPdf() {
  open.value = false
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
    </div>
  </div>
</template>
