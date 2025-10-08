import puppeteer from 'puppeteer';

async function clearAndTest() {
  console.log('🧹 FinBot v3 - Cache Temizle & Test\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    
    // Network ve console hatalarını yakala
    const errors = {
      network: [],
      console: [],
      json: []
    };
    
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('/api/') && status !== 200 && status !== 304) {
        try {
          const text = await response.text();
          errors.network.push({
            url: url.replace('http://localhost:5000', ''),
            status,
            preview: text.substring(0, 100)
          });
        } catch (e) {}
      }
    });
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        if (text.includes('JSON') || text.includes('<!DOCTYPE')) {
          errors.json.push(text.substring(0, 150));
        } else if (!text.includes('SW registration') && !text.includes('EventSource')) {
          errors.console.push(text.substring(0, 150));
        }
      }
    });

    console.log('🧹 ADIM 1: Cache Temizleme');
    console.log('─'.repeat(50));
    
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    console.log('✅ Browser cache temizlendi');
    
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names) {
          await caches.delete(name);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('✅ Service Worker & Storage temizlendi\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🔐 ADIM 2: Login');
    console.log('─'.repeat(50));
    
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await page.type('input[type="email"]', 'admin@finbot.com', { delay: 50 });
    await page.type('input[type="password"]', 'admin123', { delay: 50 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (page.url().includes('/login')) {
      console.log('❌ Login başarısız\n');
    } else {
      console.log('✅ Login başarılı\n');
    }

    console.log('📊 ADIM 3: Dashboard Testi');
    console.log('─'.repeat(50));
    
    await page.goto('http://localhost:5000/', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        hasMain: !!document.querySelector('main'),
        hasHeader: !!document.querySelector('header'),
        contentLength: document.body.textContent.trim().length
      };
    });
    
    console.log(`📌 Sayfa: ${pageInfo.title}`);
    console.log(`${pageInfo.hasMain ? '✅' : '❌'} Main element`);
    console.log(`${pageInfo.hasHeader ? '✅' : '❌'} Header element`);
    console.log(`${pageInfo.contentLength > 100 ? '✅' : '❌'} İçerik (${pageInfo.contentLength} karakter)\n`);

    console.log('═'.repeat(50));
    console.log('📋 HATA RAPORU');
    console.log('═'.repeat(50));
    
    if (errors.network.length > 0) {
      console.log(`\n❌ ${errors.network.length} Network Hatası:`);
      errors.network.forEach((err, i) => {
        console.log(`   ${i + 1}. [${err.status}] ${err.url}`);
        if (err.preview) console.log(`      ${err.preview}...`);
      });
    }
    
    if (errors.json.length > 0) {
      console.log(`\n❌ ${errors.json.length} JSON Parse Hatası:`);
      errors.json.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}...`);
      });
    }
    
    if (errors.console.length > 0) {
      console.log(`\n⚠️  ${errors.console.length} Console Hatası:`);
      errors.console.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}...`);
      });
    }
    
    if (errors.network.length === 0 && errors.json.length === 0 && errors.console.length === 0) {
      console.log('\n✅ Kritik hata yok!');
    }
    
    console.log('\n═'.repeat(50));
    console.log('🎉 TEST TAMAMLANDI');
    console.log('═'.repeat(50));
    console.log('\n💡 Tarayıcı açık kalacak. Manuel test yapabilirsiniz.');
    console.log('   F12 ile DevTools açıp Network sekmesini kontrol edebilirsiniz.');
    console.log('   Kapatmak için Ctrl+C basın.\n');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
  }
}

clearAndTest().catch(console.error);

