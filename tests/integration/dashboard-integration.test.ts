import { test, expect } from '@playwright/test';

test.describe('Dashboard Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'demo@finbot.com');
    await page.fill('[data-testid="password"]', 'demo123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('Dashboard Widget Integration', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Check that all default widgets are loaded
    await expect(page.locator('[data-testid="widget-financial-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="widget-runway"]')).toBeVisible();
    await expect(page.locator('[data-testid="widget-cashgap"]')).toBeVisible();
    await expect(page.locator('[data-testid="widget-aging-summary-ar"]')).toBeVisible();
    await expect(page.locator('[data-testid="widget-aging-summary-ap"]')).toBeVisible();
    await expect(page.locator('[data-testid="widget-aging-table-ar"]')).toBeVisible();
    await expect(page.locator('[data-testid="widget-aging-table-ap"]')).toBeVisible();
  });

  test('Widget Toggle Functionality', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Enter edit mode
    await page.click('[data-testid="edit-mode-button"]');
    
    // Toggle a widget off
    await page.click('[data-testid="widget-financial-health"] button[data-testid="toggle-widget"]');
    
    // Widget should be hidden
    await expect(page.locator('[data-testid="widget-financial-health"]')).not.toBeVisible();
    
    // Toggle it back on
    await page.click('[data-testid="edit-mode-button"]');
    await page.click('[data-testid="widget-financial-health"] button[data-testid="toggle-widget"]');
    
    // Widget should be visible again
    await expect(page.locator('[data-testid="widget-financial-health"]')).toBeVisible();
  });

  test('Tab Navigation', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Test tab navigation
    await page.click('[data-testid="tab-aging"]');
    await expect(page.locator('[data-testid="tab-aging"]')).toHaveAttribute('data-state', 'active');
    
    await page.click('[data-testid="tab-analytics"]');
    await expect(page.locator('[data-testid="tab-analytics"]')).toHaveAttribute('data-state', 'active');
    
    await page.click('[data-testid="tab-reports"]');
    await expect(page.locator('[data-testid="tab-reports"]')).toHaveAttribute('data-state', 'active');
    
    await page.click('[data-testid="tab-overview"]');
    await expect(page.locator('[data-testid="tab-overview"]')).toHaveAttribute('data-state', 'active');
  });

  test('Export Functionality', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Test export toolbar
    await expect(page.locator('[data-testid="export-toolbar"]')).toBeVisible();
    
    // Click export button
    await page.click('[data-testid="export-button"]');
    
    // Export dialog should appear
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
    
    // Select format and language
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.selectOption('[data-testid="export-language"]', 'tr');
    
    // Click export
    await page.click('[data-testid="confirm-export"]');
    
    // Wait for download (in real implementation, you'd check for actual download)
    await page.waitForTimeout(1000);
  });

  test('Realtime Updates', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Check realtime connection
    await expect(page.locator('[data-testid="realtime-status"]')).toBeVisible();
    
    // Simulate realtime event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('realtime-event', {
        detail: {
          type: 'dashboard.widget.updated',
          data: { widgetId: 'financial-health', timestamp: Date.now() },
        },
      }));
    });
    
    // Widget should update (this would need actual implementation)
    await page.waitForTimeout(500);
  });

  test('Dashboard Layout Persistence', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Enter edit mode and modify layout
    await page.click('[data-testid="edit-mode-button"]');
    
    // Toggle a widget
    await page.click('[data-testid="widget-runway"] button[data-testid="toggle-widget"]');
    
    // Exit edit mode
    await page.click('[data-testid="edit-mode-button"]');
    
    // Reload page
    await page.reload();
    
    // Layout should be persisted (widget should remain hidden)
    await expect(page.locator('[data-testid="widget-runway"]')).not.toBeVisible();
  });

  test('Performance Monitoring Integration', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Check that performance monitoring is working
    const performanceMetrics = await page.evaluate(() => {
      return {
        renderTime: performance.now(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      };
    });
    
    expect(performanceMetrics.renderTime).toBeGreaterThan(0);
    
    // Check for performance indicators in UI
    await expect(page.locator('[data-testid="performance-indicator"]')).toBeVisible();
  });

  test('Error Handling', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Mock API error
    await page.route('/api/dashboard/layout', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    // Trigger error by entering edit mode
    await page.click('[data-testid="edit-mode-button"]');
    
    // Error should be handled gracefully
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('Mobile Responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard-extended');
    
    // Check that widgets are responsive
    await expect(page.locator('[data-testid="widget-financial-health"]')).toBeVisible();
    
    // Check tab navigation on mobile
    await page.click('[data-testid="tab-aging"]');
    await expect(page.locator('[data-testid="tab-aging"]')).toHaveAttribute('data-state', 'active');
  });

  test('Accessibility', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Check for proper ARIA labels
    await expect(page.locator('[data-testid="widget-financial-health"]')).toHaveAttribute('aria-label');
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check focus indicators
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Data Consistency', async ({ page, request }) => {
    await page.goto('/dashboard-extended');
    
    // Get data from API
    const apiResponse = await request.get('/api/dashboard');
    const apiData = await apiResponse.json();
    
    // Get data displayed in UI
    const uiData = await page.evaluate(() => {
      const financialHealthWidget = document.querySelector('[data-testid="widget-financial-health"]');
      return {
        healthScore: financialHealthWidget?.textContent || '',
      };
    });
    
    // Data should be consistent (this is a basic check)
    expect(apiData.success).toBeTruthy();
    expect(uiData.healthScore).toBeTruthy();
  });

  test('Concurrent User Simulation', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    
    // All users login simultaneously
    await Promise.all(pages.map(async (page) => {
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'demo@finbot.com');
      await page.fill('[data-testid="password"]', 'demo123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
    }));
    
    // All users access dashboard simultaneously
    await Promise.all(pages.map(page => page.goto('/dashboard-extended')));
    
    // All dashboards should load successfully
    await Promise.all(pages.map(page => 
      expect(page.locator('[data-testid="widget-financial-health"]')).toBeVisible()
    ));
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('Cache Performance', async ({ page, request }) => {
    await page.goto('/dashboard-extended');
    
    // First request
    const startTime1 = Date.now();
    await request.get('/api/dashboard/layout');
    const time1 = Date.now() - startTime1;
    
    // Second request (should be cached)
    const startTime2 = Date.now();
    await request.get('/api/dashboard/layout');
    const time2 = Date.now() - startTime2;
    
    // Cached request should be faster
    expect(time2).toBeLessThan(time1);
    
    console.log(`First request: ${time1}ms, Second request (cached): ${time2}ms`);
  });

  test('Export Integration', async ({ page, request }) => {
    await page.goto('/dashboard-extended');
    
    // Test export API integration
    const exportResponse = await request.post('/api/export/cash-flow-bridge', {
      data: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        period: 'monthly',
        format: 'json',
      },
    });
    
    expect(exportResponse.ok()).toBeTruthy();
    
    const exportData = await exportResponse.json();
    expect(exportData.success).toBeTruthy();
    expect(exportData.data).toBeDefined();
  });

  test('Analytics Integration', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Navigate to analytics tab
    await page.click('[data-testid="tab-analytics"]');
    
    // Analytics content should be visible
    await expect(page.locator('[data-testid="analytics-content"]')).toBeVisible();
    
    // Check for analytics widgets
    await expect(page.locator('[data-testid="analytics-placeholder"]')).toBeVisible();
  });

  test('Report Generation', async ({ page }) => {
    await page.goto('/dashboard-extended');
    
    // Navigate to reports tab
    await page.click('[data-testid="tab-reports"]');
    
    // Export toolbar should be visible
    await expect(page.locator('[data-testid="export-toolbar"]')).toBeVisible();
    
    // Test report generation
    await page.click('[data-testid="generate-report"]');
    
    // Report should be generated
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible();
  });
});
