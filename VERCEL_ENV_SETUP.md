# Set Environment Variables in Vercel

Your app needs these environment variables to work. Follow these steps:

## Quick Steps

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Navigate to your project

2. **Go to Settings → Environment Variables**

3. **Add these variables:**

   ### Required:
   ```
   Name: VITE_SUPABASE_URL
   Value: https://kmndhvzjyhyiwwdmgyqg.supabase.co
   Environment: Production, Preview, Development (select all)
   ```

   ```
   Name: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbmRodnpqeWh5aXd3ZG1neXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxODkwNjcsImV4cCI6MjA2OTc2NTA2N30.QwINYrl38noHpxsfTbv-89hD9xdQIULgKvlnV6XdxM4
   Environment: Production, Preview, Development (select all)
   ```

   ### Optional:
   ```
   Name: VITE_OPENAI_API_KEY
   Value: your-openai-key-here (optional)
   Environment: Production, Preview, Development (select all)
   ```

4. **Redeploy**
   - After adding variables, trigger a new deployment
   - Or wait for the next auto-deployment

## Via Vercel CLI (Alternative)

```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Login
vercel login

# Set environment variables
vercel env add VITE_SUPABASE_URL
# Enter: https://kmndhvzjyhyiwwdmgyqg.supabase.co
# Select: Production, Preview, Development

vercel env add VITE_SUPABASE_ANON_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbmRodnpqeWh5aXd3ZG1neXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxODkwNjcsImV4cCI6MjA2OTc2NTA2N30.QwINYrl38noHpxsfTbv-89hD9xdQIULgKvlnV6XdxM4
# Select: Production, Preview, Development

vercel env add VITE_OPENAI_API_KEY
# Enter your OpenAI key (optional)
# Select: Production, Preview, Development

# Redeploy
vercel --prod
```

## Important Notes

- ⚠️ Environment variables must start with `VITE_` to be exposed to the frontend
- 🔄 You must redeploy after adding/updating environment variables
- ✅ Select all environments (Production, Preview, Development) when adding variables
- 🔒 Never commit `.env` file to Git (it's already in `.gitignore`)

## Verify Variables Are Set

After setting variables and redeploying:
1. Go to your Vercel project
2. Settings → Environment Variables
3. Verify all variables are listed
4. Check that they're enabled for the correct environments

## Troubleshooting

If you still see the error after setting variables:
1. Make sure variables start with `VITE_`
2. Redeploy the application (variables don't apply to existing deployments)
3. Check the variable names match exactly (case-sensitive)
4. Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
