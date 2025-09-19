import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertTransactionSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, insertTeamSchema, updateTeamSchema, insertTeamMemberSchema, inviteUserSchema, acceptInviteSchema, Permission, UserRole, TeamPermission, hasTeamPermission, TeamRole } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { requireAuth, requirePermission, requireAccountTypeAccess, optionalAuth, logAccess, AuthenticatedRequest } from "./middleware/auth";
import { updateUserRoleSchema, updateUserStatusSchema } from "@shared/schema";

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
      
      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({
          error: "Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin",
          code: "ACCOUNT_INACTIVE"
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
        isActive: user.isActive
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

  // Admin User Management Routes
  app.get("/api/admin/users",
    requireAuth,
    requirePermission(Permission.MANAGE_USERS, Permission.VIEW_USERS),
    logAccess("VIEW_ALL_USERS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const users = await storage.getAllUsers();
        
        // Remove password from all users for security
        const safeUsers = users.map(({ password, ...user }) => user);
        
        res.json(safeUsers);
      } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({ error: "Kullanıcılar yüklenirken hata oluştu" });
      }
    }
  );

  app.put("/api/admin/users/:userId/role",
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess("CHANGE_USER_ROLE"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        try {
          var validatedData = updateUserRoleSchema.parse(req.body);
        } catch (error) {
          return res.status(400).json({ error: "Geçersiz veri formatı" });
        }
        const { role } = validatedData;

        // Prevent self role change to avoid lockout
        if (userId === req.user!.id) {
          return res.status(403).json({ error: "Kendi rolünüzü değiştiremezsiniz" });
        }

        const updatedUser = await storage.updateUserRole(userId, role);
        if (!updatedUser) {
          return res.status(404).json({ error: "Kullanıcı bulunamadı" });
        }

        // Remove password for security
        const { password, ...safeUser } = updatedUser;
        
        res.json({ 
          message: "Kullanıcı rolü başarıyla değiştirildi",
          user: safeUser 
        });
      } catch (error) {
        console.error("Update user role error:", error);
        res.status(500).json({ error: "Rol değiştirilirken hata oluştu" });
      }
    }
  );

  app.put("/api/admin/users/:userId/status",
    requireAuth,
    requirePermission(Permission.MANAGE_USERS),
    logAccess("CHANGE_USER_STATUS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        try {
          var validatedData = updateUserStatusSchema.parse(req.body);
        } catch (error) {
          return res.status(400).json({ error: "Geçersiz veri formatı" });
        }
        const { isActive } = validatedData;

        // Prevent self deactivation to avoid lockout
        if (userId === req.user!.id && !isActive) {
          return res.status(403).json({ error: "Kendi hesabınızı pasif hale getiremezsiniz" });
        }

        const updatedUser = await storage.updateUserStatus(userId, isActive);
        if (!updatedUser) {
          return res.status(404).json({ error: "Kullanıcı bulunamadı" });
        }

        // Remove password for security
        const { password, ...safeUser } = updatedUser;
        
        res.json({ 
          message: `Kullanıcı ${isActive ? 'aktif' : 'pasif'} hale getirildi`,
          user: safeUser 
        });
      } catch (error) {
        console.error("Update user status error:", error);
        res.status(500).json({ error: "Kullanıcı durumu değiştirilirken hata oluştu" });
      }
    }
  );

  // ==================== TEAM MANAGEMENT API ROUTES ====================

  // Team CRUD routes
  app.post("/api/teams",
    requireAuth,
    logAccess("CREATE_TEAM"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = insertTeamSchema.parse(req.body);
        
        // Set the current user as the team owner
        const teamData = {
          ...validatedData,
          ownerId: req.user!.id
        };
        
        const team = await storage.createTeam(teamData);
        
        // Automatically add the creator as team owner member
        await storage.addTeamMember({
          teamId: team.id,
          userId: req.user!.id,
          teamRole: 'owner',
          permissions: null,
          isActive: true
        });
        
        res.json(team);
      } catch (error) {
        console.error("Create team error:", error);
        res.status(400).json({ error: "Takım oluşturulurken hata oluştu" });
      }
    }
  );

  app.get("/api/teams",
    requireAuth,
    logAccess("VIEW_TEAMS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const teams = await storage.getTeamsByUserId(req.user!.id);
        res.json(teams);
      } catch (error) {
        console.error("Get teams error:", error);
        res.status(500).json({ error: "Takımlar yüklenirken hata oluştu" });
      }
    }
  );

  app.get("/api/teams/:teamId",
    requireAuth,
    logAccess("VIEW_TEAM_DETAILS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;
        
        // Check if user is a member of this team
        const teamMember = await storage.getTeamMember(teamId, req.user!.id);
        if (!teamMember) {
          return res.status(403).json({ error: "Bu takıma erişim yetkiniz bulunmuyor" });
        }
        
        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ error: "Takım bulunamadı" });
        }
        
        res.json(team);
      } catch (error) {
        console.error("Get team error:", error);
        res.status(500).json({ error: "Takım bilgileri yüklenirken hata oluştu" });
      }
    }
  );

  app.put("/api/teams/:teamId",
    requireAuth,
    logAccess("UPDATE_TEAM"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;
        
        // Check if user has team management permission  
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !(userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN)) {
          return res.status(403).json({ error: "Takım düzenleme yetkiniz bulunmuyor" });
        }
        
        // SECURITY FIX: Use secure update schema that only allows name/description
        const validatedData = updateTeamSchema.parse(req.body);
        const updatedTeam = await storage.updateTeam(teamId, validatedData);
        
        if (!updatedTeam) {
          return res.status(404).json({ error: "Takım bulunamadı" });
        }
        
        res.json(updatedTeam);
      } catch (error) {
        console.error("Update team error:", error);
        res.status(400).json({ error: "Takım güncellenirken hata oluştu" });
      }
    }
  );

  app.delete("/api/teams/:teamId",
    requireAuth,
    logAccess("DELETE_TEAM"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;
        
        // Only team owner can delete the team
        const team = await storage.getTeam(teamId);
        if (!team || team.ownerId !== req.user!.id) {
          return res.status(403).json({ error: "Sadece takım sahibi takımı silebilir" });
        }
        
        const deleted = await storage.deleteTeam(teamId);
        if (!deleted) {
          return res.status(404).json({ error: "Takım bulunamadı" });
        }
        
        res.json({ message: "Takım başarıyla silindi" });
      } catch (error) {
        console.error("Delete team error:", error);
        res.status(500).json({ error: "Takım silinirken hata oluştu" });
      }
    }
  );

  // Team Member Management routes
  app.get("/api/teams/:teamId/members",
    requireAuth,
    logAccess("VIEW_TEAM_MEMBERS"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;
        
        // Check if user is a member of this team
        const teamMember = await storage.getTeamMember(teamId, req.user!.id);
        if (!teamMember) {
          return res.status(403).json({ error: "Bu takıma erişim yetkiniz bulunmuyor" });
        }
        
        const members = await storage.getTeamMembers(teamId);
        res.json(members);
      } catch (error) {
        console.error("Get team members error:", error);
        res.status(500).json({ error: "Takım üyeleri yüklenirken hata oluştu" });
      }
    }
  );

  app.post("/api/teams/:teamId/members",
    requireAuth,
    logAccess("ADD_TEAM_MEMBER"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;
        
        // Check if user has invite members permission
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !hasTeamPermission(userRole as any, TeamPermission.INVITE_MEMBERS)) {
          return res.status(403).json({ error: "Üye ekleme yetkiniz bulunmuyor" });
        }
        
        const validatedData = insertTeamMemberSchema.parse(req.body);
        const member = await storage.addTeamMember(validatedData);
        
        res.json(member);
      } catch (error) {
        console.error("Add team member error:", error);
        res.status(400).json({ error: "Takım üyesi eklenirken hata oluştu" });
      }
    }
  );

  app.put("/api/teams/:teamId/members/:userId",
    requireAuth,
    logAccess("UPDATE_TEAM_MEMBER"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId, userId } = req.params;
        
        // SECURITY FIX: Check if user has manage roles permission OR is owner
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        const team = await storage.getTeam(teamId);
        
        const isOwner = team?.ownerId === req.user!.id;
        const hasManagePermission = userRole && (userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN);
        
        if (!isOwner && !hasManagePermission) {
          return res.status(403).json({ error: "Rol düzenleme yetkiniz bulunmuyor" });
        }
        
        // SECURITY FIX: Prevent demoting/changing team owner
        if (team && team.ownerId === userId) {
          return res.status(403).json({ error: "Takım sahibinin rolü değiştirilemez" });
        }
        
        const member = await storage.getTeamMember(teamId, userId);
        if (!member) {
          return res.status(404).json({ error: "Takım üyesi bulunamadı" });
        }
        
        // SECURITY FIX: Restrict what can be updated - only teamRole allowed 
        const allowedUpdates = { teamRole: req.body.teamRole };
        if (!allowedUpdates.teamRole) {
          return res.status(400).json({ error: "Geçersiz güncelleme verisi" });
        }
        
        const updatedMember = await storage.updateTeamMember(member.id, allowedUpdates);
        
        res.json(updatedMember);
      } catch (error) {
        console.error("Update team member error:", error);
        res.status(400).json({ error: "Takım üyesi güncellenirken hata oluştu" });
      }
    }
  );

  app.delete("/api/teams/:teamId/members/:userId",
    requireAuth,
    logAccess("REMOVE_TEAM_MEMBER"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId, userId } = req.params;
        
        // SECURITY FIX: Check if user has remove members permission OR is owner
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        const team = await storage.getTeam(teamId);
        
        const isOwner = team?.ownerId === req.user!.id;
        const hasRemovePermission = userRole && (userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN);
        
        if (!isOwner && !hasRemovePermission) {
          return res.status(403).json({ error: "Üye çıkarma yetkiniz bulunmuyor" });
        }
        
        // SECURITY FIX: Cannot remove team owner - ENFORCED PROTECTION
        if (team && team.ownerId === userId) {
          return res.status(403).json({ error: "Takım sahibi çıkarılamaz" });
        }
        
        // SECURITY FIX: Verify target member exists before removal
        const targetMember = await storage.getTeamMember(teamId, userId);
        if (!targetMember) {
          return res.status(404).json({ error: "Takım üyesi bulunamadı" });
        }
        
        const removed = await storage.removeTeamMember(teamId, userId);
        if (!removed) {
          return res.status(500).json({ error: "Takım üyesi çıkarılırken hata oluştu" });
        }
        
        res.json({ 
          message: "Takım üyesi başarıyla çıkarıldı",
          removedUserId: userId
        });
      } catch (error) {
        console.error("Remove team member error:", error);
        res.status(500).json({ error: "Takım üyesi çıkarılırken hata oluştu" });
      }
    }
  );

  // Team Invite System routes
  app.post("/api/teams/:teamId/invites",
    requireAuth,
    logAccess("CREATE_TEAM_INVITE"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;
        
        // Check if user has invite members permission
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !hasTeamPermission(userRole as any, TeamPermission.INVITE_MEMBERS)) {
          return res.status(403).json({ error: "Davet gönderme yetkiniz bulunmuyor" });
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
          expiresAt
        });
        
        // TODO: Send email invitation
        console.log(`Team invite created: ${inviteToken} for ${validatedData.email}`);
        
        res.json({ 
          message: "Davet başarıyla gönderildi",
          inviteId: invite.id
        });
      } catch (error) {
        console.error("Create invite error:", error);
        res.status(400).json({ error: "Davet oluşturulurken hata oluştu" });
      }
    }
  );

  app.get("/api/teams/:teamId/invites",
    requireAuth,
    logAccess("VIEW_TEAM_INVITES"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { teamId } = req.params;
        
        // Check if user has team management permission
        const userRole = await storage.getUserTeamRole(teamId, req.user!.id);
        if (!userRole || !hasTeamPermission(userRole as any, TeamPermission.MANAGE_TEAM)) {
          return res.status(403).json({ error: "Davet görüntüleme yetkiniz bulunmuyor" });
        }
        
        const invites = await storage.getTeamInvites(teamId);
        res.json(invites);
      } catch (error) {
        console.error("Get team invites error:", error);
        res.status(500).json({ error: "Davetler yüklenirken hata oluştu" });
      }
    }
  );

  app.post("/api/invites/accept",
    requireAuth,
    logAccess("ACCEPT_TEAM_INVITE"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const validatedData = acceptInviteSchema.parse(req.body);
        
        const invite = await storage.getInviteByToken(validatedData.token);
        if (!invite) {
          return res.status(404).json({ error: "Geçersiz davet linki" });
        }
        
        // SECURITY FIX: Strict status and expiry checks
        if (invite.status !== 'pending') {
          return res.status(400).json({ error: "Bu davet zaten işleme alınmış" });
        }
        
        // SECURITY FIX: Enforce expiry check
        const now = new Date();
        if (invite.expiresAt <= now) {
          await storage.updateInviteStatus(invite.id, 'expired');
          return res.status(400).json({ error: "Davet süresi dolmuş" });
        }
        
        // SECURITY FIX: Strict email verification
        if (invite.invitedEmail !== req.user!.email) {
          return res.status(403).json({ error: "Bu davet size gönderilmemiş" });
        }
        
        // SECURITY FIX: Check if user is already a team member
        const existingMember = await storage.getTeamMember(invite.teamId, req.user!.id);
        if (existingMember) {
          return res.status(400).json({ error: "Bu takımın zaten üyesisiniz" });
        }
        
        // SECURITY FIX: Verify team still exists and is active
        const team = await storage.getTeam(invite.teamId);
        if (!team || !team.isActive) {
          return res.status(400).json({ error: "Davet edilen takım artık mevcut değil" });
        }
        
        // Add user to team - atomic operation
        try {
          await storage.addTeamMember({
            teamId: invite.teamId,
            userId: req.user!.id,
            teamRole: invite.teamRole,
            permissions: null,
            isActive: true
          });
          
          // Update invite status only after successful team addition
          await storage.updateInviteStatus(invite.id, 'accepted', req.user!.id);
          
          res.json({ 
            message: "Takım davetini başarıyla kabul ettiniz",
            teamId: invite.teamId,
            teamName: team.name
          });
        } catch (memberError) {
          console.error("Add team member error:", memberError);
          res.status(500).json({ error: "Takıma katılım sırasında hata oluştu" });
        }
        
      } catch (error) {
        console.error("Accept invite error:", error);
        res.status(400).json({ error: "Davet kabul edilirken hata oluştu" });
      }
    }
  );

  app.post("/api/invites/:inviteId/decline",
    requireAuth,
    logAccess("DECLINE_TEAM_INVITE"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { inviteId } = req.params;
        
        const invite = await storage.getInvite(inviteId);
        if (!invite) {
          return res.status(404).json({ error: "Davet bulunamadı" });
        }
        
        if (invite.invitedEmail !== req.user!.email) {
          return res.status(403).json({ error: "Bu davet size gönderilmemiş" });
        }
        
        await storage.updateInviteStatus(inviteId, 'declined');
        
        res.json({ message: "Takım daveti reddedildi" });
      } catch (error) {
        console.error("Decline invite error:", error);
        res.status(500).json({ error: "Davet reddedilirken hata oluştu" });
      }
    }
  );

  app.get("/api/user/invites",
    requireAuth,
    logAccess("VIEW_USER_INVITES"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const invites = await storage.getPendingInvitesByEmail(req.user!.email);
        res.json(invites);
      } catch (error) {
        console.error("Get user invites error:", error);
        res.status(500).json({ error: "Davetleriniz yüklenirken hata oluştu" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
