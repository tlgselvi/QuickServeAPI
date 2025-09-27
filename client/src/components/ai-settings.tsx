import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Settings, TestTube, Trash2, RotateCcw, Key, Zap, Clock, Brain } from 'lucide-react';

interface AISettings {
  provider: 'openai' | 'mock';
  apiKey: string | null;
  isActive: boolean;
  defaultModel: 'gpt-3.5-turbo' | 'gpt-4' | 'mock';
  cacheDuration: number;
  maxTokens: number;
  temperature: number;
}

export function AISettings () {
  const [settings, setSettings] = useState<AISettings>({
    provider: 'mock',
    apiKey: null,
    isActive: false,
    defaultModel: 'gpt-3.5-turbo',
    cacheDuration: 60,
    maxTokens: 500,
    temperature: 0.7,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/ai/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/ai/settings');
      return response.json();
    },
    staleTime: 30000,
  });

  // Update settings when loaded
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Update AI settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: AISettings) => {
      const response = await apiRequest('PUT', '/api/admin/ai/settings', newSettings);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ayarlar güncellenemedi');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Ayarlar Güncellendi',
        description: 'AI ayarları başarıyla güncellendi.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/ai/test');
      return response.json();
    },
    onSuccess: (result) => {
      setTestResult(result);
      toast({
        title: result.success ? 'Bağlantı Başarılı' : 'Bağlantı Hatası',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      setTestResult({
        success: false,
        message: error.message,
      });
      toast({
        title: 'Test Hatası',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/ai/cache/clear');
      if (!response.ok) {
        throw new Error('Cache temizlenemedi');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Cache Temizlendi',
        description: 'AI cache başarıyla temizlendi.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    await updateSettingsMutation.mutateAsync(settings);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await testConnectionMutation.mutateAsync();
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearCache = async () => {
    await clearCacheMutation.mutateAsync();
  };

  const handleClearApiKey = () => {
    setSettings({ ...settings, apiKey: null });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">AI ayarları yükleniyor...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Yapay Zekâ API Yönetimi</h2>
          <p className="text-muted-foreground">
            OpenAI GPT entegrasyonu ve AI ayarlarını yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            <TestTube className="w-4 h-4 mr-2" />
            {isTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
          </Button>
          <Button variant="outline" onClick={handleClearCache} disabled={clearCacheMutation.isPending}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Cache Temizle
          </Button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          <AlertDescription>
            <strong>Test Sonucu:</strong> {testResult.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              API Yapılandırması
            </CardTitle>
            <CardDescription>
              OpenAI API anahtarı ve temel ayarlar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="provider">Sağlayıcı</Label>
              <Select
                value={settings.provider}
                onValueChange={(value: 'openai' | 'mock') =>
                  setSettings({ ...settings, provider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT</SelectItem>
                  <SelectItem value="mock">Mock (Test)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="apiKey">API Anahtarı</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={settings.apiKey || ''}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  disabled={settings.provider === 'mock'}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearApiKey}
                  disabled={settings.provider === 'mock'}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                API anahtarınız güvenli şekilde şifrelenerek saklanır
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={settings.isActive}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, isActive: checked })
                }
              />
              <Label htmlFor="isActive">AI Servisi Aktif</Label>
            </div>
          </CardContent>
        </Card>

        {/* Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Model Ayarları
            </CardTitle>
            <CardDescription>
              AI model seçimi ve performans ayarları
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="defaultModel">Varsayılan Model</Label>
              <Select
                value={settings.defaultModel}
                onValueChange={(value: 'gpt-3.5-turbo' | 'gpt-4' | 'mock') =>
                  setSettings({ ...settings, defaultModel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4 (Premium)</SelectItem>
                  <SelectItem value="mock">Mock (Test)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxTokens">Maksimum Token</Label>
              <Input
                id="maxTokens"
                type="number"
                value={settings.maxTokens}
                onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                min="100"
                max="4000"
              />
            </div>

            <div>
              <Label htmlFor="temperature">Sıcaklık (Creativity)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                0.0 (kesin) - 2.0 (yaratıcı)
              </p>
            </div>

            <div>
              <Label htmlFor="cacheDuration">Cache Süresi (dakika)</Label>
              <Input
                id="cacheDuration"
                type="number"
                value={settings.cacheDuration}
                onChange={(e) => setSettings({ ...settings, cacheDuration: parseInt(e.target.value) })}
                min="5"
                max="1440"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="min-w-[120px]"
        >
          {updateSettingsMutation.isPending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </Button>
      </div>

      {/* API Key Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            OpenAI API Anahtarı Nasıl Alınır?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a> üzerinde hesap oluşturun</p>
            <p>2. API Keys bölümünden yeni bir anahtar oluşturun</p>
            <p>3. Anahtarı kopyalayıp yukarıdaki alana yapıştırın</p>
            <p>4. "Bağlantıyı Test Et" butonu ile bağlantıyı doğrulayın</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
