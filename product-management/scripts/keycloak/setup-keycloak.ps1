<#
.SYNOPSIS
    Keycloak Realm and Client Configuration Script

.DESCRIPTION
    Configures Keycloak realms and OIDC clients for the AI Services Platform
    Requires Keycloak running at http://localhost:9999

.EXAMPLE
    .\setup-keycloak.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  Keycloak Configuration Script" -ForegroundColor Cyan
Write-Host "  AI Services Platform - Multi-Tenant Identity Layer" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$KEYCLOAK_URL = "http://localhost:9999"
$ADMIN_USER = "admin"
$ADMIN_PASSWORD = "admin"
$REALM_NAME = "tenant-default"

# OIDC Clients
$PRODUCT_MGMT_CLIENT_ID = "product-management"
$PRODUCT_MGMT_CLIENT_SECRET = (New-Guid).Guid.Replace("-", "")
$PROMPT_MGMT_CLIENT_ID = "prompt-management"
$PROMPT_MGMT_CLIENT_SECRET = (New-Guid).Guid.Replace("-", "")

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Keycloak URL: $KEYCLOAK_URL" -ForegroundColor White
Write-Host "   Realm Name: $REALM_NAME" -ForegroundColor White
Write-Host "   Admin User: $ADMIN_USER" -ForegroundColor White
Write-Host ""

# Step 1: Check Keycloak availability
Write-Host "🔍 Step 1: Checking Keycloak availability..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$KEYCLOAK_URL" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ Keycloak is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Keycloak is not accessible at $KEYCLOAK_URL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Keycloak first:" -ForegroundColor Yellow
    Write-Host "   1. Navigate to your Keycloak installation directory" -ForegroundColor White
    Write-Host "   2. Run: .\bin\kc.bat start-dev" -ForegroundColor White
    Write-Host "   3. Wait for startup to complete" -ForegroundColor White
    Write-Host "   4. Re-run this script" -ForegroundColor White
    exit 1
}

Write-Host ""

# Step 2: Authenticate and get access token
Write-Host "🔐 Step 2: Authenticating with Keycloak admin..." -ForegroundColor Cyan
try {
    $tokenUrl = "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token"
    $body = @{
        grant_type = "password"
        client_id = "admin-cli"
        username = $ADMIN_USER
        password = $ADMIN_PASSWORD
    }
    
    $tokenResponse = Invoke-RestMethod -Uri $tokenUrl -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
    $accessToken = $tokenResponse.access_token
    
    Write-Host "   ✅ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Authentication failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify admin credentials:" -ForegroundColor Yellow
    Write-Host "   Default username: admin" -ForegroundColor White
    Write-Host "   Default password: admin" -ForegroundColor White
    exit 1
}

Write-Host ""

# Step 3: Check if realm exists
Write-Host "🔍 Step 3: Checking if realm '$REALM_NAME' exists..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $realmUrl = "$KEYCLOAK_URL/admin/realms/$REALM_NAME"
    $existingRealm = Invoke-RestMethod -Uri $realmUrl -Method GET -Headers $headers
    Write-Host "   ℹ️  Realm already exists, skipping creation" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 404) {
        Write-Host "   ℹ️  Realm does not exist, will create..." -ForegroundColor Yellow
        
        # Step 4: Create realm
        Write-Host ""
        Write-Host "🏗️  Step 4: Creating realm '$REALM_NAME'..." -ForegroundColor Cyan
        
        $realmConfig = @{
            realm = $REALM_NAME
            enabled = $true
            displayName = "Default Tenant Realm"
            displayNameHtml = "<b>Default Tenant</b>"
            
            # SSL Settings (none for development, external for production)
            sslRequired = "none"
            
            # Login Settings
            registrationAllowed = $false
            loginWithEmailAllowed = $true
            duplicateEmailsAllowed = $false
            resetPasswordAllowed = $true
            editUsernameAllowed = $false
            bruteForceProtected = $true
            
            # Token Lifespans (in seconds)
            accessTokenLifespan = 900  # 15 minutes
            accessTokenLifespanForImplicitFlow = 900
            ssoSessionIdleTimeout = 1800  # 30 minutes
            ssoSessionMaxLifespan = 36000  # 10 hours
            offlineSessionIdleTimeout = 2592000  # 30 days
            accessCodeLifespan = 60  # 1 minute
            accessCodeLifespanUserAction = 300  # 5 minutes
            
            # Password Policy
            passwordPolicy = "length(8) and digits(1) and lowerCase(1) and upperCase(1)"
            
            # OTP Policy
            otpPolicyType = "totp"
            otpPolicyAlgorithm = "HmacSHA1"
            otpPolicyDigits = 6
            otpPolicyPeriod = 30
            
            # Email Settings
            smtpServer = @{}
            
            # Login Theme
            loginTheme = "keycloak"
            accountTheme = "keycloak"
            adminTheme = "keycloak"
            emailTheme = "keycloak"
            
            # Events
            eventsEnabled = $true
            eventsListeners = @("jboss-logging")
            adminEventsEnabled = $true
            adminEventsDetailsEnabled = $true
        } | ConvertTo-Json -Depth 10
        
        try {
            $createRealmUrl = "$KEYCLOAK_URL/admin/realms"
            Invoke-RestMethod -Uri $createRealmUrl -Method POST -Headers $headers -Body $realmConfig
            Write-Host "   ✅ Realm created successfully" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Failed to create realm" -ForegroundColor Red
            Write-Host "   Error: $_" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   ❌ Error checking realm: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 5: Create Product Management Client
Write-Host "🔧 Step 5: Configuring Product Management OIDC client..." -ForegroundColor Cyan

$productClientConfig = @{
    clientId = $PRODUCT_MGMT_CLIENT_ID
    name = "Product Management Application"
    description = "AI Services Product Management Console"
    rootUrl = "http://localhost:5173"
    baseUrl = "/"
    enabled = $true
    clientAuthenticatorType = "client-secret"
    secret = $PRODUCT_MGMT_CLIENT_SECRET
    
    # Protocol Settings
    protocol = "openid-connect"
    publicClient = $false  # Confidential client
    standardFlowEnabled = $true  # Authorization Code flow
    implicitFlowEnabled = $false
    directAccessGrantsEnabled = $false
    serviceAccountsEnabled = $false
    
    # PKCE
    attributes = @{
        "pkce.code.challenge.method" = "S256"
        "oauth2.device.authorization.grant.enabled" = "false"
        "oidc.ciba.grant.enabled" = "false"
    }
    
    # Redirect URIs
    redirectUris = @(
        "http://localhost:5173/auth/callback",
        "http://localhost:5000/api/auth/callback"
    )
    
    # Web Origins
    webOrigins = @(
        "http://localhost:5173",
        "http://localhost:5000"
    )
    
    # Default Client Scopes
    defaultClientScopes = @(
        "profile",
        "email",
        "roles",
        "web-origins"
    )
    
    # Optional Client Scopes
    optionalClientScopes = @(
        "address",
        "phone",
        "offline_access"
    )
} | ConvertTo-Json -Depth 10

try {
    $clientsUrl = "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients"
    
    # Check if client already exists
    $existingClients = Invoke-RestMethod -Uri $clientsUrl -Method GET -Headers $headers
    $existingClient = $existingClients | Where-Object { $_.clientId -eq $PRODUCT_MGMT_CLIENT_ID }
    
    if ($existingClient) {
        Write-Host "   ℹ️  Client already exists, updating..." -ForegroundColor Yellow
        $updateUrl = "$clientsUrl/$($existingClient.id)"
        Invoke-RestMethod -Uri $updateUrl -Method PUT -Headers $headers -Body $productClientConfig
        Write-Host "   ✅ Product Management client updated" -ForegroundColor Green
    } else {
        Invoke-RestMethod -Uri $clientsUrl -Method POST -Headers $headers -Body $productClientConfig
        Write-Host "   ✅ Product Management client created" -ForegroundColor Green
    }
    
    Write-Host "      Client ID: $PRODUCT_MGMT_CLIENT_ID" -ForegroundColor White
    Write-Host "      Client Secret: $PRODUCT_MGMT_CLIENT_SECRET" -ForegroundColor White
} catch {
    Write-Host "   ❌ Failed to configure client" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""

# Step 6: Create Prompt Management Client
Write-Host "🔧 Step 6: Configuring Prompt Management OIDC client..." -ForegroundColor Cyan

$promptClientConfig = @{
    clientId = $PROMPT_MGMT_CLIENT_ID
    name = "Prompt Management Application"
    description = "AI Services Prompt Management Console"
    rootUrl = "http://localhost:3002"
    baseUrl = "/"
    enabled = $true
    clientAuthenticatorType = "client-secret"
    secret = $PROMPT_MGMT_CLIENT_SECRET
    
    protocol = "openid-connect"
    publicClient = $false
    standardFlowEnabled = $true
    implicitFlowEnabled = $false
    directAccessGrantsEnabled = $false
    serviceAccountsEnabled = $false
    
    attributes = @{
        "pkce.code.challenge.method" = "S256"
    }
    
    redirectUris = @(
        "http://localhost:3002/auth/callback",
        "http://localhost:5001/api/auth/callback"
    )
    
    webOrigins = @(
        "http://localhost:3002",
        "http://localhost:5001"
    )
    
    defaultClientScopes = @(
        "profile",
        "email",
        "roles",
        "web-origins"
    )
    
    optionalClientScopes = @(
        "address",
        "phone",
        "offline_access"
    )
} | ConvertTo-Json -Depth 10

try {
    $existingClient = $existingClients | Where-Object { $_.clientId -eq $PROMPT_MGMT_CLIENT_ID }
    
    if ($existingClient) {
        Write-Host "   ℹ️  Client already exists, updating..." -ForegroundColor Yellow
        $updateUrl = "$clientsUrl/$($existingClient.id)"
        Invoke-RestMethod -Uri $updateUrl -Method PUT -Headers $headers -Body $promptClientConfig
        Write-Host "   ✅ Prompt Management client updated" -ForegroundColor Green
    } else {
        Invoke-RestMethod -Uri $clientsUrl -Method POST -Headers $headers -Body $promptClientConfig
        Write-Host "   ✅ Prompt Management client created" -ForegroundColor Green
    }
    
    Write-Host "      Client ID: $PROMPT_MGMT_CLIENT_ID" -ForegroundColor White
    Write-Host "      Client Secret: $PROMPT_MGMT_CLIENT_SECRET" -ForegroundColor White
} catch {
    Write-Host "   ❌ Failed to configure client" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""

# Step 7: Create Test User
Write-Host "👤 Step 7: Creating test user..." -ForegroundColor Cyan

$testUser = @{
    username = "testuser@example.com"
    email = "testuser@example.com"
    firstName = "Test"
    lastName = "User"
    enabled = $true
    emailVerified = $true
    credentials = @(
        @{
            type = "password"
            value = "Test123!"
            temporary = $false
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $usersUrl = "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users"
    
    # Check if user exists
    $existingUsers = Invoke-RestMethod -Uri "$usersUrl?username=testuser@example.com" -Method GET -Headers $headers
    
    if ($existingUsers.Count -gt 0) {
        Write-Host "   ℹ️  Test user already exists" -ForegroundColor Yellow
    } else {
        Invoke-RestMethod -Uri $usersUrl -Method POST -Headers $headers -Body $testUser
        Write-Host "   ✅ Test user created" -ForegroundColor Green
        Write-Host "      Username: testuser@example.com" -ForegroundColor White
        Write-Host "      Password: Test123!" -ForegroundColor White
    }
} catch {
    Write-Host "   ⚠️  Could not create test user (may already exist)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  ✅ Keycloak Configuration Complete!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Realm: $REALM_NAME" -ForegroundColor White
Write-Host "   OIDC Issuer: $KEYCLOAK_URL/realms/$REALM_NAME" -ForegroundColor White
Write-Host ""
Write-Host "   Product Management Client:" -ForegroundColor Yellow
Write-Host "      Client ID: $PRODUCT_MGMT_CLIENT_ID" -ForegroundColor White
Write-Host "      Client Secret: $PRODUCT_MGMT_CLIENT_SECRET" -ForegroundColor White
Write-Host ""
Write-Host "   Prompt Management Client:" -ForegroundColor Yellow
Write-Host "      Client ID: $PROMPT_MGMT_CLIENT_ID" -ForegroundColor White
Write-Host "      Client Secret: $PROMPT_MGMT_CLIENT_SECRET" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Important URLs:" -ForegroundColor Cyan
Write-Host "   Admin Console: $KEYCLOAK_URL/admin" -ForegroundColor White
Write-Host "   OIDC Discovery: $KEYCLOAK_URL/realms/$REALM_NAME/.well-known/openid-configuration" -ForegroundColor White
Write-Host "   JWKS Endpoint: $KEYCLOAK_URL/realms/$REALM_NAME/protocol/openid-connect/certs" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Copy the client secrets above" -ForegroundColor White
Write-Host "   2. Update .env files in product-management and prompt-management" -ForegroundColor White
Write-Host "   3. Run: .\scripts\keycloak\generate-env-files.ps1" -ForegroundColor White
Write-Host "   4. Restart your applications" -ForegroundColor White
Write-Host "   5. Test login flow" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test Credentials:" -ForegroundColor Cyan
Write-Host "   Username: testuser@example.com" -ForegroundColor White
Write-Host "   Password: Test123!" -ForegroundColor White
Write-Host ""

# Save secrets to file
$secretsFile = "keycloak-secrets.txt"
$secretsContent = @"
==========================================================================
  Keycloak Configuration Secrets
  Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
==========================================================================

IMPORTANT: Store these secrets securely!

Realm: $REALM_NAME
OIDC Issuer: $KEYCLOAK_URL/realms/$REALM_NAME

Product Management Client:
--------------------------
KEYCLOAK_CLIENT_ID=$PRODUCT_MGMT_CLIENT_ID
KEYCLOAK_CLIENT_SECRET=$PRODUCT_MGMT_CLIENT_SECRET

Prompt Management Client:
--------------------------
KEYCLOAK_CLIENT_ID=$PROMPT_MGMT_CLIENT_ID
KEYCLOAK_CLIENT_SECRET=$PROMPT_MGMT_CLIENT_SECRET

Test User:
----------
Username: testuser@example.com
Password: Test123!

==========================================================================
"@

$secretsContent | Out-File -FilePath $secretsFile -Encoding UTF8
Write-Host "💾 Secrets saved to: $secretsFile" -ForegroundColor Green
Write-Host ""
