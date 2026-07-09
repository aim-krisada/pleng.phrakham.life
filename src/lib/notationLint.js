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

// A human-readable label for a note token, e.g. "#3", "1'", ".5" — for messages.
function noteLabel(t) {
  return (t.accidental === 'n' ? '♮' : t.accidental || '') +
    '.'.repeat(t.low) + t.pitch + "'".repeat(t.high)
}

// R4 — เอื้อน (slur) must open and close inside ONE bar. The editor stores notes per
// bar, so a '(' with no matching ')' in this bar (or a ')' with no earlier '(') means
// the slur runs across a barline. In numbered notation a melisma sits within a bar,
// so an unbalanced slur is almost always a misplaced bracket or a wrong bar split.
function slurCrossesBar(tokens) {
  let depth = 0
  let orphanClose = false
  for (const t of tokens) {
    if (t.type === 'open' && t.group === 'slur') depth++
    else if (t.type === 'close' && t.group === 'slur') {
      if (depth > 0) depth--
      else orphanClose = true
    }
  }
  if (depth === 0 && !orphanClose) return []
  return [{
    severity: SEVERITY.WARNING,
    code: 'slur-crosses-bar',
    message:
      `เอื้อน (วงเล็บ ( ) ) เปิด-ปิดไม่ครบในห้องนี้ — ` +
      `เครื่องหมายเอื้อนต้องเปิด ( และปิด ) ในห้องเดียวกัน ` +
      `ถ้าเอื้อนลากข้ามห้อง แสดงว่าวางวงเล็บผิดหรือแบ่งห้องผิด`,
  }]
}

// R5 — a tie (~) holds the SAME sounding note longer. Tying two different degrees is
// not a tie; one syllable sung across two different pitches is a slur/เอื้อน ( ). The
// parser marks the note before '~' tieStart and the note after '~' tieEnd; pair each
// tie-start note with the next note and flag it when their degree differs. Octave
// counts (1~ ~1' is different sounds); accidental is ignored (a tie inherits it).
function tieCrossPitch(tokens) {
  const out = []
  const notes = tokens.filter((t) => t.type === 'note')
  for (let i = 0; i < notes.length - 1; i++) {
    const a = notes[i]
    const b = notes[i + 1]
    if (a.tieStart && b.tieEnd && degreeKey(a) !== degreeKey(b)) {
      out.push({
        severity: SEVERITY.WARNING,
        code: 'tie-cross-pitch',
        message:
          `ไท (~) เชื่อมโน้ตคนละเสียง (${noteLabel(a)} โยงหา ${noteLabel(b)}) — ` +
          `ไทใช้ต่อ "เสียงเดียวกัน" ให้ยาวขึ้นเท่านั้น ` +
          `ถ้าจะร้องเอื้อนจากเสียงหนึ่งไปอีกเสียง ให้ใช้วงเล็บเอื้อน ( )`,
      })
    }
  }
  return out
}

// R6 — a rest (0) has no pitch and no register, so an accidental (#/b/♮), an octave
// dot (high ' / low .), or an augmentation dot on it is meaningless. To make a rest
// longer, write more 0s or use '-'.
function restDecorated(tokens) {
  const out = []
  for (const t of tokens) {
    if (t.type !== 'note' || t.pitch !== '0') continue
    const bad = []
    if (t.accidental) bad.push(t.accidental === 'n' ? '♮' : t.accidental)
    if (t.high) bad.push('จุดเสียงสูง')
    if (t.low) bad.push('จุดเสียงต่ำ')
    if (t.dotted) bad.push('จุดเพิ่มค่า')
    if (!bad.length) continue
    out.push({
      severity: SEVERITY.WARNING,
      code: 'rest-decorated',
      message:
        `ตัวหยุด (0) มี ${bad.join(' + ')} — ตัวหยุดไม่มีระดับเสียง ` +
        `จึงติด #/b/♮ หรือจุดสูง-ต่ำ/จุดเพิ่มค่าไม่ได้ ` +
        `ถ้าต้องการหยุดยาวขึ้น ให้ใช้ 0 หลายตัวหรือ -`,
    })
  }
  return out
}

// R7 — between degrees 3-4 and 7-1 there is only a semitone (mi–fa, ti–do), so #3,
// b4, #7, b1 point at a note that is really a plain neighbouring degree. Flag them and
// name the degree the writer almost certainly meant. (Octave-independent — any octave
// of #3 is still 4.)
const ENHARMONIC_GHOST = {
  '#3': '4 (ฟา)',
  'b4': '3 (มี)',
  '#7': '1 (โด กลุ่มเสียงถัดขึ้นไป)',
  'b1': '7 (ที กลุ่มเสียงก่อนหน้า)',
}
function ghostAccidental(tokens) {
  const out = []
  for (const t of tokens) {
    if (t.type !== 'note') continue
    if (t.accidental !== '#' && t.accidental !== 'b') continue
    const eq = ENHARMONIC_GHOST[t.accidental + t.pitch]
    if (!eq) continue
    out.push({
      severity: SEVERITY.WARNING,
      code: 'accidental-not-in-scale',
      message:
        `${t.accidental}${t.pitch} ไม่มีจริงในสเกล — ขั้น 3-4 และ 7-1 ห่างกันแค่ครึ่งเสียง ` +
        `เสียงนี้จริง ๆ คือ ${eq} ให้เขียน ${eq.split(' ')[0]} แทน`,
    })
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

  findings.push(...slurCrossesBar(tokens)) // R4

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

  findings.push(...naturalMisuse(tokens)) // R1
  findings.push(...tieCrossPitch(tokens)) // R5
  findings.push(...restDecorated(tokens)) // R6
  findings.push(...ghostAccidental(tokens)) // R7
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
