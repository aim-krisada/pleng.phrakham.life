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

**A) SA ออกแบบ (หัวใจ · prototype กดได้ `docs/design/ps2-studio-prototype.html` · decisions `docs/design/ps2-edit-design.md`):**
- **② เมนู/IA:** ✅ **เคาะ + commit** (`4c7a519`) — B007/B003/B008/B009/B017 เข้าหมด · (B021 dock = ps3)
- **③ editor UX:** ✅ **เคาะ + commit** (`4c7a519`) — B005/B010/B011/B012 เข้าหมด · rail องค์ประกอบ · 4 ชั้น · auto-save · โครงเพลงระดับบรรทัด
- **④ viewer:** 🔵 **กำลังขัด** — B016 เลื่อน+หยุด · B006 ไฮไลต์รายโน้ต (ผูก v2)

**B) dev เก็บขนานระหว่าง SA ออกแบบ (low-risk · ไม่ต้อง design · ไม่แตะเมนู):**
| งาน | branch | port | สถานะ |
|---|---|---|---|
| integration อิสระ: I2 ชื่อไฟล์ SSOT · I3 print (title กลางบน + footer @page 3 ช่องเท่ากัน) · I4 คู่มือ C03 | `wt0-int-a` | 5301 | ✅ **merged เข้า base** (unit 70/70 · **P'Aim ยืนยัน PDF จริง**) · อีเมลทีม `pleng@phrakham.life` ใส่คู่มือ + forwarding ตั้งเสร็จ · report: `docs/reports/wt0-integration.md` |
| bug+feature: **B018 ตกขอบ · B020 dock mobile · B001 ปุ่มเลื่อน** | `wt-fix` | 5306 | ✅ **ปิดสนิท** (merged · unit 63/63 · **tester ยืนยัน B020+B001 มือถือจริงแล้ว 8 ก.ค.**) · เก็บกวาด: ปิด session + `git worktree remove ../pleng-wt-fix` |

> B001 รวมเข้า `wt-fix` แล้ว (ไม่แยก `wt-b001`) · ใช้ `pk-scrollnav.js` ร่วมกับ พระคำ.ชีวิต เป๊ะ · report: `docs/reports/wt-fix-summary.md`

## 🔮 Sprint 3 (ps3) — "สร้างตาม design ที่เคาะ"
**Spec พร้อมแล้ว:** US `docs/us/ps3-{shell,editor,viewer,highlight}.md` + DS `docs/ds/ps3-*` · design = `docs/design/ps2-studio-prototype.html` · **4 epic:** ① Shell(②·ทำก่อน) → ② Editor(③+I5+WT-D รอบ2·คอขวด) · ③ Viewer(④) · ④ Highlight(B006·v2)
- shell/เมนูใหม่ + fold integration **I1** (navbar) + **I5** (editor JSON + B003) เข้าโครงใหม่
- editor UX (③) · viewer (B016/B006/B021)
- **WT-D รอบ 2:** D02 ส่งตรวจ · D03 อนุมัติ · D04 หมวด+เลข
- ⚠️ **คอขวด `EditorMode.vue`** — ③ + I5 + WT-D รอบ2 แตะไฟล์เดียว → **"สาย editor เดียว" ทำเรียงกัน ไม่ขนาน**

### ค้าง P'Aim เคาะ (ต้นทาง ps2)
- ~~**WT-B #4 คีย์ตอนพิมพ์**~~ ✅ **เคาะ A** (คีย์เดียวใช้ร่วมทุกโหมด — ทรานสโพสที่ไหน พิมพ์ก็ตาม, WYSIWYG) 8 ก.ค. 69
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
