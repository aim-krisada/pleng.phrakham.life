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
