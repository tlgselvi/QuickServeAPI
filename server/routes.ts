import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertTransactionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Account routes
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Hesaplar yüklenirken hata oluştu" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const validatedData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validatedData);
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: "Geçersiz hesap verisi" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "İşlemler yüklenirken hata oluştu" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      
      // Update account balance
      const account = await storage.getAccount(validatedData.accountId);
      if (account) {
        const currentBalance = parseFloat(account.balance);
        let newBalance = currentBalance;
        
        if (validatedData.type === 'income') {
          newBalance += parseFloat(validatedData.amount);
        } else if (validatedData.type === 'expense') {
          newBalance -= parseFloat(validatedData.amount);
        }
        
        await storage.updateAccountBalance(validatedData.accountId, newBalance);
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Geçersiz işlem verisi" });
    }
  });

  // Money transfer (virman) route
  app.post("/api/virman", async (req, res) => {
    try {
      const { fromAccountId, toAccountId, amount, description } = req.body;
      
      const fromAccount = await storage.getAccount(fromAccountId);
      const toAccount = await storage.getAccount(toAccountId);
      
      if (!fromAccount || !toAccount) {
        return res.status(400).json({ error: "Hesap bulunamadı" });
      }
      
      const transferAmount = parseFloat(amount);
      const fromBalance = parseFloat(fromAccount.balance);
      
      if (fromBalance < transferAmount) {
        return res.status(400).json({ error: "Yetersiz bakiye" });
      }
      
      // Update balances
      const newFromBalance = fromBalance - transferAmount;
      const newToBalance = parseFloat(toAccount.balance) + transferAmount;
      
      await storage.updateAccountBalance(fromAccountId, newFromBalance);
      await storage.updateAccountBalance(toAccountId, newToBalance);
      
      // Create transfer transactions
      const virmanId = randomUUID();
      
      const outTransaction = await storage.createTransaction({
        accountId: fromAccountId,
        type: 'transfer_out',
        amount: transferAmount.toFixed(4),
        description: `Virman: ${description || 'Hesaplar arası transfer'}`,
        virmanPairId: virmanId
      });
      
      const inTransaction = await storage.createTransaction({
        accountId: toAccountId,
        type: 'transfer_in',
        amount: transferAmount.toFixed(4),
        description: `Virman: ${description || 'Hesaplar arası transfer'}`,
        virmanPairId: virmanId
      });
      
      res.json({
        message: 'Virman başarılı',
        fromBalance: newFromBalance,
        toBalance: newToBalance,
        transactions: [outTransaction, inTransaction]
      });
      
    } catch (error) {
      res.status(400).json({ error: "Virman işleminde hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
