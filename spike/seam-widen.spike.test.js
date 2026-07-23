// SPIKE A ข้อ 5 (ประกอบการประเมินขนาดงาน) — ขยายหน่วยของ seam จาก "บรรทัด" เป็น "ห้อง"
// แพงแค่ไหน? โน้ตทุกตัวมี li/bi ติดมาอยู่แล้ว (midi.js บรรทัด 153/169/…) → ลองดูว่าพอไหม
import { describe, it, expect } from 'vitest'
import { songToNotes } from '../src/lib/midi.js'

const seg = (note) => ({ type: 'segment', note })
const content = {
  key: 'C',
  timeSignature: '4/4',
  lines: [
    [seg('1'), seg('2'), { type: 'bar' }, seg('3'), seg('4')],
    [seg('5'), seg('6'), { type: 'bar' }, seg('7'), seg('1')],
  ],
}

// buildPlayNotes วันนี้: order.flatMap(r => all.filter(n => n.li>=r.fromLi && n.li<=r.toLi))
// เวอร์ชันหน่วยห้อง: เทียบเป็นคู่ (li,bi) — โค้ดเพิ่ม 1 บรรทัด
const K = (li, bi) => li * 1000 + bi
function playNotesByBar(all, order) {
  return order.flatMap((r) => all.filter((n) => K(n.li, n.bi) >= K(r.fromLi, r.fromBi) && K(n.li, n.bi) <= K(r.toLi, r.toBi)))
}

describe('SPIKE A.5 — seam ระดับห้องทำได้ด้วยข้อมูลที่มีอยู่แล้วไหม', () => {
  it('โน้ตทุกตัวมี li/bi ติดมาแล้ว — ไม่ต้องเพิ่มข้อมูลใหม่', () => {
    const all = songToNotes(content)
    expect(all.map((n) => `${n.li}:${n.bi}`)).toEqual(['0:0', '0:0', '0:1', '0:1', '1:0', '1:0', '1:1', '1:1'])
  })

  it('🟢 หยุดกลางบรรทัดได้จริง (สิ่งที่ Fine ต้องการ) — "เล่นถึงห้องแรกของบรรทัด 0 แล้วหยุด"', () => {
    const all = songToNotes(content)
    const got = playNotesByBar(all, [{ fromLi: 0, fromBi: 0, toLi: 0, toBi: 0 }])
    expect(got.map((n) => n.midi)).toEqual([60, 62]) // ได้แค่ห้องแรก ไม่ใช่ทั้งบรรทัด
  })

  it('🟢 D.C. al Fine เต็มรูป: A..จบ แล้วย้อนต้นถึง Fine (ห้อง 0:1)', () => {
    const all = songToNotes(content)
    const order = [
      { fromLi: 0, fromBi: 0, toLi: 1, toBi: 1 },  // รอบแรก เล่นทั้งเพลง
      { fromLi: 0, fromBi: 0, toLi: 0, toBi: 1 },  // D.C. → ย้อนต้น หยุดที่ Fine
    ]
    expect(playNotesByBar(all, order).map((n) => n.midi))
      .toEqual([60, 62, 64, 65, 67, 69, 71, 60, /* D.C. */ 60, 62, 64, 65])
  })

  it('เข้ากันย้อนหลัง: ช่วงแบบเดิม (ทั้งบรรทัด) เขียนด้วยรูปแบบใหม่ได้ ผลเท่าเดิม', () => {
    const all = songToNotes(content)
    const oldWay = all.filter((n) => n.li >= 0 && n.li <= 0)
    const newWay = playNotesByBar(all, [{ fromLi: 0, fromBi: 0, toLi: 0, toBi: 999 }])
    expect(newWay).toEqual(oldWay)
  })
})
