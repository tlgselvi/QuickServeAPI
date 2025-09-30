# FinBot Export Formats ve Veri Sözlüğü

## Genel Bakış

FinBot sistemi, finansal verilerinizi çeşitli formatlarda dışa aktarmanıza olanak tanır. Bu dokümantasyon, desteklenen formatları, veri yapılarını ve kullanım örneklerini açıklar.

## Desteklenen Formatlar

### 1. JSON (JavaScript Object Notation)
- **Kullanım:** API entegrasyonları, programatik işlemler
- **Avantajlar:** Yapılandırılmış veri, kolay parsing
- **Dosya Uzantısı:** `.json`
- **MIME Type:** `application/json`

### 2. CSV (Comma-Separated Values)
- **Kullanım:** Excel, Google Sheets, veri analizi araçları
- **Avantajlar:** Universal format, kolay import
- **Dosya Uzantısı:** `.csv`
- **MIME Type:** `text/csv`
- **Encoding:** UTF-8 with BOM

### 3. PDF (Portable Document Format)
- **Kullanım:** Resmi raporlar, sunumlar, arşivleme
- **Avantajlar:** Profesyonel görünüm, yazdırılabilir
- **Dosya Uzantısı:** `.pdf`
- **MIME Type:** `application/pdf`

## Rapor Türleri

### 1. Cash Flow Bridge Report

#### Amaç
Nakit akışının detaylı analizini sağlar. Operasyonel, yatırım ve finansman faaliyetlerini ayrı ayrı gösterir.

#### Veri Yapısı

**JSON Format:**
```json
{
  "title": "Cash Flow Bridge Report",
  "companyName": "FinBot Company",
  "period": "2024-01-01 - 2024-12-31",
  "currency": "TRY",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "summary": {
    "totalInflows": 1500000,
    "totalOutflows": 1200000,
    "netCashFlow": 300000,
    "openingBalance": 500000,
    "closingBalance": 800000,
    "variance": 300000,
    "variancePercent": 60.0
  },
  "data": [
    {
      "period": "2024-01",
      "date": "2024-01-01T00:00:00.000Z",
      "openingBalance": 500000,
      "cashInflows": {
        "operating": 45000,
        "investing": 5000,
        "financing": 10000,
        "total": 60000
      },
      "cashOutflows": {
        "operating": 35000,
        "investing": 8000,
        "financing": 7000,
        "total": 50000
      },
      "netCashFlow": 10000,
      "closingBalance": 510000,
      "variance": 10000,
      "variancePercent": 2.0
    }
  ],
  "assumptions": [
    "Tüm işlemler nakit bazlı hesaplanmıştır",
    "Alacak ve borçlar vade tarihlerine göre gruplandırılmıştır"
  ],
  "methodology": "Cash Flow Bridge metodu ile nakit akışı analizi"
}
```

**CSV Format:**
```csv
Period,Date,Opening Balance,Operating Inflows,Investing Inflows,Financing Inflows,Total Inflows,Operating Outflows,Investing Outflows,Financing Outflows,Total Outflows,Net Cash Flow,Closing Balance,Variance,Variance %
"2024-01","2024-01-01","500000.00","45000.00","5000.00","10000.00","60000.00","35000.00","8000.00","7000.00","50000.00","10000.00","510000.00","10000.00","2.0"
```

#### Alan Açıklamaları
- **period:** Dönem tanımlayıcısı (YYYY-MM format)
- **date:** Dönem başlangıç tarihi
- **openingBalance:** Dönem başı nakit bakiyesi
- **cashInflows:** Nakit girişleri
  - **operating:** Operasyonel faaliyetlerden gelen nakit
  - **investing:** Yatırım faaliyetlerinden gelen nakit
  - **financing:** Finansman faaliyetlerinden gelen nakit
  - **total:** Toplam nakit girişi
- **cashOutflows:** Nakit çıkışları
  - **operating:** Operasyonel faaliyetlerden çıkan nakit
  - **investing:** Yatırım faaliyetlerinden çıkan nakit
  - **financing:** Finansman faaliyetlerinden çıkan nakit
  - **total:** Toplam nakit çıkışı
- **netCashFlow:** Net nakit akışı (giriş - çıkış)
- **closingBalance:** Dönem sonu nakit bakiyesi
- **variance:** Dönem başına göre değişim
- **variancePercent:** Yüzde değişim

### 2. Aging Analysis Report

#### Amaç
Alacak ve borçların yaşlandırma analizini sağlar. Vade geçmişi durumunu gösterir.

#### Veri Yapısı

**JSON Format:**
```json
{
  "title": "Aging Analysis Report",
  "reportType": "ar",
  "period": "2024-01-01 - 2024-12-31",
  "currency": "TRY",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "summary": {
    "totalAmount": 500000,
    "totalRecords": 150,
    "overdueAmount": 75000,
    "overdueRecords": 25,
    "agingBuckets": {
      "0-30": { "amount": 300000, "count": 90 },
      "30-60": { "amount": 100000, "count": 35 },
      "60-90": { "amount": 75000, "count": 20 },
      "90+": { "amount": 25000, "count": 5 }
    }
  },
  "data": [
    {
      "id": "aging_001",
      "customerVendorId": "CUST_001",
      "customerVendorName": "ABC Şirketi",
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15T00:00:00.000Z",
      "dueDate": "2024-02-15T00:00:00.000Z",
      "originalAmount": 10000,
      "currentAmount": 10000,
      "currency": "TRY",
      "agingDays": 45,
      "agingBucket": "30-60",
      "status": "outstanding",
      "paymentTerms": "30 gün",
      "description": "Satış faturası"
    }
  ]
}
```

**CSV Format:**
```csv
ID,Customer/Vendor ID,Customer/Vendor Name,Invoice Number,Invoice Date,Due Date,Original Amount,Current Amount,Currency,Aging Days,Aging Bucket,Status,Payment Terms,Description
"aging_001","CUST_001","ABC Şirketi","INV-2024-001","2024-01-15","2024-02-15","10000.00","10000.00","TRY","45","30-60","outstanding","30 gün","Satış faturası"
```

#### Alan Açıklamaları
- **id:** Benzersiz kayıt tanımlayıcısı
- **customerVendorId:** Müşteri/Tedarikçi ID'si
- **customerVendorName:** Müşteri/Tedarikçi adı
- **invoiceNumber:** Fatura numarası
- **invoiceDate:** Fatura tarihi
- **dueDate:** Vade tarihi
- **originalAmount:** Orijinal tutar
- **currentAmount:** Güncel tutar
- **currency:** Para birimi
- **agingDays:** Vade geçmişi (gün)
- **agingBucket:** Yaşlandırma segmenti (0-30, 30-60, 60-90, 90+)
- **status:** Durum (outstanding, paid, overdue)
- **paymentTerms:** Ödeme koşulları
- **description:** Açıklama

### 3. Runway Analysis Report

#### Amaç
Nakit tükenme süresini analiz eder. Mevcut nakitin ne kadar süre yeteceğini hesaplar.

#### Veri Yapısı

**JSON Format:**
```json
{
  "title": "Runway Analysis Report",
  "period": "2024-01-01 - 2024-12-31",
  "currency": "TRY",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "summary": {
    "currentCash": 500000,
    "monthlyBurnRate": 45000,
    "runwayMonths": 11.1,
    "runwayDays": 333,
    "status": "healthy",
    "projections": [
      {
        "month": "2024-02",
        "projectedBalance": 455000,
        "confidence": "high"
      }
    ]
  },
  "data": [
    {
      "period": "2024-01",
      "openingBalance": 500000,
      "inflows": 60000,
      "outflows": 45000,
      "netFlow": 15000,
      "closingBalance": 515000,
      "runwayMonths": 11.4
    }
  ]
}
```

#### Alan Açıklamaları
- **currentCash:** Mevcut nakit bakiyesi
- **monthlyBurnRate:** Aylık nakit tüketim oranı
- **runwayMonths:** Runway süresi (ay)
- **runwayDays:** Runway süresi (gün)
- **status:** Durum (healthy, warning, critical)
- **projections:** Gelecek projeksiyonları

### 4. Financial Health Report

#### Amaç
Genel finansal sağlık durumunu değerlendirir.

#### Veri Yapısı

**JSON Format:**
```json
{
  "title": "Financial Health Report",
  "period": "2024-01-01 - 2024-12-31",
  "currency": "TRY",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "summary": {
    "healthScore": 85,
    "riskLevel": "low",
    "status": "healthy",
    "recommendations": [
      "Alacak tahsilatını hızlandırın",
      "Borç yönetimini optimize edin"
    ]
  },
  "metrics": {
    "liquidityRatio": 2.5,
    "debtToEquityRatio": 0.3,
    "currentRatio": 1.8,
    "quickRatio": 1.2
  }
}
```

## Export Parametreleri

### Genel Parametreler

#### Tarih Aralığı
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```
- **Format:** ISO 8601 (YYYY-MM-DD)
- **Zorunlu:** Evet
- **Varsayılan:** Yok

#### Para Birimi
```json
{
  "currency": "TRY"
}
```
- **Seçenekler:** TRY, USD, EUR, GBP
- **Zorunlu:** Hayır
- **Varsayılan:** TRY

#### Dönem Tipi
```json
{
  "period": "monthly"
}
```
- **Seçenekler:** daily, weekly, monthly, quarterly, yearly
- **Zorunlu:** Hayır
- **Varsayılan:** monthly

#### Format Seçimi
```json
{
  "format": "json"
}
```
- **Seçenekler:** json, csv, pdf
- **Zorunlu:** Hayır
- **Varsayılan:** json

### PDF Özelleştirme

#### Logo ve Marka
```json
{
  "includeLogo": true,
  "logoUrl": "https://example.com/logo.png",
  "companyName": "FinBot Company"
}
```

#### Stil Seçenekleri
```json
{
  "style": {
    "primaryColor": "#2563eb",
    "secondaryColor": "#1e40af",
    "fontFamily": "Inter, Arial, sans-serif",
    "logoHeight": "60px",
    "showFooter": true,
    "watermark": "CONFIDENTIAL"
  }
}
```

#### Dil Seçimi
```json
{
  "language": "tr"
}
```
- **Seçenekler:** tr, en
- **Zorunlu:** Hayır
- **Varsayılan:** tr

### Filtreleme Seçenekleri

#### Aging Reports
```json
{
  "filters": {
    "status": "outstanding",
    "agingBucket": "30-60",
    "minAmount": 1000,
    "maxAmount": 50000,
    "customerVendorIds": ["CUST_001", "CUST_002"]
  }
}
```

#### Transactions
```json
{
  "filters": {
    "category": "operating",
    "accountIds": ["ACC_001", "ACC_002"],
    "minAmount": 100,
    "maxAmount": 10000
  }
}
```

## Veri Doğrulama

### Tarih Validasyonu
- Başlangıç tarihi bitiş tarihinden önce olmalı
- Maksimum 2 yıl aralık
- Gelecek tarihler kabul edilmez

### Tutar Validasyonu
- Pozitif sayılar
- Maksimum 15 haneli ondalık
- Para birimi uyumluluğu

### Kayıt Limiti
- Tek seferde maksimum 100,000 kayıt
- Büyük veri setleri için sayfalama
- Performans optimizasyonu

## Hata Kodları

### Export Hataları
```json
{
  "error": "EXPORT_FAILED",
  "message": "Export işlemi başarısız oldu",
  "code": "EXP001",
  "details": {
    "reason": "Veri boyutu limiti aşıldı",
    "maxRecords": 100000,
    "actualRecords": 150000
  }
}
```

### Doğrulama Hataları
```json
{
  "error": "VALIDATION_FAILED",
  "message": "Parametre doğrulaması başarısız",
  "code": "VAL001",
  "details": {
    "field": "startDate",
    "value": "invalid-date",
    "expected": "YYYY-MM-DD format"
  }
}
```

## Performans Limitleri

### API Limitleri
- **Rate Limit:** 100 request/minute
- **Export Limit:** 10 export/hour
- **Batch Limit:** 10 rapor/batch

### Dosya Limitleri
- **JSON:** Maksimum 50MB
- **CSV:** Maksimum 100MB
- **PDF:** Maksimum 25MB

### Zaman Limitleri
- **Export Timeout:** 5 dakika
- **Batch Timeout:** 15 dakika
- **Cache TTL:** 5 dakika

## Güvenlik

### Yetkilendirme
- **Export Permission:** `EXPORT_DATA` gerekli
- **Admin Functions:** `MANAGE_SETTINGS` gerekli
- **User Isolation:** Kullanıcılar sadece kendi verilerini export edebilir

### Veri Güvenliği
- **SSL/TLS:** Tüm export işlemleri şifrelenir
- **Access Logs:** Export işlemleri loglanır
- **Data Retention:** Export dosyaları 30 gün saklanır

### Gizlilik
- **PII Protection:** Kişisel veriler korunur
- **Audit Trail:** Export işlemleri izlenir
- **Compliance:** GDPR ve KVKK uyumlu

## Entegrasyon Örnekleri

### JavaScript/TypeScript
```javascript
// Cash Flow Bridge export
const response = await fetch('/api/export/cash-flow-bridge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    format: 'csv'
  })
});

const csvData = await response.text();
```

### Python
```python
import requests
import json

# Export API call
response = requests.post(
    'https://finbot-v3.onrender.com/api/export/cash-flow-bridge',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    },
    json={
        'startDate': '2024-01-01',
        'endDate': '2024-12-31',
        'format': 'json'
    }
)

data = response.json()
```

### Excel Integration
```vba
' CSV dosyasını Excel'e import etme
Sub ImportCSV()
    Dim csvFile As String
    csvFile = "C:\path\to\exported_data.csv"
    
    Workbooks.Open csvFile
    ' Veri işleme kodları...
End Sub
```

## Best Practices

### Export Kullanımı
1. **Doğru Format Seçimi:** Kullanım amacına göre format seçin
2. **Veri Filtreleme:** Gereksiz verileri filtreleyin
3. **Batch İşlemler:** Çoklu export için batch kullanın
4. **Cache Kullanımı:** Sık kullanılan verileri cache'leyin

### Performans Optimizasyonu
1. **Tarih Aralığı:** Makul tarih aralıkları seçin
2. **Veri Limiti:** Büyük veri setlerini parçalayın
3. **Async İşlemler:** Uzun süren işlemler için async kullanın
4. **Error Handling:** Hata durumlarını ele alın

### Güvenlik
1. **Token Yönetimi:** JWT token'ları güvenli saklayın
2. **HTTPS Kullanımı:** Her zaman HTTPS kullanın
3. **Veri Temizleme:** Export dosyalarını güvenli silin
4. **Access Control:** Sadece gerekli izinleri verin
