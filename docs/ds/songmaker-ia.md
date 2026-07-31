# Songmaker — Information Architecture (การจัดกลุ่ม function ตามมาตรฐาน)

> **ก้าวที่ 2 ของงานยกเครื่องตัวแก้เพลง v2** (P'Aim reset "ปะผุ" → ทำใหม่ทีละก้าว)
> ก้าว 1 = user story + journey (`docs/us/songmaker.md`, gate ผ่านแล้ว) → **ก้าว 2 = เอกสารนี้ (IA / จัดกลุ่ม function)** → ก้าว 3 = mockup → ก้าว 4 = build.
>
> **ขอบเขตเอกสารนี้ (เท่านี้ · ไม่เกิน):** เอา function/action ทุกตัวที่โผล่ใน journey+stories มา **จัดกลุ่มตามมาตรฐาน Information Architecture** — (ก) frequency/context (ข) ชั้นการเข้าถึง (ค) role-aware. **ยังไม่วาดปุ่ม/ตำแหน่ง pixel/layout จริง — นั่นก้าว 3.** ที่นี่ตอบว่า *function ไหนควรอยู่ "ชั้น" ไหน และทำไม (อ้างมาตรฐาน)* ไม่ใช่ *อยู่พิกัดไหนบนจอ*.
>
> **North Star (ยกจาก step 1 · วัดทุกการจัดกลุ่มย้อนกับข้อนี้):** เครื่องมือทำเพลงต้อง **สองด้านพร้อมกัน ไม่แลกกัน** — (1) ง่ายสำหรับคนไม่รู้ดนตรี (ของพื้นฐานเด่น/หาง่าย · progressive disclosure) **และในเวลาเดียวกัน** คนรู้ดนตรีใช้ขั้นสูงได้เต็ม (power path เข้าถึงได้ไม่เกะกะ) · (2) ตรงมาตรฐาน 2 แกน — ดนตรี (jianpu) + ซอฟต์แวร์ระดับโลก (Material / Apple HIG / WCAG 2.2 AA).

---

## 0. อินพุต + ข้อล็อกที่เอกสารนี้เคารพ

**อินพุตหลัก:** `docs/us/songmaker.md` (persona พี่เปา · journey 10 สเตจ · EPIC M1–M11 · ~40 stories · import/verify เป็น first-class)

**ข้อล็อกของ P'Aim (reconcile — เอกสารนี้ไม่ละเมิด):**
| ล็อก | เอกสารนี้ทำตามยังไง |
|---|---|
| **DockKey (แถบล่าง) "ดีอยู่แล้ว ไม่แตะ"** | เคารพ **กลไก** DockKey เป็นสิ่งที่มีอยู่ (surface **S4**) · เอกสารนี้ **ไม่แก้ core/engine ของ dock** · จัดกลุ่มโดยยึด descriptor edit-mode ที่ **ratify แล้ว** ใน `docs/ds/dockkey-print-edit.md §2` เป็นฐาน (ไม่คิดใหม่) |
| **ไม่รื้อ engine/โมเดล (~70% แข็งแล้ว)** | IA จัด **UI function** ไม่แตะโมเดล · story ที่มี model-gap (D.C./modulation ฯลฯ) จัดชั้นการเข้าถึงไว้ล่วงหน้า — เติม case ในโมเดลเป็นงาน build |
| **มุ่ง inline pencil ✏️ (`SongViewer.vue`) เป็นตัวหลัก · grid เก่า `EditorMode.vue` = ลดบทบาท** | surface **S5 = แก้ inline บนแผ่น** เป็นชั้นหลักของการแก้ · โครง grid เดิม = build-reference เท่านั้น |

**ข้อล็อกจาก DS ที่ ratify แล้ว (เอกสารนี้สร้างต่อ ไม่ขัด):**
- `dockkey-print-edit.md §2` — edit-DockKey descriptor + กฎ **"เครื่องมือโครงสร้างต่อห้อง/บรรทัด = คงไว้ inline ไม่ขึ้น dock"** (dock รับเฉพาะคำสั่ง global) → เอกสารนี้รับกฎนี้ (ดู §4 การแยก inline vs Drawer)
- `menu-drawer-spec.md` — **nav drawer ซ้าย off-canvas + scrim** (core ร่วม `PKDrawer` กับพระคำ) = surface **S2** (นำทาง+เครื่องมืออ่าน · คนละตัวกับ Structure Drawer แก้โครง)
- `pleng-edit-open-all-tiers` (memory) — anon แก้/พิมพ์/JSON ได้ · login กันแค่ **save** · publish = สิทธิ์ approver (RLS)

---

## 1. มาตรฐานที่ใช้เป็นเกณฑ์จัดชั้น (คำศัพท์ surface + citation จริง)

จัดชั้น "function → ต้นทุนการเข้าถึง (access cost)" ตามหลักสากล: **ยิ่งใช้บ่อย/สำคัญ ยิ่งอยู่ชั้นที่ถึงง่าย · ยิ่งนาน ๆ ใช้ ยิ่งซ่อนลึกลง (menu/disclosure)** — เพื่อไม่ให้ของขั้นสูงรกจอคนพื้นฐาน (Fitts's law + frequency-of-use + progressive disclosure).

| มาตรฐาน / element | URL | ใช้กำหนดชั้นไหน |
|---|---|---|
| **Material 3 — Top app bar** ("most important actions") | https://m3.material.io/components/top-app-bar/overview | S1 chrome บน |
| **Material 3 — Navigation drawer** | https://m3.material.io/components/navigation-drawer/overview | S2 nav drawer |
| **Material 3 — FAB** ("single, most common action of a screen") | https://m3.material.io/components/floating-action-button/overview | S3 ปุ่มดินสอ ✏️ |
| **Material 3 — Bottom app bar** ("actions for the current screen" + optional FAB) | https://m3.material.io/components/bottom-app-bar/overview | S4 DockKey |
| **Material 3 — Side sheets** | https://m3.material.io/components/side-sheets/overview | S7 Structure Drawer |
| **Material 3 — Bottom sheets** | https://m3.material.io/components/bottom-sheets/overview | S6 mobile accessory |
| **Material 3 — Menus** ("less common actions" / overflow) | https://m3.material.io/components/menus/overview | S8 ⚙ overflow |
| **Material 3 — Lists** | https://m3.material.io/components/lists/overview | S7 การ์ดท่อน · S10 คิว |
| **Apple HIG — Toolbars** ("frequently used commands") | https://developer.apple.com/design/human-interface-guidelines/toolbars | S4 |
| **Apple HIG — Navigation bars** | https://developer.apple.com/design/human-interface-guidelines/navigation-bars | S1 |
| **Apple HIG — Context menus** ("access to additional functionality without cluttering") | https://developer.apple.com/design/human-interface-guidelines/context-menus | S6 popup |
| **Apple HIG — Menus** | https://developer.apple.com/design/human-interface-guidelines/menus | S8 |
| **NN/g — Progressive disclosure** (canonical) | https://www.nngroup.com/articles/progressive-disclosure/ | แกน north-star: พื้นฐานเด่น / ขั้นสูงซ่อน 1 ชั้น |
| **WCAG 2.2 — Target Size (Minimum) 2.5.8 (AA = 24px)** | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | ทุก control ≥24px (dock เดิม 44px = เกินเกณฑ์ AA) — ref memory `wcag-target-size-aa-24-not-44` |

> **หมายเหตุ citation:** URL ทั้งหมดข้างบนเป็นหน้า overview/understanding ที่นิยามหน้าที่ของ component แต่ละตัว — ใช้เป็นฐานว่า "function ชนิดนี้ควรอยู่ component ชนิดไหน". ไม่ได้ก๊อป layout ของ Gmail/YouTube มาตรง ๆ.

---

## 2. Surface model — ชั้นการเข้าถึง 10 ชั้น (IA vocabulary)

นี่คือ "ชั้น" ที่ทุก function จะถูกจัดลง (§5). แต่ละชั้น map กับ component มาตรฐาน + role ที่เห็น. **ยังไม่ใช่ layout** — เป็น "กล่องเชิงตรรกะ" ว่าของอยู่ชั้นไหน.

| # | Surface | มาตรฐานอ้างอิง | ธรรมชาติ (frequency/context) | Role ที่เห็น |
|---|---|---|---|---|
| **S1** | **App bar บน** — identity/mode · up/exit (ออกจากแก้→แผ่น) · ☰ เปิด S2 · สถานะบันทึก · เข้า "งานของฉัน" · **(multi-select) แปลงเป็น contextual action bar** 🆕 — เมื่อเลือกหลายห้อง/บรรทัดใน S5 → app bar กลายเป็นแถบ action ช่วง (ลบ/ย้าย/คัดลอกเป็นช่วง) แล้วกลับเมื่อยกเลิกเลือก (Material 3 contextual action bar) | Material top app bar · HIG nav bar | global-persistent ทุกโหมด | ทุกคน |
| **S2** | **Nav drawer ซ้าย (off-canvas + scrim, `PKDrawer`)** — นำทางเว็บ (เพลง/คู่มือ/เกี่ยวกับ) + เครื่องมืออ่าน/แสดงผล | Material navigation drawer | global-occasional · นำทางระดับเว็บ (ไม่ใช่แก้โครงเพลง) | ทุกคน |
| **S3** | **ปุ่มดินสอ ✏️ (FAB) — โหมดดูเท่านั้น** — เข้าโหมดแก้จากแผ่น (action เดี่ยวที่ใช้บ่อยสุดของหน้าดู · pattern Google Docs edit-FAB) · **หายไป/morph ตอนเข้าโหมดแก้** (dock ถือ primary แทน — กัน focus-warring · G 2a) | Material FAB · HIG primary action | primary entry | canEdit (รวม anon) |
| **S4** | **DockKey (แถบล่าง) — LOCKED กลไก** — คำสั่ง **global ของโหมด**: แป้นโน้ต · ย้อน/ทำซ้ำ · ฟังท่อน↔หยุด · Aa · ⚙ · ปุ่มหลัก "บันทึก/ส่งตรวจ" (label ตาม role) | Material bottom app bar · HIG toolbar | contextual-frequent (per-mode) | canEdit (anon เห็น minimal) |
| **S5** | **แผ่นเพลง inline (direct manipulation)** — พิมพ์โน้ต+เนื้อ · caret · คลิก→แก้ตรงจุด · แทรก/ทับ/ลบ · **ปุ่มโครงสร้าง contextual ต่อห้อง/บรรทัด** (เพิ่มห้อง/บรรทัด · pickup · repeat/volta ตรงนั้น · ลบห้อง) · **บังคับใช้ล็อกทำนอง** (US-M5.6 — โน้ตในท่อนล็อก = แก้ไม่ได้/ปุ่มหรี่ · แตะแล้วเด้ง snackbar · **เนื้อร้องแก้ได้ปกติ**) | HIG direct manipulation · inline text edit | **continuous / object-level (บ่อยสุด)** | canEdit |
| **S6** | **Popup เกาะ cursor (desktop) / keyboard-accessory·bottom-sheet (mobile)** — บนโน้ตที่เลือก: คอร์ด · octave · accidental #/b/n · tie/slur · **"สัญลักษณ์เพิ่ม" (ขั้นสูง)** | HIG context menu · Material bottom sheet · NN/g progressive disclosure | selection-contextual | canEdit |
| **S7** | **Structure Drawer / side sheet — บล็อกการ์ดท่อน** — ตั้งชื่อ/ลาก-เรียงท่อน · เพิ่มข้อ · duplicate/Make-Unique · **toggle 🔒 ล็อก/ปลดล็อกทำนอง ต่อ stanza** (US-M5.6) · D.C./D.S./Segno/Coda/Fine · ป้ายคำสั่งการร้อง · ลบท่อน · **(มือถือ compact 360–412 = bottom-sheet / full-screen · side-sheet เฉพาะ tablet/desktop)** 🆕 | Material side sheet (tablet/desktop) + **bottom sheet / full-screen (compact)** + lists | macro-edit · deep-occasional (เปิดตามต้องการ) | canEdit |
| **S8** | **Overflow ⚙ (ใน S4/S1) — menu** — ตั้งค่าเพลง (ชื่อ/คีย์/อัตราจังหวะ/ความเร็ว/เลขเล่ม) · modulation · transpose ทั้งเพลง · พิมพ์/export · JSON · ลบเพลง · เพิ่มภาษา · toggle พรีวิว · ฟังทั้งเพลง | Material menus · HIG menus | rare / setup | canEdit; publish→approver |
| **S9** | **สัญญาณ ambient (ไม่ใช่ control)** — lint จังหวะไม่ครบ · โครงขัดเงื่อนไข · สถานะบันทึก · ไฮไลต์วิ่งตามโน้ต · badge/เรืองแสง "ทำนองใช้ร่วม" · **badge 🔒 "ทำนองล็อก" + โน้ตหรี่ (muted onSurfaceVariant, ปิด touch) ส่วนเนื้อ contrast เต็ม** (US-M5.6 dimensional-lock cue) · snackbar "ทำนองล็อกอยู่" ตอน enforce | HIG feedback · Material inline validation | system-driven | ทุกคนที่เกี่ยว |
| **S10** | **Import & Verify workspace — โหมด/หน้าแยกสำหรับงานเป็นชุด** — คิวรอตรวจ · provenance · dedup/merge · เทียบต้นฉบับ · ธงจุดเสี่ยง+กระโดด · mark-verified+ความคืบหน้า · skip/resume · guardrail mass-approve (ใช้ S5/S6/S7 ซ้ำตอนแก้รายเพลง) | HIG "modes for distinct tasks" · Material lists | batch task context | editor/approver |

**การแยกที่สำคัญ 2 คู่ (กันสับสน):**
1. **S2 nav drawer ≠ S7 structure drawer.** S2 = นำทางเว็บ (ร่วมกับพระคำ, ซ้าย) · S7 = แก้โครงเพลง (การ์ดท่อน, editor-only). คนละ panel คนละ core.
2. **S5 inline structure (contextual) ≠ S7 drawer structure (macro).** ดู §4 — นี่คือคำตัดสิน IA หลักของเอกสารนี้.

**เพิ่มจาก N-review (2026-07-25 · Material 3 verify):**
3. **multi-select ช่วง (S5) → contextual action bar (S1 แปลงร่าง).** 🆕 (A5) — เลือกหลายห้อง/บรรทัดบนแผ่น (S5) แล้ว app bar (S1) กลายเป็นแถบ action ช่วง: ลบ/ย้าย/คัดลอกเป็นช่วง (Material 3 "app bar can transform into a contextual action bar" · "provide actions for selected items"). โยง US-M6.6 (copy/paste/move รายห้อง → ขยายเป็นช่วง). ⛔ ไม่ใช่ surface ใหม่ถาวร — เป็น **state** ของ S1.
4. **S7 side-sheet ปรับตามจอ.** 🆕 (A6) — coplanar side-sheet บีบแผ่น jianpu ที่แน่นอยู่แล้วบนมือถือ · Material 3: "side sheets are not recommended for narrow screens" → **compact 360–412 ใช้ bottom-sheet / full-screen · side-sheet เฉพาะ tablet/desktop** (เรา first-class มือถือ).

---

## 3. Function inventory (DoC — สืบให้ครบ ไม่ตกหล่น)

ไล่ทุก EPIC/story ใน `songmaker.md` + import/verify. คอลัมน์: **Freq band** (§ล่าง) · **Surface** (§2) · **Role vis** · **PD** (พื้นฐาน B / ขั้นสูง A ตาม north-star). ธง 🆕 net-new · ♻️ ต่อยอด.

**Frequency bands:** **F1** continuous (ทุก keystroke/object) · **F2** frequent (หลายครั้ง/เพลง) · **F3** occasional (ไม่กี่ครั้ง/เพลง) · **F4** rare (ครั้งเดียว/setup) · **F5** ambient (ระบบยิงเอง) · **F6** batch (โหมด import).

### M1 — เข้าเริ่มงาน / ตั้งค่า
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| สร้างเพลงใหม่ | M1.1 | F4 | S1/S2 (จุดเริ่มระดับเว็บ) | ทุกคน | B |
| เปิดเพลงเดิมมาแก้ (ค้น/หา→แผ่น→✏️) | M1.2 | F4 | S1 (ค้น) → S3 (✏️) | ทุกคน | B |
| ทำต่อจากร่าง / "งานของฉัน" (ร่าง/รอตรวจ/ส่งกลับ/อนุมัติ) | M1.3 | F4 | S1 → S8 | canEdit ⚠️ | B |
| เตือนฉบับใหม่กว่าบนอีกเครื่อง + เลือกฉบับ | M1.3 AC3 🆕 | F5 | S9 (แจ้ง) → dialog | canEdit | B |
| ตั้งค่าเพลง: ชื่อ/คีย์/อัตราจังหวะ/ความเร็ว/เลขเล่ม | M1.4 | F4 | **S8** | canEdit | B |
| ลบเพลง / ทิ้งร่าง (ยืนยัน+กู้คืน) | M1.5 🆕 | F4 | **S8** (+ยืนยัน) | canEdit | B |

### M2 — ทำนอง (โน้ตตัวเลข)
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| พิมพ์โน้ต 1–7 + auto-advance | M2.1 | **F1** | **S5** | canEdit | B |
| รับ input ถูกแม้แป้น OS ไทย/อังกฤษ (IME-robust) | M2.1 AC3 🆕 | F1 | S5 (พฤติกรรม) | canEdit | B |
| octave บน/ล่าง (auto-position · ผลเดียวทุกทางป้อน) | M2.2 🆕 | F2 | **S6** (+แป้นใน S4) | canEdit | B |
| ความยาว/ลาก `-` · tie `~` | M2.3 | F2 | S5/S6 (แป้น) | canEdit | B |
| แบ่งห้อง `|` | M2.3 AC3 | F2 | S5 | canEdit | B |
| ชุดสัญลักษณ์ jianpu **พื้นฐาน** (1–7, พัก 0, `-`, `|`, `.`octave) | M2.4 AC1 | F2 | **S4 แป้นโน้ต** (default) | canEdit | **B** |
| ชุดสัญลักษณ์ **ขั้นสูง** (ขีดใต้ 1/8·1/16, dotted, slur, `#`/`b`/`n`, `‖: :‖`, grace, fermata, **caesura `//`** 🆕, **breath `'`** 🆕) | M2.4 AC1 | F3 | **S6 "สัญลักษณ์เพิ่ม"** (disclosure) | canEdit | **A** |
| ธง "มาตรฐานมีแต่ระบบยังไม่มี" | M2.4 AC2 | — | (build flag) | — | — |

### M3 — เนื้อร้อง
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| พิมพ์เนื้อต่อเนื่อง 1 พยางค์/โน้ต + auto-advance | M3.1 🆕 | **F1** | **S5** | canEdit | B |
| แยกคำข้ามโน้ต · เอื้อน (melisma, ปุ่มโซ่ 🔗) | M3.1/บทวิเคราะห์ | F2 | S5 + S6 (🔗) | canEdit | B |
| lyric hyphenation (ขีดแบ่งพยางค์คำข้ามโน้ต — อังกฤษ/bilingual · ≠ melisma) | G3.2 ⚠️ verify model | F2 | S5 | canEdit | A |
| วางเนื้อยาว → เว้นวรรค=แบ่งพยางค์ → พรีวิวก่อน apply | M3.2 🆕♻️ | F3 | S6/dialog (bulk) | canEdit | B |
| หลายข้อบนทำนองเดียว (share) | M3.3 | F3 | **S7** (เพิ่มข้อ) | canEdit | B |
| เตือน shared-stanza + เลือก "แก้ร่วม / แยกข้อ (Make Unique)" | M3.3 AC2 🆕 | F5→dialog | **S9**→S7 | canEdit | A |

### M4 — คอร์ด + คีย์
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| ใส่คอร์ดเหนือโน้ต/ต้นห้อง (2 คอร์ด/ห้อง) | M4.1 | F2 | **S6** (บนโน้ต) | canEdit | B |
| ใส่คอร์ดบนมือถือ (ไม่มีปุ่มพิเศษ→มีทางป้อน) | M4.1 AC3 🆕 | F2 | S6 accessory | canEdit | B |
| คีย์ตั้งต้นทั้งเพลง (global key) | M1.4/M4 | F4 | **S8** | canEdit | B |
| transpose ทั้งเพลง | M4.2 | F4 | **S8** (+ S4 คีย์ในพิมพ์) | canEdit | B |
| modulation (เปลี่ยนคีย์กลางเพลง) — **ตั้งที่ห้อง** | M4.3 🆕 | F4 | **S5/S6 (ที่ห้องจุดเปลี่ยน)** → S9 (ป้ายบนแผ่น) | canEdit | **A** |
| **เปลี่ยนอัตราจังหวะกลางเพลง** (4/4→3/4) — ตั้งที่ห้อง | G3.1 🆕 model-gap | F4 | **S5/S6 (ที่ห้อง)** → S9 | canEdit | **A** |

### M5 — แก้ตรงจุด (หัวใจ "v1 ดีกว่า")
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| คลิก/แตะโน้ต/คำ = cursor ไปตรงนั้น | M5.1 🆕 | **F1** | **S5** | canEdit | B |
| แทรก/ลบตรง caret (Delete≠Backspace) | M5.2 🆕 | F1 | S5 | canEdit | B |
| พิมพ์ทับ (overtype) + แทรก/ripple | M5.3 | F1 | S5 | canEdit | B |
| toggle เครื่องหมายสมมาตรครบทุกตัว | M5.4 🆕 | F2 | S6 | canEdit | B/A |
| undo / redo | M5.5 | F2 | **S4** (row1) | canEdit | B |
| **ล็อก/ปลดล็อกทำนอง (per-stanza) — toggle 🔒** | M5.6 AC1 🆕 | F3 | **S7** (การ์ดท่อน/ทำนอง) | canEdit | **A** |
| **บ่งชี้ทำนองล็อก** (badge 🔒 + โน้ตหรี่/ปิด touch · เนื้อยัง contrast+แก้ได้) | M5.6 AC3 🆕 | F5 | **S9** (+ S7 การ์ด) | ทุกคนที่เกี่ยว | A |
| **บังคับใช้ล็อก** — แตะโน้ตล็อก → snackbar "ทำนองล็อกอยู่" + [ปลดล็อก] / [แยกทำนองข้อนี้] (ถ้าใช้ร่วม) · ปุ่มแก้โน้ตหรี่ | M5.6 AC6 🆕 | F5→dialog | **S5** (enforce) → S9 snackbar | canEdit | A |

### M6 — โครงสร้าง + การวนร้อง (ผูกโมเดล)
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| แบ่ง/ตั้งชื่อท่อน | M6.1 | F3 | **S7** | canEdit | B |
| จัดลำดับท่อน (เห็นผล real-time) | M6.1 | F3 | **S7** (ลากการ์ด) | canEdit | B |
| ท่อน↔ทำนองไหน + ไฮไลต์ท่อนที่กระทบ | M6.1 AC3 🆕 | F5 | **S9** | canEdit | B |
| ร้องรับรายข้อ (รับโชว์ครั้งเดียว วนถูก) | M6.2 ♻️ | F3 | S7 | canEdit | B |
| ซ้ำท่อน `‖: :‖` | M6.3 AC1 ♻️ | F3 | **S5** (ต่อห้อง/ช่วง) | canEdit | A |
| **จำนวนรอบซ้ำ (repeat-count ≥2 · "ร้อง N ครั้ง")** | M6.3 AC4 🆕 (N-review A1) | F3 | **S5 (ต่อ repeat)** / S7 | canEdit | **A** |
| **measure-repeat `%` (ซ้ำห้องก่อนหน้า · simile · vamp)** | M6.3 / M2.4 🆕 (N-review A4) | F3 | **S5 (ต่อห้อง)** / S6 | canEdit | **A** |
| volta หลายกล่อง / ช่วงรอบ (1.-3. / 4.) | M6.3 AC2 🆕 | F3 | S5 (ต่อ ending) + S7 | canEdit | **A** |
| **จุดปัก Segno 𝄋 / Coda 𝄌** (anchor ที่ห้อง) | M6.4 🆕 | F4 | **S5 (ที่ห้อง)** | canEdit | **A** |
| **คำสั่งกระโดด** D.C. / D.S. / To Coda / Fine (อ้างข้ามท่อน) | M6.4 🆕 | F4 | **S7** | canEdit | **A** |
| เส้นจบเพลง (double barline) | M6.4 AC3 🆕 | F4 | S5 (ต่อห้องท้าย) | canEdit | A |
| ห้องยก (pickup/anacrusis) | M6.5 AC1 🆕 | F4 | **S5** (ต่อห้องแรก) | canEdit | A |
| ย้อนกลางห้อง (จุดซ้ำไม่ตรงเส้นห้อง) | M6.5 AC3 🆕 | F4 | S5 | canEdit | A |
| copy → เห็น insertion-point → paste (ทุก scope) | M6.6a 🆕 | F3 | S5 (แสดงจุดวาง) | canEdit | B |
| ย้ายห้อง/บรรทัด/ท่อน โดยตรง | M6.6b 🆕 | F3 | S5 (ห้อง/บรรทัด) · S7 (ท่อน) | canEdit | B |
| **multi-select ช่วงห้อง/บรรทัด → contextual action bar** (ลบ/ย้าย/คัดลอกช่วง) | M6.6 🆕 (N-review A5) | F3 | **S5 เลือก → S1 action bar** | canEdit | B |
| Duplicate ท่อน (default share) · Make Unique (clone) | M6.7 | F3 | **S7** | canEdit | A |
| ป้ายคำสั่งการร้อง (เดี่ยว/พร้อม/ดนตรีรับ/สร้อย · ไม่ผูกทำนอง) | M6.8 🆕 | F3 | **S7** (แทรกป้าย) | canEdit | A |
| ลบท่อน/ข้อ (เตือนถ้าใช้ทำนองร่วม) | M6.9 🆕 | F3 | S7 (+ยืนยัน) | canEdit | B |

### M7 — ตรวจความถูกต้อง (เห็นสัญญาณ แก้เอง)
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| สัญญาณห้องจังหวะไม่ครบ/เกิน (+เหตุ · ไม่เตือน pickup) | M7.1 🆕 | **F5** | **S9** | canEdit | B |
| สัญญาณโครงขัดเงื่อนไข (D.S. ไม่มี Segno · volta ไม่มีที่ซ้ำ) | M7.2 🆕 | F5 | **S9** | canEdit | A |

### M8 — ฟัง/ตรวจด้วยหู
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| เล่น **"ห้องนี้" / ท่อน / จากจุด caret** | M8.1 AC1 🆕 | F2 | **S4** (ฟังท่อน · scope ตาม selection) | canEdit | B |
| เล่นทั้งเพลง | M8.1 AC2 ♻️ | F3 | **S8/S4-row2** (demote) | canEdit | B |
| หยุดเสียงได้เสมอ (แม้สลับเข้าแก้) | M8.2 🆕 | F2 | **S4** (stop คู่ play) | canEdit | B |
| ไฮไลต์วิ่งตามโน้ต (ไม่ผูกพยางค์อย่างเดียว) | M8.3 🆕♻️ | F5 | **S9** | ทุกคน | B |

### M9 — บันทึก / ส่งมอบ
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| สถานะบันทึกชัด (บันทึกแล้ว✓/ยัง) | M9.1 AC1 🆕 | F5 | **S9** (+ S1 mirror) | ทุกคน | B |
| autosave working copy | M9.1 AC2 🆕 | F5 | (ระบบ) | canEdit | B |
| offline: เก็บ local + คิวส่ง + แจ้งสถานะ | M9.1 AC3 🆕 | F5 | S9 | canEdit | B |
| ปุ่มหลัก "จบงาน" role-aware: บันทึกร่าง · ส่งตรวจ · เผยแพร่ | M9.2 🆕 | F4 | **S4** (prime, label ตาม role) | canEdit; publish→approver | B |
| (ผู้ตรวจ R: banner อนุมัติ/ส่งกลับ) | M9.2 AC4 | F4 | S9/banner | approver | — |

### M10 — preview / print / share
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| preview ต่อเนื่อง (ฝึกร้อง) ↔ ประหยัดกระดาษ (พิมพ์) | M10.1 🆕♻️ | F4 | **S8** (toggle พรีวิว) | canEdit | B |
| พิมพ์ A4 | Stage9 ♻️ | F4 | **S4 (โหมดพิมพ์)/S8** | ทุกคน | B |
| แชร์ลิงก์/QR (โดเมน public) | M10.2 🆕 | F4 | **S8/S2** (แชร์) | ทุกคน | B |

### M11 — พิมพ์ตามต้นฉบับ + นำเข้า/ตรวจสอบ (first-class → S10)
| Function | src | Freq | Surface | Role | PD |
|---|---|---|---|---|---|
| อ้างอิงต้นฉบับระหว่างพิมพ์ (transcription) | M11.1 🆕 | F6 | **S10** (คู่ S5) | editor | B |
| นำเข้าผล parser → "ร่างรอตรวจ" + คิว batch | M11.2 AC1 🆕 | F6 | **S10** คิว | editor | B |
| provenance (มาจากไฟล์ไหน · เปิดดูได้) | M11.2 AC2 🆕 | F6 | S10 (ต่อรายการ) | editor | B |
| reject/ทิ้งทั้งเพลงจากคิว | M11.2 AC3 🆕 | F6 | S10 | editor | B |
| dedup/merge กับคลัง (สร้างใหม่/ทับ/ยกเลิก) | M11.3 🆕 | F6 | S10 (ก่อนตรวจ) | editor | B |
| เทียบต้นฉบับ (เปิดควบคู่ ไม่หลุดบริบท) | M11.4 AC1 🆕 | F6 | **S10** (diff pane) | editor | B |
| ธง + กระโดดจุดเสี่ยง (octave/ขีดใต้/volta/พยางค์ไทย/accidental) + confidence sort | M11.4 AC2-3 🆕 | F6 | **S10** (helper เด่น) | editor | B |
| แก้ inline จากจุดที่ตรวจพบ | M11.5 AC1 ♻️ | F1 | **S5** (ยืม) | editor | B |
| ฟัง synth ของผล import (A/B ถ้ามี audio) | M11.5 AC2 🆕 | F2 | **S4** (ยืมฟังท่อน) | editor | B |
| mark "ตรวจแล้ว" รายเพลง + ความคืบหน้าคิว | M11.6 AC1 🆕 | F6 | S10 | editor | B |
| จำสถานะคิว (ปิด/เน็ตหลุด→ต่อจุดเดิม) | M11.6 AC2 🆕 | F5/F6 | S10/S9 | editor | B |
| skip เพลงยาก + วนกลับ | M11.6 AC3 🆕 | F6 | S10 | editor | B |
| guardrail mass-approve (เตือนถ้ายังมีเพลงเสี่ยง) | M11.6 AC4 🆕 | F6 | **S9**→S10 | editor/approver | B |

> **นับได้ ~68 function** ครอบ M1–M11 + import/verify ครบ (สืบจาก story ทุกตัว · ไม่ตกหล่น · + N-review fold: repeat-count · measure-repeat % · multi-select→contextual-action-bar · caesura/breath เข้าชุดสัญลักษณ์ขั้นสูงเดิม · + melody-lock fold M5.6: toggle 🔒 (S7) · badge (S9) · enforce (S5)). ตัวที่ ⚠️ ยืนยันสถานะจริงตอน build (issue21/lint/Make-Unique ฯลฯ) = ไม่กระทบการจัดชั้น IA.

---

## 4. คำตัดสิน IA หลัก — โครงสร้าง "contextual (S5 inline)" vs "macro (S7 Drawer)"

นี่คือจุดที่ต้องฟันธง เพราะ 2 DS ก่อนหน้าแบ่งต่างกันเล็กน้อย:
- `dockkey-print-edit.md §2` — เครื่องมือโครงสร้าง**ต่อห้อง/บรรทัด** = คงไว้ **inline ในตาราง** (ไม่ขึ้น dock) เพราะเป็น contextual (ทำกับห้องตรงนั้น)
- `pleng-editor-overhaul-design` (locked) — **macro-edit (เรียงโครง) = Drawer การ์ด · micro-edit = บนแผ่น**

**ฟันธง (reconcile ทั้งคู่ · อ้าง Material bottom app bar "actions for current screen" + HIG "provide contextual controls"):**

> **เกณฑ์แบ่ง = "ขอบเขตของ action":**
> - **action ผูกกับ "ตำแหน่งเดียว" (ต้องรู้ว่าห้อง/ending ไหน) → S5 inline** — เพิ่มห้อง/บรรทัด · pickup ที่ห้องแรก · `‖: :‖`/volta ที่ ending นั้น · double-barline ที่ห้องท้าย · ย้อนกลางห้อง · copy/paste/move ห้อง-บรรทัด · แทรก/ลบตรง caret. เอาขึ้น toolbar = เสียบริบท (ต้องเลือกก่อนว่าตรงไหน)
> - **action ผูกกับ "โครงทั้งเพลง / ท่อนเป็นบล็อก" → S7 Structure Drawer** — ตั้งชื่อ/ลาก-เรียงท่อน · เพิ่มข้อ · duplicate/Make-Unique · D.C./D.S./Segno/Coda/Fine (อ้างข้ามท่อน) · ป้ายคำสั่งการร้อง · ลบท่อน. ของพวกนี้ได้ประโยชน์จาก **มุมมองซูมออก (การ์ด)** — เห็นสเกเลตันทั้งเพลง ลากจัดลำดับ

**เหตุผล north-star:** คนไม่รู้ดนตรีจัดโครง/วนซ้ำด้วย **การลากบล็อกใน S7** (ระบบสร้างสัญลักษณ์ให้ — ไม่ต้องวาด `‖: :‖`/Segno เอง) · คนรู้ดนตรีใส่สัญลักษณ์ตรง ๆ ใน S5 inline ได้ (2 ทางสู่ผลเดียว — M6.3 AC3). ตรงข้อ locked "โปรแกรมสร้าง volta/repeat ให้เอง".

**คำตัดสิน D.C./Segno/Coda/Fine (G 1.3 ยืนยัน · standards หนุน):** แยก 2 ชั้นตามขอบเขต action —
- **จุดปัก Segno 𝄋 / Coda 𝄌 = S5 inline** (เป็น anchor ที่ "ห้องเดียว" · Material side-sheet = supplementary/macro ไม่เหมาะปักจุดที่ตำแหน่งจริง → บังคับเปิด drawer เพื่อปักบนแผ่น = modal disconnect)
- **คำสั่งกระโดด D.C./D.S./To Coda/Fine = S7** (อ้างข้ามท่อน = ระดับโครง)
รอ P'Aim ratify การผสม 2 ชั้นนี้ (จุด=local / คำสั่ง=global) — ดู §9 ข้อ 1.

---

## 5. การจัดชั้นตาม north-star (progressive disclosure — พื้นฐานเด่น / ขั้นสูงซ่อน 1 ชั้น)

อ้าง NN/g progressive disclosure: **ของที่ 80% ของคน (คนไม่รู้ดนตรี) ใช้ = อยู่ชั้นแรกเห็นเลย · ของขั้นสูง (คนรู้ดนตรี) = ซ่อนหลัง disclosure 1 ชั้น ไม่รกจอ แต่เข้าถึงได้เสมอ.**

| ระดับ | เห็นทันที (default) | อยู่หลัง disclosure 1 ชั้น |
|---|---|---|
| **พื้นฐาน (B) — คนไม่รู้ดนตรี** | ✏️ เข้าแก้ (S3) · พิมพ์โน้ต+เนื้อ+คลิกแก้ (S5) · แป้นโน้ตพื้นฐาน 1–7/0/`-`/`|`/octave (S4) · ฟังท่อน+หยุด (S4) · จัดท่อนด้วยการลากการ์ด (S7) · บันทึก/ส่งตรวจ (S4) · พิมพ์/แชร์ (S4/S8) · import guided (S10) | — |
| **ขั้นสูง (A) — คนรู้ดนตรี** | — | สัญลักษณ์ jianpu ขั้นสูง (S6 "สัญลักษณ์เพิ่ม") · modulation + เปลี่ยนอัตราจังหวะกลางเพลง (S5/S6 ที่ห้อง) · จุดปัก Segno/Coda (S5) + คำสั่งกระโดด D.C./D.S./Fine (S7) + volta ช่วง · pickup + ย้อนกลางห้อง (S5) · Make-Unique (S7) · ป้ายคำสั่งการร้อง (S7) · คอร์ดโรมัน/JSON (S8) |

**กฎ:** ของขั้นสูง **ห้ามอยู่บน surface default** (S3/S4-core/S5 พื้นฐาน) — ต้องกดเปิด 1 ชั้น (S6 "เพิ่ม", S7 drawer, S8 menu). แต่ **ต้องไปถึงได้ในกดเดียวจากบริบทที่เกี่ยว** (power path ไม่เกะกะ = north-star ข้อ 1).

**Known de-scope / parked (บันทึกไว้ ไม่ใช่ gap ที่ตกหล่น — G เสนอแต่ชนมติเดิม):**
- **SATB / multi-voice ต่อบรรทัด (เลขซ้อน)** = de-scope แล้ว ([[pleng-ssot-scope-musicxml-not-staff]] — v2 = SSOT, ไม่ render staff/SATB) · แนวร้อง = flat-row `voice` attribute ([[pleng-bilingual-approach]]) ไม่ใช่ polyphony ในบรรทัดเดียว
- **MusicXML / MIDI export** = parked (step-1 §4.1 ข้อ 9 — นอกโฟกัส persona นี้) · ถ้าทำ = อยู่ **S8** (future export) คู่ JSON/print

---

## 6. Import & Verify (S10) — จัดกลุ่มให้มี "ตัวช่วย" ชัด (P'Aim ย้ำ "พี่เปาใช้จริง สำคัญ")

Import/verify ไม่ใช่ของแถม → เป็น **task context แยก (S10)** ตาม HIG "modes for distinct tasks" (งานเป็นชุด คนละ mental model กับแก้เพลงเดี่ยว). จัดเป็น 3 กลุ่มตัวช่วย:

1. **กลุ่ม "คัดของเข้า" (triage — ก่อนตรวจ):** คิว batch + สถานะรายเพลง · provenance (เปิดต้นฉบับ) · **reject ทั้งเพลง** · **dedup/merge** (สร้างใหม่/ทับ/ยกเลิก) · version-lock กัน re-import ทับ. — ลดภาระ: ทิ้งของพังก่อน ไม่เสียเวลาแก้.
2. **กลุ่ม "ชี้จุดต้องดู" (guided verify — หัวใจตัวช่วย):** **diff เทียบต้นฉบับควบคู่** · **ธงจุดเสี่ยง OCR/jianpu + "กระโดดไปจุดเสี่ยงถัดไป"** (octave หลุด · ขีดใต้/`-` ปนเส้นห้อง · volta อ่านผิด · พยางค์ไทย offset · accidental/คอร์ดหลุด) · **confidence sort** (ถ้า parser ให้). — คนไม่ต้องไล่อ่านทั้งเพลง = ได้ประโยชน์ import จริง (ไม่งั้นช้าเท่าพิมพ์เอง).
3. **กลุ่ม "ยืนยัน+ไหลต่อ" (bulk flow):** แก้ inline (ยืม S5) + ฟังตรวจด้วยหู (ยืม S4) · **mark ตรวจแล้ว** + ความคืบหน้าคิว · **จำสถานะ** (ปิด/เน็ตหลุด→ต่อจุดเดิม) · **skip เพลงยากวนกลับ** · **guardrail mass-approve** (S9 เตือนถ้ายังมีเพลงเสี่ยง).

**เชื่อมชั้นอื่น:** S10 ไม่สร้างเครื่องมือแก้ใหม่ — **ยืม S5 (แก้ inline) + S4 (ฟัง) + S6/S7 (สัญลักษณ์/โครง)** ตอนแก้รายเพลง. S10 เพิ่มเฉพาะ "เปลือกงานเป็นชุด" (คิว/diff/ธง/ยืนยัน).

---

## 7. คำตอบประเด็น parked — play function ในโหมดแก้ (Stage 6 / §8 ใน step 1)

**คำถาม P'Aim:** ตอนอยู่โหมดแก้ การฟัง = แค่ฟังเป็นท่อน/จุด → ควรเอา play dock เต็มออกจากหน้า edit ไหม?

**คำตัดสิน (เสนอ · รอ PM/P'Aim เคาะ) — ยืนยันสัญชาตญาณ P'Aim ด้วยเหตุผลมาตรฐาน:**

> **โหมดแก้ = ฟังแบบ selection-scoped เท่านั้น** (ฟัง "ห้องนี้/ท่อน/จากจุด caret") + **ปุ่มหยุดเข้าถึงได้เสมอ** · **ไม่มี transport เต็ม** (ไทม์ไลน์ scrub · ไทม์ไลน์ท่อน · ความเร็ว · repeat-loop) ในหน้าแก้ · **"ฟังทั้งเพลง" = demote ไป S4-row2/S8 ⚙** (ไม่ใช่ปุ่มเด่น row1).

**เหตุผล (อ้างมาตรฐาน):**
1. **Material bottom app bar** = "actions for the **current screen**" — หน้าแก้มีภารกิจ "แก้" ไม่ใช่ "เล่นเพลง" → dock ควรมีแค่ฟังตรวจจุด ไม่ใช่ transport คู่แข่งอันที่สอง.
2. **HIG** — ให้ control ที่ **relevant กับบริบทปัจจุบัน** · transport เต็มเป็นของ **โหมดฝึกร้อง/พรีวิว** (มี DockKey ฝึกร้องอยู่แล้ว) → ซ้ำสองที่ = สับสนโหมด.
3. **แก้ปัญหา BI-002 ตรงราก** (เข้าแก้ระหว่างเล่น→เสียงค้าง หยุดไม่ได้): ถ้าการเล่นในโหมดแก้เป็น **scoped + หยุดได้เสมอ** ไม่ใช่ transport อิสระที่วิ่งต่อ = ไม่มีเสียงค้าง.
4. **ตรง descriptor ที่ ratify แล้ว** (`dockkey-print-edit.md §2`): edit-dock row1 มี "ฟังท่อน↔หยุด" · "ฟังทั้งเพลง" อยู่ row2/⚙ — เอกสารนี้ **ยืนยันทิศนั้นถูกต้องตามมาตรฐาน** (ไม่ใช่แก้ DockKey · เป็นการรับรองการจัดกลุ่มที่มีอยู่).

**ไม่แตะ DockKey กลไก** — นี่คือการจัดกลุ่ม *ว่า play function ในโหมดแก้อยู่ชั้นไหน* (S4 minimal + S8 demote) ตามที่ P'Aim ขอให้เสนอ.

**Caveat power-path (G 4 · รับ):** แม้ UI จะ demote "ฟังทั้งเพลง" ลง ⚟ — คง **shortcut แป้น Space = play/stop toggle** ให้ใช้ได้ทุกบริบทในโหมดแก้ (คนสายคีย์บอร์ด/power-user คาดหวัง · ตรง north-star "power path เข้าถึงได้ไม่เกะกะ") · shortcut = ไม่กินพื้นที่จอ จึงไม่ขัดหลัก scoped-listen.

---

## 8. บันทึกการใช้ G (adversarial) + คำตัดสินของ Claude

`bridge.py ask G songmaker-ia-2026-07-25` — ถามเชิงรุก: *"function ไหนวางผิดชั้น/ผิดบริบท · มาตรฐานบอกให้จัดต่างตรงไหน · function ไหนตกหล่น · play ในโหมดแก้หนุน/ค้าน"* · **transcript (EVIDENCE):** `C:\gl\.aibridge\transcripts\songmaker-ia-2026-07-25-G-20260725-124906.md`. **Claude ตัดสินเอง (G ไม่ใช่คนตัดสิน · ตรวจแล้วบางข้อ G อ้างมาตรฐานลอย/ชนมติ de-scope เดิม — reject มีเหตุ).**

| G ชี้ | คำตัดสิน Claude | ทำอะไร |
|---|---|---|
| **1.1** ✏️ FAB สลับโหมด = ผิดหลัก FAB (ควรเป็น constructive/create) + บดบังเนื้อ | **รับบางส่วน** — pencil→edit = pattern จริง (Google Docs edit-FAB) ป้องกันได้ · แต่ข้อบดบัง/edit-mode ถูก | **แก้ §2/§5:** S3 = **โหมดดูเท่านั้น · หายไปตอนแก้** (dock ถือ primary) · flag ข้อบดบัง content = ข้อจำกัด layout ก้าว 3 |
| **1.2** modulation ซ่อนใน S8 = ผิด (เป็น musical-semantics ผูกตำแหน่ง ไม่ใช่ app-setting) | **รับ (catch ดี)** — สอดคล้อง logic §4 เอง (จุดเปลี่ยนคีย์ = local) | **แก้ inventory:** modulation → **S5/S6 (ที่ห้อง)** · เหลือแค่ "คีย์ตั้งต้นทั้งเพลง" ใน S8 |
| **1.3** Segno/Coda = anchor ที่ห้อง (S5) ไม่ใช่ macro-card (S7) · คำสั่งกระโดดค่อยอยู่ S7 | **รับ** — ตรงกับ split ที่ §4 เสนอไว้เอง · G ยืนยัน | **แก้ §4:** เลื่อนจาก "open question" → **ตัดสิน: anchor=S5 · คำสั่งกระโดด=S7** (ยังให้ P'Aim ratify) |
| **2a** FAB(S3)+bottom bar(S4)+inline(S5) พร้อมกัน = focus-warring + target collision (มือถือ dock ทับแผ่น) | **รับแกน** — แก้ด้วย mode-separation (FAB โหมดดู · dock โหมดแก้) | **§2/§5:** ไม่มี FAB ในโหมดแก้ · dock คุม primary · dock-ทับ-แผ่นบนมือถือ = ข้อจำกัด layout ก้าว 3 |
| **2b** S5-inline vs S7-drawer split (local/global) = มาตรฐานหนุนเต็ม | **รับ (ยืนยัน)** | คง §4 · อ้าง validation |
| **3.1** ตกหล่น: **เปลี่ยนอัตราจังหวะกลางเพลง** (4/4→3/4 · พบบ่อยในเพลงโบสถ์) | **รับ (gap จริง)** — inventory มีแค่ meter global (M1.4) | **เติม inventory M4:** meter-change กลางเพลง (S5/S6 · 🆕 model-gap คู่ modulation) |
| **3.2** ตกหล่น: lyric hyphenation (ขีดแบ่งพยางค์คำข้ามโน้ต) ต่างจาก melisma 🔗 | **รับบางส่วน** — ไทยไม่ hyphenate แบบอังกฤษ · แต่ bilingual/อังกฤษต้อง | **เติม note M3:** hyphenation (อังกฤษ/bilingual) แยกจาก melisma-extender · ⚠️ verify model |
| **3.3** ตกหล่น: SATB / multi-voice ต่อบรรทัด (เลขซ้อนบน-ล่าง) | **ปฏิเสธ (ชนมติ de-scope)** — `pleng-ssot-scope-musicxml-not-staff` de-scope staff/SATB แล้ว · voice = flat-row attribute ([[pleng-bilingual-approach]]) | บันทึกเป็น **known-descope** ไม่ใช่ gap |
| **3.4** ตกหล่น: MusicXML / MIDI export | **รับเป็น known-parked** — step-1 §4.1(9) ระบุ MusicXML นอกโฟกัส persona นี้แล้ว | บันทึกใน S8 เป็น **future-parked export** (ไม่ใช่ gap ใหม่) |
| **4** play โหมดแก้ (ตัด transport เต็ม + demote ฟังทั้งเพลง) = มาตรฐานหนุน · caveat: power-user อยาก Space play/stop ทุกบริบท | **รับ + รับ caveat** | **เติม §7:** คง **shortcut Space = play/stop** แม้ UI demote (power path north-star) |

**G อ้างมาตรฐานลอย/ผิดที่ Claude ไม่รับตรง ๆ:** G อ้าง "M3 ย้าย bottom app bar → docked/floating toolbar" เป็นเหตุว่า S4 conflict — **ไม่รับเป็นเหตุ deprecate** (bottom app bar ยังเป็น component M3 ที่ valid · DockKey = locked โดย P'Aim อยู่แล้ว) · รับเฉพาะข้อ practical (mode-separation แก้ focus-warring). SATB (3.3) = G ไม่รู้มติ de-scope เดิม.

---

## 8.1 N-review fold — IA nuance notes (2026-07-25 · สำหรับ mockup ก้าว 3)

จาก N-review เทียบ standards corpus (gap analysis `pm-inbox/pleng/2026-07-25-n-review-songmaker-gap-analysis.md`). **Tier-1 (A1–A6) เติมเป็นเนื้อจริงแล้ว** (§2/§3 ด้านบน + US doc). ด้านล่าง = **Tier-3 nuance** (ปรับได้ตอน mockup · ไม่ใช่ error หนัก) + **reaffirm reject**:

- **C1 — Note keypad ใน S4 = input-view ไม่ใช่ 4-action slot.** แป้นโน้ตเต็ม ≠ bottom app bar "up to four actions" (mca-02:606) · จริง ๆ เป็น **input-view / keyboard-accessory**. ตอน mockup (ก้าว 3) โมเดล keypad เป็น **input surface** ไม่ใช่ปุ่มใน bar (⛔ ไม่แตะกลไก DockKey locked · แค่ตั้งชื่อ component ให้ตรงตอนวาด).
- **C2 — transpose freq band ทบทวน F3.** transpose ทั้งเพลงอยู่ F4/S8 (§3 M4) · แต่ maker ที่ลองคีย์ใช้บ่อยกว่า rare → ⚠️ **ทบทวนเป็น F3 ตอน mockup** (ไม่ต้องลึกใน overflow เกิน · แต่ **ไม่ขึ้น top bar** — need คนร้อง ≠ need คนทำเพลง).
- **C3 — display / reading tools แยกจาก nav.** view-settings (Aa) อยู่ปนใน S2 nav drawer กับ navigation → ขัดหลัก "drawer = destinations" · ติด constraint **shared PKDrawer กับพระคำ** → note ให้พิจารณา **แยก view-settings ออกจาก nav** ตอน layout.
- **C4 — dynamics (pp/mf/ff).** ขี่ US-M6.8 (ป้ายคำสั่งการร้องเป็น text) ได้อยู่แล้ว · ถ้าอยากเป็น**สัญลักษณ์จริง**ค่อยเติม S6 ขั้นสูง — **ไม่ใช่ hard gap**.
- **C5 — metronome mark (♩=120).** เก็บ BPM แล้ว (setup) · แค่ **แสดง**บนแผ่นแบบ **optional render** (S9) — ไม่ใช่ function ใหม่.
- **C6 — bar numbering.** worship อ้างท่อนด้วย**ชื่อท่อน** (ข้อ1/รับ) > เลขห้อง · **optional display toggle** (S8/S2 view-settings) · low.

**Considered & rejected (D · reaffirm — กัน reviewer อนาคตยกซ้ำ):**
- **Save/Submit ควรอยู่ S1 ไม่ใช่ S4** → **reject เป็น required change** — ชน DockKey locked (P'Aim) + mobile thumb-reach (bottom ดีกว่า) · bottom app bar M3 รองรับ primary/emphasized action ได้ (§0 ระบุ dock locked แล้ว) · เป็นทางเลือกที่มีเหตุผล.
- **Segno/Coda anchor ไม่ควรอยู่ S5** → **reject** — anchor = "จุดที่ห้องเดียว" → direct manipulation ที่ห้องจริง (S5/S6) ถูกตามหลัก · เปิด drawer เพื่อปักจุดบนแผ่น = modal disconnect (ดู §4). N citation (context menu "contextual to item") จริง ๆ **หนุน** S5/S6.
- **chord-diagram / fretboard grid** (MusicXML `<frame>`) → **backlog** ไม่ใช่ IA gap (แอปแสดงชื่อคอร์ดตามจารีต jianpu+chord).

## 9. ให้ PM/P'Aim เคาะ (ไม่ตัดสินแทน · ไม่ถาม "พอไหม")

1. **§4** — D.C./Segno/Coda: "จุดปัก" ทำ inline (S5) แต่ "คำสั่งกระโดด" อยู่ Drawer (S7) — รับ split นี้ไหม หรืออยากรวมที่เดียว
2. **§7** — ยืนยัน: โหมดแก้ตัด transport เต็ม เหลือฟัง scoped + "ฟังทั้งเพลง" ลง ⚙ (P'Aim เปรยไว้ · ขอเคาะเป็นทางการ)
3. **ลำดับคุณค่า** (ต่อจาก step 1 §5): ชั้นไหน build ก่อน — S5 caret/input (v1-parity) หรือ S7 โครง (D.C./Segno) หรือ S10 import
4. **S10 เป็นหน้า/โหมดแยก** (ไม่ยัดใน editor เดี่ยว) — รับทิศนี้ไหม

**⛔ นอกขอบเขตก้าวนี้ (ยังไม่ทำ):** mockup · pixel/layout · ตำแหน่งปุ่มจริง · top/bottom bar จริง — ก้าว 3 หลัง PM+P'Aim เคาะการจัดกลุ่มนี้.

---

## 10. Build-reference (ยกจาก step 1 §7 — ใช้ตอน build ไม่ใช่ตอนนี้)
DockKey core (`StudioDock.vue` + `dockkey-library.md`) · edit descriptor (`dockkey-print-edit.md §2`) · nav drawer core (`PKDrawer`, `menu-drawer-spec.md`) · inline edit hooks (`SongViewer.vue` emit `seek`) · v2 model + `resolvePlayOrder`/`expandRepeats` (`songModel.js`) · structure (`songStructure.js`) · notation lint (`notation.js`) · playback (`midi.js`) · transpose (`chords.js`) · import (`tools/parse_song.py`) · สัญลักษณ์ที่มีแล้ว: fermata · double-dot · beam-levels.
