# Folio — Complete Beginner Setup Guide

This guide assumes you have never set up a web project before.
Follow every step in order and you will have Folio running — first on your
computer to test, then live on the internet for real users via Vercel.

---

## Overview — what you are about to do

1. Install tools on your computer
2. Create a free GitHub account (stores your code online)
3. Create a free Supabase account (your database)
4. Create a free Anthropic account (the AI brain)
5. Create a free Resend account (email notifications)
6. Create a free Vercel account (puts the app on the internet)
7. Connect everything with your secret keys
8. Run locally to test
9. Deploy live in minutes

Total time: about 45–60 minutes.

---

## PART 1 — Install tools on your computer

### Step 1 — Install Node.js

Node.js is the engine that runs the app.

1. Go to https://nodejs.org
2. Click the big green **LTS** button (the recommended version)
3. Download and run the installer for your system (Windows or Mac)
4. Click through the installer — just keep pressing Next / Continue
5. When done, open your **Terminal** (Mac) or **Command Prompt** (Windows)
   - Mac: press `Cmd + Space`, type `Terminal`, press Enter
   - Windows: press the Windows key, type `cmd`, press Enter
6. Type this and press Enter:
   ```
   node --version
   ```
   You should see something like `v20.11.0` — any version number is fine

### Step 2 — Install Git

Git moves your code between your computer, GitHub, and Vercel.

1. Go to https://git-scm.com/downloads
2. Download and install for your system
3. Confirm it worked:
   ```
   git --version
   ```
   You should see something like `git version 2.43.0`

### Step 3 — Put the project files on your computer

1. Navigate to your Desktop in the terminal:
   - Mac: `cd ~/Desktop`
   - Windows: `cd %USERPROFILE%\Desktop`

2. Create a project folder and enter it:
   ```
   mkdir folio
   cd folio
   ```

3. Copy all the files you downloaded from this conversation into that `folio`
   folder. When you open the folder it should look like this:
   ```
   folio/
   ├── app/
   ├── components/
   ├── lib/
   ├── next.config.js
   ├── package.json
   ├── tailwind.config.ts
   ├── tsconfig.json
   └── ...
   ```

4. Back in the terminal (still inside the `folio` folder), run:
   ```
   npm install
   ```
   This downloads all the libraries the app depends on.
   It takes 1–2 minutes. Lots of text scrolling is normal.

---

## PART 2 — Create a GitHub account and upload your code

GitHub stores your code online so Vercel can read and deploy it automatically.

### Step 1 — Create a GitHub account

1. Go to https://github.com
2. Click **Sign up** and create a free account

### Step 2 — Create a new repository

1. Once logged in, click the **+** icon (top right) → **New repository**
2. Name it `folio`
3. Leave everything else as default
4. Click **Create repository**
5. Keep the resulting page open

### Step 3 — Upload your code to GitHub

In your terminal, inside the `folio` folder, run these one at a time:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

Now copy the line from your GitHub page that starts with
`git remote add origin https://github.com/...` and run it. Example:

```
git remote add origin https://github.com/YOURUSERNAME/folio.git
```

Then:
```
git push -u origin main
```

When it asks for a password, GitHub requires a **Personal Access Token**
(not your regular password):

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Give it a name, tick the **repo** checkbox, click **Generate token**
4. Copy the token and use it as the password in the terminal

Refresh your GitHub repository page — all your files should now be there.

---

## PART 3 — Set up Supabase (your database)

Supabase stores everything: users, documents, view sessions, analytics, AI insights.

### Step 1 — Create an account

1. Go to https://supabase.com
2. Click **Start your project**
3. Sign up with GitHub or email

### Step 2 — Create a new project

1. Click **New project**
2. Name it `folio`
3. Set a strong database password — **write it down somewhere safe**
4. Choose the region geographically closest to you
5. Click **Create new project** and wait 1–2 minutes

### Step 3 — Run the database schema

This creates all the tables the app uses to store data.

1. In the left sidebar, click **SQL Editor** (the `</>` icon)
2. Click **New query**
3. Open `lib/supabase/schema.sql` from your project folder in any text editor
   (right-click the file → Open With → Notepad on Windows, TextEdit on Mac)
4. Select all the text (`Ctrl+A` / `Cmd+A`) and copy it
5. Paste it into the Supabase SQL editor
6. Click the green **Run** button
7. You should see **"Success. No rows returned"** — this means it worked

### Step 4 — Create the Storage bucket

This is where uploaded PDFs and presentations are stored.

1. In the left sidebar, click **Storage**
2. Click **New bucket**
3. Name it exactly: `documents`
4. Keep **Public bucket** toggled OFF
5. Click **Create bucket**

### Step 5 — Copy your Supabase keys

1. In the left sidebar click **Settings** (gear icon) → **API**
2. Copy these three values and save them somewhere:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — long string starting with `eyJ...`
   - **service_role** key — another long string (click Reveal to see it)

---

## PART 4 — Set up Anthropic (the AI)

This powers the AI document drafter and the smart insight recommendations.

### Step 1 — Create an account

1. Go to https://console.anthropic.com
2. Sign up and add a payment method
   (Costs are tiny — roughly $0.001 per AI document draft)

### Step 2 — Get your API key

1. Click **API Keys** in the left sidebar
2. Click **Create Key**, name it `folio`
3. Copy the key — it starts with `sk-ant-...`
4. **Save it immediately** — you cannot view it again after closing the page

---

## PART 5 — Set up Resend (email notifications)

Sends you an email every time someone opens one of your documents.

### Step 1 — Create an account

1. Go to https://resend.com
2. Sign up for free (3,000 emails/month included)

### Step 2 — Get your API key

1. Click **API Keys** in the left sidebar
2. Click **Create API Key**, name it `folio`
3. Copy the key — it starts with `re_...`

---

## PART 6 — Connect everything with your secret keys

Environment variables are secret settings that tell the app where your
database and services are. They are never uploaded to GitHub.

### Step 1 — Create your local environment file

In your terminal, inside the `folio` folder:

- Mac: `cp .env.example .env.local`
- Windows: `copy .env.example .env.local`

### Step 2 — Fill in your keys

Open `.env.local` in your text editor and replace each placeholder:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-api03-...
RESEND_API_KEY=re_123abc...
```

Rules:
- No spaces around the `=` signs
- No quote marks around the values
- Save the file when done

> This file contains your secret keys. It will never be uploaded to GitHub
> because it is already listed in `.gitignore`. Never share it with anyone.

---

## PART 7 — Run locally to test

Before going live, verify everything works on your own computer.

### Step 1 — Start the app

```
npm run dev
```

Wait about 15 seconds until you see:
```
▲ Next.js 14
- Local: http://localhost:3000
✓ Ready
```

### Step 2 — Open in your browser

Go to: **http://localhost:3000**

You should see the Folio homepage.

### Step 3 — Create an account and test

1. Click **Get started free**
2. Fill in your name, email, and a password
3. Check your email for a confirmation link and click it
4. Complete the onboarding steps
5. Create a test document, share it, open the share link — confirm tracking works

### Step 4 — Stop the server when done

Press `Ctrl + C` in the terminal.

---

## PART 8 — Deploy live on Vercel

This puts your app on the internet so anyone can access it.

### Step 1 — Create a Vercel account

1. Go to https://vercel.com
2. Click **Sign Up**
3. Choose **Continue with GitHub** — this links Vercel to your GitHub account directly

### Step 2 — Import your project

1. Once logged in, click **Add New** → **Project**
2. You will see a list of your GitHub repositories
3. Find **folio** and click **Import**

### Step 3 — Add your environment variables

This is the most important step. Vercel needs the same secret keys as your
`.env.local` file — but you must add them manually here.

On the import screen, scroll down to **Environment Variables** and add each
one by clicking **Add** for each row:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key |
| `NEXT_PUBLIC_APP_URL` | Leave blank for now — you will update this in Step 5 |
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `RESEND_API_KEY` | Your Resend key |

### Step 4 — Deploy

Click **Deploy**. Vercel builds and deploys your app in 1–3 minutes.
You will see a progress screen, then a **Congratulations** page with a link.

### Step 5 — Update your app URL

1. Your live URL will look like `https://folio-abc123.vercel.app`
2. Go to Vercel → your project → **Settings** → **Environment Variables**
3. Find `NEXT_PUBLIC_APP_URL`
4. Update its value to your actual live URL, for example:
   `https://folio-abc123.vercel.app`
5. Click **Save**

### Step 6 — Redeploy with the updated URL

1. Go to Vercel → your project → **Deployments** tab
2. Click the three dots `...` next to the most recent deployment
3. Click **Redeploy**
4. Wait 1–2 minutes

Your app is now fully live. Share the URL with anyone and it will work.

### Step 7 — Test the live version

Open your Vercel URL in a browser. Sign up, create a document, share it,
open the share link from a different browser or device — everything should
work exactly as it did locally.

---

## PART 9 — Connect a custom domain (optional)

If you own a domain like `myfolio.com` and want to use it:

1. In Vercel, go to your project → **Settings** → **Domains**
2. Type your domain and click **Add**
3. Vercel gives you DNS records to add to your domain
4. Log into wherever you bought your domain (GoDaddy, Namecheap, etc.)
5. Find the **DNS settings** for your domain and add the records Vercel provided
6. Wait up to 24 hours (usually under 1 hour) for it to activate
7. Update `NEXT_PUBLIC_APP_URL` in Vercel to your custom domain
8. Redeploy

---

## PART 10 — How to update your app going forward

Every time you change any code file:

1. Save your changes
2. In the terminal, inside the `folio` folder:
   ```
   git add .
   git commit -m "Brief description of what changed"
   git push
   ```
3. Vercel detects the push automatically and redeploys within 1–2 minutes
4. No further action needed — your live site updates itself

---

## Troubleshooting

**"npm: command not found"**
Node.js did not install properly. Reinstall it from https://nodejs.org

**"Cannot find module" when running npm run dev**
You skipped `npm install`. Run it now, then try again.

**White screen or error after opening the app locally**
Your `.env.local` has a typo. Open it and check every line carefully.
No spaces around `=`, no missing characters, no quote marks.

**"Invalid API key" when logging in**
Your Supabase anon key is wrong. Copy it again from Supabase → Settings → API.

**"relation does not exist" error**
The database schema did not run successfully.
Go back to Part 3 Step 3 and run the SQL again in Supabase.

**Vercel build fails**
Click the failed deployment to read the error logs.
The most common cause is a missing or mistyped environment variable —
check that all 6 are present and correct in Vercel's environment settings.

**Share links open but tracking does not record**
Make sure `NEXT_PUBLIC_APP_URL` is set to your live Vercel URL and not
`http://localhost:3000`, and that you redeployed after changing it.

**Emails are not arriving**
Resend requires a verified domain to send from a custom address.
For testing, this is fine. For production, add and verify your domain in
the Resend dashboard under **Domains**, then update the `from` address
in `app/api/notify/route.ts` to `notifications@yourdomain.com`.

---

## What everything costs

| Service | What is free | When you would pay |
|---|---|---|
| GitHub | Free forever | Never for a project this size |
| Supabase | 500MB database, 50,000 users/month | Only when you grow very large |
| Anthropic | Pay per use | ~$0.001 per AI document draft |
| Resend | 3,000 emails/month | Only beyond 3,000/month |
| Vercel | Unlimited personal projects | Commercial use or very high traffic |

**Realistic cost for your first 6–12 months: $0 to $5/month.**
