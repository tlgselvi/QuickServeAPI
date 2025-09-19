import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertTransactionSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, Permission, UserRole } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAuth, requirePermission, requireAccountTypeAccess, optionalAuth, logAccess, AuthenticatedRequest } from "./middleware/auth";

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
  // Account routes - Protected by authentication and account type permissions
  app.get("/api/accounts", 
    requireAuth, 
    requirePermission(Permission.VIEW_PERSONAL_ACCOUNTS, Permission.VIEW_COMPANY_ACCOUNTS, Permission.VIEW_ALL_ACCOUNTS),
    logAccess("VIEW_ACCOUNTS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const accounts = await storage.getAccounts();
        
        // Filter accounts based on user role
        const filteredAccounts = accounts.filter(account => {
          if (req.user!.role === UserRole.ADMIN) return true;
          if (req.user!.role === UserRole.COMPANY_USER) return true; // Can see both
          if (req.user!.role === UserRole.PERSONAL_USER) return account.type === 'personal';
          return false;
        });
        
        res.json(filteredAccounts);
      } catch (error) {
        res.status(500).json({ error: "Hesaplar yüklenirken hata oluştu" });
      }
    }
  );

  app.post("/api/accounts", 
    requireAuth,
    logAccess("CREATE_ACCOUNT"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertAccountSchema.parse(req.body);
        
        // Check if user can create this account type
        const accountType = validatedData.type as 'personal' | 'company';
        if (req.user!.role === UserRole.PERSONAL_USER && accountType === 'company') {
          return res.status(403).json({ error: "Şirket hesabı oluşturma yetkiniz bulunmuyor" });
        }
        
        const account = await storage.createAccount(validatedData);
        res.json(account);
      } catch (error) {
        res.status(400).json({ error: "Geçersiz hesap verisi" });
      }
    }
  );

  // Transaction routes - Protected by authentication and account type permissions
  app.get("/api/transactions", 
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess("VIEW_TRANSACTIONS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const transactions = await storage.getTransactions();
        const accounts = await storage.getAccounts();
        
        // Filter transactions based on user role and account access
        const allowedAccountIds = accounts
          .filter(account => {
            if (req.user!.role === UserRole.ADMIN) return true;
            if (req.user!.role === UserRole.COMPANY_USER) return true; // Can see both
            if (req.user!.role === UserRole.PERSONAL_USER) return account.type === 'personal';
            return false;
          })
          .map(account => account.id);
        
        const filteredTransactions = transactions.filter(transaction => 
          allowedAccountIds.includes(transaction.accountId)
        );
        
        res.json(filteredTransactions);
      } catch (error) {
        res.status(500).json({ error: "İşlemler yüklenirken hata oluştu" });
      }
    }
  );

  app.post("/api/transactions", 
    requireAuth,
    logAccess("CREATE_TRANSACTION"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertTransactionSchema.parse(req.body);
        
        // Validate transaction type for this endpoint
        if (!['income', 'expense'].includes(validatedData.type)) {
          return res.status(400).json({ error: "Bu endpoint sadece gelir ve gider işlemlerini destekler" });
        }
        
        // Check if user can access the target account
        const account = await storage.getAccount(validatedData.accountId);
        if (!account) {
          return res.status(404).json({ error: "Hesap bulunamadı" });
        }
        
        // Check account type permissions
        if (req.user!.role === UserRole.PERSONAL_USER && account.type === 'company') {
          return res.status(403).json({ error: "Şirket hesabında işlem yapma yetkiniz bulunmuyor" });
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
    }
  );

  // Money transfer (virman) route - Protected by authentication
  app.post("/api/virman", 
    requireAuth,
    logAccess("TRANSFER_FUNDS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { fromAccountId, toAccountId, amount, description } = req.body;
        
        const fromAccount = await storage.getAccount(fromAccountId);
        const toAccount = await storage.getAccount(toAccountId);
        
        if (!fromAccount || !toAccount) {
          return res.status(400).json({ error: "Hesap bulunamadı" });
        }
        
        // Check if user can access both accounts
        const canAccessFrom = req.user!.role === UserRole.ADMIN || 
                              req.user!.role === UserRole.COMPANY_USER ||
                              (req.user!.role === UserRole.PERSONAL_USER && fromAccount.type === 'personal');
        
        const canAccessTo = req.user!.role === UserRole.ADMIN || 
                            req.user!.role === UserRole.COMPANY_USER ||
                            (req.user!.role === UserRole.PERSONAL_USER && toAccount.type === 'personal');
        
        if (!canAccessFrom || !canAccessTo) {
          return res.status(403).json({ error: "Bu hesaplar arasında virman yapma yetkiniz bulunmuyor" });
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
    }
  );

  // Dashboard route - Protected by authentication with role-based filtering
  app.get("/api/dashboard", 
    requireAuth,
    logAccess("VIEW_DASHBOARD"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const dashboardData = await storage.getDashboardStats();
        const accounts = await storage.getAccounts();
        
        // Filter dashboard data based on user role
        if (req.user!.role === UserRole.ADMIN) {
          // Admin sees all data
          res.json(dashboardData);
        } else if (req.user!.role === UserRole.COMPANY_USER) {
          // Company user sees all data (both personal and company)
          res.json(dashboardData);
        } else if (req.user!.role === UserRole.PERSONAL_USER) {
          // Personal user only sees personal account data
          const personalAccounts = accounts.filter(account => account.type === 'personal');
          const personalBalance = personalAccounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);
          
          res.json({
            totalBalance: personalBalance,
            companyBalance: 0, // Personal users don't see company data
            personalBalance: personalBalance
          });
        } else {
          res.json({ totalBalance: 0, companyBalance: 0, personalBalance: 0 });
        }
      } catch (error) {
        res.status(500).json({ error: "Dashboard verisi yüklenirken hata oluştu" });
      }
    }
  );

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

  app.post("/api/auth/logout", 
    requireAuth,
    logAccess("LOGOUT"),
    async (req: AuthenticatedRequest, res) => {
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
    }
  );

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

  app.get("/api/auth/me", 
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        // Return current user from session
        res.json({
          user: req.user
        });
      } catch (error) {
        console.error("❌ Get user error:", error);
        res.status(500).json({ error: "Kullanıcı bilgileri alınırken hata oluştu" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
