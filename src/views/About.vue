<script setup>
import Icon from '../components/Icon.vue'
</script>

<template>
  <div class="reading-page">
    <div class="card">
      <h2 style="margin-top: 0">เกี่ยวกับเรา</h2>
      <p>
        <strong>เพลง.พระคำ.ชีวิต</strong> คือคลังเพลงนมัสการที่ทำขึ้นเพื่อให้พี่น้อง
        ทุกคนเรียนรู้และร้องเพลงนมัสการได้ง่าย — เปิดดูเนื้อร้อง คอร์ด และโน้ตตัวเลข
        ได้จากมือถือ แท็บเล็ต หรือคอมพิวเตอร์ กดฟังทำนองเพื่อฝึกร้อง ย้ายคีย์ได้ทันที
        และพิมพ์เป็นกระดาษ A4 ได้ ใช้ฟรีทั้งหมด ไม่มีค่าใช้จ่าย
      </p>
    </div>

    <div class="card" id="license">
      <h3 style="margin-top: 0">ซอฟต์แวร์นี้เป็นของทุกคน (Open Source)</h3>
      <p>
        โปรแกรมทั้งหมดของเว็บนี้เปิดเผยโค้ดภายใต้สัญญาอนุญาต
        <a href="https://github.com/aim-krisada/pleng.phrakham.life/blob/main/LICENSE" target="_blank" rel="noopener">GNU GPL v3</a>
        — หมายความว่าใครก็ตาม (เช่น คริสตจักรอื่น) สามารถนำโค้ดไปใช้ ปรับแก้
        และสร้างคลังเพลงของตัวเองได้ฟรี โดยมีเงื่อนไขเดียวคือต้องเปิดเผยโค้ดที่แก้ต่อไป
        แบบเดียวกัน ดูโค้ดและวิธีติดตั้งได้ที่
        <a href="https://github.com/aim-krisada/pleng.phrakham.life" target="_blank" rel="noopener">GitHub</a>
      </p>
      <p class="muted">
        สัญญาอนุญาตนี้ครอบคลุมเฉพาะ<strong>ตัวโปรแกรม</strong>เท่านั้น —
        เนื้อเพลงและทำนองเป็นลิขสิทธิ์ของผู้ประพันธ์และผู้แปลแต่ละท่าน
        เรารวบรวมไว้เพื่อการนมัสการและการศึกษาภายในคริสตจักร
      </p>
    </div>

    <div class="card">
      <h3 class="about-h" style="margin-top: 0"><Icon name="book-open" :size="22" class="about-ico" />ขอบคุณ &amp; แหล่งที่มา</h3>
      <p>
        เว็บนี้เกิดขึ้นได้เพราะมีผู้จัดทำหนังสือเพลง ผู้ประพันธ์ ผู้แปล
        และผู้แบ่งปันเสียงเครื่องดนตรีมาก่อนหน้า — ขอขอบพระคุณทุกท่านจากใจ
      </p>

      <h4 style="margin-bottom: 4px">โน้ตและเนื้อเพลง</h4>
      <p style="margin-top: 0">
        ต้นทางหลักของโน้ตตัวเลขคือ <strong>ชุดเพลงเยาวชนไทย (ไทยอนุชน 120)</strong>
        ประมาณ 120 เพลง และเทียบเคียงข้ามกับหนังสือเพลงอีกหลายเล่ม ได้แก่
        เล่มเล็ก · เล่มเยอรมัน · เยอรมันอนุชน (Yuko) · เล่มมงคลสมรส · เล่มสิงคโปร์ ·
        สิงคโปร์อนุชน · อังกฤษ Hymn · เล่มไว้อาลัย · และหนังสือบทเพลงสรรเสริญ
      </p>
      <p class="muted">
        ขอขอบคุณผู้จัดทำหนังสือเหล่านี้ทุกท่าน ที่รวบรวมและวางรากฐานไว้ให้พี่น้อง
        ได้ร้องเพลงนมัสการสืบต่อกันมา
      </p>

      <h4 style="margin-bottom: 4px">เสียงเครื่องดนตรี</h4>
      <p style="margin-top: 0">
        เสียงที่เว็บใช้เล่นมาจากชุดตัวอย่างเสียง (samples) ที่เปิดให้ใช้ฟรี ขอขอบคุณผู้จัดทำ:
      </p>
      <ul>
        <li>เปียโน (Grand) — Splendid Grand Piano (AKAI) · สาธารณสมบัติ (Public Domain)</li>
        <li>กีตาร์ — FreePats Spanish Classical · CC0</li>
        <li>เชลโล — Bigcat cello · CC0</li>
        <li>ไวโอลิน — VSCO-2-CE Solo Violin · CC0</li>
        <li>เสียงวงเครื่องสาย — <strong>FluidR3_GM soundfont © Frank Wen · สัญญาอนุญาต
          Creative Commons Attribution 3.0 (CC-BY 3.0)</strong></li>
      </ul>

      <h4 style="margin-bottom: 4px">การเรียบเรียงเสียงดนตรี</h4>
      <p style="margin-top: 0">
        เว็บมี "เครื่องยนต์เปียโน" ที่เรียบเรียงเสียงให้ไพเราะเองอัตโนมัติ —
        มีตัวคุมจังหวะ (คล้ายวาทยกร) ไม่ให้เสียงชนกัน · เน้นทำนอง (มือขวา) ให้เด่นเสมอ ·
        หายใจและยืดเสียงตรงปลายวรรค · ใส่ความเป็นมนุษย์ (ผ่อนหนักเบาและจังหวะสุ่มเล็กน้อย) ·
        และเหยียบเพดัลให้เสียงต่อเนื่อง
      </p>
      <p class="muted" style="margin-bottom: 0">
        อยากดูรายละเอียดเชิงเทคนิคจริง ๆ เปิดดูซอร์สโค้ดได้เลย (เผยแพร่ภายใต้ GPL v3) ที่
        <a href="https://github.com/aim-krisada/pleng.phrakham.life" target="_blank" rel="noopener">GitHub</a>
      </p>
    </div>

    <div class="card">
      <h3 style="margin-top: 0">อยากช่วยทำได้อย่างไร</h3>
      <ul>
        <li>ช่วยคีย์เพลง: เปิด<router-link to="/studio">ห้องทำเพลง</router-link>
          คีย์เพลงแล้วกด "ดาวน์โหลด JSON" ส่งไฟล์ให้ทีมงาน — ไม่ต้องมีบัญชีก็ทำได้</li>
        <li>พบข้อผิดพลาดในเพลงหรือโปรแกรม: แจ้งทีมงานของคริสตจักร หรือเปิด issue ใน
          <a href="https://github.com/aim-krisada/pleng.phrakham.life/issues" target="_blank" rel="noopener">GitHub</a></li>
        <li>เป็นนักพัฒนา: fork โปรเจกต์ไปต่อยอดได้เลย</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* card heading with a leading overview icon — icon inherits the heading's --brand colour
   via currentColor and is decorative (aria-hidden baked into <Icon>). */
.about-h { display: flex; align-items: center; gap: 8px; }
.about-ico { flex: 0 0 auto; }
</style>
