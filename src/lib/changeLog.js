// What changed in a song, said in plain words (ใบ v3/pleng#179).
//
// Two readers use this:
//   1. everyone — the green "อัปเดตเพลงให้แล้วอัตโนมัติ" line on the home page gets a "ดู" button
//      that lists WHICH songs changed and WHICH PART of each (ชื่อ · ทำนอง · เนื้อร้อง · หมายเหตุ ·
//      ข้อมูลเพลง). A visitor's device only keeps short fingerprints of the songs it saved before,
//      not the old songs, so it can name the part but never show the old words.
//   2. the team — the ประวัติการแก้เพลง page (views/Changes.vue) reads the full before/after copies the
//      database keeps (song_revisions) and shows who changed what, with the old and new text.
// Who made a change is team-only (P'Aim 19 พ.ย. 2569: public sees what changed, the team sees who).

// The parts of a song a reader can tell apart. Order = the order they are listed on screen.
export const PARTS = [
  { key: 'title', label: 'ชื่อเพลง' },
  { key: 'melody', label: 'ทำนอง' },
  { key: 'words', label: 'เนื้อร้อง' },
  // English / 中文 words + the English title (ใบ #177 — the AI publishes these by itself, so a
  // reader must be able to tell "ใส่เนื้ออังกฤษ" from a change to the Thai words)
  { key: 'langs', label: 'เนื้อภาษาอื่น' },
  { key: 'notes', label: 'หมายเหตุ' },
  { key: 'info', label: 'ข้อมูลเพลง' },
]

const MELODY_KEYS = ['stanzas', 'key', 'timeSignature', 'bpm']
const ALT_LANGS = ['en', 'zh']

// an arrangement row without its word notes and without its English / 中文 words
function thaiRow(e) {
  if (!e || typeof e !== 'object') return e
  const { notes, lyrics, ...rest } = e
  if (lyrics && typeof lyrics === 'object') {
    const keep = {}
    for (const k of Object.keys(lyrics)) if (!ALT_LANGS.includes(k)) keep[k] = lyrics[k]
    if (Object.keys(keep).length) rest.lyrics = keep
  }
  return rest
}
function altLyrics(e) {
  const l = e && e.lyrics && typeof e.lyrics === 'object' ? e.lyrics : {}
  return ALT_LANGS.map((k) => l[k] ?? null)
}

// One string per part, so two copies of a song can be compared part by part.
export function partsOf(row) {
  const r = row || {}
  const c = r.content && typeof r.content === 'object' ? r.content : { _raw: r.content ?? null }
  const melody = {}
  const words = {}
  for (const k of Object.keys(c).sort()) {
    if (k === 'footnote' || k === 'langVerified') continue
    if (MELODY_KEYS.includes(k)) melody[k] = c[k]
    // a word's note (ใบ #178) is a หมายเหตุ, and English / 中文 words are เนื้อภาษาอื่น
    else if (k === 'arrangement') words[k] = (Array.isArray(c[k]) ? c[k] : []).map(thaiRow)
    else words[k] = c[k]
  }
  const rowsOf = Array.isArray(c.arrangement) ? c.arrangement : []
  const wordNotes = rowsOf.map((e) => (e && e.notes) || null)
  return {
    title: JSON.stringify([r.number ?? null, r.title_th ?? null]),
    melody: JSON.stringify(melody),
    words: JSON.stringify(words),
    langs: JSON.stringify([r.title_en || null, c.langVerified ?? null, rowsOf.map(altLyrics)]),
    notes: JSON.stringify([c.footnote || '', wordNotes]),
    info: JSON.stringify([r.category ?? null, r.theme ?? null, r.book_refs ?? null, r.scripture ?? null]),
  }
}

// What a reader needs to know about an edit, most important first (ใบ #179, P'Aim 19 พ.ย. 2569:
// "แยกแยะให้ชัดเจนว่าแก้อะไร"). A singer cares about the notes and Thai words; a title or a
// category matters less; English / 中文 words matter only to those who sing them.
export const GROUPS = [
  { key: 'added', label: 'เพลงใหม่' },
  { key: 'main', label: 'แก้โน้ตหรือเนื้อร้อง' },
  { key: 'minor', label: 'แก้ชื่อหรือรายละเอียด' },
  { key: 'langs', label: 'ใส่เนื้ออังกฤษ/จีน' },
]
// part labels (PARTS / changedParts) -> the group of an edited song
export function editGroup(partLabels) {
  const p = partLabels || []
  if (!p.length || p.some((x) => x === 'ทำนอง' || x === 'เนื้อร้อง' || x === 'เนื้อหาเพลง')) return 'main'
  if (p.every((x) => x === 'เนื้อภาษาอื่น')) return 'langs'
  return 'minor'
}

// Old v1 songs keep notes and words in the same `lines`, so a change there is "เนื้อหาเพลง".
function isV1(row) {
  const c = row && row.content
  return !!(c && Array.isArray(c.lines) && !Array.isArray(c.stanzas))
}

// ['ทำนอง', 'เนื้อร้อง', …] — the parts that differ between two copies of a song.
export function changedParts(before, after) {
  if (!before || !after) return []
  const a = partsOf(before)
  const b = partsOf(after)
  const out = []
  for (const p of PARTS) {
    if (a[p.key] === b[p.key]) continue
    if (p.key === 'words' && (isV1(before) || isV1(after))) out.push('เนื้อหาเพลง')
    else out.push(p.label)
  }
  return out
}

// ---- the team's detail: old → new, in words ------------------------------------------------------
const cut = (s, n = 60) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
const quote = (s) => (s ? `“${cut(s)}”` : '(ว่าง)')
const joinSyl = (syls) => (Array.isArray(syls) ? syls.join('') : '')
// English / 中文 words: one per note box, so join with spaces and drop the empty boxes
const joinAlt = (w) => (Array.isArray(w) ? w.filter(Boolean).join(' ') : (typeof w === 'string' ? w : ''))
const LANG_NAME = { en: 'อังกฤษ', zh: 'จีน' }
const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null)

function entryName(e, i) {
  return (e && e.label && String(e.label).trim()) || `ข้อ ${i + 1}`
}

// One line per thing that changed, old → new. Empty when the two copies are the same.
export function changeDetails(before, after) {
  if (!before && after) return ['เพิ่มเพลงเข้าคลัง']
  if (before && !after) return ['ถอนเพลงออกจากคลัง']
  if (!before || !after) return []
  const out = []
  if (before.title_th !== after.title_th) out.push(`ชื่อเพลง: ${quote(before.title_th)} → ${quote(after.title_th)}`)
  if ((before.title_en || '') !== (after.title_en || '')) out.push(`ชื่ออังกฤษ: ${quote(before.title_en)} → ${quote(after.title_en)}`)
  if ((before.number ?? null) !== (after.number ?? null)) out.push(`เลขเพลง: ${before.number ?? '—'} → ${after.number ?? '—'}`)
  const a = before.content || {}
  const b = after.content || {}
  if ((a.key ?? null) !== (b.key ?? null)) out.push(`คีย์: ${a.key ?? '—'} → ${b.key ?? '—'}`)
  if ((a.timeSignature ?? null) !== (b.timeSignature ?? null)) out.push(`จังหวะ: ${a.timeSignature ?? '—'} → ${b.timeSignature ?? '—'}`)
  if ((a.bpm ?? null) !== (b.bpm ?? null)) out.push(`ความเร็ว: ${a.bpm ?? '—'} → ${b.bpm ?? '—'}`)

  // melody, one line per stanza (ท่อน) that changed
  const sa = Array.isArray(a.stanzas) ? a.stanzas : []
  const sb = Array.isArray(b.stanzas) ? b.stanzas : []
  const ids = []
  for (const s of [...sa, ...sb]) if (s && s.id != null && !ids.includes(s.id)) ids.push(s.id)
  for (const id of ids) {
    const x = sa.find((s) => s && s.id === id)
    const y = sb.find((s) => s && s.id === id)
    if (!x) out.push(`เพิ่มทำนองท่อน ${id}`)
    else if (!y) out.push(`ลบทำนองท่อน ${id}`)
    else if (!same(x, y)) out.push(`แก้ทำนองท่อน ${id}`)
  }

  // words, one line per verse/refrain (ข้อ) that changed
  const ea = Array.isArray(a.arrangement) ? a.arrangement : []
  const eb = Array.isArray(b.arrangement) ? b.arrangement : []
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) {
    const x = ea[i]
    const y = eb[i]
    if (!x) { out.push(`เพิ่ม${entryName(y, i)}: ${quote(joinSyl(y && y.syllables))}`); continue }
    if (!y) { out.push(`ลบ${entryName(x, i)}: ${quote(joinSyl(x.syllables))}`); continue }
    if (!same(thaiRow(x), thaiRow(y))) {
      const wa = joinSyl(x.syllables)
      const wb = joinSyl(y.syllables)
      out.push(wa !== wb
        ? `แก้เนื้อ${entryName(y, i)}: ${quote(wa)} → ${quote(wb)}`
        : `แก้${entryName(y, i)} (ป้ายชื่อ หรือท่อนที่ใช้)`)
    }
    const la = altLyrics(x)
    const lb = altLyrics(y)
    ALT_LANGS.forEach((lang, j) => {
      if (same(la[j], lb[j])) return
      const name = LANG_NAME[lang]
      const wa = joinAlt(la[j])
      const wb = joinAlt(lb[j])
      if (!wa) out.push(`เพิ่มเนื้อ${name}ใน${entryName(y, i)}: ${quote(wb)}`)
      else if (!wb) out.push(`ลบเนื้อ${name}ใน${entryName(y, i)}`)
      else out.push(`แก้เนื้อ${name}ใน${entryName(y, i)}: ${quote(wa)} → ${quote(wb)}`)
    })
    if (!same(x.notes, y.notes)) out.push(`แก้หมายเหตุของคำใน${entryName(y, i)}`)
  }
  // other word fields (other languages, lyric sets …) not covered above
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (['stanzas', 'arrangement', 'key', 'timeSignature', 'bpm', 'footnote', 'lines'].includes(k)) continue
    if (k === 'langVerified') { if (!same(a[k], b[k])) out.push('เปลี่ยนป้ายตรวจภาษาแล้ว'); continue }
    if (!same(a[k], b[k])) out.push(`แก้ส่วน ${k} ของเพลง`)
  }
  if ((a.footnote || '') !== (b.footnote || '')) {
    out.push(b.footnote ? `หมายเหตุท้ายเพลง: ${quote(a.footnote)} → ${quote(b.footnote)}` : 'ลบหมายเหตุท้ายเพลง')
  }

  // v1 songs: one line per changed line
  const la = Array.isArray(a.lines) ? a.lines : []
  const lb = Array.isArray(b.lines) ? b.lines : []
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (same(la[i], lb[i])) continue
    if (la[i] == null) out.push(`เพิ่มบรรทัด ${i + 1}`)
    else if (lb[i] == null) out.push(`ลบบรรทัด ${i + 1}`)
    else out.push(`แก้บรรทัด ${i + 1}`)
  }

  const INFO = { category: 'หมวดเพลง', theme: 'หัวข้อ', book_refs: 'เลขในหนังสือเพลง', scripture: 'ข้อพระคัมภีร์' }
  for (const k of Object.keys(INFO)) {
    if (!same(before[k], after[k])) out.push(`แก้${INFO[k]}`)
  }
  return out
}

// "19 พ.ย. 2569"
export function dayLabel(iso) {
  try { return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
}
// "14:05"
export function timeLabel(iso) {
  try { return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
