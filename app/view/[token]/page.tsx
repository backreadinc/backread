'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { computeEngagementScore } from '@/lib/utils'
import type { Database } from '@/lib/supabase/client'

type Document = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

interface ViewerState {
  step: 'loading' | 'email_gate' | 'password_gate' | 'viewing' | 'expired' | 'not_found'
  doc?: Document
  link?: ShareLink
  sessionId?: string
  totalPages: number
  currentPage: number
}

export default function ViewerPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<ViewerState>({ step: 'loading', totalPages: 1, currentPage: 1 })
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const pageStartRef = useRef<number>(Date.now())
  const pageTimesRef = useRef<Record<number, number>>({})
  const sessionStartRef = useRef<number>(Date.now())
  const currentPageRef = useRef(1)

  useEffect(() => { initViewer() }, [params.token])

  useEffect(() => {
    if (state.step !== 'viewing') return
    const onVisChange = () => {
      if (document.hidden) recordPageExit()
      else { pageStartRef.current = Date.now() }
    }
    const onUnload = () => { recordPageExit(); finalizeSession() }
    document.addEventListener('visibilitychange', onVisChange)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisChange)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [state.step, state.sessionId])

  async function initViewer() {
    const { data: link } = await supabase.from('share_links').select('*').eq('token', params.token).single()
    if (!link) { setState(s => ({ ...s, step: 'not_found' })); return }
    if (!link.is_active || (link.expires_at && new Date(link.expires_at) < new Date())) {
      setState(s => ({ ...s, step: 'expired' })); return
    }
    const { data: doc } = await supabase.from('documents').select('*').eq('id', link.document_id).single()
    if (!doc) { setState(s => ({ ...s, step: 'not_found' })); return }

    const contentPages = doc.content ? Math.max(1, Math.ceil(doc.content.length / 3000)) : 1

    if (link.require_email) {
      setState(s => ({ ...s, step: 'email_gate', doc, link, totalPages: contentPages }))
    } else if (link.password) {
      setState(s => ({ ...s, step: 'password_gate', doc, link, totalPages: contentPages }))
    } else {
      await startSession(link, doc, contentPages)
    }
  }

  async function handleEmailSubmit() {
    if (!email || !state.link || !state.doc) return
    if (state.link.password) { setState(s => ({ ...s, step: 'password_gate' })); return }
    await startSession(state.link, state.doc, state.totalPages, email, name)
  }

  async function handlePasswordSubmit() {
    if (!state.link || !state.doc) return
    if (password !== state.link.password) { setPwError('Incorrect password'); return }
    await startSession(state.link, state.doc, state.totalPages, email, name)
  }

  async function startSession(link: ShareLink, doc: Document, totalPages: number, viewerEmail?: string, viewerName?: string) {
    const referrer = typeof window !== 'undefined' ? document.referrer : ''
    const device = typeof window !== 'undefined' ? (/Mobile|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop') : 'desktop'
    const { data: session } = await supabase.from('view_sessions').insert({
      share_link_id: link.id,
      document_id: link.document_id,
      viewer_email: viewerEmail ?? null,
      viewer_name: viewerName ?? null,
      device_type: device,
      referrer: referrer ?? null,
      total_time_seconds: 0,
      pages_viewed: 0,
      completion_rate: 0,
      engagement_score: 0,
    }).select().single()

    await supabase.from('share_links').update({ view_count: (link.view_count ?? 0) + 1 }).eq('id', link.id)
    await supabase.from('documents').update({ total_views: (doc.total_views ?? 0) + 1 }).eq('id', doc.id)

    // Fire email notification (non-blocking)
    if (session?.id) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      }).catch(() => {})
    }

    sessionStartRef.current = Date.now()
    pageStartRef.current = Date.now()

    setState({ step: 'viewing', doc, link, sessionId: session?.id, totalPages, currentPage: 1 })
    recordPageEnter(session?.id ?? '', link.document_id, 1)
  }

  async function recordPageEnter(sessionId: string, docId: string, page: number) {
    await supabase.from('page_events').insert({
      session_id: sessionId,
      document_id: docId,
      page_number: page,
      event_type: 'enter',
      time_spent_seconds: 0,
      scroll_depth: 0,
    })
  }

  function recordPageExit() {
    if (!state.sessionId || !state.doc) return
    const timeSpent = Math.round((Date.now() - pageStartRef.current) / 1000)
    const page = currentPageRef.current
    pageTimesRef.current[page] = (pageTimesRef.current[page] ?? 0) + timeSpent

    supabase.from('page_events').insert({
      session_id: state.sessionId,
      document_id: state.doc.id,
      page_number: page,
      event_type: 'exit',
      time_spent_seconds: timeSpent,
      scroll_depth: 1,
    })
  }

  async function finalizeSession() {
    if (!state.sessionId || !state.doc) return
    const totalTime = Math.round((Date.now() - sessionStartRef.current) / 1000)
    const pagesViewed = Object.keys(pageTimesRef.current).length
    const completionRate = Math.min(pagesViewed / state.totalPages, 1)
    const avgTime = totalTime / Math.max(pagesViewed, 1)
    const engagementScore = computeEngagementScore({ completionRate, avgTimePerPage: avgTime, revisitCount: 0, hasForwarded: false })

    await supabase.from('view_sessions').update({
      ended_at: new Date().toISOString(),
      total_time_seconds: totalTime,
      pages_viewed: pagesViewed,
      completion_rate: completionRate,
      engagement_score: engagementScore,
    }).eq('id', state.sessionId)

    await supabase.from('documents').update({ total_time_seconds: (state.doc.total_time_seconds ?? 0) + totalTime }).eq('id', state.doc.id)

    // Trigger AI insight generation (non-blocking)
    fetch('/api/ai/generate-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId, documentId: state.doc.id }),
    }).catch(() => {})
  }

  function navigatePage(dir: 1 | -1) {
    recordPageExit()
    const next = Math.max(1, Math.min(state.totalPages, state.currentPage + dir))
    currentPageRef.current = next
    pageStartRef.current = Date.now()
    setState(s => ({ ...s, currentPage: next }))
    if (state.sessionId && state.doc) recordPageEnter(state.sessionId, state.doc.id, next)
  }

  // ---- Render gates ----
  if (state.step === 'loading') return <ViewerShell><LoadingScreen /></ViewerShell>
  if (state.step === 'not_found') return <ViewerShell><GateScreen icon="🔍" title="Link not found" body="This link may have been removed or is invalid." /></ViewerShell>
  if (state.step === 'expired') return <ViewerShell><GateScreen icon="⏰" title="Link expired" body="This sharing link is no longer active." /></ViewerShell>

  if (state.step === 'email_gate') return (
    <ViewerShell>
      <GateForm
        title={`Enter your details to view this document`}
        docTitle={state.doc?.title}
        emoji={state.doc?.cover_emoji ?? '📄'}
        onSubmit={handleEmailSubmit}
      >
        <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
      </GateForm>
    </ViewerShell>
  )

  if (state.step === 'password_gate') return (
    <ViewerShell>
      <GateForm title="This document is password protected" emoji="🔒" onSubmit={handlePasswordSubmit}>
        <input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
        {pwError && <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{pwError}</p>}
      </GateForm>
    </ViewerShell>
  )

  // ---- Viewer ----
  const content = state.doc?.content ?? ''
  const pages = splitContentIntoPages(content, state.totalPages)
  const currentContent = pages[state.currentPage - 1] ?? ''

  return (
    <div style={{ minHeight: '100vh', background: '#E8E4DC', display: 'flex', flexDirection: 'column' }}>
      {/* Viewer topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E0D8', height: 52, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 20 }}>{state.doc?.cover_emoji}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.doc?.title}</span>
        <span style={{ fontSize: 13, color: '#9C9389' }}>Page {state.currentPage} of {state.totalPages}</span>
        {state.link?.allow_download && (
          <button style={{ padding: '5px 12px', background: '#F5F3EF', border: '1px solid #E5E0D8', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#6B6559', fontFamily: 'inherit' }}>
            Download
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#C4BDB4' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC6B19', animation: 'pulse-dot 2s infinite' }}/>
          Tracked by Folio
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="viewer-page" style={{ width: '100%', maxWidth: 760, minHeight: 600, background: 'white', borderRadius: 4, padding: '60px 72px' }}>
          <div dangerouslySetInnerHTML={{ __html: currentContent }} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 16, lineHeight: 1.7, color: '#1C1917' }} />
        </div>
      </div>

      {/* Navigation */}
      {state.totalPages > 1 && (
        <div style={{ background: 'white', borderTop: '1px solid #E5E0D8', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'sticky', bottom: 0 }}>
          <button onClick={() => navigatePage(-1)} disabled={state.currentPage === 1}
            style={{ padding: '7px 16px', background: state.currentPage === 1 ? '#F5F3EF' : 'white', border: '1px solid #E5E0D8', borderRadius: 9, cursor: state.currentPage === 1 ? 'default' : 'pointer', color: state.currentPage === 1 ? '#C4BDB4' : '#1C1917', fontSize: 13, fontFamily: 'inherit' }}>
            ← Previous
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: state.totalPages }, (_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i + 1 === state.currentPage ? '#DC6B19' : '#E5E0D8', transition: 'background 0.2s' }} />
            ))}
          </div>
          <button onClick={() => navigatePage(1)} disabled={state.currentPage === state.totalPages}
            style={{ padding: '7px 16px', background: state.currentPage === state.totalPages ? '#F5F3EF' : 'white', border: '1px solid #E5E0D8', borderRadius: 9, cursor: state.currentPage === state.totalPages ? 'default' : 'pointer', color: state.currentPage === state.totalPages ? '#C4BDB4' : '#1C1917', fontSize: 13, fontFamily: 'inherit' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function splitContentIntoPages(html: string, totalPages: number): string[] {
  if (totalPages <= 1) return [html]
  const chunkSize = Math.ceil(html.length / totalPages)
  return Array.from({ length: totalPages }, (_, i) => html.slice(i * chunkSize, (i + 1) * chunkSize))
}

function ViewerShell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
}

function LoadingScreen() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E5E0D8', borderTopColor: '#DC6B19', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ fontSize: 14, color: '#9C9389' }}>Loading document…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function GateScreen({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 380 }}>
      <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>{icon}</span>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#1C1917', margin: '0 0 8px' }}>{title}</h2>
      <p style={{ fontSize: 15, color: '#6B6559', lineHeight: 1.6 }}>{body}</p>
    </div>
  )
}

function GateForm({ title, body, emoji, docTitle, onSubmit, children }: {
  title: string; body?: string; emoji?: string; docTitle?: string; onSubmit: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {docTitle && (
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>{emoji}</span>
          <p style={{ fontSize: 13, color: '#9C9389', margin: '0 0 4px' }}>You've been invited to view</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#1C1917', margin: 0 }}>{docTitle}</p>
        </div>
      )}
      <div style={{ background: 'white', border: '1px solid #E5E0D8', borderRadius: 16, padding: 28 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1C1917', margin: '0 0 6px', letterSpacing: '-0.01em' }}>{title}</h2>
        {body && <p style={{ fontSize: 14, color: '#6B6559', margin: '0 0 20px' }}>{body}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          {children}
          <button onClick={onSubmit}
            style={{ height: 40, background: '#DC6B19', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}>
            View document →
          </button>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#C4BDB4', marginTop: 16 }}>
        Tracked by Folio · The sender can see how you interact with this document
      </p>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 40, width: '100%', border: '1px solid #E5E0D8', borderRadius: 9, padding: '0 12px', fontSize: 14, color: '#1C1917', fontFamily: 'inherit', outline: 'none', background: 'white'
}
