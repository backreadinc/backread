'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { buildShareUrl, generateToken } from '@/lib/utils'
import AIDrafter from '@/components/editor/AIDrafter'
import SignModal from '@/components/editor/SignModal'
import ExportModal from '@/components/editor/ExportModal'
import ChartBuilder from '@/components/editor/ChartBuilder'
import { LAYOUTS, LAYOUT_CATS } from '@/lib/layouts'
import { ICON_LIB, ICON_CATS } from '@/lib/icons'
import type { Database } from '@/lib/supabase/client'

type Doc       = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg      : '#E8E4DF',
  desk    : '#D4CFC9',
  panel   : '#FFFFFF',
  panelSub: '#F7F6F4',
  hover   : '#F0EEEc',
  border  : '#E4E0DB',
  borderSt: '#C8C3BC',
  accent  : '#5B50E8',
  accentHv: '#4940D4',
  accentLt: '#EEEDFB',
  accentMd: '#BDB9F4',
  text    : '#0F0F0F',
  textSd  : '#2A2A2A',
  textMd  : '#6B6868',
  textSm  : '#9B9898',
  green   : '#16A34A',
  red     : '#DC2626',
  amber   : '#D97706',
  blue    : '#2563EB',
  shadow  : '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
  shadowMd: '0 4px 16px rgba(0,0,0,.1)',
  shadowLg: '0 12px 40px rgba(0,0,0,.14)',
}
const Fui  = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
const Fmono = "'JetBrains Mono', 'Fira Code', monospace"

// ─── SVG Icon library — clean, professional Heroicons-style ──────────────────
function Ic({ d, size=16, stroke=C.textMd, fill='none', strokeWidth=1.6 }: { d:string|React.ReactNode; size?:number; stroke?:string; fill?:string; strokeWidth?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {typeof d === 'string' ? <path d={d}/> : d}
    </svg>
  )
}

const ICO = {
  cursor  : 'M4 2l16 9-7 2-3 7z',
  text    : 'M4 7V5h16v2M9 5v14M15 5v14M7 19h5M12 19h5',
  pencil  : 'M17 3a2.83 2.83 0 014 4L7.5 20.5 2 22l1.5-5.5L17 3z',
  undo    : 'M3 7v6h6M3 13A9 9 0 1121 12',
  redo    : 'M21 7v6h-6M21 13A9 9 0 113 12',
  trash   : 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  copy    : 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2',
  share   : 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  eye     : 'M1 12S5 4 12 4s11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
  eyeOff  : 'M17.94 17.94A10 10 0 0112 20C5 20 1 12 1 12a18.1 18.1 0 015.06-5.94M9.9 4.24A9.1 9.1 0 0112 4c7 0 11 8 11 8a18.3 18.3 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22',
  lock    : 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  bold    : 'M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z',
  italic  : 'M19 4h-9M14 20H5M15 4L9 20',
  underline: 'M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16',
  alignL  : 'M21 10H3M21 6H3M21 14H3M14 18H3',
  alignC  : 'M21 10H3M21 6H3M21 14H3M17 18H7',
  alignR  : 'M21 10H3M21 6H3M21 14H3M21 18H11',
  plus    : 'M12 5v14M5 12h14',
  minus   : 'M5 12h14',
  chevD   : 'M6 9l6 6 6-6',
  chevL   : 'M15 18l-6-6 6-6',
  chevR   : 'M9 18l6-6-6-6',
  close   : 'M18 6L6 18M6 6l12 12',
  check   : 'M20 6L9 17l-5-5',
  sparkle : 'M12 2l2.4 7.4H22l-6.4 4.6L18 21l-6-4.3L6 21l2.4-7-6.4-4.6H9.6L12 2z',
  image   : 'M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4l2 3h9a2 2 0 012 2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
  layers  : 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  layout  : 'M12 3H3v7h9V3zM21 3h-7v7h7V3zM21 13h-7v8h7v-8zM12 13H3v8h9v-8z',
  type    : 'M4 6h16M4 12h10M4 18h6',
  media   : 'M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  sign    : 'M15.232 5.232l3.536 3.536M9 11l6.464-6.464a2 2 0 012.829 2.829L11.828 13.83a4 4 0 01-1.414.943l-3.536 1.179 1.179-3.536A4 4 0 019 11z',
  zoomIn  : 'M11 8v6M8 11h6M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  zoomOut : 'M8 11h6M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  refresh : 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  grid    : 'M10 3H3v7h7V3zM21 3h-7v7h7V3zM21 14h-7v7h7v-7zM10 14H3v7h7v-7z',
  link    : 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',
}

function Icon({ name, size=15, color=C.textMd, fill='none', w=1.7 }: { name: keyof typeof ICO; size?:number; color?:string; fill?:string; w?:number }) {
  return <Ic d={ICO[name]} size={size} stroke={color} fill={fill} strokeWidth={w}/>
}

// ─── Document types ────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { id:'pitch_deck',      label:'Pitch Deck',      desc:'Fundraising & investors',       icon:'🚀', size:'pres-169', sign:false },
  { id:'sales_proposal',  label:'Sales Proposal',  desc:'Win clients & close deals',     icon:'💼', size:'a4-p',    sign:true  },
  { id:'business_report', label:'Business Report', desc:'Strategy & research',           icon:'📊', size:'a4-p',    sign:true  },
  { id:'one_pager',       label:'One-Pager',        desc:'Quick overview, leave-behind',  icon:'📄', size:'a4-p',    sign:true  },
  { id:'social_post',     label:'Social Post',      desc:'LinkedIn, Twitter, Instagram',  icon:'📱', size:'sq',      sign:false },
  { id:'presentation',    label:'Presentation',     desc:'Team, conference, training',    icon:'🖥', size:'pres-169',sign:false },
  { id:'media_kit',       label:'Media Kit',        desc:'Press, sponsorship, PR',        icon:'🎨', size:'pres-169',sign:false },
  { id:'contract',        label:'Contract / NDA',   desc:'Legal documents & agreements',  icon:'✍', size:'a4-p',    sign:true  },
]

const TYPE_LAYOUT: Record<string,string> = {
  pitch_deck:'hero-dark', sales_proposal:'prop-cover', business_report:'editorial',
  one_pager:'hero-light', social_post:'minimal-dark', presentation:'hero-gradient',
  media_kit:'hero-split', contract:'prop-cover',
}

// ─── Canvas sizes ──────────────────────────────────────────────────────────────
const SIZES = [
  { id:'pres-169', label:'Presentation 16:9', w:1280, h:720  },
  { id:'pres-43',  label:'Presentation 4:3',  w:1024, h:768  },
  { id:'a4-p',     label:'A4 Portrait',       w:794,  h:1123 },
  { id:'a4-l',     label:'A4 Landscape',      w:1123, h:794  },
  { id:'sq',       label:'Square 1:1',        w:1080, h:1080 },
  { id:'story',    label:'Story / Reel',      w:540,  h:960  },
  { id:'linkedin', label:'LinkedIn Banner',   w:1584, h:396  },
  { id:'twitter',  label:'Twitter Header',    w:1500, h:500  },
]

// ─── Font list ─────────────────────────────────────────────────────────────────
const FONTS = [
  { name:'Inter',                cat:'Sans' },
  { name:'Plus Jakarta Sans',    cat:'Sans' },
  { name:'DM Sans',              cat:'Sans' },
  { name:'Outfit',               cat:'Sans' },
  { name:'Syne',                 cat:'Sans' },
  { name:'Manrope',              cat:'Sans' },
  { name:'Rubik',                cat:'Sans' },
  { name:'Work Sans',            cat:'Sans' },
  { name:'Nunito',               cat:'Rounded' },
  { name:'Poppins',              cat:'Rounded' },
  { name:'Quicksand',            cat:'Rounded' },
  { name:'Raleway',              cat:'Sans' },
  { name:'Montserrat',           cat:'Sans' },
  { name:'Open Sans',            cat:'Sans' },
  { name:'Lato',                 cat:'Sans' },
  { name:'Barlow',               cat:'Sans' },
  { name:'Space Grotesk',        cat:'Sans' },
  { name:'Playfair Display',     cat:'Serif' },
  { name:'Cormorant Garamond',   cat:'Serif' },
  { name:'Merriweather',         cat:'Serif' },
  { name:'Lora',                 cat:'Serif' },
  { name:'EB Garamond',          cat:'Serif' },
  { name:'Libre Baskerville',    cat:'Serif' },
  { name:'Crimson Text',         cat:'Serif' },
  { name:'Oswald',               cat:'Display' },
  { name:'Bebas Neue',           cat:'Display' },
  { name:'Anton',                cat:'Display' },
  { name:'Righteous',            cat:'Display' },
  { name:'Teko',                 cat:'Display' },
  { name:'JetBrains Mono',       cat:'Mono' },
  { name:'IBM Plex Mono',        cat:'Mono' },
  { name:'Space Mono',           cat:'Mono' },
  { name:'Roboto Mono',          cat:'Mono' },
  { name:'Fira Code',            cat:'Mono' },
  { name:'Caveat',               cat:'Handwriting' },
  { name:'Dancing Script',       cat:'Handwriting' },
  { name:'Pacifico',             cat:'Handwriting' },
  { name:'Satisfy',              cat:'Handwriting' },
]

const BLENDS = ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion']

const COLOR_SWATCHES = [
  '#000000','#1A1A2E','#16213E','#0F3460',
  '#533483','#6B35B4','#9B59B6','#BB8FCE',
  '#E74C3C','#E55039','#F39C12','#F1C40F',
  '#1ABC9C','#16A085','#27AE60','#2ECC71',
  '#2980B9','#3498DB','#5B50E8','#8E44AD',
  '#F97316','#EF4444','#EC4899','#06B6D4',
  '#FFFFFF','#F8FAFC','#E2E8F0','#94A3B8',
]

// ─── Fabric helpers ────────────────────────────────────────────────────────────
function pg(bg='#ffffff', objects:any[]=[]) { return { version:'5.3.0', objects, background:bg } }
function sc(base:number, W:number) { return Math.max(Math.round(base*(W/1280)), Math.round(base*0.5)) }
function tx(text:string, o:any={}):any {
  return { type:'textbox', left:o.l??60, top:o.t??60, width:o.w??400, text,
    fontSize:o.fs??16, fontFamily:o.ff??'Inter', fill:o.fill??'#0F0F0F',
    fontWeight:o.fw??'400', lineHeight:o.lh??1.35, textAlign:o.ta??'left', opacity:1, selectable:true, editable:true }
}
function bx(o:any={}):any {
  return { type:'rect', left:o.l??0, top:o.t??0, width:o.w??200, height:o.h??60,
    fill:o.fill??'#5B50E8', rx:o.rx??0, ry:o.rx??0, selectable:true, opacity:o.op??1 }
}

// Layouts imported from @/lib/layouts above


// ─── Reusable controls ─────────────────────────────────────────────────────────
const UI:React.CSSProperties = { fontFamily:Fui }

function NumInput({ label, value, onChange, step=1, min, max }:{ label:string; value:number; onChange:(v:number)=>void; step?:number; min?:number; max?:number }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, color:C.textMd, marginBottom:4, fontFamily:Fui, letterSpacing:'.01em' }}>{label}</div>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={e => onChange(parseFloat(e.target.value)||0)}
        style={{ width:'100%', padding:'6px 9px', border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:Fmono, color:C.text, background:'#fff', outline:'none', transition:'border .15s' }}
        onFocus={e => e.target.style.borderColor=C.accent}
        onBlur={e => e.target.style.borderColor=C.border}/>
    </div>
  )
}

function RangeInput({ label, value, min, max, onChange }:{ label:string; value:number; min:number; max:number; onChange:(v:number)=>void }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:11, fontWeight:600, color:C.textMd, fontFamily:Fui }}>{label}</span>
        <span style={{ fontSize:11, color:C.textSm, fontFamily:Fmono }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:C.accent, cursor:'pointer', height:4 }}/>
    </div>
  )
}

// ─── Proper color picker ──────────────────────────────────────────────────────
function ColorInput({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value.replace('#',''))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setHex(value.replace('#','')) }, [value])
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function commitHex(v: string) {
    const clean = v.replace(/[^0-9a-fA-F]/g,'').slice(0,6)
    setHex(clean)
    if (clean.length === 6) onChange('#'+clean)
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {label && <div style={{ fontSize:11, fontWeight:600, color:C.textMd, marginBottom:6, fontFamily:Fui }}>{label}</div>}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={() => setOpen(!open)} style={{ width:36, height:36, borderRadius:9, border:`2px solid ${C.border}`, background:value, cursor:'pointer', flexShrink:0, boxShadow:C.shadow, transition:'border-color .15s' }}
          onMouseOver={e => (e.currentTarget.style.borderColor=C.accent)} onMouseOut={e => (e.currentTarget.style.borderColor=C.border)}/>
        <div style={{ display:'flex', alignItems:'center', flex:1, border:`1.5px solid ${C.border}`, borderRadius:8, overflow:'hidden', background:'#fff' }}>
          <span style={{ padding:'0 8px', color:C.textSm, fontSize:12, fontFamily:Fmono, userSelect:'none' }}>#</span>
          <input value={hex.toUpperCase()} onChange={e => commitHex(e.target.value)}
            style={{ border:'none', outline:'none', width:'100%', fontSize:12, fontFamily:Fmono, padding:'7px 8px 7px 0', color:C.text, background:'transparent' }}/>
        </div>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:500, marginTop:8, background:'#fff', borderRadius:14, boxShadow:C.shadowLg, padding:16, border:`1px solid ${C.border}`, width:248 }}>
          {/* Native color wheel */}
          <input type="color" value={value} onChange={e => { onChange(e.target.value); setHex(e.target.value.replace('#','')) }}
            style={{ width:'100%', height:140, border:'none', borderRadius:10, cursor:'pointer', marginBottom:12, display:'block' }}/>
          {/* Swatches */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:5 }}>
            {COLOR_SWATCHES.map(sw => (
              <button key={sw} onClick={() => { onChange(sw); setHex(sw.replace('#','')); setOpen(false) }}
                style={{ width:22, height:22, borderRadius:5, background:sw, border:`1.5px solid ${value.toLowerCase()===sw.toLowerCase()?C.accent:sw==='#FFFFFF'?C.border:'transparent'}`, cursor:'pointer', padding:0, transition:'transform .1s', boxShadow:C.shadow }}
                onMouseOver={e => (e.currentTarget.style.transform='scale(1.15)')} onMouseOut={e => (e.currentTarget.style.transform='scale(1)')}/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section accordion ────────────────────────────────────────────────────────
function Sec({ label, children, defaultOpen=true }: { label:string; children:React.ReactNode; defaultOpen?:boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom:`1px solid ${C.border}` }}>
      <button onClick={() => setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', border:'none', background:'none', cursor:'pointer', padding:'10px 16px 8px' }}>
        <span style={{ fontSize:10, fontWeight:700, color:C.textMd, textTransform:'uppercase', letterSpacing:'.09em', fontFamily:Fui }}>{label}</span>
        <span style={{ transform:open?'rotate(0)':'rotate(-90deg)', transition:'transform .15s', color:C.textSm, display:'flex' }}>
          <Icon name="chevD" size={12} color={C.textSm}/>
        </span>
      </button>
      {open && <div style={{ padding:'0 16px 14px' }}>{children}</div>}
    </div>
  )
}

// ─── Icon button ───────────────────────────────────────────────────────────────
function IBtn({ icon, label, active=false, onClick, danger=false, size=15 }: { icon:keyof typeof ICO; label:string; active?:boolean; onClick:()=>void; danger?:boolean; size?:number }) {
  const [hov, setHov] = useState(false)
  return (
    <button title={label} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width:34, height:32, border:'none', cursor:'pointer', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .12s', flexShrink:0,
        background: active ? C.accentLt : danger && hov ? '#FEF2F2' : hov ? C.hover : 'transparent',
        color: active ? C.accent : danger ? C.red : hov ? C.text : C.textMd,
        outline:'none',
      }}>
      <Icon name={icon} size={size} color={active?C.accent:danger?C.red:hov?C.text:C.textMd} w={1.7}/>
    </button>
  )
}

// ─── Tag button (toggles) ──────────────────────────────────────────────────────
function Tag({ on, children, onClick }: { on:boolean; children:React.ReactNode; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ padding:'5px 10px', fontSize:12, fontWeight:600, fontFamily:Fui, border:`1.5px solid ${on?C.accent:C.border}`, borderRadius:7, background:on?C.accentLt:'#fff', color:on?C.accent:C.textMd, cursor:'pointer', transition:'all .12s', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN EDITOR COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc, setDoc]         = useState<Doc|null>(null)
  const [title, setTitle]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [lastSaved, setLastSaved] = useState<Date|null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])

  // Modals & overlays
  const [showTypeModal, setShowTypeModal]   = useState(false)
  const [isFirstOpen, setIsFirstOpen]       = useState(false)
  const [showShare, setShowShare]           = useState(false)
  const [showDrafter, setShowDrafter]       = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showSizeMenu, setShowSizeMenu]     = useState(false)
  const [showSignModal, setShowSignModal]   = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showChartBuilder, setShowChartBuilder] = useState(false)
  const [isExporting, setIsExporting]       = useState(false)

  // Panel collapse
  const [leftOpen, setLeftOpen]   = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  // Canvas
  const canvasEl  = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const fabricLib = useRef<any>(null)
  const fabricReady = useRef(false)

  // Pages
  const [pages, setPages]             = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [thumbnails, setThumbs]       = useState<Record<number,string>>({})
  const [leftTab, setLeftTab]         = useState<'layouts'|'elements'|'text'|'media'|'icons'|'layers'>('layouts')
  const [iconSearch, setIconSearch]     = useState('')
  const [iconCat, setIconCat]           = useState('All')
  const [layoutCat, setLayoutCat]     = useState('All')

  // Canvas settings
  const [canvasW, setCanvasW] = useState(1280)
  const [canvasH, setCanvasH] = useState(720)
  const [zoom, setZoom]       = useState(0.58)
  const [docType, setDocType] = useState('pitch_deck')

  // Tool state
  const [activeTool, setActiveTool] = useState('select')
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [brushSize, setBrushSize]     = useState(3)

  // Style state (synced from selected object)
  const [fontColor, setFontColor]   = useState('#0F0F0F')
  const [fillColor, setFillColor]   = useState('#5B50E8')
  const [bgColor, setBgColor]       = useState('#ffffff')
  const [fontSize, setFontSize]     = useState(18)
  const [fontFamily, setFontFamily] = useState('Inter')
  const [fontSearch, setFontSearch] = useState('')
  const [fontCat, setFontCat]       = useState('All')
  const [showFontPicker, setShowFontPicker] = useState(false)

  // Image filters state
  const [imgBrightness, setImgBrightness] = useState(0)
  const [imgContrast,   setImgContrast]   = useState(0)
  const [imgSaturation, setImgSaturation] = useState(0)
  const [imgBlur,       setImgBlur]       = useState(0)

  // Photos
  const [photos, setPhotos]           = useState<any[]>([])
  const [photoSearch, setPhotoSearch] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoPage, setPhotoPage]     = useState(1)

  // Refs for stable callbacks
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
  useEffect(() => { cpRef.current = currentPage }, [currentPage])
  useEffect(() => { cWRef.current = canvasW }, [canvasW])
  useEffect(() => { cHRef.current = canvasH }, [canvasH])
  useEffect(() => { zRef.current = zoom }, [zoom])

  // Persist panel state
  useEffect(() => {
    try { const l=localStorage.getItem('folio_left'); const r=localStorage.getItem('folio_right'); if(l)setLeftOpen(l==='1'); if(r)setRightOpen(r==='1') } catch(e){}
  }, [])
  function toggleLeft() { setLeftOpen(v => { const n=!v; try{localStorage.setItem('folio_left',n?'1':'0')}catch(e){}; return n }) }
  function toggleRight() { setRightOpen(v => { const n=!v; try{localStorage.setItem('folio_right',n?'1':'0')}catch(e){}; return n }) }

  // Font preloading
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Cormorant+Garamond:wght@300;400;500;600;700;900&display=swap'
    document.head.appendChild(link)
  }, [])

  // Init
  useEffect(() => {
    if (!(window as any).fabric) {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
      s.onload = () => initFabric()
      document.head.appendChild(s)
    } else { initFabric() }
    if (!(window as any).jspdf) {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      document.head.appendChild(s)
    }
    loadDoc()
    loadLinks()
    loadPhotos()
  }, [params.id]) // eslint-disable-line

  async function loadDoc() {
    const { data } = await supabase.from('documents').select('*').eq('id', params.id).single()
    if (!data) { router.push('/dashboard'); return }
    setDoc(data); setTitle(data.title)
    const cd = (data as any).canvas_data
    if (cd?.pages?.length) {
      setPages(cd.pages); pagesRef.current = cd.pages
      if (cd.canvasW) { setCanvasW(cd.canvasW); cWRef.current = cd.canvasW }
      if (cd.canvasH) { setCanvasH(cd.canvasH); cHRef.current = cd.canvasH }
      if (cd.docType) setDocType(cd.docType)
      loadIntoFabric(cd.pages[0], cd.canvasW||1280, cd.canvasH||720)
    } else { setIsFirstOpen(true); setShowTypeModal(true) }
  }
  async function loadLinks() {
    const { data } = await supabase.from('share_links').select('*').eq('document_id', params.id).order('created_at', { ascending:false })
    setShareLinks(data ?? [])
  }

  // ── Photos via Picsum (no API key needed) ────────────────────────────────────
  async function loadPhotos(query='', page=1) {
    setPhotoLoading(true)
    try {
      if (query) {
        // Picsum doesn't support search — use different seeds based on query hash
        const seed = query.split('').reduce((a,c) => a+c.charCodeAt(0), 0)
        const results = Array.from({length:24}, (_,i) => ({
          id: `${seed}-${i}`,
          url: `https://picsum.photos/seed/${seed+i}/800/600`,
          thumb: `https://picsum.photos/seed/${seed+i}/400/300`,
          author: 'Picsum Photos',
        }))
        setPhotos(results)
      } else {
        const res = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=30`)
        const data = await res.json()
        const results = data.map((p:any) => ({
          id: p.id,
          url: `https://picsum.photos/id/${p.id}/800/600`,
          thumb: `https://picsum.photos/id/${p.id}/400/300`,
          author: p.author,
        }))
        setPhotos(page > 1 ? prev => [...prev, ...results] : results)
      }
    } catch(e) {}
    setPhotoLoading(false)
  }

  // ── Fabric init — sharp rendering ────────────────────────────────────────────
  function initFabric() {
    if (fabricReady.current || !canvasEl.current) return
    if (!(window as any).fabric) { setTimeout(initFabric, 80); return }
    const fab = (window as any).fabric
    fabricLib.current = fab
    const W = cWRef.current, H = cHRef.current, z = zRef.current
    const fc = new fab.Canvas(canvasEl.current, {
      width: Math.round(W*z), height: Math.round(H*z),
      backgroundColor: '#ffffff',
      selection: true, preserveObjectStacking: true,
      enableRetinaScaling: true, // Fabric handles DPR internally
    })
    fc.setZoom(z)
    fabricRef.current = fc; (window as any).__fabricCanvas = fc
    fabricReady.current = true

    // Alignment guides
    let vLine:any=null, hLine:any=null
    fc.on('object:moving', (e:any) => {
      if(vLine){fc.remove(vLine);vLine=null}; if(hLine){fc.remove(hLine);hLine=null}
      const o=e.target, W=cWRef.current, H=cHRef.current
      const cx=o.left+(o.width*(o.scaleX||1))/2, cy=o.top+(o.height*(o.scaleY||1))/2
      if(Math.abs(cx-W/2)<8){o.set('left',W/2-(o.width*(o.scaleX||1))/2);vLine=new fab.Line([W/2,0,W/2,H],{stroke:'#EF4444',strokeWidth:.5,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.55});fc.add(vLine)}
      if(Math.abs(cy-H/2)<8){o.set('top',H/2-(o.height*(o.scaleY||1))/2);hLine=new fab.Line([0,H/2,W,H/2],{stroke:'#EF4444',strokeWidth:.5,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.55});fc.add(hLine)}
    })
    fc.on('object:moved', () => { if(vLine){fc.remove(vLine);vLine=null}; if(hLine){fc.remove(hLine);hLine=null}; fc.renderAll(); scheduleSave() })
    fc.on('object:modified', () => { scheduleSave(); captureThumb(cpRef.current) })
    fc.on('selection:created', (e:any) => syncSel(e.selected?.[0]))
    fc.on('selection:updated', (e:any) => syncSel(e.selected?.[0]))
    fc.on('selection:cleared', () => setSelectedObj(null))
    fc.on('text:changed', () => scheduleSave())
    fc.on('path:created', () => pushHist())
  }

  function applyZoom(z:number) {
    const fc = fabricRef.current; if(!fc) return
    fc.setWidth(Math.round(cWRef.current*z))
    fc.setHeight(Math.round(cHRef.current*z))
    fc.setZoom(z); fc.renderAll()
  }

  // ── History ───────────────────────────────────────────────────────────────────
  function pushHist() {
    if(isUR.current || !fabricRef.current) return
    const s = fabricRef.current.toJSON()
    histStack.current = histStack.current.slice(0, histIdx.current+1)
    if(histStack.current.length >= 60) histStack.current.shift()
    histStack.current.push(s); histIdx.current = histStack.current.length-1
  }
  function undo() { if(histIdx.current<=0) return; isUR.current=true; histIdx.current--; fabricRef.current?.loadFromJSON(histStack.current[histIdx.current], ()=>{fabricRef.current.renderAll(); isUR.current=false}) }
  function redo() { if(histIdx.current>=histStack.current.length-1) return; isUR.current=true; histIdx.current++; fabricRef.current?.loadFromJSON(histStack.current[histIdx.current], ()=>{fabricRef.current.renderAll(); isUR.current=false}) }

  function loadIntoFabric(json:any, W:number, H:number, z=zRef.current) {
    const go = () => {
      if (fabricRef.current) {
        fabricRef.current.setWidth(Math.round(W*z)); fabricRef.current.setHeight(Math.round(H*z))
        fabricRef.current.setZoom(z)
        fabricRef.current.loadFromJSON(json, () => { fabricRef.current.renderAll(); pushHist() })
      } else { setTimeout(go, 80) }
    }
    go()
  }

  function syncSel(obj:any) {
    if(!obj) return
    setSelectedObj(obj)
    if(obj.fontSize) setFontSize(obj.fontSize)
    if(obj.fontFamily) setFontFamily(obj.fontFamily)
    if(typeof obj.fill === 'string') setFontColor(obj.fill)
    // Reset image filter state
    if(obj.type === 'image') { setImgBrightness(0); setImgContrast(0); setImgSaturation(0); setImgBlur(0) }
  }

  function captureThumb(idx:number) {
    try {
      const url = fabricRef.current?.toDataURL({ format:'jpeg', quality:.28, multiplier:.08 })
      if(url) setThumbs(p => ({...p, [idx]:url}))
    } catch(e) {}
  }

  function scheduleSave() {
    if(saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveCanvas(), 1800)
  }

  const saveCanvas = useCallback(async () => {
    if(!fabricRef.current) return
    setSaving(true)
    const cur = fabricRef.current.toJSON()
    const all = [...pagesRef.current]; all[cpRef.current] = cur
    pagesRef.current = all; setPages([...all])
    await supabase.from('documents').update({
      canvas_data: { pages:all, canvasW:cWRef.current, canvasH:cHRef.current, docType },
      updated_at: new Date().toISOString()
    } as any).eq('id', params.id)
    setSaving(false); setLastSaved(new Date()); captureThumb(cpRef.current)
  }, [params.id, docType])

  async function saveTitle() { await supabase.from('documents').update({ title: title||'Untitled' }).eq('id', params.id) }
  async function publish() {
    await supabase.from('documents').update({ status:'active' }).eq('id', params.id)
    setDoc(p => p ? {...p, status:'active'} : p)
    setShowShare(true)
  }

  // ── Document type selection ───────────────────────────────────────────────────
  function selectDocType(typeId:string) {
    const t = DOC_TYPES.find(d => d.id===typeId); if(!t) return
    const sz = SIZES.find(s => s.id===t.size) || SIZES[0]
    setDocType(typeId); setCanvasW(sz.w); setCanvasH(sz.h); cWRef.current=sz.w; cHRef.current=sz.h
    const layout = LAYOUTS.find(l => l.id===TYPE_LAYOUT[typeId]) || LAYOUTS[0]
    const built = layout.build(sz.w, sz.h)
    pagesRef.current=[built]; setPages([built]); setCurrentPage(0); cpRef.current=0; setThumbs({})
    setShowTypeModal(false); setIsFirstOpen(false)
    loadIntoFabric(built, sz.w, sz.h)
    histStack.current=[]; histIdx.current=-1
  }

  // ── Pages ─────────────────────────────────────────────────────────────────────
  function switchPage(idx:number) {
    if(!fabricRef.current) return
    const upd=[...pagesRef.current]; upd[cpRef.current]=fabricRef.current.toJSON()
    pagesRef.current=upd; setPages([...upd]); setCurrentPage(idx); cpRef.current=idx
    loadIntoFabric(upd[idx], cWRef.current, cHRef.current)
    histStack.current=[]; histIdx.current=-1
  }
  function addPage() {
    if(!fabricRef.current) return
    const upd=[...pagesRef.current]; upd[cpRef.current]=fabricRef.current.toJSON()
    const blank=pg(bgColor), ni=upd.length
    upd.push(blank); pagesRef.current=upd; setPages([...upd]); setCurrentPage(ni); cpRef.current=ni
    loadIntoFabric(blank, cWRef.current, cHRef.current)
    histStack.current=[]; histIdx.current=-1
  }
  function dupPage(idx:number) {
    if(!fabricRef.current) return
    const upd=[...pagesRef.current]; upd[cpRef.current]=fabricRef.current.toJSON()
    upd.splice(idx+1, 0, JSON.parse(JSON.stringify(upd[idx])))
    pagesRef.current=upd; setPages([...upd]); switchPage(idx+1)
  }
  function delPage(idx:number) {
    if(pagesRef.current.length<=1) return
    const upd=pagesRef.current.filter((_:any,i:number) => i!==idx)
    pagesRef.current=upd; setPages([...upd])
    const ni=Math.min(cpRef.current, upd.length-1); setCurrentPage(ni); cpRef.current=ni
    loadIntoFabric(upd[ni], cWRef.current, cHRef.current)
  }

  function applyLayout(l:any) {
    if(!fabricRef.current) return
    const built = l.build(cWRef.current, cHRef.current)
    fabricRef.current.loadFromJSON(built, () => { fabricRef.current.renderAll(); pushHist(); scheduleSave() })
  }

  function changeSize(sizeId:string) {
    const sz = SIZES.find(s => s.id===sizeId); if(!sz) return
    setCanvasW(sz.w); setCanvasH(sz.h); cWRef.current=sz.w; cHRef.current=sz.h
    applyZoom(zRef.current); setShowSizeMenu(false)
  }

  // ── Tools ─────────────────────────────────────────────────────────────────────
  function setTool(t:string) {
    setActiveTool(t); const fc=fabricRef.current; if(!fc) return
    const fab=fabricLib.current||(window as any).fabric
    // Reset drawing mode
    fc.isDrawingMode = false
    fc.off('mouse:down.line'); fc.off('mouse:move.line'); fc.off('mouse:up.line')

    if (t === 'draw') {
      fc.isDrawingMode = true
      if (fc.freeDrawingBrush) { fc.freeDrawingBrush.color = fontColor; fc.freeDrawingBrush.width = brushSize }
    }
    if (t === 'erase') {
      fc.isDrawingMode = true
      if (fc.freeDrawingBrush) {
        fc.freeDrawingBrush.color = '#ffffff'
        fc.freeDrawingBrush.width = 24
      }
    }
    if (t === 'line') {
      if (!fab) return
      let isDown = false; let line: any = null; let origX = 0; let origY = 0
      const onDown = (o: any) => {
        isDown = true
        const p = fc.getPointer(o.e)
        origX = p.x; origY = p.y
        line = new fab.Line([origX, origY, origX, origY], { stroke: fillColor, strokeWidth: 2, selectable: true, originX: 'center', originY: 'center' })
        fc.add(line)
      }
      const onMove = (o: any) => {
        if (!isDown || !line) return
        const p = fc.getPointer(o.e)
        if (o.e.shiftKey) {
          // Snap to 45° increments
          const dx = p.x - origX; const dy = p.y - origY
          const angle = Math.round(Math.atan2(dy, dx) / (Math.PI/4)) * (Math.PI/4)
          const len = Math.sqrt(dx*dx + dy*dy)
          line.set({ x2: origX + len*Math.cos(angle), y2: origY + len*Math.sin(angle) })
        } else {
          line.set({ x2: p.x, y2: p.y })
        }
        fc.renderAll()
      }
      const onUp = () => { isDown = false; line = null; pushHist(); scheduleSave(); setActiveTool('select'); fc.isDrawingMode=false }
      fc.on('mouse:down', onDown); fc.on('mouse:move', onMove); fc.on('mouse:up', onUp)
      // Clean up on next tool change
      ;(fc as any).__lineHandlers = { onDown, onMove, onUp }
    } else if ((fc as any).__lineHandlers) {
      const h = (fc as any).__lineHandlers
      fc.off('mouse:down', h.onDown); fc.off('mouse:move', h.onMove); fc.off('mouse:up', h.onUp)
      ;(fc as any).__lineHandlers = null
    }
    if (t === 'text') {
      if (!fab) return
      const tb = new fab.Textbox('Click to edit', { left: 100, top: 100, width: 360, fontSize: 24, fontFamily, fill: fontColor, fontWeight: '400', editable: true, lineHeight: 1.35 })
      fc.add(tb); fc.setActiveObject(tb); fc.renderAll(); pushHist(); setActiveTool('select')
    }
  }

  // ── FONT SYSTEM — properly waits for font to load ─────────────────────────────
  function loadGoogleFont(family:string) {
    const safe = family.replace(/ /g, '+')
    if(document.querySelector(`link[data-f="${safe}"]`)) return
    const l = document.createElement('link')
    l.rel='stylesheet'; l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@300;400;500;600;700;800;900&display=swap`
    l.setAttribute('data-f', safe); document.head.appendChild(l)
  }

  async function applyFont(family:string) {
    loadGoogleFont(family)
    setFontFamily(family); setShowFontPicker(false)
    const fc = fabricRef.current; if(!fc) return
    const obj = fc.getActiveObject(); if(!obj) return
    obj.set('fontFamily', family)
    fc.requestRenderAll()
    // Wait for font to fully load then re-render for accuracy
    try {
      await document.fonts.ready
      obj.set('fontFamily', family)
      fc.requestRenderAll()
    } catch(e) {}
    scheduleSave()
  }

  // ── Apply property — with immediate re-render ─────────────────────────────────
  function upd(prop:string, val:any) {
    const fc=fabricRef.current; if(!fc) return
    const obj=fc.getActiveObject(); if(!obj) return
    obj.set(prop, val); fc.requestRenderAll(); scheduleSave()
  }

  // ── Image filters — actual Fabric filter API ──────────────────────────────────
  function applyImgFilters(b=imgBrightness, c=imgContrast, s=imgSaturation, bl=imgBlur) {
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current
    if(!fab||!fc) return
    const obj=fc.getActiveObject()
    if(!obj||obj.type!=='image') return
    const filters:any[] = []
    if(b!==0) filters.push(new fab.Image.filters.Brightness({ brightness:b/100 }))
    if(c!==0) filters.push(new fab.Image.filters.Contrast({ contrast:c/100 }))
    if(s!==0) filters.push(new fab.Image.filters.Saturation({ saturation:s/100 }))
    if(bl>0)  filters.push(new fab.Image.filters.Blur({ blur:bl/100 }))
    obj.filters=filters; obj.applyFilters(); fc.renderAll()
  }

  // ── Shapes & elements ─────────────────────────────────────────────────────────
  function addShape(type:string, opts:any={}) {
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
    const fill=opts.fill||fillColor; let shape:any
    if(type==='rect')     shape=new fab.Rect({left:120,top:120,width:220,height:110,fill,rx:opts.rx||0})
    else if(type==='circle') shape=new fab.Circle({left:120,top:120,radius:70,fill})
    else if(type==='triangle') shape=new fab.Triangle({left:120,top:120,width:140,height:120,fill})
    else if(type==='line') shape=new fab.Line([80,200,420,200],{stroke:fill,strokeWidth:3,selectable:true})
    else if(type==='star') {
      const pts:any[]=[], or=70, ir=30, cx=140, cy=140
      for(let i=0;i<10;i++){const r=i%2===0?or:ir,a=(i*Math.PI/5)-Math.PI/2;pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)})}
      shape=new fab.Polygon(pts,{fill,left:100,top:100})
    } else if(type==='diamond') {
      const pts=[{x:80,y:0},{x:160,y:80},{x:80,y:160},{x:0,y:80}]
      shape=new fab.Polygon(pts,{fill,left:100,top:100})
    } else if(type==='arrow') {
      shape=new fab.Path('M 0 30 L 80 30 L 80 15 L 110 40 L 80 65 L 80 50 L 0 50 Z',{fill,left:100,top:100,scaleX:.9,scaleY:.9})
    }
    if(shape){fc.add(shape);fc.setActiveObject(shape);fc.renderAll();pushHist()}
  }

  function addTable(rows=4, cols=3) {
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
    // Scale table to ~60% of canvas width
    const totalW = Math.round(cWRef.current * 0.62)
    const cw = Math.round(totalW / cols)
    const rh = 42
    const startX = Math.round(cWRef.current * 0.19)
    const startY = Math.round(cHRef.current * 0.22)
    const allObjs: any[] = []

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = startX + j * cw; const y = startY + i * rh
        const isHeader = i === 0; const isAlt = !isHeader && i % 2 === 0
        allObjs.push(new fab.Rect({
          left: x, top: y, width: cw, height: rh,
          fill: isHeader ? '#0F172A' : isAlt ? '#F8FAFC' : '#FFFFFF',
          stroke: '#E2E8F0', strokeWidth: 1,
          selectable: false, evented: false,
        }))
        allObjs.push(new fab.Textbox(isHeader ? `Column ${j+1}` : j === 0 ? `Row ${i}` : `Cell`, {
          left: x + 12, top: y + (rh - 14) / 2,
          width: cw - 24,
          fontSize: isHeader ? 12 : 12,
          fontFamily: 'Inter',
          fill: isHeader ? '#FFFFFF' : '#374151',
          fontWeight: isHeader ? '700' : '400',
          editable: true, selectable: true,
          lineHeight: 1,
        }))
      }
    }
    // Group background rects, keep texts individually selectable
    allObjs.forEach(o => fc.add(o))
    fc.renderAll(); pushHist()
  }

  function addSignatureBlock() {
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
    const bW=Math.round(cWRef.current*.38), bH=Math.round(cHRef.current*.22)
    const bX=Math.round(cWRef.current*.31), bY=Math.round(cHRef.current*.65)
    const objs=[
      new fab.Rect({left:0,top:0,width:bW,height:bH,fill:'#FAFAF8',stroke:'#D4CFC9',strokeWidth:1.5,rx:12,shadow:new fab.Shadow({color:'rgba(0,0,0,.06)',blur:16,offsetY:4})}),
      new fab.Textbox('Signature',{left:18,top:14,width:bW-36,fontSize:11,fontFamily:'Inter',fill:'#94A3B8',fontWeight:'600',selectable:false}),
      new fab.Line([18,bH-68,bW-18,bH-68],{stroke:'#E2E8F0',strokeWidth:1.5,selectable:false}),
      new fab.Textbox('Full legal name',{left:18,top:bH-52,width:bW-36,fontSize:10,fontFamily:'Inter',fill:'#CBD5E1',selectable:false}),
      new fab.Line([18,bH-26,bW-18,bH-26],{stroke:'#E2E8F0',strokeWidth:1.5,selectable:false}),
      new fab.Textbox('Date',{left:18,top:bH-14,width:80,fontSize:10,fontFamily:'Inter',fill:'#CBD5E1',selectable:false}),
      new fab.Textbox('⬡ Verified by Folio',{left:bW/2,top:bH-15,width:bW/2-18,fontSize:9,fontFamily:'JetBrains Mono',fill:'#5B50E8',fontWeight:'600',textAlign:'right',selectable:false}),
    ]
    const g=new fab.Group(objs,{left:bX,top:bY,selectable:true,subTargetCheck:false})
    ;(g as any).__signatureBlock=true
    fc.add(g); fc.setActiveObject(g); fc.renderAll(); pushHist()
  }

  function uploadImage(file:File) {
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
    const r=new FileReader()
    r.onload=e=>fab.Image.fromURL(e.target?.result as string,(img:any)=>{
      const s=Math.min(400/img.width,300/img.height,1); img.set({left:120,top:120,scaleX:s,scaleY:s}); fc.add(img); fc.setActiveObject(img); fc.renderAll(); pushHist()
    })
    r.readAsDataURL(file)
  }

  function addStockPhoto(url:string) {
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
    fab.Image.fromURL(url, (img:any) => {
      const s=Math.min(cWRef.current/img.width,cHRef.current/img.height,1)
      img.set({left:0,top:0,scaleX:s,scaleY:s,crossOrigin:'anonymous'}); fc.add(img); fc.setActiveObject(img); fc.renderAll(); pushHist()
    }, {crossOrigin:'anonymous'})
  }

  function delSel() { const fc=fabricRef.current; if(!fc) return; fc.getActiveObjects().forEach((o:any)=>fc.remove(o)); fc.discardActiveObject(); fc.renderAll(); setSelectedObj(null); pushHist() }
  function dupSel() { const fc=fabricRef.current; if(!fc) return; fc.getActiveObject()?.clone((c:any)=>{c.set({left:c.left+20,top:c.top+20});fc.add(c);fc.setActiveObject(c);fc.renderAll();pushHist()}) }
  function grpSel() { const fc=fabricRef.current; if(!fc||fc.getActiveObject()?.type!=='activeSelection') return; fc.getActiveObject().toGroup(); fc.renderAll(); pushHist() }

  // ── Export — full resolution independent of editor zoom ──────────────────────
  // ── Export with full DPI quality control ─────────────────────────────────────
  async function handleExport(opts: any) {
    setIsExporting(true)
    const fc = fabricRef.current; if(!fc) return
    const saved = [...pagesRef.current]; saved[cpRef.current] = fc.toJSON()
    const pagesToExport = opts.pages === 'current' ? [saved[cpRef.current]] : saved
    const mult = opts.multiplier ?? 1
    const W = cWRef.current, H = cHRef.current

    try {
      if (opts.format === 'pdf') {
        if (!(window as any).jspdf) {
          await new Promise<void>(res => {
            const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
            s.onload=()=>res(); document.head.appendChild(s)
          })
        }
        const {jsPDF}=(window as any).jspdf
        const pdf=new jsPDF({orientation:W>H?'landscape':'portrait',unit:'px',format:[W,H]})
        for(let i=0;i<pagesToExport.length;i++){
          if(i>0) pdf.addPage()
          await new Promise<void>(res=>{
            const tmp=document.createElement('canvas'); tmp.width=Math.round(W*mult); tmp.height=Math.round(H*mult)
            const tfc=new (window as any).fabric.StaticCanvas(tmp,{width:Math.round(W*mult),height:Math.round(H*mult),enableRetinaScaling:false})
            tfc.loadFromJSON(pagesToExport[i],()=>{
              tfc.setZoom(mult); tfc.renderAll()
              const dataUrl=tfc.toDataURL({format:'jpeg',quality:opts.jpegQuality??0.95,multiplier:1})
              pdf.addImage(dataUrl,'JPEG',0,0,W,H); tfc.dispose(); res()
            })
          })
        }
        pdf.save(`${title||'document'}.pdf`)
      } else {
        // Image formats
        for(let i=0;i<pagesToExport.length;i++){
          await new Promise<void>(res=>{
            const tmp=document.createElement('canvas'); tmp.width=Math.round(W*mult); tmp.height=Math.round(H*mult)
            const tfc=new (window as any).fabric.StaticCanvas(tmp,{width:Math.round(W*mult),height:Math.round(H*mult),enableRetinaScaling:false})
            tfc.loadFromJSON(pagesToExport[i],()=>{
              tfc.setZoom(mult); tfc.renderAll()
              const fmt=opts.format==='jpeg'?'jpeg':opts.format==='webp'?'webp':'png'
              const q=opts.jpegQuality??0.95
              const dataUrl=tfc.toDataURL({format:fmt,quality:q,multiplier:1})
              const a=document.createElement('a'); a.href=dataUrl
              a.download=`${title||'slide'}${pagesToExport.length>1?`-${i+1}`:''}.${opts.format}`
              a.click(); tfc.dispose(); res()
            })
          })
        }
      }
    } catch(e) { console.error('Export error', e) }
    setIsExporting(false); setShowExportModal(false)
  }

  function addChartToCanvas(dataUrl: string) {
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
    fab.Image.fromURL(dataUrl, (img: any) => {
      const s=Math.min(cWRef.current*.7/img.width, cHRef.current*.7/img.height, 1)
      img.set({left:Math.round(cWRef.current*.15),top:Math.round(cHRef.current*.15),scaleX:s,scaleY:s})
      fc.add(img); fc.setActiveObject(img); fc.renderAll(); pushHist()
    })
    setShowChartBuilder(false)
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement).tagName
      if(tag==='INPUT'||tag==='TEXTAREA') return
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
      if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();redo()}
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();saveCanvas()}
      if((e.metaKey||e.ctrlKey)&&e.key==='d'){e.preventDefault();dupSel()}
      if((e.metaKey||e.ctrlKey)&&e.key==='g'){e.preventDefault();grpSel()}
      if((e.key==='Delete'||e.key==='Backspace')&&fabricRef.current?.getActiveObject()) delSel()
      if(e.key==='Escape'){setSelectedObj(null);fabricRef.current?.discardActiveObject();fabricRef.current?.renderAll()}
      if(e.key==='v') setTool('select')
      if(e.key==='t') setTool('text')
      if(e.key==='p') setTool('draw')
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        const o=fabricRef.current?.getActiveObject(); if(!o) return
        const d=e.shiftKey?10:1
        if(e.key==='ArrowLeft') o.set('left',(o.left||0)-d); if(e.key==='ArrowRight') o.set('left',(o.left||0)+d)
        if(e.key==='ArrowUp')   o.set('top',(o.top||0)-d);   if(e.key==='ArrowDown')  o.set('top',(o.top||0)+d)
        fabricRef.current.renderAll(); scheduleSave()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [saveCanvas]) // eslint-disable-line

  // ── Derived state ─────────────────────────────────────────────────────────────
  const isActive   = doc?.status === 'active'
  const supSign    = DOC_TYPES.find(t=>t.id===docType)?.sign ?? false
  const filtLayouts = layoutCat==='All' ? LAYOUTS : LAYOUTS.filter(l => l.cat===layoutCat)
  const fontCats   = ['All', ...Array.from(new Set(FONTS.map(f=>f.cat)))]
  const filtFonts  = FONTS.filter(f => (fontCat==='All'||f.cat===fontCat) && f.name.toLowerCase().includes(fontSearch.toLowerCase()))

  // ── Layers sub-component ──────────────────────────────────────────────────────
  function Layers() {
    const [objs, setObjs] = useState<any[]>([])
    useEffect(() => {
      const fc=fabricRef.current; if(!fc) return
      const r=()=>setObjs(fc.getObjects().slice().reverse())
      fc.on('object:added',r); fc.on('object:removed',r); fc.on('object:modified',r)
      fc.on('selection:created',r); fc.on('selection:cleared',r); r()
      return ()=>{fc.off('object:added',r);fc.off('object:removed',r);fc.off('object:modified',r)}
    }, [])
    if(objs.length===0) return <div style={{padding:'32px 16px',textAlign:'center',color:C.textSm,fontSize:13,fontFamily:Fui}}>No elements yet</div>
    return (
      <div style={{padding:'4px 8px',display:'flex',flexDirection:'column',gap:1}}>
        {objs.map((obj,i)=>{
          const act=fabricRef.current?.getActiveObject()===obj
          const lbl=(obj as any).__signatureBlock?'Signature Block':obj.text?obj.text.slice(0,22)+(obj.text.length>22?'…':''):obj.type
          const ico:keyof typeof ICO=obj.type==='textbox'||obj.type==='text'?'type':obj.type==='image'?'image':(obj as any).__signatureBlock?'sign':'grid'
          return (
            <div key={i} onClick={()=>{fabricRef.current?.setActiveObject(obj);fabricRef.current?.renderAll();syncSel(obj)}}
              style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,cursor:'pointer',background:act?C.accentLt:'transparent',border:`1px solid ${act?C.accentMd:'transparent'}`,transition:'all .1s'}}>
              <Icon name={ico} size={13} color={act?C.accent:C.textMd}/>
              <span style={{flex:1,fontSize:12,fontFamily:Fui,color:act?C.accent:C.textSd,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:act?600:500}}>{lbl}</span>
              <button onClick={e=>{e.stopPropagation();obj.set('visible',!obj.visible);fabricRef.current?.renderAll();setObjs([...objs])}} style={{border:'none',background:'none',cursor:'pointer',color:obj.visible===false?C.textSm:C.accent,padding:0,display:'flex',flexShrink:0}}>
                <Icon name={obj.visible===false?'eyeOff':'eye'} size={12} color={obj.visible===false?C.textSm:C.textMd}/>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Right panel ───────────────────────────────────────────────────────────────
  function RightPanel() {
    const isT = selectedObj?.type==='textbox'||selectedObj?.type==='i-text'||selectedObj?.type==='text'
    const isI = selectedObj?.type==='image'
    const isS = selectedObj && !isT && !isI

    if(!selectedObj) return (
      <div style={{width:252,background:C.panel,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'auto'}}>
        <div style={{padding:'13px 16px 10px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:11,fontWeight:700,color:C.text,letterSpacing:'.02em',fontFamily:Fui}}>CANVAS</span>
          <button onClick={toggleRight} style={{border:'none',background:'none',cursor:'pointer',color:C.textSm,padding:2,display:'flex',borderRadius:5,transition:'color .12s'}} onMouseOver={e=>(e.currentTarget.style.color=C.text)} onMouseOut={e=>(e.currentTarget.style.color=C.textSm)}>
            <Icon name="chevR" size={14} color={C.textSm}/>
          </button>
        </div>
        {(activeTool==='draw'||activeTool==='erase') && (
          <Sec label={activeTool==='erase'?'Eraser':'Brush'} defaultOpen={true}>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <RangeInput label="Size" value={brushSize} min={1} max={50} onChange={v=>{setBrushSize(v);const fc=fabricRef.current;if(fc?.freeDrawingBrush)fc.freeDrawingBrush.width=v}}/>
              {activeTool==='draw' && <ColorInput label="Color" value={fontColor} onChange={v=>{setFontColor(v);const fc=fabricRef.current;if(fc?.freeDrawingBrush)fc.freeDrawingBrush.color=v}}/>}
              {activeTool==='draw' && (
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:7,fontFamily:Fui}}>Brush Style</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {[{l:'Pencil',v:1},{l:'Marker',v:8},{l:'Brush',v:14},{l:'Chalk',v:20}].map(b=>(
                      <button key={b.l} onClick={()=>{setBrushSize(b.v);const fc=fabricRef.current;if(fc?.freeDrawingBrush)fc.freeDrawingBrush.width=b.v}}
                        style={{...UI,padding:'6px',border:`1.5px solid ${brushSize===b.v?C.accent:C.border}`,borderRadius:7,background:brushSize===b.v?C.accentLt:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:brushSize===b.v?C.accent:C.textMd}}>
                        {b.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Sec>
        )}
        <Sec label="Background"><ColorInput label="" value={bgColor} onChange={v=>{setBgColor(v);if(fabricRef.current){fabricRef.current.backgroundColor=v;fabricRef.current.renderAll();scheduleSave()}}}/></Sec>
        <Sec label="Canvas Size">
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {SIZES.map(sz=>(
              <button key={sz.id} onClick={()=>changeSize(sz.id)} style={{...UI,padding:'7px 10px',border:`1.5px solid ${canvasW===sz.w&&canvasH===sz.h?C.accent:C.border}`,borderRadius:9,background:canvasW===sz.w&&canvasH===sz.h?C.accentLt:'#fff',fontSize:12,cursor:'pointer',color:canvasW===sz.w&&canvasH===sz.h?C.accent:C.textSd,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all .13s'}}>
                <span>{sz.label}</span>
                <span style={{fontSize:10,color:C.textSm,fontFamily:Fmono}}>{sz.w}×{sz.h}</span>
              </button>
            ))}
          </div>
        </Sec>
        <Sec label="Document Type">
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:C.panelSub,borderRadius:10,border:`1px solid ${C.border}`}}>
              <span style={{fontSize:22}}>{DOC_TYPES.find(t=>t.id===docType)?.icon}</span>
              <div><div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:Fui}}>{DOC_TYPES.find(t=>t.id===docType)?.label||'Document'}</div><div style={{fontSize:11,color:C.textSm,fontFamily:Fui}}>{DOC_TYPES.find(t=>t.id===docType)?.desc}</div></div>
            </div>
            <button onClick={()=>setShowTypeModal(true)} style={{...UI,padding:'6px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,background:'#fff',fontSize:12,cursor:'pointer',color:C.accent,fontWeight:600,textAlign:'left'}}>Change document type →</button>
          </div>
        </Sec>
      </div>
    )

    return (
      <div style={{width:252,background:C.panel,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
        <div style={{padding:'11px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <span style={{fontSize:12,fontWeight:700,color:C.text,textTransform:'capitalize',fontFamily:Fui}}>
            {(selectedObj as any).__signatureBlock?'Signature Block':selectedObj?.type}
          </span>
          <div style={{display:'flex',gap:3}}>
            <IBtn icon="copy" label="Duplicate ⌘D" onClick={dupSel}/>
            <IBtn icon="trash" label="Delete" onClick={delSel} danger/>
            <button onClick={toggleRight} style={{border:'none',background:'none',cursor:'pointer',color:C.textSm,padding:'0 2px',display:'flex',borderRadius:5}} title="Collapse panel">
              <Icon name="chevR" size={14} color={C.textSm}/>
            </button>
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

          <Sec label="Appearance">
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {!isT && <ColorInput label="Fill" value={typeof selectedObj?.fill==='string'?selectedObj.fill:'#5B50E8'} onChange={v=>{setFillColor(v);upd('fill',v)}}/>}
              {isS && (
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end'}}>
                  <ColorInput label="Stroke" value={selectedObj?.stroke||'#000000'} onChange={v=>upd('stroke',v)}/>
                  <NumInput label="Width" value={selectedObj?.strokeWidth||0} onChange={v=>upd('strokeWidth',v)}/>
                </div>
              )}
              {isS && selectedObj?.type==='rect' && <NumInput label="Corner radius" value={selectedObj?.rx||0} onChange={v=>{upd('rx',v);upd('ry',v)}}/>}
              <RangeInput label="Opacity" value={Math.round((selectedObj?.opacity??1)*100)} min={0} max={100} onChange={v=>upd('opacity',v/100)}/>
            </div>
          </Sec>

          {isT && (
            <Sec label="Typography">
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <ColorInput label="Color" value={fontColor} onChange={v=>{setFontColor(v);upd('fill',v)}}/>
                {/* Font family — working picker */}
                <div style={{position:'relative'}}>
                  <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:5,fontFamily:Fui}}>Font family</div>
                  <button onClick={()=>setShowFontPicker(!showFontPicker)} style={{...UI,width:'100%',padding:'7px 10px',border:`1.5px solid ${showFontPicker?C.accent:C.border}`,borderRadius:9,background:'#fff',cursor:'pointer',fontSize:13,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:500,color:C.text,display:'flex',alignItems:'center',justifyContent:'space-between',transition:'border-color .15s'}}>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fontFamily}</span>
                    <Icon name="chevD" size={12} color={C.textSm}/>
                  </button>
                  {showFontPicker && (
                    <div style={{position:'absolute',top:'110%',left:0,right:0,background:'#fff',border:`1.5px solid ${C.accentMd}`,borderRadius:12,boxShadow:C.shadowLg,zIndex:500}}>
                      <div style={{padding:'8px 8px 4px',borderBottom:`1px solid ${C.border}`}}>
                        <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search fonts…" autoFocus
                          style={{...UI,width:'100%',padding:'6px 9px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,color:C.text,background:C.panelSub,outline:'none',marginBottom:6}}/>
                        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                          {fontCats.map(c=>(
                            <button key={c} onClick={()=>setFontCat(c)} style={{padding:'2px 8px',fontSize:10,fontWeight:600,fontFamily:Fui,border:`1px solid ${fontCat===c?C.accent:C.border}`,borderRadius:20,background:fontCat===c?C.accentLt:'transparent',color:fontCat===c?C.accent:C.textMd,cursor:'pointer'}}>{c}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{maxHeight:210,overflow:'auto',padding:'4px 6px 6px'}}>
                        {filtFonts.map(f=>(
                          <div key={f.name} onClick={()=>applyFont(f.name)}
                            style={{padding:'7px 9px',cursor:'pointer',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'space-between',background:fontFamily===f.name?C.accentLt:'transparent',transition:'background .1s'}}
                            onMouseOver={e=>{if(fontFamily!==f.name)(e.currentTarget as HTMLElement).style.background=C.hover}}
                            onMouseOut={e=>{if(fontFamily!==f.name)(e.currentTarget as HTMLElement).style.background='transparent'}}>
                            <span style={{fontSize:13,fontFamily:`'${f.name}',sans-serif`,color:fontFamily===f.name?C.accent:C.text,fontWeight:fontFamily===f.name?700:400}}>{f.name}</span>
                            <span style={{fontSize:9,color:C.textSm,background:C.panelSub,padding:'1px 5px',borderRadius:5,fontFamily:Fui}}>{f.cat}</span>
                          </div>
                        ))}
                        {filtFonts.length===0 && <div style={{padding:'16px',textAlign:'center',fontSize:12,color:C.textSm,fontFamily:Fui}}>No fonts found</div>}
                      </div>
                    </div>
                  )}
                </div>
                <NumInput label="Font size" value={fontSize} onChange={v=>{setFontSize(v);upd('fontSize',v)}} min={6} max={400}/>
                {/* Style buttons */}
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6,fontFamily:Fui}}>Style</div>
                  <div style={{display:'flex',gap:4}}>
                    {[
                      {icon:'bold' as const,prop:'fontWeight',on:'bold',off:'normal',active:selectedObj?.fontWeight==='bold'||selectedObj?.fontWeight===800},
                      {icon:'italic' as const,prop:'fontStyle',on:'italic',off:'normal',active:selectedObj?.fontStyle==='italic'},
                      {icon:'underline' as const,prop:'underline',on:true,off:false,active:selectedObj?.underline===true},
                    ].map(f=>(
                      <Tag key={f.icon} on={f.active} onClick={()=>upd(f.prop, f.active?f.off:f.on)}>
                        <Icon name={f.icon} size={14} color={f.active?C.accent:C.textMd}/>
                      </Tag>
                    ))}
                    <div style={{flex:1}}/>
                    {[
                      {icon:'alignL' as const,val:'left'},
                      {icon:'alignC' as const,val:'center'},
                      {icon:'alignR' as const,val:'right'},
                    ].map(a=>(
                      <Tag key={a.val} on={selectedObj?.textAlign===a.val} onClick={()=>upd('textAlign',a.val)}>
                        <Icon name={a.icon} size={14} color={selectedObj?.textAlign===a.val?C.accent:C.textMd}/>
                      </Tag>
                    ))}
                  </div>
                </div>
                <RangeInput label="Line height" value={Math.round((selectedObj?.lineHeight??1.35)*10)/10} min={0.8} max={3} onChange={v=>upd('lineHeight',v)}/>
                <RangeInput label="Letter spacing" value={selectedObj?.charSpacing||0} min={-200} max={800} onChange={v=>upd('charSpacing',v)}/>
              </div>
            </Sec>
          )}

          {isI && (
            <Sec label="Image Filters">
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <RangeInput label="Brightness" value={imgBrightness} min={-100} max={100} onChange={v=>{setImgBrightness(v);applyImgFilters(v,imgContrast,imgSaturation,imgBlur)}}/>
                <RangeInput label="Contrast" value={imgContrast} min={-100} max={100} onChange={v=>{setImgContrast(v);applyImgFilters(imgBrightness,v,imgSaturation,imgBlur)}}/>
                <RangeInput label="Saturation" value={imgSaturation} min={-100} max={100} onChange={v=>{setImgSaturation(v);applyImgFilters(imgBrightness,imgContrast,v,imgBlur)}}/>
                <RangeInput label="Blur" value={imgBlur} min={0} max={100} onChange={v=>{setImgBlur(v);applyImgFilters(imgBrightness,imgContrast,imgSaturation,v)}}/>
                <button onClick={()=>{setImgBrightness(0);setImgContrast(0);setImgSaturation(0);setImgBlur(0);applyImgFilters(0,0,0,0)}}
                  style={{...UI,padding:'5px 10px',border:'none',background:'none',cursor:'pointer',fontSize:12,color:C.red,fontWeight:600,textAlign:'left'}}>Reset filters</button>
              </div>
            </Sec>
          )}

          <Sec label="Transform">
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <NumInput label="Rotation °" value={Math.round(selectedObj?.angle||0)} onChange={v=>upd('angle',v)}/>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:5,fontFamily:Fui}}>Blend mode</div>
                <select value={selectedObj?.globalCompositeOperation||'normal'} onChange={e=>upd('globalCompositeOperation',e.target.value)}
                  style={{...UI,width:'100%',padding:'7px 9px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text,background:'#fff',outline:'none',cursor:'pointer'}}>
                  {BLENDS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6,fontFamily:Fui}}>Align to canvas</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
                  {[{l:'Left',f:()=>upd('left',0)},{l:'Center',f:()=>upd('left',cWRef.current/2-(selectedObj?.width*(selectedObj?.scaleX||1))/2)},{l:'Right',f:()=>upd('left',cWRef.current-(selectedObj?.width*(selectedObj?.scaleX||1)))},{l:'Top',f:()=>upd('top',0)},{l:'Middle',f:()=>upd('top',cHRef.current/2-(selectedObj?.height*(selectedObj?.scaleY||1))/2)},{l:'Bottom',f:()=>upd('top',cHRef.current-(selectedObj?.height*(selectedObj?.scaleY||1)))}].map(a=>(
                    <button key={a.l} onClick={a.f} style={{...UI,padding:'5px 0',border:`1px solid ${C.border}`,borderRadius:6,background:'#fff',fontSize:11,cursor:'pointer',color:C.textSd,fontWeight:500,transition:'all .12s'}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background=C.hover}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background='#fff'}}>{a.l}</button>
                  ))}
                </div>
              </div>
            </div>
          </Sec>
        </div>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:C.bg,fontFamily:Fui,color:C.text,overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Cormorant+Garamond:wght@300;400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.borderSt};border-radius:99px}::-webkit-scrollbar-thumb:hover{background:#B0ACA7}
        input[type=color]{-webkit-appearance:none;padding:0;border:none;cursor:pointer}input[type=color]::-webkit-color-swatch-wrapper{padding:0}input[type=color]::-webkit-color-swatch{border:none}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:${C.border};outline:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:${C.accent};cursor:pointer;box-shadow:${C.shadow};transition:transform .1s}
        input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.2)}
        .lt{height:40px;border:none;cursor:pointer;background:transparent;font-family:${Fui};font-size:12px;font-weight:600;color:${C.textMd};padding:0 12px;border-bottom:2px solid transparent;transition:all .13s;white-space:nowrap;flex-shrink:0}
        .lt:hover{color:${C.text}}.lt.on{color:${C.accent};border-bottom-color:${C.accent}}
        .shapebtn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:58px;border:1.5px solid ${C.border};border-radius:10px;background:#fff;cursor:pointer;font-size:11px;font-weight:600;color:${C.textMd};font-family:${Fui};transition:all .13s}
        .shapebtn:hover{border-color:${C.accent};color:${C.accent};background:${C.accentLt};transform:translateY(-1px)}
        .lcrd{transition:all .14s;border:1.5px solid ${C.border};border-radius:10px;overflow:hidden;cursor:pointer;background:#fff}
        .lcrd:hover{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentLt};transform:translateY(-1px)}
        .thumb{cursor:pointer;border-radius:8px;border:2px solid ${C.border};overflow:hidden;transition:all .13s;background:#fff;flex-shrink:0;position:relative}
        .thumb:hover{border-color:${C.borderSt}}.thumb.on{border-color:${C.accent};box-shadow:0 0 0 2px ${C.accentLt}}
        .thumb .ta{display:none}.thumb:hover .ta{display:flex}
        .topbtn{height:32px;padding:0 13px;border-radius:8px;font-size:13px;font-weight:600;border:1.5px solid ${C.border};background:#fff;color:${C.textSd};cursor:pointer;font-family:${Fui};display:flex;align-items:center;gap:6px;transition:all .13s;flex-shrink:0}
        .topbtn:hover{background:${C.hover};border-color:${C.borderSt};color:${C.text}}
        .pubtn{height:32px;padding:0 16px;border-radius:8px;font-size:13px;font-weight:700;border:none;background:${C.accent};color:white;cursor:pointer;font-family:${Fui};display:flex;align-items:center;gap:6px;transition:all .13s;flex-shrink:0}
        .pubtn:hover{background:${C.accentHv};box-shadow:0 4px 14px rgba(91,80,232,.32)}
        .cpill{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1.5px solid ${C.border};background:#fff;color:${C.textMd};cursor:pointer;font-family:${Fui};transition:all .11s;white-space:nowrap}
        .cpill:hover{background:${C.hover};color:${C.text}}.cpill.on{background:${C.accentLt};color:${C.accent};border-color:${C.accentMd}}
        .phimg{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:9px;cursor:pointer;border:2px solid transparent;transition:all .14s;display:block}
        .phimg:hover{border-color:${C.accent};transform:scale(1.02);box-shadow:${C.shadowMd}}
        .addtxt:hover{border-color:${C.accent}!important}
        /* Floating toolbar fade */
        @keyframes fadeup{from{opacity:0;transform:translateX(-50%) translateY(4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      `}</style>

      {/* ── TOP BAR ───────────────────────────────────────────────────────────── */}
      <div style={{height:52,background:C.panel,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 14px',gap:6,flexShrink:0,zIndex:30,boxShadow:'0 1px 0 rgba(0,0,0,.04)'}}>
        {/* Back */}
        <button onClick={()=>router.push('/dashboard')} style={{...UI,background:'none',border:'none',cursor:'pointer',color:C.textMd,display:'flex',alignItems:'center',gap:5,fontSize:13,fontWeight:600,padding:'5px 7px',borderRadius:7,flexShrink:0,transition:'color .13s'}} onMouseOver={e=>(e.currentTarget.style.color=C.text)} onMouseOut={e=>(e.currentTarget.style.color=C.textMd)}>
          <Icon name="chevL" size={14} color="currentColor"/>Docs
        </button>
        <svg width="4" height="10" viewBox="0 0 4 10" fill="none"><path d="M1 1l2 4-2 4" stroke={C.border} strokeWidth="1.3" strokeLinecap="round"/></svg>

        {/* Title */}
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{...UI,border:'none',outline:'none',fontSize:14,fontWeight:700,color:C.text,background:'transparent',maxWidth:200,minWidth:60,letterSpacing:'-.01em'}}/>
        <span style={{fontSize:11,color:saving?C.accent:C.textSm,fontFamily:Fmono,minWidth:52,flexShrink:0}}>{saving?'saving…':lastSaved?'✓ saved':''}</span>

        {/* Status */}
        <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:isActive?'#DCFCE7':'#F1F5F9',color:isActive?C.green:C.textMd,border:`1px solid ${isActive?'#BBF7D0':C.border}`,flexShrink:0}}>{isActive?'LIVE':'DRAFT'}</span>

        {/* Canvas size pill */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowSizeMenu(!showSizeMenu)} className="topbtn" style={{fontSize:12,fontFamily:Fmono,gap:5}}>
            {SIZES.find(s=>s.w===canvasW&&s.h===canvasH)?.label||`${canvasW}×${canvasH}`}
            <Icon name="chevD" size={11} color={C.textSm}/>
          </button>
          {showSizeMenu && (
            <div style={{position:'absolute',top:'110%',left:0,background:C.panel,border:`1px solid ${C.border}`,borderRadius:11,boxShadow:C.shadowLg,zIndex:400,minWidth:220,padding:4}}>
              {SIZES.map(sz=>(
                <button key={sz.id} onClick={()=>changeSize(sz.id)} style={{...UI,display:'flex',width:'100%',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:canvasW===sz.w&&canvasH===sz.h?700:500,color:canvasW===sz.w&&canvasH===sz.h?C.accent:C.text,borderRadius:8,textAlign:'left',justifyContent:'space-between',alignItems:'center'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                  <span>{sz.label}</span><span style={{fontSize:10,fontFamily:Fmono,color:C.textSm}}>{sz.w}×{sz.h}</span>
                </button>
              ))}
              <div style={{borderTop:`1px solid ${C.border}`,margin:'4px 8px'}}/>
              <button onClick={()=>{setShowSizeMenu(false);setShowTypeModal(true)}} style={{...UI,display:'flex',width:'100%',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:600,color:C.accent,borderRadius:8}} onMouseOver={e=>(e.currentTarget.style.background=C.accentLt)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                Change document type →
              </button>
            </div>
          )}
        </div>

        <div style={{flex:1}}/>

        {/* Tool buttons */}
        <div style={{display:'flex',alignItems:'center',gap:1,background:C.panelSub,borderRadius:9,padding:3,border:`1px solid ${C.border}`}}>
          {([
            {id:'select',  tip:'Select  V',         icon:'cursor'},
            {id:'text',    tip:'Text  T',            icon:'text'},
            {id:'draw',    tip:'Pencil  P',          icon:'pencil'},
            {id:'line',    tip:'Line',               icon:'minus'},
            {id:'erase',   tip:'Eraser',             icon:'close'},
          ] as const).map(t=>(
            <IBtn key={t.id} icon={t.icon as keyof typeof ICO} label={t.tip} active={activeTool===t.id} onClick={()=>setTool(t.id)} size={15}/>
          ))}
          <div style={{width:1,height:18,background:C.border,margin:'0 2px'}}/>
          <IBtn icon="grid"   label="Add Table"       onClick={()=>addTable(4,3)} size={14}/>
          <IBtn icon="image"  label="Media"           onClick={()=>setLeftTab('media')} size={14}/>
          <IBtn icon="sparkle" label="Icon Library"   onClick={()=>setLeftTab('icons')} size={14}/>
        </div>

        <div style={{width:1,height:22,background:C.border,margin:'0 3px',flexShrink:0}}/>

        {/* Undo / Redo */}
        <IBtn icon="undo" label="Undo  ⌘Z"   onClick={undo} size={16}/>
        <IBtn icon="redo" label="Redo  ⌘⇧Z"  onClick={redo} size={16}/>

        <div style={{width:1,height:22,background:C.border,margin:'0 3px',flexShrink:0}}/>

        {/* AI Draft */}
        <button onClick={()=>setShowDrafter(true)} className="topbtn">
          <span style={{fontSize:14,lineHeight:1}}>✦</span>AI Draft
        </button>

        {/* Export */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowExportModal(true)} className="topbtn">
            <Icon name="download" size={14} color={C.textSd}/>Export
          </button>
        </div>

        {/* Publish / Share */}
        {isActive
          ? <button onClick={()=>setShowShare(true)} className="pubtn"><Icon name="share" size={14} color="white"/>Share</button>
          : <button onClick={publish} className="pubtn">Publish &amp; Share</button>}
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
        <div style={{width:leftOpen?260:44,background:C.panel,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,transition:'width .2s ease',overflow:'hidden'}}>
          {!leftOpen ? (
            // Icon-only collapsed mode
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8,gap:2}}>
              <button onClick={toggleLeft} title="Expand panel" style={{width:36,height:32,border:'none',background:'none',cursor:'pointer',color:C.textMd,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:7,marginBottom:4,transition:'all .13s'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                <Icon name="chevR" size={14} color={C.textMd}/>
              </button>
              {(['layouts','elements','text','media','layers'] as const).map(t=>{
                const icons:Record<string,keyof typeof ICO>={layouts:'layout',elements:'grid',text:'type',media:'image',icons:'sparkle',layers:'layers'}
                return (
                  <button key={t} title={t.charAt(0).toUpperCase()+t.slice(1)} onClick={()=>{setLeftTab(t);setLeftOpen(true);try{localStorage.setItem('folio_left','1')}catch(e){}}}
                    style={{width:36,height:36,border:'none',background:leftTab===t?C.accentLt:'none',cursor:'pointer',color:leftTab===t?C.accent:C.textMd,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:8,transition:'all .13s'}} onMouseOver={e=>{if(leftTab!==t)(e.currentTarget.style.background=C.hover)}} onMouseOut={e=>{if(leftTab!==t)(e.currentTarget.style.background='transparent')}}>
                    <Icon name={icons[t]} size={16} color={leftTab===t?C.accent:C.textMd}/>
                  </button>
                )
              })}
            </div>
          ) : (
            <>
              {/* Tabs bar */}
              <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,padding:'0 4px',flexShrink:0,alignItems:'center'}}>
                {(['layouts','elements','text','media','icons','layers'] as const).map(t=>(
                  <button key={t} className={`lt${leftTab===t?' on':''}`} onClick={()=>setLeftTab(t)} style={{textTransform:'capitalize'}}>{t}</button>
                ))}
                <button onClick={toggleLeft} title="Collapse" style={{marginLeft:'auto',width:28,height:28,border:'none',background:'none',cursor:'pointer',color:C.textSm,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:5,flexShrink:0,transition:'all .13s'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                  <Icon name="chevL" size={12} color={C.textSm}/>
                </button>
              </div>

              {/* Tab content */}
              <div style={{flex:1,overflow:'auto',padding:10}}>

                {/* LAYOUTS */}
                {leftTab==='layouts' && (
                  <div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
                      {LAYOUT_CATS.map(c=><button key={c} className={`cpill${layoutCat===c?' on':''}`} onClick={()=>setLayoutCat(c)}>{c}</button>)}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                      {filtLayouts.map(l=>(
                        <div key={l.id} className="lcrd" onClick={()=>applyLayout(l)} title={l.label}>
                          <div style={{aspectRatio:'16/9',background:l.build(160,90).background||'#F8FAFC',position:'relative',overflow:'hidden',borderBottom:`1px solid ${C.border}`}}>
                            {l.build(160,90).objects?.slice(0,7).map((o:any,oi:number)=>o.type==='rect'&&(
                              <div key={oi} style={{position:'absolute',left:`${(o.left/160)*100}%`,top:`${(o.top/90)*100}%`,width:`${Math.min((o.width/160)*100,100)}%`,height:`${Math.min((o.height/90)*100,100)}%`,background:o.fill,borderRadius:o.rx?2:0,opacity:Math.min(o.opacity??1,1)}}/>
                            ))}
                          </div>
                          <div style={{padding:'5px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                            <span style={{fontSize:11,fontWeight:600,color:C.textSd,fontFamily:Fui}}>{l.label}</span>
                            <span style={{fontSize:8,color:C.textSm,background:C.panelSub,padding:'1px 5px',borderRadius:5,fontFamily:Fui,fontWeight:600}}>{l.cat}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ELEMENTS */}
                {leftTab==='elements' && (
                  <div style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:Fui}}>Shapes</p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                        {[
                          {id:'rect',     l:'Rect',    icon:<rect x="2" y="4" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>},
                          {id:'circle',   l:'Circle',  icon:<circle cx="7" cy="8" r="5" stroke="currentColor" strokeWidth="1.3"/>},
                          {id:'triangle', l:'Tri',     icon:<path d="M7 2.5l5 9H2l5-9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>},
                          {id:'diamond',  l:'Diamond', icon:<path d="M7 2l4.5 6L7 14 2.5 8 7 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>},
                          {id:'star',     l:'Star',    icon:<path d="M7 1.5l1.4 3.4H12L9.3 7l1 3.3L7 8.6 3.7 10.3l1-3.3L2 4.9h3.6L7 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>},
                          {id:'line',     l:'Line',    icon:<path d="M2 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>},
                          {id:'arrow',    l:'Arrow',   icon:<><path d="M2 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M7.5 5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></>},
                        ].map(sh=>(
                          <button key={sh.id} className="shapebtn" onClick={()=>addShape(sh.id)}>
                            <svg width="16" height="14" viewBox="0 0 14 14" fill="none">{sh.icon}</svg>
                            <span style={{fontSize:10}}>{sh.l}</span>
                          </button>
                        ))}
                        <button className="shapebtn" onClick={()=>addTable(4,3)}>
                          <svg width="16" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M1 5h12M1 9h12M5 5v7M9 5v7" stroke="currentColor" strokeWidth="1.1"/></svg>
                          <span style={{fontSize:10}}>Table</span>
                        </button>
                        <button className="shapebtn" onClick={()=>addShape('rect',{fill:C.accent,rx:10})}>
                          <svg width="18" height="11" viewBox="0 0 18 11" fill="none"><rect x="1" y="1" width="16" height="9" rx="3.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                          <span style={{fontSize:10}}>Button</span>
                        </button>
                      </div>
                    </div>

                    {/* Charts */}
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:Fui}}>Charts & Data</p>
                      <button onClick={()=>setShowChartBuilder(true)} style={{...UI,width:'100%',padding:'12px 14px',border:`2px dashed #D97706`,borderRadius:12,background:'#FFFBEB',cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:700,color:'#92400E',transition:'all .14s'}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background='#FEF3C7'}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background='#FFFBEB'}}>
                        📊 Open Chart Builder
                      </button>
                    </div>

                    {/* Signature block */}
                    {supSign && (
                      <div>
                        <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:Fui}}>Signing</p>
                        <button onClick={addSignatureBlock} style={{...UI,width:'100%',padding:'12px 14px',border:`2px dashed ${C.accent}`,borderRadius:12,background:C.accentLt,cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:700,color:C.accent,transition:'all .14s'}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background='#E0DFFE'}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background=C.accentLt}}>
                          <Icon name="sign" size={18} color={C.accent} w={1.8}/>
                          Add Signature Block
                        </button>
                        <button onClick={()=>setShowSignModal(true)} style={{...UI,width:'100%',marginTop:7,padding:'10px 14px',border:`1.5px solid ${C.border}`,borderRadius:10,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:600,color:C.textSd,transition:'all .14s'}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.color=C.textSd}}>
                          ✍ Preview Signature Styles
                        </button>
                        <p style={{fontSize:11,color:C.textSm,marginTop:7,lineHeight:1.55,fontFamily:Fui}}>Adds a signed-by zone with Folio's digital stamp. Recipients sign via the shared link.</p>
                      </div>
                    )}

                    {/* Fill color */}
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:Fui}}>Fill Color</p>
                      <ColorInput label="" value={fillColor} onChange={setFillColor}/>
                    </div>
                  </div>
                )}

                {/* TEXT */}
                {leftTab==='text' && (
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:5,fontFamily:Fui}}>Add Text</p>
                    {[
                      {label:'Heading 1',  fs:52,fw:'800',ff:'Inter',      text:'Heading 1'},
                      {label:'Heading 2',  fs:36,fw:'700',ff:'Inter',      text:'Heading 2'},
                      {label:'Heading 3',  fs:24,fw:'600',ff:'Inter',      text:'Heading 3'},
                      {label:'Subheading', fs:18,fw:'500',ff:'Inter',      text:'Subheading text'},
                      {label:'Body',       fs:15,fw:'400',                 text:'Body text here'},
                      {label:'Caption',    fs:11,fw:'400',fill:'#64748B',  text:'Caption text'},
                      {label:'Label',      fs:10,fw:'700',ff:'JetBrains Mono',fill:C.accent, text:'LABEL'},
                    ].map(t=>(
                      <button key={t.label} className="addtxt" onClick={()=>{
                        const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
                        const tb=new fab.Textbox(t.text,{left:80,top:100,width:440,fontSize:t.fs,fontFamily:(t as any).ff||fontFamily,fill:(t as any).fill||fontColor,fontWeight:t.fw,editable:true,lineHeight:1.35})
                        fc.add(tb); fc.setActiveObject(tb); fc.renderAll(); pushHist()
                      }} style={{...UI,padding:'9px 12px',border:`1.5px solid ${C.border}`,borderRadius:9,background:'#fff',cursor:'pointer',textAlign:'left',transition:'border-color .13s'}}>
                        <span style={{fontSize:Math.min(t.fs>32?17:t.fs>20?14:12,17),fontWeight:t.fw,fontFamily:`'${(t as any).ff||'Inter'}',sans-serif`,color:C.text,letterSpacing:t.fw==='800'?'-.02em':0}}>{t.label}</span>
                      </button>
                    ))}

                    {/* Font pairings */}
                    <div style={{marginTop:12}}>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:Fui}}>Font Pairings</p>
                      {[
                        {l:'Editorial',  h:'Cormorant Garamond', b:'DM Sans'},
                        {l:'Modern',     h:'Syne',               b:'Manrope'},
                        {l:'Tech',       h:'IBM Plex Mono',      b:'IBM Plex Sans'},
                        {l:'Classic',    h:'Playfair Display',   b:'Lato'},
                        {l:'Bold',       h:'Bebas Neue',         b:'Work Sans'},
                        {l:'Startup',    h:'Plus Jakarta Sans',  b:'Plus Jakarta Sans'},
                      ].map(p=>(
                        <button key={p.l} onClick={()=>{loadGoogleFont(p.h);loadGoogleFont(p.b)}} style={{...UI,padding:'9px 12px',border:`1.5px solid ${C.border}`,borderRadius:9,background:'#fff',cursor:'pointer',textAlign:'left',width:'100%',marginBottom:5,transition:'border-color .13s'}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>
                          <div style={{fontSize:9,fontWeight:700,color:C.textSm,marginBottom:2,fontFamily:Fui,textTransform:'uppercase',letterSpacing:'.07em'}}>{p.l}</div>
                          <div style={{fontSize:14,fontFamily:`'${p.h}',serif`,color:C.text,fontWeight:700}}>{p.h}</div>
                          <div style={{fontSize:11,fontFamily:`'${p.b}',sans-serif`,color:C.textMd}}>{p.b}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MEDIA */}
                {leftTab==='media' && (
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <label style={{...UI,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px',border:`2px dashed ${C.borderSt}`,borderRadius:11,cursor:'pointer',fontSize:13,fontWeight:600,color:C.textMd,background:C.panelSub,transition:'all .14s'}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.color=C.textMd}}>
                      <Icon name="download" size={15} color="currentColor"/>Upload image
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
                    </label>

                    {/* Photo search */}
                    <div>
                      <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8,fontFamily:Fui}}>Stock Photos</p>
                      <div style={{display:'flex',gap:5,marginBottom:10}}>
                        <input value={photoSearch} onChange={e=>setPhotoSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setPhotoPage(1);loadPhotos(photoSearch,1)}}} placeholder="Search photos…"
                          style={{...UI,flex:1,padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text,background:'#fff',outline:'none',transition:'border-color .14s'}}
                          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                        <button onClick={()=>{setPhotoPage(1);loadPhotos(photoSearch,1)}} style={{...UI,padding:'0 11px',border:`1.5px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',fontSize:12,color:C.textSd,fontWeight:600,transition:'all .13s'}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.color=C.textSd}}>Go</button>
                      </div>
                      {photoLoading && <div style={{textAlign:'center',padding:'20px',color:C.textSm,fontSize:12,fontFamily:Fui}}>Loading…</div>}
                      {!photoLoading && photos.length===0 && (
                        <button onClick={()=>loadPhotos()} style={{...UI,width:'100%',padding:'10px',border:`1.5px solid ${C.border}`,borderRadius:9,background:C.panelSub,cursor:'pointer',fontSize:12,color:C.textMd,fontWeight:600,transition:'all .13s'}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>Load photos</button>
                      )}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                        {photos.map((p:any)=>(
                          <div key={p.id} style={{position:'relative',overflow:'hidden',borderRadius:9}}>
                            <img src={p.thumb} alt="" className="phimg" onClick={()=>addStockPhoto(p.url)} loading="lazy"/>
                            {p.author && <span style={{position:'absolute',bottom:4,left:4,fontSize:8,color:'rgba(255,255,255,.7)',background:'rgba(0,0,0,.4)',padding:'1px 4px',borderRadius:4,fontFamily:Fui,pointerEvents:'none'}}>{p.author}</span>}
                          </div>
                        ))}
                      </div>
                      {photos.length>0&&!photoLoading&&!photoSearch&&(
                        <button onClick={()=>{const np=photoPage+1;setPhotoPage(np);loadPhotos('',np)}} style={{...UI,width:'100%',marginTop:8,padding:'8px',border:`1.5px solid ${C.border}`,borderRadius:9,background:C.panelSub,cursor:'pointer',fontSize:12,color:C.textMd,fontWeight:600,transition:'all .13s'}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>Load more</button>
                      )}
                    </div>
                  </div>
                )}

                {/* ICONS LIBRARY */}
                {leftTab==='icons' && (
                  <div>
                    <input value={iconSearch} onChange={e=>setIconSearch(e.target.value)} placeholder="Search icons…"
                      style={{...UI,width:'100%',padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text,background:'#fff',outline:'none',marginBottom:9}}
                      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
                      {['All',...ICON_CATS].map(c=>(
                        <button key={c} className={`cpill${iconCat===c?' on':''}`} onClick={()=>setIconCat(c)} style={{fontSize:10,padding:'3px 8px'}}>{c}</button>
                      ))}
                    </div>
                    {(() => {
                      const filtered = ICON_LIB.filter(ic =>
                        (iconCat==='All'||ic.cat===iconCat) &&
                        (ic.label.toLowerCase().includes(iconSearch.toLowerCase())||ic.id.includes(iconSearch.toLowerCase()))
                      )
                      return (
                        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4}}>
                          {filtered.slice(0,100).map(ic=>(
                            <button key={ic.id} title={ic.label}
                              onClick={()=>{
                                const fab=fabricLib.current||(window as any).fabric
                                const fc=fabricRef.current
                                if(!fc||!fab) return
                                const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${fillColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ic.d}"/></svg>`
                                const blob=new Blob([svg],{type:'image/svg+xml'})
                                const url=URL.createObjectURL(blob)
                                fab.Image.fromURL(url,(img:any)=>{
                                  img.set({left:Math.round(cWRef.current*.4),top:Math.round(cHRef.current*.4),scaleX:3,scaleY:3})
                                  fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHist()
                                  URL.revokeObjectURL(url)
                                })
                              }}
                              style={{padding:'7px 3px',border:`1px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all .12s'}}
                              onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.background=C.accentLt}}
                              onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.background='#fff'}}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMd} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d={ic.d}/>
                              </svg>
                              <span style={{fontSize:7,color:C.textSm,fontFamily:Fui,textAlign:'center',lineHeight:1.2,overflow:'hidden',width:'100%',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ic.label}</span>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                    {iconSearch===''&&iconCat==='All'&&<p style={{fontSize:10,color:C.textSm,marginTop:10,fontFamily:Fui,textAlign:'center'}}>Showing 100 of {ICON_LIB.length}+ icons. Search or filter by category.</p>}
                  </div>
                )}

                {/* LAYERS */}
                {leftTab==='layers' && <Layers/>}
              </div>
            </>
          )}
        </div>

        {/* ── CANVAS + RIGHT ───────────────────────────────────────────────── */}
        <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>
          {/* Canvas viewport */}
          <div style={{flex:1,overflow:'auto',background:C.desk,backgroundImage:`radial-gradient(rgba(0,0,0,0.035) 1.5px, transparent 1.5px)`,backgroundSize:'28px 28px',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'52px 40px',position:'relative'}}>
            {/* Canvas — Fabric handles DPR via enableRetinaScaling, NO CSS transform */}
            <div style={{flexShrink:0,boxShadow:'0 6px 40px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.06)',borderRadius:2,background:'#fff',lineHeight:0}}>
              <canvas ref={canvasEl}/>
            </div>

            {/* Floating selection toolbar */}
            {selectedObj && (
              <div style={{position:'fixed',top:60,left:'50%',transform:'translateX(-50%)',background:C.panel,border:`1px solid ${C.border}`,borderRadius:11,boxShadow:C.shadowLg,padding:'3px 6px',display:'flex',alignItems:'center',gap:2,zIndex:50,animation:'fadeup .15s ease'}}>
                {(selectedObj.type==='textbox'||selectedObj.type==='text'||selectedObj.type==='i-text') && (
                  <>
                    <button onClick={()=>setShowFontPicker(!showFontPicker)} style={{...UI,height:28,padding:'0 10px',border:`1.5px solid ${C.border}`,borderRadius:7,background:C.panelSub,cursor:'pointer',fontSize:13,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:600,color:C.text,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',transition:'border-color .13s'}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>{fontFamily}</button>
                    <input type="number" value={fontSize} min={6} max={400} onChange={e=>{const v=parseInt(e.target.value)||fontSize;setFontSize(v);upd('fontSize',v)}} style={{...UI,width:46,height:28,border:`1.5px solid ${C.border}`,borderRadius:7,padding:'0 6px',fontSize:12,fontFamily:Fmono,color:C.text,background:C.panelSub,outline:'none',textAlign:'center'}}/>
                    <input type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);upd('fill',e.target.value)}} style={{width:28,height:28,borderRadius:7,border:`1.5px solid ${C.border}`,cursor:'pointer',padding:0}}/>
                    {[{icon:'bold' as const,prop:'fontWeight',on:'bold',off:'normal',active:selectedObj.fontWeight==='bold'||selectedObj.fontWeight===800},{icon:'italic' as const,prop:'fontStyle',on:'italic',off:'normal',active:selectedObj.fontStyle==='italic'}].map(f=>(
                      <IBtn key={f.icon} icon={f.icon} label={f.icon} active={f.active} onClick={()=>upd(f.prop,f.active?f.off:f.on)} size={14}/>
                    ))}
                    <div style={{width:1,height:18,background:C.border,margin:'0 1px'}}/>
                  </>
                )}
                <IBtn icon="copy"  label="Duplicate ⌘D" onClick={dupSel} size={14}/>
                <IBtn icon="trash" label="Delete"        onClick={delSel} size={14} danger/>
              </div>
            )}

            {/* Zoom controls */}
            <div style={{position:'fixed',bottom:108,right:rightOpen?265:16,display:'flex',alignItems:'center',gap:1,background:C.panel,border:`1px solid ${C.border}`,borderRadius:9,padding:'3px',boxShadow:C.shadowMd,zIndex:20,transition:'right .2s'}}>
              <button onClick={()=>{const z=Math.max(.08,zoom-.1);setZoom(z);zRef.current=z;applyZoom(z)}} style={{width:28,height:28,border:'none',background:'none',cursor:'pointer',borderRadius:6,color:C.text,display:'flex',alignItems:'center',justifyContent:'center',transition:'background .12s'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                <Icon name="zoomOut" size={15} color={C.text}/>
              </button>
              <span style={{fontSize:11,fontWeight:700,color:C.textSd,minWidth:40,textAlign:'center',fontFamily:Fmono}}>{Math.round(zoom*100)}%</span>
              <button onClick={()=>{const z=Math.min(3,zoom+.1);setZoom(z);zRef.current=z;applyZoom(z)}} style={{width:28,height:28,border:'none',background:'none',cursor:'pointer',borderRadius:6,color:C.text,display:'flex',alignItems:'center',justifyContent:'center',transition:'background .12s'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>
                <Icon name="zoomIn" size={15} color={C.text}/>
              </button>
              <div style={{width:1,height:16,background:C.border,margin:'0 1px'}}/>
              <button onClick={()=>{const z=.58;setZoom(z);zRef.current=z;applyZoom(z)}} style={{...UI,height:28,padding:'0 7px',border:'none',background:'none',cursor:'pointer',fontSize:11,fontWeight:700,color:C.textSm,borderRadius:6,transition:'background .12s'}} onMouseOver={e=>(e.currentTarget.style.background=C.hover)} onMouseOut={e=>(e.currentTarget.style.background='none')}>FIT</button>
            </div>
          </div>

          {/* Right panel collapse tab */}
          {!rightOpen && (
            <button onClick={toggleRight} title="Expand properties" style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',width:18,height:48,background:C.panel,border:`1px solid ${C.border}`,borderRadius:'8px 0 0 8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textMd,zIndex:10,borderRight:'none',boxShadow:'-2px 0 8px rgba(0,0,0,.05)'}}>
              <Icon name="chevL" size={11} color={C.textMd}/>
            </button>
          )}

          {/* Right panel */}
          {rightOpen && <RightPanel/>}
        </div>
      </div>

      {/* ── PAGES STRIP ─────────────────────────────────────────────────────── */}
      <div style={{height:100,background:C.panel,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',flexShrink:0,boxShadow:'0 -1px 0 rgba(0,0,0,.04)'}}>
        <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',gap:8,padding:'0 14px',height:'100%'}}>
          {pages.map((_,i)=>{
            const tw=Math.round(canvasW*(70/canvasH))
            return (
              <div key={i} className={`thumb${currentPage===i?' on':''}`} style={{width:Math.max(tw,52),height:70}} onClick={()=>switchPage(i)}>
                {thumbnails[i]
                  ? <img src={thumbnails[i]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <div style={{width:'100%',height:'100%',background:C.panelSub,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:10,color:C.textSm,fontFamily:Fmono}}>{i+1}</span></div>
                }
                {/* Hover actions */}
                <div className="ta" style={{position:'absolute',top:3,right:3,gap:2}}>
                  <button onClick={e=>{e.stopPropagation();dupPage(i)}} style={{width:17,height:17,borderRadius:4,background:'rgba(255,255,255,.95)',border:`1px solid ${C.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}} title="Duplicate">
                    <Icon name="copy" size={9} color={C.textMd}/>
                  </button>
                  {pages.length>1&&<button onClick={e=>{e.stopPropagation();delPage(i)}} style={{width:17,height:17,borderRadius:4,background:'rgba(255,255,255,.95)',border:`1px solid #FECACA`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}} title="Delete">
                    <Icon name="close" size={9} color={C.red}/>
                  </button>}
                </div>
                <div style={{position:'absolute',bottom:2,left:0,right:0,textAlign:'center',fontSize:8,color:C.textSm,fontFamily:Fmono,lineHeight:1}}>{i+1}</div>
              </div>
            )
          })}
          <button onClick={addPage} style={{...UI,flexShrink:0,width:50,height:70,border:`2px dashed ${C.borderSt}`,borderRadius:9,background:'transparent',cursor:'pointer',fontSize:10,fontWeight:600,color:C.textMd,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,transition:'all .13s'}} onMouseOver={e=>{(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget).style.borderColor=C.borderSt;(e.currentTarget).style.color=C.textMd}}>
            <Icon name="plus" size={14} color="currentColor" w={1.8}/>Add
          </button>
        </div>
        <div style={{padding:'0 14px',borderLeft:`1px solid ${C.border}`,height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',flexShrink:0,minWidth:64}}>
          <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:Fui}}>{currentPage+1} / {pages.length}</span>
          <span style={{fontSize:10,color:C.textSm,fontFamily:Fui}}>pages</span>
        </div>
      </div>

      {/* ══ DOCUMENT TYPE MODAL ═══════════════════════════════════════════════ */}
      {showTypeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.48)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
          <div style={{background:C.panel,borderRadius:20,width:'min(920px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.22)',border:`1px solid ${C.border}`}}>
            <div style={{padding:'28px 32px 20px',flexShrink:0}}>
              <h2 style={{...UI,margin:'0 0 8px',fontSize:24,fontWeight:800,color:C.text,letterSpacing:'-.02em'}}>What are you creating?</h2>
              <p style={{...UI,margin:0,fontSize:14,color:C.textMd}}>Folio sets the right canvas size and layouts automatically. Change anytime inside the editor.</p>
            </div>
            <div style={{overflow:'auto',padding:'0 32px 32px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
                {DOC_TYPES.map(t=>(
                  <button key={t.id} onClick={()=>selectDocType(t.id)}
                    style={{...UI,border:`2px solid ${docType===t.id?C.accent:C.border}`,borderRadius:14,padding:'20px 18px',cursor:'pointer',background:docType===t.id?C.accentLt:'#fff',textAlign:'left',transition:'all .15s'}}
                    onMouseOver={e=>{if(docType!==t.id){(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.transform='translateY(-2px)';(e.currentTarget).style.boxShadow=C.shadowMd}}}
                    onMouseOut={e=>{if(docType!==t.id){(e.currentTarget).style.borderColor=C.border;(e.currentTarget).style.transform='';(e.currentTarget).style.boxShadow=''}}}>
                    <div style={{fontSize:38,marginBottom:14,lineHeight:1}}>{t.icon}</div>
                    <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4,fontFamily:Fui}}>{t.label}</div>
                    <div style={{fontSize:12,color:C.textMd,marginBottom:12,lineHeight:1.5,fontFamily:Fui}}>{t.desc}</div>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,padding:'2px 7px',background:C.panelSub,color:C.textMd,borderRadius:20,fontFamily:Fmono,fontWeight:500}}>{SIZES.find(s=>s.id===t.size)?.label}</span>
                      {t.sign && <span style={{fontSize:10,padding:'2px 7px',background:'#DCFCE7',color:C.green,borderRadius:20,fontFamily:Fui,fontWeight:700}}>✓ Signing</span>}
                    </div>
                  </button>
                ))}
              </div>
              {!isFirstOpen && (
                <div style={{textAlign:'center',marginTop:20}}>
                  <button onClick={()=>setShowTypeModal(false)} style={{...UI,background:'none',border:'none',cursor:'pointer',fontSize:13,color:C.textMd,fontWeight:500,textDecoration:'underline'}}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ SHARE PANEL ══════════════════════════════════════════════════════ */}
      {showShare && <ShareDrawer documentId={params.id} links={shareLinks} onClose={()=>setShowShare(false)} onRefresh={loadLinks} isActive={isActive} onPublish={publish} supportsSign={supSign}/>}

      {/* ══ AI DRAFTER ═══════════════════════════════════════════════════════ */}
      {showDrafter && (
        <AIDrafter documentType={doc?.type??'document'} onDraftComplete={(html:string)=>{
          const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
          const stripped=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
          const newPage=pg('#ffffff',[tx(stripped,{l:60,t:60,w:cWRef.current-120,fs:15,ff:'Inter',fill:'#111111',lh:1.6})])
          const upd2=[...pagesRef.current,newPage]; pagesRef.current=upd2; setPages(upd2)
          const ni=upd2.length-1; setCurrentPage(ni); cpRef.current=ni
          loadIntoFabric(newPage,cWRef.current,cHRef.current); scheduleSave()
        }} onClose={()=>setShowDrafter(false)}/>
      )}

      {/* ══ SIGN MODAL ═════════════════════════════════════════════════════ */}
      {showSignModal && (
        <SignModal
          signerName=""
          onSign={(dataUrl: string, name: string) => {
            const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab) return
            fab.Image.fromURL(dataUrl, (img: any) => {
              const s=Math.min(cWRef.current*.36/img.width, cHRef.current*.22/img.height, 1)
              img.set({left:Math.round(cWRef.current*.32),top:Math.round(cHRef.current*.66),scaleX:s,scaleY:s})
              fc.add(img); fc.setActiveObject(img); fc.renderAll(); pushHist(); scheduleSave()
            })
            setShowSignModal(false)
          }}
          onClose={() => setShowSignModal(false)}
        />
      )}

      {/* ══ EXPORT MODAL ═══════════════════════════════════════════════════ */}
      {showExportModal && (
        <ExportModal
          pageCount={pages.length}
          docTitle={title || 'Document'}
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
          isExporting={isExporting}
        />
      )}

      {/* ══ CHART BUILDER ══════════════════════════════════════════════════ */}
      {showChartBuilder && (
        <ChartBuilder
          onAdd={addChartToCanvas}
          onClose={() => setShowChartBuilder(false)}
        />
      )}
    </div>
  )
}

// ─── Share drawer ─────────────────────────────────────────────────────────────
function ShareDrawer({ documentId, links, onClose, onRefresh, isActive, onPublish, supportsSign }:{
  documentId:string; links:ShareLink[]; onClose:()=>void; onRefresh:()=>void; isActive:boolean; onPublish:()=>void; supportsSign:boolean
}) {
  const [creating, setCreating] = useState(false)
  const [label, setLabel]       = useState('')
  const [reqEmail, setReqEmail] = useState(false)
  const [allowDl, setAllowDl]   = useState(false)
  const [pw, setPw]             = useState('')
  const [copied, setCopied]     = useState<string|null>(null)
  const [showNew, setShowNew]   = useState(links.length===0)

  async function create() {
    setCreating(true)
    const token = generateToken(14)
    await supabase.from('share_links').insert({ document_id:documentId, token, label:label||'Share link', require_email:reqEmail, allow_download:allowDl, password:pw||null, is_active:true })
    await onRefresh(); setShowNew(false); setLabel(''); setPw(''); setReqEmail(false); setAllowDl(false); setCreating(false)
  }
  function copy(token:string) { navigator.clipboard.writeText(buildShareUrl(token)); setCopied(token); setTimeout(()=>setCopied(null),2000) }
  async function toggle(id:string, active:boolean) { await supabase.from('share_links').update({is_active:active}).eq('id',id); onRefresh() }
  async function del(id:string) { await supabase.from('share_links').delete().eq('id',id); onRefresh() }

  const F2ui = Fui

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.42)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'flex-end',backdropFilter:'blur(6px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{width:428,height:'100vh',background:'#fff',borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',boxShadow:'-20px 0 60px rgba(0,0,0,.12)'}}>
        {/* Header */}
        <div style={{padding:'22px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <h2 style={{margin:'0 0 3px',fontSize:18,fontWeight:800,color:C.text,fontFamily:F2ui}}>Share &amp; Track</h2>
            <p style={{margin:0,fontSize:12,color:C.textSm,fontFamily:F2ui}}>{links.length} link{links.length!==1?'s':''} · {links.reduce((a,l)=>a+(l.view_count||0),0)} total views</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,background:C.panelSub,border:`1px solid ${C.border}`,cursor:'pointer',color:C.textMd,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .13s'}} onMouseOver={e=>{(e.currentTarget).style.background=C.hover}} onMouseOut={e=>{(e.currentTarget).style.background=C.panelSub}}>
            <Icon name="close" size={13} color={C.textMd}/>
          </button>
        </div>

        {!isActive && (
          <div style={{margin:'14px 16px',padding:'14px 16px',background:'#FFFBEB',border:`1px solid #FDE68A`,borderRadius:12}}>
            <p style={{margin:'0 0 3px',fontSize:13,fontWeight:700,color:'#92400E',fontFamily:F2ui}}>Not published yet</p>
            <p style={{margin:'0 0 10px',fontSize:12,color:'#A16207',fontFamily:F2ui}}>Publish to enable link sharing and tracking.</p>
            <button onClick={onPublish} style={{padding:'6px 14px',borderRadius:8,background:C.amber,color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:F2ui}}>Publish now</button>
          </div>
        )}

        {supportsSign && (
          <div style={{margin:'0 16px 12px',padding:'12px 14px',background:C.accentLt,border:`1px solid ${C.accentMd}`,borderRadius:12,display:'flex',gap:10,alignItems:'flex-start'}}>
            <span style={{fontSize:18,flexShrink:0}}>✍</span>
            <div><p style={{margin:'0 0 2px',fontSize:12,fontWeight:700,color:C.accent,fontFamily:F2ui}}>Signing enabled</p><p style={{margin:0,fontSize:11,color:C.textMd,lineHeight:1.55,fontFamily:F2ui}}>Add a Signature Block from the Elements tab to let recipients sign with Folio's digital stamp.</p></div>
          </div>
        )}

        <div style={{flex:1,overflow:'auto',padding:'0 16px 16px'}}>
          {links.length>0 && (
            <div style={{marginBottom:16}}>
              <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',margin:'14px 0 10px',fontFamily:F2ui}}>Active links</p>
              {links.map(link=>(
                <div key={link.id} style={{border:`1px solid ${C.border}`,borderRadius:13,padding:'14px 16px',marginBottom:9,background:C.panelSub}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{flex:1,fontSize:13,fontWeight:600,color:C.text,fontFamily:F2ui}}>{link.label??'Share link'}</span>
                    <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:link.is_active?'#DCFCE7':'#F1F5F9',color:link.is_active?C.green:C.textMd,border:`1px solid ${link.is_active?'#BBF7D0':C.border}`}}>{link.is_active?'LIVE':'OFF'}</span>
                  </div>
                  <div style={{display:'flex',gap:6,marginBottom:10}}>
                    <code style={{flex:1,fontSize:11,color:C.textMd,background:'#fff',padding:'5px 9px',borderRadius:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',border:`1px solid ${C.border}`,fontFamily:Fmono}}>{buildShareUrl(link.token)}</code>
                    <button onClick={()=>copy(link.token)} style={{padding:'5px 12px',background:copied===link.token?'#DCFCE7':'#fff',border:`1px solid ${copied===link.token?'#BBF7D0':C.border}`,borderRadius:8,fontSize:12,cursor:'pointer',color:copied===link.token?C.green:C.textSd,fontWeight:700,whiteSpace:'nowrap',fontFamily:F2ui,transition:'all .13s'}}>
                      {copied===link.token?'✓ Copied':'Copy'}
                    </button>
                  </div>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <span style={{fontSize:12,color:C.textMd,fontWeight:500,fontFamily:F2ui}}>{link.view_count??0} views</span>
                    {link.require_email && <span style={{fontSize:11,color:C.textSm,fontFamily:F2ui}}>· Email gate</span>}
                    <button onClick={()=>toggle(link.id,!link.is_active)} style={{fontSize:12,color:C.accent,background:'none',border:'none',cursor:'pointer',fontWeight:700,fontFamily:F2ui}}>{link.is_active?'Disable':'Enable'}</button>
                    <button onClick={()=>del(link.id)} style={{fontSize:12,color:C.red,background:'none',border:'none',cursor:'pointer',fontWeight:700,fontFamily:F2ui}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showNew ? (
            <div style={{border:`1px solid ${C.border}`,borderRadius:13,padding:16,background:C.panelSub}}>
              <p style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14,fontFamily:F2ui}}>New share link</p>
              <div style={{display:'flex',flexDirection:'column',gap:11}}>
                <div><p style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:5,fontFamily:F2ui}}>Label</p><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Sequoia Partners" style={{width:'100%',padding:'8px 11px',border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,color:C.text,background:'#fff',outline:'none',fontFamily:F2ui}}/></div>
                <div><p style={{fontSize:11,fontWeight:600,color:C.textMd,marginBottom:5,fontFamily:F2ui}}>Password (optional)</p><input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Leave blank for none" style={{width:'100%',padding:'8px 11px',border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,color:C.text,background:'#fff',outline:'none',fontFamily:F2ui}}/></div>
                <div style={{display:'flex',gap:18}}>
                  <label style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:C.text,cursor:'pointer',fontWeight:500,fontFamily:F2ui}}><input type="checkbox" checked={reqEmail} onChange={e=>setReqEmail(e.target.checked)} style={{accentColor:C.accent,width:15,height:15}}/> Require email</label>
                  <label style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:C.text,cursor:'pointer',fontWeight:500,fontFamily:F2ui}}><input type="checkbox" checked={allowDl} onChange={e=>setAllowDl(e.target.checked)} style={{accentColor:C.accent,width:15,height:15}}/> Allow download</label>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setShowNew(false)} style={{flex:1,padding:'9px',border:`1.5px solid ${C.border}`,borderRadius:9,background:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,color:C.textSd,fontFamily:F2ui}}>Cancel</button>
                  <button onClick={create} disabled={creating} style={{flex:1,padding:'9px',border:'none',borderRadius:9,background:C.accent,color:'#fff',fontSize:13,cursor:'pointer',fontWeight:800,opacity:creating?.55:1,fontFamily:F2ui,transition:'opacity .13s'}}>{creating?'Creating…':'Create link'}</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowNew(true)} style={{width:'100%',padding:'11px',border:`2px dashed ${C.borderSt}`,borderRadius:11,background:'transparent',cursor:'pointer',fontSize:13,color:C.textSd,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:7,fontFamily:F2ui,transition:'all .14s'}} onMouseOver={e=>{(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget).style.borderColor=C.borderSt;(e.currentTarget).style.color=C.textSd}}>
              <Icon name="plus" size={13} color="currentColor" w={2}/>New link
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 16px',borderTop:`1px solid ${C.border}`,background:C.panelSub}}>
          <p style={{fontSize:12,color:C.textMd,margin:'0 0 5px',fontWeight:600,fontFamily:F2ui}}>📊 Every view is tracked automatically</p>
          <p style={{fontSize:11,color:C.textSm,margin:0,lineHeight:1.6,fontFamily:F2ui}}>Page dwell time · Forwarding chains · Engagement scores · AI follow-up insights</p>
        </div>
      </div>
    </div>
  )
}
