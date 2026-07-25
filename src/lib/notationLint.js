// Notation lint — pure, UI-agnostic checks for movable-do numbered notation.
// One rule source shared by the Studio editor (current + the redesign): each rule
// is a fact about the notation SYSTEM, not a musical judgement. It flags misused
// symbols and structural problems; it never guesses whether a pitch is the "right"
// melody note — that still needs the ear.

import { parseNotes, beatCount, expectedBeats, canonicalizeNote, degreeKey } from './notation.js'
import { findOrphanJumps } from './songFlow.js'

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
  // An ending that spans several bars carries the mark on EVERY one of its bars (that is how
  // playback knows the whole run belongs to that pass), so consecutive identical numbers are
  // ONE ending, not the same round written twice — collapse the run before judging order.
  const nums = marks
    .filter((m) => m.type === 'volta')
    .map((m) => Number(m.num))
    .filter((n, i, a) => n !== a[i - 1])
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

// Thai messages for an orphan jump command (a repeat directive whose target marker is missing).
// The resolver already fails SAFE on these (plays as written, never guesses — songModel), so this
// only NAMES the offender for the author. (findOrphanJumps → 'ds-orphan' | 'tocoda-orphan'.)
const ORPHAN_JUMP_MSG = {
  'ds-orphan': 'มี D.S. (ย้อนไปเครื่องหมายวน) แต่ไม่พบเครื่องหมายวน 𝄋 — เพิ่ม Segno ที่จุดย้อน หรือลบ D.S.',
  'tocoda-orphan': 'มี “ไปโคดา” แต่ไม่พบโคดา 𝄌 — เพิ่ม Coda ที่ท่อนปิด หรือลบจุดไปโคดา',
}

// Lint a WHOLE v2 song (content.stanzas) and return findings the inline editor can show at the
// spot they occur — the content-level counterpart of lintBar/lintLine (which take a note string).
// Each stanza line's segments are grouped into bars the way the sheet + serializer do — a new bar
// starts at a {type:'bar'} OR a {type:'repeat-start'} item (serializeLine emits repeat-start IN
// PLACE OF a bar separator) — then lintBar runs per bar and lintRepeatVolta over the line's items.
// Orphan repeat directives (D.S. with no Segno, To-Coda with no Coda) are surfaced song-wide.
//
// Returns { findings, count, codes }:
//   findings — [{ stanzaId, lineIndex, barIndex?, ...lintFinding }] (barIndex on per-bar findings;
//              song-level orphans carry neither line nor bar). The location lets the UI anchor the
//              warning; the fields (severity, code, message) are lintBar/lintRepeatVolta verbatim.
//   count/codes — the non-HINT tally + distinct rule codes, the same publish-gate shape
//              EditorMode.lintSong produced, so both editors can read ONE lint pass (no drift).
// Non-v2 content (no stanzas) → an empty result.
export function lintContent(content, { timeSignature } = {}) {
  const ts = timeSignature ?? content?.timeSignature
  const exp = expectedBeats(ts)
  const findings = []
  // reading-order list of every bar, with the flags the beat check needs. A bar starts at a
  // {type:'bar'} OR {type:'repeat-start'} item; a {type:'pickup'} in the bar marks it a pickup
  // (anacrusis / ห้องต่อกัน); a line carrying {type:'continue'} joins its FIRST bar to the previous
  // line's last bar (barStatus's cross-line join). `contHead` tags that first bar.
  const bars = []
  for (const stanza of content?.stanzas || []) {
    const lines = Array.isArray(stanza?.lines) ? stanza.lines : []
    lines.forEach((line, lineIndex) => {
      const items = Array.isArray(line) ? line : []
      const isCont = items.some((it) => it?.type === 'continue')
      let barIndex = 0, notes = [], pickup = false, opened = false
      const lineBars = []
      const flush = () => {
        lineBars.push({ stanzaId: stanza.id, lineIndex, barIndex, noteStr: notes.join(' ').trim(), pickup })
        notes = []; pickup = false; barIndex++
      }
      for (const it of items) {
        if (!it || !it.type) continue
        if (it.type === 'segment') { notes.push(it.note || ''); opened = true }
        else if (it.type === 'pickup') { pickup = true; opened = true }
        else if (it.type === 'bar' || it.type === 'repeat-start') { if (opened) flush(); opened = true }
      }
      if (opened) flush()
      if (isCont && lineBars.length) lineBars[0].contHead = true
      bars.push(...lineBars)
      for (const f of lintRepeatVolta(items)) findings.push({ stanzaId: stanza.id, lineIndex, ...f })
    })
  }
  // every per-bar rule EXCEPT beats (beats is computed below WITH pickup/continuation grouping, so
  // a valid anacrusis or a bar split across a line break is never wrongly flagged "จังหวะไม่ครบ").
  for (const b of bars) {
    if (!b.noteStr) continue
    for (const f of lintBar(b.noteStr, { timeSignature: ts })) {
      if (f.code === 'beats') continue
      findings.push({ stanzaId: b.stanzaId, lineIndex: b.lineIndex, barIndex: b.barIndex, ...f })
    }
  }
  // ---- beats, grouped exactly like EditorMode.barStatus / pickupCheck ----
  if (exp != null) {
    const beatsOf = (b) => beatCount(parseNotes(b.noteStr || ''))
    const whole = (sum) => sum > 0.01 && Math.abs(sum / exp - Math.round(sum / exp)) < 0.01
    const flagBeats = (b, got) => findings.push({
      stanzaId: b.stanzaId, lineIndex: b.lineIndex, barIndex: b.barIndex,
      severity: SEVERITY.WARNING, code: 'beats',
      message: `จังหวะในห้องนี้ ${fmtBeats(got)}/${fmtBeats(exp)} — ไม่ครบตามอัตราจังหวะ ${ts}`,
    })
    const consumed = new Set()
    // (a) continuation join — a contHead bar completes with the previous bar; check the pair's sum
    for (let i = 1; i < bars.length; i++) {
      if (!bars[i].contHead) continue
      const grp = [bars[i - 1], bars[i]]
      grp.forEach((b) => consumed.add(b))
      const sum = grp.reduce((a, b) => a + beatsOf(b), 0)
      if (!whole(sum)) findings.push({
        stanzaId: bars[i].stanzaId, lineIndex: bars[i].lineIndex, barIndex: bars[i].barIndex,
        severity: SEVERITY.WARNING, code: 'beats',
        message: `จังหวะห้องต่อกัน ${fmtBeats(sum)} — ไม่ครบตามอัตราจังหวะ ${ts}`,
      })
    }
    // (b) pickup groups — a RUN of ≥2 adjacent pickup bars sums to whole bars; the remaining
    //     isolated pickups (a stanza-opening anacrusis + its short final partner) sum together.
    const isolated = []
    for (let i = 0; i < bars.length; ) {
      if (!bars[i].pickup || consumed.has(bars[i])) { i++; continue }
      let j = i
      while (j < bars.length && bars[j].pickup && !consumed.has(bars[j])) j++
      const run = bars.slice(i, j)
      if (run.length >= 2) {
        run.forEach((b) => consumed.add(b))
        const sum = run.reduce((a, b) => a + beatsOf(b), 0)
        if (!whole(sum)) flagBeats(run[run.length - 1], sum)
      } else { isolated.push(run[0]); consumed.add(run[0]) }
      i = j
    }
    if (isolated.length) {
      const sum = isolated.reduce((a, b) => a + beatsOf(b), 0)
      if (!whole(sum)) for (const b of isolated) flagBeats(b, beatsOf(b))
    }
    // (c) every other bar — a plain, self-contained bar must fill the meter on its own
    for (const b of bars) {
      if (consumed.has(b) || !b.noteStr) continue
      const toks = parseNotes(b.noteStr)
      if (toks.some((t) => t.type === 'raw')) continue // 'unreadable' already reported by lintBar
      if (!toks.some((t) => t.type === 'note' || t.type === 'ext')) continue // no notes → nothing to count
      const got = beatCount(toks)
      if (Math.abs(got - exp) > 0.01) flagBeats(b, got)
    }
  }
  // song-wide: a repeat directive whose target marker was never placed (broken routing)
  for (const o of findOrphanJumps(content)) {
    findings.push({
      severity: SEVERITY.WARNING,
      code: o.kind, // 'ds-orphan' | 'tocoda-orphan'
      message: ORPHAN_JUMP_MSG[o.kind] || 'จุดวนร้องไม่ครบ — ยังไม่ได้วางเครื่องหมายปลายทาง',
    })
  }
  const nonHint = findings.filter((f) => f.severity !== SEVERITY.HINT)
  return { findings, count: nonHint.length, codes: [...new Set(nonHint.map((f) => f.code))] }
}
