# Report — S4 Responsive polish (แผ่นเพลง + dock/แถบควบคุม)

**สาย:** dev (Surface) · **branch:** `responsive-s4` (from `studio-shell-redesign`, มี S0 tokens แล้ว) · **ห้าม merge main/deploy**
**Network URL (LAN · มือถือจริง):** `http://10.215.141.98:5340` (dev server `--host`, port 5340, config `s4`)
**ไฟล์ที่แตะ (scoped เท่านั้น · ไม่แตะ `styles.css` / `NoteRow.vue`):**
`SingTransport.vue` · `StudioDock.vue` · `DownloadTool.vue` (+ `.claude/launch.json` config `s4`)

---

## 1. ยึด token จริงจาก S0

อ่าน `docs/reports/responsive-s0.md` + `src/styles.css` `:root` — ใช้ `--touch-min: 44px`,
`--sp-*`, `--fs-*`, `--lh-*` ที่ S0 วางไว้ (ไม่แก้ `styles.css` เลย · ถ้าต้อง token ใหม่ = แจ้ง PM ตามกติกา).

## 2. สภาพก่อนแก้ — 3 คอมโพเนนต์ dock เป็น prototype ที่ P'Aim verify แล้ว (ps3-dock/B043) และ ~90–95% responsive อยู่แล้ว

layout ของ dock/transport/แผ่นเพลง responsive อยู่แล้ว (fit-content dock · overflow ⋯ · flex-wrap ·
popup viewport-clamp · แผ่นเพลง wrap ที่เส้นห้อง). **ช่องว่างจริงเทียบสเปก = touch target < 44 บนมือถือ**
(ปุ่ม dock 40 · pull-up tab 36 · ปุ่มเล่น/pin 40/36) → แก้แบบ **ผ่าตัดเฉพาะจุด** ไม่ churn layout ที่ verify แล้ว.

## 3. สิ่งที่แก้ (touch target → 44 ผ่าน `--touch-min`)

**`SingTransport.vue`** (แถบเล่นเพลง = UI หลักตอนร้องบนมือถือ):
- `.mp-grip` 40→44 · `.mp-more` 40→44 · `.mp-btn` (⏮▶⏭🔁) 40→44 (▶ play คง 50) ·
  `.mp-pbtn` / `.mp-pstep` (ปุ่มปัก คีย์/ความเร็ว/แสดงผล) 36→44 · `.mp-seltrig` (เลือกท่อน) +min-height 44 ·
  ในแผงเลือกท่อน: `.mp-ssallbtn` / `.mp-ssrow` +min-height 44

**`StudioDock.vue`** (dock กลางทุกโหมด):
- มือถือ `.sd-tbtn` 40→44 (overflow ⋯ จะพับปุ่มเกินเอง = ไม่เกิดแถบเลื่อน) · `.sd-key` (แป้นโน้ต) 40→44 ·
  `.sd-tab` (แท็บดึงขึ้นตอนหุบมือถือ) 36→44 · `.sd-foot-btn` (เสร็จ/คืนค่าในแผงตั้งค่าปุ่ม) 36→44

**`DownloadTool.vue`** (เมนูดาวน์โหลด · ไม่มี `<style>` เดิม → เพิ่ม scoped block):
- รายการเมนู min-height 44 (global padding ให้ ~40) · `.pk-tool-menu` max-width `calc(100vw - var(--sp-4))`
  กันหลุดขอบจอแคบ (ตัว `.pk-tool-btn` เป็น 44 อยู่แล้วใน styles.css)

## 4. สิ่งที่ **จงใจไม่แก้** (กัน churn / นอกสโคป)

- **`SongSheet.vue`** — layout แผ่นเพลง responsive อยู่ใน `styles.css` (`.song-line` flex-wrap ·
  gap 12px จาก S0) ซึ่ง **S0 เป็นเจ้าของ · ห้ามแตะ**. scoped CSS ของ SongSheet เป็น functional ล้วน
  (karaoke syllable · songbook reused-verse) ไม่มี responsive defect → ไม่แก้ (verify แล้วเรนเดอร์ดีทุกจอ).
- **ไม่ blanket-tokenize** ค่า spacing ของ dock chrome (6/9/10/11px เป็นค่าจูนเฉพาะของ music player ที่
  P'Aim art-direct) — เปลี่ยนเป็น token จะทำให้ diff ใหญ่ + เสี่ยง drift ภาพที่ verify แล้ว โดยไม่ได้ประโยชน์.
  touch target ใช้ token `--touch-min` ครบแล้ว = ตรงเจตนา design-system.

## 5. Verify (`preview_resize` 3 breakpoint + วัดค่าจริงด้วย eval · server serve worktree จริง)

| เช็ก | desktop 1280 | tablet 768 | mobile 375 |
|---|---|---|---|
| transport ปุ่ม (grip/more/btn/pin) | 44 (play 50) | 44 (play 50) | 44 (play 50) |
| H-scroll จาก `.mp` / `.sd-dock` | ไม่มี (over=0) | ไม่มี (over=0) | ไม่มี (over=0) |
| ⚙ แผงตั้งค่า อยู่ในจอ | ✅ (9…385) | — | ✅ (top 172 · ในจอ) |
| แผงเลือกท่อน อยู่ในจอ | ✅ | — | ✅ (bottom sheet) |
| เมนูดาวน์โหลด รายการ ≥44 + ในจอ | — | ✅ 46px · ในจอ | — |

- **build:** ✅ `vite build` 1.46s
- **unit:** ✅ **224/224 passed** (`notationLint.test.mjs` fail = ของเดิม · `process.exit(0)` ไม่ใช่เทสต์จริง · CSS ไม่กระทบ)
- หมายเหตุ verify: `.sd-tbtn`/`.sd-key` (dock ปุ่ม + แป้นโน้ต) ไม่โผล่ในสถานะ SongViewer/Studio ที่เข้าถึงได้
  (dock ที่นั่นเป็น top-region transport ล้วน) → เป็นการเปลี่ยนค่า 40→44 ผ่าน token เดียวกับที่วัดได้ 44
  แล้วใน transport + build ผ่าน = มั่นใจถูก (verify-fallback).

## 6. ⚠️ FLAG ถึง PM — H-scroll 5px ที่ 768 = chrome นอกสโคป S4

ที่ **tablet 768** เจอ H-scroll ~5px (docScrollW 758 · vw 753). **ต้นเหตุอยู่นอก 4 ไฟล์ของ S4:**
`.sb-right` (ShellBar) + `.signin-btn` (ProfileTool) + `.pk-tool` **container** เบียดชิดขอบขวาเกิน 5px.
- **ไม่ใช่ regression ของ S4:** การแก้ DownloadTool แตะแค่ `.pk-tool-menu` (dropdown ที่ position:absolute
  + ปิดอยู่) — ไม่กระทบความกว้างของ `.pk-tool` ในสาย layout.
- S0 report เคย flag ProfileTool signin-btn ที่ tablet ไว้แล้ว ("นอกสโคป S0 → ฝาก S1/S4").
  แต่ **ProfileTool.vue / ShellBar.vue อยู่นอกสโคปไฟล์ของ S4** (สโคป S4 = SongSheet/Dock/SingTransport/DownloadTool)
  → **ไม่แตะ** (กันชน collision-free) · **ฝาก PM มอบให้สายที่เป็นเจ้าของ ShellBar/ProfileTool** (S0/S1).

## 7. กันชน — ยืนยัน

⛔ ไม่แตะ `NoteRow.vue` · ⛔ ไม่แตะ `src/styles.css` · scoped CSS ล้วน (ไม่แตะ logic/behavior/data) ·
ไม่ hard-code สีใหม่ · diff = 3 `.vue` (SingTransport/StudioDock/DownloadTool) + `launch.json` config `s4`.
