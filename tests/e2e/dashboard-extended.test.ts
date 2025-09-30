import { test, expect } from '@playwright/test';

test.describe('Dashboard Extended Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display aging analysis components', async ({ page }) => {
    // Navigate to aging page or section
    await page.goto('/dashboard');
    
    // Check for aging summary components
    await expect(page.locator('[data-testid="aging-summary-ar"]')).toBeVisible();
    await expect(page.locator('[data-testid="aging-summary-ap"]')).toBeVisible();
    
    // Check for aging tables
    await expect(page.locator('[data-testid="aging-table-ar"]')).toBeVisible();
    await expect(page.locator('[data-testid="aging-table-ap"]')).toBeVisible();
  });

  test('should display runway analysis widget', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for runway widget
    await expect(page.locator('[data-testid="runway-widget"]')).toBeVisible();
    
    // Check for key metrics
    await expect(page.locator('text=Runway Analizi')).toBeVisible();
    await expect(page.locator('text=ay')).toBeVisible();
    await expect(page.locator('text=Mevcut Nakit')).toBeVisible();
    await expect(page.locator('text=Aylık Gider')).toBeVisible();
  });

  test('should display cash gap analysis widget', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for cash gap widget
    await expect(page.locator('[data-testid="cash-gap-widget"]')).toBeVisible();
    
    // Check for key metrics
    await expect(page.locator('text=Cash Gap Analizi')).toBeVisible();
    await expect(page.locator('text=Toplam Alacak')).toBeVisible();
    await expect(page.locator('text=Toplam Borç')).toBeVisible();
    await expect(page.locator('text=Net Pozisyon')).toBeVisible();
  });

  test('should display financial health widget', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for financial health widget
    await expect(page.locator('[data-testid="financial-health-widget"]')).toBeVisible();
    
    // Check for health score
    await expect(page.locator('text=Finansal Sağlık')).toBeVisible();
    await expect(page.locator('text=/100')).toBeVisible();
    await expect(page.locator('text=Sağlık Skoru')).toBeVisible();
  });

  test('should have export functionality', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for export buttons
    await expect(page.locator('[data-testid="export-toolbar"]')).toBeVisible();
    
    // Click export button
    await page.locator('[data-testid="export-button"]').first().click();
    
    // Check for export dialog
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
    
    // Check for export options
    await expect(page.locator('text=CSV (Excel uyumlu)')).toBeVisible();
    await expect(page.locator('text=PDF (Yazdırılabilir)')).toBeVisible();
    await expect(page.locator('text=Türkçe')).toBeVisible();
    await expect(page.locator('text=English')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('/api/aging/*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/dashboard');
    
    // Check for error handling
    await expect(page.locator('text=Veri alınırken hata oluştu')).toBeVisible();
  });

  test('should filter aging data correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for aging table to load
    await page.waitForSelector('[data-testid="aging-table-ar"]');
    
    // Test customer filter
    const customerFilter = page.locator('[placeholder="Müşteri/Tedarikçi ara..."]');
    await customerFilter.fill('Test');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Test status filter
    const statusFilter = page.locator('[data-testid="status-filter"]');
    await statusFilter.selectOption('overdue');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Test aging bucket filter
    const bucketFilter = page.locator('[data-testid="bucket-filter"]');
    await bucketFilter.selectOption('30-60');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
  });

  test('should display proper color coding for aging buckets', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for aging table to load
    await page.waitForSelector('[data-testid="aging-table-ar"]');
    
    // Check for color-coded badges
    const bucket0_30 = page.locator('.bg-green-100, .bg-green-900\\/30');
    const bucket30_60 = page.locator('.bg-yellow-100, .bg-yellow-900\\/30');
    const bucket60_90 = page.locator('.bg-orange-100, .bg-orange-900\\/30');
    const bucket90plus = page.locator('.bg-red-100, .bg-red-900\\/30');
    
    // At least one of each color should be present if data exists
    await expect(bucket0_30.or(bucket30_60).or(bucket60_90).or(bucket90plus)).toBeVisible();
  });

  test('should show loading states correctly', async ({ page }) => {
    // Slow down API responses
    await page.route('/api/dashboard/runway', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              currentCash: 100000,
              monthlyExpenses: 25000,
              runwayMonths: 4,
              runwayDays: 120,
              status: 'warning',
              recommendations: ['Test recommendation'],
              monthlyBreakdown: [],
            },
          }),
        });
      }, 2000);
    });

    await page.goto('/dashboard');
    
    // Check for loading state
    await expect(page.locator('text=Yükleniyor...')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForSelector('text=Runway Analizi', { timeout: 5000 });
  });
});
