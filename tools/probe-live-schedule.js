/* ใบ #12 — วัด "ระยะเผื่อ" ของการนัดโน้ตตอนเล่นสด (ทำไมอาการมา ๆ หาย ๆ)
 *
 * ทำไมต้องวัด: เสียงเปียโนจริง (sampler · smplr) ⛔ ไม่ได้นัดโน้ตทั้งเพลงล่วงหน้า
 * มันนัดทีละนิดผ่านตัวจับเวลาบนสายหลัก (lookahead ~200ms) ⇒ ถ้าสายหลักติดพันนานกว่าระยะเผื่อ
 * โน้ตจะถูกสั่งช้ากว่าเวลาที่ควรดัง = จังหวะสะดุด · ส่วนเสียงสังเคราะห์ (synth) นัดครบตั้งแต่แรก
 * ⇒ ไม่สะดุด · และไฟล์ MP3 ก็ไม่สะดุด (sampler.js ใส่ lookahead ยักษ์ให้ตอนเรนเดอร์ออฟไลน์)
 *
 * วิธีใช้ — เปิดเว็บ (npm run dev) ไปหน้าเพลง แล้ววางไฟล์นี้ทั้งไฟล์ลง console:
 *   1) วาง → ได้ตัวเฝ้า `__probe`
 *   2) กดปุ่มฟังบนหน้าจอ ปล่อยให้เล่นสัก 60 วินาที
 *   3) พิมพ์ `__probe.report()` ⇒ ได้ระยะเผื่อ (lead) เป็นมิลลิวินาที
 *      lead เป็นบวก = นัดล่วงหน้าได้ทัน · lead ติดลบ = โน้ตนั้น "สายไปแล้ว" ตอนถูกสั่ง = หูได้ยินว่าเพี้ยน
 *   4) อยากพิสูจน์กลไก: `__probe.stall(1500)` ระหว่างเพลงกำลังเล่น แล้วดู report ซ้ำ
 *
 * ⛔ ตัวเฝ้านี้ไม่แก้อะไร — อ่านอย่างเดียว · `__probe.stop()` เพื่อถอนคืน
 */
;(() => {
  if (window.__probe) return console.log('มีตัวเฝ้าอยู่แล้ว — ใช้ __probe.report()')
  const starts = []
  const origBuf = AudioBufferSourceNode.prototype.start
  const origOsc = OscillatorNode.prototype.start
  const hook = (proto, orig, kind) => {
    proto.start = function (when, ...rest) {
      try {
        const c = this.context
        // เฉพาะบริบทเวลาจริง — OfflineAudioContext (ไฟล์ MP3) ไม่เกี่ยว
        // ⛔ ข้าม start(0)/start() = "ดังเดี๋ยวนี้" (เช่นบัฟเฟอร์เงียบที่ใช้ปลดล็อกเสียงบน iOS)
        // ไม่ใช่โน้ตที่นัดเวลาไว้ ⇒ นับรวมแล้วค่าจะเพี้ยนเป็นหมื่นมิลลิวินาที
        if (c && typeof c.startRendering !== 'function' && when > 0) starts.push({ kind, lead: (when - c.currentTime) * 1000 })
      } catch { /* ไม่ให้ตัวเฝ้าทำเพลงพัง */ }
      return orig.call(this, when, ...rest)
    }
  }
  hook(AudioBufferSourceNode.prototype, origBuf, 'sample')
  hook(OscillatorNode.prototype, origOsc, 'synth')

  const longtasks = []
  let po = null
  try {
    po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longtasks.push(+e.duration.toFixed(1))))
    po.observe({ entryTypes: ['longtask'] })
  } catch { /* เบราว์เซอร์ไม่รองรับ longtask */ }

  window.__probe = {
    starts, longtasks,
    reset() { starts.length = 0; longtasks.length = 0 },
    // ทำให้สายหลักติดพันจริง ๆ เพื่อพิสูจน์ว่าอาการเกิดจากอะไร
    stall(ms = 1000) { const t = performance.now(); while (performance.now() - t < ms); return `บล็อกสายหลัก ${ms}ms แล้ว` },
    report() {
      const by = (k) => starts.filter((s) => s.kind === k).map((s) => s.lead).sort((a, b) => a - b)
      const q = (a, p) => (a.length ? +a[Math.floor(p * (a.length - 1))].toFixed(1) : null)
      const out = {}
      for (const k of ['sample', 'synth']) {
        const a = by(k)
        if (!a.length) continue
        out[k] = { จำนวน: a.length, ต่ำสุด: q(a, 0), p50: q(a, 0.5), สูงสุด: q(a, 1), สายเกินเวลา: a.filter((x) => x < 0).length }
      }
      out.งานยาวบนสายหลัก = { จำนวน: longtasks.length, นานสุดms: longtasks.length ? Math.max(...longtasks) : 0 }
      console.table(out)
      return out
    },
    stop() {
      AudioBufferSourceNode.prototype.start = origBuf
      OscillatorNode.prototype.start = origOsc
      po && po.disconnect()
      delete window.__probe
      return 'ถอนตัวเฝ้าแล้ว'
    },
  }
  console.log('ติดตั้งตัวเฝ้าแล้ว → กดฟัง แล้วเรียก __probe.report()')
})()
