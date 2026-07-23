// SPIKE A ข้อ 2+3 — ลำดับการเล่นถูกต้องไหม
// ⚠️ ค่าที่คาดหวังทุกบรรทัดคัดลอกมาจาก spike/EXPECTED-FROM-STANDARD.md ซึ่งเขียนเสร็จ
//    ก่อนเขียน resolver และก่อนรันครั้งแรก — ห้ามแก้ตามผลรัน
import { describe, it, expect } from 'vitest'
import { resolveBars } from './playorder-proto.mjs'
import { songToNotes } from '../src/lib/midi.js'

const bar = (id, x = {}) => ({ id, repeatStart: false, repeatEnd: false, volta: [], ...x })

describe('SPIKE A.3 — resolver ลำดับการเล่น 3 เคสมาตรฐาน', () => {
  it('(ก) เครื่องหมายซ้ำธรรมดา  A ‖: B C :‖ D  →  A B C B C D', () => {
    const song = [
      bar('A'),
      bar('B', { repeatStart: true }),
      bar('C', { repeatEnd: true }),
      bar('D'),
    ]
    expect(resolveBars(song)).toEqual(['A', 'B', 'C', 'B', 'C', 'D'])
  })

  it('(ข) จบแบบ 1-2 (volta)  A ‖: B C [1.D :‖][2.E]  →  A B C D B C E', () => {
    const song = [
      bar('A'),
      bar('B', { repeatStart: true }),
      bar('C'),
      bar('D', { volta: [1], repeatEnd: true }),
      bar('E', { volta: [2] }),
    ]
    expect(resolveBars(song)).toEqual(['A', 'B', 'C', 'D', 'B', 'C', 'E'])
  })

  it('(ค) D.C. al Fine  A B C(Fine) D E(D.C.)  →  A B C D E A B C', () => {
    const song = [
      bar('A'),
      bar('B'),
      bar('C', { jump: 'fine' }),
      bar('D'),
      bar('E', { jump: 'dc' }),
    ]
    expect(resolveBars(song)).toEqual(['A', 'B', 'C', 'D', 'E', 'A', 'B', 'C'])
  })

  it('เพิ่มเติม: D.S. al Fine กระโดดไปที่ Segno ไม่ใช่ต้นเพลง', () => {
    // A B(𝄋) C(Fine) D E(D.S. al Fine) → เล่นตรง A..E แล้วย้อนไป B → B C หยุดที่ Fine
    const song = [
      bar('A'),
      bar('B', { jump: 'segno' }),
      bar('C', { jump: 'fine' }),
      bar('D'),
      bar('E', { jump: 'ds' }),
    ]
    expect(resolveBars(song)).toEqual(['A', 'B', 'C', 'D', 'E', 'B', 'C'])
  })

  it('ไม่มีคำสั่งอะไรเลย = เล่นตรงตามที่เขียน (ไม่ regress ของเดิม)', () => {
    expect(resolveBars([bar('A'), bar('B'), bar('C')])).toEqual(['A', 'B', 'C'])
  })
})

describe('SPIKE A.2 — 3 รอบขึ้นไป: แก้เล็กหรือรื้อโครง', () => {
  it('ของจริงวันนี้ (midi.js expandRepeats) เพดาน 2 รอบ — รอบ 3 เล่นไม่ได้', () => {
    // ‖: 1 2 :‖ ในเพลงจริง → songToNotes ควรได้ 4 โน้ต (2 รอบ) และไม่มีทางได้ 6
    const content = {
      key: 'C',
      lines: [[
        { type: 'repeat-start' },
        { type: 'segment', note: '1' },
        { type: 'segment', note: '2' },
        { type: 'repeat-end' },
      ]],
    }
    expect(songToNotes(content).length).toBe(4) // = 2 รอบ เพดานตายตัว
  })

  it('prototype: จำนวนรอบอ่านจากข้อมูล → 3 รอบได้ทันที (กลไกวนไม่ต้องรื้อ)', () => {
    const song = [bar('B', { repeatStart: true }), bar('C', { repeatEnd: true, times: 3 })]
    expect(resolveBars(song)).toEqual(['B', 'C', 'B', 'C', 'B', 'C'])
  })

  it('prototype: volta หลายเลข [2,3] = "รอบ 3 จบเหมือนรอบ 2"', () => {
    const song = [
      bar('B', { repeatStart: true }),
      bar('D', { volta: [1], repeatEnd: true, times: 3 }),
      bar('E', { volta: [2, 3] }),
    ]
    // รอบ1: B D(ย้อน) · รอบ2: B ข้าม D → E ... แต่ E ไม่ใช่ repeatEnd จึงเล่นต่อจบ
    expect(resolveBars(song)).toEqual(['B', 'D', 'B', 'E'])
  })

  it('🔴 ข้อจำกัดที่เหลือ: repeat ซ้อน repeat — repStart เป็น scalar ตัวเดียว', () => {
    // ‖: A ‖: B :‖ C :‖  — มาตรฐานว่า inner ซ้ำก่อน แล้ว outer ซ้ำทั้งก้อน
    // ถูกต้องตามมาตรฐาน = A B B C A B B C (8 ห้อง)
    const song = [
      bar('A', { repeatStart: true }),
      bar('B', { repeatStart: true, repeatEnd: true }),
      bar('C', { repeatEnd: true }),
    ]
    const got = resolveBars(song)
    expect(got).not.toEqual(['A', 'B', 'B', 'C', 'A', 'B', 'B', 'C']) // prototype ทำไม่ได้
    expect(got).toEqual(['A', 'B', 'B', 'C']) // ← outer repeat หายไป (repStart ถูกทับ)
  })
})
