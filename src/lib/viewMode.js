// ใบ v3/pleng#160 — the song page shows one of two faces: ฝึกร้อง (sing along) or แผ่นเพลง (the full sheet,
// as it prints). The switch sits on the bottom bar; this device remembers the last one, so a musician who
// always wants the sheet gets it on the next song without tapping again — whether that song is opened from
// the list, from search or from a link.
//
// A device that forbids saving (a private window) still switches; it just starts at ฝึกร้อง every time.
export const VIEW_SING = 'sing'
export const VIEW_SHEET = 'sheet'
const KEY = 'pleng.viewMode'

export function readViewMode(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(KEY) === VIEW_SHEET ? VIEW_SHEET : VIEW_SING
  } catch {
    return VIEW_SING
  }
}

export function saveViewMode(mode, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, mode === VIEW_SHEET ? VIEW_SHEET : VIEW_SING)
  } catch {
    /* a device that cannot save: the switch still works for this page */
  }
}
