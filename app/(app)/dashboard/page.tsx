'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatRelativeTime, formatDuration, getDocumentTypeLabel, getEngagementLabel, cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { Badge, StatCard, EmptyState } from '@/components/ui'
import LiveActivity from '@/components/realtime/LiveActivity'
import UploadModal from '@/components/editor/UploadModal'
import type { Database } from '@/lib/supabase/client'

type Document = Database['public']['Tables']['documents']['Row']

const TYPE_FILTERS = ['All', 'Pitch deck', 'Proposal', 'Document']

export default function DashboardPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [userId, setUserId] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    loadDocs()
  }, [])

  async function loadDocs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
    setDocs(data ?? [])
    setLoading(false)
  }

  async function createDocument(type: 'document' | 'pitch_deck' | 'proposal') {
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('documents').insert({
      title: 'Untitled',
      type,
      user_id: user.id,
      cover_emoji: type === 'pitch_deck' ? '🚀' : type === 'proposal' ? '💼' : '📄',
      status: 'draft',
    }).select().single()
    if (data) router.push(`/documents/${data.id}`)
  }

  const filtered = docs.filter(d => {
    const matchType = filter === 'All' || getDocumentTypeLabel(d.type).toLowerCase() === filter.toLowerCase()
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const totalViews = docs.reduce((s, d) => s + d.total_views, 0)
  const totalTime = docs.reduce((s, d) => s + d.total_time_seconds, 0)
  const activeCount = docs.filter(d => d.status === 'active').length

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: '#1C1917', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Your documents</h1>
          <p style={{ fontSize: 14, color: '#6B6559', margin: 0 }}>{docs.length} document{docs.length !== 1 ? 's' : ''} · {activeCount} active</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setShowUpload(true)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 9V2M3.5 5L6.5 2l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10v1.5a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Upload
          </Button>
          <div style={{ position: 'relative' }}>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#DC6B19', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}
              onClick={() => createDocument('document')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
              New document
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total views" value={totalViews.toLocaleString()} sub="across all docs" />
        <StatCard label="Time read" value={formatDuration(totalTime)} sub="total viewer time" />
        <StatCard label="Active links" value={activeCount} sub="live documents" />
        <StatCard label="Documents" value={docs.length} sub="in workspace" />
      </div>

      {/* Quick create */}
      {docs.length === 0 && !loading && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#9C9389', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Start with a template</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { type: 'pitch_deck' as const, emoji: '🚀', label: 'Pitch deck', desc: 'For founders raising capital' },
              { type: 'proposal' as const, emoji: '💼', label: 'Proposal', desc: 'For sales, agencies & freelancers' },
              { type: 'document' as const, emoji: '📄', label: 'Document', desc: 'Reports, memos, briefs' },
            ].map(t => (
              <button key={t.type} onClick={() => createDocument(t.type)} disabled={creating}
                style={{ background: 'white', border: '1px solid #E5E0D8', borderRadius: 14, padding: '20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#DC6B19'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #FFF3E8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E0D8'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>{t.emoji}</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: '0 0 4px' }}>{t.label}</p>
                <p style={{ fontSize: 13, color: '#9C9389', margin: 0 }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters + search */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9C9389' }}><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, border: '1px solid #E5E0D8', borderRadius: 9, fontSize: 14, color: '#1C1917', background: 'white', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TYPE_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: 8, border: filter === f ? '1px solid #DC6B19' : '1px solid #E5E0D8', background: filter === f ? '#FFF3E8' : 'white', color: filter === f ? '#DC6B19' : '#6B6559', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filter === f ? 500 : 400 }}
              >{f}</button>
            ))}
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, background: '#F5F3EF', borderRadius: 12, animation: 'pulse 2s infinite' }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📂"
          title={search ? 'No documents match your search' : 'No documents yet'}
          description={search ? 'Try a different search term' : 'Create your first document to start tracking engagement'}
          action={!search ? <Button variant="primary" onClick={() => createDocument('document')}>Create document</Button> : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(doc => (
            <DocumentRow key={doc.id} doc={doc} onRefresh={loadDocs} />
          ))}
        </div>
      )}

      {/* Live activity feed */}
      {userId && docs.length > 0 && (
        <LiveActivity userId={userId} documentIds={docs.map(d => d.id)} />
      )}

      {showUpload && <UploadModal onClose={() => { setShowUpload(false); loadDocs() }} />}
    </div>
  )
}

function DocumentRow({ doc, onRefresh }: { doc: Document; onRefresh: () => void }) {
  const router = useRouter()
  const engagement = doc.total_views > 0 ? getEngagementLabel(Math.min(Math.round((doc.total_time_seconds / Math.max(doc.total_views, 1)) / 2), 100)) : null

  return (
    <div
      onClick={() => router.push(`/documents/${doc.id}`)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'white', border: '1px solid #E5E0D8', borderRadius: 12, cursor: 'pointer', transition: 'border-color 0.1s, box-shadow 0.1s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D0C9BE'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(28,25,23,0.06)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E0D8'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{doc.cover_emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 500, color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title || 'Untitled'}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#9C9389' }}>{getDocumentTypeLabel(doc.type)} · {formatRelativeTime(doc.updated_at)}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1C1917' }}>{doc.total_views}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#9C9389' }}>views</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1C1917' }}>{formatDuration(doc.total_time_seconds)}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#9C9389' }}>read time</p>
        </div>
        {engagement && (
          <Badge variant={engagement.label === 'Highly engaged' ? 'success' : engagement.label === 'Engaged' ? 'brand' : 'default'}>
            {engagement.label}
          </Badge>
        )}
        <Badge variant={doc.status === 'active' ? 'success' : 'default'}>
          {doc.status === 'active' ? 'Live' : 'Draft'}
        </Badge>
        <Link href={`/documents/${doc.id}/analytics`} onClick={e => e.stopPropagation()}
          style={{ padding: '5px 10px', background: '#F5F3EF', border: '1px solid #E5E0D8', borderRadius: 7, fontSize: 12, color: '#6B6559', textDecoration: 'none', fontWeight: 500 }}>
          Analytics
        </Link>
      </div>
    </div>
  )
}
