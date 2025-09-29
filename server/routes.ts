import type { Express } from 'express';
import { Router } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { insertAccountSchema, insertTransactionSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, insertTeamSchema, updateTeamSchema, insertTeamMemberSchema, inviteUserSchema, acceptInviteSchema, insertSystemAlertSchema, insertFixedExpenseSchema, insertInvestmentSchema, insertForecastSchema, insertAISettingsSchema, importTransactionJsonSchema, exportTransactionsByDateSchema, transactionJsonFileSchema, Permission, UserRole, TeamPermission, hasTeamPermission, TeamRole } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import type { AuthenticatedRequest } from './middleware/auth';
import { requireAuth, requirePermission, requireAccountTypeAccess, optionalAuth, logAccess } from './middleware/auth';
import { requireJWTAuth, requireJWTPermission, requireJWTAdmin, logJWTAccess } from './middleware/jwt-auth';
import { updateUserRoleSchema, updateUserStatusSchema } from '@shared/schema';
import { alertService } from './alert-service';
import { transactionJsonService } from './transaction-json-service';
import { realtimeService } from './realtime-service';
import { JWTAuthService, TokenBlacklist } from './jwt-auth';
import type { AuthenticatedRequest as JWTAuthenticatedRequest } from './middleware/jwt-auth';
import { openaiService } from './services/ai/openaiService';
import tenantsRouter from './routes/tenants';
import investmentsRouter from './routes/investments';
import portfolioRouter from './routes/portfolio';
import aiAgentsRouter from './routes/ai-agents';
import riskRouter from './routes/risk';
import simulationRouter from './routes/simulation';
import advisorRouter from './routes/advisor';
import financeRouter from './routes/finance';
import emailVerificationRouter from './routes/email-verification';
import budgetLinesRouter from './routes/budget-lines';
import exportRouter from './routes/export';
import recurringRouter from './routes/recurring';
import budgetCompareRouter from './routes/budget-compare';
import scenarioRouter from './routes/scenario';

// Extend Express session to include user
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      email: string;
      username: string;
      role: string;
      isActive: boolean;
    };
  }
}

export async function registerRoutes (app: Express): Promise<Server> {
  // Lightweight health endpoint for uptime checks
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  // Account routes - Protected by authentication and account type permissions
  // Finance routes
  const financeApi = Router();
  financeApi.use('/finance', financeRouter);
  app.use('/api', financeApi);
  app.get('/api/accounts',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_ACCOUNTS, Permission.VIEW_COMPANY_ACCOUNTS, Permission.VIEW_ALL_ACCOUNTS),
    logAccess('VIEW_ACCOUNTS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const accounts = await storage.getAccounts();

        // Filter accounts based on user role
        const filteredAccounts = accounts.filter(account => {
          if (req.user!.role === UserRole.ADMIN) {
            return true;
          }
          if (req.user!.role === UserRole.COMPANY_USER) {
            return true;
          } // Can see both
          if (req.user!.role === UserRole.PERSONAL_USER) {
            return account.type === 'personal';
          }
          return false;
        });

        res.json(filteredAccounts);
      } catch (error) {
        res.status(500).json({ error: 'Hesaplar yüklenirken hata oluştu' });
      }
    },
  );

  app.post('/api/accounts',
    requireAuth,
    logAccess('CREATE_ACCOUNT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log('🔍 Received account data:', JSON.stringify(req.body, null, 2));
        const validatedData = insertAccountSchema.parse(req.body);
        console.log('✅ Validation passed:', JSON.stringify(validatedData, null, 2));

        // Check if user can create this account type
        const accountType = validatedData.type as 'personal' | 'company';
        if (req.user!.role === UserRole.PERSONAL_USER && accountType === 'company') {
          return res.status(403).json({ error: 'Şirket hesabı oluşturma yetkiniz bulunmuyor' });
        }

        const account = await storage.createAccount(validatedData);
        console.log('🎉 Account created:', account);
        res.json(account);
      } catch (error) {
        console.error('❌ Account validation error:', error);
        res.status(400).json({ error: 'Geçersiz hesap verisi', details: error.message });
      }
    },
  );

  // Account summary endpoint - Enhanced account details with transactions and history
  app.get('/api/accounts/:id/summary',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_ACCOUNTS, Permission.VIEW_COMPANY_ACCOUNTS, Permission.VIEW_ALL_ACCOUNTS),
    logAccess('VIEW_ACCOUNT_SUMMARY'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const accountId = req.params.id;
        const summary = await storage.getAccountSummary(accountId);

        if (!summary) {
          return res.status(404).json({ error: 'Hesap bulunamadı' });
        }

        // Check if user has access to this account
        const accounts = await storage.getAccounts();
        const allowedAccountIds = accounts
          .filter(account => {
            if (req.user!.role === UserRole.ADMIN) {
              return true;
            }
            if (req.user!.role === UserRole.COMPANY_USER) {
              return true;
            }
            if (req.user!.role === UserRole.PERSONAL_USER) {
              return account.type === 'personal';
            }
            return false;
          })
          .map(account => account.id);

        if (!allowedAccountIds.includes(accountId)) {
          return res.status(403).json({ error: 'Bu hesaba erişim yetkiniz yok' });
        }

        res.set({
          'Cache-Control': 'private, max-age=300', // 5 minutes cache
        });

        res.json(summary);
      } catch (error) {
        console.error('Account summary error:', error);
        res.status(500).json({ error: 'Hesap özeti yüklenirken hata oluştu' });
      }
    },
  );

  // Transaction routes - Protected by authentication and account type permissions
  app.get('/api/transactions',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_TRANSACTIONS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        // Parse pagination and search parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 items per page
        const search = req.query.search as string;
        const accountId = req.query.accountId as string;

        // Get accounts for filtering
        const accounts = await storage.getAccounts();
        const allowedAccountIds = accounts
          .filter(account => {
            if (req.user!.role === UserRole.ADMIN) {
              return true;
            }
            if (req.user!.role === UserRole.COMPANY_USER) {
              return true;
            } // Can see both
            if (req.user!.role === UserRole.PERSONAL_USER) {
              return account.type === 'personal';
            }
            return false;
          })
          .map(account => account.id);

        // Use paginated endpoint for better performance
        const result = await storage.getTransactionsPaginated(page, limit, search, accountId);

        // Filter transactions based on user role and account access
        const filteredTransactions = result.transactions.filter(transaction =>
          allowedAccountIds.includes(transaction.accountId),
        );

        res.set({
          'Cache-Control': 'private, max-age=60',
          'X-Total-Count': result.total.toString(),
          'X-Total-Pages': result.totalPages.toString(),
          'X-Current-Page': page.toString(),
        });

        res.json({
          transactions: filteredTransactions,
          total: result.total,
          totalPages: result.totalPages,
          currentPage: page,
        });
      } catch (error) {
        res.status(500).json({ error: 'İşlemler yüklenirken hata oluştu' });
      }
    },
  );

  app.post('/api/transactions',
    requireAuth,
    logAccess('CREATE_TRANSACTION'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertTransactionSchema.parse(req.body);

        // Validate transaction type for this endpoint
        if (!['income', 'expense'].includes(validatedData.type)) {
          return res.status(400).json({ error: 'Bu endpoint sadece gelir ve gider işlemlerini destekler' });
        }

        // Check if user can access the target account
        const account = await storage.getAccount(validatedData.accountId);
        if (!account) {
          return res.status(404).json({ error: 'Hesap bulunamadı' });
        }

        // Check account type permissions
        if (req.user!.role === UserRole.PERSONAL_USER && account.type === 'company') {
          return res.status(403).json({ error: 'Şirket hesabında işlem yapma yetkiniz bulunmuyor' });
        }

        // Calculate balance adjustment
        let balanceAdjustment = 0;
        const amount = typeof validatedData.amount === 'string' ? parseFloat(validatedData.amount) : validatedData.amount;

        if (validatedData.type === 'income') {
          balanceAdjustment = amount;
        } else if (validatedData.type === 'expense') {
          balanceAdjustment = -amount;
        }

        // Use atomic transaction operation
        const transaction = await storage.performTransaction(validatedData, balanceAdjustment);

        res.json(transaction);
      } catch (error) {
        res.status(400).json({ error: 'Geçersiz işlem verisi' });
      }
    },
  );

  // Money transfer (virman) route - Protected by authentication
  app.post('/api/virman',
    requireAuth,
    logAccess('TRANSFER_FUNDS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { fromAccountId, toAccountId, amount, description } = req.body;

        const fromAccount = await storage.getAccount(fromAccountId);
        const toAccount = await storage.getAccount(toAccountId);

        if (!fromAccount || !toAccount) {
          return res.status(400).json({ error: 'Hesap bulunamadı' });
        }

        // Check if user can access both accounts
        const canAccessFrom = req.user!.role === UserRole.ADMIN ||
                              req.user!.role === UserRole.COMPANY_USER ||
                              (req.user!.role === UserRole.PERSONAL_USER && fromAccount.type === 'personal');

        const canAccessTo = req.user!.role === UserRole.ADMIN ||
                            req.user!.role === UserRole.COMPANY_USER ||
                            (req.user!.role === UserRole.PERSONAL_USER && toAccount.type === 'personal');

        if (!canAccessFrom || !canAccessTo) {
          return res.status(403).json({ error: 'Bu hesaplar arasında virman yapma yetkiniz bulunmuyor' });
        }

        const transferAmount = parseFloat(amount);
        const virmanId = randomUUID();

        // Use atomic transfer operation
        const { outTransaction, inTransaction } = await storage.performTransfer(
          fromAccountId,
          toAccountId,
          transferAmount,
          description || 'Hesaplar arası transfer',
          virmanId,
        );

        // Get updated balances
        const updatedFromAccount = await storage.getAccount(fromAccountId);
        const updatedToAccount = await storage.getAccount(toAccountId);

        res.json({
          message: 'Virman başarılı',
          fromBalance: parseFloat(updatedFromAccount?.balance || '0'),
          toBalance: parseFloat(updatedToAccount?.balance || '0'),
          transactions: [outTransaction, inTransaction],
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Yetersiz bakiye') {
          return res.status(400).json({ error: 'Yetersiz bakiye' });
        }
        res.status(400).json({ error: 'Virman işleminde hata oluştu' });
      }
    },
  );

  // Dashboard route - Protected by authentication with role-based filtering
  app.get('/api/dashboard',
    requireAuth,
    logAccess('VIEW_DASHBOARD'),
    async (req: AuthenticatedRequest, res) => {
      try {
        // Get dashboard data with optimized caching
        const dashboardData = await storage.getDashboardStats();

        // Enhanced caching headers for better performance
        res.set({
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          ETag: `"dashboard-${req.user!.id}-${Date.now()}"`,
          Vary: 'Authorization',
        });

        // Pre-compute role-based filtering for better performance
        const userRole = req.user!.role;

        if (userRole === UserRole.ADMIN || userRole === UserRole.COMPANY_USER) {
          // Admin and Company users see all data
          res.json(dashboardData);
        } else if (userRole === UserRole.PERSONAL_USER) {
          // Personal user only sees personal account data - optimized filtering
          const personalAccounts = dashboardData.accounts.filter(account => account.type === 'personal');
          const personalAccountIds = new Set(personalAccounts.map(acc => acc.id));

          // Pre-calculate personal balances efficiently
          const personalBalance = personalAccounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);
          const personalCash = personalAccounts
            .filter(acc => parseFloat(acc.balance) > 0)
            .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
          const personalDebt = personalAccounts
            .filter(acc => parseFloat(acc.balance) < 0)
            .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance)), 0);

          const personalTransactions = dashboardData.recentTransactions.filter(tx => personalAccountIds.has(tx.accountId));

          res.json({
            totalBalance: personalBalance,
            companyBalance: 0,
            personalBalance: personalBalance,
            totalCash: personalCash,
            totalDebt: personalDebt,
            totalTransactions: personalTransactions.length,
            recentTransactions: personalTransactions,
            accounts: personalAccounts,
          });
        } else {
          res.json({
            totalBalance: 0,
            companyBalance: 0,
            personalBalance: 0,
            totalCash: 0,
            totalDebt: 0,
            totalTransactions: 0,
            recentTransactions: [],
            accounts: [],
          });
        }
      } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Dashboard verisi yüklenirken hata oluştu' });
      }
    },
  );

  // Real-time updates endpoint using Server-Sent Events
  app.get('/api/dashboard/stream',
    requireAuth,
    logAccess('VIEW_DASHBOARD_STREAM'),
    (req: AuthenticatedRequest, res) => {
      realtimeService.addClient(req.user!.id, res);
    },
  );

  // Consolidation breakdown endpoint
  app.get('/api/consolidation/breakdown',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    logAccess('VIEW_CONSOLIDATION_BREAKDOWN'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { calculateConsolidationBreakdown, prepareBreakdownChartData } = await import('./src/modules/consolidation/breakdown');
        const accounts = await storage.getAccounts();

        // Filter accounts based on user role
        const filteredAccounts = accounts.filter(account => {
          if (req.user!.role === UserRole.ADMIN) {
            return true;
          }
          if (req.user!.role === UserRole.COMPANY_USER) {
            return account.type === 'company' || account.type === 'personal';
          }
          if (req.user!.role === UserRole.PERSONAL_USER) {
            return account.type === 'personal';
          }
          return false;
        });

        const result = calculateConsolidationBreakdown(filteredAccounts);
        const chartData = prepareBreakdownChartData(result.breakdown);

        res.json({
          breakdown: result.breakdown,
          table: result.table,
          summary: result.summary,
          chartData,
          accounts: filteredAccounts.length
        });
      } catch (error) {
        console.error('Consolidation breakdown error:', error);
        res.status(500).json({ 
          error: 'Konsolidasyon breakdown hesaplanırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    },
  );


  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    console.log('🔐 Register endpoint hit');
    try {
      const validatedData = registerSchema.parse(req.body);
      console.log('✅ Validation passed for:', validatedData.email);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log('❌ Email already exists');
        return res.status(400).json({ error: 'Bu email adresi zaten kullanılıyor' });
      }

      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        console.log('❌ Username already exists');
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      }

      // Hash password
      console.log('🔐 Hashing password...');
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      // Create user
      console.log('👤 Creating user...');
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
      });

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      console.log('✅ User created successfully:', userWithoutPassword.id);

      const response = {
        message: 'Kullanıcı başarıyla oluşturuldu',
        user: userWithoutPassword,
      };
      console.log('📤 Sending response:', response);
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Register error:', error);
      res.status(400).json({ error: 'Kayıt sırasında hata oluştu' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: 'Geçersiz email veya şifre' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Geçersiz email veya şifre' });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin',
          code: 'ACCOUNT_INACTIVE',
        });
      }

      // Update last login
      await storage.updateLastLogin(user.id);

      // Set session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
      };

      console.log('✅ Session created for user:', user.id);

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.json({
        message: 'Giriş başarılı',
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: 'Giriş sırasında hata oluştu' });
    }
  });

  app.post('/api/auth/logout',
    requireAuth,
    logAccess('LOGOUT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session.userId) {
          console.log('🚪 Logging out user:', req.session.userId);

          // Destroy session
          req.session.destroy((err) => {
            if (err) {
              console.error('❌ Session destruction error:', err);
              return res.status(500).json({ error: 'Çıkış sırasında hata oluştu' });
            }
            res.clearCookie('connect.sid'); // Clear session cookie
            res.json({ message: 'Çıkış başarılı' });
          });
        } else {
          res.json({ message: 'Zaten çıkış yapılmış' });
        }
      } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ error: 'Çıkış sırasında hata oluştu' });
      }
    },
  );

  // JWT Authentication Routes
  app.post('/api/auth/jwt/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: 'Geçersiz email veya şifre' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Geçersiz email veya şifre' });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin',
          code: 'ACCOUNT_INACTIVE',
        });
      }

      // Update last login
      await storage.updateLastLogin(user.id);

      // Generate JWT tokens
      const accessToken = JWTAuthService.generateToken(user);
      const refreshToken = JWTAuthService.generateRefreshToken(user.id);

      console.log('✅ JWT tokens generated for user:', user.id);

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.json({
        message: 'Giriş başarılı',
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
      });
    } catch (error) {
      console.error('JWT Login error:', error);
      res.status(401).json({ error: 'Giriş sırasında hata oluştu' });
    }
  });

  app.post('/api/auth/jwt/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token is required' });
      }

      // Verify refresh token
      const payload = JWTAuthService.verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      // Get user data
      const user = await storage.getUser(payload.userId);
      if (!user?.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Generate new tokens
      const newAccessToken = JWTAuthService.generateToken(user);
      const newRefreshToken = JWTAuthService.generateRefreshToken(user.id);

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ error: 'Token yenileme sırasında hata oluştu' });
    }
  });

  app.post('/api/auth/jwt/logout',
    requireJWTAuth,
    logJWTAccess('JWT_LOGOUT'),
    async (req: JWTAuthenticatedRequest, res) => {
      try {
        // Extract token from Authorization header
        const token = JWTAuthService.extractTokenFromHeader(req.headers.authorization);

        if (token) {
          // Add token to blacklist
          TokenBlacklist.addToBlacklist(token);
          console.log('🚪 JWT token blacklisted for user:', req.user?.id);
        }

        res.json({ message: 'Çıkış başarılı' });
      } catch (error) {
        console.error('❌ JWT Logout error:', error);
        res.status(500).json({ error: 'Çıkış sırasında hata oluştu' });
      }
    },
  );

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);

      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: 'Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderilecek' });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      await storage.setResetToken(validatedData.email, resetToken, resetTokenExpires);

      // TODO: Send email with reset link
      console.log(`Reset token for ${validatedData.email}: ${resetToken}`);

      res.json({ message: 'Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderilecek' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Şifre sıfırlama isteği sırasında hata oluştu' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);

      // Find user by reset token
      const users = await storage.getUser(''); // This is a hack, we need a method to find by reset token
      // TODO: Add findUserByResetToken method to storage

      // For now, we'll skip the token validation implementation
      res.status(501).json({ error: 'Şifre sıfırlama henüz tam olarak implementasyon aşamasında' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(400).json({ error: 'Şifre sıfırlama sırasında hata oluştu' });
    }
  });

  app.get('/api/auth/me',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        // Return current user from session
        res.json({
          user: req.user,
        });
      } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({ error: 'Kullanıcı bilgileri alınırken hata oluştu' });
      }
    },
  );

  // Admin User Management Routes
  app.get('/api/admin/users',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS, Permission.VIEW_USERS),
    logAccess('VIEW_ALL_USERS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const users = await storage.getAllUsers();

        // Remove password from all users for security
        const safeUsers = users.map(({ password, ...user }) => user);

        res.json(safeUsers);
      } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Kullanıcılar yüklenirken hata oluştu' });
      }
    },
  );

  app.put('/api/admin/users/:userId/role',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('CHANGE_USER_ROLE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        try {
          var validatedData = updateUserRoleSchema.parse(req.body);
        } catch (error) {
          return res.status(400).json({ error: 'Geçersiz veri formatı' });
        }
        const { role } = validatedData;

        // Prevent self role change to avoid lockout
        if (userId === req.user!.id) {
          return res.status(403).json({ error: 'Kendi rolünüzü değiştiremezsiniz' });
        }

        const updatedUser = await storage.updateUserRole(userId, role);
        if (!updatedUser) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Remove password for security
        const { password, ...safeUser } = updatedUser;

        res.json({
          message: 'Kullanıcı rolü başarıyla değiştirildi',
          user: safeUser,
        });
      } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Rol değiştirilirken hata oluştu' });
      }
    },
  );

  app.put('/api/admin/users/:userId/status',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('CHANGE_USER_STATUS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        try {
          var validatedData = updateUserStatusSchema.parse(req.body);
        } catch (error) {
          return res.status(400).json({ error: 'Geçersiz veri formatı' });
        }
        const { isActive } = validatedData;

        // Prevent self deactivation to avoid lockout
        if (userId === req.user!.id && !isActive) {
          return res.status(403).json({ error: 'Kendi hesabınızı pasif hale getiremezsiniz' });
        }

        const updatedUser = await storage.updateUserStatus(userId, isActive);
        if (!updatedUser) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Remove password for security
        const { password, ...safeUser } = updatedUser;

        res.json({
          message: `Kullanıcı ${isActive ? 'aktif' : 'pasif'} hale getirildi`,
          user: safeUser,
        });
      } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Kullanıcı durumu değiştirilirken hata oluştu' });
      }
    },
  );

  // JWT-based Admin User Management Routes
  app.get('/api/jwt/admin/users',
    requireJWTAuth,
    requireJWTPermission(Permission.MANAGE_USERS, Permission.VIEW_USERS),
    logJWTAccess('JWT_VIEW_ALL_USERS'),
    async (req: JWTAuthenticatedRequest, res) => {
      try {
        const users = await storage.getAllUsers();

        // Remove password from all users for security
        const safeUsers = users.map(({ password, ...user }) => user);

        res.json(safeUsers);
      } catch (error) {
        console.error('JWT Get all users error:', error);
        res.status(500).json({ error: 'Kullanıcılar yüklenirken hata oluştu' });
      }
    },
  );

  app.put('/api/jwt/admin/users/:userId/role',
    requireJWTAuth,
    requireJWTPermission(Permission.MANAGE_USERS),
    logJWTAccess('JWT_CHANGE_USER_ROLE'),
    async (req: JWTAuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        try {
          var validatedData = updateUserRoleSchema.parse(req.body);
        } catch (error) {
          return res.status(400).json({ error: 'Geçersiz veri formatı' });
        }
        const { role } = validatedData;

        // Prevent self role change to avoid lockout
        if (userId === req.user!.id) {
          return res.status(403).json({ error: 'Kendi rolünüzü değiştiremezsiniz' });
        }

        const updatedUser = await storage.updateUserRole(userId, role);
        if (!updatedUser) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Remove password for security
        const { password, ...safeUser } = updatedUser;

        res.json({
          message: 'Kullanıcı rolü başarıyla değiştirildi',
          user: safeUser,
        });
      } catch (error) {
        console.error('JWT Update user role error:', error);
        res.status(500).json({ error: 'Kullanıcı rolü değiştirilirken hata oluştu' });
      }
    },
  );

  app.put('/api/jwt/admin/users/:userId/status',
    requireJWTAuth,
    requireJWTPermission(Permission.MANAGE_USERS),
    logJWTAccess('JWT_CHANGE_USER_STATUS'),
    async (req: JWTAuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        try {
          var validatedData = updateUserStatusSchema.parse(req.body);
        } catch (error) {
          return res.status(400).json({ error: 'Geçersiz veri formatı' });
        }
        const { isActive } = validatedData;

        // Prevent self deactivation to avoid lockout
        if (userId === req.user!.id && !isActive) {
          return res.status(403).json({ error: 'Kendi hesabınızı pasif hale getiremezsiniz' });
        }

        const updatedUser = await storage.updateUserStatus(userId, isActive);
        if (!updatedUser) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Remove password for security
        const { password, ...safeUser } = updatedUser;

        res.json({
          message: `Kullanıcı ${isActive ? 'aktif' : 'pasif'} hale getirildi`,
          user: safeUser,
        });
      } catch (error) {
        console.error('JWT Update user status error:', error);
        res.status(500).json({ error: 'Kullanıcı durumu değiştirilirken hata oluştu' });
      }
    },
  );

  // JWT-based User Profile Routes
  app.get('/api/jwt/auth/me',
    requireJWTAuth,
    logJWTAccess('JWT_GET_PROFILE'),
    async (req: JWTAuthenticatedRequest, res) => {
      try {
        const user = await storage.getUser(req.user!.id);
        if (!user) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Remove password for security
        const { password, ...safeUser } = user;
        res.json({ user: safeUser });
      } catch (error) {
        console.error('JWT Get profile error:', error);
        res.status(500).json({ error: 'Profil bilgileri alınırken hata oluştu' });
      }
    },
  );

  app.put('/api/jwt/auth/profile',
    requireJWTAuth,
    logJWTAccess('JWT_UPDATE_PROFILE'),
    async (req: JWTAuthenticatedRequest, res) => {
      try {
        const { username, email } = req.body;

        // Validate input
        if (!username || !email) {
          return res.status(400).json({ error: 'Kullanıcı adı ve email gereklidir' });
        }

        // Check if email is already taken by another user
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user!.id) {
          return res.status(400).json({ error: 'Bu email adresi başka bir kullanıcı tarafından kullanılıyor' });
        }

        const updatedUser = await storage.updateUserProfile(req.user!.id, { username, email });
        if (!updatedUser) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Remove password for security
        const { password, ...safeUser } = updatedUser;

        res.json({
          message: 'Profil başarıyla güncellendi',
          user: safeUser,
        });
      } catch (error) {
        console.error('JWT Update profile error:', error);
        res.status(500).json({ error: 'Profil güncellenirken hata oluştu' });
      }
    },
  );

  // ==================== FIXED EXPENSES API ROUTES ====================

  // Get all fixed expenses
  app.get('/api/fixed-expenses',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_FIXED_EXPENSES'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const expenses = await storage.getFixedExpenses();
        res.json(expenses);
      } catch (error) {
        console.error('Get fixed expenses error:', error);
        res.status(500).json({ error: 'Sabit giderler yüklenirken hata oluştu' });
      }
    },
  );

  // Get specific fixed expense
  app.get('/api/fixed-expenses/:id',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_FIXED_EXPENSE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const expense = await storage.getFixedExpense(id);

        if (!expense) {
          return res.status(404).json({ error: 'Sabit gider bulunamadı' });
        }

        res.json(expense);
      } catch (error) {
        console.error('Get fixed expense error:', error);
        res.status(500).json({ error: 'Sabit gider yüklenirken hata oluştu' });
      }
    },
  );

  // Create new fixed expense
  app.post('/api/fixed-expenses',
    requireAuth,
    requirePermission(Permission.CREATE_PERSONAL_TRANSACTIONS, Permission.CREATE_COMPANY_TRANSACTIONS, Permission.CREATE_ALL_TRANSACTIONS),
    logAccess('CREATE_FIXED_EXPENSE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertFixedExpenseSchema.parse(req.body);

        // Check if user has access to the specified account
        if (validatedData.accountId) {
          const accounts = await storage.getAccounts();
          const account = accounts.find(acc => acc.id === validatedData.accountId);

          if (!account) {
            return res.status(404).json({ error: 'Hesap bulunamadı' });
          }

          // Check account type access based on user role
          if (req.user!.role === UserRole.PERSONAL_USER && account.type !== 'personal') {
            return res.status(403).json({ error: 'Bu hesap türüne erişim yetkiniz yok' });
          }
        }

        const expense = await storage.createFixedExpense(validatedData);

        res.status(201).json({
          message: 'Sabit gider başarıyla oluşturuldu',
          expense,
        });
      } catch (error) {
        console.error('Create fixed expense error:', error);
        res.status(400).json({ error: 'Sabit gider oluşturulurken hata oluştu' });
      }
    },
  );

  // Update fixed expense
  app.put('/api/fixed-expenses/:id',
    requireAuth,
    requirePermission(Permission.UPDATE_PERSONAL_TRANSACTIONS, Permission.UPDATE_COMPANY_TRANSACTIONS, Permission.UPDATE_ALL_TRANSACTIONS),
    logAccess('UPDATE_FIXED_EXPENSE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const updatedExpense = await storage.updateFixedExpense(id, updates);

        if (!updatedExpense) {
          return res.status(404).json({ error: 'Sabit gider bulunamadı' });
        }

        res.json({
          message: 'Sabit gider başarıyla güncellendi',
          expense: updatedExpense,
        });
      } catch (error) {
        console.error('Update fixed expense error:', error);
        res.status(500).json({ error: 'Sabit gider güncellenirken hata oluştu' });
      }
    },
  );

  // Delete fixed expense
  app.delete('/api/fixed-expenses/:id',
    requireAuth,
    requirePermission(Permission.DELETE_PERSONAL_TRANSACTIONS, Permission.DELETE_COMPANY_TRANSACTIONS, Permission.DELETE_ALL_TRANSACTIONS),
    logAccess('DELETE_FIXED_EXPENSE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;

        const deleted = await storage.deleteFixedExpense(id);

        if (!deleted) {
          return res.status(404).json({ error: 'Sabit gider bulunamadı' });
        }

        res.json({ message: 'Sabit gider başarıyla silindi' });
      } catch (error) {
        console.error('Delete fixed expense error:', error);
        res.status(500).json({ error: 'Sabit gider silinirken hata oluştu' });
      }
    },
  );

  // Process recurring expenses (admin only)
  app.post('/api/fixed-expenses/process',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('PROCESS_RECURRING_EXPENSES'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const result = await storage.processRecurringExpenses();

        res.json({
          message: `${result.processed} adet tekrarlayan gider işlendi`,
          processed: result.processed,
          transactions: result.transactions,
        });
      } catch (error) {
        console.error('Process recurring expenses error:', error);
        res.status(500).json({ error: 'Tekrarlayan giderler işlenirken hata oluştu' });
      }
    },
  );

  // ==================== INVESTMENT & PORTFOLIO API ROUTES ====================

  // Get all investments
  app.get('/api/investments',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_INVESTMENTS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const investments = await storage.getInvestments();
        res.json(investments);
      } catch (error) {
        console.error('Get investments error:', error);
        res.status(500).json({ error: 'Yatırımlar getirilirken hata oluştu' });
      }
    },
  );

  // Get portfolio summary
  app.get('/api/investments/portfolio',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_PORTFOLIO'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const portfolio = await storage.getPortfolioSummary();
        res.json(portfolio);
      } catch (error) {
        console.error('Get portfolio summary error:', error);
        res.status(500).json({ error: 'Portföy özeti getirilirken hata oluştu' });
      }
    },
  );

  // Get investments by type
  app.get('/api/investments/type/:type',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_INVESTMENTS_BY_TYPE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { type } = req.params;
        const investments = await storage.getInvestmentsByType(type);
        res.json(investments);
      } catch (error) {
        console.error('Get investments by type error:', error);
        res.status(500).json({ error: 'Yatırımlar türe göre getirilirken hata oluştu' });
      }
    },
  );

  // Get specific investment
  app.get('/api/investments/:id',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_INVESTMENT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const investment = await storage.getInvestment(id);

        if (!investment) {
          return res.status(404).json({ error: 'Yatırım bulunamadı' });
        }

        res.json(investment);
      } catch (error) {
        console.error('Get investment error:', error);
        res.status(500).json({ error: 'Yatırım getirilirken hata oluştu' });
      }
    },
  );

  // Create new investment
  app.post('/api/investments',
    requireAuth,
    requirePermission(Permission.CREATE_PERSONAL_TRANSACTIONS, Permission.CREATE_COMPANY_TRANSACTIONS, Permission.CREATE_ALL_TRANSACTIONS),
    logAccess('CREATE_INVESTMENT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertInvestmentSchema.parse(req.body);
        const investment = await storage.createInvestment(validatedData);
        res.status(201).json(investment);
      } catch (error) {
        console.error('Create investment error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
          res.status(400).json({ error: 'Geçersiz veri formatı', details: error.message });
        } else {
          res.status(500).json({ error: 'Yatırım oluşturulurken hata oluştu' });
        }
      }
    },
  );

  // Update investment
  app.put('/api/investments/:id',
    requireAuth,
    requirePermission(Permission.UPDATE_PERSONAL_TRANSACTIONS, Permission.UPDATE_COMPANY_TRANSACTIONS, Permission.UPDATE_ALL_TRANSACTIONS),
    logAccess('UPDATE_INVESTMENT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const validatedData = insertInvestmentSchema.partial().parse(req.body);

        const investment = await storage.updateInvestment(id, validatedData);

        if (!investment) {
          return res.status(404).json({ error: 'Yatırım bulunamadı' });
        }

        res.json(investment);
      } catch (error) {
        console.error('Update investment error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
          res.status(400).json({ error: 'Geçersiz veri formatı', details: error.message });
        } else {
          res.status(500).json({ error: 'Yatırım güncellenirken hata oluştu' });
        }
      }
    },
  );

  // Update investment price
  app.patch('/api/investments/:id/price',
    requireAuth,
    requirePermission(Permission.UPDATE_PERSONAL_TRANSACTIONS, Permission.UPDATE_COMPANY_TRANSACTIONS, Permission.UPDATE_ALL_TRANSACTIONS),
    logAccess('UPDATE_INVESTMENT_PRICE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const { currentPrice } = req.body;

        if (typeof currentPrice !== 'number' || currentPrice < 0) {
          return res.status(400).json({ error: 'Geçerli bir fiyat değeri giriniz' });
        }

        const investment = await storage.updateInvestmentPrice(id, currentPrice);

        if (!investment) {
          return res.status(404).json({ error: 'Yatırım bulunamadı' });
        }

        res.json(investment);
      } catch (error) {
        console.error('Update investment price error:', error);
        res.status(500).json({ error: 'Yatırım fiyatı güncellenirken hata oluştu' });
      }
    },
  );

  // Delete investment
  app.delete('/api/investments/:id',
    requireAuth,
    requirePermission(Permission.DELETE_PERSONAL_TRANSACTIONS, Permission.DELETE_COMPANY_TRANSACTIONS, Permission.DELETE_ALL_TRANSACTIONS),
    logAccess('DELETE_INVESTMENT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const success = await storage.deleteInvestment(id);

        if (!success) {
          return res.status(404).json({ error: 'Yatırım bulunamadı' });
        }

        res.json({ message: 'Yatırım başarıyla silindi' });
      } catch (error) {
        console.error('Delete investment error:', error);
        res.status(500).json({ error: 'Yatırım silinirken hata oluştu' });
      }
    },
  );

  // ==================== FORECAST & SCENARIO ANALYSIS API ROUTES ====================

  // Get all forecasts
  app.get('/api/forecasts',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_FORECASTS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const forecasts = await storage.getForecasts();
        res.json(forecasts);
      } catch (error) {
        console.error('Get forecasts error:', error);
        res.status(500).json({ error: 'Tahminler getirilirken hata oluştu' });
      }
    },
  );

  // Get active forecasts
  app.get('/api/forecasts/active',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_ACTIVE_FORECASTS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const forecasts = await storage.getActiveForecasts();
        res.json(forecasts);
      } catch (error) {
        console.error('Get active forecasts error:', error);
        res.status(500).json({ error: 'Aktif tahminler getirilirken hata oluştu' });
      }
    },
  );

  // Get forecasts by scenario
  app.get('/api/forecasts/scenario/:scenario',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_FORECASTS_BY_SCENARIO'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { scenario } = req.params;
        const forecasts = await storage.getForecastsByScenario(scenario);
        res.json(forecasts);
      } catch (error) {
        console.error('Get forecasts by scenario error:', error);
        res.status(500).json({ error: 'Senaryoya göre tahminler getirilirken hata oluştu' });
      }
    },
  );

  // Get specific forecast
  app.get('/api/forecasts/:id',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_FORECAST'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const forecast = await storage.getForecast(id);

        if (!forecast) {
          return res.status(404).json({ error: 'Tahmin bulunamadı' });
        }

        res.json(forecast);
      } catch (error) {
        console.error('Get forecast error:', error);
        res.status(500).json({ error: 'Tahmin getirilirken hata oluştu' });
      }
    },
  );

  // Create new forecast
  app.post('/api/forecasts',
    requireAuth,
    requirePermission(Permission.CREATE_PERSONAL_TRANSACTIONS, Permission.CREATE_COMPANY_TRANSACTIONS, Permission.CREATE_ALL_TRANSACTIONS),
    logAccess('CREATE_FORECAST'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertForecastSchema.parse(req.body);
        const forecast = await storage.createForecast(validatedData);
        res.status(201).json(forecast);
      } catch (error) {
        console.error('Create forecast error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
          res.status(400).json({ error: 'Geçersiz veri formatı', details: error.message });
        } else {
          res.status(500).json({ error: 'Tahmin oluşturulurken hata oluştu' });
        }
      }
    },
  );

  // Update forecast
  app.put('/api/forecasts/:id',
    requireAuth,
    requirePermission(Permission.UPDATE_PERSONAL_TRANSACTIONS, Permission.UPDATE_COMPANY_TRANSACTIONS, Permission.UPDATE_ALL_TRANSACTIONS),
    logAccess('UPDATE_FORECAST'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const validatedData = insertForecastSchema.partial().parse(req.body);

        const forecast = await storage.updateForecast(id, validatedData);

        if (!forecast) {
          return res.status(404).json({ error: 'Tahmin bulunamadı' });
        }

        res.json(forecast);
      } catch (error) {
        console.error('Update forecast error:', error);
        if (error instanceof Error && error.name === 'ZodError') {
          res.status(400).json({ error: 'Geçersiz veri formatı', details: error.message });
        } else {
          res.status(500).json({ error: 'Tahmin güncellenirken hata oluştu' });
        }
      }
    },
  );

  // Delete forecast
  app.delete('/api/forecasts/:id',
    requireAuth,
    requirePermission(Permission.DELETE_PERSONAL_TRANSACTIONS, Permission.DELETE_COMPANY_TRANSACTIONS, Permission.DELETE_ALL_TRANSACTIONS),
    logAccess('DELETE_FORECAST'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const success = await storage.deleteForecast(id);

        if (!success) {
          return res.status(404).json({ error: 'Tahmin bulunamadı' });
        }

        res.json({ message: 'Tahmin başarıyla silindi' });
      } catch (error) {
        console.error('Delete forecast error:', error);
        res.status(500).json({ error: 'Tahmin silinirken hata oluştu' });
      }
    },
  );

  // Get predefined scenarios
  app.get('/api/scenarios/predefined',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('VIEW_PREDEFINED_SCENARIOS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { ScenarioAnalysisService } = await import('./scenario-analysis-service');
        const service = new ScenarioAnalysisService(storage);
        const scenarios = await service.getScenarioForecasts();
        res.json(scenarios);
      } catch (error) {
        console.error('Get predefined scenarios error:', error);
        res.status(500).json({ error: 'Önceden tanımlanmış senaryolar getirilirken hata oluştu' });
      }
    },
  );

  // Analyze custom scenario
  app.post('/api/scenarios/analyze',
    requireAuth,
    requirePermission(Permission.CREATE_PERSONAL_TRANSACTIONS, Permission.CREATE_COMPANY_TRANSACTIONS, Permission.CREATE_ALL_TRANSACTIONS),
    logAccess('ANALYZE_SCENARIO'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { scenarioName, parameters } = req.body;

        if (!scenarioName || !parameters) {
          return res.status(400).json({ error: 'Senaryo adı ve parametreler gerekli' });
        }

        const { ScenarioAnalysisService } = await import('./scenario-analysis-service');
        const service = new ScenarioAnalysisService(storage);
        const result = await service.analyzeScenario(parameters, scenarioName);

        res.json(result);
      } catch (error) {
        console.error('Analyze scenario error:', error);
        res.status(500).json({ error: 'Senaryo analizi yapılırken hata oluştu' });
      }
    },
  );

  // Analyze predefined scenario
  app.post('/api/scenarios/analyze/:scenarioKey',
    requireAuth,
    requirePermission(Permission.CREATE_PERSONAL_TRANSACTIONS, Permission.CREATE_COMPANY_TRANSACTIONS, Permission.CREATE_ALL_TRANSACTIONS),
    logAccess('ANALYZE_PREDEFINED_SCENARIO'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { scenarioKey } = req.params;

        const { ScenarioAnalysisService } = await import('./scenario-analysis-service');
        const service = new ScenarioAnalysisService(storage);
        const scenarios = await service.getScenarioForecasts();

        const scenario = scenarios.find((s: any) =>
          s.scenario?.toLowerCase().replace(/\s+/g, '_') === scenarioKey,
        );

        if (!scenario) {
          return res.status(404).json({ error: 'Senaryo bulunamadı' });
        }

        const result = await service.analyzeScenario(
          scenario.parameters ? JSON.parse(scenario.parameters) : {},
          scenario.title,
        );

        res.json(result);
      } catch (error) {
        console.error('Analyze predefined scenario error:', error);
        res.status(500).json({ error: 'Önceden tanımlanmış senaryo analizi yapılırken hata oluştu' });
      }
    },
  );

  // ==================== TEAM MANAGEMENT API ROUTES ====================

  // Team CRUD routes
  app.post('/api/teams',
    requireAuth,
    logAccess('CREATE_TEAM'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertTeamSchema.parse(req.body);

        // Set the current user as the team owner
        const teamData = {
          ...validatedData,
          ownerId: req.user!.id,
        };

        const team = await storage.createTeam(teamData);

        // Automatically add the creator as team owner member
        await storage.addTeamMember({
          teamId: team.id,
          userId: req.user!.id,
          teamRole: 'owner',
          permissions: null,
          isActive: true,
        });

        res.json(team);
      } catch (error) {
        console.error('Create team error:', error);
        res.status(400).json({ error: 'Takım oluşturulurken hata oluştu' });
      }
    },
  );

  app.get('/api/teams',
    requireAuth,
    logAccess('VIEW_TEAMS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const teams = await storage.getTeamsByUserId(req.user!.id);
        res.json(teams);
      } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Takımlar yüklenirken hata oluştu' });
      }
    },
  );

  app.get('/api/teams/:teamId',
    requireAuth,
    logAccess('VIEW_TEAM_DETAILS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;

        // Check if user is a member of this team
        const teamMember = await storage.getTeamMember(teamId, req.user!.id);
        if (!teamMember) {
          return res.status(403).json({ error: 'Bu takıma erişim yetkiniz bulunmuyor' });
        }

        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ error: 'Takım bulunamadı' });
        }

        res.json(team);
      } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ error: 'Takım bilgileri yüklenirken hata oluştu' });
      }
    },
  );

  app.put('/api/teams/:teamId',
    requireAuth,
    logAccess('UPDATE_TEAM'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;

        // Check if user has team management permission
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !(userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN)) {
          return res.status(403).json({ error: 'Takım düzenleme yetkiniz bulunmuyor' });
        }

        // SECURITY FIX: Use secure update schema that only allows name/description
        const validatedData = updateTeamSchema.parse(req.body);
        const updatedTeam = await storage.updateTeam(teamId, validatedData);

        if (!updatedTeam) {
          return res.status(404).json({ error: 'Takım bulunamadı' });
        }

        res.json(updatedTeam);
      } catch (error) {
        console.error('Update team error:', error);
        res.status(400).json({ error: 'Takım güncellenirken hata oluştu' });
      }
    },
  );

  app.delete('/api/teams/:teamId',
    requireAuth,
    logAccess('DELETE_TEAM'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;

        // Only team owner can delete the team
        const team = await storage.getTeam(teamId);
        if (!team || team.ownerId !== req.user!.id) {
          return res.status(403).json({ error: 'Sadece takım sahibi takımı silebilir' });
        }

        const deleted = await storage.deleteTeam(teamId);
        if (!deleted) {
          return res.status(404).json({ error: 'Takım bulunamadı' });
        }

        res.json({ message: 'Takım başarıyla silindi' });
      } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Takım silinirken hata oluştu' });
      }
    },
  );

  // Team Member Management routes
  app.get('/api/teams/:teamId/members',
    requireAuth,
    logAccess('VIEW_TEAM_MEMBERS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;

        // Check if user is a member of this team
        const teamMember = await storage.getTeamMember(teamId, req.user!.id);
        if (!teamMember) {
          return res.status(403).json({ error: 'Bu takıma erişim yetkiniz bulunmuyor' });
        }

        const members = await storage.getTeamMembers(teamId);
        res.json(members);
      } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ error: 'Takım üyeleri yüklenirken hata oluştu' });
      }
    },
  );

  app.post('/api/teams/:teamId/members',
    requireAuth,
    logAccess('ADD_TEAM_MEMBER'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;

        // Check if user has invite members permission
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !hasTeamPermission(userRole as any, TeamPermission.INVITE_MEMBERS)) {
          return res.status(403).json({ error: 'Üye ekleme yetkiniz bulunmuyor' });
        }

        const validatedData = insertTeamMemberSchema.parse(req.body);
        const member = await storage.addTeamMember(validatedData);

        res.json(member);
      } catch (error) {
        console.error('Add team member error:', error);
        res.status(400).json({ error: 'Takım üyesi eklenirken hata oluştu' });
      }
    },
  );

  app.put('/api/teams/:teamId/members/:userId',
    requireAuth,
    logAccess('UPDATE_TEAM_MEMBER'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId, userId } = req.params;

        // SECURITY FIX: Check if user has manage roles permission OR is owner
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        const team = await storage.getTeam(teamId);

        const isOwner = team?.ownerId === req.user!.id;
        const hasManagePermission = userRole && (userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN);

        if (!isOwner && !hasManagePermission) {
          return res.status(403).json({ error: 'Rol düzenleme yetkiniz bulunmuyor' });
        }

        // SECURITY FIX: Prevent demoting/changing team owner
        if (team && team.ownerId === userId) {
          return res.status(403).json({ error: 'Takım sahibinin rolü değiştirilemez' });
        }

        const member = await storage.getTeamMember(teamId, userId);
        if (!member) {
          return res.status(404).json({ error: 'Takım üyesi bulunamadı' });
        }

        // SECURITY FIX: Restrict what can be updated - only teamRole allowed
        const allowedUpdates = { teamRole: req.body.teamRole };
        if (!allowedUpdates.teamRole) {
          return res.status(400).json({ error: 'Geçersiz güncelleme verisi' });
        }

        const updatedMember = await storage.updateTeamMember(member.id, allowedUpdates);

        res.json(updatedMember);
      } catch (error) {
        console.error('Update team member error:', error);
        res.status(400).json({ error: 'Takım üyesi güncellenirken hata oluştu' });
      }
    },
  );

  app.delete('/api/teams/:teamId/members/:userId',
    requireAuth,
    logAccess('REMOVE_TEAM_MEMBER'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId, userId } = req.params;

        // SECURITY FIX: Check if user has remove members permission OR is owner
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        const team = await storage.getTeam(teamId);

        const isOwner = team?.ownerId === req.user!.id;
        const hasRemovePermission = userRole && (userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN);

        if (!isOwner && !hasRemovePermission) {
          return res.status(403).json({ error: 'Üye çıkarma yetkiniz bulunmuyor' });
        }

        // SECURITY FIX: Cannot remove team owner - ENFORCED PROTECTION
        if (team && team.ownerId === userId) {
          return res.status(403).json({ error: 'Takım sahibi çıkarılamaz' });
        }

        // SECURITY FIX: Verify target member exists before removal
        const targetMember = await storage.getTeamMember(teamId, userId);
        if (!targetMember) {
          return res.status(404).json({ error: 'Takım üyesi bulunamadı' });
        }

        const removed = await storage.removeTeamMember(teamId, userId);
        if (!removed) {
          return res.status(500).json({ error: 'Takım üyesi çıkarılırken hata oluştu' });
        }

        res.json({
          message: 'Takım üyesi başarıyla çıkarıldı',
          removedUserId: userId,
        });
      } catch (error) {
        console.error('Remove team member error:', error);
        res.status(500).json({ error: 'Takım üyesi çıkarılırken hata oluştu' });
      }
    },
  );

  // Team Invite System routes
  app.post('/api/teams/:teamId/invites',
    requireAuth,
    logAccess('CREATE_TEAM_INVITE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;

        // Check if user has invite members permission
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !hasTeamPermission(userRole as any, TeamPermission.INVITE_MEMBERS)) {
          return res.status(403).json({ error: 'Davet gönderme yetkiniz bulunmuyor' });
        }

        const validatedData = inviteUserSchema.parse(req.body);

        // Generate invite token
        const inviteToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invite = await storage.createInvite({
          teamId: validatedData.teamId,
          inviterUserId: req.user!.id,
          invitedEmail: validatedData.email,
          invitedUserId: null,
          teamRole: validatedData.teamRole,
          status: 'pending',
          inviteToken,
          expiresAt,
        });

        // TODO: Send email invitation
        console.log(`Team invite created: ${inviteToken} for ${validatedData.email}`);

        res.json({
          message: 'Davet başarıyla gönderildi',
          inviteId: invite.id,
        });
      } catch (error) {
        console.error('Create invite error:', error);
        res.status(400).json({ error: 'Davet oluşturulurken hata oluştu' });
      }
    },
  );

  app.get('/api/teams/:teamId/invites',
    requireAuth,
    logAccess('VIEW_TEAM_INVITES'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;

        // Check if user has team management permission
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !hasTeamPermission(userRole as any, TeamPermission.MANAGE_TEAM)) {
          return res.status(403).json({ error: 'Davet görüntüleme yetkiniz bulunmuyor' });
        }

        const invites = await storage.getTeamInvites(teamId);
        res.json(invites);
      } catch (error) {
        console.error('Get team invites error:', error);
        res.status(500).json({ error: 'Davetler yüklenirken hata oluştu' });
      }
    },
  );

  app.post('/api/invites/accept',
    requireAuth,
    logAccess('ACCEPT_TEAM_INVITE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = acceptInviteSchema.parse(req.body);

        const invite = await storage.getInviteByToken(validatedData.token);
        if (!invite) {
          return res.status(404).json({ error: 'Geçersiz davet linki' });
        }

        // SECURITY FIX: Strict status and expiry checks
        if (invite.status !== 'pending') {
          return res.status(400).json({ error: 'Bu davet zaten işleme alınmış' });
        }

        // SECURITY FIX: Enforce expiry check
        const now = new Date();
        if (invite.expiresAt <= now) {
          await storage.updateInviteStatus(invite.id, 'expired');
          return res.status(400).json({ error: 'Davet süresi dolmuş' });
        }

        // SECURITY FIX: Strict email verification
        if (invite.invitedEmail !== req.user!.email) {
          return res.status(403).json({ error: 'Bu davet size gönderilmemiş' });
        }

        // SECURITY FIX: Check if user is already a team member
        const existingMember = await storage.getTeamMember(invite.teamId, req.user!.id);
        if (existingMember) {
          return res.status(400).json({ error: 'Bu takımın zaten üyesisiniz' });
        }

        // SECURITY FIX: Verify team still exists and is active
        const team = await storage.getTeam(invite.teamId);
        if (!team?.isActive) {
          return res.status(400).json({ error: 'Davet edilen takım artık mevcut değil' });
        }

        // Add user to team - atomic operation
        try {
          await storage.addTeamMember({
            teamId: invite.teamId,
            userId: req.user!.id,
            teamRole: invite.teamRole,
            permissions: null,
            isActive: true,
          });

          // Update invite status only after successful team addition
          await storage.updateInviteStatus(invite.id, 'accepted', req.user!.id);

          res.json({
            message: 'Takım davetini başarıyla kabul ettiniz',
            teamId: invite.teamId,
            teamName: team.name,
          });
        } catch (memberError) {
          console.error('Add team member error:', memberError);
          res.status(500).json({ error: 'Takıma katılım sırasında hata oluştu' });
        }
      } catch (error) {
        console.error('Accept invite error:', error);
        res.status(400).json({ error: 'Davet kabul edilirken hata oluştu' });
      }
    },
  );

  app.post('/api/invites/:inviteId/decline',
    requireAuth,
    logAccess('DECLINE_TEAM_INVITE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { inviteId } = req.params;

        const invite = await storage.getInvite(inviteId);
        if (!invite) {
          return res.status(404).json({ error: 'Davet bulunamadı' });
        }

        if (invite.invitedEmail !== req.user!.email) {
          return res.status(403).json({ error: 'Bu davet size gönderilmemiş' });
        }

        await storage.updateInviteStatus(inviteId, 'declined');

        res.json({ message: 'Takım daveti reddedildi' });
      } catch (error) {
        console.error('Decline invite error:', error);
        res.status(500).json({ error: 'Davet reddedilirken hata oluştu' });
      }
    },
  );

  app.get('/api/user/invites',
    requireAuth,
    logAccess('VIEW_USER_INVITES'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const invites = await storage.getPendingInvitesByEmail(req.user!.email);
        res.json(invites);
      } catch (error) {
        console.error('Get user invites error:', error);
        res.status(500).json({ error: 'Davetleriniz yüklenirken hata oluştu' });
      }
    },
  );

  // Export API routes - Protected by authentication
  app.get('/api/export/csv',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('EXPORT_CSV'),
    async (req: AuthenticatedRequest, res) => {
      try {
        // CSV writer handled manually for security
        const accounts = await storage.getAccounts();
        const transactions = await storage.getTransactions();

        // Filter accounts and transactions based on user role
        const allowedAccountIds = accounts
          .filter(account => {
            if (req.user!.role === UserRole.ADMIN) {
              return true;
            }
            if (req.user!.role === UserRole.COMPANY_USER) {
              return true;
            }
            if (req.user!.role === UserRole.PERSONAL_USER) {
              return account.type === 'personal';
            }
            return false;
          })
          .map(account => account.id);

        const filteredAccounts = accounts.filter(account =>
          allowedAccountIds.includes(account.id),
        );

        const filteredTransactions = transactions.filter(transaction =>
          allowedAccountIds.includes(transaction.accountId),
        );

        // Safe CSV escaping function to prevent injection
        const escapeCsvValue = (value: string | number): string => {
          if (value == null) {
            return '';
          }
          let escaped = String(value).trimStart(); // Remove leading whitespace
          // Neutralize formula injection (Excel formula prefixes)
          if (escaped.match(/^[=+\-@]/)) {
            escaped = `'${  escaped}`;
          }
          // Always wrap in quotes for safety
          escaped = `"${  escaped.replace(/"/g, '""')  }"`;
          return escaped;
        };

        // Create safe CSV data with UNIVERSAL escaping for all fields
        const csvData = filteredTransactions.map(transaction => {
          const account = filteredAccounts.find(acc => acc.id === transaction.accountId);
          const tipLabel = transaction.type === 'income' ? 'Gelir'
            : transaction.type === 'expense' ? 'Gider'
              : transaction.type === 'transfer_in' ? 'Gelen Virman'
                : 'Giden Virman';

          return {
            tarih: escapeCsvValue(new Date(transaction.date).toLocaleDateString('tr-TR')),
            hesap: escapeCsvValue(account ? account.bankName : 'Bilinmeyen'),
            tip: escapeCsvValue(tipLabel),
            miktar: escapeCsvValue(transaction.amount),
            aciklama: escapeCsvValue(transaction.description),
            kategori: escapeCsvValue(transaction.category || ''),
            para_birimi: escapeCsvValue(account ? account.currency : 'TRY'),
          };
        });

        // Set response headers
        const timestamp = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="finbot-islemler-${timestamp}.csv"`);

        // Add BOM for Turkish characters in Excel
        res.write('\uFEFF');

        // Write CSV header
        const headerRow = 'Tarih,Hesap,İşlem Tipi,Miktar,Açıklama,Kategori,Para Birimi\n';
        res.write(headerRow);

        // Write CSV data with safe escaping
        csvData.forEach(row => {
          const csvRow = `${row.tarih},${row.hesap},${row.tip},${row.miktar},${row.aciklama},${row.kategori},${row.para_birimi}\n`;
          res.write(csvRow);
        });

        res.end();
      } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ error: 'CSV export sırasında hata oluştu' });
      }
    },
  );

  app.get('/api/export/pdf',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('EXPORT_PDF'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const puppeteer = require('puppeteer');
        const accounts = await storage.getAccounts();
        const transactions = await storage.getTransactions();
        const dashboardStats = await storage.getDashboardStats();

        // Filter data based on user role
        const allowedAccountIds = accounts
          .filter(account => {
            if (req.user!.role === UserRole.ADMIN) {
              return true;
            }
            if (req.user!.role === UserRole.COMPANY_USER) {
              return true;
            }
            if (req.user!.role === UserRole.PERSONAL_USER) {
              return account.type === 'personal';
            }
            return false;
          })
          .map(account => account.id);

        const filteredAccounts = accounts.filter(account =>
          allowedAccountIds.includes(account.id),
        );

        const filteredTransactions = transactions.filter(transaction =>
          allowedAccountIds.includes(transaction.accountId),
        );

        const formatCurrency = (amount: string) => {
          const num = parseFloat(amount);
          return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
          }).format(num);
        };

        // HTML escape function to prevent XSS
        const escapeHtml = (unsafe: string): string => {
          if (unsafe == null) {
            return '';
          }
          return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };

        // Create HTML content for PDF
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>FinBot - Finansal Rapor</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; text-align: center; }
            h2 { color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .summary { display: flex; justify-content: space-around; margin: 30px 0; }
            .kpi { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .positive { color: #059669; }
            .negative { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>FinBot - Finansal Rapor</h1>
          <p style="text-align: center; color: #666;">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
          
          <div class="summary">
            <div class="kpi">
              <div>Toplam Nakit</div>
              <div class="kpi-value positive">${formatCurrency(dashboardStats.totalCash.toString())}</div>
            </div>
            <div class="kpi">
              <div>Toplam Borç</div>
              <div class="kpi-value negative">${formatCurrency(dashboardStats.totalDebt.toString())}</div>
            </div>
            <div class="kpi">
              <div>Net Bakiye</div>
              <div class="kpi-value">${formatCurrency(dashboardStats.totalBalance.toString())}</div>
            </div>
          </div>
          
          <h2>Hesaplar (${filteredAccounts.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Banka</th>
                <th>Hesap Adı</th>
                <th>Tip</th>
                <th>Bakiye</th>
                <th>Para Birimi</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAccounts.map(account => `
                <tr>
                  <td>${escapeHtml(account.bankName)}</td>
                  <td>${escapeHtml(account.accountName)}</td>
                  <td>${account.type === 'company' ? 'Şirket' : 'Kişisel'}</td>
                  <td class="${parseFloat(account.balance) >= 0 ? 'positive' : 'negative'}">${formatCurrency(account.balance)}</td>
                  <td>${escapeHtml(account.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h2>Son İşlemler (${filteredTransactions.slice(0, 20).length})</h2>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Hesap</th>
                <th>İşlem Tipi</th>
                <th>Miktar</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.slice(0, 20).map(transaction => {
    const account = filteredAccounts.find(acc => acc.id === transaction.accountId);
    const tipLabel = transaction.type === 'income' ? 'Gelir'
      : transaction.type === 'expense' ? 'Gider'
        : transaction.type === 'transfer_in' ? 'Gelen Virman' : 'Giden Virman';
    return `
                <tr>
                  <td>${escapeHtml(new Date(transaction.date).toLocaleDateString('tr-TR'))}</td>
                  <td>${escapeHtml(account ? account.bankName : 'Bilinmeyen')}</td>
                  <td>${escapeHtml(tipLabel)}</td>
                  <td class="${transaction.type === 'income' || transaction.type === 'transfer_in' ? 'positive' : 'negative'}">${formatCurrency(transaction.amount)}</td>
                  <td>${escapeHtml(transaction.description)}</td>
                </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </body>
        </html>
        `;

        // Generate PDF with hardened Puppeteer settings and proper resource management
        let browser = null;
        let pdfBuffer;
        try {
          browser = await puppeteer.launch({
            headless: 'new',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
            ],
          });
          const page = await browser.newPage();
          await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

          pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
          });
        } finally {
          if (browser) {
            await browser.close();
          }
        }

        // Set response headers
        const timestamp = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="finbot-rapor-${timestamp}.pdf"`);

        res.send(pdfBuffer);
      } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({ error: 'PDF export sırasında hata oluştu' });
      }
    },
  );

  app.post('/api/export/google-sheets',
    requireAuth,
    requirePermission(Permission.VIEW_PERSONAL_TRANSACTIONS, Permission.VIEW_COMPANY_TRANSACTIONS, Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('EXPORT_GOOGLE_SHEETS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { google } = require('googleapis');
        const { JWT } = require('google-auth-library');

        // Initialize Google Sheets API with service account
        const auth = new JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
          return res.status(500).json({
            error: 'Google Sheets konfigürasyonu eksik',
            message: 'Gerekli environment değişkenleri ayarlanmamış',
          });
        }

        // Get data similar to CSV export
        const accounts = await storage.getAccounts();
        const transactions = await storage.getTransactions();

        // Filter data based on user role
        const allowedAccountIds = accounts
          .filter(account => {
            if (req.user!.role === UserRole.ADMIN) {
              return true;
            }
            if (req.user!.role === UserRole.COMPANY_USER) {
              return true;
            }
            if (req.user!.role === UserRole.PERSONAL_USER) {
              return account.type === 'personal';
            }
            return false;
          })
          .map(account => account.id);

        const filteredAccounts = accounts.filter(account =>
          allowedAccountIds.includes(account.id),
        );

        const filteredTransactions = transactions.filter(transaction =>
          allowedAccountIds.includes(transaction.accountId),
        );

        // Prepare data for Google Sheets
        const headers = ['Tarih', 'Hesap', 'Tip', 'Miktar', 'Açıklama', 'Kategori'];
        const sheetData = [headers];

        filteredTransactions.forEach(transaction => {
          const account = filteredAccounts.find(acc => acc.id === transaction.accountId);
          const tipLabel = transaction.type === 'income' ? 'Gelir'
            : transaction.type === 'expense' ? 'Gider'
              : transaction.type === 'transfer_in' ? 'Gelen Virman'
                : 'Giden Virman';

          sheetData.push([
            new Date(transaction.date).toLocaleDateString('tr-TR'),
            account ? account.bankName : 'Bilinmeyen',
            tipLabel,
            transaction.amount,
            transaction.description,
            transaction.category || '',
          ]);
        });

        // Create a new worksheet with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const worksheetTitle = `FinBot-${timestamp}`;

        // First, create the spreadsheet or add a new sheet
        try {
          // Try to add a new sheet to the existing spreadsheet
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
              requests: [{
                addSheet: {
                  properties: {
                    title: worksheetTitle,
                    gridProperties: {
                      rowCount: sheetData.length + 10,
                      columnCount: headers.length,
                    },
                  },
                },
              }],
            },
          });
        } catch (error) {
          console.error('Error creating new sheet:', error);
          // If we can't create a new sheet, we'll use the first sheet
        }

        // Write data to the sheet
        const range = `${worksheetTitle}!A1:${String.fromCharCode(65 + headers.length - 1)}${sheetData.length}`;

        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: {
              values: sheetData,
            },
          });
        } catch (error) {
          // Fallback to Sheet1 if the named sheet doesn't work
          const fallbackRange = `Sheet1!A1:${String.fromCharCode(65 + headers.length - 1)}${sheetData.length}`;
          await sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A:Z',
          });

          await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: fallbackRange,
            valueInputOption: 'RAW',
            resource: {
              values: sheetData,
            },
          });
        }

        // Generate the Google Sheets URL
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

        res.json({
          message: "Veriler Google Sheets'e başarıyla aktarıldı",
          url: sheetUrl,
          worksheetTitle: worksheetTitle,
          recordCount: filteredTransactions.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Google Sheets export error:', error);
        res.status(500).json({
          error: 'Google Sheets export sırasında hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
      }
    },
  );

  // System Alerts API Routes
  app.get('/api/alerts',
    requireAuth,
    logAccess('VIEW_ALERTS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const alerts = await storage.getActiveSystemAlerts();
        res.json(alerts);
      } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Uyarılar yüklenirken hata oluştu' });
      }
    },
  );

  app.get('/api/alerts/all',
    requireAuth,
    requirePermission(Permission.MANAGE_SETTINGS), // Only admins can see all alerts
    logAccess('VIEW_ALL_ALERTS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const alerts = await storage.getSystemAlerts();
        res.json(alerts);
      } catch (error) {
        console.error('Get all alerts error:', error);
        res.status(500).json({ error: 'Tüm uyarılar yüklenirken hata oluştu' });
      }
    },
  );

  app.post('/api/alerts/:alertId/dismiss',
    requireAuth,
    logAccess('DISMISS_ALERT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { alertId } = req.params;
        const alert = await storage.dismissSystemAlert(alertId);

        if (!alert) {
          return res.status(404).json({ error: 'Uyarı bulunamadı' });
        }

        res.json({ message: 'Uyarı başarıyla kapatıldı', alert });
      } catch (error) {
        console.error('Dismiss alert error:', error);
        res.status(500).json({ error: 'Uyarı kapatılırken hata oluştu' });
      }
    },
  );

  app.post('/api/alerts/run-checks',
    requireAuth,
    requirePermission(Permission.MANAGE_SETTINGS), // Only admins can trigger checks
    logAccess('RUN_ALERT_CHECKS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await alertService.runAllChecks();
        res.json({ message: 'Uyarı kontrolleri başarıyla çalıştırıldı' });
      } catch (error) {
        console.error('Run alert checks error:', error);
        res.status(500).json({ error: 'Uyarı kontrolleri çalıştırılırken hata oluştu' });
      }
    },
  );

  app.post('/api/alerts',
    requireAuth,
    requirePermission(Permission.MANAGE_SETTINGS),
    logAccess('CREATE_ALERT'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const alertData = insertSystemAlertSchema.parse(req.body);
        const alert = await storage.createSystemAlert(alertData);
        res.status(201).json(alert);
      } catch (error) {
        console.error('Create alert error:', error);
        res.status(400).json({ error: 'Uyarı oluşturulurken hata oluştu' });
      }
    },
  );

  // Transaction JSON Service API Routes
  app.post('/api/transactions/export-json',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('EXPORT_TRANSACTIONS_JSON'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const result = await transactionJsonService.exportTransactionsToJson();

        if (result.success) {
          res.json({
            message: result.message,
            filePath: result.filePath,
            success: true,
          });
        } else {
          res.status(400).json({
            error: result.message,
            success: false,
          });
        }
      } catch (error) {
        console.error('Export transactions JSON error:', error);
        res.status(500).json({ error: "İşlemler JSON'a aktarılırken hata oluştu" });
      }
    },
  );

  app.post('/api/transactions/import-json',
    requireAuth,
    requirePermission(Permission.MANAGE_SETTINGS),
    logAccess('IMPORT_TRANSACTIONS_JSON'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = importTransactionJsonSchema.parse(req.body);
        const result = await transactionJsonService.importTransactionsFromJson(validatedData.overwriteExisting);

        if (result.success) {
          res.json({
            message: result.message,
            importedCount: result.importedCount,
            success: true,
          });
        } else {
          res.status(400).json({
            error: result.message,
            success: false,
          });
        }
      } catch (error) {
        console.error('Import transactions JSON error:', error);
        res.status(500).json({ error: "JSON'dan işlemler içe aktarılırken hata oluştu" });
      }
    },
  );

  app.get('/api/transactions/json-status',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('CHECK_TRANSACTIONS_JSON'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const status = await transactionJsonService.checkJsonFile();
        res.json(status);
      } catch (error) {
        console.error('Check transactions JSON status error:', error);
        res.status(500).json({ error: 'JSON dosya durumu kontrol edilirken hata oluştu' });
      }
    },
  );

  app.post('/api/transactions/export-json-by-date',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('EXPORT_TRANSACTIONS_JSON_BY_DATE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = exportTransactionsByDateSchema.parse(req.body);

        const result = await transactionJsonService.exportTransactionsByDateRange(
          new Date(validatedData.startDate),
          new Date(validatedData.endDate),
        );

        if (result.success) {
          res.json({
            message: result.message,
            filePath: result.filePath,
            success: true,
          });
        } else {
          res.status(400).json({
            error: result.message,
            success: false,
          });
        }
      } catch (error) {
        console.error('Export transactions by date JSON error:', error);
        res.status(500).json({ error: "Tarihli işlemler JSON'a aktarılırken hata oluştu" });
      }
    },
  );

  app.post('/api/transactions/export-category-analysis',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_TRANSACTIONS),
    logAccess('EXPORT_CATEGORY_ANALYSIS_JSON'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const result = await transactionJsonService.exportCategoryAnalysisToJson();

        if (result.success) {
          res.json({
            message: result.message,
            filePath: result.filePath,
            success: true,
          });
        } else {
          res.status(400).json({
            error: result.message,
            success: false,
          });
        }
      } catch (error) {
        console.error('Export category analysis JSON error:', error);
        res.status(500).json({ error: "Kategori analizi JSON'a aktarılırken hata oluştu" });
      }
    },
  );

  // =====================
  // AI ROUTES
  // =====================

  // Get AI settings (Admin only)
  app.get('/api/admin/ai/settings',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('VIEW_AI_SETTINGS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const settings = openaiService.getSettings();
        // Don't return the actual API key for security
        const safeSettings = {
          ...settings,
          apiKey: settings.apiKey ? '***hidden***' : null,
        };
        res.json(safeSettings);
      } catch (error) {
        res.status(500).json({ error: 'AI ayarları yüklenirken hata oluştu' });
      }
    },
  );

  // Update AI settings (Admin only)
  app.put('/api/admin/ai/settings',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('UPDATE_AI_SETTINGS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { provider, apiKey, isActive, defaultModel, cacheDuration, maxTokens, temperature } = req.body;

        await openaiService.updateSettings({
          provider,
          apiKey,
          isActive,
          defaultModel,
          cacheDuration,
        });

        res.json({ message: 'AI ayarları güncellendi' });
      } catch (error) {
        res.status(400).json({ error: 'AI ayarları güncellenirken hata oluştu' });
      }
    },
  );

  // Test AI connection (Admin only)
  app.post('/api/admin/ai/test',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('TEST_AI_CONNECTION'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const result = await openaiService.testConnection();
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Bağlantı testi sırasında hata oluştu',
        });
      }
    },
  );

  // Generate AI response (Authenticated users - supports both JWT and Session)
  app.post('/api/ai/generate',
    async (req: AuthenticatedRequest, res, next) => {
      // Try JWT auth first, fallback to session auth
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null;

      if (token) {
        // Use JWT auth
        return requireJWTAuth(req, res, next);
      } else {
        // Use session auth
        return requireAuth(req, res, next);
      }
    },
    logAccess('GENERATE_AI_RESPONSE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { query, persona } = req.body;

        if (!query || typeof query !== 'string') {
          return res.status(400).json({ error: 'Sorgu metni gereklidir' });
        }

        const response = await openaiService.generateResponse(query, persona || 'default');

        if (!response.success) {
          return res.status(500).json({ error: response.error || 'AI yanıtı oluşturulamadı' });
        }

        res.json({
          response: response.response,
          model: response.model,
          cached: response.cached || false,
        });
      } catch (error) {
        res.status(500).json({ error: 'AI yanıtı oluşturulurken hata oluştu' });
      }
    },
  );

  // Get AI cache stats (Admin only)
  app.get('/api/admin/ai/cache/stats',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('VIEW_AI_CACHE_STATS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        // Cache stats not available - return empty stats
        res.json({ hits: 0, misses: 0, size: 0 });
      } catch (error) {
        res.status(500).json({ error: 'Cache istatistikleri yüklenirken hata oluştu' });
      }
    },
  );

  // Clear AI cache (Admin only)
  app.post('/api/admin/ai/cache/clear',
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess('CLEAR_AI_CACHE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        openaiService.clearCache();
        res.json({ message: 'AI cache temizlendi' });
      } catch (error) {
        res.status(500).json({ error: 'Cache temizlenirken hata oluştu' });
      }
    },
  );

  // ===================================
  // TENANT ROUTES (White-Label)
  // ===================================
  app.use('/api/tenants', tenantsRouter);

  // ===================================
  // INVESTMENT & PORTFOLIO ROUTES
  // ===================================
  app.use('/api/investments', requireAuth, investmentsRouter);
  app.use('/api/portfolio', requireAuth, portfolioRouter);

  // ===================================
  // AI AGENTS ROUTES
  // ===================================
  app.use('/api/ai-agents', requireAuth, aiAgentsRouter);

  // ===================================
  // RISK ANALYSIS ROUTES
  // ===================================
  app.use('/api/risk', requireAuth, riskRouter(Router()));

  // ===================================
  // SIMULATION ROUTES
  // ===================================
  app.use('/api/simulation', requireAuth, simulationRouter(Router()));

  // ===================================
  // ADVISOR ROUTES
  // ===================================
  app.use('/api/advisor', requireAuth, advisorRouter(Router()));

  // ===================================
  // EMAIL VERIFICATION ROUTES
  // ===================================
  app.use('/api/email-verification', emailVerificationRouter);

  // ===================================
  // BUDGET LINES ROUTES
  // ===================================
  app.use('/api/budget-lines', budgetLinesRouter);

  // ===================================
  // EXPORT ROUTES
  // ===================================
  app.use('/api/export', exportRouter);

  // ===================================
  // RECURRING TRANSACTIONS ROUTES
  // ===================================
  app.use('/api/recurring', recurringRouter);

  // ===================================
  // BUDGET COMPARE ROUTES
  // ===================================
  app.use('/api/budget', budgetCompareRouter);

  // ===================================
  // SCENARIO ANALYSIS ROUTES
  // ===================================
  app.use('/api/scenario', scenarioRouter);

  const httpServer = createServer(app);
  return httpServer;
}

