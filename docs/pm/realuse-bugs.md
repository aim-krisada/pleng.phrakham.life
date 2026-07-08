# กระดานเก็บบั๊ก "ลองใช้จริง" — P'Aim (รอบหลังคลื่น 2)

PM เก็บบั๊กที่ P'Aim เจอตอนใช้จริง → ตรวจเทียบโค้ด/git → จัดกลุ่มไม่ชนไฟล์ → จ่าย dev 1-3 ขนานทีเดียว

**ฐาน:** `studio-shell-redesign` (คลื่น 1+2 รวมเข้าแล้ว · unit 110/110)
**วันที่เริ่มเก็บ:** 2026-07-09

**ป้าย verdict:** ✅ บั๊กจริง · 🎨 เรื่องดีไซน์รอ P'Aim เคาะ · 🔁 รู้อยู่แล้ว/ในแผน · ⛔ by-design (ไม่ใช่บั๊ก)

| id | อาการ (จากพี่เอม) | หน้า/โหมด | verdict | ไฟล์ที่ต้องแตะ | กลุ่มงาน | สถานะ |
|---|---|---|---|---|---|---|
| B036 | favicon เป็นลูกโลกทั่วไป ควรใช้ favicon ที่กำหนด (โลโก้ พระคำ.ชีวิต) | ทุกหน้า (แท็บ) | ✅ บั๊กจริง — `index.html` ไม่มี `<link rel="icon">` เลย | `index.html` + `public/favicon.ico` | G1 (asset) | ✅ **done** `13e5714` |
| B037 | dock (แถบคีย์) ใน desktop ควรลากย้ายได้ แต่ลากไม่ได้ | แก้ไข (desktop) | ✅ บั๊กจริง — logic ลากมีครบ แต่ `.sd-dock` เป็น `static` → `left/top` ไม่มีผล | `StudioDock.vue` | G2 (dock) | ✅ **done** `ddcb63f` |

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
