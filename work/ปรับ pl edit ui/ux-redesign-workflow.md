# UX Redesign — ทั้งแอปตาม user journey (world-class minimalist)

22 ก.ค. 2026 · ตอบคำสั่งพี่เอม: "หน้าปัจจุบันไม่รองรับ best-practice user workflow — วิเคราะห์+ออกแบบใหม่ ตามมาตรฐานโลก" + favorite/playlist ไม่มี account
วิเคราะห์จากโค้ดจริง (`SongList`/`ShellBar`/`Studio`/`EditorMode`/`SongViewer`/`router`) · อ้าง file:line
คู่กับ `user-stories-AC.md` (editor) · `design-locked-final.md` (reuse map) · `docs/mission.md`

---

## 1 · ปัจจุบัน "ใช้ยาก" ยังไง (ทวนความเข้าใจ — หลักฐานจริง)

### Journey S (คนร้อง/ฟัง — ไม่รู้ดนตรี)
| # | ปัญหา | หลักฐาน | มาตรฐานโลกทำไง |
|---|---|---|---|
| S-1 | **ไม่มีปุ่มแชร์เลย** (ต้องก๊อป URL จาก address bar เอง) | ไม่พบ `navigator.share`/แชร์ ใน `src/` | Spotify/YouTube/Docs = ปุ่มแชร์/ก๊อปลิงก์ 1 แตะ |
| S-2 | **หน้าแรกโชว์ "หมวดเล่ม" ไม่ใช่เพลง** — ต้องรู้ก่อนว่าเพลงอยู่เล่มไหน + คลิกเพิ่ม | `SongList.vue:224-238` (เห็น category ก่อน เพลงโผล่หลังแตะ) | Spotify/Apple = นำด้วย content (ล่าสุด/นิยม/ทั้งหมด) |
| S-3 | **placeholder ค้นหา = ศัพท์ผู้เชี่ยวชาญ** "ค้นหา: ...คีย์ หรือโน้ตตัวเลข (เช่น 5 5 6 1)" ยาว ล้นมือถือ | `SongList.vue:132` | สั้น เป็นคน: "ค้นหาเพลง" |
| S-4 | **ปุ่มพิมพ์ซ่อน + ผูกโหมด** · 2 โหมดอ่าน (ฝึกร้อง/แผ่นเพลง) มือใหม่แยกไม่ออกว่าต่างยังไง | `Studio.vue:190-191,258` | พิมพ์ = action ชัด ไม่ใช่โหมดคู่ขนาน |
| S-5 | **โชว์โหมด "แก้ไข" ให้คนที่แก้ไม่ได้** (anon เข้า editor ได้ แต่ save ไม่ได้ = ทางตัน) | `Studio.vue:316-328` ไม่มี v-if tier · save `hidden:!loggedIn` | ซ่อน affordance จนกว่าจะทำได้ |
| S-6 | **ปุ่มเล่นจมอยู่ใน dock หนัก** (display/sound/ensemble/instrument/style/chord/key/tempo + transport) · โหมดชื่อ "ฝึกร้อง" ไม่ใช่ "ฟัง/เล่น" | `SongViewer.vue:507-551` | นำด้วย Play เดียว · advanced ซ่อนหลัง popover |

### Journey M (คนทำเพลง)
| # | ปัญหา | หลักฐาน |
|---|---|---|
| **M-1** 🔴 | **"สร้างเพลงใหม่" หาแทบไม่เจอ** — ลิงก์ไป `/studio` มีที่เดียวคือ *ในเนื้อความหน้า About* · ต้องเปิดเพลงเก่าก่อนถึงเจอปุ่มสร้าง | `About.vue:82` · `Studio.vue:284,301` (ปุ่มสร้างอยู่ในพาเนล "เพลง▾" ที่โผล่เฉพาะโหมดไม่ใช่ edit) |
| **M-2** 🔴 | **"เพลง▾" ทำ 2 งานปนกัน** (สร้างใหม่ + ค้น/เปิดเก่า) = "ปุ่มเพลงที่งง" ที่พี่พูดถึงเป๊ะ | `Studio.vue:301-313` |
| M-3 | **มี song picker คนละตัวตามโหมด** (view=เพลง▾ · edit=จัดการ▾+ปุ่มในตัว editor) = mental model ไม่นิ่ง | `Studio.vue:284` vs `EditorMode.vue:2642-2668` |
| M-4 | **ปุ่มหลักเปลี่ยนความหมายได้ 5 แบบ** (อนุมัติร่าง/ส่งตรวจ/เผยแพร่ฉัน/⚠️ทับ/เผยแพร่) ติดกับ "บันทึกร่าง" หน้าตาคล้าย | `EditorMode.vue:1950-1963,2007` |
| M-5 | **จอแก้ปุ่มเยอะมาก** (rail + settings 8 ช่อง + edhead toolbar + คีย์ 21 ปุ่ม + per-note/syllable + dock) · ศัพท์ดนตรีเยอะ · progressive disclosure น้อย | `EditorMode.vue:2683-2878, 936` |
| M-6 | **ไม่มี autosave** — พึ่ง "บันทึกร่าง" ที่ต้องจำกด · ลืม = เตือนตอนออกอย่างเดียว | `EditorMode.vue:42-43,1889` |
| M-7 | **สถานะงาน (ร่าง/รอตรวจ) ลึก 2 เมนู** ใต้ "จัดการ▾" ไม่ใช่ "งานของฉัน" | `EditorMode.vue:2663,3407` |

### Cross-cutting
- **หน้าเพลง = 20+ ปุ่มค้างพร้อมกัน** (shell 7 + เพลง▾ + 3 โหมด + dock 8-10) — ตรงข้าม minimalist
- 🔍 ใน shell **ซ้ำซ้อน** (ไม่เปิดค้นหา แค่กลับหน้าแรก focus ช่องเดิม) `ShellBar.vue:121-128`
- `DownloadTool`/`FontTool` = **dead code ไม่ได้ mount** (เหลือแต่ test stub) — ยืนยันก่อนพึ่ง

### ✅ ของดี เก็บไว้
bookshelf เรียบ 1 คอลัมน์ · search override เป็นผลเดียว · public เห็นแค่ verified · tap-syllable-seek · login dropdown แบบ GitHub · review banner inline · new-ท่อน inherit ทำนอง · live beat validation

---

## 2 · Redesign — world-class minimalist ตาม 2 journey

### หลัก IA: นำด้วยงาน (task-first) ไม่ใช่ taxonomy · โชว์ของที่ใช้บ่อย ซ่อนที่เหลือ (mission: Google-Docs-clean)

### Journey S ใหม่ (ฟัง/ฝึกร้อง)
1. **หน้าแรก = นำด้วยเพลง + ค้นหา** — ช่องค้นสั้น "ค้นหาเพลง" + รายการเพลง (ล่าสุด/ทั้งหมด/favorite) เห็นเลย · เล่ม/หมวด = ตัวกรองรอง ไม่ใช่ด่านแรก [แก้ S-2,S-3]
2. **หน้าเพลง = Play เด่นชัดปุ่มเดียว** — advanced (เสียง/ensemble/instrument/style) ซ่อนหลัง popover "เสียง" · key/ตัวใหญ่ = ปุ่มเร็ว [แก้ S-6]
3. **ปุ่มแชร์ + QR** 1 แตะ (ก๊อปลิงก์/QR เปิดออฟไลน์) [แก้ S-1 · = แกน #1 ของ G]
4. **ฝึกร้อง = default: เลื่อนต่อเนื่องยาว** (กางเส้นตรง ไม่วกท่อน) · **พิมพ์ = compact แบบโบสถ์ + preview ก่อน** [ความเห็นพี่ line 85 · reuse `resolvePlayOrder` strophic + print compact]
5. **ดินสอ = affordance บาง ๆ** (เปิดทุก tier ตาม mission) ไม่ใช่โหมด "แก้ไข" คู่ขนานที่โชว์ให้คนฟัง [แก้ S-5]

### Journey M ใหม่ (ทำ/แก้/บันทึก/ส่งตรวจ)
1. **"＋ สร้างเพลงใหม่" = ปุ่มหลักเห็นชัด** บนหน้าแรก + shell — แยกจาก "เปิด/ค้นเพลงเก่า" (คนละปุ่ม คนละเจตนา) [แก้ M-1,M-2 · หัวใจที่พี่ชี้]
2. **song picker ตัวเดียว สม่ำเสมอทุกโหมด** [แก้ M-3]
3. **autosave ร่าง** (หรือสถานะ save ชัดตลอด) [แก้ M-6]
4. **"งานของฉัน" ป้ายชัด** (ร่าง/รอตรวจ/ส่งกลับ/อนุมัติ) ไม่ซ่อนใต้ "จัดการ" [แก้ M-7]
5. **บันทึกร่าง vs ส่งตรวจ แยกชัด** (คนละน้ำหนัก/สี) [แก้ M-4]
6. **editor = progressive disclosure** (inline + selection-driven จาก US EPIC B/C) — ง่าย default, pro ลึกเมื่อเรียก [แก้ M-5]

---

## 3 · favorite + playlist ไม่มี account (ความเห็นพี่ line 87)

**กลไก:** `localStorage` ต่อเครื่อง (favorite = เซ็ต id · playlist = ลิสต์ id + ชื่อ) — ไม่ล็อกอิน ตรง mission
**พกพา/ข้ามเครื่อง (ไม่มี account):**
- **แชร์เป็น URL/QR ที่ encode ลิสต์** (ดีสุด — ไม่มีไฟล์แนบ กดลิงก์เปิดได้เลย) · เหมาะ playlist สั้น
- **export/import config file** (JSON) — ส่งอีเมลถึงตัวเอง/เพื่อน · กดไฟล์ → เปิดหน้าเดิม restore [ตามที่พี่คุยกับ G] · เหมาะลิสต์ยาว/สำรอง
- **แนะนำ:** localStorage เป็นหลัก + ปุ่ม "แชร์ลิสต์" (ลิงก์/QR) + "สำรอง/นำเข้า" (ไฟล์) — reuse `jsonIO.js` ที่มีอยู่
**ออกแบบเผื่อ:** playlist = ตัวต่อยอด duo cello+piano + ฟังต่อเนื่อง (แกน #2 ของ G) · favorite ดาว 1 แตะบนการ์ดเพลง/หน้าเพลง

---

## 4 · ความเห็นพี่ในไฟล์ US — ตอบ/ยืนยันเข้าใจ

- **AC-B2.2 (พิมพ์เนื้อ):** ✅ เข้าใจตรงพี่ — **ถ้าแก้ inline แบบ Word ได้ ก็ไม่ต้องมีกล่องแยก**: paste ประโยคยาว → **กด space แยกพยางค์ + ripple** ทีละตัว = ง่าย+กระชับสุด (= มาตรฐานโลก space=พยางค์ถัดไป). ⚠️ จุดที่ต้องระวัง: **ไทยไม่เว้นวรรคระหว่างพยางค์** → paste ไทยดิบ space auto-split ไม่ได้ ต้องให้ผู้ใช้ใส่ช่องว่าง/`-` เอง (หรือมีตัวช่วยตัดพยางค์ไทย). **แนะนำ:** inline เป็นหลัก + เก็บ "ตัวช่วยวางเนื้อทั้งท่อน" (reuse bulk textarea `EditorMode:618`) ไว้เป็น optional สำหรับ paste ยาว ๆ ที่ pre-split ด้วย space แล้วยืนยันก่อน apply — ได้ทั้ง 2 แบบ ไม่บังคับ
- **AC-C1.3 (popup):** ✅ popup ต้อง **ขยับอัตโนมัติไม่บังสิ่งที่พิมพ์/ต้องเห็น** (smart-position คำนวณ bounding box · เลื่อนตาม cursor) — เพิ่มเป็น AC บังคับ
- **US-C2 (คีย์บอร์ด):** ✅ desktop **กดคีย์ปกติใส่สัญลักษณ์ได้ตรง ๆ** (keyboard shortcut: # / จุด octave / ฯลฯ) ควบคู่ popup — เพิ่ม AC
- **US-D1 (bidirectional):** ✅ คนรู้ดนตรี **ใส่สัญลักษณ์เอง → Drawer โครงสร้างอัปเดตอัตโนมัติ** (2 ทาง) · ตรงไอเดีย "2 โหมด sync" ของพี่
- **US-D1 (auto-validate):** ✅ ใส่สัญลักษณ์ผิดเงื่อนไข → **เตือนอัตโนมัติ + บอกเหตุ** (ต่อห้อง/ภาพรวม ตามการนับสากล) · **ของเดิมมี `notationLint.js` + `beatCount` + live beat validation (`EditorMode:923`) แล้ว** → ต่อยอดให้โผล่ที่ Drawer ด้วย

---

## 4.5 · หัว sheet + เลขห้อง (พี่เปา + พี่เอม 22 ก.ค. · ตรวจโค้ดแล้ว = ยังไม่มีทั้งคู่)

**สถานะจริง:** `SongSheet.vue` มีแค่ชื่อเพลงตอนพิมพ์ (`sheet-print-title:377` โชว์เฉพาะกระดาษ) · **ไม่มีหัว key/tempo/จังหวะ/ผู้แต่ง · ไม่มีเลขห้อง** → net-new ทั้งคู่ (ข้อมูลมีครบใน model: `content.key`/`timeSignature` · tempo · composer)

### หัว sheet ครบ (ตามภาพ DomiSol)
- AC: หัวแสดง **ชื่อเพลง · ผู้แต่ง · ป้าย notation (JIANPU/เลข↔solfa) · Key (1=C) · จังหวะ (4/4) · ความเร็ว (♩=108)** — ทั้งบนจอ (ฝึกร้อง) + ตอนพิมพ์ · สะอาด world-class · light/dark
- reuse: `chords.js KEYS` · `TIME_SIGNATURES` · `midi TEMPO_MARKS` · composer field · displayKey (โชว์คีย์ที่ transpose แล้ว)

### เลขห้อง — ✅ เคาะแล้ว 22 ก.ค.: เลขล้วน (5) ทุกห้อง แบบจาง + "ทั้งหมด" ในหัว sheet + toggle เฉพาะหัวบรรทัด
**(เดิมเป็นข้อถก พี่เปา: หัวบรรทัด · พี่เอม: ทุกห้อง — สรุปเอาตามคำแนะนำ SA ด้านล่าง)**
- **default = เลขห้องทุกห้อง แบบจาง/เล็ก** (สีจางเหนือเส้นห้อง แบบ DomiSol) — ตอบโจทย์ "อ้างอิงง่าย" ของพี่เอม + ช่วย dummies ชี้ห้องได้ · จางพอไม่กวนสายตา (พี่เปาน่ารับได้)
- **โชว์เลขล้วน (5) ไม่ใช่ 5/8** — เพราะ n/total ทุกห้อง = รก + ไม่ใช่มาตรฐานโน้ต · **"ทั้งหมด" โชว์ครั้งเดียวในหัว sheet** ("8 ห้อง" แบบ DomiSol "8 measures") → ได้ทั้ง reference + สะอาด
- **+ toggle "เฉพาะหัวบรรทัด"** (แบบพี่เปา = engraving norm) เผื่อใครชอบสะอาดกว่า · world-class apps (MuseScore) ตั้งได้: ทุกห้อง / ทุก N / หัว system
- ⚠️ ถ้าพี่เอมยืนยันอยาก n/total ทุกห้องจริง ทำได้ — แต่ผมแนะนำเลขล้วน+total-ในหัว (เคาะ)

---

## 5 · การตัดสินใจ (P'Aim เคาะ 22 ก.ค.)

1. **ลำดับ: inline edit ก่อน (ด่วน) · UX/journey redesign ทีหลัง** — "ระบบเดิมใช้ได้อยู่ ขาดแค่ flow control สำคัญ → แก้ inline edit ด่วนกว่า · พอนิ่ง+ดีค่อย optimize UX ตาม user journey" → **priority: EPIC A→B→C (inline) ก่อน · redesign find/create/nav ทีหลัง**
2. **lyric: inline เป็นหลัก** — กด space แยกพยางค์ inline ได้ = ไม่ต่างจากมีกล่องแยก · **ถ้า inline (แทรก/ลบ) ทำดี ก็ไม่ต้องมีกล่องแยก** → เล็ง inline-only · กล่องแยก = fallback เท่านั้น
3. **autosave: (ตรวจแล้ว) ไม่มี autosave ตัวเพลง** — มีแค่ undo + เตือนตอนออก + บันทึกร่างมือ · Tier 0 ไม่มี → งาน = **ป้ายสถานะบันทึกชัด** + (ควรเพิ่ม) autosave/localStorage working-copy
4. **favorite/playlist: ไม่มี account · ไม่เก็บข้อมูลส่วนบุคคล (hard constraint)** — localStorage ต่อเครื่อง + **ส่ง config file ทาง email (กรอกอีเมลเองทุกครั้ง ไม่เก็บ)** [แผนเดิมพี่+G] · **URL/QR share = เพิ่มได้** (แชร์ง่าย · ลองตามที่แนะนำ) · reuse `jsonIO.js`

**ทำต่อ:** สาย 2 (find/create/nav · share/QR · favorite/playlist) แตกเป็น US เก็บไว้ · **ลงมือ inline edit (EPIC A/B) ก่อน** — resolve write-path (ยก `setSyl`/`pushSlot`/`pullSlot` เป็น lib กลางให้ reader-edit ใช้) → step B พิมพ์ 1-7


- redesign นี้ = **สายที่ 2 (whole-app shell/nav/home)** คู่ขนานกับ editor inline (US EPIC A-D) · ต้องจัดลำดับ: แก้ nav/home/create-flow (M-1/M-2 = เจ็บสุด) ก่อน หรือ editor inline ก่อน?
- favorite/playlist: เอา URL/QR หรือ email-file เป็นหลัก? (ผมแนะนำ localStorage + ทั้งคู่)
- ต่อไป: ผมจะแตกเป็น US เพิ่ม (EPIC G: find/create/nav · EPIC H: share/QR · EPIC I: favorite/playlist) + DS ตาม → traceability ครบ
