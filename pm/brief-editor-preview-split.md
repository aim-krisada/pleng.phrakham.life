# brief — หน้าแก้ไข: พรีวิว 2 แบบ (ต่อห้อง inline + หน้าต่างลอยทั้งแผ่น) · สาย dev

**ที่มา:** P'Aim 10 ก.ค. — ปรับ 2 ปุ่มพรีวิวในหน้าแก้ไข (design เคาะกับ PM แล้ว) · **1 สายทำทั้งคู่** (แตะ `EditorMode.vue` ไฟล์เดียว = แยกสายไม่ได้)
**ฐาน:** `studio-shell-redesign` · worktree ใหม่

## ของเดิม (ในแถบเครื่องมือ `#pk-editor`/`.edhead` · EditorMode.vue ~1705-1714)
- **ปุ่ม "ตัวอย่างสด" (ไอคอน `eye`)** = `livePreview` ref (~1433) → render พรีวิวโน้ตสด **ต่อบรรทัด** (~1428-1442 · `serializeLine(line)` ต่อ line)
- **ปุ่ม "ดูผลทั้งเพลง" (ไอคอน `music`)** = `toggleShowAll`/`allShown` (~1709) → **สลับทั้งหน้า**ไปแสดงแผ่นเพลง (แก้ต่อไม่ได้จนกดกลับ)
- มี concept "per-bar ดูผล (B035)" + `barContent` อยู่แล้ว (~1364/1410) → **เช็ก/reuse ได้**

## งาน A — ปุ่มรูปตา "ตัวอย่างสด" → เปลี่ยนเป็น **ต่อห้อง (per-bar)**
- ตอนนี้พรีวิว render ทั้งบรรทัดรวมกัน → เปลี่ยนเป็น **แสดงผลราย "ห้อง" (bar) แยกกัน** เห็นการแก้ราย**ห้อง**แบบเรียลไทม์ขณะพิมพ์
- คง**ปุ่ม toggle** (eye · `aria-pressed` · เปิด/ปิด ชัด) · reuse `serializeLine`/`barContent`/SongSheet render เดิม (อย่าเขียน render ใหม่)
- ⛔ ห้ามแตะ `NoteRow.vue` (ACC/B062) — ใช้ผ่าน SongSheet ได้ แต่ห้ามแก้ NoteRow

## งาน B — ปุ่ม "ดูผลทั้งเพลง" → **หน้าต่างลอย ไม่บัง (non-modal floating)**
เปลี่ยนจากสลับทั้งหน้า → เป็น **ปุ่มเปิดหน้าต่างลอย (launcher ไม่ใช่ toggle)**:
- **ไอคอน:** สื่อ "หน้าต่างเด้งออก" → `picture-in-picture-2` (หรือ `app-window`) — **หาไอคอนจริงจาก `OneDrive/.../references/svg-icon-lucide/` ก่อน** (memory `reference_lucide_icons`) · ⛔ ห้ามใช้ `external-link`/↗ (สื่อออกนอกเว็บ)
- กด → เปิด **หน้าต่างลอยแสดงแผ่นเพลงทั้งเพลง** (render `resolvedPreview`/SongSheet)
- **มาตรฐานบังคับ 3 ข้อ:**
  1. **Non-modal** — ไม่มีฉากดำทับ · **แก้เพลงข้างล่างได้พร้อมกัน** (floating panel แบบ Photoshop/PiP)
  2. **Live sync** — ผูก `previewContent`/`resolvedPreview` (reactive) → แก้ปุ๊บ หน้าต่างเปลี่ยนปั๊บ
  3. หน้าต่างมี **ปุ่มปิด ✕ + จับลากได้ + ไม่หลุดขอบจอ (viewport-clamp)**
- **reuse ระบบ dock ลอยที่มีอยู่** (`StudioDock.vue` / dock-core drag+clamp) — อย่าสร้าง floating logic ใหม่ถ้า reuse ได้ (สอดคล้องทั้งแอป)

## จัดวาง 2 ปุ่ม (UX)
วาง A + B **ติดกันเป็นกลุ่ม "พรีวิว"** ในแถบ + tooltip ชัด (A="ดูในที่ ต่อห้อง" · B="เปิดหน้าต่างลอยทั้งแผ่น")

## Responsive (สำคัญ)
- **มือถือ:** ปุ่ม A (ต่อห้อง inline) = พระเอก · ปุ่ม B หน้าต่างลอยไม่เวิร์กบนจอเล็ก → **เปิดเต็มจอมีปุ่มปิด หรือซ่อนปุ่ม B บนมือถือ** (เลือกทางที่เนียน)
- เดสก์ท็อป/แท็บเล็ต: หน้าต่างลอยเต็มรูปแบบ

## ขอบเขต / กันชน
- แตะ `EditorMode.vue` (หลัก) · reuse `StudioDock.vue`/`SongSheet.vue` (ใช้ ไม่รื้อ) · ⛔ **ห้ามแตะ `NoteRow.vue`** · ⛔ ไม่แตะ logic การแก้เพลง/ข้อมูล/parser
- ⚠️ EditorMode = ไฟล์ใหญ่ · ระวัง ✓ ตรวจ (verified) / dock / settings inline ที่มีอยู่ ไม่ให้พัง

## Verify
เปิด `--host` + Network URL · unit + build เขียว · เบราว์เซอร์ 3 breakpoint: A=พรีวิวเปลี่ยนรายห้องเรียลไทม์ · B=เปิดหน้าต่างลอย แก้ข้างล่างเห็นเปลี่ยนสด + ลากได้+ปิดได้+ไม่หลุดขอบ · มือถือ B ทำงานตามที่เลือก · ไม่มี console error

## รายงานกลับ (session-agnostic)
`docs/reports/editor-preview-split.md` + board §📥 inbox + ping PM `PM รอบ 10 ก.ค. (a)` · commit อังกฤษ · เช็ก branch ก่อน commit · **ห้าม merge main/deploy**
