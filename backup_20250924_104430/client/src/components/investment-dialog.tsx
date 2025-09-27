import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Edit, DollarSign, TrendingUp, Target } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

const investmentSchema = z.object({
  title: z.string().min(1, "Başlık gereklidir"),
  type: z.enum(['stock', 'crypto', 'bond', 'fund', 'real_estate'], {
    required_error: "Yatırım türü seçmelisiniz"
  }),
  symbol: z.string().optional(),
  quantity: z.string().min(1, "Miktar gereklidir").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Geçerli bir miktar girin"
  }),
  purchasePrice: z.string().min(1, "Alış fiyatı gereklidir").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Geçerli bir fiyat girin"
  }),
  currentPrice: z.string().optional(),
  currency: z.string().default("TRY"),
  category: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  purchaseDate: z.date().optional(),
  accountId: z.string().min(1, "Hesap seçmelisiniz")
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

interface Investment {
  id?: string;
  title: string;
  type: 'stock' | 'crypto' | 'bond' | 'fund' | 'real_estate';
  symbol?: string;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number;
  currency: string;
  category?: string;
  riskLevel: 'low' | 'medium' | 'high';
  purchaseDate?: string;
  accountId: string;
}

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  mode: 'create' | 'edit';
}

export function InvestmentDialog({ open, onOpenChange, investment, mode }: InvestmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      title: "",
      type: undefined,
      symbol: "",
      quantity: "",
      purchasePrice: "",
      currentPrice: "",
      currency: "TRY",
      category: "",
      riskLevel: "medium",
      purchaseDate: undefined,
      accountId: ""
    }
  });

  // Fetch user accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounts");
      return response.json();
    },
    enabled: open
  });

  // Reset form when investment changes
  useEffect(() => {
    if (investment && mode === 'edit') {
      form.reset({
        title: investment.title,
        type: investment.type,
        symbol: investment.symbol || "",
        quantity: investment.quantity.toString(),
        purchasePrice: investment.purchasePrice.toString(),
        currentPrice: investment.currentPrice?.toString() || "",
        currency: investment.currency,
        category: investment.category || "",
        riskLevel: investment.riskLevel,
        purchaseDate: investment.purchaseDate ? new Date(investment.purchaseDate) : undefined,
        accountId: investment.accountId
      });
    } else {
      form.reset();
    }
  }, [investment, mode, form]);

  const onSubmit = async (data: InvestmentFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        quantity: parseFloat(data.quantity),
        purchasePrice: parseFloat(data.purchasePrice),
        currentPrice: data.currentPrice ? parseFloat(data.currentPrice) : undefined,
        purchaseDate: data.purchaseDate?.toISOString()
      };

      if (mode === 'create') {
        await apiRequest("POST", "/api/investments", payload);
        toast({
          title: "Başarılı",
          description: "Yatırım başarıyla eklendi",
        });
      } else if (investment?.id) {
        await apiRequest("PUT", `/api/investments/${investment.id}`, payload);
        toast({
          title: "Başarılı",
          description: "Yatırım başarıyla güncellendi",
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Hata",
        description: "İşlem sırasında bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stock': return <TrendingUp className="w-4 h-4" />;
      case 'crypto': return <DollarSign className="w-4 h-4" />;
      case 'bond': return <Target className="w-4 h-4" />;
      case 'fund': return <DollarSign className="w-4 h-4" />;
      case 'real_estate': return <Target className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stock': return 'Hisse Senedi';
      case 'crypto': return 'Kripto Para';
      case 'bond': return 'Tahvil';
      case 'fund': return 'Fon';
      case 'real_estate': return 'Gayrimenkul';
      default: return type;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return 'Düşük Risk';
      case 'medium': return 'Orta Risk';
      case 'high': return 'Yüksek Risk';
      default: return risk;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <Plus className="w-5 h-5" />
                Yeni Yatırım Ekle
              </>
            ) : (
              <>
                <Edit className="w-5 h-5" />
                Yatırım Düzenle
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? "Portföyünüze yeni bir yatırım ekleyin"
              : "Yatırım bilgilerini güncelleyin"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlık *</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Apple Hisse Senedi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yatırım Türü *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tür seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stock">
                          <div className="flex items-center gap-2">
                            {getTypeIcon('stock')}
                            Hisse Senedi
                          </div>
                        </SelectItem>
                        <SelectItem value="crypto">
                          <div className="flex items-center gap-2">
                            {getTypeIcon('crypto')}
                            Kripto Para
                          </div>
                        </SelectItem>
                        <SelectItem value="bond">
                          <div className="flex items-center gap-2">
                            {getTypeIcon('bond')}
                            Tahvil
                          </div>
                        </SelectItem>
                        <SelectItem value="fund">
                          <div className="flex items-center gap-2">
                            {getTypeIcon('fund')}
                            Fon
                          </div>
                        </SelectItem>
                        <SelectItem value="real_estate">
                          <div className="flex items-center gap-2">
                            {getTypeIcon('real_estate')}
                            Gayrimenkul
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Symbol */}
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sembol</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: AAPL, BTC" {...field} />
                    </FormControl>
                    <FormDescription>
                      Borsa sembolü veya kripto para kodu
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miktar *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.00000001" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Purchase Price */}
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Fiyatı *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current Price */}
              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Güncel Fiyat</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Boş bırakılırsa alış fiyatı kullanılır
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para Birimi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRY">TRY (Türk Lirası)</SelectItem>
                        <SelectItem value="USD">USD (Amerikan Doları)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="GBP">GBP (İngiliz Sterlini)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Risk Level */}
              <FormField
                control={form.control}
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Seviyesi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              Düşük Risk
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Orta Risk
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-100 text-red-800">
                              Yüksek Risk
                            </Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Account */}
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bağlı Hesap *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Hesap seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.bankName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Purchase Date */}
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Tarihi</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd.MM.yyyy", { locale: tr })
                            ) : (
                              <span>Tarih seçin</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Teknoloji, Kripto Para" {...field} />
                      </FormControl>
                      <FormDescription>
                        Yatırımı kategorize etmek için kullanılır
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Kaydediliyor..." : mode === 'create' ? "Ekle" : "Güncelle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
