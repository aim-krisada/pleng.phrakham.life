// ใบงาน #10 — ไฮไลต์คาราโอเกะต้องเดินด้วย "นาฬิกาของการ์ดเสียง" ตัวเดียวกับที่นัดโน้ต
//
// เสียงถูกนัดไว้ล่วงหน้าด้วย ctx.currentTime (นาฬิกาการ์ดเสียง) ⇒ ตรงเป๊ะเสมอ
// ถ้าไฮไลต์เดินด้วยนาฬิกาอีกตัว (นาฬิกาผนัง Date.now) 2 นาฬิกาจะไม่ตรงกัน แล้วไฮไลต์
// ก็ไปอยู่คนละที่กับเสียงที่ได้ยิน · เทสชุดนี้จึงไม่ได้ตรวจว่า "ต่อสายถึงกันไหม"
// แต่**วัดช่องว่างเป็นวินาทีของนาฬิกาเสียง** ระหว่าง
//   เวลาที่โน้ตดัง (จาก osc.start ที่โค้ดนัดไว้จริง)  ↔  เวลาที่ไฮไลต์ขยับ (ตอน onNote ถูกเรียก)
//
// โต๊ะทดลอง: AudioContext ปลอมที่เรา**หมุนเข็มเอง** 2 เข็มแยกกัน
//   ctx.currentTime = นาฬิกาเสียง (ของจริงที่เสียงเดินตาม)
//   Date.now()      = นาฬิกาผนัง  (หมุนช้ากว่า/เร็วกว่าได้ = จำลองแท็บพื้นหลัง)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { playSong, stopPlayback } from './midi.js'

// ---- AudioContext ปลอม -----------------------------------------------------------------
// เก็บเวลาที่ "โน้ตดังจริง" ไว้ที่ starts[] (ค่าที่ส่งเข้า osc.start) — นี่คือหลักฐานฝั่งเสียง
function makeFakeCtx() {
  const starts = []
  const param = (v = 0) => ({
    value: v,
    setValueAtTime() { return this },
    linearRampToValueAtTime() { return this },
    cancelScheduledValues() { return this },
  })
  const node = (extra = {}) => ({ connect(d) { return d }, disconnect() {}, ...extra })
  return {
    currentTime: 0,
    state: 'running',
    sampleRate: 44100,
    starts,
    destination: node(),
    resume: async () => {},
    createBuffer: (ch, len, sr) => ({ length: len, numberOfChannels: ch, sampleRate: sr, getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => node({ buffer: null, start() {}, stop() {} }),
    createGain: () => node({ gain: param(1) }),
    createOscillator: () => node({ type: '', frequency: param(), detune: param(), start(t) { starts.push(t) }, stop() {} }),
    createStereoPanner: () => node({ pan: param() }),
    createBiquadFilter: () => node({ type: '', frequency: param(), Q: param() }),
    createDynamicsCompressor: () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createConvolver: () => node({ buffer: null }),
  }
}

// midi.js เก็บ ctx ไว้ระดับโมดูล (สร้างครั้งเดียวแล้วใช้ซ้ำ) ⇒ ใช้ตัวเดียวทั้งไฟล์ แล้วรีเซ็ตเข็มเอง
const ctx = makeFakeCtx()
// 96 จังหวะต่อนาที ⇒ โน้ต 1 จังหวะยาว 625 ms · จงใจเลือกให้**หารกับรอบถาม 100 ms ไม่ลงตัว**
// เพราะถ้าลงตัวพอดี ความช้าจะคงที่และมองไม่เห็นว่าเป็นปัญหา ของจริงเพลงส่วนใหญ่ไม่ลงตัว
const BPM = 96
const SPB = 60 / BPM // วินาทีต่อจังหวะ = 0.625
const NOTE_SEC = SPB // ทุกโน้ตในเพลงทดสอบยาว 1 จังหวะ
const NOTE_COUNT = 12
const content = {
  key: 'C',
  timeSignature: '4/4',
  lines: [[{ type: 'segment', note: '1 2 3 4 5 4 3 2 1 2 3 4', lyric: 'ก ข ค ง จ ฉ ช ซ ฌ ญ ฎ ฏ' }]],
}

let wallMs = 0 // นาฬิกาผนังที่ Date.now() รายงาน — เราหมุนเอง

// หมุนเข็มไปข้างหน้าทีละก้าวเล็ก ๆ แล้วปล่อยให้ตัวจับเวลา/เฟรมทำงาน
// wallRate = นาฬิกาผนังเดินเร็วกว่านาฬิกาเสียงกี่เท่า (1 = ตรงกัน)
async function advance(seconds, { stepMs = 10, wallRate = 1 } = {}) {
  const steps = Math.round((seconds * 1000) / stepMs)
  for (let i = 0; i < steps; i++) {
    ctx.currentTime = Number((ctx.currentTime + stepMs / 1000).toFixed(6))
    wallMs += stepMs * wallRate
    await vi.advanceTimersByTimeAsync(stepMs)
  }
}

// เริ่มเล่น แล้วคืน { fires } = ทุกครั้งที่ไฮไลต์ขยับ พร้อมเวลา**ของนาฬิกาเสียง**ตอนนั้น
async function startPlay(opts = {}) {
  const fires = []
  const progress = []
  const done = playSong(content, {
    bpm: BPM,
    arranger: false, // ปิดลูกเล่น ⇒ โน้ตลงกริดเป๊ะ เทียบเวลาได้ตรง ๆ
    voices: 'melody',
    instrument: 'synth',
    onNote: (n, idx) => fires.push({ idx, at: ctx.currentTime }),
    onProgress: (ms, totalMs) => progress.push({ ms, totalMs }),
    ...opts,
  })
  await vi.advanceTimersByTimeAsync(0) // ให้ playSong นัดโน้ตเสร็จก่อน
  return { fires, progress, done }
}

// เวลาที่โน้ตตัวที่ i ดังจริง (นาฬิกาเสียง) — อ่านจากโน้ตตัวแรกที่โค้ดนัดไว้ ⛔ ไม่ใช่เลขที่เราเดาเอง
const onsetOf = (i) => ctx.starts[0] + i * NOTE_SEC
// โน้ตที่ "กำลังดังอยู่" ณ เวลาของนาฬิกาเสียงตอนนี้
const soundingNow = () => Math.min(NOTE_COUNT - 1, Math.max(0, Math.floor((ctx.currentTime - ctx.starts[0]) / NOTE_SEC)))

beforeEach(() => {
  const toFake = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']
  if (typeof requestAnimationFrame === 'function') toFake.push('requestAnimationFrame', 'cancelAnimationFrame')
  vi.useFakeTimers({ toFake }) // ⛔ ไม่ปลอม Date — เราคุมนาฬิกาผนังเองด้านล่าง
  wallMs = 0
  vi.spyOn(Date, 'now').mockImplementation(() => wallMs)
  ctx.currentTime = 0
  ctx.starts.length = 0
  window.AudioContext = function () { return ctx }
})

afterEach(() => {
  stopPlayback()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ใบงาน #10 · ไฮไลต์คาราโอเกะต้องตรงกับเสียง', () => {
  it('ช่องว่างระหว่างเวลาที่โน้ตดังกับเวลาที่ไฮไลต์ขยับ ต้องไม่เกิน 40 มิลลิวินาที', async () => {
    const { fires } = await startPlay()
    expect(ctx.starts.length).toBe(NOTE_COUNT) // นัดโน้ตครบก่อน แล้วค่อยวัด
    await advance(NOTE_COUNT * NOTE_SEC)

    // ทุกโน้ตต้องได้ไฮไลต์ ⛔ ไม่มีตัวไหนถูกข้าม
    expect(fires.map((f) => f.idx)).toEqual([...Array(NOTE_COUNT).keys()])
    // ...และต้องขยับ "ตอนที่โน้ตนั้นดัง" ⛔ ไม่ใช่ตามหลังเป็นสิบ ๆ มิลลิวินาที
    // 100 ms คือเส้นที่คนเริ่มรู้สึกว่าไม่ทันที (performance-budget ของกลาง) ⇒ ตั้งเพดานไว้ที่ 40 ms
    const lateMs = fires.map((f) => (f.at - onsetOf(f.idx)) * 1000)
    const worst = Math.max(...lateMs.map(Math.abs))
    expect(worst, `ไฮไลต์ช้าที่สุด ${worst.toFixed(0)} ms · รายตัว ${lateMs.map((x) => x.toFixed(0)).join(', ')}`).toBeLessThanOrEqual(40)
  })

  it('สลับไปแท็บอื่น (ตัวจับเวลาถูกหน่วง · 2 นาฬิกาไม่ตรงกัน) → ไฮไลต์ยังอยู่ที่โน้ตที่เสียงกำลังดัง', async () => {
    const { fires } = await startPlay()
    await advance(1.0) // ดูอยู่ปกติ 1 วินาที
    expect(fires.at(-1).idx).toBe(soundingNow())

    // เข้าโหมดพื้นหลัง: เบราว์เซอร์หน่วงตัวจับเวลา และนาฬิกาผนังกับนาฬิกาเสียงเดินไม่เท่ากัน
    // (ผนังวิ่งไป 2 วินาที · เสียงเดินไปแค่ 0.4 วินาที) — ใครอ่านนาฬิกาผนังจะหลุดไปข้างหน้าทันที
    ctx.currentTime = Number((ctx.currentTime + 0.4).toFixed(6))
    wallMs += 2000
    await vi.advanceTimersByTimeAsync(2000)
    expect(fires.at(-1).idx, 'กลับมาดูแล้วไฮไลต์ต้องอยู่ตรงกับเสียง').toBe(soundingNow())

    // ...และต้องไม่ตกขบวนค้างไว้: เล่นต่ออีก 1 วินาทีแบบปกติ ก็ยังตรง
    await advance(1.0)
    expect(fires.at(-1).idx, 'ต้องไม่เพี้ยนสะสมหลังกลับมาดู').toBe(soundingNow())
  })
})

// วงวนที่เดินไฮไลต์ถูกเขียนใหม่ทั้งก้อน ⇒ ของเดิมที่พึ่งวงนี้อยู่ ต้องพิสูจน์ทีละอย่างว่ายังทำงาน
describe('ใบงาน #10 · ของเดิมที่พึ่งวงวนนี้ ต้องไม่พัง', () => {
  it('พัก (กดหยุดกลางเพลง) → ไฮไลต์หยุดขยับ และการเล่นจบลง', async () => {
    const { fires, done } = await startPlay()
    await advance(2.0)
    const atPause = fires.length
    expect(atPause).toBeGreaterThan(1)
    stopPlayback()
    await advance(2.0)
    expect(fires.length, 'หยุดแล้วไฮไลต์ต้องไม่ขยับต่อ').toBe(atPause)
    await expect(done).resolves.toBe(true)
  })

  it('วนซ้ำ → จบรอบแล้วนัดเสียงรอบใหม่ และไฮไลต์กลับไปเริ่มที่โน้ตแรก', async () => {
    const { fires } = await startPlay({ loop: true })
    await advance(NOTE_COUNT * NOTE_SEC + 0.3) // เลยจบเพลงไปนิดเดียว = เพิ่งเข้าโน้ตแรกของรอบใหม่
    expect(ctx.starts.length, 'ต้องนัดโน้ตของรอบที่ 2 ครบ').toBe(NOTE_COUNT * 2)
    expect(fires.at(-1).idx, 'รอบใหม่เริ่มที่โน้ตแรก').toBe(0)
    expect(fires.filter((f) => f.idx === 0), 'ไฮไลต์เริ่มต้นใหม่ 1 ครั้งต่อ 1 รอบ').toHaveLength(2)
  })

  it('แตะโน้ตเพื่อกระโดด (startIndex) → เล่นจากโน้ตนั้น และรายงานเลขโน้ตของทั้งเพลง', async () => {
    const { fires } = await startPlay({ startIndex: 4 })
    expect(ctx.starts.length, 'เสียงเริ่มที่โน้ตที่ 4 ⇒ เหลือ 8 ตัว').toBe(NOTE_COUNT - 4)
    await advance(2.0)
    expect(fires[0].idx, 'ไฮไลต์รายงานเลขของทั้งเพลง ⛔ ไม่ใช่เลขนับใหม่จาก 0').toBe(4)
    expect(fires.at(-1).idx).toBeGreaterThan(4)
  })

  it('แถบความคืบหน้า เดินหน้าอย่างเดียว จาก 0 จนเต็มความยาวเพลง', async () => {
    const { progress } = await startPlay()
    await advance(NOTE_COUNT * NOTE_SEC)
    const ms = progress.map((p) => p.ms)
    const totalMs = progress[0].totalMs
    expect(totalMs).toBeCloseTo(NOTE_COUNT * NOTE_SEC * 1000, 0)
    expect(ms[0]).toBe(0)
    // ค่าสุดท้ายคือครั้งที่อ่านก่อนถึงเส้นชัย 1 จังหวะเคาะ ⇒ ต้องเกือบเต็ม (ไม่ค้างกลางทาง)
    expect(ms.at(-1)).toBeGreaterThan(totalMs - 150)
    expect(ms.at(-1)).toBeLessThanOrEqual(totalMs)
    expect(ms.every((v, i) => i === 0 || v >= ms[i - 1]), 'ห้ามถอยหลัง').toBe(true)
  })
})
