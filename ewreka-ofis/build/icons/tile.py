import base64
Y="#FFC300"
def tile(inner, accent):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26262B"/><stop offset="1" stop-color="#0E0E10"/></linearGradient></defs>
<rect x="64" y="64" width="896" height="896" rx="200" fill="url(#bg)"/>
<rect x="64" y="64" width="896" height="896" rx="200" fill="none" stroke="{accent}" stroke-opacity=".35" stroke-width="6"/>
{inner}
</svg>'''
icons={}
# NOTA: page + lines + pen
icons['nota']=('#4C8DFF', '''
<rect x="250" y="210" width="440" height="600" rx="56" fill="#4C8DFF"/>
<rect x="310" y="300" width="250" height="34" rx="17" fill="#fff"/>
<rect x="310" y="380" width="320" height="34" rx="17" fill="#fff" opacity=".9"/>
<rect x="310" y="460" width="200" height="34" rx="17" fill="#fff" opacity=".9"/>
<g transform="translate(640 560) rotate(45)">
<path d="M-70 -260 h140 v300 l-70 120 l-70 -120z" fill="#FFC300" stroke="#0E0E10" stroke-width="26" stroke-linejoin="round"/>
<path d="M-70 -260 h140 v70 h-140z" fill="#0E0E10"/>
<circle cx="0" cy="40" r="20" fill="#0E0E10"/>
<path d="M0 60 v95" stroke="#0E0E10" stroke-width="14"/>
</g>
''')
# MATRIX: grid
cells=''
for r in range(3):
    for c in range(3):
        x=262+c*176; y=262+r*176
        fill = '#FFC300' if (r,c)==(1,1) else ('#2ECC8A' if r==0 or c==0 else '#1E8F60')
        cells+=f'<rect x="{x}" y="{y}" width="148" height="148" rx="28" fill="{fill}"/>'
icons['matrix']=('#2ECC8A', cells)
# VISTA: screen with chart + stand
icons['vista']=('#FF8A2A','''
<rect x="220" y="250" width="584" height="390" rx="40" fill="#FF8A2A"/>
<rect x="290" y="470" width="80" height="110" rx="14" fill="#fff"/>
<rect x="410" y="400" width="80" height="180" rx="14" fill="#fff"/>
<rect x="530" y="330" width="80" height="250" rx="14" fill="#FFC300"/>
<path d="M650 360 l90 60 l-90 60z" fill="#fff"/>
<rect x="490" y="640" width="44" height="120" fill="#FF8A2A"/>
<rect x="380" y="750" width="264" height="40" rx="20" fill="#FF8A2A"/>
''')
# CARTA: page + signature
icons['carta']=('#FF5468','''
<path d="M300 220h300l140 140v440a40 40 0 0 1-40 40H300a40 40 0 0 1-40-40V260a40 40 0 0 1 40-40z" fill="#FF5468"/>
<path d="M600 220v120a20 20 0 0 0 20 20h120z" fill="#FFB3BC"/>
<text x="500" y="560" text-anchor="middle" font-family="DejaVu Sans, Arial" font-weight="700" font-size="170" fill="#fff">PDF</text>
<path d="M330 700 q40 -70 80 -10 t80 0 t80 -20 t80 10" stroke="#FFC300" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
''')
for k,(acc,inner) in icons.items():
    open(f'{k}.svg','w').write(tile(inner,acc))
bulb=base64.b64encode(open('../../shared/assets/bulb.png','rb').read()).decode()
# main app icon: bulb image upscaled into tile
open('app.svg','w').write(tile(f'<image href="data:image/png;base64,{bulb}" x="332" y="220" width="360" height="580" preserveAspectRatio="xMidYMid meet"/>','#FFC300'))
