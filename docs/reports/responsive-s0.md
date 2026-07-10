# Report — S0 Foundation (design tokens + base vertical rhythm)

**สาย:** dev (Surface) · **branch:** `responsive-s0` (from `studio-shell-redesign`) · **ห้าม merge main/deploy**
**Network URL (LAN · มือถือจริง):** `http://10.215.141.98:5330` (dev server `--host`, port 5330)
**ไฟล์ที่แตะ:** `src/styles.css` (tokens + base rules) · `.claude/launch.json` (เพิ่ม config `s0`) — **ไม่แตะ NoteRow / component / logic ใดๆ**

> ⚠️ หมายเหตุ: สเปกที่ brief อ้าง `docs/ds/responsive-overhaul.md` **ยังไม่มีในรีโป** (มีแต่ `docs/pm/brief-responsive-polish.md` แผนเก่า audit-first สายเดียว). ทำตาม brief ของสายนี้ซึ่ง self-contained ครบ §S0 อยู่แล้ว. ถ้า PM มีสเปก §1 ตัวจริง โปรดแนบเพื่อ cross-check ค่าตัวเลข.

---

## 1. Token system ที่วางลง `:root` (SSOT ให้ S1–S4 ใช้ต่อ scoped)

| กลุ่ม | tokens | ค่า |
|---|---|---|
| **Spacing (4px grid)** | `--sp-0..--sp-12` | 0·4·8·12·16·20·24·32·40·48 px |
| **Typography** | `--fs-xs..--fs-2xl` | 0.78 · 0.9 · 0.98 · **1.06(base)** · 1.15 · 1.4 · 1.75 rem |
| **Line-height** | `--lh-tight/snug/normal/loose` | 1.25 · 1.4 · 1.6 · 1.8 |
| **Touch target** | `--touch-min` | 44px |
| **Containers** | `--container / --container-wide` | 900 / 1160 px |
| **Breakpoints** | `--bp-sm/md/lg` | 480 / 768 / 1024 px (JS/matchMedia + ref) |

- `--fs-base = 1.06rem` = family standard + กัน iOS zoom-on-focus (ห้าม input < 16px).
- สีทั้งหมดยังเป็น Warm Study Room tokens เดิม — **ไม่ hard-code สีใหม่**.

## 2. ⭐ แก้ปัญหาหลัก — ช่องว่างบรรทัดเพลงห่างเกิน (วัดจริงก่อน→ปรับ)

| จุด | ก่อน | หลัง | หมายเหตุ |
|---|---|---|---|
| **ช่องไฟระหว่างบรรทัดเพลง** `.song-line` | margin 20 + pad 4 = **24px** | margin `--sp-2` 8 + pad `--sp-1` 4 = **12px** | ตรงเป้า 8–12px |
| **ภายในบรรทัด** `.segment .lyric` line-height | **1.8** (30.5px) | `--lh-snug` **1.4** (23.7px) | Thai พยางค์เดียว วรรณยุกต์/สระ ไม่โดนตัด |
| **base rhythm** `body` line-height | 1.8 | `--lh-normal` **1.6** | ทั้งแอปแน่นขึ้น (prose ยัง Thai-safe) |
| ความสูงบรรทัดเพลงรวม | 153px | **137px** | เตี้ยลง ~10% |

## 3. Chrome responsive + touch-target ≥44

- **ShellBar** (`.shell-bar` + `.sb-*`): control ทุกตัว `min-height: --touch-min` (44, เดิม 40); ปุ่มไอคอนล้วน `.sb-caret/.sb-cat` เพิ่ม `min-width:44` → hit 44×44 เต็ม. padding/gap → tokens.
- **SiteFooter**: spacing → tokens, `font-size --fs-xs`, `line-height --lh-snug`. ลิงก์ในประโยคเป็น **inline** → ใช้ข้อยกเว้น WCAG 2.2 §2.5.8 (ไม่บังคับ 44 จะทำให้บรรทัดข้อความเพี้ยน) แค่ padding แตะสบาย.
- **buttons / inputs / textarea** global: `min-height: --touch-min` (44, เดิม 40); font/padding → tokens.
- `.container` padding → `--sp-4`, ที่ ≤480px ลดเป็น `--sp-3`.

## 4. Verify (preview_resize 3 breakpoint + วัดค่าจริง)

Server `--host` port 5330 · build + 224 unit tests เขียว.

| เช็ก | desktop | tablet 768 | mobile 375 |
|---|---|---|---|
| Horizontal overflow | ✅ ไม่มี | ✅ ไม่มี | ✅ ไม่มี |
| `.song-line` gap | 12px | 12px | 12px |
| lyric line-height | 1.4 | — | 1.4 |
| body line-height | 1.6 | — | 1.6 |
| `.sb-caret` touch | 44×44 | 44×44 | 44×44 |
| container padding | 16px | 16px | **12px** (≤480) |
| shell-bar layout | 1 row | 1 row (nowrap) | 2-row wrap |

4 หน้า (SongList / Guide / About / Studio) @375px: **ไม่มี horizontal overflow** ทุกหน้า.

- **build:** ✅ เขียว (`vite build` 1.98s)
- **unit:** ✅ **224/224 passed**. ไฟล์ `notationLint.test.mjs` ขึ้น error เพราะสคริปต์เรียก `process.exit(0)` เอง (ไม่ใช่เทสต์จริง · CSS ไม่กระทบ · pre-existing).

## 5. ส่งต่อ S1–S4 / ข้อสังเกต

- Token/base พร้อมใช้ — S1–S4 อ้าง `--sp-*`/`--fs-*`/`--lh-*`/`--touch-min` ใน scoped CSS ได้เลย **ไม่ต้องแตะ styles.css อีก**.
- ⚠️ **ProfileTool signin button สูง 68px** (ทำ shell-bar สูง 85px ที่ tablet) — เป็น layout ภายใน ProfileTool (pre-existing, S0 แค่ +4px) **นอกสโคป S0** → ฝากสายที่ดูแล ProfileTool (S1/S4).
- legacy `header.topbar / .nav-toggle / .site-nav` = dead CSS (ไม่มี .vue ใช้แล้ว หลัง ShellBar) — ปล่อยไว้ ไม่ใช่สโคป S0; แนะทำ cleanup แยก.

## 6. กันชน — ยืนยัน

⛔ ไม่แตะ `NoteRow.vue` · ⛔ CSS/layout ล้วน (ไม่แตะ logic/behavior/data) · ไม่ hard-code สี. diff = `styles.css` + `launch.json` เท่านั้น.
