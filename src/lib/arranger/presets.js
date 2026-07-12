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
      pattern: 'sustained', bass: 'pedal', voicing: 'open', embellish: false,
      reverb: 'church', pan: false, bpm: 64,
      dynamics: { accent: true, contour: true, rubato: true, section: true, sectionMap: { verse: 0.9, chorus: 1.0 } },
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
      { role: 'bass', inst: 'grand', pattern: 'root', register: [36, 51] },
    ],
    cfg: {
      pattern: 'arpeggio', bass: 'root', voicing: 'drop2', embellish: ['sparkle', 'gapFill'],
      reverb: 'room', pan: true, bpm: 72,
      dynamics: { accent: true, contour: true, rubato: true, section: true, sectionMap: { verse: 0.85, chorus: 1.0 } },
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

// §6d — auto-instrumentation (piano-first version): the consultant's tempo→pattern rule. SLOW
// songs get the flowing arpeggio (fills the space, keeps it from feeling hollow); FAST songs get
// the calmer sustained pad (a busy arp would clutter). Threshold ~92 bpm (tunable with P'Aim).
// Returns a preset id; the full "choose across all orchestrations" version is future (§6d).
export function recommendRecipe(features) {
  const bpm = features?.bpm ?? 92
  return bpm < 92 ? 'piano-arrangement' : 'piano-calm'
}
