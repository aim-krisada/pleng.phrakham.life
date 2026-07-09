# Handoff / ขอคำแนะนำ — auto-scroll พาพยางค์หลบหลัง dock (B043 gate)

**จาก:** session มือถือ `mobile-triage z9da6p` (branch `claude/pleng-mobile-triage-z9da6p`) — รันบน remote container, Supabase โดนบล็อก (403), ทดสอบด้วย Chromium emulation
**ถึง:** Claude Code บน PC ของ P'Aim (ต่อ Supabase ได้ + เทสมือถือจริงผ่าน LAN ได้ + รู้ dock-core ลึก)
**ขอ:** ช่วย **เคาะว่าแก้แบบไหนดีที่สุด** ให้เข้ากับดีไซน์ dock-core แล้วค่อยลงมือ (จุดนี้ = gate ที่ค้างรับ B043 พอดี)

---

## ปัญหา (สรุป)
ตอนกดเล่นในหน้า **ฝึกร้อง** พยางค์ที่กำลังร้อง **ไปหลบอยู่หลังแถบเล่น (transport dock)** ที่ปักลอยขอบล่างจอ — จอไม่เลื่อนขึ้นมาให้เห็น เพราะโค้ด auto-scroll ไม่รู้ว่ามี dock บังอยู่

## หลักฐาน (เทสจริง · Chromium จอ 360×640)
- dock (fixed, bottom) เริ่มที่ y≈459 → โซนเนื้อที่มองเห็นจริง = 0–459 (ล่างสุด ~180px โดน dock ทับ)
- เล่นเพลง fixture 3 บรรทัด: พอ playhead ลงบรรทัดล่าง note ที่ร้องอยู่ที่ y≈540 (**หลัง dock**) และ `window.scrollY` **ค้างที่ 0 ตลอด** — ไม่เลื่อนเลย
- 0:19/0:22 → บรรทัดสุดท้าย "ครองความ ชอบ / ธรรม" หายทั้งบรรทัด
- ✅ การไล่ไฮไลต์ (`.nt-playing` + กล่องคาราโอเกะบนพยางค์) **ทำงานถูกต้อง** — เสียแค่ "การเลื่อนจอ"
- ภาพ: `docs/reports/assets/wt-mobile/phone-playing-late.png`, `phone-sing-viewport.png` · รายงานเต็ม: `docs/reports/wt-mobile.md`

## Root cause (โค้ดจริง)
`src/components/SongViewer.vue` → `scrollToPlaying()` (บรรทัด ~210–226):
```js
el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: smooth ? 'smooth' : 'auto' })
```
`block:'nearest'` นับ **viewport เต็ม** ว่า "เห็นแล้ว" → ถ้าพยางค์อยู่ในช่วง 0–640 มันถือว่าเห็น ไม่เลื่อน
แต่ dock (fixed, bottom, z-index 90) บังช่วง 459–640 อยู่ → พยางค์ในโซนนั้นเลยหายทั้งที่ "อยู่ในจอ"

## ข้อเท็จจริงเชิงสถาปัตย์ที่ต้องคำนึง (สำคัญต่อการเลือกวิธี)
1. dock = `position: fixed; bottom: 0; z-index: 90` (default bottom-center) — `.sd-dock-wrap`/`.sd-dock` ใน `StudioDock.vue` (~บรรทัด 635–641)
2. **dock ลากย้ายได้ทุกที่** (dragged → fixed ที่พิกัดใดก็ได้) และ **ยุบเป็น FAB ได้** → การ "จองพื้นที่ล่าง" ต้องเผื่อ 3 สถานะ: docked-bottom / dragged / collapsed(FAB)
3. scroll เกิดที่ระดับ **window/document** (ไม่ใช่ overflow container — `sheetWrap`/`.sheet-scale` เป็น div เฉยๆ)
4. **ยังไม่มี** CSS var บอกความสูง dock (`--dock-h`) และ **ยังไม่มี** `scroll-padding`/`scroll-margin` ที่ไหนเลย
5. header (ShellBar) ก็ปัก sticky บน → ถ้าเลื่อนขึ้นต้องกันพยางค์หลบใต้ header ด้วย (scroll-padding-top)

## ตัวเลือกวิธีแก้ (ขอ PC session เคาะ)
**A. `scroll-padding` ที่ scroll root + CSS var ความสูง dock** *(ผมเอนไปทางนี้ ถ้า dock-core ยิงความสูงออกมาได้)*
- วัดความสูง dock → ตั้ง `--dock-h` (+ `--header-h`) → ใส่ `scroll-padding-top/bottom` ที่ `:root`/scrollport
- `scrollIntoView` เคารพ scroll-padding ของ scrollport → 'nearest' จะเลื่อนให้พ้น dock เอง (แก้น้อย เนียน)
- ⚠️ ต้อง handle ตอน dock ถูกลากไปที่อื่น/ยุบ (จองล่างไม่ตรงแล้ว) — **dock-core มีสัญญาณ anchor/height ให้ subscribe ไหม?**

**B. เปลี่ยนเป็น `block:'center'`** (แก้บรรทัดเดียว)
- พยางค์อยู่กลางจอ มักพ้น dock ล่าง · ข้อเสีย: จอขยับบ่อยขึ้น (เลื่อนแม้ไม่จำเป็น) + dock ที่ลากมากลางจอยังบังได้

**C. คำนวณ offset เองจาก `dock.getBoundingClientRect()`** — เลื่อนเฉพาะเมื่อพยางค์ตกในโซนที่ dock ทับจริง
- แข็งแรงสุดกับ dock ที่ลาก/ยุบได้ · ข้อเสีย: โค้ดเยอะกว่า + ผูกกับ dock geometry

**+ แก้พ่วง (issue #2):** ใส่ `padding-bottom` ให้พื้นที่เนื้อ = ความสูง dock เพื่อให้บรรทัดสุดท้ายเลื่อนพ้น dock ได้แม้ตอน "หยุดเล่น" (ตอนนี้บรรทัดล่างโดนบังถาวร)

## ❓ คำถามถึง PC session
1. dock-core เปิด API/สัญญาณ **ความสูง + จุด anchor (bottom/dragged/collapsed)** ให้ subscribe ไหม? ถ้ามี → ทางเลือก A สะอาดสุด และควรทำเป็น util กลางใน dock-core (เพราะทุกหน้าจะได้ประโยชน์)
2. ควรให้ auto-scroll พยางค์อยู่ "ค่อนบน" (แบบคาราโอเกะ) หรือ "กลาง" ตามรสนิยม P'Aim?
3. อยากให้ผม (mobile session) ลงมือแก้ในรอบ 2 เอง หรือ PC session ทำ (แตะ SongViewer.vue + อาจ dock-core) — กันชนไฟล์กับสายอื่นที่แตะ SongViewer อยู่

## สิ่งที่ผมยืนยันไม่ได้ (ต้อง PC session / เครื่องจริง)
- "ความรู้สึก" auto-scroll ว่าไล่ตรงพยางค์พอดีบน tablet จริง (หลังแก้)
- ทดสอบ dock ตอนถูกลาก/ยุบ ว่า scroll ยัง handle ถูก
- เพลงจริงยาว (หลายท่อน) จาก Supabase — จะเน้นปัญหานี้มากกว่า fixture

**หมายเหตุ:** ผมทำ triage รอบ 1 เท่านั้น ยังไม่แตะโค้ดแอปเลย (docs only) — พร้อมลุยรอบ 2 ตามที่ P'Aim/PC session เคาะ
