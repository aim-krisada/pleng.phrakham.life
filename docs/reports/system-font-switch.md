# Report — สลับฟอนต์ไทย มีหัว/ไม่มีหัว (per-user)

**สาย/branch:** `system-font-switch` (จาก `studio-shell-redesign`) · **ประเภท:** dev+SA
**ส่ง:** โค้ด (index.html · styles.css · store.js · ShellBar.vue) + ฟอนต์ 2 ไฟล์ · **ห้าม merge/deploy**

## ทำอะไร
เพิ่มฟอนต์ไทย **"มีหัว" (Noto Sans Thai Looped)** เป็นตัวเลือก แล้วให้ **แต่ละคนสลับเองได้** ที่เมนูเว็บ (แบรนด์ ▾) · ค่าเริ่มต้น = ตัวไม่มีหัวเหมือนเดิม

## ⚠️ เปลี่ยนแผนจากโจทย์เดิม (P'Aim เคาะ 10 ก.ค.)
โจทย์เดิม = **"admin only · system-wide · เก็บ Supabase + RLS"** → **P'Aim เปลี่ยนเป็น "ของใครของมันรายคน" (per-user)** ระหว่างเคาะดีไซน์ ผลที่ตามมา (ทำตามแผนใหม่):
- **ไม่มี Supabase settings / RLS / SQL ให้พี่รัน** — เก็บใน **localStorage ของเครื่องนั้น** เหมือน "Aa" (ขนาดตัวอักษร) ที่มีอยู่
- **ไม่ gate admin** — แต่ละคนเปลี่ยนแค่จอตัวเอง ไม่กระทบคนอื่น จึงไม่มีอะไรต้องล็อก
- **ทุกคนเห็นปุ่ม** (รวมคนไม่ล็อกอิน) — ต่างจากโจทย์เดิมที่ว่า "ผู้ใช้ทั่วไปไม่เห็นปุ่ม"

## 3 จุดที่เคาะ
1. **ฟอนต์:** `Noto Sans Thai Looped` (มีหัว · ยัง sans เข้าชุด Noto)
2. **ขอบเขต:** per-user (ต่างคนต่างตั้ง)
3. **ที่วางปุ่ม:** P'Aim ให้ผมแนะเอง → **เมนูเว็บ (แบรนด์ ▾)** · เหตุผล de-facto + WCAG 2.2 AA:
   - การตั้ง "หน้าตาทั้งเว็บ" (ธีม/ภาษา/ฟอนต์) มาตรฐานอยู่ในเมนูรวมที่เข้าถึงได้ทุกหน้า — ต่างจากปุ่ม "Aa" ที่คุมแค่ขนาดในเอกสารที่เปิดอยู่ (pleng ก็โชว์ Aa เฉพาะตอนเปิดเพลง) · ฟอนต์นี้มีผลทั้งเว็บจึงควรอยู่จุดที่ทุกหน้าเข้าถึง
   - **WCAG:** 3.2.3 Consistent Navigation (เมนูแบรนด์อยู่ทุกหน้า = จุดเดียวสม่ำเสมอ) · 2.5.8 Target Size (ปุ่ม 44px) · 2.4.7 Focus visible (token เดิม) · radiogroup + aria-checked
   - **ปลอดภัยกับงาน SA:** ไม่แตะ dock / ปุ่ม Aa ที่ SA กำลังรื้อ (B045)

## ฟอนต์ (page weight)
- Subset จาก Noto Sans Thai Looped TTF (notofonts · unhinted) ด้วย `pyftsubset` **unicode-range ไทยชุดเดียวกับตัวเดิม** → `public/fonts/NotoSansThaiLooped-{Regular,Bold}.woff2` = **9.0KB / 9.5KB** (เท่าตัวไม่มีหัว ~8.8KB) · glyph ไทย 87 ตัว
- **ไม่ preload** — เบราว์เซอร์โหลดไฟล์นี้ **เฉพาะตอนคนเลือก "มีหัว"** (หรือเปิดเมนูดูตัวอย่าง) · คนใช้ค่าเริ่มต้นไม่โดนโหลดเพิ่ม · Latin + คอลัมน์โน้ต/คอร์ด (monospace) ไม่แตะ = สลับแค่ตระกูลไทย

## ไฟล์ที่แตะ
- **`index.html`** — เพิ่ม `@font-face` looped (400/700) + **สคริปต์ตั้ง `data-font` ก่อน paint** (อ่าน `localStorage['pleng.siteFont']` = ไม่มีวูบตอน reload)
- **`src/styles.css`** — `:root[data-font='looped'] body { font-family: …'Noto Sans Thai Looped'… }` (specificity ชนะ body rule เดิม) + สไตล์ toggle ในเมนู
- **`src/store.js`** — `siteFont` ref + `setSiteFont()` (localStorage `pleng.siteFont` · apply ผ่าน `data-font` บน `<html>`) — โครงเดียวกับ `readingFontScale`
- **`src/components/ShellBar.vue`** — toggle 2 ตัวเลือกในเมนูแบรนด์ ▾ (radiogroup · ตัวอย่าง "ก ข ค" เรนเดอร์ในฟอนต์ของตัวเองให้ดูก่อนเลือก · `@click.stop` = เลือกแล้วเมนูไม่ปิด เทียบได้)
- **`src/components/ShellBar.font.test.js`** — เทสใหม่ 4 เคส

## verify
- **unit:** vitest `ShellBar.font.test.js` 4/4 + เต็ม suite **264 passed** (`notationLint.test.mjs` fail = ของเดิม · เป็น node-lint ที่ `process.exit(0)` เอง แยกจาก vitest)
- **build:** ✅ · dist มี looped woff2 + @font-face + สคริปต์ + css rule ครบ
- **serve จริง (worktree `--host` :5311 · curl 127.0.0.1):** index.html มีสคริปต์+face · ShellBar 200 มี toggle · looped woff2 200 (9024/9504b) · styles.css มี looped rule · store export `siteFont/setSiteFont`
- **chain สลับจริง (deterministic):** unit พิสูจน์ click → `<html data-font=looped>` + persist · served CSS มี `:root[data-font='looped'] body{…Looped}` · เนื้อร้องไทยใน `.segment .lyric` ไม่ตั้ง font-family เอง → inherit body → **สลับตามแน่**
- **ยังไม่พิสูจน์ด้วยตา:** ไม่มี headless browser ในเครื่อง (ไม่ลงเพิ่ม) → **ฝาก P'Aim ดูจริงบนมือถือ** (มาตรฐานทีมก่อน deploy อยู่แล้ว)
- **LAN (มือถือ):** `http://10.215.141.98:5311/` — เปิดเมนูแบรนด์ ▾ → "ตัวอักษรไทย" → กด **มีหัว** → ทั้งเว็บ(เนื้อร้อง/เมนู/หัวข้อ) เปลี่ยนเป็นมีหัว · reload แล้วยังจำ · กด **ไม่มีหัว** กลับเดิม

## หมายเหตุ/ค้าง
- **โหมดพิมพ์ (print/PDF):** `lib/printChrome.js` ฝัง `'Noto Sans Thai'` ตรงๆ → กระดาษยังเป็นตัวไม่มีหัวเสมอ (ไม่ตามค่าที่เลือก) · **จงใจ** — ถ้าอยากให้พิมพ์ตามด้วย = งานต่อ (แตะ printChrome ซึ่งเป็นสาย print อื่น)
- **collision (PM จัดคิว merge):** สายนี้แก้ `ShellBar.vue`+`store.js` · **B045 dev (`b045-mobile-shell`)** ก็แก้ 2 ไฟล์นี้ (คนละส่วน — ผมเพิ่มในเมนูแบรนด์ + บล็อก `siteFont`; B045 ตัดฝั่งขวา + `setFontScale`) → น่าจะ merge ได้ แต่ให้ PM เรียงลำดับ/ตรวจ conflict

**⛔ ห้าม merge/deploy** — รอ P'Aim accept บน LAN
