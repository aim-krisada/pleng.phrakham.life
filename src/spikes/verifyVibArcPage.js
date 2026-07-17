// Dev-only controller for verify-vib-arc.html. Each `__run.*` returns a plain object so it can be
// read straight out of the console/automation. Results also land in window.__R.
import { renderClip, measure } from './celloBakeoff.js'
import { bandRms, spreadDb, maxAbsDiff, loadSong, songCtx, envelopeDb } from './verifyVibArc.js'

const out = (o) => { document.getElementById('out').textContent = JSON.stringify(o, null, 1); return o }
const r2 = (x) => Math.round(x * 100) / 100

let SONG = null, CTX = null
async function ready() {
  if (!SONG) { SONG = await loadSong(1); CTX = songCtx(SONG) }
  return { SONG, CTX }
}

// Render the cello BODY alone (no piano, no head, no normalize) so vibrato is the only variable.
async function body(vibratoCents, extra = {}) {
  await ready()
  const { buffer, celloReport } = await renderClip(SONG.content, {
    ...CTX, variantId: 'karoryfer-p', pianoRoles: 'none', celloMakeup: 1,
    headId: null, bodyShiftMs: 10, vibratoCents, ...extra,
  })
  return { buffer, celloReport }
}

// ── 5.2 (ก) "vibrato ทำให้เสียงดังขึ้น" ────────────────────────────────────────────────────────
// THEORY FIRST: vibrato modulates PITCH only, so total energy should be conserved.
//   predict |ΔRMS| < 0.3 dB.  If it measures > ~1 dB, that is an implementation BUG, not psychoacoustics.
// Also measures the >2 kHz band, because a pitch sweep across a resonance CAN move brightness even
// with RMS unchanged — and brightness is the axis "แสบ" lives on.
window.__R = {}
window.__run = {
  async rms() {
    const a = await body(0)
    const b = await body(22)
    const mA = measure(a.buffer), mB = measure(b.buffer)
    const hfA = await bandRms(a.buffer), hfB = await bandRms(b.buffer)
    const res = {
      check: '5.2ก — vibrato ทำให้ดังขึ้นจริงไหม (เชลโลล้วน ไม่มีเปียโน/หัวโน้ต ไม่ normalize)',
      predict: '|ΔRMS| < 0.3 dB (pitch modulation = energy conserved)',
      depth0: { rmsDb: r2(mA.rmsDb), peakDb: r2(mA.peakDb), hf2kDb: r2(20 * Math.log10(hfA)) },
      depth22: { rmsDb: r2(mB.rmsDb), peakDb: r2(mB.peakDb), hf2kDb: r2(20 * Math.log10(hfB)) },
      dRmsDb: r2(mB.rmsDb - mA.rmsDb),
      dPeakDb: r2(mB.peakDb - mA.peakDb),
      dHf2kDb: r2(20 * Math.log10(hfB / hfA)),
      notes: a.celloReport?.melodyNotes,
    }
    res.verdict = Math.abs(res.dRmsDb) > 1 ? 'BUG — ดังขึ้นเกินทฤษฎี'
      : Math.abs(res.dRmsDb) < 0.3 ? 'ตรงทฤษฎี — RMS ไม่ขึ้น → "ดังขึ้น" ไม่ได้มาจากพลังงาน'
        : 'ก้ำกึ่ง — ต้องดูต่อ'
    window.__R.rms = res
    return out(res)
  },

  // the clip P'Aim actually hears (piano + head 5% + body p), still un-normalized, so the
  // cello-vs-piano BALANCE shift shows up rather than being hidden by the -24 dB normalize.
  async mix() {
    await ready()
    const one = async (vibratoCents) => {
      const { buffer } = await renderClip(SONG.content, {
        ...CTX, variantId: 'marcato-mp', headId: 'staccato-mp', headStrength: 0.05,
        bodyShiftMs: 10, vibratoCents, celloMakeup: 1.3,
      })
      return { m: measure(buffer), hf: await bandRms(buffer) }
    }
    const a = await one(0), b = await one(22)
    const res = {
      check: '5.2ก — คลิปเต็ม (เปียโน+หัว 5%+ตัว p) ก่อน normalize',
      depth0: { rmsDb: r2(a.m.rmsDb), peakDb: r2(a.m.peakDb), hf2kDb: r2(20 * Math.log10(a.hf)) },
      depth22: { rmsDb: r2(b.m.rmsDb), peakDb: r2(b.m.peakDb), hf2kDb: r2(20 * Math.log10(b.hf)) },
      dRmsDb: r2(b.m.rmsDb - a.m.rmsDb),
      dHf2kDb: r2(20 * Math.log10(b.hf / a.hf)),
    }
    window.__R.mix = res
    return out(res)
  },
}
document.getElementById('out').textContent = 'พร้อม — เรียก await __run.rms()'
