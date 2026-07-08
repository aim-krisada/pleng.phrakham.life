<script setup>
import { ref, computed, watch } from 'vue'
import {
  session, profile, legacy, recovering, inviteMode, emailChanged,
  login, logout, updatePassword, requestPasswordReset, updateDisplayName, updateEmail, changePassword,
} from '../store.js'
import Icon from './Icon.vue'

// Top-right account control, GitHub/Supabase style:
// logged out -> "เข้าสู่ระบบ" opens a small dropdown form (works from any page)
// logged in  -> letter avatar opens name + role + edit profile + logout
// recovering -> a reset/invite link opened the app; show "set password"
const open = ref(false)
const forgot = ref(false) // login panel showing the "forgot password" email form
const editing = ref(false) // logged-in panel showing the edit-profile form
const email = ref('')
const password = ref('')
const newPassword = ref('')
const nameInput = ref('')
const emailInput = ref('')
const currentPassword = ref('')
const showPw = ref(false)
const busy = ref(false)
const errMsg = ref('')
const okMsg = ref('')
const editErr = ref('')
const editOk = ref('')
const pwErr = ref('')
const pwOk = ref('')

// A reset/invite/email-change link should pop the panel open automatically.
watch([recovering, emailChanged], ([r, e]) => { if (r || e) open.value = true }, { immediate: true })

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

function openEdit() {
  nameInput.value = profile.value?.display_name || ''
  emailInput.value = session.value?.user?.email || ''
  currentPassword.value = ''
  newPassword.value = ''
  showPw.value = false
  editErr.value = ''
  editOk.value = ''
  pwErr.value = ''
  pwOk.value = ''
  editing.value = true
}

async function saveName() {
  const name = nameInput.value.trim()
  if (!name) {
    editErr.value = 'กรุณาใส่ชื่อ'
    return
  }
  busy.value = true
  editErr.value = ''
  editOk.value = ''
  const error = await updateDisplayName(name)
  busy.value = false
  if (error) editErr.value = 'บันทึกชื่อไม่สำเร็จ'
  else editOk.value = 'บันทึกชื่อเรียบร้อย'
}

async function saveEmail() {
  const next = emailInput.value.trim()
  if (next === (session.value?.user?.email || '')) {
    editErr.value = 'อีเมลเดิม — ยังไม่มีการเปลี่ยน'
    return
  }
  busy.value = true
  editErr.value = ''
  editOk.value = ''
  const error = await updateEmail(next)
  busy.value = false
  if (error) editErr.value = 'เปลี่ยนอีเมลไม่สำเร็จ — ตรวจอีเมลอีกครั้ง'
  else editOk.value = 'ส่งลิงก์ยืนยันไปที่อีเมลใหม่แล้ว กดลิงก์ก่อนอีเมลจึงจะเปลี่ยนจริง'
}

async function submitChangePassword() {
  if (!currentPassword.value) {
    pwErr.value = 'กรุณาใส่รหัสผ่านปัจจุบัน'
    return
  }
  if (!pwStrong.value) {
    pwErr.value = 'รหัสผ่านใหม่ยังไม่ผ่านเกณฑ์ทุกข้อ'
    return
  }
  busy.value = true
  pwErr.value = ''
  pwOk.value = ''
  const error = await changePassword(currentPassword.value, newPassword.value)
  busy.value = false
  if (error?.message === 'wrong-current') {
    pwErr.value = 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
  } else if (error) {
    pwErr.value = 'เปลี่ยนรหัสผ่านไม่สำเร็จ'
  } else {
    currentPassword.value = ''
    newPassword.value = ''
    pwOk.value = 'เปลี่ยนรหัสผ่านเรียบร้อย'
  }
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
    <!-- logged out: sign-in button — icon + label on desktop, icon-only on mobile (S4) -->
    <button v-else class="secondary signin-btn" :aria-expanded="open" aria-label="เข้าสู่ระบบ" @click="open = !open">
      <Icon name="circle-user" :size="18" /><span class="signin-label">เข้าสู่ระบบ</span>
    </button>

    <div v-if="open" class="pk-tool-menu profile-menu">
      <p v-if="emailChanged" class="ok" style="margin: 0 0 8px">
        ยืนยันอีเมลเรียบร้อยแล้ว ✓
      </p>
      <form v-if="recovering" class="login-form" @submit.prevent="submitNewPassword">
        <strong style="color: var(--brand)">
          {{ inviteMode ? 'ตั้งรหัสผ่านครั้งแรก' : 'ตั้งรหัสผ่านใหม่' }}
        </strong>
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
        <template v-if="editing">
          <form class="login-form" @submit.prevent="saveName">
            <label>
              ชื่อที่แสดง
              <input v-model="nameInput" type="text" autocomplete="name" required />
            </label>
            <button type="submit" class="submit" :disabled="busy">บันทึกชื่อ</button>
          </form>
          <form class="login-form" style="margin-top: 10px" @submit.prevent="saveEmail">
            <label>
              อีเมล
              <input v-model="emailInput" type="email" autocomplete="email" required />
            </label>
            <button type="submit" class="submit" :disabled="busy">เปลี่ยนอีเมล</button>
            <p class="muted" style="margin: 2px 0 0">
              จะส่งลิงก์ยืนยันไปที่อีเมลใหม่ ต้องกดลิงก์ก่อนอีเมลจึงเปลี่ยนจริง
            </p>
          </form>
          <p v-if="editErr" class="err">{{ editErr }}</p>
          <p v-if="editOk" class="ok">{{ editOk }}</p>
          <form class="login-form" style="margin-top: 10px" @submit.prevent="submitChangePassword">
            <label>
              รหัสผ่านปัจจุบัน
              <input v-model="currentPassword" type="password" autocomplete="current-password" required />
            </label>
            <label>
              รหัสผ่านใหม่
              <span class="pw-field">
                <input
                  v-model="newPassword"
                  :type="showPw ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                />
                <button
                  type="button"
                  class="pw-eye"
                  :aria-label="showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
                  :aria-pressed="showPw"
                  @click="showPw = !showPw"
                >{{ showPw ? '🙈' : '👁' }}</button>
              </span>
            </label>
            <ul class="pw-rules" aria-label="เกณฑ์รหัสผ่าน">
              <li v-for="r in pwRules" :key="r.label" :class="{ ok: r.ok }">
                <span aria-hidden="true">{{ r.ok ? '✓' : '○' }}</span> {{ r.label }}
              </li>
            </ul>
            <button type="submit" class="submit" :disabled="busy || !pwStrong">เปลี่ยนรหัสผ่าน</button>
            <p v-if="pwErr" class="err">{{ pwErr }}</p>
            <p v-if="pwOk" class="ok">{{ pwOk }}</p>
          </form>
          <button type="button" class="linkish" @click="editing = false">← กลับ</button>
        </template>
        <div v-else class="menu-actions">
          <button @click="openEdit">แก้ไขโปรไฟล์</button>
          <button @click="doLogout">ออกจากระบบ</button>
        </div>
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
.signin-btn { min-height: 40px; display: inline-flex; align-items: center; gap: 6px; }
@media (max-width: 760px) {
  /* S4: login collapses to a person icon on mobile */
  .signin-label { display: none; }
  .signin-btn { padding: 8px; }
}
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
.menu-actions { display: flex; flex-direction: column; gap: 8px; }
.menu-actions button { width: 100%; text-align: center; }
.login-form { display: flex; flex-direction: column; gap: 8px; }
.login-form label { display: flex; flex-direction: column; gap: 2px; font-size: 0.85rem; color: var(--muted); }
.login-form .submit { width: 100%; }
.err { color: var(--red); font-size: 0.85rem; margin: 4px 0 0; }
.ok { color: var(--brand); font-size: 0.85rem; margin: 4px 0 0; }
.pw-field { position: relative; display: block; }
.pw-field input { width: 100%; padding-right: 40px; }
.pw-eye {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 6px;
  min-width: 32px;
  min-height: 32px;
}
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
