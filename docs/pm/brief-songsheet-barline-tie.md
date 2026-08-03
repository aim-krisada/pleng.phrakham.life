# ใบสั่ง (dev · สาย A) — SongSheet: เส้นปิดห้องท้ายบรรทัด (B082) + ไทข้ามห้องต่อเนื่อง (B069)

**สั่งโดย:** pm7 · **ฐาน:** `studio-shell-redesign` (HEAD ปัจจุบัน = deploy รอบ 7 · `71b8d8f`+) · **branch ใหม่:** `fix-songsheet-barline-tie`
**ที่มา:** พี่เปา 11 ก.ค. (2 bug แตะ `SongSheet.vue` ไฟล์เดียว → รวมสายเดียว ทำทีละข้อ) · verify print PDF จริง

---

## 🎯 B082 — ห้องสุดท้ายของบรรทัดที่จังหวะครบ ต้องมีเส้นปิดห้อง
- **อาการ (พี่เปา):** ห้องระหว่างกลางมีเส้น `|` คั่น แต่**ห้องสุดท้ายของบรรทัดไม่มีเส้นปิด** — บางบรรทัดมี บางบรรทัดไม่มี = ไม่สม่ำเสมอ · img `docs/backlog-assets/B082-lastbar-closing-barline.png`
- **ต้นเหตุ (PM triage):** `SongSheet.vue` วาดเส้นห้องเฉพาะเมื่อ `part.barLine === true` (บรรทัด ~284) · bar object สร้างที่ ~80-84 (`barLine:false` ห้องแรก · `true` เมื่อเจอโทเคน `|`) → ปลายบรรทัดที่ข้อมูลไม่มี `|` ปิดท้าย เลยไม่วาดเส้น
- **ต้องได้:** ห้องสุดท้ายของ**ทุกบรรทัด** ถ้า**จังหวะครบห้อง** → วาดเส้นปิดห้องเสมอ (สม่ำเสมอทุกบรรทัด) · ระวังอย่าไปเพิ่มเส้นให้ห้องที่จังหวะยังไม่ครบ (เช่น pickup/ห้องต่อกันข้ามบรรทัด — ดู `line.cont` B055) · อย่าซ้ำกับเส้นจบเพลง (`bar-final` ~279) / repeat-end (~281)

## 🎯 B069 — ไทข้ามห้องต้องเป็นโค้งเดียวพาดข้ามเส้นห้อง
- **อาการ (พี่เปา · เพลงที่ 3):** ไทที่คร่อมเส้นห้อง แสดงเป็น **2 ครึ่งขาดตรงเส้นห้อง** ไม่ใช่โค้งเดียวยาว · img `docs/backlog-assets/B069-crossbar-tie-broken.png`
- **ต้นเหตุ (PM triage):** โน้ตต้นไท/ปลายไทอยู่คนละ segment (NoteRow) มี `.bar-line` คั่น · โค้ด SVG span เริ่มมีแล้วที่ **`SongSheet.vue:159`** ("SVG path spanning from source digit to tie-end digit, arcing over the bar") แต่ยัง render ไม่ต่อเนื่อง → ต้องแก้ให้ path คร่อมข้ามเส้นห้างเป็นโค้งเดียว
- **ต้องได้:** ไทข้ามห้อง = โค้งเดียวเรียบต่อเนื่อง (ปลายเรียว หนากลาง เหมือน engraving ของ B076/B062 ในแถว) พาดข้ามเส้นห้องไม่มีรอยต่อ/ช่องว่าง
- **ข้อมูล:** tie ถูก encode แล้ว (B068 · 48 เพลง/193 arc) · เพลงที่ 3 มี tie จริง (render อยู่แต่ขาด) → **นี่คืองาน render ล้วน** ไม่ต้องแตะ data/import · เช็กว่า B076 (slur ในแถว NoteRow) **ไม่ regress** (คนละไฟล์ แต่ดูภาพรวมแผ่นเพลงว่าไม่ตีกัน)

---

## ตรวจเอง Tier-B ก่อนส่ง tester (บังคับ)
- Browser MCP: เปิดแผ่นเพลงจริง — B082 ทุกบรรทัดที่ครบจังหวะมีเส้นปิดสม่ำเสมอ · B069 ไทข้ามห้องต่อเนื่องเป็นเส้นเดียว (หาเพลงที่มีไทข้ามห้อง เช่นเพลงที่พี่เปาเจอ/เพลง 100)
- **verify print PDF จริง** (สั่ง print → เปิด PDF ดู · ไม่ใช่แค่ DOM — ดู memory `feedback_verify_print_from_pdf`) เพราะ 2 เรื่องนี้เห็นผลตอนพิมพ์กระดาษ
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` เขียว + `npm run build` เขียว · เพิ่ม test ถ้าเป็นไปได้ (bar-close logic เทสต์ได้)

## เปิด server + รายงาน
- `npx vite . --host --port 5410 --strictPort` → **Network URL `http://<IP>:5410/`** ใส่ในรายงาน (IP วันนี้ดู board · น่าจะ `192.168.1.124`)
- เสร็จ session-agnostic: (1) `docs/reports/songsheet-barline-tie.md` (2) เพิ่มบรรทัด `docs/pm/board.md` §📥 inbox (3) ping **PM ปัจจุบัน = pm7** · อย่า hardcode ชื่อ session · ⛔ ห้าม merge/deploy เอง
- แตะเฉพาะ `SongSheet.vue` (+ test) · ถ้าต้องแตะไฟล์อื่นให้ทักหมายเหตุในรายงานก่อน · **เช็ก `git branch --show-current` ก่อน commit**
