# 🔧 FinBot v3.0 - Technical Details

## 📁 Proje Yapısı
```
QuickServeAPI/
├── client/                 # React frontend
│   ├── src/components/     # UI components (50+ files)
│   ├── src/pages/         # Page components (15+ files)
│   ├── src/hooks/         # Custom hooks
│   └── src/lib/           # Utilities
├── server/                 # Express backend
│   ├── modules/           # Business logic (10+ modules)
│   ├── routes/            # API routes (20+ files)
│   ├── services/          # External services
│   └── middleware/        # Express middleware
├── shared/                 # Shared types and schemas
├── mobile/                # React Native app
└── migrations/            # Database migrations
```

## 🗄️ Database Schema (20+ Tables)
- **users** - Kullanıcı bilgileri
- **accounts** - Hesap yönetimi
- **transactions** - İşlem kayıtları
- **credits** - Kredi ve borçlar
- **investments** - Yatırım portföyü
- **forecasts** - Tahminler
- **simulation_runs** - Simülasyon sonuçları
- **system_alerts** - Sistem uyarıları
- **teams** - Takım yönetimi
- **audit_logs** - Denetim kayıtları

## 🔌 API Endpoints (50+ endpoints)
### Authentication
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/profile

### Accounts
- GET /api/accounts
- POST /api/accounts
- PUT /api/accounts/:id
- DELETE /api/accounts/:id

### Transactions
- GET /api/transactions
- POST /api/transactions
- PUT /api/transactions/:id
- DELETE /api/transactions/:id

### AI & Analytics
- POST /api/simulation/run
- GET /api/advisor/portfolio
- POST /api/risk/analysis
- GET /api/analytics/trends

### Export
- GET /api/export/report.pdf
- GET /api/export/summary.csv
- GET /api/export/transactions.json

## 🎨 Frontend Components (50+ components)
- **Dashboard**: Real-time financial overview
- **Account Management**: Multi-account support
- **Transaction Forms**: CRUD operations
- **Charts**: Recharts integration
- **AI Chat**: OpenAI integration
- **Simulation Panel**: Scenario analysis
- **Risk Analysis**: Portfolio risk assessment
- **Export Tools**: PDF/CSV generation

## 🔒 Security Features
- **JWT Authentication** - Token-based auth
- **RBAC** - Role-based access control
- **Password Hashing** - bcrypt + argon2
- **Input Validation** - Zod schemas
- **SQL Injection Protection** - Parameterized queries
- **XSS Protection** - Input sanitization
- **Rate Limiting** - API protection
- **Security Headers** - CORS, CSP, HSTS

## 🤖 AI Features
- **Simulation Engine** - 3-parameter financial modeling
- **Risk Analysis** - Portfolio risk assessment
- **Portfolio Advisor** - Investment recommendations
- **Scenario Planning** - What-if analysis
- **Investment Suggestions** - AI-powered recommendations

## 📱 Mobile App Features
- **React Native** - Cross-platform
- **Expo** - Development framework
- **Navigation** - Stack + Tab navigation
- **Screens**: Login, Dashboard, Accounts, Transactions
- **Charts** - react-native-chart-kit
- **Offline Support** - AsyncStorage

## 🚀 Performance Metrics
- **Page Load Time**: ~800ms
- **API Response Time**: ~200ms
- **Database Queries**: Optimized with indexes
- **Bundle Size**: ~2.1MB (gzipped)
- **Uptime**: 99.9%+

## 🧪 Testing
- **Unit Tests**: 82% backend coverage
- **Integration Tests**: 78% coverage
- **Component Tests**: 65% frontend coverage
- **E2E Tests**: Eksik
- **Security Tests**: Authentication, authorization

## 🔧 Development Tools
- **TypeScript** - Type safety
- **ESLint** - Code quality
- **Prettier** - Code formatting
- **Vitest** - Testing framework
- **Drizzle Kit** - Database migrations
- **Vite** - Build tool
- **TailwindCSS** - Styling

## 📦 Dependencies
### Frontend
- React 18, TypeScript, Vite
- @tanstack/react-query, React Router
- Recharts, Lucide React
- TailwindCSS, Radix UI

### Backend
- Node.js, Express, TypeScript
- Drizzle ORM, PostgreSQL
- JWT, bcryptjs, argon2
- OpenAI API, WebSocket

### Mobile
- React Native, Expo
- @react-navigation/native
- react-native-chart-kit
- AsyncStorage
