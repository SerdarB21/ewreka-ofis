#!/usr/bin/env python3
"""Ewreka Vista: PPTist şablonlarını yerelleştirir.
- Çince örnek metinleri Türkçe yer tutucu metinlerle değiştirir
- Uzak (pexels) görselleri, şablon renklerinden üretilen yerel soyut görsellerle (data URI) değiştirir
Tekrar çalıştırılabilir (zaten yerelleştirilmiş dosyalara dokunmaz)."""
import json, re, glob, os, io, base64, hashlib, random, colorsys
from PIL import Image, ImageDraw, ImageFilter

MOCKS = os.path.join(os.path.dirname(__file__), '..', 'public', 'mocks')
CJK = re.compile(r'[　-〿一-鿿＀-￯]')

FIXED = {
    '未命名演示文稿': 'Adsız sunum',
    '模板封面标题': 'Sunu başlığı', '封面页主标题': 'Sunu başlığı', '封面页标题': 'Sunu başlığı',
    '演讲人：XXX': 'Sunan: XXX', '演讲人：xxx': 'Sunan: xxx', '汇报人：xxx': 'Sunan: xxx',
    '日期：XXX': 'Tarih: XXX', '时间：XXX': 'Tarih: XXX',
    '目录': 'Gündem', '目': 'GÜN', '录': 'DEM',
    '模板小节过渡标题': 'Bölüm başlığı', '模板过渡标题': 'Bölüm başlığı', '过渡页标题': 'Bölüm başlığı',
    '过渡页正文': 'Bölüm açıklaması',
    '模板内容页标题': 'Slayt başlığı', '内容页标题': 'Slayt başlığı', '内容项标题': 'Madde başlığı',
    '谢谢聆听 THANKS': 'Teşekkürler THANK YOU', '谢谢聆听': 'Teşekkürler', '谢谢聆听 ': 'Teşekkürler ',
    '感谢您的观看': 'İzlediğiniz için teşekkürler', '感谢聆听': 'Teşekkürler', '感谢倾听': 'Teşekkürler',
    '感谢观看': 'Teşekkürler', '欢迎观看': 'Hoş geldiniz',
    '感谢': 'Teşekkürler', '你的': '', '观看': '',
    '商务汇报|工作总结|工作计划': 'İş Raporu | Değerlendirme | Plan',
    '在此输入标题': 'Başlığı buraya yazın',
}
FILLERS = [
    ('模板封面正文', 'Sunumunuzun kısa açıklamasını buraya yazın. '),
    ('封面页副标题', 'Alt başlık metnini buraya yazın. '),
    ('模板小节过渡正文', 'Bölümün kısa açıklamasını buraya yazın. '),
    ('过渡页副标题', 'Bölümün kısa açıklamasını buraya yazın. '),
    ('过渡页正文', 'Bölümün kısa açıklamasını buraya yazın. '),
    ('内容项正文', 'Bu maddeyle ilgili açıklama metnini buraya yazın. '),
]
NUMS = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10}


def filler_text(pattern, n_cjk):
    target = max(12, int(n_cjk * 1.8))
    out = ''
    while len(out) < target:
        out += pattern
    out = out[:target]
    if ' ' in out[8:]:
        out = out[:out.rstrip().rfind(' ')]
    return out.rstrip(' ,') + '.' if not out.endswith('.') else out


FONT_MAP = {'SourceHanSans': 'Calibri', 'SourceHanSerif': 'Georgia', 'LXGWWenKai': 'Trebuchet MS', 'ZhuQueFangSong': 'Cambria'}
OVERRIDES = {'template_6.json': {'目录': 'Akış'}, 'template_2.json': {'目录': 'Akış'}}
CURRENT = {'file': ''}


def translate_text(t):
    ov = OVERRIDES.get(CURRENT['file'], {})
    if t in ov:
        return ov[t]
    if t in FIXED:
        return FIXED[t]
    m = re.fullmatch(r'目录项(?:&nbsp;)?\s*([一二三四五六七八九十]|\d+)(&nbsp;)?', t)
    if m:
        n = NUMS.get(m.group(1), m.group(1))
        return f'Başlık {n}' + (m.group(2) or '')
    m = re.fullmatch(r'项目(\d+)', t)
    if m:
        return f'Madde {m.group(1)}'
    for zh, tr in FILLERS:
        if t.startswith(zh) or (zh in t and len(t) > 12):
            return filler_text(tr, len(CJK.findall(t)))
    raise KeyError(t)


def translate_html(s):
    parts = re.split(r'(<[^>]+>)', s)
    for i, p in enumerate(parts):
        if not p.startswith('<') and CJK.search(p):
            parts[i] = translate_text(p)
    return ''.join(parts)


def parse_color(c):
    m = re.match(r'rgba?\(([^)]+)\)', c or '')
    if m:
        v = [float(x) for x in m.group(1).split(',')[:3]]
        return tuple(int(x) for x in v)
    if c and c.startswith('#') and len(c) == 7:
        return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
    return (90, 110, 140)


def shade(rgb, l_mul, s_mul=1.0, h_shift=0.0):
    h, l, s = colorsys.rgb_to_hls(*[x / 255 for x in rgb])
    h = (h + h_shift) % 1
    l = max(0, min(1, l * l_mul)) if l_mul <= 1 else min(1, l + (1 - l) * (l_mul - 1))
    s = max(0, min(1, s * s_mul))
    return tuple(int(x * 255) for x in colorsys.hls_to_rgb(h, l, s))


IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'imgs', 'tpl')


def make_image(seed, colors):
    rnd = random.Random(seed)
    W, H = 900, 600
    base = colors[0]
    pal = [shade(base, 0.45), shade(base, 0.8), shade(base, 1.35, 0.8), shade(base, 1.7, 0.6, 0.04)]
    if len(colors) > 1:
        pal.append(shade(colors[1], 1.1))
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    a, b = rnd.sample(pal[:3], 2)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3)))
    layer = Image.new('RGB', (W, H))
    layer.paste(img)
    ld = ImageDraw.Draw(layer)
    for _ in range(rnd.randint(5, 9)):
        r = rnd.randint(80, 320)
        x, y = rnd.randint(-100, W + 100), rnd.randint(-100, H + 100)
        ld.ellipse([x - r, y - r, x + r, y + r], fill=rnd.choice(pal))
    # ufuk çizgisi benzeri katman
    hy = rnd.randint(int(H * 0.55), int(H * 0.8))
    ld.polygon([(0, hy), (W * 0.3, hy - rnd.randint(30, 120)), (W * 0.6, hy - rnd.randint(0, 80)), (W, hy - rnd.randint(40, 140)), (W, H), (0, H)], fill=pal[0])
    layer = layer.filter(ImageFilter.GaussianBlur(28))
    img = Image.blend(img, layer, 0.85)
    os.makedirs(IMG_DIR, exist_ok=True)
    name = f'{seed[:10]}.jpg'
    img.save(os.path.join(IMG_DIR, name), 'JPEG', quality=72, optimize=True, progressive=True)
    return f'./imgs/tpl/{name}'


def plain(html):
    return re.sub(r'&nbsp;', ' ', re.sub(r'<[^>]+>', '', html))


def rect(el):
    return (el.get('left', 0), el.get('top', 0), el.get('left', 0) + el.get('width', 0), el.get('top', 0) + el.get('height', 0))


def intersects(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def scale_fonts(html, k):
    return re.sub(r'font-size:\s*([\d.]+)px', lambda m: f'font-size: {round(float(m.group(1)) * k, 1)}px', html)


def fit_labels(d):
    """Kısa Çince etiketler Türkçede daha uzun: kutuyu çakışma yoksa genişlet, varsa yazıyı küçült."""
    slide_w = d.get('width', 1000)
    slide_h = d.get('height', 562.5)
    for slide in d.get('slides', []):
        els = slide.get('elements', [])
        for el in els:
            if el.get('type') != 'text' or '_zh' not in el:
                continue
            old_html, new_html = el.pop('_zh'), el['content']
            n_cjk = len(CJK.findall(plain(old_html)))
            if n_cjk < 2 or n_cjk > 8 or el.get('vertical'):
                continue
            sizes = [float(x) for x in re.findall(r'font-size:\s*([\d.]+)px', new_html)] or [16.0]
            fs = max(sizes)
            need = len(plain(new_html).strip()) * 0.62 * fs + 22
            cjk_need = n_cjk * fs + 20
            ratio = need / max(el['width'], cjk_need)
            if ratio <= 1.0:
                continue
            old_r = rect(el)
            old_w = el['width']
            new_w = min(max(old_w, need) * 1.05, slide_w - 20)
            left = el.get('left', 0)
            if 'text-align: center' in new_html or 'text-align:center' in new_html:
                left -= (new_w - old_w) / 2
            elif 'text-align: right' in new_html or 'text-align:right' in new_html:
                left -= (new_w - old_w)
            left = max(10, min(left, slide_w - 10 - new_w))
            new_r = (left, old_r[1], left + new_w, old_r[3])
            conflict = False
            for other in els:
                if other is el or other.get('type') == 'line':
                    continue
                r = rect(other)
                if (r[2] - r[0]) * (r[3] - r[1]) > slide_w * slide_h * 0.45:
                    continue
                if intersects(new_r, r) and not intersects(old_r, r):
                    conflict = True
                    break
            if not conflict:
                el['left'], el['width'] = left, new_w
            else:
                k = (el['width'] - 22) / max(1.0, need - 22)
                el['content'] = scale_fonts(new_html, max(0.4, min(1.0, k)))


def main():
    for f in sorted(glob.glob(os.path.join(MOCKS, 'template_*.json'))):
        raw = open(f, encoding='utf-8').read()
        CURRENT['file'] = os.path.basename(f)
        # Çince web fontları paketlenmiyor: Windows/macOS sistem yazı tiplerine eşle
        for zh_font, sys_font in FONT_MAP.items():
            raw = raw.replace(zh_font, sys_font)
        d = json.loads(raw)
        colors = [parse_color(c) for c in d.get('theme', {}).get('themeColors', [])] or [(90, 110, 140)]
        cache = {}

        def walk(o):
            if isinstance(o, dict):
                for k, v in list(o.items()):
                    if isinstance(v, str) and re.match(r'https?://', v):
                        if v not in cache:
                            cache[v] = make_image(hashlib.md5(v.encode()).hexdigest(), colors)
                        o[k] = cache[v]
                    elif isinstance(v, str) and CJK.search(v):
                        if k == 'content' and o.get('type') == 'text':
                            o['_zh'] = v
                        o[k] = translate_html(v)
                    else:
                        walk(v)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    if isinstance(v, str) and CJK.search(v):
                        o[i] = translate_html(v)
                    else:
                        walk(v)
        walk(d)
        fit_labels(d)
        out = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        assert not CJK.search(out), f
        assert 'pexels' not in out
        open(f, 'w', encoding='utf-8').write(out)
        print(os.path.basename(f), len(raw), '->', len(out), 'images', len(cache))


main()
