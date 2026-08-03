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

CLAIM = re.compile(
    r'(ขึ้นเว็บ|published|deployed|deploy\s*เสร็จ|go\s*live|จบงาน|'
    r'ผ่านหมด|เสร็จสมบูรณ์|verified\s*live|พร้อม\s*publish|ส่งขึ้น\s*production|live\s*แล้ว)',
    re.I)

EVIDENCE = re.compile(
    r'(หลักฐาน:|evidence:|proof:|ยังไม่พิสูจน์:|not\s*proven:|raw\s*output|verified:)',
    re.I)

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
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)                      # never block on our own error
    if data.get('stop_hook_active'):
        sys.exit(0)                      # already re-woke once — don't loop
    text = last_assistant_text(data.get('transcript_path', ''))
    if not text:
        sys.exit(0)
    if CLAIM.search(text) and not EVIDENCE.search(text):
        print(REMINDER, file=sys.stderr)
        sys.exit(2)                      # block the stop, feed reason to model
    sys.exit(0)


if __name__ == '__main__':
    main()
