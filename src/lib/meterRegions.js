// ใบ v3/pleng#96 — where in a PLAYED note list a melody with its own meter (stanzas[].timeSignature,
// stamped on notes as `ts` by songToNotes) sounds, and where ITS bars start.
//
// A region = one contiguous run of notes carrying the same `ts`. Notes with no `ts` belong to no
// region: they keep the song meter and the song's beat-0 bar counting exactly as before, so a song
// with no melody meter gets [] and every caller takes its old path untouched.
//
// `downbeat` = the beat where a FULL bar of that meter starts — the first bar in the run whose notes
// add up to exactly one bar. That skips a pickup (ห้องยก, shorter), and a bar cut short by a seek /
// resume into the middle of the run, so beat 1 lands on the real downbeat either way.
// `origin(r, barLen)` = that downbeat moved back by whole bars to at/before the region start, so
// (beat - origin) is never negative inside the region (patterns.js takes a plain `%`) and its phase
// mod barLen is the downbeat's. barLen is the CALLER's bar length (the arranger counts its own way).
import { expectedBeats } from './notation.js'

export function meterRegions(notes) {
  const out = []
  let beat = 0
  for (const n of notes || []) {
    if (n.ts) {
      let r = out[out.length - 1]
      if (!r || r.ts !== n.ts || r.to < beat - 1e-6) {
        r = { ts: n.ts, from: beat, to: beat, bars: [] }
        out.push(r)
      }
      const key = `${n.li}:${n.bi}`
      const bar = r.bars[r.bars.length - 1]
      if (!bar || bar.key !== key) r.bars.push({ key, start: beat, beats: n.beats })
      else bar.beats += n.beats
      r.to = beat + n.beats
    }
    beat += n.beats
  }
  for (const r of out) {
    const L = expectedBeats(r.ts) || 4 // one bar, in the note list's quarter-beat units
    const full = r.bars.find((b) => Math.abs(b.beats - L) < 1e-6)
    r.downbeat = full ? full.start : r.from
    r.barBeats = L
    delete r.bars
  }
  return out
}

export function origin(r, barLen) {
  if (!(barLen > 0)) return r.from
  return r.downbeat - Math.ceil((r.downbeat - r.from) / barLen - 1e-9) * barLen
}

// the region a beat falls in, or null (= song meter)
export function regionAt(regions, beat) {
  return (regions || []).find((r) => beat >= r.from - 1e-6 && beat < r.to - 1e-6) || null
}
