# Report — bug1 ไอคอนแบรนด์ + bug2 footer ติดล่างสุดจอ

**สาย:** dev (Surface · auto-worktree) · **branch:** `fix-favicon-footer` (from `studio-shell-redesign`) · **ห้าม merge main / deploy**
**Network URL (LAN · มือถือจริง):** `http://10.215.141.98:5364` (dev server `--host`, port 5364, config `fff`)
**ไฟล์ที่แตะ:** bug1 → `src/components/ShellBar.vue` (+ 1 rule ใน `styles.css`) · bug2 → `src/styles.css` + `src/App.vue` · `.claude/launch.json` (config `fff`)
**กันชน (ยึด brief):** ⛔ ไม่แตะ `StudioDock.vue` / `SingTransport.vue` / `SongViewer.vue` (สาย DockKey) · `NoteRow.vue` · `store.js` · favicon แท็บใน `index.html` — อ่านเพื่อรู้ selector เท่านั้น
**commit:** `4f4a5ef`

---

## บั๊ก 1 — ไอคอนโลก → โลโก้ phrakham

เมนู "เพลง.พระคำ.ชีวิต ▾" รายการลิงก์ `phrakham.life` เดิมใช้ `<Icon name="globe" />` (ไอคอนโลกทั่วไป). เปลี่ยนเป็นโลโก้จริงของ phrakham = `public/favicon.ico`.

- `<Icon name="globe" />` → `<img class="sb-brand-ico" :src="brandIcon" alt="" width="18" height="18" />`
- `brandIcon = import.meta.env.BASE_URL + 'favicon.ico'` — resolve ได้ทั้ง custom domain (`/`) และ GH Pages project path (`/repo/`). ตรงกับวิธีที่ `index.html` อ้าง favicon อยู่แล้ว.
- `alt=""` (decorative) · `width/height=18` กัน layout shift · rule `.sb-brand-ico { display:block; flex:0 0 auto; width:18px; height:18px; object-fit:contain }` ให้จัดคอลัมน์/baseline เท่าไอคอนเส้นอื่น.
- ⛔ ไม่แตะ favicon แท็บ (`index.html:12`) · ไม่แตะ `globe` ที่อื่น (มีแค่จุดนี้).

**เหตุผลขนาด 18px (ไม่ใช่ 16 ตาม brief):** ไอคอนเมนูอื่นทุกตัว render ที่ 18px (`Icon.vue` default `size:18`). ใช้ 18 ให้ "เท่าไอคอนอื่น" จริง (เจตนาของ brief) — วัดแล้วเข้าคอลัมน์เดียวกันเป๊ะ (ดู verify).

## บั๊ก 2 — footer ติดล่างสุดจอเสมอ (แทน magic number 88px ของ B047)

**ปัญหา:** หน้าฝึกร้อง (เนื้อสั้น) footer ลอยกลาง-ล่างจอ และครึ่งล่างถูก music dock (`.sd-wrap`, `position:fixed; bottom:0`) บัง. B047 เว้น `margin-bottom:88px` ให้ footer พ้น dock — แต่ dock จริงสูง **128–192px** (แล้วแต่โหมด/กว้างจอ) > 88 → footer ยังโดนบัง.

**แก้ (ยึด "อย่าใช้ magic number ตายตัว · วัดจริง/ยืดหยุ่น" ใน brief):**

| จุด | เดิม | ใหม่ |
|---|---|---|
| `footer.site-footer.footer-dock-clear` | `margin-bottom: calc(88px + safe-area)` | `margin-bottom: calc(var(--dock-clear, 88px) + safe-area)` |
| `App.vue` | — | วัดความสูง dock (`.sd-wrap`) สด → set `--dock-clear` |

- `App.vue` วัด `.sd-wrap` (bounding height) เฉพาะเมื่อเป็นบาร์จริงที่ปักล่างจอ (`display≠none`, `height>0`, `bottom≥innerHeight−4`) แล้ว publish เป็น CSS var `--dock-clear` บน `<html>`. footer จองแถบเท่านั้นพอดี → เส้น+ตัวหนังสือ footer วาง **ชิดบนขอบ dock** (ไม่โดนบัง · ไม่เหลือแถบว่าง).
- ไม่มี dock (list/guide/about) หรือ dock ถูกลากออกจากล่าง → var = `0px` → footer นั่งขอบล่างจอจริง.
- อัปเดตสดผ่าน **ResizeObserver** (dock สูงเปลี่ยนตอนสลับโหมด/reflow มือถือ) + **MutationObserver** (dock เป็น `v-if` mount ทีหลังเพลงโหลด · toggle ได้) + `resize`. coalesce ด้วย `setTimeout(0)` (ไม่ใช่ rAF) → flush ได้แม้แท็บ background.
- ต่อยอด sticky-footer ของ B047 (`#app` flex column · `main flex:1 0 auto` เดิม) — ไม่แตะกลไกนั้น · ไม่ hard-code สี · แก้ CSS/measure ล้วน.

## Verify (worktree serve จริง · port 5364 · 3 breakpoint)

หน้าฝึกร้อง `#/song/100` วัด `footer.bottom` เทียบ `dock.top` (delta 0 = ชิดพอดี, ไม่ทับ):

| breakpoint | `--dock-clear` | dock สูง | footer.bottom vs dock.top | footer โดนบัง? |
|---|---|---|---|---|
| 375×812 (mobile) | 180px | 180 | 0 (flush) | ❌ ไม่บัง · เห็นครบ |
| 768×1024 (tablet) | 140px | 140 | 0 (flush) | ❌ ไม่บัง · เห็นครบ |
| 1280×800 (desktop) | 140px | 140 | 0 (flush) | ❌ ไม่บัง · เห็นครบ |

- **หน้าไม่มี dock:** `about`@1100 สูง → footer.bottom = 1100 = ขอบล่างจอ (gap 0, ติดล่าง) · `songlist` (เนื้อสั้น) footer ติดล่าง (gap 0) · `guide` (เนื้อยาว 6161px) footer อยู่ท้าย เลื่อนปกติ ✅
- **bug1 favicon:** globe หาย · `<img>` โหลดสำเร็จ (naturalW 48, complete) · render 18×18 · วัด 4 แถวเมนู = คอลัมน์เดียวกันเป๊ะ (icoLeft 10, width 18, centerY 22, rowH 43 ทุกแถว) · `src=/favicon.ico` ✅
- **console:** 0 error / 0 warning (เช็คบน server รอบใหม่หลัง clear buffer)
- **unit:** `vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` → **264 passed** · suite `notationLint.test.mjs` fail = ของเดิมบนฐาน (`process.exit` ใน standalone script · ไม่เกี่ยวงานนี้)
- **build:** ✅ `built in 1.65s` (font warnings = ของเดิม · runtime-resolved)

> ข้อจำกัด preview ที่เจอ (บันทึกให้สายอื่น): preview browser tab เป็น background → `document.hidden=true` → `requestAnimationFrame` ไม่ยิง และ `preview_resize` (CDP) ไม่ dispatch event `resize` ให้หน้า. ต้อง `window.dispatchEvent(new Event('resize'))` เองหลัง resize ถึงจะวัดค่าใหม่ได้ (บนจอจริง foreground ทำงานปกติ — RO/resize ยิงตามเฟรม). เลยเลือก `setTimeout` แทน rAF ให้ทน background ด้วย.

## ประสาน DockKey

สาย DockKey เป็นเจ้าของ dock (อาจเปลี่ยนความสูง). สายนี้ **ไม่อิงความสูง dock แบบ magic number** — วัด `.sd-wrap` สด → DockKey เปลี่ยนสูงเท่าไร footer ตามเอง. ผูกกับ selector `.sd-wrap` (wrapper เดียวของ dock ทุกโหมด ตั้งแต่ N1 dock-core). ถ้า DockKey rename wrapper นั้น → var ตกเป็น fallback 88px (ไม่พัง แต่ควรบอกสายนี้อัปเดต selector).

## ค้าง / ฝาก PM (pm4)

- **P'Aim verify LAN `http://10.215.141.98:5364` บนมือถือจริง** — หน้าฝึกร้อง (เนื้อสั้น) ดู footer ติดล่างจอ ชิดบน dock ไม่โดนบัง · เปิดเมนูแบรนด์ดูโลโก้แทนไอคอนโลก.
- **แถม (resolve B047 follow-up):** board §⏸️ ข้อ "footer โหมดแก้ (dock >88px) — follow-up B047" — งานนี้แก้ครบทุกโหมด (วัดสด) รวมโหมดแก้ไขที่ dock สูงกว่า 88 ด้วย. PM ปิด follow-up นั้นได้.
- ⛔ ห้าม merge/deploy — รอ PM ตรวจ DoD + P'Aim เคาะ.
