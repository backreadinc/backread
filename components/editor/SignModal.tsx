'use client'
import { useEffect, useRef, useState } from 'react'

const SIGN_FONTS = [
  { name:'Dancing Script',      style:'cursive',   preview:'Handwritten' },
  { name:'Great Vibes',         style:'cursive',   preview:'Flowing' },
  { name:'Pacifico',            style:'cursive',   preview:'Playful' },
  { name:'Sacramento',          style:'cursive',   preview:'Elegant' },
  { name:'Satisfy',             style:'cursive',   preview:'Classic' },
  { name:'Allura',              style:'cursive',   preview:'Refined' },
  { name:'Alex Brush',          style:'cursive',   preview:'Fine' },
  { name:'Pinyon Script',       style:'cursive',   preview:'Formal' },
  { name:'Tangerine',           style:'cursive',   preview:'Thin' },
  { name:'Italianno',           style:'cursive',   preview:'Italian' },
  { name:'Courgette',           style:'cursive',   preview:'Bold Script' },
  { name:'Kaushan Script',      style:'cursive',   preview:'Brush' },
  { name:'Lobster',             style:'cursive',   preview:'Display' },
  { name:'Parisienne',          style:'cursive',   preview:'French' },
  { name:'Rochester',           style:'cursive',   preview:'Stately' },
  { name:'Yellowtail',          style:'cursive',   preview:'Casual' },
  { name:'Zeyada',              style:'cursive',   preview:'Modern Script' },
  { name:'Amatic SC',           style:'print',     preview:'Hand Print' },
  { name:'Bad Script',          style:'cursive',   preview:'Messy' },
  { name:'Berkshire Swash',     style:'decorative',preview:'Decorative' },
  { name:'Clicker Script',      style:'cursive',   preview:'Typewriter' },
  { name:'Cookie',              style:'cursive',   preview:'Sweet' },
  { name:'Euphoria Script',     style:'cursive',   preview:'Euphoric' },
  { name:'Herr Von Muellerhoff',style:'cursive',   preview:'Victorian' },
  { name:'Hurricane',           style:'cursive',   preview:'Storm' },
  { name:'Imperial Script',     style:'cursive',   preview:'Royal' },
  { name:'Jim Nightshade',      style:'cursive',   preview:'Gothic' },
  { name:'Kalam',               style:'print',     preview:'Natural' },
  { name:'La Belle Aurore',     style:'cursive',   preview:'Aurora' },
  { name:'Monsieur La Doulaise',style:'cursive',   preview:'French Cursive' },
  { name:'Mr Dafoe',            style:'cursive',   preview:'Bold Signature' },
  { name:'Mr De Haviland',      style:'cursive',   preview:'Aviation' },
  { name:'Mrs Saint Delafield', style:'cursive',   preview:'Vintage' },
  { name:'Ms Madi',             style:'cursive',   preview:'Modern' },
  { name:'Nothing You Could Do',style:'print',     preview:'Scrawled' },
  { name:'OoohBaby',            style:'cursive',   preview:'Baby Script' },
  { name:'Petit Formal Script', style:'cursive',   preview:'Petit' },
  { name:'Princess Sofia',      style:'cursive',   preview:'Regal' },
  { name:'Ruthie',              style:'cursive',   preview:'Delicate' },
  { name:'Sail',                style:'cursive',   preview:'Nautical' },
  { name:'Stalemate',           style:'cursive',   preview:'Chess' },
  { name:'The Nautigal',        style:'cursive',   preview:'Sailor' },
  { name:'Waterfall',           style:'cursive',   preview:'Cascade' },
  { name:'Whisper',             style:'cursive',   preview:'Quiet' },
  { name:'Lavishly Yours',      style:'cursive',   preview:'Lavish' },
  { name:'Fleur De Leah',       style:'cursive',   preview:'Floral' },
  { name:'Birthstone',          style:'cursive',   preview:'Script' },
  { name:'Sevillana',           style:'cursive',   preview:'Spanish' },
  { name:'Niconne',             style:'cursive',   preview:'Casual' },
  { name:'Caveat',              style:'print',     preview:'Sketch' },
  { name:'Permanent Marker',    style:'print',     preview:'Marker' },
  { name:'Rock Salt',           style:'print',     preview:'Grungy' },
  { name:'Indie Flower',        style:'print',     preview:'Indie' },
  { name:'Shadows Into Light',  style:'print',     preview:'Light' },
  { name:'Patrick Hand',        style:'print',     preview:'Hand' },
  { name:'Handlee',             style:'print',     preview:'Clean Hand' },
  { name:'Just Another Hand',   style:'print',     preview:'Another' },
  { name:'Give You Glory',      style:'cursive',   preview:'Glory' },
  { name:'Over the Rainbow',    style:'cursive',   preview:'Rainbow' },
  { name:'Meow Script',         style:'cursive',   preview:'Cat' },
]

const C = {
  bg:'#F8FAFC', panel:'#FFFFFF', border:'#E4E0DB', borderSt:'#C8C3BC',
  accent:'#5B50E8', accentLt:'#EEEDFB', text:'#0F0F0F', textMd:'#6B6868', textSm:'#9B9898',
  hover:'#F5F3F0',
}
const F = "'Inter',-apple-system,sans-serif"

interface SignModalProps {
  signerName?: string
  onSign: (dataUrl: string, name: string) => void
  onClose: () => void
}

export default function SignModal({ signerName = '', onSign, onClose }: SignModalProps) {
  const [mode, setMode]         = useState<'draw'|'type'|'initials'>('type')
  const [name, setName]         = useState(signerName)
  const [initials, setInitials] = useState('')
  const [selFont, setSelFont]   = useState(SIGN_FONTS[0].name)
  const [fontSearch, setFontSearch] = useState('')
  const [drawing, setDrawing]   = useState(false)
  const [hasDraw, setHasDraw]   = useState(false)
  const drawRef = useRef<HTMLCanvasElement>(null)
  const lastPt  = useRef<{x:number;y:number}|null>(null)

  // Load fonts
  useEffect(() => {
    const chunk = SIGN_FONTS.map(f => `family=${f.name.replace(/ /g,'+')}`).join('&')
    const l = document.createElement('link')
    l.rel='stylesheet'; l.href=`https://fonts.googleapis.com/css2?${chunk}&display=swap`
    document.head.appendChild(l)
  }, [])

  // Draw canvas setup
  useEffect(() => {
    if (mode !== 'draw' || !drawRef.current) return
    const c = drawRef.current; const ctx = c.getContext('2d')!
    c.width = 560; c.height = 180
    ctx.fillStyle = '#FAFAF8'; ctx.fillRect(0,0,c.width,c.height)
    ctx.strokeStyle = '#0F172A'; ctx.lineWidth = 2.5
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [mode])

  function getPos(e: React.MouseEvent|React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent|React.TouchEvent) {
    e.preventDefault(); setDrawing(true); setHasDraw(true)
    const pt = getPos(e, drawRef.current!); lastPt.current = pt
  }
  function moveDraw(e: React.MouseEvent|React.TouchEvent) {
    e.preventDefault(); if (!drawing || !drawRef.current) return
    const ctx = drawRef.current.getContext('2d')!; const pt = getPos(e, drawRef.current)
    ctx.beginPath(); ctx.moveTo(lastPt.current!.x, lastPt.current!.y); ctx.lineTo(pt.x, pt.y); ctx.stroke()
    lastPt.current = pt
  }
  function endDraw() { setDrawing(false); lastPt.current = null }

  function clearDraw() {
    if (!drawRef.current) return
    const ctx = drawRef.current.getContext('2d')!
    ctx.fillStyle = '#FAFAF8'; ctx.fillRect(0, 0, drawRef.current.width, drawRef.current.height)
    setHasDraw(false)
  }

  function generateTypedSignature(text: string, font: string, forInitials = false): string {
    const w = forInitials ? 240 : 560; const h = 180
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2
    const ctx = c.getContext('2d')!; ctx.scale(2, 2)
    ctx.fillStyle = '#FAFAF8'; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#0F172A'; ctx.font = `${forInitials ? 72 : 64}px '${font}', cursive`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    // Wait for font or use fallback
    ctx.fillText(text, w/2, h/2)
    return c.toDataURL('image/png')
  }

  function handleSign() {
    if (mode === 'draw') {
      if (!hasDraw || !drawRef.current) return
      onSign(drawRef.current.toDataURL('image/png'), name || 'Signer')
    } else if (mode === 'type') {
      if (!name.trim()) return
      onSign(generateTypedSignature(name, selFont), name)
    } else {
      const ini = initials.trim() || name.split(' ').map(n => n[0]).join('').toUpperCase()
      if (!ini) return
      onSign(generateTypedSignature(ini, selFont, true), name || ini)
    }
  }

  const filtFonts = SIGN_FONTS.filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()))
  const canSign = mode === 'draw' ? hasDraw : mode === 'type' ? name.trim().length > 0 : (initials.trim() || name.trim()).length > 0

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.52)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' }} onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:20, width:'min(680px,96vw)', boxShadow:'0 32px 80px rgba(0,0,0,.22)', border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', maxHeight:'92vh', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'22px 24px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.text, fontFamily:F }}>Add Your Signature</h2>
            <button onClick={onClose} style={{ width:32, height:32, background:C.hover, border:`1px solid ${C.border}`, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:C.textMd }}>✕</button>
          </div>
          {/* Mode tabs */}
          <div style={{ display:'flex', gap:6, marginTop:14 }}>
            {([['type','✍ Type','Type your name'],['draw','✏ Draw','Freehand signature'],['initials','🔤 Initials','Use initials only']] as const).map(([id, lbl, tip]) => (
              <button key={id} onClick={() => setMode(id)} title={tip} style={{ padding:'6px 14px', border:`2px solid ${mode===id?C.accent:C.border}`, borderRadius:8, background:mode===id?C.accentLt:'#fff', color:mode===id?C.accent:C.textMd, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, transition:'all .13s' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflow:'auto', padding:'18px 24px 24px' }}>
          {/* Name input */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.textMd, display:'block', marginBottom:5, fontFamily:F, textTransform:'uppercase', letterSpacing:'.07em' }}>Full Legal Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name"
              style={{ width:'100%', padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:F, color:C.text, outline:'none', transition:'border-color .14s' }}
              onFocus={e => e.target.style.borderColor=C.accent} onBlur={e => e.target.style.borderColor=C.border}/>
          </div>

          {/* Draw mode */}
          {mode === 'draw' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textMd, fontFamily:F, textTransform:'uppercase', letterSpacing:'.07em' }}>Draw your signature</label>
                <button onClick={clearDraw} style={{ fontSize:12, color:C.accent, background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:F }}>Clear</button>
              </div>
              <div style={{ border:`2px solid ${C.border}`, borderRadius:12, overflow:'hidden', background:'#FAFAF8', cursor:'crosshair', touchAction:'none' }}>
                <canvas ref={drawRef} style={{ display:'block', width:'100%', height:180, touchAction:'none' }}
                  onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}/>
              </div>
              {!hasDraw && <p style={{ fontSize:11, color:C.textSm, marginTop:6, fontFamily:F }}>Use your mouse or finger to draw your signature above</p>}
            </div>
          )}

          {/* Type mode */}
          {mode === 'type' && name && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textMd, fontFamily:F, textTransform:'uppercase', letterSpacing:'.07em' }}>Choose style</label>
                <input value={fontSearch} onChange={e => setFontSearch(e.target.value)} placeholder="Search fonts…"
                  style={{ flex:1, padding:'5px 10px', border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:F, color:C.text, outline:'none' }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, maxHeight:340, overflow:'auto' }}>
                {filtFonts.map(f => (
                  <button key={f.name} onClick={() => setSelFont(f.name)}
                    style={{ padding:'10px 14px', border:`2px solid ${selFont===f.name?C.accent:C.border}`, borderRadius:10, background:selFont===f.name?C.accentLt:'#FAFAF8', cursor:'pointer', textAlign:'left', transition:'all .12s', display:'flex', flexDirection:'column', gap:2 }}>
                    <span style={{ fontSize:26, fontFamily:`'${f.name}',cursive`, color:selFont===f.name?C.accent:'#0F172A', lineHeight:1.2, display:'block', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:'100%' }}>{name}</span>
                    <span style={{ fontSize:9, fontWeight:600, color:selFont===f.name?C.accent:C.textSm, fontFamily:F, textTransform:'uppercase', letterSpacing:'.06em' }}>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Initials mode */}
          {mode === 'initials' && (
            <div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textMd, display:'block', marginBottom:5, fontFamily:F, textTransform:'uppercase', letterSpacing:'.07em' }}>Initials (auto-filled or customize)</label>
                <input value={initials || (name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '')}
                  onChange={e => setInitials(e.target.value.toUpperCase().slice(0,3))}
                  placeholder={name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AB'}
                  maxLength={3}
                  style={{ width:120, padding:'12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:22, fontFamily:F, fontWeight:700, color:C.text, outline:'none', textAlign:'center', letterSpacing:'.1em' }}
                  onFocus={e => e.target.style.borderColor=C.accent} onBlur={e => e.target.style.borderColor=C.border}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, maxHeight:280, overflow:'auto' }}>
                {filtFonts.map(f => {
                  const ini = initials.trim() || (name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AB')
                  return (
                    <button key={f.name} onClick={() => setSelFont(f.name)}
                      style={{ padding:'10px 14px', border:`2px solid ${selFont===f.name?C.accent:C.border}`, borderRadius:10, background:selFont===f.name?C.accentLt:'#FAFAF8', cursor:'pointer', textAlign:'center', transition:'all .12s' }}>
                      <span style={{ fontSize:38, fontFamily:`'${f.name}',cursive`, color:selFont===f.name?C.accent:'#0F172A', lineHeight:1.2, display:'block' }}>{ini}</span>
                      <span style={{ fontSize:9, fontWeight:600, color:selFont===f.name?C.accent:C.textSm, fontFamily:F, textTransform:'uppercase', letterSpacing:'.06em' }}>{f.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ flex:1, fontSize:11, color:C.textSm, lineHeight:1.55, fontFamily:F }}>
            By clicking "Sign", I agree that this digital signature is the legal equivalent of my handwritten signature.
          </div>
          <button onClick={onClose} style={{ padding:'9px 18px', border:`1.5px solid ${C.border}`, borderRadius:9, background:'#fff', fontSize:13, cursor:'pointer', fontWeight:600, color:C.textMd, fontFamily:F }}>Cancel</button>
          <button onClick={handleSign} disabled={!canSign}
            style={{ padding:'9px 22px', border:'none', borderRadius:9, background:canSign?C.accent:'#E2E8F0', color:canSign?'#fff':'#94A3B8', fontSize:13, fontWeight:800, cursor:canSign?'pointer':'not-allowed', fontFamily:F, transition:'all .13s' }}>
            ✍ Sign Document
          </button>
        </div>
      </div>
    </div>
  )
}
