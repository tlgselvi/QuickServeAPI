import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Building, 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  PiggyBank, 
  Plus, 
  History,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";
import AccountTransactionForm from "./account-transaction-form";
import { formatCurrency } from "@/lib/utils";
import type { Account, SubAccount } from "@shared/schema";

interface AccountCardWithSubAccountsProps {
  account: Account;
  onAddTransaction: (data: any) => void;
  onViewHistory: (accountId: string) => void;
}

export default function AccountCardWithSubAccounts({ 
  account, 
  onAddTransaction, 
  onViewHistory 
}: AccountCardWithSubAccountsProps) {
  const [selectedSubAccount, setSelectedSubAccount] = useState<string | null>(null);

  // Parse sub-accounts from JSON string
  const subAccounts: SubAccount[] = account.subAccounts 
    ? JSON.parse(account.subAccounts) 
    : [];

  const getSubAccountIcon = (type: string) => {
    switch (type) {
      case 'checking': return <Building className="w-4 h-4" />;
      case 'creditCard': return <CreditCard className="w-4 h-4" />;
      case 'loan': return <Calendar className="w-4 h-4" />;
      case 'kmh': return <AlertTriangle className="w-4 h-4" />;
      case 'deposit': return <PiggyBank className="w-4 h-4" />;
      default: return <Building className="w-4 h-4" />;
    }
  };

  const getSubAccountName = (type: string) => {
    switch (type) {
      case 'checking': return 'Vadesiz Hesap';
      case 'creditCard': return 'Kredi Kartı';
      case 'loan': return 'Kredi';
      case 'kmh': return 'KMH (Kredi Mevduat Hesabı)';
      case 'deposit': return 'Vadeli Hesap';
      default: return 'Hesap';
    }
  };

  const getSubAccountColor = (type: string) => {
    switch (type) {
      case 'checking': return 'bg-blue-100 text-blue-800';
      case 'creditCard': return 'bg-green-100 text-green-800';
      case 'loan': return 'bg-orange-100 text-orange-800';
      case 'kmh': return 'bg-red-100 text-red-800';
      case 'deposit': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSubAccountDetails = (subAccount: SubAccount) => {
    switch (subAccount.type) {
      case 'creditCard':
        return (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Limit: {formatCurrency(subAccount.limit)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Kullanılan: {formatCurrency(subAccount.used)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Kesim: Ayın {subAccount.cutOffDate}'i
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Son ödeme: Ayın {subAccount.paymentDueDate}'i
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Asgari: {formatCurrency(subAccount.minimumPayment)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Faiz: %{subAccount.interestRate}
            </div>
          </div>
        );

      case 'loan':
        return (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Kalan: {formatCurrency(subAccount.principalRemaining)}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Taksit: {formatCurrency(subAccount.monthlyPayment)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Ödeme: Ayın {subAccount.dueDate}'i
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Faiz: %{subAccount.interestRate}
            </div>
          </div>
        );

      case 'kmh':
        return (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Limit: {formatCurrency(subAccount.limit)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Kullanılan: {formatCurrency(subAccount.used)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Faiz: %{subAccount.interestRate}
            </div>
          </div>
        );

      case 'deposit':
        return (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Bakiye: {formatCurrency(subAccount.balance)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Faiz: %{subAccount.interestRate}
            </div>
            {subAccount.maturityDate && (
              <div className="flex items-center gap-1 col-span-2">
                <Calendar className="w-3 h-3" />
                Vade: {new Date(subAccount.maturityDate).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getSubAccountBalance = (subAccount: SubAccount) => {
    switch (subAccount.type) {
      case 'checking':
        return account.balance; // Main account balance
      case 'creditCard':
        return subAccount.limit - subAccount.used; // Available credit
      case 'loan':
        return subAccount.principalRemaining; // Remaining principal
      case 'kmh':
        return subAccount.limit - subAccount.used; // Available overdraft
      case 'deposit':
        return subAccount.balance; // Deposit balance
      default:
        return 0;
    }
  };

  const getSubAccountBalanceLabel = (type: string) => {
    switch (type) {
      case 'checking': return 'Bakiye';
      case 'creditCard': return 'Kullanılabilir';
      case 'loan': return 'Kalan Ana Para';
      case 'kmh': return 'Kullanılabilir';
      case 'deposit': return 'Bakiye';
      default: return 'Bakiye';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{account.bankName}</CardTitle>
              <p className="text-sm text-muted-foreground">{account.accountName}</p>
            </div>
          </div>
          <Badge variant={account.type === 'company' ? 'default' : 'secondary'}>
            {account.type === 'company' ? 'Şirket' : 'Kişisel'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Accordion type="multiple" className="w-full">
          {/* Main Account (Checking) */}
          <AccordionItem value="main">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>Vadesiz Hesap</span>
                  <Badge className="bg-blue-100 text-blue-800">Ana Hesap</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {formatCurrency(account.balance)} {account.currency}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubAccount(selectedSubAccount === 'main' ? null : 'main');
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      İşlem
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory(account.id);
                      }}
                    >
                      <History className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {selectedSubAccount === 'main' && (
                <div className="pt-3 border-t">
                  <AccountTransactionForm
                    account={{
                      id: account.id,
                      name: `${account.bankName} Vadesiz Hesap`,
                      bankName: account.bankName,
                      type: account.type,
                      currency: account.currency,
                      balance: account.balance
                    }}
                    onAddTransaction={onAddTransaction}
                    onClose={() => setSelectedSubAccount(null)}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Sub-accounts */}
          {subAccounts.map((subAccount, index) => (
            <AccordionItem key={`${subAccount.type}-${index}`} value={subAccount.type}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2">
                    {getSubAccountIcon(subAccount.type)}
                    <span>{getSubAccountName(subAccount.type)}</span>
                    <Badge className={getSubAccountColor(subAccount.type)}>
                      {subAccount.type === 'creditCard' ? 'Kredi Kartı' :
                       subAccount.type === 'loan' ? 'Kredi' :
                       subAccount.type === 'kmh' ? 'KMH' :
                       subAccount.type === 'deposit' ? 'Vadeli' : 'Alt Hesap'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(getSubAccountBalance(subAccount))} {account.currency}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getSubAccountBalanceLabel(subAccount.type)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubAccount(selectedSubAccount === `${subAccount.type}-${index}` ? null : `${subAccount.type}-${index}`);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        İşlem
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewHistory(`${account.id}_${subAccount.type}_${index}`);
                        }}
                      >
                        <History className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {/* Sub-account details */}
                  {renderSubAccountDetails(subAccount)}
                  
                  {/* Transaction form */}
                  {selectedSubAccount === `${subAccount.type}-${index}` && (
                    <div className="pt-3 border-t">
                      <AccountTransactionForm
                        account={{
                          id: `${account.id}_${subAccount.type}_${index}`,
                          name: `${account.bankName} ${getSubAccountName(subAccount.type)}`,
                          bankName: account.bankName,
                          type: account.type,
                          currency: account.currency,
                          balance: getSubAccountBalance(subAccount).toString()
                        }}
                        subAccount={subAccount}
                        onAddTransaction={onAddTransaction}
                        onClose={() => setSelectedSubAccount(null)}
                      />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Account Summary */}
        <div className="pt-4 mt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Toplam Ürün:</span>
            <span className="font-medium">{subAccounts.length + 1} hesap</span>
          </div>
          
          {/* Payment Alerts */}
          {subAccounts.some(sa => sa.type === 'creditCard' || sa.type === 'loan') && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="flex items-center gap-1 text-yellow-700">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-medium">Ödeme Hatırlatmaları:</span>
              </div>
              <div className="mt-1 space-y-1">
                {subAccounts
                  .filter(sa => sa.type === 'creditCard')
                  .map((cc, i) => (
                    <div key={i}>
                      Kredi Kartı: Ayın {(cc as any).paymentDueDate}'i
                    </div>
                  ))}
                {subAccounts
                  .filter(sa => sa.type === 'loan')
                  .map((loan, i) => (
                    <div key={i}>
                      Kredi Taksit: Ayın {(loan as any).dueDate}'i
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}




