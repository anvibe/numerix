# Supabase Email Configuration Guide

## Issue: Email Confirmation Not Arriving

If users are not receiving email confirmation emails, check the following Supabase settings:

## 1. Check Supabase Dashboard Settings

### Authentication → Email Templates
1. Go to Supabase Dashboard → Your Project
2. Navigate to **Authentication** → **Email Templates**
3. Check the **Confirm signup** template
4. Ensure the template uses the correct variables:
   - Use `{{ .ConfirmationURL }}` for the confirmation link
   - NOT `{{ .ConfirmationLink }}` or other variations

### Current Template Should Look Like:
```
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

## 2. Enable Email Confirmation (CRITICAL)

This is a **separate setting** from "Enable Email provider". Both must be enabled!

1. Go to **Authentication** → **Settings**
2. Scroll down to find **Email Auth** section (or **User Management** section)
3. Look for **"Enable email confirmations"** toggle/checkbox
   - ⚠️ **This is DIFFERENT from "Enable Email provider"**
   - ✅ **Enable Email provider** = Allows users to sign up/login with email
   - ✅ **Enable email confirmations** = Requires users to confirm email before accessing app
4. Ensure both are checked:
   - ✅ **Enable Email provider** - ON
   - ✅ **Enable email confirmations** - ON

### If you don't see "Enable email confirmations" option:

Some Supabase projects have this setting in a different location:
1. Check **Authentication** → **Email Templates** → Settings
2. Check **Authentication** → **Policies** → Email confirmation
3. Check **Settings** → **Auth** → **Email Auth** section
4. Look for any toggle related to "email verification" or "email confirmation"

### Quick Test:
After enabling, try signing up a new user. If emails still don't arrive:
- Check Supabase Dashboard → **Logs** → **Auth Logs** for errors
- Check if there's a rate limit message
- Verify SMTP configuration (if using custom SMTP)

## 3. Configure Email Provider

### Option A: Use Supabase Default (Rate Limited)
- Supabase provides default email sending
- Limited to ~3 emails per hour per user
- Good for development/testing

### Option B: Configure Custom SMTP (Recommended for Production)
1. Go to **Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider:
   - **Host**: Your SMTP server (e.g., `smtp.gmail.com`)
   - **Port**: Usually `587` for TLS or `465` for SSL
   - **Username**: Your email address
   - **Password**: Your email password or app-specific password
   - **Sender email**: The email address that will send confirmations
   - **Sender name**: Display name for emails

### Recommended SMTP Providers:
- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5,000 emails/month)
- **Amazon SES**: Pay-as-you-go
- **Resend**: Developer-friendly (3,000 emails/month free)

## 4. Verify Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your site URLs to **Redirect URLs**:
   - `https://yourdomain.com/**`
   - `http://localhost:5173/**` (for development)
   - `https://your-vercel-app.vercel.app/**` (for production)

3. Ensure **Site URL** is set correctly:
   - Production: `https://yourdomain.com`
   - Development: `http://localhost:5173`

## 5. Check Email Provider Status

### In Supabase Dashboard:
1. Go to **Settings** → **Auth** → **Email Templates**
2. Check if there are any error messages
3. View **Email Logs** (if available) to see if emails are being sent

### Common Issues:
- ❌ SMTP credentials incorrect
- ❌ Email provider blocking emails
- ❌ Rate limiting (too many emails sent)
- ❌ Email going to spam folder
- ❌ Incorrect redirect URL configuration

## 6. Test Email Configuration

### Using Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Find a test user
3. Click **Send email** → **Send confirmation email**
4. Check if email arrives

### Using Code:
```typescript
// Resend confirmation email
const { data, error } = await supabase.auth.resend({
  type: 'signup',
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://yourdomain.com/',
  }
});
```

## 7. Check Console Logs

The application now includes console logging for email operations:
- Signup: Logs when signup is attempted
- Resend: Logs when resend is triggered
- Confirmation: Logs when confirmation link is clicked

Check browser console for any errors.

## 8. Email Template Variables

Supabase supports these variables in email templates:
- `{{ .ConfirmationURL }}` - Full confirmation URL
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token (usually not needed)
- `{{ .TokenHash }}` - Hashed token (usually not needed)
- `{{ .RedirectTo }}` - Redirect URL after confirmation

## 9. Troubleshooting Steps

1. ✅ Check spam folder
2. ✅ Verify email address is correct
3. ✅ Check Supabase email logs
4. ✅ Verify SMTP configuration (if using custom)
5. ✅ Test with a different email provider
6. ✅ Check rate limits
7. ✅ Verify redirect URLs are whitelisted
8. ✅ Check browser console for errors
9. ✅ Try resending confirmation email
10. ✅ Verify email template syntax

## 10. Quick Fix Checklist

- [ ] Email confirmation enabled in Auth settings
- [ ] SMTP configured (or using Supabase default)
- [ ] Redirect URLs configured correctly
- [ ] Site URL matches your domain
- [ ] Email template uses `{{ .ConfirmationURL }}`
- [ ] No email provider errors in dashboard
- [ ] Check spam folder
- [ ] Try resending email

## Need Help?

If emails still don't arrive:
1. Check Supabase Dashboard → Logs for errors
2. Verify SMTP credentials are correct
3. Try using a different email provider
4. Contact Supabase support if using default email

