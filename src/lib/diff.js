// Human-readable summary of what changed between two song rows (from song_revisions).

export function diffSongRows(oldRow, newRow) {
  if (!oldRow && newRow) return ['สร้างเพลง']
  if (oldRow && !newRow) return ['ลบเพลง']
  const out = []
  if (oldRow.title_th !== newRow.title_th) out.push(`ชื่อ: "${oldRow.title_th}" → "${newRow.title_th}"`)
  if (oldRow.number !== newRow.number) out.push(`เลขเพลง: ${oldRow.number ?? '—'} → ${newRow.number ?? '—'}`)
  const a = oldRow.content ?? {}
  const b = newRow.content ?? {}
  if (a.key !== b.key) out.push(`คีย์: ${a.key} → ${b.key}`)
  if (a.timeSignature !== b.timeSignature) out.push(`จังหวะ: ${a.timeSignature} → ${b.timeSignature}`)
  if ((a.bpm ?? null) !== (b.bpm ?? null)) out.push(`BPM: ${a.bpm ?? '—'} → ${b.bpm ?? '—'}`)
  const la = a.lines ?? []
  const lb = b.lines ?? []
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    const sa = JSON.stringify(la[i] ?? null)
    const sb = JSON.stringify(lb[i] ?? null)
    if (sa === sb) continue
    if (la[i] == null) out.push(`เพิ่มบรรทัด ${i + 1}`)
    else if (lb[i] == null) out.push(`ลบบรรทัด ${i + 1}`)
    else out.push(`แก้บรรทัด ${i + 1}: ${segmentDiff(la[i], lb[i])}`)
  }
  return out.length ? out : ['(ไม่มีการเปลี่ยนแปลง)']
}

function segmentDiff(lineA, lineB) {
  const segsA = lineA.filter((x) => x.type === 'segment')
  const segsB = lineB.filter((x) => x.type === 'segment')
  const changes = []
  for (let i = 0; i < Math.max(segsA.length, segsB.length); i++) {
    const s1 = segsA[i]
    const s2 = segsB[i]
    if (!s1 || !s2) { changes.push('เพิ่ม/ลดช่อง'); continue }
    if (s1.chord !== s2.chord) changes.push(`คอร์ด ${s1.chord || '—'}→${s2.chord || '—'}`)
    if (s1.note !== s2.note) changes.push(`โน้ต "${s1.note}"→"${s2.note}"`)
    if (s1.lyric !== s2.lyric) changes.push(`เนื้อ "${s1.lyric}"→"${s2.lyric}"`)
  }
  return changes.slice(0, 4).join(' · ') + (changes.length > 4 ? ` (+อีก ${changes.length - 4})` : '')
}
