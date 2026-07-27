// @vitest-environment jsdom
// PIANO-ONLY (P'Aim 2026-07-27) — "เครื่องดนตรีเหลือแค่เปียโน การบรรเลงเหลือแค่เดี่ยว … แต่ในเปียโน
// เองก็จะมีโหมด บรรเลง สงบ ตรงโน้ต ไว้ได้".
//
// The trap this file exists to close: someone who last used the site with "เต็มวง" or "กีตาร์"
// still has that word sitting in localStorage. Once the picker no longer offers it, a naive build
// would keep honouring the stale pick — and they'd press ▶ and get a mode the UI can't show or
// (worse) silence, with no way to fix it themselves. So the stale value MUST fall back on load.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PIANO_ONLY, ENABLED_ENSEMBLES, ENABLED_INSTRUMENTS,
  ENSEMBLE_OPTS, INSTRUMENT_OPTS, STYLE_OPTS, SOUND_OPTS,
} from './soundOptions.js'

describe('PIANO-ONLY — what the picker offers', () => {
  it('การบรรเลง offers เดี่ยว only', () => {
    expect(ENSEMBLE_OPTS.map((o) => o.value)).toEqual(['solo'])
  })

  it('เครื่องดนตรี offers เปียโน only — no กีตาร์, no "เร็ว ๆ นี้" placeholders', () => {
    expect(INSTRUMENT_OPTS.map((o) => o.value)).toEqual(['grand'])
    expect(INSTRUMENT_OPTS.some((o) => o.disabled)).toBe(false)
  })

  it('keeps all THREE piano modes — บรรเลง · สงบ · ตรงโน้ต (the one real choice left)', () => {
    expect(STYLE_OPTS.map((o) => o.value)).toEqual(['arrangement', 'calm', 'plain'])
  })

  it('leaves เสียงที่เล่น untouched (P\'Aim never asked to narrow it)', () => {
    expect(SOUND_OPTS.map((o) => o.value)).toEqual(['melody', 'chords', 'both'])
  })

  it('is driven by ONE switch, so flipping it restores เต็มวง + the other instruments', () => {
    expect(PIANO_ONLY).toBe(true)
    expect(ENABLED_ENSEMBLES).toEqual(['solo'])
    expect(ENABLED_INSTRUMENTS).toEqual(['grand'])
  })
})

// The store reads localStorage at MODULE LOAD, so each case seeds storage first, then imports a
// fresh copy of the module.
async function freshStore(seed) {
  localStorage.clear()
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
  vi.resetModules()
  return import('../store.js')
}

describe('PIANO-ONLY — a stale pick from before must not strand anyone', () => {
  beforeEach(() => { localStorage.clear() })

  it('ฝึกร้อง: an old "เต็มวง" + "กีตาร์" pick falls back to เดี่ยว + เปียโน', async () => {
    const s = await freshStore({
      'pleng.ensembleMode': 'ensemble',
      'pleng.leadInstrument': 'nylon',
    })
    expect(s.ensembleMode.value).toBe('solo')
    expect(s.leadInstrument.value).toBe('grand')
  })

  it('แก้เพลง: its separate keys fall back the same way', async () => {
    const s = await freshStore({
      'pleng.editor.ensemble': 'ensemble',
      'pleng.editor.instrument': 'nylon',
    })
    expect(s.editorEnsemble.value).toBe('solo')
    expect(s.editorInstrument.value).toBe('grand')
  })

  it('a stale value can no longer be re-applied through the setters either', async () => {
    const s = await freshStore({})
    s.setEnsembleMode('ensemble')
    s.setLeadInstrument('cello')
    s.setEditorEnsemble('ensemble')
    s.setEditorInstrument('nylon')
    expect(s.ensembleMode.value).toBe('solo')
    expect(s.leadInstrument.value).toBe('grand')
    expect(s.editorEnsemble.value).toBe('solo')
    expect(s.editorInstrument.value).toBe('grand')
  })

  it('the piano MODE (บรรเลง/สงบ/ตรงโน้ต) is still remembered — we narrowed instruments, not modes', async () => {
    const s = await freshStore({ 'pleng.playStyle': 'calm' })
    expect(s.playStyle.value).toBe('calm')
  })
})
