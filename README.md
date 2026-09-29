# Cross IPTV Player (LG webOS, Samsung Tizen & Android TV)

LG webOS, Samsung Tizen OS ve Android TV sistemlerinde tek kod tabanından çalışabilen, hafif, hızlı ve açık kaynak IPTV MVP uygulaması.

---

## 🌟 Özellikler

- **Tek Kod Tabanı (Cross-Platform):** Web teknolojileri (React 19 + TypeScript + Vite + Tailwind CSS) ile geliştirildi.
- **TV Kumanda Uyumu (Spatial Navigation):** D-Pad (Yukarı, Aşağı, Sol, Sağ), OK/Enter ve Geri tuşları ile tam uyumlu 10-foot koltuk arayüzü.
- **Xtream Codes API Entegrasyonu:** Kategoriler, canlı yayınlar, kimlik doğrulama ve kullanıcı bilgisi desteği.
- **Hls.js Video Motoru:** Canlı `.m3u8` akışları, düşük gecikme süresi, kanal değiştirme (Zapping) ve hata kurtarma.
- **Sanal & Optimize Listeleme:** On binlerce kanal olsa dahi TV belleğini şişirmeyen hafif render yapısı.
- **Anlık Arama:** Kategoriler veya tüm kanallar içinde anında isim filtreleme.
- **Favori Kanallar:** Kanalları favorilere ekleme ve yerel depolamada saklama.
- **Hazır TV Manifestoları:** LG webOS için `appinfo.json`, Samsung Tizen için `config.xml` doğrudan hazırdır.

---

## 🚀 Hızlı Başlangıç (Geliştirme Ortamı)

### 1. Kurulum ve Çalıştırma
```bash
# Proje dizinine gidin
cd cross-iptv-player

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:5173` adresini açın.

> **Geliştirme Notu (CORS):** Bilgisayar tarayıcısında test ederken CORS engeline takılmamanız için `vite.config.ts` içinde yerleşik vekil sunucu (proxy) yapılandırılmıştır. Yayınlar doğrudan vekil üzerinden sorunsuz akar.

---

## 🎮 Kumanda ve Klavye Kısayolları

| Tuş | Eylem |
| :--- | :--- |
| **▲ / ▼ (Yukarı / Aşağı)** | Kategori veya kanal listesinde dikey gezinme / Oynatıcıdayken kanal değiştirme (Zapping) |
| **◀ / ▶ (Sol / Sağ)** | Kategori menüsü ile kanal kartları arasında geçiş yapma |
| **Enter / OK** | Kanalı tam ekranda başlatma / Kategori seçme |
| **Geri / ESC / Backspace** | Oynatıcıdan kanal kılavuzuna veya kanallardan kategori menüsüne dönme |
| **Boşluk (Space)** | Oynatıcıda yayını duraklatma / devam ettirme |

---

## 📦 Televizyonlara Paketleme (Build & Deployment)

Öncelikle üretim paketini oluşturun:
```bash
npm run build
```
Bu komut `dist/` klasörü altına bağıl yollarla (`./assets/`) derlenmiş HTML, JS, CSS ile birlikte `appinfo.json` ve `config.xml` dosyalarını hazırlar.

### 1. LG webOS TV'ye Yükleme (.ipk)
1. LG TV'nizde **Developer Mode** uygulamasını açıp oturum açın ve **Dev Mode Status: ON** yapın.
2. Bilgisayarınızda [webOS TV CLI](https://webostv.developer.lge.com/develop/tools/cli-installation) kurulu olsun.
3. Uygulamayı paketleyin ve TV'ye kurun:
   ```bash
   # TV cihazını ekleyin (TV IP'si ile)
   ares-setup-device

   # dist klasörünü .ipk paketine dönüştürün
   ares-package dist/

   # TV'ye yükleyin
   ares-install com.cross.iptv.player_1.0.0_all.ipk -d <TV_ADI>
   ```

### 2. Samsung Tizen TV'ye Yükleme (.wgt)
1. Samsung TV'nizin Smart Hub ekranında `1-2-3-4-5` tuşlayarak **Developer Mode**'u açın ve bilgisayarınızın yerel IP adresini girin.
2. [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tizen-studio.html) veya CLI aracını kullanın:
   ```bash
   # dist klasörünü .wgt olarak paketleyin
   tizen package -t wgt -s <SertifikaProfili> -- dist/

   # TV'ye kurun
   tizen install -n CrossIPTV.wgt -t <TV_HEDEF_ADI>
   ```

### 3. Android TV (.apk)
Capacitor veya WebView sarmalayıcısı ekleyerek:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Cross IPTV" com.cross.iptv.player --web-dir dist
npx cap add android
npx cap copy
npx cap open android
```
Android Studio üzerinden Android TV destekli `.apk` çıktısı alabilirsiniz.
