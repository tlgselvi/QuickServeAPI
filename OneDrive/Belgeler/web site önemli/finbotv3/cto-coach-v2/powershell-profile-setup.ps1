# PowerShell UTF-8 Profil Ayarı
# Bu dosyayı çalıştırarak kalıcı UTF-8 desteği ekleyebilirsiniz

Write-Host "PowerShell UTF-8 profil ayarı ekleniyor..." -ForegroundColor Green

$profileContent = @"
# UTF-8 Encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > `$null

# CTO Koçu v2 kısayolları
function cto-hazirla { node ./cto-coach-v2/dist/index.js hazirla -p FinBot -s 1 }
function cto-monitoring { node ./cto-coach-v2/dist/index.js hazirla -p FinBot -s 2 }
function cto-audit { node ./cto-coach-v2/dist/index.js audit -p FinBot }
function cto-optimize { node ./cto-coach-v2/dist/index.js optimize -p FinBot }
function cto-release { node ./cto-coach-v2/dist/index.js release -p FinBot }
"@

# Profil dosyasına ekle
if (!(Test-Path $PROFILE)) {
    New-Item -Path $PROFILE -Type File -Force
}

Add-Content -Path $PROFILE -Value $profileContent -Encoding UTF8

Write-Host "✅ PowerShell profil ayarı tamamlandı!" -ForegroundColor Green
Write-Host "🔄 PowerShell'i yeniden başlatın veya şu komutu çalıştırın:" -ForegroundColor Yellow
Write-Host "   . `$PROFILE" -ForegroundColor Cyan
Write-Host "" 
Write-Host "📋 Artık şu kısayolları kullanabilirsiniz:" -ForegroundColor Blue
Write-Host "   cto-hazirla      - Sprint 1: Temel Geliştirme" -ForegroundColor White
Write-Host "   cto-monitoring   - Sprint 2: Monitoring ve Scaling" -ForegroundColor White
Write-Host "   cto-audit        - Güvenlik audit" -ForegroundColor White
Write-Host "   cto-optimize     - Performans optimizasyonu" -ForegroundColor White
Write-Host "   cto-release      - Release notları" -ForegroundColor White
