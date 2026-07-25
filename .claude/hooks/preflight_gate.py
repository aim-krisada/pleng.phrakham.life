#!/usr/bin/env python3
"""Stop-hook tripwire (harness-enforced pre-flight gate).

Fires when the assistant finishes a turn. If the final message claims the
deliverable is shipped/done (deployed, published, ขึ้นเว็บ, จบงาน, ...) but
carries NO evidence block, the hook exits 2 to BLOCK the stop and feed the
reason back to the model — forcing a redo that opens the real artifact first.

Rules this enforces live in MEMORY.md (feedback_preflight_before_report /
feedback_verify_layer_report). The hook is the enforcement layer memory can't be.
"""
import sys, json, re, io

# --- identity (P'Aim 2026-07-25: named + versioned · universal across all projects) ---
HOOK_NAME = "hook ตรวจการทำงาน (work-verification gate)"
HOOK_VERSION = "1.1.0"   # 1.1.0 = narrow GATE to verdict-language + scrub code/quotes (cut false-fire on discussing the gate itself)

CLAIM = re.compile(
    r'(ขึ้นเว็บ|published|deployed|deploy\s*เสร็จ|go\s*live|จบงาน|'
    r'ผ่านหมด|เสร็จสมบูรณ์|verified\s*live|พร้อม\s*publish|ส่งขึ้น\s*production|live\s*แล้ว|'
    # + คำ relay-done-on-proxy ที่ทำ P'Aim จับได้ 4 ครั้ง (dc/ds "ขึ้นแล้ว ใช้ได้", "BI-011 PASS merge-ready")
    r'\bPASS\b|merge[\s-]*ready|ใช้งานได้|ใช้ได้จริง|ทำงานได้(แล้ว)?|ย้อนได้จริง|'
    r'\bworks\b|LIVE\s*แล้ว|พิสูจน์แล้ว|verified\b|merge-ready)',
    re.I)

EVIDENCE = re.compile(
    r'(หลักฐาน:|evidence:|proof:|ยังไม่พิสูจน์:|not\s*proven:|raw\s*output|verified:)',
    re.I)

# --- G-verify gate (P'Aim 2026-07-25 · universal way-of-working) ------------------------
# A claim that a DESIGN/BUILD deliverable is complete/correct must carry BOTH an evidence
# block AND a `G-VERIFY:` marker. G-VERIFY ≠ "G approved" — it means: G was used
# adversarially ("what is missing / what is wrong"), every standard claim was re-checked
# at its REAL source (URL + element name), and the seat/PM made the final call (G raises
# the floor of completeness/correctness, it does NOT replace judgment; G has hallucinated
# standards before). Infra/deploy facts (curl / HTTP 200 / git push) are NOT covered here —
# they need only the evidence block; G does not adjudicate an HTTP 200.
# v1.1.0: only VERDICT-language (a worker/PM handing a deliverable off as done+correct).
# Goal/topic words ("ครบตามมาตรฐาน", "Definition of Complete") and infra gate words
# ("ปิด gate", "gate ผ่าน") were removed — they appear constantly in normal PM discussion
# and caused false-fires. Matched against SCRUBBED text (code spans / quotes stripped) so
# QUOTING a trigger (e.g. listing `PASS`/`merge-ready`) does not fire.
GATE_CLAIM = re.compile(
    r'(\bPASS\b|merge[\s-]*ready|ถูกต้องครบ|verified\s*correct|\bDoC\b\s*(ผ่าน|verified))',
    re.I)

def scrub(text):
    text = re.sub(r'```.*?```', ' ', text, flags=re.S)   # fenced code blocks
    text = re.sub(r'`[^`]*`', ' ', text)                 # inline `code`
    text = re.sub(r'(?m)^\s*>.*$', ' ', text)            # > blockquotes (past-mistake recounts)
    return text
GVERIFY = re.compile(r'G-VERIFY', re.I)
GATE_REMINDER = (
    "G-VERIFY GATE — you claim a design/build deliverable is complete/correct but are "
    "missing the G-verify evidence. Do NOT end the turn. A completeness/correctness claim "
    "needs BOTH:\n"
    "  1) an evidence block (หลักฐาน: + ยังไม่พิสูจน์:)\n"
    "  2) a `G-VERIFY: <path>` line — G used adversarially ('what is missing/wrong'), every "
    "standard claim re-checked at its real source (URL/element), seat/PM made the final "
    "call. G-VERIFY is NOT 'G approved'.\n"
    "If G was not consulted, or you cannot cite it, say so plainly instead of claiming complete.")

REMINDER = (
    "PRE-FLIGHT GATE — your message claims the deliverable is shipped/done but has "
    "NO evidence block. Do not end the turn yet. Re-verify at a DIFFERENT layer than "
    "you edited (source -> build/live), then report with these three lines:\n"
    "  1) STEP: which pipeline step you are on\n"
    "  2) หลักฐาน: the REAL artifact you opened + raw output (URL/DOM/version/exit code)\n"
    "  3) ยังไม่พิสูจน์: what is still NOT proven (never blank)\n"
    "If you truly cannot verify, say so plainly instead of claiming done.")


def last_assistant_text(path):
    # Normalize an MSYS/Git-Bash path (/c/Users/..) to native (C:/Users/..) so the
    # native Python interpreter can open it whatever style the harness passes.
    m = re.match(r'^/([a-zA-Z])/(.*)$', path or '')
    if m:
        path = m.group(1) + ':/' + m.group(2)
    try:
        lines = io.open(path, encoding='utf-8').read().splitlines()
    except Exception:
        return ''
    text = ''
    for line in lines:
        try:
            o = json.loads(line)
        except Exception:
            continue
        if o.get('type') != 'assistant':
            continue
        c = (o.get('message') or {}).get('content')
        if isinstance(c, str):
            t = c
        elif isinstance(c, list):
            t = '\n'.join(b.get('text', '') for b in c
                          if isinstance(b, dict) and b.get('type') == 'text')
        else:
            t = ''
        if t.strip():
            text = t   # keep the LAST non-empty assistant text
    return text


def main():
    if '--version' in sys.argv or '-v' in sys.argv:
        print(f"{HOOK_NAME} v{HOOK_VERSION}")
        sys.exit(0)
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)                      # never block on our own error
    if data.get('stop_hook_active'):
        sys.exit(0)                      # already re-woke once — don't loop
    text = last_assistant_text(data.get('transcript_path', ''))
    if not text:
        sys.exit(0)
    tag = f"[{HOOK_NAME} v{HOOK_VERSION}]\n"
    scr = scrub(text)   # match claims on scrubbed text; find evidence/G-VERIFY on original
    # G-verify gate first (design/build completeness/correctness needs evidence + G-VERIFY)
    if GATE_CLAIM.search(scr) and not (EVIDENCE.search(text) and GVERIFY.search(text)):
        print(tag + GATE_REMINDER, file=sys.stderr)
        sys.exit(2)
    if CLAIM.search(scr) and not EVIDENCE.search(text):
        print(tag + REMINDER, file=sys.stderr)
        sys.exit(2)                      # block the stop, feed reason to model
    sys.exit(0)


if __name__ == '__main__':
    main()
