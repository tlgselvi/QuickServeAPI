import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

// Mock email verification API
router.post('/send-verification', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = req.body;
    const userId = req.user!.id;

    // TODO Tolga'dan teyit al - Mock implementation
    // In production, this would send actual email
    console.log(`📧 Mock email verification sent to ${email} for user ${userId}`);

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      message: 'Doğrulama e-postası gönderildi',
      verificationId: `mock_${Date.now()}`,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'E-posta doğrulama gönderilirken hata oluştu',
    });
  }
});

// Mock email verification confirmation
router.post('/confirm-verification', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { verificationCode } = req.body;
    const userId = req.user!.id;

    // TODO Tolga'dan teyit al - Mock verification logic
    if (!verificationCode || verificationCode.length < 4) {
      return res.status(400).json({
        error: 'Geçersiz doğrulama kodu',
      });
    }

    // Mock successful verification
    console.log(`✅ Mock email verification confirmed for user ${userId} with code ${verificationCode}`);

    res.json({
      success: true,
      message: 'E-posta başarıyla doğrulandı',
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email verification confirmation error:', error);
    res.status(500).json({
      error: 'E-posta doğrulama onaylanırken hata oluştu',
    });
  }
});

// Get verification status
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // TODO Tolga'dan teyit al - Mock status check
    res.json({
      verified: true, // Mock as verified
      verificationDate: new Date().toISOString(),
      canResend: true,
    });
  } catch (error) {
    console.error('Email verification status error:', error);
    res.status(500).json({
      error: 'Doğrulama durumu alınırken hata oluştu',
    });
  }
});

export default router;
