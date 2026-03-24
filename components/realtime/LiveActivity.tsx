'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatRelativeTime, formatDuration } from '@/lib/utils'

interface LiveEvent {
  id: string
  type: 'view_opened' | 'page_turn' | 'session_ended'
  documentTitle: string
  documentEmoji: string
  documentId: string
  viewer: string
  detail: string
  timestamp: Date
}

interface LiveActivityProps {
  userId: string
  documentIds: string[]
}

export default function LiveActivity({ userId, documentIds }: LiveActivityProps) {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [liveCount, setLiveCount] = useState(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const docMapRef = useRef<Record<string, { title: string; emoji: string }>>({})

  useEffect(() => {
    if (documentIds.length === 0) return

    // Pre-fetch document titles for display
    supabase.from('documents').select('id,title,cover_emoji').in('id', documentIds)
      .then(({ data }) => {
        if (data) data.forEach(d => { docMapRef.current[d.id] = { title: d.title, emoji: d.cover_emoji ?? '📄' } })
      })

    // Subscribe to new view sessions
    const channel = supabase.channel(`live-activity-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'view_sessions',
        filter: `document_id=in.(${documentIds.join(',')})`,
      }, payload => {
        const row = payload.new as any
        const doc = docMapRef.current[row.document_id] ?? { title: 'Document', emoji: '📄' }
        const evt: LiveEvent = {
          id: row.id,
          type: 'view_opened',
          documentTitle: doc.title,
          documentEmoji: doc.emoji,
          documentId: row.document_id,
          viewer: row.viewer_name ?? row.viewer_email ?? 'Anonymous',
          detail: `Opened from ${row.device_type ?? 'unknown device'}`,
          timestamp: new Date(),
        }
        setEvents(prev => [evt, ...prev].slice(0, 20))
        setLiveCount(c => c + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'view_sessions',
        filter: `document_id=in.(${documentIds.join(',')})`,
      }, payload => {
        const row = payload.new as any
        if (row.ended_at && !payload.old.ended_at) {
          const doc = docMapRef.current[row.document_id] ?? { title: 'Document', emoji: '📄' }
          const evt: LiveEvent = {
            id: `${row.id}-end`,
            type: 'session_ended',
            documentTitle: doc.title,
            documentEmoji: doc.emoji,
            documentId: row.document_id,
            viewer: row.viewer_name ?? row.viewer_email ?? 'Anonymous',
            detail: `Read for ${formatDuration(row.total_time_seconds)} · ${Math.round(row.completion_rate * 100)}% complete`,
            timestamp: new Date(),
          }
          setEvents(prev => [evt, ...prev].slice(0, 20))
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'page_events',
        filter: `document_id=in.(${documentIds.join(',')})`,
      }, payload => {
        const row = payload.new as any
        if (row.event_type === 'enter' && row.page_number > 1) {
          const doc = docMapRef.current[row.document_id] ?? { title: 'Document', emoji: '📄' }
          const evt: LiveEvent = {
            id: `${row.id}-page`,
            type: 'page_turn',
            documentTitle: doc.title,
            documentEmoji: doc.emoji,
            documentId: row.document_id,
            viewer: 'A viewer',
            detail: `Turned to page ${row.page_number}`,
            timestamp: new Date(),
          }
          setEvents(prev => [evt, ...prev].slice(0, 20))
        }
      })
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [userId, documentIds.join(',')])

  if (events.length === 0) return null

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
          <div style={{ position: 'absolute', inset: 0, width: 8, height: 8, borderRadius: '50%', background: '#16A34A', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.5 }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#9C9389', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Live activity {liveCount > 0 && `· ${liveCount} new`}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {events.slice(0, 8).map((evt, i) => (
          <div key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: i === 0 ? '#FFF3E8' : 'white', border: `1px solid ${i === 0 ? '#FED7AA' : '#E5E0D8'}`, borderRadius: 10, transition: 'all 0.3s ease', animation: i === 0 ? 'slideUp 0.3s ease-out' : undefined }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{evt.documentEmoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: '#1C1917', fontWeight: 500 }}>{evt.viewer}</span>
              <span style={{ fontSize: 13, color: '#6B6559' }}> · {evt.detail}</span>
              <span style={{ fontSize: 13, color: '#9C9389' }}> on </span>
              <a href={`/documents/${evt.documentId}/analytics`} style={{ fontSize: 13, color: '#DC6B19', fontWeight: 500, textDecoration: 'none' }}>{evt.documentTitle}</a>
            </div>
            <span style={{ fontSize: 11, color: '#9C9389', flexShrink: 0 }}>just now</span>
          </div>
        ))}
      </div>
    </div>
  )
}
