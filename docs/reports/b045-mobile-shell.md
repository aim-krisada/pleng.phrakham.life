# B045 — แถบบนมือถือ: ย้าย download/font ลง dock (dev)

**branch:** `b045-mobile-shell` (แตกจาก `studio-shell-redesign`) · **commit:** `21bdffe`
**AC:** `docs/us/ps3-shell.md` §S4-B045 · **DS:** `docs/ds/mobile-shell-b045.md`
**LAN (--host):** `http://10.215.141.98:5345/` — P'Aim ทดสอบมือถือจริง

---

## สรุปสั้น (F60+)

แถว 1 แถบบนเดิมยัด 5 อย่าง (แบรนด์ยาว + ชื่อเพลง + ฟอนต์ + ดาวน์โหลด + ล็อกอิน) → ชื่อเพลงโดนตัดเหลือ "1. ..." บนมือถือ (real-use 9 ก.ค.) · **B045 ตัดฟอนต์+ดาวน์โหลดออกจากแถบบน แล้วให้ Aa เป็นปุ่มเดียวใน dock (แตะ → popover สไลเดอร์ปรับขนาดสด)** ตามที่ P'Aim เคาะ · ผลแถว 1 = `แบรนด์ ▾ · ชื่อเพลง · 👤` ทุกขนาดจอ

---

## สิ่งที่ทำ (ตรง AC 5 ข้อ)

| AC | ทำ | ไฟล์ |
|---|---|---|
| 1. แบรนด์คงเดิม (ไม่ทำโลโก้/hamburger · B009 ไม่โดนแตะ) | ✅ ไม่แตะ `.sb-menu`/`.sb-brand`/`.sb-caret` เลย | — |
| 2. ตัดปุ่มดาวน์โหลดออกจากแถบบน | ✅ เอา `<DownloadTool />` ออกจาก default `.sb-right` | `ShellBar.vue` |
| 3. ตัดฟอนต์ → ปุ่ม Aa เดี่ยวใน dock · แตะ → popover สไลเดอร์สด | ✅ เอา `<FontTool />` ออกจากแถบบน + เพิ่มปุ่ม Aa ถาวรใน player | `ShellBar.vue` · `SingTransport.vue` · `store.js` |
| 4. แถว 1 มือถือ = แบรนด์ · ชื่อเพลง · 👤 | ✅ `.sb-right` เหลือแค่ `<ProfileTool />` | `ShellBar.vue` |
| 5. สโคป desktop = ตัดทุกขนาด (PM เคาะ A) | ✅ ตัดจาก default slot ตรง ๆ (ไม่ทำ mobile-only) → dock = บ้านเครื่องมือทุกจอ | `ShellBar.vue` |

**ปุ่ม Aa (ตาม DS §5.6):** ปุ่ม `Aa` + badge `%` + caret ในแถวเครื่องเล่น (44×44) · แตะ 1 ครั้ง → popover ลอยเหนือ dock (pattern เดียวกับ display/tempo/key · reuse `openMenu('fontsize')` + `.mp-dd` + on-screen clamp เดิม · ไม่ดันเนื้อ) · ใน popover = หัวข้อ "ขนาดตัวอักษร" + สไลเดอร์ `A —o— A` (80–220% step 10 = ช่วง+ขั้นเท่า FontTool เดิม) + ป้าย % ปัจจุบัน · **เลื่อน = เนื้อเพลงเปลี่ยนขนาดสด**

---

## ⭐ การตัดสินใจทางสถาปัตย์ (ต่างจาก US ที่ระบุ `SongViewer.vue`)

US §S4-B045 เขียนไฟล์ว่าให้เพิ่ม tool Aa เข้า **`SongViewer.vue`** viewDock · **แต่ dev ทำใน `SingTransport.vue` แทน** — เพราะ:

1. **กันชน (สำคัญ):** board §36 ระบุสาย **`songviewer-refs` (`task_1d8ade16`) กำลังแก้ `SongViewer.vue`** อยู่ (B053 follow-up) · การแตะ `SongViewer.vue` = ชน merge ตรง ๆ · brief กันชนก็ ⛔ ห้ามแตะ `SongViewer.vue`/`Studio.vue`
2. **สะอาดกว่า:** ขนาดตัวอักษร = **state ผู้อ่านระดับ global** (`store.readingFontScale`) — เหมือน "ความโปร่ง" (`alphaSetting`) ที่ `SingTransport` สร้าง+ฉีดเองอยู่แล้วโดยไม่พึ่งหน้า · จึงวาง Aa ใน player ได้ตรง ๆ อ่าน/เขียน store ไม่ต้องเดินสายผ่าน `SongViewer` เลย
3. **ผลลัพธ์เท่ากัน:** Aa โผล่ใน dock โหมดฝึกร้อง (player = SingTransport ใช้เฉพาะ sing) · แตะ 1 ครั้ง → สไลเดอร์สด — ตรง AC ทุกข้อ

**ไม่ทำเป็น pinnable setting** (ไม่เข้า `allSettings`/pins) แต่เป็น **ปุ่มถาวร** นอก `.mp-pins` → รับประกัน 1 แตะสำหรับผู้ใช้ทุกคน (รวมคนที่เคยตั้ง pin ไว้แล้ว) · ไม่ต้อง migration · ไม่กระทบเทส pin/reorder เดิม

---

## กันชน — ตรวจก่อนตัด (AC ข้อ 2 เงื่อนไข)

ก่อนตัด DownloadTool ตรวจแล้วว่า **ดาวน์โหลดยังเข้าถึงได้ครบทุก dock mode** (ไม่เสียฟีเจอร์):

| โหมด | ดาวน์โหลด | ที่มา |
|---|---|---|
| ฝึกร้อง (SongViewer) | ✅ มี (JSON) + พิมพ์ | `settingDescs` → ⚙ panel |
| แก้ไข (EditorMode) | ✅ มี | `DOCK_DEFAULT` มี `download` |
| แผ่นเพลง (Studio sheetDock) | พิมพ์ (ไม่มี download) | AC: print พอ (ไม่เพิ่มเว้น P'Aim สั่ง) |
| หน้าที่ไม่มี dock (รายการ/คู่มือ/เกี่ยวกับ) | — | DownloadTool เดิม `v-if="currentSong"` = ไม่มีเพลง → **ไม่เคยโผล่อยู่แล้ว** → ตัดไม่เสียอะไร |

FontTool เดิมก็ `v-if="currentSong"` เช่นกัน → โผล่เฉพาะตอนเปิดเพลง = โหมดที่มี dock → ย้ายลง dock ไม่เสียการเข้าถึง (dock ล่าง = thumb zone เข้าถึงง่ายกว่าแถบบนสุดด้วยซ้ำ)

---

## ไฟล์ที่แตะ (4 ไฟล์ · disjoint กับสายอื่น)

- `src/components/ShellBar.vue` — เอา FontTool/DownloadTool + import ออกจาก default `.sb-right` slot (เหลือ ProfileTool)
- `src/components/SingTransport.vue` — เพิ่มปุ่ม Aa + popover สไลเดอร์ (import readingFontScale/setFontScale · `fontPct` computed · row 2 markup + scoped CSS)
- `src/store.js` — เพิ่ม `setFontScale(v)` (clamped absolute set) + อัปเดต comment ที่บอกว่า Aa อยู่ top nav
- `src/components/SingTransport.test.js` — เพิ่มเทส B045 2 เคส

**ไม่แตะ:** `SongViewer.vue`/`Studio.vue` (สายอื่น · กันชน) · `styles.css` (songsheet-finish) · `SongSheet.vue`/`NoteRow.vue` · dock ฝึกร้อง/แก้ไข (มี download แล้ว) · theme token · `FontTool.vue`/`DownloadTool.vue` (component ยังอยู่ แค่ไม่ mount ในแถบบน)

---

## Verify

- **unit:** `vitest run` = **258 passed** (256 เดิม + 2 B045) · SingTransport 20/20 · ShellBar 2/2 · FontTool 4/4 (component เดิมยังผ่าน)
  - เทส B045: (1) ปุ่ม Aa โผล่บนแถบเสมอแม้ pin ว่าง (1 แตะ · pin ออกไม่ได้) (2) **แตะ Aa → เปิดสไลเดอร์ → เลื่อนไป 140 → `readingFontScale` = 1.4 + badge = 140% (ปรับสด)**
  - `notationLint.test.mjs` (1 ไฟล์) = process.exit ของเดิม ไม่เกี่ยว · รัน node ตรง = **72 passed / 0 failed**
- **build:** `npm run build` ✅
- **compile (worktree serve จริง 5345 · curl 127.0.0.1):** `ShellBar.vue` HTTP 200 · 0 FontTool/DownloadTool ref · 3 ProfileTool · `SingTransport.vue` HTTP 200 · มี mp-fontslider/mp-fontbtn/readingFontScale/setFontScale · `store.js` HTTP 200 · มี setFontScale
- **console:** ไม่มี error (เทส mount ผ่านสะอาด · dev server ไม่มี error ใน log)

### ⏳ รอ P'Aim ตรวจ LAN มือถือจริง (`http://10.215.141.98:5345/` · เปิดเพลง → โหมดฝึกร้อง)
1. **แถว 1 มือถือ:** แบรนด์ยาวเต็ม · **ชื่อเพลงยาวขึ้น อ่านได้จริง (ไม่ตัดเหลือ "1. ...")** · ไม่มี download/font ในแถบบน · 👤 อยู่
2. **3 breakpoint** (มือถือ/แท็บเล็ต/เดสก์ท็อป) ไม่มี H-overflow · desktop แถบบนไม่มี download/font แล้วเช่นกัน (ตาม PM เคาะ A)
3. **Aa ใน dock:** แตะ → สไลเดอร์ · เลื่อน = เนื้อเพลงโต/เล็กสด · ปุ่ม+thumb แตะได้ ≥44
4. **download ใน dock ครบ** (ฝึกร้อง ⚙ panel + แก้ไข)

> ตามบทเรียน: การ "ปรับขนาดสด" พิสูจน์ด้วย unit test แล้ว (deterministic ไม่ใช่ DOM proxy) · ที่เหลือ = ความยาวชื่อเพลงจริง + สัมผัสมือถือ = P'Aim accept บน LAN

---

## กันชน / สโคป

- ⛔ **ห้าม merge / deploy** — รอ P'Aim accept LAN
- แตะเฉพาะ 4 ไฟล์ข้างบน (disjoint) → merge อิสระได้
- **แจ้ง PM:** dev ทำ Aa ใน `SingTransport.vue` แทน `SongViewer.vue` (ตาม US) เพื่อเลี่ยงชน `songviewer-refs` · ถ้า PM อยากได้ตาม US เป๊ะ (SongViewer) = ต้องรอ `songviewer-refs` merge ก่อน แล้วค่อยทำ — แต่ทางนี้สะอาดกว่าและไม่ชน
