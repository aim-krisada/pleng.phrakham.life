# รายงาน dev — B109 keyboard navigation (logic)

**สาย:** dev (logic · EditorMode · ไม่ 2-host — SA ยืนยัน nav เป็นของ editor ไม่ใช่ DockKey)
**branch:** `b109-keyboard` (จาก `studio-shell-redesign @ 938497a` = base ที่มี dock-space deployed) · **commit `bb18c08`**
**🎧 Network URL:** **http://192.168.1.124:5330/#/studio** (curl/live 200)
**สถานะ:** 🟢 **logic เสร็จ + verify — free branch ให้ UX ทำปุ่มบนจอ + คู่มือ** (baton · 1 ไฟล์ 1 สาย)

---

## ทำอะไร (US §2 · SA `8b392e6`/`5e3f011`)

**1 nav model 2 trigger:** desktop = physical key (ทำแล้ว) · mobile = ปุ่มบนจอ (UX) เรียก `jump*` **ฟังก์ชันเดียวกัน** · reuse ของเดิมล้วน (`slotStarts`/`focusSlot`/`[data-bar]`/`lines`) — ไม่มี data model ใหม่

| คีย์ | ทำ | ฟังก์ชัน |
|---|---|---|
| **Ctrl+← / →** | ห้องก่อน/ถัดไป (wrap ข้ามบรรทัด) | `jumpBar(∓1)` |
| **Ctrl+↑ / ↓** | บรรทัดก่อน/ถัดไป (ห้องแรก) | `jumpLine(∓1)` |
| **Tab / Shift+Tab** | โน้ต/พยางค์ ถัดไป/ก่อนหน้า (พยางค์ = global slot → ข้ามห้องเอง) | `jumpNote(±1)` |
| **Home / End** | โน้ตแรก/สุดท้ายของ **ห้อง** | `focusEdge(±1)` |
| **Ctrl+Home / End** | ต้น/ท้าย **เพลง** | `focusEdge(±1, true)` |
| **Enter** (ในตัวแก้คอร์ด) | **ยืนยันคอร์ด** | `allow-custom` บน chord ComboSelect |
| **Esc** (ในตัวแก้คอร์ด) | ยกเลิก | `@keydown.esc` ที่ `.chord-cell` wrapper |

**กลไกสำคัญ:**
- `currentPos()` = `activeElement.closest('[data-bar]')` → (li,bi) + `syl-box`? = mode (note/lyric) · ครอบทั้ง 2 side
- `focusBar(li,bi,onSyllable)` = syllable → `focusSlot(slotStarts["li-bi-0"])` · note → `[data-bar].note-box`
- **`onNavKeys` window-keydown (pattern เดียวกับ `onUndoKeys`):** guard = focus อยู่ใน `.ed-strip` + **skip ตอนแก้คอร์ด** (`.chord-pick` — picker คุมคีย์เอง)
- **🔴 ทุก nav key `preventDefault`** → หน้าไม่เลื่อน → **ไม่ flicker hide-on-scroll** (SA flag) · **Tab preventDefault เฉพาะตอนขยับได้** → ขอบสุด native Tab ออกจาก editor ได้ (ไม่ trap focus · a11y)
- **Mac:** `Ctrl+←/→` OS จอง (Spaces) → **Tab = คีย์หลัก cross-platform** (US §2 · SA `5e3f011`)
- **Enter/Esc คอร์ด:** `allow-custom` = root cause (Enter รับค่าพิมพ์เอง · blast 0) · Esc ที่ wrapper (mirror rename `commitRename` · **⛔ ไม่ emit เข้า ComboSelect** ที่ share 3 ที่)

---

## verify

- **jsdom 7 tests (`EditorMode.keyboard-nav.test.js`):** Ctrl+→/← ข้ามห้อง + wrap ข้ามบรรทัด · Ctrl+↑/↓ ข้ามบรรทัด · bounds (ไม่หลุดต้น/ท้าย) · Home อยู่ในห้อง + **preventDefault** · focus นอก editor = ไม่ยิง · chord `allow-custom`=true · Esc ปิด picker
- **live smoke (Chromium จริง · real KeyboardEvent):** 2 ห้อง → focus `0-0` → **Ctrl+→ → focus `0-1`** (note box) · **`defaultPrevented=true`** ✅
- **743 tests · build ✓** (notationLint แดง = pre-existing)

---

## ⛔ นอก lane ผม (UX ทำต่อ · baton)
- **ปุ่มนำทางบนจอ** (◀▶โน้ต · ⏮ห้อง⏭ · ▲บรรทัด▼) ใน keypad band → เรียก `jumpNote/jumpBar/jumpLine(±1)` **ฟังก์ชันเดิม** (export ไว้ให้แล้วในไฟล์)
- **คู่มือ** (คีย์ลัด · US §5)
- device-matrix + พี่เปามือถือ = tester GATE

## ⚠️ flag (ขอ PM/UX)
- **Home/End = bar-edge** (override caret home/end ใน text box) ตาม US §2 (ARIA grid) · โน้ต/พยางค์สั้น = กระทบน้อย · **ถ้า P'Aim อยาก caret เดิม → ตัด plain Home/End ได้ (เหลือ Ctrl+Home/End)**
- **Tab override** = โน้ตↆโน้ต (ข้าม chord button) · ขอบสุดปล่อย native (ไม่ trap)

*dev · B109 logic · 2026-07-18 · commit `bb18c08` · ⛔ ไม่ merge เอง · free branch ให้ UX*
