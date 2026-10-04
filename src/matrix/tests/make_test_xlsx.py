# Zengin test çalışma kitabı üretir: formüller, stiller, birleştirmeler, genişlikler, çoklu sayfa, Türkçe metin, tarih, yüzde, ₺
import datetime, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName

out = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/ewreka-ofis/test-files/ornek.xlsx'
wb = Workbook()
ws = wb.active
ws.title = 'Satışlar'
ws.sheet_properties.tabColor = 'FFC300'

thin = Side(style='thin', color='999999')
thick = Side(style='medium', color='111113')
hdr_fill = PatternFill('solid', fgColor='2ECC8A')
ws.merge_cells('A1:F1')
ws['A1'] = 'Ewreka Digital — 2026 Çeyrek Satış Raporu (ğüşıöçİĞÜŞÖÇ)'
ws['A1'].font = Font(name='Calibri', size=16, bold=True, color='111113')
ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
ws.row_dimensions[1].height = 30

headers = ['Ürün', 'Bölge', 'Tarih', 'Adet', 'Birim Fiyat', 'Tutar']
for i, h in enumerate(headers, 1):
    c = ws.cell(row=2, column=i, value=h)
    c.font = Font(bold=True, color='FFFFFF')
    c.fill = hdr_fill
    c.alignment = Alignment(horizontal='center')
    c.border = Border(top=thick, bottom=thick, left=thin, right=thin)

rows = [
    ('Çay Bardağı', 'İstanbul', datetime.date(2026, 1, 15), 120, 12.5),
    ('Şeker (kg)', 'İzmir', datetime.date(2026, 2, 3), 80, 34.9),
    ('Güneş Gözlüğü', 'Ankara', datetime.date(2026, 2, 28), 15, 499.99),
    ('Öğrenci Defteri', 'Muğla', datetime.date(2026, 3, 12), 300, 18.75),
    ('Ihlamur Çayı', 'Çanakkale', datetime.date(2026, 3, 31), 45, 64.0),
]
for r, (p, b, d, q, u) in enumerate(rows, 3):
    ws.cell(row=r, column=1, value=p)
    ws.cell(row=r, column=2, value=b)
    dc = ws.cell(row=r, column=3, value=d); dc.number_format = 'dd.mm.yyyy'
    ws.cell(row=r, column=4, value=q).number_format = '#,##0'
    ws.cell(row=r, column=5, value=u).number_format = '#,##0.00 "₺"'
    t = ws.cell(row=r, column=6, value=f'=D{r}*E{r}'); t.number_format = '#,##0.00 "₺"'
    for col in range(1, 7):
        ws.cell(row=r, column=col).border = Border(left=thin, right=thin, bottom=thin)
ws['A8'] = 'TOPLAM'; ws['A8'].font = Font(bold=True)
ws.merge_cells('A8:C8')
ws['D8'] = '=SUM(D3:D7)'
ws['F8'] = '=SUM(F3:F7)'; ws['F8'].number_format = '#,##0.00 "₺"'; ws['F8'].font = Font(bold=True, color='C00000')
ws['F8'].fill = PatternFill('solid', fgColor='FFF2CC')
ws['A9'] = 'KDV oranı'; ws['B9'] = 0.2; ws['B9'].number_format = '0%'
ws['A10'] = 'KDV dahil'; ws['B10'] = '=F8*(1+B9)'; ws['B10'].number_format = '"₺"#,##0.00'
ws['A11'] = 'Ortalama fiyat'; ws['B11'] = '=ROUND(AVERAGE(E3:E7),2)'
ws['A12'] = 'Büyük sipariş?'; ws['B12'] = '=IF(D8>500,"Evet","Hayır")'
ws['A13'] = 'Doğru mu'; ws['B13'] = True
ws['A14'] = 'Metin sarma örneği: bu hücredeki uzun metin satır sonuna gelince alt satıra geçmelidir.'
ws['A14'].alignment = Alignment(wrap_text=True, vertical='top')
ws.row_dimensions[14].height = 45
ws['C14'] = 'İtalik altı çizili üstü çizili'
ws['C14'].font = Font(italic=True, underline='single', strike=True, name='Times New Roman', size=12, color='4C8DFF')
ws['D14'] = 'Sağ-orta'; ws['D14'].alignment = Alignment(horizontal='right', vertical='center')
ws['E14'] = 'Döndürülmüş'; ws['E14'].alignment = Alignment(text_rotation=45)
ws['A15'] = 'Bağlantı'; ws['B15'] = 'ewreka.net'; ws['B15'].hyperlink = 'https://www.ewreka.net'
ws['A16'] = 'Not içeren hücre'; ws['A16'].comment = Comment('Bu bir nottur — Türkçe ğüş.', 'Ewreka')
ws['A17'] = 'Seçim listesi'; ws['B17'] = 'Elma'
dv = DataValidation(type='list', formula1='"Elma,Armut,Kiraz"', allow_blank=True); ws.add_data_validation(dv); dv.add('B17:B20')
ws['A18'] = 'Bugün'; ws['B18'] = '=TODAY()'; ws['B18'].number_format = 'dd.mm.yyyy'
ws['A19'] = 'Saat'; ws['B19'] = datetime.datetime(2026, 5, 19, 14, 30); ws['B19'].number_format = 'dd.mm.yyyy hh:mm'
ws['A20'] = 'Bilimsel'; ws['B20'] = 1234567.891; ws['B20'].number_format = '0.00E+00'
ws['A21'] = 'Negatif'; ws['B21'] = -1500.5; ws['B21'].number_format = '#,##0.00;[Red]-#,##0.00'

ws.column_dimensions['A'].width = 28
ws.column_dimensions['B'].width = 14
ws.column_dimensions['C'].width = 13
ws.column_dimensions['E'].width = 14
ws.column_dimensions['F'].width = 16
ws.column_dimensions['H'].hidden = True
ws.row_dimensions[22].hidden = True
ws['A22'] = 'gizli satır'
ws.freeze_panes = 'B3'

# Sayfa 2: çapraz sayfa formülleri
ws2 = wb.create_sheet('Özet Ğ')
ws2['A1'] = 'Toplam tutar'; ws2['B1'] = "='Satışlar'!F8"; ws2['B1'].number_format = '#,##0.00 "₺"'
ws2['A2'] = 'Ürün sayısı'; ws2['B2'] = "=COUNTA(Satışlar!A3:A7)"
ws2['A3'] = 'En yüksek adet'; ws2['B3'] = "=MAX(Satışlar!D3:D7)"
ws2['A4'] = 'Birleştir'; ws2['B4'] = '=CONCATENATE("Toplam: ",TEXT(B1,"0.00"))'
ws2['A5'] = 'Paylaşılan'
for r in range(6, 11):
    ws2.cell(row=r, column=1, value=r * 10)
    ws2.cell(row=r, column=2, value=f'=A{r}*2')
ws2.sheet_properties.tabColor = '4C8DFF'
from openpyxl.cell.rich_text import CellRichText, TextBlock
from openpyxl.cell.text import InlineFont
ws2['A12'] = CellRichText(['Normal ', TextBlock(InlineFont(b=True, color='FF0000'), 'kalın kırmızı'), ' ve ', TextBlock(InlineFont(i=True, sz=14), 'italik büyük')])
ws2['A13'] = 'Çok satırlı\nhücre metni'
ws2['A13'].alignment = Alignment(wrap_text=True)
ws2.column_dimensions['A'].width = 20
ws2['D1'] = 'Kalın kenarlık'; ws2['D1'].border = Border(top=Side('thick', color='FF0000'), bottom=Side('double', color='0000FF'), left=Side('dashed'), right=Side('dotted'))

# Sayfa 4: koşullu biçimlendirme
from openpyxl.formatting.rule import CellIsRule, FormulaRule, ColorScaleRule, DataBarRule, Rule
from openpyxl.styles.differential import DifferentialStyle
ws4 = wb.create_sheet('Koşullu')
for r in range(1, 11):
    ws4.cell(row=r, column=1, value=r * 10)
    ws4.cell(row=r, column=2, value=r)
    ws4.cell(row=r, column=3, value=['elma', 'armut', 'elma', 'kiraz', 'üzüm', 'elma', 'nar', 'incir', 'armut', 'dut'][r - 1])
    ws4.cell(row=r, column=4, value=r * 3)
ws4.conditional_formatting.add('A1:A10', CellIsRule(operator='greaterThan', formula=['50'], fill=PatternFill('solid', bgColor='FFC7CE', fgColor='FFC7CE'), font=Font(color='9C0006', bold=True)))
ws4.conditional_formatting.add('B1:B10', ColorScaleRule(start_type='min', start_color='F8696B', mid_type='percentile', mid_value=50, mid_color='FFEB84', end_type='max', end_color='63BE7B'))
ws4.conditional_formatting.add('D1:D10', DataBarRule(start_type='min', end_type='max', color='638EC6'))
ws4.conditional_formatting.add('C1:C10', FormulaRule(formula=['C1="elma"'], fill=PatternFill('solid', bgColor='C6EFCE', fgColor='C6EFCE')))
dup = Rule(type='duplicateValues', dxf=DifferentialStyle(fill=PatternFill('solid', bgColor='FFEB9C', fgColor='FFEB9C')))
ws4.conditional_formatting.add('E1:E10', dup)
for r in range(1, 11): ws4.cell(row=r, column=5, value=r % 4)

# Sayfa 3: gizli
ws3 = wb.create_sheet('Gizli')
ws3['A1'] = 'gizli sayfa'
ws3.sheet_state = 'hidden'

wb.defined_names['KDV'] = DefinedName('KDV', attr_text="'Satışlar'!$B$9")
wb.active = 0
wb.save(out)
print('saved', out)
