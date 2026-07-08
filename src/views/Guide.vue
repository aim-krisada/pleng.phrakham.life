<script setup>
import NoteRow from '../components/NoteRow.vue'

// Each row: [syntax to type, rendered example, meaning]
const SYMBOLS = [
  ['1 2 3 4 5 6 7', '1 2 3 4 5 6 7', 'ตัวเลข 1–7 = โด เร มี ฟา ซอล ลา ที (movable do — หัวเพลง "E 4/4" หมายถึง โด = เสียง E)'],
  ['0', '0', 'ตัวหยุด (rest) — เงียบตามค่าจังหวะของช่องนั้น'],
  ['.5', '.5', 'จุดใต้ตัวเลข 1 จุด = ต่ำลง 1 ช่วงเสียง (octave) — พิมพ์ . นำหน้าตัวเลข'],
  ['..5', '..5', 'จุดใต้ 2 จุด = ต่ำลง 2 ช่วงเสียง (จุดวางเรียงอยู่ใต้ตัวเลข)'],
  ["5'", "5'", "จุดบนตัวเลข 1 จุด = สูงขึ้น 1 ช่วงเสียง — พิมพ์ ' ต่อท้ายตัวเลข"],
  ["5''", "5''", 'จุดบน 2 จุด = สูงขึ้น 2 ช่วงเสียง (จุดวางเรียงอยู่เหนือตัวเลข)'],
  ['5_', '5_', 'เส้นใต้ 1 เส้น = เขบ็ต 1 ชั้น (eighth note) — ลดค่าโน้ตเหลือครึ่ง เร็วขึ้นเท่าตัว'],
  ['5__', '5__', 'เส้นใต้ 2 เส้น = เขบ็ต 2 ชั้น (sixteenth note) — เร็วขึ้น 4 เท่า'],
  ['5.', '5.', 'จุดหลังตัวเลข = โน้ตประจุด (dotted note) เพิ่มค่าอีกครึ่งหนึ่งของโน้ตเดิม'],
  ['5 - - -', '5 - - -', 'ขีด = ยืดเสียงต่ออีก 1 จังหวะต่อ 1 ขีด (ตัวอย่างนี้คือเสียงยาว 4 จังหวะ)'],
  ['#4', '#4', 'ชาร์ป (sharp ♯) = สูงขึ้นครึ่งเสียง — พิมพ์ # หน้าตัวเลข'],
  ['b7', 'b7', 'แฟลต (flat ♭) = ต่ำลงครึ่งเสียง — พิมพ์ b หน้าตัวเลข'],
  ['n4', 'n4', 'เนเชอรัล (natural ♮) = ยกเลิกชาร์ป/แฟลต กลับมาเป็นเสียงปกติของตัวเลขนั้น — พิมพ์ n หน้าตัวเลข'],
  ['(6 5)', '(6 5)', 'เส้นโค้งด้านบน = สลัวร์ (slur) — ร้องคำเดียวลากหลายโน้ต (เอื้อน) ได้ยินทุกโน้ต · ใช้กับโน้ตแบบไหนก็ได้ (ดูหัวข้อสลัวร์ด้านล่าง)'],
  ['{1 2 3}', '{1 2 3}', 'สามพยางค์ (triplet) = โน้ต 3 ตัวในเวลาของ 2 ตัว'],
  ['3^', '3^', 'เฟอร์มาตา (fermata — โค้งมีจุดเหนือโน้ต) = ยืดเสียงยาวกว่าปกติ ตามผู้นำเพลง — ตอนกดฟัง เสียงจะลากยาวขึ้นให้'],
]

// Combined symbols — order: [#/b/n] [.]low digit [']high [_]underline [.]dot
const COMBOS = [
  ['.5_', '.5_', 'จุดใต้ (ต่ำ 1 ช่วงเสียง) + เส้นใต้ 1 เส้น (เขบ็ต 1 ชั้น)'],
  ['..5__', '..5__', 'ต่ำ 2 ช่วงเสียง + เขบ็ต 2 ชั้น'],
  ["5'.", "5'.", 'โน้ตสูง + โน้ตประจุด'],
  ['.5_.', '.5_.', 'ต่ำ + เขบ็ต + ประจุด (ครบสามอย่างในตัวเดียว)'],
  ['#.4_', '#.4_', 'ชาร์ป + ต่ำ + เขบ็ต'],
  ["(.6_ 5'_)", "(.6_ 5'_)", 'เส้นโค้งครอบโน้ตผสม — ทุกอย่างซ้อนกันได้'],
]
</script>

<template>
  <div>
    <div class="card">
      <h2 style="margin-top: 0">คู่มือ</h2>
      <p style="margin-bottom: 0">
        มี 2 เรื่อง: <a href="#/guide#notation">① วิธีอ่านโน้ตตัวเลข</a> ·
        <a href="#/guide#howto">② วิธีใช้เว็บนี้</a>
      </p>
    </div>

    <div class="card" id="notation">
      <h2 style="margin-top: 0">① วิธีอ่านโน้ตตัวเลข</h2>
      <p>
        เพลงในเว็บนี้เขียนด้วย <strong>โน้ตตัวเลข</strong> (numbered notation) —
        เป็นระบบหนึ่งที่หนังสือเพลงคริสตจักรหลายเล่มนิยมใช้ (บางเล่มใช้โน้ตบรรทัด
        5 เส้นแบบสากล หรือระบบอื่นก็มี) ต้นทางมาจากฝรั่งเศส จีนนำไปใช้จนแพร่หลาย
        เรียกว่า "เจี่ยนผู่ 簡譜" หลักง่าย ๆ คือ เลข 1 = เสียง "โด" ของคีย์เพลงนั้น
        ส่วนหัวเพลงเขียนแบบ "E 4/4" — <strong>E</strong> คือคีย์ (โด = เสียง E) ·
        <strong>4/4</strong> คือเครื่องหมายกำหนดจังหวะ (time signature) บอกว่า
        1 ห้องมีกี่จังหวะ ข้อดีของโน้ตตัวเลขคือย้ายคีย์เพลงได้โดยตัวเลขไม่ต้องเปลี่ยนเลย
      </p>
      <p class="muted">
        คอลัมน์ "พิมพ์" คือสิ่งที่พิมพ์ในห้องทำเพลง · คอลัมน์ "แสดงผล" คือผลบนแผ่นเพลง
      </p>
    </div>

    <div class="card" style="overflow-x: auto">
      <table class="guide-table">
        <thead>
          <tr><th>พิมพ์</th><th>แสดงผล</th><th>ความหมาย</th></tr>
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

    <div class="card">
      <h3 style="margin-top: 0">การผสมสัญลักษณ์</h3>
      <p>
        สัญลักษณ์ทุกตัวซ้อนกันได้ในโน้ตตัวเดียว — พิมพ์ตาม<strong>ลำดับ</strong>นี้เสมอ:
      </p>
      <p><code>[# / b / n] → [.] จุดต่ำ → ตัวเลข → ['] จุดสูง → [_] เส้นใต้ → [.] ประจุด</code></p>
      <div style="overflow-x: auto">
        <table class="guide-table">
          <thead>
            <tr><th>พิมพ์</th><th>แสดงผล</th><th>ความหมาย</th></tr>
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
        ตามมาตรฐานโน้ตตัวเลข จุดบอกช่วงเสียงต่ำจะอยู่<strong>ใต้เส้นใต้</strong>อีกชั้นหนึ่ง —
        ระบบจัดให้อัตโนมัติ
      </p>
      <h3>เสียงเอื้อน — สลัวร์ (slur)</h3>
      <p>
        <strong>สลัวร์</strong> คือ<strong>เส้นโค้งด้านบน</strong>ที่คลุมโน้ตหลายตัว
        หมายถึงร้องคำเดียวลากหลายเสียง (เอื้อน) — ตอนกดฟังจะ<strong>ได้ยินทุกโน้ต</strong> ·
        ใช้กับโน้ต<strong>แบบไหนก็ได้</strong> (เขบ็ต 1 ชั้น, 2 ชั้น, หรือโน้ตธรรมดา)
      </p>
      <p>
        สำคัญ: ถ้าโน้ตในสลัวร์เป็น<strong>เขบ็ต</strong> เส้นใต้ของแต่ละตัวจะ<strong>ยังแยกกัน</strong>
        (ไม่ต่อเป็นเส้นเดียว) เพื่อให้เห็นว่าเป็นเขบ็ตคนละตัว — สลัวร์บอกแค่การเอื้อน
        ไม่เกี่ยวกับเส้นใต้ · วิธีพิมพ์: ใส่<strong>วงเล็บครอบ</strong>โน้ตที่ต้องการ:
      </p>
      <div style="overflow-x: auto">
        <table class="guide-table">
          <thead>
            <tr><th>พิมพ์</th><th>แสดงผล</th><th>ความหมาย</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>.6_ .7_</code></td>
              <td class="render-cell"><NoteRow notes=".6_ .7_" /></td>
              <td>สองพยางค์ ไม่มีสลัวร์ — เส้นใต้แยกกัน มีช่องไฟ</td>
            </tr>
            <tr>
              <td><code>(.6_ .7_)</code></td>
              <td class="render-cell"><NoteRow notes="(.6_ .7_)" /></td>
              <td>เอื้อนคำเดียว — มีเส้นโค้งด้านบน แต่เส้นใต้<strong>ยังแยกกันคนละตัว</strong> (ยังเป็นเขบ็ต 2 ตัว)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>เสียงลากต่อ — ไท (tie) <code>~</code></h3>
      <p>
        <strong>ไท</strong> เชื่อมโน้ต<strong>เสียงเดียวกัน 2 ตัว</strong> ให้ลากต่อเป็นเสียงเดียว
        กี่จังหวะก็ได้ — ตอนกดฟังจะ<strong>ไม่ดีดซ้ำ</strong>
        (ต่างจากสลัวร์ที่เป็นคนละเสียงและได้ยินทุกโน้ต) · ใช้ได้ทั้ง<strong>ในห้องเดียวกัน</strong>
        และ<strong>ข้ามเส้นกั้นห้อง</strong> · วิธีพิมพ์: ใส่ <code>~</code> <strong>ท้าย</strong>โน้ตตัวแรก
        และ <code>~</code> <strong>หน้า</strong>โน้ตตัวรับ (ตัวอย่างข้ามห้อง เช่น "น้ำ" ในเพลงที่ 1
        ตัวรับอยู่ห้องถัดไป):
      </p>
      <div style="overflow-x: auto">
        <table class="guide-table">
          <thead>
            <tr><th>พิมพ์</th><th>แสดงผล</th><th>ความหมาย</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>3~</code></td>
              <td class="render-cell"><NoteRow notes="3~" /></td>
              <td>โน้ตต้นเสียง (ตัวสุดท้ายของห้องแรก) — เส้นโค้งเปิดไปทางขวา</td>
            </tr>
            <tr>
              <td><code>~3 - -</code></td>
              <td class="render-cell"><NoteRow notes="~3 - -" /></td>
              <td>โน้ตรับเสียง (ตัวแรกของห้องถัดไป) — เส้นโค้งรับจากทางซ้าย</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        บนแผ่นเพลงจริงสองตัวนี้จะอยู่คนละฝั่งของเส้นกั้นห้อง:
        <span class="tie-demo"><NoteRow notes="3~" /><span class="bar-line" style="height: 34px; margin-top: 2px" aria-hidden="true"></span><NoteRow notes="~3 - -" /></span>
      </p>
      <p class="muted">
        แบบเดียวกับหนังสือเพลงตอนตัดบรรทัด · ตอนกดฟังทำนอง โน้ตตัวรับ (<code>~3</code>)
        จะ<strong>ไม่ดีดเสียงใหม่</strong> แต่ลากเสียงตัวแรกต่อเนื่องเป็นเสียงเดียว
      </p>
    </div>

    <div class="card">
      <h3 style="margin-top: 0">สัญลักษณ์อื่นบนแผ่นเพลง</h3>
      <ul>
        <li><strong>|</strong> เส้นกั้นห้องเพลง (bar) · <strong>‖</strong> จบเพลง</li>
        <li><strong>***</strong> จุดเริ่มท่อนฮุก (ตามธรรมเนียมหนังสือเพลงเล่มนี้)</li>
        <li><strong>ข้อความกำกับ</strong> เช่น <em>Fine</em> (จุดจบเพลง) หรือ
          <em>D.C. al Fine</em> (กลับไปเล่นจากต้นเพลงจนถึง Fine) —
          ในห้องทำเพลง พิมพ์ลงช่อง "ป้าย" ของบรรทัดนั้น
          ข้อความจะแสดงตัวเอียงเล็ก ๆ ท้ายบรรทัดเหมือนหนังสือ</li>
        <li><strong>คอร์ดโรมัน</strong> นับลำดับจากคีย์ของเพลง — กดปุ่ม "คอร์ดโรมัน"
          ในหน้าเพลงเพื่อสลับจากคอร์ดตัวอักษร (ใช้เลขโรมันเพื่อไม่ให้ปนกับตัวเลขโน้ตทำนอง)
          ตัวพิมพ์บอกชนิดคอร์ดตามมาตรฐานสากล:
          <strong>ตัวใหญ่ = Major</strong> (I, IV, V) ·
          <strong>ตัวเล็ก = minor</strong> (ii, iii, vi) ·
          <strong>ตัวเล็ก + ° = diminished</strong> (vii°) ·
          เลข 7 ต่อท้าย = คอร์ดเซเว่น (V7, ii7)
          <br /><span class="muted">อ้างอิง: Open Music Theory (ตำราเปิดระดับมหาวิทยาลัย) ·
          The Complete Musician — Steven G. Laitz (Oxford University Press)</span></li>
      </ul>
      <h3>ตัวอย่างรวมทุกสัญลักษณ์</h3>
      <p class="muted"><code>5. .5_ .5_ .6  |  (1' 7) 6  |  {3 2 1}  |  2 - - -  ‖</code></p>
      <p class="symbol-demo"><NoteRow notes="5. .5_ .5_ .6" /><span class="bar-line demo-bar" aria-hidden="true"></span><NoteRow notes="(1' 7) 6" /><span class="bar-line demo-bar" aria-hidden="true"></span><NoteRow notes="{3 2 1}" /><span class="bar-line demo-bar" aria-hidden="true"></span><NoteRow notes="2 - - -" /><span class="bar-line demo-bar demo-bar-end" aria-hidden="true"></span><span class="bar-line demo-bar demo-bar-final" aria-hidden="true"></span></p>
    </div>

    <div class="card" id="howto">
      <h2 style="margin-top: 0">② วิธีใช้เว็บนี้</h2>

      <h3 id="howto-list">หาเพลง (หน้ารายการเพลง)</h3>
      <p>
        พิมพ์อะไรก็ได้ในช่องค้นหา — ชื่อเพลง เลขเพลง ท่อนเนื้อร้อง คีย์
        หรือแม้แต่ตัวเลขโน้ตที่จำได้ (เช่น 5 5 6 1) แล้วกดเพลงที่ต้องการ
      </p>

      <h3 id="howto-song">อ่านและฟังเพลง (หน้าเพลง)</h3>
      <ul>
        <li><strong>เนื้อร้องล้วน</strong> — สลับโหมดเพื่อดูเนื้ออย่างเดียวตัวโต ๆ เหมาะกับคนร้อง</li>
        <li><strong>คอร์ดโรมัน</strong> — เปลี่ยนคอร์ด C, G, Am เป็นเลขโรมัน I, V, VIm สำหรับนักดนตรีที่นับตามลำดับคีย์</li>
        <li><strong>คีย์</strong> — เลือกคีย์ใหม่ คอร์ดทุกตัวเปลี่ยนให้เองทันที (เช่น ผู้นำขอลดจาก G เป็น F)</li>
        <li><strong>▶ ฟังทำนอง</strong> — เว็บเล่นเสียงโน้ตให้ฟังเพื่อฝึกร้อง เลือกความเร็วได้ กด "วนซ้ำ" เพื่อซ้อมต่อเนื่อง</li>
        <li><strong>ดาวน์โหลด/พิมพ์</strong> — ปุ่มลูกศรลง (มุมขวาบน) พิมพ์เป็นกระดาษ A4 หรือบันทึกเป็น PDF ได้
          <br>เพื่อให้แผ่นสวยเรียบร้อย ในกล่องพิมพ์ให้ <strong>ปิด "หัวกระดาษและท้ายกระดาษ" (Headers and footers)</strong> —
          เว็บใส่ชื่อเพลง ชื่อเว็บ เลขหน้า และวันที่ให้เองครบแล้ว</li>
      </ul>

      <h3 id="howto-studio">คีย์เพลงใหม่ (ห้องทำเพลง)</h3>
      <ul>
        <li>เพลงแบ่งเป็น <strong>บรรทัด → ห้อง → ช่อง</strong>: 1 ช่องเล็ก = โน้ต 1 ตัว
          กด Enter หรือเว้นวรรคเพื่อไปช่องถัดไป กดลูกศรซ้าย-ขวาเพื่อเลื่อน</li>
        <li>ใช้<strong>แผงปุ่มสัญลักษณ์</strong>ที่แถบล่างจอ (เลื่อนไปไหนก็ตามไปด้วย):
          แตะช่องโน้ตก่อน แล้วจิ้มสัญลักษณ์ที่ต้องการ — ชาร์ป/แฟลต จิ้มก่อนหรือหลังพิมพ์เลขก็ได้</li>
        <li>ระบบ<strong>นับจังหวะให้ทุกห้อง</strong> — ถ้าขึ้น ❌ แปลว่าโน้ตในห้องนั้นยังไม่ครบ
          หรือเกินจังหวะของเพลง (ห้องแรกของท่อนอาจไม่เต็มห้องได้ เป็นเรื่องปกติ)</li>
        <li>กด <strong>▶ ฟังบรรทัดนี้</strong> เพื่อเช็คด้วยหูว่าคีย์ถูกไหม —
          ตอนเล่น ห้องที่กำลังดังจะสว่างขึ้นและจอเลื่อนตามให้เอง</li>
        <li>พลาดตรงไหน กด <strong>↩ เลิกทำ</strong> (หรือ Ctrl+Z) ย้อนกลับได้ทีละขั้น</li>
        <li>ถ้าหนังสือตัดห้องเดียวขึ้นบรรทัดใหม่ (เช่นก่อนท่อนฮุก) ให้ติ๊ก
          <strong>⤷ ต่อห้องจากบรรทัดก่อน</strong> ที่บรรทัดใหม่ —
          ระบบจะนับจังหวะสองท่อนนั้นรวมเป็นห้องเดียวให้ถูกต้อง</li>
        <li>ทีมงานที่เข้าสู่ระบบแล้ว: กด "บันทึกร่าง" เก็บงานไว้ก่อน แล้ว "ส่งตรวจ"
          เมื่อพร้อม — เพลงจะขึ้นเว็บเมื่อผู้ตรวจอนุมัติ</li>
        <li><strong>ไม่มีบัญชีก็ช่วยได้</strong> — ทำเพลงเสร็จ ส่งให้ทีมนำขึ้นคลังได้ 4 ขั้น:
          <ol>
            <li>คีย์เพลงให้เสร็จ</li>
            <li>กด <strong>"ดาวน์โหลด JSON"</strong> — ได้ไฟล์สำเนางานของคุณ
              (เว็บไม่ได้เก็บงานไว้ให้ เปิดกลับมาแก้ต่อได้ด้วย "อัปโหลด JSON")</li>
            <li>ส่งอีเมลถึงทีม <strong>พร้อมแนบไฟล์ JSON</strong> ที่ได้มา
              <!-- TODO(P'Aim): ใส่อีเมลทีมจริง แล้วแทนที่ข้อความ placeholder นี้ --></li>
            <li>ทีมตรวจแล้วนำขึ้นคลังให้</li>
          </ol>
        </li>
      </ul>
    </div>

    <div class="card">
      <h3 style="margin-top: 0">แหล่งอ้างอิง</h3>
      <p class="muted" style="margin-bottom: 0">
        เนื้อหาวิธีอ่านโน้ตตัวเลขในหน้านี้ อ้างอิงตามหลักสากลจาก:
      </p>
      <ul class="muted refs">
        <li>
          <strong>ระบบโน้ตตัวเลข (โน้ตตัวเลข / เจี่ยนผู่ 簡譜):</strong>
          "Numbered musical notation", Wikipedia —
          <a href="https://en.wikipedia.org/wiki/Numbered_musical_notation" target="_blank" rel="noopener">
            en.wikipedia.org/wiki/Numbered_musical_notation</a>
          (กฎเรื่องตัวเลข-ขั้นเสียง · จุดช่วงเสียง · เส้นเขบ็ต/การรวมคาน · เครื่องหมายชาร์ป-แฟลต-เนเชอรัล ·
          สลัวร์-ไท · เครื่องหมายกำหนดจังหวะ · ความเป็นมา)
        </li>
        <li>
          <strong>ทฤษฎีคอร์ดโรมัน:</strong>
          Open Music Theory (ตำราเปิดระดับมหาวิทยาลัย) ·
          The Complete Musician — Steven G. Laitz (Oxford University Press)
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.guide-table { width: 100%; border-collapse: collapse; }
.guide-table th, .guide-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}
.guide-table code {
  background: #edf2f7;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.render-cell { font-size: 19px; color: var(--note-blue); white-space: nowrap; padding-top: 16px !important; }
.tie-demo {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 20px;
  color: var(--note-blue);
  padding: 10px 6px 0;
}
/* Combined-symbols example: bars auto-match the note-row height (align-items:
   stretch) so they sit flush like the real sheet instead of floating short. */
.symbol-demo { font-size: 20px; display: flex; align-items: stretch; flex-wrap: wrap; }
.symbol-demo .demo-bar { height: auto; align-self: stretch; margin: 0 10px; }
.symbol-demo .demo-bar-end { margin-right: 0; }   /* end double bar sits tight */
.symbol-demo .demo-bar-final { margin-left: 3px; }
.refs { margin: 8px 0 0; padding-left: 20px; }
.refs li { margin-bottom: 8px; }
.refs a { word-break: break-word; }
</style>
