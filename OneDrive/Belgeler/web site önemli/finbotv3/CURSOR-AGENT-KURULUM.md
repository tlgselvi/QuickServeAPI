# CTO Koçu v2 — Cursor Agent Kurulum Rehberi

## 🎯 Amaç
Bu rehber, CTO Koçu v2 CLI'yi Cursor chat penceresinden doğal dil komutlarıyla kullanmanızı sağlar.

## 📋 Kurulum Adımları

### 1. Agent Konfigürasyonu Hazır ✅
`agent-config.md` dosyası oluşturuldu ve hazır.

### 2. Cursor'da Agent İçe Aktarma

1. **Cursor'ı açın**
2. **Sol alt köşedeki "Agent" butonuna tıklayın**
3. **"Import from project" seçeneğini seçin**
4. **`agent-config.md` dosyasını seçin**
5. **Agent adını verin:** `CTO Koçu v2 (Chat Agent)`
6. **"Import" butonuna tıklayın**

### 3. Agent'ı Test Etme

Yeni oluşturulan agent'ı açın ve şu komutları deneyin:

```
Sprint hazırla
```

```
Monitoring sprint hazırla
```

```
Audit yap
```

```
Optimize et
```

## 🔹 Beklenen Çıktılar

### Sprint Hazırla
```
> node ./cto-coach-v2/dist/index.js hazirla -p FinBot
✅ Sprint planı oluşturuldu: plans/sprint-plan.md
```

### Audit Yap
```
> node ./cto-coach-v2/dist/index.js audit -p FinBot
🔒 Güvenlik kontrol listesi hazırlandı!
📁 Rapor konumu: plans/security-audit.md
⚠️ Risk skoru: 6/10 (Orta Risk)
```

### Optimize Et
```
> node ./cto-coach-v2/dist/index.js optimize -p FinBot
⚡ Performans metrikleri analiz edildi!
📁 Rapor konumu: plans/performance-optimization.md
📊 Performans skoru: 6/10
```

## 📁 Oluşturulan Dosyalar

Agent çalıştığında şu dosyalar oluşturulur:

- `plans/sprint-plan.md` - Sprint planları
- `plans/security-audit.md` - Güvenlik audit raporu
- `plans/performance-optimization.md` - Performans optimizasyon raporu

## 🚀 Desteklenen Komutlar

| Doğal Dil Komutu | CLI Komutu | Açıklama |
|------------------|------------|----------|
| "Sprint hazırla" | `hazirla -p FinBot` | Sprint 1: Temel Geliştirme |
| "Monitoring sprint hazırla" | `hazirla -p FinBot -s 2` | Sprint 2: Monitoring ve Scaling |
| "Audit yap" | `audit -p FinBot` | Güvenlik audit'i |
| "Optimize et" | `optimize -p FinBot` | Performans optimizasyonu |
| "Release oluştur" | `release -p FinBot` | Release notları |

## ⚠️ Sorun Giderme

### Agent Çalışmıyor
- Cursor'ı yeniden başlatın
- Agent'ı yeniden import edin
- `agent-config.md` dosyasının doğru konumda olduğundan emin olun

### CLI Komutları Bulunamıyor
- `cto-coach-v2` klasörünün doğru konumda olduğundan emin olun
- `npm run build` komutunu çalıştırın
- `dist/` klasörünün var olduğunu kontrol edin

### Dosyalar Oluşturulmuyor
- `plans/` klasörünün yazma izinlerini kontrol edin
- PowerShell'de UTF-8 encoding ayarlayın: `chcp 65001`

## 🎉 Başarılı Kurulum

Agent başarıyla kurulduğunda:
- ✅ Doğal dil komutları CLI'ye dönüşür
- ✅ Otomatik raporlar oluşturulur
- ✅ Teknik özetler verilir
- ✅ Dosya konumları gösterilir

**Artık CTO Koçu v2'yi chat penceresinden kullanabilirsiniz!** 🚀
