# Security API Documentation

## Overview
The Security API provides comprehensive authentication, authorization, and user management capabilities for FinBot v3. This includes role-based access control, two-factor authentication, password management, and activity logging.

## Base URL
```
/api/security
```

## Authentication
All endpoints require JWT authentication unless otherwise specified.

## Endpoints

### User Profile Management

#### GET /profile
Get current user's profile information.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "user-id",
    "userId": "user-id",
    "role": "finance",
    "permissions": ["view_cashboxes", "manage_cashboxes"],
    "lastLogin": "2024-01-01T00:00:00Z",
    "passwordChangedAt": "2024-01-01T00:00:00Z",
    "failedLoginAttempts": 0,
    "lockedUntil": null,
    "twoFactorEnabled": true,
    "sessionTimeout": 3600,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /profile
Update user profile information.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "role": "finance",
  "permissions": ["view_cashboxes"],
  "sessionTimeout": 3600
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### Password Management

#### POST /change-password
Change user password.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)
- Cannot be a common weak pattern

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST /request-password-reset
Request password reset email.

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

#### POST /reset-password
Reset password using token.

**Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Two-Factor Authentication

#### POST /2fa/setup
Setup 2FA for user account.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "phoneNumber": "+1234567890",
  "enableSMS": true
}
```

**Response:**
```json
{
  "success": true,
  "secret": "MOCK_SECRET_BASE32",
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": ["CODE1", "CODE2", "CODE3", ...]
}
```

#### POST /2fa/enable
Enable 2FA after verification.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "secret": "MOCK_SECRET_BASE32",
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA enabled successfully"
}
```

#### POST /2fa/disable
Disable 2FA.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "password": "CurrentPassword123!",
  "backupCode": "BACKUP_CODE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

#### POST /2fa/verify
Verify 2FA token.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "token": "123456",
  "backupCode": "BACKUP_CODE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA verified successfully"
}
```

#### GET /2fa/status
Get 2FA status for user.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "status": {
    "isEnabled": true,
    "hasBackupCodes": true,
    "lastUsed": "2024-01-01T00:00:00Z",
    "phoneNumber": "+1234567890",
    "smsEnabled": true
  }
}
```

#### POST /2fa/regenerate-backup-codes
Regenerate backup codes.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "backupCodes": ["NEW_CODE1", "NEW_CODE2", "NEW_CODE3", ...]
}
```

### Permission Management

#### POST /check-permission
Check if user has specific permission.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "permission": "manage_cashboxes",
  "resource": "cashbox",
  "resourceId": "cashbox-id"
}
```

**Response:**
```json
{
  "success": true,
  "hasPermission": true,
  "permission": "manage_cashboxes",
  "userRole": "finance"
}
```

#### GET /permissions
Get user's permissions.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "role": "finance",
  "permissions": [
    "view_dashboard",
    "view_cashboxes",
    "manage_cashboxes",
    "transfer_cashbox",
    "view_bank_integrations",
    "manage_bank_integrations",
    "import_bank_data",
    "reconcile_transactions",
    "view_reports",
    "export_reports",
    "view_analytics"
  ],
  "customPermissions": []
}
```

### Activity Logging

#### GET /activity-logs
Get user's activity logs.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `action` (optional): Filter by action
- `resource` (optional): Filter by resource

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-id",
      "userId": "user-id",
      "action": "login",
      "resource": "session",
      "resourceId": null,
      "endpoint": "/api/auth/login",
      "method": "POST",
      "statusCode": 200,
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "metadata": {
        "timestamp": "2024-01-01T00:00:00Z"
      },
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1
  }
}
```

#### GET /activity-logs/all
Get all activity logs (admin only).

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action
- `resource` (optional): Filter by resource

**Response:**
```json
{
  "success": true,
  "logs": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1
  }
}
```

### System Status

#### GET /status
Get security status for user.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "status": {
    "accountLocked": false,
    "failedLoginAttempts": 0,
    "passwordExpired": false,
    "twoFactorEnabled": true,
    "lastLogin": "2024-01-01T00:00:00Z",
    "sessionTimeout": 3600
  }
}
```

## User Roles and Permissions

### Roles

#### ADMIN
Full system access including user management and system administration.

**Permissions:**
- `view_dashboard`
- `manage_dashboard`
- `view_cashboxes`
- `manage_cashboxes`
- `transfer_cashbox`
- `view_bank_integrations`
- `manage_bank_integrations`
- `import_bank_data`
- `reconcile_transactions`
- `view_reports`
- `export_reports`
- `view_analytics`
- `view_users`
- `manage_users`
- `assign_roles`
- `view_audit_logs`
- `manage_settings`
- `view_system_status`

#### FINANCE
Financial operations and cash management.

**Permissions:**
- `view_dashboard`
- `view_cashboxes`
- `manage_cashboxes`
- `transfer_cashbox`
- `view_bank_integrations`
- `manage_bank_integrations`
- `import_bank_data`
- `reconcile_transactions`
- `view_reports`
- `export_reports`
- `view_analytics`

#### VIEWER
Read-only access to financial data.

**Permissions:**
- `view_dashboard`
- `view_cashboxes`
- `view_bank_integrations`
- `view_reports`
- `export_reports`
- `view_analytics`

#### AUDITOR
Read-only access with audit capabilities.

**Permissions:**
- `view_dashboard`
- `view_cashboxes`
- `view_bank_integrations`
- `view_reports`
- `export_reports`
- `view_analytics`
- `view_audit_logs`
- `view_users`

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "required": "permission_name",
  "current": "user_role"
}
```

### 423 Locked
```json
{
  "error": "Account is locked",
  "lockedUntil": "2024-01-01T00:00:00Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Security Features

### Password Policy
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot contain common weak patterns
- Password history tracking (last 5 passwords)
- 90-day expiration policy

### Account Security
- Failed login attempt tracking
- Account lockout after 5 failed attempts
- 30-minute lockout duration
- Session timeout management
- IP address logging
- User agent tracking

### Two-Factor Authentication
- TOTP-based 2FA using Google Authenticator
- QR code generation for easy setup
- Backup codes (10 single-use codes)
- Optional SMS-based 2FA
- Phone number verification

### Activity Logging
- Login/logout events
- API call tracking
- Critical action logging
- Resource access monitoring
- IP address and user agent capture
- Metadata storage for context

## Rate Limiting
Different rate limits apply based on user role:

- **ADMIN**: 1000 requests per hour
- **FINANCE**: 500 requests per hour
- **VIEWER**: 200 requests per hour
- **AUDITOR**: 300 requests per hour

## Security Headers
All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: ...`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
