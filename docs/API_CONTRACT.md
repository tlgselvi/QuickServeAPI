# FinBot API Contract v3.0

## Overview

FinBot API provides comprehensive financial management capabilities including dashboard widgets, realtime updates, advanced analytics, and performance monitoring.

## Base URL

```
Production: https://finbot-v3.onrender.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require JWT authentication via Authorization header:

```http
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Optional error details"
}
```

## Endpoints

### Dashboard Management

#### Get Dashboard Layout
```http
GET /api/dashboard/layout
```

**Response:**
```json
{
  "success": true,
  "data": {
    "widgets": [
      {
        "id": "financial-health",
        "type": "financial-health",
        "title": "Finansal Sağlık",
        "description": "Genel finansal durum analizi",
        "enabled": true,
        "position": { "row": 1, "col": 1 },
        "size": { "width": 2, "height": 2 },
        "props": {}
      }
    ],
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Save Dashboard Layout
```http
POST /api/dashboard/layout
Content-Type: application/json
```

**Request Body:**
```json
{
  "widgets": [...],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

**Required Permission:** `MANAGE_DASHBOARD`

#### Update Widget
```http
PUT /api/dashboard/layout/widget/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "enabled": false,
  "position": { "row": 2, "col": 1 },
  "size": { "width": 1, "height": 1 }
}
```

#### Reset Dashboard Layout
```http
POST /api/dashboard/layout/reset
```

**Required Permission:** `MANAGE_DASHBOARD`

### Realtime Events

#### Subscribe to Realtime Events (SSE)
```http
GET /api/realtime/subscribe?topics=user.dashboard,user.finance
Accept: text/event-stream
```

**Query Parameters:**
- `topics` (required): Comma-separated list of topics to subscribe to

**Response:** Server-Sent Events stream

**Event Format:**
```
data: {"id":"evt_123","type":"dashboard.widget.updated","userId":"user123","topic":"user.dashboard","data":{...},"timestamp":"2024-01-01T00:00:00.000Z"}
```

#### Get Recent Events
```http
GET /api/realtime/events?since=2024-01-01T00:00:00.000Z&topics=user.dashboard&limit=50
```

**Query Parameters:**
- `since` (optional): ISO timestamp to get events since
- `topics` (optional): Comma-separated list of topics
- `limit` (optional): Maximum number of events (default: 50, max: 100)

#### Publish Event (Admin Only)
```http
POST /api/realtime/publish
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "dashboard.widget.updated",
  "userId": "user123",
  "topic": "user.dashboard",
  "data": { "widgetId": "financial-health" },
  "metadata": { "source": "admin" }
}
```

**Required Permission:** `ADMIN`

#### Get Realtime Statistics (Admin Only)
```http
GET /api/realtime/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeSubscriptions": 15,
    "totalTopics": 8,
    "totalEvents": 1250,
    "averageEventsPerTopic": 156.25
  }
}
```

#### Test Realtime Functionality
```http
POST /api/realtime/test
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Test mesajı"
}
```

### Advanced Analytics

#### Get AR Trends
```http
GET /api/analytics/trends/ar?period=monthly&months=12
```

**Query Parameters:**
- `period` (optional): `monthly`, `quarterly`, `yearly` (default: `monthly`)
- `months` (optional): Number of months to analyze (default: 12, max: 24)

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "ar",
    "period": "monthly",
    "data": [
      {
        "period": "2024-01",
        "date": "2024-01-01T00:00:00.000Z",
        "value": 150000,
        "change": 5000,
        "changePercent": 3.45
      }
    ],
    "summary": {
      "totalValue": 1800000,
      "averageValue": 150000,
      "trend": "increasing",
      "trendStrength": "moderate",
      "volatility": 12500,
      "peakValue": 175000,
      "peakDate": "2024-06-01T00:00:00.000Z",
      "lowestValue": 125000,
      "lowestDate": "2024-01-01T00:00:00.000Z"
    },
    "forecast": {
      "nextPeriod": 155000,
      "confidence": 0.75,
      "direction": "up"
    }
  }
}
```

#### Get AP Trends
```http
GET /api/analytics/trends/ap?period=monthly&months=12
```

#### Get Cash Flow Projection
```http
GET /api/analytics/cashflow-projection?months=12
```

**Query Parameters:**
- `months` (optional): Number of months to project (default: 12, max: 24)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "period": "2024-02",
      "date": "2024-02-01T00:00:00.000Z",
      "projectedInflows": 45000,
      "projectedOutflows": 38000,
      "netCashFlow": 7000,
      "cumulativeCash": 157000,
      "confidence": "high",
      "assumptions": [
        "Geçmiş trendler devam edecek",
        "Büyük olağandışı harcamalar olmayacak"
      ]
    }
  ]
}
```

#### Get Financial Health Trends
```http
GET /api/analytics/financial-health-trends?months=12
```

#### Get Combined Analytics
```http
GET /api/analytics/combined?months=12
```

**Response:** Combined data from all analytics endpoints

#### Export Analytics Data
```http
GET /api/analytics/export/:type?months=12&format=json
```

**Path Parameters:**
- `type`: `ar`, `ap`, `cashflow`, or `health`

**Query Parameters:**
- `months` (optional): Number of months (default: 12, max: 24)
- `format` (optional): `json` or `csv` (default: `json`)

### Performance Monitoring

#### Get Query Performance Metrics
```http
GET /api/performance/metrics?queryId=optional
```

**Query Parameters:**
- `queryId` (optional): Specific query ID to get metrics for

**Required Permission:** `VIEW_SETTINGS`

#### Get Optimization Suggestions
```http
GET /api/performance/suggestions
```

**Required Permission:** `MANAGE_SETTINGS`

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "index",
        "description": "Add index on aging_reports(user_id, report_type, created_at)",
        "impact": "high",
        "sql": "CREATE INDEX idx_aging_reports_user_type_created ON aging_reports(user_id, report_type, created_at);"
      }
    ]
  }
}
```

#### Get Cache Statistics
```http
GET /api/performance/cache/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "size": 150,
    "hitRate": 85.5,
    "totalRequests": 2500,
    "cacheHits": 2138
  }
}
```

#### Clear Cache
```http
POST /api/performance/cache/clear
Content-Type: application/json
```

**Request Body:**
```json
{
  "pattern": "optional_cache_pattern"
}
```

**Required Permission:** `MANAGE_SETTINGS`

#### Performance Health Check
```http
GET /api/performance/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "healthScore": 95,
    "cacheHitRate": 85.5,
    "slowQueries": 2,
    "cacheSize": 150,
    "totalRequests": 2500
  }
}
```

#### Performance Test
```http
POST /api/performance/test
Content-Type: application/json
```

**Request Body:**
```json
{
  "testType": "query",
  "iterations": 10
}
```

**Test Types:** `query`, `cache`, `summary`

**Required Permission:** `MANAGE_SETTINGS`

### Enhanced Export

#### Generate Cash Flow Bridge Report
```http
POST /api/export/cash-flow-bridge
Content-Type: application/json
```

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "period": "monthly",
  "currency": "TRY",
  "companyName": "FinBot Company",
  "format": "json",
  "includeLogo": false,
  "logoUrl": "https://example.com/logo.png",
  "style": {
    "primaryColor": "#2563eb",
    "secondaryColor": "#1e40af",
    "fontFamily": "Inter, Arial, sans-serif"
  }
}
```

**Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `period` (optional): `daily`, `weekly`, `monthly` (default: `monthly`)
- `currency` (optional): Currency code (default: `TRY`)
- `companyName` (optional): Company name for report header
- `format` (optional): `json`, `csv`, `pdf` (default: `json`)
- `includeLogo` (optional): Include logo in PDF (default: `false`)
- `logoUrl` (optional): Logo URL for PDF
- `style` (optional): Custom styling for PDF

**Required Permission:** `EXPORT_DATA`

#### Generate Enhanced PDF
```http
POST /api/export/enhanced-pdf
Content-Type: application/json
```

**Request Body:**
```json
{
  "template": {
    "title": "Report Title",
    "companyName": "Company Name",
    "period": "2024",
    "currency": "TRY",
    "data": [...],
    "summary": {...}
  },
  "style": {
    "primaryColor": "#2563eb",
    "showLogo": true,
    "watermark": "CONFIDENTIAL"
  },
  "format": "html"
}
```

#### Get Export Templates
```http
GET /api/export/templates
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cash-flow-bridge",
      "name": "Cash Flow Bridge Report",
      "description": "Nakit akışı köprü raporu",
      "category": "Financial Analysis",
      "supportedFormats": ["json", "csv", "pdf"],
      "requiredParams": ["startDate", "endDate"],
      "optionalParams": ["period", "currency", "companyName"]
    }
  ]
}
```

#### Get Export Styles
```http
GET /api/export/styles
```

#### Batch Export
```http
POST /api/export/batch
Content-Type: application/json
```

**Request Body:**
```json
{
  "reports": [
    {
      "type": "cash-flow-bridge",
      "params": {
        "startDate": "2024-01-01",
        "endDate": "2024-12-31"
      },
      "format": "csv"
    }
  ],
  "options": {}
}
```

**Limits:**
- Maximum 10 reports per batch request

#### Validate Export Parameters
```http
GET /api/export/validate?type=cash-flow-bridge&params={...}
```

**Query Parameters:**
- `type` (required): Export type
- `params` (required): JSON string of parameters

## Event Types

### Dashboard Events
- `dashboard.widget.updated`
- `dashboard.layout.changed`

### Financial Events
- `finance.aging.updated`
- `finance.runway.updated`
- `finance.cashgap.updated`
- `finance.health.updated`

### Account Events
- `account.created`
- `account.updated`
- `account.deleted`

### Transaction Events
- `transaction.created`
- `transaction.updated`
- `transaction.deleted`

### System Events
- `system.maintenance`
- `system.error`
- `user.login`
- `user.logout`

## Topic Patterns

### User Topics
- `user.{userId}.dashboard`
- `user.{userId}.finance`
- `user.{userId}.accounts`
- `user.{userId}.transactions`

### System Topics
- `system.global`
- `system.admin` (admin only)

## Permissions

### Dashboard Permissions
- `VIEW_DASHBOARD`: View dashboard
- `MANAGE_DASHBOARD`: Manage dashboard layout and widgets

### Analytics Permissions
- `VIEW_ANALYTICS`: View analytics and trends
- `EXPORT_DATA`: Export data and reports

### System Permissions
- `VIEW_SETTINGS`: View system settings and metrics
- `MANAGE_SETTINGS`: Manage system settings and cache
- `ADMIN`: Full administrative access

## Rate Limiting

- **Default:** 100 requests per minute per user
- **Admin:** 1000 requests per minute
- **Realtime:** 10 connections per user

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid JWT |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Webhooks

Currently not supported. Use SSE for realtime updates.

## SDKs

Official SDKs available for:
- JavaScript/TypeScript
- Python
- PHP

## Changelog

### v3.0.0 (Current)
- Added dashboard widget management
- Implemented realtime events with SSE
- Added advanced analytics with trends and projections
- Enhanced export with PDF generation and styling
- Added performance monitoring and optimization
- Implemented virtual scrolling for large datasets

### v2.0.0
- Added aging analysis
- Implemented runway and cash gap analysis
- Added basic export functionality

### v1.0.0
- Initial release with basic financial management
