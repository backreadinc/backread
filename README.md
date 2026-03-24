# Folio

> Send documents. See everything. Know what to do next.

Folio is a full-stack document intelligence platform — create pitch decks, proposals, and reports, share with controlled links, and track every viewer interaction with AI-powered insights.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend/DB | Supabase (Postgres + Auth + Realtime + Storage) |
| AI | Anthropic Claude API |
| Email | Resend |
| Deployment | Vercel (or any Node.js host) |
| Editor | TipTap (ProseMirror-based) |

---

## Quick start

### 1. Clone and install

```bash
git clone <your-repo>
cd folio
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `lib/supabase/schema.sql` in the Supabase SQL editor
3. Enable Google OAuth in Authentication → Providers (optional)
4. Copy your project URL and anon key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
folio/
├── app/
│   ├── (auth)/          # Login, signup
│   ├── (app)/           # Authenticated app
│   │   ├── dashboard/   # Document list + stats
│   │   ├── documents/
│   │   │   ├── [id]/           # Editor
│   │   │   └── [id]/analytics/ # Per-doc analytics
│   │   └── settings/
│   ├── view/[token]/    # Public viewer (no auth required)
│   └── api/
│       ├── ai/insights/ # Claude-powered insight generation
│       ├── documents/
│       ├── events/
│       └── share/
├── components/
│   ├── ui/              # Button, Input, Card, Badge, etc.
│   ├── editor/          # TipTap toolbar and extensions
│   ├── viewer/          # Browser-native document viewer
│   └── analytics/       # Charts and heatmap components
└── lib/
    ├── supabase/        # Client, types, schema
    └── utils/           # Token gen, scoring, formatting
```

---

## Key features built

### Document creation
- Rich text editor (TipTap) with full formatting toolbar
- Emoji cover picker
- Auto-save every 1.5s
- PDF/PPTX import ready (connect to file upload)

### Controlled sharing
- Generate multiple named links per document
- Password protection
- Email gate (require name + email before viewing)
- Download control (allow/deny)
- Link enable/disable toggle

### Browser-native viewer
- Sandboxed, no right-click download
- Real-time event tracking (page enter/exit, time-on-page)
- Transparent tracking badge
- Page navigation with dot indicators
- Session assembly: groups events into sessions

### Analytics
- Per-session engagement score (0–100)
- Page attention heatmap (color-coded by time spent)
- Forwarding detection (parent_session_id)
- Viewer identity (email, name, device, location)

### AI intelligence (Claude)
- Tier 1: Raw engagement data
- Tier 2: Benchmarked context (coming with volume)
- Tier 3: Prescriptive next-action recommendations
- Powered by `app/api/ai/insights/route.ts`

---

## Database schema

5 tables:
- `documents` — document content and metadata
- `share_links` — controlled share URLs with access settings
- `view_sessions` — per-viewer engagement sessions
- `page_events` — granular page-level tracking events
- `ai_insights` — stored AI-generated recommendations

Full RLS policies: users only access their own data. Viewers can insert sessions/events but cannot read them.

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set the same env vars in Vercel dashboard → Project → Settings → Environment Variables.

---

## Next steps to build

- [ ] File upload (PDF/PPTX) with conversion to viewer format
- [ ] Slide deck mode (full-screen, arrow navigation)
- [ ] AI document drafter (generate first draft from brief)
- [ ] Real-time dashboard (Supabase Realtime subscriptions)
- [ ] Email notifications on document open (Resend)
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Team workspaces (multi-user)
- [ ] Custom domain for share links
- [ ] E-signature integration
