import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { eventBus, REALTIME_EVENTS, REALTIME_TOPICS } from '../services/realtime/eventBus';

const router = Router();

// GET /api/realtime/events - Get recent events for user
router.get('/events', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { since, topics, limit = 50 } = req.query;

    const sinceDate = since ? new Date(since as string) : undefined;
    const topicsArray = topics ? (topics as string).split(',') : undefined;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);

    const events = eventBus.getEventsForUser(userId, sinceDate, topicsArray);
    const limitedEvents = events.slice(-limitNum);

    res.json({
      success: true,
      data: {
        events: limitedEvents,
        total: events.length,
        hasMore: events.length > limitNum,
      },
    });
  } catch (error) {
    console.error('Realtime events fetch error:', error);
    res.status(500).json({
      error: 'Gerçek zamanlı olaylar alınırken hata oluştu',
    });
  }
});

// GET /api/realtime/subscribe - Subscribe to realtime events (SSE)
router.get('/subscribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topics } = req.query;

    if (!topics) {
      return res.status(400).json({
        error: 'Topics parametresi gereklidir',
      });
    }

    const topicsArray = (topics as string).split(',');
    
    // Validate topics
    const validTopics = topicsArray.filter(topic => {
      return topic.startsWith(`user.${userId}.`) || 
             topic === 'system.global' ||
             (req.user?.role === 'admin' && topic === 'system.admin');
    });

    if (validTopics.length === 0) {
      return res.status(403).json({
        error: 'Yetkisiz topic erişimi',
      });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Subscribe to event bus
    const subscriptionId = eventBus.subscribe(userId, validTopics);

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connection',
      data: {
        subscriptionId,
        userId,
        topics: validTopics,
        timestamp: new Date().toISOString(),
      },
    })}\n\n`);

    // Set up event listeners
    const eventHandler = (event: any) => {
      // Check if user should receive this event
      if (event.userId && event.userId !== userId) return;
      
      // Check if topic is in user's subscription
      if (!validTopics.some(topic => event.topic.startsWith(topic))) return;

      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    eventBus.on('event', eventHandler);

    // Handle client disconnect
    req.on('close', () => {
      eventBus.removeListener('event', eventHandler);
      eventBus.unsubscribe(subscriptionId);
      console.log(`[REALTIME] Client disconnected: ${userId}`);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      if (res.destroyed) {
        clearInterval(heartbeat);
        return;
      }
      
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        data: {
          timestamp: new Date().toISOString(),
        },
      })}\n\n`);
      
      eventBus.updateActivity(subscriptionId);
    }, 30000); // 30 seconds

    // Clean up heartbeat on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
    });

    console.log(`[REALTIME] User ${userId} subscribed to topics:`, validTopics);

  } catch (error) {
    console.error('Realtime subscription error:', error);
    res.status(500).json({
      error: 'Gerçek zamanlı abonelik hatası',
    });
  }
});

// POST /api/realtime/publish - Publish an event (admin only)
router.post('/publish', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Bu işlem için admin yetkisi gereklidir',
      });
    }

    const { type, userId, topic, data, metadata } = req.body;

    if (!type || !topic || !data) {
      return res.status(400).json({
        error: 'Type, topic ve data parametreleri gereklidir',
      });
    }

    eventBus.publish({
      type,
      userId,
      topic,
      data,
      metadata,
    });

    res.json({
      success: true,
      message: 'Olay başarıyla yayınlandı',
    });
  } catch (error) {
    console.error('Realtime publish error:', error);
    res.status(500).json({
      error: 'Olay yayınlanırken hata oluştu',
    });
  }
});

// GET /api/realtime/stats - Get realtime statistics (admin only)
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Bu işlem için admin yetkisi gereklidir',
      });
    }

    const stats = eventBus.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Realtime stats error:', error);
    res.status(500).json({
      error: 'İstatistikler alınırken hata oluştu',
    });
  }
});

// GET /api/realtime/history/:topic - Get event history for a topic
router.get('/history/:topic', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { topic } = req.params;
    const { limit = 50 } = req.query;

    // Check if user has access to this topic
    if (!topic.startsWith(`user.${userId}.`) && 
        topic !== 'system.global' && 
        !(req.user?.role === 'admin' && topic === 'system.admin')) {
      return res.status(403).json({
        error: 'Bu topic\'e erişim yetkiniz yok',
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const history = eventBus.getEventHistory(topic, limitNum);

    res.json({
      success: true,
      data: {
        topic,
        events: history,
        total: history.length,
      },
    });
  } catch (error) {
    console.error('Realtime history error:', error);
    res.status(500).json({
      error: 'Olay geçmişi alınırken hata oluştu',
    });
  }
});

// POST /api/realtime/test - Test realtime functionality
router.post('/test', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { message = 'Test mesajı' } = req.body;

    // Publish a test event
    eventBus.publish({
      type: 'test',
      userId,
      topic: REALTIME_TOPICS.USER_DASHBOARD(userId),
      data: {
        message,
        timestamp: new Date().toISOString(),
        testId: Math.random().toString(36).substr(2, 9),
      },
    });

    res.json({
      success: true,
      message: 'Test olayı yayınlandı',
    });
  } catch (error) {
    console.error('Realtime test error:', error);
    res.status(500).json({
      error: 'Test olayı yayınlanırken hata oluştu',
    });
  }
});

export default router;
