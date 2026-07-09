# กระดานเก็บบั๊ก "ลองใช้จริง" — P'Aim (รอบหลังคลื่น 2)

PM เก็บบั๊กที่ P'Aim เจอตอนใช้จริง → ตรวจเทียบโค้ด/git → จัดกลุ่มไม่ชนไฟล์ → จ่าย dev 1-3 ขนานทีเดียว

**ฐาน:** `studio-shell-redesign` (คลื่น 1+2 รวมเข้าแล้ว · unit 110/110)
**วันที่เริ่มเก็บ:** 2026-07-09

**ป้าย verdict:** ✅ บั๊กจริง · 🎨 เรื่องดีไซน์รอ P'Aim เคาะ · 🔁 รู้อยู่แล้ว/ในแผน · ⛔ by-design (ไม่ใช่บั๊ก)
**หลักฐานภาพ:** `docs/pm/realuse-assets/` (ก็อปจาก Screenshots ของ P'Aim — B036 favicon · dock ยุบว่าง · B041 print ซ้ำ · B039 เมนูค้าง)

| id | อาการ (จากพี่เอม) | หน้า/โหมด | verdict | ไฟล์ที่ต้องแตะ | กลุ่มงาน | สถานะ |
|---|---|---|---|---|---|---|
| B036 | favicon เป็นลูกโลกทั่วไป ควรใช้ favicon ที่กำหนด (โลโก้ พระคำ.ชีวิต) | ทุกหน้า (แท็บ) | ✅ บั๊กจริง — `index.html` ไม่มี `<link rel="icon">` เลย | `index.html` + `public/favicon.ico` | G1 (asset) | ✅ **done** `13e5714` |
| B037 | dock (แถบคีย์) ใน desktop ควรลากย้ายได้ แต่ลากไม่ได้ | แก้ไข (desktop) | ✅ บั๊กจริง — logic ลากมีครบ แต่ `.sd-dock` เป็น `static` → `left/top` ไม่มีผล | `StudioDock.vue` | G2 (dock) | ✅ **done** `ddcb63f` |
| B038 | auto-scroll ตอนฝึกร้องไม่ตรงพยางค์ (เลื่อนไปหาท่อน) | ฝึกร้อง | ✅ บั๊กจริง — scroll watch `playingSeg` (ท่อน) ไม่ใช่ `playingSyl` (พยางค์); ตัวไฮไลต์ track พยางค์ถูกแล้ว | `SongViewer.vue` (watcher บรรทัด ~120-128) | G3 (highlight) | 🚚 รอจ่าย (batch) |
| B039 | กด "ฝึกร้อง" แล้วเมนู download ค้างเปิด ไม่ปิดเอง | ทุกโหมด (แถบบน) | ✅ บั๊กจริง — `DownloadTool.vue` ปิดเมนูแค่ Esc/เลือกเมนู · ไม่มี outside-click / close-on-route | `DownloadTool.vue` | G4 (shell/viewer) | 🚚 รอจ่าย (batch) |
| B041 | ปุ่ม "พิมพ์" ใน dock ฝึกร้องซ้ำซ้อน (มีเมนู download ที่มีพิมพ์/PDF แล้ว) | ฝึกร้อง (dock) | 🎨 P'Aim เคาะ: **เอาออก** | `SongViewer.vue` (singTools) / dock config | G4 (shell/viewer) | 🚚 รอจ่าย (batch) |

## หมายเหตุ B036 (ปิดแล้ว 2026-07-09)
- สาเหตุ: `index.html` ไม่มีบรรทัด favicon → เบราว์เซอร์ fallback ลูกโลก
- แก้: P'Aim เคาะใช้ `phrakham.life2/assets/favicon.ico` (source สดจริง Quarto) → ก็อปเข้า `public/favicon.ico` + เพิ่ม `<link rel="icon" href="favicon.ico" sizes="any">` (path สัมพัทธ์ให้ทั้ง custom domain + github.io resolve ได้)
- verify: vite เสิร์ฟ `/favicon.ico` = 200 · `image/x-icon` · 15406 bytes (ตรง source เป๊ะ) · link อยู่ใน HTML จริง
- PM แก้ตรง (ไม่ผ่าน dev worktree) เพราะจิ๋ว + ไม่ชนไฟล์ใคร

## หมายเหตุ B037 (ปิดแล้ว 2026-07-09)
- อาการ: desktop ลาก dock ย้ายตำแหน่งไม่ได้ (มือถือไม่มีฟีเจอร์นี้ = ถูกต้อง)
- สาเหตุ: โค้ดลาก (`dragStart/Move/End` + `dockPos`) ตั้ง `left/top` บน `.sd-dock` แต่ `.sd-dock` ไม่มี `position` (static) — ถูกจัดตำแหน่งโดย `.sd-wrap` (fixed) ที่ครอบ → `left/top` ไม่มีผล จอเลยไม่ขยับ
- แก้: เติม `position:'fixed'` ใน `dockStyle` ตอนถูกลาก (`left/top` เป็นพิกัด viewport จาก getBoundingClientRect ตรงกับ fixed พอดี)
- verify เบราว์เซอร์จริง (1280px): ลาก grip → dock ขยับ 313,625 (static) → 128,4 (fixed) + screenshot ยืนยัน

## B038 — auto-scroll ให้ตรงพยางค์ (จ่าย H-highlight)
- **อาการ (P'Aim 9 ก.ค.):** ตอนฝึกร้อง จอเลื่อนตามไม่ตรงพยางค์ที่กำลังร้อง — ต้องการให้เลื่อนตรงพยางค์จริง
- **root cause (git-verified):** `SongViewer.vue` `watch(playingSeg, …)` (บรรทัด ~120-128) scroll ไปหา `[data-seg="li-si"]` = **ระดับท่อน** · แต่ไฮไลต์ track รายพยางค์ผ่าน `playingSyl {li,si,syk}` (ถูกต้องแล้ว) · SongSheet มี `[data-syl="li-si-k"]` ต่อพยางค์อยู่แล้ว (บรรทัด 166)
- **fix spec:** เปลี่ยน follow-along scroll ให้ watch `playingSyl` แล้ว `querySelector('[data-syl="${li}-${si}-${syk}"]').scrollIntoView({block:'nearest',inline:'center'})` · **fallback ไป `[data-seg]`** ถ้าไม่เจอพยางค์ (segment ดนตรีล้วน/ไม่มีคำ) · คง logic `pausedScrollUntil` (หยุดหลบตอนผู้ใช้เลื่อนเอง 3.5s) ไว้เหมือนเดิม
- **ไฟล์:** `src/components/SongViewer.vue` เท่านั้น (คาดว่า) · **DoD:** เลื่อนตรงพยางค์ที่ไฮไลต์จริง · npm test เขียว · build ผ่าน · รายงาน + Network URL ให้ P'Aim เทสต์มือถือ
- **verify ต้องพิสูจน์ด้วยหู/ตาจริง** (บทเรียน: บั๊ก "ได้ยิน/เห็น" อย่าเช็กผ่าน proxy) — เล่นเพลงจริงแล้วดูว่าพยางค์ที่ลิทอยู่กลางจอ

## B039 + B041 — download menu + ปุ่มพิมพ์ (จ่าย V-viewer/shell)
- **B039 (bug):** `DownloadTool.vue` `open` ปิดแค่ Esc + หลังเลือกเมนู · ไม่มี outside-click / close-on-route → กดปุ่มโหมด (ฝึกร้อง) เมนูค้างเปิด. **fix:** เพิ่ม document mousedown outside-click ปิดเมนู (แพทเทิร์นเดียวกับ `StudioDock.onOutside`) + ปิดเมื่อ route/mode เปลี่ยน. ไฟล์: `DownloadTool.vue`.
- **B041 (design เคาะแล้ว):** เอาปุ่ม "พิมพ์" ออกจาก dock ฝึกร้อง (ซ้ำกับ "พิมพ์/บันทึก PDF" ในเมนู download). ตรวจว่าโหมด "พิมพ์/แผ่นเพลง" ยังเข้าถึง print ได้ครบ (ไม่ให้ฟีเจอร์หาย). ไฟล์: `SongViewer.vue` singTools / dock config.
- ทั้งคู่ = กลุ่ม shell/viewer → รวม batch เดียวกับ V-viewer ได้

## 📝 หน้าแก้ไข (edit) — P'Aim review 9 ก.ค. (คู่ขนานกับ B043)
imgs: `realuse-assets/edit-*.png` · ref prototype `docs/design/ps2-studio-prototype.html`
| id | จุด | verdict | ไฟล์/กันชน | สถานะ |
|---|---|---|---|---|
| B048 | default โหมดแสดงควรเป็น **"ต่อกัน"** ไม่ใช่ "1 ห้อง/แถว" | 🎨 เคาะ (default=ต่อกัน) | `EditorMode.vue` (อิสระ · ไม่ชน B043) | 🚚 จ่ายได้ |
| B049 | ลำดับเพลง (arrangement) ที่ build **ไม่ตรง prototype** (`ps2-studio-prototype.html`) | ⚠️ design-drift ต้องเทียบ | SA review prototype↔build (edit) | 🔍 รอ SA เทียบ |
| B050 | กด **"ดูผลทั้งเพลง" แล้วเนื้อร้องหาย** (โชว์แต่โน้ต) | ✅ บั๊กจริง (img preview-clustered) | preview render (EditorMode/SongSheet?) | ⏳ เช็กว่าแตะ SongSheet ไหม (ชน B043 ph2) |
| B051 | preview: ป้าย **"♦ ร้อง 1" ขึ้นทุกกล่อง** = รกเกิน · ควรโชว์ครั้งเดียว/บรรทัด | ✅ บั๊ก/clutter | preview render (คู่ B050) | ⏳ คู่ B050 |
