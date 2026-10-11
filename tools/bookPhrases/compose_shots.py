# ใบ v3/pleng#105 — put the printed page and the screen side by side, one picture per song,
# so the phrasing can be checked by eye. READ-ONLY on the PDF.
#
#   python tools/bookPhrases/compose_shots.py "<book.pdf>" --ids tmp105/shot-ids.json \
#          --shots tmp105/shots --book-text tools/bookPhrases/book-anuchon.json --out docs/backlog-assets
import argparse, json, os
import pymupdf
from PIL import Image, ImageDraw, ImageFont

W_BOOK, W_SHOT, PAD, BG = 900, 900, 24, (255, 255, 255)
FONT = r'C:\Windows\Fonts\tahoma.ttf'
FONT_B = r'C:\Windows\Fonts\tahomabd.ttf'


def fit(img, w):
    return img.resize((w, max(1, round(img.height * w / img.width))), Image.LANCZOS)


def label(text, w, size=26, bold=True, color=(20, 20, 20)):
    f = ImageFont.truetype(FONT_B if bold else FONT, size)
    im = Image.new('RGB', (w, size + 16), BG)
    ImageDraw.Draw(im).text((0, 4), text, font=f, fill=color)
    return im


def stack(parts, w):
    h = sum(p.height for p in parts) + PAD * (len(parts) - 1)
    im = Image.new('RGB', (w, h), BG)
    y = 0
    for p in parts:
        im.paste(p, (0, y))
        y += p.height + PAD
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--ids', required=True)
    ap.add_argument('--shots', required=True)
    ap.add_argument('--book-text', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    doc = pymupdf.open(a.pdf)
    ids = json.load(open(a.ids, encoding='utf-8'))
    book = {s['number']: s for s in json.load(open(a.book_text, encoding='utf-8'))['songs']}
    os.makedirs(a.out, exist_ok=True)

    for s in ids:
        num = str(int(s['number']))
        rec = book.get(num, {})
        # the pages the phrasing actually came from, then the song's first page for context
        pages = sorted({v['page'] for v in rec.get('verses', [])} | set(rec.get('pages', [])[:1]))[:3]
        left = [label(f'หนังสือเล่มอนุชน · เพลง {num} {s["title_th"]} · หน้า {", ".join(map(str, pages))}', W_BOOK)]
        for p in pages:
            pix = doc[p - 1].get_pixmap(dpi=150)
            left.append(fit(Image.frombytes('RGB', (pix.width, pix.height), pix.samples), W_BOOK))
        right = []
        for mode, cap in (('book', 'บนจอ · เนื้อล้วน · "ตามต้นฉบับ" (ใบ #105 — ของใหม่)'),
                          ('join', 'บนจอ · เนื้อล้วน · "ติดกันเป็นวรรคตามทำนอง" (ของเดิม ใบ #100)')):
            f = os.path.join(a.shots, f'{s["number"]}-{mode}.png')
            if not os.path.exists(f):
                continue
            right.append(label(cap, W_SHOT, color=(140, 30, 30) if mode == 'book' else (60, 60, 60)))
            right.append(fit(Image.open(f).convert('RGB'), W_SHOT))
        L, R = stack(left, W_BOOK), stack(right, W_SHOT)
        H = max(L.height, R.height) + PAD * 2
        out = Image.new('RGB', (W_BOOK + W_SHOT + PAD * 3, H), BG)
        out.paste(L, (PAD, PAD))
        out.paste(R, (W_BOOK + PAD * 2, PAD))
        ImageDraw.Draw(out).line([(W_BOOK + PAD + PAD // 2, 0), (W_BOOK + PAD + PAD // 2, H)], fill=(200, 200, 200), width=2)
        path = os.path.join(a.out, f'B105-book-phrase-{num}.png')
        out.save(path)
        print(path, out.size)


if __name__ == '__main__':
    main()
