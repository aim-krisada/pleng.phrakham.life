# Decisions archive — เพลง.พระคำ.ชีวิต (มติเก่าที่ resolved แล้ว · ไม่ต้องอ่านตอน rehydrate)

> ย้ายจาก `decisions-log.md` เมื่อ resolved เพื่อให้ log สั้น · เก็บ WHY ไว้เผื่อขุด · rehydrate ปกติอ่านแค่ `pm-state.md` + `decisions-log.md`

## Saga: alignment + chord hotfix (22–23 ก.ค. 2026 · จบแล้ว = editor merged `3a3e618` + chord LIVE `5661068`)

- 2026-07-22 · home/nav (สาย 2) merge เข้า base — gate ผ่าน (759 เทสต์ · verify live ธีม/footer/i18n)
- 2026-07-22 · editor merge target = `editor-usability` ไม่ใช่ `claude/peaceful-bhaskara` (docs เก่าไม่มี impl)
- 2026-07-23 · lyric-align **ไม่รื้อ SongSheet ใหม่** (musical-moment) — ปรึกษา G + scoping: จะพัง beam/slur ที่ ship แล้ว (B110/B118) คุ้มน้อย
- 2026-07-23 · P0 grid align (คำใต้โน้ต · CSS subgrid) `a343571` · P2 melisma slur (derive blank-run) `6f7808e` · คอร์ดเหนือโน้ต (pin ซ้าย) `8c508be` · ⛔ ไม่ re-import
- 2026-07-23 · alignment 3 จุด PASS `8c508be` (Tester geometry จริง คอร์ด 0.05px/คำ 0.01px · 792 เทสต์) · P'Aim+พี่เปา OK PDF พิมพ์จริง
- 2026-07-23 · Tester #2 กวาดคลัง 149 เพลง — ไม่มี over-draw ยักษ์ (98% melisma 2 โน้ต) · เจอ artifact `"` + 2 minor (B122/B123)
- 2026-07-23 · 5-song melisma eyeball (P'Aim/พี่เปา): 1-3 เอื้อนถูก · 4=เส้นซ้อน · 5="แห่ง" (ต่อมาพบ=positioning ไม่ใช่ over-draw)
- 2026-07-23 · #4+#5 = ต้นเหตุเดียว: P2 วาดทับ authored `()` → dedup (authored wins) `0c76e45` · `"` punctuation guard `ac6b4d7`
- 2026-07-23 · **บทเรียน "แห่ง":** คำติเรื่อง "เส้นยาวเกิน/ตำแหน่ง" ≠ "เอาออก" — เคยตีความผิดว่าลบ authored slur (ยกเลิก) · จริง=positioning bug → แก้ที่ต้นเหตุ `60cfda9` (within-seg slur วัด center หัวโน้ตเหมือน beam · P0 seg-grid ทำกล่องกว้างเท่าคำเลยล้น) · [[feedback_never_ask_user_what_is_correct]] [[feedback_read_source_spec_before_building]]
- 2026-07-23 · **บทเรียน Tester:** อย่าป้อน claim ตัวเลขไม่แม่นให้ Tester (PM เคยสรุป "เหลือ 1 เส้น" ผิด · dedup ลบเฉพาะเส้นทับ authored · tail-melisma ยังอยู่=ถูก)
- 2026-07-23 · chord hotfix `8678162`→rebase→`5661068`: engine (parseChord) รองรับครบ · แก้ input (ComboSelect allow-custom+validate) + ENTER 4 เคส · caveat slash-bass transpose=B124 · validation root-only=B125
- 2026-07-23 · deploy คอร์ดติด origin/main ขยับ ~15 commit → rebase onto b3e747b (conflict EditorMode imports=เก็บทั้ง parseChord+B118) · production conflict = ไม่ hand-resolve → dispatch
- 2026-07-23 · render/screenshot recipe รายละเอียด (Chromium+CDP · Edge พัง) — สรุปอยู่ CLAUDE.md §4
