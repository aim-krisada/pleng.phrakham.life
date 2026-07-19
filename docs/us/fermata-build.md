# BUILD brief — เฟอร์มาต้า: หน่วงเสียงตั้งค่าได้ (full-stack · 1 session ทำครบ)

**โมเดล (P'Aim 18 ก.ค.):** 1 session = 1 feature = **full-stack (SA+UX+UI+dev เจ้าของคนเดียว end-to-end)**
**เอกสารส่งต่อในตัว** — อ่านไฟล์นี้ไฟล์เดียว + ดึง design เดิม 2 ใบ (commit ด้านล่าง) ทำต่อได้ทันที
**สั่งโดย:** PM (pl pm29) · 2026-07-19

---

## 0 · งานนี้คืออะไร (1 ประโยค)
เฟอร์มาต้า `𝄐` ตอนนี้เล่นแล้ว **จังหวะเพี้ยน ห้องถัดไปเข้าไม่ตรง** เพราะโค้ดคูณค่าคงที่ `1.75` แก้ไม่ได้ → ทำให้ **ค่าหน่วงปรับได้ต่อโน้ต · ระบบแนะนำค่าให้ก่อน · แก้เอง+ฟังทันที · เก็บค่า · playback กับแผ่นตรงกันจากค่าเดียว**

## 1 · ⚠️ ฐาน + host (จุดที่ต้องแก้ก่อน — สำคัญสุด)
- **base = รอบ 30 `2f4177e`** (= live ปัจจุบัน · นิ่ง) — **branch จากตรงนี้** (ห้าม branch จาก `studio-shell-redesign`/รอบ 31 ที่มี dock-space ที่ทิ้งแล้ว)
- 🔴 **host ต้องเปลี่ยน:** design UX เดิมวางตัวคุมบน **contextual toolbox ของ dock-space (รอบ 31 · ถูก rollback แล้ว)** → **รอบ 30 ไม่มีแถบนี้** → **ย้าย host เป็น chip/แถบ "ค้าง" ใต้โน้ตเฟอร์มาต้าที่โฟกัส** (attach point ที่รอบ 30 มีจริง)
  - **verify ก่อนสร้าง:** เปิด `EditorMode.vue` บน `2f4177e` หา attach point จริงของ "โน้ตที่โฟกัส" → วาง chip **ใต้โน้ต · ไม่บังโน้ต/คอร์ด · clamp ในจอ · โผล่เหนือแป้นพิมพ์ (มือถือ)**
  - คงเจตนา UX เดิมทุกอย่าง (stepper 44px · แถบเห็นภาพ · ▶ฟัง · ↺แนะนำ) — เปลี่ยนแค่ "ที่เกาะ"

## 2 · 🎯 CORE SPEC (P'Aim ฟันธง · ยึดเป๊ะ)
- เฟอร์มาต้า = **ค่าปรับได้ค่าเดียว/โน้ต**
- **ค่าเดียวคุมทั้ง playback + แผ่นเพลง** ให้ตรงกัน
- **ค่าเริ่มต้น = ระบบแนะนำ · ปรับแล้ว = เก็บค่าใหม่** (จำ+ใช้)
- **หน้าแก้ไข = โชว์ค่า · แผ่นพิมพ์ = โชว์แค่สัญลักษณ์** (ไม่มีตัวเลขดิบ)

## 3 · data model (ยึด SA `ffb845a:docs/reports/fermata-design-sa.md`)
- **เก็บ hold = จำนวนบีตสัมบูรณ์ที่เพิ่ม** (ไม่ใช่ตัวคูณ · ไม่ใช่ formula สด) — materialize เป็นเลขจริงตอนใส่
- **เก็บที่ฟิลด์ `holds` แยกบน segment · key = index โน้ตในเซกเมนต์** (❌ ห้ามยัดใน note string — `5^2` ชนกับโน้ตถัดไป)
  ```jsonc
  { "type":"segment", "note":"5^ 3 2", "chord":"G", "holds": { "0": 2 } }
  ```
- `holds[i]` = แหล่งเดียว อ่านโดยทั้ง `midi.js` (playback) และ `SongSheet.vue` (สัญลักษณ์) → ตรงกันเสมอ
- **backward-compat:** เพลงเก่ามี `^` ไม่มี `holds` → auto-suggest ตอนแก้ครั้งแรก · **ไม่ต้อง migrate ทั้งคลัง**

## 4 · ค่าเริ่มต้น (auto-suggest) — 🟢 ยึด "เติมจนจบห้อง" (PM ฟันธง · ปฏิเสธ ×2.0 ของ Gemini)
- **default = "เติมจนจบห้องของโน้ตเฟอร์มาต้า"** → โน้ตถัดไปตกดาวน์บีตห้องถัดไปพอดี = **แก้อาการ "ห้องหลุด/ร้องกลับไม่พร้อม" ตรงจุด**
- **fallback = ~2× ค่าโน้ต** ถ้าเฟอร์มาต้า **ไม่ใช่โน้ตท้ายห้อง** (เช็ก position ก่อนใช้ heuristic — SA §5 edge case)
- step ปรับ = **0.5 บีต** · min = 0.5 · ไม่มี max แข็ง แต่เตือนนุ่ม/หยุดเพิ่มเมื่อ > ~2 ห้อง
- **ทำไมไม่ใช้ ×2.0 คงที่ (Gemini เชียร์):** ×2.0 ไม่การันตีว่าโน้ตจบหัวห้องถัดไป → อาการเดิมไม่หาย · Gemini ไม่รู้บริบท sequential playback + congregational restart ของ pleng · ของเรา (bar-fill) แก้ตรงโจทย์ + ยัง honest-to-sheet เท่ากัน · Gemini ยืนยันแค่ "มี default + แก้ได้ = ถูกทาง" (ตรงกับเรา)

## 5 · playback (`midi.js`) — ตัวแก้อาการ
- แทน `if(t.fermata) d *= 1.75` → `d = base + holdFor(seg, tokenIdx)` (ไม่มีค่า = ใช้ auto-suggest)
- 🔴 **invariant:** `beatCount`/bar-math **ไม่แตะ hold** — ห้องยังนับตาม time signature (ห้ามให้ห้องเพี้ยน) · แค่ scheduler หน่วงโน้ตถัดไปตาม duration ที่ยืด (กลไกเดิมถูกอยู่แล้ว)
- **honest-to-sheet:** ค่าที่เก็บ = ค่าที่เล่นเป๊ะ · MP3 == live (deterministic)

## 6 · แผ่นพิมพ์ (`SongSheet.vue`) — สัญลักษณ์ล้วน
- อ่าน `holds` → เรนเดอร์ **สัญลักษณ์เฟอร์มาต้า** (option: variant สั้น/ปกติ/ยาว ตามค่า — MusicXML/MuseScore) · **default = สัญลักษณ์ปกติเดี่ยว** (variant = enhancement ถ้าเวลาเหลือ)
- ❌ **ห้ามวาดโน้ตยาว/เติม `-` ตามค่า** (พังจำนวนบีตในห้อง + อ่านผิดเป็นจังหวะจริง — ผิดหลัก engraving Gould) · ❌ **ห้ามโชว์เลขดิบ**

## 7 · UI ตัวคุม (ยึด UX `74e051e:docs/reports/fermata-ui-uxui.md` · แนวทาง ค+ง · เปลี่ยนแค่ host เป็น chip ใต้โน้ต)
```
  𝄐 ค้าง   [ – ]  ▓▓▓░  2 จังหวะ  [ + ]   ▶ ฟัง   ↺ แนะนำ
```
- โผล่เมื่อ **โฟกัสโน้ตที่มีเฟอร์มาต้า** (`token.fermata`) เท่านั้น · โน้ตปกติไม่เห็น (ลด clutter)
- `[ – ][ + ]` = ลด/เพิ่ม 0.5 บีต · **44×44px** (WCAG 2.5.5) · aria "ค้างสั้นลง/ยาวขึ้น"
- `▓▓▓░ N จังหวะ` = โชว์ค่าจริง 2 ทาง (แถบเห็นภาพ + ตัวเลข) — dual-coding
- `▶ ฟัง` = เล่นเฉพาะโน้ตนั้น+หาง ด้วยค่าปัจจุบันทันที (ผูก playback ค่าใหม่) · 44px
- `↺ แนะนำ` = คืนค่าระบบแนะนำ (bar-fill) 1 แตะ
- **มือถือ:** แตะล้วน ไม่มีลาก · chip clamp ในจอ · โผล่เหนือแป้นพิมพ์ · จอ 344 = overflow-x ถ้าเบียด
- **ปรับ → เก็บ `holds[i]` ทันที** · แถบ+ตัวเลขอัปเดตสด · จำค่าที่ปรับ

## 8 · ไฟล์ที่แตะ (SA feasibility ยืนยันแล้ว)
| ไฟล์ | ทำอะไร |
|---|---|
| `notation.js` | **ไม่แตะ** (`^` parse คงเดิม) |
| `midi.js` | `holdFor()` แทน ×1.75 · thread `holds` เข้า build loop |
| `songModel.js` | ยอมรับ `holds` optional บน segment (additive) |
| `EditorMode.vue` | chip "ค้าง" ใต้โน้ต (host ใหม่) + stepper/แถบ/▶ฟัง/↺ · ผูก `holds[i]` |
| `SongSheet.vue` | อ่าน `holds` → สัญลักษณ์เฟอร์มาต้า (variant optional) · ไม่ยืดโน้ต ไม่โชว์เลข |
| migration | **ไม่ต้อง** |

## 9 · กระบวนการ (P'Aim สั่ง · ห้ามข้าม)
1. **full-stack session:** verify host จริงบน `2f4177e` → ประกอบ SA+UX → **สร้างจริงบนโค้ดจริง** (ไม่มี mockup ทิ้ง) + unit test
2. **เปิด dev server `--host`** ใส่ **Network URL `http://<IP>:<port>`** ในรายงาน (พี่เปาทดสอบมือถือจริง) — ข้อกำหนดถาวร
3. รายงาน = **session-agnostic:** (a) เขียน `docs/reports/<branch>.md` (b) เพิ่มบรรทัดใน `board.md` 📥 PM inbox (c) ping "PM session ปัจจุบัน" ที่ระบุใน `board.md §🎯`
4. **PM ให้ P'Aim ลอง preview จริง 1 ครั้ง** (ของจริงครบ ไม่ใช่ harness) → ถ้าเคาะ → **tester gate (unit+integration+device-matrix รวม Surface hover:none + mobile diff0)** → **PM gate จากหลักฐาน** → deploy (P'Aim อนุมัติ)
5. ⛔ **ไม่ merge main / ไม่ deploy / ไม่ relay P'Aim เอง** จน PM สั่ง

## 10 · กฎเหล็ก (บทเรียนสด)
- **ใช้ของเดิมเป๊ะ ห้ามทำเกิน/redesign** ที่ P'Aim ไม่ได้ขอ (SOP §6 #10)
- **ห้าม gate ด้วย `@media(hover)`/pointer-type** — Surface P'Aim รายงาน hover:none แม้ต่อเมาส์ → ตัวคุมจะหาย (burn 3 รอบ) · ใช้ Pointer Events / computed display ตรวจ
- playback ซื่อสัตย์ต่อโน้ต — แก้ค่า hold ให้ตรง ไม่ mask ([[feedback-audio-honest-to-sheet]])
- host ไม่บังโน้ต/คอร์ด (spec เด็ดขาด)

## อ้างอิง design เดิม (ดึงเต็มได้)
- SA data-model + correctness: `git show ffb845a:docs/reports/fermata-design-sa.md`
- UX UI (ตัวคุม ค+ง): `git show 74e051e:docs/reports/fermata-ui-uxui.md`
- US เดิม: `docs/us/fermata-hold.md`
