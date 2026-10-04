#!/usr/bin/env python3
"""Ewreka Vista: zh_tr.txt sözlüğünü kaynak koda uygular (yalnızca yorum dışı CJK parçaları)."""
import os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
import importlib.util
spec = importlib.util.spec_from_file_location('ex', os.path.join(os.path.dirname(__file__), 'i18n_extract.py'))
src = open(spec.origin, encoding='utf-8').read()
ns = {'__file__': spec.origin}
exec(compile(src, spec.origin, 'exec'), ns)
tr = {}
for l in open(os.path.join(os.path.dirname(__file__), 'zh_tr.txt'), encoding='utf-8').read().split('\n'):
    if l.strip():
        k, v = l.split('=', 1)
        tr[k] = v
missing = set()
changed = 0
for p in ns['files']():
    raw = open(p, encoding='utf-8').read()
    stripped = ns['strip_comments'](raw, '')
    assert len(stripped) == len(raw), p
    out, last = [], 0
    for m in ns['SEG'].finditer(stripped):
        seg = m.group(0)
        key = seg.strip()
        if key not in tr:
            missing.add(key); continue
        lead = seg[:len(seg) - len(seg.lstrip())]
        trail = seg[len(seg.rstrip()):]
        out.append(raw[last:m.start()]); out.append(lead + tr[key] + trail); last = m.end()
    out.append(raw[last:])
    new = ''.join(out)
    if new != raw:
        open(p, 'w', encoding='utf-8').write(new); changed += 1
print('changed files', changed, 'missing', missing)
