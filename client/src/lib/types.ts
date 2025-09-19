export interface Account {
  id: string;
  type: 'personal' | 'company';
  bankName: string;
  accountName: string;
  balance: string;
  currency: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: string;
  description: string;
  category?: string;
  virmanPairId?: string;
  date: Date;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
}
