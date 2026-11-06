<script setup>
// คู่มือทำเพลง — "มาตรฐานการเขียนโน้ต" (/#/notation). The ONE spec every song-maker follows so the
// whole library is written the same way. Plain primary-school Thai (พี่เอม 6 พ.ย. 2569).
// Each section ends with a callout naming BOTH results a symbol gives: 🎵 on the printed sheet and
// ▶ when played. §7 sums up every "write X → get Y" in one table.
//
// Standards aligned UP (not invented): jianpu — Numbered musical notation (Wikipedia) ·
// Open Music Theory · The Complete Musician (Laitz). Engine docs referenced, NOT duplicated:
// docs/song-model-v2.md (model) · docs/reports/golden-piano.md (arranger).
import NoteRow from '../components/NoteRow.vue'

// Section index for the table of contents (jump anchors, shareable links).
const TOC = [
  ['#start', '0 · เริ่มที่นี่'],
  ['#roots', '1 · ตัวเลขและจุด'],
  ['#rhythm', '2 · จังหวะและห้อง'],
  ['#form', '3 · ท่อนและการซ้ำ'],
  ['#chords', '4 · คอร์ด'],
  ['#lyrics', '5 · เนื้อร้อง'],
  ['#house-rules', '6 · กติกาของเรา'],
  ['#write-to-result', '7 · ตารางสรุป'],
]

// §1 — type → how it looks → what it means.
const SYMBOLS = [
  ['1 2 3 4 5 6 7', '1 2 3 4 5 6 7', 'โด เร มี ฟา ซอล ลา ที (โด = เสียงของคีย์เพลง เช่น คีย์ E โด คือ E)'],
  ['0', '0', 'หยุด ไม่มีเสียง'],
  ['.5', '.5', 'จุดใต้ 1 จุด = ต่ำลง 1 ช่วงเสียง · พิมพ์ . ข้างหน้า'],
  ['..5', '..5', 'จุดใต้ 2 จุด = ต่ำลง 2 ช่วงเสียง'],
  ["5'", "5'", "จุดบน 1 จุด = สูงขึ้น 1 ช่วงเสียง · พิมพ์ ' ข้างหลัง"],
  ["5''", "5''", 'จุดบน 2 จุด = สูงขึ้น 2 ช่วงเสียง'],
  ['5_', '5_', 'เส้นใต้ 1 เส้น = ยาวครึ่งจังหวะ (เร็วขึ้น 2 เท่า)'],
  ['5__', '5__', 'เส้นใต้ 2 เส้น = ยาวหนึ่งในสี่จังหวะ (เร็วขึ้น 4 เท่า)'],
  ['5.', '5.', 'จุดข้างหลัง = ยาวขึ้นอีกครึ่งหนึ่ง'],
  ['5..', '5..', 'สองจุดข้างหลัง = ยาวขึ้นอีกเกือบเท่าตัว (3 ใน 4)'],
  ['5 - - -', '5 - - -', 'ขีด 1 ขีด = ลากเสียงต่ออีก 1 จังหวะ (ตัวอย่างนี้ยาว 4 จังหวะ)'],
  ['#4', '#4', 'ชาร์ป = สูงขึ้นครึ่งเสียง · พิมพ์ # ข้างหน้า'],
  ['b7', 'b7', 'แฟลต = ต่ำลงครึ่งเสียง · พิมพ์ b ข้างหน้า'],
  ['n4', 'n4', 'เนเชอรัล = ยกเลิก # หรือ b ที่อยู่ก่อนหน้าในห้องเดียวกัน · พิมพ์ n ข้างหน้า (ระวัง ดูกล่องข้างล่าง)'],
  ['{1 2 3}', '{1 2 3}', 'โน้ต 3 ตัว ร้องในเวลาของ 2 ตัว'],
  ['3^', '3^', 'ลากเสียงยาวกว่าปกติ ตามผู้นำเพลง · ตอนฟัง เสียงจะลากยาวให้'],
]

// §1 — combining symbols in one note.
const COMBOS = [
  ['.5_', '.5_', 'ต่ำลง + ครึ่งจังหวะ'],
  ['..5__', '..5__', 'ต่ำลง 2 ช่วง + หนึ่งในสี่จังหวะ'],
  ["5'.", "5'.", 'สูงขึ้น + ยาวขึ้นอีกครึ่ง'],
  ['.5_.', '.5_.', 'ต่ำลง + ครึ่งจังหวะ + ยาวขึ้นอีกครึ่ง'],
  ['#.4_', '#.4_', 'ชาร์ป + ต่ำลง + ครึ่งจังหวะ'],
  ["(.6_5'_)", "(.6_5'_)", 'เอื้อน: หลายโน้ตในช่องเดียว = ร้องคำเดียว'],
]

// §7 — "write X → get Y". Each row: what you write · on the sheet · when played · hot.
// `hot` rows are the ones that change the sound the most — tinted so they stand out.
const MAP = [
  ['1–7', 'ตัวเลข', 'เสียงตามคีย์ของเพลง', false],
  ["จุด .5 / 5'", 'จุดใต้ / จุดบน', 'เสียงต่ำลง / สูงขึ้น', false],
  ['5_ · 5. · 5 - -', 'เส้นใต้ / จุดข้างหลัง / ขีด', 'สั้นลง / ยาวขึ้น / ลากยาว', false],
  ['ไท 3~ … ~3', 'เส้นโค้งเชื่อมเสียงเดียวกัน', 'ไม่กดซ้ำ ลากเป็นเสียงเดียว', true],
  ['เอื้อน (65)', 'เส้นโค้งเหนือโน้ต · นับเป็น 1 คำ', 'ได้ยินทุกโน้ต · ร้องคำเดียว', true],
  ['ป้ายท่อน / จบวรรค', 'ชื่อท่อน', 'หายใจ ช้าลงนิดหนึ่งตอนจบวรรค', true],
  ['*** / ท่อนรับ', 'ป้าย "รับ"', 'เสียงดนตรีแน่นขึ้นตอนท่อนรับ', true],
  ['ซ้ำ ‖: :‖ / จบ 1. 2.', 'เส้นซ้ำ + ป้าย 1. / 2.', 'เล่นวนตามลำดับจริง', true],
  ['จังหวะครบห้อง', 'ห้องขึ้น ✓', 'เล่นตรงจังหวะ ไม่หลุด', false],
  ['คอร์ด', 'ชื่อคอร์ดเหนือโน้ต', 'ได้เสียงเบสและเสียงคลอ', false],
  ['ทำนอง', 'ตัวเลขบนแผ่น', 'ดนตรีทั้งหมดเล่นตามทำนองนี้', true],
  ['เนื้อร้อง', 'คำใต้โน้ต', 'คำขึ้นสีทีละคำตอนฟัง', false],
]
</script>

<template>
  <div class="reading-page notation-page">
    <div class="card intro-head">
      <h1 class="ns-h1">คู่มือทำเพลง</h1>
      <p class="ns-lead">
        หน้านี้บอกวิธี<strong>เขียนโน้ต</strong> ให้ทุกเพลงในเว็บเขียนเหมือนกัน
        และบอกว่าเขียนแบบนี้แล้ว<strong>แผ่นเพลงหน้าตาเป็นยังไง</strong> และ<strong>กดฟังแล้วได้เสียงยังไง</strong>
      </p>
      <p class="muted ns-forwho">
        สำหรับ<strong>คนเขียนเพลง</strong> · ถ้าแค่มาร้องเพลง อ่าน <a href="#/guide">คู่มือใช้งานโปรแกรม</a> ก็พอ
      </p>
    </div>

    <nav class="toc no-print" aria-label="สารบัญ">
      <a v-for="[href, label] in TOC" :key="href" :href="'#/notation' + href" class="toc-link">{{ label }}</a>
    </nav>

    <!-- ===== §0 ===== -->
    <section class="card" id="start" aria-labelledby="start-h">
      <h2 id="start-h" class="ns-h2">0 · เริ่มที่นี่</h2>
      <p>
        เพลงในเว็บนี้ใช้<strong>โน้ตตัวเลข</strong> เหมือนหนังสือเพลงของคริสตจักรไทยหลายเล่ม
        เลข <strong>1 คือเสียงโด ของคีย์เพลงนั้น</strong> ถ้าเปลี่ยนคีย์ ตัวเลขก็ยังเหมือนเดิม
      </p>
      <p>
        หัวเพลงเขียนว่า <strong>E 4/4</strong> ·
        <strong>E</strong> คือคีย์ (โด = เสียง E) · <strong>4/4</strong> คือห้องหนึ่งมี 4 จังหวะ
      </p>
      <p class="callout use-callout">
        <strong>อ่านยังไง:</strong> ครั้งแรกอ่านจากข้อ 1 ถึงข้อ 7 · เวลาเขียนเพลงจริง
        เปิด <a :href="'#/notation#write-to-result'">ข้อ 7 ตารางสรุป</a> ไว้ดูข้าง ๆ
      </p>
    </section>

    <!-- ===== §1 ===== -->
    <section class="card" id="roots" aria-labelledby="roots-h">
      <h2 id="roots-h" class="ns-h2">1 · ตัวเลขและจุด</h2>
      <p class="muted">
        ช่อง "พิมพ์" คือสิ่งที่พิมพ์ในหน้าแก้ไข · ช่อง "หน้าตา" คือที่เห็นบนแผ่นเพลง
      </p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางสัญลักษณ์ · เลื่อนซ้ายขวาได้">
        <table class="guide-table">
          <thead>
            <tr><th scope="col">พิมพ์</th><th scope="col">หน้าตา</th><th scope="col">ความหมาย</th></tr>
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

      <h3 class="ns-h3">ชาร์ป แฟลต เนเชอรัล — ระวังตรงนี้</h3>
      <p>
        ตัวเลขไม่ใช่ชื่อโน้ต แต่เป็น<strong>ลำดับเสียงในคีย์</strong> เวลาเปลี่ยนเสียง ให้คิดจากตัวเลข:
      </p>
      <ul>
        <li><code>#</code> = ตัวเลขนั้น<strong>สูงขึ้นครึ่งเสียง</strong></li>
        <li><code>b</code> = ตัวเลขนั้น<strong>ต่ำลงครึ่งเสียง</strong></li>
        <li><code>n</code> = <strong>ยกเลิก # หรือ b</strong> ที่เพิ่งใส่ในห้องเดียวกัน กลับไปเป็นตัวเลขธรรมดา</li>
      </ul>
      <p class="warn-box">
        ⚠️ <strong>พลาดบ่อย:</strong> <code>n</code> <strong>ไม่ได้แปลว่าโน้ตขาว</strong> แบบเปียโน<br />
        เช่น <strong>คีย์ A เลข 3 คือ C#</strong> อยู่แล้ว ใส่ <code>n3</code> ก็ยังได้ <strong>C#</strong> ไม่ใช่ C
      </p>
      <p>ถ้าอยากได้ <strong>C</strong> ในคีย์ A ให้เขียนแบบนี้:</p>
      <ul>
        <li><code>b3</code> = เลข 3 ต่ำลงครึ่งเสียง ได้ C <span class="muted">(ใช้ตอนทำนองเดินลง)</span></li>
        <li><code>#2</code> = เลข 2 สูงขึ้นครึ่งเสียง ได้ C <span class="muted">(ใช้ตอนทำนองเดินขึ้น)</span></li>
      </ul>

      <h3 class="ns-h3">ใส่หลายอย่างในโน้ตตัวเดียว</h3>
      <p>ใส่ได้หลายอย่างพร้อมกัน แต่ต้องพิมพ์<strong>ตามลำดับนี้</strong>:</p>
      <p><code># b n → จุดต่ำ . → ตัวเลข → จุดสูง ' → เส้นใต้ _ → จุดข้างหลัง .</code></p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางใส่หลายอย่างในโน้ตตัวเดียว · เลื่อนซ้ายขวาได้">
        <table class="guide-table">
          <thead>
            <tr><th scope="col">พิมพ์</th><th scope="col">หน้าตา</th><th scope="col">ความหมาย</th></tr>
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
      <p class="muted">ถ้ามีทั้งจุดต่ำและเส้นใต้ เว็บวางจุดไว้ใต้เส้นให้เอง</p>

      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> ตัวเลข จุด เส้นใต้ ขีด และ # b ครบตามที่พิมพ์</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> เสียงสูงต่ำตามคีย์ และยาวสั้นตามเส้นใต้ จุด และขีด</span>
      </p>
    </section>

    <!-- ===== §2 ===== -->
    <section class="card" id="rhythm" aria-labelledby="rhythm-h">
      <h2 id="rhythm-h" class="ns-h2">2 · จังหวะและห้อง</h2>
      <ul>
        <li><strong>4/4</strong> ในหัวเพลง = ห้องหนึ่งมี 4 จังหวะ · <strong>|</strong> = เส้นกั้นห้อง ·
          <strong>‖</strong> = จบเพลง</li>
        <li><strong>เว็บนับจังหวะให้ทุกห้อง</strong> · ครบขึ้น <strong>✓</strong> · ขาดหรือเกินขึ้น <strong>❌</strong></li>
        <li><strong>ห้องยก</strong> — เพลงที่เริ่มก่อนจังหวะแรก ห้องแรกจะสั้นได้
          และห้องสุดท้ายจะสั้นเติมให้ครบพอดี เว็บนับสองห้องนี้รวมกัน</li>
        <li><code>{1 2 3}</code> = โน้ต 3 ตัว ร้องในเวลาของ 2 ตัว</li>
      </ul>

      <h3 class="ns-h3">เส้นโค้ง 2 แบบ: ไท กับ เอื้อน</h3>
      <ul>
        <li><strong>ไท</strong> = โค้งเชื่อม<strong>เสียงเดียวกัน</strong> → ลากเป็นเสียงเดียว ไม่กดซ้ำ</li>
        <li><strong>เอื้อน</strong> = โค้งเชื่อม<strong>คนละเสียง</strong>ในคำเดียว → ได้ยินทุกโน้ต</li>
      </ul>
      <p>
        <strong>เขียนเอื้อน:</strong> พิมพ์โน้ต<strong>ติดกันในช่องเดียว ไม่เว้นวรรค</strong> แล้วใส่วงเล็บ
        เช่น <code>(65)</code> นับเป็น <strong>1 คำ</strong>
        <br /><span class="muted">⚠️ ถ้าเว้นวรรคหรือกด Enter จะขึ้นช่องใหม่ = คนละคำ ·
        <code>(6 5)</code> ที่มีช่องว่าง = 2 คำ</span>
      </p>
      <p>
        <strong>เขียนไท:</strong> พิมพ์ <code>~</code> <strong>ข้างหลัง</strong>โน้ตตัวแรก
        และ <code>~</code> <strong>ข้างหน้า</strong>โน้ตตัวถัดไป (คนละช่อง) เช่น <code>3~</code> แล้ว <code>~3</code>
        <br /><span class="muted">ใช้ได้ทั้งในห้องเดียวกันและข้ามห้อง</span>
      </p>

      <p class="muted ex-lbl">ตัวอย่างเอื้อน — คนละเสียงในช่องเดียว:</p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางตัวอย่างเอื้อน · เลื่อนซ้ายขวาได้">
        <table class="guide-table">
          <thead>
            <tr><th scope="col">พิมพ์</th><th scope="col">หน้าตา</th><th scope="col">ความหมาย</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>.6_ .7_</code></td>
              <td class="render-cell"><NoteRow notes=".6_ .7_" /></td>
              <td>2 คำ · เส้นใต้แยกกัน</td>
            </tr>
            <tr>
              <td><code>(.6_.7_)</code></td>
              <td class="render-cell"><NoteRow notes="(.6_.7_)" /></td>
              <td>คำเดียว · เอื้อนสั้นในจังหวะเดียว<strong>ไม่มีเส้นโค้ง</strong> เพราะเส้นใต้ที่ต่อกันบอกแล้ว
                (เส้นโค้งจะขึ้นเมื่อเอื้อนยาวเกิน 1 จังหวะ หรือเป็นเลขซ้ำ)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="muted ex-lbl">ตัวอย่างไท — เสียงเดียวกัน ข้ามห้อง:</p>
      <p class="tie-demo-line">
        <span class="tie-demo"><NoteRow notes="3~" /><span class="bar-line" style="height: 34px; margin-top: 2px" aria-hidden="true"></span><NoteRow notes="~3 - -" /></span>
      </p>
      <p class="muted">ตอนฟัง ตัวที่สอง (<code>~3</code>) ไม่กดใหม่ แต่ลากเสียงแรกต่อไปเลย</p>

      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> เส้นกั้นห้อง เส้นโค้ง วงเล็บโน้ต 3 ตัว</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ไท = ลากเสียงเดียวยาว · เอื้อน = คำเดียวหลายโน้ต · ห้องครบ = ดนตรีเล่นตรงจังหวะ</span>
      </p>
    </section>

    <!-- ===== §3 ===== -->
    <section class="card" id="form" aria-labelledby="form-h">
      <h2 id="form-h" class="ns-h2">3 · ท่อนและการซ้ำ</h2>
      <ul>
        <li><code>***</code> = จุดเริ่ม<strong>ท่อนรับ</strong></li>
        <li><strong>ป้าย</strong> เช่น <em>Fine</em> (จบตรงนี้) · <em>D.C. al Fine</em> (กลับไปต้นเพลง ร้องถึง Fine) ·
          <em>D.S.</em> (กลับไปที่เครื่องหมาย) · <em>Coda</em> (ท่อนปิดท้าย) — ขึ้นเป็นตัวเอียงเล็ก ๆ ท้ายบรรทัด</li>
        <li><strong>เล่นซ้ำ</strong> <code>‖:</code> … <code>:‖</code> = วนกลับไปร้องช่วงนี้อีกรอบ</li>
        <li><strong>จบรอบ 1 / รอบ 2</strong> <code>1.</code> <code>2.</code> = รอบแรกร้องห้อง 1. · รอบสองข้ามไปห้อง 2.</li>
        <li><strong>‖</strong> = จบเพลง</li>
      </ul>
      <p class="muted">
        ในหน้าแก้ไข ใส่การซ้ำได้ที่ปุ่ม <strong>⋯</strong> ของแต่ละห้อง (เล่นซ้ำ · วนกลับ · ห้องจบ)
      </p>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> ชื่อท่อน เส้นซ้ำ ป้าย 1. / 2. และเส้นจบ</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> จบวรรคมีหายใจ · ท่อนรับเสียงแน่นขึ้น · เล่นซ้ำตามลำดับจริง</span>
      </p>
    </section>

    <!-- ===== §4 ===== -->
    <section class="card" id="chords" aria-labelledby="chords-h">
      <h2 id="chords-h" class="ns-h2">4 · คอร์ด</h2>
      <p>คอร์ดดูได้ 2 แบบ (เลือกที่ ⚙ ตั้งค่า ในหน้าเพลง):</p>
      <ul>
        <li><strong>ตัวอักษร</strong> (C G Am)</li>
        <li><strong>เลขโรมัน</strong> (I IV V) — นับจากคีย์ เปลี่ยนคีย์แล้วไม่เปลี่ยน ·
          ใช้เลขโรมันเพราะ<strong>จะได้ไม่ปนกับตัวเลขโน้ต</strong></li>
      </ul>
      <p>อ่านเลขโรมันยังไง:</p>
      <ul>
        <li><strong>ตัวใหญ่ = เมเจอร์</strong> (I IV V)</li>
        <li><strong>ตัวเล็ก = ไมเนอร์</strong> (ii iii vi)</li>
        <li><strong>ตัวเล็กมี °</strong> = ดิมินิช (vii°)</li>
        <li><strong>มีเลข 7 ต่อท้าย</strong> = คอร์ดเซเว่น (V7)</li>
        <li><code>C/E</code> = คอร์ด C แต่เสียงเบสเป็น E</li>
      </ul>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> ชื่อคอร์ดอยู่เหนือโน้ต สลับตัวอักษรกับเลขโรมันได้</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ได้เสียงเบสและเสียงคลอตามคอร์ด</span>
      </p>
    </section>

    <!-- ===== §5 ===== -->
    <section class="card" id="lyrics" aria-labelledby="lyrics-h">
      <h2 id="lyrics-h" class="ns-h2">5 · เนื้อร้อง</h2>
      <ul>
        <li><strong>1 คำ = 1 โน้ต</strong> — วางคำไว้ใต้โน้ตตัวที่ร้อง</li>
        <li><strong>ไม่ต้องใส่คำ</strong>ใต้ขีด <code>-</code> ใต้ไท <code>~</code> และโน้ตเอื้อนตัวที่ 2 เป็นต้นไป
          เพราะเป็นการลากคำเดิม</li>
        <li>คำยาวที่แบ่งร้องหลายโน้ต ใส่ขีดคั่น เช่น <code>ส-ถิตย์</code></li>
        <li>เพลง 2 ภาษา ให้แยกเป็น <strong>2 แถว</strong> แถวละภาษา ไม่ใส่สองภาษาในช่องเดียว</li>
      </ul>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> คำอยู่ใต้โน้ตตรงตัว ไม่มีคำซ้ำตรงที่ลากเสียง</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> คำขึ้นสีทีละคำ ตรงกับโน้ตที่ร้อง</span>
      </p>
    </section>

    <!-- ===== §6 ===== -->
    <section class="card" id="house-rules" aria-labelledby="house-h">
      <h2 id="house-h" class="ns-h2">6 · กติกาของเรา</h2>
      <ul>
        <li><strong>คอร์ดใช้เลขโรมัน ไม่ใช้เลขธรรมดา</strong> — เลข 1 4 5 จะปนกับตัวเลขโน้ต</li>
        <li><code>***</code> = <strong>เริ่มท่อนรับ</strong> ตามหนังสือเพลงต้นฉบับ</li>
        <li><strong>หัวเพลงเขียนแบบ "E 4/4"</strong> — คีย์ก่อน เว้นวรรค แล้วตามด้วยจังหวะ</li>
        <li><strong>จุดต่ำอยู่ใต้เส้นใต้</strong> — เว็บจัดให้เอง</li>
      </ul>
      <p class="callout">
        <span class="c-sheet">🎵 <strong>ผลบนแผ่น:</strong> ทุกเพลงเขียนแบบเดียวกัน อ่านเพลงไหนก็เข้าใจทันที</span>
        <span class="c-play">▶ <strong>ผลตอนเล่น:</strong> ทุกเพลงได้เสียงดนตรีแบบเดียวกันทั้งเว็บ</span>
      </p>
    </section>

    <!-- ===== §7 ===== -->
    <section class="card flag-card" id="write-to-result" aria-labelledby="wtr-h">
      <h2 id="wtr-h" class="ns-h2">7 · ตารางสรุป: เขียนอะไร ได้อะไร <span class="star">⭐</span></h2>
      <p class="flag-lead">
        เขียนให้ถูก ไม่ใช่แค่แผ่นสวย แต่<strong>กดฟังแล้วเพราะ</strong>ด้วย
        เพราะเว็บเอาโน้ตไปเล่นเปียโนให้เอง · <strong>แถวที่มีสี</strong> = เปลี่ยนเสียงมากที่สุด
      </p>
      <div class="tbl-wrap" tabindex="0" role="region" aria-label="ตารางสรุป เขียนอะไร ได้อะไร · เลื่อนซ้ายขวาได้">
        <table class="guide-table map-table">
          <thead>
            <tr>
              <th scope="col">เขียน</th>
              <th scope="col">🎵 บนแผ่นเพลง</th>
              <th scope="col">▶ ตอนฟัง</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in MAP" :key="row[0]" :class="{ hot: row[3] }">
              <td><strong>{{ row[0] }}</strong></td>
              <td>{{ row[1] }}</td>
              <td>{{ row[2] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===== refs ===== -->
    <section class="card" aria-labelledby="refs-h">
      <h2 id="refs-h" class="ns-h2">อ่านเพิ่ม</h2>
      <ul class="muted refs">
        <li>
          <strong>โน้ตตัวเลข:</strong> "Numbered musical notation" ใน Wikipedia —
          <a href="https://en.wikipedia.org/wiki/Numbered_musical_notation" target="_blank" rel="noopener">
            en.wikipedia.org/wiki/Numbered_musical_notation</a>
        </li>
        <li>
          <strong>คอร์ดเลขโรมัน:</strong> Open Music Theory ·
          The Complete Musician — Steven G. Laitz
        </li>
        <li>
          <strong>สำหรับทีมทำเว็บ:</strong> <code>docs/song-model-v2.md</code> (เก็บเพลงยังไง) ·
          <code>docs/reports/golden-piano.md</code> (เล่นเปียโนยังไง)
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
