# FinBot v3.0 API Documentation

## 📋 İçindekiler

- [Authentication](#authentication)
- [Dashboard](#dashboard)
- [Consolidation](#consolidation)
- [Risk Analysis](#risk-analysis)
- [Simulation](#simulation)
- [Portfolio Advisor](#portfolio-advisor)
- [Export](#export)
- [Error Handling](#error-handling)

## 🔐 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@finbot.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@finbot.com",
    "role": "admin",
    "username": "admin"
  }
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## 📊 Dashboard

### Get Dashboard Data
```http
GET /api/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "accounts": [
    {
      "id": "acc-1",
      "name": "Şirket Vadesiz",
      "type": "checking",
      "balance": "100000",
      "bankName": "Ziraat Bank"
    }
  ],
  "recentTransactions": [
    {
      "id": "txn-1",
      "amount": "5000",
      "description": "Gelir",
      "category": "Satış",
      "date": "2024-01-15",
      "type": "income"
    }
  ],
  "totalBalance": 1000000,
  "companyBalance": 750000,
  "personalBalance": 250000,
  "totalCash": 800000,
  "totalDebt": 200000,
  "totalTransactions": 150
}
```

## 🏢 Consolidation

### Get Consolidation Breakdown
```http
GET /api/consolidation/breakdown
Authorization: Bearer <token>
```

**Response:**
```json
{
  "breakdown": {
    "company": {
      "bank": 600000,
      "cash": 50000,
      "credit": 25000,
      "investment": 150000
    },
    "personal": {
      "bank": 200000,
      "cash": 15000,
      "credit": 10000,
      "investment": 50000
    }
  },
  "table": [
    {
      "category": "Banka",
      "type": "Şirket",
      "amount": 600000,
      "percentage": 60.0
    },
    {
      "category": "Banka",
      "type": "Kişisel",
      "amount": 200000,
      "percentage": 20.0
    }
  ],
  "summary": {
    "totalCompany": 825000,
    "totalPersonal": 275000,
    "totalAmount": 1100000,
    "companyPercentage": 75.0,
    "personalPercentage": 25.0
  }
}
```

## ⚠️ Risk Analysis

### Get Risk Analysis
```http
GET /api/risk/analysis?fxDelta=5&rateDelta=-2&inflationDelta=8&liquidityGap=5
Authorization: Bearer <token>
```

**Query Parameters:**
- `fxDelta` (number): Döviz kuru değişimi yüzdesi (default: 0)
- `rateDelta` (number): Faiz oranı değişimi yüzdesi (default: 0)
- `inflationDelta` (number): Enflasyon değişimi yüzdesi (default: 0)
- `liquidityGap` (number): Likidite açığı yüzdesi (default: 0)

**Response:**
```json
{
  "best": {
    "cash": 120000,
    "score": 85
  },
  "base": {
    "cash": 100000,
    "score": 70
  },
  "worst": {
    "cash": 75000,
    "score": 45
  },
  "factors": {
    "fx": "+5%",
    "rate": "-2%",
    "inflation": "+8%",
    "liquidity": "5%"
  },
  "parameters": {
    "fxDelta": 5,
    "rateDelta": -2,
    "inflationDelta": 8,
    "liquidityGap": 5
  },
  "riskLevel": "medium",
  "recommendations": [
    "Portföyü çeşitlendirin",
    "Risk yönetimi stratejisi geliştirin",
    "Likidite pozisyonunu güçlendirin"
  ]
}
```

### Validate Risk Parameters
```http
GET /api/risk/parameters/validate?fxDelta=150&rateDelta=200
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": false,
  "errors": [
    {
      "parameter": "fxDelta",
      "message": "Döviz kuru değişimi -100 ile +100 arasında olmalıdır"
    },
    {
      "parameter": "rateDelta", 
      "message": "Faiz oranı değişimi -50 ile +50 arasında olmalıdır"
    }
  ]
}
```

### Compare Risk Scenarios
```http
POST /api/risk/scenarios/compare
Authorization: Bearer <token>
Content-Type: application/json

{
  "scenarios": [
    {
      "name": "Optimistic",
      "fxDelta": 5,
      "rateDelta": -2,
      "inflationDelta": 3,
      "liquidityGap": 2
    },
    {
      "name": "Pessimistic",
      "fxDelta": -10,
      "rateDelta": 5,
      "inflationDelta": 12,
      "liquidityGap": 15
    }
  ]
}
```

**Response:**
```json
{
  "comparison": [
    {
      "name": "Optimistic",
      "riskScore": 85,
      "riskLevel": "low",
      "cashProjection": 115000
    },
    {
      "name": "Pessimistic", 
      "riskScore": 35,
      "riskLevel": "high",
      "cashProjection": 65000
    }
  ]
}
```

## 🎯 Simulation

### Run Simulation
```http
POST /api/simulation/run
Authorization: Bearer <token>
Content-Type: application/json

{
  "fxDelta": 10,
  "rateDelta": -5,
  "inflationDelta": 5,
  "horizonMonths": 6
}
```

**Request Body:**
- `fxDelta` (number): Döviz kuru değişimi yüzdesi
- `rateDelta` (number): Faiz oranı değişimi yüzdesi
- `inflationDelta` (number): Enflasyon değişimi yüzdesi
- `horizonMonths` (number): Simülasyon süresi (3, 6, veya 12)

**Response:**
```json
{
  "id": "simulation-id",
  "parameters": {
    "fxDelta": 10,
    "rateDelta": -5,
    "inflationDelta": 5,
    "horizonMonths": 6
  },
  "currentState": {
    "cash": 100000,
    "debt": 50000,
    "netWorth": 50000
  },
  "projections": [
    {
      "month": 1,
      "cash": 95000,
      "debt": 51000,
      "netWorth": 44000
    },
    {
      "month": 2,
      "cash": 89000,
      "debt": 52000,
      "netWorth": 37000
    }
  ],
  "summary": {
    "formattedSummary": "Bu senaryoda 4 ay içinde nakit açığı oluşabilir.",
    "cashDeficitMonth": 4,
    "totalCashChange": -15000,
    "totalDebtChange": 5000,
    "totalNetWorthChange": -20000
  }
}
```

### Get Simulation History
```http
GET /api/simulation/history?limit=10&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (number): Maksimum sonuç sayısı (default: 10)
- `offset` (number): Başlangıç offset'i (default: 0)

**Response:**
```json
{
  "runs": [
    {
      "id": "sim-1",
      "parameters": {...},
      "results": {...},
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "hasNext": true
}
```

## 💼 Portfolio Advisor

### Get Portfolio Recommendations
```http
POST /api/advisor/portfolio
Authorization: Bearer <token>
Content-Type: application/json

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
```

**Request Body:**
- `portfolio`: Mevcut portföy dağılımı (tüm değerler pozitif)
- `riskProfile`: Risk profili ("low", "medium", "high")

**Response:**
```json
{
  "riskScore": 75,
  "riskLevel": "medium",
  "tips": [
    {
      "id": "tip-1",
      "category": "allocation",
      "title": "Döviz Pozisyonu Artırın",
      "description": "Mevcut döviz pozisyonunuz %8. Hedef %15-20 olmalı.",
      "priority": "medium",
      "action": "Döviz alımı yaparak pozisyonu artırın"
    }
  ],
  "currentAllocation": {
    "cash": 100000,
    "deposits": 200000,
    "forex": 50000,
    "stocks": 150000,
    "bonds": 100000,
    "crypto": 25000,
    "commodities": 15000,
    "realEstate": 50000
  },
  "targetAllocation": {
    "cash": 75000,
    "deposits": 150000,
    "forex": 100000,
    "stocks": 200000,
    "bonds": 125000,
    "crypto": 50000,
    "commodities": 25000,
    "realEstate": 75000
  },
  "recommendations": {
    "rebalance": true,
    "actionItems": [
      "Döviz pozisyonunu %8'den %15'e çıkarın",
      "Hisse senedi ağırlığını artırın",
      "Kripto para yatırımını artırın"
    ],
    "expectedReturn": 8.5,
    "riskLevel": "medium"
  },
  "chartData": {
    "current": [
      {"name": "Nakit", "value": 100000, "color": "#3b82f6"},
      {"name": "Mevduat", "value": 200000, "color": "#10b981"}
    ],
    "target": [
      {"name": "Nakit", "value": 75000, "color": "#3b82f6"},
      {"name": "Mevduat", "value": 150000, "color": "#10b981"}
    ]
  }
}
```

## 📤 Export

### Export CSV Summary
```http
GET /api/export/summary.csv?locale=tr-TR
Authorization: Bearer <token>
```

**Query Parameters:**
- `locale` (string): Locale kodu ("tr-TR", "en-US", "de-DE")

**Response:** CSV file download

### Export PDF Report
```http
GET /api/export/report.pdf
Authorization: Bearer <token>
```

**Response:** PDF file download

### Export Transactions CSV
```http
GET /api/export/transactions.csv?startDate=2024-01-01&endDate=2024-01-31&locale=tr-TR
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (string): Başlangıç tarihi (YYYY-MM-DD)
- `endDate` (string): Bitiş tarihi (YYYY-MM-DD)
- `locale` (string): Locale kodu

**Response:** CSV file download

## ❌ Error Handling

### Error Response Format
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "additional error details"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/endpoint"
}
```

### Common Error Codes

#### 400 Bad Request
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "fxDelta": "Döviz kuru değişimi -100 ile +100 arasında olmalıdır"
  }
}
```

#### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required",
  "details": {
    "code": "TOKEN_MISSING"
  }
}
```

#### 403 Forbidden
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions",
  "details": {
    "required": "VIEW_ALL_REPORTS",
    "current": "VIEW_PERSONAL_REPORTS"
  }
}
```

#### 404 Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found",
  "details": {
    "resource": "simulation",
    "id": "invalid-id"
  }
}
```

#### 429 Too Many Requests
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests",
  "details": {
    "retryAfter": 60
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "details": {
    "requestId": "req-123456"
  }
}
```

## 🔧 Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **Simulation**: 5 requests per minute per user
- **Export**: 20 requests per hour per user

## 📝 Pagination

Liste endpoint'leri için pagination desteği:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔍 Filtering & Sorting

### Query Parameters
- `sort`: Sıralama alanı (`createdAt`, `amount`, `date`)
- `order`: Sıralama yönü (`asc`, `desc`)
- `filter`: Filtreleme kriterleri (JSON string)

### Example
```http
GET /api/transactions?sort=date&order=desc&filter={"category":"income","amount":{"gte":1000}}
```

## 📊 WebSocket Events

### Real-time Updates
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'ACCOUNT_UPDATE':
      // Handle account balance update
      break;
    case 'TRANSACTION_ADDED':
      // Handle new transaction
      break;
    case 'RISK_ALERT':
      // Handle risk alert
      break;
  }
};
```

### Event Types
- `ACCOUNT_UPDATE`: Hesap bakiye güncellemesi
- `TRANSACTION_ADDED`: Yeni işlem eklendi
- `TRANSACTION_UPDATED`: İşlem güncellendi
- `RISK_ALERT`: Risk uyarısı
- `SIMULATION_COMPLETE`: Simülasyon tamamlandı

---

**API Version**: v3.0  
**Last Updated**: 2024-01-20  
**Base URL**: `http://localhost:5000/api`