import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, User, MoreHorizontal } from "lucide-react";
import type { Account } from "@/lib/types";

interface AccountCardProps {
  account: Account;
  formatCurrency: (amount: string) => string;
}

export default function AccountCard({ account, formatCurrency }: AccountCardProps) {
  const isCompany = account.type === 'company';
  
  return (
    <Card className="shadow-sm" data-testid={`card-account-${account.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
              isCompany ? 'bg-primary/10' : 'bg-secondary/10'
            }`}>
              {isCompany ? (
                <CreditCard className={`w-5 h-5 ${isCompany ? 'text-primary' : 'text-secondary'}`} />
              ) : (
                <User className={`w-5 h-5 ${isCompany ? 'text-primary' : 'text-secondary'}`} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground" data-testid={`text-bank-name-${account.id}`}>
                {account.bankName}
              </h3>
              <p className="text-xs text-muted-foreground" data-testid={`text-account-type-${account.id}`}>
                {isCompany ? 'Şirket Hesabı' : 'Kişisel Hesap'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" data-testid={`button-account-menu-${account.id}`}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1" data-testid={`text-account-name-${account.id}`}>
            {account.accountName}
          </p>
          <p className="text-2xl font-bold text-foreground" data-testid={`text-balance-${account.id}`}>
            {formatCurrency(account.balance)}
          </p>
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span data-testid={`text-currency-${account.id}`}>{account.currency}</span>
          <span className="text-accent" data-testid={`text-change-${account.id}`}>+2.5% bu ay</span>
        </div>
      </CardContent>
    </Card>
  );
}
