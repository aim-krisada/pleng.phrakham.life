# UX Redesign — แชร์ / คัดลอกลิงก์ + QR · รายการโปรด (★) · เพลย์ลิสต์ — ไม่มี account (EPIC H + I)

**สาย 2 (whole-app) · คู่กับ `ux-redesign-home-nav.md`** · ต่อยอด `docs/mission.md` (ไม่ล็อกอินก็ใช้ได้ · ทุก tier) · friction `ux-redesign-workflow §1 (S-1)` + `§3` + `§5 ข้อ4 (P'Aim เคาะ 22 ก.ค.)`
**ยึด:** `docs/ui-standards.md` · `docs/ux-platform-patterns.md` · reuse `src/lib/jsonIO.js`
**Hard constraint (P'Aim · workflow §5.4):** **ไม่มี account · ไม่เก็บข้อมูลส่วนบุคคล** — localStorage ต่อเครื่อง + ส่ง config ทางอีเมล (กรอกอีเมลเองทุกครั้ง ไม่เก็บ) + URL/QR share. **ห้ามแตะ `src/`** (ออกแบบ/wireframe) · **ห้ามยุ่ง editor internals**.

---

## 0 · ตาราง "มีแล้ว / ใหม่จริง / ต่อยอด" (เปิดโค้ดจริงแล้ว)

| ส่วน | สถานะ | หลักฐาน |
|---|---|---|
| ปุ่ม/กลไก **แชร์เพลง** (navigator.share / copy-link / QR) | ❌ **ใหม่จริง** | ไม่พบ `navigator.share` ใน `src/` (S-1) |
| `navigator.clipboard` (copy) | ✅ pattern มีแล้ว (paste ใน editor) | `EditorMode.vue` (copypaste) |
| **★ favorite** (เก็บ/toggle) | ❌ ใหม่จริง | ไม่มีใน store/`SongList` |
| **playlist** | ❌ ใหม่จริง | — |
| localStorage-ref pattern (persist per browser · ไม่มี account) | ✅ มีแล้ว — **reuse ทำ favorites/playlist** | `store.js:12-27` (`readingFontScale`) `:36-59` (`siteFont`) |
| export/import ไฟล์ JSON (song ↔ ไฟล์ · validate · ไม่แตะ DB) | ✅ มีแล้ว — **reuse ทำ config list ↔ ไฟล์** | `lib/jsonIO.js:13,30,47,86` |
| ExportTool (PDF/JSON/MP3 บน dock) | ✅ มีแล้ว — **เพิ่ม "แชร์" ข้าง ๆ ได้** | `Studio.vue:24,363` · `SongViewer.vue:498` |
| ไอคอน (Icon.vue · Lucide) | ✅ มีแล้ว — `share-2` / `star` / `qr-code` / `link` / `mail` | `ShellBar.vue:24` |
| route สำหรับเปิดลิสต์ที่แชร์มา | ❌ ใหม่จริง (route `/list` หรือ query) | `router.js` |
| ไลบรารีสร้าง **QR** (self-host · PWA offline) | ❌ ใหม่จริง — **ต้อง bundle ในแอป ห้าม CDN** (memory `pleng-pwa-self-host-samples`) | — |

**ใหม่จริงที่ต้อง flag ก่อนสร้าง:** `lib/share.js` · `lib/favorites.js` · `lib/playlists.js` · component `ShareSheet.vue` + `FavStar.vue` · QR generator แบบ self-contained (เช่นฝัง `qrcode` เล็ก ๆ ที่ bundle ไม่ใช่โหลด CDN) · 1 route เปิดลิสต์.

---

## 1 · แชร์ / คัดลอกลิงก์ + QR (EPIC H · แก้ S-1)

### หลักการ (อ้างมาตรฐาน)
- **มือถือ = Web Share API** (`navigator.share`) → เรียก sheet แชร์ของ OS (LINE/Messenger/copy) = พฤติกรรมที่คนคุ้น (Material/HIG native share). **fallback** เมื่อไม่มี `navigator.share` (เดสก์ท็อปส่วนใหญ่) = **คัดลอกลิงก์ + QR** ในแผ่นของเราเอง.
- **QR** = ให้เพื่อนในโบสถ์สแกนจากจอ/โปรเจกเตอร์เปิดเพลงเดียวกันบนมือถือทันที (ตรง use-case worship team). ต้อง render offline (PWA) → **QR lib ฝังในแอป ไม่พึ่ง CDN**.
- **ลิงก์ = URL canonical ของเพลง** (`/song/:id` hash route) · optionally แนบคีย์ที่ transpose (`?key=D`) เพื่อเปิดมาคีย์เดียวกัน (ค่า default = คีย์ต้นฉบับ ถ้าไม่แนบ).

### Wireframe — ปุ่ม ↗ บนหน้าเพลง → แผ่นแชร์
```
หน้าเพลง:  ‹ 12. พระเจ้าเที่ยงแท้  [ฝึก][แผ่น][แก้]  ↗  ⋮
                                                     │ กด ↗
มือถือ (มี navigator.share):        เดสก์ท็อป / fallback (bottom-sheet หรือ popover เกาะปุ่ม ↗):
┌ OS share sheet ┐                  ┌──────────────────────────────┐
│ LINE  Messenger│                  │  แชร์ "12. พระเจ้าเที่ยงแท้"   │
│ Copy  More …   │                  │                              │
└────────────────┘                  │   ┌──────────┐               │
(ของ OS · เราแค่ยิง                  │   │  ▚▚ QR ▚▚ │  สแกนเปิดเพลง │
 navigator.share({title,url}))       │   │  ▚▚▚▚▚▚▚▚ │               │
                                     │   └──────────┘               │
                                     │  🔗 pleng.phrakham.life/#/song/… │
                                     │  [ คัดลอกลิงก์ ]  ✓ คัดลอกแล้ว │
                                     │  ☐ เปิดมาที่คีย์ที่ตั้งไว้ (D)  │
                                     └──────────────────────────────┘
```
- **desktop มือถือ 2 ท่า** (touch≠pointer): มือถือ = ยก OS sheet · desktop = แผ่นของเรา (QR + copy). ทั้งคู่เริ่มจากไอคอน ↗ เดียว.
- แผ่น fallback = **bottom-sheet เต็มกว้างบนมือถือ** (ถ้า OS ไม่มี share) · **popover เกาะปุ่ม ↗ บนเดสก์ท็อป** (`ux-platform-patterns §1,§2`) · ปิดด้วย Esc/แตะนอก · ไม่ scroll (`ui-standards §2`).
- "คัดลอกลิงก์" → `navigator.clipboard.writeText` + toast `✓ คัดลอกแล้ว` (aria-live).
- **Host:** ปุ่ม ↗ teleport บน shell (`Studio.vue #shell-menus`) · แผ่น = `ShareSheet.vue` (ใหม่) · logic = `lib/share.js` (ใหม่: `shareSong(url,title)` เลือก native/fallback + `buildSongUrl(id, key?)`).

---

## 2 · รายการโปรด ★ (EPIC I · localStorage · ไม่มี account)

### หลักการ
- **★ = เซ็ต id ใน localStorage ต่อเครื่อง** — reuse pattern `store.js` (`readingFontScale`/`siteFont` = ref + watch→localStorage). ไม่ล็อกอิน ตรง mission ("ไม่ล็อกอินก็ใช้ได้").
- **1 แตะ toggle** บน 3 จุด (single source of truth = state เดียว): การ์ดค้นหา (`song-card`) · แถวในลิสต์ (`song-row`) · หน้าเพลง (shell ↗ ข้าง ๆ / ⋮). ทุกจุดอ่าน/เขียน state เดียว → กดที่ไหนก็ sync.
- **หน้าแรก chip "★"** (จาก `ux-redesign-home-nav §2`) = กรองเฉพาะโปรด.

### Wireframe
```
แถวในลิสต์:   12  พระเจ้าเที่ยงแท้ ........... คีย์ C   ★   ← กด = toggle (aria-pressed)
หน้าเพลง:     ‹ … [ฝึก][แผ่น][แก้]  ↗  ★  ⋮       ← ★ เต็ม=โปรดแล้ว · โปร่ง=ยังไม่
หน้าแรก:      ⟨ทั้งหมด⟩ ⟨เล่ม⟩ ⟨★ รายการโปรด⟩    ← chip กรอง

empty (chip ★ ยังไม่มีอะไร):
   ☆  ยังไม่มีเพลงโปรด — แตะ ★ ที่เพลงไหนก็ได้เพื่อบันทึกไว้ที่นี่
```
- **a11y:** ★ = `<button aria-pressed>` + `aria-label` ("บันทึกเป็นเพลงโปรด" / "เอาออกจากโปรด") · **ไม่พึ่งสีล้วน** (ไอคอนเต็ม/โปร่ง + aria · WCAG 1.4.1) · target ≥44 (hit-area padding แม้ไอคอนเล็ก).
- **Host:** `lib/favorites.js` (ใหม่: `favIds` ref + `toggleFav(id)` + `isFav(id)`) · `FavStar.vue` (ใหม่ · เล็ก) reuse ในการ์ด/แถว/shell · chip filter ใน `SongList.vue`.

---

## 3 · เพลย์ลิสต์ (EPIC I · localStorage + พกพาแบบไม่เก็บข้อมูล)

### หลักการ
- **playlist = ลิสต์ `{ id, name, songIds[] }` ใน localStorage** (reuse store pattern · deep-watch เหมือน `arrangeOverrides` `store.js:134-138`).
- **พกพา/ข้ามเครื่อง โดยไม่มี account — 2 ทาง (P'Aim เคาะ):**
  1. **URL/QR share** (ดีสุด · ไม่มีไฟล์แนบ) — encode ลิสต์ (ชื่อ + ids) เป็น param ในลิงก์ · กดเปิด = restore ทันที. เหมาะลิสต์สั้น.
  2. **export/import config file (.json)** — reuse **`jsonIO.js`** style. เหมาะลิสต์ยาว/สำรอง.
- **"ส่งอีเมล กรอกอีเมลเองทุกครั้ง ไม่เก็บ" (mission-critical):** ปุ่ม "ส่งเข้าอีเมล" → เปิด `mailto:<ที่ผู้ใช้พิมพ์>` โดยมี **ลิงก์แชร์ลิสต์อยู่ใน body** (mailto แนบไฟล์ไม่ได้ → ใช้ share-URL แทน) · **อีเมลไม่ถูกเก็บที่ไหนเลย** (ไปที่แอปเมลของเครื่องตรง ๆ). ลิสต์ยาวเกิน URL → แนะนำ "ดาวน์โหลดไฟล์" แล้วแนบเอง.

### Wireframe — จัดการเพลย์ลิสต์ (เข้าจาก chip "★"/เมนู · หรือ overflow ⋮)
```
┌ เพลย์ลิสต์ของฉัน ───────────────────────────┐
│ 🎵 นมัสการเช้าอาทิตย์   (8 เพลง)   ↗  ⋮       │  ← ↗ แชร์ลิสต์ · ⋮ = เปลี่ยนชื่อ/ลบ/สำรอง
│ 🎵 เพลงฝึกทีม           (5 เพลง)   ↗  ⋮       │
│ ＋ สร้างเพลย์ลิสต์                            │
└─────────────────────────────────────────────┘
   กด ↗ →  ┌ แชร์เพลย์ลิสต์ ────────────────┐
           │  ▚ QR ▚   🔗 …/#/list?d=…       │
           │  [ คัดลอกลิงก์ ]                │
           │  ────────────────────────────  │
           │  ส่งเข้าอีเมล (ไม่เก็บอีเมล):    │
           │  [ อีเมลผู้รับ ______ ] [ ส่ง ] │  ← mailto ทันที · ไม่ save
           │  หรือ [ ⬇ ดาวน์โหลดไฟล์สำรอง ]  │  ← jsonIO-style .json
           └────────────────────────────────┘

เพิ่มเพลงเข้าลิสต์:  จากหน้าเพลง ⋮ → "เพิ่มเข้าเพลย์ลิสต์" → เลือกลิสต์ (หรือสร้างใหม่)
เปิดลิงก์ที่แชร์มา:  /#/list?d=… → เห็นลิสต์ + ปุ่ม "บันทึกลงเครื่องนี้"
```
- **เปิดลิงก์ที่แชร์มา = read-only จนกดบันทึก** — กัน localStorage เครื่องคนอื่นโดนเขียนโดยไม่ตั้งใจ.
- **a11y/responsive:** แผ่นแชร์ = bottom-sheet มือถือ / popover desktop (เหมือน §1) · ช่องอีเมล = `type=email` + label ชัด · ทุกปุ่ม ≥44 · ไม่ scroll · Esc/แตะนอกปิด.
- **Host:** `lib/playlists.js` (ใหม่: CRUD + `encodeList/decodeList` + `exportListFile/importListFile` reuse jsonIO) · view/section เพลย์ลิสต์ (ใหม่ · จะเป็น section ในหน้าแรก chip ★ หรือ route ก็ได้ — KISS: section ก่อน) · route `/list` (ใหม่ · เปิดลิสต์ที่แชร์) ใน `router.js`.

---

## 4 · privacy / ความปลอดภัย (ผูก hard constraint)
- **ไม่มี PII เข้า server** — favorites/playlist อยู่ localStorage ล้วน · share = URL/ไฟล์ที่ผู้ใช้ถือเอง.
- **อีเมล = mailto ฝั่ง client เท่านั้น** — ไม่ยิงเข้า DB/Supabase · ไม่ log. ตรง "กรอกเองทุกครั้ง ไม่เก็บ".
- **ลิงก์ share ไม่ใส่ PII** — มีแค่ id เพลง + ชื่อลิสต์ (ผู้ใช้ตั้งเอง) · ไม่มีตัวตนผู้ใช้ (สอดคล้องกฎ privacy: ห้าม PII ใน query string).
- QR = สร้างฝั่ง client จากลิงก์เดียวกัน · offline ได้ (self-host lib).

---

## User Stories + AC

> traceable: mission ("ไม่ล็อกอินก็ใช้ได้ · ทุก tier") + friction S-1 + `ux-redesign-workflow §3,§5.4` (P'Aim เคาะ ไม่มี account/PII). วัดได้ · tester เทียบทีละข้อ.

### EPIC H — แชร์ / ลิงก์ / QR

#### US-H1 — แชร์เพลง 1 แตะ (แก้ S-1)
*ในฐานะ* คนร้อง *ฉันต้องการ* ปุ่มแชร์เพลงในตัวแอป *เพื่อ* ส่งให้เพื่อน/ทีมโดยไม่ต้องก๊อป URL จาก address bar
- **AC-H1.1** มีไอคอน `↗ แชร์` บนหน้าเพลง (ทุกโหมด · บน shell) เข้าถึง 1 แตะ.
- **AC-H1.2** มือถือที่มี `navigator.share` → เรียก OS share sheet ด้วย `{title, url}` · เดสก์ท็อป/ไม่มี → แผ่น fallback (คัดลอกลิงก์ + QR).
- **AC-H1.3** "คัดลอกลิงก์" คัดลอก URL canonical ของเพลง + แจ้ง `✓ คัดลอกแล้ว` (aria-live).
- **AC-H1.4** ลิงก์เปิดกลับมาได้ถูกเพลง (hash route `/song/:id`) · optional `?key=` เปิดมาคีย์ที่ตั้งไว้.
- *test:* stub `navigator.share` → assert เรียกด้วย url ถูก · ไม่มี share → แผ่น fallback โผล่ + clipboard เขียนค่า · เปิด url กลับ = เพลงเดิม · @360/desktop 2 ท่าถูก.

#### US-H2 — QR เปิดออฟไลน์
*ในฐานะ* ทีมนมัสการ *ฉันต้องการ* QR ของเพลง/ลิสต์ *เพื่อ* ให้คนสแกนจากจอเปิดเพลงเดียวกันบนมือถือ
- **AC-H2.1** แผ่นแชร์แสดง QR ที่ decode = ลิงก์เดียวกับ "คัดลอกลิงก์".
- **AC-H2.2** QR render โดย**ไม่เรียกเครือข่ายภายนอก** (self-host lib · ทำงานในโหมด PWA offline · memory `pleng-pwa-self-host-samples`).
- **AC-H2.3** contrast QR ผ่านการสแกนจริง · ขนาด ≥ ที่สแกนได้บนจอมือถือ.
- *test:* offline → QR ยังวาด · ไม่มี request ออกนอก origin · สแกน QR → ได้ url ตรง.

### EPIC I — รายการโปรด (★) + เพลย์ลิสต์ (ไม่มี account)

#### US-I1 — ★ รายการโปรด ต่อเครื่อง
*ในฐานะ* คนร้อง (ไม่ล็อกอิน) *ฉันต้องการ* กดดาวเพลงที่ชอบ *เพื่อ* กลับมาหาเร็ว โดยไม่ต้องสมัครสมาชิก
- **AC-I1.1** ★ toggle ได้จาก การ์ดค้นหา · แถวลิสต์ · หน้าเพลง — ทุกจุดใช้ state เดียว (กดที่ไหนก็ sync).
- **AC-I1.2** เก็บใน localStorage ต่อเครื่อง · คงอยู่หลัง reload · **ไม่ยิง server / ไม่มี account**.
- **AC-I1.3** chip "★" หน้าแรกกรองเฉพาะโปรด · ว่าง = empty state ชวนกดดาว.
- **AC-I1.4** ★ = `aria-pressed` + `aria-label` · ไอคอนเต็ม/โปร่ง ไม่พึ่งสีล้วน (WCAG 1.4.1) · ≥44px.
- *test:* toggle แล้ว reload → คงอยู่ · ไม่มี network write · axe · target ≥44 @360.

#### US-I2 — เพลย์ลิสต์ ต่อเครื่อง
*ในฐานะ* ผู้นำนมัสการ *ฉันต้องการ* จัดเพลงเป็นชุด (เช่น "นมัสการเช้าอาทิตย์") *เพื่อ* เปิดเรียงต่อกันในงาน
- **AC-I2.1** สร้าง/ตั้งชื่อ/เพิ่ม-ลบเพลง/ลบลิสต์ ได้ · เก็บ localStorage · ไม่มี account.
- **AC-I2.2** "เพิ่มเข้าเพลย์ลิสต์" เข้าถึงจากหน้าเพลง (⋮) · เลือกลิสต์เดิมหรือสร้างใหม่.
- **AC-I2.3** จัดการลิสต์ = แถวบรรทัดเดียว (ชื่อ + จำนวนเพลง + ↗ + ⋮) ตาม `ui-standards §2` list-row.
- *test:* CRUD → reload คงอยู่ · เพิ่มจากหน้าเพลงเข้าลิสต์ถูก · ไม่มี network.

#### US-I3 — พกพาลิสต์แบบไม่เก็บข้อมูล (URL/QR + ไฟล์ + อีเมล)
*ในฐานะ* ผู้ใช้ที่มีหลายเครื่อง/อยากส่งต่อ *ฉันต้องการ* ย้ายลิสต์ข้ามเครื่องโดยไม่มีบัญชี *เพื่อ* ใช้ต่อที่อื่น/แชร์ทีม
- **AC-I3.1** แชร์ลิสต์เป็น **URL + QR** (encode ชื่อ+ids) · เปิดลิงก์ → เห็นลิสต์ + ปุ่ม "บันทึกลงเครื่องนี้" (read-only จนกดบันทึก).
- **AC-I3.2** export/import **ไฟล์ .json** (reuse `jsonIO.js` style · validate ไม่ throw) สำหรับลิสต์ยาว/สำรอง.
- **AC-I3.3** "ส่งเข้าอีเมล" = เปิด `mailto:<ที่ผู้ใช้พิมพ์>` พร้อมลิงก์แชร์ใน body · **อีเมลไม่ถูกเก็บ/ไม่ log ที่ใดเลย** (hard constraint).
- **AC-I3.4** ไม่มี PII ในลิงก์/ไฟล์ (มีแค่ id เพลง + ชื่อลิสต์ที่ผู้ใช้ตั้ง) · ไม่ใส่ข้อมูลส่วนตัวใน query string.
- *test:* encode→decode ลิสต์ round-trip เท่ากัน · เปิด url ต่างเคร่ือง (localStorage ว่าง) เห็นลิสต์ · กดบันทึก→เข้า localStorage · mailto ไม่มี network call · ไฟล์ import ผ่าน validate.

---

## นอกขอบเขต
- ไม่ทำ sync ข้ามเครื่องอัตโนมัติ / cloud playlist (ขัด no-account).
- ไม่เก็บอีเมล/PII ที่ server ใด ๆ.
- ไม่แตะ editor internals / model / DB / `songSearch.js`.
- "ฟังต่อเนื่องทั้งเพลย์ลิสต์ (duo cello+piano)" = ต่อยอดอนาคต (workflow §3 · แกน #2 ของ G) — สายนี้วางโครงข้อมูล playlist ให้ต่อยอดได้ ไม่สร้าง engine เล่นต่อเนื่องรอบนี้.
