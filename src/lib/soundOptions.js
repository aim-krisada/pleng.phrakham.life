// B107 step 9 — the option lists for the four sound axes, shared by BOTH the ฝึกร้อง viewer
// (SongViewer) and the แก้เพลง editor (EditorMode) so the two "เสียงดนตรี" popovers stay in sync
// (one SSOT for the labels + which instruments are enabled). `short` = the chip / badge label;
// `label` = the long menu label; `disabled` = a coming-soon axis value (เต็มวง, until SA ships it).

// เสียงที่เล่น — what voices sound (B104).
export const SOUND_OPTS = [
  { value: 'melody', label: '🎵 ทำนองอย่างเดียว', short: 'ทำนอง' },
  { value: 'chords', label: '🎹 คอร์ดอย่างเดียว', short: 'คอร์ด' },
  { value: 'both', label: '🎶 ทำนอง + คอร์ด', short: 'รวม' },
]

// การบรรเลง — solo (one instrument) vs ensemble (auto-filled band, still เร็ว ๆ นี้ · SA designs it).
export const ENSEMBLE_OPTS = [
  { value: 'solo', label: '🎹 เดี่ยว (เครื่องเดียว)', short: 'เดี่ยว' },
  { value: 'ensemble', label: '🎻 เต็มวง (นำวง) — เร็ว ๆ นี้', short: 'เต็มวง', disabled: true },
]

// เครื่องดนตรี — LAUNCH scope (P'Aim 13 ก.ค.): ship only เปียโน + กีตาร์ (nylon, approved from the
// solo demo). felt/violin/cello are self-hosted + wired but stay "เร็ว ๆ นี้" (disabled) until
// P'Aim signs off on each — flip `disabled` off here to enable one (and add it to READY_INSTRUMENTS).
export const INSTRUMENT_OPTS = [
  { value: 'grand', label: '🎹 เปียโน (Grand)', short: 'เปียโน' },
  { value: 'nylon', label: '🎸 กีตาร์ (Nylon)', short: 'กีตาร์' },
  { value: 'felt', label: '🎹 เปียโนนุ่ม (Felt) — เร็ว ๆ นี้', short: 'Felt', disabled: true },
  { value: 'violin', label: '🎻 ไวโอลิน — เร็ว ๆ นี้', short: 'ไวโอลิน', disabled: true },
  { value: 'cello', label: '🎻 เชลโล — เร็ว ๆ นี้', short: 'เชลโล', disabled: true },
]

// อารมณ์ / สไตล์ — HOW it performs (arranger preset, or ตรงโน้ต = arranger off).
export const STYLE_OPTS = [
  { value: 'arrangement', label: '🎼 บรรเลง (จัดเต็ม)', short: 'บรรเลง' },
  { value: 'calm', label: '🕊️ สงบ (นุ่ม)', short: 'สงบ' },
  { value: 'plain', label: '📝 ตรงโน้ต (ปิดลูกเล่น)', short: 'ตรงโน้ต' },
]
