// Key-equivalent hints for the symbol keys (DS note-symbol-set §4.1 / G17).
//
// พี่เปา: "ถ้าคีย์บอร์ดอย่างเดียวก็ชอบ แต่ขี้เกียจหา เช่น ^ ไม่รู้อยู่ตรงไหนใน keyboard" — so a
// symbol button must teach WHERE its character lives on the physical keyboard, Apple-HIG
// key-equivalent style (label pinned to the button, NEVER a tooltip: P'Aim's Surface reports
// hover:none with a mouse attached, so hover-only text is invisible there).
//
// ⛔ No hardcoded US layout table. Every hint is MEASURED on this machine:
//   1. the user types the character successfully → remember { code, shift } from that keydown
//   2. ask navigator.keyboard.getLayoutMap() what that physical key prints unshifted
//   3. compose the label ("⇧ + 6") and remember it
// Rule from the spec: not sure = show nothing. A wrong position is worse than none, so a
// character that has never been typed on this machine simply has no third line yet.

const KEY = 'pleng.keyhints.v1'

function store(s) {
  if (s) return s
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}
export function readHints(s) {
  const st = store(s)
  if (!st) return {}
  try {
    const v = JSON.parse(st.getItem(KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
function writeHints(map, s) {
  const st = store(s)
  if (!st) return
  try {
    st.setItem(KEY, JSON.stringify(map))
  } catch {
    /* full / blocked storage — hints are a nicety, never a blocker */
  }
}

// What the physical key prints on its own. Prefer the browser's measured layout map; fall back
// to the code name ONLY where the code IS the character by definition (Digit0-9 / KeyA-Z).
// Anything else (Minus, Quote, Backslash…) differs between layouts → we stay silent.
export function baseLabelFor(code, layoutMap) {
  if (layoutMap && typeof layoutMap.get === 'function') {
    const v = layoutMap.get(code)
    if (v) return v
  }
  let m = /^Digit(\d)$/.exec(code)
  if (m) return m[1]
  m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1].toLowerCase()
  return null
}

// Record that `char` was produced by this physical key. Returns the stored label, or null when
// we cannot describe the key honestly.
export function learnKey(char, code, shift, layoutMap, s) {
  if (!char || !code) return null
  const base = baseLabelFor(code, layoutMap)
  if (!base) return null
  const label = shift ? `⇧ + ${base}` : base
  const map = readHints(s)
  if (map[char] === label) return label
  map[char] = label
  writeHints(map, s)
  return label
}

// The browser's layout map, when it exists (Chromium/Edge). Never throws.
export async function loadLayoutMap() {
  try {
    if (typeof navigator !== 'undefined' && navigator.keyboard?.getLayoutMap) {
      return await navigator.keyboard.getLayoutMap()
    }
  } catch {
    /* permission / unsupported */
  }
  return null
}
