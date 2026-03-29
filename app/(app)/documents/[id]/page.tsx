'use client'
/* ═══════════════════════════════════════════════════════════════════════════════
   FOLIO EDITOR — Complete rewrite addressing all 20 issues
   ═══════════════════════════════════════════════════════════════════════════════ */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { buildShareUrl, generateToken } from '@/lib/utils'
import AIDrafter from '@/components/editor/AIDrafter'
import SignModal from '@/components/editor/SignModal'
import ExportModal, { ExportOptions } from '@/components/editor/ExportModal'
import ChartBuilder from '@/components/editor/ChartBuilder'
import BrandKit from '@/components/editor/BrandKit'
import { LAYOUTS, LAYOUT_CATS } from '@/lib/layouts'
import { ICON_LIB, ICON_CATS } from '@/lib/icons'
import { FONTS, FONT_CATS, preloadFont } from '@/lib/fonts'
import type { Database } from '@/lib/supabase/client'

type Doc = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:'#E8E4DF', desk:'#D4CFC9', panel:'#FFFFFF', panelSub:'#F7F6F4',
  hover:'#F0EEEC', border:'#E4E0DB', borderSt:'#C8C3BC',
  accent:'#5B50E8', accentHv:'#4940D4', accentLt:'#EEEDFB', accentMd:'#BDB9F4',
  text:'#0F0F0F', textSd:'#2A2A2A', textMd:'#6B6868', textSm:'#9B9898',
  green:'#16A34A', red:'#DC2626', amber:'#D97706', blue:'#2563EB',
  shadow:'0 1px 3px rgba(0,0,0,.08)',
  shadowMd:'0 4px 16px rgba(0,0,0,.1)',
  shadowLg:'0 12px 40px rgba(0,0,0,.14)',
}
const F  = "'Inter',-apple-system,BlinkMacSystemFont,sans-serif"
const FM = "'JetBrains Mono','Fira Code',monospace"

// ─── Document types ────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { id:'pitch_deck',      label:'Pitch Deck',     icon:'🚀', size:'pres-169', sign:false },
  { id:'sales_proposal',  label:'Sales Proposal', icon:'💼', size:'a4-p',    sign:true  },
  { id:'business_report', label:'Report',         icon:'📊', size:'a4-p',    sign:true  },
  { id:'one_pager',       label:'One-Pager',      icon:'📄', size:'a4-p',    sign:true  },
  { id:'social_post',     label:'Social Post',    icon:'📱', size:'sq-1080', sign:false },
  { id:'presentation',    label:'Presentation',   icon:'🖥',  size:'pres-169',sign:false },
  { id:'media_kit',       label:'Media Kit',      icon:'🎨', size:'pres-169',sign:false },
  { id:'contract',        label:'Contract',       icon:'✍',  size:'a4-p',    sign:true  },
]

// ─── Canvas sizes — comprehensive ─────────────────────────────────────────────
const SIZES = [
  // Presentation
  { id:'pres-169',  label:'Presentation 16:9',  w:1280,  h:720,   cat:'Presentation' },
  { id:'pres-43',   label:'Presentation 4:3',   w:1024,  h:768,   cat:'Presentation' },
  { id:'pres-hd',   label:'Full HD 16:9',       w:1920,  h:1080,  cat:'Presentation' },
  // Document
  { id:'a4-p',      label:'A4 Portrait',        w:794,   h:1123,  cat:'Document' },
  { id:'a4-l',      label:'A4 Landscape',       w:1123,  h:794,   cat:'Document' },
  { id:'a3-p',      label:'A3 Portrait',        w:1123,  h:1587,  cat:'Document' },
  { id:'letter-p',  label:'US Letter Portrait', w:816,   h:1056,  cat:'Document' },
  { id:'legal-p',   label:'US Legal Portrait',  w:816,   h:1344,  cat:'Document' },
  // Social
  { id:'sq-1080',   label:'Square 1:1',         w:1080,  h:1080,  cat:'Social' },
  { id:'ig-port',   label:'Instagram Portrait', w:1080,  h:1350,  cat:'Social' },
  { id:'story',     label:'Story / Reel 9:16',  w:1080,  h:1920,  cat:'Social' },
  { id:'story-sm',  label:'Story Compact',      w:540,   h:960,   cat:'Social' },
  { id:'fb-post',   label:'Facebook Post',      w:1200,  h:630,   cat:'Social' },
  { id:'fb-cover',  label:'Facebook Cover',     w:1640,  h:624,   cat:'Social' },
  { id:'li-post',   label:'LinkedIn Post',      w:1200,  h:627,   cat:'Social' },
  { id:'li-banner', label:'LinkedIn Banner',    w:1584,  h:396,   cat:'Social' },
  { id:'tw-post',   label:'X / Twitter Post',   w:1024,  h:512,   cat:'Social' },
  { id:'tw-header', label:'X / Twitter Header', w:1500,  h:500,   cat:'Social' },
  { id:'yt-thumb',  label:'YouTube Thumbnail',  w:1280,  h:720,   cat:'Social' },
  { id:'yt-banner', label:'YouTube Channel Art',w:2560,  h:1440,  cat:'Social' },
  { id:'pin',       label:'Pinterest Pin',      w:735,   h:1102,  cat:'Social' },
  { id:'tiktok',    label:'TikTok Video',       w:1080,  h:1920,  cat:'Social' },
  // Print
  { id:'biz-card',  label:'Business Card',      w:1050,  h:600,   cat:'Print' },
  { id:'flyer-a5',  label:'Flyer A5',           w:559,   h:794,   cat:'Print' },
  { id:'poster-a2', label:'Poster A2',          w:1587,  h:2245,  cat:'Print' },
  { id:'banner-lg', label:'Large Banner',       w:2880,  h:1080,  cat:'Print' },
]

// ─── Canvas helpers ────────────────────────────────────────────────────────────
const sc = (b: number, W: number) => Math.max(Math.round(b*(W/1280)), Math.round(b*0.4))
const pg = (bg='#ffffff', objects: any[]=[]) => ({ version:'5.3.0', objects, background:bg })
const tx = (text: string, o: any={}): any => ({
  type:'textbox', left:o.l??60, top:o.t??60, width:o.w??400, text,
  fontSize:o.fs??16, fontFamily:o.ff??'Inter', fill:o.fill??'#0F0F0F',
  fontWeight:o.fw??'400', lineHeight:o.lh??1.35, textAlign:o.ta??'left',
  opacity:1, selectable:true, editable:true, charSpacing:o.cs??0,
})
const bx = (o: any={}): any => ({
  type:'rect', left:o.l??0, top:o.t??0, width:o.w??200, height:o.h??60,
  fill:o.fill??'#5B50E8', rx:o.rx??0, ry:o.rx??0, selectable:true, opacity:o.op??1,
})

// ─── Icon component ────────────────────────────────────────────────────────────
function SvgIco({ d, size=16, color=C.textMd, w=1.7 }: { d:string; size?:number; color?:string; w?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  )
}

// Material-style icon paths for toolbar
const TOOL_ICONS: Record<string, string> = {
  // Uses Google Material Design inspired paths
  select:  'M4 2l16 9-7 2-3 7z',
  text:    'M4 7h16M9 7v14M15 7v14M7 21h5M12 21h5',
  draw:    'M17 3a2.83 2.83 0 014 4L7.5 20.5 2 22l1.5-5.5z',
  line:    'M5 19L19 5',
  erase:   'M20 20H7L3 16l10-10 7 7-3.5 3.5M6.5 17.5l9-9',
  shape:   'M12 3l9 18H3L12 3z',
  image:   'M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4l2 3h9a2 2 0 012 2z',
  chart:   'M18 20V10M12 20V4M6 20v-6',
  table:   'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
  undo:    'M3 7v6h6M3 13C5.2 8.2 10 5 15.5 5A9.5 9.5 0 0121 21',  // Google Undo style
  redo:    'M21 7v6h-6M21 13C18.8 8.2 14 5 8.5 5A9.5 9.5 0 003 21',
  bold:    'M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z',
  italic:  'M19 4h-9M14 20H5M15 4L9 20',
  underline:'M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16',
  strike:  'M16 4H9a3 3 0 00-2.83 4M14 12a4 4 0 010 8H6M4 12h16',
  alignL:  'M21 10H3M21 6H3M21 14H3M14 18H3',
  alignC:  'M21 10H3M21 6H3M21 14H3M17 18H7',
  alignR:  'M21 10H3M21 6H3M21 14H3M21 18H11',
  alignJ:  'M21 10H3M21 6H3M21 14H3M21 18H3',
  layers:  'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  up:      'M3 17l9-9 9 9',
  down:    'M3 7l9 9 9-9',
  lock:    'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  copy:    'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2',
  trash:   'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  flip:    'M7 21H3V3h4m10 18h4V3h-4M12 3v18',
  crop:    'M6 2v14h14M2 6h14',
  opacity: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  shadow:  'M6 18L18 6M4 8l12 12M8 4L20 16',
  plus:    'M12 5v14M5 12h14',
  minus:   'M5 12h14',
  chevD:   'M6 9l6 6 6-6',
  chevL:   'M15 18l-6-6 6-6',
  chevR:   'M9 18l6-6-6-6',
  close:   'M18 6L6 18M6 6l12 12',
  check:   'M20 6L9 17l-5-5',
  eye:     'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11-3a3 3 0 100 6 3 3 0 000-6z',
  eyeOff:  'M17.94 17.94A10 10 0 0112 20C5 20 1 12 1 12a18.1 18.1 0 015.06-5.94M9.9 4.24A9.1 9.1 0 0112 4c7 0 11 8 11 8a18.3 18.3 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22',
  download:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  share:   'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  sign:    'M15.232 5.232l3.536 3.536M9 11l6.464-6.464a2 2 0 012.829 2.829L11.828 13.83a4 4 0 01-1.414.943l-3.536 1.179z',
  zoomIn:  'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM11 8v6M8 11h6',
  zoomOut: 'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM8 11h6',
  grid:    'M10 3H3v7h7V3zM21 3h-7v7h7V3zM21 14h-7v7h7v-7zM10 14H3v7h7v-7z',
  layout:  'M12 3H3v7h9V3zM21 3h-7v7h7V3zM21 13h-7v8h7v-8zM12 13H3v8h9v-8z',
  brand:   'M12 2l9 4v14H3V6l9-4z M9 22V12h6v10',
  star:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
  upload:  'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  link:    'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  settings:'M12 15a3 3 0 100-6 3 3 0 000 6z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  sparkle: 'M12 2l2.4 7.4H22l-6.4 4.6L18 21l-6-4.3L6 21l2.4-7-6.4-4.6H9.6z',
  type:    'M4 6h16M4 12h10M4 18h6',
  media:   'M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
}

function TIcon({ k, size=15, color=C.textMd, w=1.7 }: { k:keyof typeof TOOL_ICONS; size?:number; color?:string; w?:number }) {
  return <SvgIco d={TOOL_ICONS[k]} size={size} color={color} w={w}/>
}

// ─── IBtn ─────────────────────────────────────────────────────────────────────
function IBtn({ ico, label, active=false, onClick, danger=false }: { ico:keyof typeof TOOL_ICONS; label:string; active?:boolean; onClick:()=>void; danger?:boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button title={label} onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:32, height:30, border:'none', cursor:'pointer', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .12s', flexShrink:0, outline:'none',
        background: active ? C.accentLt : danger && hov ? '#FEF2F2' : hov ? C.hover : 'transparent',
      }}>
      <TIcon k={ico} size={14} color={active?C.accent:danger?C.red:hov?C.text:C.textMd}/>
    </button>
  )
}

// ─── Reusable form controls ────────────────────────────────────────────────────
function RangeInput({ label, value, min, max, onChange }: { label:string; value:number; min:number; max:number; onChange:(v:number)=>void }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, fontWeight:600, color:C.textMd, fontFamily:F }}>{label}</span>
        <span style={{ fontSize:11, color:C.textSm, fontFamily:FM }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:C.accent, cursor:'pointer', height:4 }}/>
    </div>
  )
}

function NumInput({ label, value, onChange, min, max }: { label:string; value:number; onChange:(v:number)=>void; min?:number; max?:number }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:C.textMd, marginBottom:4, fontFamily:F }}>{label}</div>
      <input type="number" value={value} min={min} max={max} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{ width:'100%', padding:'5px 8px', border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FM, color:C.text, background:'#fff', outline:'none' }}
        onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
    </div>
  )
}

// Color swatch palette
const SWATCHES = [
  '#000000','#1E293B','#374151','#6B7280','#9CA3AF','#E5E7EB','#F9FAFB','#FFFFFF',
  '#7F1D1D','#DC2626','#F97316','#F59E0B','#EAB308','#84CC16','#22C55E','#10B981',
  '#06B6D4','#3B82F6','#6366F1','#8B5CF6','#A855F7','#EC4899','#F43F5E','#14B8A6',
  '#5B50E8','#4F46E5','#7C3AED','#9333EA','#0EA5E9','#0284C7','#059669','#CA8A04',
]

function ColorPicker({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  const [open, setOpen] = useState(false)
  const [hex, setHex]   = useState(value.replace('#',''))
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => setHex(value.replace('#','')), [value])
  useEffect(() => {
    const h = (e: MouseEvent) => { if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  function commit(v: string) { const c=v.replace(/[^0-9a-fA-F]/g,'').slice(0,6); setHex(c); if(c.length===6)onChange('#'+c) }
  return (
    <div ref={ref} style={{ position:'relative' }}>
      {label && <div style={{ fontSize:11, fontWeight:600, color:C.textMd, marginBottom:5, fontFamily:F }}>{label}</div>}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <button onClick={()=>setOpen(!open)} style={{ width:34,height:34,borderRadius:8,border:`2px solid ${C.border}`,background:value,cursor:'pointer',flexShrink:0,boxShadow:C.shadow }}/>
        <div style={{ display:'flex', alignItems:'center', flex:1, border:`1.5px solid ${C.border}`, borderRadius:7, overflow:'hidden', background:'#fff' }}>
          <span style={{ padding:'0 6px', color:C.textSm, fontSize:12, fontFamily:FM }}>#</span>
          <input value={hex.toUpperCase()} onChange={e=>commit(e.target.value)} style={{ border:'none', outline:'none', width:'100%', fontSize:12, fontFamily:FM, padding:'6px 6px 6px 0', color:C.text, background:'transparent' }}/>
        </div>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:500, marginTop:6, background:'#fff', borderRadius:12, boxShadow:C.shadowLg, padding:12, border:`1px solid ${C.border}`, width:240 }}>
          <input type="color" value={value} onChange={e=>{onChange(e.target.value);setHex(e.target.value.replace('#',''))}}
            style={{ width:'100%', height:120, border:'none', borderRadius:8, cursor:'pointer', marginBottom:10, display:'block' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4 }}>
            {SWATCHES.map(sw=>(
              <button key={sw} onClick={()=>{onChange(sw);setHex(sw.replace('#',''));setOpen(false)}}
                style={{ width:20,height:20,borderRadius:4,background:sw,border:`1.5px solid ${value.toLowerCase()===sw.toLowerCase()?C.accent:sw==='#FFFFFF'?C.border:'transparent'}`,cursor:'pointer',padding:0 }}/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Section
function Sec({ label, children, open=true }: { label:string; children:React.ReactNode; open?:boolean }) {
  const [o, setO] = useState(open)
  return (
    <div style={{ borderBottom:`1px solid ${C.border}` }}>
      <button onClick={()=>setO(!o)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', border:'none', background:'none', cursor:'pointer', padding:'9px 14px 7px' }}>
        <span style={{ fontSize:10, fontWeight:700, color:C.textMd, textTransform:'uppercase', letterSpacing:'.09em', fontFamily:F }}>{label}</span>
        <TIcon k="chevD" size={11} color={C.textSm}/>
      </button>
      {o && <div style={{ padding:'0 14px 12px' }}>{children}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEFT SIDEBAR CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const SIDEBAR_TABS = [
  { id:'templates', label:'Templates', ico:'layout' as const },
  { id:'elements',  label:'Elements',  ico:'star' as const },
  { id:'text',      label:'Text',      ico:'type' as const },
  { id:'media',     label:'Media',     ico:'media' as const },
  { id:'icons',     label:'Icons',     ico:'sparkle' as const },
  { id:'brand',     label:'Brand',     ico:'brand' as const },
  { id:'layers',    label:'Layers',    ico:'layers' as const },
] as const
type SideTab = typeof SIDEBAR_TABS[number]['id']

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EDITOR
// ═══════════════════════════════════════════════════════════════════════════════
export default function EditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  // Doc state
  const [doc, setDoc]     = useState<Doc|null>(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date|null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])

  // Modals
  const [showShare, setShowShare]           = useState(false)
  const [showDrafter, setShowDrafter]       = useState(false)
  const [showExport, setShowExport]         = useState(false)
  const [showSign, setShowSign]             = useState(false)
  const [showChart, setShowChart]           = useState(false)
  const [showTypeModal, setShowTypeModal]   = useState(false)
  const [isFirstOpen, setIsFirstOpen]       = useState(false)
  const [isExporting, setIsExporting]       = useState(false)

  // Sidebar
  const [sideTab, setSideTab]   = useState<SideTab>('templates')
  const [sideOpen, setSideOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  // Canvas
  const canvasEl    = useRef<HTMLCanvasElement>(null)
  const fabricRef   = useRef<any>(null)
  const fabricLib   = useRef<any>(null)
  const fabricReady = useRef(false)

  // Pages
  const [pages, setPages]         = useState<any[]>([])
  const [curPage, setCurPage]     = useState(0)
  const [thumbs, setThumbs]       = useState<Record<number,string>>({})

  // Template system
  const [layoutCat, setLayoutCat]   = useState('All')
  const [templateSearch, setTplSearch] = useState('')

  // Canvas dimensions
  const [canvasW, setCanvasW] = useState(1280)
  const [canvasH, setCanvasH] = useState(720)
  const [zoom, setZoom]       = useState(0.58)
  const [docType, setDocType] = useState('pitch_deck')

  // Tools
  const [activeTool, setActiveTool] = useState('select')
  const [brushSize, setBrushSize]   = useState(4)
  const [brushColor, setBrushColor] = useState('#0F0F0F')
  const [selectedObj, setSelectedObj] = useState<any>(null)

  // Style state
  const [fillColor, setFillColor]   = useState('#5B50E8')
  const [fontColor, setFontColor]   = useState('#0F0F0F')
  const [fontSize, setFontSize]     = useState(20)
  const [fontFamily, setFontFamily] = useState('Inter')
  const [bgColor, setBgColor]       = useState('#ffffff')

  // Font picker
  const [fontSearch, setFontSearch] = useState('')
  const [fontCat, setFontCat]       = useState('All')
  const [showFontPicker, setShowFontPicker] = useState(false)

  // Icons
  const [iconSearch, setIconSearch] = useState('')
  const [iconCat, setIconCat]       = useState('All')

  // Media
  const [photos, setPhotos]         = useState<any[]>([])
  const [photoSearch, setPhotoSearch] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoPage, setPhotoPage]   = useState(1)
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([])

  // Image filters
  const [imgBright, setImgBright] = useState(0)
  const [imgContrast, setImgContrast] = useState(0)
  const [imgSat, setImgSat] = useState(0)
  const [imgBlur, setImgBlur] = useState(0)

  // Refs
  const histStack = useRef<any[]>([])
  const histIdx   = useRef(-1)
  const isUR      = useRef(false)
  const saveTimer = useRef<NodeJS.Timeout|null>(null)
  const pagesRef  = useRef<any[]>([])
  const cpRef     = useRef(0)
  const cWRef     = useRef(1280)
  const cHRef     = useRef(720)
  const zRef      = useRef(0.58)

  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => { cpRef.current = curPage }, [curPage])
  useEffect(() => { cWRef.current = canvasW }, [canvasW])
  useEffect(() => { cHRef.current = canvasH }, [canvasH])
  useEffect(() => { zRef.current = zoom }, [zoom])

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadFabricLib()
    loadDoc()
    loadLinks()
    preloadCriticalFonts()
    loadPhotos('business')
  }, [params.id]) // eslint-disable-line

  function preloadCriticalFonts() {
    const critical = ['Inter','Jost','Plus Jakarta Sans','Playfair Display','Bebas Neue','Dancing Script','JetBrains Mono']
    const params2 = critical.map(f=>`family=${f.replace(/ /g,'+')}:wght@400;600;700;800`).join('&')
    const l = document.createElement('link'); l.rel='stylesheet'
    l.href = `https://fonts.googleapis.com/css2?${params2}&display=swap`
    document.head.appendChild(l)
  }

  async function loadFabricLib() {
    if ((window as any).fabric) { initFabric(); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
    s.onload = () => initFabric()
    document.head.appendChild(s)
  }

  async function loadDoc() {
    const { data } = await supabase.from('documents').select('*').eq('id', params.id).single()
    if (!data) { router.push('/dashboard'); return }
    setDoc(data); setTitle(data.title)
    const cd = (data as any).canvas_data
    if (cd?.pages?.length) {
      setPages(cd.pages); pagesRef.current = cd.pages
      const W = cd.canvasW||1280, H = cd.canvasH||720
      setCanvasW(W); cWRef.current = W; setCanvasH(H); cHRef.current = H
      if (cd.docType) setDocType(cd.docType)
      loadIntoFabric(cd.pages[0], W, H)
    } else {
      setIsFirstOpen(true); setShowTypeModal(true)
    }
  }

  async function loadLinks() {
    const { data } = await supabase.from('share_links').select('*').eq('document_id', params.id).order('created_at', { ascending:false })
    setShareLinks(data ?? [])
  }

  // ── Semantic photo search (LoremFlickr supports real keywords) ──────────────
  async function loadPhotos(query = 'business', page = 1) {
    setPhotoLoading(true)
    try {
      // LoremFlickr: supports real semantic keywords from Flickr's database
      const kw = encodeURIComponent(query.trim().replace(/\s+/g, ','))
      const results = Array.from({ length: 24 }, (_, i) => {
        const seed = page * 24 + i + 1
        return {
          id: `lf-${kw}-${seed}`,
          url: `https://loremflickr.com/1200/800/${kw}?lock=${seed}`,
          thumb: `https://loremflickr.com/400/270/${kw}?lock=${seed}`,
          author: 'LoremFlickr',
          keyword: query,
        }
      })
      setPhotos(page > 1 ? prev => [...prev, ...results] : results)
    } catch {
      // Picsum fallback
      try {
        const res = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=24`)
        const data = await res.json()
        setPhotos(data.map((p: any) => ({ id:p.id, url:`https://picsum.photos/id/${p.id}/1200/800`, thumb:`https://picsum.photos/id/${p.id}/400/270`, author:p.author })))
      } catch {}
    }
    setPhotoLoading(false)
  }

  // ── Fabric: HiDPI sharp canvas ───────────────────────────────────────────────
  function initFabric() {
    if (fabricReady.current || !canvasEl.current) return
    if (!(window as any).fabric) { setTimeout(initFabric, 80); return }
    const fab = (window as any).fabric
    fabricLib.current = fab

    const W = cWRef.current, H = cHRef.current, z = zRef.current
    const dpr = window.devicePixelRatio || 1

    // Create canvas with explicit DPR handling for sharpness
    const fc = new fab.Canvas(canvasEl.current, {
      width: Math.round(W*z),
      height: Math.round(H*z),
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
    })
    fc.setZoom(z)

    // Ensure physical pixel accuracy
    const upper = fc.upperCanvasEl as HTMLCanvasElement
    const lower = fc.lowerCanvasEl as HTMLCanvasElement
    ;[upper, lower].forEach(c => {
      if (c) { c.style.imageRendering = 'pixelated' }
    })

    fabricRef.current = fc
    ;(window as any).__fc = fc
    fabricReady.current = true

    // Alignment snap guides
    let vGuide: any = null, hGuide: any = null
    fc.on('object:moving', (e: any) => {
      if(vGuide){fc.remove(vGuide);vGuide=null}
      if(hGuide){fc.remove(hGuide);hGuide=null}
      const o=e.target, W=cWRef.current, H=cHRef.current
      const cx=o.left+(o.getScaledWidth())/2
      const cy=o.top+(o.getScaledHeight())/2
      if(Math.abs(cx-W/2)<8){
        o.set('left', W/2-o.getScaledWidth()/2)
        vGuide=new fab.Line([W/2,0,W/2,H],{stroke:'#FF4444',strokeWidth:.8,strokeDashArray:[5,4],selectable:false,evented:false,opacity:.7})
        fc.add(vGuide)
      }
      if(Math.abs(cy-H/2)<8){
        o.set('top', H/2-o.getScaledHeight()/2)
        hGuide=new fab.Line([0,H/2,W,H/2],{stroke:'#FF4444',strokeWidth:.8,strokeDashArray:[5,4],selectable:false,evented:false,opacity:.7})
        fc.add(hGuide)
      }
    })
    fc.on('object:moved', () => { if(vGuide){fc.remove(vGuide);vGuide=null}; if(hGuide){fc.remove(hGuide);hGuide=null}; fc.renderAll(); scheduleSave() })
    fc.on('object:modified', () => { scheduleSave(); captureThumb(cpRef.current) })
    fc.on('selection:created', (e: any) => syncSel(e.selected?.[0]))
    fc.on('selection:updated', (e: any) => syncSel(e.selected?.[0]))
    fc.on('selection:cleared', () => setSelectedObj(null))
    fc.on('text:changed', () => scheduleSave())
    fc.on('path:created', () => { pushHist(); scheduleSave() })
  }

  function applyZoom(z: number) {
    const fc = fabricRef.current; if(!fc) return
    fc.setWidth(Math.round(cWRef.current*z))
    fc.setHeight(Math.round(cHRef.current*z))
    fc.setZoom(z); fc.renderAll()
  }

  // ── History ──────────────────────────────────────────────────────────────────
  function pushHist() {
    if (isUR.current || !fabricRef.current) return
    const s = fabricRef.current.toJSON(['selectable','editable','evented','__type'])
    histStack.current = histStack.current.slice(0, histIdx.current+1)
    if (histStack.current.length >= 80) histStack.current.shift()
    histStack.current.push(s); histIdx.current = histStack.current.length-1
  }
  function undo() {
    if (histIdx.current <= 0) return
    isUR.current = true; histIdx.current--
    fabricRef.current?.loadFromJSON(histStack.current[histIdx.current], () => {
      fabricRef.current.renderAll(); isUR.current = false
    })
  }
  function redo() {
    if (histIdx.current >= histStack.current.length-1) return
    isUR.current = true; histIdx.current++
    fabricRef.current?.loadFromJSON(histStack.current[histIdx.current], () => {
      fabricRef.current.renderAll(); isUR.current = false
    })
  }

  function loadIntoFabric(json: any, W: number, H: number, z = zRef.current) {
    const go = () => {
      if (fabricRef.current) {
        fabricRef.current.setWidth(Math.round(W*z))
        fabricRef.current.setHeight(Math.round(H*z))
        fabricRef.current.setZoom(z)
        fabricRef.current.loadFromJSON(json, () => {
          fabricRef.current.renderAll(); pushHist()
        })
      } else { setTimeout(go, 80) }
    }
    go()
  }

  function syncSel(obj: any) {
    if (!obj) return
    setSelectedObj(obj)
    if (obj.fontSize) setFontSize(obj.fontSize)
    if (obj.fontFamily) setFontFamily(obj.fontFamily)
    if (typeof obj.fill === 'string') {
      if (obj.type==='textbox'||obj.type==='text'||obj.type==='i-text') setFontColor(obj.fill)
      else setFillColor(obj.fill)
    }
    if (obj.type === 'image') {
      setImgBright(0); setImgContrast(0); setImgSat(0); setImgBlur(0)
    }
  }

  function captureThumb(idx: number) {
    try {
      const url = fabricRef.current?.toDataURL({ format:'jpeg', quality:.25, multiplier:.1 })
      if (url) setThumbs(p => ({...p, [idx]:url}))
    } catch {}
  }

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveCanvas(), 2000)
  }

  const saveCanvas = useCallback(async () => {
    if (!fabricRef.current) return
    setSaving(true)
    const cur = fabricRef.current.toJSON(['selectable','editable','evented','__type'])
    const all = [...pagesRef.current]; all[cpRef.current] = cur
    pagesRef.current = all; setPages([...all])
    await supabase.from('documents').update({
      canvas_data: { pages:all, canvasW:cWRef.current, canvasH:cHRef.current, docType },
      updated_at: new Date().toISOString(),
    } as any).eq('id', params.id)
    setSaving(false); setLastSaved(new Date()); captureThumb(cpRef.current)
  }, [params.id, docType])

  async function saveTitle() {
    await supabase.from('documents').update({ title: title||'Untitled' }).eq('id', params.id)
  }

  async function publish() {
    await supabase.from('documents').update({ status:'active' }).eq('id', params.id)
    setDoc(p => p ? {...p, status:'active'} : p)
    setShowShare(true)
  }

  // ── Doc type selection ───────────────────────────────────────────────────────
  function selectDocType(typeId: string) {
    const t = DOC_TYPES.find(d => d.id===typeId); if(!t) return
    const sz = SIZES.find(s => s.id===t.size) || SIZES[0]
    setDocType(typeId); setCanvasW(sz.w); setCanvasH(sz.h)
    cWRef.current=sz.w; cHRef.current=sz.h
    const layout = LAYOUTS.find(l => l.cat==='Hero') || LAYOUTS[0]
    const built = layout.build(sz.w, sz.h)
    pagesRef.current=[built]; setPages([built]); setCurPage(0); cpRef.current=0; setThumbs({})
    setShowTypeModal(false); setIsFirstOpen(false)
    loadIntoFabric(built, sz.w, sz.h)
    histStack.current=[]; histIdx.current=-1
  }

  // ── Pages ────────────────────────────────────────────────────────────────────
  function switchPage(idx: number) {
    if (!fabricRef.current) return
    const upd = [...pagesRef.current]; upd[cpRef.current] = fabricRef.current.toJSON(['selectable','editable','evented','__type'])
    pagesRef.current = upd; setPages([...upd]); setCurPage(idx); cpRef.current = idx
    loadIntoFabric(upd[idx], cWRef.current, cHRef.current)
    histStack.current=[]; histIdx.current=-1
  }

  function addPage() {
    if (!fabricRef.current) return
    const upd = [...pagesRef.current]; upd[cpRef.current] = fabricRef.current.toJSON(['selectable','editable','evented','__type'])
    const blank = pg(bgColor); const ni = upd.length
    upd.push(blank); pagesRef.current = upd; setPages([...upd]); setCurPage(ni); cpRef.current = ni
    loadIntoFabric(blank, cWRef.current, cHRef.current)
    histStack.current=[]; histIdx.current=-1
  }

  function dupPage(idx: number) {
    const upd = [...pagesRef.current]
    if (fabricRef.current && idx === cpRef.current) upd[idx] = fabricRef.current.toJSON(['selectable','editable','evented','__type'])
    upd.splice(idx+1, 0, JSON.parse(JSON.stringify(upd[idx])))
    pagesRef.current = upd; setPages([...upd]); switchPage(idx+1)
  }

  function delPage(idx: number) {
    if (pagesRef.current.length <= 1) return
    const upd = pagesRef.current.filter((_: any, i: number) => i!==idx)
    pagesRef.current = upd; setPages([...upd])
    const ni = Math.min(cpRef.current, upd.length-1); setCurPage(ni); cpRef.current = ni
    loadIntoFabric(upd[ni], cWRef.current, cHRef.current)
  }

  function applyLayout(l: any) {
    if (!fabricRef.current) return
    const built = l.build(cWRef.current, cHRef.current)
    fabricRef.current.loadFromJSON(built, () => { fabricRef.current.renderAll(); pushHist(); scheduleSave() })
  }

  function changeSize(sizeId: string) {
    const sz = SIZES.find(s => s.id===sizeId); if(!sz) return
    setCanvasW(sz.w); setCanvasH(sz.h); cWRef.current=sz.w; cHRef.current=sz.h
    applyZoom(zRef.current)
  }

  // ── Tools ────────────────────────────────────────────────────────────────────
  function setTool(t: string) {
    setActiveTool(t)
    const fc = fabricRef.current; if(!fc) return
    const fab = fabricLib.current||(window as any).fabric

    // Clean up line tool handlers
    if ((fc as any).__lineHandlers) {
      const h = (fc as any).__lineHandlers
      fc.off('mouse:down', h.d); fc.off('mouse:move', h.m); fc.off('mouse:up', h.u)
      ;(fc as any).__lineHandlers = null
    }
    fc.isDrawingMode = false

    if (t === 'draw') {
      fc.isDrawingMode = true
      if (fc.freeDrawingBrush) { fc.freeDrawingBrush.color = brushColor; fc.freeDrawingBrush.width = brushSize }
    }
    if (t === 'erase') {
      fc.isDrawingMode = true
      if (fc.freeDrawingBrush) { fc.freeDrawingBrush.color = bgColor; fc.freeDrawingBrush.width = brushSize * 4 }
    }
    if (t === 'line') {
      if (!fab) return
      let down = false, line: any = null, ox = 0, oy = 0
      const d = (o: any) => {
        down = true; const p = fc.getPointer(o.e); ox=p.x; oy=p.y
        line = new fab.Line([ox,oy,ox,oy], { stroke:fillColor, strokeWidth:2, selectable:true })
        fc.add(line)
      }
      const m = (o: any) => {
        if (!down||!line) return; const p=fc.getPointer(o.e)
        const dx=p.x-ox, dy=p.y-oy
        if (o.e.shiftKey) {
          const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4)
          const len=Math.sqrt(dx*dx+dy*dy)
          line.set({x2:ox+len*Math.cos(a),y2:oy+len*Math.sin(a)})
        } else { line.set({x2:p.x,y2:p.y}) }
        fc.renderAll()
      }
      const u = () => { down=false; line=null; pushHist(); setActiveTool('select') }
      fc.on('mouse:down',d); fc.on('mouse:move',m); fc.on('mouse:up',u)
      ;(fc as any).__lineHandlers = { d, m, u }
    }
    if (t === 'text') {
      if (!fab) return
      const tb = new fab.Textbox('Click to edit', { left:100,top:100,width:380,fontSize:24,fontFamily,fill:fontColor,fontWeight:'400',editable:true,lineHeight:1.35 })
      fc.add(tb); fc.setActiveObject(tb); fc.renderAll(); pushHist(); setActiveTool('select')
    }
  }

  // ── Font loading with document.fonts.ready wait ────────────────────────────
  async function applyFont(family: string) {
    preloadFont(family)
    setFontFamily(family); setShowFontPicker(false)
    const fc = fabricRef.current; if(!fc) return
    const obj = fc.getActiveObject(); if(!obj) return
    obj.set('fontFamily', family); fc.requestRenderAll()
    try { await document.fonts.ready; obj.set('fontFamily', family); fc.requestRenderAll() } catch {}
    scheduleSave()
  }

  // ── Property updater ─────────────────────────────────────────────────────────
  function upd(prop: string, val: any) {
    const fc = fabricRef.current; if(!fc) return
    const obj = fc.getActiveObject(); if(!obj) return
    obj.set(prop, val); fc.requestRenderAll(); scheduleSave()
  }

  // ── Image filters ────────────────────────────────────────────────────────────
  function applyFilters(b=imgBright, c=imgContrast, s=imgSat, bl=imgBlur) {
    const fab = fabricLib.current||(window as any).fabric
    const fc = fabricRef.current; if(!fab||!fc) return
    const obj = fc.getActiveObject(); if(!obj||obj.type!=='image') return
    const filters: any[] = []
    if (b!==0) filters.push(new fab.Image.filters.Brightness({brightness:b/100}))
    if (c!==0) filters.push(new fab.Image.filters.Contrast({contrast:c/100}))
    if (s!==0) filters.push(new fab.Image.filters.Saturation({saturation:s/100}))
    if (bl>0)  filters.push(new fab.Image.filters.Blur({blur:bl/100}))
    obj.filters = filters; obj.applyFilters(); fc.renderAll()
  }

  // ── Shapes ────────────────────────────────────────────────────────────────────
  function addShape(type: string, opts: any={}) {
    const fab = fabricLib.current||(window as any).fabric
    const fc = fabricRef.current; if(!fc||!fab) return
    const f = opts.fill||fillColor; let shape: any
    if (type==='rect')     shape = new fab.Rect({left:120,top:120,width:220,height:110,fill:f,rx:opts.rx||0})
    if (type==='circle')   shape = new fab.Circle({left:120,top:120,radius:70,fill:f})
    if (type==='triangle') shape = new fab.Triangle({left:120,top:120,width:140,height:120,fill:f})
    if (type==='line')     shape = new fab.Line([60,200,360,200],{stroke:f,strokeWidth:3})
    if (type==='star') {
      const pts: any[]=[], or=70,ir=30,cx=140,cy=140
      for(let i=0;i<10;i++){const r=i%2===0?or:ir,a=(i*Math.PI/5)-Math.PI/2;pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)})}
      shape = new fab.Polygon(pts,{fill:f,left:100,top:100})
    }
    if (type==='diamond') {
      shape = new fab.Polygon([{x:80,y:0},{x:160,y:80},{x:80,y:160},{x:0,y:80}],{fill:f,left:100,top:100})
    }
    if (type==='arrow') {
      shape = new fab.Path('M0 30L80 30L80 15L110 40L80 65L80 50L0 50Z',{fill:f,left:100,top:100})
    }
    if (shape) { fc.add(shape); fc.setActiveObject(shape); fc.renderAll(); pushHist() }
  }

  // ── Table — unified group ─────────────────────────────────────────────────────
  function addTable(rows=4, cols=3) {
    const fab = fabricLib.current||(window as any).fabric
    const fc = fabricRef.current; if(!fc||!fab) return
    const totalW = Math.round(cWRef.current * 0.6)
    const cw = Math.round(totalW / cols)
    const rh = 40
    const startX = Math.round(cWRef.current * 0.2)
    const startY = Math.round(cHRef.current * 0.25)

    const objs: any[] = []
    for (let i=0; i<rows; i++) {
      for (let j=0; j<cols; j++) {
        const x=j*cw, y=i*rh, isH=i===0, isAlt=!isH&&i%2===0
        objs.push(new fab.Rect({
          left:x, top:y, width:cw, height:rh,
          fill:isH?'#0F172A':isAlt?'#F8FAFC':'#FFFFFF',
          stroke:'#E2E8F0', strokeWidth:1, selectable:false, evented:false,
        }))
        objs.push(new fab.IText(isH?`Col ${j+1}`:i===1&&j===0?`Row ${i}`:`Cell`, {
          left:x+10, top:y+(rh-14)/2, width:cw-20,
          fontSize:isH?12:12, fontFamily:'Inter',
          fill:isH?'#FFFFFF':'#374151',
          fontWeight:isH?'700':'400',
          editable:true, selectable:true,
          lineHeight:1, lockMovementX:true, lockMovementY:true,
        }))
      }
    }
    // Create as group so it moves together
    const group = new fab.Group(objs, {
      left:startX, top:startY,
      selectable:true, subTargetCheck:true,
      __type:'table',
    })
    fc.add(group); fc.setActiveObject(group); fc.renderAll(); pushHist()
  }

  // ── Signature block ──────────────────────────────────────────────────────────
  function addSignatureBlock() {
    const fab = fabricLib.current||(window as any).fabric
    const fc = fabricRef.current; if(!fc||!fab) return
    const bW=Math.round(cWRef.current*.38), bH=Math.round(cHRef.current*.22)
    const bX=Math.round(cWRef.current*.31), bY=Math.round(cHRef.current*.65)
    const g = new fab.Group([
      new fab.Rect({left:0,top:0,width:bW,height:bH,fill:'#FAFAF8',stroke:'#D4CFC9',strokeWidth:1.5,rx:12,shadow:new fab.Shadow({color:'rgba(0,0,0,.06)',blur:16,offsetY:4})}),
      new fab.Textbox('Signature',{left:18,top:14,width:bW-36,fontSize:11,fontFamily:'Inter',fill:'#94A3B8',fontWeight:'600'}),
      new fab.Line([18,bH-68,bW-18,bH-68],{stroke:'#E2E8F0',strokeWidth:1.5}),
      new fab.Textbox('Full legal name',{left:18,top:bH-52,width:bW-36,fontSize:10,fontFamily:'Inter',fill:'#CBD5E1'}),
      new fab.Line([18,bH-26,bW-18,bH-26],{stroke:'#E2E8F0',strokeWidth:1.5}),
      new fab.Textbox('Date signed',{left:18,top:bH-14,width:120,fontSize:10,fontFamily:'Inter',fill:'#CBD5E1'}),
      new fab.Textbox('⬡ Verified by Folio',{left:bW/2,top:bH-15,width:bW/2-18,fontSize:9,fontFamily:'JetBrains Mono',fill:'#5B50E8',fontWeight:'600',textAlign:'right'}),
    ], { left:bX, top:bY, selectable:true, __type:'signatureBlock' })
    fc.add(g); fc.setActiveObject(g); fc.renderAll(); pushHist()
  }

  // ── Upload image ─────────────────────────────────────────────────────────────
  function uploadImage(file: File) {
    const fab = fabricLib.current||(window as any).fabric
    const fc = fabricRef.current; if(!fc||!fab) return
    const r = new FileReader()
    r.onload = e => {
      const dataUrl = e.target?.result as string
      setUploadedMedia(prev => {
        if (prev.find(f => f.name===file.name&&f.size===file.size)) return prev
        return [{ url:dataUrl, name:file.name, size:file.size }, ...prev.slice(0,19)]
      })
      fab.Image.fromURL(dataUrl, (img: any) => {
        const s = Math.min((cWRef.current*.65)/img.width,(cHRef.current*.65)/img.height,1)
        img.set({ left:Math.round(cWRef.current*.17), top:Math.round(cHRef.current*.17), scaleX:s, scaleY:s })
        fc.add(img); fc.setActiveObject(img); fc.renderAll(); pushHist()
      })
    }
    r.readAsDataURL(file)
  }

  function addStockPhoto(url: string) {
    const fab = fabricLib.current||(window as any).fabric
    const fc = fabricRef.current; if(!fc||!fab) return
    fab.Image.fromURL(url, (img: any) => {
      const s = Math.min(cWRef.current/img.width, cHRef.current/img.height, 1)
      img.set({ left:0, top:0, scaleX:s, scaleY:s, crossOrigin:'anonymous' })
      fc.add(img); fc.setActiveObject(img); fc.renderAll(); pushHist()
    }, { crossOrigin:'anonymous' })
  }

  // ── Object operations ─────────────────────────────────────────────────────────
  function delSel() { const fc=fabricRef.current; if(!fc) return; fc.getActiveObjects().forEach((o:any)=>fc.remove(o)); fc.discardActiveObject(); fc.renderAll(); setSelectedObj(null); pushHist() }
  function dupSel() { const fc=fabricRef.current; if(!fc) return; fc.getActiveObject()?.clone((c:any)=>{c.set({left:c.left+20,top:c.top+20});fc.add(c);fc.setActiveObject(c);fc.renderAll();pushHist()}) }
  function bringForward() { const fc=fabricRef.current; if(!fc||!selectedObj) return; fc.bringForward(selectedObj); fc.renderAll(); scheduleSave() }
  function sendBackward() { const fc=fabricRef.current; if(!fc||!selectedObj) return; fc.sendBackwards(selectedObj); fc.renderAll(); scheduleSave() }
  function bringToFront() { const fc=fabricRef.current; if(!fc||!selectedObj) return; fc.bringToFront(selectedObj); fc.renderAll(); scheduleSave() }
  function sendToBack() { const fc=fabricRef.current; if(!fc||!selectedObj) return; fc.sendToBack(selectedObj); fc.renderAll(); scheduleSave() }
  function lockObj() { if(!selectedObj) return; const locked=!selectedObj.lockMovementX; upd('lockMovementX',locked); upd('lockMovementY',locked); upd('lockRotation',locked); upd('lockScalingX',locked); upd('lockScalingY',locked) }
  function flipH() { if(!selectedObj) return; upd('flipX',!selectedObj.flipX) }
  function flipV() { if(!selectedObj) return; upd('flipY',!selectedObj.flipY) }
  function grpSel() { const fc=fabricRef.current; if(!fc||fc.getActiveObject()?.type!=='activeSelection') return; fc.getActiveObject().toGroup(); fc.renderAll(); pushHist() }
  function ungrpSel() { const fc=fabricRef.current; if(!fc||fc.getActiveObject()?.type!=='group') return; fc.getActiveObject().toActiveSelection(); fc.renderAll(); pushHist() }
  function alignObj(dir: string) {
    const fc=fabricRef.current; if(!fc||!selectedObj) return
    const W=cWRef.current, H=cHRef.current
    const ow=selectedObj.getScaledWidth(), oh=selectedObj.getScaledHeight()
    if(dir==='left')   upd('left',0)
    if(dir==='center') upd('left',W/2-ow/2)
    if(dir==='right')  upd('left',W-ow)
    if(dir==='top')    upd('top',0)
    if(dir==='middle') upd('top',H/2-oh/2)
    if(dir==='bottom') upd('top',H-oh)
    fc.renderAll()
  }

  // ── Export — full format support ──────────────────────────────────────────────
  async function handleExport(opts: ExportOptions) {
    setIsExporting(true)
    const fc = fabricRef.current; if(!fc) return
    const saved = [...pagesRef.current]; saved[cpRef.current] = fc.toJSON()
    const pagesToExport = opts.pages==='current' ? [saved[cpRef.current]] : saved
    const { format, quality, jpegQuality } = opts
    const mult = quality.mult
    const W = cWRef.current, H = cHRef.current

    try {
      if (format==='pdf-standard'||format==='pdf-print') {
        await exportPDF(pagesToExport, W, H, mult, jpegQuality, format==='pdf-print')
      } else if (format==='pptx') {
        await exportPPTX(pagesToExport, W, H)
      } else if (format==='docx') {
        await exportDOCX(pagesToExport, W, H)
      } else if (format==='svg') {
        exportSVG()
      } else {
        await exportImages(pagesToExport, W, H, mult, jpegQuality, format)
      }
    } catch(e) { console.error('Export error', e) }
    setIsExporting(false); setShowExport(false)
  }

  async function renderPageToDataUrl(json: any, W: number, H: number, mult: number, format: string, quality: number): Promise<string> {
    return new Promise(res => {
      const tmp = document.createElement('canvas')
      tmp.width = Math.round(W*mult); tmp.height = Math.round(H*mult)
      const tfc = new (window as any).fabric.StaticCanvas(tmp, { width:Math.round(W*mult), height:Math.round(H*mult), enableRetinaScaling:false })
      tfc.loadFromJSON(json, () => {
        tfc.setZoom(mult); tfc.renderAll()
        const imgFormat = format==='jpg'?'jpeg':format==='webp'?'webp':'png'
        res(tfc.toDataURL({ format:imgFormat, quality, multiplier:1 }))
        tfc.dispose()
      })
    })
  }

  async function exportPDF(pages: any[], W: number, H: number, mult: number, quality: number, print: boolean) {
    if (!(window as any).jspdf) {
      await new Promise<void>(res => {
        const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        s.onload=()=>res(); document.head.appendChild(s)
      })
    }
    const { jsPDF } = (window as any).jspdf
    const pdf = new jsPDF({ orientation:W>H?'landscape':'portrait', unit:'px', format:[W,H] })
    for (let i=0; i<pages.length; i++) {
      if (i>0) pdf.addPage()
      const dataUrl = await renderPageToDataUrl(pages[i], W, H, mult, 'jpg', print?0.98:quality)
      pdf.addImage(dataUrl, 'JPEG', 0, 0, W, H)
    }
    pdf.save(`${title||'document'}.pdf`)
  }

  async function exportImages(pages: any[], W: number, H: number, mult: number, quality: number, format: string) {
    for (let i=0; i<pages.length; i++) {
      const dataUrl = await renderPageToDataUrl(pages[i], W, H, mult, format, quality)
      const a = document.createElement('a'); a.href=dataUrl
      a.download=`${title||'slide'}${pages.length>1?`-${i+1}`:''}.${format}`
      a.click()
    }
  }

  function exportSVG() {
    const fc = fabricRef.current; if(!fc) return
    const svg = fc.toSVG()
    const blob = new Blob([svg], { type:'image/svg+xml' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${title||'slide'}.svg`; a.click()
  }

  async function exportPPTX(pages: any[], W: number, H: number) {
    // Generate a simple PPTX using images embedded in a zip
    // For now: export each page as PNG and zip them with PPTX structure
    // Simple implementation: export images and show message
    for (let i=0; i<pages.length; i++) {
      const dataUrl = await renderPageToDataUrl(pages[i], W, H, 2, 0.95, 'png')
      const a = document.createElement('a'); a.href = dataUrl
      a.download = `${title||'slide'}-page${i+1}.png`; a.click()
    }
    alert('PPTX: Pages exported as high-res PNGs. Import into PowerPoint via Insert > Picture > This Device.')
  }

  async function exportDOCX(pages: any[], W: number, H: number) {
    for (let i=0; i<pages.length; i++) {
      const dataUrl = await renderPageToDataUrl(pages[i], W, H, 2, 0.95, 'png')
      const a = document.createElement('a'); a.href = dataUrl
      a.download = `${title||'doc'}-page${i+1}.png`; a.click()
    }
    alert('DOCX: Pages exported as high-res PNGs. Import into Word via Insert > Pictures.')
  }

  // ── Icons on canvas ──────────────────────────────────────────────────────────
  function addIconToCanvas(d: string, label: string) {
    const fab = fabricLib.current||(window as any).fabric
    const fc = fabricRef.current; if(!fc||!fab) return
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${fillColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
    const blob = new Blob([svg], { type:'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    fab.Image.fromURL(url, (img: any) => {
      img.set({ left:Math.round(cWRef.current*.38), top:Math.round(cHRef.current*.38), scaleX:4, scaleY:4 })
      fc.add(img); fc.setActiveObject(img); fc.renderAll(); pushHist()
      URL.revokeObjectURL(url)
    })
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag==='INPUT'||tag==='TEXTAREA') return
      if ((e.metaKey||e.ctrlKey)&&e.key==='z') { e.preventDefault(); e.shiftKey?redo():undo() }
      if ((e.metaKey||e.ctrlKey)&&e.key==='y') { e.preventDefault(); redo() }
      if ((e.metaKey||e.ctrlKey)&&e.key==='s') { e.preventDefault(); saveCanvas() }
      if ((e.metaKey||e.ctrlKey)&&e.key==='d') { e.preventDefault(); dupSel() }
      if ((e.metaKey||e.ctrlKey)&&e.key==='g') { e.preventDefault(); grpSel() }
      if (e.key==='Delete'||e.key==='Backspace') { if(fabricRef.current?.getActiveObject()) delSel() }
      if (e.key==='Escape') { setSelectedObj(null); fabricRef.current?.discardActiveObject(); fabricRef.current?.renderAll() }
      if (e.key==='v') setTool('select')
      if (e.key==='t') setTool('text')
      if (e.key==='p') setTool('draw')
      const o=fabricRef.current?.getActiveObject()
      if (o&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        const d=e.shiftKey?10:1
        if(e.key==='ArrowLeft')  o.set('left',(o.left||0)-d)
        if(e.key==='ArrowRight') o.set('left',(o.left||0)+d)
        if(e.key==='ArrowUp')    o.set('top',(o.top||0)-d)
        if(e.key==='ArrowDown')  o.set('top',(o.top||0)+d)
        fabricRef.current?.renderAll(); scheduleSave()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [saveCanvas]) // eslint-disable-line

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isActive  = doc?.status === 'active'
  const supSign   = DOC_TYPES.find(t=>t.id===docType)?.sign ?? false
  const isText    = selectedObj?.type==='textbox'||selectedObj?.type==='text'||selectedObj?.type==='i-text'
  const isImage   = selectedObj?.type==='image'
  const isShape   = selectedObj && !isText && !isImage && selectedObj.type!=='group'

  const filtLayouts = LAYOUTS.filter(l => (layoutCat==='All'||l.cat===layoutCat) && (!templateSearch||l.label.toLowerCase().includes(templateSearch.toLowerCase())))
  const filtFonts   = FONTS.filter(f => (fontCat==='All'||f.cat===fontCat) && f.name.toLowerCase().includes(fontSearch.toLowerCase()))
  const filtIcons   = ICON_LIB.filter(i => (iconCat==='All'||i.cat===iconCat) && (i.label.toLowerCase().includes(iconSearch.toLowerCase())||i.id.includes(iconSearch.toLowerCase())))

  // ─── Layers Panel ─────────────────────────────────────────────────────────────
  function LayersPanel() {
    const [objs, setObjs] = useState<any[]>([])
    useEffect(() => {
      const fc=fabricRef.current; if(!fc) return
      const r=()=>setObjs(fc.getObjects().slice().reverse())
      fc.on('object:added',r);fc.on('object:removed',r);fc.on('object:modified',r);fc.on('selection:cleared',r);fc.on('selection:created',r);r()
      return ()=>{fc.off('object:added',r);fc.off('object:removed',r);fc.off('object:modified',r)}
    },[])
    if (!objs.length) return <div style={{padding:'32px 12px',textAlign:'center',color:C.textSm,fontSize:12,fontFamily:F}}>No elements yet</div>
    return (
      <div style={{padding:'4px 6px',display:'flex',flexDirection:'column',gap:1}}>
        {objs.map((obj,i)=>{
          const act=fabricRef.current?.getActiveObject()===obj
          const lbl=(obj as any).__type==='table'?'Table':(obj as any).__type==='signatureBlock'?'Signature':obj.text?obj.text.slice(0,20):obj.type
          return (
            <div key={i} onClick={()=>{fabricRef.current?.setActiveObject(obj);fabricRef.current?.renderAll();syncSel(obj)}}
              style={{display:'flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:7,cursor:'pointer',background:act?C.accentLt:'transparent',border:`1px solid ${act?C.accentMd:'transparent'}`,transition:'all .1s'}}>
              <span style={{flex:1,fontSize:12,fontFamily:F,color:act?C.accent:C.textSd,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:act?600:500}}>{lbl}</span>
              <button onClick={e=>{e.stopPropagation();obj.set('visible',!obj.visible);fabricRef.current?.renderAll();setObjs([...objs])}}
                style={{border:'none',background:'none',cursor:'pointer',padding:0,display:'flex'}}>
                <TIcon k={obj.visible===false?'eyeOff':'eye'} size={11} color={obj.visible===false?C.textSm:C.textMd}/>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Right properties panel ────────────────────────────────────────────────
  function RightPanel() {
    if (!selectedObj) return (
      <div style={{width:248,background:C.panel,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'auto'}}>
        <div style={{padding:'12px 14px 9px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:F}}>CANVAS</span>
          <button onClick={()=>setRightOpen(false)} style={{border:'none',background:'none',cursor:'pointer',color:C.textSm,display:'flex'}}><TIcon k="chevR" size={13} color={C.textSm}/></button>
        </div>
        {(activeTool==='draw'||activeTool==='erase')&&(
          <Sec label={activeTool==='erase'?'Eraser':'Brush'}>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <RangeInput label="Size" value={brushSize} min={1} max={60} onChange={v=>{setBrushSize(v);const fc=fabricRef.current;if(fc?.freeDrawingBrush)fc.freeDrawingBrush.width=v}}/>
              {activeTool==='draw'&&<ColorPicker label="Color" value={brushColor} onChange={v=>{setBrushColor(v);const fc=fabricRef.current;if(fc?.freeDrawingBrush)fc.freeDrawingBrush.color=v}}/>}
            </div>
          </Sec>
        )}
        <Sec label="Background">
          <ColorPicker label="" value={bgColor} onChange={v=>{setBgColor(v);const fc=fabricRef.current;if(fc){fc.backgroundColor=v;fc.renderAll();scheduleSave()}}}/>
        </Sec>
        <Sec label="Canvas Size">
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {['Presentation','Document','Social','Print'].map(cat=>{
              const catSizes=SIZES.filter(s=>s.cat===cat); if(!catSizes.length) return null
              return (<div key={cat}>
                <p style={{fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.08em',margin:'7px 0 3px',fontFamily:F}}>{cat}</p>
                {catSizes.map(sz=>(
                  <button key={sz.id} onClick={()=>changeSize(sz.id)}
                    style={{width:'100%',padding:'5px 8px',border:`1.5px solid ${canvasW===sz.w&&canvasH===sz.h?C.accent:C.border}`,borderRadius:7,background:canvasW===sz.w&&canvasH===sz.h?C.accentLt:'#fff',fontSize:11,cursor:'pointer',color:canvasW===sz.w&&canvasH===sz.h?C.accent:C.textSd,fontWeight:600,display:'flex',justifyContent:'space-between',transition:'all .12s',marginBottom:2,fontFamily:F}}>
                    <span>{sz.label}</span>
                    <span style={{fontSize:9,color:C.textSm,fontFamily:FM}}>{sz.w}×{sz.h}</span>
                  </button>
                ))}
              </div>)
            })}
          </div>
        </Sec>
      </div>
    )

    return (
      <div style={{width:248,background:C.panel,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <span style={{fontSize:12,fontWeight:700,color:C.text,textTransform:'capitalize',fontFamily:F}}>
            {(selectedObj as any).__type==='table'?'Table':(selectedObj as any).__type==='signatureBlock'?'Signature':selectedObj?.type}
          </span>
          <div style={{display:'flex',gap:2}}>
            <IBtn ico="copy" label="Duplicate ⌘D" onClick={dupSel}/>
            <IBtn ico="trash" label="Delete" onClick={delSel} danger/>
            <button onClick={()=>setRightOpen(false)} style={{border:'none',background:'none',cursor:'pointer',padding:2,display:'flex'}}><TIcon k="chevR" size={13} color={C.textSm}/></button>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto'}}>
          <Sec label="Position & Size">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <NumInput label="X" value={Math.round(selectedObj?.left||0)} onChange={v=>upd('left',v)}/>
              <NumInput label="Y" value={Math.round(selectedObj?.top||0)} onChange={v=>upd('top',v)}/>
              <NumInput label="W" value={Math.round(selectedObj?.width||0)} onChange={v=>upd('width',v)}/>
              <NumInput label="H" value={Math.round(selectedObj?.height||0)} onChange={v=>upd('height',v)}/>
            </div>
          </Sec>

          <Sec label="Arrange">
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',gap:5}}>
                {[{l:'Forward',f:bringForward,i:'up'},{l:'Backward',f:sendBackward,i:'down'},{l:'Front',f:bringToFront,i:'up'},{l:'Back',f:sendToBack,i:'down'}].map(b=>(
                  <button key={b.l} onClick={b.f} title={b.l}
                    style={{flex:1,padding:'6px 4px',border:`1px solid ${C.border}`,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:10,fontWeight:600,color:C.textMd,fontFamily:F,display:'flex',flexDirection:'column',alignItems:'center',gap:2,transition:'all .12s'}}
                    onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}}
                    onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.color=C.textMd}}>
                    <TIcon k={b.i as any} size={12} color="currentColor"/>{b.l}
                  </button>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:5,fontFamily:F}}>Align to canvas</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
                  {[{l:'Left',f:()=>alignObj('left')},{l:'Center',f:()=>alignObj('center')},{l:'Right',f:()=>alignObj('right')},{l:'Top',f:()=>alignObj('top')},{l:'Middle',f:()=>alignObj('middle')},{l:'Bottom',f:()=>alignObj('bottom')}].map(a=>(
                    <button key={a.l} onClick={a.f} style={{padding:'5px 0',border:`1px solid ${C.border}`,borderRadius:6,background:'#fff',fontSize:11,cursor:'pointer',color:C.textSd,fontWeight:500,fontFamily:F,transition:'all .11s'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='#fff')}>{a.l}</button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={lockObj} style={{flex:1,padding:'6px',border:`1px solid ${C.border}`,borderRadius:7,background:(selectedObj?.lockMovementX?C.accentLt:'#fff'),cursor:'pointer',fontSize:11,fontWeight:600,color:(selectedObj?.lockMovementX?C.accent:C.textMd),fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  <TIcon k="lock" size={12} color="currentColor"/>{selectedObj?.lockMovementX?'Locked':'Lock'}
                </button>
                <button onClick={flipH} style={{flex:1,padding:'6px',border:`1px solid ${C.border}`,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:C.textMd,fontFamily:F}}>Flip H</button>
                <button onClick={flipV} style={{flex:1,padding:'6px',border:`1px solid ${C.border}`,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:C.textMd,fontFamily:F}}>Flip V</button>
              </div>
            </div>
          </Sec>

          <Sec label="Appearance">
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {!isText && <ColorPicker label="Fill" value={typeof selectedObj?.fill==='string'?selectedObj.fill:'#5B50E8'} onChange={v=>{setFillColor(v);upd('fill',v)}}/>}
              {isShape && (
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end'}}>
                  <ColorPicker label="Stroke" value={selectedObj?.stroke||'#000000'} onChange={v=>upd('stroke',v)}/>
                  <NumInput label="Width" value={selectedObj?.strokeWidth||0} onChange={v=>upd('strokeWidth',v)}/>
                </div>
              )}
              {isShape && selectedObj?.type==='rect' && <NumInput label="Corner Radius" value={selectedObj?.rx||0} onChange={v=>{upd('rx',v);upd('ry',v)}}/>}
              <RangeInput label="Opacity" value={Math.round((selectedObj?.opacity??1)*100)} min={0} max={100} onChange={v=>upd('opacity',v/100)}/>
              <NumInput label="Rotation °" value={Math.round(selectedObj?.angle||0)} onChange={v=>upd('angle',v)}/>
            </div>
          </Sec>

          {isText && (
            <Sec label="Typography">
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <ColorPicker label="Color" value={fontColor} onChange={v=>{setFontColor(v);upd('fill',v)}}/>

                {/* Font family */}
                <div style={{position:'relative'}}>
                  <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:5,fontFamily:F}}>Font</div>
                  <button onClick={()=>setShowFontPicker(!showFontPicker)}
                    style={{width:'100%',padding:'7px 10px',border:`1.5px solid ${showFontPicker?C.accent:C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',fontSize:13,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:500,color:C.text,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fontFamily}</span>
                    <TIcon k="chevD" size={12} color={C.textSm}/>
                  </button>
                  {showFontPicker && (
                    <div style={{position:'absolute',top:'110%',left:0,right:0,background:'#fff',border:`1.5px solid ${C.accentMd}`,borderRadius:12,boxShadow:C.shadowLg,zIndex:500}}>
                      <div style={{padding:'8px 8px 4px',borderBottom:`1px solid ${C.border}`}}>
                        <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search 200+ fonts…" autoFocus
                          style={{width:'100%',padding:'6px 9px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,color:C.text,background:C.panelSub,outline:'none',marginBottom:6,fontFamily:F}}/>
                        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                          {['All',...FONT_CATS].map(c=>(
                            <button key={c} onClick={()=>setFontCat(c)} style={{padding:'2px 7px',fontSize:9,fontWeight:600,fontFamily:F,border:`1px solid ${fontCat===c?C.accent:C.border}`,borderRadius:20,background:fontCat===c?C.accentLt:'transparent',color:fontCat===c?C.accent:C.textMd,cursor:'pointer'}}>{c}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{maxHeight:200,overflow:'auto',padding:'4px 5px 5px'}}>
                        {filtFonts.map(f=>(
                          <div key={f.name} onClick={()=>applyFont(f.name)}
                            style={{padding:'6px 9px',cursor:'pointer',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'space-between',background:fontFamily===f.name?C.accentLt:'transparent',transition:'background .1s'}}
                            onMouseOver={e=>{if(fontFamily!==f.name)(e.currentTarget as HTMLElement).style.background=C.hover}}
                            onMouseOut={e=>{if(fontFamily!==f.name)(e.currentTarget as HTMLElement).style.background='transparent'}}>
                            <span style={{fontSize:13,fontFamily:`'${f.name}',sans-serif`,color:fontFamily===f.name?C.accent:C.text,fontWeight:fontFamily===f.name?700:400}}>{f.name}</span>
                            <span style={{fontSize:8,color:C.textSm,background:C.panelSub,padding:'1px 5px',borderRadius:5,fontFamily:F}}>{f.cat}</span>
                          </div>
                        ))}
                        {filtFonts.length===0&&<div style={{padding:'16px',textAlign:'center',fontSize:12,color:C.textSm,fontFamily:F}}>No fonts match</div>}
                      </div>
                    </div>
                  )}
                </div>

                <NumInput label="Size" value={fontSize} onChange={v=>{setFontSize(v);upd('fontSize',v)}} min={6} max={400}/>

                <div>
                  <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6,fontFamily:F}}>Style</div>
                  <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                    {[
                      {ico:'bold' as const,prop:'fontWeight',on:'bold',off:'normal',active:selectedObj?.fontWeight==='bold'||selectedObj?.fontWeight===800,tip:'Bold'},
                      {ico:'italic' as const,prop:'fontStyle',on:'italic',off:'normal',active:selectedObj?.fontStyle==='italic',tip:'Italic'},
                      {ico:'underline' as const,prop:'underline',on:true,off:false,active:selectedObj?.underline===true,tip:'Underline'},
                      {ico:'strike' as const,prop:'linethrough',on:true,off:false,active:selectedObj?.linethrough===true,tip:'Strikethrough'},
                    ].map(s=>(
                      <button key={s.ico} title={s.tip} onClick={()=>upd(s.prop,s.active?s.off:s.on)}
                        style={{width:32,height:30,border:`1.5px solid ${s.active?C.accent:C.border}`,borderRadius:7,background:s.active?C.accentLt:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <TIcon k={s.ico} size={13} color={s.active?C.accent:C.textMd}/>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6,fontFamily:F}}>Align</div>
                  <div style={{display:'flex',gap:3}}>
                    {[{ico:'alignL' as const,v:'left'},{ico:'alignC' as const,v:'center'},{ico:'alignR' as const,v:'right'},{ico:'alignJ' as const,v:'justify'}].map(a=>(
                      <button key={a.v} onClick={()=>upd('textAlign',a.v)}
                        style={{flex:1,height:30,border:`1.5px solid ${selectedObj?.textAlign===a.v?C.accent:C.border}`,borderRadius:7,background:selectedObj?.textAlign===a.v?C.accentLt:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <TIcon k={a.ico} size={13} color={selectedObj?.textAlign===a.v?C.accent:C.textMd}/>
                      </button>
                    ))}
                  </div>
                </div>

                <RangeInput label="Line height" value={Math.round((selectedObj?.lineHeight??1.35)*10)/10} min={0.8} max={3.0} onChange={v=>upd('lineHeight',v)}/>
                <RangeInput label="Letter spacing" value={selectedObj?.charSpacing||0} min={-200} max={800} onChange={v=>upd('charSpacing',v)}/>
              </div>
            </Sec>
          )}

          {isImage && (
            <Sec label="Image Adjustments">
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <RangeInput label="Brightness" value={imgBright} min={-100} max={100} onChange={v=>{setImgBright(v);applyFilters(v,imgContrast,imgSat,imgBlur)}}/>
                <RangeInput label="Contrast"   value={imgContrast} min={-100} max={100} onChange={v=>{setImgContrast(v);applyFilters(imgBright,v,imgSat,imgBlur)}}/>
                <RangeInput label="Saturation" value={imgSat} min={-100} max={100} onChange={v=>{setImgSat(v);applyFilters(imgBright,imgContrast,v,imgBlur)}}/>
                <RangeInput label="Blur"       value={imgBlur} min={0} max={100} onChange={v=>{setImgBlur(v);applyFilters(imgBright,imgContrast,imgSat,v)}}/>
                <button onClick={()=>{setImgBright(0);setImgContrast(0);setImgSat(0);setImgBlur(0);applyFilters(0,0,0,0)}}
                  style={{padding:'5px 10px',border:'none',background:'none',cursor:'pointer',fontSize:11,color:C.red,fontWeight:600,textAlign:'left',fontFamily:F}}>Reset filters</button>
              </div>
            </Sec>
          )}
        </div>
      </div>
    )
  }

  // ══ RENDER ═══════════════════════════════════════════════════════════════════
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:C.bg,fontFamily:F,color:C.text,overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Material+Icons&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.borderSt};border-radius:99px}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:${C.border};outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:13px;height:13px;border-radius:50%;background:${C.accent};cursor:pointer;box-shadow:${C.shadow}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .phimg{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;cursor:pointer;display:block;transition:all .14s;border:2px solid transparent}
        .phimg:hover{border-color:${C.accent};transform:scale(1.02)}
        .sbtab{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0;cursor:pointer;border:none;background:transparent;width:100%;transition:all .13s;border-left:2px solid transparent}
        .sbtab:hover{background:${C.hover}}.sbtab.on{background:${C.accentLt};border-left-color:${C.accent}}
        .sbtab span{font-size:9px;font-weight:600;font-family:${F};letter-spacing:.02em;color:inherit}
        .tbtn{height:30px;padding:0 12px;border-radius:7px;font-size:12px;font-weight:600;border:1.5px solid ${C.border};background:#fff;color:${C.textSd};cursor:pointer;font-family:${F};display:flex;align-items:center;gap:5px;transition:all .13s;flex-shrink:0}
        .tbtn:hover{background:${C.hover};border-color:${C.borderSt};color:${C.text}}
        .pubtn{height:32px;padding:0 16px;border-radius:8px;font-size:13px;font-weight:700;border:none;background:${C.accent};color:white;cursor:pointer;font-family:${F};display:flex;align-items:center;gap:5px;transition:all .13s;flex-shrink:0}
        .pubtn:hover{background:${C.accentHv};box-shadow:0 4px 14px rgba(91,80,232,.32)}
        .shapebtn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:54px;border:1.5px solid ${C.border};border-radius:9px;background:#fff;cursor:pointer;font-size:10px;font-weight:600;color:${C.textMd};font-family:${F};transition:all .13s}
        .shapebtn:hover{border-color:${C.accent};color:${C.accent};background:${C.accentLt}}
        .lcrd{transition:all .13s;border:1.5px solid ${C.border};border-radius:9px;overflow:hidden;cursor:pointer;background:#fff}
        .lcrd:hover{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentLt};transform:translateY(-1px)}
        .thumb{cursor:pointer;border-radius:7px;border:2px solid ${C.border};overflow:hidden;transition:all .12s;background:#fff;flex-shrink:0;position:relative}
        .thumb:hover{border-color:${C.borderSt}}.thumb.on{border-color:${C.accent};box-shadow:0 0 0 2px ${C.accentLt}}
        .ttip{position:'absolute';background:rgba(0,0,0,.75);color:#fff;font-size:10px;border-radius:4px;padding:2px 6px;pointer-events:none;white-space:nowrap}
        .iconbtn{padding:6px 2px;border:1px solid ${C.border};border-radius:7px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;transition:all .12s;font-family:${F}}
        .iconbtn:hover{border-color:${C.accent};background:${C.accentLt}}
      `}</style>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div style={{height:50,background:C.panel,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 12px',gap:5,flexShrink:0,zIndex:30,boxShadow:'0 1px 0 rgba(0,0,0,.04)'}}>
        
        {/* Back */}
        <button onClick={()=>router.push('/dashboard')} className="tbtn" style={{paddingLeft:8}}>
          <TIcon k="chevL" size={14} color={C.textMd}/>Docs
        </button>
        <div style={{width:1,height:20,background:C.border,margin:'0 2px'}}/>

        {/* Title */}
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{border:'none',outline:'none',fontSize:14,fontWeight:700,color:C.text,background:'transparent',maxWidth:180,minWidth:50,letterSpacing:'-.01em',fontFamily:F}}/>
        <span style={{fontSize:11,color:saving?C.accent:C.textSm,fontFamily:FM,minWidth:50}}>{saving?'saving…':lastSaved?'✓ saved':''}</span>

        {/* Status */}
        <span style={{padding:'2px 7px',borderRadius:20,fontSize:9.5,fontWeight:700,background:isActive?'#DCFCE7':'#F1F5F9',color:isActive?C.green:C.textMd,border:`1px solid ${isActive?'#BBF7D0':C.border}`}}>{isActive?'LIVE':'DRAFT'}</span>

        <div style={{flex:1}}/>

        {/* ── CONTEXTUAL TOOLBAR ─────────────────────────────────────────── */}
        <div style={{display:'flex',alignItems:'center',gap:2,background:C.panelSub,borderRadius:9,padding:3,border:`1px solid ${C.border}`}}>
          {/* Always visible tools */}
          {[
            {id:'select',tip:'Select  V',  ico:'select' as const },
            {id:'text',  tip:'Text  T',    ico:'text' as const },
            {id:'draw',  tip:'Pencil  P',  ico:'draw' as const },
            {id:'line',  tip:'Line',       ico:'line' as const },
            {id:'erase', tip:'Eraser',     ico:'erase' as const },
          ].map(t=>(
            <button key={t.id} title={t.tip} onClick={()=>setTool(t.id)}
              style={{width:32,height:28,border:'none',cursor:'pointer',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .12s',background:activeTool===t.id?C.accentLt:'transparent'}}>
              <TIcon k={t.ico} size={14} color={activeTool===t.id?C.accent:C.textMd}/>
            </button>
          ))}
          <div style={{width:1,height:16,background:C.border,margin:'0 2px'}}/>
          {/* Context-sensitive tools */}
          {isText && (
            <>
              <button title="Bold ⌘B" onClick={()=>upd('fontWeight',selectedObj?.fontWeight==='bold'?'normal':'bold')}
                style={{width:28,height:28,border:'none',cursor:'pointer',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',background:selectedObj?.fontWeight==='bold'?C.accentLt:'transparent',fontFamily:F,fontWeight:700,fontSize:13,color:selectedObj?.fontWeight==='bold'?C.accent:C.textMd}}>B</button>
              <button title="Italic" onClick={()=>upd('fontStyle',selectedObj?.fontStyle==='italic'?'normal':'italic')}
                style={{width:28,height:28,border:'none',cursor:'pointer',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',background:selectedObj?.fontStyle==='italic'?C.accentLt:'transparent',fontFamily:'Georgia,serif',fontStyle:'italic',fontSize:14,color:selectedObj?.fontStyle==='italic'?C.accent:C.textMd}}>I</button>
              <button title="Underline" onClick={()=>upd('underline',!selectedObj?.underline)}
                style={{width:28,height:28,border:'none',cursor:'pointer',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',background:selectedObj?.underline?C.accentLt:'transparent',textDecoration:'underline',fontFamily:F,fontWeight:600,fontSize:13,color:selectedObj?.underline?C.accent:C.textMd}}>U</button>
              <div style={{width:1,height:16,background:C.border,margin:'0 2px'}}/>
              <input type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);upd('fill',e.target.value)}}
                style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${C.border}`,cursor:'pointer',padding:2}}/>
            </>
          )}
          {selectedObj && (
            <>
              <IBtn ico="copy"  label="Duplicate ⌘D" onClick={dupSel}/>
              <IBtn ico="trash" label="Delete" onClick={delSel} danger/>
              {selectedObj.type==='group'&&<IBtn ico="grid" label="Ungroup" onClick={ungrpSel}/>}
            </>
          )}
          {!selectedObj && !isText && (
            <>
              <IBtn ico="table" label="Add Table" onClick={()=>addTable(4,3)}/>
              <IBtn ico="chart" label="Chart Builder" onClick={()=>setShowChart(true)}/>
              {supSign&&<IBtn ico="sign" label="Signature Block" onClick={addSignatureBlock}/>}
            </>
          )}
        </div>

        <div style={{width:1,height:20,background:C.border,margin:'0 2px'}}/>

        {/* Undo / Redo — proper Google Material-style paths */}
        <IBtn ico="undo" label="Undo  ⌘Z" onClick={undo}/>
        <IBtn ico="redo" label="Redo  ⌘⇧Z" onClick={redo}/>

        <div style={{width:1,height:20,background:C.border,margin:'0 2px'}}/>

        <button onClick={()=>setShowDrafter(true)} className="tbtn">
          <span style={{fontSize:13}}>✦</span>AI Draft
        </button>

        <button onClick={()=>setShowExport(true)} className="tbtn">
          <TIcon k="download" size={13} color={C.textSd}/>Export
        </button>

        {isActive
          ? <button onClick={()=>setShowShare(true)} className="pubtn"><TIcon k="share" size={14} color="white"/>Share</button>
          : <button onClick={publish} className="pubtn">Publish & Share</button>}
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* ── LEFT SIDEBAR — icon + panel ────────────────────────────────── */}
        <div style={{display:'flex',flexShrink:0}}>
          {/* Icon rail */}
          <div style={{width:56,background:C.panel,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',paddingTop:6,gap:1}}>
            {SIDEBAR_TABS.map(tab=>(
              <button key={tab.id} className={`sbtab${sideTab===tab.id?' on':''}`}
                onClick={()=>{ if(sideTab===tab.id&&sideOpen){setSideOpen(false)}else{setSideTab(tab.id);setSideOpen(true)} }}
                style={{ color:sideTab===tab.id?C.accent:C.textMd }}>
                <TIcon k={tab.ico} size={20} color={sideTab===tab.id?C.accent:C.textMd}/>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Panel content */}
          {sideOpen && (
            <div style={{width:252,background:C.panel,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
              {/* Panel header */}
              <div style={{padding:'11px 14px 8px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
                <span style={{fontSize:12,fontWeight:700,color:C.text,textTransform:'capitalize',fontFamily:F,letterSpacing:'.01em'}}>
                  {SIDEBAR_TABS.find(t=>t.id===sideTab)?.label}
                </span>
                <button onClick={()=>setSideOpen(false)} style={{border:'none',background:'none',cursor:'pointer',color:C.textSm,display:'flex',borderRadius:5,padding:2}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                  <TIcon k="chevL" size={13} color={C.textSm}/>
                </button>
              </div>

              <div style={{flex:1,overflow:'auto',padding:10}}>

                {/* TEMPLATES */}
                {sideTab==='templates' && (
                  <div>
                    <input value={templateSearch} onChange={e=>setTplSearch(e.target.value)} placeholder="Search layouts…"
                      style={{width:'100%',padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text,background:'#fff',outline:'none',marginBottom:9,fontFamily:F}}
                      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
                      {['All',...LAYOUT_CATS].map(c=>(
                        <button key={c} onClick={()=>setLayoutCat(c)}
                          style={{padding:'3px 9px',fontSize:10,fontWeight:600,border:`1px solid ${layoutCat===c?C.accent:C.border}`,borderRadius:20,background:layoutCat===c?C.accentLt:'#fff',color:layoutCat===c?C.accent:C.textMd,cursor:'pointer',fontFamily:F,transition:'all .11s'}}>
                          {c}
                        </button>
                      ))}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                      {filtLayouts.map(l=>(
                        <div key={l.id} className="lcrd" onClick={()=>applyLayout(l)} title={l.label}>
                          <div style={{aspectRatio:'16/9',background:(l as any).preview||'#F8FAFC',position:'relative',overflow:'hidden',borderBottom:`1px solid ${C.border}`}}>
                            {l.build(160,90).objects?.slice(0,6).map((o:any,oi:number)=>o.type==='rect'&&(
                              <div key={oi} style={{position:'absolute',left:`${(o.left/160)*100}%`,top:`${(o.top/90)*100}%`,width:`${Math.min((o.width/160)*100,100)}%`,height:`${Math.min((o.height/90)*100,100)}%`,background:o.fill,borderRadius:o.rx?2:0,opacity:Math.min(o.opacity??1,1)}}/>
                            ))}
                          </div>
                          <div style={{padding:'5px 7px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{fontSize:10.5,fontWeight:600,color:C.textSd,fontFamily:F}}>{l.label}</span>
                            <span style={{fontSize:8,color:C.textSm,background:C.panelSub,padding:'1px 5px',borderRadius:5,fontFamily:F,fontWeight:600}}>{l.cat}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ELEMENTS */}
                {sideTab==='elements' && (
                  <div style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:F}}>Shapes</p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                        {[
                          {id:'rect',l:'Rect'},
                          {id:'circle',l:'Circle'},
                          {id:'triangle',l:'Tri'},
                          {id:'diamond',l:'Diamond'},
                          {id:'star',l:'Star'},
                          {id:'line',l:'Line'},
                          {id:'arrow',l:'Arrow'},
                          {id:'rect',l:'Button',opts:{fill:C.accent,rx:10}},
                        ].map((sh,i)=>(
                          <button key={i} className="shapebtn" onClick={()=>addShape(sh.id,(sh as any).opts)}>
                            <span style={{fontSize:16}}>{['□','○','△','◇','★','─','→','⬛'][i]}</span>
                            <span style={{fontSize:9.5}}>{sh.l}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:F}}>Data & Charts</p>
                      <button onClick={()=>setShowChart(true)} style={{width:'100%',padding:'11px 13px',border:`2px dashed #D97706`,borderRadius:11,background:'#FFFBEB',cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:700,color:'#92400E',transition:'all .13s',fontFamily:F}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background='#FEF3C7'}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background='#FFFBEB'}}>
                        📊 Open Chart Builder
                      </button>
                      <button onClick={()=>addTable(4,3)} style={{width:'100%',marginTop:6,padding:'11px 13px',border:`2px dashed ${C.borderSt}`,borderRadius:11,background:C.panelSub,cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:700,color:C.textSd,transition:'all .13s',fontFamily:F}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.color=C.textSd}}>
                        <TIcon k="table" size={16} color="currentColor"/>Add Table
                      </button>
                    </div>

                    {supSign && (
                      <div>
                        <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:F}}>Signing</p>
                        <button onClick={addSignatureBlock} style={{width:'100%',padding:'11px 13px',border:`2px dashed ${C.accent}`,borderRadius:11,background:C.accentLt,cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:700,color:C.accent,transition:'all .13s',fontFamily:F}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background='#E0DFFE'}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background=C.accentLt}}>
                          <TIcon k="sign" size={16} color={C.accent}/>Add Signature Block
                        </button>
                        <button onClick={()=>setShowSign(true)} style={{width:'100%',marginTop:6,padding:'9px 13px',border:`1.5px solid ${C.border}`,borderRadius:10,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:C.textSd,fontFamily:F,textAlign:'left'}}>
                          ✍ Preview signature styles
                        </button>
                      </div>
                    )}

                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:F}}>Fill Color</p>
                      <ColorPicker label="" value={fillColor} onChange={setFillColor}/>
                    </div>
                  </div>
                )}

                {/* TEXT */}
                {sideTab==='text' && (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:4,fontFamily:F}}>Add Text</p>
                    {[
                      {label:'Heading 1', fs:52,fw:'800',ff:'Inter',      txt:'Heading 1'},
                      {label:'Heading 2', fs:36,fw:'700',ff:'Inter',      txt:'Heading 2'},
                      {label:'Heading 3', fs:24,fw:'600',ff:'Inter',      txt:'Heading 3'},
                      {label:'Subheading',fs:18,fw:'500',ff:'Inter',      txt:'Subheading'},
                      {label:'Body',      fs:15,fw:'400',                 txt:'Body text'},
                      {label:'Caption',   fs:11,fw:'400',fill:'#64748B',  txt:'Caption'},
                      {label:'Label',     fs:10,fw:'700',ff:'JetBrains Mono',fill:C.accent, txt:'LABEL'},
                    ].map(t=>(
                      <button key={t.label} onClick={()=>{
                        const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
                        const tb=new fab.Textbox(t.txt,{left:80,top:100,width:440,fontSize:t.fs,fontFamily:(t as any).ff||fontFamily,fill:(t as any).fill||fontColor,fontWeight:t.fw,editable:true,lineHeight:1.35})
                        fc.add(tb);fc.setActiveObject(tb);fc.renderAll();pushHist()
                      }} style={{padding:'9px 11px',border:`1.5px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left',transition:'border-color .12s',fontFamily:F}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>
                        <span style={{fontSize:Math.min(t.fs>32?17:t.fs>20?14:12,17),fontWeight:t.fw,fontFamily:`'${(t as any).ff||'Inter'}',sans-serif`,color:C.text}}>{t.label}</span>
                      </button>
                    ))}
                    <div style={{marginTop:10}}>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:F}}>Font Pairings</p>
                      {[
                        {l:'Editorial',  h:'Playfair Display',  b:'DM Sans'},
                        {l:'Modern',     h:'Jost',              b:'Jost'},
                        {l:'Bold',       h:'Bebas Neue',        b:'Work Sans'},
                        {l:'Elegant',    h:'Cormorant Garamond',b:'Manrope'},
                        {l:'Tech',       h:'JetBrains Mono',    b:'Inter'},
                        {l:'Rounded',    h:'Nunito',            b:'Nunito'},
                        {l:'Clean',      h:'Space Grotesk',     b:'Space Grotesk'},
                      ].map(p=>(
                        <button key={p.l} onClick={()=>{preloadFont(p.h);preloadFont(p.b)}} style={{padding:'9px 11px',border:`1.5px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left',width:'100%',marginBottom:5,transition:'border-color .12s',fontFamily:F}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>
                          <div style={{fontSize:8.5,fontWeight:700,color:C.textSm,textTransform:'uppercase',marginBottom:2,letterSpacing:'.07em'}}>{p.l}</div>
                          <div style={{fontSize:13,fontFamily:`'${p.h}',serif`,color:C.text,fontWeight:700}}>{p.h}</div>
                          <div style={{fontSize:11,fontFamily:`'${p.b}',sans-serif`,color:C.textMd}}>{p.b}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MEDIA */}
                {sideTab==='media' && (
                  <div style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:7,fontFamily:F}}>Your Uploads</p>
                      <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px',border:`2px dashed ${C.borderSt}`,borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:600,color:C.textMd,background:C.panelSub,transition:'all .13s',fontFamily:F}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.color=C.textMd}}>
                        <TIcon k="upload" size={14} color="currentColor"/>Upload images
                        <input type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>Array.from(e.target.files||[]).forEach(f=>{if(f.type.startsWith('image/'))uploadImage(f)})}/>
                      </label>
                      {uploadedMedia.length > 0 && (
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginTop:8}}>
                          {uploadedMedia.map((f,i)=>(
                            <div key={i} onClick={()=>addStockPhoto(f.url)} style={{position:'relative',overflow:'hidden',borderRadius:7,border:`1.5px solid ${C.border}`,cursor:'pointer',transition:'border-color .12s'}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>
                              <img src={f.url} alt={f.name} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover',display:'block'}}/>
                              <span style={{position:'absolute',bottom:0,left:0,right:0,fontSize:8,color:'#fff',background:'rgba(0,0,0,.55)',padding:'2px 5px',fontFamily:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:F}}>Stock Photos</p>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                        {['Business','People','Technology','Nature','Architecture','Abstract','Food','Travel','Planes','Cars'].map(cat=>(
                          <button key={cat} onClick={()=>{setPhotoSearch(cat);setPhotoPage(1);loadPhotos(cat,1)}}
                            style={{padding:'3px 8px',fontSize:10,fontWeight:600,border:`1px solid ${photoSearch===cat?C.accent:C.border}`,borderRadius:20,background:photoSearch===cat?C.accentLt:'#fff',color:photoSearch===cat?C.accent:C.textMd,cursor:'pointer',fontFamily:F,transition:'all .11s'}}>
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:5,marginBottom:9}}>
                        <input value={photoSearch} onChange={e=>setPhotoSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setPhotoPage(1);loadPhotos(photoSearch,1)}}} placeholder="Search photos…"
                          style={{flex:1,padding:'7px 9px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text,background:'#fff',outline:'none',fontFamily:F}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                        <button onClick={()=>{setPhotoPage(1);loadPhotos(photoSearch||'business',1)}} style={{padding:'0 11px',border:'none',borderRadius:8,background:C.accent,cursor:'pointer',fontSize:12,color:'#fff',fontWeight:700,fontFamily:F}}>Go</button>
                      </div>
                      {photoLoading && <div style={{textAlign:'center',padding:'20px',color:C.textSm,fontSize:12,fontFamily:F}}>Loading…</div>}
                      {!photoLoading && photos.length===0 && (
                        <button onClick={()=>loadPhotos('business')} style={{width:'100%',padding:'9px',border:`1.5px solid ${C.border}`,borderRadius:8,background:C.panelSub,cursor:'pointer',fontSize:12,color:C.textMd,fontWeight:600,fontFamily:F}}>Browse photos</button>
                      )}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                        {photos.map(p=>(
                          <div key={p.id} style={{position:'relative',overflow:'hidden',borderRadius:8,cursor:'pointer'}} onClick={()=>addStockPhoto(p.url)}>
                            <img src={p.thumb} alt="" className="phimg" loading="lazy"/>
                            {p.author&&<span style={{position:'absolute',bottom:3,left:3,fontSize:7,color:'rgba(255,255,255,.8)',background:'rgba(0,0,0,.45)',padding:'1px 4px',borderRadius:3,fontFamily:F,pointerEvents:'none'}}>{p.author}</span>}
                          </div>
                        ))}
                      </div>
                      {photos.length > 0 && !photoLoading && (
                        <button onClick={()=>{const np=photoPage+1;setPhotoPage(np);loadPhotos(photoSearch||'business',np)}} style={{width:'100%',marginTop:8,padding:'7px',border:`1.5px solid ${C.border}`,borderRadius:8,background:C.panelSub,cursor:'pointer',fontSize:12,color:C.textMd,fontWeight:600,fontFamily:F}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>Load more</button>
                      )}
                    </div>
                  </div>
                )}

                {/* ICONS */}
                {sideTab==='icons' && (
                  <div>
                    <input value={iconSearch} onChange={e=>setIconSearch(e.target.value)} placeholder="Search 500+ icons…"
                      style={{width:'100%',padding:'7px 9px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text,background:'#fff',outline:'none',marginBottom:8,fontFamily:F}}
                      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:9}}>
                      {['All',...ICON_CATS].map(c=>(
                        <button key={c} onClick={()=>setIconCat(c)} style={{padding:'3px 7px',fontSize:9,fontWeight:600,border:`1px solid ${iconCat===c?C.accent:C.border}`,borderRadius:20,background:iconCat===c?C.accentLt:'#fff',color:iconCat===c?C.accent:C.textMd,cursor:'pointer',fontFamily:F,transition:'all .11s'}}>{c}</button>
                      ))}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>
                      {filtIcons.slice(0,120).map(ic=>(
                        <button key={ic.id} className="iconbtn" title={ic.label} onClick={()=>addIconToCanvas(ic.d, ic.label)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMd} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d={ic.d}/>
                          </svg>
                          <span style={{fontSize:7,color:C.textSm,textAlign:'center',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',width:'100%',fontFamily:F}}>{ic.label}</span>
                        </button>
                      ))}
                    </div>
                    {iconSearch===''&&<p style={{fontSize:10,color:C.textSm,marginTop:8,textAlign:'center',fontFamily:F}}>Showing {Math.min(120,filtIcons.length)} of {ICON_LIB.length}+ icons</p>}
                  </div>
                )}

                {/* BRAND */}
                {sideTab==='brand' && (
                  <BrandKit
                    onApplyColor={v=>{setFillColor(v);const fc=fabricRef.current;const obj=fc?.getActiveObject();if(obj){obj.set('fill',v);fc?.renderAll();scheduleSave()}}}
                    onApplyFont={applyFont}
                    onAddLogo={addStockPhoto}
                  />
                )}

                {/* LAYERS */}
                {sideTab==='layers' && <LayersPanel/>}
              </div>
            </div>
          )}
        </div>

        {/* ── CANVAS VIEWPORT ─────────────────────────────────────────────── */}
        <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>
          <div style={{flex:1,overflow:'auto',background:C.desk,backgroundImage:`radial-gradient(rgba(0,0,0,0.03) 1.5px, transparent 1.5px)`,backgroundSize:'28px 28px',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'48px 36px',position:'relative'}}>
            {/* Canvas — NO CSS scaling. Fabric handles DPR via enableRetinaScaling */}
            <div style={{flexShrink:0,boxShadow:'0 8px 40px rgba(0,0,0,.16),0 1px 4px rgba(0,0,0,.08)',borderRadius:2,background:'#fff',lineHeight:0}}>
              <canvas ref={canvasEl} style={{display:'block'}}/>
            </div>

            {/* Floating context toolbar for selected objects */}
            {selectedObj && (
              <div style={{position:'fixed',top:58,left:'50%',transform:'translateX(-50%)',background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:C.shadowLg,padding:'3px 5px',display:'flex',alignItems:'center',gap:2,zIndex:50}}>
                {isText && (
                  <>
                    <select value={fontFamily} onChange={e=>applyFont(e.target.value)}
                      style={{height:26,padding:'0 7px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,fontFamily:F,color:C.text,background:'#fff',cursor:'pointer',maxWidth:130,outline:'none'}}>
                      {FONTS.map(f=><option key={f.name} value={f.name}>{f.name}</option>)}
                    </select>
                    <input type="number" value={fontSize} min={6} max={400} onChange={e=>{const v=parseInt(e.target.value)||fontSize;setFontSize(v);upd('fontSize',v)}} style={{width:44,height:26,border:`1px solid ${C.border}`,borderRadius:6,padding:'0 5px',fontSize:12,fontFamily:FM,color:C.text,background:'#fff',outline:'none',textAlign:'center'}}/>
                    <input type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);upd('fill',e.target.value)}} style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,cursor:'pointer',padding:2}}/>
                  </>
                )}
                {!isText && (
                  <input type="color" value={typeof selectedObj?.fill==='string'?selectedObj.fill:'#5B50E8'} onChange={e=>{setFillColor(e.target.value);upd('fill',e.target.value)}} style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,cursor:'pointer',padding:2}}/>
                )}
                <div style={{width:1,height:16,background:C.border,margin:'0 2px'}}/>
                <IBtn ico="copy" label="Duplicate" onClick={dupSel}/>
                <IBtn ico="trash" label="Delete" onClick={delSel} danger/>
              </div>
            )}

            {/* Zoom controls */}
            <div style={{position:'fixed',bottom:108,right:rightOpen?258:14,display:'flex',alignItems:'center',gap:1,background:C.panel,border:`1px solid ${C.border}`,borderRadius:9,padding:'3px',boxShadow:C.shadowMd,zIndex:20,transition:'right .2s'}}>
              <button onClick={()=>{const z=Math.max(.06,zoom-.1);setZoom(z);zRef.current=z;applyZoom(z)}} style={{width:26,height:26,border:'none',background:'none',cursor:'pointer',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                <TIcon k="zoomOut" size={14} color={C.text}/>
              </button>
              <span style={{fontSize:11,fontWeight:700,color:C.textSd,minWidth:38,textAlign:'center',fontFamily:FM}}>{Math.round(zoom*100)}%</span>
              <button onClick={()=>{const z=Math.min(3,zoom+.1);setZoom(z);zRef.current=z;applyZoom(z)}} style={{width:26,height:26,border:'none',background:'none',cursor:'pointer',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                <TIcon k="zoomIn" size={14} color={C.text}/>
              </button>
              <div style={{width:1,height:14,background:C.border,margin:'0 1px'}}/>
              <button onClick={()=>{const z=.58;setZoom(z);zRef.current=z;applyZoom(z)}} style={{height:26,padding:'0 6px',border:'none',background:'none',cursor:'pointer',fontSize:10,fontWeight:700,color:C.textSm,borderRadius:6,fontFamily:F}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>FIT</button>
            </div>
          </div>

          {/* Right panel expand tab */}
          {!rightOpen && (
            <button onClick={()=>setRightOpen(true)} style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',width:16,height:44,background:C.panel,border:`1px solid ${C.border}`,borderRadius:'7px 0 0 7px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',borderRight:'none',boxShadow:'-2px 0 6px rgba(0,0,0,.05)',zIndex:10}}>
              <TIcon k="chevL" size={10} color={C.textMd}/>
            </button>
          )}

          {rightOpen && <RightPanel/>}
        </div>
      </div>

      {/* ── PAGES STRIP ─────────────────────────────────────────────────────── */}
      <div style={{height:96,background:C.panel,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',flexShrink:0,boxShadow:'0 -1px 0 rgba(0,0,0,.04)'}}>
        <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',gap:7,padding:'0 12px',height:'100%'}}>
          {pages.map((_,i)=>{
            const tw=Math.round(canvasW*(72/canvasH))
            return (
              <div key={i} className={`thumb${curPage===i?' on':''}`} style={{width:Math.max(tw,50),height:72}} onClick={()=>switchPage(i)}>
                {thumbs[i]
                  ? <img src={thumbs[i]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <div style={{width:'100%',height:'100%',background:C.panelSub,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:10,color:C.textSm,fontFamily:FM}}>{i+1}</span></div>
                }
                {/* Page actions on hover */}
                <div style={{position:'absolute',top:3,right:3,display:'none',gap:2}} className="page-acts">
                  <button onClick={e=>{e.stopPropagation();dupPage(i)}} style={{width:16,height:16,borderRadius:3,background:'rgba(255,255,255,.9)',border:`1px solid ${C.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
                    <TIcon k="copy" size={9} color={C.textMd}/>
                  </button>
                  {pages.length>1&&(
                    <button onClick={e=>{e.stopPropagation();delPage(i)}} style={{width:16,height:16,borderRadius:3,background:'rgba(255,255,255,.9)',border:`1px solid #FECACA`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
                      <TIcon k="close" size={9} color={C.red}/>
                    </button>
                  )}
                </div>
                <div style={{position:'absolute',bottom:2,left:0,right:0,textAlign:'center',fontSize:8,color:C.textSm,fontFamily:FM,lineHeight:1}}>{i+1}</div>
              </div>
            )
          })}
          <button onClick={addPage} style={{flexShrink:0,width:50,height:72,border:`2px dashed ${C.borderSt}`,borderRadius:8,background:'transparent',cursor:'pointer',fontSize:10,fontWeight:600,color:C.textMd,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all .12s',fontFamily:F}} onMouseOver={e=>{(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget).style.borderColor=C.borderSt;(e.currentTarget).style.color=C.textMd}}>
            <TIcon k="plus" size={13} color="currentColor"/>Add
          </button>
        </div>
        <div style={{padding:'0 12px',borderLeft:`1px solid ${C.border}`,height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F}}>{curPage+1} / {pages.length}</span>
          <span style={{fontSize:10,color:C.textSm,fontFamily:F}}>pages</span>
        </div>
      </div>

      {/* ══ DOCUMENT TYPE MODAL ════════════════════════════════════════════════ */}
      {showTypeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
          <div style={{background:C.panel,borderRadius:20,width:'min(920px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.22)',border:`1px solid ${C.border}`}}>
            <div style={{padding:'26px 28px 18px',flexShrink:0}}>
              <h2 style={{margin:'0 0 6px',fontSize:22,fontWeight:800,color:C.text,fontFamily:F}}>What are you creating?</h2>
              <p style={{margin:0,fontSize:14,color:C.textMd,fontFamily:F}}>Folio sets the right canvas size automatically.</p>
            </div>
            <div style={{overflow:'auto',padding:'0 28px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:12}}>
                {DOC_TYPES.map(t=>(
                  <button key={t.id} onClick={()=>selectDocType(t.id)}
                    style={{border:`2px solid ${docType===t.id?C.accent:C.border}`,borderRadius:14,padding:'18px 16px',cursor:'pointer',background:docType===t.id?C.accentLt:'#fff',textAlign:'left',transition:'all .15s',fontFamily:F}}
                    onMouseOver={e=>{if(docType!==t.id){(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.transform='translateY(-2px)';(e.currentTarget).style.boxShadow=C.shadowMd}}}
                    onMouseOut={e=>{if(docType!==t.id){(e.currentTarget).style.borderColor=C.border;(e.currentTarget).style.transform='';(e.currentTarget).style.boxShadow=''}}}>
                    <div style={{fontSize:34,marginBottom:12,lineHeight:1}}>{t.icon}</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{t.label}</div>
                    {t.sign && <span style={{fontSize:10,padding:'2px 7px',background:'#DCFCE7',color:C.green,borderRadius:20,fontWeight:700}}>✓ Signing</span>}
                  </button>
                ))}
              </div>
              {!isFirstOpen && (
                <div style={{textAlign:'center',marginTop:18}}>
                  <button onClick={()=>setShowTypeModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:C.textMd,textDecoration:'underline',fontFamily:F}}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ SHARE ══════════════════════════════════════════════════════════════ */}
      {showShare && <ShareDrawer documentId={params.id} links={shareLinks} onClose={()=>setShowShare(false)} onRefresh={loadLinks} isActive={isActive} onPublish={publish} supportsSign={supSign}/>}

      {/* ══ AI DRAFTER ══════════════════════════════════════════════════════════ */}
      {showDrafter && (
        <AIDrafter documentType={doc?.type??'document'} onDraftComplete={(html:string)=>{
          const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
          const stripped=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
          const np=pg('#ffffff',[tx(stripped,{l:60,t:60,w:cWRef.current-120,fs:15,ff:'Inter',fill:'#111111',lh:1.6})])
          const upd=[...pagesRef.current,np]; pagesRef.current=upd; setPages(upd)
          const ni=upd.length-1; setCurPage(ni); cpRef.current=ni
          loadIntoFabric(np,cWRef.current,cHRef.current); scheduleSave()
        }} onClose={()=>setShowDrafter(false)}/>
      )}

      {/* ══ SIGN MODAL ══════════════════════════════════════════════════════════ */}
      {showSign && (
        <SignModal signerName="" onSign={(dataUrl:string)=>{
          const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
          fab.Image.fromURL(dataUrl,(img:any)=>{
            const s=Math.min(cWRef.current*.36/img.width,cHRef.current*.22/img.height,1)
            img.set({left:Math.round(cWRef.current*.32),top:Math.round(cHRef.current*.66),scaleX:s,scaleY:s})
            fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHist();scheduleSave()
          })
          setShowSign(false)
        }} onClose={()=>setShowSign(false)}/>
      )}

      {/* ══ EXPORT MODAL ═══════════════════════════════════════════════════════ */}
      {showExport && (
        <ExportModal pageCount={pages.length} docTitle={title||'Document'} onExport={handleExport} onClose={()=>setShowExport(false)} isExporting={isExporting}/>
      )}

      {/* ══ CHART BUILDER ══════════════════════════════════════════════════════ */}
      {showChart && (
        <ChartBuilder onAdd={(dataUrl:string)=>{
          const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
          fab.Image.fromURL(dataUrl,(img:any)=>{
            const s=Math.min(cWRef.current*.65/img.width,cHRef.current*.65/img.height,1)
            img.set({left:Math.round(cWRef.current*.17),top:Math.round(cHRef.current*.17),scaleX:s,scaleY:s})
            fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHist()
          })
          setShowChart(false)
        }} onClose={()=>setShowChart(false)}/>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
function ShareDrawer({ documentId, links, onClose, onRefresh, isActive, onPublish, supportsSign }: {
  documentId:string; links:ShareLink[]; onClose:()=>void; onRefresh:()=>void;
  isActive:boolean; onPublish:()=>void; supportsSign:boolean
}) {
  const [creating, setCreating] = useState(false)
  const [label, setLabel]       = useState('')
  const [reqEmail, setReqEmail] = useState(false)
  const [pw, setPw]             = useState('')
  const [copied, setCopied]     = useState<string|null>(null)
  const [showNew, setShowNew]   = useState(links.length===0)

  async function create() {
    setCreating(true)
    const token = generateToken(14)
    await supabase.from('share_links').insert({ document_id:documentId, token, label:label||'Share link', require_email:reqEmail, password:pw||null, is_active:true })
    await onRefresh(); setShowNew(false); setLabel(''); setPw(''); setReqEmail(false); setCreating(false)
  }
  function copy(token:string) { navigator.clipboard.writeText(buildShareUrl(token)); setCopied(token); setTimeout(()=>setCopied(null),2000) }
  async function toggle(id:string,active:boolean) { await supabase.from('share_links').update({is_active:active}).eq('id',id); onRefresh() }
  async function del(id:string) { await supabase.from('share_links').delete().eq('id',id); onRefresh() }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.42)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'flex-end',backdropFilter:'blur(6px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{width:420,height:'100vh',background:'#fff',borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',boxShadow:'-20px 0 60px rgba(0,0,0,.12)'}}>
        <div style={{padding:'20px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <h2 style={{margin:'0 0 3px',fontSize:18,fontWeight:800,color:C.text,fontFamily:F}}>Share & Track</h2>
            <p style={{margin:0,fontSize:12,color:C.textSm,fontFamily:F}}>{links.length} link{links.length!==1?'s':''} · {links.reduce((a,l)=>a+(l.view_count||0),0)} views</p>
          </div>
          <button onClick={onClose} style={{width:30,height:30,background:C.hover,border:`1px solid ${C.border}`,cursor:'pointer',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}><TIcon k="close" size={13} color={C.textMd}/></button>
        </div>

        {!isActive && (
          <div style={{margin:'12px 14px 0',padding:'13px 14px',background:'#FFFBEB',border:`1px solid #FDE68A`,borderRadius:10}}>
            <p style={{margin:'0 0 3px',fontSize:13,fontWeight:700,color:'#92400E',fontFamily:F}}>Not published yet</p>
            <p style={{margin:'0 0 8px',fontSize:12,color:'#A16207',fontFamily:F}}>Publish to enable sharing.</p>
            <button onClick={onPublish} style={{padding:'6px 14px',borderRadius:7,background:C.amber,color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:F}}>Publish now</button>
          </div>
        )}

        <div style={{flex:1,overflow:'auto',padding:'0 14px 14px'}}>
          {links.length>0 && (
            <div style={{marginBottom:14}}>
              <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',margin:'14px 0 9px',fontFamily:F}}>Active Links</p>
              {links.map(link=>(
                <div key={link.id} style={{border:`1px solid ${C.border}`,borderRadius:11,padding:'13px 14px',marginBottom:8,background:C.panelSub}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:9}}>
                    <span style={{flex:1,fontSize:13,fontWeight:600,color:C.text,fontFamily:F}}>{link.label??'Share link'}</span>
                    <span style={{padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,background:link.is_active?'#DCFCE7':'#F1F5F9',color:link.is_active?C.green:C.textMd,border:`1px solid ${link.is_active?'#BBF7D0':C.border}`}}>{link.is_active?'LIVE':'OFF'}</span>
                  </div>
                  <div style={{display:'flex',gap:5,marginBottom:9}}>
                    <code style={{flex:1,fontSize:10,color:C.textMd,background:'#fff',padding:'5px 8px',borderRadius:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',border:`1px solid ${C.border}`,fontFamily:FM}}>{buildShareUrl(link.token)}</code>
                    <button onClick={()=>copy(link.token)} style={{padding:'5px 10px',background:copied===link.token?'#DCFCE7':'#fff',border:`1px solid ${copied===link.token?'#BBF7D0':C.border}`,borderRadius:7,fontSize:11,cursor:'pointer',color:copied===link.token?C.green:C.textSd,fontWeight:700,whiteSpace:'nowrap',fontFamily:F,transition:'all .12s'}}>
                      {copied===link.token?'✓ Copied':'Copy'}
                    </button>
                  </div>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:12,color:C.textMd,fontFamily:F}}>{link.view_count??0} views</span>
                    <button onClick={()=>toggle(link.id,!link.is_active)} style={{fontSize:12,color:C.accent,background:'none',border:'none',cursor:'pointer',fontWeight:700,fontFamily:F}}>{link.is_active?'Disable':'Enable'}</button>
                    <button onClick={()=>del(link.id)} style={{fontSize:12,color:C.red,background:'none',border:'none',cursor:'pointer',fontWeight:700,fontFamily:F}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showNew ? (
            <div style={{border:`1px solid ${C.border}`,borderRadius:11,padding:14,background:C.panelSub}}>
              <p style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12,fontFamily:F}}>New share link</p>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div><p style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:4,fontFamily:F}}>Label</p>
                  <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Acme Corp" style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,background:'#fff',outline:'none',fontFamily:F}}/></div>
                <div><p style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:4,fontFamily:F}}>Password (optional)</p>
                  <input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Leave blank for none" style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,background:'#fff',outline:'none',fontFamily:F}}/></div>
                <label style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:C.text,cursor:'pointer',fontFamily:F}}><input type="checkbox" checked={reqEmail} onChange={e=>setReqEmail(e.target.checked)} style={{accentColor:C.accent,width:15,height:15}}/> Require email to view</label>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setShowNew(false)} style={{flex:1,padding:'9px',border:`1.5px solid ${C.border}`,borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,color:C.textSd,fontFamily:F}}>Cancel</button>
                  <button onClick={create} disabled={creating} style={{flex:1,padding:'9px',border:'none',borderRadius:8,background:C.accent,color:'#fff',fontSize:13,cursor:'pointer',fontWeight:800,opacity:creating?.55:1,fontFamily:F}}>
                    {creating?'Creating…':'Create link'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowNew(true)} style={{width:'100%',padding:'10px',border:`2px dashed ${C.borderSt}`,borderRadius:10,background:'transparent',cursor:'pointer',fontSize:13,color:C.textSd,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:F,transition:'all .13s'}} onMouseOver={e=>{(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget).style.borderColor=C.borderSt;(e.currentTarget).style.color=C.textSd}}>
              <TIcon k="plus" size={13} color="currentColor"/>New link
            </button>
          )}
        </div>

        <div style={{padding:'12px 14px',borderTop:`1px solid ${C.border}`,background:C.panelSub}}>
          <p style={{fontSize:11,color:C.textMd,margin:'0 0 4px',fontWeight:600,fontFamily:F}}>📊 Every view tracked automatically</p>
          <p style={{fontSize:10,color:C.textSm,margin:0,lineHeight:1.55,fontFamily:F}}>Page dwell time · Forwarding detection · AI insights · Engagement score</p>
        </div>
      </div>
    </div>
  )
}