# Menu/Drawer — สเปกร่วม pleng ↔ phrakham (design-system SSOT)

**สถานะ:** ร่างโดย pleng PM (pm22) · **✅ RATIFIED โดย pk pm4 (13 ก.ค.)** · **รอ P'Aim อนุมัติ** ก่อน dev ทั้ง 2 ฝั่งลงมือ
**ที่มา:** P'Aim สั่ง 2 PM เคาะดีไซน์เมนูร่วม → ปรับ **เพลง + พระคำ ให้เหมือนกันทีเดียว** · อ้างหลัก Material Design / Apple HIG
**บ้าน SSOT:** ไฟล์นี้ (pleng `docs/ds/` = design-system home ที่ DockKey อยู่) · **พระคำ link ถึงไฟล์นี้** · แก้ต้องผ่าน 2 PM

---

> **⚠️ แก้ SSOT (14 ก.ค. · 2 PM เห็นตรงกัน):** ประโยคเดิม "baseline = phrakham drawer" **ผิด** — verify live แล้ว **พระคำวันนี้ = Bootstrap collapse (กางลงเต็มกว้าง) ไม่มี drawer** จึงเป็น baseline ไม่ได้ · รายละเอียด verify → `docs/ds/menu-drawer-parity-fix.md`
>
> **🌍 ทิศใหม่ (หลัก World-class by default · `sop.md §0`) — ข้อเสนอร่วม pleng PM + pk pm5 · รอ P'Aim เคาะทิศสุดท้าย:**
> เป้าหมายร่วม = **off-canvas navigation drawer เลื่อนจากซ้าย + scrim (ฉากมืด) ทั้ง 2 เว็บ** (มาตรฐาน Material · Gmail/YouTube) = **align UP ทั้งคู่** ไม่ใช่เพลงถอยไปก๊อป dropdown · พระคำทำผ่าน Bootstrap `offcanvas-start` (native scrim+a11y) · เพลงพลิก `.sb-drawer` จากขวา→ซ้าย + ย้าย ☰ ซ้ายบน
> **สัญญาร่วม = เปลือก/พฤติกรรม drawer** (left off-canvas + scrim + nav ข้อความล้วน + วิธี render preview-picker vs switch) · **ไม่กำหนดว่าเครื่องมือไหนอยู่ในเมนู** (per-site + per-context — พระคำมี reading dock ต่างหน้า) · non-blocking (queue หลัง reader feature พระคำ)
>
> **🏛️ สถาปัตย์ (P'Aim 14 ก.ค. · บังคับ): drawer = CORE LIBRARY ตัวเดียว authored ที่พระคำ · เพลง "เรียกใช้" — ยึดแพตเทิร์น `pk-scrollnav.js`/DockKey · แก้ที่เดียว ห้าม 2 ก๊อป.**
> ⚠️ **ข้อเทคนิคที่ต้องออกแบบให้ได้ (consultant flag):** ให้ "แก้ที่เดียว" เป็นจริง → พระคำต้อง author drawer เป็น **standalone vanilla JS+CSS core (เช่น `assets/pk-drawer.js`)** ที่ทั้ง 2 เว็บ import โค้ด**ตัวเดียวกัน** (แบบ `pk-scrollnav.js` ที่เพลง copy verbatim) — **ไม่ใช่** ใช้ Bootstrap `offcanvas` native ล้วน (นั่น = ฟีเจอร์ของ Quarto/Bootstrap ที่เพลง Vue import มาแชร์ไม่ได้ → จะกลายเป็น 2 ก๊อปโดยปริยาย ผิดเจตนา P'Aim) · **pk pm5 ออกแบบ core นี้ที่พระคำ → เพลงบริโภค** · ต้องกำหนด API/mount ให้ใช้ได้ทั้ง Quarto(static) + Vue
> **✅ API contract เสร็จ (pk pm5 · SSOT = phrakham `pm/spec-pk-drawer.md` `967375b`):** `window.PKDrawer.create({side,trigger,panel,label,width,scrim,onOpen,onClose}) → {open,close,toggle,isOpen,destroy}` · core = เปลือก+a11y (focus-trap/inert/scroll-lock/reduced-motion/token-skin) · site ส่ง `panel` DOM (เพลง Vue render ใส่ ref · destroy ตอน unmount) · **เพลงขอเพิ่ม 1: focus-trap re-query focusable ตอน open() ทุกครั้ง (ไม่ cache ตอน create) เพราะ Vue content dynamic** · **build เมื่อ P'Aim เคาะทิศ:** พระคำ author `assets/pk-drawer.js` → เพลง consume verbatim

## กฎร่วม (target = left off-canvas drawer + scrim · world-class · align-UP ทั้ง 2 เว็บ — pending P'Aim เคาะทิศ)

### 1. Alignment = ชิดซ้าย
เมนู/ลิงก์/หมวด **ชิดซ้ายทั้งหมด** — ไทย/LTR อ่านซ้าย→ขวา สแกนตาเร็วสุด · **ห้ามชิดขวา** (ผิดขนบ อ่านช้า)

### 2. Nav links = ข้อความล้วน (ไม่มีไอคอนหน้า)
ลิงก์นำทาง (เพลง/คู่มือ/เกี่ยวกับ ฯลฯ) = **ข้อความอย่างเดียว** — ลิงก์ข้อความสั้นไม่ต้องมีไอคอน · สะอาด/มินิมอล/มืออาชีพ

### 3. หมวด "เครื่องมือ" — layout ตามชนิดของ control (กฎเดียว 2 เว็บ)
- **Picker ที่ต้องเห็นตัวอย่าง = ปุ่มพรีวิว** (แสดง sample) — เช่น **font มีหัว/ไม่มีหัว = 2 ปุ่ม "ก ข ค"** (ต้องเห็น letterform ต่างกัน · แถว icon+ชื่อโชว์ไม่ได้) · = pattern มาตรฐาน Material/HIG (font/theme picker แบบมี sample)
- **สวิตช์เปิด-ปิด / action = แถวเรียบ** (icon + ชื่อ สม่ำเสมอ) — เช่น Aa ขนาดตัวอักษร · ⚙ ตั้งค่าแสดงผล · 📥 ดาวน์โหลด · เปิด-ปิดภาพ/สัญลักษณ์

### 4. Breakpoint = < 992px → drawer มือถือ
ต่ำกว่า 992px แสดง ☰ + drawer (พระคำใช้ 991.98px · เพลง align ให้ตรง) · ≥ 992px = nav inline desktop

### โครง drawer (มือถือ)
[icon แอปซ้ายบน · ไม่มีชื่อ] ... [🔍 · ☰ ขวาบน] → กด ☰ เปิด drawer:
ลิงก์นำทาง (text-only ชิดซ้าย) → เส้นคั่น → หัวข้อ **"เครื่องมือ"** → controls (ตามกฎข้อ 3) · login = ปุ่มแยกบนแถบ (ไม่อยู่ใน drawer) **(เพลงเท่านั้น — พระคำ static ฟรี ไม่มีบัญชี/login · dev อย่าเติมปุ่ม login ให้พระคำ)**

**หมายเหตุ (pk pm4 ratify):** **ลำดับ** ของ controls ในหมวด "เครื่องมือ" = **per-site ไม่ใช่ contract ร่วม** (2 เว็บ tool set ต่างกัน) — แต่ละเว็บจัดลำดับเอง (เช่นตำแหน่ง font picker ของพระคำ P'Aim เคาะแยก) · สเปกร่วมคุมแค่ **alignment · text-only nav · ชนิด control→layout (ข้อ 3) · breakpoint**

---

## สถานะปัจจุบัน + สิ่งที่ต้องปรับ (แต่ละเว็บ)

| จุด | เพลง (pleng) | พระคำ (phrakham) |
|---|---|---|
| alignment | 🔴 ชิดขวา → **ต้องแก้เป็นซ้าย** | ✅ ซ้ายแล้ว |
| nav icons | 🔴 มีไอคอน → **ต้องเอาออก** | ✅ ข้อความล้วนแล้ว |
| font picker | ✅ 2 ปุ่ม "ก ข ค" (ตรงแล้ว) | ✅ 2 ปุ่ม (เพิ่งพอร์ตจากเพลงวันนี้) |
| tools แถวเรียบ | (Aa/⬇ เป็น contextual teleport หน้าเพลง) | ✅ Aa/⚙/📥 แถวเรียบใน drawer |

**สรุปงาน dev:** เพลง = แก้ 2 จุด (alignment ซ้าย · เอาไอคอน nav ออก) · พระคำ = ตรง baseline แล้ว (คง font toggle วันนี้ · รอ P'Aim go แยก)

---

## Governance
- ไฟล์นี้ = SSOT · พระคำ link ถึง · **แก้กฎต้องผ่าน pleng PM + pk pm4** (P'Aim อนุมัติทิศใหญ่)
- ratify: pk pm4 review ไฟล์นี้ → OK → รายงาน P'Aim ร่วมกัน → อนุมัติ → จ่าย dev 2 ฝั่งพร้อมกัน
