<script setup>
import { ref, computed } from 'vue'
import { session, profile, legacy, login, logout } from '../store.js'

// Top-right account control, GitHub/Supabase style:
// logged out -> "เข้าสู่ระบบ" opens a small dropdown form (works from any page)
// logged in  -> letter avatar opens name + role + logout
const open = ref(false)
const email = ref('')
const password = ref('')
const busy = ref(false)
const errMsg = ref('')

const displayName = computed(
  () => profile.value?.display_name || session.value?.user?.email || ''
)
const initial = computed(() => (displayName.value.trim()[0] || '?').toUpperCase())
const roleTh = computed(() =>
  legacy.value ? '' : profile.value?.role === 'approver' ? 'ผู้อนุมัติ' : 'ผู้ช่วยคีย์เพลง'
)

async function submit() {
  busy.value = true
  errMsg.value = ''
  const error = await login(email.value, password.value)
  busy.value = false
  if (error) {
    errMsg.value = 'เข้าสู่ระบบไม่สำเร็จ — ตรวจอีเมลและรหัสผ่านอีกครั้ง'
  } else {
    open.value = false
    email.value = ''
    password.value = ''
  }
}

async function doLogout() {
  open.value = false
  await logout()
}
</script>

<template>
  <div class="pk-tool no-print" @keydown.esc="open = false">
    <!-- logged in: letter avatar -->
    <button
      v-if="session"
      class="pk-tool-btn avatar-btn"
      :aria-expanded="open"
      :aria-label="`บัญชีของ ${displayName}`"
      @click="open = !open"
    >
      <span class="avatar">{{ initial }}</span>
    </button>
    <!-- logged out: sign-in button -->
    <button v-else class="secondary signin-btn" :aria-expanded="open" @click="open = !open">
      เข้าสู่ระบบ
    </button>

    <div v-if="open" class="pk-tool-menu profile-menu">
      <template v-if="session">
        <div class="who">
          <strong>{{ displayName }}</strong>
          <span v-if="roleTh" class="role-chip">{{ roleTh }}</span>
        </div>
        <button @click="doLogout">ออกจากระบบ</button>
      </template>
      <form v-else class="login-form" @submit.prevent="submit">
        <label>
          อีเมล
          <input v-model="email" type="email" autocomplete="username" required />
        </label>
        <label>
          รหัสผ่าน
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="submit" :disabled="busy">
          {{ busy ? 'กำลังเข้า…' : 'เข้าสู่ระบบ' }}
        </button>
        <p v-if="errMsg" class="err">{{ errMsg }}</p>
        <p class="muted" style="margin: 4px 0 0">
          สำหรับทีมงาน — คนทั่วไปใช้เว็บได้ทุกอย่างโดยไม่ต้องเข้าสู่ระบบ
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
}
.signin-btn { min-height: 40px; }
.profile-menu { padding: 0.8rem 1rem; min-width: 250px; }
.who { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.role-chip {
  background: var(--cream);
  color: var(--brand);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1px 10px;
  font-size: 12px;
}
.profile-menu > button { width: 100%; text-align: center; }
.login-form { display: flex; flex-direction: column; gap: 8px; }
.login-form label { display: flex; flex-direction: column; gap: 2px; font-size: 0.85rem; color: var(--muted); }
.login-form .submit { width: 100%; }
.err { color: var(--red); font-size: 0.85rem; margin: 4px 0 0; }
</style>
