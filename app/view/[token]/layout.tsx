import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const { data: link } = await supabase
    .from('share_links')
    .select('document_id, label')
    .eq('token', params.token)
    .single()

  if (!link) return { title: 'Document · Folio', description: 'View this document on Folio.' }

  const { data: doc } = await supabase
    .from('documents')
    .select('title, cover_emoji, type')
    .eq('id', link.document_id)
    .single()

  if (!doc) return { title: 'Document · Folio', description: 'View this document on Folio.' }

  const title = `${doc.cover_emoji ?? '📄'} ${doc.title}`
  const description = `View ${doc.title} — shared via Folio`

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'Folio' },
    twitter: { card: 'summary', title, description },
  }
}

export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
