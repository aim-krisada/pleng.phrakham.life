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

## WT-B พิมพ์ · `wt-b-print` · 5303 | WT-C JSON · `wt-c-json` · 5304 | WT-D ทำเพลง→คลัง · `wt-d-editor-library` · 5305
ทุก US spec ✅ · dev/merge/tester ⬜ (พร้อมเริ่มหลัง WT-0 merge — ซึ่งเสร็จแล้ว)
- WT-B: US-B01, US-B02 (เพิ่ม footer/print-format · ปุ่มพิมพ์ = WT-0 US-06)
- WT-C: US-C01..04
- WT-D: US-D01..04 (เริ่มได้ · แตะ `store.js`/`songModel.js` — เป็น epic เดียวที่แตะ จึงปลอดภัย)

## ถัดไป (next actions)
- [ ] A/B/C/D กำลังรันอยู่ (5302–5305) · wt0-followups เสร็จ+merge แล้ว (5301 ค้างให้ tester)
- [ ] tester (พี่เปา) ลอง 5301: เปิดเพลงทุกโหมด · ปุ่มพิมพ์ · ชื่อโหมดใหม่ → ผ่านแล้วเก็บ worktree
- [ ] **B003 + งาน polish อื่น = พักไว้** → รวมทำในรอบ **review ภาพรวม หลัง A/B/C/D เสร็จครบ** (P'Aim 2026-07-08 · ไม่แทรก dev ที่กำลังรัน)

## หมายเหตุ
- ฐาน = `studio-shell-redesign` (ยังไม่ขึ้น `main`)
- collision: `store.js` (WT-0+WT-D) · `songModel.js` (WT-D · WT-C เรียกใช้) · print CSS scoped ใน SongSheet (WT-B) · `Studio.vue` = WT-0 เท่านั้น (รวม wt0-followups)
- workflow เพิ่ม (จากบทเรียน WT-0): dev ค้าง server ไว้ + ใส่ URL ตรวจท้ายรายงาน · bug "ได้ยิน" พิสูจน์ด้วยหูก่อนแก้
