<script setup>
// "มาตรฐานการเขียนโน้ต" (/#/notation) — the ONE central spec every song-maker follows so the
// whole library (400+ songs, many hands keying) is written the same way. This page is the
// detailed ① content moved out of Guide.vue + filled in to 7 sections, each ending with a
// ⭐ callout that names BOTH results a symbol produces: 🎵 on the printed sheet and ▶ when
// played (our notation drives the golden-piano arranger, so writing well = prints clean AND
// sounds musical). §7 is the flagship table summarising every "write X → get Y" in one place.
//
// Standards aligned UP (not invented): jianpu — Numbered musical notation (Wikipedia) ·
// Open Music Theory · The Complete Musician (Laitz). Engine SSOT referenced, NOT duplicated:
// docs/song-model-v2.md (model) · docs/reports/golden-piano.md (arranger).
import NoteRow from '../components/NoteRow.vue'

// Section index for the sticky table of contents (jump anchors, shareable links).
const TOC = [
  ['#start', '0 · เริ่มที่นี่'],
  ['#roots', '1 · รากระบบเลข'],
  ['#rhythm', '2 · จังหวะ + ห้อง'],
  ['#form', '3 · โครงเพลง'],
  ['#chords', '4 · คอร์ด'],
  ['#lyrics', '5 · เนื้อร้อง'],
  ['#house-rules', '6 · กฎบ้านเรา'],
  ['#write-to-result', '7 · เขียน → ผล ⭐'],
]

// §1 — the base symbol set (moved verbatim from Guide.vue ①: type → rendered → meaning).
const SYMBOLS = [
  ['1 2 3 4 5 6 7', '1 2 3 4 5 6 7', 'ตัวเลข 1–7 = โด เร มี ฟา ซอล ลา ที (movable do — หัวเพลง "E 4/4" หมายถึง โด = เสียง E)'],
  ['0', '0', 'ตัวหยุด (rest) — เงียบตามค่าจังหวะของช่องนั้น'],
  ['.5', '.5', 'จุดใต้ตัวเลข 1 จุด = ต่ำลง 1 ช่วงเสียง (octave) — พิมพ์ . นำหน้าตัวเลข'],
  ['..5', '..5', 'จุดใต้ 2 จุด = ต่ำลง 2 ช่วงเสียง (จุดวางเรียงอยู่ใต้ตัวเลข)'],
  ["5'", "5'", "จุดบนตัวเลข 1 จุด = สูงขึ้น 1 ช่วงเสียง — พิมพ์ ' ต่อท้ายตัวเลข"],
  ["5''", "5''", 'จุดบน 2 จุด = สูงขึ้น 2 ช่วงเสียง (จุดวางเรียงอยู่เหนือตัวเลข)'],
  ['5_', '5_', 'เส้นใต้ 1 เส้น = เขบ็ต 1 ชั้น (eighth note) — ลดค่าโน้ตเหลือครึ่ง เร็วขึ้นเท่าตัว'],
  ['5__', '5__', 'เส้นใต้ 2 เส้น = เขบ็ต 2 ชั้น (sixteenth note) — เร็วขึ้น 4 เท่า'],
  ['5.', '5.', 'จุดหลังตัวเลข = โน้ตประจุด (dotted note) เพิ่มค่าอีกครึ่งหนึ่งของโน้ตเดิม (×1.5)'],
  ['5..', '5..', 'สองจุดหลังตัวเลข = โน้ตประจุดคู่ (double-dotted) เพิ่มค่าอีก 3 ใน 4 ของโน้ตเดิม (×1.75)'],
  ['5 - - -', '5 - - -', 'ขีด = ยืดเสียงต่ออีก 1 จังหวะต่อ 1 ขีด (ตัวอย่างนี้คือเสียงยาว 4 จังหวะ)'],
  ['#4', '#4', 'ชาร์ป (sharp ♯) = สูงขึ้นครึ่งเสียง — พิมพ์ # หน้าตัวเลข'],
  ['b7', 'b7', 'แฟลต (flat ♭) = ต่ำลงครึ่งเสียง — พิมพ์ b หน้าตัวเลข'],
  ['n4', 'n4', 'เนเชอรัล (natural ♮) = ยกเลิก # หรือ b ที่เขียนไว้ก่อนหน้าในห้องเดียวกัน กลับมาเป็นเลขเปล่าของคีย์ — พิมพ์ n หน้าตัวเลข (มีจุดพลาดง่าย ดูกล่องด้านล่าง)'],
  ['{1 2 3}', '{1 2 3}', 'สามพยางค์ (triplet) = โน้ต 3 ตัวในเวลาของ 2 ตัว'],
  ['3^', '3^', 'เฟอร์มาตา (fermata — โค้งมีจุดเหนือโน้ต) = ยืดเสียงยาวกว่าปกติ ตามผู้นำเพลง — ตอนกดฟัง เสียงจะลากยาวขึ้นให้'],
]

// §1 — stacking order for combined symbols (moved verbatim from Guide.vue ①).
const COMBOS = [
  ['.5_', '.5_', 'จุดใต้ (ต่ำ 1 ช่วงเสียง) + เส้นใต้ 1 เส้น (เขบ็ต 1 ชั้น)'],
  ['..5__', '..5__', 'ต่ำ 2 ช่วงเสียง + เขบ็ต 2 ชั้น'],
  ["5'.", "5'.", 'โน้ตสูง + โน้ตประจุด'],
  ['.5_.', '.5_.', 'ต่ำ + เขบ็ต + ประจุด (ครบสามอย่างในตัวเดียว)'],
  ['#.4_', '#.4_', 'ชาร์ป + ต่ำ + เขบ็ต'],
  ["(.6_5'_)", "(.6_5'_)", 'เส้นโค้งครอบโน้ตผสม — ทุกอย่างซ้อนกันได้ (โน้ตติดกันในช่องเดียว = เอื้อนคำเดียว)'],
]

// §7 — the flagship "write X → get Y" table. Each row: input · sheet result · playback result ·
// where it lives (citation label, NOT a duplicated explanation — SSOT stays in the doc named).
// `hot` rows are the ones whose playback effect is the strongest selling point (tie/slur/label/
// repeat/melody) — tinted so they stand out (DS §5).
const MAP = [
  ['1–7', 'ตัวเลขขั้นสเกลในคีย์', 'ระดับเสียงตามคีย์หัวเพลง (movable-do)', 'notation.js', false],
  ["จุดอ็อกเทฟ .5 / 5'", 'จุดใต้ / บนตัวเลข', 'เสียงลง / ขึ้น 1 ช่วงเสียง (octave)', 'notation.js', false],
  ['5_ เขบ็ต · 5. ประจุด · 5 - - ลาก', 'เส้นใต้ / จุด / ขีดต่อ', 'ค่าจังหวะจริง (เร็ว / ยืด / ลากยาว)', 'notation.js', false],
  ['ไท 3~ … ~3', 'เส้นโค้งเชื่อมเสียงเดียวกัน', 'ไม่ดีดซ้ำ = ลากเสียงต่อเนื่อง (legato)', 'golden-piano §🔧 legatoBass', true],
  ['สลัวร์ / เอื้อน (65)', 'เส้นโค้งเหนือโน้ต · นับเป็น 1 คำ', 'ร้องลื่นได้ยินทุกโน้ต · 1 พยางค์', 'song-model-v2 · เอื้อน (melisma)', true],
  ['ป้ายท่อน / วรรคจบ', 'ป้ายตัวเอียงท้ายบรรทัด', 'หายใจ / ผ่อนจังหวะปลายวรรค (rubato)', 'golden-piano §3 resolveSections', true],
  ['*** / ท่อนรับ', 'ป้าย "รับ"', 'เสียงคลอเข้มขึ้นช่วงท่อนรับ (density-adaptive)', 'golden-piano §3', true],
  ['ซ้ำ ‖: :‖ / volta', 'บาร์ไลน์ซ้ำ + ป้าย 1. / 2.', 'ลำดับเล่นจริง (เล่นซ้ำ · จบ 1 / จบ 2)', 'song-model-v2 · repeat/volta', true],
  ['นับจังหวะครบห้อง', 'ในห้องทำเพลงขึ้น ✓ ต่อห้อง', 'เล่นตรงกริด · วาทยกรปล่อยลูกเล่นเฉพาะช่องว่างทำนอง', 'golden-piano §1,2', false],
  ['คอร์ด (ตัวอักษร / โรมัน)', 'คอร์ดเหนือโน้ต · สลับได้', 'เบส + เสียงคลอเรียบเรียงจากคอร์ด', 'golden-piano preset', false],
  ['ทำนอง (เส้นเมโลดี้)', 'โน้ตบนแผ่น', 'ตัวขับการเรียบเรียงทั้งหมด — ลูกเล่นเล่นรอบทำนอง', 'golden-piano §1,2', true],
  ['เนื้อร้อง (พยางค์)', 'คำใต้โน้ตดีด', 'ไฮไลต์คาราโอเกะทีละพยางค์ตามโน้ตที่ดีด', 'song-model-v2 · step 3', false],
]
</script>

<template>
  <div class="reading-page notation-page">
    <div class="card intro-head">
      <h1 class="ns-h1">มาตรฐานการเขียนโน้ต</h1>
      <p class="ns-lead">
        เอกสารกลางให้ทุกเพลงในคลังเขียนเหมือนกัน — บอกครบว่า <strong>เขียนอะไร ได้ผลอะไร</strong>
        ทั้งบน<strong>แผ่นเพลง</strong> (พิมพ์ / อ่าน) และตอน<strong>กดเล่น</strong> (เสียง)
        เพราะโน้ตของเรา "เล่นได้จริง" ผ่านการเรียบเรียงเปียโนอัตโนมัติ
      </p>
      <p class="muted ns-forwho">
        สำหรับ<strong>คนทำเพลง</strong> (ทีมคริสตจักร + คนภายนอกที่ส่งเพลงเข้าคลัง) ·
        ถ้าคุณแค่เปิดเว็บมาร้อง อ่าน <a href="#/guide">คู่มือใช้งานโปรแกรม</a> ก็พอ
      </p>
    </div>

    <!-- Table of contents — sticky on desktop, a horizontal scroll strip on mobile. Anchors are
         shareable (#/notation#roots). Each link is a ≥44px target (ui-standards 2.5.8). -->
    <nav class="toc no-print" aria-label="สารบัญ">
      <a v-for="[href, label] in TOC" :key="href" :href="'#/notation' + href" class="toc-link">{{ label }}</a>
    </nav>

    <!-- ===== §0 เริ่มที่นี่ ===== -->
    <section class="card" id="start" aria-labelledby="start-h">
      <h2 id="start-h" class="ns-h2">0 · เริ่มที่นี่</h2>
      <p>
        เพลงในคลังนี้เขียนด้วย <strong>โน้ตตัวเลข</strong> (numbered notation) — ระบบที่หนังสือเพลง
        คริสตจักรไทยหลายเล่มใช้ ต้นทางจากฝรั่งเศส จีนนำไปใช้จนแพร่หลาย เรียก "เจี่ยนผู่ 簡譜"
        หลักคือ เลข <strong>1 = เสียง "โด" ของคีย์เพลงนั้น</strong> — เป็นระบบ <strong>movable-do</strong>
        (โดเคลื่อนตามคีย์) ข้อดีคือย้ายคีย์ได้โดยตัวเลขไม่ต้องเปลี่ยนเลย
      </p>
      <p>
        <strong>กายวิภาคหัวเพลง "E 4/4":</strong>
        <strong>E</strong> = คีย์ (โด = เสียง E) · <strong>4/4</strong> = เครื่องหมายกำหนดจังหวะ
        (time signature) บอกว่า 1 ห้องมีกี่จังหวะ
      </p>
      <p class="callout use-callout">
        <strong>ใช้เอกสารนี้ยังไง:</strong> ครั้งแรกอ่านเรียงจาก §1 → §7 ให้จบ · เวลาคีย์เพลงจริง
        เปิด <a :href="'#/notation#write-to-result'">§7 ตารางสรุป</a> ไว้เป็นแผ่นโพยข้าง ๆ
      </p>
    </section>

    <!-- ===== §1 รากระบบเลข ===== -->
    <section class="card" id="roots" aria-labelledby="roots-h">
      <h2 id="roots-h" class="ns-h2">1 · รากระบบเลข</h2>
      <p class="muted">
        คอลัมน์ "พิมพ์" คือสิ่งที่พิมพ์ในห้องทำเพลง · "แสดงผล" คือผลบนแผ่นเพลง (render จริงจาก engine)
      </p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางสัญลักษณ์พื้นฐาน · เลื่อนแนวนอนได้">
        <table class="guide-table">
          <thead>
            <tr><th scope="col">พิมพ์</th><th scope="col">แสดงผล</th><th scope="col">ความหมาย</th></tr>
          </thead>
          <tbody>
            <tr v-for="[syntax, example, meaning] in SYMBOLS" :key="syntax">
              <td><code>{{ syntax }}</code></td>
              <td class="render-cell"><NoteRow :notes="example" /></td>
              <td>{{ meaning }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="ns-h3">ชาร์ป ♯ · แฟลต ♭ · เนเชอรัล ♮ — จุดที่พลาดง่าย</h3>
      <p>
        โน้ตตัวเลขเป็นระบบ <strong>"เลขวิ่งตามคีย์"</strong> — เลข 1–7 ไม่ใช่ตัวโน้ตตายตัว
        แต่คือ "ขั้นที่เท่าไรของสเกล" ในคีย์นั้น เวลาดัดเสียงจึงคิดจาก<strong>ขั้นของสเกล</strong>
        ไม่ใช่จากชื่อโน้ต:
      </p>
      <ul>
        <li><code>#</code> = ยกขั้นนั้น<strong>ขึ้นครึ่งเสียง</strong></li>
        <li><code>b</code> = ลดขั้นนั้น<strong>ลงครึ่งเสียง</strong></li>
        <li><code>♮ (n)</code> = <strong>ยกเลิก # หรือ b ที่เพิ่งเขียนไว้ก่อนหน้าในห้องเดียวกัน</strong>
          ให้กลับไปเป็นเลขเปล่าของคีย์</li>
      </ul>
      <p class="warn-box">
        ⚠️ <strong>กับดักที่พบบ่อย:</strong> ♮ ในโน้ตตัวเลข<strong>ไม่ได้แปลว่า "โน้ตขาว / เสียงธรรมชาติ"</strong>
        แบบโน้ตห้าเส้น — เพราะในคีย์ที่มีชาร์ป/แฟลต เลขเปล่าอาจเป็นเสียงชาร์ปอยู่แล้ว<br />
        ตัวอย่าง: <strong>คีย์ A เลข 3 = C#</strong> อยู่แล้ว ถ้าใส่ <code>♮3</code> จะได้เสียง
        <strong>C#</strong> (เลขเปล่า) <strong>ไม่ใช่ C</strong>
      </p>
      <p>ถ้าอยากได้ <strong>C จริง ๆ</strong> (ต่ำกว่า C# ครึ่งเสียง) ในคีย์ A ให้เขียน:</p>
      <ul>
        <li><code>b3</code> = ลดขั้น 3 (C#) ลงครึ่งเสียง → C
          <span class="muted">(อ่านลื่นสุดเมื่อทำนองเคลื่อนลง)</span></li>
        <li><code>#2</code> = ยกขั้น 2 (B) ขึ้นครึ่งเสียง → C
          <span class="muted">(เมื่อทำนองเคลื่อนขึ้น)</span></li>
      </ul>

      <h3 class="ns-h3">การผสมสัญลักษณ์</h3>
      <p>สัญลักษณ์ทุกตัวซ้อนกันได้ในโน้ตตัวเดียว — พิมพ์ตาม<strong>ลำดับ</strong>นี้เสมอ:</p>
      <p><code>[# / b / n] → [.] จุดต่ำ → ตัวเลข → ['] จุดสูง → [_] เส้นใต้ → [.] ประจุด</code></p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางการผสมสัญลักษณ์ · เลื่อนแนวนอนได้">
        <table class="guide-table">
          <thead>
            <tr><th scope="col">พิมพ์</th><th scope="col">แสดงผล</th><th scope="col">ความหมาย</th></tr>
          </thead>
          <tbody>
            <tr v-for="[syntax, example, meaning] in COMBOS" :key="syntax">
              <td><code>{{ syntax }}</code></td>
              <td class="render-cell"><NoteRow :notes="example" /></td>
              <td>{{ meaning }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted">
        ตามมาตรฐานโน้ตตัวเลข จุดบอกช่วงเสียงต่ำจะอยู่<strong>ใต้เส้นใต้</strong>อีกชั้นหนึ่ง — ระบบจัดให้อัตโนมัติ
      </p>

      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> เลขขั้นสเกล พร้อมจุดอ็อกเทฟ เส้นใต้เขบ็ต ขีดลาก และเครื่องหมายดัดเสียง</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ระดับเสียงจริงตามคีย์ (movable-do) + ค่าจังหวะตามเส้นใต้ / ประจุด / ขีด</span>
      </p>
    </section>

    <!-- ===== §2 จังหวะ + ห้อง ===== -->
    <section class="card" id="rhythm" aria-labelledby="rhythm-h">
      <h2 id="rhythm-h" class="ns-h2">2 · จังหวะ + ห้อง</h2>
      <ul>
        <li><strong>เครื่องหมายกำหนดจังหวะ (time signature)</strong> = ตัวเลขในหัวเพลง เช่น <strong>4/4</strong>
          บอกว่า 1 ห้องมีกี่จังหวะ · <strong>|</strong> = เส้นกั้นห้อง · <strong>‖</strong> = จบเพลง</li>
        <li><strong>นับครบห้อง:</strong> ในห้องทำเพลงแต่ละห้องจะขึ้นสถานะ <strong>✓</strong> เมื่อจังหวะครบ
          หรือ <strong>❌</strong> เมื่อยังไม่ครบ/เกิน — ยกเว้นห้องยก (ดูด้านล่าง)</li>
        <li><strong>ห้องยก (pickup / anacrusis):</strong> ห้องแรกของท่อนที่จังหวะไม่เต็มได้ (เพลงเริ่มด้วยจังหวะยก)
          — จับคู่กับห้องท้ายที่สั้นเติมกันให้ครบ ระบบนับสองห้องนั้นเป็นกลุ่มเดียว</li>
        <li><strong>สามพยางค์ (triplet) <code>{1 2 3}</code></strong> = โน้ต 3 ตัวในเวลาของ 2 ตัว</li>
      </ul>

      <h3 class="ns-h3">เส้นโค้ง: ไท (tie) กับ สลัวร์ (slur)</h3>
      <p>
        ทั้งสองวาดเป็น<strong>เส้นโค้ง</strong>เหนือโน้ตเหมือนกัน — ต่างกันที่ "เชื่อมเสียงอะไร":
      </p>
      <ul>
        <li><strong>ไท (tie)</strong> = โค้งเชื่อมโน้ต<strong>เสียงเดียวกัน</strong> → ลากต่อเป็นเสียงเดียว
          <strong>ไม่ดีดซ้ำ</strong></li>
        <li><strong>สลัวร์ (slur)</strong> = โค้งเชื่อมโน้ต<strong>คนละเสียง</strong>ในคำเดียว (เอื้อน) →
          ร้องลื่น <strong>ได้ยินทุกโน้ต</strong></li>
      </ul>
      <p>
        <strong>① เอื้อน (สลัวร์) — หลายโน้ตในคำเดียว:</strong> พิมพ์โน้ตทุกตัว<strong>ติดกันในช่องเดียว
        (ไม่เว้นวรรค)</strong> แล้วครอบวงเล็บ เช่น <code>(65)</code> — ทั้งช่องนับเป็น <strong>1 คำ</strong>
        แต่เล่นครบทุกโน้ต
        <br /><span class="muted">⚠️ <strong>เว้นวรรคหรือกด Enter = ขึ้นช่องใหม่ = คนละคำ</strong> —
        เอื้อนต้องพิมพ์โน้ตติดกัน (<code>(6 5)</code> ที่มีช่องว่าง = 2 ช่อง = 2 คำ)</span>
      </p>
      <p>
        <strong>② ไท — ลากโน้ตเสียงเดิมข้ามช่อง:</strong> พิมพ์ <code>~</code> <strong>ท้าย</strong>โน้ตตัวแรก
        และ <code>~</code> <strong>หน้า</strong>โน้ตตัวรับ (คนละช่อง) เช่น ช่องแรก <code>3~</code>
        ช่องถัดไป <code>~3</code>
        <br /><span class="muted"><strong>ใช้ได้ทั้งในห้องเดียวกันและข้ามเส้นกั้นห้อง</strong> —
        จุดต่างจากเอื้อนคือ ไทอยู่<strong>คนละช่อง</strong> (โน้ตช่องเดียวกัน = เอื้อน ใช้วงเล็บ ไม่ใช่ <code>~</code>)</span>
      </p>

      <p class="muted ex-lbl">ตัวอย่างเอื้อน (สลัวร์) — โน้ต<strong>คนละเสียง</strong>ในช่องเดียว:</p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางตัวอย่างเอื้อน (สลัวร์) · เลื่อนแนวนอนได้">
        <table class="guide-table">
          <thead>
            <tr><th scope="col">พิมพ์</th><th scope="col">แสดงผล</th><th scope="col">ความหมาย</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>.6_ .7_</code></td>
              <td class="render-cell"><NoteRow notes=".6_ .7_" /></td>
              <td>คนละพยางค์ ไม่มีสลัวร์ — เส้นใต้แยกกัน มีช่องไฟ</td>
            </tr>
            <tr>
              <td><code>(.6_.7_)</code></td>
              <td class="render-cell"><NoteRow notes="(.6_.7_)" /></td>
              <td>เอื้อนคำเดียว — โน้ตติดกันใน<strong>ช่องเดียว</strong> มีเส้นโค้งด้านบน แต่เส้นใต้<strong>ยังแยกกัน</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="muted ex-lbl">ตัวอย่างไท — โน้ต<strong>เสียงเดียวกัน</strong>คนละช่อง (กรณีข้ามห้อง):</p>
      <p class="tie-demo-line">
        <span class="tie-demo"><NoteRow notes="3~" /><span class="bar-line" style="height: 34px; margin-top: 2px" aria-hidden="true"></span><NoteRow notes="~3 - -" /></span>
      </p>
      <p class="muted">
        ตอนกดฟัง โน้ตตัวรับ (<code>~3</code>) จะ<strong>ไม่ดีดเสียงใหม่</strong> แต่ลากเสียงตัวแรกต่อเนื่องเป็นเสียงเดียว
      </p>

      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> เส้นกั้นห้อง เส้นโค้งไท/สลัวร์ วงเล็บ triplet และสถานะ ✓/❌ ต่อห้อง</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ไท = ลากเสียงต่อเนื่อง (legato ไม่ดีดซ้ำ) · สลัวร์ = ร้อง 1 คำหลายโน้ต · จังหวะครบ = วาทยกรคุมช่องว่างทำนอง ไม่ให้ลูกเล่นชนกัน</span>
      </p>
    </section>

    <!-- ===== §3 โครงเพลง / ฟอร์ม ===== -->
    <section class="card" id="form" aria-labelledby="form-h">
      <h2 id="form-h" class="ns-h2">3 · โครงเพลง / ฟอร์ม</h2>
      <ul>
        <li><strong>ท่อนรับ <code>***</code></strong> = จุดเริ่มท่อนรับ (ตามธรรมเนียมหนังสือเพลงเล่มนี้ — ดู §6)</li>
        <li><strong>ป้ายกำกับ</strong> เช่น <em>Fine</em> (จุดจบ) · <em>D.C. al Fine</em> (กลับต้นเพลงเล่นถึง Fine) ·
          <em>D.S.</em> (กลับไปเครื่องหมาย Segno) · <em>Coda</em> (ท่อนปิดท้าย) — ในห้องทำเพลงพิมพ์ลงช่อง "ป้าย"
          ของบรรทัดนั้น แสดงตัวเอียงเล็ก ๆ ท้ายบรรทัด</li>
        <li><strong>เล่นซ้ำ <code>‖:</code> … <code>:‖</code></strong> = วนกลับไปเล่นช่วงในเครื่องหมายซ้ำอีกครั้ง</li>
        <li><strong>จบต่างเที่ยว (volta) <code>1.</code> / <code>2.</code></strong> = เที่ยวแรกเล่นห้อง 1. · เที่ยวซ้ำข้ามไปเล่นห้อง 2.</li>
        <li><strong>เส้นจบ <code>‖</code></strong> = จบเพลง</li>
      </ul>
      <p class="muted">
        โครงเพลงเก็บใน <strong>โมเดล v2</strong> เป็นแถวลำดับเล่น (แต่ละแถวโยงทำนอง 1 ท่อน + เนื้อของท่อนนั้น) ·
        การซ้ำ / volta ขยายเป็นลำดับเล่นจริงตอนเล่น — รายละเอียดโมเดลดูที่ SSOT <code>docs/song-model-v2.md</code>
        (ไม่ทำซ้ำที่นี่)
      </p>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> ป้ายท่อน บาร์ไลน์ซ้ำ ป้าย volta 1./2. และเส้นจบ</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ป้ายท่อน → หายใจ/ผ่อนจังหวะปลายวรรค · <code>***</code>/ท่อนรับ → เสียงคลอเข้มขึ้น · ซ้ำ/volta → เล่นตามลำดับจริง (เล่นซ้ำ · จบ 1 / จบ 2)</span>
      </p>
    </section>

    <!-- ===== §4 คอร์ด ===== -->
    <section class="card" id="chords" aria-labelledby="chords-h">
      <h2 id="chords-h" class="ns-h2">4 · คอร์ด</h2>
      <p>
        คลังนี้แสดงคอร์ดได้ 2 แบบ (ปุ่ม "คอร์ดโรมัน" ในหน้าเพลงสลับได้):
      </p>
      <ul>
        <li><strong>ตัวอักษร</strong> (C G Am) — ชื่อคอร์ดตายตัว</li>
        <li><strong>โรมัน</strong> (I IV V) — นับลำดับขั้นจากคีย์ของเพลง ย้ายคีย์แล้วตัวเลขไม่เปลี่ยน · ใช้เลขโรมัน
          เพื่อ<strong>ไม่ให้ปนกับตัวเลขโน้ตทำนอง</strong></li>
      </ul>
      <p>ตัวพิมพ์บอกชนิดคอร์ดตามมาตรฐานสากล:</p>
      <ul>
        <li><strong>ตัวใหญ่ = Major</strong> (I, IV, V)</li>
        <li><strong>ตัวเล็ก = minor</strong> (ii, iii, vi)</li>
        <li><strong>ตัวเล็ก + ° = diminished</strong> (vii°)</li>
        <li><strong>เลข 7 ต่อท้าย</strong> = คอร์ดเซเว่น (V7, ii7)</li>
        <li><strong>slash chord</strong> เช่น <code>C/E</code> = คอร์ด C เสียงเบสเป็น E</li>
      </ul>
      <p class="muted">อ้างอิงทฤษฎีคอร์ดโรมัน: Open Music Theory · The Complete Musician (Laitz).</p>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> คอร์ดวางเหนือโน้ต สลับตัวอักษร↔โรมันได้</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> เบส + เสียงคลอเรียบเรียงจากคอร์ด (แตกคอร์ด / ลากอุ้ม / ลูกรับส่ง)</span>
      </p>
    </section>

    <!-- ===== §5 เนื้อร้อง ===== -->
    <section class="card" id="lyrics" aria-labelledby="lyrics-h">
      <h2 id="lyrics-h" class="ns-h2">5 · เนื้อร้อง</h2>
      <ul>
        <li><strong>1 พยางค์ = 1 โน้ตดีด (attack note):</strong> คำหนึ่งพยางค์วางใต้โน้ตที่ดีดหนึ่งตัว</li>
        <li><strong>โน้ตลาก / ไท / เอื้อน ไม่กินพยางค์:</strong> ขีด <code>-</code>, ไท <code>~</code> และโน้ตในเอื้อน
          (เกินตัวแรก) ไม่ต้องมีคำใหม่ — เป็นการลากคำเดิม (melisma)</li>
        <li><strong>ยัติภังค์ <code>ส-ถิตย์</code>:</strong> คำหลายพยางค์ที่กระจายลงหลายโน้ต ใช้ขีดคั่นให้เห็นว่าพยางค์ต่อเป็นคำเดียว</li>
        <li><strong>2 ภาษา:</strong> ถ้าต้องมีทั้งไทยและอังกฤษ วางเป็น <strong>2 แถวเนื้อ</strong>จัดตรงโน้ตเดียวกัน
          (แนว render จับคู่ 2 แถว) — ไม่ฝังสองภาษาในช่องเดียว</li>
      </ul>
      <p class="muted">
        รายละเอียดการวางพยางค์อยู่ที่ SSOT <code>docs/song-model-v2.md</code> (§ Syllable-bearing notes ·
        § Syllable input convention) — ไม่ทำซ้ำที่นี่
      </p>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> คำจัดใต้โน้ตที่ดีด · เอื้อน/ลากไม่มีคำซ้ำ</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ไฮไลต์คาราโอเกะทีละพยางค์ เดินตามโน้ตที่ดีดตรง 1:1</span>
      </p>
    </section>

    <!-- ===== §6 กฎบ้านเรา + เหตุผล ===== -->
    <section class="card" id="house-rules" aria-labelledby="house-h">
      <h2 id="house-h" class="ns-h2">6 · กฎบ้านเรา + เหตุผล</h2>
      <p class="muted">คนคีย์ใหม่อ่านแล้วเข้าใจ "ทำไม" ของธรรมเนียมคลังนี้ — ไม่ใช่ท่องกฎ:</p>
      <ul>
        <li><strong>ใช้คอร์ดโรมัน ไม่ใช่นัชวิลล์:</strong> เลขนัชวิลล์ (1 4 5) จะปนสายตากับ<strong>เลขโน้ตทำนอง</strong> —
          เลขโรมัน (I IV V) แยกออกจากตัวเลขทำนองชัดเจน</li>
        <li><strong><code>***</code> = จุดเริ่มท่อนรับ:</strong> ธรรมเนียมของหนังสือเพลงต้นทาง</li>
        <li><strong>หัวเพลงรูปแบบ "E 4/4":</strong> คีย์ก่อน เว้นวรรค แล้วตามด้วย time signature</li>
        <li><strong>จุดต่ำอยู่ใต้เส้นใต้อีกชั้น:</strong> เมื่อโน้ตมีทั้งจุดอ็อกเทฟต่ำและเส้นใต้เขบ็ต ระบบจัดจุดให้อยู่ใต้เส้นใต้
          ตามมาตรฐานโน้ตตัวเลข (จัดให้อัตโนมัติ)</li>
      </ul>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> ทุกเพลงในคลังเขียนด้วยธรรมเนียมเดียวกัน — อ่านข้ามเพลงได้ทันที ไม่ต้องเดา</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ทุกเพลงป้อนการเรียบเรียงชุดเดียวกัน กฎที่สม่ำเสมอทำให้เสียงออกมาสม่ำเสมอทั้งคลัง</span>
      </p>
    </section>

    <!-- ===== §7 ⭐ เขียน X → ได้ผล Y ===== -->
    <section class="card flag-card" id="write-to-result" aria-labelledby="wtr-h">
      <h2 id="wtr-h" class="ns-h2">7 · เขียน X → ได้ผล Y <span class="star">⭐</span></h2>
      <p class="flag-lead">
        มาตรฐานนี้ไม่ใช่แค่ "เขียนให้แผ่นสวย" — มันคือ<strong>สเปกที่ทำให้เพลงเพราะตอนเล่น</strong>ด้วย
        โน้ตทุกตัวป้อนการเรียบเรียงเปียโนอัตโนมัติ ตารางนี้สรุปว่าแต่ละสิ่งที่เขียน ให้ผลอะไรทั้ง 2 ทาง
        <strong>แถวที่เน้นสี</strong> = ตัวที่ "เขียนแล้วได้ผลตอนเล่นชัดสุด"
      </p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางสรุป เขียน X → ได้ผล Y · เลื่อนแนวนอนได้">
        <table class="guide-table map-table">
          <thead>
            <tr>
              <th scope="col">เขียน (input)</th>
              <th scope="col">🎵 ผลบนแผ่นเพลง</th>
              <th scope="col">▶ ผลตอนเล่น</th>
              <th scope="col" class="ref-col">อ้างอิง</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in MAP" :key="row[0]" :class="{ hot: row[4] }">
              <td><strong>{{ row[0] }}</strong></td>
              <td>{{ row[1] }}</td>
              <td>{{ row[2] }}</td>
              <td class="ref-col">{{ row[3] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===== อ้างอิง ===== -->
    <section class="card" aria-labelledby="refs-h">
      <h2 id="refs-h" class="ns-h2">แหล่งอ้างอิง</h2>
      <p class="muted" style="margin-bottom: 0">มาตรฐานสากลที่หน้านี้ยึด (align UP ไม่คิดเอง):</p>
      <ul class="muted refs">
        <li>
          <strong>ระบบโน้ตตัวเลข (เจี่ยนผู่ 簡譜):</strong> "Numbered musical notation", Wikipedia —
          <a href="https://en.wikipedia.org/wiki/Numbered_musical_notation" target="_blank" rel="noopener">
            en.wikipedia.org/wiki/Numbered_musical_notation</a>
          (เลข-ขั้นเสียง · จุดช่วงเสียง · เส้นเขบ็ต · ชาร์ป-แฟลต-เนเชอรัล · สลัวร์-ไท · time signature)
        </li>
        <li>
          <strong>ทฤษฎีคอร์ดโรมัน:</strong> Open Music Theory (ตำราเปิดระดับมหาวิทยาลัย) ·
          The Complete Musician — Steven G. Laitz (Oxford University Press)
        </li>
        <li>
          <strong>โมเดล + การเรียบเรียง (เอกสารวิศวกรรมภายใน · SSOT):</strong>
          <code>docs/song-model-v2.md</code> (โครงข้อมูลเพลง v2 · การวางพยางค์ · repeat/volta) ·
          <code>docs/reports/golden-piano.md</code> (การเรียบเรียงเปียโนอัตโนมัติ — วาทยกร/ยาม · ผูกป้ายท่อน)
          — หน้านี้<strong>อ้างอิง</strong>ตามสองเอกสารนี้ ไม่ทำซ้ำเนื้อหา
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* Base table + render cell + warn-box are reused verbatim from Guide.vue's ① (kept identical
   so the moved content looks the same as before). */
.guide-table { width: 100%; border-collapse: collapse; }
.guide-table th, .guide-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}
.guide-table th { color: var(--ink); font-weight: 700; }
.guide-table code {
  background: #edf2f7;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.render-cell { font-size: 19px; color: var(--note-blue); white-space: nowrap; padding-top: 16px !important; }
.warn-box {
  background: #fff8e6;
  border: 1px solid #f0d98a;
  border-left: 4px solid #e0a800;
  border-radius: 8px;
  padding: 10px 12px;
}
/* every table scrolls INSIDE its own box so a wide row never pushes the page sideways
   (ui-standards §2 · WCAG 1.4.10) */
.tbl-wrap { overflow-x: auto; }
/* now keyboard-focusable (WCAG 2.1.1) so a wide table can be scrolled without a mouse —
   give it a clear focus ring so the target is obvious (WCAG 2.4.7) */
.tbl-wrap:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 8px; }
.refs { margin: 8px 0 0; padding-left: 20px; }
.refs li { margin-bottom: 8px; }
.refs a { word-break: break-word; }

/* The shared app shell (main.container) is flex-shrink:0, so it grows to its content's
   min-content rather than the viewport. A wide table (esp. the 4-col §7 map) would otherwise
   push the whole page sideways on mobile. Cap the page to the viewport so each table wrapper's
   overflow-x:auto engages — tables scroll INSIDE their own box, the body never scrolls (WCAG
   1.4.10). Desktop is unaffected: the container's 900px max-width already bounds it below 100vw. */
.notation-page { max-width: calc(100vw - 24px); }

/* ---- page heads ---- */
.ns-h1 { margin: 0 0 6px; font-size: 1.6rem; color: var(--brand); }
.ns-h2 { margin-top: 0; }
.ns-h3 { margin-top: 22px; }
.ns-lead { margin-bottom: 6px; }
.ns-forwho { margin-bottom: 0; }
.intro-head { border-left: 4px solid var(--brand); }
.ex-lbl { margin: 12px 0 4px; }
.tie-demo-line { margin: 0 0 4px; }
.tie-demo {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 20px;
  color: var(--note-blue);
  padding: 10px 6px 0;
}

/* ---- table of contents ---- */
.toc {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  position: sticky;
  top: 60px;
  z-index: 5;
}
.toc-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 6px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--ink);
  font-size: 0.95rem;
  border: 1px solid var(--line);
}
.toc-link:hover { background: rgba(139, 69, 19, 0.08); }
.toc-link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

/* ---- ⭐ per-section callout: two labelled results, sheet then playback ---- */
.callout {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 18px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f4f8fb;
  border: 1px solid #d5e3ee;
  border-left: 4px solid var(--note-blue, #2f6f9f);
}
.callout .c-sheet, .callout .c-play { line-height: 1.5; }
.callout.use-callout { background: #f6f3ee; border-color: #e2d8c8; border-left-color: var(--brand); }

/* ---- §7 flagship ---- */
.flag-card { border: 2px solid var(--brand); }
.flag-lead { margin-top: 0; }
.star { font-size: 1.1em; }
.map-table th, .map-table td { vertical-align: top; }
.map-table td strong { color: var(--ink); }
.map-table tr.hot td { background: #f4f8fb; }
/* citation column — a muted grey that still clears 4.5:1 on BOTH white and the .hot tint
   (#616161 ≈ 5.4:1 on #f4f8fb; plain --muted #757575 dipped to 4.31 on the tint) */
.ref-col { font-size: 0.85rem; }
.map-table td.ref-col { color: #616161; }

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
@media (max-width: 640px) {
  /* TOC becomes a single horizontal scroll strip so it never eats vertical space on mobile */
  .toc { flex-wrap: nowrap; overflow-x: auto; position: static; }
  .toc-link { white-space: nowrap; }
  .ns-h1 { font-size: 1.4rem; }
}
</style>
