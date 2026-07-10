# DS — DockKey หน้าพิมพ์ (แผ่นเพลง) + หน้าแก้ไข (descriptor 2 ชุด)

**อ่านคู่กับ:** `docs/ds/dockkey-library.md` (core engine + schema §2 + หน้าฝึกร้อง = reference ตัวแรก) · **prototype:** `docs/design/dockkey-sing-prototype.html`
**ขอบเขต:** docs only — เขียน **ITEMS_PRINT** + **ITEMS_EDIT** เป็น descriptor ป้อน core เดิม (ไม่แก้ core · ไม่แก้ DS หน้าฝึกร้อง)
**หลักการ:** 3 หน้าใช้ core เดียว ต่างแค่ "รายการปุ่ม" · row1 = core คงที่ (Grip ซ้ายสุด · ⚙ ขวาสุด · Aa ซ้ายของ ⚙) เหมือนกันทุกหน้า

> ที่มาของ descriptor: อ่านปุ่ม/ควบคุมที่ 2 หน้านี้ **มีจริงในโค้ดตอนนี้** แล้วแมปเป็น descriptor —
> หน้าพิมพ์ = `Studio.vue` (`sheetDock` = ปุ่ม `print` ปุ่มเดียว · `SongSheet` ตอนนี้ล็อกตาย `mode="full" chord-system="letter" songbook`) + `SongViewer.settingDescs` (แสดงผล/คอร์ด/คีย์/ดาวน์โหลด/พิมพ์ = แม่แบบ menu ที่พิสูจน์แล้ว) ·
> หน้าแก้ไข = `EditorMode.vue` `DOCK_DEFAULT` + `editDockTools` + `PALETTE` (แป้นโน้ต 2 แถว)

---

## 1 · หน้าพิมพ์ / แผ่นเพลง — ITEMS_PRINT

หน้านี้ไม่มี playback (ไม่มี back/play/forward) → row1 โล่งกว่าหน้าฝึกร้อง: เหลือ **Grip · พิมพ์ · Aa · ⚙**
"ตัวเลือกแผ่นเพลง" (แสดงผล/แบบแผ่น/คอร์ด/คีย์) = default อยู่ใน ⚙ ปักขึ้นแถบได้ — คุมว่ากระดาษจะพิมพ์อะไรออกมา

| id | ชื่อ (tooltip / ⚙) | kind | icon (Lucide) | place | default | showWhen | หน้าที่ |
|---|---|---|---|---|---|---|---|
| grip | ย้าย/ย่อ | grip | `grip-vertical` | left · row1 | onDock·always | always | กดค้างลากย้าย · แตะย่อ |
| print | พิมพ์ / บันทึก PDF | btn·**prime** | `printer` | rightOf:grip · row1 | onDock·always | always | เปิด print dialog (`window.print()`) · ปุ่มหลักสีแบรนด์ |
| scale | ขนาดตัวอักษร (Aa) | aa | — (ข้อความ "Aa") | leftOf:setting · row1 | **permanent** | always | ย่อ/ขยายตัวอักษร **พรีวิวบนจอ** (`store.readingFontScale`) · กระดาษพิมพ์คงที่ 1rem เสมอ · ตัวเลข%+↺100% อยู่ในป๊อปอัพ |
| setting | ตั้งค่า (⚙) | gear | `settings` | right · row1 | onDock·always | always | เปิดหน้าตั้งค่า |
| display | แสดงผล | menu | `layers` | flow | **inSetting**·pin | always | ครบ(เนื้อ+คอร์ด+โน้ต) / เนื้อ+คอร์ด / เนื้อ+โน้ต / เนื้อล้วน / โน้ตล้วน — badge = short label · **คุมว่าเลเยอร์ไหนพิมพ์** (ปัจจุบันล็อก "ครบ") |
| book | แบบแผ่น | menu | `book-open` | flow | **inSetting**·pin | always | **สมุดเพลง** (ทำนองโชว์ครั้งเดียว · เที่ยวซ้ำ=เนื้อล้วน) / **เต็ม** (โน้ตทุกเที่ยว) — คุม prop `songbook` (ปัจจุบันล็อก true) |
| chord | คอร์ด | menu | `guitar` | flow | **inSetting**·pin | always | ตัวอักษร (A B C) / เลขนัชวิลล์ (1 4 5) / ซ่อนคอร์ด — badge ABC·145·— (เหมือนฝึกร้อง) |
| key | คีย์ (พิมพ์คีย์อื่น) | menu | `key-round` | flow | **inSetting**·pin | always | transpose ตอนพิมพ์ · badge = คีย์ที่เลือก (default = คีย์เดิมของเพลง) |
| download | ดาวน์โหลด JSON | btn | `download` | flow | **inSetting**·pin | always | โหลดไฟล์ข้อมูลเพลง (`downloadSong`) |

### default (เปิดมา) — 1 แถวพอดี
```
Row 1:  [Grip · ซ้ายสุด] [ พิมพ์ (สีแบรนด์) ] ······· [Aa] [⚙ · ขวาสุด]
```
- **บนแถบ default:** Grip · **พิมพ์** · Aa · ⚙ (4 ตัว · row1 กระจายเต็มกว้าง space-between: grip ชิดซ้าย · ⚙ ชิดขวา · พิมพ์เกาะขวาของ grip · Aa เกาะซ้ายของ ⚙)
- **ใน ⚙ (default inSetting · ปักได้):** แสดงผล · แบบแผ่น · คอร์ด · คีย์ · ดาวน์โหลด (แต่ละตัว: ไอคอน·ชื่อ·ตัวปรับ·▲▼·📌)
- **ปัก 📌** → ขึ้นแถวเหนือ row1 (เหมือนหน้าฝึกร้อง) · เต็ม cap ต่อแถว (มือถือ ~7 · เดสก์ท็อป ~14) แล้วขึ้นแถวถัดไป
- **ยุบ** → เหลือ [Grip][⚙]

---

## 2 · หน้าแก้ไข — ITEMS_EDIT

หน้าแก้ไข = surface ทำงาน (ฟอร์ม) ไม่ใช่หน้าอ่าน · จุดต่างสำคัญ = มี **แป้นโน้ตตัวเลข (jianpu palette) 2 แถว** เป็นแถบคีย์บอร์ดเต็มกว้างของตัวเอง (edit-only) เหนือทุกแถว
ปุ่มหลัก = **บันทึก/ส่งตรวจ** (ไม่ใช่ play) → วางเด่นบน row2

| id | ชื่อ (tooltip / ⚙) | kind | icon (Lucide) | place | default | showWhen | หน้าที่ |
|---|---|---|---|---|---|---|---|
| keys | แป้นโน้ตตัวเลข | **keys** (band) | — (คีย์ข้อความ) | band · เหนือ row2 | onDock·always | expanded | คีย์บอร์ด 2 แถว · แตะ=แทรกสัญลักษณ์ลงช่องโน้ตที่โฟกัส (`onInsert`) · **edit-only** · เต็มกว้าง ไม่เข้าคิว overflow |
| grip | ย้าย/ย่อ | grip | `grip-vertical` | left · row1 | onDock·always | always | กดค้างลากย้าย · แตะย่อ |
| undo | ย้อน | btn | `undo-2` | rightOf:grip · row1 | onDock | always | ย้อน (disabled เมื่อไม่มีประวัติ) |
| redo | ทำซ้ำ | btn | `redo-2` | rightOf:undo · row1 | onDock | always | ทำซ้ำ |
| play | ฟังท่อน (ที่กำลังแก้) | play | `play` | rightOf:redo · row1 | onDock | paused | เล่นทำนองท่อนที่กำลังแก้ |
| stop | หยุด | btn·danger | `square` | (แทนที่ play) · row1 | onDock | playing | หยุดเล่น (สลับกับ play ตามสถานะ) |
| scale | ขนาดตัวอักษร (Aa) | aa | — (ข้อความ "Aa") | leftOf:setting · row1 | **permanent** | always | ย่อ/ขยายตัวอักษรพรีวิว *(ดู Q2 — edit เป็นฟอร์ม อาจไม่ต้อง)* |
| setting | ตั้งค่า (⚙) | gear | `settings` | right · row1 | onDock·always | always | เปิดหน้าตั้งค่า |
| save | บันทึก / ส่งตรวจ | btn·**prime** | `send` (approver = `badge-check`) | row2 · col1 span2 | onDock | loggedIn | ปุ่มหลัก: editor=ส่งตรวจ · approver=เผยแพร่/อนุมัติ · ป้ายเปลี่ยนตามสิทธิ์ (`primaryLabel`) |
| playAll | ฟังทั้งเพลง | btn | `circle-play` | row2 · flow | onDock | paused | เล่นทั้งเพลงตามลำดับ arrangement |
| draft | บันทึกร่าง | btn | `save` | flow | **inSetting**·pin | loggedIn | เซฟร่าง (auto-save คลุมอยู่แล้ว → default ซ่อนใน ⚙) |
| download | ดาวน์โหลด JSON | btn | `download` | flow | **inSetting**·pin | always | โหลดไฟล์ข้อมูลเพลง |
| preview | ดูผลทั้งเพลง (หน้าต่างลอย) | toggle | `picture-in-picture-2` | flow | **inSetting**·pin | always | เปิด/ปิดหน้าต่างพรีวิวทั้งเพลง *(ตอนนี้อยู่แถบหัวแก้ไข — ดู Q3)* |

### default (เปิดมา)
```
Keys :  [ 1 2 3 4 5 6 7 0 - ~ ]              ← แป้นโน้ต แถว 1 (เต็มกว้าง)
Keys :  [ . ' _ ^ ( ) { } # b n ]           ← แป้นโน้ต แถว 2 (เต็มกว้าง)
Row 2:  [ บันทึก/ส่งตรวจ (สีแบรนด์) ] [ ฟังทั้งเพลง ]
Row 1:  [Grip][ย้อน][ทำซ้ำ][ฟังท่อน][Aa][⚙]
```
- **แถบคีย์ (band):** แป้นโน้ต 2 แถว = เต็มกว้าง อยู่บนสุด (โครงเดียวกับ `sd-keys` เดิม + region เต็มกว้างแบบ B043) · **ยกเว้น cap/overflow** · ซ่อนตอนย่อ
- **row2:** ปุ่มหลัก **บันทึก** (prime · col1 span2) + ฟังทั้งเพลง — เที่ยง anon (ยังไม่ล็อกอิน) บันทึกซ่อน เหลือฟังทั้งเพลง
- **row1 (core):** Grip · ย้อน · ทำซ้ำ · ฟังท่อน(↔หยุด) · Aa · ⚙
- **ใน ⚙ (default inSetting · ปักได้):** บันทึกร่าง · ดาวน์โหลด · ดูผลทั้งเพลง
- **ยุบ** → เหลือ [Grip][⚙] (แป้นโน้ต+ทุกแถวหาย)

### ⛔ ที่ **ไม่** เอาขึ้น dock (คงไว้ inline ในตารางแก้ไข เหมือนเดิม)
เครื่องมือโครงสร้างโน้ต — **เพิ่มห้อง · เพิ่มบรรทัด · เพิ่มทำนอง · ห้องยก(pickup) · วนซ้ำ(repeat) · volta · ทำซ้ำห้อง · ลบห้อง/บรรทัด/ท่อน** — ปัจจุบันเป็นปุ่ม **inline ต่อห้อง/ต่อบรรทัด** ในตารางแก้ไข (ไม่ใช่ปุ่ม dock)
**เหตุผล (SA):** ปุ่มพวกนี้ทำงานกับ "ห้อง/บรรทัดที่ตรงนั้น" (contextual) ไม่ใช่คำสั่งรวมทั้งเพลง → เอาขึ้น dock จะเสียบริบท (ต้องเลือกก่อนว่าห้องไหน) · จึงคงไว้ในตาราง · dock รับเฉพาะคำสั่ง **global** (ย้อน/ทำซ้ำ/เล่น/บันทึก/ดาวน์โหลด) + แป้นแทรกสัญลักษณ์
> "จุด/เขบ็ต/เอื้อน" ที่ใบสั่งเอ่ยถึง = แทรกผ่าน **แป้นโน้ต** อยู่แล้ว: `.`=จุด(เพิ่มครึ่ง) · `_`=ขีดใต้(เขบ็ต) · `~`=โค้ง(เอื้อน/tie) · `- 0 ( ) { } ' ^ # b n` ครบในแป้น

---

## 3 · Invariants ที่ 2 หน้านี้ยึด (ตาม dockkey-library §4)
```
I1  grip = ซ้ายสุด row1 เสมอ · I2 setting(⚙) = ขวาสุด row1 · scale(Aa) = ซ้ายของ ⚙ (ทั้ง print + edit)
I3  row1 = core คงที่ · ปุ่มที่ปัก ไม่แทรก row1 → ขึ้นแถวเหนือสุดแทน
I4  อะไรไม่ default บนแถบ → อยู่ใน ⚙ เสมอ (ปักแล้วยังจัดลำดับ/ถอนได้ใน ⚙)
I5  popover/แผง CLAMP ไม่ล้นขอบ +8px
I6  cap = เติมเต็มกว้างที่ 44px (320px ≥6 · 392px ≈7 · desktop ≈14) — WCAG 2.2 AA
I7  ยุบ = เหลือ [grip][⚙] · collapse-in-place ไม่กระโดด
I8  เปิดทีละ 1 popover · Esc/แตะนอก=ปิด · tap ≥44px · aria-label ทุกปุ่ม
```

---

## 4 · ข้อเสนอขยาย schema (core รับเพิ่ม · ไม่แตะ DS ฝึกร้อง)
core ตอนนี้ (จาก `dockkey-library.md` §2 + `StudioDock.vue`) รับ print ได้ครบ **ไม่ต้องเพิ่มอะไร** (print = grip/gear/aa/menu/btn ล้วน) · ที่ต้องเติมมีเฉพาะ **edit**:

| # | เพิ่ม | ทำไม | หมายเหตุ implement |
|---|---|---|---|
| E1 | **`kind:'keys'`** — band คีย์บอร์ดเต็มกว้าง (1–2 แถว) · carry `rows:[[…],[…]]` + `onInsert(sym)` | แป้นโน้ตตัวเลข edit-only · ไม่ใช่ปุ่มเดี่ยว วางในระบบ row/col ไม่ได้ | มีของจริงแล้วใน `StudioDock` (`sd-keys` + `paletteKeys`) · แค่นิยามเป็น descriptor kind ให้ engine รู้ว่าเป็น band เต็มกว้าง (แบบ `region:'top'` ที่ B043 ใช้กับ transport) · ยกเว้น cap/overflow · show เฉพาะ expanded |
| E2 | **`prime:true`** — attribute ปุ่มหลักสีแบรนด์ (พิมพ์ · บันทึก) | ปุ่มหลักต้องเด่น (เหมือน play เด่นในฝึกร้อง) | มีใน tool def เดิมของ `StudioDock` แล้ว (`prime`) · แค่รับเข้า descriptor schema อย่างเป็นทางการ |
| E3 | **`showWhen` เพิ่มค่า login/role** — `'loggedIn'` (+ implicit สลับ label ตาม role) | ปุ่ม บันทึก/บันทึกร่าง โผล่เฉพาะตอนล็อกอิน · ป้าย+ไอคอนของ save เปลี่ยนตามสิทธิ์ (editor↔approver) | ปัจจุบัน edit ใช้ `visible:boolean` (`loggedIn.value`) + `primaryLabel` · map เป็น `showWhen:'loggedIn'` + descriptor อ่าน label/icon จาก getter |

> print ไม่ต้องใช้ E1–E3 (single-row เมนูล้วน) → **หน้าพิมพ์เสียบ core ปัจจุบันได้ทันที** · edit รอ E1–E3 ก่อนเสียบเต็ม

---

## 5 · จุดที่เปลี่ยนพฤติกรรมจากของเดิม (ให้ dev รู้)
- **หน้าพิมพ์เดิม** `sheetDock` = ปุ่ม `print` ปุ่มเดียว · `SongSheet` ล็อก `mode="full" chord-system="letter" songbook`
  → DS นี้เปิดให้เลือก **แสดงผล/แบบแผ่น/คอร์ด/คีย์** ผ่าน ⚙ (default state = เท่าเดิม: ครบ·สมุดเพลง·ตัวอักษร·คีย์เดิม) → ผู้ใช้ปรับได้ถ้าต้องการ
- **Aa บนหน้าพิมพ์:** B045 ย้าย FontTool ออกจาก top-bar ไปไว้ dock ฝึกร้อง → หน้าพิมพ์ตอนนี้ **ไม่มี** ปุ่มขนาดตัวอักษรเลย · DS นี้คืน Aa ให้หน้าพิมพ์ (permanent · scale พรีวิวบนจอ · กระดาษยังคงที่)
- **แป้นโน้ต + ปุ่ม dock หน้าแก้ไข** = คงชุดเดิมของ `editDockTools` ครบ · แค่จัด row/col ใหม่ตาม DockKey (ปุ่ม inline โครงสร้างไม่ยุ่ง)

---

## 6 · คำถามถึง P'Aim (≤4)
1. **หน้าพิมพ์ — default บนแถบ** ควรเป็น **Grip·พิมพ์·Aa·⚙** (ตัวเลือกแผ่นเพลงอยู่ใน ⚙) หรืออยากให้ **แสดงผล/แบบแผ่น** โผล่บนแถบเลย (คนพิมพ์ปรับบ่อย ไม่ต้องเข้า ⚙)?
2. **Aa บนหน้าแก้ไข** — เก็บไว้ (ครบ 3 หน้าเหมือนกัน · scale พรีวิว) หรือถอดออก (หน้าแก้ไขเป็นฟอร์ม ขนาดตัวอักษรไม่ค่อยจำเป็น → row1 เหลือ Grip·ย้อน·ทำซ้ำ·ฟังท่อน·⚙)?
3. **ปุ่ม "ดูผลทั้งเพลง" (พรีวิวลอย)** — ตอนนี้อยู่แถบหัวหน้าแก้ไข · ย้ายลงมาไว้ dock (ใน ⚙ ปักได้) ตาม DS นี้ หรือคงไว้ที่หัวเหมือนเดิม?
4. **แบบแผ่น (สมุดเพลง ↔ เต็ม)** — ยืนยันว่าต้องการให้ **ผู้ใช้สลับเองได้** (ตอนนี้ล็อก "สมุดเพลง") ใช่ไหม · หรือให้พิมพ์เป็นสมุดเพลงเสมอ (ตัดตัวเลือกนี้ทิ้ง)?
