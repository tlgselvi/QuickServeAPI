import { Router } from 'express';
import { calculateDSCR, mapDSCRStatus } from '../src/modules/finance/dscr';

const router = Router();

router.get('/dscr', (req, res) => {
  const operatingCF = Number(req.query.operatingCF);
  const debtService = Number(req.query.debtService);

  if (Number.isNaN(operatingCF) || Number.isNaN(debtService)) {
    return res.status(400).json({ error: 'operatingCF and debtService must be numbers' });
  }

  const dscr = calculateDSCR(operatingCF, debtService);
  const status = mapDSCRStatus(dscr);
  return res.json({ dscr, status });
});

export default router;

