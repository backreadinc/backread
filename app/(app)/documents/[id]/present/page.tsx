'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

interface Slide {
  index: number
  html: string
  timeSpent: number
}

function parseSlides(html: string): string[] {
  if (!html) return ['']
  // Split on <hr> tags (section dividers) or h1/h2 headings
  const parts = html
    .split(/(<hr\s*\/?>)/gi)
    .filter(p => p && !p.match(/^<hr/i))
  
  if (parts.length <= 1) {
    // Fallback: split on every h2 heading
    const h2Split = html.split(/(?=<h2[\s>])/i)
    if (h2Split.length > 1) return h2Split.filter(Boolean)
    // Last resort: one slide per ~800 chars
    const chunks: string[] = []
    let i = 0
    while (i < html.length) {
      chunks.push(html.slice(i, i + 800))
      i += 800
    }
    return chunks.filter(Boolean)
  }
  return parts.filter(Boolean)
}

export default function PresentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [slides, setSlides] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [docTitle, setDocTitle] = useState('')
  const [docEmoji, setDocEmoji] = useState('📄')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showNav, setShowNav] = useState(true)
  const [loading, setLoading] = useState(true)
  const slideTimers = useRef<Record<number, number>>({})
  const slideStartRef = useRef(Date.now())
  const sessionStartRef = useRef(Date.now())
  const navTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadDoc()
  }, [params.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        router.push(`/documents/${params.id}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, slides.length])

  // Auto-hide nav after inactivity
  useEffect(() => {
    const onMove = () => {
      setShowNav(true)
      if (navTimeout.current) clearTimeout(navTimeout.current)
      navTimeout.current = setTimeout(() => setShowNav(false), 3000)
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (navTimeout.current) clearTimeout(navTimeout.current) }
  }, [])

  async function loadDoc() {
    const { data: doc } = await supabase.from('documents').select('*').eq('id', params.id).single()
    if (!doc) { router.push('/dashboard'); return }
    setDocTitle(doc.title)
    setDocEmoji(doc.cover_emoji ?? '📄')
    const parsed = parseSlides(doc.content ?? '')
    setSlides(parsed)
    setLoading(false)
    slideStartRef.current = Date.now()
    sessionStartRef.current = Date.now()
  }

  function recordSlideTime(idx: number) {
    const spent = Math.round((Date.now() - slideStartRef.current) / 1000)
    slideTimers.current[idx] = (slideTimers.current[idx] ?? 0) + spent
  }

  function goNext() {
    setCurrent(c => {
      if (c >= slides.length - 1) return c
      recordSlideTime(c)
      slideStartRef.current = Date.now()
      return c + 1
    })
  }

  function goPrev() {
    setCurrent(c => {
      if (c <= 0) return c
      recordSlideTime(c)
      slideStartRef.current = Date.now()
      return c - 1
    })
  }

  function goTo(idx: number) {
    recordSlideTime(current)
    slideStartRef.current = Date.now()
    setCurrent(idx)
  }

  async function exitPresent() {
    recordSlideTime(current)
    router.push(`/documents/${params.id}`)
  }

  const progress = slides.length > 0 ? ((current + 1) / slides.length) * 100 : 0

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#DC6B19', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14, opacity: 0.5, margin: 0 }}>Loading presentation…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ height: '100vh', background: '#0F172A', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: showNav ? 'default' : 'none', userSelect: 'none' }}
      onClick={goNext}
    >
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', zIndex: 50 }}>
        <div style={{ height: '100%', background: '#DC6B19', width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Top bar — shown on hover */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(to bottom, rgba(15,23,42,0.9) 0%, transparent 100%)',
        opacity: showNav ? 1 : 0, transition: 'opacity 0.3s ease',
        pointerEvents: showNav ? 'auto' : 'none',
      }}>
        <button onClick={e => { e.stopPropagation(); exitPresent() }}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 1.5L3 6l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Exit
        </button>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{docEmoji} {docTitle}</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{current + 1} / {slides.length}</span>
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 60px' }}>
        <div style={{
          width: '100%', maxWidth: 900, background: 'white', borderRadius: 12,
          padding: '64px 80px', minHeight: 440,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.25s ease-out',
          overflow: 'auto', maxHeight: 'calc(100vh - 160px)',
        }}>
          <div
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 18, lineHeight: 1.7, color: '#1C1917' }}
            dangerouslySetInnerHTML={{ __html: slides[current] ?? '' }}
          />
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 100%)',
        opacity: showNav ? 1 : 0, transition: 'opacity 0.3s ease',
        pointerEvents: showNav ? 'auto' : 'none',
      }}>
        {/* Slide dots */}
        <button onClick={e => { e.stopPropagation(); goPrev() }} disabled={current === 0}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: current === 0 ? 'default' : 'pointer', opacity: current === 0 ? 0.3 : 1 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slides.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); goTo(i) }}
              style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? '#DC6B19' : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s ease' }} />
          ))}
        </div>

        <button onClick={e => { e.stopPropagation(); goNext() }} disabled={current === slides.length - 1}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: current === slides.length - 1 ? 'default' : 'pointer', opacity: current === slides.length - 1 ? 0.3 : 1 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <span style={{ position: 'absolute', right: 28, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>← → or click to navigate · Esc to exit</span>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
