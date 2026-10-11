# ใบ v3/pleng#105 — Step 1 of the book-phrase tool: READ the printed songbook PDF and write out,
# for every song, the verses that the book prints as PLAIN TEXT (the extra verses under the music).
#
# Why only the plain-text verses: the lyric lines that sit UNDER the staff are spaced to line up
# with the notes above them (" สิ่ง  ใด         ดี? "), so their gaps say nothing about phrasing.
# The plain-text verse blocks are typeset for reading, and there a run of 2+ spaces IS the
# phrase break the book intends ("ข้าจะถวายสิ่งใดดี?      แด่ผู้การุณย์มั่นคง").
#
# READ-ONLY: this never writes to the PDF and never touches the song database.
#
#   python tools/bookPhrases/extract_book_text.py "<book.pdf>" -o tools/bookPhrases/book-anuchon.json
import argparse, json, re, sys
from pypdf import PdfReader

THAI = re.compile(r'[฀-๿]')
# Thai marks that hang above/below the consonant. The PDF text layer often spits them out with a
# space on each side ("เป ็ น", "ฟ ้ า") — ใบ#105 note 6. Glue them back before anything else.
COMBINING = 'ัิีึืฺุู็่้๊๋์ํ๎'
NOTE_CHARS = set("0123456789-–|║:.()[]{}'~^_ ♭♯♮♩□·๑")
PAGE_HEAD = re.compile(r'^\s*(\d{1,3})\.(\d{1,2})\s*$')
VERSE_HEAD = re.compile(r'^\s*(\d{1,2})\s*[.)]\s*(?=\S)')
REFRAIN_HEAD = re.compile(r'^\s*\((รับ|ร้องรับ|ประสานเสียง)\)\s*')


def unglue(s):
    """Put a stray-spaced Thai mark back on its consonant: 'เป ็ น' -> 'เป็น'."""
    # Exactly ONE space is a glitch; a wider gap is the book's own phrase break and must survive
    # (many Thai syllables END in a mark — "ความมั่งมี  มอบทุกสิ่ง" — so ' +' would eat the break).
    s = re.sub(r'(?<=[฀-๿]) (?=[' + COMBINING + r'])', '', s)
    s = re.sub(r'(?<=[' + COMBINING + r']) (?=[฀-๿])', '', s)
    return s


def is_note_line(ln):
    t = ln.strip()
    if not t or THAI.search(t):
        return False
    core = [c for c in t if not c.isspace()]
    if len(core) < 3:
        return False
    return sum(1 for c in core if c in NOTE_CHARS) / len(core) >= 0.6


def is_chord_line(ln):
    t = ln.strip()
    if not t or THAI.search(t):
        return False
    # "A  F♯m  Bm  E7" — latin note letters, nothing else
    return bool(t) and all(re.fullmatch(r"[A-G][#b♯♭]?(m|maj|min|dim|aug|sus)?\d*(/[A-G][#b♯♭]?)?", w) for w in t.split())


def phrases_of(line):
    """One printed lyric line -> its phrase chunks. 2+ spaces = a break the book drew;
    a single space is just loose typesetting (the database keeps no spaces) so it is dropped."""
    t = unglue(line).replace(' ', ' ').strip()
    t = re.sub(r'\s*[│‖║]\s*', '  ', t)  # a bar glyph that leaked in = a gap
    parts = [re.sub(r'\s+', '', p) for p in re.split(r' {2,}', t)]
    return [p for p in parts if p]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('-o', '--out', required=True)
    ap.add_argument('--book', default='anuchon')
    a = ap.parse_args()

    reader = PdfReader(a.pdf)
    songs = {}
    skipped_pages = 0
    for pno, page in enumerate(reader.pages):
        raw = (page.extract_text() or '').split('\n')
        head = next((l for l in raw if l.strip()), '')
        m = PAGE_HEAD.match(head)
        if not m:
            skipped_pages += 1
            continue
        num = str(int(m.group(1)))
        rec = songs.setdefault(num, {'number': num, 'pages': [], 'verses': []})
        rec['pages'].append(pno + 1)

        kinds = ['note' if is_note_line(l) else 'chord' if is_chord_line(l) else 'text' for l in raw]
        i = 0
        while i < len(raw):
            ln = raw[i]
            under_music = i > 0 and kinds[i - 1] == 'note'
            vm, rm = VERSE_HEAD.match(ln), REFRAIN_HEAD.match(ln)
            if kinds[i] == 'text' and THAI.search(ln) and not under_music and (vm or rm):
                label = ('ข้อ ' + vm.group(1)) if vm else 'รับ'
                body = [(vm or rm).sub('', ln, count=1) if False else ln[(vm or rm).end():]]
                j = i + 1
                while j < len(raw):
                    nxt = raw[j]
                    if not nxt.strip() or kinds[j] != 'text' or not THAI.search(nxt):
                        break
                    if VERSE_HEAD.match(nxt) or REFRAIN_HEAD.match(nxt) or (j > 0 and kinds[j - 1] == 'note'):
                        break
                    body.append(nxt)
                    j += 1
                lines = [phrases_of(b) for b in body]
                lines = [l for l in lines if l]
                if lines:
                    rec['verses'].append({'label': label, 'page': pno + 1, 'lines': lines})
                i = j
                continue
            i += 1

    out = {'book': a.book, 'source': a.pdf, 'pages': len(reader.pages),
           'songs': [songs[k] for k in sorted(songs, key=int)]}
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    nv = sum(len(s['verses']) for s in out['songs'])
    print(f"songs with pages: {len(songs)} · plain-text verses found: {nv} · pages with no NN.M header: {skipped_pages}", file=sys.stderr)


if __name__ == '__main__':
    main()
