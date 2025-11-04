#!/bin/bash

# Quick Netlify Deployment Script
# This script helps you deploy Numerix to Netlify

set -e

echo "🚀 Numerix Netlify Deployment Helper"
echo "======================================"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found"
    echo ""
    echo "Install it with:"
    echo "  npm install -g netlify-cli"
    echo ""
    echo "Or use the Netlify Dashboard:"
    echo "  https://app.netlify.com"
    echo ""
    exit 1
fi

echo "✅ Netlify CLI found"
echo ""

# Check if logged in
if ! netlify status &> /dev/null; then
    echo "🔐 Please login to Netlify..."
    netlify login
fi

echo "📋 Deployment Options:"
echo ""
echo "1. Deploy to production (netlify deploy --prod)"
echo "2. Deploy preview (netlify deploy)"
echo "3. Open Netlify dashboard"
echo "4. View site logs"
echo "5. Set environment variables"
echo ""
read -p "Select option (1-5): " option

case $option in
    1)
        echo ""
        echo "🚀 Deploying to production..."
        netlify deploy --prod
        ;;
    2)
        echo ""
        echo "🚀 Creating preview deployment..."
        netlify deploy
        ;;
    3)
        echo ""
        echo "🌐 Opening Netlify dashboard..."
        netlify open
        ;;
    4)
        echo ""
        echo "📋 Viewing site logs..."
        netlify logs
        ;;
    5)
        echo ""
        echo "🔧 Setting environment variables..."
        echo ""
        echo "You'll need to set these variables:"
        echo "  - VITE_SUPABASE_URL"
        echo "  - VITE_SUPABASE_ANON_KEY"
        echo "  - VITE_OPENAI_API_KEY (optional)"
        echo ""
        read -p "VITE_SUPABASE_URL: " supabase_url
        read -p "VITE_SUPABASE_ANON_KEY: " supabase_key
        read -p "VITE_OPENAI_API_KEY (optional, press Enter to skip): " openai_key
        
        if [ ! -z "$supabase_url" ]; then
            netlify env:set VITE_SUPABASE_URL "$supabase_url"
        fi
        
        if [ ! -z "$supabase_key" ]; then
            netlify env:set VITE_SUPABASE_ANON_KEY "$supabase_key"
        fi
        
        if [ ! -z "$openai_key" ]; then
            netlify env:set VITE_OPENAI_API_KEY "$openai_key"
        fi
        
        echo ""
        echo "✅ Environment variables set!"
        echo "Remember to redeploy after setting variables."
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
echo ""
echo "📚 For more info, see: DEPLOY_NETLIFY.md"
