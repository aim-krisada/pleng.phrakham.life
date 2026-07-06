import { ref } from 'vue'
import { supabase } from './supabase.js'

// Song currently open in the viewer — drives the navbar download tool.
export const currentSong = ref(null)

// ---- shared auth state (navbar profile tool + Studio both read this) ----
export const session = ref(null)
export const profile = ref(null) // { role, display_name }
export const legacy = ref(false) // true when the draft tables are not installed
export const recovering = ref(false) // true after a password-reset link opens the app

let inited = false
export async function initAuth() {
  if (inited) return
  inited = true
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  supabase.auth.onAuthStateChange((event, s) => {
    session.value = s
    // Reset link lands as #access_token=…&type=recovery; supabase-js parses it
    // and fires this event. Show the "set new password" form instead of a
    // normal logged-in state.
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
