# DS — DockKey (library กลาง) + หน้าฝึกร้อง (reference ตัวแรก)

**SSOT ข้อกำหนด:** `docs/design/ข้อกำหนด dockey.docx` (P'Aim) · **prototype:** `docs/design/dockkey-sing-prototype.html` (กดได้จริง · engine descriptor)
**สถานะ:** design หน้าฝึกร้องเคาะแล้ว (P'Aim 10 ก.ค. · Back = ขวาของ Grip) · docs only · แผ่นเพลง/แก้ไข = รอบถัดไป ใช้ engine เดียวกัน

---

## 1 · แนวคิด — library กลาง 1 ตัว, ทุกหน้าส่งแค่ "รายการปุ่ม"
`DockKey` = engine กลางที่หน้าไหนก็เอาไปใช้ซ้ำได้ · แต่ละหน้า (ฝึกร้อง/แผ่นเพลง/แก้ไข) **ส่งแค่ array ของ descriptor** เข้ามา · engine จัดวาง/ย่อ/แผงตั้งค่า/pin/clamp ให้เอง → ต่างกันแค่ data ไม่ใช่โค้ด (ต่อยอด `StudioDock.vue` เดิม + เพิ่มระบบพิกัด row/col)

### ระบบพิกัด (จากไฟล์)
- **row** นับจากล่างขึ้นบน: แถวล่างสุด = 1, เหนือขึ้นไป = 2, 3, …
- **column** นับจากซ้าย = 1, +1 ไปขวา
- **cap/แถว = เติมเต็มความกว้าง** ที่ปุ่ม 44px (ผ่าน WCAG 2.2 AA): จอ 320px = **6** (การันตีขั้นต่ำ) · 392px ≈ **7** · desktop ≈ **14** (P'Aim 10 ก.ค.: ให้ใช้พื้นที่ที่มี ไม่ล็อคตายที่ 6)
- **แถวล่าง (row1) กระจายเต็มความกว้าง** — grip ชิดซ้ายสุด · ⚙ ชิดขวาสุด (space-between)
- ยาวของ dock = ตามปุ่ม default + ที่เลือกแสดง · เกิน cap → ขึ้นแถวใหม่ (บน)

---

## 2 · Descriptor schema (สัญญาของ library)
```js
DockItem = {
  id,                 // 'grip','back','play','forward','scale','setting','timeslide','key','tuan',...
  name,               // ชื่อไทย (tooltip + หน้า Setting)
  icon,               // ชื่อ Lucide
  kind,               // 'grip'|'gear'|'play'|'btn'|'toggle'|'menu'|'sel'|'slider'|'timeline'|'more'
  place: {
    anchor,           // 'left' | 'right' | 'leftOf:<id>' | 'rightOf:<id>'   (row 1 chrome/transport)
    row,              // 1 = ล่างสุด · 2 = เหนือ · (option ที่ปัก = 'flow')
    col, span,        // สำหรับ row คงที่ (timeslide col1 span3, key col4, tuan col5 span2)
  },
  default,            // 'onDock' (default อยู่บนแถบ) | 'inSetting' (อยู่ในหน้าตั้งค่า)
  pinnable,           // ปัก/ถอนขึ้นแถบได้ไหม
  permanent,          // อยู่บนแถบเสมอ ปักถอนไม่ได้ (เช่น scale/Aa)
  showWhen,           // 'always'(รวมตอนย่อ) | 'expanded' | 'playing' | 'paused'
  // control (สำหรับ menu/slider/stepper): opts/get/set/badge — ใช้ทั้งบนแถบและในหน้า Setting
}
```

### กติกา engine (คงที่ทุกหน้า)
```
1. กรอง item ตาม showWhen + สถานะ (collapsed/playing)
2. วาง row คงที่:
     row1 = [anchor:left] + [rightOf chain] + [pinned flow] + [leftOf:setting] + [anchor:right]
     row2 = item ที่ระบุ row:2 ตาม col/span
3. cap: ถ้าแถวเกิน cap → mobile ดัน pinned ขึ้นแถวใหม่(บน) · desktop พับ tail เข้า ⋯ (ก่อน scale/setting)
4. หน้า Setting = ทุก item ที่ default:'inSetting' หรือ pinnable → แสดง ไอคอน·ชื่อ·ตัวปรับ·▲▼·📌
5. popover/แผง เปิดเหนือแถบ + CLAMP ไม่ล้นขอบ (+8px) — บังคับทุกตัว
6. grip: แตะ=ย่อ(FAB) · ลากค้าง=ย้ายทั้ง dock · เปิดได้ทีละ 1 popover · Esc/แตะนอก=ปิด
```

---

## 3 · หน้าฝึกร้อง — รายการปุ่ม (ตามไฟล์)

| id | ชื่อ | kind | place | default | หน้าที่ |
|---|---|---|---|---|---|
| grip | ย้าย/ย่อ | grip | left · row1 | onDock·always | กดค้างลากย้าย · แตะย่อ |
| back | ท่อนก่อน | btn | rightOf:grip · row1 | onDock | ไปท่อนก่อน |
| play | เล่น/หยุด | play | rightOf:back · row1 | onDock | เล่น/หยุด (สลับตามสถานะ) |
| forward | ท่อนถัดไป | btn | rightOf:play · row1 | onDock | ไปท่อนถัดไป |
| scale | ขนาดตัวอักษร (Aa) | aa | leftOf:setting · row1 | **permanent** | ย่อ/ขยายตัวอักษร |
| setting | ตั้งค่า (⚙) | gear | right · row1 | onDock·always | เปิดหน้าตั้งค่า |
| timeslide | ไทม์ไลน์ | timeline | row2 · col1 span3 | onDock | สถานะเล่น + เลื่อนหา · **แสดงเวลารวมอย่างเดียว** (ตัดเวลาที่เล่นไปแล้ว — หัวสไลเดอร์บอกตำแหน่งแล้ว · P'Aim) |
| key | คีย์ | menu | row2 · col4 | onDock | เลือก key midi ที่เล่น |
| tuan | เลือกท่อน | sel | row2 · col5 span2 | onDock | เลือกท่อนที่จะซ้อม |
| repeat | วนซ้ำ | toggle | flow | **inSetting**·pin | เล่นวนท่อนที่เลือก |
| chord | คอร์ด | menu | flow | **inSetting**·pin | เลือกแบบคอร์ด |
| speed | ความเร็ว | menu | flow | **inSetting**·pin | กำหนดความเร็วจังหวะ |
| layer | แสดงผล | menu | flow | **inSetting**·pin | เลือกแสดง โน้ต/เนื้อ/ฯลฯ |
| alpha | ความโปร่งแถบ | slider | flow | **inSetting**·pin | ความโปร่งของ dock (P'Aim) |

### default (เปิดมา) — 2 แถว แถวละ 6 พอดี
```
Row 2:  [ ไทม์ไลน์ · col 1–3 ] [ คีย์ · 4 ] [ เลือกท่อน · 5–6 ]
Row 1:  [Grip·1][Back·2][Play·3][Fwd·4][Aa·5][⚙·6]
```
- **หน้า Setting (⚙)** = repeat · คอร์ด · ความเร็ว · แสดงผล · ความโปร่ง (แต่ละตัว: ไอคอน·ชื่อ·ตัวปรับ·▲▼·📌)
- **ปัก 📌** → ขึ้นแถบ · mobile ล้น 6 → ขึ้นแถวใหม่(บน) · desktop (cap14) → ลงแถวล่างต่อจาก forward
- **ถอน 📌** → กลับเข้า Setting

> หมายเหตุ: ในโค้ดปัจจุบัน sing settings มี `download`/`print` (จาก `SongViewer.settingDescs`) ด้วย — ไฟล์ dockey.docx ไม่ได้ระบุ → **รอ P'Aim เคาะ** ว่าจะใส่ใน Setting ของฝึกร้องไหม (เดี๋ยวนี้ prototype ยังไม่ใส่)

---

## 4 · Invariants (ทุกหน้า)
```
I1  grip = ซ้ายสุด row1 เสมอ · I2 setting = ขวาสุด row1 เสมอ · scale = ซ้ายของ setting เสมอ
I3  row1 กระจายเต็มความกว้าง (grip ชิดซ้าย · setting ชิดขวา) · ปุ่มเพิ่ม → row1 จนเต็ม แล้วขึ้นแถวบน
I4  อะไรที่ไม่ default บนแถบ → ต้องอยู่ในหน้า Setting เสมอ · ปักแล้วยังอยู่ในนั้น (ที่ถอน/จัดลำดับ)
I5  popover/แผง CLAMP ไม่ล้นขอบ +8px — ไม่มีข้อยกเว้น
I6  cap = เติมเต็มความกว้างที่ 44px (จอ 320px ≥6 · 392px ≈7 · desktop ≈14) — WCAG 2.2 AA
I7  ยุบ = เหลือ [grip][setting] ทุกหน้า · grip ลาก/แตะกาง · setting แตะกางพร้อมเปิดตั้งค่า
I8  เปิดทีละ 1 · Esc/แตะนอก = ปิด · tap ≥ 44px · aria-label ทุกปุ่ม
```

## 5 · ไฟล์ที่แตะ (เมื่อ build)
`StudioDock.vue` → ยกเครื่องเป็น DockKey engine (row/col + anchor + Setting แบบ pin) · `SingTransport.vue` → เลิกวาด chrome เอง เหลือส่ง descriptor list · `SongViewer.vue`/`Studio.vue` จุดต่อ · **ไม่แตะ** notation/NoteRow/SongSheet · ทับ B043/dock-polish → PM จัดคิว worktree
