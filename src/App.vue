<template>
  <header class="topbar no-print">
    <router-link to="/" class="brand">เพลง.พระคำ.ชีวิต</router-link>
    <nav>
      <router-link to="/">รายการเพลง</router-link>
      <router-link to="/studio">Studio</router-link>
      <router-link to="/guide">คู่มือโน้ตตัวเลข</router-link>
    </nav>
  </header>
  <main class="container">
    <router-view />
  </main>
</template>
