import { ArrowLeft, ArrowRight, ArrowLeftRight } from "lucide-react";
import type { Transaction, Account } from "@/lib/types";

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  formatCurrency: (amount: string) => string;
}

export default function TransactionItem({ transaction, accounts, formatCurrency }: TransactionItemProps) {
  const account = accounts.find(a => a.id === transaction.accountId);
  
  const getTransactionIcon = () => {
    switch (transaction.type) {
      case 'income':
        return <ArrowLeft className="w-5 h-5 text-accent" />;
      case 'expense':
        return <ArrowRight className="w-5 h-5 text-destructive" />;
      case 'transfer_in':
      case 'transfer_out':
        return <ArrowLeftRight className="w-5 h-5 text-primary" />;
      default:
        return <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTransactionColor = () => {
    switch (transaction.type) {
      case 'income':
      case 'transfer_in':
        return 'text-accent';
      case 'expense':
      case 'transfer_out':
        return 'text-destructive';
      default:
        return 'text-foreground';
    }
  };

  const getTransactionType = () => {
    switch (transaction.type) {
      case 'income':
        return 'Gelir';
      case 'expense':
        return 'Gider';
      case 'transfer_in':
      case 'transfer_out':
        return 'Virman';
      default:
        return 'İşlem';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 gün önce';
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getAmountDisplay = () => {
    const amount = parseFloat(transaction.amount);
    const sign = transaction.type === 'income' || transaction.type === 'transfer_in' ? '+' : '-';
    return `${sign}${formatCurrency(Math.abs(amount).toString())}`;
  };

  return (
    <div 
      className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
      data-testid={`transaction-item-${transaction.id}`}
    >
      <div className="flex items-center">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
          transaction.type === 'income' ? 'bg-accent/10' :
          transaction.type === 'expense' ? 'bg-destructive/10' : 'bg-primary/10'
        }`}>
          {getTransactionIcon()}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground" data-testid={`text-description-${transaction.id}`}>
            {transaction.description}
          </p>
          <p className="text-xs text-muted-foreground" data-testid={`text-date-${transaction.id}`}>
            {formatDate(transaction.date)} • {account?.bankName || 'Bilinmeyen Hesap'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${getTransactionColor()}`} data-testid={`text-amount-${transaction.id}`}>
          {getAmountDisplay()}
        </p>
        <p className="text-xs text-muted-foreground" data-testid={`text-type-${transaction.id}`}>
          {getTransactionType()}
        </p>
      </div>
    </div>
  );
}
