# SA feasibility — B109 shortcut ข้ามห้อง/บรรทัด หน้าแก้เพลง (คู่กับ UX)

**โจทย์ (พี่เปา · P'Aim จ่าย):** Space = ไปพยางค์/โน้ตถัดไป (มีแล้ว) → เพิ่ม **ข้ามห้อง (bar) + ข้ามบรรทัด (line)** ด้วยคีย์บอร์ด · ทุก device
**UX นำ design (คีย์ไหน/ปุ่มบนจอ) · SA ตอบ "ทำได้ไหม + จุดต่อ"** · ⛔ **read-only · ไม่แตะ `EditorMode.vue`** (dock-space ถือ lane · build หลัง dock-space ปิด)
**verify โค้ดจริง:** `EditorMode.vue` 2026-07-18

---

## สรุป: ✅ ทำได้ · **refine** · addressing สำหรับ jump มีครบแล้ว · cross-device = ปุ่มบนจอสำหรับมือถือ

| คำถาม PM | คำตอบ |
|---|---|
| nav/focus ปัจจุบัน · "ห้อง/บรรทัดถัดไป" ในข้อมูล · jump ทำที่ไหน | **`slotStarts["li-bi-si"]` map (บรรทัด,ห้อง,seg)→slot แรก · `data-bar="li-bi"` · `focusSlot(n)` · `[data-bar] .note-box`** — jump = คำนวณ target แล้วเรียกของที่มี ✅ |
| ทำได้จริง + จุดต่อ | ✅ refine — เพิ่ม nav function (next-bar/next-line target) + wire คีย์/ปุ่ม · ไม่ต้องรื้อ model |
| กระทบ dock keyboard-aware ไหม | **jump ระหว่าง input = คีย์บอร์ดยังเปิด → visualViewport ไม่เปลี่ยน → ไม่ trigger dock-hide ผิด** · ⚠️ แต่คีย์ nav **ต้อง `preventDefault`** ไม่งั้นเลื่อนหน้า → ไป trigger hide-on-scroll (Q1) |
| cross-device (มือถือไม่มี Tab/Ctrl) | nav ต้องมาจาก **ปุ่มบนจอ** (keypad band `keys`/dock) เรียก jump function เดียวกัน — physical key = desktop เท่านั้น |

---

## 1 · nav/focus model ปัจจุบัน (ยืนยันในโค้ด)

- **`focusedSlot`** = global slot index · **`focusSlot(target, caret)`** (:348) = set + focus `[data-slot="N"]` + วาง caret
- **`onSylKey`** (:374) ในช่องพยางค์: **Space** = แยกพยางค์ที่ caret แล้ว **`focusSlot(i+1)`** (ไปช่องถัดไป) · Enter=distribute · Backspace-ต้นช่อง=รวมซ้าย · Delete-ท้ายช่อง=รวมขวา
- **slot เรียง global ต่อเนื่องทั้ง stanza** → Space ข้ามขอบห้อง/บรรทัดโดยปริยายอยู่แล้ว (ทีละช่อง) · **โจทย์ = jump ตรงไปห้อง/บรรทัดถัดไป (ข้ามช่องกลาง) ไม่ใช่ทีละก้าว**
- **โน้ต side:** `activeInput` (:879) = note box ที่ focus (สำหรับ keypad) · `[data-bar="li-bi"] .note-box` (:905, ใช้ใน `addBar`) = โฟกัสโน้ตแรกของห้อง

## 2 · "ห้องถัดไป / บรรทัดถัดไป" = คำนวณได้จากข้อมูลที่มี (จุดต่อชัด)

- **`slotStarts.value["li-bi-si"]`** (:299) = slot index เริ่มต้นของ segment นั้น → **"slot แรกของห้อง (li,bi)" = `slotStarts["li-bi-0"]`** · "slot แรกของบรรทัด li" = ห้อง 0 ของบรรทัดนั้น
- **โครง stanza:** line = array มี `{type:'bar'}` คั่น · `activeLine`/`activeStanza` บอกตำแหน่งปัจจุบัน · `data-bar="li-bi"` (:2869) จับทุกห้อง
- **→ jump function ที่ต้องเพิ่ม (build phase):**
  - `jumpBar(+1/-1)`: current slot → หา (li,bi) ปัจจุบัน → bi±1 (หรือข้ามบรรทัด) → `focusSlot(slotStarts["li-bi-0"])`
  - `jumpLine(+1/-1)`: li±1 → ห้อง 0 → slot แรก
  - โน้ต side: `[data-bar="li-bi"] .note-box` เดิม
- **ทั้งหมด reuse `focusSlot`/`slotStarts`/`data-bar` ที่มีอยู่** = **จุดต่อครบ ไม่มีของที่ต้องสร้างจากศูนย์**

## 3 · cross-device — มือถือไม่มี Tab/Ctrl → ปุ่มบนจอ (สำคัญ)

- **desktop / คีย์บอร์ดนอก:** bind physical key (UX เลือก — เช่น Ctrl+→ ห้อง · Ctrl+↓ บรรทัด · หรือ Tab/Shift+Tab) — ได้เลย
- **มือถือ (soft keyboard):** **ไม่มี Tab/Ctrl/ลูกศร reliable** → jump **ต้องมาจากปุ่มบนจอ** (แถบ `keys` keypad band E1 ที่มีอยู่ · หรือปุ่ม nav ใน dock) → เรียก **jump function เดียวกัน** กับ physical key
- **→ feasibility ฝั่ง input:** jump = **1 ฟังก์ชันกลาง · 2 ทางเรียก** (physical key = desktop · ปุ่มจอ = ทุก device) · **UX ออกแบบปุ่มบนจอ + เลือกคีย์ · SA ยืนยันฟังก์ชันเป็น target ร่วม** (เหมือนแพตเทิร์น jump ที่ addBar ทำ)

## 4 · ⚠️ interaction กับ dock-space keyboard-aware (อย่าให้ชนกัน)

- **jump ระหว่างช่อง input → คีย์บอร์ดยังเปิด** → `visualViewport.height` ไม่เปลี่ยน → **ไม่ trigger dock auto-hide ผิด** ✅ (โจทย์ที่ PM ห่วง = ปลอดภัยโดยธรรมชาติ)
- **🔴 ข้อควรทำ:** คีย์ nav ใหม่ (และ Space เดิมก็ทำอยู่) **ต้อง `preventDefault`** — ไม่งั้น native scroll (Space/ลูกศรเลื่อนหน้า) จะไป trigger **hide-on-scroll** (Q1 `window` scroll) = dock กระพริบ · **บอก dev: ทุก nav key preventDefault**
- ถ้า jump ไป element ที่**ไม่ใช่ text input** (โน้ต box บางแบบ) → คีย์บอร์ดปิด → viewport โต → dock อาจโผล่กลับ = **ถูกต้อง** (ไม่ใช่บั๊ก)

## 5 · collision + ลำดับ

- **ทุกจุดอยู่ใน `EditorMode.vue`** (`onSylKey`/`focusSlot`/nav/keypad band) = **ไฟล์ร้อนที่ dock-space ถือ lane อยู่** → **B109 build หลัง dock-space ปิด** (1 ไฟล์ 1 สาย · PM sequence) · **ตอนนี้ read-only** — feasibility ใบนี้พร้อมให้ตอน UX flow มา
- ไม่กระทบ 2-host (พระคำ) — nav เป็นของ editor เพลงล้วน ไม่ใช่ DockKey engine

## 6 · ที่ SA ไม่ตัดสินแทน — ส่ง UX

1. **คีย์ไหน** (Ctrl+arrow / Tab / อื่น) + **ปุ่มบนจอหน้าตา/ตำแหน่ง** = UX (SA ยืนยัน physical+on-screen เรียกฟังก์ชันเดียว)
2. jump ครอบ **พยางค์ side + โน้ต side** ทั้งคู่ไหม (หรือเฉพาะที่ focus อยู่) = UX flow
3. ยังไม่ build — read-only จน dock-space ปิด + PM sequence

---

*verify โค้ดจริง 2026-07-18 · SA (feasibility · read-only) · ฐาน `studio-shell-redesign`*
