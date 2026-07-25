// Local working copy — the "งานไม่หาย" layer for โหมดแก้ inline (A-fix 23 ก.ค.).
//
// The inline pencil edits liveSong in memory only, so a reload threw the work away with no
// warning at all — the same silent-loss shape as B108. The locked design
// (`work/ปรับ pl edit ui/ux-groundup-design.md`, journey M-edit) asks for
// "สถานะ บันทึกแล้ว✓/ยังไม่บันทึก เห็นตลอด + autosave working-copy กันหาย", so every inline
// edit is mirrored into localStorage keyed by song, for EVERY tier (an anon has no server to
// save to and needs this most).
//
// Deliberately a RECOVERY copy, not a silent restore: another editor may have republished the
// song since (พี่เปา edits the live library daily), so on reopen we offer "กู้คืน / ทิ้ง"
// rather than overwriting what the server just handed us. Word/WordPress do the same.
//
// Storage is injectable so this is testable without a browser; every call is try/caught —
// a full or blocked localStorage (Incognito/iOS) must never break editing.

const PREFIX = 'pleng.inline.wc.'

// A stable fingerprint of a song's content: same music = same string, whatever order the keys
// happen to be in. Postgres `jsonb` hands back its own key order ("bpm" before "version"),
// while an object rebuilt in JS keeps the author's order — so a plain JSON.stringify comparison
// called an untouched song "ยังไม่บันทึก" and, after ย้อน, refused to go back to "บันทึกแล้ว".
// Arrays keep their order (that IS the music); only object keys are sorted.
export function contentStamp(value) {
  const norm = (v) => {
    if (Array.isArray(v)) return v.map(norm)
    if (v && typeof v === 'object') {
      const out = {}
      for (const k of Object.keys(v).sort()) out[k] = norm(v[k])
      return out
    }
    return v
  }
  return JSON.stringify(norm(value ?? null))
}
// A new song has no id yet; 'new' keeps its own slot so it cannot collide with a real song.
export const keyFor = (songId) => PREFIX + (songId ?? 'new')

function store(s) {
  if (s) return s
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null // storage blocked entirely
  }
}

// Mirror the in-progress content. `savedAt` is what the restore prompt shows the user.
// B060 — `meta` (optional) mirrors the ⚙ ตั้งค่าเพลง half of the document (เลข · ชื่อ · ธีม ·
// หมวด). It rides ALONGSIDE the content, never inside it, so a copy written by an older version
// (no meta) still reads back fine and a renamed song is not lost on a crash either.
export function writeWorkingCopy(songId, content, at = Date.now(), s, meta = null) {
  const st = store(s)
  if (!st || !content) return false
  try {
    st.setItem(
      keyFor(songId),
      JSON.stringify({ v: 1, songId: songId ?? null, savedAt: at, content, ...(meta ? { meta } : {}) }),
    )
    return true
  } catch {
    return false // quota / private mode — the editor keeps working, just without recovery
  }
}

// The stored copy for this song, or null (missing, unreadable, or a different shape).
export function readWorkingCopy(songId, s) {
  const st = store(s)
  if (!st) return null
  try {
    const raw = st.getItem(keyFor(songId))
    if (!raw) return null
    const wc = JSON.parse(raw)
    if (!wc || wc.v !== 1 || !wc.content) return null
    return wc
  } catch {
    return null
  }
}

export function clearWorkingCopy(songId, s) {
  const st = store(s)
  if (!st) return
  try {
    st.removeItem(keyFor(songId))
  } catch {
    /* ignore */
  }
}

// Is the stored copy worth offering? Only when it actually DIFFERS from what the server just
// gave us — otherwise a saved-then-reopened song would nag about nothing.
// B060 — the settings count as work too: a copy whose MUSIC matches the server but whose ⚙
// ตั้งค่าเพลง differ (a rename the user never got to save) is still worth offering. `serverMeta`
// is compared only when the copy carries one, so pre-B060 copies behave exactly as before.
export function hasRecoverable(songId, serverContent, s, serverMeta = null) {
  const wc = readWorkingCopy(songId, s)
  if (!wc) return null
  try {
    const sameContent = contentStamp(wc.content) === contentStamp(serverContent)
    const sameMeta = !wc.meta || contentStamp(wc.meta) === contentStamp(serverMeta)
    if (sameContent && sameMeta) return null
  } catch {
    return null
  }
  return wc
}
