# Report — S3 หน้าแก้ไข/ทำเพลง (responsive polish)

**สาย:** dev (Surface) · **branch:** `responsive-s3` (from `studio-shell-redesign`) · **ห้าม merge main/deploy**
**Network URL (LAN · มือถือจริง):** `http://10.215.141.98:5335` (dev server `--host`, port 5335)
**ไฟล์ที่แตะ (scoped CSS/layout ล้วน · ไม่แตะ logic/behavior/data · ไม่ hard-code สี):**
`src/views/Studio.vue` · `src/components/EditorMode.vue` · `src/components/NoteBoxes.vue` · `.claude/launch.json` (เพิ่ม config `s3`)
> `NoteBoxes.vue` + `ComboSelect.vue` ใช้เฉพาะใน Studio/EditorMode (grep ยืนยัน) = เข้าข่ายสโคป S3 · แตะแค่ `NoteBoxes` (ComboSelect ไม่ต้องแก้ — input สืบ token/44px จาก base แล้ว) · **⛔ ไม่แตะ `styles.css`** (ใช้ token ที่ S0 วาง)

---

## 1. ⭐ ปัญหาหลักที่แก้ — มือถือเลื่อนแนวนอน (horizontal scroll) ในโหมดแก้ไข

**อาการ (วัดจริงก่อนแก้ · เพลงจริง 19 ห้อง @375px):** หน้ากว้าง `scrollW 443 > vw 375` → เลื่อนซ้ายขวาได้ทั้งหน้า
**ต้นเหตุ:** `.ed-bar .seg-strip` เป็น `flex-wrap: nowrap` — ห้องที่มีหลายโน้ตดันคอลัมน์ (คอร์ด·โน้ต·พยางค์) ยาวเกินจอ
**วิธีแก้ (เลือกแล้ว):** บนมือถือ (≤760px) ให้ **คอลัมน์โน้ต wrap** แทนที่จะ scroll
- แต่ละคอลัมน์ (seg-col) = คอร์ด·โน้ต·พยางค์ ซ้อนกัน**ในตัวเอง** → wrap ทั้งคอลัมน์ **ไม่ทำให้พยางค์หลุดจากโน้ต** (การจัดเรียง 1:1 อยู่ในคอลัมน์)
- ❌ ไม่ใช้ scroll box ภายใน: `overflow-x:auto` จะบังคับ `overflow-y` เป็น auto ด้วย → **ตัดป๊อปอัป** ◀▶ (จัดพยางค์) + dropdown คอร์ด ที่เด้งเหนือ/ใต้ช่อง
- `.ed-bar-render` (ดูผล) + `.ed-bar-foot` (แถบสถานะห้อง) เพิ่ม wrap/overflow กันล้นเช่นกัน

**ผลหลังแก้ @375px:** `scrollW 375 = vw 375` · **ไม่มี horizontal scroll** (empty editor + เพลงจริง 19 ห้อง)

## 2. Touch targets ≥44px (WCAG 2.5.5 · token `--touch-min`) — เฉพาะมือถือ ≤760px

Desktop คงความแน่น (เมาส์แม่นยำ) · มือถือทุกปุ่มโตเป็น 44px:

| กลุ่ม | ก่อน | หลัง (≤760px) |
|---|---|---|
| header icons `.ed-ico` / `.ed-mini` | 32 / 30 | **44×44** |
| `.ed-crumb` (เปิดแถบส่วนเพลง) · `.ed-verify` · `.ed-settings-toggle` | 41 / 32 / 34 | **44 สูง** |
| `.ed-lay button` · `.ed-chip` · `.ed-addbar` · `.ed-addline` | 32 / 37 | **44 สูง** |
| `.ed-line-end` · `.ed-bar-pickup` (pill) | ~24 | **44 สูง** |
| tools ย่อย `.tiny` (จัดลำดับ ▲▼✎✕ · เมนูห้อง ⋯) · `.slot-btn` (◀▶) | 28 | **44×44** |
| `.syl-box` (กล่องพยางค์ใต้โน้ต · input หลัก) | 30 | **44 สูง** |
| `.chord-btn` (คอร์ดเหนือโน้ต) | 26 | **34 สูง** (ไม่ดัน 44 เพื่อไม่ให้คอลัมน์สูงเวอร์ · กว้าง 46≥24 = AA) |
| rail (แถบส่วนเพลง drawer) `.rail-row` / `.rail-del` / `.rail-x` | 38 / 30 / 32 | **44** |
| `.note-box` (input โน้ต) | สูง 44 อยู่แล้ว (สืบ base) · ปุ่ม `+` add | 30 กว้าง | ปุ่ม `+` กว้าง **40** |
| Studio: `.sb-mode-btn` (สลับ ฝึกร้อง·แผ่นเพลง·แก้ไข ไอคอนล้วนบนมือถือ) | 34 | **44×44** |
| Studio: `.sb-song-new` (＋สร้างเพลงใหม่) | 40 | **44** |

แถวที่ปุ่มโตขึ้น (`.ed-bar-foot`) เพิ่ม `flex-wrap: wrap` กันล้น

## 3. Token / spacing
- CSS ใหม่ทั้งหมดใช้ token: `--sp-*` (4px grid) · `--touch-min` · `--fs-*`
- Studio: `.sheet-title` 1.5rem→`--fs-xl` · margin 12px→`--sp-3` · song-panel inset 8px→`--sp-2` · title 1rem→`--fs-base`
- EditorMode: `.sheet-head` gap/margin → token
- (ไม่ไล่แปลง px ทุกจุดในไฟล์ 850 บรรทัด — เสี่ยงเลื่อน layout เดิม · โฟกัสค่าที่กระทบ responsive + ค่าที่เห็นชัด · vertical-rhythm หลักทำที่ S0 global แล้ว)

## 4. Verify (preview_resize 3 breakpoint + วัดค่าจริง `preview_inspect`/DOM · server `--host` :5335)

| เช็ก | mobile 375 | tablet 768 | desktop 1280 |
|---|---|---|---|
| Horizontal overflow (หน้าแก้ไข เพลงจริง 19 ห้อง) | ✅ ไม่มี (375=375) | ✅ เนื้อหา editor ไม่ล้น¹ | ✅ ไม่มี |
| `.seg-strip` wrap | wrap (คอลัมน์ไม่ล้น) | nowrap (เดิม) | nowrap (เดิม) |
| header icon `.ed-ico` | 44×44 | 32×32 (เดิม) | 32×32 (เดิม) |
| `.syl-box` / `.tiny` | 44 / 44×44 | เดิม | เดิม |
| rail (แถบส่วนเพลง) | drawer 300px · rows 44 | sticky 214 | sticky 214 |
| mode switch `.sb-mode-btn` | 44×44 (ไอคอน) | เดิม | เดิม |
| song panel "เพลง ▾" | inset 8→367/375 ไม่หลุดขอบ | — | — |

¹ **tablet 768px มี H-scroll จาก ShellBar chrome** (`.sb-right`/`.pk-tool`/`.signin-btn`/`.signin-label`) = **นอกสโคป S3** (อยู่ `styles.css` global + `ProfileTool.vue`) · เป็นของเดิม (S0 report §5 flag ปุ่ม signin ไว้แล้ว · breakpoint `.shell-bar` wrap ที่ ≤760 → 761-820 ยังแถวเดียวล้น) → **ฝาก PM/เจ้าของ chrome (S0/S1/S4)** · editor content เอง**ไม่ล้น**ทุก breakpoint

- **build:** ✅ เขียว (`vite build` 1.51s)
- **unit:** ✅ **224/224 passed** (`notationLint.test.mjs` fail = ของเดิม · สคริปต์เรียก `process.exit(0)` เอง ไม่ใช่เทสต์ · CSS ไม่กระทบ)
- **console:** 0 error
- ⚠️ `preview_screenshot` timeout (flaky ตามที่ CLAUDE.md แจ้ง) → verify ด้วย DOM measurement แทน (แม่นกว่า)

## 5. กันชน — ยืนยัน
⛔ ไม่แตะ `NoteRow.vue` (ACC/B062) · ⛔ ไม่แตะ `styles.css` (ใช้ token S0) · ⛔ CSS/layout ล้วน — ไม่แตะ logic/behavior การแก้เพลง/data · ไม่ hard-code สี
diff = `Studio.vue` + `EditorMode.vue` + `NoteBoxes.vue` (scoped `<style>` ล้วน) + `launch.json`

## 6. ฝาก PM
1. **tablet ShellBar overflow** (ข้อ 4 note ¹) — ของเดิม/นอกสโคป · ฝากเจ้าของ chrome (breakpoint `.shell-bar` 760 vs ProfileTool signin) — คนละไฟล์กับ S3
2. `.claude/launch.json` เพิ่ม config `s3` (port 5335) — infra dev เท่านั้น
