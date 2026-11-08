// Text on the two size-step buttons in the Aa popup (ใบ#159). They follow the interface language:
// Thai → ก− / ก+, English → A− / A+. The site is Thai today; reading <html lang> means a future English
// interface needs no change here. The sign is the real minus U+2212, not a hyphen.
export function fontStepLabels(lang) {
  const en = String(lang || '').trim().toLowerCase().startsWith('en')
  const ch = en ? 'A' : 'ก'
  return { smaller: ch + '−', bigger: ch + '+' }
}
