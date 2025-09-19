import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      console.log("🔐 Attempting login with:", data.email);
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data) => {
      console.log("✅ Login successful:", data);
      toast({
        title: "Giriş Başarılı",
        description: "Hoş geldiniz! Dashboard'a yönlendiriliyorsunuz...",
      });
      // Redirect to dashboard after successful login
      setTimeout(() => setLocation("/"), 1000);
    },
    onError: (error: any) => {
      console.error("❌ Login error:", error);
      toast({
        variant: "destructive",
        title: "Giriş Hatası",
        description: error.message || "Giriş sırasında bir hata oluştu",
      });
    },
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <LogIn className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">FinBot'a Giriş</CardTitle>
          <CardDescription>
            Finansal yönetim platformuna erişim için giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Adresi</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="ornek@email.com"
                        autoComplete="email"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Şifrenizi girin"
                          autoComplete="current-password"
                          data-testid="input-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loginMutation.error && (
                <Alert variant="destructive" data-testid="alert-login-error">
                  <AlertDescription>
                    {(loginMutation.error as any)?.message || "Giriş sırasında bir hata oluştu"}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Giriş yapılıyor...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Giriş Yap
                  </div>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center space-y-2">
            <Button
              variant="link"
              className="text-sm"
              onClick={() => setLocation("/forgot-password")}
              data-testid="link-forgot-password"
            >
              Şifremi unuttum
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Hesabınız yok mu?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => setLocation("/register")}
                data-testid="link-register"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Kayıt ol
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}