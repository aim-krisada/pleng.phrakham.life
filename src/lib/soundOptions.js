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

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ PIANO-ONLY (P'Aim 2026-07-27) — "ความเพราะตอนนี้เปียโนเดี่ยวเท่านั้น … เครื่องดนตรีเหลือแค่
// เปียโน การบรรเลงเหลือแค่เดี่ยว … แต่ในเปียโนเองก็จะมีโหมด บรรเลง สงบ ตรงโน้ต ไว้ได้".
// เต็มวง + เครื่องดนตรีอื่น ยัง WIRED ครบ (arranger / sampler / midi ไม่ถูกแตะ) — แค่ไม่โผล่บน UI.
//
// 👉 วิธีเปิดกลับ (หลัง tune cello + piano เสร็จ): ตั้ง `PIANO_ONLY = false` บรรทัดล่างนี้ — จบ.
//    กลุ่ม "การบรรเลง" + "เครื่องดนตรี" จะกลับมาโผล่ในป๊อปโอเวอร์ทั้ง 2 หน้าเองอัตโนมัติ
//    (SoundControl ซ่อนกลุ่มที่เลือกได้ตัวเดียว), ค่าใน localStorage กลับมาใช้ได้ทันที.
//    ถ้าจะเปิดเฉพาะเชลโล่: คง PIANO_ONLY = true แล้วเติม 'cello' ใน ENABLED_INSTRUMENTS + ลบ
//    `disabled` ของมันใน ALL_INSTRUMENT_OPTS.
export const PIANO_ONLY = true

// ค่าที่ "เลือกได้จริง" ในแต่ละแกน — ใช้ทั้งกรองตัวเลือกบน UI และตรวจค่าที่ค้างใน localStorage
// (store.js) เพื่อให้คนที่เคยเลือก เต็มวง/กีตาร์ ไว้ ตกกลับมาเป็น เปียโน+เดี่ยว อัตโนมัติ.
export const ENABLED_ENSEMBLES = PIANO_ONLY ? ['solo'] : ['solo', 'ensemble']
export const ENABLED_INSTRUMENTS = PIANO_ONLY ? ['grand'] : ['grand', 'nylon']
// ─────────────────────────────────────────────────────────────────────────────

// การบรรเลง — solo (one instrument) vs ensemble (รวมวง เสียงจริง: เปียโน+เชลโล+ไวโอลิน · §6b.2).
const ALL_ENSEMBLE_OPTS = [
  { value: 'solo', label: '🎹 เดี่ยว (เครื่องเดียว)', short: 'เดี่ยว' },
  { value: 'ensemble', label: '🎻 เต็มวง (เปียโนนำ)', short: 'เต็มวง' },
]

// เครื่องดนตรี — felt/violin/cello are self-hosted + wired but stay "เร็ว ๆ นี้" (disabled) until
// P'Aim signs off on each — flip `disabled` off here to enable one (and add it to ENABLED_INSTRUMENTS).
const ALL_INSTRUMENT_OPTS = [
  { value: 'grand', label: '🎹 เปียโน (Grand)', short: 'เปียโน' },
  { value: 'nylon', label: '🎸 กีตาร์ (Nylon)', short: 'กีตาร์' },
  { value: 'felt', label: '🎹 เปียโนนุ่ม (Felt) — เร็ว ๆ นี้', short: 'Felt', disabled: true },
  { value: 'violin', label: '🎻 ไวโอลิน — เร็ว ๆ นี้', short: 'ไวโอลิน', disabled: true },
  { value: 'cello', label: '🎻 เชลโล — เร็ว ๆ นี้', short: 'เชลโล', disabled: true },
]

// สิ่งที่หน้าจอเห็น: เฉพาะค่าที่เปิดจริง (PIANO_ONLY → เหลืออย่างละตัว → SoundControl ซ่อนทั้งกลุ่ม).
export const ENSEMBLE_OPTS = ALL_ENSEMBLE_OPTS.filter((o) => ENABLED_ENSEMBLES.includes(o.value))
export const INSTRUMENT_OPTS = ALL_INSTRUMENT_OPTS.filter(
  (o) => ENABLED_INSTRUMENTS.includes(o.value) || (!PIANO_ONLY && o.disabled),
)

// อารมณ์ / สไตล์ — HOW it performs (arranger preset, or ตรงโน้ต = arranger off).
export const STYLE_OPTS = [
  { value: 'arrangement', label: '🎼 บรรเลง (จัดเต็ม)', short: 'บรรเลง' },
  { value: 'calm', label: '🕊️ สงบ (นุ่ม)', short: 'สงบ' },
  { value: 'plain', label: '📝 ตรงโน้ต (ปิดลูกเล่น)', short: 'ตรงโน้ต' },
]
