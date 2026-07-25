# Songmaker Mockup — Completeness Map (ก้าว 3)

> **ก้าวที่ 3 ของงานยกเครื่องตัวแก้เพลง v2.** ก้าว 1 = user story/journey (`docs/us/songmaker.md`) · ก้าว 2 = IA (`docs/ds/songmaker-ia.md`) · **ก้าว 3 = เอกสารนี้ + mockup บน component จริง** · ก้าว 4 = build logic.
>
> **หน้าที่เอกสารนี้ (self-gate กันตกหล่น):** เอา **~65 function** ทุกตัวจาก IA §3 มาแม็ปเป็น **visual placement จริง** (เดสก์ท็อป + มือถือ 360–412) + ยืนยัน progressive-disclosure tier (พื้นฐาน B / ขั้นสูง A) + ยืนยัน **ไม่มี function ไหน orphan**. mockup ต้องมี "บ้าน" ให้ทุกตัวตามตารางนี้.
>
> **ขอบเขต mockup (P'Aim ล็อก):** reuse ของเดิม · re-layout ตามผัง IA · ⛔ ไม่ rebuild engine/โมเดล · ⛔ ยังไม่ wire logic (ก้าว 4). advanced function = วางเป็น control จริงที่เห็น/กดเปิดชั้นได้ ไม่ต้องต่อ logic.

---

## 0. Component reuse map (บน component จริง — ไม่ throwaway)

| Surface | Component จริงที่ reuse/สร้าง | สถานะ |
|---|---|---|
| **S1** App bar | `ShellBar.vue` (teleport `#shell-title`/`#shell-menus`/slot right) — เดิม | reuse + เพิ่ม edit-context + multi-select state (mockup teleports) |
| **S2** Nav drawer | คอนเซปต์ `PKDrawer` (menu-drawer-spec) — ยังไม่มีไฟล์ | mockup: ปุ่ม ☰ เปิด off-canvas panel (โครง) |
| **S3** ✏️ FAB | ปุ่ม FAB (Material) — โหมดดูเท่านั้น | mockup: FAB ในโหมดดู · หาย/morph ตอนแก้ |
| **S4** DockKey | `DockKey.vue` engine + **ITEMS_EDIT** (`dockkey-print-edit.md §2`, ratified) | **reuse engine 1:1** · ป้อน descriptor edit (keys band + undo/redo/play/save) |
| **S5** แผ่น inline | `SongSheet.vue` (render จริง) + edit affordance overlay (caret · contextual bar chips) | reuse SongSheet render · เพิ่ม edit layer |
| **S6** Note accessory | `NoteAccessory.vue` (สร้างใหม่ dev-ready) — popup desktop / bottom-sheet mobile | สร้าง component จริง |
| **S7** Structure drawer | `StructureDrawer.vue` (สร้างใหม่ dev-ready) — side-sheet desktop / bottom-sheet compact | สร้าง component จริง |
| **S8** Overflow ⚙ | menu ใน DockKey/ShellBar (kind `menu`/`gear` มีใน engine) | reuse engine menu |
| **S9** Ambient | overlay signal (lint chip · save status · running highlight) — CSS/prop บน S5/S1 | เพิ่ม visual layer |
| **S10** Import/Verify | `ImportVerify.vue` (สร้างใหม่ dev-ready) — โหมด/หน้าแยก (queue · diff · flag-jump) | สร้าง component จริง |

**Mockup host:** `src/views/SongMaker.vue` (route `/songmaker`) — ประกอบทุก surface บน shell จริง + theme token จริง (`styles.css`). มี toggle **"ผังชั้น (S1–S10)"** ให้ P'Aim/tester เห็น label ว่า control ไหน = surface ไหน (ยืนยัน coverage). Sub-components (S6/S7/S10) = ไฟล์จริง ยกไปใช้ต่อก้าว 4.

---

## 1. Function → placement map (~65 · ไล่ตาม IA §3 · ไม่ตกหล่น)

**คอลัมน์:** Freq (F1 continuous…F6 batch) · Surface (§2 IA) · **Desktop placement** · **Mobile 360–412 placement** · PD (B พื้นฐานเห็นเลย / A ขั้นสูงซ่อน 1 ชั้น). ✅ = มีบ้านใน mockup.

### M1 — เข้าเริ่มงาน / ตั้งค่า (6)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|1| สร้างเพลงใหม่ | F4 | S1/S2 | ปุ่ม "＋เพลงใหม่" ใน panel "เพลง ▾" (S1) | เต็มกว้างใน sheet panel ใต้ bar | B | ✅ |
|2| เปิดเพลงเดิมมาแก้ | F4 | S1→S3 | ค้นใน "เพลง ▾" → เปิด → ✏️ FAB | เหมือนกัน (panel เต็มกว้าง) | B | ✅ |
|3| ทำต่อจากร่าง / "งานของฉัน" | F4 | S1→S8 | เมนู 👤/⚙ → "งานของฉัน" (ร่าง/รอตรวจ/ส่งกลับ) | ในเมนู overflow | B | ✅ |
|4| เตือนฉบับใหม่กว่าอีกเครื่อง + เลือกฉบับ | F5 | S9→dialog | banner S9 บนหัวแผ่น → dialog เลือกฉบับ | banner เต็มกว้าง → dialog | B | ✅ |
|5| ตั้งค่าเพลง (ชื่อ/คีย์/อัตราจังหวะ/ความเร็ว/เล่ม) | F4 | S8 | ⚙ dock → แผง "ตั้งค่าเพลง" | ⚙ → bottom-sheet | B | ✅ |
|6| ลบเพลง / ทิ้งร่าง (ยืนยัน+กู้คืน) | F4 | S8 | ⚙ → "ลบเพลง" (ยืนยัน) | ⚙ → รายการ | B | ✅ |

### M2 — ทำนอง (โน้ตตัวเลข) (7)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|7| พิมพ์โน้ต 1–7 + auto-advance | F1 | S5 | caret บนแผ่น + พิมพ์ | เหมือนกัน (แป้น S4 ช่วย) | B | ✅ |
|8| IME-robust (แป้น OS ไทย/อังกฤษ) | F1 | S5 | (พฤติกรรม · ไม่มี UI) — note ธง | — | B | ✅ (flag) |
|9| octave บน/ล่าง (auto-position) | F2 | S6 (+แป้น S4) | popup ↑↓ octave · แป้น `.` | bottom-sheet octave | B | ✅ |
|10| ความยาว/ลาก `-` · tie `~` | F2 | S5/S4 | แป้นโน้ต `-` `~` | เหมือนกัน | B | ✅ |
|11| แบ่งห้อง `|` | F2 | S5 | แป้น `|` / ปุ่ม +ห้อง inline | เหมือนกัน | B | ✅ |
|12| ชุดสัญลักษณ์ jianpu **พื้นฐาน** (1–7,0,`-`,`|`,`.`octave) | F2 | **S4 แป้นโน้ต** | keys band แถว 1 (default เห็น) | keys band (แตะ) | **B** | ✅ |
|13| ชุดสัญลักษณ์ **ขั้นสูง** (ขีดใต้ 1/8·1/16, dotted, slur, #/b/n, `‖: :‖`, grace, fermata, **caesura `//`**, **breath `'`**) | F3 | **S6 "สัญลักษณ์เพิ่ม"** | ปุ่ม "สัญลักษณ์เพิ่ม ▾" ใน accessory | bottom-sheet grid ขั้นสูง | **A** | ✅ |
|—| ธง "มาตรฐานมีแต่ระบบยังไม่มี" | — | build flag | (ไม่ใช่ control) | — | — | n/a |

### M3 — เนื้อร้อง (6)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|14| พิมพ์เนื้อต่อเนื่อง 1 พยางค์/โน้ต + auto-advance | F1 | S5 | caret เนื้อใต้โน้ต | เหมือนกัน | B | ✅ |
|15| แยกคำ/เอื้อน (melisma 🔗) | F2 | S5+S6 | ปุ่มโซ่ 🔗 ใน accessory | bottom-sheet | B | ✅ |
|16| lyric hyphenation (อังกฤษ/bilingual) | F2 | S5 | ขีดแบ่งพยางค์ (accessory) | เหมือนกัน | A | ✅ |
|17| วางเนื้อยาว → เว้นวรรค=แบ่งพยางค์ → พรีวิว | F3 | S6/dialog | ปุ่ม "วางเนื้อยาว" → dialog พรีวิวแบ่ง | full-screen dialog | B | ✅ |
|18| หลายข้อบนทำนองเดียว (share) | F3 | S7 | การ์ดท่อน → "＋เพิ่มข้อ" | bottom-sheet card | B | ✅ |
|19| เตือน shared-stanza + "แก้ร่วม/แยกข้อ" | F5→dialog | S9→S7 | dialog เตือนก่อนแก้ทำนองร่วม | dialog เต็มกว้าง | A | ✅ |

### M4 — คอร์ด + คีย์ (6)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|20| ใส่คอร์ด (2 คอร์ด/ห้อง) | F2 | S6 | popup ช่องคอร์ดเหนือโน้ต | bottom-sheet คอร์ด | B | ✅ |
|21| ใส่คอร์ดบนมือถือ (มีทางป้อน) | F2 | S6 accessory | — | chip คอร์ดที่ใช้บ่อย + ป้อนเอง | B | ✅ |
|22| คีย์ตั้งต้นทั้งเพลง (global key) | F4 | S8 | ⚙ → ตั้งค่าเพลง → คีย์ | เหมือนกัน | B | ✅ |
|23| transpose ทั้งเพลง | F3* | S8 | ⚙ → คีย์ (badge) *(C2: F3 ทบทวน)* | เหมือนกัน | B | ✅ |
|24| modulation (เปลี่ยนคีย์กลางเพลง) — ตั้งที่ห้อง | F4 | S5/S6→S9 | accessory ห้อง → "เปลี่ยนคีย์ที่นี่" → ป้าย S9 | bottom-sheet | **A** | ✅ |
|25| เปลี่ยนอัตราจังหวะกลางเพลง (4/4→3/4) — ที่ห้อง | F4 | S5/S6→S9 | accessory → "เปลี่ยนอัตราจังหวะ" → ป้าย | bottom-sheet | **A** | ✅ |

### M5 — แก้ตรงจุด (หัวใจ) (5)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|26| คลิก/แตะโน้ต/คำ = cursor ไปตรงนั้น | F1 | S5 | caret + ไฮไลต์ | เหมือนกัน | B | ✅ |
|27| แทรก/ลบตรง caret (Delete≠Backspace) | F1 | S5 | (พฤติกรรม) + hint | แป้น ⌫ ใน S4 | B | ✅ |
|28| พิมพ์ทับ (overtype) + แทรก/ripple | F1 | S5 | (พฤติกรรม) | เหมือนกัน | B | ✅ |
|29| toggle เครื่องหมายสมมาตรครบทุกตัว | F2 | S6 | accessory (กด=ใส่ · กดซ้ำ=ลบ) | bottom-sheet | B/A | ✅ |
|30| undo / redo | F2 | S4 row1 | ปุ่ม ↩︎ ↪︎ ใน dock | dock row1 | B | ✅ |

### M6 — โครงสร้าง + การวนร้อง (17)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|31| แบ่ง/ตั้งชื่อท่อน | F3 | S7 | การ์ดท่อน (ชื่อแก้ inline) | bottom-sheet card | B | ✅ |
|32| จัดลำดับท่อน (ลากการ์ด, real-time) | F3 | S7 | ลากการ์ด (grip) | ลากใน bottom-sheet | B | ✅ |
|33| ท่อน↔ทำนองไหน + ไฮไลต์ท่อนกระทบ | F5 | S9 | badge "ทำนอง A" + เรืองแสง | เหมือนกัน | B | ✅ |
|34| ร้องรับรายข้อ (รับโชว์ครั้งเดียว) | F3 | S7 | สลับ "ร้องรับหลังทุกข้อ" | เหมือนกัน | B | ✅ |
|35| ซ้ำท่อน `‖: :‖` | F3 | S5 (ต่อช่วง) | ปุ่ม repeat inline ที่ ending | เหมือนกัน | A | ✅ |
|36| repeat-count ≥2 ("ร้อง N ครั้ง") | F3 | S5/S7 | stepper "×N" บน repeat | เหมือนกัน | A | ✅ |
|37| measure-repeat `%` (simile/vamp) | F3 | S5/S6 | แป้นขั้นสูง `%` ที่ห้อง | bottom-sheet | A | ✅ |
|38| volta หลายกล่อง / ช่วงรอบ (1.-3./4.) | F3 | S5+S7 | กล่อง ending ที่ bar + การ์ด | เหมือนกัน | A | ✅ |
|39| จุดปัก Segno 𝄋 / Coda 𝄌 (anchor ที่ห้อง) | F4 | S5 | accessory ห้อง → "ปัก Segno/Coda" | bottom-sheet | A | ✅ |
|40| คำสั่งกระโดด D.C./D.S./To Coda/Fine | F4 | S7 | การ์ด "คำสั่งกระโดด" ใน drawer | bottom-sheet | A | ✅ |
|41| เส้นจบเพลง (double barline) | F4 | S5 | accessory ห้องท้าย → "เส้นจบ" | เหมือนกัน | A | ✅ |
|42| ห้องยก (pickup/anacrusis) | F4 | S5 | accessory ห้องแรก → "ห้องยก" | เหมือนกัน | A | ✅ |
|43| ย้อนกลางห้อง (จุดซ้ำไม่ตรงเส้นห้อง) | F4 | S5 | accessory → จุดซ้ำย่อย | เหมือนกัน | A | ✅ |
|44| copy → เห็น insertion-point → paste (ทุก scope) | F3 | S5 | ghost insertion caret ก่อนวาง | เหมือนกัน | B | ✅ |
|45| ย้ายห้อง/บรรทัด/ท่อน โดยตรง | F3 | S5·S7 | ลากห้อง/บรรทัด · ท่อน=drawer | เหมือนกัน | B | ✅ |
|46| multi-select ช่วง → contextual action bar | F3 | S5→**S1** | เลือกหลายห้อง → app bar เป็นแถบ action | เหมือนกัน (S1 แปลงร่าง) | B | ✅ |
|47| Duplicate ท่อน (share) · Make Unique (clone) | F3 | S7 | เมนูการ์ด "⋯" | bottom-sheet card menu | A | ✅ |
|48| ป้ายคำสั่งการร้อง (เดี่ยว/พร้อม/สร้อย) | F3 | S7 | "＋ป้ายคำสั่ง" ใน drawer | bottom-sheet | A | ✅ |
|49| ลบท่อน/ข้อ (เตือนถ้าใช้ทำนองร่วม) | F3 | S7 | เมนูการ์ด "ลบ" (ยืนยัน) | เหมือนกัน | B | ✅ |

### M7 — ตรวจความถูกต้อง (2)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|50| สัญญาณห้องจังหวะไม่ครบ/เกิน (+เหตุ · ไม่เตือน pickup) | F5 | S9 | เส้นใต้ห้อง/ไอคอน ⚠ + tooltip | ไอคอน ⚠ แตะดูเหตุ | B | ✅ |
|51| สัญญาณโครงขัดเงื่อนไข (D.S. ไม่มี Segno) | F5 | S9 | chip เตือนบนแผ่น/drawer | เหมือนกัน | A | ✅ |

### M8 — ฟัง/ตรวจด้วยหู (4)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|52| เล่น "ห้องนี้" / ท่อน / จาก caret | F2 | S4 | ปุ่ม ▶ "ฟังท่อน" (scope=selection) | dock row1 | B | ✅ |
|53| เล่นทั้งเพลง (demote) | F3 | S8/S4-row2 | ⚙ → "ฟังทั้งเพลง" · Space shortcut | ⚙ | B | ✅ |
|54| หยุดเสียงได้เสมอ | F2 | S4 | ปุ่ม ⏹ คู่ ▶ (สลับตามสถานะ) | dock | B | ✅ |
|55| ไฮไลต์วิ่งตามโน้ต (ไม่ผูกพยางค์อย่างเดียว) | F5 | S9 | ไฮไลต์วิ่ง (reuse SongSheet playingSyl/Seg) | เหมือนกัน | B | ✅ |

### M9 — บันทึก / ส่งมอบ (5)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|56| สถานะบันทึกชัด (บันทึกแล้ว✓/ยัง) | F5 | S9 (+S1 mirror) | chip "บันทึกแล้ว ✓" หัวแผ่น + S1 | S1 mirror | B | ✅ |
|57| autosave working copy | F5 | (ระบบ) | (ไม่มี UI · สะท้อนที่ #56) | — | B | ✅ |
|58| offline: เก็บ local + คิวส่ง + แจ้ง | F5 | S9 | chip "ออฟไลน์ · คิวส่ง" | เหมือนกัน | B | ✅ |
|59| ปุ่มหลัก "จบงาน" role-aware (ร่าง/ส่งตรวจ/เผยแพร่) | F4 | S4 prime | ปุ่ม prime บน dock row2 (label ตาม role) + stepper | dock row2 | B | ✅ |
|—| (ผู้ตรวจ R: banner อนุมัติ/ส่งกลับ) | F4 | S9/banner | banner approver | — | — | ✅ (nอก persona) |

### M10 — preview / print / share (3)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|60| preview ต่อเนื่อง ↔ ประหยัดกระดาษ | F4 | S8 | ⚙ → toggle พรีวิว | เหมือนกัน | B | ✅ |
|61| พิมพ์ A4 | F4 | S4/S8 | ⚙ → พิมพ์ (หรือโหมดพิมพ์) | เหมือนกัน | B | ✅ |
|62| แชร์ลิงก์/QR (โดเมน public) | F4 | S8/S2 | ⚙/☰ → แชร์ | เหมือนกัน | B | ✅ |

### M11 — พิมพ์ตามต้นฉบับ + นำเข้า/ตรวจสอบ → S10 (13)
| # | Function | Freq | Surface | Desktop | Mobile | PD | ✅ |
|--|--|--|--|--|--|--|--|
|63| อ้างอิงต้นฉบับระหว่างพิมพ์ (transcription) | F6 | S10 คู่ S5 | reference pane คู่แผ่น | ต้นฉบับสลับแท็บ/แนบ | B | ✅ |
|64| นำเข้าผล parser → "ร่างรอตรวจ" + คิว batch | F6 | S10 | รายการคิว (list) | รายการเต็มกว้าง | B | ✅ |
|65| provenance (มาจากไฟล์ไหน) | F6 | S10 | caption ต่อรายการ + เปิดดู | เหมือนกัน | B | ✅ |
|66| reject/ทิ้งทั้งเพลงจากคิว | F6 | S10 | ปุ่ม "ทิ้ง" ต่อรายการ | swipe/ปุ่ม | B | ✅ |
|67| dedup/merge (สร้างใหม่/ทับ/ยกเลิก) | F6 | S10 | dialog ก่อนตรวจ | เหมือนกัน | B | ✅ |
|68| เทียบต้นฉบับ (diff pane) | F6 | S10 | 2-pane: ต้นฉบับ ↔ ผล | สลับแท็บ ต้นฉบับ/ผล | B | ✅ |
|69| ธง + กระโดดจุดเสี่ยง (octave/ขีดใต้/volta/พยางค์/accidental) + confidence sort | F6 | S10 | แถบธง "จุดเสี่ยง ▸ ถัดไป" | chip ธง + ▸ | B | ✅ |
|70| แก้ inline จากจุดที่ตรวจพบ (ยืม S5) | F1 | S5 | เปิด accessory จากธง | เหมือนกัน | B | ✅ |
|71| ฟัง synth ผล import (ยืม S4, A/B) | F2 | S4 | ปุ่มฟัง + A/B ต้นฉบับ | dock | B | ✅ |
|72| mark "ตรวจแล้ว" รายเพลง + ความคืบหน้าคิว | F6 | S10 | checkbox + progress bar | เหมือนกัน | B | ✅ |
|73| จำสถานะคิว (ปิด/เน็ตหลุด→ต่อจุดเดิม) | F5/F6 | S10/S9 | resume banner | เหมือนกัน | B | ✅ |
|74| skip เพลงยาก + วนกลับ | F6 | S10 | ปุ่ม "ข้ามไว้ก่อน" | เหมือนกัน | B | ✅ |
|75| guardrail mass-approve (เตือนถ้ายังมีเสี่ยง) | F6 | S9→S10 | dialog เตือนก่อน bulk | เหมือนกัน | B | ✅ |

> **นับรวม: 75 rows** (ครอบ ~65 function หลัก + AC ย่อยที่เป็น control แยก · N-review fold ครบ: repeat-count #36 · measure-repeat #37 · multi-select→action-bar #46 · caesura/breath ใน #13 · meter-change #25). **ไม่มี function orphan** — ทุกตัวมี ✅ บ้านใน mockup ตาม surface. รายการ "build flag / ไม่มี UI" (#8 IME, #57 autosave) = พฤติกรรม ไม่ใช่ control → สะท้อนที่ signal/hint แทน.

---

## 2. Progressive-disclosure ledger (พิสูจน์ north-star)

**เห็นทันที default (พื้นฐาน B · คนไม่รู้ดนตรี):** ✏️ เข้าแก้ (S3) · พิมพ์โน้ต+เนื้อ+คลิกแก้ (S5) · แป้นโน้ตพื้นฐาน 1–7/0/`-`/`|`/`.` (S4 keys band แถว 1) · undo/redo · ฟังท่อน+หยุด (S4 row1) · จัดท่อนลากการ์ด (S7) · บันทึก/ส่งตรวจ (S4 prime) · พิมพ์/แชร์ (S8) · import guided (S10).

**ซ่อนหลัง disclosure 1 ชั้น (ขั้นสูง A · คนรู้ดนตรี · power path เข้าถึงได้เสมอ):**
- **S6 "สัญลักษณ์เพิ่ม ▾"** — ขีดใต้ 1/8·1/16 · dotted · slur · #/b/n · fermata · grace · **caesura `//`** · **breath `'`** · measure-repeat `%`
- **S6/S5 ที่ห้อง** — modulation · meter-change · Segno/Coda anchor · pickup · ย้อนกลางห้อง · double-barline · repeat-count
- **S7 drawer** — Make-Unique · คำสั่งกระโดด D.C./D.S./Fine · ป้ายคำสั่งการร้อง · volta ช่วง
- **S8 ⚙** — คอร์ดโรมัน · JSON · ตั้งค่าเพลงลึก

**กฎที่ mockup ต้องพิสูจน์:** ของ A **ห้าม**อยู่บน surface default (S3/S4-core keys แถว1/S5 พื้นฐาน) · ต้องกดเปิด 1 ชั้น · แต่ **ถึงได้ในกดเดียวจากบริบทที่เกี่ยว**. mockup แสดง 2 สภาพ: (ก) ปิดชั้นขั้นสูง (จอสะอาด คนพื้นฐาน) · (ข) เปิดชั้นขั้นสูง (power path).

---

## 3. Mobile-first checklist (360–412 · first-class)
- S7 = **bottom-sheet / full-screen** บน compact (A6 · side-sheet เฉพาะ tablet/desktop) — ไม่บีบแผ่น jianpu
- S6 = **keyboard-accessory / bottom-sheet** (ไม่ใช่ popup เกาะ cursor แบบ desktop)
- S4 dock = ไม่ทับแผ่น (padding-bottom เผื่อความสูง dock + safe-area)
- ทุก target ≥ 24px (WCAG 2.2 AA · app floor 44px) · ไม่มี h-scroll ที่ 360
- S1 multi-select → contextual action bar เต็มกว้าง (thumb-reach)

---

## 4. ⛔ ไม่ wire ในก้าวนี้ (= ก้าว 4 logic)
พฤติกรรมจริงทั้งหมด: พิมพ์จริง/auto-advance · caret จริง · โมเดล jump/modulation/pickup · drag reorder จริง · playback scope · import parser จริง · autosave/offline. mockup = **layout + รูปลักษณ์ + progressive disclosure + ยืนยันบ้านครบ** เท่านั้น. control ขั้นสูงที่ยังไม่มี logic = แสดงเป็นปุ่ม/ช่องจริงที่กดเปิดชั้นได้ (visual) · ผูก handler = ก้าว 4.
