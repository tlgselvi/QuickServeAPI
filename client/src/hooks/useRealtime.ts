import { useEffect, useRef, useState, useCallback } from 'react';

export interface RealtimeEvent {
  id: string;
  type: string;
  userId?: string;
  topic: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RealtimeConfig {
  topics: string[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface RealtimeConnection {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: RealtimeEvent | null;
  eventCount: number;
  reconnectAttempts: number;
}

export function useRealtime(config: RealtimeConfig) {
  const {
    topics,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
  } = config;

  const [connection, setConnection] = useState<RealtimeConnection>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEvent: null,
    eventCount: 0,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, (event: RealtimeEvent) => void>>(new Map());

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    setConnection(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const topicsParam = topics.join(',');
      const url = `/api/realtime/subscribe?topics=${encodeURIComponent(topicsParam)}`;
      
      eventSourceRef.current = new EventSource(url);

      eventSourceRef.current.onopen = () => {
        console.log('[REALTIME] Connected to event stream');
        setConnection(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        }));

        // Start heartbeat monitoring
        startHeartbeatMonitoring();
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'heartbeat') {
            // Handle heartbeat
            resetHeartbeatMonitoring();
            return;
          }

          if (data.type === 'connection') {
            console.log('[REALTIME] Connection established:', data.data);
            return;
          }

          // Handle real event
          const realtimeEvent: RealtimeEvent = {
            id: data.id,
            type: data.type,
            userId: data.userId,
            topic: data.topic,
            data: data.data,
            timestamp: new Date(data.timestamp),
            metadata: data.metadata,
          };

          setConnection(prev => ({
            ...prev,
            lastEvent: realtimeEvent,
            eventCount: prev.eventCount + 1,
          }));

          // Call registered event handlers
          eventHandlersRef.current.forEach((handler) => {
            try {
              handler(realtimeEvent);
            } catch (error) {
              console.error('[REALTIME] Error in event handler:', error);
            }
          });

        } catch (error) {
          console.error('[REALTIME] Error parsing event data:', error);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('[REALTIME] EventSource error:', error);
        setConnection(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: 'Bağlantı hatası',
        }));

        // Attempt reconnection if enabled
        if (autoReconnect && connection.reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('[REALTIME] Connection error:', error);
      setConnection(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Bağlantı kurulamadı',
      }));

      if (autoReconnect && connection.reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }
  }, [topics, autoReconnect, maxReconnectAttempts, connection.reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    setConnection(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));

    console.log('[REALTIME] Disconnected from event stream');
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const attempt = connection.reconnectAttempts + 1;
    const delay = reconnectInterval * Math.pow(2, attempt - 1); // Exponential backoff

    console.log(`[REALTIME] Scheduling reconnect attempt ${attempt} in ${delay}ms`);

    setConnection(prev => ({
      ...prev,
      reconnectAttempts: attempt,
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, connection.reconnectAttempts, reconnectInterval]);

  const startHeartbeatMonitoring = useCallback(() => {
    resetHeartbeatMonitoring();
  }, []);

  const resetHeartbeatMonitoring = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn('[REALTIME] Heartbeat timeout, reconnecting...');
      disconnect();
      connect();
    }, heartbeatInterval + 5000); // 5 seconds grace period
  }, [disconnect, connect, heartbeatInterval]);

  const subscribe = useCallback((eventType: string, handler: (event: RealtimeEvent) => void) => {
    eventHandlersRef.current.set(eventType, handler);
    
    return () => {
      eventHandlersRef.current.delete(eventType);
    };
  }, []);

  const publishTestEvent = useCallback(async (message?: string) => {
    try {
      const response = await fetch('/api/realtime/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[REALTIME] Test event publish error:', error);
      throw error;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...connection,
    connect,
    disconnect,
    subscribe,
    publishTestEvent,
  };
}

// Hook for specific event types
export function useRealtimeEvent(
  eventType: string,
  handler: (event: RealtimeEvent) => void,
  config: RealtimeConfig
) {
  const { subscribe, ...connection } = useRealtime(config);

  useEffect(() => {
    const unsubscribe = subscribe(eventType, handler);
    return unsubscribe;
  }, [subscribe, eventType, handler]);

  return connection;
}

// Hook for dashboard events
export function useDashboardRealtime(handler: (event: RealtimeEvent) => void) {
  return useRealtimeEvent(
    'dashboard',
    handler,
    {
      topics: ['user.dashboard', 'user.finance'],
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
    }
  );
}

// Hook for financial events
export function useFinancialRealtime(handler: (event: RealtimeEvent) => void) {
  return useRealtimeEvent(
    'finance',
    handler,
    {
      topics: ['user.finance'],
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
    }
  );
}
