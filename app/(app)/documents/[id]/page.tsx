'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { buildShareUrl, generateToken } from '@/lib/utils'
import AIDrafter from '@/components/editor/AIDrafter'
import { LAYOUTS, LAYOUT_CATS, SIZES, FONTS, BLENDS, C, F, pg, tx, bx, s } from './_editor-data'
import type { Database } from '@/lib/supabase/client'

type Document = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

// ─── Small UI helpers ────────────────────────────────────────────────────────
const UI: React.CSSProperties = { fontFamily: F.ui }
function pill(on: boolean): React.CSSProperties {
  return { padding:'4px 10px', fontSize:11, fontWeight:600, fontFamily:F.ui, border:`1px solid ${on?C.accent:C.border}`, borderRadius:7, background:on?C.accentLt:'#fff', color:on?C.accent:C.textMd, cursor:'pointer', transition:'all .12s' }
}

// ─── Collapsible panel section ───────────────────────────────────────────────
function Sec({ label, children, defaultOpen=true }: { label:string; children:React.ReactNode; defaultOpen?:boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom:`1px solid ${C.border}`, padding:'10px 14px 12px' }}>
      <button onClick={()=>setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', border:'none', background:'none', cursor:'pointer', padding:'0 0 8px' }}>
        <span style={{ fontSize:9, fontWeight:800, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:F.ui }}>{label}</span>
        <svg width="9" height="5" viewBox="0 0 9 5" fill="none" style={{ transform:open?'rotate(0)':'rotate(-90deg)', transition:'transform .15s' }}><path d="M1 1l3.5 3L8 1" stroke={C.textSm} strokeWidth="1.3" strokeLinecap="round"/></svg>
      </button>
      {open && children}
    </div>
  )
}

function NumInput({ label, value, onChange, step=1 }: { label:string; value:number; onChange:(v:number)=>void; step?:number }) {
  return (
    <div>
      <div style={{ fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4, fontFamily:F.ui }}>{label}</div>
      <input type="number" value={value} step={step} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{ width:'100%', padding:'6px 9px', border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:F.mono, color:C.text, background:'#fff', outline:'none' }}
        onFocus={e=>{ e.target.style.borderColor=C.accent }}
        onBlur={e=>{ e.target.style.borderColor=C.border }}/>
    </div>
  )
}

function Slider({ label, value, min, max, onChange }: { label:string; value:number; min:number; max:number; onChange:(v:number)=>void }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:F.ui }}>{label}</span>
        <span style={{ fontSize:10, color:C.textMd, fontFamily:F.mono }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:C.accent, height:4, cursor:'pointer' }}/>
    </div>
  )
}

// ─── Layers panel ─────────────────────────────────────────────────────────────
function LayersPanel({ fabric, onSelect }: { fabric:any; onSelect:(obj:any)=>void }) {
  const [objs, setObjs] = useState<any[]>([])
  useEffect(() => {
    if (!fabric) return
    const refresh = () => setObjs(fabric.getObjects().slice().reverse())
    fabric.on('object:added', refresh); fabric.on('object:removed', refresh)
    fabric.on('object:modified', refresh); fabric.on('selection:created', refresh)
    fabric.on('selection:cleared', refresh); refresh()
    return () => { fabric.off('object:added', refresh); fabric.off('object:removed', refresh); fabric.off('object:modified', refresh) }
  }, [fabric])

  function getLabel(obj: any) {
    if (obj.text) return obj.text.slice(0,20)+(obj.text.length>20?'…':'')
    return obj.type.charAt(0).toUpperCase()+obj.type.slice(1)
  }
  function typeIcon(obj: any) {
    if (obj.type==='textbox'||obj.type==='text'||obj.type==='i-text') return 'T'
    if (obj.type==='image') return '⬜'
    return '◼'
  }

  if (objs.length===0) return <div style={{ padding:'24px 14px', color:C.textSm, fontSize:12, textAlign:'center', fontFamily:F.ui }}>No elements yet</div>
  return (
    <div style={{ padding:'6px 8px', display:'flex', flexDirection:'column', gap:1 }}>
      {objs.map((obj, i) => {
        const isActive = fabric?.getActiveObject()===obj
        return (
          <div key={i} onClick={()=>{ fabric.setActiveObject(obj); fabric.renderAll(); onSelect(obj) }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, cursor:'pointer', background:isActive?C.accentLt:'transparent', border:`1px solid ${isActive?C.accentMd:'transparent'}`, transition:'all .1s' }}>
            <span style={{ fontSize:10, width:14, textAlign:'center', flexShrink:0, color:isActive?C.accent:C.textSm }}>{typeIcon(obj)}</span>
            <span style={{ flex:1, fontSize:11, fontFamily:F.ui, color:isActive?C.accent:C.textMd, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:isActive?600:400 }}>{getLabel(obj)}</span>
            <button onClick={e=>{ e.stopPropagation(); obj.set('visible',!obj.visible); fabric.renderAll(); setObjs([...objs]) }}
              style={{ width:18, height:18, border:'none', background:'none', cursor:'pointer', color:obj.visible===false?C.textSm:C.textMd, padding:0, fontSize:9, borderRadius:3 }}>
              {obj.visible===false?'○':'●'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Share modal ─────────────────────────────────────────────────────────────
function ShareModal({ documentId, links, onClose, onRefresh, isActive, onPublish }: {
  documentId:string; links:ShareLink[]; onClose:()=>void; onRefresh:()=>void; isActive:boolean; onPublish:()=>void
}) {
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [allowDownload, setAllowDownload] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState<string|null>(null)
  const [showNew, setShowNew] = useState(links.length===0)

  async function createLink() {
    setCreating(true)
    const token = generateToken(14)
    await supabase.from('share_links').insert({ document_id:documentId, token, label:label||'Share link', require_email:requireEmail, allow_download:allowDownload, password:password||null, is_active:true })
    await onRefresh(); setShowNew(false); setLabel(''); setPassword(''); setRequireEmail(false); setAllowDownload(false)
    setCreating(false)
  }
  function copyLink(token: string) { navigator.clipboard.writeText(buildShareUrl(token)); setCopied(token); setTimeout(()=>setCopied(null),2000) }
  async function toggleLink(id: string, active: boolean) { await supabase.from('share_links').update({ is_active:active }).eq('id',id); onRefresh() }
  async function deleteLink(id: string) { await supabase.from('share_links').delete().eq('id',id); onRefresh() }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'flex-end', backdropFilter:'blur(4px)' }}
      onClick={e=>{ if(e.target===e.currentTarget)onClose() }}>
      <div style={{ width:420, height:'100vh', background:'#fff', borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', boxShadow:'-20px 0 60px rgba(0,0,0,.1)' }}>
        <div style={{ padding:'22px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h2 style={{ ...UI, margin:'0 0 3px', fontSize:17, fontWeight:700, color:C.text }}>Share & Track</h2>
            <p style={{ ...UI, margin:0, fontSize:12, color:C.textSm }}>{links.length} link{links.length!==1?'s':''} · {links.reduce((a,l)=>a+(l.view_count||0),0)} total views</p>
          </div>
          <button onClick={onClose} style={{ background:C.bg, border:`1px solid ${C.border}`, cursor:'pointer', color:C.textMd, padding:8, borderRadius:8, display:'flex' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {!isActive && (
          <div style={{ margin:'14px 18px', padding:'12px 14px', background:'#FFFBEB', border:`1px solid #FDE68A`, borderRadius:10 }}>
            <p style={{ ...UI, fontSize:12, fontWeight:700, color:'#92400E', margin:'0 0 3px' }}>Not published yet</p>
            <p style={{ ...UI, fontSize:11, color:'#A16207', margin:'0 0 8px' }}>Publish this document to enable sharing.</p>
            <button onClick={onPublish} style={{ ...UI, padding:'5px 12px', borderRadius:7, background:C.amber, color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>Publish now</button>
          </div>
        )}

        <div style={{ flex:1, overflow:'auto', padding:'14px 18px' }}>
          {links.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <p style={{ ...UI, fontSize:9, fontWeight:700, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Active links</p>
              {links.map(link => (
                <div key={link.id} style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', marginBottom:8, background:C.bg }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ ...UI, flex:1, fontSize:13, fontWeight:600, color:C.text }}>{link.label??'Share link'}</span>
                    <span style={{ padding:'2px 7px', borderRadius:20, fontSize:9, fontWeight:700, background:link.is_active?'#ECFDF5':'#F1F5F9', color:link.is_active?C.green:C.textSm, border:`1px solid ${link.is_active?'#A7F3D0':C.border}` }}>{link.is_active?'LIVE':'OFF'}</span>
                  </div>
                  <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                    <code style={{ ...UI, flex:1, fontSize:10, color:C.textMd, background:'#fff', padding:'5px 8px', borderRadius:7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block', border:`1px solid ${C.border}`, fontFamily:F.mono }}>{buildShareUrl(link.token)}</code>
                    <button onClick={()=>copyLink(link.token)} style={{ ...UI, padding:'5px 11px', background:copied===link.token?'#ECFDF5':'#F8FAFC', border:`1px solid ${copied===link.token?'#A7F3D0':C.border}`, borderRadius:7, fontSize:11, cursor:'pointer', color:copied===link.token?C.green:C.textMd, fontWeight:600, whiteSpace:'nowrap' }}>
                      {copied===link.token?'Copied ✓':'Copy'}
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ ...UI, fontSize:11, color:C.textSm }}>{link.view_count??0} views</span>
                    {link.require_email && <span style={{ ...UI, fontSize:11, color:C.textSm }}>· Email required</span>}
                    {link.password && <span style={{ ...UI, fontSize:11, color:C.textSm }}>· Password set</span>}
                    <button onClick={()=>toggleLink(link.id,!link.is_active)} style={{ ...UI, fontSize:11, color:C.accent, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>{link.is_active?'Disable':'Enable'}</button>
                    <button onClick={()=>deleteLink(link.id)} style={{ ...UI, fontSize:11, color:C.red, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showNew ? (
            <div style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:16, background:C.bg }}>
              <p style={{ ...UI, fontSize:11, fontWeight:700, color:C.text, marginBottom:12 }}>New share link</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <p style={{ ...UI, fontSize:10, color:C.textMd, marginBottom:4 }}>Label</p>
                  <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Investor Review"
                    style={{ ...UI, width:'100%', padding:'7px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, color:C.text, background:'#fff', outline:'none' }}/>
                </div>
                <div>
                  <p style={{ ...UI, fontSize:10, color:C.textMd, marginBottom:4 }}>Password (optional)</p>
                  <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Leave blank for none" type="password"
                    style={{ ...UI, width:'100%', padding:'7px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, color:C.text, background:'#fff', outline:'none' }}/>
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  <label style={{ ...UI, display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.textMd, cursor:'pointer' }}>
                    <input type="checkbox" checked={requireEmail} onChange={e=>setRequireEmail(e.target.checked)} style={{ accentColor:C.accent }}/> Require email
                  </label>
                  <label style={{ ...UI, display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.textMd, cursor:'pointer' }}>
                    <input type="checkbox" checked={allowDownload} onChange={e=>setAllowDownload(e.target.checked)} style={{ accentColor:C.accent }}/> Allow download
                  </label>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setShowNew(false)} style={{ ...UI, flex:1, padding:'8px', border:`1px solid ${C.border}`, borderRadius:8, background:'#fff', fontSize:12, cursor:'pointer', fontWeight:500, color:C.textMd }}>Cancel</button>
                  <button onClick={createLink} disabled={creating} style={{ ...UI, flex:1, padding:'8px', border:'none', borderRadius:8, background:C.accent, color:'#fff', fontSize:12, cursor:'pointer', fontWeight:700, opacity:creating?.6:1 }}>
                    {creating?'Creating…':'Create link'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowNew(true)} style={{ ...UI, width:'100%', padding:10, border:`1px dashed ${C.borderMd}`, borderRadius:10, background:'transparent', cursor:'pointer', fontSize:12, color:C.textMd, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1.5 5.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              New link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EDITOR
// ════════════════════════════════════════════════════════════════════════════
export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc, setDoc] = useState<Document|null>(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date|null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showShare, setShowShare] = useState(false)
  const [showDrafter, setShowDrafter] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const canvasEl = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const fabricLib = useRef<any>(null)
  const fabricReady = useRef(false)

  const [pages, setPages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [thumbnails, setThumbnails] = useState<Record<number,string>>({})
  const [leftTab, setLeftTab] = useState<'layouts'|'elements'|'text'|'media'|'layers'>('layouts')
  const [layoutCat, setLayoutCat] = useState('All')

  // Canvas state
  const [canvasW, setCanvasW] = useState(1280)
  const [canvasH, setCanvasH] = useState(720)
  const [zoom, setZoom] = useState(0.65)
  const [displayW, setDisplayW] = useState(832) // zoom * canvasW
  const [displayH, setDisplayH] = useState(468)

  // Tool & selection
  const [activeTool, setActiveTool] = useState('select')
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [fontColor, setFontColor] = useState('#18181B')
  const [fillColor, setFillColor] = useState('#4F46E5')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('Inter')
  const [fontSearch, setFontSearch] = useState('')
  const [showFontPicker, setShowFontPicker] = useState(false)

  // Stock images
  const STOCK = ['photo-1497366216548-37526070297c','photo-1497366754035-f200968a6e72','photo-1560472354-b33ff0c44a43','photo-1556761175-4b46a572b786','photo-1553484771-047a44eee27b','photo-1522202176988-66273c2fd55f','photo-1504384308090-c894fdcc538d','photo-1551434678-e076c223a692','photo-1573496359142-b8d87734a5a2','photo-1600880292203-757bb62b4baf','photo-1531297484001-80022131f5a1','photo-1519389950473-47ba0277781c']
  const [stockImages, setStockImages] = useState<string[]>([])

  // History
  const historyStack = useRef<any[]>([])
  const historyIndex = useRef(-1)
  const isUndoRedo = useRef(false)

  // Refs for callbacks
  const saveTimer = useRef<NodeJS.Timeout|null>(null)
  const pagesRef = useRef<any[]>([])
  const currentPageRef = useRef(0)
  const cWRef = useRef(1280)
  const cHRef = useRef(720)
  const zoomRef = useRef(0.65)

  useEffect(()=>{ pagesRef.current=pages },[pages])
  useEffect(()=>{ currentPageRef.current=currentPage },[currentPage])
  useEffect(()=>{ cWRef.current=canvasW },[canvasW])
  useEffect(()=>{ cHRef.current=canvasH },[canvasH])
  useEffect(()=>{ zoomRef.current=zoom },[zoom])

  // ── Font loading ──────────────────────────────────────────────────────────
  useEffect(()=>{
    const url='https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap'
    if(!document.querySelector(`link[href="${url}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=url;document.head.appendChild(l)}
  },[])

  // ── Init Fabric ───────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!(window as any).fabric){
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
      s.onload=()=>initFabric();document.head.appendChild(s)
    } else { initFabric() }
    if(!(window as any).jspdf){const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';document.head.appendChild(s)}
    loadDocument(); loadShareLinks()
  },[params.id]) // eslint-disable-line

  async function loadDocument(){
    const{data}=await supabase.from('documents').select('*').eq('id',params.id).single()
    if(!data){router.push('/dashboard');return}
    setDoc(data);setTitle(data.title)
    const cd=(data as any).canvas_data
    if(cd?.pages?.length){
      setPages(cd.pages);pagesRef.current=cd.pages
      if(cd.canvasW){setCanvasW(cd.canvasW);cWRef.current=cd.canvasW}
      if(cd.canvasH){setCanvasH(cd.canvasH);cHRef.current=cd.canvasH}
      waitForFabricThenLoad(cd.pages[0],cd.canvasW||1280,cd.canvasH||720)
    } else { setShowStartModal(true) }
  }

  async function loadShareLinks(){const{data}=await supabase.from('share_links').select('*').eq('document_id',params.id).order('created_at',{ascending:false});setShareLinks(data??[])}

  // ── Core Fabric init with proper DPR and native zoom ─────────────────────
  function initFabric(){
    if(fabricReady.current||!canvasEl.current)return
    if(!(window as any).fabric){setTimeout(initFabric,80);return}
    const fab=(window as any).fabric
    fabricLib.current=fab

    const dpr=window.devicePixelRatio||1
    const W=cWRef.current, H=cHRef.current
    const z=zoomRef.current

    // Physical canvas = logical size * DPR for sharp rendering
    const physW=Math.round(W*z*dpr)
    const physH=Math.round(H*z*dpr)

    const fc=new fab.Canvas(canvasEl.current,{
      width:physW, height:physH,
      backgroundColor:'#ffffff',
      selection:true,
      preserveObjectStacking:true,
      enableRetinaScaling:true,
    })

    // Use Fabric native zoom × DPR — this is the key fix for blur
    fc.setZoom(z*dpr)

    // CSS display size (what the user sees)
    fc.wrapperEl.style.width=`${Math.round(W*z)}px`
    fc.wrapperEl.style.height=`${Math.round(H*z)}px`
    canvasEl.current.style.width=`${Math.round(W*z)}px`
    canvasEl.current.style.height=`${Math.round(H*z)}px`

    fabricRef.current=fc;(window as any).__fabricCanvas=fc
    fabricReady.current=true

    setDisplayW(Math.round(W*z))
    setDisplayH(Math.round(H*z))

    // Snapping guides
    let vLine:any=null,hLine:any=null
    fc.on('object:moving',(e:any)=>{
      if(vLine){fc.remove(vLine);vLine=null}
      if(hLine){fc.remove(hLine);hLine=null}
      const obj=e.target, cw=cWRef.current, ch=cHRef.current
      const cx=obj.left+(obj.width*(obj.scaleX||1))/2
      const cy=obj.top+(obj.height*(obj.scaleY||1))/2
      const snap=(a:number,b:number,thresh=8)=>Math.abs(a-b)<thresh
      if(snap(cx,cw/2)){obj.set('left',cw/2-(obj.width*(obj.scaleX||1))/2);vLine=new fab.Line([cw/2,0,cw/2,ch],{stroke:'#EF4444',strokeWidth:0.5,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7});fc.add(vLine)}
      if(snap(cy,ch/2)){obj.set('top',ch/2-(obj.height*(obj.scaleY||1))/2);hLine=new fab.Line([0,ch/2,cw,ch/2],{stroke:'#EF4444',strokeWidth:0.5,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7});fc.add(hLine)}
    })
    fc.on('object:moved',()=>{if(vLine){fc.remove(vLine);vLine=null}if(hLine){fc.remove(hLine);hLine=null};fc.renderAll();scheduleAutoSave()})
    fc.on('object:modified',()=>{scheduleAutoSave();captureThumbnail(currentPageRef.current)})
    fc.on('selection:created',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:updated',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:cleared',()=>setSelectedObj(null))
    fc.on('text:changed',()=>scheduleAutoSave())
    fc.on('path:created',()=>pushHistory())
  }

  // ── Update Fabric zoom (native, no CSS transform) ─────────────────────────
  function applyZoom(newZoom: number, W: number, H: number){
    const fc=fabricRef.current; if(!fc)return
    const dpr=window.devicePixelRatio||1
    const physW=Math.round(W*newZoom*dpr)
    const physH=Math.round(H*newZoom*dpr)
    const dispW=Math.round(W*newZoom)
    const dispH=Math.round(H*newZoom)

    fc.setWidth(physW); fc.setHeight(physH)
    fc.setZoom(newZoom*dpr)
    if(fc.wrapperEl){fc.wrapperEl.style.width=`${dispW}px`;fc.wrapperEl.style.height=`${dispH}px`}
    if(canvasEl.current){canvasEl.current.style.width=`${dispW}px`;canvasEl.current.style.height=`${dispH}px`}
    fc.renderAll()
    setDisplayW(dispW); setDisplayH(dispH)
  }

  // ── History ───────────────────────────────────────────────────────────────
  function pushHistory(){
    if(isUndoRedo.current||!fabricRef.current)return
    const state=fabricRef.current.toJSON()
    historyStack.current=historyStack.current.slice(0,historyIndex.current+1)
    if(historyStack.current.length>=60)historyStack.current.shift()
    historyStack.current.push(state);historyIndex.current=historyStack.current.length-1
  }
  function undo(){
    if(historyIndex.current<=0)return
    isUndoRedo.current=true;historyIndex.current--
    fabricRef.current?.loadFromJSON(historyStack.current[historyIndex.current],()=>{fabricRef.current.renderAll();isUndoRedo.current=false})
  }
  function redo(){
    if(historyIndex.current>=historyStack.current.length-1)return
    isUndoRedo.current=true;historyIndex.current++
    fabricRef.current?.loadFromJSON(historyStack.current[historyIndex.current],()=>{fabricRef.current.renderAll();isUndoRedo.current=false})
  }

  function waitForFabricThenLoad(pageJson:any, W:number, H:number){
    const attempt=()=>{
      if(fabricRef.current){
        const dpr=window.devicePixelRatio||1
        const z=zoomRef.current
        const physW=Math.round(W*z*dpr), physH=Math.round(H*z*dpr)
        const dispW=Math.round(W*z), dispH=Math.round(H*z)
        fabricRef.current.setWidth(physW); fabricRef.current.setHeight(physH)
        fabricRef.current.setZoom(z*dpr)
        if(fabricRef.current.wrapperEl){fabricRef.current.wrapperEl.style.width=`${dispW}px`;fabricRef.current.wrapperEl.style.height=`${dispH}px`}
        if(canvasEl.current){canvasEl.current.style.width=`${dispW}px`;canvasEl.current.style.height=`${dispH}px`}
        setDisplayW(dispW); setDisplayH(dispH)
        fabricRef.current.loadFromJSON(pageJson,()=>{fabricRef.current.renderAll();pushHistory()})
      } else { setTimeout(attempt,100) }
    }
    attempt()
  }

  function syncSel(obj:any){
    if(!obj)return
    setSelectedObj(obj)
    if(obj.fontSize)setFontSize(obj.fontSize)
    if(obj.fontFamily)setFontFamily(obj.fontFamily)
    if(typeof obj.fill==='string')setFontColor(obj.fill)
  }

  function captureThumbnail(idx:number){
    try{const url=fabricRef.current?.toDataURL({format:'jpeg',quality:.35,multiplier:0.1});if(url)setThumbnails(p=>({...p,[idx]:url}))}catch(e){}
  }

  function scheduleAutoSave(){
    if(saveTimer.current)clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(()=>saveCanvas(),1800)
  }

  const saveCanvas=useCallback(async()=>{
    if(!fabricRef.current)return
    setSaving(true)
    const curJson=fabricRef.current.toJSON()
    const all=[...pagesRef.current];all[currentPageRef.current]=curJson
    pagesRef.current=all;setPages([...all])
    await supabase.from('documents').update({canvas_data:{pages:all,canvasW:cWRef.current,canvasH:cHRef.current},updated_at:new Date().toISOString()} as any).eq('id',params.id)
    setSaving(false);setLastSaved(new Date())
    captureThumbnail(currentPageRef.current)
  },[params.id])

  async function saveTitle(){await supabase.from('documents').update({title:title||'Untitled'}).eq('id',params.id)}
  async function publishDocument(){await supabase.from('documents').update({status:'active'}).eq('id',params.id);setDoc(p=>p?{...p,status:'active'}:p);setShowShare(true)}

  // ── Pages ─────────────────────────────────────────────────────────────────
  function switchPage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    pagesRef.current=upd;setPages([...upd]);setCurrentPage(idx);currentPageRef.current=idx
    waitForFabricThenLoad(upd[idx],cWRef.current,cHRef.current)
    historyStack.current=[];historyIndex.current=-1
  }
  function addPage(){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    const blank=pg(bgColor);const ni=upd.length
    upd.push(blank);pagesRef.current=upd;setPages([...upd])
    setCurrentPage(ni);currentPageRef.current=ni
    waitForFabricThenLoad(blank,cWRef.current,cHRef.current)
    historyStack.current=[];historyIndex.current=-1
  }
  function duplicatePage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    const copy=JSON.parse(JSON.stringify(upd[idx]));upd.splice(idx+1,0,copy)
    pagesRef.current=upd;setPages([...upd]);switchPage(idx+1)
  }
  function removePage(idx:number){
    if(pagesRef.current.length<=1)return
    const upd=pagesRef.current.filter((_:any,i:number)=>i!==idx)
    pagesRef.current=upd;setPages([...upd])
    const ni=Math.min(currentPageRef.current,upd.length-1);setCurrentPage(ni);currentPageRef.current=ni
    waitForFabricThenLoad(upd[ni],cWRef.current,cHRef.current)
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  function applyLayout(layout:any){
    if(!fabricRef.current)return
    const built=layout.build(cWRef.current,cHRef.current)
    fabricRef.current.loadFromJSON(built,()=>{fabricRef.current.renderAll();pushHistory();scheduleAutoSave()})
    fabricRef.current.backgroundColor=built.background||'#ffffff'
  }

  function startBlank(sizeId='pres-169'){
    const size=SIZES.find(s=>s.id===sizeId)||SIZES[0]
    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
    const blank=pg();pagesRef.current=[blank];setPages([blank])
    setCurrentPage(0);currentPageRef.current=0;setShowStartModal(false);setThumbnails({})
    waitForFabricThenLoad(blank,size.w,size.h)
  }

  // ── Elements ──────────────────────────────────────────────────────────────
  function setTool(tool:string){
    setActiveTool(tool)
    const fc=fabricRef.current; if(!fc)return
    if(tool==='draw'){fc.isDrawingMode=true;if(fc.freeDrawingBrush){fc.freeDrawingBrush.color=fontColor;fc.freeDrawingBrush.width=3}}
    else{fc.isDrawingMode=false}
    if(tool==='text'){
      const fab=fabricLib.current||(window as any).fabric; if(!fab)return
      const tb=new fab.Textbox('Click to edit',{left:100,top:100,width:340,fontSize:24,fontFamily,fill:fontColor,fontWeight:'400',editable:true,lineHeight:1.35})
      fc.add(tb);fc.setActiveObject(tb);fc.renderAll();pushHistory();setActiveTool('select');fc.isDrawingMode=false
    }
  }

  function addShape(type:string, opts:any={}){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    const fill=opts.fill||fillColor
    let shape:any
    if(type==='rect')     shape=new fab.Rect({left:120,top:120,width:220,height:110,fill,rx:opts.rx||0})
    else if(type==='circle') shape=new fab.Circle({left:120,top:120,radius:70,fill})
    else if(type==='triangle') shape=new fab.Triangle({left:120,top:120,width:140,height:120,fill})
    else if(type==='line') shape=new fab.Line([100,200,420,200],{stroke:fill,strokeWidth:3,selectable:true})
    else if(type==='star'){
      const pts=[],or=70,ir=30,cx=140,cy=140
      for(let i=0;i<10;i++){const r=i%2===0?or:ir,a=(i*Math.PI/5)-Math.PI/2;pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)})}
      shape=new fab.Polygon(pts,{fill,left:100,top:100})
    }
    if(shape){fc.add(shape);fc.setActiveObject(shape);fc.renderAll();pushHistory()}
  }

  function addTable(rows=4,cols=3){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    const cw=160,rh=42,x=100,y=100
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
      const isH=i===0
      fc.add(new fab.Rect({left:x+j*cw,top:y+i*rh,width:cw,height:rh,fill:isH?'#0F172A':i%2===0?'#F9FAFB':'#FFFFFF',stroke:'#E2E8F0',strokeWidth:1,selectable:true}))
      fc.add(new fab.IText(isH?`Col ${j+1}`:`Row ${i} · Col ${j+1}`,{left:x+j*cw+10,top:y+i*rh+12,width:cw-20,fontSize:12,fontFamily:'Inter',fill:isH?'#ffffff':'#374151',fontWeight:isH?'600':'400',editable:true,selectable:true}))
    }
    fc.renderAll();pushHistory()
  }

  function uploadImage(file:File){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    const r=new FileReader()
    r.onload=e=>fab.Image.fromURL(e.target?.result as string,(img:any)=>{
      const sc=Math.min(400/img.width,300/img.height,1);img.set({left:120,top:120,scaleX:sc,scaleY:sc})
      fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHistory()
    })
    r.readAsDataURL(file)
  }

  function addStockImage(url:string){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    fab.Image.fromURL(url,(img:any)=>{
      const sc=Math.min(cWRef.current/img.width,cHRef.current/img.height,1);img.set({left:0,top:0,scaleX:sc,scaleY:sc,crossOrigin:'anonymous'})
      fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHistory()
    },{crossOrigin:'anonymous'})
  }

  function loadGoogleFont(family:string){
    const safe=family.replace(/ /g,'+')
    if(document.querySelector(`link[data-font="${safe}"]`))return
    const l=document.createElement('link');l.rel='stylesheet'
    l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@300;400;500;600;700;800;900&display=swap`
    l.setAttribute('data-font',safe);document.head.appendChild(l)
  }

  function applyFont(f:string){ loadGoogleFont(f); setFontFamily(f); setShowFontPicker(false); updateProp('fontFamily',f) }
  function deleteSelected(){ const fc=fabricRef.current; if(!fc)return; fc.getActiveObjects().forEach((o:any)=>fc.remove(o)); fc.discardActiveObject(); fc.renderAll(); setSelectedObj(null); pushHistory() }
  function duplicateSelected(){ const fc=fabricRef.current; if(!fc)return; fc.getActiveObject()?.clone((c:any)=>{ c.set({left:c.left+20,top:c.top+20}); fc.add(c); fc.setActiveObject(c); fc.renderAll(); pushHistory() }) }
  function groupSelected(){ const fc=fabricRef.current; if(!fc||fc.getActiveObject()?.type!=='activeSelection')return; fc.getActiveObject().toGroup(); fc.renderAll(); pushHistory() }
  function ungroupSelected(){ const fc=fabricRef.current; if(!fc||fc.getActiveObject()?.type!=='group')return; fc.getActiveObject().toActiveSelection(); fc.renderAll(); pushHistory() }
  function updateProp(prop:string,value:any){ const fc=fabricRef.current; if(!fc)return; const obj=fc.getActiveObject(); if(!obj)return; obj.set(prop,value); fc.renderAll(); scheduleAutoSave() }

  async function exportPDF(){
    const fc=fabricRef.current; if(!fc||(window as any).jspdf===undefined)return
    const{jsPDF}=(window as any).jspdf
    const saved=[...pagesRef.current];saved[currentPageRef.current]=fc.toJSON()
    const pdf=new jsPDF({orientation:cWRef.current>cHRef.current?'landscape':'portrait',unit:'px',format:[cWRef.current,cHRef.current]})
    for(let i=0;i<saved.length;i++){
      if(i>0)pdf.addPage()
      await new Promise<void>(res=>{
        const tmp=document.createElement('canvas');tmp.width=cWRef.current;tmp.height=cHRef.current
        const tfc=new (window as any).fabric.StaticCanvas(tmp,{width:cWRef.current,height:cHRef.current})
        tfc.loadFromJSON(saved[i],()=>{tfc.renderAll();pdf.addImage(tfc.toDataURL({format:'jpeg',quality:.92}),'JPEG',0,0,cWRef.current,cHRef.current);tfc.dispose();res()})
      })
    }
    pdf.save(`${title||'document'}.pdf`)
  }
  async function exportPNG(){ const fc=fabricRef.current; if(!fc)return; const a=document.createElement('a');a.href=fc.toDataURL({format:'png',multiplier:2});a.download=`${title||'slide'}.png`;a.click() }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement).tagName
      if(tag==='INPUT'||tag==='TEXTAREA')return
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
      if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();redo()}
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();saveCanvas()}
      if((e.metaKey||e.ctrlKey)&&e.key==='d'){e.preventDefault();duplicateSelected()}
      if((e.metaKey||e.ctrlKey)&&e.key==='g'){e.preventDefault();groupSelected()}
      if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='G'){e.preventDefault();ungroupSelected()}
      if((e.key==='Delete'||e.key==='Backspace')&&fabricRef.current?.getActiveObject())deleteSelected()
      if(e.key==='Escape'){setSelectedObj(null);fabricRef.current?.discardActiveObject();fabricRef.current?.renderAll()}
      if(e.key==='v'){setTool('select')}
      if(e.key==='t'){setTool('text')}
      if(e.key==='p'){setTool('draw')}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        const obj=fabricRef.current?.getActiveObject();if(!obj)return
        const d=e.shiftKey?10:1
        if(e.key==='ArrowLeft')obj.set('left',(obj.left||0)-d)
        if(e.key==='ArrowRight')obj.set('left',(obj.left||0)+d)
        if(e.key==='ArrowUp')obj.set('top',(obj.top||0)-d)
        if(e.key==='ArrowDown')obj.set('top',(obj.top||0)+d)
        fabricRef.current.renderAll();scheduleAutoSave()
      }
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[saveCanvas]) // eslint-disable-line

  const isActive=doc?.status==='active'
  const filteredLayouts=layoutCat==='All'?LAYOUTS:LAYOUTS.filter(l=>l.cat===layoutCat)
  const filteredFonts=FONTS.filter(f=>f.toLowerCase().includes(fontSearch.toLowerCase()))

  // ── Right panel ───────────────────────────────────────────────────────────
  function RightPanel(){
    const isText=selectedObj?.type==='textbox'||selectedObj?.type==='i-text'||selectedObj?.type==='text'
    const isImg=selectedObj?.type==='image'
    const isShape=selectedObj&&!isText&&!isImg

    if(!selectedObj) return (
      <div style={{ width:232, background:C.panel, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, overflow:'auto' }}>
        <div style={{ padding:'12px 14px 10px', borderBottom:`1px solid ${C.border}` }}>
          <span style={{ ...UI, fontSize:10, fontWeight:700, color:C.textMd, letterSpacing:'.04em' }}>CANVAS</span>
        </div>
        <Sec label="Background">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <input type="color" value={bgColor} onChange={e=>{ setBgColor(e.target.value); if(fabricRef.current){fabricRef.current.backgroundColor=e.target.value;fabricRef.current.renderAll();scheduleAutoSave()} }} style={{ width:32, height:32, borderRadius:7, border:`1px solid ${C.border}`, cursor:'pointer', padding:0 }}/>
            <span style={{ ...UI, fontSize:12, color:C.textMd, fontFamily:F.mono }}>{bgColor}</span>
          </div>
        </Sec>
        <Sec label="Size">
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {SIZES.map(sz=>(
              <button key={sz.id} onClick={()=>{
                setCanvasW(sz.w);setCanvasH(sz.h);cWRef.current=sz.w;cHRef.current=sz.h
                applyZoom(zoomRef.current,sz.w,sz.h)
              }} style={{ ...UI, padding:'6px 9px', border:`1px solid ${canvasW===sz.w&&canvasH===sz.h?C.accent:C.border}`, borderRadius:8, background:canvasW===sz.w&&canvasH===sz.h?C.accentLt:'#fff', fontSize:11, cursor:'pointer', color:canvasW===sz.w&&canvasH===sz.h?C.accent:C.textMd, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{sz.label}</span>
                <span style={{ fontSize:9, color:C.textSm, fontFamily:F.mono }}>{sz.sub}</span>
              </button>
            ))}
          </div>
        </Sec>
      </div>
    )

    return (
      <div style={{ width:232, background:C.panel, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
        <div style={{ padding:'11px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ ...UI, fontSize:10, fontWeight:700, color:C.textMd, textTransform:'capitalize', letterSpacing:'.04em' }}>{selectedObj?.type}</span>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={duplicateSelected} title="Duplicate" style={{ width:26, height:26, border:`1px solid ${C.border}`, borderRadius:6, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textMd }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><rect x="1" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" fill="white"/></svg>
            </button>
            <button onClick={deleteSelected} title="Delete" style={{ width:26, height:26, border:`1px solid #FEE2E2`, borderRadius:6, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.red }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 9.5V5M7.5 9.5V5M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div style={{ flex:1, overflow:'auto' }}>
          <Sec label="Position & Size">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <NumInput label="X" value={Math.round(selectedObj.left||0)} onChange={v=>updateProp('left',v)}/>
              <NumInput label="Y" value={Math.round(selectedObj.top||0)} onChange={v=>updateProp('top',v)}/>
              <NumInput label="W" value={Math.round(selectedObj.width||0)} onChange={v=>updateProp('width',v)}/>
              <NumInput label="H" value={Math.round(selectedObj.height||0)} onChange={v=>updateProp('height',v)}/>
            </div>
          </Sec>

          <Sec label="Appearance">
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {!isText && (
                <div>
                  <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Fill</div>
                  <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                    <input type="color" value={typeof selectedObj.fill==='string'?selectedObj.fill:'#4f46e5'} onChange={e=>{ setFillColor(e.target.value); updateProp('fill',e.target.value) }} style={{ width:32, height:32, borderRadius:7, border:`1px solid ${C.border}`, cursor:'pointer', padding:0 }}/>
                    <span style={{ ...UI, fontSize:12, color:C.textMd, fontFamily:F.mono }}>{typeof selectedObj.fill==='string'?selectedObj.fill:'—'}</span>
                  </div>
                </div>
              )}
              {isShape && (
                <div>
                  <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Stroke</div>
                  <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                    <input type="color" value={selectedObj.stroke||'#000000'} onChange={e=>updateProp('stroke',e.target.value)} style={{ width:32, height:32, borderRadius:7, border:`1px solid ${C.border}`, cursor:'pointer', padding:0 }}/>
                    <NumInput label="Width" value={selectedObj.strokeWidth||0} onChange={v=>updateProp('strokeWidth',v)}/>
                  </div>
                </div>
              )}
              <Slider label="Opacity" value={Math.round((selectedObj.opacity??1)*100)} min={0} max={100} onChange={v=>updateProp('opacity',v/100)}/>
              {isShape && selectedObj.type==='rect' && <NumInput label="Corner Radius" value={selectedObj.rx||0} onChange={v=>{ updateProp('rx',v); updateProp('ry',v) }}/>}
            </div>
          </Sec>

          {isText && (
            <Sec label="Typography">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div>
                  <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Color</div>
                  <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                    <input type="color" value={fontColor} onChange={e=>{ setFontColor(e.target.value); updateProp('fill',e.target.value) }} style={{ width:32, height:32, borderRadius:7, border:`1px solid ${C.border}`, cursor:'pointer', padding:0 }}/>
                    <span style={{ ...UI, fontSize:12, color:C.textMd, fontFamily:F.mono }}>{fontColor}</span>
                  </div>
                </div>
                <div style={{ position:'relative' }}>
                  <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Font</div>
                  <button onClick={()=>setShowFontPicker(!showFontPicker)} style={{ ...UI, width:'100%', padding:'6px 9px', border:`1px solid ${C.border}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:`'${fontFamily}',sans-serif`, fontWeight:500, color:C.text, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fontFamily}</span>
                    <svg width="9" height="5" viewBox="0 0 9 5" fill="none"><path d="M1 1l3.5 3L8 1" stroke={C.textSm} strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </button>
                  {showFontPicker && (
                    <div style={{ position:'absolute', top:'110%', left:0, right:0, background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 8px 28px rgba(0,0,0,.12)', zIndex:200 }}>
                      <div style={{ padding:'7px 7px 3px' }}>
                        <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search…" autoFocus style={{ ...UI, width:'100%', padding:'5px 8px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, color:C.text, background:C.bg, outline:'none' }}/>
                      </div>
                      <div style={{ maxHeight:190, overflow:'auto', padding:'3px 5px 5px' }}>
                        {filteredFonts.slice(0,60).map(f=>(
                          <div key={f} onClick={()=>applyFont(f)} style={{ ...UI, padding:'5px 8px', cursor:'pointer', fontSize:12, borderRadius:5, fontFamily:`'${f}',sans-serif`, color:fontFamily===f?C.accent:C.textMd, background:fontFamily===f?C.accentLt:'transparent', fontWeight:fontFamily===f?700:400 }}>{f}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <NumInput label="Size" value={fontSize} onChange={v=>{ setFontSize(v); updateProp('fontSize',v) }}/>
                <div>
                  <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Style</div>
                  <div style={{ display:'flex', gap:4 }}>
                    {[{label:'B',prop:'fontWeight',on:'bold',off:'normal',active:selectedObj.fontWeight==='bold'||selectedObj.fontWeight===800,st:{fontWeight:800}},{label:'I',prop:'fontStyle',on:'italic',off:'normal',active:selectedObj.fontStyle==='italic',st:{fontStyle:'italic' as const}},{label:'U',prop:'underline',on:true,off:false,active:selectedObj.underline===true,st:{textDecoration:'underline' as const}}].map(f=>(
                      <button key={f.label} onClick={()=>updateProp(f.prop,f.active?f.off:f.on)} style={{ ...pill(f.active), ...f.st, width:32, height:28, padding:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{f.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Align</div>
                  <div style={{ display:'flex', gap:4 }}>
                    {(['left','center','right'] as const).map(a=>(
                      <button key={a} onClick={()=>updateProp('textAlign',a)} style={{ ...pill(selectedObj.textAlign===a), width:30, height:28, padding:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{a[0].toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <Slider label="Line Height" value={Math.round(((selectedObj.lineHeight??1.35)*10))/10} min={0.8} max={3} onChange={v=>updateProp('lineHeight',v)}/>
              </div>
            </Sec>
          )}

          <Sec label="Transform">
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <NumInput label="Rotation" value={Math.round(selectedObj.angle||0)} onChange={v=>updateProp('angle',v)}/>
              <div>
                <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Blend Mode</div>
                <select value={selectedObj.globalCompositeOperation||'normal'} onChange={e=>updateProp('globalCompositeOperation',e.target.value)}
                  style={{ ...UI, width:'100%', padding:'6px 8px', border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, color:C.text, background:'#fff', outline:'none' }}>
                  {BLENDS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <div style={{ ...UI, fontSize:9, fontWeight:600, color:C.textSm, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Align to canvas</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
                  {[
                    {l:'Left',   fn:()=>updateProp('left',0)},
                    {l:'Center', fn:()=>updateProp('left',cWRef.current/2-(selectedObj.width*(selectedObj.scaleX||1))/2)},
                    {l:'Right',  fn:()=>updateProp('left',cWRef.current-(selectedObj.width*(selectedObj.scaleX||1)))},
                    {l:'Top',    fn:()=>updateProp('top',0)},
                    {l:'Middle', fn:()=>updateProp('top',cHRef.current/2-(selectedObj.height*(selectedObj.scaleY||1))/2)},
                    {l:'Bottom', fn:()=>updateProp('top',cHRef.current-(selectedObj.height*(selectedObj.scaleY||1)))},
                  ].map(a=>(
                    <button key={a.l} onClick={a.fn} style={{ ...UI, padding:'4px 0', border:`1px solid ${C.border}`, borderRadius:5, background:'#fff', fontSize:9, cursor:'pointer', color:C.textMd, fontWeight:500 }}>{a.l}</button>
                  ))}
                </div>
              </div>
            </div>
          </Sec>
        </div>
      </div>
    )
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg, ...UI, color:C.text, overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.borderMd};border-radius:99px}
        input[type="color"]{-webkit-appearance:none;border:none;padding:0;overflow:hidden}input[type="color"]::-webkit-color-swatch-wrapper{padding:0}input[type="color"]::-webkit-color-swatch{border:none}
        .lt{height:38px;border:none;cursor:pointer;background:transparent;font-family:${F.ui};font-size:11px;font-weight:600;color:${C.textMd};padding:0 11px;border-bottom:2px solid transparent;transition:all .14s;white-space:nowrap;flex-shrink:0}
        .lt:hover{color:${C.text}}.lt.on{color:${C.accent};border-bottom-color:${C.accent}}
        .tb{width:32px;height:30px;border:none;cursor:pointer;border-radius:7px;background:transparent;color:${C.textMd};display:flex;align-items:center;justify-content:center;transition:all .12s;flex-shrink:0}
        .tb:hover{background:${C.bg};color:${C.text}}.tb.on{background:${C.accentLt};color:${C.accent};border:1px solid ${C.accentMd}}
        .lc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:54px;border:1px solid ${C.border};border-radius:9px;background:#fff;cursor:pointer;font-size:9px;font-weight:700;color:${C.textMd};font-family:${F.ui};transition:all .13s}
        .lc:hover{border-color:${C.accent};color:${C.accent};background:${C.accentLt}}
        .pt{cursor:pointer;border-radius:8px;border:1.5px solid ${C.border};overflow:hidden;transition:all .14s;background:#fff;flex-shrink:0}
        .pt:hover{border-color:${C.borderMd};box-shadow:0 2px 8px rgba(0,0,0,.07)}.pt.on{border-color:${C.accent};box-shadow:0 0 0 2px ${C.accentLt}}
        .lcrd{transition:all .14s;border:1.5px solid ${C.border};border-radius:10px;overflow:hidden;cursor:pointer;background:#fff}
        .lcrd:hover{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentLt};transform:translateY(-1px)}
        .si{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:border-color .14s}
        .si:hover{border-color:${C.accent}}
        .dv{width:1px;height:18px;background:${C.border};margin:0 2px;flex-shrink:0}
        .pa{height:30px;padding:0 14px;border-radius:8px;font-size:12px;font-weight:700;border:none;background:${C.accent};color:white;cursor:pointer;font-family:${F.ui};display:flex;align-items:center;gap:5px;transition:all .14s;flex-shrink:0}
        .pa:hover{background:#4338CA}
        .sa{height:30px;padding:0 12px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid ${C.border};background:#fff;color:${C.textMd};cursor:pointer;font-family:${F.ui};display:flex;align-items:center;gap:5px;transition:all .13s;flex-shrink:0}
        .sa:hover{background:${C.bg};border-color:${C.borderMd};color:${C.text}}
        .cp{padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;border:1px solid ${C.border};background:#fff;color:${C.textMd};cursor:pointer;font-family:${F.ui};transition:all .11s;white-space:nowrap}
        .cp:hover{background:${C.bg}}.cp.on{background:${C.accentLt};color:${C.accent};border-color:${C.accentMd}}
      `}</style>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{ height:50, background:C.panel, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', padding:'0 14px', gap:6, flexShrink:0, zIndex:30 }}>
        <button onClick={()=>router.push('/dashboard')} style={{ ...UI, background:'none', border:'none', cursor:'pointer', color:C.textMd, display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:500, padding:'4px 6px', borderRadius:6, flexShrink:0 }}
          onMouseOver={e=>(e.currentTarget.style.color=C.text)} onMouseOut={e=>(e.currentTarget.style.color=C.textMd)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 2L3 6.5l5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Docs
        </button>
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M1 1l3 4-3 4" stroke={C.border} strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{ ...UI, border:'none', outline:'none', fontSize:14, fontWeight:600, color:C.text, background:'transparent', maxWidth:180, minWidth:60, letterSpacing:'-.01em' }}/>
        <span style={{ fontSize:10, color:saving?C.accent:C.textSm, fontFamily:F.mono, minWidth:52, flexShrink:0 }}>{saving?'saving…':lastSaved?'✓ saved':''}</span>
        <span style={{ padding:'3px 8px', borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:'.06em', background:isActive?'#ECFDF5':'#F1F5F9', color:isActive?C.green:C.textSm, border:`1px solid ${isActive?'#A7F3D0':C.border}`, flexShrink:0 }}>{isActive?'LIVE':'DRAFT'}</span>

        <div style={{ flex:1 }}/>

        {/* Tool mode */}
        <div style={{ display:'flex', alignItems:'center', gap:1, background:C.bg, borderRadius:8, padding:2, border:`1px solid ${C.border}` }}>
          {[
            {id:'select', tip:'Select (V)', icon:<path d="M2.5 1.5l7.5 4-3.5 1.1-1.6 3.9L2.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>},
            {id:'text',   tip:'Text (T)',   icon:<><path d="M2 4h8M6 4v5M4 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>},
            {id:'draw',   tip:'Draw (P)',   icon:<path d="M2 10l2-1 6-6-1-1-6 6-1 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>},
          ].map(tool=>(
            <button key={tool.id} title={tool.tip} className={`tb${activeTool===tool.id?' on':''}`} onClick={()=>setTool(tool.id)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">{tool.icon}</svg>
            </button>
          ))}
        </div>

        <div className="dv"/>
        <button onClick={undo} title="Undo ⌘Z" className="tb"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6A4 4 0 016 2.5H4M4 2.5L1.5 5 4 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <button onClick={redo} title="Redo ⌘⇧Z" className="tb"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 6A4 4 0 007 2.5H9M9 2.5l2.5 2.5L9 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div className="dv"/>

        <button onClick={()=>setShowDrafter(true)} className="sa">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.2 3H11L8.4 6l1 3L6 7.4 2.6 9l1-3L1 4h3.8L6 1z" fill={C.amber} stroke={C.amber} strokeWidth=".5" strokeLinejoin="round"/></svg>
          AI Draft
        </button>

        {/* Export dropdown */}
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowExport(!showExport)} className="sa">
            Export
            <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
          {showExport && (
            <div style={{ position:'absolute', top:'110%', right:0, background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 8px 28px rgba(0,0,0,.1)', zIndex:300, minWidth:150, padding:4 }}>
              {[
                {label:'Export PDF', fn:()=>{exportPDF();setShowExport(false)}},
                {label:'Export PNG', fn:()=>{exportPNG();setShowExport(false)}},
              ].map(b=>(
                <button key={b.label} onClick={b.fn} style={{ ...UI, display:'flex', width:'100%', padding:'8px 12px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight:500, color:C.textMd, borderRadius:7, textAlign:'left' }}
                  onMouseOver={e=>(e.currentTarget.style.background=C.bg)} onMouseOut={e=>(e.currentTarget.style.background='none')}>{b.label}</button>
              ))}
            </div>
          )}
        </div>

        {isActive
          ?<button onClick={()=>setShowShare(true)} className="pa">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="9" cy="2" r="1.5" stroke="white" strokeWidth="1.2"/><circle cx="9" cy="10" r="1.5" stroke="white" strokeWidth="1.2"/><circle cx="3" cy="6" r="1.5" stroke="white" strokeWidth="1.2"/><path d="M7.5 2.8l-3 2.4M7.5 9.2l-3-2.4" stroke="white" strokeWidth="1.2"/></svg>
            Share
          </button>
          :<button onClick={publishDocument} className="pa">Publish & Share</button>}
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
        <div style={{ width:248, background:C.panel, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 6px', flexShrink:0, overflowX:'auto' }}>
            {(['layouts','elements','text','media','layers'] as const).map(t=>(
              <button key={t} className={`lt${leftTab===t?' on':''}`} onClick={()=>setLeftTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
            ))}
          </div>

          <div style={{ flex:1, overflow:'auto', padding:10 }}>

            {/* Layouts */}
            {leftTab==='layouts' && (
              <div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
                  {LAYOUT_CATS.map(c=><button key={c} className={`cp${layoutCat===c?' on':''}`} onClick={()=>setLayoutCat(c)}>{c}</button>)}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                  {filteredLayouts.map(l=>(
                    <div key={l.id} className="lcrd" onClick={()=>applyLayout(l)}>
                      <div style={{ aspectRatio:'16/9', background:l.build(160,90).background||'#F8FAFC', padding:5, position:'relative', overflow:'hidden', borderBottom:`1px solid ${C.border}` }}>
                        {l.build(160,90).objects?.slice(0,5).map((o:any,oi:number)=>(
                          o.type==='rect'&&<div key={oi} style={{ position:'absolute', left:`${(o.left/160)*100}%`, top:`${(o.top/90)*100}%`, width:`${Math.min((o.width/160)*100,100)}%`, height:`${Math.min((o.height/90)*100,100)}%`, background:o.fill, borderRadius:o.rx?2:0, opacity:Math.min(o.opacity??1,1) }}/>
                        ))}
                      </div>
                      <div style={{ padding:'5px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ ...UI, fontSize:10, fontWeight:600, color:C.textMd }}>{l.label}</span>
                        <span style={{ fontSize:8, color:C.textSm, background:C.bg, padding:'1px 5px', borderRadius:6 }}>{l.cat}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elements */}
            {leftTab==='elements' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <p style={{ ...UI, fontSize:9, fontWeight:700, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:7 }}>Shapes</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
                    {[
                      {id:'rect',     label:'Rect',     icon:<rect x="2" y="3" width="10" height="8" rx="1.5"/>},
                      {id:'circle',   label:'Circle',   icon:<circle cx="7" cy="7" r="5"/>},
                      {id:'triangle', label:'Triangle', icon:<path d="M7 2l5.5 10H1.5L7 2z" strokeLinejoin="round"/>},
                      {id:'star',     label:'Star',     icon:<path d="M7 1l1.5 3.5H12L9.2 6.6l1 3.4L7 8.4 3.8 10l1-3.4L2 4.5h3.5L7 1z" strokeLinejoin="round"/>},
                      {id:'line',     label:'Line',     icon:<path d="M2 12L12 2"/>},
                    ].map(sh=>(
                      <button key={sh.id} className="lc" onClick={()=>addShape(sh.id)}>
                        <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">{sh.icon}</svg>
                        {sh.label}
                      </button>
                    ))}
                    <button className="lc" onClick={()=>addTable(4,3)}>
                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1 5h12M1 9h12M5 5v8M9 5v8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                      Table
                    </button>
                    <button className="lc" onClick={()=>addShape('rect',{fill:'#4F46E5',rx:8})}>
                      <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><rect x="1" y="1" width="14" height="8" rx="3" stroke="currentColor" strokeWidth="1.1"/></svg>
                      Button
                    </button>
                  </div>
                </div>
                <div>
                  <p style={{ ...UI, fontSize:9, fontWeight:700, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:7 }}>Fill color</p>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <input type="color" value={fillColor} onChange={e=>setFillColor(e.target.value)} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${C.border}`, cursor:'pointer', padding:0 }}/>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {['#4F46E5','#10B981','#F59E0B','#EF4444','#0F172A','#FFFFFF','#F8FAFC','#6366F1'].map(cc=>(
                        <button key={cc} onClick={()=>setFillColor(cc)} style={{ width:22, height:22, borderRadius:4, background:cc, border:`1.5px solid ${fillColor===cc?C.accent:C.border}`, cursor:'pointer', padding:0 }}/>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Text */}
            {leftTab==='text' && (
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <p style={{ ...UI, fontSize:9, fontWeight:700, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>Add Text</p>
                {[
                  {label:'Heading 1',  fs:52, fw:'900', ff:'Inter',      text:'Heading 1'},
                  {label:'Heading 2',  fs:36, fw:'700', ff:'Inter',      text:'Heading 2'},
                  {label:'Heading 3',  fs:24, fw:'600', ff:'Inter',      text:'Heading 3'},
                  {label:'Body',       fs:16, fw:'400',                  text:'Body text here'},
                  {label:'Caption',    fs:11, fw:'400', fill:'#64748B',  text:'Caption text'},
                  {label:'Label',      fs:10, fw:'700', ff:'JetBrains Mono', fill:'#4F46E5', text:'LABEL'},
                ].map(t=>(
                  <button key={t.label} onClick={()=>{
                    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
                    const tb=new fab.Textbox(t.text,{left:80,top:100,width:420,fontSize:t.fs,fontFamily:t.ff||fontFamily,fill:(t as any).fill||fontColor,fontWeight:t.fw,editable:true,lineHeight:1.35})
                    fc.add(tb);fc.setActiveObject(tb);fc.renderAll();pushHistory()
                  }} style={{ ...UI, padding:'9px 12px', border:`1px solid ${C.border}`, borderRadius:8, background:'#fff', cursor:'pointer', textAlign:'left', transition:'border-color .13s' }}
                    onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)}
                    onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>
                    <span style={{ fontSize:Math.min(t.fs>30?16:t.fs>18?13:11,16), fontWeight:t.fw, fontFamily:`'${t.ff||fontFamily}',sans-serif`, color:C.text }}>{t.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Media */}
            {leftTab==='media' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <label style={{ ...UI, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:10, border:`1px dashed ${C.borderMd}`, borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:600, color:C.textMd, background:C.bg, transition:'border-color .13s' }}
                  onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.borderMd)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  Upload image
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(f)uploadImage(f) }}/>
                </label>
                <div>
                  <p style={{ ...UI, fontSize:9, fontWeight:700, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:7 }}>Stock photos</p>
                  {stockImages.length===0
                    ? <button onClick={()=>setStockImages(STOCK.map(id=>`https://images.unsplash.com/${id}?w=400&q=70&auto=format`))}
                        style={{ ...UI, width:'100%', padding:'8px', border:`1px solid ${C.border}`, borderRadius:8, background:C.bg, cursor:'pointer', fontSize:11, color:C.textMd, fontWeight:600 }}>Load photos</button>
                    : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                        {stockImages.map(url=><img key={url} src={url} alt="" className="si" onClick={()=>addStockImage(url)}/>)}
                      </div>
                  }
                </div>
              </div>
            )}

            {/* Layers */}
            {leftTab==='layers' && <LayersPanel fabric={fabricRef.current} onSelect={syncSel}/>}
          </div>
        </div>

        {/* ── CANVAS + RIGHT PANEL ───────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>
          {/* Canvas viewport */}
          <div style={{ flex:1, overflow:'auto', background:C.canvas, backgroundImage:`radial-gradient(${C.dot} 1px, transparent 1px)`, backgroundSize:'24px 24px', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'52px 40px', position:'relative' }}>
            {/* Canvas — no CSS transform scaling! Fabric native zoom handles it */}
            <div style={{ flexShrink:0, boxShadow:'0 8px 48px rgba(0,0,0,.14)', borderRadius:2, background:'#fff', lineHeight:0, position:'relative' }}>
              <canvas ref={canvasEl}/>
            </div>

            {/* Zoom controls */}
            <div style={{ position:'fixed', bottom:112, right:selectedObj?248:16, display:'flex', alignItems:'center', gap:2, background:C.panel, border:`1px solid ${C.border}`, borderRadius:9, padding:'3px 4px', boxShadow:'0 2px 10px rgba(0,0,0,.08)', zIndex:20 }}>
              <button onClick={()=>{ const nz=Math.max(.12,zoom-.08); setZoom(nz); applyZoom(nz,cWRef.current,cHRef.current) }} style={{ width:26, height:26, border:'none', background:'none', cursor:'pointer', borderRadius:5, color:C.textMd, fontSize:18, fontWeight:300, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
              <span style={{ ...UI, fontSize:10, fontWeight:700, color:C.textMd, minWidth:38, textAlign:'center', fontFamily:F.mono }}>{Math.round(zoom*100)}%</span>
              <button onClick={()=>{ const nz=Math.min(2.5,zoom+.08); setZoom(nz); applyZoom(nz,cWRef.current,cHRef.current) }} style={{ width:26, height:26, border:'none', background:'none', cursor:'pointer', borderRadius:5, color:C.textMd, fontSize:18, fontWeight:300, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              <div style={{ width:1, height:16, background:C.border, margin:'0 1px' }}/>
              <button onClick={()=>{ const nz=.65; setZoom(nz); applyZoom(nz,cWRef.current,cHRef.current) }} style={{ ...UI, height:26, padding:'0 7px', border:'none', background:'none', cursor:'pointer', fontSize:9, fontWeight:700, color:C.textSm, borderRadius:5 }}>FIT</button>
            </div>

            {/* Floating quick toolbar */}
            {selectedObj && (
              <div style={{ position:'fixed', top:58, left:'50%', transform:'translateX(-50%)', background:C.panel, border:`1px solid ${C.border}`, borderRadius:9, boxShadow:'0 4px 20px rgba(0,0,0,.09)', padding:'3px 5px', display:'flex', alignItems:'center', gap:2, zIndex:50 }}>
                {(selectedObj.type==='textbox'||selectedObj.type==='text'||selectedObj.type==='i-text') && (
                  <>
                    <div style={{ position:'relative' }}>
                      <button onClick={()=>setShowFontPicker(!showFontPicker)} style={{ ...UI, height:26, padding:'0 8px', border:`1px solid ${C.border}`, borderRadius:6, background:C.bg, cursor:'pointer', fontSize:11, fontFamily:`'${fontFamily}',sans-serif`, fontWeight:600, color:C.text, maxWidth:96, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fontFamily}</button>
                    </div>
                    <input type="number" value={fontSize} min={6} max={400} onChange={e=>{ const v=parseInt(e.target.value)||fontSize; setFontSize(v); updateProp('fontSize',v) }}
                      style={{ ...UI, width:44, height:26, border:`1px solid ${C.border}`, borderRadius:6, padding:'0 5px', fontSize:11, fontFamily:F.mono, color:C.text, background:C.bg, outline:'none', textAlign:'center' }}/>
                    <input type="color" value={fontColor} onChange={e=>{ setFontColor(e.target.value); updateProp('fill',e.target.value) }} style={{ width:26, height:26, borderRadius:6, border:`1px solid ${C.border}`, cursor:'pointer', padding:0 }}/>
                    <div className="dv"/>
                  </>
                )}
                <button onClick={duplicateSelected} title="Duplicate" style={{ width:26, height:26, border:`1px solid ${C.border}`, borderRadius:6, background:C.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textMd }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><rect x="1" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" fill="white"/></svg>
                </button>
                <button onClick={deleteSelected} title="Delete" style={{ width:26, height:26, border:`1px solid #FEE2E2`, borderRadius:6, background:'#FFF5F5', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.red }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 9.5V5M7.5 9.5V5M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Right panel */}
          <RightPanel/>
        </div>
      </div>

      {/* ── PAGES STRIP ──────────────────────────────────────────────────── */}
      <div style={{ height:100, background:C.panel, borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', flexShrink:0 }}>
        <div style={{ flex:1, overflow:'auto', display:'flex', alignItems:'center', gap:8, padding:'0 14px', height:'100%' }}>
          {pages.map((_,i)=>{
            const thumbW=Math.round(canvasW*(70/canvasH))
            return (
              <div key={i} className={`pt${currentPage===i?' on':''}`} style={{ width:thumbW, height:70, position:'relative' }} onClick={()=>switchPage(i)}>
                {thumbnails[i]
                  ? <img src={thumbnails[i]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <div style={{ width:'100%', height:'100%', background:'#F9FAFB', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:9, color:C.textSm, fontFamily:F.mono }}>{i+1}</span></div>
                }
                {/* Actions on hover */}
                <div style={{ position:'absolute', top:3, right:3, display:'flex', gap:2, opacity:0, transition:'opacity .14s' }} className="pact">
                  <button onClick={e=>{ e.stopPropagation(); duplicatePage(i) }} style={{ width:16, height:16, borderRadius:3, background:'rgba(255,255,255,.9)', border:`1px solid ${C.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textMd, padding:0, fontSize:8 }} title="Duplicate">⧉</button>
                  {pages.length>1&&<button onClick={e=>{ e.stopPropagation(); removePage(i) }} style={{ width:16, height:16, borderRadius:3, background:'rgba(255,255,255,.9)', border:`1px solid #FECACA`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.red, padding:0, fontSize:9 }} title="Delete">×</button>}
                </div>
                <div style={{ position:'absolute', bottom:2, left:0, right:0, textAlign:'center', fontSize:8, color:C.textSm, fontFamily:F.mono }}>{i+1}</div>
              </div>
            )
          })}
          <button onClick={addPage} style={{ ...UI, flexShrink:0, width:48, height:70, border:`1.5px dashed ${C.borderMd}`, borderRadius:8, background:'transparent', cursor:'pointer', fontSize:9, fontWeight:700, color:C.textSm, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, transition:'all .14s' }}
            onMouseOver={e=>{ (e.currentTarget).style.borderColor=C.accent; (e.currentTarget).style.color=C.accent }}
            onMouseOut={e=>{ (e.currentTarget).style.borderColor=C.borderMd; (e.currentTarget).style.color=C.textSm }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add
          </button>
        </div>
        <div style={{ padding:'0 14px', borderLeft:`1px solid ${C.border}`, height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', flexShrink:0 }}>
          <span style={{ ...UI, fontSize:11, fontWeight:700, color:C.textMd }}>{currentPage+1} / {pages.length}</span>
          <span style={{ ...UI, fontSize:9, color:C.textSm }}>pages</span>
        </div>
      </div>

      {/* ── START MODAL ──────────────────────────────────────────────────── */}
      {showStartModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(8px)' }}>
          <div style={{ background:C.panel, borderRadius:18, width:'min(880px,96vw)', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,.2)', border:`1px solid ${C.border}` }}>
            <div style={{ padding:'24px 28px 16px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
              <h2 style={{ ...UI, margin:'0 0 4px', fontSize:20, fontWeight:800, color:C.text, letterSpacing:'-.02em' }}>Start designing</h2>
              <p style={{ ...UI, margin:0, fontSize:13, color:C.textMd }}>Pick a canvas size or jump in with a layout</p>
            </div>
            <div style={{ overflow:'auto', padding:'20px 28px', flex:1 }}>
              <p style={{ ...UI, fontSize:9, fontWeight:800, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Blank Canvas</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(116px,1fr))', gap:6, marginBottom:24 }}>
                {SIZES.map(sz=>(
                  <button key={sz.id} onClick={()=>startBlank(sz.id)} style={{ ...UI, padding:'11px 8px', border:`1px solid ${C.border}`, borderRadius:10, background:'#fff', cursor:'pointer', textAlign:'center', transition:'all .14s' }}
                    onMouseOver={e=>{ (e.currentTarget).style.borderColor=C.accent; (e.currentTarget).style.background=C.accentLt }}
                    onMouseOut={e=>{ (e.currentTarget).style.borderColor=C.border; (e.currentTarget).style.background='#fff' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.text, marginBottom:2 }}>{sz.label}</div>
                    <div style={{ fontSize:9, color:C.textSm, fontFamily:F.mono }}>{sz.sub}</div>
                  </button>
                ))}
              </div>
              <p style={{ ...UI, fontSize:9, fontWeight:800, color:C.textSm, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Start with a layout</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8 }}>
                {LAYOUTS.map(l=>(
                  <div key={l.id} className="lcrd" onClick={()=>{
                    const size=SIZES[0]
                    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
                    const built=l.build(size.w,size.h)
                    pagesRef.current=[built];setPages([built]);setCurrentPage(0);currentPageRef.current=0
                    setShowStartModal(false);setThumbnails({})
                    waitForFabricThenLoad(built,size.w,size.h)
                  }}>
                    <div style={{ aspectRatio:'16/9', background:l.build(160,90).background||'#F8FAFC', padding:4, position:'relative', overflow:'hidden' }}>
                      {l.build(160,90).objects?.slice(0,6).map((o:any,oi:number)=>(
                        o.type==='rect'&&<div key={oi} style={{ position:'absolute', left:`${(o.left/160)*100}%`, top:`${(o.top/90)*100}%`, width:`${Math.min((o.width/160)*100,100)}%`, height:`${Math.min((o.height/90)*100,100)}%`, background:o.fill, borderRadius:o.rx?2:0, opacity:Math.min(o.opacity??1,1) }}/>
                      ))}
                    </div>
                    <div style={{ padding:'5px 9px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${C.border}` }}>
                      <span style={{ ...UI, fontSize:10, fontWeight:600, color:C.textMd }}>{l.label}</span>
                      <span style={{ fontSize:8, color:C.textSm, background:C.bg, padding:'1px 5px', borderRadius:6 }}>{l.cat}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ──────────────────────────────────────────────────── */}
      {showShare && <ShareModal documentId={params.id} links={shareLinks} onClose={()=>setShowShare(false)} onRefresh={loadShareLinks} isActive={isActive} onPublish={publishDocument}/>}

      {/* ── AI DRAFTER ───────────────────────────────────────────────────── */}
      {showDrafter && (
        <AIDrafter documentType={doc?.type??'document'}
          onDraftComplete={(html:string)=>{
            const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
            const stripped=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
            const newPage=pg('#ffffff',[tx(stripped,{l:60,t:60,w:cWRef.current-120,fs:16,ff:'Inter',fill:'#18181B',lh:1.5})])
            const upd=[...pagesRef.current,newPage];pagesRef.current=upd;setPages(upd)
            const ni=upd.length-1;setCurrentPage(ni);currentPageRef.current=ni
            waitForFabricThenLoad(newPage,cWRef.current,cHRef.current)
            scheduleAutoSave()
          }}
          onClose={()=>setShowDrafter(false)}/>
      )}

      <style>{`.pt:hover .pact{opacity:1!important}`}</style>
    </div>
  )
}
