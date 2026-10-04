#!/usr/bin/env python3
"""Ewreka Nota — boş belge şablonu üretici.

SuperDoc'un (AGPL-3.0) kendi boş .docx şablonunu (tools/superdoc-blank-base.docx) alır ve
Türkiye/Word varsayılanlarına dönüştürür:
  * A4 sayfa (21 x 29,7 cm), 2,5 cm kenar boşlukları
  * Calibri 11 pt gövde, Calibri Light başlıklar (tema yazı tipleri)
  * Dil etiketi tr-TR, ondalık ayırıcı virgül
  * Satır aralığı 1,08 / paragraf sonrası 8 pt (Word varsayılanı)
Çıktı: src/assets/blank.docx  (derlemeye gömülür)

Kullanım: python3 tools/make_blank_docx.py
"""
import os
import re
import zipfile
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'superdoc-blank-base.docx')
OUT = os.path.join(HERE, '..', 'src', 'assets', 'blank.docx')

# 2,5 cm = 1417 twip ; A4 = 11906 x 16838 twip ; üst/alt bilgi 1,25 cm = 708
SECT = ('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/>'
        '<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>')

DOC_DEFAULTS = (
    '<w:docDefaults><w:rPrDefault><w:rPr>'
    '<w:rFonts w:asciiTheme="minorHAnsi" w:eastAsiaTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:cstheme="minorBidi"/>'
    '<w:sz w:val="22"/><w:szCs w:val="22"/>'
    '<w:lang w:val="tr-TR" w:eastAsia="en-US" w:bidi="ar-SA"/>'
    '</w:rPr></w:rPrDefault>'
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault>'
    '</w:docDefaults>')

CALIBRI_FONTS = '''<w:font w:name="Calibri"><w:panose1 w:val="020F0502020204030204"/><w:charset w:val="A2"/><w:family w:val="swiss"/><w:pitch w:val="variable"/><w:sig w:usb0="E4002EFF" w:usb1="C200247B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/></w:font><w:font w:name="Calibri Light"><w:panose1 w:val="020F0302020204030204"/><w:charset w:val="A2"/><w:family w:val="swiss"/><w:pitch w:val="variable"/><w:sig w:usb0="E4002AFF" w:usb1="C200247B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/></w:font>'''


def main():
    zin = zipfile.ZipFile(SRC)
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            if info.filename.endswith('/'):
                continue
            data = zin.read(info.filename)
            name = info.filename
            if name == 'word/document.xml':
                s = data.decode('utf-8')
                s = re.sub(r'<w:sectPr\b.*?</w:sectPr>', SECT, s, flags=re.S)
                # boş paragrafın rsid özniteliklerini sadeleştir
                s = re.sub(r'<w:p [^>]*/>', '<w:p/>', s)
                data = s.encode('utf-8')
            elif name == 'word/styles.xml':
                s = data.decode('utf-8')
                s = re.sub(r'<w:docDefaults>.*?</w:docDefaults>', DOC_DEFAULTS, s, flags=re.S)
                data = s.encode('utf-8')
            elif name == 'word/theme/theme1.xml':
                s = data.decode('utf-8')
                s = s.replace('typeface="Aptos Display"', 'typeface="Calibri Light"')
                s = s.replace('typeface="Aptos"', 'typeface="Calibri"')
                s = re.sub(r'name="Office Theme"', 'name="Ewreka"', s)
                data = s.encode('utf-8')
            elif name == 'word/settings.xml':
                s = data.decode('utf-8')
                s = s.replace('<w:themeFontLang w:val="en-US"/>', '<w:themeFontLang w:val="tr-TR"/>')
                s = s.replace('<w:decimalSymbol w:val="."/>', '<w:decimalSymbol w:val=","/>')
                s = s.replace('<w:listSeparator w:val=","/>', '<w:listSeparator w:val=";"/>')
                data = s.encode('utf-8')
            elif name == 'word/fontTable.xml':
                s = data.decode('utf-8')
                if 'w:name="Calibri"' not in s:
                    s = s.replace('</w:fonts>', CALIBRI_FONTS + '</w:fonts>')
                data = s.encode('utf-8')
            elif name == 'docProps/core.xml':
                s = data.decode('utf-8')
                s = re.sub(r'<dc:creator>.*?</dc:creator>', '<dc:creator></dc:creator>', s)
                s = re.sub(r'<cp:lastModifiedBy>.*?</cp:lastModifiedBy>', '<cp:lastModifiedBy></cp:lastModifiedBy>', s)
                s = re.sub(r'<cp:revision>.*?</cp:revision>', '<cp:revision>1</cp:revision>', s)
                s = re.sub(r'(<dcterms:created [^>]*>).*?(</dcterms:created>)', r'\g<1>' + now + r'\g<2>', s)
                s = re.sub(r'(<dcterms:modified [^>]*>).*?(</dcterms:modified>)', r'\g<1>' + now + r'\g<2>', s)
                if '<dc:language>' not in s:
                    s = s.replace('</cp:coreProperties>', '<dc:language>tr-TR</dc:language></cp:coreProperties>')
                data = s.encode('utf-8')
            elif name == 'docProps/app.xml':
                s = data.decode('utf-8')
                s = s.replace('<Application>Microsoft Office Word</Application>', '<Application>Ewreka Nota</Application>')
                data = s.encode('utf-8')
            zout.writestr(name, data)
    print('yazıldı:', os.path.normpath(OUT), os.path.getsize(OUT), 'bayt')


if __name__ == '__main__':
    main()
