# Backlog — เพลง.พระคำ.ชีวิต

กล่องรับ idea **ทุกชนิดรวมที่เดียว** (feature / bug / ปรับปรุง) — ไม่แยกโฟลเดอร์อีกต่อไป
idea ไหนจะทำจริง → ยกขึ้นเป็น user story ใน `docs/us/` แล้วอัปเดตช่อง "โยงไป"

**วิธีเพิ่ม (อัตโนมัติ):** พี่เอมส่งคำอธิบายมา → Claude ให้ id · เขียนสรุป + ที่มา ในตารางนี้ · **หารูปเองจาก 2 ที่** แล้วเซฟเข้า `docs/backlog-assets/` (พี่เอมไม่ต้อง copy-paste):
- `C:\Users\aimkr\OneDrive\Screenshots` — screenshot ที่พี่เอมแคปเอง (สิ่งที่พี่เอมตรวจ/เห็น)
- `C:\Users\aimkr\Downloads` — รูป/ไฟล์จากพี่เปา (และคนอื่น)

ปกติหยิบไฟล์ใหม่สุดที่ตรงกับที่พี่เอมพูดถึง · ถ้าไม่แน่ใจว่าอันไหน ถามก่อน

**สถานะ:** `idea` (ยังไม่เริ่ม) → `picked` (เลือกทำ) → `in-US` (มี user story แล้ว ใส่ลิงก์) → `done`

| id | ชนิด | สรุป | ที่มา / รายละเอียด | สถานะ | โยงไป |
|---|---|---|---|---|---|
| B001 | feature | ปุ่มลอยมุมล่างขวา เลื่อนขึ้น/ลง | reuse โค้ดจาก phrakham.life · ภาพ: `backlog-assets/B001-scroll-buttons.png` (2026-07-08) | idea | — |
| B002 | ปรับปรุง | เปลี่ยนชื่อโหมด: ดู→**ฝึกร้อง** · แผ่น→**แผ่นเพลง** · แก้→**แก้ไข** | ภาพ: `backlog-assets/B002-mode-labels.png` · **✅ พี่เอมเคาะ 2026-07-08** (เหตุผล: "พิมพ์"/"ทำเพลง" เป็น action/ซ้ำเมนูเว็บ → ใช้ชื่อโหมดที่ชัด) · รวมเข้า wt0-followups US-05 | done | WT-0 US-05 (merged) |
| B003 | ปรับปรุง | ตัดเมนู "เลือกเพลงเพื่อแก้…" ที่ซ้ำในโหมดแก้ | หลัง US-05 มีปุ่ม "เปิดเพลง" ที่ shell ทุกโหมดแล้ว → เมนูของ `EditorMode` ซ้ำ · ตัดออกตอน WT-D แตะ `EditorMode.vue` (โหลดได้ทั้งสองทาง) | in-US | US-I5 (รอ WT-D) |
| B004 | ปรับปรุง | print-polish (นอกไฟล์ WT-B) | 3 งานจาก handoff WT-B: (1) ชื่อไฟล์ PDF (2) ส่ง `:song-title` เข้า `SongSheet` footer (3) "หน้า X ของ Y" + margin ผ่าน `@page` ใน `src/styles.css` · snippet ใน `docs/reports/wt-b-print.md` · เจ้าของ = WT-0 | in-US | US-I2 + US-I3 |
| B006 | feature (ออกแบบ — SA) | ไฮไลต์คาราโอเกะระดับคำ/โน้ต | จาก tester P'Aim (report WT-A): ไฮไลต์ไม่ตรงจังหวะ อยากได้ไล่ทีละคำ/โน้ต · ตอนนี้ไฮไลต์ระดับ segment (ทั้งช่องสว่างพร้อมกัน) · ต้อง: `midi.js` ส่ง index ระดับโน้ต + `SongSheet`/`NoteRow` render รายโน้ต/พยางค์ (ไฟล์ร่วม WT-B) · **model:** v2 = 1 พยางค์/โน้ต · v1 เอื้อน = 1 คำ/หลายโน้ต → per-โน้ต ≠ per-คำ · dev แนะทำ worktree ใหม่ · **อย่าแก้ "จังหวะเพี้ยน" แยก** (งานนี้เขียนตัวจับจังหวะใหม่) | idea | worktree ใหม่ |
| B005 | ปรับปรุง (ออกแบบ — SA) | รวม "จุดแก้เนื้อร้อง" ที่มี 2 ที่ ให้ใช้ง่ายไม่สับสน | **ที่มา:** P'Aim 2026-07-08 (report WT-D) · แก้เนื้อได้ 2 ที่: (1) textarea ใน "ลำดับเพลง" พิมพ์รวดเดียวทั้งข้อ (`B005-lyrics-two-places-arrangement.png`) (2) กล่องรายพยางค์ใต้โน้ต แก้เนื้อ+โน้ตพร้อมกัน (`B005-lyrics-two-places-notegrid.png`) (3) พาเนลกาง/ยุบ "แก้เนื้อแบบย่อหน้า (ข้อที่เลือก)" (`B005-lyrics-paragraph-panel.png`) · **P'Aim:** textarea ใน "ลำดับเพลง" "ไม่ค่อยมีประโยชน์" → พิจารณาตัด/ยุบ · **โจทย์ SA:** ออกแบบให้ "แก้เนื้อทั้งข้อรวดเดียว" กับ "แก้เนื้อ+โน้ตรายพยางค์" อยู่ร่วมกันไม่สับสน · รอ SA เคาะทิศ | idea | WT-D (EditorMode) |
| B007 | ปรับปรุง | ตัดเมนู "ทำเพลง" (site nav) ที่ซ้ำ | มีเมนูโหมด/ด้านขวาแล้ว → "ทำเพลง" ใน site menu ซ้ำ · imgs `B007-remove-songmenu-left.png` · `B013-remove-songmenu2.png` | idea | ps2 (shell) |
| B008 | ปรับปรุง | UX "เปิดเพลง" 2 สเต็ปแปลก | กดเปิดแล้วต้องกดช่องชื่อเพลงอีกที ไม่เหมือน UI ทั่วไป → กดเดียวเห็นรายการให้เลือกเลย · img `B008-opensong-two-step.png` | idea | ps2 (shell) |
| B009 | ปรับปรุง (ออกแบบ — SA) | จัดระเบียบ IA แถบบน/เมนู ให้ intuitive (desktop+mobile) | รวมเมนูให้เข้าใจง่าย · mobile สอดคล้อง desktop · พิจารณา hamburger เหลือที่ใช้บ่อย · icon-only ที่เหมาะ · imgs `B009-menu-reorg` `B014-reorg-mobile` `B015-icon-only` `B019-hamburger` | idea | ps2 (SA design) |
| B010 | feature | inline legend สัญลักษณ์โน้ต (show/hide) ในโหมดแก้ | ปุ่มกาง/ยุบคำอธิบายสัญลักษณ์ jianpu ตรงที่แก้ · img `B010-inline-legend.png` | idea | ps2 (editor) |
| B011 | ปรับปรุง | checkbox "จบเพลง" แสดงเฉพาะบรรทัด/ห้องสุดท้าย | ตอนนี้ทุกบรรทัดมี → ควรโชว์เฉพาะตัวสุดท้าย · img `B011-endsong-checkbox-lastbar.png` | idea | ps2 (editor) |
| B012 | ปรับปรุง (ออกแบบ — SA) | ออกแบบ controls โครงเพลงหัวบรรทัด (ท่อนฮุก/จบเพลง/ป้าย Fine·D.C.) ให้ช่วยได้จริง | ตอนนี้รก/ไม่ชัดว่าใส่ตรงไหนช่วยอะไร · img `B012-help-placement.png` | idea | ps2 (SA design) |
| B016 | ปรับปรุง | เล่นเพลงแล้วเลื่อนขึ้น/ลงเองได้ + ปุ่มหยุดกดได้เสมอ | ตอนนี้จอ auto-scroll ลงเรื่อยๆ กดหยุดไม่ได้ → ปุ่มหยุด sticky/เข้าถึงได้ + ผู้ใช้เลื่อนเองได้ | idea | ps2 (viewer) |
| B017 | ปรับปรุง | mobile: ใช้ icon แทนคำ "เข้าสู่ระบบ" | ประหยัดที่บนแถบ mobile · img `B017-mobile-login-icon.png` | idea | ps2 (shell/mobile) |
| B018 | bug | เนื้อหาตกขอบ (overflow) | img `B018-overflow.png` — ระบุจุดตอนทำ | idea | ps2 (responsive) |
| B020 | bug | mobile: แถบ/dock ล่างไม่ติดขอบล่างจอ | img `B020-mobile-dock-sticky.png` | idea | ps2 (mobile) |
| B021 | feature | เลือก show/hide dock (แถบเครื่องมือล่าง) ได้ | ผู้ใช้กดซ่อน/แสดง dock (คีย์โน้ต + ปุ่ม) เพื่อเพิ่มพื้นที่จอ · เกี่ยวกลุ่ม IA (B009) | idea | ps2 (editor/shell) |
