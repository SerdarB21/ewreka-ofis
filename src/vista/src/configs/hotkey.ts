export const enum KEYS {
  C = 'C',
  X = 'X',
  Z = 'Z',
  Y = 'Y',
  A = 'A',
  G = 'G',
  L = 'L',
  F = 'F',
  D = 'D',
  B = 'B',
  P = 'P',
  O = 'O',
  R = 'R',
  T = 'T',
  MINUS = '-',
  EQUAL = '=',
  DIGIT_0 = '0',
  DELETE = 'DELETE',
  UP = 'ARROWUP',
  DOWN = 'ARROWDOWN',
  LEFT = 'ARROWLEFT',
  RIGHT = 'ARROWRIGHT',
  ENTER = 'ENTER',
  SPACE = ' ',
  TAB = 'TAB',
  BACKSPACE = 'BACKSPACE',
  ESC = 'ESCAPE',
  PAGEUP = 'PAGEUP',
  PAGEDOWN = 'PAGEDOWN',
  F5 = 'F5',
}

interface HotkeyItem {
  type: string
  children: {
    label: string
    value?: string
  }[] 
}

export const HOTKEY_DOC: HotkeyItem[] = [
  {
    type: 'Genel',
    children: [
      { label: 'Kes', value: 'Ctrl + X' },
      { label: 'Kopyala', value: 'Ctrl + C' },
      { label: 'Yapıştır', value: 'Ctrl + V' },
      { label: 'Düz metin yapıştır', value: 'Ctrl + Shift + V' },
      { label: 'Hızlı çoğalt', value: 'Ctrl + D' },
      { label: 'Tümünü seç', value: 'Ctrl + A' },
      { label: 'Geri al', value: 'Ctrl + Z' },
      { label: 'Yinele', value: 'Ctrl + Y' },
      { label: 'Sil', value: 'Delete / Backspace' },
      { label: 'Çoklu seçim', value: 'Ctrl veya Shift' },
      { label: 'Bul ve değiştir', value: 'Ctrl + F' },
      { label: 'Yazdır', value: 'Ctrl + P' },
      { label: 'Pencereyi kapat', value: 'ESC' },
    ],
  },
  {
    type: 'Slayt gösterisi',
    children: [
      { label: 'Baştan başlat', value: 'F5' },
      { label: 'Geçerli slayttan başlat', value: 'Shift + F5' },
      { label: 'Önceki slayt', value: '↑ / ← / PgUp' },
      { label: 'Sonraki slayt', value: '↓ / → / PgDown' },
      { label: 'Sonraki slayt', value: 'Enter / Space' },
      { label: 'Gösteriyi sonlandır', value: 'ESC' },
    ],
  },
  {
    type: 'Slayt düzenleme',
    children: [
      { label: 'Yeni slayt', value: 'Enter' },
      { label: 'Tuvali kaydır', value: 'Space + fareyle sürükle' },
      { label: 'Tuvali yakınlaştır/uzaklaştır', value: 'Ctrl + fare tekerleği' },
      { label: 'Tuvali yakınlaştır', value: 'Ctrl + =' },
      { label: 'Tuvali uzaklaştır', value: 'Ctrl + -' },
      { label: 'Tuvali ekrana sığdır', value: 'Ctrl + 0' },
      { label: 'Önceki slayt (öğe seçili değilken)', value: '↑' },
      { label: 'Sonraki slayt (öğe seçili değilken)', value: '↓' },
      { label: 'Önceki slayt', value: 'Fare tekerleği yukarı / PgUp' },
      { label: 'Sonraki slayt', value: 'Fare tekerleği aşağı / PgDown' },
      { label: 'Hızlı metin kutusu', value: 'Boş alana çift tıklayın / T' },
      { label: 'Hızlı dikdörtgen', value: 'R' },
      { label: 'Hızlı daire', value: 'O' },
      { label: 'Hızlı çizgi', value: 'L' },
      { label: 'Çizim modundan çık', value: 'Farenin sağ tuşu' },
    ],
  },
  {
    type: 'Öğe işlemleri',
    children: [
      { label: 'Taşı', value: '↑ / ← / ↓ / →' },
      { label: 'Kilitle', value: 'Ctrl + L' },
      { label: 'Grupla', value: 'Ctrl + G' },
      { label: 'Grubu çöz', value: 'Ctrl + Shift + G' },
      { label: 'En öne getir', value: 'Alt + F' },
      { label: 'En arkaya gönder', value: 'Alt + B' },
      { label: 'En-boy oranını koru', value: 'Ctrl veya Shift' },
      { label: 'Hızlı kopyala', value: 'Ctrl basılıyken sürükle' },
      { label: 'Yatay / dikey çizgi çiz', value: 'Ctrl veya Shift' },
      { label: 'Sonraki öğeyi seç', value: 'Tab' },
      { label: 'Resim kırpmayı onayla', value: 'Enter' },
      { label: 'Serbest şekil çizimini bitir', value: 'Enter' },
    ],
  },
  {
    type: 'Tablo düzenleme',
    children: [
      { label: 'Sonraki hücreye geç', value: 'Tab' },
      { label: 'Hücreler arasında gezin', value: '↑ / ← / ↓ / →' },
      { label: 'Üste satır ekle', value: 'Ctrl + ↑' },
      { label: 'Alta satır ekle', value: 'Ctrl + ↓' },
      { label: 'Sola sütun ekle', value: 'Ctrl + ←' },
      { label: 'Sağa sütun ekle', value: 'Ctrl + →' },
    ],
  },
  {
    type: 'Grafik verisi düzenleme',
    children: [
      { label: 'Sonraki satıra geç', value: 'Enter' },
    ],
  },
  {
    type: 'Metin düzenleme',
    children: [
      { label: 'Kalın', value: 'Ctrl + B' },
      { label: 'İtalik', value: 'Ctrl + I' },
      { label: 'Altı çizili', value: 'Ctrl + U' },
      { label: 'Satır içi kod', value: 'Ctrl + E' },
      { label: 'Üst simge', value: 'Ctrl + ;' },
      { label: 'Alt simge', value: `Ctrl + '` },
      { label: 'Paragrafı seç', value: `ESC` },
    ],
  },
  {
    type: 'Diğer kısayollar',
    children: [
      { label: 'Resim ekle - panodaki resmi yapıştırın' },
      { label: 'Resim ekle - bilgisayarınızdaki resmi tuvale sürükleyin' },
      { label: 'Resim ekle - tuvale SVG kodu yapıştırın' },
      
      { label: 'Metin ekle - panodaki metni yapıştırın' },
      { label: 'Metin ekle - başka bir yerden seçtiğiniz metni tuvale sürükleyin' },
      { label: 'Metin düzenleme - liste ve alıntı için Markdown sözdizimi desteklenir' },
    ],
  },
]