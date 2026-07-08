# กระดานเก็บบั๊ก "ลองใช้จริง" — P'Aim (รอบหลังคลื่น 2)

PM เก็บบั๊กที่ P'Aim เจอตอนใช้จริง → ตรวจเทียบโค้ด/git → จัดกลุ่มไม่ชนไฟล์ → จ่าย dev 1-3 ขนานทีเดียว

**ฐาน:** `studio-shell-redesign` (คลื่น 1+2 รวมเข้าแล้ว · unit 110/110)
**วันที่เริ่มเก็บ:** 2026-07-09

**ป้าย verdict:** ✅ บั๊กจริง · 🎨 เรื่องดีไซน์รอ P'Aim เคาะ · 🔁 รู้อยู่แล้ว/ในแผน · ⛔ by-design (ไม่ใช่บั๊ก)

| id | อาการ (จากพี่เอม) | หน้า/โหมด | verdict | ไฟล์ที่ต้องแตะ | กลุ่มงาน | สถานะ |
|---|---|---|---|---|---|---|
| B036 | favicon เป็นลูกโลกทั่วไป ควรใช้ favicon ที่กำหนด (โลโก้ พระคำ.ชีวิต) | ทุกหน้า (แท็บ) | ✅ บั๊กจริง — `index.html` ไม่มี `<link rel="icon">` เลย | `index.html` + `public/favicon.ico` | G1 (asset) | ✅ **done** (PM แก้ตรง · commit ฐาน) |

## หมายเหตุ B036 (ปิดแล้ว 2026-07-09)
- สาเหตุ: `index.html` ไม่มีบรรทัด favicon → เบราว์เซอร์ fallback ลูกโลก
- แก้: P'Aim เคาะใช้ `phrakham.life2/assets/favicon.ico` (source สดจริง Quarto) → ก็อปเข้า `public/favicon.ico` + เพิ่ม `<link rel="icon" href="favicon.ico" sizes="any">` (path สัมพัทธ์ให้ทั้ง custom domain + github.io resolve ได้)
- verify: vite เสิร์ฟ `/favicon.ico` = 200 · `image/x-icon` · 15406 bytes (ตรง source เป๊ะ) · link อยู่ใน HTML จริง
- PM แก้ตรง (ไม่ผ่าน dev worktree) เพราะจิ๋ว + ไม่ชนไฟล์ใคร
