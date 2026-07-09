// Notation lint — pure, UI-agnostic checks for movable-do numbered notation.
// One rule source shared by the Studio editor (current + the redesign): each rule
// is a fact about the notation SYSTEM, not a musical judgement. It flags misused
// symbols and structural problems; it never guesses whether a pitch is the "right"
// melody note — that still needs the ear.

import { parseNotes, beatCount, expectedBeats } from './notation.js'

export const SEVERITY = { ERROR: 'error', WARNING: 'warning', HINT: 'hint' }

function fmtBeats(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// A written "degree" for accidental tracking = pitch digit + octave, so a sharp on
// 3 and a natural on 3 in the SAME octave refer to the same note.
function degreeKey(t) {
  return t.pitch + '@' + (t.high - t.low)
}

// ♮ only cancels a # or b written earlier on the same degree in the same bar. A ♮
// with no such preceding alteration does nothing — in movable-do the plain digit is
// already the key's diatonic pitch, so ♮ can't lower or raise it. Almost always the
// writer meant b (down a semitone) or # (up): the classic staff-notation-vs-numbered
// mix-up (e.g. wanting "C natural" in key A, where degree 3 is already C#).
function naturalMisuse(tokens) {
  const out = []
  const altered = new Set()
  for (const t of tokens) {
    if (t.type !== 'note') continue
    const k = degreeKey(t)
    if (t.accidental === '#' || t.accidental === 'b') {
      altered.add(k)
    } else if (t.accidental === 'n') {
      if (!altered.has(k)) {
        out.push({
          severity: SEVERITY.WARNING,
          code: 'natural-no-effect',
          message:
            `♮${t.pitch} ไม่มี #${t.pitch} หรือ b${t.pitch} มาก่อนในห้องนี้ — ` +
            `เครื่องหมาย ♮ ใช้ "ยกเลิก" #/b เท่านั้น (ไม่ใช่ "โน้ตขาว" แบบโน้ตห้าเส้น) ` +
            `ถ้าต้องการเสียงที่ต่างจากคีย์ ให้ใช้ b${t.pitch} (ต่ำลงครึ่งเสียง) หรือ #${t.pitch} (สูงขึ้นครึ่งเสียง)`,
        })
      }
      altered.delete(k) // the natural restores the plain degree for later notes
    }
  }
  return out
}

// Lint ONE bar. `noteString` is that bar's notes (no '|' — the caller splits bars,
// matching how the editor already stores segments per bar). Options: { timeSignature }.
// Returns [{ severity, code, message }], most structural problems first.
export function lintBar(noteString, { timeSignature } = {}) {
  const findings = []
  const tokens = parseNotes(noteString || '')

  const raw = tokens.filter((t) => t.type === 'raw')
  if (raw.length) {
    findings.push({
      severity: SEVERITY.ERROR,
      code: 'unreadable',
      message: `อ่านไม่ได้: ${raw.map((t) => t.text).join(' ')} — ตรวจตัวอักษรที่พิมพ์`,
    })
  }

  const exp = expectedBeats(timeSignature)
  const hasNotes = tokens.some((t) => t.type === 'note' || t.type === 'ext')
  if (exp != null && hasNotes && !raw.length) {
    const got = beatCount(tokens)
    if (Math.abs(got - exp) > 0.01) {
      findings.push({
        severity: SEVERITY.WARNING,
        code: 'beats',
        message: `จังหวะในห้องนี้ ${fmtBeats(got)}/${fmtBeats(exp)} — ไม่ครบตามอัตราจังหวะ ${timeSignature}`,
      })
    }
  }

  findings.push(...naturalMisuse(tokens))
  return findings
}

// Convenience: lint a note string that may contain '|' bar separators, returning
// findings tagged with a 0-based `bar` index. The editor stores bars separately and
// can call lintBar directly; this is for callers holding a raw line string.
export function lintLine(noteString, { timeSignature } = {}) {
  return String(noteString || '')
    .split('|')
    .flatMap((bar, bi) => lintBar(bar, { timeSignature }).map((f) => ({ ...f, bar: bi })))
}
