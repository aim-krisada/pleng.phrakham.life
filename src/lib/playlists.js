// Playlists — a reader's own song sets ("นมัสการเช้าอาทิตย์"), kept in the browser only.
// NO account, NO server, NO PII (mission · EPIC I): a playlist is just { id, name, songIds[] }
// in localStorage on this device. Portability without an account (EPIC I3) is by a SHARE LINK /
// QR / .json file the user carries themselves — the encoded blob holds only a user-set name +
// song ids, never anything identifying.
import { ref } from 'vue'
import { encodeState, decodeState } from './urlState.js'

const KEY = 'pleng.playlists'

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (Array.isArray(raw)) return raw.filter((l) => l && typeof l.name === 'string' && Array.isArray(l.songIds))
  } catch { /* corrupt / no storage — start empty */ }
  return []
}

// Single reactive source of truth. Every mutation replaces the array so Vue sees the change.
export const playlists = ref(load())

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(playlists.value)) } catch { /* private mode / quota */ }
}

// Local id — only needs to be unique within this device's list. Not shared/encoded.
function newId() {
  return 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function getList(id) {
  return playlists.value.find((l) => l.id === id) || null
}

export function createList(name) {
  const list = { id: newId(), name: String(name || '').trim() || 'เพลย์ลิสต์ใหม่', songIds: [] }
  playlists.value = [...playlists.value, list]
  persist()
  return list.id
}

export function renameList(id, name) {
  playlists.value = playlists.value.map((l) => (l.id === id ? { ...l, name: String(name || '').trim() || l.name } : l))
  persist()
}

export function deleteList(id) {
  playlists.value = playlists.value.filter((l) => l.id !== id)
  persist()
}

export function inList(id, songId) {
  const l = getList(id)
  return !!l && l.songIds.includes(songId)
}

// Add/remove a song; returns the new membership state (true = now in the list). Idempotent.
export function toggleSong(id, songId) {
  let now = false
  playlists.value = playlists.value.map((l) => {
    if (l.id !== id) return l
    const has = l.songIds.includes(songId)
    now = !has
    return { ...l, songIds: has ? l.songIds.filter((s) => s !== songId) : [...l.songIds, songId] }
  })
  persist()
  return now
}

export function removeSong(id, songId) {
  playlists.value = playlists.value.map((l) => (l.id === id ? { ...l, songIds: l.songIds.filter((s) => s !== songId) } : l))
  persist()
}

// ---- portability (no account) — encode/decode + file + save-shared ----

// Compact wire shape: { n: name, i: [songIds] } → url-safe base64 (lib/urlState.js). No PII.
export function encodeList(list) {
  return encodeState({ n: list.name, i: list.songIds })
}

// Returns { name, songIds } or null if the blob is missing/corrupt/wrong-shaped.
export function decodeList(encoded) {
  const obj = decodeState(encoded)
  if (!obj || typeof obj.n !== 'string' || !Array.isArray(obj.i)) return null
  return { name: obj.n, songIds: obj.i }
}

// Save a decoded (shared) list onto THIS device as a brand-new local playlist. Returns its id.
export function saveSharedList(decoded) {
  const list = { id: newId(), name: String(decoded.name || '').trim() || 'เพลย์ลิสต์', songIds: Array.isArray(decoded.songIds) ? [...decoded.songIds] : [] }
  playlists.value = [...playlists.value, list]
  persist()
  return list.id
}

// Backup file (long lists / archive) — mirrors lib/jsonIO.js style. Pure data, no PII.
export function listToFile(list) {
  return { type: 'pleng.playlist', name: list.name, songIds: list.songIds }
}

export function fileToList(obj) {
  if (!obj || obj.type !== 'pleng.playlist' || typeof obj.name !== 'string' || !Array.isArray(obj.songIds)) return null
  return { name: obj.name, songIds: obj.songIds }
}
