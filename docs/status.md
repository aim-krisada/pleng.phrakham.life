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

## 🔜 Sprint 2 (ps2) — แผน

### A. dev-ready (spec พร้อม จ่ายได้เลย)
| งาน | branch | port | US |
|---|---|---|---|
| ต่อสาย integration (JSON/พิมพ์/คู่มือ/ชื่อไฟล์) | `wt0-integration` | 5301 | `docs/us/wt0-integration/` US-I1..I5 |
| WT-D รอบ 2 (ส่งตรวจ/อนุมัติ/หมวด+เลข) | `wt-d-round2` | 5305 | `docs/us/wt-d-editor-library/` US-D02/D03/D04 |

### B. SA ออกแบบก่อนจ่าย (ps2 SA ทำก่อน แล้วเขียน US/DS)
- **B005** รวม "จุดแก้เนื้อร้อง 2 ที่" (textarea ลำดับเพลง vs กล่องพยางค์)
- **B006** ไฮไลต์คาราโอเกะระดับคำ/โน้ต (ผูก v1 เอื้อน / v2) — dev แนะ worktree ใหม่
- **B001** ปุ่มเลื่อนขึ้น/ลง (reuse phrakham.life) — เล็ก เขียน US ได้เลย

### C. ค้าง P'Aim เคาะ (ก่อน dev เริ่มจุดที่เกี่ยว)
- **WT-B #4 คีย์ตอนพิมพ์** — SA แนะ "คีย์เดียวใช้ร่วมทุกโหมด (แบบ A)" · รอเคาะ A/B
- **อีเมลทีม** สำหรับคู่มือ C03 (US-I4)

---

## วิธีเปิด ps2 (fresh Claude sessions — แนะนำ)
- **SA:** วาง `อ่าน docs/prompts/sa.md`
- **dev:** วาง `อ่าน docs/prompts/dev.md · ผมต้องการ ทำ <งาน> เริ่มจาก <US>`
- ทุก session อ่าน git = SSOT: `docs/README.md` → `mission.md` → `workflow.md` → `status.md` (ไฟล์นี้)

## เก็บกวาด (ค้างจาก ps1)
- โฟลเดอร์บนดิสก์ที่ dev server ps1 ยังจับล็อกอยู่ (git ไม่ track แล้ว): `pleng-wt-b-print` · `pleng-wt-c-json` · `pleng-wt-d-editor-library`
  → **ปิด session dev ps1 (b/c/d) แล้วลบโฟลเดอร์** (ของ a/wt0-followups เก็บให้แล้ว)
- tester (พี่เปา) ยังไม่ได้ลองหลาย epic — ลองที่ 5173 (ตัวรวม) ได้เลย
