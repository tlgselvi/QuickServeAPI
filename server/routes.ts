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
      
      // Validate transaction type for this endpoint
      if (!['income', 'expense'].includes(validatedData.type)) {
        return res.status(400).json({ error: "Bu endpoint sadece gelir ve gider işlemlerini destekler" });
      }
      
      // Calculate balance adjustment
      let balanceAdjustment = 0;
      const amount = parseFloat(validatedData.amount);
      
      if (validatedData.type === 'income') {
        balanceAdjustment = amount;
      } else if (validatedData.type === 'expense') {
        balanceAdjustment = -amount;
      }
      
      // Use atomic transaction operation
      const transaction = await storage.performTransaction(validatedData, balanceAdjustment);
      
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
      const virmanId = randomUUID();
      
      // Use atomic transfer operation
      const { outTransaction, inTransaction } = await storage.performTransfer(
        fromAccountId, 
        toAccountId, 
        transferAmount, 
        description || 'Hesaplar arası transfer',
        virmanId
      );
      
      // Get updated balances
      const updatedFromAccount = await storage.getAccount(fromAccountId);
      const updatedToAccount = await storage.getAccount(toAccountId);
      
      res.json({
        message: 'Virman başarılı',
        fromBalance: parseFloat(updatedFromAccount?.balance || '0'),
        toBalance: parseFloat(updatedToAccount?.balance || '0'),
        transactions: [outTransaction, inTransaction]
      });
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Yetersiz bakiye') {
        return res.status(400).json({ error: "Yetersiz bakiye" });
      }
      res.status(400).json({ error: "Virman işleminde hata oluştu" });
    }
  });

  // Dashboard route
  app.get("/api/dashboard", async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardStats();
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: "Dashboard verisi yüklenirken hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
