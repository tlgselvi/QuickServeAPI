import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Plus, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { FixedExpense } from "@shared/schema";

export default function FixedExpenses() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "TRY",
    category: "",
    type: "expense" as "expense" | "income",
    recurrence: "monthly" as "monthly" | "weekly" | "yearly",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch fixed expenses
  const { data: fixedExpenses = [], isLoading } = useQuery({
    queryKey: ["/api/fixed-expenses"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/fixed-expenses");
      return response.json();
    },
    staleTime: 30000,
  });

  // Add fixed expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await apiRequest("POST", "/api/fixed-expenses", expenseData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sabit gider eklenemedi");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sabit Gider Eklendi",
        description: "Yeni sabit gider başarıyla eklendi.",
      });
      
      setNewExpense({
        title: "",
        description: "",
        amount: "",
        currency: "TRY",
        category: "",
        type: "expense",
        recurrence: "monthly",
      });
      setIsAddDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-expenses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newExpense.title || !newExpense.amount) {
      toast({
        title: "Geçersiz Veri",
        description: "Lütfen gerekli alanları doldurun.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpenseMutation.mutateAsync({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        startDate: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "income" ? (
      <Badge variant="default">Gelir</Badge>
    ) : (
      <Badge variant="destructive">Gider</Badge>
    );
  };

  const getRecurrenceBadge = (recurrence: string) => {
    const colors = {
      weekly: "bg-blue-100 text-blue-800",
      monthly: "bg-green-100 text-green-800",
      yearly: "bg-purple-100 text-purple-800",
    };
    
    const labels = {
      weekly: "Haftalık",
      monthly: "Aylık",
      yearly: "Yıllık",
    };

    return (
      <Badge className={colors[recurrence as keyof typeof colors]}>
        {labels[recurrence as keyof typeof labels]}
      </Badge>
    );
  };

  const totalMonthlyExpenses = fixedExpenses
    .filter((expense: FixedExpense) => expense.type === "expense" && expense.isActive)
    .reduce((sum: number, expense: FixedExpense) => {
      const amount = parseFloat(expense.amount);
      switch (expense.recurrence) {
        case "weekly": return sum + (amount * 4.33); // Average weeks per month
        case "monthly": return sum + amount;
        case "yearly": return sum + (amount / 12);
        default: return sum + amount;
      }
    }, 0);

  const totalMonthlyIncome = fixedExpenses
    .filter((expense: FixedExpense) => expense.type === "income" && expense.isActive)
    .reduce((sum: number, expense: FixedExpense) => {
      const amount = parseFloat(expense.amount);
      switch (expense.recurrence) {
        case "weekly": return sum + (amount * 4.33);
        case "monthly": return sum + amount;
        case "yearly": return sum + (amount / 12);
        default: return sum + amount;
      }
    }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Sabit Giderler</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Sabit Gider Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Yeni Sabit Gider</DialogTitle>
              <DialogDescription>
                Düzenli gider veya gelir kaydı ekleyin
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <Label htmlFor="title">Başlık *</Label>
                <Input
                  id="title"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="Örn: Kira, Maaş, Abonelik"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Detaylı açıklama (opsiyonel)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Tutar *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="currency">Para Birimi</Label>
                  <Select value={newExpense.currency} onValueChange={(value) => setNewExpense({ ...newExpense, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tür</Label>
                  <Select value={newExpense.type} onValueChange={(value: "expense" | "income") => setNewExpense({ ...newExpense, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Gider</SelectItem>
                      <SelectItem value="income">Gelir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="recurrence">Tekrar</Label>
                  <Select value={newExpense.recurrence} onValueChange={(value: "monthly" | "weekly" | "yearly") => setNewExpense({ ...newExpense, recurrence: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Haftalık</SelectItem>
                      <SelectItem value="monthly">Aylık</SelectItem>
                      <SelectItem value="yearly">Yıllık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Kategori</Label>
                <Input
                  id="category"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  placeholder="Örn: Kira, Maaş, Faturalar"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting || addExpenseMutation.isPending}>
                  {isSubmitting || addExpenseMutation.isPending ? "Ekleniyor..." : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aylık Toplam Gider</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalMonthlyExpenses, "TRY")}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aylık Toplam Gelir</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalMonthlyIncome, "TRY")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sabit Giderler ve Gelirler</CardTitle>
          <CardDescription>
            Düzenli gider ve gelir kayıtlarınız
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Sabit giderler yükleniyor...</div>
          ) : fixedExpenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Tekrar</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixedExpenses.map((expense: FixedExpense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell>{getTypeBadge(expense.type)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parseFloat(expense.amount), expense.currency)}
                    </TableCell>
                    <TableCell>{getRecurrenceBadge(expense.recurrence)}</TableCell>
                    <TableCell>{expense.category || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={expense.isActive ? "default" : "secondary"}>
                        {expense.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Henüz Sabit Gider Yok</h3>
              <p className="text-muted-foreground mb-4">
                Düzenli gider ve gelirlerinizi takip etmek için sabit gider ekleyin.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                İlk Sabit Gideri Ekle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}