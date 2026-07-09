# Report — wt-edit-fix (หน้าแก้ไข · ขนานกับ B043)

**Branch:** `wt-edit-fix` (ฐาน `studio-shell-redesign`)
**Server (LAN):** `http://10.215.141.98:5325/#/studio`
**Scope:** B048 · B050 · B051 (fix) · B049 (compare → report only)
**ห้ามแตะ B043:** ไม่ได้แตะ SongViewer / StudioDock / SingTransport / ShellBar / store.js / FontTool ✅

---

## ⚠️ ต้องอ่านก่อน merge — SongSheet.vue

พรีวิว "ดูผลทั้งเพลง" **ใช้ (render ผ่าน) `SongSheet.vue`** จริง — ตามที่ brief ให้สอบ.
**แต่การแก้ B050/B051 ไม่ได้แก้โค้ด `SongSheet.vue` เลย** — แก้เฉพาะ `EditorMode.vue` (ฟังก์ชัน `barContent()` ที่ป้อน content ให้ SongSheet).
→ **ไม่ชนไฟล์กับ B043 เฟส 2** (ที่จะ *แก้* SongSheet.vue + print). edit-fix merge ได้อิสระ ไม่ต้องรอ/ไม่ต้องนัดลำดับ.
(ถ้า PM อยากชัวร์: `git diff --stat studio-shell-redesign..wt-edit-fix` → เห็นว่า SongSheet.vue ไม่อยู่ในลิสต์)

---

## B048 — default โหมดแสดง = "ต่อกัน" ✅
- ไฟล์: `src/components/EditorMode.vue` — `barLayout = ref('flow')` (เดิม `'stack'`)
- **พิสูจน์เบราว์เซอร์:** โหลดหน้าแก้ → ปุ่ม "ต่อกัน" active (`aria-pressed=true`) · `.ed-strip` = `lay-flow` โดยไม่ต้องกดอะไร
- **unit:** `EditorMode.edhead.test.js` → "B048: layout defaults to ต่อกัน and toggles to 1 ห้อง/แถว"

## B050 — "ดูผลทั้งเพลง" เนื้อร้องหาย ✅ (แก้แล้ว)
- **ต้นเหตุ:** `barContent(li,bi)` serialize ท่อนทำนองดิบ ซึ่ง v2 **ไม่มีเนื้อในตัวโน้ต** (เนื้ออยู่ที่ "ลำดับเพลง/ข้อ") → SongSheet เลยได้แต่โน้ต. คอมเมนต์เดิมบอกว่า "words come from the lens verse" แต่โค้ดไม่ได้ทำจริง
- **แก้:** `barContent` ป้อนพยางค์ของ "ข้อ" ที่เลือก (lens) ลงแต่ละ segment ตาม slot offset (mapping เดียวกับ `resolveContent`)
- **พิสูจน์เบราว์เซอร์:** เพลง "พระเจ้าเป็นความรัก" กด ดูผลทั้งเพลง → 35 กล่อง มี **122 พยางค์โผล่ใต้โน้ต** ("พระ เจ้า เป็น ความ รัก ให้ ข้า พัก ใน ทุ่ง หญ้า ริม…")
- **unit:** "B050: ดูผลทั้งเพลง shows the selected verse words" (render `SongSheet` จริง ไม่ stub — assert พยางค์ครบ 8 ตัว)

## B051 — ป้าย "♦ ร้อง 1" ขึ้นทุกกล่อง ✅ (แก้แล้ว)
- **ต้นเหตุ:** แต่ละห้อง render เป็น mini-sheet แยก · `serializeLine` ใส่ `section` ของบรรทัดลง**ทุกห้อง** → ป้ายซ้ำทุกกล่อง (ป้ายมาจาก `line.section` ของท่อนทำนอง เช่นเพลง v1 ที่ migrate มา)
- **แก้:** `barContent` ใส่ `section` + `marker` เฉพาะห้องแรก (bi===0) · `end`/`label` เฉพาะห้องสุดท้าย → ป้ายโชว์ครั้งเดียว/บรรทัด
- **unit:** "B051: the section head shows once per line" (บรรทัด 2 ห้องมี section → `.section-label` นับได้ 1)

## B049 — arrangement (ลำดับเพลง) เทียบ prototype → **รายงาน gap (PM ตัดสิน)**
เทียบ built (`edit-arrangement-actual.png` / live) ↔ prototype `docs/design/ps2-studio-prototype.html`:

| หัวข้อ | built (ตอนนี้) | prototype |
|---|---|---|
| แถบซ้าย (rail) group | ทำนอง / เนื้อร้อง / **ขั้นสูง** (ลำดับเพลงอยู่ใต้ขั้นสูง) | ทำนอง (ท่อน) / เนื้อร้อง (ข้อ) / **"ลำดับการร้อง (จัดเรียง)"** เป็น row ไอคอน repeat แยก |
| ที่พิมพ์เนื้อของข้อ | **2 ที่:** (ก) ช่องใต้โน้ต (lens) + (ข) section "ลำดับเพลง" ล่างสุด = แถว `[ท่อน▾][ชื่อข้อ][คีย์▾][นับ][▲▼✕]` + textarea พยางค์เว้นวรรคดิบ | ช่องใต้โน้ต (lens) + collapsible **"พิมพ์เนื้อทั้งข้อรวดเดียว"** ต่อข้อ (ไม่มี section table ดิบ) |
| "จัดเรียง" (ลำดับการร้อง) | รวมกับตารางพิมพ์เนื้อในกล่องเดียว ("ลำดับเพลง") | เป็น view แยกเฉพาะเรียงลำดับ (ใน prototype ยัง stub — เป็น nav row ยังไม่มี logic) |

**สรุป gap:** built มี "ลำดับเพลง" เป็น**ตารางเทคนิคดิบ**ล่างเพจ (dropdown ท่อน+คีย์+textarea พยางค์) ที่ prototype ไม่มี — prototype แยก 2 เรื่องออกจากกัน: *พิมพ์เนื้อ* (ใต้โน้ต + bulk ต่อข้อ) กับ *จัดเรียงลำดับ* (view เฉพาะ ยัง stub).
**ไม่ใช่บั๊ก** — เป็นความต่างเชิงดีไซน์/ทิศทาง. **ขอ PM ตัดสิน:** (ก) เก็บตาม built (ใช้งานได้ครบกว่า prototype) · (ข) redesign ให้ตรง prototype (ต้องให้ SA ออกแบบ view "จัดเรียง" + ย้าย bulk-lyric ไปต่อข้อ) · (ค) ผสม.

---

## DoD
- unit **115/115 เขียว** (เพิ่ม 2: B050, B051 · แก้ 1: B048 default) · `npm run build` ผ่าน
- เบราว์เซอร์: B048 (ต่อกัน default) + B050 (เนื้อ 122 พยางค์โผล่) พิสูจน์แล้ว
- **ไม่แตะ SongSheet.vue** → ไม่ชน B043 เฟส 2 (merge อิสระ)

## ไฟล์ที่แก้
- `src/components/EditorMode.vue` — B048 (default flow) · B050+B051 (`barContent`)
- `src/components/EditorMode.edhead.test.js` — อัปเดต B048 default + เพิ่ม B050/B051 tests
