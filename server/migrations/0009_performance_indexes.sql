-- Performance optimization indexes
-- Created: 2025-01-06

-- Portfolio performance indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_userid ON portfolios (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios (created_at);
CREATE INDEX IF NOT EXISTS idx_portfolios_is_active ON portfolios (is_active);

-- Positions performance indexes  
CREATE INDEX IF NOT EXISTS idx_positions_portfolioid ON positions (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_userid ON positions (user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions (symbol);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON positions (created_at);

-- Transactions performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_userid ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_accountid ON transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_is_active ON transactions (is_active);

-- Accounts performance indexes
CREATE INDEX IF NOT EXISTS idx_accounts_userid ON accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts (type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts (is_active);

-- User activity logs performance indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_userid ON user_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs (action);

-- Audit logs performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_userid ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs (operation);

-- Investment performance indexes
CREATE INDEX IF NOT EXISTS idx_investments_userid ON investments (user_id);
CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments (symbol);
CREATE INDEX IF NOT EXISTS idx_investments_created_at ON investments (created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_positions_user_portfolio ON positions (user_id, portfolio_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_active ON accounts (user_id, is_active);
