# Local Development Testing & OAuth Registration

## ✅ Implemented Changes

### 1. Email & SMS Verification Files

All verification emails and SMS codes are now saved to:
```
C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\
```

**What gets saved:**
- ✅ **Email HTML files**: Full email content with verification links
- ✅ **SMS codes**: Text files with phone verification codes
- ✅ **Timestamps**: All files include timestamp in filename

**File naming format:**
```
Emails: 2026-02-02T10-30-45-123Z_user_email_com.html
SMS:    2026-02-02T10-30-45-123Z_SMS_15551234567.txt
```

### 2. OAuth Provider Registration

Users can now register using:
- ✅ **Google OAuth**
- ✅ **Microsoft OAuth**  
- ✅ **Traditional email/phone** (manual registration)

**Where to find it:**
- Registration page: `http://localhost:5173/register/initiate`
- Login page: `http://localhost:5173/login` → Click "Sign Up for Free"

---

## 📂 How to Test Locally

### Step 1: Start the Application

```bash
# Terminal 1 - Backend
cd ai-product-management/backend-node
npm run dev

# Terminal 2 - Frontend  
cd ai-product-management/frontend
npm run dev
```

### Step 2: Manual Email Registration Flow

1. **Navigate to:** `http://localhost:5173/login`
2. **Click:** "Sign Up for Free" button
3. **Fill in:** Email and phone number
4. **Click:** "Continue"

**What happens:**
- Backend generates 6-digit verification code
- SMS code saved to: `C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\`
- Open the SMS file to see the code

### Step 3: Get Verification Code

**Option A: Check the file**
```
1. Navigate to: C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\
2. Open the latest SMS file (e.g., 2026-02-02T10-30-45-123Z_SMS_15551234567.txt)
3. Copy the 6-digit code
```

**Option B: Check backend logs**
```
Backend console will show:
====================================
📱 SMS SENT (DEV MODE)  
====================================
To: +15551234567
Verification Code: 123456
====================================
```

### Step 4: Complete Registration

1. Enter the 6-digit code on verification page
2. Continue through:
   - Account setup (name, password)
   - Company setup (company name, industry, etc.)
   - Review & Submit

### Step 5: Check Email Files

All emails sent during registration are saved to:
```
C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\
```

**Email types you'll see:**
- Welcome emails
- Company setup complete
- Account verification  
- Resume tokens (if session interrupted)

**To view emails:**
1. Open the .html file in your browser
2. See the full formatted email with links
3. Test verification links by copying URLs

---

## 🔐 OAuth Registration

### When Does OAuth Registration Happen?

**New users** can choose OAuth registration at the **very first step**:

1. **Navigate to registration page**
   ```
   http://localhost:5173/register/initiate
   ```

2. **Choose your preferred method:**
   - **GoogleOAuth** button → Sign up with Google account
   - **Microsoft** button → Sign up with Microsoft account
   - **Email form** → Manual registration with email/phone

### OAuth Flow

**Google/Microsoft Registration:**
```
1. User clicks "Google" or "Microsoft" button
2. Redirected to provider's login page
3. User signs in with their Google/Microsoft account
4. Provider redirects back with user info
5. System creates account automatically
6. User redirected to company setup
7. No phone verification needed (OAuth verified)
8. No password needed (OAuth handles authentication)
```

**Benefits of OAuth Registration:**
- ✅ Faster signup (no phone verification)
- ✅ No password to remember
- ✅ Already verified email from provider
- ✅ More secure (OAuth 2.0)
- ✅ One-click login in future

### OAuth vs Manual Registration

| Feature | OAuth (Google/Microsoft) | Manual (Email) |
|---------|-------------------------|----------------|
| **Phone Verification** | ❌ Not required | ✅ Required |
| **Email Verification** | ❌ Not required (provider verified) | ✅ Required |
| **Password Setup** | ❌ Not required | ✅ Required |
| **Company Setup** | ✅ Required | ✅ Required |
| **Time to Complete** | ~2 minutes | ~5 minutes |
| **Future Login** | OAuth popup | Email + Password |

---

## 🧪 Testing OAuth Registration

### Prerequisites

OAuth providers (Google, Microsoft) need to be configured in backend:

**1. Google OAuth Setup:**
```env
# In backend-node/.env add:
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/oauth/google/callback
```

**2. Microsoft OAuth Setup:**
```env
# In backend-node/.env add:
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:5000/api/auth/oauth/microsoft/callback
```

### Test OAuth Flow

**Without OAuth configured (development):**
- OAuth buttons will show error: "OAuth provider not configured"
- Users can still use email/phone registration

**With OAuth configured:**
1. Click "Google" or "Microsoft" button
2. Sign in with your provider account
3. Grant permissions
4. Redirected back to app
5. Account created automatically
6. Proceed to company setup

---

## 📧 Email & SMS File Examples

### Email File Content Example

**File:** `2026-02-02T10-30-45-123Z_john_doe_example_com.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Welcome to AI Services Platform</title>
</head>
<body>
  <h1>🎉 Welcome to AI Services Platform!</h1>
  <p>Hello John Doe,</p>
  <p>Click the button below to verify your email:</p>
  <a href="http://localhost:5173/verify-email?token=abc123...">
    Verify My Email
  </a>
</body>
</html>
```

### SMS File Content Example

**File:** `2026-02-02T10-30-45-123Z_SMS_15551234567.txt`

```
====================================
📱 SMS VERIFICATION CODE
====================================
Date: 2/2/2026, 10:30:45 AM
To: +15551234567
Verification Code: 123456
====================================

Message sent to user:
"Your verification code is: 123456

This code will expire in 15 minutes.

AI Services Platform"
====================================
```

---

## 🔧 File Locations Summary

### Development Files
```
C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\
├── 2026-02-02T10-30-45-123Z_john_example_com.html         # Welcome email
├── 2026-02-02T10-31-20-456Z_SMS_15551234567.txt           # Phone verification
├── 2026-02-02T10-35-30-789Z_john_example_com.html         # Company setup email
└── 2026-02-02T10-40-15-012Z_john_example_com.html         # Account complete email
```

### Source Code Files (Updated)
```
backend-node/src/services/
├── email.service.ts                    # ✅ Updated - saves to C:\Users\Owner\...\emails
├── phone-verification.service.ts       # ✅ New - saves SMS codes to same folder
└── registration.service.ts             # Uses both services

frontend/src/pages/
├── Login.tsx                           # ✅ Updated - "Sign Up for Free" button
└── InitiateRegistration.tsx            # ✅ Updated - OAuth provider buttons
```

---

## 🎯 Quick Test Checklist

### Manual Registration
- [ ] Navigate to login page
- [ ] Click "Sign Up for Free"
- [ ] Enter email and phone
- [ ] Check `emails/` folder for SMS file
- [ ] Copy verification code from file
- [ ] Enter code and continue
- [ ] Check `emails/` folder for welcome email
- [ ] Complete company setup
- [ ] Check `emails/` folder for completion email

### OAuth Registration  
- [ ] Navigate to registration page
- [ ] Click "Google" or "Microsoft"
- [ ] Sign in with provider
- [ ] Verify redirect back to app
- [ ] Check account created automatically
- [ ] Complete company setup
- [ ] Test OAuth login on next visit

---

## 💡 Tips

**1. Quick code lookup:**
   ```bash
   # PowerShell - show latest SMS code
   Get-Content (Get-ChildItem "C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\*SMS*.txt" | Select-Object -Last 1)
   ```

**2. View latest email:**
   ```bash
   # PowerShell - open latest email in browser
   Invoke-Item (Get-ChildItem "C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\*.html" | Select-Object -Last 1)
   ```

**3. Clear old test files:**
   ```bash
   # PowerShell - delete all test emails/SMS
   Remove-Item "C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\*.*"
   ```

**4. Monitor in real-time:**
   - Keep File Explorer open to `emails/` folder
   - Files appear immediately when backend sends them
   - F5 to refresh and see new files

---

## 🚀 Next Steps

### For Production

**1. Configure real email service:**
   - SendGrid, AWS SES, or Mailgun
   - Update `email.service.ts` to use real SMTP
   - Remove file saving logic

**2. Configure real SMS service:**
   - Twilio, AWS SNS, or similar
   - Update `phone-verification.service.ts`  
   - Remove file saving logic

**3. Set up OAuth providers:**
   - Google Cloud Console → Create OAuth credentials
   - Azure Portal → Register app for Microsoft OAuth
   - Add production callback URLs
   - Update environment variables

### For Development

**Current setup is perfect for local testing:**
- ✅ No external services required
- ✅ All codes/emails saved to files
- ✅ Easy to copy/paste verification codes
- ✅ Can test email templates in browser
- ✅ Fast iteration without API rate limits

---

## 📝 Summary

**✅ What's Working:**
1. **Email files** - All emails saved to `C:\Users\Owner\...\emails\`
2. **SMS files** - All verification codes saved to same folder  
3. **OAuth buttons** - Google and Microsoft options on registration page
4. **Manual registration** - Traditional email/phone flow still available
5. **Sign up link** - "Sign Up for Free" button added to login page

**📍 Where Users Can Register:**
1. **Login page** → Click "Sign Up for Free"
2. **Direct link** → `http://localhost:5173/register/initiate`

**🔐 Registration Options:**
1. **Google OAuth** - One click, no verification needed
2. **Microsoft OAuth** - One click, no verification needed
3. **Email/Phone** - Manual verification with codes saved to files

**📂 All verification codes/emails save to:**
```
C:\Users\Owner\Documents\ai-services-platform\product-management\backend-node\emails\
```

Open files in browser (HTML) or text editor (TXT) to get codes and test links!

