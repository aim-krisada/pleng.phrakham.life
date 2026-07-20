# ใบสั่ง (dev) — หัวไทม์ไลน์ชิดขอบ dock หน้าฝึกร้อง

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` (HEAD `b369a49` = deploy รอบ 7 base) · **branch ใหม่:** `fix-sing-timeline-edge`
**ที่มา:** P'Aim GATE-4 (รายงานซ้ำ — เคยบอกแล้วครั้งหนึ่ง หลุด tester มา) · **บล็อก deploy รอบ 7**

## ปัญหา (P'Aim เห็น)
หน้า **ฝึกร้อง** — แถบไทม์ไลน์ (slider ด้านบนของ DockKey) **หัวสไลด์ (ปุ่มกลม) ชิดขอบซ้าย dock เกินไป** ดูอึดอัด ไม่มีระยะหายใจเท่าขอบอื่น

## สาเหตุ (PM triage — วัดจริงบน `:5400` แล้ว)
ไฟล์ `src/components/SingTransport.vue`
- ราง `.st-trk` = `left:0; right:0` เต็มความกว้าง `.st-seek` (200px เดสก์ท็อป / 150px มือถือ)
- หัวสไลด์ `.st-kn` (วงกลม **16px**) วางที่ `left: pct` โดย `pct = frac*100%` ของ `.st-seek` + `transform: translate(-50%,…)` → **ตอน frac=0 หัวอยู่ที่ขอบซ้ายราง แล้วยื่นออกซ้ายอีก 8px**
- วัดจริง (เดสก์ท็อป 1280): ขอบ dock ซ้าย = 437 · หัวสไลด์ซ้าย = **440 → ห่างขอบแค่ 3px** · รางซ้าย = 448 (ห่าง 11px ok) · dock padding = 10px
- สรุป: **รางโอเค แต่หัวสไลด์ที่ต้นเพลงยื่นเลยจุดเริ่มราง → ไปเกือบชนขอบ**

## สิ่งที่ต้องได้ (AC)
1. หัวสไลด์ตอน frac=0 **ห่างขอบ dock ซ้าย ≥ 10px** (ให้พอๆ กับ padding อื่น) — วัดจริงทั้ง 3 จอ 375/768/1280
2. หัวสไลด์ตอน frac=1 (จบเพลง) ก็ต้องไม่ยื่นชนอะไร (inset สองข้างเท่ากันคือสวยสุด)
3. **ห้ามทำให้เซลล์ไทม์ไลน์กว้างขึ้น** — dock มือถือ (≤375) ถูก cap ความกว้างจอ ตอนนี้พอดี 8→367px ถ้าเพิ่มความกว้างจะล้นจอ → ให้ **inset หัว+รางเข้าใน 200/150px เดิม** ไม่ใช่ push ทั้งกลุ่ม
4. **การลาก/แตะยังตรงจุด** — นิ้วอยู่ตรงไหน หัวไปตรงนั้น (pointer→frac ต้อง map กับรางที่มองเห็นแบบ 1:1) → ถ้า inset ราง ต้องปรับ `fracAt` (lines 76-78) ให้คิดจากช่วง inset ด้วย ไม่งั้นลากแล้วหัวเลื่อนไม่ตรงนิ้ว
5. เส้นแบ่งท่อน (`.st-div`) + แถบท่อน (`.st-seg`) ต้องยังตรงตำแหน่งเดิมสัมพันธ์กับราง

**แนวทางแนะนำ (ไม่บังคับ):** กำหนด inset คงที่ ~8px แล้ว (ก) ราง `left:8px; right:8px` (ข) หัว map ในช่วง `calc(8px + frac*(100% - 16px))` (ค) `fracAt` = `(clientX - r.left - 8) / (r.width - 16)` clamp 0..1 · แถบท่อน/เส้นแบ่งใช้ scale เดียวกัน

## ตรวจเอง Tier-B ก่อนส่ง tester (บังคับ · Claude Browser MCP)
- เปิด server `--host` วัดพิกัดจริง 3 จอ (375/768/1280): (1) หัว frac=0 ห่างขอบ ≥10px (2) frac=1 ไม่ยื่น (3) dock ไม่ล้นจอ 375 (4) ลากแล้วหัวตรงนิ้ว (5) console 0 error
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` = ต้องเขียว (317) + `npm run build` เขียว

## เปิด server + รายงาน
- `npx vite . --host --port 5401 --strictPort` → **Network URL `http://192.168.1.124:5401/` ใส่ในรายงาน** (P'Aim/พี่เปาลองมือถือ)
- เสร็จแล้ว session-agnostic: (1) เขียน `docs/reports/sing-timeline-edge.md` (2) เพิ่มบรรทัดใน `docs/pm/board.md` §📥 inbox (3) ping **PM ปัจจุบัน = pm7** (ดู board §🎯) · **อย่า hardcode ชื่อ session ในรายงาน**
- แตะเฉพาะ `SingTransport.vue` (+ test ถ้าจำเป็น) · **ห้ามแตะ** DockKey.vue engine / EditorMode / NoteRow / อื่นๆ

## รั้ว
1 task = 1 worktree = 1 branch = 1 port · เช็ก `git branch --show-current` ก่อน commit · ⛔ ห้าม merge/deploy เอง (PM คุม)
