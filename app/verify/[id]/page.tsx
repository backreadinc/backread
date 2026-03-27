'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/client'

type Doc       = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

type Step = 'loading'|'email_gate'|'password_gate'|'viewing'|'signing'|'signed'|'expired'|'not_found'

interface State {
  step: Step
  doc?: Doc
  link?: ShareLink
  sessionId?: string
  pages: any[]
  totalPages: number
  currentPage: number
  sigBlocks: any[]
}

const C = {
  text:'#111111', textMd:'#3D3D3D', textSm:'#6B6B6B',
  accent:'#4F46E5', accentLt:'#EEF2FF',
  border:'#E2E8F0', bg:'#F8FAFC', panel:'#FFFFFF',
  green:'#10B981', red:'#EF4444',
}
const Fui = "'Inter',system-ui,sans-serif"

export default function ViewerPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<State>({ step:'loading', pages:[], totalPages:1, currentPage:1, sigBlocks:[] })
  const [email, setEmail] = useState('')
  const [name, setName]   = useState('')
  const [password, setPassword] = useState('')
  const [pwError, setPwError]   = useState('')

  // Signing state
  const [sigName, setSigName]         = useState('')
  const [sigEmail, setSigEmail]       = useState('')
  const [sigCompany, setSigCompany]   = useState('')
  const [sigType, setSigType]         = useState<'draw'|'type'>('type')
  const [typedSig, setTypedSig]       = useState('')
  const [agreed, setAgreed]           = useState(false)
  const [signing, setSigning]         = useState(false)
  const [activeBlock, setActiveBlock] = useState<any>(null)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing    = useRef(false)

  // Tracking
  const pageStartRef    = useRef(Date.now())
  const sessionStartRef = useRef(Date.now())
  const currentPageRef  = useRef(1)
  const activeTimeRef   = useRef(0)
  const lastActiveRef   = useRef(Date.now())
  const trackTimerRef   = useRef<NodeJS.Timeout|null>(null)

  useEffect(() => { initViewer() }, [params.token]) // eslint-disable-line

  // Active time accumulation — only count when tab is visible
  useEffect(() => {
    if (state.step !== 'viewing') return
    const onVisible = () => {
      if (!document.hidden) lastActiveRef.current = Date.now()
      else activeTimeRef.current += Date.now() - lastActiveRef.current
    }
    const onUnload = () => { recordPageExit(); finalizeSession() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('beforeunload', onUnload)
    trackTimerRef.current = setInterval(() => {
      if (!document.hidden) activeTimeRef.current += 5
    }, 5000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', onUnload)
      if (trackTimerRef.current) clearInterval(trackTimerRef.current)
    }
  }, [state.step, state.sessionId]) // eslint-disable-line

  async function initViewer() {
    const { data: link } = await supabase.from('share_links').select('*').eq('token', params.token).single()
    if (!link) { setState(s => ({ ...s, step:'not_found' })); return }
    if (!link.is_active || (link.expires_at && new Date(link.expires_at) < new Date())) {
      setState(s => ({ ...s, step:'expired' })); return
    }
    const { data: doc } = await supabase.from('documents').select('*').eq('id', link.document_id).single()
    if (!doc) { setState(s => ({ ...s, step:'not_found' })); return }

    const cd = (doc as any).canvas_data
    const pages = cd?.pages ?? []
    const totalPages = Math.max(pages.length, 1)

    // Load signature blocks for this doc
    const { data: sigBlocks } = await supabase.from('signature_blocks').select('*').eq('document_id', doc.id)

    if (link.require_email) {
      setState(s => ({ ...s, step:'email_gate', doc, link, pages, totalPages, sigBlocks: sigBlocks??[] }))
    } else if (link.password) {
      setState(s => ({ ...s, step:'password_gate', doc, link, pages, totalPages, sigBlocks: sigBlocks??[] }))
    } else {
      await startSession(doc, link, pages, totalPages, sigBlocks??[])
    }
  }

  async function startSession(doc: Doc, link: ShareLink, pages: any[], totalPages: number, sigBlocks: any[], viewerEmail?: string, viewerName?: string) {
    // Detect forwarding: check if ref param indicates a parent session
    const urlParams = new URLSearchParams(window.location.search)
    const parentSessionId = urlParams.get('ref') ?? undefined

    const { data: session } = await supabase.from('view_sessions').insert({
      share_link_id: link.id,
      document_id: doc.id,
      viewer_email: viewerEmail,
      viewer_name: viewerName,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      referrer: document.referrer || null,
      parent_session_id: parentSessionId ?? null,
    }).select().single()

    if (!session) return

    // Increment view count
    await supabase.from('share_links').update({ view_count: (link.view_count??0)+1 }).eq('id', link.id)

    pageStartRef.current = Date.now()
    sessionStartRef.current = Date.now()
    currentPageRef.current = 1
    activeTimeRef.current = 0
    lastActiveRef.current = Date.now()

    setState(s => ({ ...s, step:'viewing', doc, link, sessionId:session.id, pages, totalPages, sigBlocks, currentPage:1 }))

    // Notify sender
    await fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ documentId:doc.id, sessionId:session.id, viewerEmail, viewerName }) }).catch(()=>{})

    // Record first page enter
    await supabase.from('page_events').insert({ session_id:session.id, document_id:doc.id, page_number:1, event_type:'enter' })
  }

  async function recordPageExit() {
    const { sessionId, doc } = state
    if (!sessionId || !doc) return
    const timeSpent = Math.round((Date.now() - pageStartRef.current) / 1000)
    await supabase.from('page_events').insert({
      session_id: sessionId, document_id: doc.id,
      page_number: currentPageRef.current, event_type:'exit',
      time_spent_seconds: Math.max(timeSpent, 1),
    })
  }

  async function finalizeSession() {
    const { sessionId, totalPages } = state
    if (!sessionId) return
    const totalTime = Math.round((Date.now() - sessionStartRef.current) / 1000)
    const pagesViewed = currentPageRef.current
    const completionRate = totalPages > 0 ? pagesViewed / totalPages : 0
    const score = computeScore(completionRate, totalTime / Math.max(totalPages,1), false)
    await supabase.from('view_sessions').update({
      ended_at: new Date().toISOString(),
      total_time_seconds: totalTime,
      pages_viewed: pagesViewed,
      completion_rate: completionRate,
      engagement_score: score,
    }).eq('id', sessionId)
    // Trigger AI insights generation
    await fetch('/api/ai/generate-insights', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ sessionId, documentId: state.doc?.id }) }).catch(()=>{})
  }

  function computeScore(completion: number, avgTime: number, hasForwarded: boolean): number {
    let score = completion * 25 + Math.min(avgTime / 60, 1) * 25 + (completion > 0.8 ? 20 : 0) + (hasForwarded ? 15 : 0)
    return Math.min(Math.round(score), 100)
  }

  async function goToPage(newPage: number) {
    if (newPage === state.currentPage) return
    await recordPageExit()
    pageStartRef.current = Date.now()
    currentPageRef.current = newPage
    setState(s => ({ ...s, currentPage: newPage }))
    const { sessionId, doc } = state
    if (sessionId && doc) {
      await supabase.from('page_events').insert({ session_id:sessionId, document_id:doc.id, page_number:newPage, event_type:'enter' })
    }
  }

  // ── Signing ──────────────────────────────────────────────────────────────────
  function openSignModal(block: any) {
    setSigName(name || '')
    setSigEmail(email || '')
    setAgreed(false)
    setTypedSig('')
    setActiveBlock(block)
    setState(s => ({ ...s, step:'signing' }))
  }

  function drawStart(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawing.current = true
    const ctx = sigCanvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    const rect = sigCanvasRef.current!.getBoundingClientRect()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }
  function drawMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    const ctx = sigCanvasRef.current?.getContext('2d')
    if (!ctx) return
    const rect = sigCanvasRef.current!.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    ctx.stroke()
  }
  function drawEnd() { isDrawing.current = false }
  function clearDraw() {
    const ctx = sigCanvasRef.current?.getContext('2d')
    if (!ctx || !sigCanvasRef.current) return
    ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height)
  }

  async function submitSignature() {
    if (!agreed || !sigName.trim()) return
    setSigning(true)
    const { doc, sessionId, link } = state
    if (!doc) return

    // Build document hash from canvas_data
    const docData = JSON.stringify((doc as any).canvas_data ?? {})
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(docData))
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')

    const sigId = crypto.randomUUID()
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/verify/${sigId}`

    let signatureData = ''
    if (sigType === 'draw' && sigCanvasRef.current) {
      signatureData = sigCanvasRef.current.toDataURL()
    } else {
      signatureData = `type:${typedSig}`
    }

    await supabase.from('document_signatures').insert({
      id: sigId,
      document_id: doc.id,
      signature_block_id: activeBlock?.id ?? null,
      session_id: sessionId ?? null,
      signer_name: sigName,
      signer_email: sigEmail || null,
      signer_company: sigCompany || null,
      signature_data: signatureData,
      document_hash: hashHex,
      signed_at: new Date().toISOString(),
      verification_url: verificationUrl,
      is_valid: true,
    })

    if (activeBlock?.id) {
      await supabase.from('signature_blocks').update({ status:'signed' }).eq('id', activeBlock.id)
    }

    setSigning(false)
    setState(s => ({ ...s, step:'signed' }))
    setTimeout(() => setState(s => ({ ...s, step:'viewing' })), 3000)
  }

  async function handleEmailSubmit() {
    if (!email.trim()) return
    const { doc, link, pages, totalPages, sigBlocks } = state
    if (!doc || !link) return
    await startSession(doc, link, pages, totalPages, sigBlocks, email.trim(), name.trim())
  }

  async function handlePasswordSubmit() {
    const { doc, link, pages, totalPages, sigBlocks } = state
    if (!doc || !link) return
    if (link.password !== password) { setPwError('Incorrect password'); return }
    await startSession(doc, link, pages, totalPages, sigBlocks)
  }

  const { step, doc, pages, totalPages, currentPage, sigBlocks } = state
  const currentPageData = pages[currentPage - 1]
  const pageSigBlocks = sigBlocks.filter(b => b.page_number === currentPage && b.status === 'pending')

  // ── Gate screens ─────────────────────────────────────────────────────────────
  if (step === 'loading') return <GateScreen><div style={{ display:'flex', gap:8, alignItems:'center', color:C.textSm }}><Spinner/> Loading…</div></GateScreen>

  if (step === 'not_found') return <GateScreen>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔗</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:C.text, marginBottom:8, fontFamily:Fui }}>Link not found</h2>
      <p style={{ color:C.textMd, fontSize:14, fontFamily:Fui }}>This link doesn't exist or has been removed.</p>
    </div>
  </GateScreen>

  if (step === 'expired') return <GateScreen>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>⏰</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:C.text, marginBottom:8, fontFamily:Fui }}>Link expired</h2>
      <p style={{ color:C.textMd, fontSize:14, fontFamily:Fui }}>This document link has been disabled or has expired.</p>
    </div>
  </GateScreen>

  if (step === 'email_gate') return <GateScreen>
    <div style={{ width:'100%', maxWidth:380 }}>
      <h2 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4, fontFamily:Fui }}>{doc?.title ?? 'Document'}</h2>
      <p style={{ color:C.textMd, fontSize:14, marginBottom:24, fontFamily:Fui }}>Enter your details to view this document.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={gateInput}/>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email address" type="email" style={gateInput} onKeyDown={e=>e.key==='Enter'&&handleEmailSubmit()}/>
        <button onClick={handleEmailSubmit} disabled={!email.trim()} style={{ ...gateBtn, opacity:!email.trim()?0.5:1 }}>View document →</button>
      </div>
    </div>
  </GateScreen>

  if (step === 'password_gate') return <GateScreen>
    <div style={{ width:'100%', maxWidth:360 }}>
      <h2 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4, fontFamily:Fui }}>{doc?.title ?? 'Document'}</h2>
      <p style={{ color:C.textMd, fontSize:14, marginBottom:24, fontFamily:Fui }}>This document is password protected.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={gateInput} onKeyDown={e=>e.key==='Enter'&&handlePasswordSubmit()}/>
        {pwError && <p style={{ color:C.red, fontSize:12, fontFamily:Fui }}>{pwError}</p>}
        <button onClick={handlePasswordSubmit} style={gateBtn}>Continue →</button>
      </div>
    </div>
  </GateScreen>

  if (step === 'signed') return <GateScreen>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:8, fontFamily:Fui }}>Document signed</h2>
      <p style={{ color:C.textMd, fontSize:14, fontFamily:Fui }}>Your signature has been recorded with Backread's digital stamp.</p>
    </div>
  </GateScreen>

  // ── Signing modal overlay ────────────────────────────────────────────────────
  if (step === 'signing') return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:Fui }}>
      <div style={{ background:'#fff', borderRadius:18, width:'min(500px,96vw)', maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'24px 28px 0' }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>Sign document</h2>
          <p style={{ fontSize:13, color:C.textMd, marginBottom:20 }}>Your signature will be permanently recorded with a Backread digital stamp of authenticity.</p>
        </div>
        <div style={{ padding:'0 28px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.textMd, display:'block', marginBottom:4 }}>Full name *</label>
              <input value={sigName} onChange={e=>setSigName(e.target.value)} placeholder="Your legal name" style={sigInput}/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.textMd, display:'block', marginBottom:4 }}>Email</label>
              <input value={sigEmail} onChange={e=>setSigEmail(e.target.value)} placeholder="you@company.com" type="email" style={sigInput}/>
            </div>
          </div>
          {/* Signature tabs */}
          <div>
            <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:12 }}>
              {(['type','draw'] as const).map(t=>(
                <button key={t} onClick={()=>setSigType(t)} style={{ padding:'7px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:sigType===t?700:500, color:sigType===t?C.accent:C.textMd, borderBottom:sigType===t?`2px solid ${C.accent}`:'2px solid transparent', fontFamily:Fui }}>
                  {t === 'type' ? 'Type' : 'Draw'}
                </button>
              ))}
            </div>
            {sigType === 'type' ? (
              <input value={typedSig} onChange={e=>setTypedSig(e.target.value)} placeholder="Type your signature" style={{ ...sigInput, fontSize:22, fontFamily:"'Dancing Script', cursive", fontWeight:600, height:64 }}/>
            ) : (
              <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden', position:'relative' }}>
                <canvas ref={sigCanvasRef} width={440} height={100} style={{ width:'100%', height:100, cursor:'crosshair', touchAction:'none' }}
                  onMouseDown={drawStart} onMouseMove={drawMove} onMouseUp={drawEnd} onMouseLeave={drawEnd}/>
                <button onClick={clearDraw} style={{ position:'absolute', top:6, right:8, fontSize:11, color:C.textSm, background:'none', border:'none', cursor:'pointer', fontFamily:Fui }}>Clear</button>
                <p style={{ textAlign:'center', fontSize:11, color:C.textSm, paddingBottom:6, fontFamily:Fui }}>Draw your signature above</p>
              </div>
            )}
          </div>
          <label style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{ marginTop:2, accentColor:C.accent, width:15, height:15 }}/>
            <span style={{ fontSize:12, color:C.textMd, lineHeight:1.6 }}>I agree to sign this document electronically. This signature has the same legal effect as a handwritten signature.</span>
          </label>
          {/* Backread stamp preview */}
          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'12px 14px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.green, marginBottom:4 }}>⬡ Verified by Backread</p>
            <p style={{ fontSize:11, color:'#166534', lineHeight:1.5 }}>A digital stamp will be attached recording: your identity, signing time, IP address, and a SHA-256 hash of this document. The stamp is publicly verifiable.</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setState(s=>({...s,step:'viewing'}))} style={{ flex:1, padding:'10px', border:`1px solid ${C.border}`, borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer', fontWeight:600, color:C.text, fontFamily:Fui }}>Cancel</button>
            <button onClick={submitSignature} disabled={signing || !agreed || !sigName.trim()} style={{ flex:2, padding:'10px', border:'none', borderRadius:8, background:C.accent, color:'#fff', fontSize:13, cursor:'pointer', fontWeight:700, opacity:(signing||!agreed||!sigName.trim())?0.5:1, fontFamily:Fui }}>
              {signing ? 'Signing…' : '✍ Sign document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Main viewer ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg, fontFamily:Fui }}>
      {/* Header */}
      <div style={{ height:52, background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:C.accentLt, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2.5" stroke={C.accent} strokeWidth="1.4"/><path d="M3.5 5h7M3.5 7.5h5M3.5 10h4" stroke={C.accent} strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontSize:14, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc?.title ?? 'Document'}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:12, color:C.textSm }}>{currentPage} / {totalPages}</span>
          {sigBlocks.some(b => b.page_number === currentPage && b.status==='pending') && (
            <span style={{ fontSize:11, padding:'3px 8px', background:C.accentLt, color:C.accent, borderRadius:20, fontWeight:600 }}>✍ Signature required</span>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex:1, overflow:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 20px', position:'relative' }}>
        <div style={{ width:'100%', maxWidth:960, position:'relative' }}>
          {/* Fabric canvas render */}
          <FabricRender pageData={currentPageData} />

          {/* Signature block overlays on canvas */}
          {pageSigBlocks.map(block => (
            <div key={block.id} style={{ position:'absolute', left:`${(block.position_x||0.3)*100}%`, top:`${(block.position_y||0.65)*100}%`, transform:'translate(-50%,-50%)', zIndex:10 }}>
              <button onClick={()=>openSignModal(block)} style={{ padding:'14px 22px', background:'#fff', border:`2px dashed ${C.accent}`, borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:700, color:C.accent, fontFamily:Fui, boxShadow:'0 4px 14px rgba(79,70,229,.15)', display:'flex', alignItems:'center', gap:8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13l3-1 7-7-2-2-7 7-1 3z" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 4l2 2" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round"/></svg>
                {block.signer_label ?? 'Click to sign'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:4, background:C.border, flexShrink:0 }}>
        <div style={{ height:'100%', width:`${(currentPage/totalPages)*100}%`, background:C.accent, transition:'width .3s ease' }}/>
      </div>

      {/* Navigation */}
      {totalPages > 1 && (
        <div style={{ height:58, background:'#fff', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexShrink:0, padding:'0 20px' }}>
          <button onClick={()=>goToPage(currentPage-1)} disabled={currentPage<=1} style={navBtn(currentPage<=1)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Previous
          </button>
          <div style={{ display:'flex', gap:4 }}>
            {Array.from({length:totalPages},(_,i)=>(
              <button key={i} onClick={()=>goToPage(i+1)} style={{ width:8, height:8, borderRadius:'50%', border:'none', cursor:'pointer', background:currentPage===i+1?C.accent:C.border, transition:'background .2s', padding:0 }}/>
            ))}
          </div>
          <button onClick={()=>goToPage(currentPage+1)} disabled={currentPage>=totalPages} style={navBtn(currentPage>=totalPages)}>
            Next
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}

      {/* Signature prompt banner */}
      {pageSigBlocks.length > 0 && (
        <div style={{ position:'fixed', bottom:totalPages>1?66:12, left:'50%', transform:'translateX(-50%)', background:C.accent, color:'#fff', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(79,70,229,.3)', display:'flex', alignItems:'center', gap:8, zIndex:5 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 11l2.5-1 6-6-1.5-1.5-6 6L3 11z" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          This page requires your signature
        </div>
      )}
    </div>
  )
}

// Renders a Fabric.js canvas JSON as a static HTML preview
function FabricRender({ pageData }: { pageData: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!pageData || !canvasRef.current) return
    const script = (window as any).fabric ? null : document.createElement('script')
    const render = () => {
      const fab = (window as any).fabric
      if (!fab) return
      const tmp = canvasRef.current!
      const fc = new fab.StaticCanvas(tmp, { width:1280, height:720, enableRetinaScaling:false })
      fc.loadFromJSON(pageData, () => { fc.setZoom(1); fc.renderAll() })
    }
    if ((window as any).fabric) { render() }
    else if (script) {
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
      script.onload = render
      document.head.appendChild(script)
    }
  }, [pageData])

  if (!pageData) return (
    <div style={{ width:'100%', aspectRatio:'16/9', background:'#fff', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#9CA3AF', fontSize:14 }}>
      Page unavailable
    </div>
  )

  return (
    <div style={{ width:'100%', position:'relative', boxShadow:'0 4px 32px rgba(0,0,0,.12)', borderRadius:4, overflow:'hidden', background:pageData.background||'#fff', lineHeight:0 }}>
      <canvas ref={canvasRef} style={{ width:'100%', display:'block' }}/>
    </div>
  )
}

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', padding:24, fontFamily:Fui }}>
      <div style={{ background:'#fff', borderRadius:18, padding:'40px 44px', boxShadow:'0 12px 48px rgba(0,0,0,.1)', width:'100%', maxWidth:440, display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ marginBottom:24 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#4F46E5"/><path d="M8 16h4l3-8 4 16 3-8h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {children}
        <p style={{ marginTop:24, fontSize:11, color:'#9CA3AF', textAlign:'center', fontFamily:Fui }}>Powered by Backread · Document intelligence platform</p>
      </div>
    </div>
  )
}

function Spinner() {
  return <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid #E2E8F0', borderTopColor:'#4F46E5', animation:'spin 0.6s linear infinite' }}/>
}

const gateInput: React.CSSProperties = {
  width:'100%', padding:'10px 12px', border:'1px solid #E2E8F0', borderRadius:8,
  fontSize:14, color:'#111111', fontFamily:Fui, outline:'none',
}
const gateBtn: React.CSSProperties = {
  width:'100%', padding:'11px', border:'none', borderRadius:8, background:'#4F46E5',
  color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:Fui,
}
const sigInput: React.CSSProperties = {
  width:'100%', padding:'8px 10px', border:'1px solid #E2E8F0', borderRadius:7,
  fontSize:13, color:'#111111', fontFamily:Fui, outline:'none',
}
function navBtn(disabled: boolean): React.CSSProperties {
  return { display:'flex', alignItems:'center', gap:5, padding:'7px 14px', border:'1px solid #E2E8F0', borderRadius:7, background:disabled?'#F8FAFC':'#fff', cursor:disabled?'not-allowed':'pointer', fontSize:13, fontWeight:600, color:disabled?'#9CA3AF':'#111111', fontFamily:Fui, opacity:disabled?0.5:1 }
}
