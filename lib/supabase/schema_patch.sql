-- ============================================================
-- FOLIO SCHEMA PATCH — run after schema.sql
-- Fixes: viewers cannot read share_links (causes 404 on /view/)
-- ============================================================

-- Public can read active share links (needed for /view/[token] page)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='share_links' AND policyname='public_read') THEN
    CREATE POLICY public_read ON share_links FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

-- Public can read documents via valid share link
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='documents' AND policyname='public_read_via_link') THEN
    CREATE POLICY public_read_via_link ON documents FOR SELECT
      USING (
        id IN (
          SELECT document_id FROM share_links
          WHERE is_active = TRUE
        )
      );
  END IF;
END $$;

-- Increment view count on share link
CREATE OR REPLACE FUNCTION increment_view_count(link_id UUID)
RETURNS void AS $$
  UPDATE share_links SET view_count = COALESCE(view_count, 0) + 1 WHERE id = link_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Increment total views on document
CREATE OR REPLACE FUNCTION increment_doc_views(doc_id UUID)
RETURNS void AS $$
  UPDATE documents SET total_views = COALESCE(total_views, 0) + 1 WHERE id = doc_id;
$$ LANGUAGE SQL SECURITY DEFINER;
