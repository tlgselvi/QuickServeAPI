# CTO-AI Core Integration

## 🎯 Overview

CTO-AI Core, `cto-core` ve `fin-bot` projelerini senkronize eden merkezi AI context yönetim sistemidir.

## 📁 Yapı

```
cto-ai-core/
├── shared/
│   ├── context.json          # Merkezi AI context
│   ├── policies.yaml         # Güvenlik ve yönetim kuralları
│   ├── contexts/             # Proje-specific context'ler
│   ├── logs/                 # Sistem logları
│   ├── cache/                # AI response cache
│   └── backups/              # Otomatik yedekler
├── setup-ctocore-link.js     # Otomatik kurulum scripti
└── README.md                 # Bu dosya
```

## 🚀 Kurulum

### Otomatik Kurulum (Önerilen)

```bash
cd cto-ai-core
node setup-ctocore-link.js
```

### Manuel Kurulum

1. **Ortak klasör oluştur:**
```bash
mkdir -p ~/cto-ai-core/shared
cd ~/cto-ai-core/shared
```

2. **Context dosyasını oluştur:**
```json
{
  "organization": "CTO-AI",
  "owner": "Tolga Selvi",
  "shared_env": {
    "DB_URL": "postgres://user:pass@localhost:5432/core",
    "LOG_LEVEL": "info"
  },
  "active_projects": ["cto-core", "fin-bot"]
}
```

3. **Policies dosyasını oluştur:**
```yaml
version: 1
permissions:
  - project: cto-core
    access: full
  - project: fin-bot
    access: read-write
rules:
  code_style: standard
  security_scan: enabled
  prompt_review: cto-ai-core
```

## 🔗 Proje Entegrasyonu

### Her proje kök dizininde `.ctocore-link`:

**cto-core için:**
```json
{
  "core_path": "~/cto-ai-core/shared",
  "project_id": "cto-core"
}
```

**fin-bot için:**
```json
{
  "core_path": "~/cto-ai-core/shared", 
  "project_id": "fin-bot"
}
```

### Cursor IDE ayarları

Her workspace'te `.cursor/settings.json`:
```json
{
  "ctoAI.coreIntegration": true,
  "ctoAI.sharedContext": "~/cto-ai-core/shared/context.json"
}
```

## ✅ Doğrulama

Her proje dizininde:
```bash
node -e "console.log(require(process.env.PWD+'/.ctocore-link'))"
```

## 🔄 Senkronizasyon

### Otomatik Senkronizasyon
- AI context değişiklikleri otomatik olarak paylaşılır
- Proje-specific insight'lar merkezi context'e aktarılır
- Performance metrikleri real-time güncellenir

### Manuel Senkronizasyon
```bash
# Context'i güncelle
echo '{"last_sync":"'$(date -Iseconds)'"}' >> ~/cto-ai-core/shared/context.json

# Projeleri yeniden bağla
node setup-ctocore-link.js
```

## 📊 Monitoring

### Sistem Durumu
```bash
# Core sistem durumu
cat ~/cto-ai-core/shared/context.json | jq '.ai_context.performance_metrics'

# Proje durumları
ls -la */.*ctocore-link
```

### Log İzleme
```bash
# Real-time log izleme
tail -f ~/cto-ai-core/shared/logs/cto-ai-core.log
```

## 🔒 Güvenlik

### Erişim Kontrolü
- Role-based access control (RBAC)
- Project-specific permissions
- Encrypted communication

### Audit Trail
- Tüm AI etkileşimleri loglanır
- Cross-project access izlenir
- Performance metrikleri saklanır

## 🛠️ Troubleshooting

### Bağlantı Sorunları
```bash
# Core path'i kontrol et
ls -la ~/cto-ai-core/shared/

# Link dosyalarını kontrol et
find . -name ".ctocore-link" -exec cat {} \;

# Cursor ayarlarını kontrol et
find . -name "settings.json" -path "*/.cursor/*" -exec cat {} \;
```

### Context Senkronizasyon Sorunları
```bash
# Context dosyasını yeniden oluştur
node setup-ctocore-link.js --reset

# Cache'i temizle
rm -rf ~/cto-ai-core/shared/cache/*
```

## 📈 Performans

### Optimizasyon
- AI response cache'leme
- Incremental context updates
- Background synchronization

### Metrikler
- Response time: <2s
- Accuracy: >95%
- User satisfaction: >4.5/5
- System uptime: >99.5%

## 🔄 Güncellemeler

### Version Control
```bash
# Core version'ı kontrol et
cat ~/cto-ai-core/shared/context.json | jq '.version'

# Proje version'larını kontrol et
find . -name ".ctocore-link" -exec jq '.version' {} \;
```

### Otomatik Güncellemeler
- Daily backup'lar
- Weekly performance reports
- Monthly context optimization

---

## 📞 Destek

Sorunlar için:
1. Log dosyalarını kontrol edin
2. `node setup-ctocore-link.js --validate` çalıştırın
3. Issue açın veya Tolga Selvi ile iletişime geçin

**CTO-AI Core v1.0.0** - Tolga Selvi
