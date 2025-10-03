# FinBot v3 Sprint Backlog Plan

## 🎯 Sprint Overview
**Total Sprints**: 8 sprints (1-2 hours each)  
**Total Estimated Time**: 12-16 hours  
**Priority Order**: P0 → P1 → P2 → Security

---

## 🚨 Sprint 1: Critical Auth Fixes (P0)
**Duration**: 2 hours  
**Priority**: CRITICAL

### Task 1.1: Fix Password Reset Flow
**Input**: 
- Current hack in `storage.getUser('')` 
- Mock email sending
- Missing `findUserByResetToken` method

**Output**:
- `storage.findUserByResetToken(token)` method
- `storage.setPasswordResetToken(email, token, expiresAt)` method
- `storage.clearPasswordResetToken(token)` method
- Real email service integration (SMTP or provider)

**DoD**:
- [ ] Reset password API works end-to-end
- [ ] Token stored in DB with expiration
- [ ] Email sent with reset link
- [ ] Token is single-use and expires
- [ ] Rate limiting applied
- [ ] No PII in logs
- [ ] Unit tests pass

### Task 1.2: Fix Email Verification & Team Invites
**Input**:
- Mock implementations in `email-verification.ts`
- Console.log for team invites

**Output**:
- Real email service for verification
- Real email service for team invites
- Proper token management

**DoD**:
- [ ] Email verification works
- [ ] Team invite emails sent
- [ ] Tokens properly managed
- [ ] Tests cover both flows

---

## 🧪 Sprint 2: Test Infrastructure (P0)
**Duration**: 2 hours  
**Priority**: CRITICAL

### Task 2.1: Fix Database Connection Issues
**Input**:
- "No database host" errors
- Missing test environment setup

**Output**:
- `.env.test` file with test DB config
- Test database setup script
- Migration/seed for tests

**DoD**:
- [ ] `npm run test` runs without DB errors
- [ ] All test categories execute
- [ ] Test coverage report generated
- [ ] CI pipeline green

### Task 2.2: Fix TextEncoder Environment Issue
**Input**:
- TextEncoder environment error
- Node.js compatibility issues

**Output**:
- Vitest global polyfill configuration
- Proper Node.js environment setup

**DoD**:
- [ ] All tests run without TextEncoder errors
- [ ] Test environment consistent
- [ ] Documentation updated

---

## 📝 Sprint 3: Logging Infrastructure (P0)
**Duration**: 2 hours  
**Priority**: CRITICAL

### Task 3.1: Implement Centralized Logging
**Input**:
- 117+ console.log statements
- No structured logging
- PII in logs

**Output**:
- Pino or Winston logger setup
- PII redaction middleware
- Environment-based log levels

**DoD**:
- [ ] All console.log replaced with logger
- [ ] PII redacted from logs
- [ ] Production logs < 1KB/request
- [ ] Sentry integration working

### Task 3.2: Remove Debug Logs from Production
**Input**:
- Debug logs in production code
- Environment detection issues

**Output**:
- Clean production logs
- Proper environment detection

**DoD**:
- [ ] No debug logs in production
- [ ] Proper log levels per environment
- [ ] Performance improved

---

## 📊 Sprint 4: Export System Finalization (P1)
**Duration**: 2 hours  
**Priority**: HIGH

### Task 4.1: Finalize PDF Export
**Input**:
- Mock PDF generation
- TODO for library selection
- Currency confirmation needed

**Output**:
- Real PDF generation (PDFKit/Puppeteer)
- Proper currency handling
- i18n support

**DoD**:
- [ ] PDF generation works
- [ ] TRY/USD/EUR support
- [ ] LTR/RTL support
- [ ] Visual validation tests

### Task 4.2: Finalize CSV Export
**Input**:
- Currency confirmation needed
- Locale support incomplete

**Output**:
- Proper currency handling
- Complete locale support

**DoD**:
- [ ] CSV export works for all locales
- [ ] Currency formatting correct
- [ ] E2E export tests pass

---

## 💰 Sprint 5: Progress Payment & Invoicing (P1)
**Duration**: 2 hours  
**Priority**: HIGH

### Task 5.1: Implement Real Progress Payment Calculations
**Input**:
- Simplified calculations
- Mock invoice generation

**Output**:
- Real progress payment formulas
- Proper invoice generation
- KDV/stopaj calculations

**DoD**:
- [ ] Calculations match business rules
- [ ] Invoice PDF generation works
- [ ] Unit tests for calculations
- [ ] Sample data validation

### Task 5.2: Implement Transaction Update Method
**Input**:
- Missing `updateTransaction` in storage
- JSON service hack

**Output**:
- `storage.updateTransaction` method
- Proper audit logging
- Race condition protection

**DoD**:
- [ ] Transaction updates work safely
- [ ] Audit logs created
- [ ] Race conditions handled
- [ ] Tests cover edge cases

---

## 🎨 Sprint 6: Client UI Completion (P1)
**Duration**: 2 hours  
**Priority**: HIGH

### Task 6.1: Implement Account Edit/Delete
**Input**:
- TODO comments in personal.tsx and company.tsx
- Missing API integration

**Output**:
- Edit account functionality
- Delete account functionality
- Confirmation modals

**DoD**:
- [ ] Edit/delete works from UI
- [ ] Confirmation modals
- [ ] Optimistic updates
- [ ] E2E component tests

### Task 6.2: Improve Error Handling
**Input**:
- Basic error handling
- No user feedback

**Output**:
- Better error messages
- Loading states
- User feedback

**DoD**:
- [ ] Clear error messages
- [ ] Loading indicators
- [ ] Success feedback
- [ ] Error boundary tests

---

## 📚 Sprint 7: Documentation & Standards (P2)
**Duration**: 1 hour  
**Priority**: MEDIUM

### Task 7.1: Fix Documentation Inconsistencies
**Input**:
- README says 85% coverage target
- Test report says 70% target

**Output**:
- Consistent coverage targets
- Updated documentation

**DoD**:
- [ ] Single coverage target (80%)
- [ ] README and test docs match
- [ ] CI badges show correct values

### Task 7.2: Reduce Log Noise
**Input**:
- Verbose static serving logs
- Debug logs in production

**Output**:
- Cleaner logs
- Better log categorization

**DoD**:
- [ ] Log noise reduced by 50%
- [ ] Useful events preserved
- [ ] Performance improved

---

## 🔒 Sprint 8: Security Hardening (Ongoing)
**Duration**: 2 hours  
**Priority**: HIGH

### Task 8.1: Enhance Rate Limiting
**Input**:
- Basic rate limiting
- No brute force protection

**Output**:
- Advanced rate limiting rules
- Brute force protection
- IP/device fingerprinting

**DoD**:
- [ ] Advanced rate limiting active
- [ ] Brute force protection
- [ ] Security tests pass
- [ ] Audit logs complete

### Task 8.2: Expand RBAC Testing
**Input**:
- Basic RBAC implementation
- Limited test coverage

**Output**:
- Comprehensive RBAC tests
- Fine-grained permissions
- Negative test cases

**DoD**:
- [ ] All protected routes tested
- [ ] Role-based access verified
- [ ] Negative tests pass
- [ ] Security audit complete

---

## 🎯 Success Metrics

### Sprint 1-3 (P0 Critical)
- [ ] All tests pass
- [ ] No console.log in production
- [ ] Password reset works end-to-end
- [ ] Email verification works

### Sprint 4-6 (P1 High)
- [ ] PDF/CSV export works
- [ ] Progress payments calculated correctly
- [ ] Client UI complete
- [ ] All APIs functional

### Sprint 7-8 (P2 + Security)
- [ ] Documentation consistent
- [ ] Security hardened
- [ ] Performance optimized
- [ ] Ready for production

---

## 🚀 Getting Started

### Prerequisites
1. Database setup (PostgreSQL)
2. Environment variables configured
3. Node.js 18+ installed
4. Git repository cloned

### Sprint Execution
1. **Start with Sprint 1** - Critical auth fixes
2. **Run tests after each sprint** - Ensure no regressions
3. **Update documentation** - Keep README current
4. **Commit frequently** - Small, focused commits
5. **Review code** - Self-review before moving to next sprint

### Quality Gates
- [ ] All tests pass
- [ ] No linting errors
- [ ] No console.log in production
- [ ] Documentation updated
- [ ] Security review completed

---

## 📞 Support

### If You Get Stuck
1. **Check the logs** - Look for specific error messages
2. **Review the code** - Understand the current implementation
3. **Check documentation** - README and API docs
4. **Ask for help** - Use "Kontrol et" command for code review

### Common Issues
- **Database connection**: Check `.env` file
- **Test failures**: Run `npm run test:debug`
- **Build errors**: Check TypeScript compilation
- **Import errors**: Verify file paths and exports

---

*Generated on: $(date)*  
*Total Estimated Time: 12-16 hours*  
*Sprint Duration: 1-2 hours each*  
*Priority: P0 → P1 → P2 → Security*
