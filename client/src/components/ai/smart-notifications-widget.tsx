import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, TrendingUp, Target, Eye, EyeOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorDisplay } from '@/components/ui/error-display';
import { logger } from '@/lib/logger';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'financial' | 'security' | 'system' | 'recommendation';
  data?: any;
  createdAt: string;
  read: boolean;
  channels: string[];
  actionUrl?: string;
  actionText?: string;
}

interface Anomaly {
  type: 'expense_spike' | 'income_drop' | 'unusual_transaction' | 'balance_alert';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  confidence: number;
  data: any;
}

interface Trend {
  type: 'positive' | 'negative' | 'neutral';
  metric: string;
  change: number;
  period: string;
  description: string;
  significance: 'low' | 'medium' | 'high';
}

interface SmartNotificationsWidgetProps {
  userId: string;
  className?: string;
}

export function SmartNotificationsWidget({ userId, className }: SmartNotificationsWidgetProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notifications' | 'anomalies' | 'trends'>('notifications');

  useEffect(() => {
    checkNotifications();
  }, []);

  const checkNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check for new notifications
      const notificationsResponse = await fetch('/api/ai/notifications/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.data.notifications || []);
      }

      // Check for anomalies
      const anomaliesResponse = await fetch('/api/ai/anomalies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (anomaliesResponse.ok) {
        const anomaliesData = await anomaliesResponse.json();
        setAnomalies(anomaliesData.data.anomalies || []);
      }

      // Check for trends
      const trendsResponse = await fetch('/api/ai/trends', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json();
        setTrends(trendsData.data.trends || []);
      }

      logger.info('Smart notifications checked', { 
        notificationsCount: notifications.length,
        anomaliesCount: anomalies.length,
        trendsCount: trends.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bildirimler kontrol edilirken hata oluştu';
      setError(errorMessage);
      logger.error('Smart notifications check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '💡';
      default: return '📢';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTrendIcon = (type: string) => {
    switch (type) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      case 'neutral': return '➡️';
      default: return '📊';
    }
  };

  const renderNotifications = () => {
    if (notifications.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Henüz bildirim yok</p>
          <p className="text-sm">AI sistemimiz finansal aktivitelerinizi izliyor</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg ${notification.read ? 'bg-muted/50' : 'bg-background'} ${
              notification.priority === 'critical' ? 'border-red-200 bg-red-50/50' : 
              notification.priority === 'high' ? 'border-orange-200 bg-orange-50/50' : 
              'border-border'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-lg">
                  {getPriorityIcon(notification.priority)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(notification.createdAt).toLocaleString('tr-TR')}</span>
                    {notification.actionUrl && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        {notification.actionText || 'Detay'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markNotificationAsRead(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnomalies = () => {
    if (anomalies.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Anomali tespit edilmedi</p>
          <p className="text-sm">Finansal aktiviteleriniz normal görünüyor</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {anomalies.map((anomaly, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg ${
              anomaly.severity === 'high' ? 'border-red-200 bg-red-50/50' : 
              anomaly.severity === 'medium' ? 'border-orange-200 bg-orange-50/50' : 
              'border-yellow-200 bg-yellow-50/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                anomaly.severity === 'high' ? 'text-red-600' : 
                anomaly.severity === 'medium' ? 'text-orange-600' : 
                'text-yellow-600'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm capitalize">
                    {anomaly.type.replace('_', ' ')}
                  </h4>
                  <Badge variant={getSeverityColor(anomaly.severity)} className="text-xs">
                    {anomaly.severity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {anomaly.confidence}% güven
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {anomaly.description}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Etki:</strong> {anomaly.impact}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTrends = () => {
    if (trends.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Önemli trend değişikliği yok</p>
          <p className="text-sm">Finansal metrikleriniz stabil görünüyor</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {trends.map((trend, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg ${
              trend.type === 'positive' ? 'border-green-200 bg-green-50/50' : 
              trend.type === 'negative' ? 'border-red-200 bg-red-50/50' : 
              'border-blue-200 bg-blue-50/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-lg">
                {getTrendIcon(trend.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm capitalize">
                    {trend.metric} Trendi
                  </h4>
                  <Badge variant={trend.significance === 'high' ? 'default' : 'secondary'} className="text-xs">
                    {trend.significance} önem
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {trend.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  <span>Dönem: {trend.period} | Değişim: {trend.change.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getTabCount = () => {
    switch (activeTab) {
      case 'notifications': return notifications.length;
      case 'anomalies': return anomalies.length;
      case 'trends': return trends.length;
      default: return 0;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Akıllı Bildirimler
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkNotifications}
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="sm" className="h-4 w-4" />
            ) : (
              'Yenile'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            Bildirimler ({notifications.length})
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'anomalies'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('anomalies')}
          >
            Anomaliler ({anomalies.length})
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'trends'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('trends')}
          >
            Trendler ({trends.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4">
              <ErrorDisplay
                error={error}
                onRetry={checkNotifications}
                variant="minimal"
                size="sm"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" text="Bildirimler kontrol ediliyor..." />
            </div>
          ) : (
            <>
              {activeTab === 'notifications' && renderNotifications()}
              {activeTab === 'anomalies' && renderAnomalies()}
              {activeTab === 'trends' && renderTrends()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Toplam: {getTabCount()} öğe</span>
            <span>Son kontrol: {new Date().toLocaleTimeString('tr-TR')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
