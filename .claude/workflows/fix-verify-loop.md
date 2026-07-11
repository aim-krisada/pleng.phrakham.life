export const meta = {
  name: 'fix-verify-loop',
  description: 'Auto dev↔tester loop (≤3 rounds) — dev applies tester findings, tester re-verifies (axe/tests), stop on pass or escalate',
  whenToUse: 'หลัง tester เจอ defect → วนแก้-ตรวจเอง (Tier-A axe/tests + Tier-B จอจริงผ่าน Claude Browser MCP) จนผ่าน หรือครบ 3 รอบแล้ว escalate มา PM.',
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

  // Verify: tester re-runs Tier-A (axe/tests) AND Tier-B (real browser via Claude Browser MCP).
  verdict = await agent(
    `คุณคือ tester (QA) pleng.phrakham.life. บน worktree: \`git switch ${branch}\`.\n` +
    `**Tier-A (unit):** รัน axe-core a11y (contrast/role/name/label/aria) + vitest เขียว + no-caret-on-popup-trigger + single-popup + Esc/focus.\n` +
    `**Tier-B (จอจริง — ใช้ Claude Browser MCP · โหลดผ่าน ToolSearch "select:mcp__Claude_Browser__preview_start,mcp__Claude_Browser__navigate,mcp__Claude_Browser__resize_window,mcp__Claude_Browser__read_page,mcp__Claude_Browser__javascript_tool,mcp__Claude_Browser__computer"):** เปิด dev server ของ branch (\`npx vite <worktree> --host --port <p> --strictPort\` แล้ว preview_start/navigate ไป url) → resize 375/768/1280 → วัดจริงด้วย javascript_tool: **no-scroll** (\`scrollWidth<=clientWidth && scrollHeight<=clientHeight\` ของ popup/dock), **target-size** (ปุ่ม \`getBoundingClientRect\` >=44px), **contrast** (computed color vs bg หรือ axe ในเบราว์เซอร์), popup clamp ไม่ล้นขอบ, layout ตาม ui-standards · screenshot เก็บหลักฐาน.\n` +
    `เทียบ ${standards} ทุกข้อ. คืน pass=true เฉพาะเมื่อ **Tier-A + Tier-B ผ่านหมด** (axe 0 violation · tests เขียว · no-scroll · target>=44 · contrast ผ่าน). ถ้าไม่ผ่าน คืน findings (ไฟล์:บรรทัด/จุด + กฎ) ให้ dev รอบหน้า.`,
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
    ? 'ผ่าน Tier-A+B (axe/tests + จอจริง) → PM gate → P\'Aim (เหลือแค่ตัดสินทิศทาง/ความสวย)'
    : `ครบ ${MAX_ROUNDS} รอบยังไม่ผ่าน → PM escalate (อย่าวนต่อ · คนตัดสิน)`,
  history,
}
