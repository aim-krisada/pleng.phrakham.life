#!/usr/bin/env bash
# สร้างใบงาน 3 ใบของรอบ 19 ต.ค. 2569 เป็น GitHub issue ในนามบัญชี AI (aim-agent)
#
# ใช้ยังไง
#   export GH_TOKEN_AI_COMPANY=<personal access token ของ aim-agent>   (อย่าพิมพ์ค่าลงแชท)
#   bash docs/pm/tickets-2026-10-19/create-github-issues.sh
#
# สคริปต์นี้ "เช็กบัญชีก่อนเขียนออก" ตามกติกาใน CLAUDE.md ถ้า token ไม่ใช่ของบัญชี AI
# มันจะหยุดทันที ไม่เผลอเปิดใบในนามพี่เอม
#
# ใส่ DRY_RUN=1 ข้างหน้าเพื่อดูว่าจะสร้างอะไรบ้าง โดยยังไม่สร้างจริง
set -euo pipefail

REPO="aim-krisada/pleng.phrakham.life"
EXPECT_LOGIN="${EXPECT_LOGIN:-aim-agent}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN="${GH_TOKEN_AI_COMPANY:-}"

if [ -z "$TOKEN" ]; then
  echo "หยุด: ไม่มี GH_TOKEN_AI_COMPANY" >&2
  echo "ต้องเป็น token ของบัญชี $EXPECT_LOGIN ซึ่งมีสิทธิ์ write ใน $REPO อยู่แล้ว" >&2
  exit 1
fi

api() { curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "$@"; }

LOGIN="$(api https://api.github.com/user | python3 -c 'import json,sys; print(json.load(sys.stdin).get("login",""))')"
if [ "$LOGIN" != "$EXPECT_LOGIN" ]; then
  echo "หยุด: token นี้เป็นของ '$LOGIN' ไม่ใช่ '$EXPECT_LOGIN'" >&2
  echo "กติกาใน CLAUDE.md: AI เขียนออกในนามบัญชี AI เท่านั้น ห้ามใช้บัญชีพี่เอม" >&2
  exit 1
fi
echo "ยิงในนาม: $LOGIN"

for f in "$DIR"/0*.md; do
  python3 - "$f" > /tmp/issue-payload.json <<'PY'
import json, sys, io
raw = io.open(sys.argv[1], encoding='utf-8').read()
head, body = raw.split('\n---\n', 1)
meta = dict(
    (k.strip(), v.strip())
    for k, v in (line.split(':', 1) for line in head.strip().splitlines() if ':' in line)
)
body = body.strip() + (
    '\n\n---\n*เปิดโดยบัญชี AI ของบริษัท · เนื้อใบมาจาก '
    '`%s` ในที่เก็บ · แบบฟอร์ม %s*\n' % ('docs/pm/tickets-2026-10-19/' + sys.argv[1].rsplit('/', 1)[-1], meta.get('form', '-'))
)
json.dump({'title': meta['title'], 'body': body}, open('/dev/stdout', 'w'), ensure_ascii=False)
PY
  TITLE="$(python3 -c 'import json;print(json.load(open("/tmp/issue-payload.json"))["title"])')"
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "DRY_RUN จะสร้าง: $TITLE"
    continue
  fi
  URL="$(api -X POST "https://api.github.com/repos/$REPO/issues" --data-binary @/tmp/issue-payload.json \
        | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("html_url") or d)')"
  echo "สร้างแล้ว: $URL"
  echo "           $TITLE"
done
rm -f /tmp/issue-payload.json
