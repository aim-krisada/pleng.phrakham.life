# Brief — DockKey ปรับแต่งได้ (เลือกปุ่ม · resize · ตั้งใน settings · ชื่ออ้างอิง) · วิเคราะห์ก่อน build

**P'Pao ขอ "ก่อนเลย" = priority งานหน้าแก้ไขระยะใกล้** · **⛔ วิเคราะห์ล้วน (UX+SA) · ไม่ code จน P'Aim เคาะ GATE 1**
**UX นำ flow · SA ตรวจ feasibility + เจ้าของเรื่อง "core lib แชร์พระคำ↔เพลง"**

## โจทย์ (P'Pao + P'Aim 17 ก.ค.)
พี่เปา: *"แก้ DockKey หน้าแก้ไขก่อนเลย · ใช้โครงเดิมที่พระคำมี"* — 4 อย่าง:
1. **เลือกอิสระว่าจะแสดงปุ่มไหนบ้าง** (ทั้งหมด · เลือกได้เอง)
2. **resize ขนาด DockKey ได้** — ตอนนี้ **ใหญ่เกินไป**
3. **ปรับขนาด window + เลือกได้เองว่าปุ่มไหนอยู่ตรงไหน**
4. P'Aim เพิ่ม: **ทุกปุ่มตั้งค่าได้ในหน้า settings** (มี design แล้ว)

**⭐ P'Aim เพิ่มข้อ 5 (สำคัญ · แก้ pain ของเขาเอง):** **เลือกแสดงชื่อปุ่มหรือไม่ก็ได้ + ทุก component มี "ชื่ออ้างอิง" ชัดเจน เข้าถึงง่าย**
> เหตุผล: *"เวลาพี่เปาบอกอยากแก้ตรงโน้นตรงนี้ สื่อสารยากมาก ต้องมาดูจอแล้วชี้ สุดท้ายผมต้อง capture screen ให้ Claude · ถ้าทุก component มีชื่ออ้างอิงชัด คุยกันง่าย"*
→ **นี่ไม่ใช่แค่ feature — เป็นโครงสร้างการสื่อสารของทั้งทีม** (พี่เปา↔PM↔dev) · +เป็น a11y (accessible name) + test hook (stable id) ระดับโลกในตัว

## 🔴 ข้อบังคับสถาปัตยกรรม (P'Aim ย้ำ): แก้ที่ **core lib ที่แชร์ พระคำ↔เพลง**
- **PM verify: shared = `src/lib/pk-drawer.js` + `pk-scrollnav.js`** · DockKey.vue (629 บรรทัด) ดูเหมือนไม่ import pk-drawer ตรง → **SA ต้อง map จริงว่าอะไรแชร์ อะไรเฉพาะ pleng**
- ⚠️ **"แชร์" จริง หรือ "ก๊อปไปวางแล้ว drift"?** — memory `pleng-shared-core-shell-deep`: แชร์แค่เปลือก → เนื้อ drift · phrakham live = repo `phrakham.life2` แยก (shared UI ก๊อปเข้า pleng) → **SA ต้องตอบ: แก้ครั้งเดียวได้ 2 เว็บจริงไหม หรือต้อง sync 2 ที่** · **แตะผิด = พังพระคำด้วย**

## แบ่งงาน
### 🎨 UX (นำ · flow/mockup)
- อ่าน design เดิมก่อน (ต่อยอด ไม่รื้อ): `docs/ds/dockkey-library.md` · `dockkey-print-edit.md` · `menu-drawer-spec.md` · prototype ใน `docs/design/dockkey-*.html`
- ออกแบบ: **UI เลือกปุ่ม show/hide + จัดตำแหน่ง · resize dock · หน้า settings · toggle ชื่อปุ่ม** — เทียบ pattern โลก (VS Code customize toolbar · Photoshop workspace · Figma) **desktop + มือถือ (พี่เปาใช้มือถือ · resize/จัดปุ่มบน touch ยังไง)**
- **ฟันธง**ค่า default ที่ "เล็กลงจากปัจจุบัน" (พี่เปาว่าใหญ่ไป) — อ้างมาตรฐาน target ≥44px แต่ dock ไม่กินจอ
- ⭐ **ระบบชื่ออ้างอิง:** เสนอ scheme ที่ทุกปุ่ม dock มี **ชื่อไทยอ่านรู้เรื่อง** (โชว์/ซ่อนได้) + **id คงที่** → พี่เปาพูดชื่อ = ทุกคนรู้ว่าปุ่มไหน · **ทำเป็นตาราง "ปุ่ม→ชื่อ→id" ให้ทีมอ้างอิง**

### 🏛️ SA (feasibility + core lib)
- **map exact:** อะไรอยู่ใน shared core (pk-drawer/pk-scrollnav) · อะไรใน DockKey.vue เฉพาะ pleng · **การ config ปุ่ม/resize ควรอยู่ชั้นไหนถึง "แก้ครั้งเดียว 2 เว็บ"**
- **แชร์จริงหรือก๊อป-drift** — ตอบให้ชัด + ถ้าต้อง sync 2 repo บอกกลไก
- **feasibility:** show/hide+ตำแหน่งปุ่ม (persist ที่ไหน — localStorage/profile) · resize (มี primitive ไหม) · **id คงที่ต่อปุ่ม** (มีอยู่แล้ว/ต้องเพิ่ม) · เก็บ config ต่อ user ยังไง
- **ขนาดงาน + ผลต่อพระคำ** (regression) · กี่เฟส

## กติกา
- **⛔ refine ไม่ใช่ redesign** — พี่เปาย้ำ "ใช้โครงเดิมพระคำ" · ต่อยอด design เดิม
- SOP §1.3: ระดับโลก · เชิงรุก+ฟันธง (ไม่ให้ P'Aim เลือกเมนู) · พาไปถึงตัดสินใจได้ · **docs only · ไม่ merge เอง**
- ⚠️ **build จะแตะ `DockKey.vue` + shared lib + (อาจ) phrakham repo = 1 ไฟล์ 1 สาย ข้าม 2 product** → SA ระบุไฟล์ให้ครบ PM จัดคิว
- **ผู้ใช้จริง = พี่เปา (มือถือ · คอขวด) + P'Aim**

## ส่งมอบ
UX: `docs/us/dockkey-config.md` + mockup + ตารางชื่ออ้างอิงปุ่ม · SA: `docs/reports/dockkey-shared-core-feasibility.md` · **+ `docs/pm/summary-dockkey-paim.md` 1 หน้า ม.ต้น** (หน้าตา · แก้ครั้งเดียว 2 เว็บได้ไหม · กี่เฟส · ระบบชื่ออ้างอิงหน้าตายังไง) · ping PM

## หมายเหตุลำดับ (PM): งาน toolbox (hover/tap contextual) ที่ SA/UX เพิ่งเริ่ม = วิสัยทัศน์ใหญ่กว่า · **DockKey-config นี้คือของที่พี่เปาขอใช้จริงก่อน (reuse โครงเดิม)** → UX/SA เสนอลำดับว่า dock-config มาก่อน แล้ว toolbox ต่อยอด หรือรวมกัน
