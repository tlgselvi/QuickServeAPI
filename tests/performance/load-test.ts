import { test, expect } from '@playwright/test';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  apiResponseTime: 1000, // 1 second
  pageLoadTime: 3000,    // 3 seconds
  dashboardRenderTime: 2000, // 2 seconds
  largeDataSetSize: 10000,   // 10,000 records
};

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'demo@finbot.com');
    await page.fill('[data-testid="password"]', 'demo123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('API Response Time - Dashboard Data', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/dashboard');
    
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    
    console.log(`Dashboard API response time: ${responseTime}ms`);
  });

  test('API Response Time - Aging Reports', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/aging/ar');
    
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    
    console.log(`Aging Reports API response time: ${responseTime}ms`);
  });

  test('API Response Time - Analytics', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/analytics/combined');
    
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    
    console.log(`Analytics API response time: ${responseTime}ms`);
  });

  test('Page Load Performance - Dashboard', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime);
    
    console.log(`Dashboard page load time: ${loadTime}ms`);
  });

  test('Page Load Performance - Extended Dashboard', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard-extended');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime);
    
    console.log(`Extended Dashboard page load time: ${loadTime}ms`);
  });

  test('Virtual Scroll Performance - Large Dataset', async ({ page }) => {
    // Mock large dataset
    await page.route('/api/aging/ar', async (route) => {
      const largeDataset = Array.from({ length: PERFORMANCE_THRESHOLDS.largeDataSetSize }, (_, i) => ({
        id: `item-${i}`,
        customerVendorName: `Customer ${i}`,
        currentAmount: Math.random() * 10000,
        agingDays: Math.floor(Math.random() * 365),
        agingBucket: ['0-30', '30-60', '60-90', '90+'][Math.floor(Math.random() * 4)],
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: largeDataset,
        }),
      });
    });

    const startTime = Date.now();
    
    await page.goto('/dashboard-extended');
    await page.waitForSelector('[data-testid="widget-aging-table-ar"]');
    
    // Test scroll performance
    const virtualScrollContainer = page.locator('[data-testid="virtual-scroll-container"]');
    await virtualScrollContainer.scrollTo({ top: 5000 });
    await virtualScrollContainer.scrollTo({ top: 10000 });
    
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.dashboardRenderTime);
    
    console.log(`Virtual scroll with ${PERFORMANCE_THRESHOLDS.largeDataSetSize} items render time: ${renderTime}ms`);
  });

  test('Realtime Performance - Event Handling', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Mock realtime events
    let eventCount = 0;
    const startTime = Date.now();
    
    page.on('response', (response) => {
      if (response.url().includes('/api/realtime')) {
        eventCount++;
      }
    });
    
    // Simulate realtime events
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => {
        // Simulate realtime event
        window.dispatchEvent(new CustomEvent('realtime-event', {
          detail: {
            type: 'dashboard.update',
            data: { timestamp: Date.now() },
          },
        }));
      });
    }
    
    await page.waitForTimeout(1000); // Wait for events to process
    
    const processingTime = Date.now() - startTime;
    
    expect(processingTime).toBeLessThan(2000); // Should handle 100 events in under 2 seconds
    
    console.log(`Processed ${eventCount} realtime events in ${processingTime}ms`);
  });

  test('Memory Usage - Long Session', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Perform various actions to test memory usage
    for (let i = 0; i < 10; i++) {
      // Switch between tabs
      await page.click('[data-testid="tab-analytics"]');
      await page.waitForTimeout(100);
      await page.click('[data-testid="tab-aging"]');
      await page.waitForTimeout(100);
      await page.click('[data-testid="tab-overview"]');
      await page.waitForTimeout(100);
      
      // Trigger widget updates
      await page.click('[data-testid="refresh-button"]');
      await page.waitForTimeout(200);
    }
    
    // Check for memory leaks (this is a basic check)
    const memoryInfo = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
      };
    });
    
    console.log(`Memory usage after long session:`, memoryInfo);
    
    // Memory usage should not be excessive (basic check)
    if (memoryInfo.usedJSHeapSize > 0) {
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB
    }
  });

  test('Concurrent API Requests', async ({ request }) => {
    const startTime = Date.now();
    
    // Make multiple concurrent requests
    const promises = [
      request.get('/api/dashboard'),
      request.get('/api/aging/ar'),
      request.get('/api/aging/ap'),
      request.get('/api/analytics/combined'),
      request.get('/api/performance/health'),
    ];
    
    const responses = await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
    
    // Total time should be reasonable for concurrent requests
    expect(totalTime).toBeLessThan(2000); // 2 seconds for all requests
    
    console.log(`Concurrent API requests completed in ${totalTime}ms`);
  });

  test('Export Performance - Large Report', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post('/api/export/cash-flow-bridge', {
      data: {
        startDate: '2023-01-01',
        endDate: '2024-01-01',
        period: 'monthly',
        format: 'json',
      },
    });
    
    const exportTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(exportTime).toBeLessThan(5000); // 5 seconds for large export
    
    console.log(`Large report export time: ${exportTime}ms`);
  });

  test('Database Query Performance', async ({ request }) => {
    const startTime = Date.now();
    
    // Test optimized query performance
    const response = await request.get('/api/performance/test', {
      params: {
        testType: 'query',
        iterations: 10,
      },
    });
    
    const queryTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(queryTime).toBeLessThan(3000); // 3 seconds for 10 iterations
    
    const data = await response.json();
    expect(data.data.results.averageTime).toBeLessThan(100); // Average query under 100ms
    
    console.log(`Database query performance test: ${queryTime}ms total, ${data.data.results.averageTime}ms average`);
  });
});

test.describe('Performance Monitoring', () => {
  test('Performance Metrics Collection', async ({ request }) => {
    // Make some API calls to generate metrics
    await request.get('/api/dashboard');
    await request.get('/api/aging/ar');
    await request.get('/api/analytics/trends/ar');
    
    // Check performance metrics
    const metricsResponse = await request.get('/api/performance/metrics');
    expect(metricsResponse.ok()).toBeTruthy();
    
    const metrics = await metricsResponse.json();
    expect(metrics.data.metrics).toBeDefined();
    
    console.log('Performance metrics collected:', Object.keys(metrics.data.metrics));
  });

  test('Optimization Suggestions', async ({ request }) => {
    const suggestionsResponse = await request.get('/api/performance/suggestions');
    expect(suggestionsResponse.ok()).toBeTruthy();
    
    const suggestions = await suggestionsResponse.json();
    expect(suggestions.data.suggestions).toBeDefined();
    expect(Array.isArray(suggestions.data.suggestions)).toBeTruthy();
    
    console.log(`Found ${suggestions.data.suggestions.length} optimization suggestions`);
  });

  test('Cache Performance', async ({ request }) => {
    // Test cache hit rate
    const statsResponse = await request.get('/api/performance/cache/stats');
    expect(statsResponse.ok()).toBeTruthy();
    
    const stats = await statsResponse.json();
    expect(stats.data.hitRate).toBeDefined();
    expect(stats.data.totalRequests).toBeDefined();
    
    console.log(`Cache hit rate: ${stats.data.hitRate.toFixed(2)}%`);
  });
});
