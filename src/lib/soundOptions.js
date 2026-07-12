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

// เครื่องดนตรี — the five self-hosted solo voices (step 9 enabled all of them).
export const INSTRUMENT_OPTS = [
  { value: 'grand', label: '🎹 เปียโน (Grand)', short: 'เปียโน' },
  { value: 'felt', label: '🎹 เปียโนนุ่ม (Felt)', short: 'Felt' },
  { value: 'nylon', label: '🎸 กีตาร์ (Nylon)', short: 'กีตาร์' },
  { value: 'violin', label: '🎻 ไวโอลิน', short: 'ไวโอลิน' },
  { value: 'cello', label: '🎻 เชลโล', short: 'เชลโล' },
]

// อารมณ์ / สไตล์ — HOW it performs (arranger preset, or ตรงโน้ต = arranger off).
export const STYLE_OPTS = [
  { value: 'arrangement', label: '🎼 บรรเลง (จัดเต็ม)', short: 'บรรเลง' },
  { value: 'calm', label: '🕊️ สงบ (นุ่ม)', short: 'สงบ' },
  { value: 'plain', label: '📝 ตรงโน้ต (ปิดลูกเล่น)', short: 'ตรงโน้ต' },
]
