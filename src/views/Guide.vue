<script setup>
// คู่มือใช้งานโปรแกรม (/#/guide) — for people who OPEN the site to read / sing / print.
// It keeps ② "วิธีใช้เว็บนี้" (full) + a SHORT note-reading intro (just enough to sing along).
// The detailed writing rules (symbol tables, accidentals trap, tie/slur, combos, references)
// moved to the song-makers' page "มาตรฐานการเขียนโน้ต" (/#/notation) — a bridge box links there.
import NoteRow from '../components/NoteRow.vue'
import Icon from '../components/Icon.vue'
</script>

<template>
  <div class="reading-page">
    <div class="card">
      <h2 style="margin-top: 0">คู่มือ</h2>
      <p style="margin-bottom: 0">
        มี 2 เรื่อง: <a href="#/guide#notation">① อ่านโน้ตตัวเลขเบื้องต้น</a> ·
        <a href="#/guide#howto">② วิธีใช้เว็บนี้</a>
      </p>
    </div>

    <!-- ① SHORT note intro — "อ่านออกพอร้อง", not "เขียนเป็น". The full writing standard lives
         on /#/notation. #notation anchor kept so old links still land here. -->
    <div class="card" id="notation">
      <h2 style="margin-top: 0">① อ่านโน้ตตัวเลขเบื้องต้น</h2>
      <p>
        เพลงในเว็บนี้เขียนด้วย <strong>โน้ตตัวเลข</strong> (numbered notation) — พออ่านออกก็ร้องตามได้
        โดยไม่ต้องอ่านโน้ตห้าเส้น หลักสั้น ๆ มีเท่านี้:
      </p>
      <ul>
        <li><strong>1–7 = โด เร มี ฟา ซอล ลา ที</strong> (โด = เสียงตามคีย์ในหัวเพลง เช่น "E 4/4" คือ โด = E)</li>
        <li><strong>จุด</strong> ใต้/บนตัวเลข = เสียงต่ำ/สูงลง-ขึ้น 1 ช่วงเสียง (octave)</li>
        <li><strong>ขีด <code>-</code></strong> = ลากเสียงยาวต่อ · <strong>เส้นใต้</strong>ตัวเลข = โน้ตเร็วขึ้น (เขบ็ต)</li>
        <li><strong>𝄐</strong> เหนือตัวเลข = <strong>หน่วงเสียง</strong> (เฟอร์มาต้า) — ลากตัวนั้นยาวกว่าปกติ
          ยาวเท่าไรแล้วแต่ผู้นำเพลงจะพา</li>
        <li><strong><code>|</code></strong> = เส้นกั้นห้อง · <strong><code>***</code></strong> หรือป้ายท่อน = จุดเริ่มท่อนรับ / ท่อนใหม่</li>
      </ul>
      <p class="muted" style="margin-bottom: 4px">ตัวอย่าง (อ่านออกพอร้อง):</p>
      <p class="intro-demo"><NoteRow notes="5 5 6 5 1' 7" /><span class="bar-line demo-bar" aria-hidden="true"></span><NoteRow notes="5 - - -" /></p>

      <p class="bridge-box">
        <Icon name="pencil" :size="20" class="bridge-ico" />
        <span>
          <strong>เป็นคนทำเพลง?</strong> วิธี<strong>เขียน</strong>โน้ตให้ถูกมาตรฐานเดียวกันทั้งคลัง
          (สัญลักษณ์ครบ · จังหวะ · โครงเพลง · คอร์ด · เนื้อร้อง) อยู่ที่
          <a href="#/notation">คู่มือทำเพลง — มาตรฐานการเขียนโน้ต →</a>
        </span>
      </p>
    </div>

    <div class="card" id="howto">
      <h2 style="margin-top: 0">② วิธีใช้เว็บนี้</h2>
      <p class="muted">
        เมนูไปหน้าต่าง ๆ (รายการเพลง · คู่มือ · เกี่ยวกับเรา) อยู่ด้านบน — บนมือถือกดปุ่ม
        <strong>☰</strong> มุมขวาบนเพื่อเปิดเมนู ในเมนูยังเลือก<strong>แบบตัวอักษรไทย</strong>
        (มีหัว / ไม่มีหัว) ได้ตามชอบ
      </p>

      <h3 id="howto-list" class="howto-h"><Icon name="list-music" :size="22" class="howto-ico" />หาเพลง (หน้ารายการเพลง)</h3>
      <p>
        พิมพ์อะไรก็ได้ในช่องค้นหา — ชื่อเพลง เลขเพลง ท่อนเนื้อร้อง คีย์
        หรือแม้แต่ตัวเลขโน้ตที่จำได้ (เช่น 5 5 6 1) แล้วกดเพลงที่ต้องการ
        หรือจะเลือกดูตามเล่มหนังสือต้นทางก็ได้
      </p>

      <h3 id="howto-song" class="howto-h"><Icon name="circle-play" :size="22" class="howto-ico" />อ่านและฟังเพลง (หน้าเพลง)</h3>
      <p>
        เปิดเพลงแล้วจะเห็น<strong>แผ่นเพลง</strong>อยู่กลางจอ และมี<strong>แถบเครื่องเล่น</strong>ลอยอยู่ล่างจอ
        (เลื่อนหน้าไปไหนก็ตามไปด้วย) ปุ่มควบคุมทุกอย่างอยู่ที่แถบนี้ — กด
        <strong>⚙ ตั้งค่า</strong> เพื่อเปิดรายการปุ่มทั้งหมด และปักปุ่มที่ใช้บ่อยขึ้นมาบนแถบได้
      </p>

      <h4 class="howto-h"><Icon name="volume-2" :size="20" class="howto-ico" />เมนู "เสียงดนตรี"</h4>
      <p>
        กดปุ่มเสียงดนตรีบนแถบเครื่องเล่นเพื่อเลือกว่าจะให้เว็บเล่นเสียงแบบไหน — รวมไว้ในปุ่มเดียว:
      </p>
      <ul>
        <li><strong>เสียงที่เล่น</strong> — ทำนองอย่างเดียว · คอร์ดอย่างเดียว · หรือทำนอง+คอร์ด</li>
        <li><strong>การบรรเลง</strong> — เดี่ยว (เครื่องเดียว) หรือเต็มวง (เปียโนนำ)</li>
        <li><strong>เครื่องดนตรี</strong> — เปียโน หรือ กีตาร์ (เครื่องอื่นกำลังทยอยเปิดเพิ่ม)</li>
        <li><strong>อารมณ์ / สไตล์</strong> — บรรเลง (จัดเต็ม) · สงบ (นุ่ม) · หรือ ตรงโน้ต (ปิดลูกเล่น เล่นตามโน้ตเป๊ะ ๆ)</li>
        <li><strong>ปรับละเอียด</strong> — สำหรับเปียโน เปิด/ปิดลูกเล่นการเรียบเรียงทีละอย่างได้ ถ้าอยากลองเสียงเอง</li>
      </ul>
      <p class="muted" style="margin-top: 0">
        ปกติเว็บตั้งค่าเสียงที่เพราะให้อยู่แล้ว — <strong>เปียโนบรรเลง</strong>ที่เว็บเรียบเรียงให้เองอัตโนมัติ
        (เล่นทำนองพร้อมเสียงคลอ ผ่อนหนักเบา และหายใจปลายวรรคเหมือนคนเล่นจริง) ไม่ต้องตั้งอะไรก็ฟังได้เลย
      </p>

      <ul>
        <li><strong>▶ ฟังทำนอง</strong> — กดเล่นเพื่อฝึกร้อง · ปรับ<strong>ความเร็ว</strong>ได้ · เปิด <strong>"วนซ้ำ"</strong>
          เพื่อซ้อมต่อเนื่อง · ระหว่างเล่นคำที่กำลังร้องจะ<strong>ไฮไลต์ทีละพยางค์</strong>แบบคาราโอเกะ
          และจอเลื่อนตามให้เอง · แตะที่<strong>แถบเวลา</strong>เพื่อกระโดดไปจุดที่ต้องการ
          หรือกด <strong>เลือกท่อน</strong> เพื่อฟังเฉพาะบางท่อน</li>
        <li><strong>คีย์</strong> — เลือกคีย์ใหม่ คอร์ดทุกตัวเปลี่ยนให้เองทันที (เช่น ผู้นำขอลดจาก G เป็น F)</li>
        <li><strong>คอร์ดโรมัน</strong> — สลับคอร์ดตัวอักษร (C G Am) เป็นเลขโรมันตามลำดับขั้นในคีย์ (I IV V)
          สำหรับนักดนตรีที่นับตามลำดับ (อยู่ในเมนู ⚙ ตั้งค่า › คอร์ด)</li>
        <li><strong>เนื้อร้องล้วน</strong> — เลือกโหมดแสดงผลเป็นเนื้ออย่างเดียวตัวโต ๆ เหมาะกับคนร้อง (⚙ ตั้งค่า › แสดงผล)</li>
        <li><strong>ขนาดตัวอักษร (Aa)</strong> — ปรับตัวหนังสือให้ใหญ่-เล็กตามสายตา</li>
        <li><strong>ดาวน์โหลด / พิมพ์</strong> — กดปุ่มลูกศรลงบนแถบเครื่องเล่น เลือกได้ 3 แบบ:
          <strong>พิมพ์ / บันทึก PDF (A4)</strong> · <strong>ข้อมูลเพลง (JSON)</strong> ·
          และ<strong>ไฟล์เสียง MP3</strong> (เสียงเปียโนจริงตามคีย์และความเร็วที่ตั้งไว้)
          <br>เวลาพิมพ์ เพื่อให้แผ่นสวยเรียบร้อย ในกล่องพิมพ์ให้ <strong>ปิด "หัวกระดาษและท้ายกระดาษ" (Headers and footers)</strong> —
          เว็บใส่ชื่อเพลง ชื่อเว็บ เลขหน้า และวันที่ให้เองครบแล้ว</li>
      </ul>
      <p class="muted" style="margin-bottom: 0">
        ทุกเพลงในคลังผ่านการตรวจจากทีมงานแล้ว (ทีมงานที่เข้าสู่ระบบจะเห็นป้าย
        <span class="verified-eg"><Icon name="badge-check" :size="14" />✓ ตรวจแล้ว</span> กำกับไว้ว่าเพลงไหนตรวจเสร็จ)
      </p>

      <h3 id="howto-studio" class="howto-h"><Icon name="file-plus" :size="22" class="howto-ico" />คีย์เพลง (ห้องทำเพลง)</h3>
      <ul>
        <li>เพลงแบ่งเป็น <strong>บรรทัด → ห้อง → ช่อง</strong>: 1 ช่องเล็ก = โน้ต 1 ตัว = 1 คำ
          กด Enter หรือเว้นวรรคเพื่อไปช่องถัดไป กดลูกศรซ้าย-ขวาเพื่อเลื่อน
          <br /><span class="muted">ยกเว้น<strong>เอื้อน</strong> (ร้องคำเดียวหลายโน้ต): พิมพ์โน้ตติดกันในช่องเดียว
          ไม่เว้นวรรค แล้วครอบวงเล็บ เช่น <code>(65)</code> — ดู<a href="#/notation#rhythm">คู่มือทำเพลง</a></span></li>
        <li><strong>แผง "โครงเพลง"</strong> = รายชื่อท่อนทั้งหมดของเพลง ใช้กดสลับไปแก้ท่อนไหนก็ได้
          และจัดลำดับท่อนใหม่ได้ — กดที่หัวข้อ <strong>โครงเพลง</strong> (มีลูกศร ▾ อยู่ข้างหน้า)
          เพื่อ<strong>ยุบหรือขยาย</strong>ได้ทุกขนาดจอ ปกติเปิดไว้ให้ ส่วนหัวข้อ
          <strong>"ทำนอง (โน้ต)"</strong> ที่อยู่ถัดลงมาปกติจะยุบไว้ กดเปิดได้เหมือนกัน
          <br /><span class="muted">บน<strong>แท็บเล็ตและมือถือ</strong> (จอกว้างไม่เกิน 900 พิกเซล)
          แผงนี้จะเก็บเป็น<strong>ลิ้นชักที่เลื่อนออกมา</strong> ไม่กินพื้นที่หน้าจอ —
          แตะ<strong>ชื่อท่อนที่แถบด้านบน</strong>ของโต๊ะแก้เพื่อเปิดลิ้นชัก เลือกหรือจัดท่อนเสร็จแล้วกด
          <strong>✕</strong> (หรือแตะนอกลิ้นชัก) เพื่อปิด — ช่องคีย์โน้ตจะได้ใช้พื้นที่เต็มจอ
          ส่วนจอคอมพิวเตอร์กว้าง ๆ แผงยังปักอยู่ข้างซ้ายเหมือนเดิม</span></li>
        <li>ใช้<strong>แผงปุ่มสัญลักษณ์</strong>ที่แถบล่างจอ (เลื่อนไปไหนก็ตามไปด้วย):
          แตะช่องโน้ตก่อน แล้วจิ้มสัญลักษณ์ที่ต้องการ — ชาร์ป/แฟลต จิ้มก่อนหรือหลังพิมพ์เลขก็ได้</li>
        <li><strong>หน่วงเสียง (เฟอร์มาต้า 𝄐)</strong> — โน้ตตัวไหนอยากให้ลากยาวกว่าปกติ
          (มักเป็นตัวสุดท้ายของท่อน) ให้แตะช่องโน้ตนั้น แล้วจิ้มปุ่ม <code>^</code> ในแผงปุ่มสัญลักษณ์ —
          จะมีแถบเล็ก ๆ หน้าตาแบบนี้ <strong>𝄐 – N +</strong> โผล่ขึ้นมาใต้โน้ตตัวนั้น
          กด <strong>–</strong> หรือ <strong>+</strong> เพื่อลด-เพิ่มความยาวทีละ<strong>ครึ่งจังหวะ</strong>
          (ค่าเริ่มต้นให้ไว้ที่ <strong>2 จังหวะ</strong>) ตั้งเสร็จระบบจำค่าให้เอง ไม่ต้องกดบันทึกซ้ำ
          <br /><span class="muted">ทุกโน้ตที่ใส่หน่วงเสียงไว้จะมีป้ายเล็ก ๆ <strong>𝄐N</strong>
          เกาะอยู่มุมบนขวาของช่อง บอกค่าที่ตั้งไว้ — กวาดตาดูทั้งบรรทัดทีเดียวได้ว่าตัวไหนหน่วงเท่าไร ·
          กด <strong>▶ ฟังบรรทัดนี้</strong> จะได้ยินเสียงลากยาวตามค่าที่ตั้งจริง
          <br /><strong>เวลาพิมพ์ออกกระดาษ แผ่นเพลงจะแสดงแค่สัญลักษณ์ 𝄐 ไม่มีตัวเลข</strong> —
          เป็นธรรมเนียมการเขียนโน้ตสากล เพราะความยาวจริงขึ้นอยู่กับผู้นำเพลงตอนร้อง
          ตัวเลขจึงเป็นแค่เครื่องมือช่วยตอนคีย์เพลงและตอนกดฟังเท่านั้น</span></li>
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
            <li>ส่งอีเมลถึงทีมที่ <a href="mailto:pleng@phrakham.life">pleng@phrakham.life</a>
              <strong>พร้อมแนบไฟล์ JSON</strong> ที่ได้มา</li>
            <li>ทีมตรวจแล้วนำขึ้นคลังให้</li>
          </ol>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.intro-demo { font-size: 20px; display: flex; align-items: stretch; flex-wrap: wrap; color: var(--note-blue); }
.intro-demo .demo-bar { height: auto; align-self: stretch; margin: 0 10px; }
/* bridge to the song-makers' standard page — a soft brand-tinted well (Gestalt common region,
   not a hard box), with the pencil glyph marking "this is for authoring". */
.bridge-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 18px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f6f3ee;
  border: 1px solid #e2d8c8;
  border-left: 4px solid var(--brand);
}
.bridge-ico { flex: 0 0 auto; color: var(--brand); margin-top: 2px; }

/* ② overview icons — one glyph per heading, so the section scans at a glance (P'Aim 15 ก.ค.). */
.howto-h { display: flex; align-items: center; gap: 8px; }
.howto-ico { flex: 0 0 auto; }
/* inline sample of the "✓ ตรวจแล้ว" QA badge, matching the catalog's green marker */
.verified-eg {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--ok, #1d7a54);
  font-weight: 600;
  white-space: nowrap;
}
</style>
