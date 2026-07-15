// B107 P2 · §6 — presets ("อารมณ์"). What the user actually picks. Each preset is a role-based
// orchestration recipe (§6a′) that also flattens to the `arrangeCfg` the scheduler consumes.
// P2 ships the two PIANO presets that are buildable today (grand is loaded; felt = filtered grand
// arrives in step 9). The other moods (Acoustic Intimate / Modern Worship / Classical) are slots
// that plug in once their samples exist — no engine change, just more recipes.
//
// role-based recipe: melody / comp / bass each name an instrument + pattern + register. For P2
// all three are grand, so `cfg` is a single-instrument config; the roles[] descriptor is carried
// for the future multi-instrument path (scheduler will iterate roles then).

export const PRESETS = {
  // เปียโนสงบ — calm: held pad + carrying pedal bass, gentle room, no embellishment. "Sacred Space".
  'piano-calm': {
    id: 'piano-calm',
    label: 'เปียโนสงบ',
    mood: 'สงบ · นุ่ม',
    inst: 'grand', // felt (filtered grand) in step 9
    roles: [
      { role: 'melody', inst: 'grand', pattern: null, register: [55, 84] },
      { role: 'comp', inst: 'grand', pattern: 'sustained', register: [48, 67] },
      { role: 'bass', inst: 'grand', pattern: 'pedal', register: [36, 51] },
    ],
    cfg: {
      // chordGain = left-hand working level (P'Aim 14 ก.ค. "มือซ้ายเบามาก · ระดับเดียว"). Sits ABOVE
      // the sampler floor (0.03) so accent/contour/humanize can shade it up AND down = dynamic life,
      // not one flat level. Still soft (maps to low PPP) so the tune leads. Round-2 by-ear knob.
      chordGain: 0.09,
      // สงบ ก็ minimal เช่นเดียวกับบรรเลง (P'Aim 14 ก.ค.): ค้างเสียง + ลากอุ้ม · ลูกเล่น/dynamics ปิดหมด
      // (เน้นจังหวะ/ไล่ระดับ/ยืดหายใจ) ให้เรียบ-คาดเดาได้เท่ากันเมื่อผู้ใช้เลือกสงบเอง. 3 ตัวช่วยเบื้องหลังคงเปิด.
      pattern: 'sustained', bass: 'pedal', voicing: 'open', embellish: false,
      reverb: 'church', pan: false, bpm: 64,
      dynamics: { accent: false, contour: false, rubato: false, section: false },
    },
  },
  // เปียโนบรรเลง — arrangement: arpeggiated left hand under the tune, drop-2 openness, light
  // sparkle, a small room. "เหมือนคนเล่นจริง". This is the P2 default (เพราะสุดก่อน).
  'piano-arrangement': {
    id: 'piano-arrangement',
    label: 'เปียโนบรรเลง',
    mood: 'บรรเลง · มีชีวิต',
    inst: 'grand',
    roles: [
      { role: 'melody', inst: 'grand', pattern: null, register: [55, 84] },
      { role: 'comp', inst: 'grand', pattern: 'arpeggio', register: [48, 67] },
      { role: 'bass', inst: 'grand', pattern: 'pedal', register: [36, 51] },
    ],
    cfg: {
      // "เปิดหมด" default (P'Aim 15 ก.ค. — กลับทิศจาก minimalist 14 ก.ค.): เปิดลูกเล่นทุกตัวในเมนู
      // "ปรับละเอียด" เป็นค่าเริ่มต้น (แตกคอร์ด + ลากอุ้ม + ลูกรับส่ง + แขวนคอร์ด + ประกาย + หยอดโน้ต +
      // เน้นจังหวะ + ไล่ระดับ + ยืดหายใจ + humanize/holdPulse/easeUnderHold). ที่ minimalist เดิมต้อง
      // ปิดไว้เพราะ "เปิดพร้อมกันแล้วเสียงเละ" — ตอนนี้ REFEREE (วาทยกร · เปิดตลอด, ดู arranger/index.js)
      // คุม no-clash + balance ให้แล้ว จึงเปิดหมดได้โดยไม่เละ. ผู้ใช้ยังปิดเฉพาะตัวได้ในเมนู.
      chordGain: 0.09,
      fills: true, fillLevel: 0.4, // ลูกรับส่ง (วาทยกรกันไม่ให้ทับทำนอง)
      pattern: 'arpeggio', bass: 'pedal', voicing: 'drop2',
      embellish: ['sparkle', 'gapFill', 'chromaticApproach'], // ประกาย + หยอดโน้ต + คั่นโครมาติก
      susCadence: true, // แขวนคอร์ดก่อนลง
      refrainPattern: 'arpeggioDense', // ท่อนรับยังแตกคอร์ดถี่ขึ้นให้เด่น (ป้าย รับ/***)
      reverb: 'room', pan: true, bpm: 72,
      dynamics: { accent: true, contour: true, rubato: true, section: false },
    },
  },
}

// The P2 default preset id (P'Aim: "เพราะสุดก่อน" — richest piano out of the box; note-check mode
// is opt-in and remembered separately). Becomes an ensemble preset once band samples land.
export const DEFAULT_PRESET = 'piano-arrangement'

// Return the flat arrangeCfg for a preset id (or the default). Safe for unknown ids.
export function presetCfg(id) {
  const p = PRESETS[id] || PRESETS[DEFAULT_PRESET]
  return { ...p.cfg }
}

// §6d — song features a recommender reads to auto-pick an orchestration. P2 detects the pieces
// that are cheap and reliable (tempo + meter); mood/minor detection is a future refinement.
export function songFeatures(content) {
  const bpm = Number(content?.bpm) || 92
  const ts = content?.timeSignature
  const beatsPerBar = typeof ts === 'string' ? parseInt(ts.split('/')[0], 10) || 4 : (typeof ts === 'number' ? ts : 4)
  const lines = (content?.lines || []).length
  return { bpm, beatsPerBar, lines }
}

// Auto-picked default preset. P'Aim 14 ก.ค.: ONE predictable minimal default for EVERY song —
// "บรรเลง-minimal" (แตกคอร์ด + ลากอุ้ม + ลูกรับส่งน้อยสุด + ลูกเล่นปิด). The earlier tempo switch
// (fast → สงบ) was removed because it surprised the listener (a fast song opened as สงบ with a
// different, non-minimal setup) and broke the "predictable single default" goal. สงบ / ตรงโน้ต stay
// available as MANUAL picks. `features` kept in the signature for a possible future recommender.
export function recommendRecipe(/* features */) {
  return 'piano-arrangement'
}
