import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertTransactionSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Extend Express session to include user
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      email: string;
      username: string;
      role: string;
    };
  }
}

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

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    console.log("🔐 Register endpoint hit");
    try {
      const validatedData = registerSchema.parse(req.body);
      console.log("✅ Validation passed for:", validatedData.email);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log("❌ Email already exists");
        return res.status(400).json({ error: "Bu email adresi zaten kullanılıyor" });
      }

      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        console.log("❌ Username already exists");
        return res.status(400).json({ error: "Bu kullanıcı adı zaten kullanılıyor" });
      }
      
      // Hash password
      console.log("🔐 Hashing password...");
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);
      
      // Create user
      console.log("👤 Creating user...");
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword
      });
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      console.log("✅ User created successfully:", userWithoutPassword.id);
      
      const response = { 
        message: "Kullanıcı başarıyla oluşturuldu",
        user: userWithoutPassword 
      };
      console.log("📤 Sending response:", response);
      res.status(201).json(response);
    } catch (error) {
      console.error("❌ Register error:", error);
      res.status(400).json({ error: "Kayıt sırasında hata oluştu" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: "Geçersiz email veya şifre" });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Geçersiz email veya şifre" });
      }
      
      // Update last login
      await storage.updateLastLogin(user.id);
      
      // Set session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      };
      
      console.log("✅ Session created for user:", user.id);
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.json({ 
        message: "Giriş başarılı",
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({ error: "Giriş sırasında hata oluştu" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      if (req.session.userId) {
        console.log("🚪 Logging out user:", req.session.userId);
        
        // Destroy session
        req.session.destroy((err) => {
          if (err) {
            console.error("❌ Session destruction error:", err);
            return res.status(500).json({ error: "Çıkış sırasında hata oluştu" });
          }
          res.clearCookie('connect.sid'); // Clear session cookie
          res.json({ message: "Çıkış başarılı" });
        });
      } else {
        res.json({ message: "Zaten çıkış yapılmış" });
      }
    } catch (error) {
      console.error("❌ Logout error:", error);
      res.status(500).json({ error: "Çıkış sırasında hata oluştu" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderilecek" });
      }
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
      
      await storage.setResetToken(validatedData.email, resetToken, resetTokenExpires);
      
      // TODO: Send email with reset link
      console.log(`Reset token for ${validatedData.email}: ${resetToken}`);
      
      res.json({ message: "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderilecek" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Şifre sıfırlama isteği sırasında hata oluştu" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      // Find user by reset token
      const users = await storage.getUser(""); // This is a hack, we need a method to find by reset token
      // TODO: Add findUserByResetToken method to storage
      
      // For now, we'll skip the token validation implementation
      res.status(501).json({ error: "Şifre sıfırlama henüz tam olarak implementasyon aşamasında" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(400).json({ error: "Şifre sıfırlama sırasında hata oluştu" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId || !req.session.user) {
        return res.status(401).json({ error: "Kimlik doğrulama gerekli" });
      }
      
      // Return current user from session
      res.json({
        user: req.session.user
      });
    } catch (error) {
      console.error("❌ Get user error:", error);
      res.status(500).json({ error: "Kullanıcı bilgileri alınırken hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
