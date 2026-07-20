# BUILD brief — แท็บเล็ต: rail เป็นลิ้นชัก + "โครงเพลง" ยุบได้ (full-stack 1 session)

**โมเดล:** 1 session = full-stack (owner end-to-end) · **tester = อีก session** (แยก) · สั่งโดย PM pl pm29
**Timing:** จ่ายหลัง fermata ขึ้น live (รอบ 31 = `68b25ca`) แล้ว

## 0 · ปัญหาจริง (P'Aim)
"โครงเพลง" = rail กว้างตายตัว **288px ติดซ้าย** · โค้ดแบ่งแค่ 2 โหมด: **≤760px = มือถือ (rail = ลิ้นชักสไลด์)** · **≥761px = desktop (rail 288px ค้างข้าง)** → **แท็บเล็ต (768-1024) ตกโหมด desktop → 288px กินที่ เหลือที่เขียนโน้ตนิดเดียว**

## 1 · ฐาน
- **branch จากรอบ 31 `68b25ca`** (= main หลัง fermata live · มี fermata อยู่ด้วย) — ไม่ใช่รอบ 30
- worktree แยก · dev server `--host` port ใหม่ (เช่น 5360) · ใส่ Network URL ในรายงาน

## 2 · สิ่งที่ต้องทำ (2 อย่าง · งานเดียว)

### A. แท็บเล็ต → ใช้ "ลิ้นชัก" ที่มีอยู่แล้ว
- **ขยับ breakpoint ที่ rail กลายเป็น drawer จาก `≤760px` → `≤~900px`** (จูนเลขเป๊ะบนแท็บเล็ตจริง — 768/834 portrait ต้องเป็น drawer · ~1024 landscape ถ้ากว้างพอคง side rail ได้ก็ได้ · ลองจริงแล้วเคาะ)
- **ปุ่มเปิด rail (drawer trigger) ต้องโผล่บนแท็บเล็ตด้วย** (ตอนนี้ปุ่มเปิด/หัว `.rail-mhead` โผล่เฉพาะ ≤760 · ต้องขยายให้ครอบช่วงแท็บเล็ต)
- **verify จริง:** โค้ด rail มี `.rail` (288px sticky) · `@media(max-width:760px)` ทำ drawer (fixed · `translateX(-102%)` · `.open` สไลด์เข้า) · `railHidden`/`drawerOpen`/`closeDrawer` · `.rail-mhead` — ขยาย media query + trigger ให้ครอบแท็บเล็ต
- **ผล:** แท็บเล็ต → "โครงเพลง" ซ่อนเป็นลิ้นชัก · แตะเปิด→จัดลำดับ→ปิด · ที่เขียนโน้ตเต็มจอ

### B. "โครงเพลง" ยุบ/ขยายได้ (เหมือน "ทำนอง (โน้ต)")
- เพิ่มปุ่ม ▾ ยุบ/ขยายให้ section "โครงเพลง" — **mirror กลไก `melodyOpen`** ที่ "ทำนอง (โน้ต)" ใช้อยู่ (`EditorMode.vue:227`)
- 🔴 **ค่าเริ่มต้นต่างจากทำนอง:** ทำนอง = ปิดไว้ก่อน (นาน ๆ ใช้) · **โครงเพลง = เปิดไว้ก่อน (`default open`)** เพราะเป็นตัวหลักใช้บ่อย — แค่มีปุ่มยุบให้ถ้าอยากเก็บ
- ทำงานได้ทุกขนาดจอ (desktop เก็บ vertical space · ในลิ้นชักแท็บเล็ตก็ยุบได้)

## 3 · ข้อกำหนด/กันพลาด
- ⛔ **ไม่แตะ fermata · ไม่แตะ `DockKey.vue`**
- ⛔ **ห้าม gate ด้วย `@media(hover)`/pointer-type** (Surface hover:none) — drawer/ปุ่มต้องโผล่บนทุก pointer
- **มือถือ (≤760) = ต้องไม่เปลี่ยน (diff 0)** · **desktop กว้าง = คง side rail เดิม (diff 0)** · เปลี่ยนเฉพาะช่วงแท็บเล็ต
- ใช้ของเดิมเป๊ะ (reuse drawer + melodyOpen pattern) · ห้าม redesign/ทำเกิน
- WCAG 2.2 AA (ปุ่ม ≥24px · keyboard เปิด/ปิด drawer + collapse ได้ · focus visible)

## 4 · กระบวนการ
1. full-stack: verify layout จริงบน `68b25ca` → ทำบนโค้ดจริง → **เปิด server `--host` โชว์ก่อน/หลังที่ความกว้างแท็บเล็ต (768/834/1024) + phone(360/412) + desktop** → รายงาน PM
2. PM เอาให้ P'Aim ดู (ก่อน/หลัง) → เคาะ → **tester session (แยก)** ตรวจ: แท็บเล็ต drawer ทำงาน · phone diff0 · desktop diff0 · โครงเพลงยุบ/ขยาย+default open · hover:none ปลอดภัย · keyboard
3. PM gate จากหลักฐาน → P'Aim → deploy รอบ 32
4. ⛔ ไม่ merge/deploy/relay P'Aim เอง · รายงาน `docs/reports/<branch>.md` + ping PM

## อ้างอิงโค้ด (round 31)
- rail: `EditorMode.vue` `.rail` (~4080) · drawer `@media(max-width:760px)` (~4153) · `.rail-mhead` · `railHidden`/`drawerOpen`/`closeDrawer`
- collapse pattern: `melodyOpen` ref (`:227`) + "ทำนอง (โน้ต)" section (~2649+)
- โครงเพลง markup: `.rail-group.rg-main` "โครงเพลง" (~2595) + `.srow` arrangement rows
