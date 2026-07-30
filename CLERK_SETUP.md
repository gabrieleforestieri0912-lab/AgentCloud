# Clerk Authentication Setup

## Overview

AgentCloud uses [Clerk](https://clerk.com) for authentication. Clerk provides:

- Magic link authentication (passwordless)
- User management
- Session handling
- Social login providers

## Development vs Production Keys

### ⚠️ Important: Development Keys

The current `.env.local` contains **development keys**:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cHJvLWNvd2JpcmQtMzkuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_Q5rgw3Ug427byxAca5bRD4M2I0sPhwSE4xgzMcibEH
```

**These keys:**

- Start with `pk_test_` and `sk_test_`
- Have strict usage limits (50 MAU for free tier)
- Should **NOT** be used in production
- Are only for local development

### Production Keys

For production, you need **live keys**:

- Start with `pk_live_` and `sk_live_`
- No usage limits (pay-as-you-go)
- Required for production deployment

## Getting Production Keys

### Step 1: Create Clerk Account

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Sign up or log in
3. Create a new application (or use existing)

### Step 2: Get Production Keys

1. In Clerk Dashboard, go to **API Keys**
2. Switch to **Production** mode (toggle in top right)
3. Copy the production keys:
   - **Publishable Key**: `pk_live_...`
   - **Secret Key**: `sk_live_...`

### Step 3: Configure Environment Variables

#### For Local Development (Optional)

You can continue using test keys locally:

```env
# .env.local (keep test keys for development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### For Production

Set these environment variables in your hosting platform (Vercel, Railway, etc.):

```env
# Production keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Clerk redirect URLs (same for dev and prod)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Clerk Configuration

### Instance Settings

In Clerk Dashboard, configure your instance:

1. **General Settings:**
   - Application name: "AgentCloud"
   - Support email: <your-email@example.com>

2. **Authentication Methods:**
   - Enable: Email (magic link)
   - Optional: Google, GitHub, etc.

3. **Redirect URLs:**
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`
   - After sign-out: `/`

4. **Email Settings:**
   - From email: `noreply@yourdomain.com`
   - Reply-to: `support@yourdomain.com`

### Email Templates

Customize email templates in Clerk Dashboard:

1. **Magic Link Email:**
   - Subject: "Sign in to AgentCloud"
   - Body: "Click here to sign in: {{ .MagicLink }}"

2. **Welcome Email:**
   - Subject: "Welcome to AgentCloud"
   - Body: "Thanks for signing up!"

## Production Deployment Checklist

### Before Deploying

- [ ] Create production keys in Clerk Dashboard
- [ ] Set production environment variables in hosting platform
- [ ] Configure redirect URLs in Clerk Dashboard
- [ ] Set up custom email domain (optional but recommended)
- [ ] Test authentication flow in production
- [ ] Verify email delivery (check spam folder)

### Environment Variables for Production

```env
# Clerk (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Other required env vars
RESEND_API_KEY=re_...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
# ... etc
```

## Usage Limits

### Development (Test) Keys

- **Free tier**: 50 Monthly Active Users (MAU)
- **Rate limits**: 100 requests/minute
- **Purpose**: Local development only

### Production (Live) Keys

- **Free tier**: 100 MAU
- **Paid tiers**: Starting at $25/month for 1,000 MAU
- **Rate limits**: 1,000 requests/minute
- **Purpose**: Production deployment

See [Clerk Pricing](https://clerk.com/pricing) for details.

## Troubleshooting

### Warning: "Development instances have strict usage limits"

**Problem:** You see this warning in the browser console:

```
Clerk: Clerk has been loaded with development keys.
Development instances have strict usage limits and should not be used
when deploying your application to production.
```

**Solution:**

1. This is just a warning in development - it's expected
2. For production, switch to live keys (see above)
3. The warning will disappear when using `pk_live_` keys

### Authentication not working in production

**Check:**

1. Environment variables are set correctly in hosting platform
2. Redirect URLs match in Clerk Dashboard
3. Using production keys (`pk_live_`, not `pk_test_`)
4. Clerk instance is in "Production" mode

### Email not sending

**Check:**

1. Resend API key is configured (if using Resend)
2. Clerk email settings are correct
3. Check spam folder
4. Verify sender email is verified in Resend/Clerk

## Security Best Practices

1. **Never commit keys to git**
   - Use `.env.local` for local development
   - Use environment variables in production
   - Add `.env*.local` to `.gitignore`

2. **Rotate keys regularly**
   - Generate new keys every 90 days
   - Revoke old keys after rotation

3. **Use different keys for dev/prod**
   - Never use test keys in production
   - Never use live keys in development

4. **Monitor usage**
   - Check Clerk Dashboard for unusual activity
   - Set up alerts for rate limit warnings

## Support

- Clerk Docs: <https://clerk.com/docs>
- Clerk Support: <https://clerk.com/support>
- AgentCloud Setup: See main README.md
