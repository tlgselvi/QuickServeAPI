import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import { 
  generateCashFlowBridgeReport,
  exportCashFlowBridgeToCSV,
  generateCashFlowBridgePDF 
} from '../modules/export/cash-flow-bridge';
import { exportToPDF } from '../modules/export/pdf-export';
import { logger } from '../utils/logger';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/export/cash-flow-bridge - Generate Cash Flow Bridge Report
router.post('/cash-flow-bridge', requireAuth, requirePermission(Permission.EXPORT_DATA), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      startDate,
      endDate,
      period = 'monthly',
      currency = 'TRY',
      companyName,
      format = 'json',
      includeLogo = false,
      logoUrl,
      style,
    } = req.body;

    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Start date ve end date parametreleri gereklidir',
      });
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Geçersiz tarih formatı',
      });
    }

    if (start >= end) {
      return res.status(400).json({
        error: 'Başlangıç tarihi bitiş tarihinden önce olmalıdır',
      });
    }

    // Generate report
    const report = await generateCashFlowBridgeReport(userId, {
      startDate: start,
      endDate: end,
      period,
      currency,
      companyName: companyName || 'FinBot Company',
    });

    // Return in requested format
    switch (format.toLowerCase()) {
      case 'csv':
        const csvData = exportCashFlowBridgeToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="cash_flow_bridge_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
        break;

      case 'pdf':
        const pdfStyle: PDFStyle = {
          primaryColor: style?.primaryColor || '#2563eb',
          secondaryColor: style?.secondaryColor || '#1e40af',
          fontFamily: style?.fontFamily || 'Inter, Arial, sans-serif',
          logoHeight: style?.logoHeight || '60px',
          showLogo: includeLogo && !!logoUrl,
          showFooter: style?.showFooter !== false,
          watermark: style?.watermark,
        };

        const pdfTemplate: PDFTemplate = {
          title: report.title,
          subtitle: 'Nakit Akışı Köprü Raporu',
          companyName: report.companyName,
          logo: logoUrl,
          period: report.period,
          generatedAt: report.generatedAt,
          currency: report.currency,
          data: report.data,
          summary: report.summary,
          footer: 'FinBot Financial Management System',
        };

        const pdfContent = generateEnhancedPDF(pdfTemplate, pdfStyle);
        res.setHeader('Content-Type', 'text/html');
        res.send(pdfContent);
        break;

      case 'json':
      default:
        res.json({
          success: true,
          data: report,
        });
        break;
    }
  } catch (error) {
    logger.error('Cash flow bridge export error:', error);
    res.status(500).json({
      error: 'Cash flow bridge raporu oluşturulurken hata oluştu',
    });
  }
});

// POST /api/export/enhanced-pdf - Generate enhanced PDF with custom styling
router.post('/enhanced-pdf', requireAuth, requirePermission(Permission.EXPORT_DATA), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      template,
      style,
      format = 'html',
    } = req.body;

    if (!template) {
      return res.status(400).json({
        error: 'Template parametresi gereklidir',
      });
    }

    // Validate template
    const requiredFields = ['title', 'companyName', 'period', 'currency', 'data'];
    const missingFields = requiredFields.filter(field => !template[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Eksik alanlar: ${missingFields.join(', ')}`,
      });
    }

    // Set default values
    const pdfTemplate: PDFTemplate = {
      ...template,
      generatedAt: template.generatedAt ? new Date(template.generatedAt) : new Date(),
    };

    const pdfStyle: PDFStyle = {
      primaryColor: style?.primaryColor || '#2563eb',
      secondaryColor: style?.secondaryColor || '#1e40af',
      fontFamily: style?.fontFamily || 'Inter, Arial, sans-serif',
      logoHeight: style?.logoHeight || '60px',
      showLogo: style?.showLogo !== false,
      showFooter: style?.showFooter !== false,
      watermark: style?.watermark,
    };

    const pdfContent = generateEnhancedPDF(pdfTemplate, pdfStyle);

    if (format.toLowerCase() === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(pdfContent);
    } else {
      res.json({
        success: true,
        data: {
          html: pdfContent,
          template: pdfTemplate,
          style: pdfStyle,
        },
      });
    }
  } catch (error) {
    logger.error('Enhanced PDF export error:', error);
    res.status(500).json({
      error: 'Gelişmiş PDF raporu oluşturulurken hata oluştu',
    });
  }
});

// GET /api/export/templates - Get available export templates
router.get('/templates', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const templates = [
      {
        id: 'cash-flow-bridge',
        name: 'Cash Flow Bridge Report',
        description: 'Nakit akışı köprü raporu - detaylı nakit akışı analizi',
        category: 'Financial Analysis',
        supportedFormats: ['json', 'csv', 'pdf'],
        requiredParams: ['startDate', 'endDate'],
        optionalParams: ['period', 'currency', 'companyName'],
      },
      {
        id: 'aging-analysis',
        name: 'Aging Analysis Report',
        description: 'Alacak ve borç yaşlandırma analizi',
        category: 'Financial Analysis',
        supportedFormats: ['json', 'csv', 'pdf'],
        requiredParams: ['reportType'],
        optionalParams: ['filters', 'currency'],
      },
      {
        id: 'runway-analysis',
        name: 'Runway Analysis Report',
        description: 'Nakit tükenme süresi analizi',
        category: 'Financial Analysis',
        supportedFormats: ['json', 'csv', 'pdf'],
        requiredParams: [],
        optionalParams: ['months', 'currency'],
      },
      {
        id: 'financial-health',
        name: 'Financial Health Report',
        description: 'Genel finansal sağlık raporu',
        category: 'Dashboard',
        supportedFormats: ['json', 'pdf'],
        requiredParams: [],
        optionalParams: ['includeCharts', 'currency'],
      },
    ];

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Export templates error:', error);
    res.status(500).json({
      error: 'Export şablonları alınırken hata oluştu',
    });
  }
});

// GET /api/export/styles - Get available PDF styles
router.get('/styles', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const styles = [
      {
        id: 'default',
        name: 'Default Style',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        fontFamily: 'Inter, Arial, sans-serif',
      },
      {
        id: 'corporate',
        name: 'Corporate Style',
        primaryColor: '#1f2937',
        secondaryColor: '#374151',
        fontFamily: 'Roboto, Arial, sans-serif',
      },
      {
        id: 'modern',
        name: 'Modern Style',
        primaryColor: '#7c3aed',
        secondaryColor: '#5b21b6',
        fontFamily: 'Poppins, Arial, sans-serif',
      },
      {
        id: 'minimal',
        name: 'Minimal Style',
        primaryColor: '#059669',
        secondaryColor: '#047857',
        fontFamily: 'Open Sans, Arial, sans-serif',
      },
    ];

    res.json({
      success: true,
      data: styles,
    });
  } catch (error) {
    logger.error('Export styles error:', error);
    res.status(500).json({
      error: 'Export stilleri alınırken hata oluştu',
    });
  }
});

// POST /api/export/batch - Batch export multiple reports
router.post('/batch', requireAuth, requirePermission(Permission.EXPORT_DATA), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { reports, options = {} } = req.body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({
        error: 'Reports array gereklidir',
      });
    }

    if (reports.length > 10) {
      return res.status(400).json({
        error: 'Maksimum 10 rapor aynı anda export edilebilir',
      });
    }

    const results = [];

    for (const reportConfig of reports) {
      try {
        const { type, params, format = 'json' } = reportConfig;

        switch (type) {
          case 'cash-flow-bridge':
            const report = await generateCashFlowBridgeReport(userId, params);
            let data;

            if (format === 'csv') {
              data = exportCashFlowBridgeToCSV(report);
            } else {
              data = report;
            }

            results.push({
              type,
              format,
              success: true,
              data,
            });
            break;

          default:
            results.push({
              type,
              format,
              success: false,
              error: 'Desteklenmeyen rapor tipi',
            });
        }
      } catch (error) {
        results.push({
          type: reportConfig.type,
          success: false,
          error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Batch export error:', error);
    res.status(500).json({
      error: 'Toplu export işlemi sırasında hata oluştu',
    });
  }
});

// GET /api/export/validate - Validate export parameters
router.get('/validate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { type, params } = req.query;

    if (!type) {
      return res.status(400).json({
        error: 'Type parametresi gereklidir',
      });
    }

    let validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    switch (type) {
      case 'cash-flow-bridge':
        if (!params) {
          validation.errors.push('Params parametresi gereklidir');
        } else {
          try {
            const parsedParams = JSON.parse(params as string);
            
            if (!parsedParams.startDate) {
              validation.errors.push('startDate gereklidir');
            }
            if (!parsedParams.endDate) {
              validation.errors.push('endDate gereklidir');
            }
            if (parsedParams.startDate && parsedParams.endDate) {
              const start = new Date(parsedParams.startDate);
              const end = new Date(parsedParams.endDate);
              
              if (start >= end) {
                validation.errors.push('Başlangıç tarihi bitiş tarihinden önce olmalıdır');
              }
              
              const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
              if (daysDiff > 365) {
                validation.warnings.push('Çok uzun dönem seçildi, performans etkilenebilir');
              }
            }
          } catch (error) {
            validation.errors.push('Geçersiz params formatı');
          }
        }
        break;

      default:
        validation.errors.push('Desteklenmeyen rapor tipi');
    }

    validation.valid = validation.errors.length === 0;

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Export validation error:', error);
    res.status(500).json({
      error: 'Export parametreleri doğrulanırken hata oluştu',
    });
  }
});

export default router;
