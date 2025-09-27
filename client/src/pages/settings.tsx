import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/hooks/useAuth';
import { Moon, Sun, Monitor, Users, Settings as SettingsIcon, Brain } from 'lucide-react';
import { UserManagement } from '@/components/user-management';
import { AISettings } from '@/components/ai-settings';

export default function Settings () {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  // Get tab from URL parameter - simplified for wouter
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('tab') === 'users' && user?.role === 'admin' ? 'users' : 'general';

  const themeOptions = [
    {
      value: 'light',
      label: 'Açık Tema',
      description: 'Daima açık renk teması kullan',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Koyu Tema',
      description: 'Daima koyu renk teması kullan',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'Sistem Teması',
      description: 'İşletim sistemi ayarını takip et',
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Ayarlar</h1>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className={`grid w-full ${user?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-1'} lg:w-auto`}>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Genel Ayarlar
          </TabsTrigger>
          {user?.role === 'admin' && (
            <>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Yapay Zekâ
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Kullanıcı Yönetimi
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Tema Ayarları
              </CardTitle>
              <CardDescription>
                Uygulamanın görünümünü kişiselleştirin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Renk Teması</Label>
                <RadioGroup
                  value={theme}
                  onValueChange={setTheme}
                  className="space-y-3"
                  data-testid="theme-radio-group"
                >
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div
                        key={option.value}
                        className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          data-testid={`radio-theme-${option.value}`}
                        />
                        <div className="flex items-center space-x-3 flex-1">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div className="space-y-1">
                            <Label
                              htmlFor={option.value}
                              className="font-medium cursor-pointer"
                            >
                              {option.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diğer Ayarlar</CardTitle>
              <CardDescription>
                Gelecekte eklenecek ayarlar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Profil ayarları, bildirim tercihleri ve daha fazlası yakında...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="ai" className="space-y-6">
            <AISettings />
          </TabsContent>
        )}

        {user?.role === 'admin' && (
          <TabsContent value="users" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Kullanıcı Yönetimi</h2>
              <p className="text-muted-foreground">
                Sistem kullanıcılarını yönetin, roller atayın ve hesap durumlarını kontrol edin
              </p>
            </div>
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
