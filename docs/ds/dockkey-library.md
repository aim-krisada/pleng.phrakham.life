# DS — DockKey (library กลาง) + หน้าฝึกร้อง (reference ตัวแรก)

**SSOT ข้อกำหนด:** `docs/design/ข้อกำหนด dockey.docx` (P'Aim) · **prototype:** `docs/design/dockkey-sing-prototype.html` (กดได้จริง · engine descriptor)
**สถานะ:** design หน้าฝึกร้องเคาะแล้ว (P'Aim 10 ก.ค. · Back = ขวาของ Grip) · docs only · แผ่นเพลง/แก้ไข = รอบถัดไป ใช้ engine เดียวกัน

---

## 1 · แนวคิด — library กลาง 1 ตัว, ทุกหน้าส่งแค่ "รายการปุ่ม"
`DockKey` = **core engine กลางตัวเดียว** ที่หน้าไหนก็เอาไปใช้ซ้ำได้ · แต่ละหน้า (ฝึกร้อง/แผ่นเพลง/แก้ไข) **ส่งแค่ array ของ descriptor** เข้ามา · **core จัดการทุกอย่างเอง** (วาง row/col · cap เติมเต็ม · ยุบ/กาง collapse-in-place · ลาก · แผงตั้งค่า+pin · clamp) → **3 หน้าใช้ core เดียวกัน ต่างแค่ data ไม่ใช่โค้ด** (ต่อยอด `StudioDock.vue` เดิม + เพิ่มระบบพิกัด row/col)
> prototype `dockkey-sing-prototype.html` = แยกชัด: **core** (`itemHtml`/`buildRows`/`render`/drag/`transitionInPlace`/gear-panel) + **data** (`ITEMS_SING`) · แผ่นเพลง/แก้ไข = เพิ่ม `ITEMS_PRINT`/`ITEMS_EDIT` ป้อน core เดิม

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
5. popover/แผง เปิดเหนือแถบ + CLAMP ไม่ล้นขอบ (+8px) — บังคับทุกตัว · แผงลิสต์ (เลือกท่อน) สูงตามเนื้อหา · scroll เฉพาะตอนเกินจอจริง (max-height อิงจอ เช่น 52vh · ห้ามล็อกเตี้ย)
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
| scale | ขนาดตัวอักษร (Aa) | aa | leftOf:setting · row1 | **permanent** | ย่อ/ขยายตัวอักษร · บนแถบแสดงแค่ "Aa" (ตัวเลข % + ปุ่ม ↺100% อยู่ในป๊อปอัพ) — กันปุ่มกว้างจนดันปุ่มหลุดขอบ |
| setting | ตั้งค่า (⚙) | gear | right · row1 | onDock·always | เปิดหน้าตั้งค่า |
| timeslide | ไทม์ไลน์ | timeline | row2 · col1 span3 | onDock | **แตะจุดไหน = วิ่งไปจุดนั้นทันที** · **เส้นท่อน**: เลือก=น้ำตาลทึบ(จะเล่น)·ไม่เลือก=เทา(ข้าม)·ท่อนที่หัวอยู่=หนาขึ้น · ช่องแบ่ง=ขอบท่อน · **snap เข้าขอบท่อนเงียบๆ** (ไม่มีวงกลมท่อน — เหลือหัวสไลเดอร์เป็นวงกลมเดียว = ตำแหน่ง · SA แนะนำ: วงกลมท่อนซ้ำกับเส้น+รกบนมือถือ) · **แสดงเวลารวมอย่างเดียว** |
| key | คีย์ | menu | row2 · col4 | onDock | เลือก key midi ที่เล่น |
| tuan | เลือกท่อน | sel | row2 · col5 span2 | onDock | เลือกท่อนที่จะซ้อม · **default = ติ๊กทุกท่อน (เล่นทั้งเพลง 1 รอบ)** · เชื่อมกับไทม์ไลน์ (ท่อนที่เลือก = แถบสีน้ำตาล · ไม่เลือก = เทา) |
| repeat | วนซ้ำ | toggle | flow | **inSetting**·pin | เล่นวนท่อนที่เลือก |
| chord | คอร์ด | menu | flow | **inSetting**·pin | เลือกแบบคอร์ด |
| speed | ความเร็ว | menu | flow | **inSetting**·pin | กำหนดความเร็วจังหวะ |
| layer | แสดงผล | menu | flow | **inSetting**·pin | เลือกแสดง โน้ต/เนื้อ/ฯลฯ |
| alpha | โปร่งใส | slider | flow | **inSetting**·pin | โปร่งใสของ dock (P'Aim) |

### default (เปิดมา) — 2 แถว แถวละ 6 พอดี
```
Row 2:  [ ไทม์ไลน์ · col 1–3 ] [ คีย์ · 4 ] [ เลือกท่อน · 5–6 ]
Row 1:  [Grip·1][Back·2][Play·3][Fwd·4][Aa·5][⚙·6]
```
- **หน้า Setting (⚙)** = repeat · คอร์ด · ความเร็ว · แสดงผล · โปร่งใส (แต่ละตัว: ไอคอน·ชื่อ·ตัวปรับ·▲▼·📌)
- **แถวล่าง (row1) = core คงที่** Grip·Back·Play·Fwd·Aa·⚙ เสมอ — **ปุ่มที่ปักไม่แทรกแถวล่าง**
- **ปัก 📌** → ขึ้น**แถวใหม่เหนือ row2** (ทั้งมือถือ+เดสก์ท็อป) · เต็ม cap ต่อแถว (มือถือ 7 · เดสก์ท็อป 14) แล้วขึ้นแถวถัดไป
- **ถอน 📌** → กลับเข้า Setting

> หมายเหตุ: ในโค้ดปัจจุบัน sing settings มี `download`/`print` (จาก `SongViewer.settingDescs`) ด้วย — ไฟล์ dockey.docx ไม่ได้ระบุ → **รอ P'Aim เคาะ** ว่าจะใส่ใน Setting ของฝึกร้องไหม (เดี๋ยวนี้ prototype ยังไม่ใส่)

---

## 4 · Invariants (ทุกหน้า)
```
I1  grip = ซ้ายสุด row1 เสมอ · I2 setting = ขวาสุด row1 เสมอ · scale = ซ้ายของ setting เสมอ
I3  row1 = core คงที่ (grip ชิดซ้าย · setting ชิดขวา · กระจายเต็มกว้าง) — ปุ่มที่ปัก **ไม่แทรก row1** · ขึ้นแถวเหนือ row2 แทน
I4  อะไรที่ไม่ default บนแถบ → ต้องอยู่ในหน้า Setting เสมอ · ปักแล้วยังอยู่ในนั้น (ที่ถอน/จัดลำดับ)
I5  popover/แผง CLAMP ไม่ล้นขอบ +8px — ไม่มีข้อยกเว้น
I6  cap = เติมเต็มความกว้างที่ 44px (จอ 320px ≥6 · 392px ≈7 · desktop ≈14) — WCAG 2.2 AA
I7  ยุบ = เหลือ [grip][setting] ทุกหน้า · grip ลาก/แตะกาง · setting แตะกางพร้อมเปิดตั้งค่า · **ยุบ/กาง อยู่ที่เดิม ไม่กระโดด (collapse-in-place: grip ค้างตำแหน่งเดิม · กางแล้วกว้างเกินก็เลื่อนเข้ากรอบขั้นต่ำ)** · **ลาก grip ได้ทั้งยุบ+กาง (transform-based · คุมในกรอบ)**
I8  เปิดทีละ 1 · Esc/แตะนอก = ปิด · tap ≥ 44px · aria-label ทุกปุ่ม
```

## 5 · ไฟล์ที่แตะ (เมื่อ build)
`StudioDock.vue` → ยกเครื่องเป็น DockKey engine (row/col + anchor + Setting แบบ pin) · `SingTransport.vue` → เลิกวาด chrome เอง เหลือส่ง descriptor list · `SongViewer.vue`/`Studio.vue` จุดต่อ · **ไม่แตะ** notation/NoteRow/SongSheet · ทับ B043/dock-polish → PM จัดคิว worktree
