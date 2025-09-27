import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Bot, User, Loader2, AlertCircle, Sparkles } from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  model?: string;
  cached?: boolean;
}

interface AIChatProps {
  persona?: string;
  title?: string;
  description?: string;
  placeholder?: string;
}

export function AIChat({ 
  persona = 'default', 
  title = "AI Asistan", 
  description = "Finansal konularda size yardımcı olabilirim",
  placeholder = "Sorunuzu yazın..."
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Generate AI response mutation
  const generateResponseMutation = useMutation({
    mutationFn: async (query: string) => {
      // Get dashboard data for context
      let dashboardContext = "";
      let accountsContext = "";
      
      try {
        const dashboardResponse = await apiRequest("GET", "/api/dashboard");
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          dashboardContext = `Kullanıcının finansal durumu: Toplam bakiye ${dashboardData.totalBalance} TL, Şirket bakiyesi ${dashboardData.companyBalance} TL, Kişisel bakiye ${dashboardData.personalBalance} TL.`;
        }
      } catch (e) {
        // Ignore dashboard errors
      }

      // Get accounts data for payment dates context
      try {
        const accountsResponse = await apiRequest("GET", "/api/accounts");
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          let paymentInfo = '';
          
          accountsData.forEach((account: any) => {
            let accountInfo = `${account.bankName} ${account.accountName}:`;
            
            // Parse sub-accounts
            if (account.subAccounts) {
              try {
                const subAccounts = JSON.parse(account.subAccounts);
                subAccounts.forEach((subAccount: any) => {
                  switch (subAccount.type) {
                    case 'creditCard':
                      accountInfo += ` Kredi Kartı - Limit: ${subAccount.limit} TL, Kullanılan: ${subAccount.used} TL, Kesim: ayın ${subAccount.cutOffDate}'i, Son ödeme: ayın ${subAccount.paymentDueDate}'i, Asgari: ${subAccount.minimumPayment} TL, Faiz: %${subAccount.interestRate};`;
                      break;
                    case 'loan':
                      accountInfo += ` Kredi - Kalan: ${subAccount.principalRemaining} TL, Taksit: ${subAccount.monthlyPayment} TL, Ödeme tarihi: ayın ${subAccount.dueDate}'i, Faiz: %${subAccount.interestRate};`;
                      break;
                    case 'kmh':
                      accountInfo += ` KMH - Limit: ${subAccount.limit} TL, Kullanılan: ${subAccount.used} TL, Faiz: %${subAccount.interestRate};`;
                      break;
                    case 'deposit':
                      accountInfo += ` Vadeli - Bakiye: ${subAccount.balance} TL, Faiz: %${subAccount.interestRate};`;
                      break;
                  }
                });
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
            
            // Legacy fields for backward compatibility
            if (account.cutOffDate) accountInfo += ` Kesim tarihi ayın ${account.cutOffDate}'i,`;
            if (account.paymentDueDate) accountInfo += ` Son ödeme ayın ${account.paymentDueDate}'i,`;
            if (account.minimumPayment) accountInfo += ` Asgari ödeme ${account.minimumPayment} TL,`;
            if (account.interestRate) accountInfo += ` Faiz oranı %${account.interestRate}`;
            
            if (accountInfo !== `${account.bankName} ${account.accountName}:`) {
              paymentInfo += accountInfo + ' ';
            }
          });
          
          if (paymentInfo) {
            accountsContext = ` Hesap ve ürün bilgileri: ${paymentInfo}.`;
          }
        }
      } catch (e) {
        // Ignore accounts errors
      }

      const response = await apiRequest("POST", "/api/ai/generate", {
        query: `${query} ${dashboardContext}${accountsContext}`,
        persona
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "AI yanıtı alınamadı");
      }
      return response.json();
    },
    onSuccess: (data, query) => {
      const aiMessage: Message = {
        id: Date.now().toString() + '_ai',
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        model: data.model,
        cached: data.cached
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        type: 'ai',
        content: `Üzgünüm, bir hata oluştu: ${error.message}`,
        timestamp: new Date(),
        model: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      
      toast({
        title: "AI Hatası",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString() + '_user',
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Generate AI response
    generateResponseMutation.mutate(userMessage.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPersonaBadge = () => {
    const personas = {
      'personal': { label: 'Kişisel Finans', color: 'bg-blue-100 text-blue-800' },
      'business': { label: 'İş Finansı', color: 'bg-green-100 text-green-800' },
      'admin': { label: 'Sistem Yöneticisi', color: 'bg-purple-100 text-purple-800' },
      'accountant': { label: 'Muhasebe Uzmanı', color: 'bg-orange-100 text-orange-800' },
      'ceo': { label: 'CEO Danışmanı', color: 'bg-red-100 text-red-800' },
      'investor': { label: 'Yatırım Uzmanı', color: 'bg-yellow-100 text-yellow-800' },
      'default': { label: 'Finansal Asistan', color: 'bg-gray-100 text-gray-800' },
    };

    const personaInfo = personas[persona as keyof typeof personas] || personas['default'];
    
    return (
      <Badge className={personaInfo.color}>
        {personaInfo.label}
      </Badge>
    );
  };

  return (
    <Card className="h-[500px] flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {getPersonaBadge()}
              {description}
            </CardDescription>
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessages([])}
            >
              Temizle
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 min-h-0" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI Asistanınız Hazır</h3>
                <p className="text-muted-foreground mb-4">
                  Finansal konularda sorularınızı sorabilirsiniz. Örneğin:
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• "Bütçe planlaması nasıl yapılır?"</p>
                  <p>• "Yatırım stratejim nasıl olmalı?"</p>
                  <p>• "Vergi planlaması hakkında bilgi ver"</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{message.timestamp.toLocaleTimeString('tr-TR')}</span>
                      {message.type === 'ai' && message.model && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {message.model}
                          </Badge>
                          {message.cached && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs">
                                Cache
                              </Badge>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Düşünüyor...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="min-h-[40px] max-h-[80px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-3 self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter ile gönder, Shift+Enter ile yeni satır
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
