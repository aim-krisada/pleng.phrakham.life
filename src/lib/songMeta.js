// The song's catalog fields (ธีม · หมวด) — ONE list, shared by every editing surface.
//
// These used to live as consts inside EditorMode.vue, so the inline editor (SongViewer, the
// ✏️ pencil surface) could not offer them without copying the lists — and a copied taxonomy
// drifts. B108 is exactly what a drifted/guessed taxonomy costs: songs silently re-filed and
// themes wiped across the whole library. So the lists live here and both editors import them.
//
// ธีม = the 8 themes the library uses (songs.theme).
// หมวด = the book/collection code (songs.category · docs/pm/book-codes.md · docs/ds/home-redesign.md
// §Taxonomy). The 3 canonical books are the ONLY choices — hard lock, no free text: a value
// outside this list must not stick. Extending the taxonomy is an admin job (B096, deferred).

export const THEMES = [
  'กิตติคุณ',
  'ความสุขแห่งความรอด',
  'คริสตจักร',
  'ประสบการณ์',
  'พระคัมภีร์',
  'มอบถวาย',
  'รักปรารถนา',
  'อาณาจักร',
]

export const THEME_OPTIONS = [
  { value: '', label: '— ไม่ระบุธีม —' },
  ...THEMES.map((t) => ({ value: t, label: t })),
]

export const CATEGORY_OPTIONS = [
  { value: 'lem-yai', label: 'เล่มใหญ่' },
  { value: 'anuchon', label: 'อนุชน' },
  { value: 'dek-lek', label: 'เด็กเล็ก' },
]
