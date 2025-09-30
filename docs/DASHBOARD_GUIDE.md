# FinBot Dashboard Kullanım Kılavuzu

## Genel Bakış

FinBot Dashboard, finansal verilerinizi görselleştirmek ve analiz etmek için kapsamlı bir araçtır. Bu kılavuz, dashboard'un tüm özelliklerini nasıl kullanacağınızı açıklar.

## Dashboard Erişimi

### Giriş Yapma
1. FinBot uygulamasına gidin
2. E-posta ve şifrenizi girin
3. "Giriş Yap" butonuna tıklayın
4. Dashboard otomatik olarak yüklenecektir

### Dashboard URL'leri
- **Ana Dashboard:** `/dashboard`
- **Gelişmiş Dashboard:** `/dashboard-extended`
- **Şirket Hesapları:** `/company`
- **Şahsi Hesaplar:** `/personal`

## Widget Yönetimi

### Widget Türleri

#### 1. Finansal Sağlık Widget'ı
- **Amaç:** Genel finansal durumunuzu özetler
- **Özellikler:**
  - Sağlık skoru (0-100)
  - Risk seviyesi göstergesi
  - Öneriler ve uyarılar
  - Trend göstergesi

#### 2. Runway Analizi Widget'ı
- **Amaç:** Nakit tükenme sürenizi analiz eder
- **Özellikler:**
  - Mevcut runway (ay cinsinden)
  - Progress bar ile görselleştirme
  - Aylık projeksiyonlar
  - Uyarı seviyeleri

#### 3. Cash Gap Analizi Widget'ı
- **Amaç:** Alacak ve borçlarınızı karşılaştırır
- **Özellikler:**
  - AR vs AP karşılaştırması
  - Net nakit akışı
  - Timeline analizi
  - Risk değerlendirmesi

#### 4. Yaşlandırma Özet Widget'ları
- **Alacak Yaşlandırması:** Müşteri alacaklarının yaşlandırma analizi
- **Borç Yaşlandırması:** Tedarikçi borçlarının yaşlandırma analizi
- **Özellikler:**
  - Segment bazlı analiz (0-30, 30-60, 60-90, 90+ gün)
  - Renk kodlu göstergeler
  - Toplam tutarlar
  - Risk skorları

#### 5. Yaşlandırma Detay Widget'ları
- **Alacak Detayları:** Müşteri alacaklarının detaylı listesi
- **Borç Detayları:** Tedarikçi borçlarının detaylı listesi
- **Özellikler:**
  - Sıralanabilir tablolar
  - Filtreleme seçenekleri
  - Arama fonksiyonu
  - Export özelliği

### Widget Düzenleme

#### Düzenleme Moduna Geçme
1. Dashboard'da "Düzenle" butonuna tıklayın
2. Widget'ların üzerinde göz ikonları görünecektir
3. Göz ikonuna tıklayarak widget'ı gizleyebilir/gösterebilirsiniz

#### Widget Pozisyonları
- Widget'lar responsive grid sisteminde düzenlenir
- Farklı ekran boyutlarında otomatik olarak uyum sağlar
- Mobil cihazlarda tek sütun düzenine geçer

#### Widget Boyutları
- **Küçük:** 1x1 (tek widget)
- **Orta:** 2x1 (geniş widget)
- **Büyük:** 2x2 (kare widget)
- **Tam Genişlik:** 6x1 (tam genişlik widget)

### Widget Ayarları

#### Varsayılan Widget'lar
Dashboard ilk açıldığında şu widget'lar varsayılan olarak aktif olur:
- Finansal Sağlık (2x2)
- Runway Analizi (2x1)
- Cash Gap Analizi (2x1)
- Alacak Yaşlandırması (3x1)
- Borç Yaşlandırması (3x1)
- Alacak Detayları (6x2)
- Borç Detayları (6x2)

#### Widget Sıfırlama
1. Düzenleme moduna geçin
2. "Sıfırla" butonuna tıklayın
3. Tüm widget'lar varsayılan ayarlara döner

## Tab Navigasyonu

### 1. Genel Bakış Tab'ı
- Ana finansal metrikleri gösterir
- Önemli widget'ları bir arada sunar
- Hızlı erişim için optimize edilmiştir

### 2. Yaşlandırma Tab'ı
- Alacak ve borç yaşlandırma analizlerini içerir
- Özet ve detay widget'ları
- Filtreleme ve arama seçenekleri

### 3. Analizler Tab'ı
- Gelişmiş analitik grafikleri
- Trend analizleri
- Projeksiyonlar ve tahminler

### 4. Raporlar Tab'ı
- Export seçenekleri
- PDF raporları
- CSV dışa aktarma
- Rapor şablonları

## Gerçek Zamanlı Güncellemeler

### Otomatik Güncellemeler
- Dashboard otomatik olarak gerçek zamanlı güncellenir
- Widget'lar değişiklikleri anında yansıtır
- Bağlantı durumu göstergesi

### Manuel Yenileme
1. "Yenile" butonuna tıklayın
2. Tüm widget'lar güncel verilerle yeniden yüklenir
3. Son güncelleme zamanı gösterilir

### Bağlantı Durumu
- **Yeşil:** Bağlantı aktif
- **Sarı:** Bağlantı sorunları
- **Kırmızı:** Bağlantı kesildi

## Export Özellikleri

### Export Toolbar
Dashboard'un üst kısmında export araç çubuğu bulunur:
- **Hızlı Export:** Tek tıkla CSV export
- **Gelişmiş Export:** Detaylı export seçenekleri
- **Dil Seçimi:** Türkçe/İngilizce

### Export Formatları

#### CSV Export
- Tüm verileri Excel'de açılabilir formatta
- Türkçe karakter desteği
- Otomatik tarih formatı

#### PDF Export
- Profesyonel rapor formatı
- Logo ve başlık desteği
- Sayfa numaraları
- Renkli grafikler

### Export Seçenekleri
1. **Rapor Türü:** Hangi verilerin export edileceği
2. **Dönem:** Hangi tarih aralığının export edileceği
3. **Format:** CSV, PDF veya JSON
4. **Dil:** Türkçe veya İngilizce
5. **Stil:** Rapor görünümü seçenekleri

## Performans Optimizasyonu

### Virtual Scrolling
- Büyük veri setleri için optimize edilmiş
- Sadece görünür öğeler render edilir
- Smooth scrolling deneyimi

### Caching
- Veriler otomatik olarak cache'lenir
- Hızlı yükleme süreleri
- Offline çalışma desteği

### Lazy Loading
- Widget'lar ihtiyaç duyulduğunda yüklenir
- Sayfa yükleme sürelerini azaltır
- Bandwidth tasarrufu

## Mobil Uyumluluk

### Responsive Design
- Tüm ekran boyutlarında çalışır
- Touch-friendly arayüz
- Mobil optimizasyonu

### Mobil Özellikler
- Swipe navigation
- Pinch to zoom
- Touch gestures
- Offline sync

## Güvenlik

### Yetkilendirme
- Role-based access control
- Widget-level permissions
- Export restrictions

### Veri Güvenliği
- SSL/TLS şifreleme
- JWT authentication
- Session management

## Sorun Giderme

### Yaygın Sorunlar

#### Widget'lar Yüklenmiyor
1. Sayfayı yenileyin
2. Cache'i temizleyin
3. Bağlantıyı kontrol edin

#### Veriler Güncel Değil
1. "Yenile" butonuna tıklayın
2. Realtime bağlantısını kontrol edin
3. Browser console'u kontrol edin

#### Export Çalışmıyor
1. Dosya boyutunu kontrol edin
2. İnternet bağlantısını kontrol edin
3. Popup blocker'ı devre dışı bırakın

### Performans Sorunları

#### Yavaş Yükleme
1. Browser cache'i temizleyin
2. Açık sekmeleri azaltın
3. Widget sayısını azaltın

#### Bellek Kullanımı
1. Gereksiz widget'ları kapatın
2. Browser'ı yeniden başlatın
3. Sistem kaynaklarını kontrol edin

## Best Practices

### Dashboard Kullanımı
1. **Düzenli Kontrol:** Dashboard'u günlük olarak kontrol edin
2. **Widget Düzeni:** En önemli bilgileri üstte tutun
3. **Performans:** Gereksiz widget'ları kapatın
4. **Backup:** Önemli raporları export edin

### Veri Yönetimi
1. **Güncel Veriler:** Verilerinizi düzenli olarak güncelleyin
2. **Kategorilendirme:** İşlemleri doğru kategorilere atayın
3. **Dokümantasyon:** Önemli işlemleri not edin
4. **Arşivleme:** Eski verileri düzenli olarak arşivleyin

### Güvenlik
1. **Güçlü Şifre:** Güçlü şifre kullanın
2. **Oturum Kapatma:** İş bitince oturumu kapatın
3. **Güvenli Bağlantı:** Sadece HTTPS kullanın
4. **Yetkilendirme:** Sadece gerekli izinleri verin

## Destek

### Yardım Kaynakları
- **Dokümantasyon:** Bu kılavuz ve API dokümantasyonu
- **Video Tutorials:** Dashboard kullanım videoları
- **FAQ:** Sık sorulan sorular
- **Community:** Kullanıcı topluluğu

### Teknik Destek
- **Email:** support@finbot.com
- **Ticket System:** Destek talebi oluşturun
- **Live Chat:** Canlı destek (iş saatleri)
- **Phone:** Telefon desteği (premium kullanıcılar)

### Geri Bildirim
- **Feature Requests:** Yeni özellik önerileri
- **Bug Reports:** Hata raporları
- **User Feedback:** Genel geri bildirimler
- **Beta Testing:** Yeni özellik testleri

## Güncellemeler

### Otomatik Güncellemeler
- Dashboard otomatik olarak güncellenir
- Yeni özellikler otomatik olarak eklenir
- Güvenlik yamaları otomatik uygulanır

### Sürüm Notları
- **v3.0.0:** Dashboard widget sistemi
- **v2.5.0:** Realtime updates
- **v2.0.0:** Advanced analytics
- **v1.5.0:** Export improvements

### Gelecek Özellikler
- **Mobile App:** Native mobil uygulama
- **AI Insights:** Yapay zeka destekli öngörüler
- **Advanced Charts:** Daha gelişmiş grafikler
- **Custom Dashboards:** Tamamen özelleştirilebilir dashboard'lar
