import { EventEmitter } from 'events';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

export interface RealtimeEvent {
  id: string;
  type: string;
  userId?: string;
  topic: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RealtimeSubscription {
  id: string;
  userId: string;
  topics: string[];
  socketId?: string;
  lastActivity: Date;
  isActive: boolean;
}

export class RealtimeEventBus extends EventEmitter {
  private static instance: RealtimeEventBus;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private eventHistory: Map<string, RealtimeEvent[]> = new Map();
  private maxHistorySize = 1000;

  private constructor() {
    super();
    this.setMaxListeners(1000);
    
    // Cleanup inactive subscriptions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSubscriptions();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): RealtimeEventBus {
    if (!RealtimeEventBus.instance) {
      RealtimeEventBus.instance = new RealtimeEventBus();
    }
    return RealtimeEventBus.instance;
  }

  /**
   * Publish an event to subscribers
   */
  public publish(event: Omit<RealtimeEvent, 'id' | 'timestamp'>): void {
    const realtimeEvent: RealtimeEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Store in history
    this.storeEventInHistory(realtimeEvent);

    // Emit to all listeners
    this.emit('event', realtimeEvent);

    // Emit to specific topic listeners
    this.emit(`topic:${realtimeEvent.topic}`, realtimeEvent);

    // Emit to user-specific listeners if userId is provided
    if (realtimeEvent.userId) {
      this.emit(`user:${realtimeEvent.userId}`, realtimeEvent);
    }

    // Log the event
    logger.info(`[REALTIME] Event published:`, {
      id: realtimeEvent.id,
      type: realtimeEvent.type,
      topic: realtimeEvent.topic,
      userId: realtimeEvent.userId,
      timestamp: realtimeEvent.timestamp,
    });
  }

  /**
   * Subscribe to events for a user
   */
  public subscribe(
    userId: string,
    topics: string[],
    socketId?: string
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      userId,
      topics,
      socketId,
      lastActivity: new Date(),
      isActive: true,
    };

    this.subscriptions.set(subscriptionId, subscription);

    logger.info(`[REALTIME] User ${userId} subscribed to topics:`, topics);

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
      
      logger.info(`[REALTIME] Unsubscribed:`, subscriptionId);
      return true;
    }
    return false;
  }

  /**
   * Update subscription activity
   */
  public updateActivity(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.lastActivity = new Date();
    }
  }

  /**
   * Get active subscriptions for a user
   */
  public getUserSubscriptions(userId: string): RealtimeSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.userId === userId && sub.isActive
    );
  }

  /**
   * Get event history for a topic
   */
  public getEventHistory(topic: string, limit: number = 50): RealtimeEvent[] {
    const history = this.eventHistory.get(topic) || [];
    return history.slice(-limit);
  }

  /**
   * Get events for a user since a specific timestamp
   */
  public getEventsForUser(
    userId: string,
    since?: Date,
    topics?: string[]
  ): RealtimeEvent[] {
    const userEvents: RealtimeEvent[] = [];

    for (const [topic, events] of this.eventHistory.entries()) {
      if (topics && !topics.includes(topic)) continue;

      const filteredEvents = events.filter(event => {
        if (event.userId !== userId) return false;
        if (since && event.timestamp < since) return false;
        return true;
      });

      userEvents.push(...filteredEvents);
    }

    // Sort by timestamp
    return userEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Cleanup inactive subscriptions
   */
  private cleanupInactiveSubscriptions(): void {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      if (
        subscription.isActive &&
        (now.getTime() - subscription.lastActivity.getTime()) > inactiveThreshold
      ) {
        subscription.isActive = false;
        this.subscriptions.delete(subscriptionId);
        
        logger.info(`[REALTIME] Cleaned up inactive subscription:`, subscriptionId);
      }
    }
  }

  /**
   * Store event in history
   */
  private storeEventInHistory(event: RealtimeEvent): void {
    const history = this.eventHistory.get(event.topic) || [];
    history.push(event);

    // Keep only the last maxHistorySize events
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }

    this.eventHistory.set(event.topic, history);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get subscription statistics
   */
  public getStats(): {
    activeSubscriptions: number;
    totalTopics: number;
    totalEvents: number;
    averageEventsPerTopic: number;
  } {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(
      sub => sub.isActive
    ).length;

    const totalTopics = this.eventHistory.size;
    
    let totalEvents = 0;
    for (const events of this.eventHistory.values()) {
      totalEvents += events.length;
    }

    const averageEventsPerTopic = totalTopics > 0 ? totalEvents / totalTopics : 0;

    return {
      activeSubscriptions,
      totalTopics,
      totalEvents,
      averageEventsPerTopic,
    };
  }
}

// Export singleton instance
export const eventBus = RealtimeEventBus.getInstance();

// Event types
export const REALTIME_EVENTS = {
  // Dashboard events
  DASHBOARD_WIDGET_UPDATED: 'dashboard.widget.updated',
  DASHBOARD_LAYOUT_CHANGED: 'dashboard.layout.changed',
  
  // Financial events
  AGING_DATA_UPDATED: 'finance.aging.updated',
  RUNWAY_DATA_UPDATED: 'finance.runway.updated',
  CASHGAP_DATA_UPDATED: 'finance.cashgap.updated',
  FINANCIAL_HEALTH_UPDATED: 'finance.health.updated',
  
  // Account events
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_UPDATED: 'account.updated',
  ACCOUNT_DELETED: 'account.deleted',
  
  // Transaction events
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_UPDATED: 'transaction.updated',
  TRANSACTION_DELETED: 'transaction.deleted',
  
  // System events
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_ERROR: 'system.error',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
} as const;

// Topic patterns
export const REALTIME_TOPICS = {
  USER_DASHBOARD: (userId: string) => `user.${userId}.dashboard`,
  USER_FINANCE: (userId: string) => `user.${userId}.finance`,
  USER_ACCOUNTS: (userId: string) => `user.${userId}.accounts`,
  USER_TRANSACTIONS: (userId: string) => `user.${userId}.transactions`,
  SYSTEM_GLOBAL: 'system.global',
  SYSTEM_ADMIN: 'system.admin',
} as const;

// Helper function to publish dashboard events
export function publishDashboardEvent(
  userId: string,
  eventType: string,
  data: any,
  metadata?: Record<string, any>
): void {
  eventBus.publish({
    type: eventType,
    userId,
    topic: REALTIME_TOPICS.USER_DASHBOARD(userId),
    data,
    metadata,
  });
}

// Helper function to publish financial events
export function publishFinancialEvent(
  userId: string,
  eventType: string,
  data: any,
  metadata?: Record<string, any>
): void {
  eventBus.publish({
    type: eventType,
    userId,
    topic: REALTIME_TOPICS.USER_FINANCE(userId),
    data,
    metadata,
  });
}
