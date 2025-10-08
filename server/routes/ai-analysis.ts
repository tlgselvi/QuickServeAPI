import { Router } from 'express';
import { financialAnalysisService } from '../services/ai/financial-analysis-service';
import { automatedReportingService } from '../services/ai/automated-reporting-service';
import { smartNotificationService } from '../services/ai/smart-notification-service';
import { requireAuth, logAccess } from '../middleware/auth';
import { AuthenticatedRequest } from '../../shared/types';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/ai/analyze - Perform AI financial analysis
router.post('/analyze', requireAuth, logAccess('AI_ANALYSIS'), async (req: AuthenticatedRequest, res) => {
  try {
    const { analysisType, timeframe, includeInvestments, customPrompt } = req.body;
    const userId = req.user!.id;

    if (!analysisType) {
      return res.status(400).json({
        error: 'Analysis type is required',
        code: 'MISSING_ANALYSIS_TYPE'
      });
    }

    const validTypes = ['trend', 'risk', 'recommendation', 'health', 'forecast'];
    if (!validTypes.includes(analysisType)) {
      return res.status(400).json({
        error: 'Invalid analysis type',
        code: 'INVALID_ANALYSIS_TYPE',
        validTypes
      });
    }

    const request = {
      userId,
      analysisType,
      timeframe: timeframe || 'month',
      includeInvestments: includeInvestments || false,
      customPrompt
    };

    const analysis = await financialAnalysisService.analyzeFinancials(request);

    res.json({
      success: true,
      data: analysis,
      metadata: {
        analysisType,
        timeframe: request.timeframe,
        generatedAt: new Date().toISOString(),
        userId
      }
    });

  } catch (error) {
    logger.error('AI analysis error:', error);
    res.status(500).json({
      error: 'Financial analysis failed',
      code: 'ANALYSIS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/ai/report/generate - Generate automated report
router.post('/report/generate', requireAuth, logAccess('GENERATE_REPORT'), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      reportType,
      includeCharts,
      includeAIInsights,
      includeRecommendations,
      customSections,
      emailDelivery,
      emailAddress
    } = req.body;

    const userId = req.user!.id;

    const config = {
      userId,
      reportType: reportType || 'monthly',
      includeCharts: includeCharts !== false,
      includeAIInsights: includeAIInsights !== false,
      includeRecommendations: includeRecommendations !== false,
      customSections,
      emailDelivery: emailDelivery || false,
      emailAddress: emailAddress || req.user!.email
    };

    const report = await automatedReportingService.generateReport(config);

    res.json({
      success: true,
      data: report,
      message: 'Report generated successfully'
    });

  } catch (error) {
    logger.error('Report generation error:', error);
    res.status(500).json({
      error: 'Report generation failed',
      code: 'REPORT_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ai/reports - Get user's generated reports
router.get('/reports', requireAuth, logAccess('VIEW_REPORTS'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 10, offset = 0, reportType } = req.query;

    // This would typically query a reports table in the database
    // For now, return a mock response
    const reports = {
      reports: [],
      pagination: {
        total: 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: false
      }
    };

    res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({
      error: 'Failed to retrieve reports',
      code: 'GET_REPORTS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ai/reports/:id - Get specific report
router.get('/reports/:id', requireAuth, logAccess('VIEW_REPORT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // This would typically query the database for the specific report
    // For now, return a mock response
    res.status(404).json({
      error: 'Report not found',
      code: 'REPORT_NOT_FOUND'
    });

  } catch (error) {
    logger.error('Get report error:', error);
    res.status(500).json({
      error: 'Failed to retrieve report',
      code: 'GET_REPORT_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/ai/notifications/check - Check for smart notifications
router.post('/notifications/check', requireAuth, logAccess('CHECK_NOTIFICATIONS'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const notifications = await smartNotificationService.generateSmartNotifications(userId);

    res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Notification check error:', error);
    res.status(500).json({
      error: 'Failed to check notifications',
      code: 'NOTIFICATION_CHECK_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ai/anomalies - Check for financial anomalies
router.get('/anomalies', requireAuth, logAccess('CHECK_ANOMALIES'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const anomalies = await smartNotificationService.checkForAnomalies(userId);

    res.json({
      success: true,
      data: {
        anomalies,
        count: anomalies.length,
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Anomaly check error:', error);
    res.status(500).json({
      error: 'Failed to check anomalies',
      code: 'ANOMALY_CHECK_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ai/trends - Check for financial trends
router.get('/trends', requireAuth, logAccess('CHECK_TRENDS'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const trends = await smartNotificationService.checkForTrends(userId);

    res.json({
      success: true,
      data: {
        trends,
        count: trends.length,
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Trend check error:', error);
    res.status(500).json({
      error: 'Failed to check trends',
      code: 'TREND_CHECK_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/ai/notifications/rules - Create notification rule
router.post('/notifications/rules', requireAuth, logAccess('CREATE_NOTIFICATION_RULE'), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      type,
      condition,
      threshold,
      channels,
      priority,
      cooldown
    } = req.body;

    const userId = req.user!.id;

    const rule = await smartNotificationService.createNotificationRule({
      userId,
      type: type || 'threshold',
      condition,
      threshold,
      enabled: true,
      channels: channels || ['dashboard'],
      priority: priority || 'medium',
      cooldown: cooldown || 60
    });

    res.json({
      success: true,
      data: rule,
      message: 'Notification rule created successfully'
    });

  } catch (error) {
    logger.error('Create notification rule error:', error);
    res.status(500).json({
      error: 'Failed to create notification rule',
      code: 'CREATE_RULE_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ai/notifications/rules - Get user's notification rules
router.get('/notifications/rules', requireAuth, logAccess('VIEW_NOTIFICATION_RULES'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // This would typically query the database for user's notification rules
    // For now, return a mock response
    const rules = [];

    res.json({
      success: true,
      data: {
        rules,
        count: rules.length
      }
    });

  } catch (error) {
    logger.error('Get notification rules error:', error);
    res.status(500).json({
      error: 'Failed to retrieve notification rules',
      code: 'GET_RULES_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/ai/scheduled-reports - Generate scheduled reports (admin only)
router.post('/scheduled-reports', requireAuth, logAccess('GENERATE_SCHEDULED_REPORTS'), async (req: AuthenticatedRequest, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    await automatedReportingService.generateScheduledReports();

    res.json({
      success: true,
      message: 'Scheduled reports generated successfully'
    });

  } catch (error) {
    logger.error('Scheduled reports generation error:', error);
    res.status(500).json({
      error: 'Failed to generate scheduled reports',
      code: 'SCHEDULED_REPORTS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/ai/status - Get AI services status
router.get('/status', requireAuth, logAccess('VIEW_AI_STATUS'), async (req: AuthenticatedRequest, res) => {
  try {
    const status = {
      financialAnalysis: {
        status: 'active',
        lastCheck: new Date().toISOString()
      },
      automatedReporting: {
        status: 'active',
        lastReport: new Date().toISOString()
      },
      smartNotifications: {
        status: 'active',
        lastCheck: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('AI status check error:', error);
    res.status(500).json({
      error: 'Failed to check AI status',
      code: 'AI_STATUS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
