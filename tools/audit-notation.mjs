// DoD ชั้น 2ข (issue8/issues5) — a re-runnable QA audit of the beaming + slur rules across
// EVERY published song. It reads the live Supabase `songs` table (public read key — the same
// one the app ships, read-only), runs the SAME pure functions the renderer uses
// (beamGroups / slurSpans — no duplicated logic), and writes a one-page-per-song markdown
// report so พี่เปา can eyeball each beat's beam decision against the reference book.
//
//   run:  node tools/audit-notation.mjs
//   out:  docs/reports/notation-audit.md
//
// It never writes to the DB and needs no auth beyond the public key.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { beamGroups, slurSpans, noteBoxKinds } from '../src/lib/notation.js'
import { resolveContent } from '../src/lib/songModel.js'

const SUPABASE_URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../docs/reports/notation-audit.md')

// A note token's syllable slot (running note+ext index) — matches beamGroups / syllableSlots.
function annotateSegment(note, syllables) {
  const { groups } = beamGroups(note, syllables)
  const beamedIdx = new Set()
  for (const g of groups) for (const t of g.tokens) if (t.beamed) beamedIdx.add(t.idx)
  const notes = []
  let slot = -1
  for (const g of groups) {
    for (const t of g.tokens) {
      if (t.type === 'note' || t.type === 'ext') slot++
      if (t.type !== 'note') continue
      const word = Array.isArray(syllables) ? (syllables[slot] || '') : ''
      const beamable = t.underlines > 0 && t.pitch !== '0' && g.group !== 'triplet'
      notes.push({
        idx: t.idx,
        glyph: noteGlyph(t),
        word: word.trim(),
        beamable,
        kind: Array.isArray(syllables) ? (word.trim() ? 'NEW' : 'เอื้อน') : '?',
        beamed: beamedIdx.has(t.idx),
      })
    }
  }
  return notes
}

// A readable glyph for one note token (octave dots + digit + underlines) for the report.
function noteGlyph(t) {
  return (t.accidental || '') + '.'.repeat(t.low) + t.pitch + "'".repeat(t.high) + '_'.repeat(t.underlines) + '.'.repeat(t.dots)
}

// beat-only beams (syllables=null) vs syllable-aware beams → how many joins the WORD rule cut.
function beamCutsInSegment(note, syllables) {
  if (!Array.isArray(syllables)) return 0
  const key = (bs) => bs.map((b) => `${b.start}-${b.end}`).join('|')
  const beat = beamGroups(note, null).beams
  const syl = beamGroups(note, syllables).beams
  // count note-pairs joined by beat-only but NOT by the syllable rule
  const inSyl = new Set()
  for (const b of syl) for (let i = b.start; i < b.end; i++) inSyl.add(i)
  let cuts = 0
  for (const b of beat) for (let i = b.start; i < b.end; i++) if (!inSyl.has(i)) cuts++
  return key(beat) === key(syl) ? 0 : cuts
}

// A genuinely-missing lyric = a box that STARTS a syllable ('attack' per noteBoxKinds) whose
// aligned syllable slot is blank. noteBoxKinds (minus struct) aligns 1:1 with the syllables
// array, so a blank attack is a real "word not filled in" signal — held/เอื้อน blanks (which
// are meant to be empty) are never counted.
function blankAttacks(note, syllables) {
  if (!Array.isArray(syllables)) return 0
  const kinds = noteBoxKinds(note).filter((k) => k !== 'struct')
  let n = 0
  kinds.forEach((k, i) => { if (k === 'attack' && !((syllables[i] || '').trim())) n++ })
  return n
}

// Ordered segment note-strings of one display line (index = si), for slurSpans.
function lineNotes(line) {
  const notes = []
  let si = -1
  for (const item of line) {
    if (item.type === 'segment') { si++; notes[si] = item.note || '' }
  }
  return notes
}

async function main() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data, error } = await sb
    .from('songs')
    .select('number, title_th, content, verified')
    .order('number', { ascending: true })
  if (error) { console.error('Supabase read failed:', error.message); process.exitCode = 1; return }

  const songs = (data || []).filter((s) => s.content)
  let totalBeamCuts = 0
  let totalCrossSlur = 0
  const warnSongs = []
  const bodies = []

  for (const song of songs) {
    const c = song.content
    const key = c.key || '?'
    const ts = c.timeSignature || '?'
    let lines
    try { lines = resolveContent(c) } catch (e) { lines = c.lines || [] }
    const rowOut = []
    let songBeamCuts = 0
    let songBlankAttacks = 0

    lines.forEach((line, li) => {
      // per-line bar counter (increments on a bar marker)
      let bar = 1
      const items = Array.isArray(line) ? line : []
      for (const item of items) {
        if (item.type === 'bar') { bar++; continue }
        if (item.type !== 'segment') continue
        songBlankAttacks += blankAttacks(item.note || '', item.syllables)
        const notes = annotateSegment(item.note || '', item.syllables)
        const beamable = notes.filter((n) => n.beamable)
        if (!beamable.length) continue
        songBeamCuts += beamCutsInSegment(item.note || '', item.syllables)
        const desc = beamable
          .map((n) => `${n.glyph}(${n.word || ' '})=${n.kind}${n.beamed ? '' : ' •'}`)
          .join('  ')
        const anyBeam = beamable.some((n) => n.beamed)
        rowOut.push(`- L${li + 1} ห้อง${bar}:  ${desc}   → ${anyBeam ? 'เชื่อมเส้น (beam)' : 'แยกเส้น'}`)
      }
      // cross-segment slurs on this line
      const spans = slurSpans(lineNotes(line)).filter((s) => !s.sameSegment)
      for (const s of spans) {
        totalCrossSlur++
        rowOut.push(`- ⚑ slur ข้ามห้อง: L${li + 1} seg${s.open.si}[#${s.open.idx}] → L${li + 1} seg${s.close.si}[#${s.close.idx}]`)
      }
    })

    totalBeamCuts += songBeamCuts
    if (songBlankAttacks > 0) warnSongs.push(`#${song.number} ${song.title_th || ''} (${songBlankAttacks} จุด)`)
    const head = `## #${song.number ?? '?'} ${song.title_th || '(ไม่มีชื่อ)'}   (key ${key} · ${ts})${song.verified ? '' : '  — ยังไม่อนุมัติ'}`
    bodies.push(head + '\n' + (rowOut.length ? rowOut.join('\n') : '- (ไม่มีโน้ตเขบ็ต/slur ข้ามห้อง)') + '\n')
  }

  const summary = [
    '# notation audit — beaming (issue8) + slur ข้ามห้อง (issues5)',
    '',
    'สร้างโดย `node tools/audit-notation.mjs` — อ่านทุกเพลงจาก Supabase (read-only) แล้ววิเคราะห์ด้วยฟังก์ชันชุดเดียวกับที่หน้าเว็บใช้วาด (`beamGroups` / `slurSpans`). รันซ้ำได้ทุกเมื่อ.',
    '',
    '## สรุป',
    `- เพลงทั้งหมด: **${songs.length}**`,
    `- จุดที่กฎ "ตามพยางค์" ตัดเส้นที่กฎ "ตามจังหวะ" เคยเชื่อม (beam-cut): **${totalBeamCuts}**`,
    `- slur ข้ามห้อง/ข้ามกล่อง: **${totalCrossSlur}**`,
    `- ⚠️ เพลงที่มีโน้ตขึ้นวลีแต่ไม่มีคำ (อาจกรอกเนื้อไม่ครบ): **${warnSongs.length}**`,
    warnSongs.length ? warnSongs.map((w) => `  - ${w}`).join('\n') : '',
    '',
    'สัญลักษณ์: `NEW` = โน้ตขึ้นคำใหม่ (ตัดเส้น) · `เอื้อน` = ช่องคำว่าง (ต่อเส้น) · `•` = โน้ตเขบ็ตที่ยืนเดี่ยว (ไม่อยู่ใน beam).',
    '',
    '---',
    '',
  ].join('\n')

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, summary + bodies.join('\n'), 'utf8')
  console.log(`wrote ${OUT}`)
  console.log(`songs=${songs.length} beamCuts=${totalBeamCuts} crossSlur=${totalCrossSlur} warn=${warnSongs.length}`)
}

main().catch((e) => { console.error(e); process.exitCode = 1 })
