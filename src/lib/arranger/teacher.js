// teacher.js — "กฎกลางตามครูดนตรี" (พี่วีรศักดิ์ 2026-07-30)
//
// ที่มา: transcript การสัมภาษณ์ครูวีรศักดิ์ (`C:\Users\aimkr\Downloads\สำหรับคุยกับพี่วีรศักดิ์.md`)
// บรรทัด 368-378 (ขอบเขตมือซ้าย + chord tone/passing note) · 405 (เพลงช้ามือซ้ายโปร่ง ยกเว้นท่อนฮุก) ·
// 424 (ช่วงความเร็ว 60-80 / 80-96 / 100-104+) · 443 (ไคลแมกซ์ = โน้ตทำนองไต่สูงในท่อนฮุก) ·
// 459 (ท่อนฮุก 8 ห้อง แบ่ง 4+4 หรือไต่ทีละ 2 ห้อง อ้างจากเมโลดี้จริง).
//
// โมดูลนี้เป็น pure ทั้งหมด — แปลง "ข้อมูลเพลง" → "arrangeCfg" ไม่มี AudioContext จึงเทสได้ headless
// และ live/export ใช้ตัวเดียวกัน. ⛔ ไม่แตะพรีเซ็ตเดิม: ของเดิมยังทำงานเหมือนเดิมทุกอย่าง.

// ── กฎ 1 · ช่วงความเร็ว 3 ช่วง (ครู: 60-80 ช้า · 80-96 ปานกลาง · 100-104 ขึ้นไป เร็ว) ──
// ช่องว่าง 96-100 ที่ครูไม่ได้พูดถึง: ให้ตกเป็น "ปานกลาง" (ปลอดภัยกว่า — ไม่ดันเพลงกลางไปเป็นเพลงเร็ว)
export const TEMPO_BANDS = [
  { id: 'slow', label: 'ช้า', th: '60-80', max: 80 },
  { id: 'medium', label: 'ปานกลาง', th: '80-96', max: 99.999 },
  { id: 'fast', label: 'เร็ว', th: '100 ขึ้นไป', max: Infinity },
]

export function tempoBand(bpm) {
  const b = Number(bpm) || 92
  return TEMPO_BANDS.find((x) => b <= x.max) || TEMPO_BANDS[TEMPO_BANDS.length - 1]
}

// ── กฎ 2 · ลีลามือซ้ายต่อช่วงความเร็ว ──
// ช้า  = ท่อนร้องโปร่ง (คอร์ดค้าง + เบสอุ้ม ไม่มีโน้ตถี่) · ท่อนฮุกคลี่คอร์ด (เพิ่มสีสัน/กระฉับกระเฉง)
// กลาง = ท่อนร้องคลี่คอร์ด · ท่อนฮุกคลี่ถี่ขึ้นเท่าตัว
// เร็ว = ท่อนร้องคอร์ดค้าง (ที่ความเร็วสูง โน้ตถี่กลายเป็นรก) · ท่อนฮุกคลี่คอร์ดพอให้พุ่ง
const BAND_STYLE = {
  slow: {
    pattern: 'sustained', refrainPattern: 'arpeggio', bass: 'pedal', voicing: 'open',
    embellish: ['sparkle'], fills: true, fillLevel: 0.22, susCadence: true,
    verseLevel: 0.9, refrainLevel: 1.0,
  },
  medium: {
    pattern: 'arpeggio', refrainPattern: 'arpeggioDense', bass: 'pedalWalk', voicing: 'drop2',
    embellish: ['sparkle', 'gapFill'], fills: true, fillLevel: 0.36, susCadence: true,
    verseLevel: 0.93, refrainLevel: 1.0,
  },
  fast: {
    pattern: 'sustained', refrainPattern: 'arpeggio', bass: 'root', voicing: 'drop2',
    embellish: ['sparkle', 'chromaticApproach'], fills: true, fillLevel: 0.3, susCadence: true,
    verseLevel: 0.94, refrainLevel: 1.0,
  },
}

// melody timeline (startBeat, midi) จาก notes[] — ตัวเดียวกับที่ arrange() ใช้เดินบีต
function melodyTimeline(notes) {
  const out = []
  let beat = 0
  for (const n of notes || []) {
    if (n.midi != null) out.push({ startBeat: beat, beats: n.beats, midi: n.midi })
    beat += n.beats
  }
  return out
}

// ── กฎ 3 · หาจุดไคลแมกซ์จากเมโลดี้ (ครู: โน้ตทำนองที่ไต่สูงขึ้น และมักอยู่ในท่อนฮุก) ──
// เลือกท่อนฮุกที่ "มีโน้ตสูงสุดของเพลงอยู่" ก่อน; ถ้าไม่มีป้ายท่อนฮุกเลย → ใช้ครึ่งหลังของเพลง
// (โน้ตสูงสุดมักอยู่ท้าย) แล้วยึดโน้ตสูงสุดในช่วงนั้นเป็นยอด.
export function climaxPlan(notes, sections = [], bpb = 4) {
  const mel = melodyTimeline(notes)
  if (!mel.length) return null
  const totalBeats = mel[mel.length - 1].startBeat + mel[mel.length - 1].beats
  const top = mel.reduce((m, x) => Math.max(m, x.midi), -Infinity)

  // ยอด = "โน้ตทำนองที่สูงที่สุด" ตามที่ครูบอก. ถ้าโน้ตสูงสุดโผล่หลายที่ ให้ยึด**ครั้งท้ายสุด**
  // (ไคลแมกซ์ปลายทางเป็นธรรมชาติกว่า) และถ้ามีครั้งที่อยู่ใน "ท่อนรับ" ให้ท่อนรับชนะ (ครู: มักอยู่ท่อนฮุก)
  const isRef = (b) => (sections || []).some((s) => s.isRefrain && b >= s.fromBeat && b < s.toBeat)
  const tops = mel.filter((m) => m.midi === top)
  const inRef = tops.filter((m) => isRef(m.startBeat))
  const peak = (inRef.length ? inRef : tops)[(inRef.length ? inRef : tops).length - 1]
  const sectionOf = (b) => (sections || []).find((s) => b >= s.fromBeat && b < s.toBeat)
  const host = sectionOf(peak.startBeat)
  const section = host
    ? { fromBeat: host.fromBeat, toBeat: host.toBeat, name: host.name, source: host.isRefrain ? 'ท่อนรับ' : `ท่อน "${host.name}"` }
    : { fromBeat: 0, toBeat: totalBeats, name: null, source: 'ทั้งเพลง (ไม่มีป้ายท่อน)' }

  // ⭐ ช่วง "ไต่" ต้องจบที่ยอด ไม่ใช่เริ่มที่ยอด (บั๊กรอบแรก) — ถอยจากยอดกลับไปไม่เกิน 8 ห้อง
  // และไม่ถอยเลยต้นท่อนที่ยอดอยู่ เว้นแต่ยอดอยู่ต้นท่อนพอดี (< 4 ห้อง) ก็ให้ไต่มาจากท้ายท่อนก่อน
  // = "ลูกส่งเข้าท่อนใหม่" ซึ่งเป็นเรื่องปกติทางดนตรี
  const avail = peak.startBeat - section.fromBeat
  let buildFrom
  if (avail >= 8 * bpb) buildFrom = peak.startBeat - 8 * bpb
  else if (avail >= 4 * bpb) buildFrom = section.fromBeat
  else buildFrom = Math.max(0, peak.startBeat - 4 * bpb)
  const buildBars = Math.max(1, Math.round((peak.startBeat - buildFrom) / bpb))

  return {
    section, bpb,
    bars: Math.max(1, Math.round((section.toBeat - section.fromBeat) / bpb)),
    buildFrom, buildBars,
    climaxBeat: peak.startBeat, climaxMidi: peak.midi, songTopMidi: top,
    climaxInRefrain: isRef(peak.startBeat),
  }
}

// ── กฎ 4 · ไต่ความรู้สึกก่อนถึงไคลแมกซ์ (ครู: ท่อน 8 ห้อง แบ่ง 4+4 หรือไต่ทีละ 2 ห้อง) ──
// คืน hairpins ให้ dynamics.crescendo: ท่อน ≥ 8 ห้อง = 2 ขั้น (4+4) · สั้นกว่านั้น = ไต่ทีละ 2 ห้อง
// เพดานตั้งไว้เตี้ย (+10%) โดยเจตนา — ครูบอกว่าไคลแมกซ์ไม่ควรได้มาจากการดันเสียงจนแสบหู
export function buildHairpins(plan, { top = 1.10, floor = 0.94 } = {}) {
  if (!plan) return []
  const { section, bpb, climaxBeat, buildFrom, buildBars } = plan
  const start = buildFrom
  const peak = climaxBeat
  const hp = []
  if (peak <= start) return []
  if (buildBars >= 8) {
    // 4 + 4: 4 ห้องแรกเดินเรียบต่ำกว่าปกติเล็กน้อย · 4 ห้องหลังไต่ขึ้นจนถึงยอด
    const mid = start + 4 * bpb
    hp.push({ fromBeat: start, toBeat: Math.min(mid, peak), from: floor, to: 1.0 })
    if (peak > mid) hp.push({ fromBeat: mid, toBeat: peak, from: 1.0, to: top })
  } else {
    // ไต่ทีละ 2 ห้อง — ทำเป็นขั้นบันได (step) ไม่ใช่ทางลาดยาว จะได้ "รู้สึกขยับขึ้น" เป็นช่วง ๆ
    const steps = Math.max(1, Math.ceil((peak - start) / (2 * bpb)))
    for (let i = 0; i < steps; i++) {
      const a = start + i * 2 * bpb
      const b = Math.min(peak, a + 2 * bpb)
      if (b <= a) break
      const lvl = floor + ((top - floor) * i) / steps
      const nxt = floor + ((top - floor) * (i + 1)) / steps
      hp.push({ fromBeat: a, toBeat: b, from: lvl, to: nxt })
    }
  }
  // หลังยอด = ผ่อนลงกลับระดับปกติภายใน 2 ห้อง (ไม่ค้างดังยาว และไม่ลาดลงทั้งท่อนจนฟังเหมือนเพลงจบ)
  const relaxTo = Math.min(section.toBeat, peak + 2 * bpb)
  if (relaxTo > peak) hp.push({ fromBeat: peak, toBeat: relaxTo, from: top, to: 1.0 })
  return hp
}

// ── กฎ 5 (เกณฑ์เพิ่มจาก transcript บรรทัด 368-378 ที่ใบสั่งงานไม่ได้ระบุ) ──
// (ก) มือซ้ายห้ามล้ำขึ้นไปทับช่วงเสียงทำนอง — ตั้งเพดานมือซ้ายไว้ใต้โน้ตทำนองที่ต่ำสุดในย่านนั้น
// (ข) โน้ตมือซ้ายต้องเป็นโน้ตในคอร์ด (passing note อนุญาต) — เครื่องยนต์เดิมทำอยู่แล้ว
//     (voicing/bass/embellish ใช้ chord tone เท่านั้น) ที่นี่จึงคุมแค่ข้อ (ก)
// วิธี: ย้ายลงเป็นอ็อกเทฟ (×12) จึงยังเป็นโน้ตตัวเดิมในคอร์ด ไม่เปลี่ยน harmony
export function lowerLeftHandBelowMelody(events, { marginSemitones = 2 } = {}) {
  const mel = events.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  if (!mel.length) return events
  const WINDOW = 4 // บีตรอบ ๆ ที่ถือว่า "ทำนองกำลังอยู่ย่านนี้"
  for (const e of events) {
    if (e.role === 'melody') continue
    let lo = Infinity
    for (const m of mel) {
      if (m.startBeat > e.startBeat + WINDOW) break
      if (m.startBeat >= e.startBeat - WINDOW) lo = Math.min(lo, m.midi)
    }
    if (!Number.isFinite(lo)) continue
    const ceil = lo - marginSemitones
    let guard = 0
    while (e.midi > ceil && guard++ < 4) e.midi -= 12
  }
  return events
}

// ── แบบที่สาม · "หนาขึ้น ไม่ดังขึ้น" (ครู/บรรทัด 268+357: หาความรู้สึกพุ่งโดยไม่ดันเสียงจนแสบหู) ──
// เพิ่มความหนาที่ช่วงไต่เข้าไคลแมกซ์ด้วยการ "เติมอ็อกเทฟล่างของเบส" (โน้ตเดิม คอร์ดเดิม ไม่เพี้ยน)
// ความดังรวมขยับขึ้นน้อยมาก แต่หูได้ยินว่า "หนา/เต็ม" ขึ้น = ความรู้สึกพุ่งโดยไม่แสบ
export function thickenIntoClimax(events, plan, { fromBeat, gain = 0.55 } = {}) {
  if (!plan) return events
  // ค่าเริ่มต้น = ครึ่งหลังของช่วงไต่ (จากยอดถอยกลับไปครึ่งทาง) จนถึงยอด + ค้างต่ออีก 2 ห้อง
  const start = fromBeat != null ? fromBeat : (plan.buildFrom + plan.climaxBeat) / 2
  const end = Math.min(plan.section.toBeat, plan.climaxBeat + 2 * plan.bpb)
  const add = []
  for (const e of events) {
    if (e.role !== 'bass') continue
    if (e.startBeat < start || e.startBeat >= end) continue
    const midi = e.midi - 12
    if (midi < 28) continue // ต่ำกว่านี้เปียโนเริ่มเป็นเสียงครืด ไม่ใช่โน้ต
    add.push({ ...e, midi, gain: e.gain * gain, role: 'bass', inst: 'chord' })
  }
  events.push(...add)
  return events
}

/**
 * กฎกลางตามครู → arrangeCfg (ใส่ต่อท้าย presetCfg ได้เลย)
 * @param {Object} content  song content (ต้อง resolve v2 → lines แล้ว หรือดิบก็ได้ ใช้แค่ bpm/timeSignature)
 * @param {Array}  notes    songToNotes/buildPlayNotes ของเพลงนั้น
 * @param {Array}  sections resolveSections(...) — ต้องมี isRefrain
 * @param {Object} opt      { mode: 'loud' | 'thick', refrainDensity: 'normal' | 'dense' }
 *                          mode: loud = ไต่ด้วยความดัง (ค่าเริ่มต้น) · thick = ไต่ด้วยความหนา
 *                          refrainDensity: normal = ท่อนรับถี่ ~1.4 เท่าของท่อนร้อง (ค่าเริ่มต้น) ·
 *                            dense = ~2.8 เท่า (ตัวเลือกที่ครูจะฟังเทียบว่าสีสันพอไหม)
 * @returns {{cfg:Object, plan:Object|null, band:Object, hairpins:Array, notes:string[]}}
 */
export function teacherCfg(content, notes, sections = [], opt = {}) {
  const mode = opt.mode === 'thick' ? 'thick' : 'loud'
  const dense = opt.refrainDensity === 'dense'
  const bpm = Number(content?.bpm) || 92
  const band = tempoBand(bpm)
  const style = BAND_STYLE[band.id]
  // ท่อนรับ "ถี่เต็มที่" — ตัวเลือกให้ครูฟังเทียบว่าสีสันพอไหม (วัดกับเพลง 089: 1.4 เท่า → 2.8 เท่า)
  const refrainPattern = dense ? 'arpeggioDense' : style.refrainPattern
  const ts = content?.timeSignature
  const bpb = typeof ts === 'string' ? (parseInt(ts.split('/')[0], 10) || 4) : (Number(ts) || 4)
  const plan = climaxPlan(notes, sections, bpb)
  // thick = แทบไม่เพิ่มความดังเลย (+3%) แล้วไปเพิ่มความหนาแทน
  const hairpins = buildHairpins(plan, mode === 'thick' ? { top: 1.03, floor: 0.97 } : { top: 1.10, floor: 0.94 })

  // sectionMap: ท่อนร้องเบากว่า ท่อนรับเต็ม — ใช้ชื่อท่อนจริงของเพลงนั้น
  const sectionMap = {}
  for (const s of sections || []) {
    if (s.name == null) continue
    sectionMap[s.name] = s.isRefrain ? style.refrainLevel : style.verseLevel
  }

  const cfg = {
    chordGain: 0.09,
    pattern: style.pattern, refrainPattern,
    bass: style.bass, voicing: style.voicing,
    embellish: style.embellish, fills: style.fills, fillLevel: style.fillLevel,
    susCadence: style.susCadence,
    reverb: band.id === 'slow' ? 'church' : 'room', pan: true,
    dynamics: {
      accent: true, contour: true, rubato: true,
      section: true, sectionMap,
      cresc: hairpins,
    },
    // ตัวคุมของเราเอง (arrange() อ่านสองคีย์นี้)
    lhCeiling: true,
    thicken: mode === 'thick' && plan ? { plan } : null,
  }
  return { cfg, plan, band, hairpins, mode, refrainDensity: dense ? 'dense' : 'normal' }
}
