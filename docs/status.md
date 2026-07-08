# สถานะปัจจุบัน — เพลง.พระคำ.ชีวิต

กระดานบอก "ตอนนี้ถึงไหนแล้ว" · **SA อัปเดตทุกครั้งที่มีอะไรเปลี่ยน**
สถานะ: spec → dev+test → merge → tester

## ✅ WT-0 ฐาน — เสร็จ + merge แล้ว (`9a60886`)
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-01 surface เดียว 3 มุมมอง | ✅ | ✅ | ✅ | ⬜ |
| US-02 สิทธิ์ที่ "การเก็บ" | ✅ | ✅ | ✅ | ⬜ |
| US-03 เชิญเท่านั้น | ✅ | ✅ | ✅ | ⬜ |
| US-04 สัญญาจุดต่อ (contract) | ✅ | ✅ | ✅ | ⬜ |

`Studio.vue` เป็น thin shell · `EditorMode.vue` แยกออก · store gating (`tier`/`canStore`/`canApprove`) · contract (props `song`/`tier`/`active`, events `change`/`save`) · vitest 12/12 · build ✅
**หมายเหตุ:** WT-0 แตะ `SongViewer.vue`+`midi.js` (คืน live key re-tune + หยุดเล่นตอนสลับโหมด) — A/B/C/D branch จากฐานใหม่นี้ได้ live-key ไปเลย

## ✅ WT-0 follow-up — เสร็จ + merge แล้ว (`wt0-followups` · port 5301 ค้างให้ tester)
| งาน | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-05 เปิด/เลือกเพลงทุกโหมด (#3) | ✅ | ✅ | ✅ | ⬜ (5301) |
| US-06 ปุ่มพิมพ์ในโหมดแผ่น (#4-ปุ่ม) | ✅ | ✅ | ✅ | ⬜ (5301) |
| B002 ชื่อโหมด ฝึกร้อง·แผ่นเพลง·แก้ไข | ✅ | ✅ | ✅ | ⬜ (5301) |

unit 16/16 · แตะ `Studio.vue` ไฟล์เดียว · **ค้าง observation:** เมนูเปิดเพลงซ้ำในโหมดแก้ → B003 (ให้ WT-D เก็บ)

## WT-A ร้อง · branch `wt-a-sing` · port 5302  (พร้อมเริ่ม — ฐาน merge แล้ว)
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-A01 เล่นตามคาราโอเกะ | ✅ | ⬜ | ⬜ | ⬜ |
| US-A02 คีย์/ความเร็ว/วนซ้ำ (live key ทำแล้วโดย WT-0) | ✅ | ⬜ | ⬜ | ⬜ |
| US-A03 อ่านง่าย | ✅ | ⬜ | ⬜ | ⬜ |
| US-A04 tempo สดตอนเล่น (#5 · ใหม่) | ✅ | ⬜ | ⬜ | ⬜ |

## ✅ WT-B พิมพ์ — เสร็จ + merge แล้ว (`wt-b-print` · port 5303)
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-B01 ดูแผ่นเพลงเต็ม | ✅ | ✅ | ✅ | ⬜ (5303) |
| US-B02 พิมพ์ A4 (footer · ไม่ตัดกลางท่อน · ซ่อน UI) | ✅ | ✅ | ✅ | ⬜ (5303) |

แตะ `SongSheet.vue` ไฟล์เดียว · unit 24/24 · build ✅ · **ค้าง print-polish นอกไฟล์ WT-B → B004 (WT-0)** + design decision #4 (คีย์ร่วม/ที่พิมพ์ — รอ P'Aim เคาะ)

## ✅ WT-C JSON — เสร็จ + merge แล้ว (`wt-c-json` · port 5304)
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-C01 ดาวน์โหลด JSON | ✅ | ✅ | ✅ | ⬜ |
| US-C02 อัปโหลด on-demand | ✅ | ✅ | ✅ | ⬜ |
| US-C03 เสนอเพลง (= คู่มือ ไม่ใช่โค้ด → US-I4) | ✅ | ✅ | ✅ | — |
| US-C04 ตรวจไฟล์ | ✅ | ✅ | ✅ | ⬜ |
lib ใหม่ `jsonIO.js` + `songName.js` · unit 45/45 · **การต่อสายใน shell/editor → sprint `wt0-integration`**

## 🔶 WT-D ทำเพลง→คลัง — รอบ 1 merge แล้ว (`wt-d-editor-library` · 5305 · สาขาคงไว้ทำรอบ 2)
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-D01 บันทึกร่าง (แยกเป็น store action) | ✅ | ✅ | ✅ | ⬜ |
| US-D05 editor แผ่นเดียว (ใหม่ · เอา preview ซ้ำออก) | ✅ | ✅ | ✅ | ⬜ |
| US-D02 ส่งตรวจ · US-D03 อนุมัติ · US-D04 หมวด+เลข | ✅ | ⬜ | ⬜ | ⬜ (รอบ 2) |
unit 49/49 · **WT-D merged → US-I5 (integration EditorMode) + B003 ปลดล็อกแล้ว**

## 🔜 sprint ถัดไป: WT-0 integration (`wt0-integration` · port 5301)
| US | ทำได้เลย? | เรื่อง |
|---|:--:|---|
| US-I1 | ✅ | currentSong → ปุ่ม navbar โผล่ |
| US-I2 | ✅ | SSOT ชื่อไฟล์ `เพลง.พระคำ.ชีวิต - <ชื่อเพลง>` |
| US-I3 | ✅ | print footer ชื่อเพลง + หน้า X ของ Y (B004) |
| US-I4 | ✅ | คู่มือ C03 ใน Guide.vue |
| US-I5 | ⚠️ รอ WT-D | upload validate + downloadJson lib + ตัดเมนูซ้ำ (B003) |

## ถัดไป (next actions)
- **merge แล้ว:** WT-0 · wt0-followups · WT-B · WT-C · WT-D(รอบ1) · **กำลังรัน:** WT-A (5302)
- [ ] จ่าย **wt0-integration** (5301): ทำได้ **ครบ I1–I5** แล้ว (WT-D merge → `EditorMode` ว่าง)
- [ ] **WT-D รอบ 2** (สาขาเดิม 5305): US-D02 ส่งตรวจ · US-D03 อนุมัติ · US-D04 หมวด+เลข
- [ ] **B005 (ใหม่ · โจทย์ SA):** ออกแบบรวม "จุดแก้เนื้อร้อง 2 ที่" → ผมทำ design เสนอ P'Aim
- [ ] ค้างเคาะ P'Aim: WT-B #4 คีย์ตอนพิมพ์ (A/B) · อีเมลทีม (C03)

## หมายเหตุ
- ฐาน = `studio-shell-redesign` (ยังไม่ขึ้น `main`)
- collision: `store.js` (WT-0+WT-D) · `songModel.js` (WT-D · WT-C เรียกใช้) · print CSS scoped ใน SongSheet (WT-B) · `Studio.vue` = WT-0 เท่านั้น (รวม wt0-followups)
- workflow เพิ่ม (จากบทเรียน WT-0): dev ค้าง server ไว้ + ใส่ URL ตรวจท้ายรายงาน · bug "ได้ยิน" พิสูจน์ด้วยหูก่อนแก้
