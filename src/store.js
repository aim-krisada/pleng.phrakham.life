import { ref, computed } from 'vue'
import { supabase } from './supabase.js'

// Song currently open in the viewer — drives the navbar download tool.
export const currentSong = ref(null)

// Which shell-bar menu is open ('site' | 'file' | 'manage' | 'mode' | null). Shared so
// the app-wide ShellBar and a page's teleported menus are one open-at-a-time system.
export const shellMenu = ref(null)

// Supabase email links (recovery / invite / email change) land as
// #access_token=…&type=X. Read the type synchronously at load, before supabase-js
// parses and strips the fragment — the hash router would otherwise treat it as a
// bogus route. App.vue redirects home for any of these.
const linkType = (() => {
  try {
    return new URLSearchParams(window.location.hash.slice(1)).get('type')
  } catch {
    return null
  }
})()

// ---- shared auth state (navbar profile tool + Studio both read this) ----
export const session = ref(null)
export const profile = ref(null) // { role, display_name }
export const legacy = ref(false) // true when the draft tables are not installed
// recovery link OR first-time invite both need the user to set a password.
export const recovering = ref(linkType === 'recovery' || linkType === 'invite')
export const inviteMode = ref(linkType === 'invite') // tweaks the wording only
export const emailChanged = ref(linkType === 'email_change')

// ---- permission tiers (single source of truth · DS-02) ----
// The line that matters is "can you STORE into the shared library", not "can you edit":
// ANYONE may open and edit a song (keeping their work as their own JSON). Logging in
// unlocks saving drafts / sending for review; being an approver unlocks publishing to
// the public list + delete / restore. Every mode reads gating from these three getters
// instead of poking at `session` / `profile` on its own.
//   tier       : 'anon' | 'editor' | 'approver'
//   canStore   : editor+   — may save a draft / send for review
//   canApprove : approver  — may publish / delete / restore
// `legacy` (draft tables not installed) is treated as approver so a bare Supabase still
// edits + publishes directly, exactly as before.
export const tier = computed(() =>
  !session.value
    ? 'anon'
    : legacy.value || profile.value?.role === 'approver'
      ? 'approver'
      : 'editor',
)
export const canStore = computed(() => tier.value !== 'anon')
export const canApprove = computed(() => tier.value === 'approver')

let inited = false
export async function initAuth() {
  if (inited) return
  inited = true
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  supabase.auth.onAuthStateChange((event, s) => {
    session.value = s
    // Belt-and-suspenders for reset links (invite is caught by linkType above).
    if (event === 'PASSWORD_RECOVERY') recovering.value = true
    loadProfile()
  })
  await loadProfile()
}

async function loadProfile() {
  profile.value = null
  if (!session.value) return
  const { data, error } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', session.value.user.id)
    .single()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') legacy.value = true
    else profile.value = { role: 'editor', display_name: session.value.user.email }
  } else {
    profile.value = data
  }
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (!error) recovering.value = false
  return error
}

export async function requestPasswordReset(email) {
  // redirectTo lands back on this origin as #access_token=…&type=recovery,
  // which initAuth's PASSWORD_RECOVERY handler turns into the set-password form.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  })
  return error
}

// Rename self via the security-definer RPC (db/003) — display_name only, never role.
export async function updateDisplayName(name) {
  const { error } = await supabase.rpc('update_my_display_name', { new_name: name })
  if (!error) await loadProfile()
  return error
}

// Change own email. Supabase sends a confirmation link to the new address (and,
// if "Secure email change" is on, the old one too); the change applies only after
// it is clicked. redirectTo brings them back here as type=email_change.
export async function updateEmail(email) {
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: window.location.origin + window.location.pathname },
  )
  return error
}

// Change own password while logged in. updateUser() alone would let anyone on an
// open session reset the password, so we re-authenticate with the current one
// first (OWASP: verify current password before change). Returns 'wrong-current'
// if the old password fails, or the update error, or null on success.
export async function changePassword(currentPassword, newPassword) {
  const emailAddr = session.value?.user?.email
  if (!emailAddr) return { message: 'no-session' }
  const { error: reauth } = await supabase.auth.signInWithPassword({
    email: emailAddr,
    password: currentPassword,
  })
  if (reauth) return { message: 'wrong-current' }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return error
}
