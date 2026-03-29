'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  accent:'#5B50E8', accentLt:'#EEEDFB', accentMd:'#BDB9F4', accentHv:'#4940D4',
  border:'#E4E0DB', borderSt:'#C8C3BC',
  text:'#0F0F0F', textSd:'#2A2A2A', textMd:'#6B6868', textSm:'#9B9898',
  hover:'#F5F3F0', panel:'#FFFFFF', panelSub:'#F7F6F4',
  green:'#16A34A', red:'#DC2626', amber:'#D97706',
  shadow:'0 1px 3px rgba(0,0,0,.08)',
  shadowMd:'0 4px 16px rgba(0,0,0,.10)',
  shadowLg:'0 16px 48px rgba(0,0,0,.16)',
}
const F  = "'Inter',-apple-system,BlinkMacSystemFont,sans-serif"
const FM = "'JetBrains Mono',monospace"

// ── Types ──────────────────────────────────────────────────────────────────────
interface BrandColor { id:string; hex:string; name:string; group?:string }
interface BrandFont  { id:string; name:string; family:string; source:'google'|'upload'; url?:string; variants?:string[] }
interface BrandLogo  { id:string; url:string; name:string; type:'primary'|'secondary'|'mark'|'wordmark'|'dark'|'light' }
interface BrandKitData   {
  id?:string; userId?:string; name:string; tagline?:string
  colors:BrandColor[]; fonts:BrandFont[]; logos:BrandLogo[]
  updatedAt?:string
}

interface Props {
  onApplyColor:(hex:string)=>void
  onApplyFont:(name:string, url?:string)=>void
  onAddLogo:(dataUrl:string)=>void
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2,10) }
function darken(hex:string, amt:number):string {
  const n=parseInt(hex.replace('#',''),16)
  const r=Math.max(0,Math.min(255,(n>>16)-Math.round(255*amt)))
  const g=Math.max(0,Math.min(255,((n>>8)&0xff)-Math.round(255*amt)))
  const b=Math.max(0,Math.min(255,(n&0xff)-Math.round(255*amt)))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}
function hexToHsl(hex:string):[number,number,number] {
  let r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255
  const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s=0,l=(max+min)/2
  if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6}}
  return [Math.round(h*360),Math.round(s*100),Math.round(l*100)]
}
function generateShades(hex:string):string[] {
  const shades=[-0.40,-0.24,-0.12,0,0.12,0.24,0.38]
  return shades.map(a=>{
    const n=parseInt(hex.replace('#',''),16)
    const fn=(c:number)=>Math.max(0,Math.min(255,a<0?c+Math.round(255*Math.abs(a)):c-Math.round(255*a)))
    const r=fn(n>>16), g=fn((n>>8)&0xff), b2=fn(n&0xff)
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b2.toString(16).padStart(2,'0')}`
  })
}
function isLight(hex:string):boolean {
  const n=parseInt(hex.replace('#',''),16)
  return (0.299*(n>>16)+0.587*((n>>8)&0xff)+0.114*(n&0xff))/255>.6
}

// ── Popular Google Fonts ────────────────────────────────────────────────────────
const GOOGLE_FONTS = [
  'Inter','Jost','Plus Jakarta Sans','DM Sans','Outfit','Syne','Manrope',
  'Rubik','Work Sans','Raleway','Montserrat','Open Sans','Lato','Barlow',
  'Space Grotesk','Nunito Sans','Poppins','Figtree','Urbanist','Geist',
  'Playfair Display','Cormorant Garamond','Merriweather','Lora','EB Garamond',
  'Fraunces','Gloock','DM Serif Display','Libre Baskerville','Spectral',
  'Bebas Neue','Oswald','Anton','Righteous','Archivo Black','Unbounded',
  'Dancing Script','Great Vibes','Pacifico','Sacramento','Satisfy',
  'JetBrains Mono','IBM Plex Mono','Fira Code','Space Mono',
  'Nunito','Quicksand','Comfortaa','Fredoka',
]

const LOGO_TYPES = ['primary','secondary','mark','wordmark','dark','light'] as const
const COLOR_GROUPS = ['Brand','Primary','Secondary','Neutral','Accent','Text','Background','Custom']

const DEFAULT_KIT:BrandKit = {
  name:'My Brand',
  colors:[
    {id:'c1',hex:'#5B50E8',name:'Primary',group:'Brand'},
    {id:'c2',hex:'#0F172A',name:'Dark',group:'Brand'},
    {id:'c3',hex:'#FFFFFF',name:'White',group:'Brand'},
    {id:'c4',hex:'#6B7280',name:'Neutral',group:'Neutral'},
  ],
  fonts:[
    {id:'f1',name:'Inter',family:'Inter',source:'google'},
    {id:'f2',name:'Playfair Display',family:'Playfair Display',source:'google'},
  ],
  logos:[],
}

// ── SECTION COMPONENT ──────────────────────────────────────────────────────────
function Section({ title, count, children, action }: { title:string; count?:number; children:React.ReactNode; action?:React.ReactNode }) {
  return (
    <div style={{marginBottom:28}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <h3 style={{margin:0,fontSize:13,fontWeight:700,color:C.text,fontFamily:F,letterSpacing:'-.01em'}}>{title}</h3>
          {count!==undefined&&<span style={{fontSize:10,fontWeight:700,color:C.textSm,background:C.panelSub,padding:'1px 7px',borderRadius:20,fontFamily:FM}}>{count}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── COLOR SWATCH ───────────────────────────────────────────────────────────────
function ColorSwatch({ c, onApply, onRemove, onEdit }: { c:BrandColor; onApply:()=>void; onRemove:()=>void; onEdit:(hex:string,name:string)=>void }) {
  const [hov, setHov]=useState(false)
  const light=isLight(c.hex)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{borderRadius:12,overflow:'hidden',border:`1.5px solid ${C.border}`,transition:'all .14s',boxShadow:hov?C.shadowMd:C.shadow}}>
      <button onClick={onApply} title={`Apply ${c.name}`}
        style={{width:'100%',height:60,background:c.hex,border:'none',cursor:'pointer',display:'block',position:'relative',transition:'all .13s'}}>
        {hov&&(
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.12)'}}>
            <span style={{fontSize:10,fontWeight:700,color:light?'rgba(0,0,0,.7)':'rgba(255,255,255,.9)',fontFamily:F}}>Apply</span>
          </div>
        )}
      </button>
      <div style={{padding:'7px 9px',background:'#fff',display:'flex',flexDirection:'column',gap:2}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:11,fontWeight:600,color:C.textSd,fontFamily:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80}}>{c.name}</span>
          <div style={{display:'flex',gap:3}}>
            <button onClick={()=>onEdit(c.hex,c.name)} style={{fontSize:9,padding:'2px 5px',border:`1px solid ${C.border}`,borderRadius:4,background:'#fff',cursor:'pointer',color:C.textMd,fontFamily:F,fontWeight:600}}>Edit</button>
            <button onClick={onRemove} style={{fontSize:9,padding:'2px 5px',border:`1px solid #FEE2E2`,borderRadius:4,background:'#FFF5F5',cursor:'pointer',color:C.red,fontFamily:F,fontWeight:600}}>✕</button>
          </div>
        </div>
        <span style={{fontSize:9,color:C.textSm,fontFamily:FM}}>{c.hex.toUpperCase()}</span>
      </div>
    </div>
  )
}

// ── FONT CARD ──────────────────────────────────────────────────────────────────
function FontCard({ f, onApply, onRemove }: { f:BrandFont; onApply:()=>void; onRemove:()=>void }) {
  const [hov,setHov]=useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{border:`1.5px solid ${hov?C.accentMd:C.border}`,borderRadius:11,overflow:'hidden',transition:'all .14s',boxShadow:hov?C.shadowMd:C.shadow}}>
      <button onClick={onApply}
        style={{width:'100%',padding:'14px 14px 10px',border:'none',cursor:'pointer',textAlign:'left',background:hov?'#FAFAFF':'#FAFAL8',transition:'all .13s'}}>
        <div style={{fontSize:26,fontFamily:`'${f.family}',sans-serif,serif`,color:C.text,lineHeight:1.2,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          Aa Bb Cc
        </div>
        <div style={{fontSize:11,fontFamily:`'${f.family}',sans-serif`,color:C.textMd,marginBottom:2}}>
          The quick brown fox
        </div>
      </button>
      <div style={{padding:'7px 12px 9px',background:'#fff',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:F}}>{f.name}</div>
          <div style={{fontSize:9,color:C.textSm,fontFamily:F,marginTop:1,display:'flex',alignItems:'center',gap:4}}>
            <span style={{padding:'1px 5px',background:f.source==='upload'?'#FEF3C7':'#EEF2FF',color:f.source==='upload'?C.amber:C.accent,borderRadius:3,fontWeight:700}}>
              {f.source==='upload'?'Custom':'Google'}
            </span>
            {f.source==='upload'&&<span style={{color:C.textSm}}>OTF/TTF</span>}
          </div>
        </div>
        <button onClick={onRemove} style={{padding:'4px 10px',border:`1px solid #FEE2E2`,borderRadius:7,background:'#FFF5F5',cursor:'pointer',color:C.red,fontSize:11,fontWeight:600,fontFamily:F}}>Remove</button>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function BrandKit({ onApplyColor, onApplyFont, onAddLogo }: Props) {
  const [kit, setKit]         = useState<BrandKitData>(DEFAULT_KIT)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'colors'|'fonts'|'logos'>('colors')

  // Color editor
  const [showColorAdd, setShowColorAdd]   = useState(false)
  const [editColor, setEditColor]         = useState<BrandColor|null>(null)
  const [newHex, setNewHex]               = useState('#5B50E8')
  const [newColorName, setNewColorName]   = useState('')
  const [newColorGroup, setNewColorGroup] = useState('Brand')
  const [showShades, setShowShades]       = useState(false)
  const [colorFilter, setColorFilter]     = useState('All')

  // Font editor
  const [fontTab, setFontTab]       = useState<'browse'|'upload'>('browse')
  const [fontSearch, setFontSearch] = useState('')
  const [uploadingFont, setUploadingFont] = useState(false)

  // Logo editor
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoType, setLogoType]           = useState<typeof LOGO_TYPES[number]>('primary')

  // Refs
  const logoRef  = useRef<HTMLInputElement>(null)
  const fontRef  = useRef<HTMLInputElement>(null)
  const saveTimer= useRef<NodeJS.Timeout|null>(null)

  // ── Load from Supabase ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data } = await supabase.from('brand_kits').select('*').eq('user_id', user.id).single()
        if (data?.kit_data) {
          setKit({ ...DEFAULT_KIT, ...data.kit_data, id: data.id, userId: user.id })
        } else {
          setKit(k => ({ ...k, userId: user.id }))
        }
      } catch {
        // Fallback to localStorage
        try { const s=localStorage.getItem('folio_brand'); if(s) setKit(JSON.parse(s)) } catch {}
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Save (debounced) to Supabase + localStorage ────────────────────────────
  const saveKit = useCallback(async (k: BrandKit) => {
    localStorage.setItem('folio_brand', JSON.stringify(k))
    if (!k.userId) return
    setSaving(true)
    try {
      const payload = { user_id: k.userId, kit_data: k, updated_at: new Date().toISOString() }
      if (k.id) {
        await supabase.from('brand_kits').update(payload).eq('id', k.id)
      } else {
        const { data } = await supabase.from('brand_kits').insert(payload).select().single()
        if (data) setKit(prev => ({ ...prev, id: data.id }))
      }
    } catch {}
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }, [])

  function update(k: BrandKit) {
    setKit(k)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveKit(k), 800)
  }

  // ── Colors ────────────────────────────────────────────────────────────────────
  function addColor() {
    const c: BrandColor = { id:uid(), hex:newHex, name:newColorName||newHex, group:newColorGroup }
    update({ ...kit, colors:[...kit.colors, c] })
    setNewHex('#5B50E8'); setNewColorName(''); setShowColorAdd(false)
  }
  function editColorSave() {
    if (!editColor) return
    const colors = kit.colors.map(c => c.id===editColor.id ? editColor : c)
    update({ ...kit, colors }); setEditColor(null)
  }
  function removeColor(id:string) { update({ ...kit, colors:kit.colors.filter(c=>c.id!==id) }) }

  const shades = generateShades(newHex)
  const groups = ['All', ...Array.from(new Set(kit.colors.map(c=>c.group||'Custom')))]
  const filtColors = colorFilter==='All' ? kit.colors : kit.colors.filter(c=>(c.group||'Custom')===colorFilter)

  // ── Fonts ─────────────────────────────────────────────────────────────────────
  function addGoogleFont(name:string) {
    if (kit.fonts.find(f=>f.name===name)) return
    const f: BrandFont = { id:uid(), name, family:name, source:'google' }
    // Inject font
    const safe=name.replace(/ /,'+')
    if (!document.getElementById(`gf-${safe}`)) {
      const l=document.createElement('link'); l.id=`gf-${safe}`; l.rel='stylesheet'
      l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@300;400;500;600;700;800&display=swap`
      document.head.appendChild(l)
    }
    update({ ...kit, fonts:[...kit.fonts, f] })
  }
  function removeFont(id:string) { update({ ...kit, fonts:kit.fonts.filter(f=>f.id!==id) }) }

  async function uploadFontFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingFont(true)
    try {
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string
        // Create @font-face dynamically
        const familyName = file.name.replace(/\.(otf|ttf|woff2?)/i,'').replace(/[-_]/g,' ')
        const style = document.createElement('style')
        style.textContent = `@font-face { font-family: '${familyName}'; src: url('${dataUrl}'); }`
        document.head.appendChild(style)
        const f: BrandFont = { id:uid(), name:familyName, family:familyName, source:'upload', url:dataUrl }
        update({ ...kit, fonts:[...kit.fonts, f] })
        setUploadingFont(false)
      }
      reader.readAsDataURL(file)
    } catch { setUploadingFont(false) }
    e.target.value = ''
  }

  const filtFonts = GOOGLE_FONTS.filter(f => {
    const added = kit.fonts.some(kf=>kf.name===f)
    const match = !fontSearch || f.toLowerCase().includes(fontSearch.toLowerCase())
    return !added && match
  })

  // ── Logos ─────────────────────────────────────────────────────────────────────
  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setLogoUploading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      const l: BrandLogo = { id:uid(), url, name:file.name.replace(/\.[^.]+$/,''), type:logoType }
      update({ ...kit, logos:[...kit.logos, l] })
      onAddLogo(url); setLogoUploading(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  function removeLogo(id:string) { update({ ...kit, logos:kit.logos.filter(l=>l.id!==id) }) }

  // ── Inject saved Google fonts on load ─────────────────────────────────────
  useEffect(() => {
    kit.fonts.filter(f=>f.source==='google').forEach(f => {
      const safe=f.family.replace(/ /,'+')
      if (!document.getElementById(`gf-${safe}`)) {
        const l=document.createElement('link'); l.id=`gf-${safe}`; l.rel='stylesheet'
        l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@300;400;500;600;700;800&display=swap`
        document.head.appendChild(l)
      }
    })
    kit.fonts.filter(f=>f.source==='upload'&&f.url).forEach(f => {
      if (!document.querySelector(`[data-font="${f.id}"]`)) {
        const style=document.createElement('style'); style.setAttribute('data-font',f.id)
        style.textContent=`@font-face{font-family:'${f.family}';src:url('${f.url}')}`
        document.head.appendChild(style)
      }
    })
  }, [kit.fonts])

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:200,gap:12}}>
      <div style={{width:28,height:28,border:`3px solid ${C.accentMd}`,borderTopColor:C.accent,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <span style={{fontSize:12,color:C.textSm,fontFamily:F}}>Loading brand kit…</span>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:F}}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* ── KIT HEADER ── */}
      <div style={{padding:'12px 14px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{flex:1}}>
            <input value={kit.name} onChange={e=>update({...kit,name:e.target.value})}
              style={{border:'none',outline:'none',fontSize:16,fontWeight:800,color:C.text,fontFamily:F,background:'transparent',width:'100%',letterSpacing:'-.02em'}}
              placeholder="Brand Name"/>
            <input value={kit.tagline||''} onChange={e=>update({...kit,tagline:e.target.value})}
              style={{border:'none',outline:'none',fontSize:11,color:C.textSm,fontFamily:F,background:'transparent',width:'100%',marginTop:1}}
              placeholder="Tagline or description…"/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {saving&&<span style={{fontSize:9,color:C.textSm,fontFamily:F}}>Saving…</span>}
            {saved&&!saving&&<span style={{fontSize:9,color:C.green,fontFamily:F,fontWeight:600}}>✓ Saved</span>}
            {kit.userId&&<span style={{fontSize:9,padding:'2px 7px',background:'#DCFCE7',color:C.green,borderRadius:10,fontWeight:700,fontFamily:F}}>Cloud sync</span>}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{display:'flex',gap:1,borderBottom:`1.5px solid ${C.border}`,marginBottom:14}}>
          {([['colors','Colors',kit.colors.length],['fonts','Fonts',kit.fonts.length],['logos','Logos',kit.logos.length]] as [typeof tab,string,number][]).map(([t,l,n])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'7px 4px',border:'none',background:'transparent',cursor:'pointer',fontSize:12,fontWeight:700,color:tab===t?C.accent:C.textMd,borderBottom:`2.5px solid ${tab===t?C.accent:'transparent'}`,marginBottom:-1.5,transition:'all .12s',fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              {l}<span style={{fontSize:9,padding:'0 5px',background:tab===t?C.accentLt:C.panelSub,color:tab===t?C.accent:C.textSm,borderRadius:10,fontWeight:700}}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{flex:1,overflow:'auto',padding:'0 14px 14px'}}>

        {/* ════════════════ COLORS TAB ════════════════ */}
        {tab==='colors'&&(
          <div>
            {/* Filter bar */}
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
              {groups.map(g=>(
                <button key={g} onClick={()=>setColorFilter(g)}
                  style={{padding:'3px 10px',fontSize:10,fontWeight:700,border:`1px solid ${colorFilter===g?C.accent:C.border}`,borderRadius:20,background:colorFilter===g?C.accentLt:'#fff',color:colorFilter===g?C.accent:C.textMd,cursor:'pointer',fontFamily:F,transition:'all .11s'}}>
                  {g}
                </button>
              ))}
            </div>

            {/* Color grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:14}}>
              {filtColors.map(c=>(
                <ColorSwatch key={c.id} c={c} onApply={()=>onApplyColor(c.hex)} onRemove={()=>removeColor(c.id)}
                  onEdit={(hex,name)=>setEditColor({...c,hex,name})}/>
              ))}
              {filtColors.length===0&&(
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:20,color:C.textSm,fontSize:12,fontFamily:F}}>
                  No colors in this group yet
                </div>
              )}
            </div>

            {/* Add color */}
            {!showColorAdd ? (
              <button onClick={()=>setShowColorAdd(true)}
                style={{width:'100%',padding:'9px',border:`2px dashed ${C.borderSt}`,borderRadius:11,background:'transparent',cursor:'pointer',fontSize:12,fontWeight:700,color:C.textMd,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',gap:7,transition:'all .13s'}}
                onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}}
                onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.color=C.textMd}}>
                + Add Color
              </button>
            ) : (
              <div style={{border:`1.5px solid ${C.accentMd}`,borderRadius:12,padding:14,background:C.accentLt}}>
                <p style={{fontSize:11,fontWeight:700,color:C.accent,marginBottom:10,fontFamily:F}}>New Color</p>

                {/* Hex + picker */}
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
                  <input type="color" value={newHex} onChange={e=>setNewHex(e.target.value)}
                    style={{width:44,height:44,borderRadius:10,border:`2px solid ${C.border}`,cursor:'pointer',padding:2,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <input value={newHex} onChange={e=>{if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))setNewHex(e.target.value)}}
                      style={{width:'100%',padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,fontFamily:FM,color:C.text,outline:'none',background:'#fff'}}
                      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                </div>

                {/* Auto-generated shades */}
                <div style={{marginBottom:10}}>
                  <p style={{fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5,fontFamily:F}}>Auto shades — click to use</p>
                  <div style={{display:'flex',gap:2}}>
                    {shades.map((s,i)=>(
                      <button key={i} onClick={()=>setNewHex(s)} title={s}
                        style={{flex:1,height:28,background:s,border:`2px solid ${newHex===s?'#fff':'transparent'}`,borderRadius:5,cursor:'pointer',boxShadow:newHex===s?`0 0 0 2px ${C.accent}`:undefined,transition:'all .1s'}}/>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <input value={newColorName} onChange={e=>setNewColorName(e.target.value)} placeholder="Color name (e.g. Ocean Blue)"
                  style={{width:'100%',padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:F,color:C.text,outline:'none',background:'#fff',marginBottom:8}}
                  onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>

                {/* Group */}
                <div style={{marginBottom:10}}>
                  <p style={{fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5,fontFamily:F}}>Group</p>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {COLOR_GROUPS.map(g=>(
                      <button key={g} onClick={()=>setNewColorGroup(g)}
                        style={{padding:'3px 9px',fontSize:10,fontWeight:600,border:`1px solid ${newColorGroup===g?C.accent:C.border}`,borderRadius:20,background:newColorGroup===g?C.accentLt:'#fff',color:newColorGroup===g?C.accent:C.textMd,cursor:'pointer',fontFamily:F}}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{setShowColorAdd(false);setNewHex('#5B50E8');setNewColorName('')}}
                    style={{flex:1,padding:'8px',border:`1px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:C.textMd,fontFamily:F}}>
                    Cancel
                  </button>
                  <button onClick={addColor}
                    style={{flex:2,padding:'8px',border:'none',borderRadius:8,background:C.accent,color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:F}}>
                    Add Color
                  </button>
                </div>
              </div>
            )}

            {/* Edit color modal */}
            {editColor&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(8px)'}} onClick={e=>{if(e.target===e.currentTarget)setEditColor(null)}}>
                <div style={{background:'#fff',borderRadius:16,width:'min(360px,96vw)',padding:20,boxShadow:C.shadowLg,border:`1px solid ${C.border}`}}>
                  <h3 style={{margin:'0 0 14px',fontSize:16,fontWeight:800,color:C.text,fontFamily:F}}>Edit Color</h3>
                  <div style={{display:'flex',gap:8,marginBottom:12}}>
                    <input type="color" value={editColor.hex} onChange={e=>setEditColor({...editColor,hex:e.target.value})}
                      style={{width:44,height:44,borderRadius:10,border:`2px solid ${C.border}`,cursor:'pointer',padding:2}}/>
                    <input value={editColor.hex} onChange={e=>setEditColor({...editColor,hex:e.target.value})}
                      style={{flex:1,padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,fontFamily:FM,color:C.text,outline:'none'}}/>
                  </div>
                  <input value={editColor.name} onChange={e=>setEditColor({...editColor,name:e.target.value})}
                    placeholder="Color name" style={{width:'100%',padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:F,color:C.text,outline:'none',marginBottom:10}}/>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setEditColor(null)} style={{flex:1,padding:'9px',border:`1px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:C.textMd,fontFamily:F}}>Cancel</button>
                    <button onClick={editColorSave} style={{flex:2,padding:'9px',border:'none',borderRadius:8,background:C.accent,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:F}}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ FONTS TAB ════════════════ */}
        {tab==='fonts'&&(
          <div>
            {/* Existing fonts */}
            {kit.fonts.length > 0 && (
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                {kit.fonts.map(f=>(
                  <FontCard key={f.id} f={f}
                    onApply={()=>onApplyFont(f.family, f.url)}
                    onRemove={()=>removeFont(f.id)}/>
                ))}
              </div>
            )}

            {/* Sub-tabs: browse vs upload */}
            <div style={{border:`1.5px solid ${C.border}`,borderRadius:12,overflow:'hidden',background:C.panelSub}}>
              <div style={{display:'flex',borderBottom:`1px solid ${C.border}`}}>
                {(['browse','upload'] as const).map(t=>(
                  <button key={t} onClick={()=>setFontTab(t)}
                    style={{flex:1,padding:'9px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:F,background:fontTab===t?'#fff':C.panelSub,color:fontTab===t?C.text:C.textMd,transition:'all .12s',textTransform:'capitalize'}}>
                    {t==='browse'?'📚 Browse Google Fonts':'⬆ Upload Font File'}
                  </button>
                ))}
              </div>

              <div style={{padding:12}}>
                {fontTab==='browse'&&(
                  <>
                    <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search 40+ Google fonts…"
                      style={{width:'100%',padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:F,color:C.text,outline:'none',marginBottom:10,background:'#fff'}}
                      onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                    <div style={{maxHeight:220,overflow:'auto',display:'flex',flexDirection:'column',gap:4}}>
                      {filtFonts.slice(0,30).map(f=>(
                        <button key={f} onClick={()=>addGoogleFont(f)}
                          style={{padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all .12s'}}
                          onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.background=C.accentLt}}
                          onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.background='#fff'}}>
                          <div>
                            <span style={{fontSize:15,fontFamily:`'${f}',sans-serif`,color:C.text}}>{f}</span>
                            <span style={{fontSize:9,color:C.textSm,marginLeft:8,fontFamily:F}}>Google Font</span>
                          </div>
                          <span style={{fontSize:11,color:C.accent,fontWeight:700,fontFamily:F}}>+ Add</span>
                        </button>
                      ))}
                      {filtFonts.length===0&&<div style={{textAlign:'center',padding:'12px',fontSize:12,color:C.textSm,fontFamily:F}}>No fonts match</div>}
                    </div>
                  </>
                )}
                {fontTab==='upload'&&(
                  <>
                    <input ref={fontRef} type="file" accept=".otf,.ttf,.woff,.woff2" style={{display:'none'}} onChange={uploadFontFile} multiple/>
                    <button onClick={()=>fontRef.current?.click()} disabled={uploadingFont}
                      style={{width:'100%',padding:'18px',border:`2px dashed ${C.borderSt}`,borderRadius:11,background:'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:8,transition:'all .13s'}}
                      onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.background=C.accentLt}}
                      onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.background='#fff'}}>
                      {uploadingFont
                        ? <div style={{width:24,height:24,border:`3px solid ${C.accentMd}`,borderTopColor:C.accent,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
                        : <span style={{fontSize:28}}>🔤</span>
                      }
                      <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F}}>{uploadingFont?'Processing font…':'Upload OTF, TTF, WOFF or WOFF2'}</div>
                      <div style={{fontSize:11,color:C.textSm,fontFamily:F}}>Your custom brand fonts · Any weight or style</div>
                    </button>
                    <p style={{fontSize:10,color:C.textSm,marginTop:8,lineHeight:1.6,fontFamily:F}}>
                      Uploaded fonts are embedded as base64 and saved to your account. They will be available across all devices when you're logged in.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ LOGOS TAB ════════════════ */}
        {tab==='logos'&&(
          <div>
            {kit.logos.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                {kit.logos.map(l=>(
                  <div key={l.id} style={{border:`1.5px solid ${C.border}`,borderRadius:11,overflow:'hidden',background:'#FAFAL8',boxShadow:C.shadow}}>
                    <div style={{background:'#F8FAFC',height:80,display:'flex',alignItems:'center',justifyContent:'center',padding:10,position:'relative'}}>
                      {/* Checkerboard for transparency */}
                      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(45deg,#E5E7EB 25%,transparent 25%),linear-gradient(-45deg,#E5E7EB 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#E5E7EB 75%),linear-gradient(-45deg,transparent 75%,#E5E7EB 75%)',backgroundSize:'10px 10px',backgroundPosition:'0 0,0 5px,5px -5px,-5px 0px',opacity:0.5}}/>
                      <img src={l.url} alt={l.name} style={{maxWidth:'90%',maxHeight:62,objectFit:'contain',position:'relative',zIndex:1}}/>
                    </div>
                    <div style={{padding:'7px 9px',borderTop:`1px solid ${C.border}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.textSd,fontFamily:F,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontSize:9,padding:'1px 6px',background:C.accentLt,color:C.accent,borderRadius:5,fontWeight:700,fontFamily:F,textTransform:'capitalize'}}>{l.type}</span>
                        <div style={{display:'flex',gap:4}}>
                          <button onClick={()=>onAddLogo(l.url)} style={{fontSize:9,padding:'2px 7px',border:`1px solid ${C.border}`,borderRadius:4,background:'#fff',cursor:'pointer',color:C.accent,fontFamily:F,fontWeight:700}}>Use</button>
                          <button onClick={()=>removeLogo(l.id)} style={{fontSize:9,padding:'2px 7px',border:`1px solid #FEE2E2`,borderRadius:4,background:'#FFF5F5',cursor:'pointer',color:C.red,fontFamily:F,fontWeight:700}}>✕</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Logo type picker */}
            <div style={{marginBottom:10}}>
              <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:7,fontFamily:F}}>Upload as</p>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {LOGO_TYPES.map(t=>(
                  <button key={t} onClick={()=>setLogoType(t)}
                    style={{padding:'4px 11px',fontSize:10,fontWeight:700,border:`1px solid ${logoType===t?C.accent:C.border}`,borderRadius:20,background:logoType===t?C.accentLt:'#fff',color:logoType===t?C.accent:C.textMd,cursor:'pointer',fontFamily:F,textTransform:'capitalize',transition:'all .11s'}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <input ref={logoRef} type="file" accept="image/*,.svg" style={{display:'none'}} onChange={uploadLogo} multiple/>
            <button onClick={()=>logoRef.current?.click()} disabled={logoUploading}
              style={{width:'100%',padding:'16px',border:`2px dashed ${C.borderSt}`,borderRadius:12,background:'#FAFAL8',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:7,transition:'all .13s'}}
              onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.background=C.accentLt}}
              onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.background='#FAFAL8'}}>
              {logoUploading
                ? <div style={{width:22,height:22,border:`3px solid ${C.accentMd}`,borderTopColor:C.accent,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
                : <span style={{fontSize:28}}>🎨</span>
              }
              <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F}}>Upload Logo or Icon</div>
              <div style={{fontSize:11,color:C.textSm,fontFamily:F}}>PNG, SVG, JPG, WebP · Multiple files supported</div>
            </button>

            <p style={{fontSize:10,color:C.textSm,marginTop:10,lineHeight:1.6,fontFamily:F}}>
              SVG logos are recommended for best quality. Logos are saved to your account and sync across all devices.
            </p>
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <div style={{padding:'10px 14px',borderTop:`1px solid ${C.border}`,background:C.panelSub,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:10,color:C.textSm,fontFamily:F,lineHeight:1.5}}>
            {kit.colors.length} colors · {kit.fonts.length} fonts · {kit.logos.length} logos
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {saving&&<div style={{width:12,height:12,border:`2px solid ${C.accentMd}`,borderTopColor:C.accent,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>}
            <span style={{fontSize:10,color:saving?C.accent:saved?C.green:C.textSm,fontFamily:F,fontWeight:saved?700:400}}>
              {saving?'Saving to cloud…':saved?'✓ Synced to account':kit.userId?'Auto-saves to account':'Sign in to sync across devices'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}