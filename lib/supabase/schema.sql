-- ============================================
-- FOLIO DATABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ============================================

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT,
  type TEXT NOT NULL DEFAULT 'document' CHECK (type IN ('document', 'pitch_deck', 'proposal')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_emoji TEXT DEFAULT '📄',
  total_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Share links
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT,
  password TEXT,
  require_email BOOLEAN DEFAULT FALSE,
  allow_download BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View sessions
CREATE TABLE IF NOT EXISTS view_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  viewer_email TEXT,
  viewer_name TEXT,
  viewer_ip TEXT,
  viewer_location TEXT,
  device_type TEXT,
  referrer TEXT,
  parent_session_id UUID REFERENCES view_sessions(id),
  total_time_seconds INTEGER DEFAULT 0,
  pages_viewed INTEGER DEFAULT 0,
  completion_rate FLOAT DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Page-level events
CREATE TABLE IF NOT EXISTS page_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES view_sessions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('enter','exit','focus','blur')),
  time_spent_seconds INTEGER DEFAULT 0,
  scroll_depth FLOAT DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- AI insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES view_sessions(id) ON DELETE SET NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('engagement','action','benchmark','anomaly')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Documents: owners only
CREATE POLICY "Users own their documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

-- Share links: document owners
CREATE POLICY "Users manage their share links" ON share_links
  FOR ALL USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

-- View sessions: document owners can read, anyone can insert
CREATE POLICY "Anyone can create view sessions" ON view_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Document owners can read sessions" ON view_sessions
  FOR SELECT USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );
CREATE POLICY "Sessions can be updated" ON view_sessions
  FOR UPDATE USING (true);

-- Page events: anyone can insert, owners can read
CREATE POLICY "Anyone can create page events" ON page_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Document owners can read events" ON page_events
  FOR SELECT USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

-- AI insights: owners only
CREATE POLICY "Users own their insights" ON ai_insights
  FOR ALL USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_document_id ON share_links(document_id);
CREATE INDEX idx_view_sessions_document_id ON view_sessions(document_id);
CREATE INDEX idx_view_sessions_share_link_id ON view_sessions(share_link_id);
CREATE INDEX idx_page_events_session_id ON page_events(session_id);
CREATE INDEX idx_page_events_document_id ON page_events(document_id);
CREATE INDEX idx_ai_insights_document_id ON ai_insights(document_id);

-- ============================================
-- STORAGE BUCKET SETUP
-- Run this AFTER the main schema
-- ============================================

-- Create the documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own files
CREATE POLICY "Users upload their own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow owners to read their files
CREATE POLICY "Users read their own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read (for shared documents)
CREATE POLICY "Public can read shared files" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'documents');
