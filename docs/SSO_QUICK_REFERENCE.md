# SSO Quick Reference Card

## 🎯 Architecture Overview

```
Product-Management (IdP)          Prompt-Management (SP)
Port 5000                         Port 5001
├─ Issues tokens                  ├─ Validates tokens
├─ Manages users                  ├─ JIT user provisioning
├─ Token revocation               ├─ Local/remote verification
└─ OIDC endpoints                 └─ Role mapping
```

## 🔑 Key Endpoints

### IdP (Product-Management - Port 5000)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sso/token` | POST | Issue/refresh tokens |
| `/api/sso/introspect` | POST | Verify token status |
| `/api/sso/userinfo` | GET | Get user details |
| `/api/sso/revoke` | POST | Revoke token |
| `/api/sso/.well-known/openid-configuration` | GET | OIDC discovery |
| `/api/auth/verify` | POST | Legacy verification |

### SP (Prompt-Management - Port 5001)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/sso/login` | POST | SSO login |
| `/api/auth/login` | POST | Local login |
| `/api/auth/me` | GET | Current user |
| `/api/auth/logout` | POST | Logout |

## 🔐 Token Structure

```json
{
  "iss": "http://localhost:5000",
  "sub": "user-id",
  "aud": "prompt-management-client",
  "exp": 1738000000,
  "email": "user@example.com",
  "role": "admin",
  "tenant_id": "tenant-001"
}
```

## 🚀 Quick Start

### 1. Start Services
```powershell
# Terminal 1
cd product-management/backend-node
npm run dev

# Terminal 2
cd prompt-management/backend
npm run dev
```

### 2. Get Token
```powershell
curl -X POST http://localhost:5000/api/auth/dev-login
```

### 3. Use Token
```powershell
curl http://localhost:5001/api/prompts `
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔍 Debugging

### Check Token
```powershell
# Decode JWT (copy/paste to jwt.io)
# Or introspect:
curl -X POST http://localhost:5000/api/sso/introspect `
  -d '{"token":"YOUR_TOKEN"}'
```

### Check User
```powershell
curl http://localhost:5000/api/sso/userinfo `
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Service Health
```powershell
curl http://localhost:5000/api/health
curl http://localhost:5001/api/health
```

## 📋 Configuration Checklist

- [x] `JWT_SECRET` matches in both services
- [x] `SSO_ISSUER` set to IdP URL
- [x] `SSO_CLIENT_ID` matches registration
- [x] `SSO_CLIENT_SECRET` matches registration
- [x] `SSO_ENABLED=true` in SP
- [x] MongoDB running on port 27017

## 🔄 Token Lifecycle

1. **Issue** - IdP generates JWT (1h expiry)
2. **Use** - SP validates token
3. **Refresh** - Client gets new token with refresh_token
4. **Revoke** - Token added to blacklist
5. **Expire** - Token auto-expires, cleanup runs

## 👥 Role Mapping

| IdP Role | SP Role | Permissions |
|----------|---------|-------------|
| admin | ADMIN | Full access |
| developer | DEVELOPER | Execute |
| user/editor | EDITOR | Edit |
| viewer | VIEWER | Read-only |

## 🐛 Common Issues

| Error | Fix |
|-------|-----|
| "Invalid token" | Check JWT_SECRET matches |
| "Token not found" | Check SSO_CLIENT_ID |
| "User not found" | Check MongoDB connection |
| "Invalid signature" | Ensure secrets match |
| 401 Unauthorized | Token expired or revoked |

## 📚 Documentation Files

1. `product-management/docs/SSO_IMPLEMENTATION_GUIDE.md` - Full guide (500+ lines)
2. `docs/SSO_IMPLEMENTATION_SUMMARY.md` - Implementation summary
3. `docs/SSO_QUICK_REFERENCE.md` - This file

## 🎓 Testing Scenarios

### Scenario 1: Happy Path
1. Login to product-management ✓
2. Get token ✓
3. Access prompt-management with token ✓
4. User auto-created (JIT) ✓

### Scenario 2: Token Revocation
1. Get token ✓
2. Use token successfully ✓
3. Revoke token ✓
4. Token rejected on next use ✓

### Scenario 3: Token Refresh
1. Get access + refresh token ✓
2. Access token expires ✓
3. Use refresh token to get new access token ✓
4. Continue using new token ✓

## 🔧 Production Readiness

### Required for Production
- [ ] Switch to RS256 (asymmetric)
- [ ] Enable HTTPS
- [ ] Implement rate limiting
- [ ] Add monitoring/alerting
- [ ] Set up automated cleanup jobs
- [ ] Implement refresh token rotation
- [ ] Add audit logging

### Nice to Have
- [ ] MFA support
- [ ] SCIM provisioning
- [ ] Admin dashboard
- [ ] Token exchange (RFC 8693)
- [ ] PKCE for public clients

## 📞 Support

**Logs Location:**
- Product-Management: Console output
- Prompt-Management: Console output
- MongoDB: Check `revoked_tokens` and `registered_services` collections

**Key Logs to Watch:**
- "SSO service initialized"
- "Token verified locally"
- "User created via JIT provisioning"
- "Token revoked"
- "SSO authentication failed"

---

**Version:** 1.0.0 | **Last Updated:** Jan 27, 2026
