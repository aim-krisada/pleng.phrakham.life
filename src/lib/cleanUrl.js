// ใบ v3/pleng#156 — links shared from the site carry ?openExternalBrowser=1 before the '#' so LINE
// opens them in the real browser. Once the page is open that word has done its job: take it out of
// the address bar BEFORE the router starts (router.js reads location.pathname + search as the base of
// every address it writes), so the page addresses stay clean and a copied address stays short.
// The hash (the page inside the site) is never touched. Imported first thing in main.js.
export function withoutLineParam(href) {
  try {
    const u = new URL(href)
    if (!u.searchParams.has('openExternalBrowser')) return null
    u.searchParams.delete('openExternalBrowser')
    return u.toString()
  } catch { return null }
}

if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
  const next = withoutLineParam(window.location.href)
  if (next) {
    try { window.history.replaceState(window.history.state, '', next) } catch { /* sandboxed — leave it */ }
  }
}
