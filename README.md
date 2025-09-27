# FinBot v3.0 - AI-Powered Financial Management Platform

[![Version](https://img.shields.io/badge/version-3.0-blue.svg)](https://github.com/finbot/finbot-v3)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)](https://nodejs.org/)

FinBot v3.0, yapay zeka destekli kapsamlı finansal yönetim platformudur. Şirket ve kişisel finansları tek bir platformda yönetmenizi sağlar.

## 🚀 Özellikler

### 💼 Finansal Yönetim

- **Çoklu Hesap Desteği**: Banka, kredi kartı, yatırım hesapları
- **Konsolidasyon**: Şirket ve kişisel hesapları tek görünümde
- **Gerçek Zamanlı Takip**: Canlı bakiye ve işlem güncellemeleri
- **Kategori Bazlı Analiz**: Gelir/gider kategorilerinde detaylı raporlama

### 🤖 AI Destekli Analiz

- **Risk Analizi**: Portföy risk değerlendirmesi ve öneriler
- **Simülasyon Motoru**: 3 parametreli finansal senaryo analizi
- **Yatırım Danışmanı**: Risk profiline göre portföy önerileri
- **Proaktif Uyarılar**: Gelecekteki riskler hakkında erken uyarılar

### 📊 Gelişmiş Raporlama

- **Multi-Currency**: TRY, USD, EUR desteği
- **PDF Export**: Profesyonel finansal raporlar
- **CSV Export**: Çoklu dil desteği ile veri dışa aktarma
- **Görsel Dashboard**: İnteraktif grafikler ve metrikler

### 🎨 Modern UI/UX

- **Responsive Design**: Mobil ve masaüstü uyumlu
- **Dark/Light Mode**: Kullanıcı tercihi
- **PWA Desteği**: Offline çalışma imkanı
- **Real-time Updates**: Anlık veri senkronizasyonu

## 📋 Sistem Gereksinimleri

- **Node.js**: 18.0 veya üzeri
- **npm**: 8.0 veya üzeri
- **PostgreSQL**: 14.0 veya üzeri
- **Redis**: 6.0 veya üzeri (opsiyonel)

## 🛠️ Kurulum

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/finbot/finbot-v3.git
cd finbot-v3/QuickServeAPI
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/finbot

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# OpenAI (Opsiyonel)
OPENAI_API_KEY=your-openai-api-key

# Server
PORT=5000
NODE_ENV=development
```

### 4. Veritabanını Hazırlayın

```bash
# Migration çalıştırın
npm run db:migrate

# Demo verileri yükleyin (opsiyonel)
npm run db:seed
```

### 5. Uygulamayı Başlatın

```bash
# Geliştirme modu
npm run dev

# Production modu
npm run build
npm start
```

## 🧪 Test

### Unit Testler

```bash
# Tüm testleri çalıştır
npm test

# Coverage raporu ile
npm run test:coverage

# Watch modu
npm run test:watch
```

### Test Coverage

- **Hedef**: %85+ coverage
- **Mevcut**: %82 (Son güncelleme: 2024-01-20)

### Test Kategorileri

- **Backend**: API endpoints, business logic, utilities
- **Frontend**: Components, hooks, context providers
- **Integration**: End-to-end API tests

## 📦 Build & Deploy

### Development Build

```bash
npm run dev
```

- Frontend: [http://localhost:5179](http://localhost:5179)
- Backend: [http://localhost:5000](http://localhost:5000)

### Production Build

```bash
npm run build
npm start
```

### Docker Deploy

```bash
# Docker image oluştur
docker build -t finbot-v3 .

# Container çalıştır
docker run -p 5000:5000 -p 5179:5179 finbot-v3
```

### Vercel Deploy

```bash
# Vercel CLI ile
npx vercel --prod

# GitHub Actions ile otomatik deploy
# .github/workflows/deploy.yml dosyası mevcut
```

## 📚 API Dokümantasyonu

### Authentication

Tüm API endpoint'leri JWT token gerektirir (login hariç).

```bash
# Login
POST /api/auth/login
{
  "email": "admin@finbot.com",
  "password": "admin123"
}

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@finbot.com",
    "role": "admin"
  }
}
```

### Dashboard

```bash
# Dashboard verileri
GET /api/dashboard
Authorization: Bearer <token>

# Response
{
  "accounts": [...],
  "totalBalance": 1000000,
  "companyBalance": 750000,
  "personalBalance": 250000,
  "recentTransactions": [...]
}
```

### Consolidation

```bash
# Konsolidasyon breakdown
GET /api/consolidation/breakdown
Authorization: Bearer <token>

# Response
{
  "breakdown": {
    "company": { "bank": 600000, "cash": 0, "credit": 0, "investment": 150000 },
    "personal": { "bank": 200000, "cash": 0, "credit": 25000, "investment": 0 }
  },
  "table": [...],
  "summary": { "totalCompany": 750000, "totalPersonal": 225000 }
}
```

### Risk Analysis

```bash
# Risk analizi
GET /api/risk/analysis?fxDelta=5&rateDelta=-2&inflationDelta=8&liquidityGap=5
Authorization: Bearer <token>

# Response
{
  "best": { "cash": 120000, "score": 85 },
  "base": { "cash": 100000, "score": 70 },
  "worst": { "cash": 75000, "score": 45 },
  "factors": { "fx": "+5%", "rate": "-2%", "inflation": "+8%", "liquidity": "5%" },
  "riskLevel": "medium",
  "recommendations": [...]
}
```

### Simulation

```bash
# Simülasyon çalıştır
POST /api/simulation/run
Authorization: Bearer <token>
{
  "fxDelta": 10,
  "rateDelta": -5,
  "inflationDelta": 5,
  "horizonMonths": 6
}

# Response
{
  "id": "simulation-id",
  "parameters": {...},
  "currentState": {...},
  "projections": [...],
  "summary": {
    "formattedSummary": "Bu senaryoda 4 ay içinde nakit açığı oluşabilir.",
    "cashDeficitMonth": 4
  }
}
```

### Portfolio Advisor

```bash
# Portföy analizi
POST /api/advisor/portfolio
Authorization: Bearer <token>
{
  "portfolio": {
    "cash": 100000,
    "deposits": 200000,
    "forex": 50000,
    "stocks": 150000,
    "bonds": 100000,
    "crypto": 25000,
    "commodities": 15000,
    "realEstate": 50000
  },
  "riskProfile": "medium"
}

# Response
{
  "riskScore": 75,
  "riskLevel": "medium",
  "tips": [...],
  "targetAllocation": {...},
  "recommendations": {...},
  "chartData": {...}
}
```

### Export

```bash
# CSV export (locale desteği ile)
GET /api/export/summary.csv?locale=tr-TR
Authorization: Bearer <token>

# PDF export
GET /api/export/report.pdf
Authorization: Bearer <token>
```

## 🏗️ Proje Yapısı

```text
QuickServeAPI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── contexts/       # React contexts
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── src/
│   │   ├── modules/        # Business logic modules
│   │   │   ├── consolidation/
│   │   │   ├── risk/
│   │   │   ├── simulation/
│   │   │   ├── advisor/
│   │   │   └── exporter/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── services/       # External services
├── shared/                 # Shared types and schemas
├── tests/                  # Test files
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 🔧 Geliştirme

### Kod Standartları

- **TypeScript**: Strict mode aktif
- **ESLint**: Airbnb config
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

### Git Workflow

```bash
# Feature branch oluştur
git checkout -b feature/new-feature

# Commit
git commit -m "feat: add new feature"

# Push
git push origin feature/new-feature

# Pull request oluştur
```

### Commit Convention

- `feat:` Yeni özellik
- `fix:` Bug düzeltme
- `docs:` Dokümantasyon
- `style:` Formatting
- `refactor:` Refactoring
- `test:` Test ekleme
- `chore:` Build/CI

## 📈 Changelog

### v3.0.0 (2024-01-20)

#### ✨ Yeni Özellikler

- **Multi-Currency Support**: TRY/USD/EUR desteği
- **Advanced Risk Analysis**: 4 parametreli risk motoru
- **Simulation Engine**: Finansal senaryo simülasyonu
- **Portfolio Advisor**: AI destekli yatırım önerileri
- **Proactive Alerts**: Gelecek risk uyarıları
- **Enhanced PDF Export**: Profesyonel rapor tasarımı
- **CSV Locale Support**: Çoklu dil desteği

#### 🔧 İyileştirmeler

- **Performance**: %40 daha hızlı dashboard
- **UX**: Modern UI/UX tasarımı
- **Mobile**: Tam responsive tasarım
- **PWA**: Offline çalışma desteği

#### 🐛 Bug Fixes

- Currency formatting düzeltmeleri
- Risk calculation accuracy iyileştirmeleri
- Memory leak düzeltmeleri
- API response time optimizasyonları

### v2.1.0 (2023-12-15)

- Dashboard konsolidasyon özellikleri
- Risk analizi temel sürümü
- PDF export temel sürümü

### v2.0.0 (2023-11-01)

- React 18 migration
- TypeScript strict mode
- New authentication system

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 Destek

- **Email**: [support@finbot.com](mailto:support@finbot.com)
- **Documentation**: [docs.finbot.com](https://docs.finbot.com)
- **Issues**: [GitHub Issues](https://github.com/finbot/finbot-v3/issues)

## 🙏 Teşekkürler

- React ve TypeScript ekibine
- Shadcn/ui component library
- Recharts chart library
- Tüm katkıda bulunan geliştiricilere

---

**FinBot v3.0** - AI-Powered Financial Management Platform
