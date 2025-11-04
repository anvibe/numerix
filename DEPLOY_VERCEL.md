# Vercel Deployment Guide for Numerix

## Prerequisites

1. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)
2. **Vercel Account**: Sign up at https://vercel.com (free tier available)

## Deployment Steps

### Step 1: Push Code to Git

First, make sure your code is committed and pushed to a Git repository:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Numerix lottery app"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/numerix.git

# Push to GitHub/GitLab/Bitbucket
git push -u origin main
```

⚠️ **Important**: Make sure `.env` is in `.gitignore` (it already is) to avoid committing secrets!

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Sign in or create an account (you can use GitHub to sign in)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Vercel will auto-detect it's a Vite project

3. **Configure Project**
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Set Environment Variables**
   - Click "Environment Variables" section
   - Add the following:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     VITE_OPENAI_API_KEY=your-openai-key (optional)
     ```
   - Make sure to add them for:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (optional)

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your site will be live at: `https://your-project-name.vercel.app`

#### Option B: Via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link Project**
   ```bash
   vercel link
   ```
   - Follow prompts to link to existing project or create new one

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add VITE_OPENAI_API_KEY  # Optional
   ```
   - Enter values when prompted
   - Select environments (Production, Preview, Development)

5. **Deploy**
   ```bash
   # Deploy to preview
   vercel

   # Deploy to production
   vercel --prod
   ```

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
- [ ] Test all game types (SuperEnalotto, Lotto, 10eLotto, MillionDAY)

## Continuous Deployment

Vercel automatically:
- ✅ Deploys on every push to `main` branch (production)
- ✅ Creates preview deployments for pull requests
- ✅ Provides unique URLs for each deployment
- ✅ Shows build logs and deployment status

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter your domain name
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

## Performance Features

Vercel automatically provides:
- ✅ Edge Network (global CDN)
- ✅ Automatic HTTPS
- ✅ Instant cache invalidation
- ✅ Optimized builds
- ✅ Analytics (on Pro plan)

## Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Verify Node version (Vercel uses Node 18.x by default)
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally

### Environment Variables Not Working
- Variables must start with `VITE_` to be exposed to frontend
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)
- Verify variables are set for correct environment (Production/Preview)

### 404 Errors on Routes
- Ensure `vercel.json` has rewrites configured (already done)
- Verify SPA routing is working

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure RLS policies allow public access where needed
- Check Supabase project URL is correct

### Build Timeout
- Default timeout is 45 seconds
- If build takes longer, consider optimizing dependencies
- Check for large files or unnecessary dependencies

## Useful Vercel Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# Open project dashboard
vercel open

# List deployments
vercel ls

# Remove deployment
vercel rm <deployment-url>
```

## Git Workflow

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Vercel automatically deploys!
```

## Preview Deployments

- Every pull request gets a preview URL
- Preview URLs are temporary and can be shared
- Great for testing before merging to main

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Vercel Status: https://www.vercel-status.com

---

**Note**: Make sure your `.env` file is in `.gitignore` to avoid committing secrets!
