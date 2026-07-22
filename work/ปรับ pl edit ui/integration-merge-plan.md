# แผน integration / merge — 3 สายกลับ studio-shell-redesign

22 ก.ค. 2026 · PM coordination · **merge เข้า `studio-shell-redesign` เท่านั้น · ห้าม main จน P'Aim สั่ง go (main = auto-deploy)**

## 3 branch + ไฟล์ที่เป็นเจ้าของ
| สาย | branch | ไฟล์หลัก |
|---|---|---|
| editor (สาย 1) | **`editor-usability`** (worktree `pleng-editor-ux`) — ⚠️ NOT `claude/peaceful-bhaskara-fe04fd` (นั่นเป็น handoff-docs branch เก่า ไม่มีโค้ด impl) | `SongViewer.vue` · `SongSheet.vue` · `NoteInputBar.vue` · `lib/songEdit.js` · contextual toolbar/popup · `styles.css` (component styles ของ editor) |
| home/nav (สาย 2) | `claude/eloquent-elion-ad2051` | `SongList.vue` · `ShellBar.vue` · `router.js` · `styles.css` (:root theme tokens) · `src/i18n/*` · `lib/favorites·share·playlists` · `FavStar.vue` · `Guide.vue` |
| recolor (agent) | `worktree-agent-ae5a7059d627fcd07` | `public/*.png` (icon set) · `site.webmanifest` |

## จุดที่อาจชน (ต้องคุม)
- **`styles.css`** — editor แตะ *component styles* · home/nav แตะ *:root theme tokens* → คนละ region ควร auto-merge ได้ · **verify ไม่ทับกัน** ก่อน merge
- **`site.webmanifest`** — recolor เป็นเจ้าของ (สี) · home/nav ห้ามแตะ (ถ้าแตะ = คุมก่อน)
- **`Studio.vue`** — editor เท่านั้น (pencil/mode/หน้าเพลง-shell) · home/nav ต้องไม่แตะ → **verify home/nav ไม่ได้แก้ Studio.vue**
- **`Guide.vue`** — ทั้งคู่อาจอัป (DoD) → merge ระวัง section ซ้อน

## ลำดับ merge (เล็ก→ใหญ่ · เสี่ยงต่ำ→สูง)
1. **recolor ก่อน** (เล็ก/แยกสุด: public/ + manifest) → merge เข้า studio-shell-redesign · verify icon โผล่ถูก
2. **home/nav** → merge · เอา :root tokens + shell/home/i18n/favorites เข้า · verify: หน้าแรก/nav/สลับภาษา/★ ทำงาน · theme สีขึ้นทั้งแอป · manifest ไม่ reconflict (recolor เข้าไปก่อนแล้ว)
3. **editor สุดท้าย** → merge · verify: พิมพ์/ripple/ลบ/แถบลอย/keyboard-nav + **211 เทสต์ต้องผ่าน** · styles.css component styles ไม่ชน :root tokens

## ทุก merge ต้อง
- `git merge` เข้า studio-shell-redesign (ไม่ main) · resolve conflict ที่ styles.css/Guide ถ้ามี (คนละ region ควรไม่มี)
- **รันเทสต์เต็ม** (`*.test.js` โดยเฉพาะ `EditorMode.*` 211) · **verify live** (localhost + มือถือจริง) · ไม่ h-scroll · WCAG target
- P'Aim verify รอบสุดท้ายก่อน **main/deploy** (สั่ง go เท่านั้น)

## งาน post-merge (หลัง 3 สาย land แล้ว)
- **wire ปุ่มแชร์/เพลย์ลิสต์ บนหน้าเพลง (`Studio.vue` = lane สาย 1)** — engine พร้อมจากสาย 2: `↗ แชร์` = `buildSongUrl` + เปิด `ShareSheet`/`nativeShare` · `⋮ เพิ่มเข้าเพลย์ลิสต์` = `toggleSong` (`lib/playlists`) · ทำได้หลัง branch สาย 2 merge (engine ถึงจะอยู่บน base) · เข้าชุดกับ song-shell ground-up (§1.5: ตัด tab · Play · ✏️ · ↗ · ⋮ · footer)
- **แปล zh/en (PM):** ดึง key จาก `src/i18n/th.js` (namespace: brand/nav/action/a11y/font/lang/list/share/playlist) → เพิ่ม `zh.js`/`en.js` key เดียวกัน + register ใน `src/i18n/index.js` (DICTS) · ทำหลัง i18n merge เข้า base (เลี่ยงแตะ worktree สาย 2 ที่ยัง active)

## หมายเหตุ
- 3 สายอยู่คนละ worktree → ไม่ชน live ระหว่างทำ · เจอกันแค่ตอน merge นี้
- ถ้าสายไหนเผลอแตะไฟล์นอกขอบเขต (เช่น home/nav แตะ Studio.vue) = PM จับตอน pre-merge review แล้วให้แก้ก่อน
- merge = PM ทำ (dev/สายไม่ merge เข้า base เอง — กฎเดิม)
