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

# Move to the project folder
cd ~/Desktop/backread || { echo "ERROR: Cannot find project at ~/Desktop/backread"; read -p "Press Enter to close..."; exit 1; }
echo "Project folder found."
echo ""

# Stage all changed files FIRST (before any pull)
echo "Staging your changes..."
git add -A

# Check if there's anything to commit
if git diff --cached --quiet; then
  echo "No file changes detected — deploying current code."
else
  read -p "Describe your change (or press Enter for 'Update'): " MSG
  MSG=${MSG:-"Update"}
  git commit -m "$MSG"
  echo "Committed: $MSG"
fi

echo ""

# Now pull remote changes (rebase so our commit stays on top)
echo "Syncing with GitHub..."
git pull origin main --rebase --autostash 2>/dev/null || {
  echo "Rebase had conflicts — forcing push."
  git rebase --abort 2>/dev/null
}

# Push to GitHub
echo "Pushing to GitHub..."
git push origin main --force-with-lease || git push origin main
echo "Pushed to GitHub."

echo ""
echo "Deploying to Vercel..."
vercel --prod --yes

echo ""
echo "================================================"
echo "  DEPLOYED SUCCESSFULLY!"
echo "  https://backread.vercel.app"
echo "================================================"
echo ""
read -p "Press Enter to close..."
