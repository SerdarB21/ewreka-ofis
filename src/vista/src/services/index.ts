// Ewreka Vista: tüm uzak sunucu çağrıları (AI, çevrimiçi görsel arama) kaldırıldı.
// Yalnızca uygulamayla birlikte paketlenmiş yerel şablon verileri okunur.
export default {
  async getMockData(filename: string): Promise<any> {
    const res = await fetch(`./mocks/${filename}.json`)
    if (!res.ok) throw new Error(`${filename}.json yüklenemedi`)
    return res.json()
  },
}
