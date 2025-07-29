#!/bin/bash

# Simple deployment script
echo "🚀 Starting deployment process..."

# Set production environment variables
export NEXT_PUBLIC_API_URL="https://your-railway-api-url.railway.app"

# Navigate to web directory and deploy directly
cd apps/web

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔧 Building Next.js application..."
# Use Vercel CLI to deploy directly without local build
npx vercel --prod --yes

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at your Vercel domain"