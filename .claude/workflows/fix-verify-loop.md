export const meta = {
  name: 'fix-verify-loop',
  description: 'Auto dev↔tester loop (≤3 rounds) — dev applies tester findings, tester re-verifies (axe/tests), stop on pass or escalate',
  whenToUse: 'หลัง tester เจอ defect ที่ auto-ตรวจได้ (axe/tests) → วนแก้-ตรวจเองจนผ่าน หรือครบ 3 รอบแล้ว escalate มา PM. Tier-B visual (จอจริง) ไม่ครอบ.',
  phases: [
    { title: 'Fix', detail: 'dev agent applies current findings on the branch, runs vitest+build+axe, commits' },
    { title: 'Verify', detail: 'tester agent re-runs axe + checklist, returns pass/findings' },
  ],
}

// args = { branch, item, findings, standards? }  (PM passes these when invoking)
const MAX_ROUNDS = 3
const VERDICT = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'findings'],
  properties: {
    pass: { type: 'boolean', description: 'true = ผ่าน Tier-A ทุกข้อ (axe 0 violation + tests green)' },
    findings: {
      type: 'array',
      items: { type: 'string' },
      description: 'defect ที่เหลือ (ว่าง = ผ่าน) — ระบุไฟล์:บรรทัด + กฎที่ผิด',
    },
  },
}

const branch = args?.branch
const item = args?.item || branch
const standards = args?.standards || 'docs/ui-standards.md + docs/pm/dockkey-checklist.md'
let findings = Array.isArray(args?.findings) ? args.findings : [String(args?.findings || '')]

if (!branch) return { error: 'ต้องส่ง args.branch' }

let round = 0
let verdict = null
const history = []

while (round < MAX_ROUNDS) {
  round++
  log(`[${item}] รอบ ${round}/${MAX_ROUNDS} — dev แก้: ${findings.join(' · ')}`)

  // Fix: dev applies the current findings, keeps within fence, runs auto-checks, commits.
  const fix = await agent(
    `คุณคือ dev pleng.phrakham.life. บน worktree ของคุณ: \`git switch ${branch}\` (เช็ก branch ก่อน).\n` +
    `แก้ให้ผ่าน tester findings ต่อไปนี้ (แก้ให้ตรงจุด · เล็กสุด · ตามมาตรฐาน ${standards}):\n` +
    findings.map((f, i) => `${i + 1}. ${f}`).join('\n') + `\n` +
    `ห้ามแตะไฟล์นอก scope ของ ${item}. เสร็จแล้วรัน \`npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'\` + \`npm run build\` ให้เขียว แล้ว commit บน ${branch}. ` +
    `รายงานสั้นๆ ว่าแก้ไฟล์:บรรทัดอะไร.`,
    { phase: 'Fix', label: `fix r${round}` },
  )

  // Verify: tester re-runs axe (Tier-A) + checklist, returns structured verdict.
  verdict = await agent(
    `คุณคือ tester (QA) pleng.phrakham.life. บน worktree: \`git switch ${branch}\`.\n` +
    `ตรวจ **Tier-A อัตโนมัติ** เทียบ ${standards}: รัน axe-core a11y (contrast/role/name/label/aria) บน component ที่เกี่ยว + vitest เขียว + no-caret-on-popup-trigger + single-popup + Esc/focus. ` +
    `**อย่าตรวจ Tier-B (no-scroll/target-size/contrast วัดพิกัดจอจริง) — subagent ไม่มีเบราว์เซอร์จริง ข้ามไป (PM ทำ gate นั้นทีหลัง).**\n` +
    `คืน pass=true เฉพาะเมื่อ axe 0 violation + tests เขียว. ถ้าไม่ผ่าน คืน findings (ไฟล์:บรรทัด + กฎ) ให้ dev รอบหน้า.`,
    { phase: 'Verify', label: `verify r${round}`, schema: VERDICT },
  )

  history.push({ round, changed: fix, verdict })
  if (verdict?.pass) { log(`[${item}] ✅ ผ่าน Tier-A รอบ ${round}`); break }
  findings = verdict?.findings?.length ? verdict.findings : findings
  log(`[${item}] รอบ ${round} ยังไม่ผ่าน: ${findings.join(' · ')}`)
}

// Escalate to PM: pass → ready for Tier-B/PM gate; fail after MAX_ROUNDS → PM decides (don't loop forever).
return {
  item,
  branch,
  rounds: round,
  tierA_pass: !!verdict?.pass,
  remaining: verdict?.pass ? [] : (verdict?.findings || findings),
  next: verdict?.pass
    ? 'พร้อม Tier-B (จอจริง) + PM gate → P\'Aim'
    : `ครบ ${MAX_ROUNDS} รอบยังไม่ผ่าน → PM escalate (อย่าวนต่อ · คนตัดสิน)`,
  history,
}
