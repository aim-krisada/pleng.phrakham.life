<script setup>
import NoteRow from '../components/NoteRow.vue'

// Each row: [syntax to type, rendered example, meaning]
const SYMBOLS = [
  ['1 2 3 4 5 6 7', '1 2 3 4 5 6 7', 'ตัวเลข 1–7 = โด เร มี ฟา ซอล ลา ที (movable do — หัวเพลง "E 4/4" หมายถึง โด = เสียง E)'],
  ['0', '0', 'ตัวหยุด (rest) — เงียบตามค่าจังหวะของช่องนั้น'],
  ['.5', '.5', 'จุดใต้ตัวเลข = ต่ำลง 1 ช่วงเสียง (octave) · สองจุด ..5 = ต่ำลง 2 ช่วง'],
  ["5'", "5'", 'จุดบนตัวเลข = สูงขึ้น 1 ช่วงเสียง (พิมพ์ด้วยเครื่องหมาย \' ต่อท้าย)'],
  ['5_', '5_', 'เส้นใต้ 1 เส้น = ลดค่าโน้ตเหลือครึ่ง (เขบ็ต 1 ชั้น — เร็วขึ้นเท่าตัว)'],
  ['5__', '5__', 'เส้นใต้ 2 เส้น = เขบ็ต 2 ชั้น (เร็วขึ้น 4 เท่า)'],
  ['5.', '5.', 'จุดหลังตัวเลข = โน้ตประจุด เพิ่มค่าอีกครึ่งหนึ่งของโน้ตเดิม'],
  ['5 - - -', '5 - - -', 'ขีด = ยืดเสียงต่ออีก 1 จังหวะต่อ 1 ขีด (ตัวอย่างนี้คือเสียงยาว 4 จังหวะ)'],
  ['#4  b7', '#4 b7', 'ชาร์ป (สูงขึ้นครึ่งเสียง) / แฟลต (ต่ำลงครึ่งเสียง) หน้าตัวเลข'],
  ['(6 5)', '(6 5)', 'เส้นโค้ง (tie/slur) = ร้องคำเดียวลากเชื่อมหลายโน้ต'],
  ['{1 2 3}', '{1 2 3}', 'สามพยางค์ (triplet) = โน้ต 3 ตัวในเวลาของ 2 ตัว'],
]
</script>

<template>
  <div>
    <div class="card">
      <h2 style="margin-top: 0; color: var(--blue)">คู่มือโน้ตตัวเลข</h2>
      <p>
        เพลงในเว็บนี้บันทึกด้วย <strong>โน้ตตัวเลข</strong> (numbered notation /
        เจี่ยนผู่ 簡譜) — ระบบมาตรฐานสากลที่ใช้ในหนังสือเพลงของคริสตจักรทั่วโลก
        กำเนิดจากระบบ Galin-Paris-Chevé ของฝรั่งเศส และแพร่หลายผ่านหนังสือเพลงจีน
        หลักคิดคือ <strong>movable do</strong>: เลข 1 คือเสียง "โด" ของคีย์นั้น ๆ
        เพลงจึงย้ายคีย์ได้โดยตัวเลขไม่เปลี่ยนเลย
      </p>
      <p class="muted">
        คอลัมน์ "พิมพ์" คือสิ่งที่พิมพ์ในหน้า Studio · คอลัมน์ "แสดงผล" คือผลบนแผ่นเพลง
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
      <h3 style="margin-top: 0">สัญลักษณ์อื่นบนแผ่นเพลง</h3>
      <ul>
        <li><strong>|</strong> เส้นกั้นห้องเพลง (bar) · <strong>‖</strong> จบเพลง</li>
        <li><strong>***</strong> จุดเริ่มท่อนฮุก (ตามธรรมเนียมหนังสือเพลงเล่มนี้)</li>
        <li><strong>คอร์ดโรมัน</strong> (I, IV, V7, VIm) นับลำดับจากคีย์ของเพลง —
          กดปุ่ม "คอร์ดโรมัน" ในหน้าเพลงเพื่อสลับจากคอร์ดตัวอักษร
          (ใช้เลขโรมันเพื่อไม่ให้ปนกับตัวเลขโน้ตทำนอง)</li>
      </ul>
      <h3>ตัวอย่างรวมทุกสัญลักษณ์</h3>
      <p class="muted"><code>5. .5_ .5_ .6  |  (1' 7) 6  |  {3 2 1}  |  2 - - -  ‖</code></p>
      <p style="font-size: 20px"><NoteRow notes="5. .5_ .5_ .6" /> &nbsp;|&nbsp; <NoteRow notes="(1' 7) 6" /> &nbsp;|&nbsp; <NoteRow notes="{3 2 1}" /> &nbsp;|&nbsp; <NoteRow notes="2 - - -" /> &nbsp;‖</p>
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
.render-cell { font-size: 19px; color: var(--blue); white-space: nowrap; }
</style>
