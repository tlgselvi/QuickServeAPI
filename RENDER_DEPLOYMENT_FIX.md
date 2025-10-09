# Render Deployment Fix Guide

## Problem
Render Dashboard'da build command manuel olarak override edilmiş ve `npm ci && npx vite build` kullanıyor.
`npm ci` package-lock.json olmadan çalışamıyor.

## Çözüm 1: Dashboard'dan Build Command Güncelle (ÖNERİLEN)

1. https://dashboard.render.com adresine git
2. "finbot-v3" veya "QuickServeAPI" servisini aç
3. **Settings** → **Build & Deploy**
4. **Build Command** alanını bul
5. Değiştir:
   ```bash
   npm install && npm run build
   ```
6. **Save Changes**
7. **Manual Deploy** → **Deploy latest commit**

## Çözüm 2: Build Command'ı Tamamen Kaldır

1. Dashboard'da **Build Command** alanını **BOŞ BIRAK**
2. Render otomatik olarak `render.yaml`'ı kullanacak
3. Save ve deploy

## Çözüm 3: .render-build.sh Script'ini Kullan

1. Build Command'ı şu şekilde ayarla:
   ```bash
   bash .render-build.sh
   ```
2. Save ve deploy

## Doğrulama

Deploy başladığında log'da şunu göreceksiniz:
```
==> Running build command 'npm install && npm run build'...
```

Eğer hala `npm ci` görüyorsanız, Build Command override'ı kaldırılmamış demektir.

## Environment Variables

Aşağıdaki değerlerin string olduğundan emin olun:
- API_PORT: "10000"
- BCRYPT_ROUNDS: "12"
- RATE_LIMIT_WINDOW: "15"
- RATE_LIMIT_MAX: "100"
- VAT_RATE: "0.20"
- SGK_RATE: "0.15"
- ENABLE_*: "true"

## Test

Build başarılı olduktan sonra:
```bash
curl https://finbot-v3.onrender.com/api/health
```

Yanıt:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

