<script setup>
// Build stamp injected by vite.config.js define() at build time.
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const d = new Date(__BUILD_TIME__)
const stamp = `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · ${__BUILD_COMMIT__}`
const year = d.getFullYear()
</script>

<template>
  <footer class="site-footer no-print">
    <div>
      © {{ year }} เพลง.พระคำ.ชีวิต · pleng.phrakham.life ·
      <router-link to="/about">ซอฟต์แวร์: GNU GPL v3</router-link> ·
      <!-- ใบ v3/pleng#180 — anyone can see how much the site is used -->
      <router-link to="/stats" data-test="footer-stats">สถิติการใช้งาน</router-link>
    </div>
    <div class="pk-build">{{ stamp }}</div>
  </footer>
</template>
