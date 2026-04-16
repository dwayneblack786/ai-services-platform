# User Registration Testing Guide

## Overview
This guide will help you manually test the complete self-service registration flow.

---

## Prerequisites

### 1. Start Backend Server
```bash
cd product-management/backend-node
npm run dev
```
**Expected:** Backend running on `http://localhost:5000`

### 2. Start Frontend Server
```bash
cd product-management/frontend
npm run dev
```
**Expected:** Frontend running on `http://localhost:5173`

### 3. Verify Keycloak is Running
- Keycloak should be running on `http://localhost:8080`
- Admin console: http://localhost:8080/admin
- Admin credentials: `admin` / `admin`

### 4. MongoDB Connection
- Ensure MongoDB is running and accessible via the connection string in `.env`

---

## Testing the Registration Flow

### Step 1: Access the Login Page

1. **Navigate to:** `http://localhost:5173/login`

2. **What you'll see:**
   - Login form with tenant ID input
   - **"Don't have an account?" section**
   - **"Sign Up for Free" button** ← This is new!

3. **Click:** "Sign Up for Free" button

---

### Step 2: Initiate Registration

**URL:** `http://localhost:5173/register/initiate`

**Form Fields:**
- Email address
- Phone number (format: +1234567890)
- Company name

**Test Data:**
```
Email: john.doe@testcompany.com
Phone: +15551234567
Company: Test Company Inc
```

**Click:** "Continue"

**Expected Response:**
- Success message
- Redirect to phone verification page
- Check backend logs for:
  - Session created
  - Verification code generated (6 digits)
  - Email sent (check console logs for code)

---

### Step 3: Verify Phone Number

**URL:** `http://localhost:5173/register/verify-phone`

**What to do:**
1. Check backend logs for the verification code (6-digit number)
2. Example log:
   ```
   Phone verification code for +15551234567: 123456
   ```
3. Enter the code from logs
4. Click "Verify Code"

**Expected Response:**
- Success message
- Redirect to account setup page

**Alternative:** Click "Resend Code" to get a new code

---

### Step 4: Setup Account

**URL:** `http://localhost:5173/register/setup-account`

**Form Fields:**
- First Name
- Last Name
- Password (min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char)
- Confirm Password

**Test Data:**
```
First Name: John
Last Name: Doe
Password: TestPass123!
Confirm Password: TestPass123!
```

**Click:** "Continue"

**Expected Response:**
- User account created in MongoDB
- Keycloak user created
- Redirect to company setup page
- Check backend logs for:
  - User creation
  - Keycloak user provisioning

---

### Step 5: Setup Company

**URL:** `http://localhost:5173/register/setup-company`

**Form Fields:**
- Company Name (pre-filled)
- Tenant Identifier (auto-generated or custom)
- Industry (dropdown)
- Company Size (dropdown)
- Country (dropdown)

**Test Data:**
```
Company Name: Test Company Inc (pre-filled)
Tenant Identifier: test-company-inc (auto-generated, can edit)
Industry: Technology
Company Size: 11-50
Country: United States
```

**Click:** "Continue"

**Expected Response:**
- Tenant created in MongoDB
- Keycloak realm created
- User assigned as TENANT_ADMIN
- Redirect to review page
- Check backend logs for:
  - Tenant creation
  - Keycloak realm provisioning
  - User role assignment

---

### Step 6: Review and Submit

**URL:** `http://localhost:5173/register/review`

**What you'll see:**
- Summary of all registration information:
  - Personal details
  - Company details
  - Account status

**Click:** "Submit Registration"

**Expected Response:**
- Registration marked as complete
- Redirect to status page

---

### Step 7: Registration Status

**URL:** `http://localhost:5173/register/status/:registrationId`

**What you'll see:**
- Registration complete message
- Link to login page

**Click:** "Go to Login"

---

### Step 8: Login with New Account

**URL:** `http://localhost:5173/login`

1. **Enter Tenant ID:** `test-company-inc`
2. **Click:** "Continue"
3. **Keycloak Login:** You'll be redirected to Keycloak
4. **Enter Credentials:**
   - Username: `john.doe@testcompany.com`
   - Password: `TestPass123!`
5. **Click:** "Sign In"

**Expected Response:**
- Successful login
- Redirect to dashboard
- User session established
- Check MongoDB for:
  - User record with tenant association
  - Tenant record with correct details

---

## Verification Checklist

After completing registration, verify the following:

### MongoDB Collections

**1. Users Collection:**
```javascript
db.users.find({ email: "john.doe@testcompany.com" })
```
**Expected:**
- User document with:
  - First/last name
  - Email
  - Tenant ID reference
  - Role: TENANT_ADMIN
  - Keycloak ID

**2. Tenants Collection:**
```javascript
db.tenants.find({ identifier: "test-company-inc" })
```
**Expected:**
- Tenant document with:
  - Company name
  - Identifier
  - Industry, size, country
  - Keycloak realm ID
  - Status: active

**3. RegistrationSessions Collection:**
```javascript
db.registrationsessions.find({ email: "john.doe@testcompany.com" })
```
**Expected:**
- Session with:
  - currentStep: "complete"
  - User ID
  - Tenant ID

### Keycloak Verification

**1. Check Realm Created:**
- Login to Keycloak Admin: http://localhost:8080/admin
- Look for realm: `test-company-inc`

**2. Check User Created:**
- Select realm: `test-company-inc`
- Go to Users
- Find user: `john.doe@testcompany.com`
- Verify:
  - Email verified: true
  - User enabled: true
  - First/last name set

---

## Testing Edge Cases

### 1. Duplicate Email
- Try registering with same email
- **Expected:** Error message "Email already registered"

### 2. Duplicate Tenant Identifier
- Try using same tenant identifier
- **Expected:** Error message "Tenant identifier already taken"

### 3. Invalid Phone Number
- Try: "123" or "abc"
- **Expected:** Validation error

### 4. Wrong Verification Code
- Enter wrong 6-digit code
- **Expected:** Error message "Invalid verification code"

### 5. Expired Verification Code
- Wait 15 minutes after receiving code
- Try to verify
- **Expected:** Error message "Verification code expired"

### 6. Password Requirements
- Try weak password: "password"
- **Expected:** Validation errors listing requirements

### 7. Session Expiry
- Start registration
- Wait 48 hours
- Try to continue
- **Expected:** Session expired, need to restart

---

## Testing Error Recovery

### Resume Registration

**If user closes browser during registration:**

1. User has a resume token (sent via email or saved in DB)
2. Navigate to: `http://localhost:5173/register/setup-account?resumeToken=<token>`
3. Should resume from where they left off

**To test:**
1. Start registration
2. Complete phone verification
3. Check DB for resume token:
   ```javascript
   db.registrationsessions.find({ email: "test@example.com" })
   // Copy the resumeToken value
   ```
4. Close browser
5. Open new browser
6. Navigate with resume token
7. **Expected:** Resume at account setup step

---

## API Testing with cURL

### 1. Initiate Registration
```bash
curl -X POST http://localhost:5000/api/registration/register/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api.test@example.com",
    "phoneNumber": "+15559876543",
    "companyName": "API Test Company"
  }'
```

### 2. Verify Phone (use code from logs)
```bash
curl -X POST http://localhost:5000/api/registration/register/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<sessionId-from-step1>",
    "code": "123456"
  }'
```

### 3. Setup Account
```bash
curl -X POST http://localhost:5000/api/registration/register/setup-account \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<sessionId>",
    "firstName": "API",
    "lastName": "User",
    "password": "TestPass123!"
  }'
```

### 4. Setup Company
```bash
curl -X POST http://localhost:5000/api/registration/register/setup-company \
  -H "Content-Type: application/json" \
  -d '{
    "resumeToken": "<resumeToken>",
    "companyName": "API Test Company",
    "tenantIdentifier": "api-test-company",
    "industry": "Technology",
    "companySize": "1-10",
    "country": "United States"
  }'
```

### 5. Review and Submit
```bash
curl -X POST http://localhost:5000/api/registration/register/review-submit \
  -H "Content-Type: application/json" \
  -d '{
    "resumeToken": "<resumeToken>"
  }'
```

---

## Admin Dashboard Testing

### Access Admin Dashboard

1. **Navigate to:** `http://localhost:5173/admin/dashboard`

2. **What you'll see:**
   - Overview statistics
   - Recent registrations
   - Trends (24h, 7d, 30d)
   - Registration list with pagination

3. **Features to test:**
   - View registration details
   - Search/filter registrations
   - Pagination
   - Real-time statistics

---

## Troubleshooting

### Backend Not Starting
- Check MongoDB is running
- Verify `.env` configuration
- Check port 5000 is not in use

### Frontend Not Loading
- Check backend API is accessible
- Verify CORS settings
- Check browser console for errors

### Verification Code Not Logging
- Check backend logs: `npm run dev`
- Email service may need configuration
- SMS service (Twilio) needs proper credentials

### Keycloak Errors
- Verify Keycloak is running
- Check admin credentials
- Review Keycloak logs

### Database Errors
- Check MongoDB connection string
- Verify database exists
- Check user permissions

---

## Clean Up Test Data

### Remove Test Registrations

**MongoDB:**
```javascript
// Remove test user
db.users.deleteOne({ email: "john.doe@testcompany.com" })

// Remove test tenant
db.tenants.deleteOne({ identifier: "test-company-inc" })

// Remove test session
db.registrationsessions.deleteOne({ email: "john.doe@testcompany.com" })
```

**Keycloak:**
1. Login to admin console
2. Select realm: `test-company-inc`
3. Realm Settings → Actions → Delete
4. Confirm deletion

---

## Success Criteria

Registration flow is working correctly if:

✅ User can initiate registration with email and phone  
✅ Phone verification code is sent and validated  
✅ User account is created in MongoDB and Keycloak  
✅ Company/tenant is created in MongoDB  
✅ Keycloak realm is provisioned for tenant  
✅ User is assigned TENANT_ADMIN role  
✅ User can login with new credentials  
✅ Registration session is tracked and can be resumed  
✅ Admin dashboard shows registration statistics  
✅ All validation rules are enforced  
✅ Error messages are clear and helpful  

---

## Next Steps

After successful testing:

1. **Configure Email Service:**
   - Set up SendGrid or AWS SES
   - Update email templates
   - Test email delivery

2. **Configure SMS Service:**
   - Set up Twilio account
   - Add credentials to `.env`
   - Test SMS delivery

3. **Add Monitoring:**
   - Verify Sentry error tracking
   - Check Application Insights telemetry
   - Set up alerts

4. **Security Hardening:**
   - Enable HTTPS in production
   - Configure CSP headers
   - Set up rate limiting

5. **Deploy to Staging:**
   - Test full flow in staging environment
   - Verify Keycloak configuration
   - Test with real email/SMS

---

## Support

If you encounter issues:

1. Check backend logs for detailed error messages
2. Review MongoDB for data consistency
3. Verify Keycloak realm and user creation
4. Check network tab in browser DevTools
5. Review `.env` configuration

**Backend Logs Location:** Console output from `npm run dev`  
**Frontend Errors:** Browser DevTools Console  
**MongoDB Queries:** Use MongoDB Compass or CLI  
**Keycloak Admin:** http://localhost:8080/admin
