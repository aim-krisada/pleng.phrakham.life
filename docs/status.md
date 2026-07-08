# สถานะปัจจุบัน — เพลง.พระคำ.ชีวิต

กระดานบอก "ตอนนี้ถึงไหนแล้ว" ให้ SA session ใหม่ (หรือพี่เอม) เห็นภาพเร็ว — **SA อัปเดตทุกครั้งที่มีอะไรเปลี่ยน**
สถานะ: spec (เขียน US/DS แล้ว) → dev+test → merge → tester

## WT-0 ฐาน · branch `wt0-foundation` · port 5301
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-01 surface เดียว 3 มุมมอง | ✅ | ⬜ | ⬜ | ⬜ |
| US-02 สิทธิ์ที่ "การเก็บ" | ✅ | ⬜ | ⬜ | ⬜ |
| US-03 เชิญเท่านั้น | ✅ | ⬜ | ⬜ | ⬜ |
| US-04 สัญญาจุดต่อ (contract) | ✅ | ⬜ | ⬜ | ⬜ |

## WT-A ร้อง · branch `wt-a-sing` · port 5302
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-A01 เล่นตามคาราโอเกะ | ✅ | ⬜ | ⬜ | ⬜ |
| US-A02 ปรับคีย์/ความเร็ว/วนซ้ำ | ✅ | ⬜ | ⬜ | ⬜ |
| US-A03 อ่านง่าย (ฟอนต์/เนื้อ/ท่อน) | ✅ | ⬜ | ⬜ | ⬜ |

## WT-B พิมพ์ · branch `wt-b-print` · port 5303
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-B01 ดูแผ่นเพลงเต็ม | ✅ | ⬜ | ⬜ | ⬜ |
| US-B02 พิมพ์ A4 สวย | ✅ | ⬜ | ⬜ | ⬜ |

## WT-C JSON · branch `wt-c-json` · port 5304
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-C01 ดาวน์โหลด JSON | ✅ | ⬜ | ⬜ | ⬜ |
| US-C02 อัปโหลด on-demand | ✅ | ⬜ | ⬜ | ⬜ |
| US-C03 ส่งขออนุมัติทางอีเมล | ✅ | ⬜ | ⬜ | ⬜ |
| US-C04 ตรวจไฟล์ JSON | ✅ | ⬜ | ⬜ | ⬜ |

## WT-D ทำเพลง→คลัง · branch `wt-d-editor-library` · port 5305
| US | spec | dev+test | merge | tester |
|---|:--:|:--:|:--:|:--:|
| US-D01 บันทึกร่าง | ✅ | ⬜ | ⬜ | ⬜ |
| US-D02 ส่งตรวจ | ✅ | ⬜ | ⬜ | ⬜ |
| US-D03 อนุมัติ/ตีกลับ/ลบ/ย้อน | ✅ | ⬜ | ⬜ | ⬜ |
| US-D04 หมวด+เลขในหมวด (model change) | ✅ | ⬜ | ⬜ | ⬜ |

## ถัดไป (next actions)
- [ ] พี่เอมอ่าน/approve US (ทุก epic เขียนรูปมาตรฐานแล้ว)
- [ ] เริ่ม **WT-0 ก่อน** (ส่ง dev ด้วย `docs/prompts/dev.md`) → merge → แล้ว A/B/C/D ขนานได้
- [ ] ลำดับ merge: WT-0 → (A · B · C ขนาน) · D ทำหลัง WT-0 เพราะแตะ `store.js`/`songModel.js`

## หมายเหตุ
- ฐาน = `studio-shell-redesign` (ยังไม่ขึ้น `main`)
- **collision ที่ต้องระวัง:** `store.js` (WT-0 + WT-D) · `songModel.js` (WT-D + WT-C เรียกใช้) · print CSS ให้ scoped ใน SongSheet (WT-B) — รายละเอียดใน DS ของแต่ละงาน
- backlog รอทำ: B001 (ปุ่มเลื่อนขึ้น/ลง) — `docs/backlog.md`
