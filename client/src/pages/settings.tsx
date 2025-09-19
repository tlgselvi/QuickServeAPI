import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/lib/theme-context";
import { Moon, Sun, Monitor } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    {
      value: "light",
      label: "Açık Tema",
      description: "Daima açık renk teması kullan",
      icon: Sun,
    },
    {
      value: "dark", 
      label: "Koyu Tema",
      description: "Daima koyu renk teması kullan",
      icon: Moon,
    },
    {
      value: "system",
      label: "Sistem Teması",
      description: "İşletim sistemi ayarını takip et",
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Ayarlar</h1>
      </div>
      
      <div className="grid gap-6">
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
      </div>
    </div>
  );
}