// Print paper size — the physical sheet a song prints on (Save-as-PDF or Ctrl+P).
// SSOT for the choice: a reactive ref persisted to localStorage so it survives reloads
// (§6a). Default A4 (Thai churches). printChrome.js reads paperSizeCss() and injects
// `@page{size:<token>}` right before printing so the printout matches the chosen paper.
import { ref, watch } from 'vue'

// `css` is the CSS `@page { size: … }` keyword (A4/A5/Letter are all valid page-size
// keywords). A4 first = the default. `mm` documents the physical size (for reference).
export const PAPER_SIZES = [
  { id: 'A4', label: 'A4', css: 'A4', mm: '210 × 297' },
  { id: 'Letter', label: 'Letter', css: 'Letter', mm: '216 × 279' },
  { id: 'A5', label: 'A5', css: 'A5', mm: '148 × 210' },
]

const IDS = PAPER_SIZES.map((p) => p.id)
const KEY = 'pk-paper-size'

function load() {
  try {
    const v = localStorage.getItem(KEY)
    if (IDS.includes(v)) return v
  } catch {
    /* ignore (SSR / private mode) */
  }
  return 'A4'
}

// Reactive current choice. Components bind to it; a watcher persists every change.
export const paperSize = ref(load())
// flush:'sync' → the choice lands in localStorage the instant it changes (no waiting
// for a Vue tick), so a Ctrl+P fired right after picking uses the new size.
watch(
  paperSize,
  (v) => {
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* ignore */
    }
  },
  { flush: 'sync' },
)

export function setPaperSize(id) {
  if (IDS.includes(id)) paperSize.value = id
}

// The CSS `@page { size: … }` token for an id (defaults to the current choice). Unknown
// ids fall back to A4 so we never emit an invalid size.
export function paperSizeCss(id = paperSize.value) {
  const p = PAPER_SIZES.find((x) => x.id === id)
  return p ? p.css : 'A4'
}
