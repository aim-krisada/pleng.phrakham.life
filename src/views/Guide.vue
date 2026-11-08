<script setup>
// คู่มือใช้งานโปรแกรม (/#/guide) — for people who OPEN the site to read / sing / print.
// Plain primary-school Thai, checked against the live site 6 พ.ย. 2569 (พี่เอม).
// It keeps ② "ใช้เว็บนี้ยังไง" (full) + a SHORT note-reading intro (just enough to sing along).
// The detailed writing rules (symbol tables, accidentals trap, tie/slur, combos, references)
// moved to the song-makers' page "มาตรฐานการเขียนโน้ต" (/#/notation) — a bridge box links there.
import NoteRow from '../components/NoteRow.vue'
import Icon from '../components/Icon.vue'
import { analyticsOn } from '../lib/analytics.js'
</script>

<template>
  <div class="reading-page">
    <div class="card">
      <h2 style="margin-top: 0">คู่มือใช้งานโปรแกรม</h2>
      <p style="margin-bottom: 0">
        มี 2 เรื่อง: <a href="#/guide#notation">① อ่านโน้ตตัวเลข</a> ·
        <a href="#/guide#howto">② ใช้เว็บนี้ยังไง</a>
      </p>
    </div>

    <!-- ① SHORT note intro — just enough to sing along. The full writing standard lives on
         /#/notation. #notation anchor kept so old links still land here. -->
    <div class="card" id="notation">
      <h2 style="margin-top: 0">① อ่านโน้ตตัวเลข</h2>
      <p>
        เพลงในเว็บนี้ใช้<strong>โน้ตตัวเลข</strong> อ่านง่ายกว่าโน้ตห้าเส้น จำแค่นี้ก็ร้องตามได้:
      </p>
      <ul>
        <li><strong>1 2 3 4 5 6 7</strong> คือ <strong>โด เร มี ฟา ซอล ลา ที</strong></li>
        <li>หัวเพลงเขียนว่า <strong>E 4/4</strong> แปลว่า โด คือเสียง E และห้องหนึ่งมี 4 จังหวะ</li>
        <li><strong>จุดใต้</strong>ตัวเลข = เสียงต่ำลง · <strong>จุดบน</strong>ตัวเลข = เสียงสูงขึ้น</li>
        <li><strong>ขีด <code>-</code></strong> = ลากเสียงยาวต่อ · <strong>เส้นใต้</strong>ตัวเลข = ร้องเร็วขึ้น</li>
        <li><strong>𝄐</strong> เหนือตัวเลข = ลากเสียงตัวนั้นให้ยาว ยาวแค่ไหนแล้วแต่ผู้นำเพลง</li>
        <li><strong><code>|</code></strong> = เส้นกั้นห้อง</li>
      </ul>
      <p class="muted" style="margin-bottom: 4px">ลองอ่านดู:</p>
      <p class="intro-demo"><NoteRow notes="5 5 6 5 1' 7" /><span class="bar-line demo-bar" aria-hidden="true"></span><NoteRow notes="5 - - -" /></p>

      <p class="bridge-box">
        <Icon name="pencil" :size="20" class="bridge-ico" />
        <span>
          <strong>อยากเขียนเพลงเอง?</strong> วิธีเขียนโน้ตให้เหมือนกันทั้งคลัง อยู่ที่
          <a href="#/notation">คู่มือทำเพลง →</a>
        </span>
      </p>
    </div>

    <div class="card" id="howto">
      <h2 style="margin-top: 0">② ใช้เว็บนี้ยังไง</h2>

      <h3 id="howto-bar" class="howto-h">แถบด้านบน</h3>
      <p>แถบนี้อยู่บนสุดทุกหน้า มีปุ่มเหล่านี้:</p>
      <ul>
        <li><strong>รายการเพลง · คู่มือ · เกี่ยวกับเรา</strong> = ไปหน้าต่าง ๆ
          (บนมือถือ กด <strong>☰</strong> มุมขวาบนก่อน)</li>
        <li><strong>แว่นขยาย</strong> = หาเพลง</li>
        <li><strong>แชร์</strong> = ส่งหน้าที่เปิดอยู่ให้เพื่อน อยู่หน้าเพลงก็ส่งเพลงนั้น
          อยู่ในเล่มก็ส่งเล่มนั้น</li>
        <li><strong>Aa</strong> = ทำตัวหนังสือให้ใหญ่หรือเล็ก กด <strong>−</strong> หรือ <strong>+</strong>
          และเลือกตัวหนังสือแบบ<strong>มีหัว</strong>หรือ<strong>ไม่มีหัว</strong>ได้ ใช้ได้ทุกหน้า</li>
        <li><strong>สร้างเพลงใหม่</strong> = เริ่มเขียนเพลงใหม่ (บนมือถืออยู่ในเมนู ☰)</li>
      </ul>
      <!-- ใบ v3/pleng#154 — only while page counting is switched on -->
      <p v-if="analyticsOn" class="muted">
        ครั้งแรกที่เปิดเว็บ จะมีแถบด้านล่างถามว่ายอมให้นับการเปิดเพลงไหม
        เปลี่ยนใจได้ที่หน้า<strong>เกี่ยวกับเรา</strong>
      </p>

      <!-- ใบ v3/pleng#156 · #155 — the new install way (home card · one button · steps sheet) -->
      <h3 id="howto-app" class="howto-h"><Icon name="smartphone" :size="22" class="howto-ico" />ติดตั้งเป็นแอพ ใช้ได้แม้ไม่มีเน็ต</h3>
      <ul>
        <li>บนสุดของหน้าแรก มีกล่อง <strong>ติดตั้งเป็นแอพ</strong> กดปุ่ม <strong>ติดตั้งแอพ</strong></li>
        <li>ถ้าเครื่องติดตั้งให้เองได้ จะขึ้นหน้าต่างของเครื่อง กด <strong>ติดตั้ง</strong> ก็เสร็จ</li>
        <li>ถ้าเครื่องติดตั้งเองไม่ได้ เช่น iPhone จะขึ้นวิธีทำทีละขั้น ไม่เกิน 3 ขั้น ทำตามได้เลย</li>
        <li>ถ้าเปิดเว็บจาก LINE หรือ Facebook ต้องเปิดใน Chrome หรือ Safari ก่อน
          กดปุ่ม <strong>เปิดใน Chrome / Safari</strong> แล้วกด <strong>ติดตั้งแอพ</strong> อีกครั้ง</li>
        <li>ติดตั้งแล้ว จะมีไอคอนบนหน้าจอ กดเปิดได้เหมือนแอพอื่น</li>
        <li>บนหน้าแรกจะมีบรรทัดสีเขียว <strong>✓ พร้อมใช้แบบไม่มีเน็ตแล้ว</strong>
          แปลว่าเปิดเพลงได้แม้ไม่มีเน็ต เช่น ในโบสถ์ที่ไม่มีสัญญาณ
          ถ้ายังเป็นสีเหลือง แปลว่ายังเก็บเพลงไม่ครบ ให้เปิดเว็บตอนมีเน็ตอีกครั้ง</li>
        <li>ไม่อยากเห็นกล่องนี้ กด <strong>✕</strong> ได้ ติดตั้งทีหลังได้จากเมนู <strong>☰</strong> บนมือถือ</li>
      </ul>

      <h3 id="howto-list" class="howto-h"><Icon name="list-music" :size="22" class="howto-ico" />หาเพลง</h3>
      <ul>
        <li>พิมพ์อะไรก็ได้ในช่องค้นหา เช่น ชื่อเพลง เลขเพลง คำในเนื้อร้อง
          หรือตัวเลขโน้ตที่จำได้ (เช่น 5 5 6 1)</li>
        <li>หรือกดเปิด<strong>เล่ม</strong>ที่ต้องการ ตอนอยู่ในเล่ม เว็บจะหาเฉพาะเพลงในเล่มนั้น
          อยากหาทุกเล่ม กด <strong>← เล่มทั้งหมด</strong> ก่อน</li>
        <li><strong>เรียงเพลง</strong> — ในเล่มมีปุ่ม <strong>เลขข้อ</strong> กับ <strong>ชื่อเพลง</strong>
          กดปุ่มเดิมอีกครั้งเพื่อกลับด้าน (▲ น้อยไปมาก · ▼ มากไปน้อย)
          แต่ละเล่มจำแบบของตัวเองไว้ในเครื่องนี้</li>
        <li>เพลงที่ยังไม่มีเลข จะอยู่หัวหรือท้ายรายการเสมอ หาง่าย</li>
      </ul>

      <h3 id="howto-fav" class="howto-h">★ เพลงที่ชอบ</h3>
      <ul>
        <li>กด <strong>☆</strong> หน้าชื่อเพลง ดาวจะเป็นสีเหลือง
          แล้วเพลงจะไปอยู่ในเล่ม <strong>★ เพลงที่ชอบ</strong> บนสุดของหน้าแรก กดอีกครั้งเพื่อเอาออก</li>
        <li>ในหน้าเพลงก็มีปุ่มดาวเหมือนกัน</li>
        <li>เว็บจำไว้ในเครื่องนี้ ไม่ต้องเข้าสู่ระบบ ถ้าล้างข้อมูลเว็บในเครื่อง รายการจะหาย</li>
        <li><strong>ย้ายไปเครื่องใหม่ หรือส่งให้ทีม</strong> — เปิดเล่ม ★ เพลงที่ชอบ แล้วกด <strong>แชร์</strong>
          ส่งลิงก์ทาง LINE หรืออีเมล คนที่เปิดลิงก์จะเห็นรายการเพลง
          กด <strong>★ เก็บเข้าเพลงที่ชอบ</strong> เพื่อเก็บไว้ในเครื่องของเขา ของเดิมไม่หาย</li>
      </ul>

      <h3 id="howto-song" class="howto-h"><Icon name="circle-play" :size="22" class="howto-ico" />ฝึกร้อง (หน้าเพลง)</h3>
      <p>
        เปิดเพลงแล้ว บนสุดจะเห็น<strong>ชื่อเพลง คีย์ จังหวะ</strong> และเลขเพลงในเล่มอื่น
        ข้างล่างคือ<strong>แผ่นเพลง</strong> ล่างสุดของจอมี<strong>แถบปุ่ม</strong>ติดอยู่ตลอด:
      </p>
      <ul>
        <li><strong>▶ เล่น</strong> = ฟังเพลง คำที่กำลังร้องจะ<strong>ขึ้นสีทีละคำ</strong> และจอเลื่อนตามเอง ·
          ปุ่มข้าง ๆ ใช้ข้ามไปท่อนก่อนหรือท่อนถัดไป</li>
        <li><strong>คีย์</strong> = เปลี่ยนเสียงสูงต่ำ คอร์ดเปลี่ยนตามให้เอง (เช่น จาก G เป็น F)</li>
        <li><strong>ความเร็ว</strong> = แตะที่ตัวเลข แล้วกด <strong>−</strong> หรือ <strong>+</strong> ทีละ 1
          (กดค้างไว้ เลขจะวิ่งเอง) · หรือกด <strong>เคาะตามจังหวะ</strong> แล้วแตะตามที่ร้อง 4 ครั้งขึ้นไป ·
          กด <strong>ตามเพลง</strong> เพื่อกลับไปความเร็วเดิม</li>
        <li><strong>เลือกท่อน</strong> = ฟังเฉพาะท่อนที่อยากซ้อม</li>
        <li><strong>เสียงดนตรี</strong> = ตั้งเสียง:
          <ul>
            <li><strong>ระดับเสียง</strong> — ปรับเสียงโน้ตกับเสียงคอร์ดแยกกันได้</li>
            <li><strong>เสียงที่เล่น</strong> — ทำนอง · คอร์ด · หรือรวมกัน</li>
            <li><strong>อารมณ์</strong> — บรรเลง · สงบ · หรือตรงโน้ต (เล่นตามโน้ตเป๊ะ ๆ)</li>
          </ul>
          ไม่ต้องตั้งอะไรก็ฟังได้เลย ตอนนี้เว็บเล่นด้วยเปียโนอย่างเดียว</li>
        <li><strong>⚙ ตั้งค่า</strong> = เปิดวนซ้ำ · เลือกคอร์ดแบบตัวอักษร (C G Am) หรือเลขโรมัน (I IV V)
          หรือซ่อนคอร์ด · เลือกดูแบบครบ เนื้ออย่างเดียว หรือโน้ตอย่างเดียว ·
          กด 📌 เพื่อปักปุ่มที่ใช้บ่อยไว้บนแถบ</li>
        <li><strong>✎ แก้เพลงนี้</strong> = เข้าหน้าแก้ไข (ดูหัวข้อถัดไป)</li>
        <li><strong>เพลงที่มีเนื้อหลายชุด</strong> — บางเพลงใช้ทำนองเดียวแต่มีเนื้อหลายชุด
          เหนือแผ่นเพลงจะมีแถบ <span class="verified-eg">ชุดเนื้อร้อง: เนื้อร้องที่ 1 · 2 ชุด ▾</span>
          กดแล้วเลือกชุดที่อยากดู · ค้นหาด้วยคำของชุดไหนก็เจอเพลงนี้</li>
      </ul>

      <h4 id="howto-print" class="howto-h">พิมพ์ และดาวน์โหลด</h4>
      <p>กดปุ่ม<strong>ดาวน์โหลด</strong> (ลูกศรชี้ลง) มีให้เลือก 3 อย่าง:</p>
      <ul>
        <li><strong>พิมพ์ / บันทึก PDF</strong> — จะเปิด<strong>หน้าก่อนพิมพ์</strong>
          เห็นแผ่น A4 เหมือนที่จะได้จริง และบอกว่ากี่หน้า ·
          ข้างแผ่นเลือกได้ว่าจะเอา<strong>คีย์</strong>ไหน คำร้อง<strong>แยกพยางค์</strong>หรือ<strong>ติดกัน</strong>
          แสดงอะไรบ้าง และคอร์ดแบบไหน · พอใจแล้วกด <strong>พิมพ์ / บันทึก PDF</strong> ·
          กด <strong>← ก่อนพิมพ์</strong> เพื่อกลับ
          <br /><span class="muted">ในหน้าต่างพิมพ์ให้<strong>ปิด "หัวกระดาษและท้ายกระดาษ"</strong>
          เพราะเว็บใส่ชื่อเพลง เลขหน้า และวันที่ให้แล้ว</span></li>
        <li><strong>ข้อมูลเพลง (JSON)</strong> — ไฟล์เพลงไว้เก็บ หรือส่งให้ทีม</li>
        <li><strong>เสียง (MP3)</strong> — ไฟล์เสียงเปียโน ตามคีย์และความเร็วที่ตั้งไว้</li>
      </ul>
      <p class="muted">
        ทีมงานที่เข้าสู่ระบบ จะเห็นป้าย
        <span class="verified-eg"><Icon name="badge-check" :size="14" />✓ ตรวจแล้ว</span> ที่เพลงที่ตรวจเสร็จ
      </p>

      <h3 id="howto-studio" class="howto-h"><Icon name="file-plus" :size="22" class="howto-ico" />แก้เพลง และเขียนเพลงใหม่</h3>
      <ul>
        <li><strong>เข้า</strong> — ในหน้าเพลงกด <strong>✎ แก้เพลงนี้</strong> ·
          เพลงใหม่กด <strong>สร้างเพลงใหม่</strong> ที่แถบด้านบน</li>
        <li><strong>ออก</strong> — กด <strong>← กลับไปฝึกร้อง</strong> มุมซ้ายบน
          ถ้ายังไม่ได้บันทึก เว็บจะถามก่อน</li>
        <li><strong>ดูแผ่นเพลง</strong> — บนคอม แผ่นเพลงอยู่ข้างขวา แก้อะไรก็เปลี่ยนทันที
          กดปุ่ม <strong>ดูแผ่นเพลง</strong> เพื่อเปิดหรือปิด และกด <strong>ก่อนพิมพ์</strong> บนแผ่นเพื่อพิมพ์ ·
          บนมือถือ ปุ่มนี้จะเปิดหน้าก่อนพิมพ์</li>
        <li>เพลงแบ่งเป็น <strong>บรรทัด → ห้อง → ช่อง</strong> · 1 ช่อง = โน้ต 1 ตัว = 1 คำ ·
          กด Enter หรือเว้นวรรคเพื่อไปช่องถัดไป
          <br /><span class="muted">ถ้าคำเดียวร้องหลายโน้ต (เอื้อน) ให้พิมพ์โน้ตติดกันในช่องเดียวแล้วใส่วงเล็บ
          เช่น <code>(65)</code> — ดู<a href="#/notation#rhythm">คู่มือทำเพลง</a></span></li>
        <li><strong>ปุ่มสัญลักษณ์</strong> อยู่ล่างจอ แตะช่องโน้ตก่อน แล้วกดสัญลักษณ์ที่ต้องการ</li>
        <li><strong>โครงเพลง</strong> = รายชื่อท่อนทั้งหมด กดชื่อท่อนเพื่อไปแก้ · กด ▲ ▼ หรือลากเพื่อสลับท่อน ·
          บนมือถือ แตะ<strong>ชื่อท่อนที่แถบบน</strong>เพื่อเปิด แล้วกด ✕ เพื่อปิด</li>
        <li id="howto-copy-section"><strong>ท่อนที่ร้องซ้ำ</strong> ไม่ต้องพิมพ์ใหม่:
          <ul>
            <li>กด <strong>ทำซ้ำ</strong> ที่ท่อนในโครงเพลง = ได้ท่อนใหม่ แก้โน้ตแยกจากท่อนเดิมได้</li>
            <li>กด <strong>ทำซ้ำเนื้อ</strong> = ได้ท่อนใหม่ที่<strong>ใช้ทำนองเดียวกัน</strong>
              แก้โน้ตที่ท่อนไหน อีกท่อนเปลี่ยนตาม · อยากแยก กด <strong>แยกทำนอง</strong></li>
          </ul></li>
        <li><strong>เนื้อร้องหลายชุด</strong> — กด <span class="verified-eg">＋ เพิ่มชุดเนื้อร้อง</span>
          ได้เนื้อชุดใหม่บนทำนองเดิม พิมพ์แค่คำ · กดแท็บ <span class="verified-eg">เนื้อร้องที่ 1</span>
          <span class="verified-eg">เนื้อร้องที่ 2</span> เพื่อสลับ · โน้ตกับคอร์ดใช้ร่วมกันทุกชุด ·
          กด <strong>ลบชุดนี้</strong> เว็บจะถามก่อน (เพลงต้องมีเนื้ออย่างน้อย 1 ชุด)</li>
        <li><strong>ลากเสียงยาว 𝄐</strong> — แตะโน้ต แล้วกด <code>^</code>
          จะมีปุ่ม <strong>– N +</strong> ใต้โน้ต กดเพื่อลากเพิ่มหรือลดทีละครึ่งจังหวะ (เริ่มที่ 2 จังหวะ) ·
          ตอนพิมพ์ออกกระดาษจะเห็นแค่ 𝄐 ไม่มีตัวเลข</li>
        <li><strong>นับจังหวะ</strong> — เว็บนับให้ทุกห้อง ขึ้น <strong>✓</strong> = ครบ ·
          ขึ้น <strong>❌</strong> = ขาดหรือเกิน (ห้องแรกของท่อนสั้นกว่าได้)</li>
        <li id="howto-stanza-meter"><strong>เพลงที่เปลี่ยนจังหวะกลางเพลง</strong> (เช่น ข้อเป็น 6/8 รับเป็น 4/4)
          — ตั้งจังหวะหลักใน <strong>ตั้งค่าเพลง</strong> แล้วไปที่ท่อนรับ ตั้งช่อง <strong>จังหวะ</strong> ที่หัวท่อนเป็น 4/4</li>
        <li><strong>ปุ่ม ⋯ ของแต่ละห้อง</strong> = ห้องต่อกันจากบรรทัดก่อน · เล่นซ้ำ · วนกลับ · ห้องจบ</li>
        <li><strong>ฟัง</strong> — กดฟังห้องนี้ บรรทัดนี้ ท่อนนี้ หรือ<strong>ฟังทั้งเพลง</strong>
          ตอนฟัง คำที่ร้องจะขึ้นสีบนแผ่นเพลงด้วย</li>
        <li><strong>ทำพลาด</strong> — กดปุ่ม<strong>ย้อน</strong> ที่แถบล่าง (หรือ Ctrl+Z)</li>
        <li><strong>ทีมงานที่เข้าสู่ระบบ</strong> — กด <strong>บันทึกร่าง</strong> เก็บงานไว้ก่อน
          แล้ว<strong>ส่งตรวจ</strong> เพลงจะขึ้นเว็บเมื่อผู้ตรวจกด<strong>อนุมัติ</strong> ·
          ดูหรือย้อนงานเก่าได้ที่<strong>ประวัติการแก้ไข</strong></li>
        <li><strong>ไม่มีบัญชีก็ช่วยได้</strong>:
          <ol>
            <li>เขียนเพลงให้เสร็จ</li>
            <li>กด <strong>ดาวน์โหลด › ข้อมูลเพลง (JSON)</strong> เก็บไฟล์ไว้
              (เว็บไม่ได้เก็บงานให้ · จะแก้ต่อ กด <strong>จัดการ › อัปโหลด JSON</strong>)</li>
            <li>ส่งอีเมลพร้อมไฟล์ไปที่ <a href="mailto:pleng@phrakham.life">pleng@phrakham.life</a></li>
            <li>ทีมจะตรวจแล้วนำขึ้นเว็บให้</li>
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
