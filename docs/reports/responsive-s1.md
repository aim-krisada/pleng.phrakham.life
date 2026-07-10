# Report — S1 อ่าน/ฝึกร้อง (SongViewer + ProfileTool + FontTool)

**สาย:** dev (Surface) · **branch:** `responsive-s1` (from `studio-shell-redesign` = มี S0 tokens แล้ว) · **ห้าม merge/deploy**
**Network URL (LAN · มือถือจริง):** `http://10.215.141.98:5331` (dev `--host` · port 5331)
**ไฟล์ที่แตะ (scoped CSS/layout ล้วน · ไม่แตะ logic/data/สี):**
`src/components/ProfileTool.vue` · `src/components/FontTool.vue` · `src/components/SongViewer.vue` · `.claude/launch.json` (เพิ่ม config `s1`)
**ยึด tokens จริงจาก `src/styles.css`:** `--sp-* --fs-* --lh-* --touch-min:44px` — **ไม่แตะ `styles.css`** (S0 เป็นเจ้าของ) · **ไม่แตะ `NoteRow.vue`** (ACC/B062)

---

## 1. ⭐ แก้บั๊ก S0 flag — ปุ่ม signin ProfileTool สูง 68px (ทำ shell-bar 85px ที่ tablet)

**root cause (วัดจริงก่อน):** ที่หน้าเพลง tablet 768 แถบ shell รันแบบ nowrap และ mode switcher (`.sb-modes` = แผ่นเพลง/ฝึกร้อง/แก้ไข · **S3/Studio.vue scope**) กินความกว้าง → `sb-right` ถูกบีบแคบ → ป้าย "เข้าสู่ระบบ" ในปุ่ม signin **wrap เป็น 3 บรรทัด** (span สูง 52px) → ปุ่มพอง 68px → ดันแถบเป็น 85px.

| จุด | ก่อน | หลัง | วิธี |
|---|---|---|---|
| `.signin-btn` สูง (tablet, หน้าเพลง) | **68px** (ป้าย wrap 3 บรรทัด) | **44px** | `white-space: nowrap` + `min-height: var(--touch-min)` |
| `.signin-btn` min-height | 40px | `--touch-min` (44) | ตรงมาตรฐาน touch |
| ปุ่ม signin (icon-only) min-width | ~34px | `--touch-min` (44) | hit 44×44 เต็ม |

**ผลข้างเคียงที่เจอ + แก้ในตัว:** พอ `nowrap` ปุ่มกว้างขึ้น (88→117px) → ที่ 768 แถบ nowrap รวมเกิน viewport = **H-overflow 24px** (regression). แก้โดย **ยุบ signin เป็นไอคอนล้วนถึง tablet (≤1024)** ไม่ใช่แค่ ≤760 — บนเดสก์ท็อป (>1024) ป้ายกลับมา (มีที่พอ). GitHub-style collapse. → 768 ไม่ล้นอีก (scrollW 753 < 768).

**⚠️ ส่งต่อ S3 (Studio.vue):** หลังแก้ signin แล้ว แถบ shell ที่ tablet ยังสูง ~84px เพราะ **`.sb-mode-btn` (mode switcher) สูง 61px** — อยู่ใน `Studio.vue` (scoped) = **นอกสโคป S1**. ถ้าอยากให้แถบเตี้ยลงถึง 44 แถวเดียว ต้องให้ S3 ย่อ mode switcher (หรือ S0/ShellBar เลื่อน breakpoint 2-แถวจาก 760 ขึ้นเป็น ~1024).

## 2. FontTool ("Aa" top nav) — touch target 44 + tokens

| จุด | ก่อน | หลัง |
|---|---|---|
| `.ft-btn` (ปุ่ม Aa) | 38×34 | **44×44** (`--touch-min` · ตรงกับพี่น้องในแถบ) |
| `.ft-step` (A− / A+) | 40×36 | **44×44** |
| `.ft-reset` | 44 สูง | +`min-height --touch-min` (คง) |
| spacing/type ในเมนู | px ดิบ (10/8/12/15px) | tokens (`--sp-3 --sp-2 --fs-md/-sm/-xs`) |
| popup กันหลุดขอบ | JS clamp (เดิม) | + `max-width: calc(100vw - --sp-4)` |

## 3. SongViewer — dock ไม่บังเนื้อ (วัด dock จริงก่อน)

พื้นที่อ่าน = `<SongSheet>` (S4) ครอบด้วย `.sheet-scale` (สโคป S1). งานเดียวที่ชนได้ = **ระยะเผื่อให้ dock ลอยล่างไม่ทับบรรทัดสุดท้าย**. เดิม `padding-bottom: 150px` (magic number) — **วัดจริง: dock สูง 191px ที่ ≤480 (ปุ่ม transport wrap) · 147px ที่จอกว้าง** → 150 **ไม่พอที่มือถือ** (บังเนื้อ ~41px).

**แก้ (responsive + safe-area · CSS ล้วน):**
```css
.sheet-scale { padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)); }
@media (max-width: 480px) { .sheet-scale { padding-bottom: calc(210px + env(safe-area-inset-bottom, 0px)); } }
```
160 เผื่อ dock 147 (จอกว้าง) · 210 เผื่อ dock 191 (มือถือ) · + inset home-indicator บนจอมีติ่ง. (ระยะนี้ track ความสูง dock ซึ่ง **S4 เป็นเจ้าของ** — comment ระบุไว้.)

## 4. Verify (preview_resize 3 breakpoint + วัดค่าจริงเทียบ token)

| เช็ก | mobile 375 | tablet 768 | desktop 1280 |
|---|---|---|---|
| Horizontal overflow | ✅ ไม่มี | ✅ ไม่มี (scrollW 753) | ✅ ไม่มี |
| signin สูง × กว้าง | 44×44 (ไอคอน) | 44×44 (ไอคอน) | 44 × 117 (มีป้าย) |
| ป้าย "เข้าสู่ระบบ" | ซ่อน (ไอคอน) | ซ่อน (ไอคอน) | แสดง |
| FontTool Aa / A−/A+ | 44×44 / 44×44 | 44×44 | 44×44 |
| `.sheet-scale` pad-bottom | **210px**+inset | 160px+inset | 160px+inset |
| dock (`.sd-wrap`) สูง | 191px | 147px | 147px |
| บรรทัดสุดท้ายพ้น dock | ✅ **เผื่อ 224px > dock 191 (พ้น 33px)** | ✅ | ✅ |
| FontTool popup อยู่ในจอ | ✅ (73–263) | ✅ | ✅ |
| ProfileTool menu อยู่ในจอ | ✅ (≤ 367<375) | ✅ | ✅ |
| console error | 0 | 0 | 0 |

- **build:** ✅ เขียว (`vite build` 1.53s)
- **unit:** ✅ **224/224 passed** · `notationLint.test.mjs` fail = ของเดิม (สคริปต์เรียก `process.exit(0)` เอง · ไม่ใช่เทสต์ · CSS ไม่กระทบ · ตรงกับ S0/B062/catalog report)

## 5. กันชน — ยืนยัน

⛔ ไม่แตะ `NoteRow.vue` (ACC/B062) · ⛔ ไม่แตะ `styles.css` (ใช้ token เฉยๆ) · ⛔ ไม่แตะ `Studio.vue`/`SongSheet.vue`/dock (S3/S4) · CSS/layout ล้วน (ไม่แตะ logic/behavior/data) · ไม่ hard-code สี.
diff = `ProfileTool.vue` + `FontTool.vue` + `SongViewer.vue` + `launch.json` เท่านั้น.

## 6. หมายเหตุ / ตัดสินใจเอง (ไม่ถาม P'Aim รายจุด)

1. **signin ไอคอนล้วนถึง tablet (≤1024):** ที่ tablet ป้ายทำแถบล้น (mode switcher กินที่) → เลือกไอคอนล้วน = มาตรฐาน GitHub-style · ป้ายกลับมาบนเดสก์ท็อป. หน้าแรก (ไม่มีเพลง) ที่ tablet ก็ไอคอนล้วนตามกฎเดียว (KISS · ไม่ผูก component กับ route).
2. **ระยะเผื่อ dock เป็น px ไม่ใช่ token:** เพราะมัน track ความสูง element ลอย (S4-owned) ไม่ใช่จังหวะ spacing ทั่วไป — token ไม่มีค่านี้.
3. **แถบ shell ยังสูงที่ tablet = S3** (`.sb-mode-btn` 61px) — ฝากไว้ §1.
