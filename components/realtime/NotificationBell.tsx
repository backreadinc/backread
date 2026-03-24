'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  body: string
  document_id: string
  priority: string
  is_read: boolean
  created_at: string
  insight_type: string
}

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    loadNotifs()
    // Subscribe to new insights
    const channel = supabase.channel(`notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_insights' }, () => loadNotifs())
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [userId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadNotifs() {
    // Get document IDs for this user
    const { data: docs } = await supabase.from('documents').select('id').eq('user_id', userId)
    if (!docs?.length) return
    const docIds = docs.map(d => d.id)
    const { data } = await supabase
      .from('ai_insights')
      .select('*')
      .in('document_id', docIds)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data ?? [])
  }

  async function markAllRead() {
    const ids = notifs.filter(n => !n.is_read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('ai_insights').update({ is_read: true }).in('id', ids)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('ai_insights').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const typeIcon: Record<string, string> = {
    action: '💡', benchmark: '📊', anomaly: '⚡', engagement: '👁'
  }
  const priorityColor: Record<string, string> = {
    critical: '#DC2626', high: '#D97706', medium: '#DC6B19', low: '#9C9389'
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #E5E0D8', borderRadius: 9, cursor: 'pointer', color: '#6B6559' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5A5 5 0 003 6.5v3.5L1.5 12h13L13 10V6.5A5 5 0 008 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M6.5 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#DC6B19', borderRadius: '50%', fontSize: 10, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 360, background: 'white', border: '1px solid #E5E0D8', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1917' }}>Insights</span>
              {unread > 0 && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 7px', background: '#FFF3E8', color: '#DC6B19', borderRadius: 99, fontWeight: 600 }}>{unread} new</span>}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 12, color: '#9C9389', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Mark all read</button>
            )}
          </div>

          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9C9389', fontSize: 13 }}>
                <p style={{ fontSize: 24, margin: '0 0 8px' }}>🔔</p>
                No insights yet. Share documents to start tracking.
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); router.push(`/documents/${n.document_id}/analytics`); setOpen(false) }}
                style={{ padding: '12px 16px', borderBottom: '1px solid #F5F3EF', cursor: 'pointer', background: n.is_read ? 'white' : '#FFFBF7', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F5F3EF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.is_read ? 'white' : '#FFFBF7'}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{typeIcon[n.insight_type] ?? '📊'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1C1917', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                      <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor[n.priority] ?? '#9C9389', flexShrink: 0 }}>{n.priority?.toUpperCase()}</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6B6559', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#C4BDB4' }}>{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC6B19', flexShrink: 0, marginTop: 4 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
