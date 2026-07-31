// ⛔ ชั่วคราว — เครื่องมืออัดไฟล์เสียงเทียบ "แบบเดิม vs ตามครู" สำหรับให้ครูวีรศักดิ์ฟัง (2026-07-30)
// ไม่ใช่ส่วนของแอป ไม่มี route ไม่มีลิงก์ · ลบทิ้งได้เมื่อจบการเทียบ
import { playableContent, songToMp3Blob } from './lib/audioExport.js'
import { buildPlayNotes, resolveSections } from './lib/midi.js'
import { presetCfg } from './lib/arranger/presets.js'
import { teacherCfg } from './lib/arranger/teacher.js'

const log = (m) => { document.getElementById('log').textContent = String(m); console.log('[bench]', m) }

// mode: 'baseline' = พรีเซ็ตเปียโนบรรเลงเดิม (ไม่แยกช่วงความเร็ว ไม่มีเส้นดัง-ค่อย)
//       'teacher'  = กฎครู + ไต่ไคลแมกซ์ด้วยความดัง (+10%)
//       'thick'    = กฎครู + ไต่ไคลแมกซ์ด้วย "ความหนา" แทนความดัง (+3%)
window.benchRender = async function benchRender(song, mode, filename, opt = {}) {
  const content = song.content
  const playable = playableContent(content)
  const notes = buildPlayNotes(playable)
  const sections = resolveSections(playable, notes)
  let cfg, info = null
  if (mode === 'baseline') {
    cfg = presetCfg('piano-arrangement')
  } else {
    const t = teacherCfg(content, notes, sections, {
      mode: mode === 'thick' ? 'thick' : 'loud',
      refrainDensity: opt.refrainDensity,
    })
    cfg = t.cfg
    info = {
      band: t.band.id, bandTh: t.band.label, bpmRange: t.band.th, mode: t.mode,
      refrainDensity: t.refrainDensity,
      pattern: cfg.pattern, refrainPattern: cfg.refrainPattern, bass: cfg.bass,
      plan: t.plan ? {
        source: t.plan.section.source, sectionName: t.plan.section.name,
        fromBeat: t.plan.section.fromBeat, toBeat: t.plan.section.toBeat, bars: t.plan.bars,
        buildFrom: t.plan.buildFrom, buildBars: t.plan.buildBars, climaxInRefrain: t.plan.climaxInRefrain,
        climaxBeat: t.plan.climaxBeat, climaxMidi: t.plan.climaxMidi, songTopMidi: t.plan.songTopMidi,
      } : null,
      hairpins: t.hairpins,
      sectionMap: cfg.dynamics.sectionMap,
    }
  }
  log(`render ${filename} · mode=${mode} · bpm=${content.bpm}`)
  const { blob, seconds } = await songToMp3Blob(content, {
    bpm: Number(content.bpm) || 92,
    transpose: 0,
    voices: 'both',
    arranger: true,
    arrangeCfg: cfg,
    instrument: 'grand',
    songId: song.id,
    kbps: 192,
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  await new Promise((r) => setTimeout(r, 400))
  URL.revokeObjectURL(url); a.remove()
  const out = {
    filename, mode, seconds, bytes: blob.size,
    sections: sections.map((s) => ({ name: s.name, isRefrain: s.isRefrain, fromBeat: s.fromBeat, toBeat: s.toBeat })),
    info,
  }
  log(`done ${filename} · ${blob.size} bytes · ${seconds.toFixed(1)}s`)
  return out
}
window.benchReady = true
log('พร้อม (benchRender)')
