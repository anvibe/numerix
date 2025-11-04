# Netlify Deployment Guide for Numerix

## Prerequisites

1. **Netlify Account**: Sign up at https://netlify.com (free tier available)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. **Login to Netlify**
   - Go to https://app.netlify.com
   - Sign in or create an account

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your Numerix repository

3. **Configure Build Settings**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - Netlify should auto-detect these from `netlify.toml`

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add the following variables:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     VITE_OPENAI_API_KEY=your-openai-key (optional)
     ```
   - ⚠️ **Important**: Never commit `.env` file to Git!

5. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy your app
   - You'll get a URL like: `https://your-site-name.netlify.app`

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Site**
   ```bash
   netlify init
   ```
   - Follow the prompts to link your site

4. **Set Environment Variables**
   ```bash
   netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
   netlify env:set VITE_OPENAI_API_KEY "your-openai-key"  # Optional
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Option 3: Deploy via Git Push (Continuous Deployment)

1. **Setup Git Repository**
   - Push your code to GitHub/GitLab/Bitbucket
   - Make sure `.env` is in `.gitignore` (already is)

2. **Connect to Netlify**
   - In Netlify Dashboard → Add new site → Import from Git
   - Select your repository
   - Netlify will auto-configure from `netlify.toml`

3. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add all required variables

4. **Automatic Deployments**
   - Every push to `main` branch will trigger a deployment
   - Preview deployments for pull requests

## Environment Variables Required

### Required:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional:
- `VITE_OPENAI_API_KEY` - OpenAI API key for advanced AI features

## Getting Your Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

## Post-Deployment Checklist

- [ ] Verify site loads correctly
- [ ] Test authentication (login/signup)
- [ ] Test number generation
- [ ] Test saving combinations
- [ ] Verify Supabase connection
- [ ] Test dark/light theme toggle
- [ ] Check mobile responsiveness

## Custom Domain (Optional)

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow Netlify's DNS configuration instructions
4. SSL certificate is automatically provisioned

## Troubleshooting

### Build Fails
- Check build logs in Netlify Dashboard
- Verify Node version (should be 18+)
- Ensure all dependencies are in `package.json`

### Environment Variables Not Working
- Variables must start with `VITE_` to be exposed to frontend
- Restart deployment after adding new variables
- Check variable names match exactly

### 404 Errors on Routes
- Ensure `netlify.toml` has redirects configured
- Check that `_redirects` file is in `public/` folder (if using)

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure RLS policies allow public access where needed

## Performance Optimization

Netlify automatically:
- ✅ CDN distribution
- ✅ Asset compression
- ✅ Image optimization (if using Netlify Image CDN)
- ✅ HTTP/2 support
- ✅ SSL certificates

## Continuous Deployment

- **Production**: Deploys from `main` branch
- **Preview**: Deploys from pull requests
- **Branch**: Deploys from other branches (optional)

## Useful Commands

```bash
# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy

# View site logs
netlify logs

# Open site dashboard
netlify open
```

## Support

- Netlify Docs: https://docs.netlify.com
- Netlify Community: https://community.netlify.com
- Netlify Status: https://www.netlifystatus.com

---

**Note**: Make sure your `.env` file is in `.gitignore` to avoid committing secrets!
