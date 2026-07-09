#!/usr/bin/env python
"""
parse_song.py — turn one YS-batch song (PDF + DOCX pair) into a v2 song-model JSON seed.

Source strategy (Step 1 decision — see docs/reports/da-import.md):
  * MELODY from the PDF via pdfplumber geometry. Note digits carry precise (x, y);
    octave dots are vector `curves` above/below a digit; eighth/sixteenth underlines
    are thin horizontal `rects`; chords are the letter row above. The PDF is the only
    source that renders octave dots positionally — 114/120 songs bury them in Word as
    free-floating drawing ovals that no text/format read can tie back to a note.
  * THAI LYRICS from the DOCX (the PDF drops every Thai glyph to punctuation).
    Syllables are read in order and aligned 1:1 to the melody's syllable-bearing notes.

Seed generator: it flags every uncertainty (beat mismatch, syllable/​note mismatch,
repeat/volta, low confidence) so a human repairs it in Studio. Never guesses silently.

Usage:  python parse_song.py "<pdf>" "<docx>" [-o out.json] [--debug]
"""
import sys, os, json, re
import pdfplumber
from docx import Document
from docx.oxml.ns import qn

THAI = lambda ch: '฀' <= ch <= '๿'
ACC = {'♯': '#', '♮': 'n', '♭': 'b'}
EXPECT = {'4/4': 4, '3/4': 3, '6/8': 3, '2/4': 2, '4/8': 2, '12/8': 6, '9/8': 4.5, '2/2': 4, '3/8': 1.5, '6/4': 6}

# The 8 topical themes (a layer-2 sub-category under `category`); can appear on the
# title line OR the key line. Book cross-refs = a Thai abbrev + "." + number.
THEMES = ['กิตติคุณ', 'รักปรารถนา', 'มอบถวาย', 'คริสตจักร', 'ประสบการณ์', 'พระคัมภีร์', 'อาณาจักร', 'ความสุขแห่งความรอด']
BOOKREF = re.compile(r'([ก-ฮ]{1,3})\s*\.\s*(\d+)')

def parse_title_meta(header):
    """From the DOCX header lines → (clean_title, theme, book_refs, scripture).
    Splits the parenthetical clutter out of the title: theme (8 topics), book cross-
    refs [{book,no}] (Thai code kept; frontend maps to real name), and a scripture ref."""
    raw = re.sub(r'^\d+\s+', '', header[0]) if header else ''
    scan = raw + ' ' + (header[1] if len(header) > 1 else '')
    theme = next((t for t in THEMES if t in scan), None)
    book_refs, scripture = [], None
    seen = set()
    for p in re.findall(r'\(([^)]*)\)', scan):
        if re.search(r'\d+\s*:\s*\d+', p):            # a scripture ref (chapter:verse)
            if scripture is None: scripture = re.sub(r'\s+', ' ', p).strip()
        else:
            for b, n in BOOKREF.findall(p):           # book cross-refs
                if (b, n) not in seen:
                    seen.add((b, n)); book_refs.append({'book': b, 'no': int(n)})
    clean = re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)', '', raw)).strip()
    return clean, theme, book_refs, scripture

# ----------------------------------------------------------------- PDF melody

def cluster_rows(chars, tol=3):
    rows = []
    for c in sorted(chars, key=lambda c: (c['top'], c['x0'])):
        for r in rows:
            if abs(r['top'] - c['top']) <= tol:
                r['chars'].append(c); break
        else:
            rows.append({'top': c['top'], 'chars': [c]})
    for r in rows:
        r['chars'].sort(key=lambda c: c['x0'])
        r['top'] = min(c['top'] for c in r['chars'])
    return sorted(rows, key=lambda r: r['top'])

def is_note_row(row):
    txt = [c['text'] for c in row['chars']]
    return sum(t in '01234567' for t in txt) >= 4 and not any(THAI(t) for t in txt)

def octave_of(digit, curves):
    cx = (digit['x0'] + digit['x1']) / 2
    dt = digit['top']
    best = None
    for cu in curves:
        ccx = (cu['x0'] + cu['x1']) / 2
        if abs(ccx - cx) > 6:
            continue
        off = cu['top'] - dt                 # vertical offset from the digit's top
        if 13 <= off <= 30:   d = 'low'      # dot below the number
        elif -16 <= off <= -3: d = 'high'    # dot above the number
        else: continue
        dist = abs(ccx - cx)
        if best is None or dist < best[1]: best = (d, dist)
    return best[0] if best else None

def underline_count(digit, rects):
    tops = []
    for r in rects:
        if r['width'] > 4 and r['height'] < 2 and r['x0'] < digit['x1'] and r['x1'] > digit['x0']:
            off = r['top'] - digit['top']
            if 13 <= off <= 26:
                tops.append(round(r['top']))
    return min(len(set(tops)), 2)

def group_chords(chars):
    toks, cur = [], None
    for c in sorted(chars, key=lambda c: c['x0']):
        t = c['text']
        if t.isspace():
            cur = None; continue
        t = ACC.get(t, t)
        if cur and c['x0'] - cur['x1'] < 5:
            cur['text'] += t; cur['x1'] = c['x1']
        else:
            cur = {'x0': c['x0'], 'x1': c['x1'], 'text': t}; toks.append(cur)
    return [(tk['x0'], tk['text'].strip()) for tk in toks if re.match(r'^[A-G]', tk['text'].strip())]

def dur(tok):
    """Quarter-note beats for one note token (fallback beat-count barring only)."""
    if tok == '-': return 1.0
    u = tok.count('_'); base = 0.5 ** u          # each underline halves
    if re.search(r"\d'?_*\.$", tok): base *= 1.5  # trailing '.' = augmentation dot (×1.5)
    return base

def parse_pdf_melody(pdf_path, debug=False):
    systems = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            rows = cluster_rows(page.chars)
            for ri, row in enumerate(rows):
                if not is_note_row(row): continue
                top = row['top']; bottom = max(c['bottom'] for c in row['chars'])
                curves = [c for c in page.curves if top - 20 <= c['top'] <= bottom + 20]
                rects = page.rects
                notes, pending = [], ''
                markers, bars_x = [], []
                for c in row['chars']:
                    t = c['text']
                    if t in ACC: pending = ACC[t]; continue
                    if t in '01234567':
                        oc = octave_of(c, curves); u = underline_count(c, rects)
                        tok = ('.' if oc == 'low' else '') + (pending) + t + ("'" if oc == 'high' else '') + '_' * u
                        pending = ''
                        notes.append({'x': c['x0'], 'x1': c['x1'], 'tok': tok})
                    elif t in '-–':
                        notes.append({'x': c['x0'], 'x1': c['x0'] + 6, 'tok': '-'})
                    elif t == '.':
                        if notes and notes[-1]['tok'] not in ('-',) and c['x0'] > notes[-1].get('x1', 0) - 2 and c['x0'] - notes[-1]['x'] < 12:
                            notes[-1]['tok'] += '.'
                    elif len(t) == 1 and ord(t) == 0xF0BD:          # printed barline glyph (music font)
                        bars_x.append(c['x0'])
                    elif t == chr(0x2551):               # double/repeat/end barline
                        bars_x.append(c['x0']); markers.append((c['x0'], t))
                    elif t == ':':                       # repeat colon
                        markers.append((c['x0'], t))
                # chord row above — REQUIRED. A real melody staff always has a chord
                # line above it; rows without one are page footers ("100.1"), verse-only
                # pages, or the English translation → skip (they are not melody).
                chords = None
                for above in reversed(rows[:ri]):
                    if above['top'] <= top - 45: break
                    if any(c['text'] in 'ABCDEFG' for c in above['chars']):
                        chords = group_chords(above['chars']); break
                if chords is None:
                    continue
                systems.append({'chords': chords, 'notes': notes, 'markers': markers,
                                'bars_x': bars_x, 'top': top, 'page': page.page_number})
                if debug:
                    print(f"[p{page.page_number} top={top:.0f}] " + ' '.join(n['tok'] for n in notes))
                    print("    chords:", [(round(x), t) for x, t in chords], "bars:", [round(b) for b in bars_x], "markers:", markers)
    return systems

# --------------------------------------------------------------- DOCX lyrics

def docx_blocks(path):
    """Ordered list of {note: <text>, lyrics: [lines]} — one per printed staff line."""
    doc = Document(path)
    NOTECHARS = set("01234567.-♯♮♭║:()0,~ \t")
    def txt(p):
        return ''.join((n.text or '') if n.tag == qn('w:t') else ('\t' if n.tag == qn('w:tab') else '')
                        for n in p._p.iter())
    def is_note(t):
        lo = [c for c in t if c not in NOTECHARS]
        return sum(c.isdigit() for c in t) >= 4 and len(lo) <= 1
    def is_chord(t):
        return bool(re.search(r'[A-G][#♯b♭m0-9/]', t)) and not any(THAI(c) for c in t)
    blocks, cur = [], None
    header = []
    for p in doc.paragraphs:
        t = txt(p).rstrip()
        if not t.strip(): continue
        if is_note(t):
            cur = {'note': t, 'lyrics': []}; blocks.append(cur)
        elif cur is not None and not is_chord(t) and any(THAI(c) for c in t):
            cur['lyrics'].append(t.strip())
        elif not blocks and not is_chord(t):
            header.append(t.strip())
    return header, blocks

def split_syls(lyric):
    """Segment a Thai lyric line into syllables aligned to notes.
    Respects the author's explicit spaces (word/phrase breaks) and hyphens (same-word
    syllable breaks, kept as a leading '-'); for an unspaced Thai chunk it falls back to
    the pythainlp dictionary syllable tokenizer. Commas are phrase punctuation, dropped."""
    from pythainlp import subword_tokenize
    out = []
    for chunk in lyric.replace(',', ' ').split():
        parts = chunk.split('-')                     # author's own syllable hyphens
        for pi, part in enumerate(parts):
            if not part: continue
            syls = subword_tokenize(part, engine='dict') or [part]
            for si, s in enumerate(syls):
                s = s.strip()
                if not s: continue
                # a leading '-' (visible hyphen) marks the author's OWN same-word split
                # (ส-ถิต); tokenizer-split syllables are space-joined like existing seeds.
                out.append('-' + s if (pi > 0 and si == 0) else s)
    return out

def strip_label(lyric):
    m = re.match(r'^\s*(\(รับ\)|\(สร้อย\)|\d+\.)\s*(.*)$', lyric)
    if m:
        lab = m.group(1)
        lab = 'รับ' if 'รับ' in lab or 'สร้อย' in lab else 'ร้อง ' + lab.rstrip('.')
        return lab, m.group(2)
    return '', lyric

# --------------------------------------------------------------- assemble v2

def notes_to_line_items(notes, chords, bars_x, ts):
    """Split a system's notes into [{segment}|{bar}] items. Bars come from the PRINTED
    barline glyphs (bars_x) — this captures pickups and irregular bars exactly; falls
    back to beat-count only if a line prints no barlines. Chords split segments by x."""
    exp = EXPECT.get(ts)
    bars_x = sorted(bars_x)
    def chord_at(nx):
        best = None
        for cx, ct in chords:
            if cx <= nx + 8 and (best is None or cx > best[0]): best = (cx, ct)
        return best[1] if best else ''
    def bar_index(nx):
        return sum(1 for bx in bars_x if bx < nx)
    items, seg, warn = [], None, []
    last_chord, cur_bar = None, (bar_index(notes[0]['x']) if notes else 0)
    def flush_seg():
        nonlocal seg
        if seg and seg['note'].strip():
            items.append({'type': 'segment', 'chord': seg['chord'], 'note': seg['note'].strip()})
        seg = None
    if bars_x:                                   # split by printed barlines
        for n in notes:
            bi = bar_index(n['x'])
            if bi != cur_bar:
                flush_seg(); items.append({'type': 'bar'}); cur_bar = bi; last_chord = None
            ch = chord_at(n['x']); newchord = (ch != last_chord and ch != '')
            if seg is None or newchord:
                flush_seg(); seg = {'chord': ch if newchord else '', 'note': ''}; last_chord = ch
            seg['note'] += ' ' + n['tok']
        flush_seg()
    else:                                        # fallback: beat-count barring
        beats = 0.0
        for n in notes:
            ch = chord_at(n['x']); newchord = (ch != last_chord)
            if seg is None or newchord:
                flush_seg(); seg = {'chord': ch if newchord else '', 'note': ''}; last_chord = ch
            seg['note'] += ' ' + n['tok']; beats += dur(n['tok'])
            if exp and beats >= exp - 0.01:
                flush_seg(); items.append({'type': 'bar'}); beats = max(0.0, beats - exp); seg = {'chord': '', 'note': ''}
        flush_seg()
        warn.append('no printed barlines — bars inferred by beat count (verify)')
    return items, warn

DEFAULT_CATEGORY = 'anuchon'   # this batch = หมวด "อนุชน"; frontend maps code→ชื่อไทย

def schema_sql():
    """Idempotent schema prep — songs keyed by (category, number), + verified flag.
    Run ONCE before the upserts. Safe to re-run."""
    return (
        "-- --- schema prep (idempotent) ------------------------------------------\n"
        "-- category = key code (frontend maps 'anuchon' -> 'อนุชน'); number is unique\n"
        "-- PER category, so (category, number) is the real key (เลข 1 อนุชน != เลข 1 ยุวชน).\n"
        "alter table public.songs add column if not exists category text not null default 'anuchon';\n"
        "alter table public.songs add column if not exists verified boolean not null default false;\n"
        "-- split-out title metadata (P'Aim 9-Jul): title_th is now the clean title;\n"
        "-- theme = 1 of 8 topics (layer-2 sub-category); book_refs = cross-refs to other\n"
        "-- hymnals [{book: <thai code>, no: N}]; scripture = a bible reference or null.\n"
        "alter table public.songs add column if not exists theme text;\n"
        "alter table public.songs add column if not exists book_refs jsonb not null default '[]'::jsonb;\n"
        "alter table public.songs add column if not exists scripture text;\n"
        "-- drop the old single-column unique on (number) so (category, number) can coexist:\n"
        "do $$\n"
        "declare c text;\n"
        "begin\n"
        "  select con.conname into c from pg_constraint con\n"
        "  join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)\n"
        "  where con.conrelid = 'public.songs'::regclass and con.contype = 'u'\n"
        "    and array_length(con.conkey, 1) = 1 and a.attname = 'number';\n"
        "  if c is not null then execute format('alter table public.songs drop constraint %I', c); end if;\n"
        "end $$;\n"
        "create unique index if not exists songs_category_number_key\n"
        "  on public.songs (category, number);\n"
        "-- ------------------------------------------------------------------------\n\n"
    )

def _sqlstr(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

def to_sql(doc, category=DEFAULT_CATEGORY):
    number, title = doc['number'], doc['title_th']
    content, warnings = doc['content'], doc['_warnings']
    j = json.dumps(content, ensure_ascii=False)
    esc = title.replace("'", "''")
    theme = _sqlstr(doc.get('theme'))
    refs = json.dumps(doc.get('book_refs') or [], ensure_ascii=False)
    scripture = _sqlstr(doc.get('scripture'))
    head = f"-- Seed song #{number} [{category}] — upsert by (category, number); overwrites\n"
    if warnings:
        head += "-- REVIEW in Studio after loading (Claude seeds, P'Pao fixes):\n"
        head += ''.join(f"--   * {w}\n" for w in warnings)
    # verified=false on BOTH insert and conflict-update (P'Aim 9-Jul): a re-import
    # overwrites content = a fresh seed = must be re-checked, so prior verification is
    # intentionally reset.
    return (head +
            "insert into public.songs (category, number, title_th, title_en, content, verified, theme, book_refs, scripture)\n"
            f"values ('{category}', {number}, '{esc}', null, $json${j}$json$::jsonb, false, {theme}, $refs${refs}$refs$::jsonb, {scripture})\n"
            "on conflict (category, number) do update\n"
            "  set title_th = excluded.title_th, title_en = excluded.title_en,\n"
            "      content = excluded.content, verified = false,\n"
            "      theme = excluded.theme, book_refs = excluded.book_refs, scripture = excluded.scripture;\n")

def build_song(pdf, docx, debug=False):
    """Parse one PDF+DOCX pair → {number,title_th,title_en,content,_warnings}."""
    systems = parse_pdf_melody(pdf, debug=debug)
    header, blocks = docx_blocks(docx)

    # metadata from docx header
    warnings = []
    title, theme, book_refs, scripture = parse_title_meta(header)
    if not title: title = os.path.basename(docx)
    if theme is None: warnings.append('theme not found in title/key line — set manually')
    number = int(re.match(r'^(\d+)', os.path.basename(docx)).group(1))
    key, ts = None, None
    for h in header:
        mk = re.search(r'([A-G][#♯b♭]?)\s*(?:Major|major|Maj|เมเจอร์)', h)
        if mk and key is None: key = mk.group(1).replace('♯', '#').replace('♭', 'b')
        mt = re.search(r'(\d+\s*/\s*\d+)', h)
        if mt and ts is None: ts = mt.group(1).replace(' ', '')
    if ts is None: ts = '4/4'; warnings.append('time signature not found — defaulted 4/4')
    header_key = key

    # DECISION (P'Aim 9-Jul): store `key` = the SOUNDING key of the chords (drives
    # transpose + playback), NOT the header's do-reference. Tonic ≈ the final chord's
    # root (songs end on the tonic); fall back to the first chord. Keep header key as a
    # note when it differs (e.g. song 10: header "C", chords in B).
    def chord_root(t):
        m = re.match(r'([A-G])([#b]?)', t)
        return (m.group(1) + m.group(2)) if m else None
    chord_seq = [chord_root(t) for s in systems for _, t in s['chords'] if chord_root(t)]
    key = (chord_seq[-1] if chord_seq else None) or header_key or 'C'
    if not chord_seq: warnings.append('no chords found — key defaulted; verify')
    if header_key and header_key != key:
        warnings.append(f'header key "{header_key}" != stored sounding key "{key}" (from chords; movable-do). Numbers still reference do; transpose uses "{key}". Verify tonic.')
    if len(systems) != len(blocks):
        warnings.append(f'PDF systems ({len(systems)}) != DOCX staff lines ({len(blocks)}) — pairing by order may drift')

    # build stanzas (dedup identical melody) + arrangement rows
    stanzas, key_to_id, arrangement = [], {}, []
    next_id = ord('A')
    for i, sysm in enumerate(systems):
        items, w = notes_to_line_items(sysm['notes'], sysm['chords'], sysm.get('bars_x', []), ts)
        for msg in w: warnings.append(f'system {i+1}: {msg}')
        if sysm['markers']:
            warnings.append(f"system {i+1}: repeat/volta markers {sysm['markers']} — NEEDS manual repeat/volta")
        melody_key = json.dumps(items, ensure_ascii=False)
        if melody_key not in key_to_id:
            sid = chr(next_id); next_id += 1
            key_to_id[melody_key] = sid
            stanzas.append({'id': sid, 'lines': [items]})
        sid = key_to_id[melody_key]
        attacks = attack_count(items)
        lyric_lines = blocks[i]['lyrics'] if i < len(blocks) else []
        if not lyric_lines: lyric_lines = ['']
        for ll in lyric_lines:
            label, body = strip_label(ll)
            toks = split_syls(body)
            # A lyric "line" with far more syllables than the melody has attack notes is
            # a stacked extra-verse block (verse 2/3 lyric-only text that the DOCX dumps
            # after the last staff). Don't bloat this row — flag it for manual placement.
            if attacks and len(toks) > attacks + 6 and len(toks) > attacks * 1.6:
                warnings.append(f'system {i+1}: extra/overflow verse text ({len(toks)} syllables vs {attacks} notes) NOT auto-placed — add as its own ข้อ manually')
                continue
            syls = align_syllables(items, toks, i + 1, warnings)
            arrangement.append({'stanza': sid, 'label': label, 'syllables': syls})

    content = {'version': 2, 'key': key, 'timeSignature': ts,
               'stanzas': stanzas, 'arrangement': arrangement}
    if header_key and header_key != key:
        content['headerKey'] = header_key      # do-reference from the songbook, for note only
    return {'number': number, 'title_th': title, 'title_en': None,
            'theme': theme, 'book_refs': book_refs, 'scripture': scripture,
            'content': content, '_warnings': warnings}

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    pdf, docx = args[0], args[1]
    out = sys.argv[sys.argv.index('-o') + 1] if '-o' in sys.argv else None
    sys.stdout.reconfigure(encoding='utf-8')
    doc_out = build_song(pdf, docx, debug='--debug' in sys.argv)
    warnings = doc_out['_warnings']
    text = json.dumps(doc_out, ensure_ascii=False, indent=2)
    if out:
        open(out, 'w', encoding='utf-8').write(text)
        if out.endswith('.json'):
            sql = out[:-5] + '.sql'
            open(sql, 'w', encoding='utf-8').write(schema_sql() + to_sql(doc_out))
            print('wrote', out, '+', os.path.basename(sql))
        else:
            print('wrote', out)
    else:
        print(text)
    if warnings:
        print('\n--- WARNINGS ---', file=sys.stderr)
        for w in warnings: print(' *', w, file=sys.stderr)

def box_kinds(items):
    """Per note-box kind (attack/held/struct) across a system — mirrors notation.js."""
    kinds, prev, slur = [], None, False
    for it in items:
        if it['type'] != 'segment': continue
        for box in it['note'].split():
            if box in ('(', ')'): slur = (box == '('); prev = None; kinds.append('struct'); continue
            if box in ('{', '}'): prev = None; kinds.append('struct'); continue
            if box in ('-', '–'): kinds.append('held'); continue
            m = re.match(r"([#bn]?)(\.*)([0-7])('*)", box)
            if not m: prev = None; kinds.append('struct'); continue
            acc, low, pitch, high = m.groups()
            if pitch == '0': prev = None; kinds.append('held'); continue
            k = acc + pitch + str(len(high) - len(low))
            kinds.append('held' if (slur and prev == k) else 'attack'); prev = k
    return kinds

def attack_count(items):
    return sum(1 for k in box_kinds(items) if k == 'attack')

def align_syllables(items, syls, sysno, warnings):
    """Place syllables onto syllable-bearing note boxes (attack=word, held/rest=blank)."""
    out, w, attacks = [], 0, 0
    for kd in box_kinds(items):
        if kd == 'struct': continue
        if kd == 'attack':
            out.append(syls[w] if w < len(syls) else ''); w += 1; attacks += 1
        else:
            out.append('')
    if syls and w != len(syls):
        warnings.append(f'system {sysno}: {len(syls)} syllables vs {attacks} attack notes')
    return out

if __name__ == '__main__':
    main()
