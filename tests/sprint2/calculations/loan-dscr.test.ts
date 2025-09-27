import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

// Mock loan and DSCR calculation functions - gerçek implementasyon yerine
const calculateAnnuityPayment = (principal: number, annualRate: number, termMonths: number) => {
  const monthlyRate = annualRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                 (Math.pow(1 + monthlyRate, termMonths) - 1);
  return payment;
};

const calculateBulletPayment = (principal: number, annualRate: number, termMonths: number) => {
  const monthlyRate = annualRate / 100 / 12;
  const interest = principal * monthlyRate * termMonths;
  return principal + interest;
};

const calculateDSCR = (netOperatingIncome: number, totalDebtService: number) => {
  if (totalDebtService === 0) return Infinity;
  return netOperatingIncome / totalDebtService;
};

const createAnnuityLoan = async (loanData: any) => {
  const monthlyPayment = calculateAnnuityPayment(loanData.principal, loanData.interestRate, loanData.termMonths);
  
  const [insertedLoan] = await db.execute(`
    INSERT INTO loans (loan_name, principal_amount, interest_rate, term_months, payment_type, monthly_payment, remaining_balance, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    loanData.loanName,
    loanData.principal,
    loanData.interestRate,
    loanData.termMonths,
    'annuity',
    monthlyPayment,
    loanData.principal,
    'active',
    new Date()
  ]);

  return insertedLoan.rows[0];
};

const createBulletLoan = async (loanData: any) => {
  const totalPayment = calculateBulletPayment(loanData.principal, loanData.interestRate, loanData.termMonths);
  
  const [insertedLoan] = await db.execute(`
    INSERT INTO loans (loan_name, principal_amount, interest_rate, term_months, payment_type, monthly_payment, remaining_balance, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    loanData.loanName,
    loanData.principal,
    loanData.interestRate,
    loanData.termMonths,
    'bullet',
    totalPayment,
    loanData.principal,
    'active',
    new Date()
  ]);

  return insertedLoan.rows[0];
};

describe('Loan & DSCR Calculation Tests', () => {
  beforeAll(async () => {
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  describe('Loan Table Migration', () => {
    test('Loan tablosu oluşturulmalı', async () => {
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'loans'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Loan tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('loan_name');
      expect(columns).toContain('principal_amount');
      expect(columns).toContain('interest_rate');
      expect(columns).toContain('term_months');
      expect(columns).toContain('payment_type');
      expect(columns).toContain('monthly_payment');
      expect(columns).toContain('remaining_balance');
    });
  });

  describe('Annuity Loan Tests', () => {
    test('Annuity loan oluşturma', async () => {
      const loanData = {
        loanName: 'Test Annuity Loan',
        principal: 100000,
        interestRate: 12, // 12% annual
        termMonths: 36
      };

      const loan = await createAnnuityLoan(loanData);
      
      expect(loan).toBeDefined();
      expect(loan.loan_name).toBe(loanData.loanName);
      expect(loan.principal_amount).toBe(loanData.principal);
      expect(loan.interest_rate).toBe(loanData.interestRate);
      expect(loan.term_months).toBe(loanData.termMonths);
      expect(loan.payment_type).toBe('annuity');
      expect(loan.monthly_payment).toBeDefined();
      expect(loan.remaining_balance).toBe(loanData.principal);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM loans WHERE loan_name = $1
      `, [loanData.loanName]);
    });

    test('Annuity payment hesaplama doğru olmalı', () => {
      const principal = 100000;
      const annualRate = 12; // 12%
      const termMonths = 36;

      const monthlyPayment = calculateAnnuityPayment(principal, annualRate, termMonths);
      
      // 12% annual rate, 36 months
      // Expected payment should be around 3321.43
      expect(monthlyPayment).toBeCloseTo(3321.43, 1);
      expect(monthlyPayment).toBeGreaterThan(0);
    });

    test('Farklı interest rate ile annuity payment', () => {
      const principal = 50000;
      const termMonths = 24;
      const rates = [6, 9, 15, 18];

      rates.forEach(rate => {
        const monthlyPayment = calculateAnnuityPayment(principal, rate, termMonths);
        
        expect(monthlyPayment).toBeGreaterThan(0);
        expect(monthlyPayment).toBeGreaterThan(principal / termMonths); // Payment > principal/term
      });
    });

    test('Farklı term ile annuity payment', () => {
      const principal = 100000;
      const annualRate = 12;
      const terms = [12, 24, 36, 48, 60];

      terms.forEach(term => {
        const monthlyPayment = calculateAnnuityPayment(principal, annualRate, term);
        
        expect(monthlyPayment).toBeGreaterThan(0);
        // Longer terms should have lower monthly payments
        if (term > 12) {
          const shortTermPayment = calculateAnnuityPayment(principal, annualRate, 12);
          expect(monthlyPayment).toBeLessThan(shortTermPayment);
        }
      });
    });
  });

  describe('Bullet Loan Tests', () => {
    test('Bullet loan oluşturma', async () => {
      const loanData = {
        loanName: 'Test Bullet Loan',
        principal: 200000,
        interestRate: 10, // 10% annual
        termMonths: 24
      };

      const loan = await createBulletLoan(loanData);
      
      expect(loan).toBeDefined();
      expect(loan.loan_name).toBe(loanData.loanName);
      expect(loan.principal_amount).toBe(loanData.principal);
      expect(loan.interest_rate).toBe(loanData.interestRate);
      expect(loan.term_months).toBe(loanData.termMonths);
      expect(loan.payment_type).toBe('bullet');
      expect(loan.monthly_payment).toBeDefined();
      expect(loan.remaining_balance).toBe(loanData.principal);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM loans WHERE loan_name = $1
      `, [loanData.loanName]);
    });

    test('Bullet payment hesaplama doğru olmalı', () => {
      const principal = 100000;
      const annualRate = 10; // 10%
      const termMonths = 12;

      const totalPayment = calculateBulletPayment(principal, annualRate, termMonths);
      
      // 10% annual rate, 12 months
      // Expected total payment: 100000 + (100000 * 0.10 * 1) = 110000
      expect(totalPayment).toBeCloseTo(110000, 1);
      expect(totalPayment).toBeGreaterThan(principal);
    });

    test('Farklı interest rate ile bullet payment', () => {
      const principal = 50000;
      const termMonths = 6;
      const rates = [5, 8, 12, 15];

      rates.forEach(rate => {
        const totalPayment = calculateBulletPayment(principal, rate, termMonths);
        
        expect(totalPayment).toBeGreaterThan(principal);
        expect(totalPayment).toBeCloseTo(principal * (1 + rate / 100 * termMonths / 12), 1);
      });
    });
  });

  describe('DSCR Calculation Tests', () => {
    test('DSCR fonksiyonu ≥1.2 için true dönmeli', () => {
      const testCases = [
        { netOperatingIncome: 120000, totalDebtService: 100000, expectedDSCR: 1.2 },
        { netOperatingIncome: 150000, totalDebtService: 100000, expectedDSCR: 1.5 },
        { netOperatingIncome: 200000, totalDebtService: 100000, expectedDSCR: 2.0 },
        { netOperatingIncome: 300000, totalDebtService: 100000, expectedDSCR: 3.0 }
      ];

      testCases.forEach(({ netOperatingIncome, totalDebtService, expectedDSCR }) => {
        const dscr = calculateDSCR(netOperatingIncome, totalDebtService);
        
        expect(dscr).toBeCloseTo(expectedDSCR, 1);
        expect(dscr).toBeGreaterThanOrEqual(1.2);
      });
    });

    test('DSCR < 1.2 durumu', () => {
      const testCases = [
        { netOperatingIncome: 100000, totalDebtService: 100000, expectedDSCR: 1.0 },
        { netOperatingIncome: 80000, totalDebtService: 100000, expectedDSCR: 0.8 },
        { netOperatingIncome: 50000, totalDebtService: 100000, expectedDSCR: 0.5 }
      ];

      testCases.forEach(({ netOperatingIncome, totalDebtService, expectedDSCR }) => {
        const dscr = calculateDSCR(netOperatingIncome, totalDebtService);
        
        expect(dscr).toBeCloseTo(expectedDSCR, 1);
        expect(dscr).toBeLessThan(1.2);
      });
    });

    test('DSCR = 1.2 edge case', () => {
      const netOperatingIncome = 120000;
      const totalDebtService = 100000;
      const dscr = calculateDSCR(netOperatingIncome, totalDebtService);
      
      expect(dscr).toBeCloseTo(1.2, 1);
      expect(dscr).toBeGreaterThanOrEqual(1.2);
    });

    test('Sıfır debt service durumu', () => {
      const netOperatingIncome = 100000;
      const totalDebtService = 0;
      const dscr = calculateDSCR(netOperatingIncome, totalDebtService);
      
      expect(dscr).toBe(Infinity);
    });

    test('Negatif net operating income durumu', () => {
      const netOperatingIncome = -50000;
      const totalDebtService = 100000;
      const dscr = calculateDSCR(netOperatingIncome, totalDebtService);
      
      expect(dscr).toBeLessThan(0);
      expect(dscr).toBeCloseTo(-0.5, 1);
    });
  });

  describe('Loan CRUD Operations', () => {
    test('Loan oluşturma', async () => {
      const loanData = {
        loanName: 'Test CRUD Loan',
        principal: 150000,
        interestRate: 8,
        termMonths: 48,
        paymentType: 'annuity'
      };

      const [insertedLoan] = await db.execute(`
        INSERT INTO loans (loan_name, principal_amount, interest_rate, term_months, payment_type, monthly_payment, remaining_balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        loanData.loanName,
        loanData.principal,
        loanData.interestRate,
        loanData.termMonths,
        loanData.paymentType,
        calculateAnnuityPayment(loanData.principal, loanData.interestRate, loanData.termMonths),
        loanData.principal,
        'active'
      ]);

      expect(insertedLoan.rows[0].loan_name).toBe(loanData.loanName);
      expect(insertedLoan.rows[0].principal_amount).toBe(loanData.principal);
      expect(insertedLoan.rows[0].interest_rate).toBe(loanData.interestRate);
    });

    test('Loan okuma', async () => {
      const loanData = {
        loanName: 'Test Read Loan',
        principal: 75000,
        interestRate: 6,
        termMonths: 24,
        paymentType: 'bullet'
      };

      const [insertedLoan] = await db.execute(`
        INSERT INTO loans (loan_name, principal_amount, interest_rate, term_months, payment_type, monthly_payment, remaining_balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        loanData.loanName,
        loanData.principal,
        loanData.interestRate,
        loanData.termMonths,
        loanData.paymentType,
        calculateBulletPayment(loanData.principal, loanData.interestRate, loanData.termMonths),
        loanData.principal,
        'active'
      ]);

      const loanId = insertedLoan.rows[0].id;

      const [readLoan] = await db.execute(`
        SELECT * FROM loans WHERE id = $1
      `, [loanId]);

      expect(readLoan.rows[0].loan_name).toBe(loanData.loanName);
      expect(readLoan.rows[0].principal_amount).toBe(loanData.principal);
    });

    test('Loan güncelleme', async () => {
      const loanData = {
        loanName: 'Test Update Loan',
        principal: 200000,
        interestRate: 7,
        termMonths: 36,
        paymentType: 'annuity'
      };

      const [insertedLoan] = await db.execute(`
        INSERT INTO loans (loan_name, principal_amount, interest_rate, term_months, payment_type, monthly_payment, remaining_balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        loanData.loanName,
        loanData.principal,
        loanData.interestRate,
        loanData.termMonths,
        loanData.paymentType,
        calculateAnnuityPayment(loanData.principal, loanData.interestRate, loanData.termMonths),
        loanData.principal,
        'active'
      ]);

      const loanId = insertedLoan.rows[0].id;

      // Loan güncelle
      await db.execute(`
        UPDATE loans 
        SET remaining_balance = $1, status = $2
        WHERE id = $3
      `, [100000, 'updated', loanId]);

      const [updatedLoan] = await db.execute(`
        SELECT * FROM loans WHERE id = $1
      `, [loanId]);

      expect(updatedLoan.rows[0].remaining_balance).toBe(100000);
      expect(updatedLoan.rows[0].status).toBe('updated');
    });

    test('Loan silme', async () => {
      const loanData = {
        loanName: 'Test Delete Loan',
        principal: 300000,
        interestRate: 9,
        termMonths: 60,
        paymentType: 'annuity'
      };

      const [insertedLoan] = await db.execute(`
        INSERT INTO loans (loan_name, principal_amount, interest_rate, term_months, payment_type, monthly_payment, remaining_balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        loanData.loanName,
        loanData.principal,
        loanData.interestRate,
        loanData.termMonths,
        loanData.paymentType,
        calculateAnnuityPayment(loanData.principal, loanData.interestRate, loanData.termMonths),
        loanData.principal,
        'active'
      ]);

      const loanId = insertedLoan.rows[0].id;

      await db.execute(`
        DELETE FROM loans WHERE id = $1
      `, [loanId]);

      const [deletedLoan] = await db.execute(`
        SELECT * FROM loans WHERE id = $1
      `, [loanId]);

      expect(deletedLoan.rows.length).toBe(0);
    });
  });

  describe('DSCR Integration Tests', () => {
    test('Çoklu loan ile DSCR hesaplama', async () => {
      // Test loan'ları oluştur
      const loans = [
        { name: 'Loan 1', principal: 100000, rate: 8, term: 36, type: 'annuity' },
        { name: 'Loan 2', principal: 150000, rate: 10, term: 24, type: 'bullet' },
        { name: 'Loan 3', principal: 75000, rate: 6, term: 48, type: 'annuity' }
      ];

      let totalDebtService = 0;

      for (const loan of loans) {
        const monthlyPayment = loan.type === 'annuity' 
          ? calculateAnnuityPayment(loan.principal, loan.rate, loan.term)
          : calculateBulletPayment(loan.principal, loan.rate, loan.term) / loan.term;
        
        totalDebtService += monthlyPayment;
      }

      const netOperatingIncome = 50000; // Monthly
      const dscr = calculateDSCR(netOperatingIncome, totalDebtService);

      expect(dscr).toBeDefined();
      expect(dscr).toBeGreaterThan(0);
    });

    test('DSCR threshold kontrolü', () => {
      const testCases = [
        { noi: 120000, debtService: 100000, threshold: 1.2, shouldPass: true },
        { noi: 100000, debtService: 100000, threshold: 1.2, shouldPass: false },
        { noi: 150000, debtService: 100000, threshold: 1.2, shouldPass: true },
        { noi: 80000, debtService: 100000, threshold: 1.2, shouldPass: false }
      ];

      testCases.forEach(({ noi, debtService, threshold, shouldPass }) => {
        const dscr = calculateDSCR(noi, debtService);
        const passesThreshold = dscr >= threshold;
        
        expect(passesThreshold).toBe(shouldPass);
      });
    });
  });

  describe('Performance Tests', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 1000 loan oluştur
      const loans = Array.from({ length: 1000 }, (_, i) => [
        `Test Loan ${i}`,
        Math.random() * 500000 + 50000,
        Math.random() * 15 + 5,
        Math.floor(Math.random() * 60) + 12,
        Math.random() > 0.5 ? 'annuity' : 'bullet',
        Math.random() * 10000 + 1000,
        Math.random() * 500000 + 50000,
        'active'
      ]);

      await db.execute(`
        INSERT INTO loans (loan_name, principal_amount, interest_rate, term_months, payment_type, monthly_payment, remaining_balance, status)
        VALUES ${loans.map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`).join(', ')}
      `, loans.flat());

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000 kayıt 5 saniyeden az sürmeli
      expect(duration).toBeLessThan(5000);

      // Temizle
      await db.execute(`
        DELETE FROM loans WHERE loan_name LIKE 'Test Loan %'
      `);
    });

    test('DSCR hesaplama performansı', async () => {
      const startTime = Date.now();

      // 1000 kez DSCR hesaplama
      for (let i = 0; i < 1000; i++) {
        const noi = Math.random() * 100000 + 50000;
        const debtService = Math.random() * 50000 + 10000;
        calculateDSCR(noi, debtService);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000 hesaplama 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Edge Cases', () => {
    test('Sıfır principal ile loan', () => {
      const principal = 0;
      const annualRate = 10;
      const termMonths = 12;

      const annuityPayment = calculateAnnuityPayment(principal, annualRate, termMonths);
      const bulletPayment = calculateBulletPayment(principal, annualRate, termMonths);

      expect(annuityPayment).toBe(0);
      expect(bulletPayment).toBe(0);
    });

    test('Sıfır interest rate ile loan', () => {
      const principal = 100000;
      const annualRate = 0;
      const termMonths = 12;

      const annuityPayment = calculateAnnuityPayment(principal, annualRate, termMonths);
      const bulletPayment = calculateBulletPayment(principal, annualRate, termMonths);

      expect(annuityPayment).toBeCloseTo(principal / termMonths, 1);
      expect(bulletPayment).toBe(principal);
    });

    test('Çok yüksek interest rate ile loan', () => {
      const principal = 100000;
      const annualRate = 100; // 100%
      const termMonths = 12;

      const annuityPayment = calculateAnnuityPayment(principal, annualRate, termMonths);
      const bulletPayment = calculateBulletPayment(principal, annualRate, termMonths);

      expect(annuityPayment).toBeGreaterThan(principal);
      expect(bulletPayment).toBeGreaterThan(principal);
    });

    test('Çok uzun term ile loan', () => {
      const principal = 100000;
      const annualRate = 10;
      const termMonths = 360; // 30 years

      const annuityPayment = calculateAnnuityPayment(principal, annualRate, termMonths);
      const bulletPayment = calculateBulletPayment(principal, annualRate, termMonths);

      expect(annuityPayment).toBeGreaterThan(0);
      expect(bulletPayment).toBeGreaterThan(principal);
    });
  });
});
