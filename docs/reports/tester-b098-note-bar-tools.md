# Tester gate — B098: แยกเครื่องมือ "โน้ต" กับ "ห้อง (bar)" — คัดลอก/ลบ ครบ 4 + auto-focus เพิ่มห้อง

**ผล: ✅ PASS (ทุก gate)** · ผ่านด่านตรวจอิสระ → PM cherry-pick `3a934a4` + `b79cd37` ได้
**branch ที่ตรวจ:** `b098-note-bar-tools` @ `abaee1d` (code = `3a934a4` + `b79cd37`, แตกจาก `studio-shell-redesign`)
**tester worktree:** `C:\gl\krisada\pleng-t-b098` (detached @ `abaee1d`) · แยก dev worktree · ตรวจเองครบ ไม่ rubber-stamp
**Network URL (dev server ตัวเอง `--host`):** http://10.152.249.98:5390/ → หน้าแก้ไข `/#/studio`

---

## Gate 1 — รั้วไฟล์ (fence): ✅ PASS
`git diff --stat studio-shell-redesign..b098-note-bar-tools` → โค้ดแตะแค่:
- `src/components/EditorMode.vue`
- `src/components/EditorMode.note-bar-tools.test.js` (test ใหม่)

(อีก 2 ไฟล์ในสาขา = `docs/pm/board.md` + `docs/reports/b098-note-bar-tools.md` เป็น docs · **PM cherry-pick แค่ 2 code commit** ซึ่ง fence สะอาดทั้งคู่: `3a934a4` = EditorMode.vue + test · `b79cd37` = EditorMode.vue + test) — ไม่หลุดรั้ว

## Gate 2 — test + build: ✅ PASS
- `npx vitest run` → **382 passed / 43 files ผ่าน** · "1 failed file" = `notationLint.test.mjs` (`process.exit("0")`) = quirk เดิม ไม่ใช่บั๊กงานนี้
- `npm run build` → ✓ built in 2.54s
- test เฉพาะ: `EditorMode.note-bar-tools.test.js` (8 เคส) + `EditorMode.bar-tools.test.js` (B092, 4 เคส) = **12 passed**
- **ตรวจว่า test จริงไม่กลวง:** assert DOM สด (`segCount` นับ `.seg-col`/bar · `barCount` นับ `.seg-strip` · `activeElement.classList`/`data-bar`) ครบทั้ง 4 สโคป + สโคปแยกกายภาพ (note tools ∈ `.seg-col`, bar tools ∉ `.seg-col`) + ลบโน้ตตัวสุดท้าย=ห้องอยู่ + auto-focus (activeElement=note-box ห้องใหม่ `0-2`, ไม่ใช่ปุ่ม `.add`) — ครอบตรงตาม requirement

## Gate 3 — Tier-B เบราว์เซอร์จริง (คลิกปุ่มจริง เรียก @click handler จริง · อ่าน DOM สด): ✅ PASS
ทดสอบบน dev server ของ tester เอง (พอร์ต 5390) · build stamp footer = `abaee1d*` ตรงสาขา

| การกระทำ | ก่อน | หลัง | ผล |
|---|---|---|---|
| **คัดลอกโน้ต** | 1 ห้อง · โน้ต 1 | 1 ห้อง · โน้ต **2** | โน้ตเพิ่มในห้องเดิม · ห้องไม่เพิ่ม ✓ |
| **ลบโน้ต** | 1 ห้อง · โน้ต 2 | 1 ห้อง · โน้ต **1** | **ห้องยังอยู่** ✓ |
| **ลบโน้ตตัวสุดท้าย** | 1 ห้อง · โน้ต 1 | 1 ห้อง · โน้ต 1 (reset ว่าง) | ลบโน้ตไม่มีทางลบทั้งห้อง ✓ |
| **คัดลอกห้อง** | **1** ห้อง | **2** ห้อง | ได้ทั้งห้องใหม่ ✓ |
| **ลบห้อง** | **2** ห้อง | **1** ห้อง | **ทั้งห้องหาย** ✓ |

**สโคปถูกต้องครบ:** ลบโน้ต = ห้องยังอยู่ · ลบห้อง = ทั้งห้องหาย — 2 ระดับแยกกันจริง (ปุ่มโน้ต `คัดลอกโน้ตนี้`/`ลบโน้ตนี้` ใต้คอลัมน์โน้ต · ปุ่มห้อง `ทำสำเนาห้องนี้`/`ลบห้องนี้` ที่ตีนห้อง)

**Auto-focus (เพิ่มเติม P'Aim 12 ก.ค.):** ✅ กด "เพิ่มห้อง" → ห้อง 1→2 · `document.activeElement` = `INPUT.note-box` ในห้องใหม่ (`data-bar="0-1"`, **ไม่ใช่** ปุ่ม `.add`/`+`) · พิมพ์ "5" เข้าช่องนั้นได้ทันที **โดยไม่ต้องคลิก** → ค่า note-box = "5" ยืนยัน

**มือถือ 375px (B092 คงเดิม):** ✅
- `.seg-tools` (คัดลอก/ลบ โน้ต) = `display:flex` · opacity 1 (โชว์บน touch) · ปุ่มโน้ต 44×44px (touch-min)
- ปุ่มคัดลอก/ลบ **ห้อง** ที่ตีนห้อง (`.bar-act-wide`) = `display:none` → พับเข้า ⋯
- เปิด ⋯ → เจอ `⧉ สำเนาห้อง` + `✕ ลบห้อง` (display:block) ครบ ตาม B092

**Console:** ไม่มี error

_หมายเหตุ: `computer screenshot` MCP time out ทุกครั้ง (เครื่องมือ flaky ที่โปรเจกต์บันทึกไว้) — ใช้ DOM/JS query เป็นหลักฐานแทน ซึ่งแม่นกว่าและครอบทุก assertion._

## สรุป
ครบ requirement: 2 ระดับชัด · 4 การกระทำสโคปถูก (ลบโน้ต≠ลบห้อง) · auto-focus พิมพ์ต่อได้ทันที · B092 มือถือคงเดิม · test ไม่กลวง · build ผ่าน
➡️ **PASS — PM cherry-pick `3a934a4` + `b79cd37` เข้าฐานได้** (tester ไม่ merge/ไม่ deploy)
