<script setup>
import { ref, computed, watch } from 'vue'
import { session, profile, legacy, recovering, login, logout, updatePassword, requestPasswordReset } from '../store.js'

// Top-right account control, GitHub/Supabase style:
// logged out -> "เข้าสู่ระบบ" opens a small dropdown form (works from any page)
// logged in  -> letter avatar opens name + role + logout
// recovering -> a password-reset link opened the app; show "set new password"
const open = ref(false)
const forgot = ref(false) // login panel showing the "forgot password" email form
const email = ref('')
const password = ref('')
const newPassword = ref('')
const busy = ref(false)
const errMsg = ref('')
const okMsg = ref('')

// A reset link fires PASSWORD_RECOVERY -> pop the panel open automatically.
watch(recovering, (on) => { if (on) open.value = true }, { immediate: true })

// New-password strength rules — every rule must pass before saving.
const pwRules = computed(() => {
  const p = newPassword.value
  return [
    { ok: p.length >= 16, label: 'ยาวอย่างน้อย 16 ตัวอักษร' },
    { ok: /[a-z]/.test(p), label: 'มีตัวพิมพ์เล็กอังกฤษ (a–z)' },
    { ok: /[A-Z]/.test(p), label: 'มีตัวพิมพ์ใหญ่อังกฤษ (A–Z)' },
    { ok: /[0-9]/.test(p), label: 'มีตัวเลข (0–9)' },
    { ok: /[^A-Za-z0-9]/.test(p), label: 'มีอักขระพิเศษ เช่น ! @ # $ %' },
  ]
})
const pwStrong = computed(() => pwRules.value.every((r) => r.ok))

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

async function submitNewPassword() {
  if (!pwStrong.value) {
    errMsg.value = 'รหัสผ่านยังไม่ผ่านเกณฑ์ทุกข้อ'
    return
  }
  busy.value = true
  errMsg.value = ''
  const error = await updatePassword(newPassword.value)
  busy.value = false
  if (error) {
    errMsg.value = 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ — ลองกดลิงก์ในอีเมลอีกครั้ง'
  } else {
    newPassword.value = ''
    okMsg.value = 'ตั้งรหัสผ่านใหม่เรียบร้อย เข้าสู่ระบบแล้ว'
  }
}

async function submitForgot() {
  busy.value = true
  errMsg.value = ''
  okMsg.value = ''
  const error = await requestPasswordReset(email.value)
  busy.value = false
  if (error) {
    errMsg.value = 'ส่งลิงก์ไม่สำเร็จ — ตรวจอีเมลอีกครั้ง'
  } else {
    okMsg.value = 'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว เปิดอีเมลแล้วกดลิงก์'
  }
}

function toForgot() {
  forgot.value = true
  errMsg.value = ''
  okMsg.value = ''
}
function toLogin() {
  forgot.value = false
  errMsg.value = ''
  okMsg.value = ''
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
      <form v-if="recovering" class="login-form" @submit.prevent="submitNewPassword">
        <strong style="color: var(--brand)">ตั้งรหัสผ่านใหม่</strong>
        <label>
          รหัสผ่านใหม่
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
          />
        </label>
        <ul class="pw-rules" aria-label="เกณฑ์รหัสผ่าน">
          <li v-for="r in pwRules" :key="r.label" :class="{ ok: r.ok }">
            <span aria-hidden="true">{{ r.ok ? '✓' : '○' }}</span> {{ r.label }}
          </li>
        </ul>
        <button type="submit" class="submit" :disabled="busy || !pwStrong">
          {{ busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่าน' }}
        </button>
        <p v-if="errMsg" class="err">{{ errMsg }}</p>
        <p v-if="okMsg" class="ok">{{ okMsg }}</p>
      </form>
      <template v-else-if="session">
        <div class="who">
          <strong>{{ displayName }}</strong>
          <span v-if="roleTh" class="role-chip">{{ roleTh }}</span>
        </div>
        <button @click="doLogout">ออกจากระบบ</button>
      </template>
      <form v-else-if="forgot" class="login-form" @submit.prevent="submitForgot">
        <strong style="color: var(--brand)">ลืมรหัสผ่าน</strong>
        <label>
          อีเมล
          <input v-model="email" type="email" autocomplete="username" required />
        </label>
        <button type="submit" class="submit" :disabled="busy">
          {{ busy ? 'กำลังส่ง…' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน' }}
        </button>
        <p v-if="errMsg" class="err">{{ errMsg }}</p>
        <p v-if="okMsg" class="ok">{{ okMsg }}</p>
        <button type="button" class="linkish" @click="toLogin">← กลับไปเข้าสู่ระบบ</button>
      </form>
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
        <button type="button" class="linkish" @click="toForgot">ลืมรหัสผ่าน?</button>
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
.ok { color: var(--brand); font-size: 0.85rem; margin: 4px 0 0; }
.pw-rules { list-style: none; margin: 2px 0 0; padding: 0; font-size: 0.8rem; }
.pw-rules li { color: var(--muted); display: flex; gap: 6px; align-items: baseline; }
.pw-rules li.ok { color: var(--brand); }
.linkish {
  background: none;
  border: none;
  color: var(--brand);
  text-decoration: underline;
  font-size: 0.82rem;
  padding: 2px 0;
  cursor: pointer;
  align-self: flex-start;
}
</style>
