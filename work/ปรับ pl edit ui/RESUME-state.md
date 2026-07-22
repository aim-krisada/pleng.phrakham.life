# RESUME — เพลง PM state (handoff ข้าม account/session · 22 ก.ค. 2026)

เปิด session ใหม่ในโฟลเดอร์นี้ → อ่าน `MEMORY.md` + **`ux-groundup-design.md` (LOCKED SSOT)** + ไฟล์นี้ → ทำ PM ต่อได้เลย · งานอยู่ในไฟล์ทั้งหมด (ไม่ผูก account)

## 3 สายขนาน (คนละ worktree/branch · state อยู่บน disk)
1. **editor (สาย 1)** — session "ทำ inline edit step B" · branch `claude/peaceful-bhaskara-fe04fd` · dev :5310
   - ✅ พิมพ์ 1-7 · ripple · Backspace=ลบชิด/Delete=rest · แถบลอย (popup คอม/แถบล่างมือถือ) · 211+ เทสต์
   - 🟢 กำลังทำ: keyboard-nav (ลูกศร note↔เนื้อ · Ctrl+ลูกศร ห้อง/บรรทัด/ท่อน)
   - TODO: song-shell ground-up (ตัด tab · Play hero · ✏️ · ↗ · ⋮ · footer) + wire ↗/⋮ (post-merge)
2. **home/nav (สาย 2)** — session "สาย 2…" · branch `claude/eloquent-elion-ad2051` · dev :5320
   - ✅ scope หลักครบ (7+ commit): ธีมอุ่น+สดใส(light) · ★favorites · ＋create+brand · i18n th (zh/en ซ่อนจนแปลเสร็จ) · ⚙ segmented · icon marigold · แชร์/QR+playlist(no account/PII) · เล่ม/★/🎵 selector · Guide อัป
   - ⏸ กันไว้: (ก) ยุบ ☰ คอม · (ข) dark (ทำเฟสเดียวกับสาย 1)
3. **recolor icons** — เสร็จ (merge เข้าสาย 2 แล้ว)

## SSOT ดีไซน์ที่ล็อก = `ux-groundup-design.md` (P'Aim "ok")
2 บริบท (คลัง/เพลง) · object+action ไม่ใช่ mode · หน้าเพลง=พื้นผิวเดียว (Play=ฝึกร้อง · ดินสอ=แก้ · ไม่มี tab) · footer คงไว้ (build stamp) · i18n th/zh/en เพิ่มไม่อั้น (data-driven) · **font=Hybrid Noto** (UI=Noto self-host+subset · เนื้อเพลงจีน=system CJK) · favorites/playlist ไม่มี account · แชร์+QR

## Decisions ล็อก
ripple เปิด default · backspace ลบชิด · block-cards · popup responsive · **คง Vue3+Vite (ไม่ Nuxt/Tailwind)** · คง bookshelf หน้าแรก · ⛔ **ห้าม re-import 120 เพลง (ทีมแก้ live)** · **แปล zh/en ทำสุดท้าย** (หลัง help-text นิ่ง) · **ไม่ release จนเสร็จ** · P'Aim โหลด Noto Thai แล้ว (ต้องการ Noto EN + ZH-subset)

## Pending / ต่อไป
- **merge:** `integration-merge-plan.md` — recolor→home/nav→editor เข้า `studio-shell-redesign` · รันเทสต์+verify ทุก merge · **main เฉพาะ P'Aim สั่ง go** (auto-deploy)
- post-merge: wire ↗/⋮ บน Studio.vue · แปล zh/en (จาก th.js keys) · ติดตั้ง Noto self-host+subset
- deferred: dark (สาย1+2 ร่วม) · ยุบ ☰ คอม
- **meeting-tool fix (pk-pm-12 ทำ):** confirm-urls โชว์ title + new-chat default · ใช้ `ng.py new-g` เปิดห้อง G ใหม่ต่อหัวข้อ (กัน push ปนห้องคนอื่น — บัญชี Google เดียว = ห้องเดียว)

## Live URLs (IP เปลี่ยนตามเน็ต — เช็คใหม่ด้วย ipconfig)
editor `192.168.1.124:5310` · home/nav `:5320`

## วิธี PM ทำต่อ
list_sessions หา 2 สาย → ประสานผ่าน send_message → gate ก่อนถึง P'Aim → **PM เป็นคน merge** (สายไม่ merge เอง) · คุยกับ P'Aim ภาษาคนล้วน
