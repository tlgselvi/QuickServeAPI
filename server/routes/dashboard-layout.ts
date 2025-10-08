import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema-sqlite';
import { db } from '../db';
import { users } from '@shared/schema-sqlite';
import { logger } from '../utils/logger';

const router = Router();

// Dashboard layout schema validation
interface WidgetConfig {
  id: string;
  type: 'aging-summary' | 'aging-table' | 'runway' | 'cashgap' | 'financial-health';
  title: string;
  description: string;
  enabled: boolean;
  position: { row: number; col: number };
  size: { width: number; height: number };
  props?: Record<string, any>;
}

interface DashboardLayout {
  widgets: WidgetConfig[];
  lastUpdated: string;
}

const validateWidgetConfig = (widget: any): WidgetConfig => {
  if (!widget.id || !widget.type || !widget.title) {
    throw new Error('Widget ID, type ve title zorunludur');
  }

  if (!['aging-summary', 'aging-table', 'runway', 'cashgap', 'financial-health'].includes(widget.type)) {
    throw new Error('Geçersiz widget tipi');
  }

  if (typeof widget.enabled !== 'boolean') {
    throw new Error('Widget enabled durumu boolean olmalıdır');
  }

  if (!widget.position || typeof widget.position.row !== 'number' || typeof widget.position.col !== 'number') {
    throw new Error('Widget position bilgisi eksik veya hatalı');
  }

  if (!widget.size || typeof widget.size.width !== 'number' || typeof widget.size.height !== 'number') {
    throw new Error('Widget size bilgisi eksik veya hatalı');
  }

  return widget as WidgetConfig;
};

const validateDashboardLayout = (layout: any): DashboardLayout => {
  if (!layout.widgets || !Array.isArray(layout.widgets)) {
    throw new Error('Widgets array zorunludur');
  }

  const validatedWidgets = layout.widgets.map(validateWidgetConfig);

  return {
    widgets: validatedWidgets,
    lastUpdated: layout.lastUpdated || new Date().toISOString(),
  };
};

// GET /api/dashboard/layout - Get user's dashboard layout
router.get('/layout', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user's dashboard preferences from database
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı',
      });
    }

    let dashboardLayout: DashboardLayout;

    try {
      // Try to parse existing layout from user metadata
      if (user[0].metadata && typeof user[0].metadata === 'object') {
        const metadata = user[0].metadata as any;
        if (metadata.dashboardLayout) {
          dashboardLayout = validateDashboardLayout(metadata.dashboardLayout);
        } else {
          // No dashboard layout found, use default
          dashboardLayout = getDefaultDashboardLayout();
        }
      } else {
        // No metadata found, use default
        dashboardLayout = getDefaultDashboardLayout();
      }
    } catch (error) {
      // Return default layout if no custom layout exists
      dashboardLayout = {
        widgets: [
          {
            id: 'financial-health',
            type: 'financial-health',
            title: 'Finansal Sağlık',
            description: 'Genel finansal durum analizi',
            enabled: true,
            position: { row: 1, col: 1 },
            size: { width: 2, height: 2 },
          },
          {
            id: 'runway',
            type: 'runway',
            title: 'Runway Analizi',
            description: 'Nakit tükenme süresi analizi',
            enabled: true,
            position: { row: 1, col: 3 },
            size: { width: 2, height: 1 },
          },
          {
            id: 'cashgap',
            type: 'cashgap',
            title: 'Cash Gap Analizi',
            description: 'Alacak ve borç karşılaştırması',
            enabled: true,
            position: { row: 1, col: 5 },
            size: { width: 2, height: 1 },
          },
          {
            id: 'aging-summary-ar',
            type: 'aging-summary',
            title: 'Alacak Yaşlandırması',
            description: 'Müşteri alacaklarının yaşlandırma analizi',
            enabled: true,
            position: { row: 2, col: 1 },
            size: { width: 3, height: 1 },
            props: { reportType: 'ar' },
          },
          {
            id: 'aging-summary-ap',
            type: 'aging-summary',
            title: 'Borç Yaşlandırması',
            description: 'Tedarikçi borçlarının yaşlandırma analizi',
            enabled: true,
            position: { row: 2, col: 4 },
            size: { width: 3, height: 1 },
            props: { reportType: 'ap' },
          },
          {
            id: 'aging-table-ar',
            type: 'aging-table',
            title: 'Alacak Detayları',
            description: 'Müşteri alacaklarının detaylı listesi',
            enabled: true,
            position: { row: 3, col: 1 },
            size: { width: 6, height: 2 },
            props: { reportType: 'ar' },
          },
          {
            id: 'aging-table-ap',
            type: 'aging-table',
            title: 'Borç Detayları',
            description: 'Tedarikçi borçlarının detaylı listesi',
            enabled: true,
            position: { row: 5, col: 1 },
            size: { width: 6, height: 2 },
            props: { reportType: 'ap' },
          },
        ],
        lastUpdated: new Date().toISOString(),
      };
    }

    res.json({
      success: true,
      data: dashboardLayout,
    });
  } catch (error) {
    logger.error('Dashboard layout get error:', error);
    res.status(500).json({
      error: 'Dashboard layout alınırken hata oluştu',
    });
  }
});

// POST /api/dashboard/layout - Save user's dashboard layout
router.post('/layout', requireAuth, requirePermission(Permission.MANAGE_DASHBOARD), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const layoutData = req.body;

    // Validate layout data
    const validatedLayout = validateDashboardLayout(layoutData);

    // Get current user data
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı',
      });
    }

    // Update user metadata with new dashboard layout
    const currentMetadata = (user[0].metadata as any) || {};
    const updatedMetadata = {
      ...currentMetadata,
      dashboardLayout: validatedLayout,
      lastDashboardUpdate: new Date().toISOString(),
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log the layout change
    logger.info(`Dashboard layout updated for user ${userId}:`, {
      widgetsCount: validatedLayout.widgets.length,
      enabledWidgets: validatedLayout.widgets.filter(w => w.enabled).length,
      timestamp: validatedLayout.lastUpdated,
    });

    res.json({
      success: true,
      data: validatedLayout,
      message: 'Dashboard layout başarıyla kaydedildi',
    });
  } catch (error) {
    logger.error('Dashboard layout save error:', error);
    
    if (error instanceof Error && error.message.includes('zorunludur')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: 'Dashboard layout kaydedilirken hata oluştu',
    });
  }
});

// PUT /api/dashboard/layout/widget/:id - Update specific widget
router.put('/layout/widget/:id', requireAuth, requirePermission(Permission.MANAGE_DASHBOARD), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const widgetId = req.params.id;
    const widgetUpdates = req.body;

    // Get current user data
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı',
      });
    }

    const currentMetadata = (user[0].metadata as any) || {};
    const currentLayout = currentMetadata.dashboardLayout;

    if (!currentLayout || !currentLayout.widgets) {
      return res.status(404).json({
        error: 'Dashboard layout bulunamadı',
      });
    }

    // Find and update the specific widget
    const updatedWidgets = currentLayout.widgets.map((widget: WidgetConfig) => {
      if (widget.id === widgetId) {
        return {
          ...widget,
          ...widgetUpdates,
          // Validate the updated widget
          ...validateWidgetConfig({ ...widget, ...widgetUpdates }),
        };
      }
      return widget;
    });

    const updatedLayout = {
      ...currentLayout,
      widgets: updatedWidgets,
      lastUpdated: new Date().toISOString(),
    };

    // Update user metadata
    const updatedMetadata = {
      ...currentMetadata,
      dashboardLayout: updatedLayout,
      lastDashboardUpdate: new Date().toISOString(),
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      data: updatedLayout,
      message: 'Widget başarıyla güncellendi',
    });
  } catch (error) {
    logger.error('Widget update error:', error);
    
    if (error instanceof Error && error.message.includes('zorunludur')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: 'Widget güncellenirken hata oluştu',
    });
  }
});

// POST /api/dashboard/layout/reset - Reset to default layout
router.post('/layout/reset', requireAuth, requirePermission(Permission.MANAGE_DASHBOARD), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get current user data
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı',
      });
    }

    // Reset to default layout
    const defaultLayout = {
      widgets: [
        {
          id: 'financial-health',
          type: 'financial-health',
          title: 'Finansal Sağlık',
          description: 'Genel finansal durum analizi',
          enabled: true,
          position: { row: 1, col: 1 },
          size: { width: 2, height: 2 },
        },
        {
          id: 'runway',
          type: 'runway',
          title: 'Runway Analizi',
          description: 'Nakit tükenme süresi analizi',
          enabled: true,
          position: { row: 1, col: 3 },
          size: { width: 2, height: 1 },
        },
        {
          id: 'cashgap',
          type: 'cashgap',
          title: 'Cash Gap Analizi',
          description: 'Alacak ve borç karşılaştırması',
          enabled: true,
          position: { row: 1, col: 5 },
          size: { width: 2, height: 1 },
        },
        {
          id: 'aging-summary-ar',
          type: 'aging-summary',
          title: 'Alacak Yaşlandırması',
          description: 'Müşteri alacaklarının yaşlandırma analizi',
          enabled: true,
          position: { row: 2, col: 1 },
          size: { width: 3, height: 1 },
          props: { reportType: 'ar' },
        },
        {
          id: 'aging-summary-ap',
          type: 'aging-summary',
          title: 'Borç Yaşlandırması',
          description: 'Tedarikçi borçlarının yaşlandırma analizi',
          enabled: true,
          position: { row: 2, col: 4 },
          size: { width: 3, height: 1 },
          props: { reportType: 'ap' },
        },
        {
          id: 'aging-table-ar',
          type: 'aging-table',
          title: 'Alacak Detayları',
          description: 'Müşteri alacaklarının detaylı listesi',
          enabled: true,
          position: { row: 3, col: 1 },
          size: { width: 6, height: 2 },
          props: { reportType: 'ar' },
        },
        {
          id: 'aging-table-ap',
          type: 'aging-table',
          title: 'Borç Detayları',
          description: 'Tedarikçi borçlarının detaylı listesi',
          enabled: true,
          position: { row: 5, col: 1 },
          size: { width: 6, height: 2 },
          props: { reportType: 'ap' },
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    // Update user metadata
    const currentMetadata = (user[0].metadata as any) || {};
    const updatedMetadata = {
      ...currentMetadata,
      dashboardLayout: defaultLayout,
      lastDashboardUpdate: new Date().toISOString(),
      layoutResetCount: (currentMetadata.layoutResetCount || 0) + 1,
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log the reset
    logger.info(`Dashboard layout reset for user ${userId}`, {
      resetCount: updatedMetadata.layoutResetCount,
      timestamp: defaultLayout.lastUpdated,
    });

    res.json({
      success: true,
      data: defaultLayout,
      message: 'Dashboard layout varsayılan ayarlara sıfırlandı',
    });
  } catch (error) {
    logger.error('Dashboard layout reset error:', error);
    res.status(500).json({
      error: 'Dashboard layout sıfırlanırken hata oluştu',
    });
  }
});

export default router;
