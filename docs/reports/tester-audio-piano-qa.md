# Tester QA gate — "ทำเพลงให้เพราะ" (เปียโนเดี่ยว · Grand-only)

**สาย:** Tester (QA gate · สายเสียง) · **branch:** `claude/blissful-rosalind-613f3e`
**ตรวจที่ HEAD:** `947d5bf` (⚠️ ขยับจาก `0cdfb0f` ตอน dispatch — ดู §Scope flags)
**SSOT ที่เทียบ:** `docs/reports/audio-piano-quality-audit.md` §IMPLEMENTED (4 เทคนิค + pedal)
**วิธี:** อ่านโค้ดจริง + unit tests + build + **วัด peak เสียงจริงบน browser (ScriptProcessorNode tap บน AudioContext จริง — เล่นเพลง #1 "พระเจ้าเป็นความรัก" bpm 102, 122 โน้ต)** ไม่ใช่ "fire ไม่ error"

---

## F60+ (อ่าน 30 วิ)

**ทุก AC ที่ได้รับให้ตรวจ = 🟢 PASS** (4 เทคนิค + pedal + no-regress + real-audio ทุกโหมด audible). โค้ดถูกต้องตามสเปกเป๊ะ: BPM-auto สลับสไตล์ถูกขั้ว, sparkle เบากว่าทำนอง 30% เป๊ะ + สไลเดอร์โผล่เฉพาะบรรเลง, rubato ยืดปลายท่อน**จริง** (ไม่ยืดโน้ตยาวสุ่ม) + grid ไม่ดริฟต์, ทุกโหมด peak>0 + ไม่มี console error, 569 tests เขียว + build ผ่าน.

**แต่ 2 เรื่อง PM ต้องเคาะก่อน deploy (ไม่ใช่ FAIL — เกินขอบสิ่งที่ผมตัดสินได้):**
1. **มีเทคนิคที่ 5 "ท่อนรับแตกคอร์ด" (`947d5bf`) ลงหลัง dispatch + นอก §IMPLEMENTED/AC** — board เอง flag ⛔ HOLD deploy รอ P'Aim ฟังชุดใหม่. ผม verify ว่ามันทำงาน (ท่อนรับถี่ 1.93×) + มี test + audible **แต่ไม่รับรองเทียบเจตนา P'Aim** (ไม่มี AC ให้เทียบ + สถานะ "P'Aim ฟังจบ" ยังไม่ยืนยันถึง PM).
2. **branch fork จาก studio-shell เก่า (`8b15299`) · base ตอนนี้ `8d6eaae`** — ตามหลัง base หลาย commit (merge-base สะอาด, FF ได้). ควร sync base→branch ก่อน merge/deploy.

---

## ตาราง AC → PASS/FAIL

| # | AC | ผล | หลักฐาน |
|---|---|---|---|
| ① | BPM-auto style: เปิดครั้งแรก auto เลือก บรรเลง(<92)/สงบ(≥92) + ไฮไลต์ปุ่มตรง + กดทับได้ + persist | 🟢 **PASS** | `recommendRecipe`: bpm67→บรรเลง, 91→บรรเลง, **92→สงบ**, 145→สงบ (boundary `<92` ตรงสเปก) · `effectiveStyle = styleAuto ? recommended : playStyle` [SongViewer.vue:67] · `setPlayStyle`→`styleAuto=false` + persist (`pleng.playStyle`='calm' หลัง watcher flush) |
| ② | Pulse & Contour (มีอยู่แล้ว คงเดิม) | 🟢 **PASS** | dynamics.js ±6%/±12ms + accent + contour คงเดิม · humanize เรียกทุกครั้ง arranger เปิด [index.js:137] |
| ③ | Sparkle −30% gain ผูกทำนอง + สไลเดอร์สด 30–90% โผล่เฉพาะบรรเลง + default 70% | 🟢 **PASS** | gain = `MEL_BASE(0.35) × 0.7 = 0.245` = **30% ใต้ทำนองเป๊ะ** [embellish.js:31] · slider min30/max90/step5 + `showSparkle = effectiveStyle==='arrangement'` [SongViewer.vue:77,509] (โหมดอื่นไม่โผล่) · clamp 0.3–0.9 · persist `pleng.sparkleLevel` |
| ④ | Rubato: ยืดปลายท่อน ×1.12 + หายใจท่อนใหม่ +60ms + grid ไม่ดริฟต์ + ผูก section จริง | 🟢 **PASS** | ปลายท่อน+โน้ตจบเพลง beats×1.12 · **โน้ตยาว 3 บีตที่ไม่ใช่ปลายท่อน = ไม่ยืด** (แก้บั๊กเก่า "ทริกจากโน้ตยาว") · breath `next.timeShift+=0.06`(60ms) · **startBeat ทุกตัวเท่าเดิม** (scheduler onset = `startBeat*spb` สัมบูรณ์ ไม่สะสม [midi.js:545]) · เพลง #1 มี 2 ท่อนจริง ("ร้อง 1"/"รับ") |
| — | เบส pedal อุ้มในโหมดบรรเลง | 🟢 **PASS** | `piano-arrangement.cfg.bass = 'pedal'` [presets.js:45] |

## AC⑤ — วัด peak เสียงจริงต่อโหมด (real audio · ScriptProcessorNode)

เพลง #1 · หน้าต่างวัด 6 วิแรก · samples grand โหลดครบก่อนวัด · **ทุกโหมด peak>0 = audible · ไม่มี console error · เล่นผ่านจบ**

| โหมด | peak (วัดเอง) | SA อ้าง | ผล |
|---|---|---|---|
| บรรเลง (arrangement) | **0.397** | 0.334 | 🟢 audible |
| สงบ + rubato (calm) | **0.364** | 0.247 | 🟢 audible |
| เดี่ยว (melody · ตรงโน้ต) | **0.379** | — | 🟢 audible (ไม่ regress) |
| คอร์ดเดี่ยว (ตรงโน้ต) | **0.251** | — | 🟢 audible + เล่นตรงคอร์ด (arranger off) |
| เต็มวง (ensemble) | **0.396** | — | 🟢 audible (ไม่ regress) |

**หมายเหตุค่าต่างจาก SA:** ค่าผมสูงกว่า (เช่น สงบ 0.364 vs 0.247) เพราะ peak = ยอดคลื่นสูงสุดในหน้าต่างวัด → ขึ้นกับช่วง/โน้ตที่บังเอิญดังในหน้าต่างนั้น + ตอน samples โหลดครบ. **ไม่ใช่ FAIL** — เกณฑ์ gate = audible + เล่นถูก + ไม่ regress ผ่านครบ. (ถ้า PM อยากได้ตัวเลขตรงกัน ต้องนัด method เดียวกัน เช่น full-song peak.)

## AC⑥ — ไม่ regress (tests + build)

- **569 unit tests เขียว** (บน HEAD `947d5bf`) · arranger **52** (รวม +4 tests ของ refrain) · midi/transport/viewer/export/store/notation ครบ
- `notationLint.test.mjs` = **72 passed, 0 failed** · suite แสดง "FAIL" เพราะ `process.exit(0)` ใน test file (pre-existing artifact) — **ไม่นับ ตามสเปก**
- **build ผ่าน** (140 modules · 1.9s · font/chunk warnings = pre-existing)

---

## เพิ่มเติม (นอก AC · เทคนิคที่ 5 — verify ให้ PM แต่ไม่รับรองเจตนา)

**`947d5bf` "ท่อนรับแตกคอร์ด"** — comp pattern ใหม่ `arpeggioDense` (2 hits/บีต) เล่นเฉพาะ section ที่ `isRefrain` ในโหมดบรรเลง:
- ✅ ทำงานจริง: เพลง #1 ท่อนรับ **1.99 comp/บีต** vs ท่อนร้อง **1.03** = **1.93× ถี่กว่า** (ตามดีไซน์ 2×)
- ✅ โหมดสงบ/plain ไม่มี `refrainPattern` → ไม่ยิง (ถูก)
- ✅ ไม่มี section / ไม่มี refrainPattern → fallback comp ปกติ (มี test)
- ⚠️ **แต่ไม่มี AC/สเปกให้เทียบ + สถานะ P'Aim-listen ยังไม่ยืนยันถึง PM** → gate ข้อนี้ = "functions + no-regress" เท่านั้น, **ไม่รับรองว่าตรงเจตนา** — PM/P'Aim เคาะ

---

## 🚩 Scope / process flags (PM ตัดสิน — ผมไม่ตัดสินแทน)

1. **branch ขยับหลัง dispatch:** dispatch @ `0cdfb0f` (4 เทคนิค) → ปัจจุบัน `947d5bf` (+เทคนิคที่ 5). board.md flag เอง: **⛔ HOLD deploy · P'Aim ขอเพิ่มท่อนรับเข้า batch · gate ทั้งชุดรอบใหม่**. ผลตรวจนี้ครอบคลุมทั้ง `947d5bf` แล้ว (tests/build/audio รวมท่อนรับ) — **ถ้า P'Aim ยืนยันฟังจบ ผ่าน gate ได้เลย ไม่ต้องรอบใหม่**; ถ้ายังไม่ฟัง = รอ P'Aim.
2. **fork เก่า:** merge-base `8b15299` ≠ base HEAD `8d6eaae` → ตามหลัง base. FF/3-way สะอาด แต่ควร sync ก่อน merge เพื่อกันของเก่า.
3. **peak ต่างจาก SA** (ข้างบน) — method difference, ไม่ใช่ FAIL.
4. **ยังไม่ merge/deploy** — SA ไม่แตะ base (ถูกต้อง) · PM only.

**สรุป gate:** โค้ดบน `947d5bf` **PASS ทุก AC + ไม่ regress + audible ทุกโหมด**. เหลือแค่การตัดสินใจ scope/deploy (เทคนิคที่ 5 + P'Aim listen + sync base) = **ฝั่ง PM/P'Aim**.
