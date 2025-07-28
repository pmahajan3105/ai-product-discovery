# Authentication Setup Guide

## 🔧 Required Configuration for Production Authentication

The authentication system infrastructure is complete but requires proper environment configuration to function. Here's what needs to be set up:

### 1. Google OAuth Configuration

1. **Create Google OAuth App:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to Credentials → Create OAuth 2.0 Client ID
   - Set authorized redirect URIs: `http://localhost:3001/auth/callback/google`

2. **Update .env file:**
   ```bash
   GOOGLE_CLIENT_ID=your-actual-google-client-id
   GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
   ```

### 2. Email Service Configuration (Magic Links)

1. **Option A: Resend (Recommended)**
   - Sign up at [resend.com](https://resend.com)
   - Get API key from dashboard
   - Update .env:
   ```bash
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASSWORD=your-resend-api-key
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   SMTP_FROM_NAME=FeedbackHub
   ```

2. **Option B: Gmail SMTP**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASSWORD=your-app-specific-password
   ```

### 3. Security Configuration

Update these in your .env:
```bash
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-chars
API_SECRET_KEY=your-api-secret-key
WEBHOOK_SECRET=your-webhook-secret
```

Generate secure secrets:
```bash
# Generate secure random strings
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 24  # For API_SECRET_KEY
openssl rand -hex 16  # For WEBHOOK_SECRET
```

### 4. OpenAI Configuration (Secure)

Instead of committing the API key, set it securely:
```bash
OPENAI_API_KEY=your-actual-openai-api-key
```

## 🚀 Testing Authentication

Once configured:

1. **Start the servers:**
   ```bash
   npm run dev
   ```

2. **Test Magic Link:**
   - Go to http://localhost:3000/signin
   - Enter your email
   - Check email for magic link
   - Click link to authenticate

3. **Test Google OAuth:**
   - Click "Continue with Google" button
   - Complete OAuth flow
   - Should redirect to dashboard

## 🔍 Troubleshooting

### Magic Links Not Sending
- Check SMTP configuration in .env
- Verify email service credentials
- Check server logs for email delivery errors

### Google OAuth Failing
- Verify redirect URI matches exactly
- Check client ID/secret are correct
- Ensure Google+ API is enabled

### Session Issues
- Verify SuperTokens configuration
- Check JWT_SECRET is set
- Clear browser cookies and try again

## 📋 Production Checklist

Before going live:
- [ ] Set all environment variables
- [ ] Test both authentication methods
- [ ] Configure proper domain for OAuth redirects
- [ ] Set up SSL/HTTPS
- [ ] Test email delivery in production
- [ ] Verify session persistence
- [ ] Test logout functionality

## 🔒 Security Notes

1. **Never commit secrets to git**
2. **Use environment-specific .env files**
3. **Rotate API keys regularly**
4. **Enable 2FA on all service accounts**
5. **Monitor authentication logs**

## 📞 Support

If you encounter issues:
1. Check server logs: `npm run dev`
2. Verify all environment variables are set
3. Test individual components (email, OAuth)
4. Refer to SuperTokens documentation for advanced configuration