// Test-env polyfills for jsdom gaps (jsdom implements neither of these layout APIs, so any
// component that calls them throws an UNCAUGHT exception during a test — which crashes the
// worker and drags unrelated test files down to "(0 test)"). These are visual-only no-ops in
// jsdom; they change no assertion, only stop the crash. Pre-existing gap surfaced once tests
// could run again (a missing @babel/parser had been blocking the whole suite). Not 717-specific.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {}
}
// jsdom DEFINES window.scrollTo/scroll but they throw "Not implemented" — override with no-ops.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {}
  window.scroll = () => {}
}
