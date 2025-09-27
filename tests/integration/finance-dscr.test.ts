import { describe, expect, test } from 'vitest';
import request from 'supertest';

describe('Finance DSCR API', () => {
  test('GET /api/finance/dscr returns dscr value', async () => {
    const res = await request('http://localhost:5000')
      .get('/api/finance/dscr')
      .set('x-test-bypass', '1')
      .query({ operatingCF: 200, debtService: 100 });
    expect(res.status).toBe(200);
    expect(typeof res.body.dscr).toBe('number');
  });
});

