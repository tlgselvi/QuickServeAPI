import puppeteer from 'puppeteer';

async function findJsonError() {
  console.log('🔍 JSON Parse Hatası Tespiti\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Network isteklerini yakala
    const failedRequests = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      
      // API isteklerini kontrol et
      if (url.includes('/api/')) {
        const contentType = response.headers()['content-type'] || '';
        
        try {
          // Eğer JSON bekleniyorsa ama HTML dönüyorsa yakala
          if (status !== 200) {
            const text = await response.text();
            failedRequests.push({
              url: url.replace('http://localhost:5000', ''),
              status,
              contentType,
              preview: text.substring(0, 100)
            });
          } else if (contentType.includes('text/html') && !url.includes('/stream')) {
            const text = await response.text();
            failedRequests.push({
              url: url.replace('http://localhost:5000', ''),
              status,
              contentType,
              preview: text.substring(0, 100)
            });
          }
        } catch (e) {
          // Ignore
        }
      }
    });
    
    // Console hatalarını yakala
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('JSON') || text.includes('<!DOCTYPE')) {
          consoleErrors.push(text);
        }
      }
    });

    console.log('📱 Login yapılıyor...');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@finbot.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Login tamamlandı\n');

    console.log('📱 Dashboard yükleniyor...');
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n════════════════════════════════════');
    console.log('📊 HATA RAPORU');
    console.log('════════════════════════════════════\n');

    if (failedRequests.length > 0) {
      console.log(`❌ ${failedRequests.length} başarısız API isteği bulundu:\n`);
      failedRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.url}`);
        console.log(`   Status: ${req.status}`);
        console.log(`   Content-Type: ${req.contentType}`);
        console.log(`   Preview: ${req.preview.substring(0, 80)}...`);
        console.log();
      });
    } else {
      console.log('✅ Başarısız API isteği yok\n');
    }

    if (consoleErrors.length > 0) {
      console.log(`⚠️  ${consoleErrors.length} console hatası:\n`);
      consoleErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.substring(0, 100)}...`);
        console.log();
      });
    } else {
      console.log('✅ JSON parse hatası yok\n');
    }

    console.log('════════════════════════════════════\n');
    console.log('💡 Tarayıcı açık kalacak.');
    console.log('   DevTools > Network sekmesinden detaylı kontrol yapabilirsiniz.');
    console.log('   Kapatmak için Ctrl+C basın.\n');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

findJsonError().catch(console.error);

