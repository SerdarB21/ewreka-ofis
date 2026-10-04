#!/usr/bin/env python3
"""Ewreka Vista: kaynak koddaki Çince (CJK) metin parçalarını çıkarır (yorumlar hariç)."""
import re, os, sys, json
ROOT = os.path.join(os.path.dirname(__file__), '..', 'src')
C = r'[　-〿一-鿿＀-￯]'
SEG = re.compile(C + r'+(?:[ \w\-+./%·…]*' + C + r'+)*')

def strip_comments(text, ext):
    out = []
    i, n = 0, len(text)
    state = None
    while i < n:
        c = text[i]; nx = text[i+1] if i+1 < n else ''
        if state is None:
            if c == '/' and nx == '/' and (i == 0 or text[i-1] != ':'):
                j = text.find('\n', i); j = n if j < 0 else j
                out.append(' ' * (j - i)); i = j; continue
            if c == '/' and nx == '*':
                j = text.find('*/', i + 2); j = n if j < 0 else j + 2
                out.append(re.sub(r'[^\n]', ' ', text[i:j])); i = j; continue
            if text.startswith('<!--', i):
                j = text.find('-->', i); j = n if j < 0 else j + 3
                out.append(re.sub(r'[^\n]', ' ', text[i:j])); i = j; continue
            if c in '\'"`':
                state = c
        else:
            if c == '\\':
                out.append(text[i:i+2]); i += 2; continue
            if c == state or (c == '\n' and state != '`'):
                state = None
        out.append(c); i += 1
    return ''.join(out)

def files():
    for d, _, fs in os.walk(ROOT):
        for f in fs:
            if f.endswith(('.vue', '.ts')):
                yield os.path.join(d, f)

def main():
    segs = {}
    for p in sorted(files()):
        raw = open(p, encoding='utf-8').read()
        txt = strip_comments(raw, os.path.splitext(p)[1])
        for ln, line in enumerate(txt.split('\n'), 1):
            for m in SEG.finditer(line):
                s = m.group(0).strip()
                if not s:
                    continue
                rel = os.path.relpath(p, ROOT)
                segs.setdefault(s, []).append(f'{rel}:{ln}: {line.strip()[:160]}')
    if '--json' in sys.argv:
        json.dump({k: v[0] for k, v in segs.items()}, sys.stdout, ensure_ascii=False, indent=1)
    else:
        for k, v in segs.items():
            print(f'{k}\t{len(v)}\t{v[0]}')
    print(len(segs), file=sys.stderr)

if __name__ == "__main__":
    main()
