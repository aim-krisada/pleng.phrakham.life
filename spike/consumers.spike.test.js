// @vitest-environment jsdom
// SPIKE A ข้อ 1 — เสียบ item ชนิดใหม่ {type:'jump'} เข้าสายเดียวกับ bar/repeat
// แล้วผู้บริโภคเดิมพังไหม? ลองจริงกับโค้ดจริง ไม่ใช่เดา
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { resolveContent, resolvePlayOrder, migrateToV2, isV2 } from '../src/lib/songModel.js'
import { songToNotes, buildPlayNotes } from '../src/lib/midi.js'
import { lintLine, lintRepeatVolta } from '../src/lib/notationLint.js'
import SongSheet from '../src/components/SongSheet.vue'

const seg = (note, lyric = '') => ({ type: 'segment', note, lyric })

// เพลงจริงย่อ: 2 บรรทัด · มี bar/repeat ปกติ · แล้วแทรก jump 3 ตัว
const withJump = {
  key: 'C',
  timeSignature: '4/4',
  lines: [
    [seg('1', 'ก'), seg('2', 'ข'), { type: 'bar' }, seg('3', 'ค'), seg('4', 'ง'),
      { type: 'jump', kind: 'fine' }],
    [{ type: 'repeat-start' }, seg('5', 'จ'), seg('6', 'ฉ'), { type: 'repeat-end' },
      { type: 'bar' }, seg('7', 'ช'), seg('1', 'ซ'), { type: 'jump', kind: 'dc' }],
  ],
}
const noJump = {
  ...withJump,
  lines: withJump.lines.map((l) => l.filter((it) => it.type !== 'jump')),
}

describe('SPIKE A.1 — ผู้บริโภคเดิมพังไหมเมื่อมี item ชนิดใหม่', () => {
  it('เล่นเสียง (songToNotes/buildPlayNotes): ไม่พัง — jump ถูกข้ามที่ `type !== segment`', () => {
    const a = songToNotes(withJump).map((n) => n.midi)
    const b = songToNotes(noJump).map((n) => n.midi)
    expect(a).toEqual(b)             // ผลลัพธ์เหมือนกันเป๊ะ = ไม่พัง
    expect(a.length).toBeGreaterThan(0)
    // ...แต่ "ไม่พัง" = "ไม่มีผล" — jump ถูกเมินเงียบ ไม่เกิดการกระโดด
    expect(buildPlayNotes(withJump).length).toBe(buildPlayNotes(noJump).length)
  })

  it('วาดแผ่นเพลง (SongSheet mount): ไม่ throw · ไม่แสดงอะไร · ไม่ทำ bar เพี้ยน', () => {
    const mk = (content) => mount(SongSheet, {
      props: { content, song: { title: 't' }, transpose: 0, mode: 'note' },
      global: { stubs: { NoteRow: true } },
    })
    const w1 = mk(withJump)
    const w2 = mk(noJump)
    expect(w1.html()).toBeTruthy()
    // ไม่มี element ใดๆ ของ jump บนแผ่น (rowsOf ไม่มี branch รับ → ตกพื้น)
    expect(w1.text()).not.toMatch(/fine|dc|D\.C/i)
    // จำนวนกล่องโน้ต/บาร์เท่าเดิม → ไม่ไปรบกวนการจัดห้อง
    expect(w1.findAll('.bar').length).toBe(w2.findAll('.bar').length)
  })

  it('lint: ไม่ throw และไม่ขึ้นเตือนเท็จเพราะ jump', () => {
    // lintLine กิน "สตริงโน้ต" — jump ไม่มีสตริง จึงไม่เข้าเส้นทางนี้เลย
    const notesOf = (c) => c.lines.flat().filter((it) => it.type === 'segment').map((it) => it.note)
    expect(notesOf(withJump)).toEqual(notesOf(noJump))
    for (const n of notesOf(withJump)) {
      expect(() => lintLine(n, { timeSignature: '4/4' })).not.toThrow()
    }
    // lintRepeatVolta กิน "สาย marker" ตรงๆ — ที่นี่คือจุดที่ jump จะไหลเข้าไปจริง
    const marksOf = (c) => c.lines.flat().filter((it) => ['repeat-start', 'repeat-end', 'volta', 'jump'].includes(it.type))
    expect(() => lintRepeatVolta(marksOf(withJump))).not.toThrow()
    expect(JSON.stringify(lintRepeatVolta(marksOf(withJump))))
      .toBe(JSON.stringify(lintRepeatVolta(marksOf(noJump)))) // jump ไม่สร้าง false warning
  })

  it('พิมพ์ (resolveContent v2): ส่ง jump ผ่านโดยไม่แตะ — item ยังอยู่ครบ', () => {
    const { content: v2 } = migrateToV2(withJump)
    expect(isV2(v2)).toBe(true)
    const out = resolveContent(v2)
    const jumps = out.flat().filter((it) => it.type === 'jump')
    expect(jumps.length).toBe(2)          // ผ่านทะลุถึง render layer ครบ
    expect(jumps[0].kind).toBe('fine')    // ...พร้อม payload
  })

  it('🔴 ตัวแก้ (EditorMode deserialize→serialize): jump หายไปเงียบๆ = ข้อมูลหาย', async () => {
    const EditorMode = (await import('../src/components/EditorMode.vue')).default
    const src = withJump.lines[1]
    // deserializeLine เป็น else-if chain ไม่มี default → ชนิดที่ไม่รู้จักตกพื้น
    // จำลองตรรกะเดียวกับ EditorMode.vue:99-121 (ฟังก์ชันไม่ export)
    const known = ['continue', 'section', 'label', 'end', 'marker',
      'repeat-start', 'repeat-end', 'pickup', 'volta', 'bar', 'segment']
    const survives = src.filter((it) => known.includes(it.type))
    expect(src.some((it) => it.type === 'jump')).toBe(true)
    expect(survives.some((it) => it.type === 'jump')).toBe(false) // ← หาย
    expect(EditorMode).toBeTruthy()
  })
})

describe('SPIKE A.1b — seam resolvePlayOrder รับคำสั่งกระโดดได้ไหม', () => {
  it('resolvePlayOrder เมิน jump ทั้งหมด (คืน null) — seam ยังไม่ต่อกับอะไร', () => {
    const { content: v2 } = migrateToV2(withJump)
    expect(resolvePlayOrder(v2)).toBeNull()
  })

  it('🔴 seam คืน "ช่วงบรรทัด" ไม่ใช่ "ช่วงห้อง" — Fine กลางบรรทัดแสดงออกไม่ได้', () => {
    // สัญญาของ seam: [{fromLi,toLi}] แล้ว buildPlayNotes กรองด้วย n.li (midi.js:466)
    // → หน่วยเล็กสุดที่สั่งได้ = 1 บรรทัดแสดงผลเต็มบรรทัด
    const { content: v2 } = migrateToV2({
      key: 'C',
      lines: [[seg('1'), seg('2'), { type: 'bar' }, seg('3'), seg('4')]],
    })
    const resolved = { ...v2, lines: resolveContent(v2) }
    const all = buildPlayNotes(resolved)
    // ขอให้หยุดกลางบรรทัด (หลังห้องแรก) — ทำไม่ได้ด้วย {fromLi,toLi}
    const halfLine = buildPlayNotes(resolved, { order: [{ fromLi: 0, toLi: 0 }] })
    expect(halfLine.length).toBe(all.length) // ได้ทั้งบรรทัด ไม่ใช่ครึ่งเดียว
    expect(all.map((n) => n.bi)).toEqual([0, 0, 1, 1]) // bi มีอยู่ แต่ order กรองไม่ได้
  })
})
