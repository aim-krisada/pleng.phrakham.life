# Sprint ledger / สถานะ — เพลง.พระคำ.ชีวิต

**ฐาน:** `studio-shell-redesign` (ยังไม่แตะ `main`) · **SA อัปเดตทุกครั้งที่เปลี่ยน**
**เล่นตัวรวมล่าสุด:** `npm run dev` ที่ dir หลัก → http://localhost:5173

---

## ✅ Sprint 1 (ps1) — เสร็จ + merge ครบ
1 SA + 4 dev (WT-A–D) + WT-0 (foundation + followups) · **unit 61/61 · build ✅**

| epic | ส่งมอบ |
|---|---|
| WT-0 + followups | Studio = shell · 3 โหมด **ฝึกร้อง/แผ่นเพลง/แก้ไข** · สิทธิ์ 3 tier · เปิดเพลงทุกโหมด · ปุ่มพิมพ์ |
| WT-A ร้อง | คาราโอเกะ เล่น/หยุด-ต่อ · คีย์/tempo สด/วนซ้ำ · ฟอนต์/เลือกท่อน |
| WT-B พิมพ์ | แผ่น A4 · footer · ไม่ตัดกลางท่อน |
| WT-C JSON | ดาวน์โหลด/อัปโหลด/ตรวจไฟล์ · lib กลาง (`jsonIO`, `songName`) |
| WT-D รอบ 1 | บันทึกร่าง (store action) · editor แผ่นเดียว |

รายงาน dev ทุกตัว: `docs/reports/` · spec: `docs/us/` + `docs/ds/`

---

## 🔜 Sprint 2 (ps2) — "ออกแบบ + เก็บ bug"
**เป้า:** ได้ design ที่พี่เอมเคาะ (เมนู/editor/viewer) + เก็บ bug & หนี้ integration อิสระ · จบสปรินต์เมื่อ design เคาะ + fix ขึ้น

**A) SA ออกแบบ (หัวใจ · ทำ wireframe/spec เสนอ → พี่เอมเคาะ → แตกเป็น US ให้ ps3):**
- **② เมนู/IA (desktop+mobile):** B007 ตัดทำเพลง · B003 ตัดเลือกเพลงซ้ำ · B008 เปิดเพลงกดเดียว · B009 จัดเมนู/hamburger/icon-only · B017 login icon (mobile) · B021 show/hide dock
- **③ editor UX:** B005 แก้เนื้อหลายที่ (3 จุด) · B010 legend สัญลักษณ์ · B011 checkbox จบเพลง (ห้องท้าย) · B012 controls หัวบรรทัด
- **④ viewer:** B016 เลื่อน+หยุดได้ · B006 ไฮไลต์รายโน้ต (ผูก v1/v2)

**B) dev เก็บขนานระหว่าง SA ออกแบบ (low-risk · ไม่ต้อง design · ไม่แตะเมนู):**
| งาน | branch | port | สถานะ |
|---|---|---|---|
| integration อิสระ: I2 ชื่อไฟล์ SSOT · I3 print (title กลางบน + footer @page 3 ช่องเท่ากัน) · I4 คู่มือ C03 | `wt0-int-a` | 5301 | ✅ **merged เข้า base** (unit 70/70 · **P'Aim ยืนยัน PDF จริง**) · อีเมลทีม `pleng@phrakham.life` ใส่คู่มือ + forwarding ตั้งเสร็จ · report: `docs/reports/wt0-integration.md` |
| bug+feature: **B018 ตกขอบ · B020 dock mobile · B001 ปุ่มเลื่อน** | `wt-fix` | 5306 | ✅ **merged เข้า base** (unit 63/63 · build ✅ · SA รีวิว diff+conflict แล้ว) · ⏳ ฝาก tester ลอง B020+B001 บนมือถือจริงก่อนปิดสนิท |

> B001 รวมเข้า `wt-fix` แล้ว (ไม่แยก `wt-b001`) · ใช้ `pk-scrollnav.js` ร่วมกับ พระคำ.ชีวิต เป๊ะ · report: `docs/reports/wt-fix-summary.md`

## 🔮 Sprint 3 (ps3) — "สร้างตาม design ที่เคาะ"
- shell/เมนูใหม่ + fold integration **I1** (navbar) + **I5** (editor JSON + B003) เข้าโครงใหม่
- editor UX (③) · viewer (B016/B006/B021)
- **WT-D รอบ 2:** D02 ส่งตรวจ · D03 อนุมัติ · D04 หมวด+เลข
- ⚠️ **คอขวด `EditorMode.vue`** — ③ + I5 + WT-D รอบ2 แตะไฟล์เดียว → **"สาย editor เดียว" ทำเรียงกัน ไม่ขนาน**

### ค้าง P'Aim เคาะ (ต้นทาง ps2)
- **WT-B #4 คีย์ตอนพิมพ์** — SA แนะ "คีย์เดียวใช้ร่วมทุกโหมด (แบบ A)" · รอเคาะ A/B
- ~~**อีเมลทีม** สำหรับคู่มือ C03~~ ✅ เคาะ `pleng@phrakham.life` (Namecheap alias info@ → forward Gmail · ตั้งเสร็จ 8 ก.ค. 69)

---

## วิธีเปิด ps2 (fresh Claude sessions — แนะนำ)
- **SA:** วาง `อ่าน docs/prompts/sa.md`
- **dev:** วาง `อ่าน docs/prompts/dev.md · ผมต้องการ ทำ <งาน> เริ่มจาก <US>`
- ทุก session อ่าน git = SSOT: `docs/README.md` → `mission.md` → `workflow.md` → `status.md` (ไฟล์นี้)

## เก็บกวาด (ค้างจาก ps1)
- โฟลเดอร์บนดิสก์ที่ dev server ps1 ยังจับล็อกอยู่ (git ไม่ track แล้ว): `pleng-wt-b-print` · `pleng-wt-c-json` · `pleng-wt-d-editor-library`
  → **ปิด session dev ps1 (b/c/d) แล้วลบโฟลเดอร์** (ของ a/wt0-followups เก็บให้แล้ว)
- tester (พี่เปา) ยังไม่ได้ลองหลาย epic — ลองที่ 5173 (ตัวรวม) ได้เลย
