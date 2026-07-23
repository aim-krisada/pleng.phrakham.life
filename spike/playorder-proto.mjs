// SPIKE A ข้อ 3 — prototype ทิ้งได้: resolver ลำดับการเล่นระดับ "ห้อง"
// ⛔ ไม่ใช่โค้ดสำหรับ merge — เขียนเพื่อพิสูจน์ว่าโมเดล item เดียวกันสั่งกระโดดได้จริง
//
// ต่างจากของจริงวันนี้ยังไง:
//   - midi.js expandRepeats  → หน่วย = ห้อง แต่ hardcode 2 รอบ · ไม่มี jump · repStart เป็น scalar
//   - songModel.resolvePlayOrder → หน่วย = "ช่วงบรรทัด" {fromLi,toLi} · หยาบเกินสำหรับ Fine
// prototype นี้ = expandRepeats ที่เพิ่ม (1) จำนวนรอบอ่านจากข้อมูล (2) volta หลายเลข (3) jump
//
// input: bars[] = [{ id, repeatStart, repeatEnd, times, volta:[n...], jump }]
//        jump ∈ 'fine' | 'dc' | 'ds' | 'segno' | 'coda' | 'tocoda'
// output: [id...] = ลำดับห้องที่เล่นจริง

export function resolveBars(bars) {
  const out = []
  let i = 0
  let repStart = -1
  let pass = 1
  let jumped = false        // ผ่านคำสั่ง D.C./D.S. ไปแล้วหรือยัง — Fine มีผลเฉพาะหลังกระโดด
  let guard = 0

  while (i < bars.length && guard++ < 100000) {
    const bar = bars[i]

    if (bar.repeatStart && i !== repStart) { repStart = i; pass = 1 }

    // volta: กล่องนี้เป็นของรอบไหนบ้าง — รองรับหลายเลข ([1] · [2,3])
    if (bar.volta && bar.volta.length && !bar.volta.includes(pass)) { i++; continue }

    out.push(bar.id)

    // ---- คำสั่งกระโดด (อ่านหลังจากเล่นห้องนี้จบ ตามธรรมเนียมสากล) ----
    if (bar.jump === 'fine' && jumped) break            // Fine เงียบในรอบแรก · หยุดหลังกระโดดแล้ว
    if (bar.jump === 'dc' && !jumped) { jumped = true; i = 0; repStart = -1; pass = 1; continue }
    if (bar.jump === 'ds' && !jumped) {
      const seg = bars.findIndex((b) => b.jump === 'segno')
      jumped = true; i = seg >= 0 ? seg : 0; repStart = -1; pass = 1; continue
    }

    // ---- เครื่องหมายซ้ำ: จำนวนรอบอ่านจากข้อมูล ไม่ใช่ค่าคงที่ 2 ----
    const times = bar.times || 2
    if (bar.repeatEnd && pass < times) {
      pass++
      i = repStart >= 0 ? repStart : 0
      continue
    }
    i++
  }
  return out
}
