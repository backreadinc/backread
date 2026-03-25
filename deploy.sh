#!/bin/bash

# ─────────────────────────────────────────
#  BACKREAD — One-Click Deploy Script
#  Double-click this file to deploy
# ─────────────────────────────────────────

echo ""
echo "================================================"
echo "  BACKREAD DEPLOYER"
echo "================================================"
echo ""

# Move to the project folder (adjust path if needed)
cd ~/Desktop/backread || { echo "ERROR: Cannot find project at ~/Desktop/backread"; read -p "Press Enter to close..."; exit 1; }

echo "📁 Project folder found."
echo ""

# Pull latest from GitHub first to avoid conflicts
echo "⬇  Pulling latest from GitHub..."
git fetch origin
git reset --hard origin/main
echo "✓  Synced with GitHub."
echo ""

# Stage all changed files
echo "📦 Staging your changes..."
git add .

# Check if there's anything to commit
if git diff --cached --quiet; then
  echo "ℹ  No file changes detected — deploying current code anyway."
else
  # Ask for a commit message
  echo ""
  read -p "✏  Describe your change (or press Enter for 'Update'): " MSG
  MSG=${MSG:-"Update"}
  git commit -m "$MSG"
  echo "✓  Changes committed: $MSG"
fi

echo ""

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main
echo "✓  Pushed to GitHub."

echo ""
echo "⏳ Deploying to Vercel..."
vercel --prod --yes

echo ""
echo "================================================"
echo "  ✅  DEPLOYED SUCCESSFULLY!"
echo "  🌐  https://backread.vercel.app"
echo "================================================"
echo ""
read -p "Press Enter to close..."
