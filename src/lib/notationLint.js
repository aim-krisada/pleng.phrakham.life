// Notation lint — pure, UI-agnostic checks for movable-do numbered notation.
// One rule source shared by the Studio editor (current + the redesign): each rule
// is a fact about the notation SYSTEM, not a musical judgement. It flags misused
// symbols and structural problems; it never guesses whether a pitch is the "right"
// melody note — that still needs the ear.

import { parseNotes, beatCount, expectedBeats, canonicalizeNote, degreeKey } from './notation.js'

export const SEVERITY = { ERROR: 'error', WARNING: 'warning', HINT: 'hint' }

function fmtBeats(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// degreeKey (pitch + octave — "the same note") now lives in notation.js, so the lint's rule
// and playback's accidental scope (G20) are one definition, not two that can drift.

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

// R8 — repeat marks must pair up. In this model repeats are FLAT (sequential), not
// nested: a section opens at '‖:' and closes at the next ':‖'. So the marks must
// alternate start→end→start→end. Two '‖:' with no ':‖' between them means the first
// section was never closed; a ':‖' with no open '‖:' is a stray close. `marks` is the
// song/line's ordered marker items ({type:'repeat-start'|'repeat-end'|'volta',num});
// non-marker items are ignored so a whole line's item list can be passed straight in.
function repeatBalance(marks) {
  const out = []
  let open = false
  let unclosed = false // a '‖:' left without its ':‖' (double-open or trailing-open)
  let orphanEnd = false // a ':‖' with no open '‖:' before it
  for (const m of marks) {
    if (m.type === 'repeat-start') {
      if (open) unclosed = true // previous '‖:' never got its ':‖'
      open = true
    } else if (m.type === 'repeat-end') {
      if (open) open = false
      else orphanEnd = true
    }
  }
  if (unclosed || open) {
    out.push({
      severity: SEVERITY.WARNING,
      code: 'repeat-unbalanced',
      message:
        `‖: (เปิดเล่นซ้ำ) ไม่มี :‖ (ปิด) ปิดท้ายให้ครบคู่ — ` +
        `เครื่องหมายเล่นซ้ำต้องเปิด ‖: แล้วปิด :‖ เป็นคู่ ` +
        `เพิ่ม :‖ ตรงจุดจบของส่วนที่ให้เล่นซ้ำ`,
    })
  }
  if (orphanEnd) {
    out.push({
      severity: SEVERITY.WARNING,
      code: 'repeat-unbalanced',
      message:
        `:‖ (ปิดเล่นซ้ำ) ไม่มี ‖: (เปิด) มาก่อน — ` +
        `เครื่องหมายเล่นซ้ำต้องเปิด ‖: ก่อนแล้วจึงปิด :‖ ` +
        `เพิ่ม ‖: ตรงจุดเริ่มเล่นซ้ำ หรือลบ :‖ ที่เกินออก`,
    })
  }
  return out
}

// R9 — volta ("จบรอบ N") endings must be a complete, ordered set. A repeat with
// alternate endings needs at least จบรอบ 1 AND จบรอบ 2; they must appear in ascending
// order (1 before 2) with no repeated number. A lone จบรอบ 1 (missing รอบ 2), a จบรอบ 2
// with no รอบ 1, จบรอบ 2 written before จบรอบ 1, or the same round twice are all flagged.
function voltaConsistency(marks) {
  const nums = marks.filter((m) => m.type === 'volta').map((m) => Number(m.num))
  if (!nums.length) return []
  const out = []
  const seen = new Set()
  let duplicate = false
  let outOfOrder = false
  let prev = 0
  for (const n of nums) {
    if (seen.has(n)) duplicate = true
    if (n < prev) outOfOrder = true
    seen.add(n)
    prev = n
  }
  const max = Math.max(...nums)
  const missing = []
  for (let r = 1; r <= Math.max(max, 2); r++) if (!seen.has(r)) missing.push(r)
  if (missing.length) {
    out.push({
      severity: SEVERITY.WARNING,
      code: 'volta-incomplete',
      message:
        `volta (จบรอบ) ไม่ครบ — ขาด ${missing.map((r) => `จบรอบ ${r}`).join(' และ ')} · ` +
        `การเล่นซ้ำที่มีจบต่างกันต้องมีครบอย่างน้อยจบรอบ 1 และ จบรอบ 2`,
    })
  }
  if (duplicate || outOfOrder) {
    out.push({
      severity: SEVERITY.WARNING,
      code: 'volta-order',
      message:
        `ลำดับ volta (จบรอบ) ผิด — จบรอบต้องเรียง 1 ก่อน 2 ` +
        `และห้ามใช้เลขรอบเดิมซ้ำ`,
    })
  }
  return out
}

// Lint a song/line's repeat & volta structure. `marks` is the ordered list of that
// line (or whole song's) items; only repeat/volta markers are inspected, so callers can
// hand it the same item list SongSheet/midi already walk. Returns [{ severity, code,
// message }]. This is a STRUCTURE-level check — repeat/volta marks live between bars,
// not inside a note string — so it sits beside lintBar (R1-R7) rather than within it.
export function lintRepeatVolta(marks) {
  const list = Array.isArray(marks) ? marks.filter((m) => m && typeof m.type === 'string') : []
  return [...repeatBalance(list), ...voltaConsistency(list)] // R8, R9
}

// R10 — a note whose modifiers were written out of canonical order. Since G1 the
// parser accepts any order, so this no longer breaks the sheet — but stored data is
// NOT rewritten behind anyone's back. The bar reports what is stored and how it is
// being read, and a person decides: four of the seven broken spots in the library
// need the printed original opened before anyone can say what was meant (e.g. three
// '^' in a row on beamed notes in #760 may not be fermatas at all). Silently
// tidying the string would erase that question forever.
function modifierOrder(noteString) {
  return String(noteString || '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((box) => canonicalizeNote(box) !== box)
    .map((box) => ({
      severity: SEVERITY.WARNING,
      code: 'modifier-order',
      message:
        `${box} เขียนสลับลำดับ — ระบบอ่านให้เป็น ${canonicalizeNote(box)} ` +
        `(ลำดับมาตรฐาน: ~ #b ♮ · จุดล่าง · เลข · จุดบน · ขีดเขบ็ต · จุดเพิ่มค่า · ~ · ^) ` +
        `ตัวโน้ตเท่าเดิม สลับที่เท่านั้น · ถ้าไม่ตรงกับที่ตั้งใจ ให้เทียบกับหนังสือต้นฉบับก่อนแก้`,
      box,
      suggestion: canonicalizeNote(box),
    }))
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
  findings.push(...modifierOrder(noteString)) // R10

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
