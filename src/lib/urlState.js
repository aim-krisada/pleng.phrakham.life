// url-safe base64 ↔ JSON — pure, no deps, unicode-safe. Used to carry a small state blob (e.g. a
// shared playlist: a name + song ids) inside a link/QR. Round-trips: decodeState(encodeState(x))
// deep-equals x. Holds only what the caller puts in — never adds identity/PII.

function toBytes(str) {
  return new TextEncoder().encode(str)
}
function fromBytes(bytes) {
  return new TextDecoder().decode(bytes)
}

export function encodeState(obj) {
  const json = JSON.stringify(obj)
  const bytes = toBytes(json)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  // base64 → url-safe (+/ → -_, drop padding) so it rides in a query string untouched
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeState(encoded) {
  try {
    let s = String(encoded).replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
    const bin = atob(s)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(fromBytes(bytes))
  } catch {
    return null // missing / corrupt / not our blob
  }
}
