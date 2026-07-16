# Report — chord-roman-label

**สายงาน:** `chord-roman-label` · **branch:** `chord-roman-label` (fork จาก `studio-shell-redesign`)
**PM:** pm27 · **commit:** `f82df0d`

## สรุป
P'Aim เคาะระบบ "โรมัน I IV V" — ป้ายปุ่มสลับคอร์ดเขียนผิดเป็นนัชวิลล์ ทั้งที่ของจริงเรนเดอร์โรมันอยู่แล้ว. แก้เฉพาะ **ข้อความป้าย/badge** ไม่แตะ output/logic.

## เปลี่ยน (diff 3 บรรทัด · 2 ไฟล์)
| ไฟล์ | เดิม | ใหม่ |
|---|---|---|
| `src/views/Studio.vue:150` | `label: 'เลขนัชวิลล์ (1 4 5)'` | `label: 'คอร์ดโรมัน (I IV V)'` |
| `src/components/SongViewer.vue:48` | `label: 'เลขนัชวิลล์ (1 4 5)'` | `label: 'คอร์ดโรมัน (I IV V)'` |
| `src/components/SongViewer.vue:504` | `CHORD_BADGE.roman: '145'` | `CHORD_BADGE.roman: 'I·V'` |

badge เลือก `'I·V'` (ตามที่ brief เสนอ) — เลข I กับ V คั่นด้วยจุดกลาง อ่านเป็นโรมันชัด ไม่กำกวมกับ "4/5"; เลี่ยง `'IV'` เดี่ยว (อ่านเป็นสี่).

## ⛔ ไม่แตะ (ตาม brief)
- `chords.js` / `chordToRoman()` — output ถูกแล้ว (เรนเดอร์ I/IV/V/vi/vii°)
- `Guide.vue` / `About.vue` — สาย `guide-update` ถือ
- `ShellBar` / drawer — สาย `pwa-install` ถือ

## DoD — ผ่าน
- [x] ป้าย 2 จุด + badge = โรมันตรงกัน
- [x] **live verify (dev :5321):** เปิด setting panel หน้าเพลง → option แสดง `คอร์ดโรมัน (I IV V)` · เลือก roman → คอร์ดเรนเดอร์ `I / vi / ii / V / iii / IV` (โรมันเดิม ไม่เปลี่ยน output) · ไม่เหลือคอร์ดตัวอักษร
- [x] badge wired: `SongViewer:540 badge: CHORD_BADGE[chordSystem]='I·V'` → `DockKey:367 <b class="dk-badge">` (สลับค่าคงที่ล้วน · badge โชว์ตอน pin ลง dock / ฝึกร้อง)
- [x] ไม่เหลือ "นัชวิลล์" ใน **โค้ด label ที่ผู้ใช้เห็น** (grep clean ใน src ที่สายนี้ถือ)
- [x] `npm test` — 649/649 tests เขียว (ดู note ⚠️)
- [x] `vite build` ผ่าน (built in ~2s)
- [x] live 0 console error

⚠️ **test note:** suite `notationLint.test.mjs` ขึ้น "failed" เพราะไฟล์เรียก `process.exit(0)` (vitest ไม่ชอบ process.exit ตรงๆ) — เป็น quirk เดิมของ harness ไม่เกี่ยวกับ label เลย · เทสจริงทั้ง 649 ผ่าน.

## 🚩 flag → PM (out-of-scope "นัชวิลล์" ที่ยังค้าง — ไม่ได้แก้ตาม brief)
คำ "นัชวิลล์" ยังเหลือในไฟล์นอก scope สายนี้ — ฝาก PM ตัดสินใจ sync:
- **docs (US/DS):** `docs/us/ps3-dock.md:51`, `docs/us/ps3-viewer.md:9`, `docs/ds/dockkey-print-edit.md:26` (DS ระบุ badge เดิม "145" — ควร sync เป็น "I·V" ตอน DS update)
- **design prototypes:** `docs/design/dockkey-prototype.html:177-178`, `docs/design/ps2-studio-prototype.html:322`, `docs/design/ps3-dock-prototype.html:167,178`
- **โค้ด comment:** `src/lib/chords.js:1` ("letter <-> Nashville-number conversion") — brief สั่ง ⛔ ไม่แตะ chords.js จึงเว้นไว้ (comment เฉยๆ ไม่ใช่ output)

## ต่อไป
- ห้าม merge/deploy เอง — รอ pm27 gate + P'Aim go
