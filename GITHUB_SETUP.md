# Setup GitHub Repository and Push Instructions

## Repository Created Locally ✅

Your code has been committed locally. Now you need to create the repository on GitHub and push.

## Option 1: Create Repository via GitHub Website (Recommended)

1. **Go to GitHub**
   - Visit https://github.com/nocodo24
   - Click the "+" icon → "New repository"

2. **Create Repository**
   - Repository name: `numerix`
   - Description: "Numerix - Generatore Intelligente di Numeri per Lotterie"
   - Visibility: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

3. **Push Your Code**
   ```bash
   cd /Users/faustomelchiorre/Desktop/numerix
   git remote add origin https://github.com/nocodo24/numerix.git
   git branch -M main
   git push -u origin main
   ```

## Option 2: Use GitHub CLI (if installed)

```bash
# Login to GitHub CLI
gh auth login

# Create repository and push
cd /Users/faustomelchiorre/Desktop/numerix
gh repo create nocodo24/numerix --public --source=. --remote=origin --push
```

## Option 3: Push After Creating Repository

If you've already created the repository on GitHub:

```bash
cd /Users/faustomelchiorre/Desktop/numerix
git remote add origin https://github.com/nocodo24/numerix.git
git branch -M main
git push -u origin main
```

## Verify Push

After pushing, verify:
- Go to https://github.com/nocodo24/numerix
- All files should be visible
- Check that `.env` is NOT in the repository (it's in .gitignore)

## Next Steps After Push

1. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Import from GitHub
   - Select `nocodo24/numerix`
   - Set environment variables
   - Deploy!

2. **Environment Variables Needed**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY` (optional)

See `DEPLOY_VERCEL.md` for detailed deployment instructions.
