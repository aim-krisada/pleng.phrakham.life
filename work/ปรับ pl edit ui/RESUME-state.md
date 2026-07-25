> ⚠️ **entry point ใหม่ = `docs/pm/pm-state.md` + `docs/pm/decisions-log.md`** (สมอง PM · อ่านก่อน) · ไฟล์นี้เก็บรายละเอียด 3 สาย

# RESUME — เพลง PM state (handoff ข้าม account/session · 22 ก.ค. 2026)

เปิด session ใหม่ในโฟลเดอร์นี้ → อ่าน `MEMORY.md` + **`ux-groundup-design.md` (LOCKED SSOT)** + ไฟล์นี้ → ทำ PM ต่อได้เลย · งานอยู่ในไฟล์ทั้งหมด (ไม่ผูก account)

## 3 สายขนาน (คนละ worktree/branch · state อยู่บน disk)
1. **editor (สาย 1)** — branch **`editor-usability`** (worktree `pleng-editor-ux` · dev :5310) · ⚠️ ไม่ใช่ `claude/peaceful-bhaskara-fe04fd` (นั่น handoff-docs เก่า ไม่มี impl)
   - ✅ keyboard-first inline editor ครบ: 2D nav (←→↑↓ · Ctrl ข้ามห้อง/บรรทัด) · คีย์บอร์ดจริง (เลข=โน้ต/ไทย=เนื้อ) · แก้เนื้อ inline · Delete=อยู่กับที่/Backspace=ลบทั้งช่อง · chord picker · ripple ทุกข้อ · **224 เทสต์ผ่าน (>211)**
   - **HANDOFF พร้อม (commit `f64c002`):** ทุกอย่าง commit ลง `editor-usability` + handoff เต็มท้าย `work/ปรับ pl edit ui/task.md` ("▶ STATE 22 ก.ค. (ค่ำ)") · session ใหม่: checkout branch + `npm install` + `npm run dev -- --host --port 5310` + อ่าน task.md ต่อได้เลย
   - **งานจัดคำใต้โน้ต (lyric↔note align) — คืบหน้า 22 ก.ค. ค่ำ:**
     - ปรึกษา Gemini (coding) แล้ว → session challenge ด้วยหลักฐาน · **verdict: ไม่รื้อ SongSheet แบบ musical-moment** (พัง beam/slur B110/B118 ที่ ship แล้ว) · scoping = `docs/analysis/lyric-align-scoping.md` (บน `editor-usability`)
     - **P0 grid align = ทำแล้ว** (commit `a343571`) · PM verify PNG (`song141-AFTER-grid.png`): ใจ/รับ ปักใต้โน้ตถูกตัว · ⚠️ ยังไม่ verify เอง: A4 PDF (poppler ไม่มี) + เทสต์ 224 (อ้างผล session)
     - **P2 melisma slur = P'Aim เคาะทำ** (โน้ตว่าง=held ต้องมีเส้นโค้ง ไม่ให้เดา · มาตรฐาน jianpu · G ยืนยัน) → dispatch session แล้ว · **แนว: derive จาก blank-run ก่อน (ไม่แตะ DB) · ⛔ ห้าม re-import · reuse B062/B118 · พิสูจน์เพลง 141 → STOP gate PM**
     2. **iOS mobile verify** — P'Aim เทสต์เองเมื่อเสร็จกว่านี้ (เลื่อนแล้ว)
   - TODO: song-shell ground-up (ตัด tab · Play hero · ✏️ · ↗ · ⋮ · footer) + wire ↗/⋮ (engine อยู่บน base แล้ว)
   - **ยังไม่ merge** — สาย 1 จะแจ้ง PM เมื่อพร้อม · ตอน merge: rebase base + `npm install` (qrcode-generator) ก่อน
2. **home/nav (สาย 2)** — branch `claude/eloquent-elion-ad2051`
   - ✅ **MERGED เข้า `studio-shell-redesign` แล้ว 22 ก.ค. (PM)** — gate ผ่าน: 759 เทสต์ผ่าน · ไม่มี conflict · อยู่ในเลน (ไม่แตะไฟล์ editor) · verify live: ธีมอุ่น+สดใส (#fdf7ee/#f59e0b/#f26b4e) · footer+build stamp ครบ · language switcher มี · 3-way selector/search/nav
   - เพิ่ม dep `qrcode-generator` (self-host QR) → **ต้อง `npm install` หลัง pull base**
   - ⏸ กันไว้: (ก) ยุบ ☰ คอม · (ข) dark (ทำเฟสเดียวกับสาย 1)
3. **recolor icons** — เสร็จ (folded เข้าสาย 2 · commit ba2a013 · merge พร้อมสาย 2 แล้ว)

## SSOT ดีไซน์ที่ล็อก = `ux-groundup-design.md` (P'Aim "ok")
2 บริบท (คลัง/เพลง) · object+action ไม่ใช่ mode · หน้าเพลง=พื้นผิวเดียว (Play=ฝึกร้อง · ดินสอ=แก้ · ไม่มี tab) · footer คงไว้ (build stamp) · i18n th/zh/en เพิ่มไม่อั้น (data-driven) · **font=Hybrid Noto** (UI=Noto self-host+subset · เนื้อเพลงจีน=system CJK) · favorites/playlist ไม่มี account · แชร์+QR

## Decisions ล็อก
ripple เปิด default · backspace ลบชิด · block-cards · popup responsive · **คง Vue3+Vite (ไม่ Nuxt/Tailwind)** · คง bookshelf หน้าแรก · ⛔ **ห้าม re-import 120 เพลง (ทีมแก้ live)** · **แปล zh/en ทำสุดท้าย** (หลัง help-text นิ่ง) · **ไม่ release จนเสร็จ** · P'Aim โหลด Noto Thai แล้ว (ต้องการ Noto EN + ZH-subset)

## Pending / ต่อไป
- **merge:** `integration-merge-plan.md` — ✅ recolor+home/nav land แล้ว (22 ก.ค.) · เหลือ **editor (สาย 1) merge สุดท้าย** เมื่อ keyboard-nav+song-shell ground-up เสร็จ · **main เฉพาะ P'Aim สั่ง go** (auto-deploy)
- post-merge: wire ↗/⋮ บน Studio.vue · แปล zh/en (จาก th.js keys) · ติดตั้ง Noto self-host+subset
- deferred: dark (สาย1+2 ร่วม) · ยุบ ☰ คอม
- **meeting-tool fix (pk-pm-12 ทำ):** confirm-urls โชว์ title + new-chat default · ใช้ `ng.py new-g` เปิดห้อง G ใหม่ต่อหัวข้อ (กัน push ปนห้องคนอื่น — บัญชี Google เดียว = ห้องเดียว)

## Live URLs (IP เปลี่ยนตามเน็ต — เช็คใหม่ด้วย ipconfig)
editor `192.168.1.124:5310` · home/nav `:5320`

## วิธี PM ทำต่อ
list_sessions หา 2 สาย → ประสานผ่าน send_message → gate ก่อนถึง P'Aim → **PM เป็นคน merge** (สายไม่ merge เอง) · คุยกับ P'Aim ภาษาคนล้วน
