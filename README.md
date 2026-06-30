# KPSS Hazırlık — 2026 Ortaöğretim KPSS Çalışma Uygulaması

Bu, Electron ile yazılmış, internet bağlantısı gerektirmeyen bir masaüstü çalışma uygulamasıdır. Türkçe, Matematik, Tarih, Coğrafya ve Vatandaşlık derslerinde konu anlatımları ve gerçek sınav formatında, süreli testler içerir.

> **Not:** Uygulamadaki sorular, geçmiş KPSS sınavlarının konu dağılımı, zorluk seviyesi ve soru kalıplarına sadık şekilde özgün olarak hazırlanmıştır; birebir resmi ÖSYM arşivinden alınmış sorular değildir.

## Mac'te Kurulum ve Çalıştırma

### 1) Node.js kurulumu (tek seferlik)
Mac'te Node.js kurulu değilse [nodejs.org](https://nodejs.org) adresinden **LTS** sürümünü indirip kurun. Kurulumu doğrulamak için Terminal'de:

```bash
node -v
npm -v
```

### 2) Proje klasörünü Mac'e taşı
`KPSS` klasörünü (bu klasör) Mac'inize kopyalayın ya da GitHub'a yüklediyseniz oradan klonlayın. Sonra VSCode ile bu klasörü açın, VSCode'un entegre terminalini kullanın (Terminal > New Terminal) ve klasörün içinde olduğunuzdan emin olun:

```bash
cd /path/to/KPSS
```

### 3) Bağımlılıkları kur

```bash
npm install
```

### 4) Geliştirme modunda dene (opsiyonel)
Uygulamayı derlemeden, doğrudan çalışır halde görmek için:

```bash
npm start
```

### 5) Masaüstü uygulamasını derle
Aşağıdaki komut önce içerik dosyalarını doğrular, sonra uygulamayı paketler ve **otomatik olarak Mac Masaüstünüze `KPSS.app` olarak kopyalar**:

```bash
npm run build:mac
```

İşlem bitince Masaüstünüzde **KPSS** adlı bir uygulama simgesi göreceksiniz.

### 6) İlk açılışta "Tanımlanamayan Geliştirici" uyarısı
Bu uygulama Apple tarafından imzalanmadığı (notarize edilmediği) için macOS Gatekeeper ilk açılışta bir uyarı gösterebilir:

- Simgeye **sağ tıklayın** (veya Control + tıklayın) → **"Aç"** seçeneğini seçin → açılan uyarıda tekrar **"Aç"**a basın.
- Bu işe yaramazsa: **Sistem Ayarları → Gizlilik ve Güvenlik** bölümüne gidin, en altta "KPSS açılması engellendi" benzeri bir mesaj görüp **"Yine de Aç"** butonuna basın.

Bu uyarı sadece ilk açılışta çıkar; bir kere izin verdikten sonra uygulama normal şekilde çift tıklayarak açılır.

## Verileri Güncellemek / Soru Eklemek

Tüm konu anlatımları ve sorular `data/` klasöründeki JSON dosyalarında (`turkce.json`, `matematik.json`, `tarih.json`, `cografya.json`, `vatandaslik.json`) tutulur. Yeni soru eklemek için ilgili konunun `sorular` dizisine aynı formatta yeni bir nesne eklemeniz yeterlidir. Dosyaları değiştirdikten sonra doğrulamak için:

```bash
npm run validate-data
```

## Proje Yapısı

```
KPSS/
  main.js              # Electron ana süreç
  index.html           # Uygulama arayüzü
  src/css/styles.css   # Tasarım
  src/js/              # Uygulama mantığı (storage, timer, quiz, app)
  data/                # Ders içerikleri (konu anlatımı + sorular)
  scripts/              # Build yardımcı script'leri
```

## Sıkça Karşılaşılabilecek Sorunlar

- **`npm install` hata veriyor:** Node.js sürümünüzün güncel (18+) olduğundan emin olun.
- **`npm run build:mac` sonunda Masaüstünde uygulama görünmüyor:** Terminal çıktısında kırmızı hata var mı kontrol edin; `dist/` klasörü oluşmuş ama Masaüstüne kopyalanmamışsa `node scripts/copy-to-desktop.js` komutunu tek başına tekrar çalıştırabilirsiniz.
- **Uygulama açılmıyor (Gatekeeper):** Yukarıdaki 6. adımı uygulayın.
