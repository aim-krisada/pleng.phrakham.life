# DS — ps3 Epic 1: Shell / เมนู (②)

US: `docs/us/ps3-shell.md` · Visual/interaction spec = **prototype `docs/design/ps2-studio-prototype.html`** (สร้างให้ตรงนี้)

## ไฟล์ที่เป็นเจ้าของ
- `src/components/ShellBar.vue` — แถบบนเดียว (brand menu · song title inline+menu · เพลง hub · mode tabs · login)
- `src/App.vue` — วาง ShellBar ทุกหน้า · รู้ว่าอยู่ Studio โหมดไหน
- `src/store.js` — `currentSong` (I1) · `role`/tier
- ห้ามแตะ `EditorMode.vue`/`SongViewer.vue` (epic 2/3)

## องค์ประกอบ
- **เมนู/popover:** ใช้ pattern เดียว (menu = dropdown · เพลง hub = combobox popover · มือถือ = full-screen sheet) · ปิดด้วย Esc + click-outside (backdrop)
- **เพลง hub (combobox):** ARIA combobox/listbox · autofocus search · filter live · row click/Enter=open · footer/top "＋สร้างใหม่" · มือถือ `.sheet` fixed inset:0
- **โหมด:** segmented control · state = `mode` ('sing'|'sheet'|'edit') · desktop มีคำ · มือถือไอคอนล้วน (label ใน `.mlabel` ซ่อนมือถือ · aria-label คงไว้)
- **ชื่อเพลง:** contenteditable (rename) + ปุ่ม caret แยก (เมนู) — คนละ hit target
- **ลบเพลง:** gated `tier==='approver'` + confirm dialog (reuse component ร่วม)
- **มือถือ layout:** flex-wrap + order + row-break spacer → แถว 1 (brand·title·👤) / แถว 2 (เพลง·โหมด) · ไม่มี hamburger

## สัญญาจุดต่อ (contract)
- ShellBar รับ/อ่าน: `mode` (emit `update:mode`) · `currentSong` (title) · `tier`
- ไอคอน: ผ่าน `Icon.vue` (Lucide) — เพิ่ม `list-music` `book-open` `file-music` `music` `hook` ฯลฯ ตาม prototype
- favicon โลโก้จริง (พระคำ.ชีวิต ↗): bundle asset `phrakham.life2/assets/favicon.ico` เป็น `<img>` (ไม่ใช่ line icon)

## ยึด
- Google-Docs-clean · WCAG 2.2 AA (focus-visible · target ≥24px · keyboard) · mobile-first
- ทำ **ก่อน** → merge base → ③④ แตกจากฐานใหม่
