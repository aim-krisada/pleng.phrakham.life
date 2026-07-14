// ROUND 2 — the user-facing "ปรับละเอียด" technique menu (P'Aim 14 ก.ค.: "ผมจะเลือกเปิดปิดได้ และ
// รู้ว่าอะไรเป็นปัญหาจริง"). ONE SSOT list of the arranger techniques a listener can switch on/off (and
// dial), used by BOTH the UI (renders these rows) and the cfg merge (applies the overrides). Each
// entry knows how to READ its current value out of an arrangeCfg and APPLY a new value into one, so
// the menu and the engine never drift.
//
//   key     : stable id (also the localStorage override key)
//   label   : Thai label shown in the menu
//   hint    : one-line plain-language explanation (so a non-musician can learn what it does)
//   type    : 'toggle' | 'slider' | 'choice'
//   read(cfg): the current EFFECTIVE value (for the control's displayed state)
//   apply(cfg,v): mutate cfg to reflect value v (cfg is a private copy — see buildArrangeCfg)
//   slider  : { min, max, step } for type 'slider' (value is a %; 0 = off)
//   options : [{ value, label }] for type 'choice'

const dyn = (c) => (c.dynamics = c.dynamics || {})
function toggleEmb(c, name, on) {
  let list = Array.isArray(c.embellish) ? c.embellish.slice() : (c.embellish ? [name] : [])
  list = list.filter((n) => n !== name)
  if (on) list.push(name)
  c.embellish = list
}
const hasEmb = (c, name) => Array.isArray(c.embellish) && c.embellish.includes(name)

export const TECHNIQUES = [
  {
    key: 'pattern', label: 'ลีลามือซ้าย', hint: 'วิธีเล่นคอร์ด: ลื่นไหล / แตกคอร์ด / ค้างเสียง', type: 'choice',
    options: [
      { value: 'flowing', label: 'ลื่นไหล' },
      { value: 'arpeggio', label: 'แตกคอร์ด' },
      { value: 'sustained', label: 'ค้างเสียง' },
    ],
    read: (c) => c.pattern || 'flowing', apply: (c, v) => { c.pattern = v },
  },
  {
    key: 'bass', label: 'เบสมือซ้าย', hint: 'ลาก+เชื่อมคอร์ด / ลากอุ้ม / เดินเบส / ตอกราก', type: 'choice',
    options: [
      { value: 'pedalWalk', label: 'ลาก+เชื่อม' },
      { value: 'pedal', label: 'ลากอุ้ม' },
      { value: 'walking', label: 'เดินเบส' },
      { value: 'root', label: 'ตอกราก' },
    ],
    read: (c) => c.bass || 'pedal', apply: (c, v) => { c.bass = v },
  },
  {
    key: 'fills', label: 'ลูกรับส่ง', hint: 'มือซ้ายตอบทำนองตอนโน้ตลากยาว (0 = ปิด)', type: 'slider',
    slider: { min: 0, max: 100, step: 10 },
    read: (c) => (c.fills ? Math.round((c.fillLevel ?? 0.4) * 100) : 0),
    apply: (c, v) => { c.fills = v > 0; c.fillLevel = v / 100 },
  },
  {
    key: 'sus', label: 'แขวนคอร์ดก่อนลง', hint: 'หน่วงคอร์ด (sus4) แล้วคลี่คลายที่คอร์ดพัก', type: 'toggle',
    read: (c) => !!c.susCadence, apply: (c, v) => { c.susCadence = v },
  },
  {
    key: 'sparkle', label: 'ประกายเสียงสูง', hint: 'ประกายอ็อกเทฟสูงเป็นระยะ', type: 'toggle',
    read: (c) => hasEmb(c, 'sparkle'), apply: (c, v) => toggleEmb(c, 'sparkle', v),
  },
  {
    key: 'gapFill', label: 'หยอดโน้ตช่องยาว', hint: 'เติมโน้ตในคอร์ดที่ค้างนาน', type: 'toggle',
    read: (c) => hasEmb(c, 'gapFill'), apply: (c, v) => toggleEmb(c, 'gapFill', v),
  },
  {
    key: 'accent', label: 'เน้นจังหวะแรก', hint: 'บีตแรกของห้องหนักกว่าบีตอื่นเล็กน้อย', type: 'toggle',
    read: (c) => (c.dynamics?.accent !== false), apply: (c, v) => { dyn(c).accent = v },
  },
  {
    key: 'contour', label: 'ไล่ระดับตามทำนอง', hint: 'ทำนองไต่ขึ้นดังขึ้น ปลายวรรคผ่อน', type: 'toggle',
    read: (c) => (c.dynamics?.contour !== false), apply: (c, v) => { dyn(c).contour = v },
  },
  {
    key: 'rubato', label: 'ยืดหายใจปลายวรรค', hint: 'โน้ตท้ายท่อนยืดขึ้นนิด แล้วหายใจเข้าท่อนใหม่', type: 'toggle',
    read: (c) => (c.dynamics?.rubato !== false), apply: (c, v) => { dyn(c).rubato = v },
  },
  {
    key: 'holdPulse', label: 'เต้นเบาใต้โน้ตค้าง', hint: 'มือซ้ายเต้นกลางห้องกันเสียงโหวง', type: 'toggle',
    read: (c) => (c.holdPulse !== false), apply: (c, v) => { c.holdPulse = v },
  },
  {
    key: 'easeUnderHold', label: 'ผ่อนมือซ้ายใต้โน้ตค้าง', hint: 'ทำนองลากยาว → มือซ้ายบางลง', type: 'toggle',
    read: (c) => (c.easeUnderHold !== false), apply: (c, v) => { c.easeUnderHold = v },
  },
  {
    key: 'humanize', label: 'ความเป็นมนุษย์', hint: 'สุ่มน้ำหนัก+เวลาเล็กน้อยให้พริ้วเหมือนคนเล่น', type: 'toggle',
    read: (c) => (c.humanize !== false), apply: (c, v) => { c.humanize = v },
  },
]

export const TECHNIQUE_KEYS = TECHNIQUES.map((t) => t.key)
const BY_KEY = Object.fromEntries(TECHNIQUES.map((t) => [t.key, t]))

// Merge the listener's overrides onto a preset's cfg → the cfg the arranger actually runs. Only keys
// the user explicitly set are applied; everything else stays at the preset's default. Returns a NEW
// object (never mutates the preset cfg). `overrides` = { <key>: value } from the store.
export function buildArrangeCfg(presetCfg, overrides = {}) {
  const cfg = { ...presetCfg, dynamics: { ...(presetCfg.dynamics || {}) }, embellish: Array.isArray(presetCfg.embellish) ? presetCfg.embellish.slice() : presetCfg.embellish }
  for (const key of TECHNIQUE_KEYS) {
    if (overrides[key] != null && BY_KEY[key]) BY_KEY[key].apply(cfg, overrides[key])
  }
  return cfg
}

// The effective value of every technique given a preset + overrides — for the UI's displayed state.
export function readTechniques(presetCfg, overrides = {}) {
  const cfg = buildArrangeCfg(presetCfg, overrides)
  return TECHNIQUES.map((t) => ({ key: t.key, label: t.label, hint: t.hint, type: t.type, options: t.options, slider: t.slider, value: t.read(cfg) }))
}
