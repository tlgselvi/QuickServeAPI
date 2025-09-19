export default function FixedExpenses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Sabit Giderler</h1>
      </div>
      
      <div className="text-center py-16 text-muted-foreground">
        <h2 className="text-xl mb-2">Sabit Gider Modülü</h2>
        <p>Düzenli giderlerinizi ve aboneliklerinizi buradan takip edebilirsiniz.</p>
        <p className="text-sm mt-2 text-yellow-600">Bu modül yakında gelecek...</p>
      </div>
    </div>
  );
}