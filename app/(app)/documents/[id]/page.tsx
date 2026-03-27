'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { buildShareUrl, generateToken } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Toggle } from '@/components/ui'
import AIDrafter from '@/components/editor/AIDrafter'
import type { Database } from '@/lib/supabase/client'

type Document = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

// ─── Constants ─────────────────────────────────────────────────────────────────
const CANVAS_SIZES = [
  { id:'pres-169', label:'Presentation 16:9', w:1280, h:720,  cat:'Presentation', dims:'1280×720' },
  { id:'pres-43',  label:'Presentation 4:3',  w:1024, h:768,  cat:'Presentation', dims:'1024×768' },
  { id:'a4-port',  label:'A4 Portrait',        w:794,  h:1123, cat:'Document',     dims:'794×1123' },
  { id:'a4-land',  label:'A4 Landscape',       w:1123, h:794,  cat:'Document',     dims:'1123×794' },
  { id:'square',   label:'Square 1:1',         w:1080, h:1080, cat:'Social',       dims:'1080×1080' },
  { id:'story',    label:'Story / Reel',       w:540,  h:960,  cat:'Social',       dims:'540×960' },
  { id:'linkedin', label:'LinkedIn Banner',    w:1584, h:396,  cat:'Social',       dims:'1584×396' },
  { id:'twitter',  label:'Twitter Header',     w:1500, h:500,  cat:'Social',       dims:'1500×500' },
]

const FONTS = [
  'Jost','Space Grotesk','DM Sans','Outfit','Plus Jakarta Sans','Syne','Archivo',
  'Nunito Sans','IBM Plex Sans','Rubik','Work Sans','Barlow','Mulish','Lato',
  'Open Sans','Raleway','Montserrat','Oswald','Bebas Neue','Anton','Teko',
  'Playfair Display','Cormorant Garamond','Libre Baskerville','Merriweather','EB Garamond',
  'Lora','Crimson Text','Bodoni Moda','Arvo','Zilla Slab',
  'DM Mono','Roboto Mono','IBM Plex Mono','Space Mono','JetBrains Mono','Fira Code',
  'Source Code Pro','Courier Prime',
  'Pacifico','Righteous','Fredoka One','Comfortaa','Caveat','Dancing Script',
  'Great Vibes','Sacramento','Satisfy','Abril Fatface','Lobster',
  'Poppins','Quicksand','Varela Round','Nunito','Josefin Sans','Karla','Manrope',
  'Geist','Ubuntu','Cabin','Maven Pro','Titillium Web',
]

const BLEND_MODES = [
  'normal','multiply','screen','overlay','darken','lighten',
  'color-dodge','color-burn','hard-light','soft-light','difference','exclusion',
]

const UNSPLASH_CURATED = [
  'photo-1497366216548-37526070297c','photo-1497366754035-f200968a6e72',
  'photo-1560472354-b33ff0c44a43','photo-1556761175-4b46a572b786',
  'photo-1553484771-047a44eee27b','photo-1522202176988-66273c2fd55f',
  'photo-1504384308090-c894fdcc538d','photo-1551434678-e076c223a692',
  'photo-1573496359142-b8d87734a5a2','photo-1600880292203-757bb62b4baf',
]

// ─── Template helpers ───────────────────────────────────────────────────────────
function pg(bg='#ffffff', objects:any[]=[]) {
  return { version:'5.3.0', objects, background:bg }
}
function tx(text:string, o:any={}):any {
  return {
    type:'textbox', left:o.l??60, top:o.t??60, width:o.w??400, text,
    fontSize:o.fs??16, fontFamily:o.ff??'Jost', fill:o.fill??'#0f172a',
    fontWeight:o.fw??'400', lineHeight:o.lh??1.4, textAlign:o.ta??'left',
    opacity:1, selectable:true, editable:true,
  }
}
function bx(o:any={}):any {
  return {
    type:'rect', left:o.l??0, top:o.t??0, width:o.w??200, height:o.h??60,
    fill:o.fill??'#4f46e5', rx:o.rx??0, ry:o.rx??0, selectable:true, opacity:o.op??1,
  }
}
function fs(W:number, base:number):number {
  return Math.max(Math.round(base*(W/1280)), Math.round(base*0.55))
}

// ─── LAYOUTS ───────────────────────────────────────────────────────────────────
const LAYOUTS = [
  {
    id:'full-bleed-dark', label:'Full Bleed Dark', category:'Hero',
    build:(W:number,H:number)=>pg('#070a1a',[
      bx({l:0,t:0,w:W,h:H,fill:'#070a1a'}),
      bx({l:0,t:H-4,w:W,h:4,fill:'#4f46e5'}),
      bx({l:Math.round(W*.07),t:Math.round(H*.34),w:4,h:Math.round(H*.3),fill:'#4f46e5'}),
      tx('Your Headline Goes Here',{l:Math.round(W*.07)+20,t:Math.round(H*.35),w:Math.round(W*.6),fs:fs(W,52),fw:'800',fill:'#ffffff',ff:'Jost'}),
      tx('Supporting subtext that adds context and draws the reader in.',{l:Math.round(W*.07)+20,t:Math.round(H*.35)+fs(W,52)+18,w:Math.round(W*.55),fs:fs(W,18),fill:'rgba(255,255,255,.65)'}),
    ]),
  },
  {
    id:'split-image-right', label:'Split Right', category:'Split',
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      bx({l:Math.round(W*.54),t:0,w:Math.round(W*.46),h:H,fill:'#e0e7ff'}),
      tx('Section\nHeading',{l:40,t:Math.round(H*.25),w:Math.round(W*.46),fs:fs(W,44),fw:'800',fill:'#0f172a',ff:'Jost',lh:1.05}),
      tx('Describe what this section is about and why it matters to the reader.',{l:40,t:Math.round(H*.25)+fs(W,44)*2+20,w:Math.round(W*.44),fs:fs(W,15),fill:'#475569',lh:1.7}),
    ]),
  },
  {
    id:'centered-light', label:'Centered Light', category:'Hero',
    build:(W:number,H:number)=>pg('#f8fafc',[
      bx({l:Math.round(W*.5)-32,t:Math.round(H*.2),w:64,h:4,fill:'#4f46e5',rx:2}),
      tx('SUBTITLE · LABEL',{l:Math.round(W*.1),t:Math.round(H*.2)+16,w:Math.round(W*.8),fs:fs(W,10),fw:'700',fill:'#4f46e5',ta:'center',ff:'JetBrains Mono'}),
      tx('Centered Headline for Impact',{l:Math.round(W*.1),t:Math.round(H*.2)+38,w:Math.round(W*.8),fs:fs(W,48),fw:'800',fill:'#0f172a',ta:'center',ff:'Jost',lh:1.05}),
      tx('A supporting line that expands on the headline and gives the reader context.',{l:Math.round(W*.15),t:Math.round(H*.2)+38+fs(W,48)+18,w:Math.round(W*.7),fs:fs(W,16),fill:'#64748b',ta:'center',lh:1.65}),
    ]),
  },
  {
    id:'dark-minimal', label:'Dark Minimal', category:'Minimal',
    build:(W:number,H:number)=>pg('#0a0a0f',[
      bx({l:Math.round(W*.07),t:Math.round(H*.42),w:Math.round(W*.86),h:1,fill:'rgba(255,255,255,.12)'}),
      tx('Minimal.',{l:Math.round(W*.07),t:Math.round(H*.2),w:W-100,fs:fs(W,72),fw:'800',fill:'#ffffff',ff:'Jost'}),
      tx('Sometimes less is everything.',{l:Math.round(W*.07),t:Math.round(H*.2)+fs(W,72)+16,w:Math.round(W*.6),fs:fs(W,18),fill:'rgba(255,255,255,.4)'}),
    ]),
  },
  {
    id:'gradient-hero', label:'Gradient Hero', category:'Hero',
    build:(W:number,H:number)=>pg('#4f46e5',[
      bx({l:0,t:0,w:W,h:H,fill:'#4f46e5'}),
      bx({l:Math.round(W*.06),t:Math.round(H*.12),w:60,h:4,fill:'rgba(255,255,255,.5)',rx:2}),
      tx('Bold Gradient\nHero Slide',{l:Math.round(W*.06),t:Math.round(H*.22),w:Math.round(W*.65),fs:fs(W,52),fw:'800',fill:'#ffffff',ff:'Jost',lh:1.0}),
      tx('A bright, energetic layout for product launches, announcements, or key moments.',{l:Math.round(W*.06),t:Math.round(H*.22)+fs(W,52)*2+22,w:Math.round(W*.55),fs:fs(W,15),fill:'rgba(255,255,255,.7)',lh:1.65}),
    ]),
  },
  {
    id:'quote-dark', label:'Pull Quote', category:'Editorial',
    build:(W:number,H:number)=>pg('#0f172a',[
      tx('"',{l:Math.round(W*.07),t:Math.round(H*.05),w:100,fs:fs(W,140),fw:'800',fill:'#4f46e5',ff:'Jost',lh:1}),
      tx('The best designs solve real problems elegantly, not just look good.',{l:Math.round(W*.07),t:Math.round(H*.32),w:Math.round(W*.78),fs:fs(W,32),fw:'600',fill:'#ffffff',ff:'Jost',lh:1.25}),
      bx({l:Math.round(W*.07),t:Math.round(H*.32)+fs(W,32)*3+28,w:40,h:3,fill:'#4f46e5',rx:2}),
      tx('— Author Name, Title at Company',{l:Math.round(W*.07),t:Math.round(H*.32)+fs(W,32)*3+48,w:Math.round(W*.6),fs:fs(W,13),fill:'rgba(255,255,255,.4)'}),
    ]),
  },
  {
    id:'three-cols', label:'3 Columns', category:'Content',
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:'#4f46e5'}),
      tx('Three Column Layout',{l:50,t:44,w:W-100,fs:fs(W,28),fw:'700',fill:'#0f172a'}),
      bx({l:50,t:44+fs(W,28)+12,w:W-100,h:1,fill:'#e2e8f0'}),
      ...[['Feature One','#4f46e5'],['Feature Two','#10b981'],['Feature Three','#f59e0b']].flatMap(([title,col]:string[],i:number)=>{
        const cw=Math.round((W-140)/3), cx=50+i*(cw+20)
        return [
          bx({l:cx,t:Math.round(H*.34),w:cw,h:Math.round(H*.5),fill:'#f8fafc',rx:12}),
          bx({l:cx+20,t:Math.round(H*.34)+20,w:40,h:40,fill:col,rx:10}),
          tx(title,{l:cx+16,t:Math.round(H*.34)+80,w:cw-32,fs:fs(W,17),fw:'700',fill:'#0f172a'}),
          tx('Describe this feature here with a clear, benefit-oriented statement.',{l:cx+16,t:Math.round(H*.34)+80+fs(W,17)+10,w:cw-32,fs:fs(W,13),fill:'#64748b',lh:1.6}),
        ]
      }),
    ]),
  },
  {
    id:'metrics', label:'Data Metrics', category:'Metrics',
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:'#10b981'}),
      tx('Key Metrics',{l:50,t:48,w:W-100,fs:fs(W,30),fw:'700',fill:'#0f172a'}),
      ...[['$0M','ARR','#ecfdf5','#10b981'],['0K','Users','#eff6ff','#4f46e5'],['0%','Growth','#fff7ed','#f59e0b'],['0','NPS','#fdf4ff','#8b5cf6']].flatMap(([val,lbl,bg,col]:any,i:number)=>{
        const cw=Math.round((W-160)/4), cx=50+i*(cw+13)
        return [
          bx({l:cx,t:Math.round(H*.38),w:cw,h:150,fill:bg,rx:14}),
          tx(val,{l:cx+16,t:Math.round(H*.38)+18,w:cw-32,fs:fs(W,38),fw:'700',fill:col,ff:'Jost'}),
          tx(lbl,{l:cx+16,t:Math.round(H*.38)+18+fs(W,38)+8,w:cw-32,fs:10,fill:'#94a3b8',ff:'JetBrains Mono'}),
        ]
      }),
    ]),
  },
]

const LAYOUT_CATS = ['All','Hero','Split','Editorial','Metrics','Content','Minimal','Process']

const TEMPLATES = [
  { id:'blank',    cat:'blank',    label:'Blank Canvas',   desc:'Start fresh',         pages:1, size:'pres-169' },
  { id:'pitch',    cat:'startup',  label:'Pitch Deck',     desc:'Seed to Series B',    pages:8, size:'pres-169' },
  { id:'proposal', cat:'freelance',label:'Client Proposal',desc:'Win more clients',    pages:6, size:'a4-port'  },
  { id:'brand',    cat:'marketing',label:'Brand Guidelines',desc:'Brand system',       pages:5, size:'pres-169' },
  { id:'qreport',  cat:'report',   label:'Quarterly Report',desc:'Q-over-Q review',   pages:4, size:'pres-169' },
]

// ─── Gradient presets ─────────────────────────────────────────────────────────
const GRADIENT_PRESETS = [
  { label:'Indigo', stops:[{offset:0,color:'#4f46e5'},{offset:1,color:'#7c3aed'}] },
  { label:'Ocean',  stops:[{offset:0,color:'#06b6d4'},{offset:1,color:'#3b82f6'}] },
  { label:'Sunset', stops:[{offset:0,color:'#f59e0b'},{offset:1,color:'#ef4444'}] },
  { label:'Forest', stops:[{offset:0,color:'#10b981'},{offset:1,color:'#059669'}] },
  { label:'Rose',   stops:[{offset:0,color:'#ec4899'},{offset:1,color:'#f43f5e'}] },
  { label:'Night',  stops:[{offset:0,color:'#0f172a'},{offset:1,color:'#1e1b4b'}] },
]

// ─── Style constants ───────────────────────────────────────────────────────────
const pBtn:React.CSSProperties={padding:'7px 18px',borderRadius:9,fontSize:13,fontWeight:700,border:'none',background:'#4f46e5',color:'white',cursor:'pointer',fontFamily:'Jost,sans-serif',boxShadow:'0 2px 8px rgba(79,70,229,.25)'}
const sBtn:React.CSSProperties={padding:'7px 16px',borderRadius:9,fontSize:13,fontWeight:600,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',color:'#374151',fontFamily:'Jost,sans-serif'}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({documentId,links,onClose,onRefresh,isActive,onPublish}:{documentId:string;links:ShareLink[];onClose:()=>void;onRefresh:()=>void;isActive:boolean;onPublish:()=>void}){
  const [creating,setCreating]=useState(false)
  const [label,setLabel]=useState('')
  const [requireEmail,setRequireEmail]=useState(false)
  const [allowDownload,setAllowDownload]=useState(false)
  const [password,setPassword]=useState('')
  const [copied,setCopied]=useState<string|null>(null)
  const [showNew,setShowNew]=useState(links.length===0)

  async function createLink(){
    if(!isActive){onPublish();return}
    setCreating(true)
    const token=generateToken(14)
    const {error}=await supabase.from('share_links').insert({
      document_id:documentId,token,label:label||'Share link',
      require_email:requireEmail,allow_download:allowDownload,
      password:password||null,is_active:true,
    })
    if(!error){await onRefresh();setShowNew(false);setLabel('');setPassword('');setRequireEmail(false);setAllowDownload(false)}
    setCreating(false)
  }

  function copyLink(token:string){
    navigator.clipboard.writeText(buildShareUrl(token))
    setCopied(token);setTimeout(()=>setCopied(null),2500)
  }
  async function toggleLink(id:string,active:boolean){await supabase.from('share_links').update({is_active:active}).eq('id',id);onRefresh()}
  async function deleteLink(id:string){await supabase.from('share_links').delete().eq('id',id);onRefresh()}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'flex-end'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{width:440,height:'100vh',background:'white',borderLeft:'1px solid #e5e7eb',display:'flex',flexDirection:'column',boxShadow:'-8px 0 40px rgba(0,0,0,.1)'}}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h2 style={{margin:'0 0 3px',fontSize:17,fontWeight:800,color:'#0f172a',fontFamily:'Jost,sans-serif'}}>Share & Track</h2>
            <p style={{margin:0,fontSize:12,color:'#94a3b8',fontFamily:'Jost,sans-serif'}}>{links.length} link{links.length!==1?'s':''} · {links.reduce((a,l)=>a+(l.view_count||0),0)} total views</p>
          </div>
          <button onClick={onClose} style={{background:'#f3f4f6',border:'none',cursor:'pointer',color:'#6b7280',padding:7,borderRadius:8}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        {!isActive&&(
          <div style={{margin:'14px 20px',padding:'12px 16px',background:'#fffbeb',border:'1.5px solid #fcd34d',borderRadius:10}}>
            <div style={{fontSize:12,fontWeight:700,color:'#92400e',marginBottom:4,fontFamily:'Jost,sans-serif'}}>Document not published</div>
            <div style={{fontSize:11,color:'#b45309',marginBottom:10,fontFamily:'Jost,sans-serif'}}>Publish first to enable link sharing and tracking.</div>
            <button onClick={onPublish} style={{...pBtn,fontSize:12,padding:'6px 14px'}}>Publish now</button>
          </div>
        )}
        <div style={{flex:1,overflow:'auto',padding:'16px 20px'}}>
          {links.length>0&&(
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>Active links</div>
              {links.map(link=>(
                <div key={link.id} style={{border:'1.5px solid #e5e7eb',borderRadius:14,padding:'14px 16px',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{flex:1,fontSize:13,fontWeight:700,color:'#0f172a',fontFamily:'Jost,sans-serif'}}>{link.label??'Share link'}</span>
                    <span style={{padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:link.is_active?'#dcfce7':'#f1f5f9',color:link.is_active?'#15803d':'#64748b'}}>{link.is_active?'LIVE':'OFF'}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                    <code style={{flex:1,fontSize:10,color:'#64748b',background:'#f8fafc',padding:'5px 9px',borderRadius:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',border:'1px solid #e5e7eb'}}>{buildShareUrl(link.token)}</code>
                    <button onClick={()=>copyLink(link.token)} style={{padding:'5px 11px',background:copied===link.token?'#f0fdf4':'#f8fafc',border:`1.5px solid ${copied===link.token?'#86efac':'#e5e7eb'}`,borderRadius:8,fontSize:11,cursor:'pointer',color:copied===link.token?'#15803d':'#64748b',fontFamily:'Jost,sans-serif',fontWeight:700,whiteSpace:'nowrap'}}>
                      {copied===link.token?'Copied!':'Copy'}
                    </button>
                  </div>
                  <div style={{display:'flex',gap:12,fontSize:11,color:'#94a3b8',flexWrap:'wrap',marginBottom:8}}>
                    <span>{link.view_count||0} views</span>
                    {link.require_email&&<span>Email gate</span>}
                    {link.password&&<span>Password</span>}
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:14}}>
                    <button onClick={()=>toggleLink(link.id,!link.is_active)} style={{fontSize:11,color:link.is_active?'#f59e0b':'#10b981',background:'none',border:'none',cursor:'pointer',fontFamily:'Jost,sans-serif',fontWeight:700}}>{link.is_active?'Disable':'Enable'}</button>
                    <button onClick={()=>deleteLink(link.id)} style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontFamily:'Jost,sans-serif',fontWeight:700}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!showNew
            ?<button onClick={()=>setShowNew(true)} style={{width:'100%',padding:'12px',background:'none',border:'2px dashed #e5e7eb',borderRadius:12,cursor:'pointer',fontSize:13,color:'#94a3b8',fontFamily:'Jost,sans-serif',fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Create new link
            </button>
            :<div style={{border:'1.5px solid #e5e7eb',borderRadius:14,padding:'18px'}}>
              <p style={{margin:'0 0 16px',fontSize:14,fontWeight:700,color:'#0f172a',fontFamily:'Jost,sans-serif'}}>New share link</p>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <Input label="Link label" placeholder="e.g. Sequoia meeting" value={label} onChange={(e:any)=>setLabel(e.target.value)}/>
                <Input label="Password (optional)" type="password" placeholder="Leave empty for no password" value={password} onChange={(e:any)=>setPassword(e.target.value)}/>
                <Toggle checked={requireEmail} onChange={setRequireEmail} label="Require email address to view"/>
                <Toggle checked={allowDownload} onChange={setAllowDownload} label="Allow document download"/>
                <div style={{display:'flex',gap:8}}>
                  <Button variant="primary" loading={creating} onClick={createLink} size="sm">{isActive?'Create link':'Publish & create link'}</Button>
                  <Button variant="ghost" onClick={()=>setShowNew(false)} size="sm">Cancel</Button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Properties Panel ─────────────────────────────────────────────────────────
function PropsPanel({obj, fabric, onUpdate}:{obj:any,fabric:any,onUpdate:()=>void}){
  if(!obj) return(
    <div style={{padding:20,color:'#94a3b8',fontSize:12,textAlign:'center',fontFamily:'Jost,sans-serif'}}>
      <div style={{marginBottom:8,fontSize:24}}>↖</div>
      Select an element to edit its properties
    </div>
  )

  const isText=obj.type==='textbox'||obj.type==='i-text'||obj.type==='text'
  const isShape=obj.type==='rect'||obj.type==='circle'||obj.type==='triangle'||obj.type==='ellipse'

  function set(prop:string,val:any){
    obj.set(prop,val)
    fabric.renderAll()
    onUpdate()
  }

  function applyGradient(stops:{offset:number,color:string}[]){
    const grad=new fabric.fabric.Gradient({
      type:'linear',
      gradientUnits:'percentage',
      coords:{x1:0,y1:0,x2:1,y2:0},
      colorStops:stops,
    })
    obj.set('fill',grad)
    fabric.renderAll()
    onUpdate()
  }

  const opacity=Math.round((obj.opacity??1)*100)

  return(
    <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:10,overflow:'auto',flex:1}}>
      {/* Position & Size */}
      <Section label="Position & Size">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {[['X','left'],['Y','top'],['W','width'],['H','height']].map(([l,p])=>(
            <NumField key={p} label={l} value={Math.round(obj[p]??0)} onChange={v=>set(p,v)}/>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:4}}>
          <NumField label="Rotate°" value={Math.round(obj.angle??0)} onChange={v=>set('angle',v)}/>
          <NumField label="Opacity%" value={opacity} onChange={v=>set('opacity',v/100)}/>
        </div>
        {/* Flip */}
        <div style={{display:'flex',gap:6,marginTop:4}}>
          <button onClick={()=>set('flipX',!obj.flipX)} style={propBtn(obj.flipX)}>Flip H</button>
          <button onClick={()=>set('flipY',!obj.flipY)} style={propBtn(obj.flipY)}>Flip V</button>
          <button onClick={()=>set('lockMovementX',!obj.lockMovementX)} style={propBtn(obj.lockMovementX)}>Lock</button>
        </div>
      </Section>

      {/* Fill & Stroke */}
      <Section label="Fill & Stroke">
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <label style={propLabel}>Fill</label>
            <input type="color" value={typeof obj.fill==='string'?obj.fill:'#4f46e5'} onChange={e=>set('fill',e.target.value)} style={{width:30,height:28,borderRadius:7,border:'2px solid #e5e7eb',cursor:'pointer',padding:0}}/>
            <span style={{fontSize:11,color:'#64748b',fontFamily:'JetBrains Mono,monospace'}}>{typeof obj.fill==='string'?obj.fill:'gradient'}</span>
          </div>
          {/* Gradient presets */}
          <div>
            <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Gradient Presets</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {GRADIENT_PRESETS.map(g=>(
                <button key={g.label} onClick={()=>applyGradient(g.stops)} title={g.label}
                  style={{width:28,height:28,borderRadius:6,border:'2px solid transparent',cursor:'pointer',
                    background:`linear-gradient(135deg,${g.stops[0].color},${g.stops[1].color})`,
                    outline:'none',transition:'transform .1s'}} onMouseOver={e=>(e.currentTarget.style.transform='scale(1.15)')} onMouseOut={e=>(e.currentTarget.style.transform='scale(1)')}/>
              ))}
              <button onClick={()=>set('fill',typeof obj.fill==='string'?obj.fill:'#4f46e5')} title="Remove gradient"
                style={{width:28,height:28,borderRadius:6,border:'2px solid #e5e7eb',cursor:'pointer',background:'white',fontSize:11,color:'#94a3b8'}}>✕</button>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <label style={propLabel}>Stroke</label>
            <input type="color" value={obj.stroke||'#000000'} onChange={e=>set('stroke',e.target.value)} style={{width:30,height:28,borderRadius:7,border:'2px solid #e5e7eb',cursor:'pointer',padding:0}}/>
            <NumField label="px" value={obj.strokeWidth??0} onChange={v=>set('strokeWidth',v)}/>
          </div>
          {isShape&&(
            <NumField label="Corner radius" value={obj.rx??0} onChange={v=>{set('rx',v);set('ry',v)}}/>
          )}
        </div>
      </Section>

      {/* Shadow */}
      <Section label="Shadow">
        <ShadowControls obj={obj} fabric={fabric} onUpdate={onUpdate}/>
      </Section>

      {/* Blend Mode */}
      <Section label="Blend Mode">
        <select value={obj.globalCompositeOperation??'normal'} onChange={e=>set('globalCompositeOperation',e.target.value)}
          style={{width:'100%',padding:'6px 9px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:12,fontFamily:'Jost,sans-serif',background:'white',color:'#374151',cursor:'pointer'}}>
          {BLEND_MODES.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </Section>

      {/* Typography — text only */}
      {isText&&(
        <Section label="Typography">
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div>
              <div style={propLabel}>Text Color</div>
              <input type="color" value={typeof obj.fill==='string'?obj.fill:'#0f172a'} onChange={e=>set('fill',e.target.value)} style={{width:30,height:28,borderRadius:7,border:'2px solid #e5e7eb',cursor:'pointer',padding:0,marginTop:4}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              <NumField label="Size" value={obj.fontSize??16} onChange={v=>set('fontSize',v)}/>
              <NumField label="Line H" value={obj.lineHeight??1.4} onChange={v=>set('lineHeight',v)} step={0.05}/>
            </div>
            <NumField label="Letter Spacing" value={obj.charSpacing??0} onChange={v=>set('charSpacing',v)}/>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {(['left','center','right','justify'] as const).map(a=>(
                <button key={a} onClick={()=>set('textAlign',a)} style={propBtn(obj.textAlign===a)}>{a==='left'?'⫷':a==='center'?'⫶':a==='right'?'⫸':'⟺'}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>set('fontWeight',obj.fontWeight==='bold'?'normal':'bold')} style={{...propBtn(obj.fontWeight==='bold'),fontWeight:700,fontFamily:'serif'}}>B</button>
              <button onClick={()=>set('fontStyle',obj.fontStyle==='italic'?'normal':'italic')} style={{...propBtn(obj.fontStyle==='italic'),fontStyle:'italic'}}>I</button>
              <button onClick={()=>set('underline',!obj.underline)} style={{...propBtn(obj.underline),textDecoration:'underline'}}>U</button>
              <button onClick={()=>set('linethrough',!obj.linethrough)} style={{...propBtn(obj.linethrough),textDecoration:'line-through'}}>S</button>
            </div>
          </div>
        </Section>
      )}

      {/* Image filters — image only */}
      {obj.type==='image'&&(
        <Section label="Image Filters">
          <ImageFilters obj={obj} fabric={fabric} onUpdate={onUpdate}/>
        </Section>
      )}
    </div>
  )
}

function ShadowControls({obj,fabric,onUpdate}:{obj:any,fabric:any,onUpdate:()=>void}){
  const shadow=obj.shadow
  const [enabled,setEnabled]=useState(!!shadow)
  const [color,setColor]=useState(shadow?.color||'rgba(0,0,0,0.3)')
  const [blur,setBlur]=useState(shadow?.blur||10)
  const [ox,setOx]=useState(shadow?.offsetX||4)
  const [oy,setOy]=useState(shadow?.offsetY||4)

  function apply(en:boolean,c=color,b=blur,x=ox,y=oy){
    if(!en){obj.set('shadow',null)}
    else{
      obj.set('shadow',new fabric.fabric.Shadow({color:c,blur:b,offsetX:x,offsetY:y}))
    }
    fabric.renderAll();onUpdate()
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}>
        <input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);apply(e.target.checked)}}/>
        <span style={{fontSize:12,color:'#374151',fontFamily:'Jost,sans-serif'}}>Enable shadow</span>
      </label>
      {enabled&&(
        <>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <label style={propLabel}>Color</label>
            <input type="color" value={color.startsWith('rgba')?'#000000':color} onChange={e=>{setColor(e.target.value);apply(true,e.target.value,blur,ox,oy)}} style={{width:30,height:24,borderRadius:6,border:'2px solid #e5e7eb',cursor:'pointer',padding:0}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            <NumField label="Blur" value={blur} onChange={v=>{setBlur(v);apply(true,color,v,ox,oy)}}/>
            <NumField label="X" value={ox} onChange={v=>{setOx(v);apply(true,color,blur,v,oy)}}/>
            <NumField label="Y" value={oy} onChange={v=>{setOy(v);apply(true,color,blur,ox,v)}}/>
          </div>
        </>
      )}
    </div>
  )
}

function ImageFilters({obj,fabric,onUpdate}:{obj:any,fabric:any,onUpdate:()=>void}){
  const fab=(fabric as any).fabric
  const [brightness,setBrightness]=useState(0)
  const [contrast,setContrast]=useState(0)
  const [saturation,setSaturation]=useState(0)
  const [blur,setBlur]=useState(0)
  const [grayscale,setGrayscale]=useState(false)
  const [sepia,setSepia]=useState(false)

  function applyFilters(b=brightness,c=contrast,s=saturation,bl=blur,gs=grayscale,se=sepia){
    const filters=[]
    if(gs) filters.push(new fab.Image.filters.Grayscale())
    if(se) filters.push(new fab.Image.filters.Sepia())
    if(b!==0) filters.push(new fab.Image.filters.Brightness({brightness:b/100}))
    if(c!==0) filters.push(new fab.Image.filters.Contrast({contrast:c/100}))
    if(s!==0) filters.push(new fab.Image.filters.Saturation({saturation:s/100}))
    if(bl>0)  filters.push(new fab.Image.filters.Blur({blur:bl/100}))
    obj.filters=filters
    obj.applyFilters()
    fabric.renderAll();onUpdate()
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <SliderField label="Brightness" value={brightness} min={-100} max={100} onChange={v=>{setBrightness(v);applyFilters(v)}}/>
      <SliderField label="Contrast" value={contrast} min={-100} max={100} onChange={v=>{setContrast(v);applyFilters(brightness,v)}}/>
      <SliderField label="Saturation" value={saturation} min={-100} max={100} onChange={v=>{setSaturation(v);applyFilters(brightness,contrast,v)}}/>
      <SliderField label="Blur" value={blur} min={0} max={100} onChange={v=>{setBlur(v);applyFilters(brightness,contrast,saturation,v)}}/>
      <div style={{display:'flex',gap:6}}>
        <button onClick={()=>{setGrayscale(!grayscale);applyFilters(brightness,contrast,saturation,blur,!grayscale,sepia)}} style={propBtn(grayscale)}>Grayscale</button>
        <button onClick={()=>{setSepia(!sepia);applyFilters(brightness,contrast,saturation,blur,grayscale,!sepia)}} style={propBtn(sepia)}>Sepia</button>
      </div>
      <button onClick={()=>{setBrightness(0);setContrast(0);setSaturation(0);setBlur(0);setGrayscale(false);setSepia(false);applyFilters(0,0,0,0,false,false)}}
        style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontFamily:'Jost,sans-serif',fontWeight:600,textAlign:'left',padding:0}}>Reset filters</button>
    </div>
  )
}

function Section({label,children}:{label:string,children:React.ReactNode}){
  const [open,setOpen]=useState(true)
  return(
    <div style={{borderBottom:'1px solid #f1f5f9',paddingBottom:10}}>
      <button onClick={()=>setOpen(!open)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',border:'none',background:'none',cursor:'pointer',padding:'4px 0',marginBottom:open?8:0}}>
        <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',fontFamily:'Jost,sans-serif'}}>{label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{transform:open?'rotate(0)':'rotate(-90deg)',transition:'transform .15s'}}><path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      {open&&children}
    </div>
  )
}

function NumField({label,value,onChange,step=1}:{label:string,value:number,onChange:(v:number)=>void,step?:number}){
  return(
    <div>
      <div style={{fontSize:9,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:3,fontFamily:'Jost,sans-serif'}}>{label}</div>
      <input type="number" value={value} step={step} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{width:'100%',padding:'5px 8px',border:'1.5px solid #e5e7eb',borderRadius:7,fontSize:12,fontFamily:'JetBrains Mono,monospace',color:'#374151',background:'#f9fafb',outline:'none'}}
        onFocus={e=>e.target.style.borderColor='#4f46e5'}
        onBlur={e=>e.target.style.borderColor='#e5e7eb'}/>
    </div>
  )
}

function SliderField({label,value,min,max,onChange}:{label:string,value:number,min:number,max:number,onChange:(v:number)=>void}){
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:9,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',fontFamily:'Jost,sans-serif'}}>{label}</span>
        <span style={{fontSize:10,color:'#374151',fontFamily:'JetBrains Mono,monospace'}}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(parseFloat(e.target.value))}
        style={{width:'100%',accentColor:'#4f46e5'}}/>
    </div>
  )
}

const propLabel:React.CSSProperties={fontSize:9,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',fontFamily:'Jost,sans-serif',flexShrink:0,minWidth:36}
function propBtn(active:boolean):React.CSSProperties{
  return{padding:'4px 10px',fontSize:11,fontWeight:600,fontFamily:'Jost,sans-serif',border:`1.5px solid ${active?'#4f46e5':'#e5e7eb'}`,borderRadius:6,background:active?'#eef2ff':'white',color:active?'#4f46e5':'#64748b',cursor:'pointer'}
}

// ─── Layers Panel ─────────────────────────────────────────────────────────────
function LayersPanel({fabric,onSelect}:{fabric:any,onSelect:(obj:any)=>void}){
  const [objs,setObjs]=useState<any[]>([])
  const [activeId,setActiveId]=useState<string|null>(null)

  useEffect(()=>{
    if(!fabric)return
    function refresh(){
      const all=fabric.getObjects().slice().reverse()
      setObjs(all)
      const active=fabric.getActiveObject()
      setActiveId(active?active.__uid:null)
    }
    fabric.on('object:added',refresh)
    fabric.on('object:removed',refresh)
    fabric.on('object:modified',refresh)
    fabric.on('selection:created',refresh)
    fabric.on('selection:cleared',refresh)
    fabric.on('selection:updated',refresh)
    refresh()
    return()=>{
      fabric.off('object:added',refresh)
      fabric.off('object:removed',refresh)
      fabric.off('object:modified',refresh)
      fabric.off('selection:created',refresh)
      fabric.off('selection:cleared',refresh)
      fabric.off('selection:updated',refresh)
    }
  },[fabric])

  function getIcon(obj:any){
    if(obj.type==='textbox'||obj.type==='i-text'||obj.type==='text')return'T'
    if(obj.type==='image')return'🖼'
    if(obj.type==='rect')return'▭'
    if(obj.type==='circle')return'○'
    if(obj.type==='triangle')return'△'
    if(obj.type==='path')return'✏'
    if(obj.type==='group')return'⊞'
    return'◇'
  }

  function getLabel(obj:any){
    if(obj.text)return obj.text.slice(0,22)+(obj.text.length>22?'…':'')
    return obj.type.charAt(0).toUpperCase()+obj.type.slice(1)
  }

  function selectObj(obj:any){
    fabric.setActiveObject(obj)
    fabric.renderAll()
    setActiveId(obj.__uid)
    onSelect(obj)
  }

  function toggleVisible(obj:any,e:React.MouseEvent){
    e.stopPropagation()
    obj.set('visible',!obj.visible)
    fabric.renderAll()
    setObjs([...objs])
  }

  function toggleLock(obj:any,e:React.MouseEvent){
    e.stopPropagation()
    const locked=!obj.lockMovementX
    obj.set({lockMovementX:locked,lockMovementY:locked,lockRotation:locked,lockScalingX:locked,lockScalingY:locked,selectable:!locked,evented:!locked})
    fabric.renderAll()
    setObjs([...objs])
  }

  function moveUp(obj:any,e:React.MouseEvent){
    e.stopPropagation()
    fabric.bringForward(obj)
    fabric.renderAll()
    setObjs(fabric.getObjects().slice().reverse())
  }

  function moveDown(obj:any,e:React.MouseEvent){
    e.stopPropagation()
    fabric.sendBackwards(obj)
    fabric.renderAll()
    setObjs(fabric.getObjects().slice().reverse())
  }

  if(objs.length===0) return(
    <div style={{padding:20,color:'#94a3b8',fontSize:12,textAlign:'center',fontFamily:'Jost,sans-serif'}}>No elements yet</div>
  )

  return(
    <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:2}}>
      {objs.map((obj,i)=>{
        const isActive=fabric.getActiveObject()===obj
        return(
          <div key={i} onClick={()=>selectObj(obj)}
            style={{display:'flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:9,cursor:'pointer',background:isActive?'#eef2ff':'transparent',border:`1.5px solid ${isActive?'#4f46e5':'transparent'}`,transition:'all .1s'}}>
            <span style={{fontSize:13,width:18,textAlign:'center',flexShrink:0}}>{getIcon(obj)}</span>
            <span style={{flex:1,fontSize:12,fontFamily:'Jost,sans-serif',color:'#374151',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{getLabel(obj)}</span>
            <div style={{display:'flex',gap:2,opacity:.6}} onClick={e=>e.stopPropagation()}>
              <button onClick={e=>toggleVisible(obj,e)} title="Toggle visibility" style={{width:22,height:22,border:'none',background:'none',cursor:'pointer',fontSize:11,color:obj.visible===false?'#94a3b8':'#374151',borderRadius:4}}>{obj.visible===false?'🙈':'👁'}</button>
              <button onClick={e=>toggleLock(obj,e)} title="Toggle lock" style={{width:22,height:22,border:'none',background:'none',cursor:'pointer',fontSize:11,color:obj.lockMovementX?'#f59e0b':'#374151',borderRadius:4}}>{obj.lockMovementX?'🔒':'🔓'}</button>
              <button onClick={e=>moveUp(obj,e)} title="Move up" style={{width:22,height:22,border:'none',background:'none',cursor:'pointer',fontSize:11,borderRadius:4}}>↑</button>
              <button onClick={e=>moveDown(obj,e)} title="Move down" style={{width:22,height:22,border:'none',background:'none',cursor:'pointer',fontSize:11,borderRadius:4}}>↓</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc, setDoc] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showShare, setShowShare] = useState(false)
  const [showDrafter, setShowDrafter] = useState(false)
  const [showTplModal, setShowTplModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canvasEl = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const fabricLib = useRef<any>(null)  // stores the fabric library itself for use in panels

  const [pages, setPages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTool, setActiveTool] = useState('select')
  const [activePanel, setActivePanel] = useState<string|null>('layouts')
  const [zoom, setZoom] = useState(0.62)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [fontColor, setFontColor] = useState('#0f172a')
  const [fillColor, setFillColor] = useState('#4f46e5')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('Jost')
  const [canvasW, setCanvasW] = useState(1280)
  const [canvasH, setCanvasH] = useState(720)
  const [fontSearch, setFontSearch] = useState('')
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [layoutCat, setLayoutCat] = useState('All')
  const [stockQuery, setStockQuery] = useState('business')
  const [stockImages, setStockImages] = useState<string[]>([])
  const [thumbnails, setThumbnails] = useState<Record<number,string>>({})

  // Undo/redo history
  const historyStack = useRef<any[]>([])
  const historyIndex = useRef(-1)
  const isUndoRedo = useRef(false)
  const MAX_HISTORY = 50

  const saveTimer = useRef<NodeJS.Timeout|null>(null)
  const pagesRef = useRef<any[]>([])
  const currentPageRef = useRef(0)
  const cWRef = useRef(1280)
  const cHRef = useRef(720)
  const fabricReady = useRef(false)

  useEffect(()=>{pagesRef.current=pages},[pages])
  useEffect(()=>{currentPageRef.current=currentPage},[currentPage])
  useEffect(()=>{cWRef.current=canvasW},[canvasW])
  useEffect(()=>{cHRef.current=canvasH},[canvasH])

  // Bootstrap
  useEffect(()=>{
    const fontsHref='https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap'
    if(!document.querySelector(`link[href="${fontsHref}"]`)){
      const l=document.createElement('link');l.rel='stylesheet';l.href=fontsHref;document.head.appendChild(l)
    }
    if(!(window as any).fabric){
      const s=document.createElement('script')
      s.src='https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
      s.onload=()=>{ initFabric() }
      document.head.appendChild(s)
    } else { initFabric() }
    if(!(window as any).jspdf){
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';document.head.appendChild(s)
    }
  },[]) // eslint-disable-line

  useEffect(()=>{ loadDocument(); loadShareLinks() },[params.id]) // eslint-disable-line

  async function loadDocument(){
    const {data}=await supabase.from('documents').select('*').eq('id',params.id).single()
    if(!data){router.push('/dashboard');return}
    setDoc(data);setTitle(data.title)
    const cd=(data as any).canvas_data
    if(cd?.pages?.length){
      setPages(cd.pages);pagesRef.current=cd.pages
      if(cd.canvasW){setCanvasW(cd.canvasW);cWRef.current=cd.canvasW}
      if(cd.canvasH){setCanvasH(cd.canvasH);cHRef.current=cd.canvasH}
      setShowTplModal(false)
      waitForFabricThenLoad(cd.pages[0],cd.canvasW||1280,cd.canvasH||720)
    } else { setShowTplModal(true) }
  }

  async function loadShareLinks(){
    const {data}=await supabase.from('share_links').select('*').eq('document_id',params.id).order('created_at',{ascending:false})
    setShareLinks(data??[])
  }

  function initFabric(){
    if(fabricReady.current||!canvasEl.current)return
    if(!(window as any).fabric){setTimeout(initFabric,80);return}
    const fab=(window as any).fabric
    fabricLib.current=fab
    const fc=new fab.Canvas(canvasEl.current,{
      width:cWRef.current, height:cHRef.current,
      backgroundColor:'#ffffff', selection:true, preserveObjectStacking:true,
    })
    fabricRef.current=fc
    fabricReady.current=true

    // ── Snap-to-object alignment guides ──
    let vLine:any=null,hLine:any=null
    const SNAP_THRESHOLD=8
    fc.on('object:moving',(e:any)=>{
      if(vLine){fc.remove(vLine);vLine=null}
      if(hLine){fc.remove(hLine);hLine=null}
      const moving=e.target
      const objects=fc.getObjects().filter((o:any)=>o!==moving)
      const mCx=moving.left+(moving.width*moving.scaleX)/2
      const mCy=moving.top+(moving.height*moving.scaleY)/2
      for(const obj of objects){
        const oCx=obj.left+(obj.width*(obj.scaleX||1))/2
        const oCy=obj.top+(obj.height*(obj.scaleY||1))/2
        // snap center X
        if(Math.abs(mCx-oCx)<SNAP_THRESHOLD){
          moving.set('left',oCx-(moving.width*moving.scaleX)/2)
          vLine=new fab.Line([oCx,0,oCx,cHRef.current],{stroke:'#4f46e5',strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7})
          fc.add(vLine)
        }
        // snap center Y
        if(Math.abs(mCy-oCy)<SNAP_THRESHOLD){
          moving.set('top',oCy-(moving.height*moving.scaleY)/2)
          hLine=new fab.Line([0,oCy,cWRef.current,oCy],{stroke:'#4f46e5',strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7})
          fc.add(hLine)
        }
        // snap canvas center X
        const canvasCx=cWRef.current/2
        if(Math.abs(mCx-canvasCx)<SNAP_THRESHOLD){
          moving.set('left',canvasCx-(moving.width*moving.scaleX)/2)
          vLine=new fab.Line([canvasCx,0,canvasCx,cHRef.current],{stroke:'#ef4444',strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7})
          fc.add(vLine)
        }
        const canvasCy=cHRef.current/2
        if(Math.abs(mCy-canvasCy)<SNAP_THRESHOLD){
          moving.set('top',canvasCy-(moving.height*moving.scaleY)/2)
          hLine=new fab.Line([0,canvasCy,cWRef.current,canvasCy],{stroke:'#ef4444',strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7})
          fc.add(hLine)
        }
      }
      fc.renderAll()
    })
    fc.on('object:moved',()=>{
      if(vLine){fc.remove(vLine);vLine=null}
      if(hLine){fc.remove(hLine);hLine=null}
      fc.renderAll()
    })

    // Selection sync
    fc.on('selection:created',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:updated',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:cleared',()=>setSelectedObj(null))

    // History tracking
    fc.on('object:modified',()=>{if(!isUndoRedo.current)pushHistory();scheduleAutoSave()})
    fc.on('object:added',()=>{if(!isUndoRedo.current)pushHistory()})
    fc.on('object:removed',()=>{if(!isUndoRedo.current)pushHistory()})

    // Assign UIDs to objects for layer tracking
    fc.on('object:added',(e:any)=>{
      if(!e.target.__uid) e.target.__uid=Math.random().toString(36).slice(2)
    })

    // Click on empty canvas to draw shapes
    fc.on('mouse:down',(opt:any)=>{
      if(activeTool.current==='text'){
        const p=fc.getPointer(opt.e)
        const tb=new fab.Textbox('Click to edit',{left:p.x,top:p.y,width:300,fontSize:24,fontFamily,fill:fontColor,editable:true})
        fc.add(tb);fc.setActiveObject(tb);fc.renderAll()
        setActiveTool('select');activeTool.current='select'
      }
    })

    if(pagesRef.current.length>0){
      fc.setWidth(cWRef.current);fc.setHeight(cHRef.current)
      fc.loadFromJSON(pagesRef.current[0],()=>{fc.renderAll();pushHistory()})
    }
  }

  // We need activeTool as a ref for use inside fabric event handlers
  const activeTool = useRef('select')
  const [activeToolState, setActiveToolState] = useState('select')
  function setActiveTool(t:string){activeTool.current=t;setActiveToolState(t)}

  function pushHistory(){
    if(!fabricRef.current)return
    const json=fabricRef.current.toJSON()
    const newStack=historyStack.current.slice(0,historyIndex.current+1)
    newStack.push(json)
    if(newStack.length>MAX_HISTORY)newStack.shift()
    historyStack.current=newStack
    historyIndex.current=newStack.length-1
  }

  function undo(){
    if(historyIndex.current<=0)return
    isUndoRedo.current=true
    historyIndex.current--
    const state=historyStack.current[historyIndex.current]
    fabricRef.current?.loadFromJSON(state,()=>{fabricRef.current.renderAll();isUndoRedo.current=false})
  }

  function redo(){
    if(historyIndex.current>=historyStack.current.length-1)return
    isUndoRedo.current=true
    historyIndex.current++
    const state=historyStack.current[historyIndex.current]
    fabricRef.current?.loadFromJSON(state,()=>{fabricRef.current.renderAll();isUndoRedo.current=false})
  }

  function waitForFabricThenLoad(pageJson:any,w:number,h:number){
    const attempt=()=>{
      if(fabricRef.current){
        fabricRef.current.setWidth(w);fabricRef.current.setHeight(h)
        fabricRef.current.loadFromJSON(pageJson,()=>{fabricRef.current.renderAll();pushHistory()})
      } else {setTimeout(attempt,100)}
    }
    attempt()
  }

  function syncSel(obj:any){
    if(!obj)return
    setSelectedObj(obj)
    if(obj.fontSize)setFontSize(obj.fontSize)
    if(obj.fontFamily)setFontFamily(obj.fontFamily)
    if(typeof obj.fill==='string')setFontColor(obj.fill)
    // Switch to properties panel
    setActivePanel('props')
  }

  function captureThumbnail(idx:number){
    if(!fabricRef.current)return
    try{
      const url=fabricRef.current.toDataURL({format:'jpeg',quality:0.4,multiplier:0.12})
      setThumbnails(prev=>({...prev,[idx]:url}))
    }catch(e){}
  }

  function scheduleAutoSave(){
    if(saveTimer.current)clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(()=>{saveCanvas();captureThumbnail(currentPageRef.current)},1500)
  }

  const saveCanvas=useCallback(async()=>{
    if(!fabricRef.current)return
    setSaving(true)
    const curJson=fabricRef.current.toJSON()
    const all=[...pagesRef.current];all[currentPageRef.current]=curJson
    setPages(all);pagesRef.current=all
    await supabase.from('documents').update({
      canvas_data:{pages:all,canvasW:cWRef.current,canvasH:cHRef.current},
      updated_at:new Date().toISOString(),
    } as any).eq('id',params.id)
    setSaving(false);setLastSaved(new Date())
  },[params.id])

  async function saveTitle(){
    await supabase.from('documents').update({title:title||'Untitled'}).eq('id',params.id)
  }

  async function deleteDocument(){
    setDeleting(true)
    await supabase.from('share_links').delete().eq('document_id',params.id)
    await supabase.from('documents').delete().eq('id',params.id)
    router.push('/dashboard')
  }

  async function publishDocument(){
    await supabase.from('documents').update({status:'active'}).eq('id',params.id)
    setDoc(prev=>prev?{...prev,status:'active'}:prev)
    setShowShare(true)
  }

  // ── Unsplash search ──
  function searchStock(q:string){
    const queries=['architecture','nature','technology','business','minimal','abstract','office','city','people','creative']
    const imgs=UNSPLASH_CURATED.map(id=>`https://images.unsplash.com/${id}?w=400&q=70&auto=format`)
    setStockImages(imgs)
  }

  // ── Page operations ──
  function switchPage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current]
    upd[currentPageRef.current]=fabricRef.current.toJSON()
    pagesRef.current=upd;setPages([...upd])
    setCurrentPage(idx);currentPageRef.current=idx
    fabricRef.current.loadFromJSON(upd[idx],()=>fabricRef.current.renderAll())
    historyStack.current=[];historyIndex.current=-1
  }

  function addPage(){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current]
    upd[currentPageRef.current]=fabricRef.current.toJSON()
    const blank=pg(bgColor)
    const ni=currentPageRef.current+1
    upd.splice(ni,0,blank);pagesRef.current=upd;setPages([...upd])
    setCurrentPage(ni);currentPageRef.current=ni
    fabricRef.current.clear();fabricRef.current.backgroundColor=bgColor;fabricRef.current.renderAll()
    historyStack.current=[];historyIndex.current=-1
  }

  function duplicatePage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current]
    upd[currentPageRef.current]=fabricRef.current.toJSON()
    const copy=JSON.parse(JSON.stringify(upd[idx]))
    upd.splice(idx+1,0,copy);pagesRef.current=upd;setPages([...upd])
    switchPage(idx+1)
  }

  function removePage(idx:number){
    if(pagesRef.current.length<=1)return
    const upd=pagesRef.current.filter((_:any,i:number)=>i!==idx)
    pagesRef.current=upd;setPages([...upd])
    const ni=Math.min(currentPageRef.current,upd.length-1)
    setCurrentPage(ni);currentPageRef.current=ni
    fabricRef.current?.loadFromJSON(upd[ni],()=>fabricRef.current.renderAll())
    setThumbnails(prev=>{const next={...prev};delete next[idx];return next})
  }

  function applyLayout(layout:any){
    if(!fabricRef.current)return
    const built=layout.build(cWRef.current,cHRef.current)
    fabricRef.current.loadFromJSON(built,()=>{fabricRef.current.renderAll();pushHistory();scheduleAutoSave()})
  }

  function startBlank(sizeId='pres-169'){
    const size=CANVAS_SIZES.find(s=>s.id===sizeId)||CANVAS_SIZES[0]
    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
    const blank=pg();pagesRef.current=[blank];setPages([blank])
    setCurrentPage(0);currentPageRef.current=0;setShowTplModal(false);setThumbnails({})
    waitForFabricThenLoad(blank,size.w,size.h)
  }

  // ── Canvas tools ──
  function addText(opts:any={}){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    const tb=new fab.Textbox(opts.text||'Click to edit',{
      left:100,top:100,width:opts.w||320,
      fontSize:opts.fs||24,fontFamily:opts.ff||fontFamily,
      fill:opts.fill||fontColor,fontWeight:opts.fw||'400',
      editable:true,lineHeight:1.4,
    })
    fc.add(tb);fc.setActiveObject(tb);fc.renderAll();pushHistory()
  }

  function addShape(type:string,opts:any={}){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    const fill=opts.fill||fillColor
    let shape:any
    if(type==='rect')      shape=new fab.Rect({left:100,top:100,width:220,height:110,fill,rx:opts.rx||0})
    else if(type==='circle')    shape=new fab.Circle({left:100,top:100,radius:70,fill})
    else if(type==='triangle')  shape=new fab.Triangle({left:100,top:100,width:140,height:120,fill})
    else if(type==='star'){
      // Create star polygon
      const points=[];const outerR=70;const innerR=30;const cx=170;const cy=170
      for(let i=0;i<10;i++){
        const r=i%2===0?outerR:innerR;const angle=(i*Math.PI/5)-Math.PI/2
        points.push({x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle)})
      }
      shape=new fab.Polygon(points,{fill,left:100,top:100})
    }
    else if(type==='line')      shape=new fab.Line([100,200,420,200],{stroke:fill,strokeWidth:3,selectable:true})
    else if(type==='arrow'){
      const path=`M 100 150 L 350 150 M 300 110 L 360 150 L 300 190`
      shape=new fab.Path(path,{stroke:fill,strokeWidth:3,fill:'transparent',selectable:true})
    }
    if(shape){fc.add(shape);fc.setActiveObject(shape);fc.renderAll();pushHistory()}
  }

  function addTable(rows=4,cols=3){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    const cw=160,rh=44,x=100,y=100
    const objs=[]
    for(let i=0;i<rows;i++){
      for(let j=0;j<cols;j++){
        const isH=i===0
        objs.push(new fab.Rect({left:x+j*cw,top:y+i*rh,width:cw,height:rh,fill:isH?'#0f172a':i%2===0?'#f8fafc':'#ffffff',stroke:'#e2e8f0',strokeWidth:1,selectable:true}))
        objs.push(new fab.IText(isH?`Column ${j+1}`:`Cell ${i},${j+1}`,{left:x+j*cw+10,top:y+i*rh+13,width:cw-20,fontSize:12,fontFamily:'Jost',fill:isH?'#ffffff':'#374151',fontWeight:isH?'600':'400',editable:true,selectable:true}))
      }
    }
    objs.forEach(o=>fc.add(o));fc.renderAll();pushHistory()
  }

  function loadGoogleFont(family:string){
    const safe=family.replace(/ /g,'+')
    if(document.querySelector(`link[data-font="${safe}"]`))return
    const l=document.createElement('link');l.rel='stylesheet'
    l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@300;400;500;600;700;800&display=swap`
    l.setAttribute('data-font',safe);document.head.appendChild(l)
  }

  function applyFont(f:string){
    loadGoogleFont(f);setFontFamily(f);setShowFontPicker(false);updateProp('fontFamily',f)
  }

  function deleteSelected(){
    const fc=fabricRef.current;if(!fc)return
    fc.getActiveObjects().forEach((o:any)=>fc.remove(o))
    fc.discardActiveObject();fc.renderAll();setSelectedObj(null);pushHistory()
  }

  function duplicateSelected(){
    const fc=fabricRef.current;if(!fc)return
    fc.getActiveObject()?.clone((c:any)=>{
      c.set({left:c.left+24,top:c.top+24})
      fc.add(c);fc.setActiveObject(c);fc.renderAll();pushHistory()
    })
  }

  function groupSelected(){
    const fc=fabricRef.current;if(!fc)return
    if(!fc.getActiveObject()||fc.getActiveObject().type!=='activeSelection')return
    fc.getActiveObject().toGroup();fc.renderAll();pushHistory()
  }

  function ungroupSelected(){
    const fc=fabricRef.current;if(!fc)return
    if(!fc.getActiveObject()||fc.getActiveObject().type!=='group')return
    fc.getActiveObject().toActiveSelection();fc.renderAll();pushHistory()
  }

  function updateProp(prop:string,value:any){
    const fc=fabricRef.current;if(!fc)return
    const obj=fc.getActiveObject();if(!obj)return
    obj.set(prop,value);fc.renderAll();scheduleAutoSave()
  }

  function uploadImage(file:File){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    const r=new FileReader()
    r.onload=e=>fab.Image.fromURL(e.target?.result as string,(img:any)=>{
      const s=Math.min(400/img.width,300/img.height,1)
      img.set({left:120,top:120,scaleX:s,scaleY:s})
      fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHistory()
    })
    r.readAsDataURL(file)
  }

  function addStockImage(url:string){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    fab.Image.fromURL(url,(img:any)=>{
      const scale=Math.min(cWRef.current/img.width,cHRef.current/img.height,1)
      img.set({left:0,top:0,scaleX:scale,scaleY:scale,crossOrigin:'anonymous'})
      fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHistory()
    },{crossOrigin:'anonymous'})
  }

  function uploadFont(file:File){
    const r=new FileReader()
    r.onload=e=>{
      const name=file.name.replace(/\.[^/.]+$/,'')
      const style=document.createElement('style')
      style.textContent=`@font-face{font-family:'${name}';src:url('${e.target?.result}')}`
      document.head.appendChild(style);setFontFamily(name)
    }
    r.readAsDataURL(file)
  }

  async function exportPDF(){
    const fc=fabricRef.current;if(!fc||(window as any).jspdf===undefined)return
    const{jsPDF}=(window as any).jspdf
    const saved=[...pagesRef.current];saved[currentPageRef.current]=fc.toJSON()
    const pdf=new jsPDF({orientation:cWRef.current>cHRef.current?'landscape':'portrait',unit:'px',format:[cWRef.current,cHRef.current]})
    for(let i=0;i<saved.length;i++){
      if(i>0)pdf.addPage()
      await new Promise<void>(res=>{
        const tmp=document.createElement('canvas');tmp.width=cWRef.current;tmp.height=cHRef.current
        const tfc=new (window as any).fabric.StaticCanvas(tmp,{width:cWRef.current,height:cHRef.current})
        tfc.loadFromJSON(saved[i],()=>{
          tfc.renderAll()
          pdf.addImage(tfc.toDataURL({format:'jpeg',quality:.92}),'JPEG',0,0,cWRef.current,cHRef.current)
          tfc.dispose();res()
        })
      })
    }
    pdf.save(`${title||'document'}.pdf`)
  }

  async function exportPNG(){
    const fc=fabricRef.current;if(!fc)return
    const a=document.createElement('a')
    a.href=fc.toDataURL({format:'png',multiplier:2})
    a.download=`${title||'page'}.png`;a.click()
  }

  // Keyboard shortcuts
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
      if(e.key==='Escape'){setActivePanel(null);fabricRef.current?.discardActiveObject();fabricRef.current?.renderAll()}
      // Arrow keys nudge
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        const obj=fabricRef.current?.getActiveObject();if(!obj)return
        const delta=e.shiftKey?10:1
        if(e.key==='ArrowLeft')obj.set('left',obj.left-delta)
        if(e.key==='ArrowRight')obj.set('left',obj.left+delta)
        if(e.key==='ArrowUp')obj.set('top',obj.top-delta)
        if(e.key==='ArrowDown')obj.set('top',obj.top+delta)
        fabricRef.current.renderAll();scheduleAutoSave()
      }
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[saveCanvas]) // eslint-disable-line

  const isActive=doc?.status==='active'
  const filteredFonts=FONTS.filter(f=>f.toLowerCase().includes(fontSearch.toLowerCase()))
  const filteredLayouts=layoutCat==='All'?LAYOUTS:LAYOUTS.filter(l=>l.category===layoutCat)

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#e8e8ea',fontFamily:"'Jost',system-ui,sans-serif",color:'#0f172a'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#9ca3af}
        input[type="color"]{-webkit-appearance:none;border:none;cursor:pointer;padding:0;border-radius:6px;overflow:hidden}
        input[type="color"]::-webkit-color-swatch-wrapper{padding:0}
        input[type="color"]::-webkit-color-swatch{border:none}
        .tbtn{width:34px;height:32px;border:none;cursor:pointer;border-radius:7px;background:transparent;color:#6b7280;display:flex;align-items:center;justify-content:center;transition:all .1s;flex-shrink:0}
        .tbtn:hover{background:#f3f4f6;color:#111827}
        .tbtn.on{background:#eef2ff;color:#4f46e5}
        .rail{width:54px;height:50px;border:none;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#6b7280;transition:all .12s;border-radius:10px;font-family:'Jost',sans-serif}
        .rail:hover{background:#f3f4f6;color:#111827}
        .rail.on{background:#eef2ff;color:#4f46e5}
        .rail span{font-size:9px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}
        .pthumb{cursor:pointer;border-radius:9px;border:2px solid #e5e7eb;overflow:hidden;transition:all .14s;background:white;position:relative}
        .pthumb:hover{border-color:#9ca3af}
        .pthumb.on{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.15)}
        .card-hover{transition:all .15s;cursor:pointer}
        .card-hover:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.1);border-color:#4f46e5!important}
        .sp-inp{width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;color:#0f172a;border-radius:8px;padding:6px 10px;font:400 12px 'Jost',sans-serif;outline:none}
        .sp-inp:focus{border-color:#4f46e5;background:white}
        .font-row{padding:7px 10px;cursor:pointer;font-size:13px;border-radius:7px;transition:background .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .font-row:hover{background:#f3f4f6}
        .font-row.on{background:#eef2ff;color:#4f46e5;font-weight:700}
        .divider{width:1px;height:22px;background:#e5e7eb;margin:0 3px;flex-shrink:0}
        input[type="range"]{cursor:pointer;height:4px;border-radius:2px}
        .shape-btn{width:56px;height:56px;border:1.5px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:9px;font-weight:700;color:#6b7280;font-family:'Jost',sans-serif;transition:all .1s}
        .shape-btn:hover{border-color:#4f46e5;color:#4f46e5;background:#eef2ff}
        .panel-hdr{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;padding:0 2px}
      `}</style>

      {/* ── TOPBAR ────────────────────────────────────────────────────────────── */}
      <div style={{height:52,background:'white',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',padding:'0 14px',gap:8,flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,.05)',zIndex:20}}>
        <button onClick={()=>router.push('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',display:'flex',alignItems:'center',gap:5,fontSize:13,fontFamily:'Jost,sans-serif',fontWeight:500,padding:'5px 8px',borderRadius:8}}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Docs
        </button>
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M1 1l3 4-3 4" stroke="#d1d5db" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{border:'none',outline:'none',fontSize:14,fontWeight:600,color:'#0f172a',background:'transparent',fontFamily:'Jost,sans-serif',flex:1,maxWidth:280,minWidth:80}}/>

        {/* Undo/Redo */}
        <div style={{display:'flex',gap:2,marginLeft:4}}>
          <button onClick={undo} title="Undo (⌘Z)" className="tbtn"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5A4.5 4.5 0 107.5 3H4.5M4.5 3L2 5.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <button onClick={redo} title="Redo (⌘⇧Z)" className="tbtn"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M12 7.5A4.5 4.5 0 107.5 3H10.5M10.5 3L13 5.5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>

        <div className="divider"/>
        <div style={{display:'flex',alignItems:'center',gap:7,marginLeft:'auto'}}>
          <span style={{fontSize:11,color:saving?'#4f46e5':'#94a3b8',fontFamily:'JetBrains Mono,monospace',minWidth:80}}>
            {saving?'● Saving…':lastSaved?`✓ ${lastSaved.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}':''}</span>
          <span style={{padding:'4px 10px',borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:'.05em',background:isActive?'#dcfce7':'#f1f5f9',color:isActive?'#15803d':'#64748b'}}>{isActive?'LIVE':'DRAFT'}</span>
          {[
            {label:'Templates',fn:()=>setShowTplModal(true)},
            {label:'AI Draft',fn:()=>setShowDrafter(true)},
            {label:'Present',fn:()=>router.push(`/documents/${params.id}/present`)},
          ].map(b=>(
            <button key={b.label} onClick={b.fn} style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',color:'#374151',fontFamily:'Jost,sans-serif'}}>
              {b.label}
            </button>
          ))}
          {/* Export dropdown */}
          <div style={{position:'relative'}}>
            <button onClick={()=>setActivePanel(activePanel==='export'?null:'export')}
              style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',color:'#374151',fontFamily:'Jost,sans-serif',display:'flex',alignItems:'center',gap:5}}>
              Export <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {activePanel==='export'&&(
              <div style={{position:'absolute',top:'110%',right:0,background:'white',border:'1px solid #e5e7eb',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:300,minWidth:160,padding:8}}>
                {[{label:'Export as PDF',fn:exportPDF},{label:'Export as PNG',fn:exportPNG}].map(b=>(
                  <button key={b.label} onClick={()=>{b.fn();setActivePanel(null)}}
                    style={{display:'block',width:'100%',padding:'9px 14px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontFamily:'Jost,sans-serif',fontWeight:500,color:'#374151',borderRadius:8,textAlign:'left'}}
                    onMouseOver={e=>{(e.target as HTMLElement).style.background='#f3f4f6'}}
                    onMouseOut={e=>{(e.target as HTMLElement).style.background='none'}}>
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isActive
            ?<button onClick={()=>setShowShare(true)} style={pBtn}>Share</button>
            :<button onClick={publishDocument} style={pBtn}>Publish & Share</button>}
          <button onClick={()=>setShowDeleteConfirm(true)} title="Delete document" style={{width:32,height:32,border:'none',borderRadius:8,background:'transparent',cursor:'pointer',color:'#94a3b8',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 10.5v-5M9.5 10.5v-5M3 3.5l.9 8h6.2l.9-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div style={{height:44,background:'white',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',padding:'0 10px',gap:2,flexShrink:0,overflowX:'auto',zIndex:15}}>
        {([
          {id:'select',tip:'Select (V)',  icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 2l9 5-4.5 1.4-2.2 4.6L3 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>},
          {id:'text',  tip:'Text (T)',   icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M7.5 4v8M4.5 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>},
          {id:'draw',  tip:'Draw (P)',   icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 12.5l2-1L12 4 11 3 3.5 10.5l-1 2zm8-9l1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>},
        ]).map(tool=>(
          <button key={tool.id} title={tool.tip} className={`tbtn${activeToolState===tool.id?' on':''}`}
            onClick={()=>{
              if(tool.id==='text'){setActiveTool('text');return}
              setActiveTool(tool.id)
              if(fabricRef.current){
                fabricRef.current.isDrawingMode=tool.id==='draw'
                if(tool.id==='draw'&&fabricRef.current.freeDrawingBrush){
                  fabricRef.current.freeDrawingBrush.color=fontColor
                  fabricRef.current.freeDrawingBrush.width=3
                }
              }
            }}>{tool.icon}
          </button>
        ))}
        <div className="divider"/>
        {/* Shape quick-add */}
        {([
          {id:'rect',  tip:'Rectangle', icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>},
          {id:'circle',tip:'Circle',    icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/></svg>},
          {id:'triangle',tip:'Triangle',icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2l5.5 10H1.5L7 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>},
          {id:'star',  tip:'Star',      icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.5 3.5H12l-2.8 2.1 1 3.4L7 8.8l-3.2 1.7 1-3.4L2 5h3.5L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>},
          {id:'line',  tip:'Line',      icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12L12 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>},
          {id:'arrow', tip:'Arrow',     icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>},
        ]).map(s=>(
          <button key={s.id} title={s.tip} className="tbtn" onClick={()=>addShape(s.id)}>{s.icon}</button>
        ))}
        <button title="Insert table" className="tbtn" onClick={()=>addTable()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5h12M1 9h12M5 5v7M9 5v7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
        </button>
        <label title="Upload image" className="tbtn" style={{cursor:'pointer'}}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><path d="M1 10.5l3-2.5 2.5 2.5 2-2L13 11" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
          <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
        </label>
        <div className="divider"/>
        {/* Font picker */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowFontPicker(!showFontPicker)}
            style={{height:32,padding:'0 10px',border:'1.5px solid #e5e7eb',borderRadius:8,background:'white',cursor:'pointer',fontSize:12,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:500,color:'#374151',display:'flex',alignItems:'center',gap:5,minWidth:130}}>
            <span style={{flex:1,textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fontFamily}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          {showFontPicker&&(
            <div style={{position:'absolute',top:'110%',left:0,background:'white',border:'1px solid #e5e7eb',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:200,width:230}}>
              <div style={{padding:'8px 8px 4px'}}>
                <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search 60+ fonts…" className="sp-inp" autoFocus/>
              </div>
              <div style={{maxHeight:240,overflow:'auto',padding:'4px 8px 6px'}}>
                {filteredFonts.slice(0,60).map(f=>(
                  <div key={f} className={`font-row${fontFamily===f?' on':''}`} style={{fontFamily:`'${f}',sans-serif`}}
                    onClick={()=>applyFont(f)}>{f}</div>
                ))}
              </div>
              <div style={{padding:'8px',borderTop:'1px solid #f3f4f6'}}>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:11,color:'#6b7280',fontFamily:'Jost,sans-serif'}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Upload custom font
                  <input type="file" accept=".ttf,.otf,.woff,.woff2" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFont(f)}}/>
                </label>
              </div>
            </div>
          )}
        </div>
        <input type="number" value={fontSize} min={6} max={400}
          onChange={e=>{const v=parseInt(e.target.value);setFontSize(v);updateProp('fontSize',v)}}
          style={{width:52,height:32,border:'1.5px solid #e5e7eb',borderRadius:8,padding:'0 8px',fontSize:12,fontFamily:'JetBrains Mono,monospace',color:'#374151',outline:'none',textAlign:'center'}}/>
        {/* Bold/Italic/Underline */}
        {[
          {tip:'Bold',   prop:'fontWeight', valOn:'bold',   valOff:'normal', label:'B', style:{fontWeight:700}},
          {tip:'Italic', prop:'fontStyle',  valOn:'italic', valOff:'normal', label:'I', style:{fontStyle:'italic'}},
          {tip:'Underline',prop:'underline',valOn:true,    valOff:false,    label:'U', style:{textDecoration:'underline'}},
        ].map(f=>(
          <button key={f.tip} title={f.tip} className="tbtn"
            style={{...f.style,fontFamily:'Georgia,serif',fontSize:14,fontWeight:f.tip==='Bold'?700:400}}
            onClick={()=>{
              const obj=fabricRef.current?.getActiveObject();if(!obj)return
              const cur=obj[f.prop]
              obj.set(f.prop,cur===f.valOn||cur===true?f.valOff:f.valOn)
              fabricRef.current.renderAll()
            }}>{f.label}</button>
        ))}
        <div className="divider"/>
        {/* Colors */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {([
            {l:'A',  v:fontColor, onChange:(v:string)=>{setFontColor(v);updateProp('fill',v)}, title:'Text color'},
            {l:'Fill',v:fillColor,onChange:(v:string)=>{setFillColor(v);updateProp('fill',v)}, title:'Fill color'},
            {l:'BG', v:bgColor,   onChange:(v:string)=>{setBgColor(v);if(fabricRef.current){fabricRef.current.backgroundColor=v;fabricRef.current.renderAll()}}, title:'Background color'},
          ]).map(c=>(
            <div key={c.l} style={{textAlign:'center'}} title={c.title}>
              <div style={{position:'relative',width:28,height:28}}>
                <input type="color" value={c.v} onChange={e=>c.onChange(e.target.value)}
                  style={{width:28,height:28,borderRadius:7,border:'2px solid #e5e7eb',cursor:'pointer',display:'block'}}/>
              </div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:1,fontFamily:'JetBrains Mono,monospace',fontWeight:600,letterSpacing:'.02em'}}>{c.l}</div>
            </div>
          ))}
        </div>
        <div className="divider"/>
        {/* Edit actions */}
        {[
          {tip:'Duplicate (⌘D)', fn:duplicateSelected, icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4V2.5A1.5 1.5 0 015.5 1H11.5A1.5 1.5 0 0113 2.5V8.5A1.5 1.5 0 0111.5 10H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
          {tip:'Delete (Del)', fn:deleteSelected, icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 10.5v-5M9.5 10.5v-5M3 3.5l.9 8h6.2l.9-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {tip:'Bring to Front', fn:()=>{const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.bringToFront(o);fabricRef.current.renderAll()}}, icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v9M4 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
          {tip:'Send to Back', fn:()=>{const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.sendToBack(o);fabricRef.current.renderAll()}}, icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12V3M4 9l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 2h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
          {tip:'Group (⌘G)', fn:groupSelected, icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>},
        ].map(b=><button key={b.tip} title={b.tip} className="tbtn" onClick={b.fn}>{b.icon}</button>)}
        {/* Zoom */}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:3,background:'#f9fafb',borderRadius:9,padding:'3px 10px',border:'1.5px solid #e5e7eb',flexShrink:0}}>
          <button onClick={()=>setZoom(z=>Math.max(.1,+(z-.1).toFixed(2)))} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:18,lineHeight:1,padding:'0 2px'}}>−</button>
          <button onClick={()=>setZoom(1)} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#6b7280',minWidth:38,textAlign:'center',fontFamily:'JetBrains Mono,monospace'}}>{Math.round(zoom*100)}%</button>
          <button onClick={()=>setZoom(z=>Math.min(3,+(z+.1).toFixed(2)))} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:18,lineHeight:1,padding:'0 2px'}}>+</button>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* ── Left rail ─── */}
        <div style={{width:56,flexShrink:0,background:'white',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:6,gap:1,zIndex:10}}>
          {[
            {id:'layouts', label:'Layouts',icon:<svg width="19" height="19" viewBox="0 0 19 19" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>},
            {id:'photos',  label:'Photos', icon:<svg width="19" height="19" viewBox="0 0 19 19" fill="none"><rect x="2" y="4" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="6.5" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.1"/><path d="M2 13.5l4.5-4 3 3 2.5-2 5 5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>},
            {id:'shapes',  label:'Shapes', icon:<svg width="19" height="19" viewBox="0 0 19 19" fill="none"><circle cx="6.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.3"/><rect x="10.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M13 2l3 5H10L13 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>},
            {id:'text',    label:'Text',   icon:<svg width="19" height="19" viewBox="0 0 19 19" fill="none"><path d="M3 5A1.5 1.5 0 014.5 3.5h10A1.5 1.5 0 0116 5v1.5M9.5 3.5v12M6.5 15.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
            {id:'bg',      label:'BG',     icon:<svg width="19" height="19" viewBox="0 0 19 19" fill="none"><circle cx="9.5" cy="9.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 3A6.5 6.5 0 019.5 16" fill="currentColor" opacity=".15"/></svg>},
            {id:'props',   label:'Props',  icon:<svg width="19" height="19" viewBox="0 0 19 19" fill="none"><circle cx="9.5" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 2v2M9.5 15v2M2 9.5h2M15 9.5h2M4.1 4.1l1.4 1.4M13.5 13.5l1.4 1.4M4.1 14.9l1.4-1.4M13.5 5.5l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
            {id:'layers',  label:'Layers', icon:<svg width="19" height="19" viewBox="0 0 19 19" fill="none"><path d="M2 6.5l7.5-4 7.5 4-7.5 4L2 6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M2 10l7.5 4 7.5-4M2 13.5l7.5 4 7.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
          ].map(item=>(
            <button key={item.id} className={`rail${activePanel===item.id?' on':''}`} onClick={()=>setActivePanel(activePanel===item.id?null:item.id)}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* ── Left panel ─── */}
        {activePanel&&activePanel!=='export'&&(
          <div style={{width:264,flexShrink:0,background:'white',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{flex:1,overflow:'auto',padding:14}}>

              {activePanel==='layouts'&&(
                <div>
                  <div className="panel-hdr">Layouts</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
                    {LAYOUT_CATS.map(c=>(
                      <button key={c} onClick={()=>setLayoutCat(c)}
                        style={{padding:'4px 10px',borderRadius:20,border:`1.5px solid ${layoutCat===c?'#4f46e5':'#e5e7eb'}`,background:layoutCat===c?'#4f46e5':'white',color:layoutCat===c?'white':'#374151',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'Jost,sans-serif'}}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {filteredLayouts.map(l=>(
                      <div key={l.id} className="card-hover" onClick={()=>applyLayout(l)}
                        style={{border:'1.5px solid #e5e7eb',borderRadius:10,overflow:'hidden',cursor:'pointer'}}>
                        <div style={{aspectRatio:'16/9',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace',padding:4}}>
                          <div style={{fontSize:8,textAlign:'center',lineHeight:1.3}}>{l.label}</div>
                        </div>
                        <div style={{padding:'5px 7px',fontSize:10,fontWeight:600,color:'#374151',fontFamily:'Jost,sans-serif',borderTop:'1px solid #f1f5f9'}}>{l.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePanel==='photos'&&(
                <div>
                  <div className="panel-hdr">Photos</div>
                  <div style={{display:'flex',gap:6,marginBottom:10}}>
                    <input value={stockQuery} onChange={e=>setStockQuery(e.target.value)} placeholder="Search images…" className="sp-inp"/>
                    <button onClick={()=>searchStock(stockQuery)} style={{padding:'6px 12px',background:'#4f46e5',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:600,fontFamily:'Jost,sans-serif',cursor:'pointer',flexShrink:0}}>Go</button>
                  </div>
                  {stockImages.length===0&&(
                    <button onClick={()=>searchStock(stockQuery)} style={{width:'100%',padding:'10px',background:'#f8fafc',border:'2px dashed #e5e7eb',borderRadius:10,cursor:'pointer',fontSize:12,color:'#94a3b8',fontFamily:'Jost,sans-serif'}}>Load curated photos</button>
                  )}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    {stockImages.map((url,i)=>(
                      <div key={i} className="card-hover" onClick={()=>addStockImage(url.replace('w=400','w=1280'))}
                        style={{aspectRatio:'4/3',borderRadius:9,overflow:'hidden',border:'1.5px solid #e5e7eb',cursor:'pointer'}}>
                        <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} crossOrigin="anonymous"/>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f1f5f9'}}>
                    <div className="panel-hdr">Upload</div>
                    <label style={{display:'flex',alignItems:'center',gap:8,padding:'10px',border:'2px dashed #e5e7eb',borderRadius:10,cursor:'pointer',fontSize:12,color:'#94a3b8',fontFamily:'Jost,sans-serif'}}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v10M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      Upload an image
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
                    </label>
                  </div>
                </div>
              )}

              {activePanel==='shapes'&&(
                <div>
                  <div className="panel-hdr">Shapes & Elements</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                    {[
                      {id:'rect',     label:'Rect',     icon:'▭'},
                      {id:'circle',   label:'Circle',   icon:'◯'},
                      {id:'triangle', label:'Triangle', icon:'△'},
                      {id:'star',     label:'Star',     icon:'★'},
                      {id:'line',     label:'Line',     icon:'─'},
                      {id:'arrow',    label:'Arrow',    icon:'→'},
                    ].map(s=>(
                      <button key={s.id} className="shape-btn" onClick={()=>addShape(s.id)}>
                        <span style={{fontSize:20}}>{s.icon}</span>{s.label}
                      </button>
                    ))}
                  </div>
                  <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f1f5f9'}}>
                    <div className="panel-hdr">Tables</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                      {[[4,3,'4×3'],[3,2,'3×2'],[6,4,'6×4']].map(([r,c,l])=>(
                        <button key={l as string} className="shape-btn" onClick={()=>addTable(r as number,c as number)} style={{width:'100%',height:44}}>
                          <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect x="1" y="1" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><path d="M1 5h16M1 9h16M7 5v7M13 5v7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePanel==='text'&&(
                <div>
                  <div className="panel-hdr">Text Styles</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {[
                      {label:'Heading',   fs:48,fw:'800',ff:'Jost'},
                      {label:'Subheading',fs:28,fw:'700',ff:'Jost'},
                      {label:'Body text', fs:16,fw:'400',ff:'Jost'},
                      {label:'Caption',   fs:12,fw:'400',ff:'Jost'},
                      {label:'MONO LABEL',fs:11,fw:'700',ff:'JetBrains Mono'},
                    ].map(s=>(
                      <button key={s.label} onClick={()=>addText({text:s.label,fs:s.fs,fw:s.fw,ff:s.ff})}
                        style={{padding:'10px 14px',border:'1.5px solid #e5e7eb',borderRadius:9,background:'white',cursor:'pointer',textAlign:'left',fontSize:s.fs>28?18:s.fs>16?15:s.fs>12?13:11,fontFamily:`'${s.ff}',sans-serif`,fontWeight:s.fw,color:'#0f172a',transition:'all .1s'}}
                        onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='#4f46e5';(e.currentTarget as HTMLElement).style.background='#fafbff'}}
                        onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e5e7eb';(e.currentTarget as HTMLElement).style.background='white'}}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f1f5f9'}}>
                    <div className="panel-hdr">Add text box</div>
                    <button onClick={()=>addText()} style={{width:'100%',padding:'10px',border:'2px dashed #e5e7eb',borderRadius:10,cursor:'pointer',fontSize:13,color:'#94a3b8',fontFamily:'Jost,sans-serif',background:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Add text
                    </button>
                  </div>
                </div>
              )}

              {activePanel==='bg'&&(
                <div>
                  <div className="panel-hdr">Background</div>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
                    <input type="color" value={bgColor} onChange={e=>{setBgColor(e.target.value);if(fabricRef.current){fabricRef.current.backgroundColor=e.target.value;fabricRef.current.renderAll();scheduleAutoSave()}}}
                      style={{width:40,height:38,borderRadius:9,border:'2px solid #e5e7eb',cursor:'pointer',padding:0}}/>
                    <span style={{fontSize:13,color:'#374151',fontFamily:'JetBrains Mono,monospace'}}>{bgColor}</span>
                  </div>
                  <div className="panel-hdr">Color presets</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5,marginBottom:14}}>
                    {['#ffffff','#0f172a','#1e293b','#f8fafc','#eff6ff','#fdf4ff','#ecfdf5','#fff7ed','#fdf2f8','#f0fdf4','#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#3b82f6'].map(c=>(
                      <button key={c} onClick={()=>{setBgColor(c);if(fabricRef.current){fabricRef.current.backgroundColor=c;fabricRef.current.renderAll();scheduleAutoSave()}}}
                        style={{width:32,height:32,borderRadius:7,background:c,border:`2px solid ${bgColor===c?'#4f46e5':'#e5e7eb'}`,cursor:'pointer',transition:'transform .1s'}}
                        onMouseOver={e=>(e.currentTarget.style.transform='scale(1.15)')}
                        onMouseOut={e=>(e.currentTarget.style.transform='scale(1)')}/>
                    ))}
                  </div>
                  <div className="panel-hdr">Canvas size</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {CANVAS_SIZES.map(s=>(
                      <button key={s.id} onClick={()=>{
                        setCanvasW(s.w);setCanvasH(s.h);cWRef.current=s.w;cHRef.current=s.h
                        if(fabricRef.current){fabricRef.current.setWidth(s.w);fabricRef.current.setHeight(s.h);fabricRef.current.renderAll()}
                      }}
                        style={{padding:'8px 12px',border:`1.5px solid ${canvasW===s.w&&canvasH===s.h?'#4f46e5':'#e5e7eb'}`,borderRadius:9,background:canvasW===s.w&&canvasH===s.h?'#eef2ff':'white',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,fontFamily:'Jost,sans-serif',color:canvasW===s.w&&canvasH===s.h?'#4f46e5':'#374151',fontWeight:canvasW===s.w&&canvasH===s.h?700:400}}>
                        <span>{s.label}</span>
                        <span style={{fontSize:10,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace'}}>{s.dims}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activePanel==='props'&&(
                <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
                  <div className="panel-hdr">Properties</div>
                  <PropsPanel obj={selectedObj} fabric={{...fabricRef.current,fabric:(window as any).fabric}} onUpdate={scheduleAutoSave}/>
                </div>
              )}

              {activePanel==='layers'&&(
                <div>
                  <div className="panel-hdr">Layers</div>
                  <LayersPanel fabric={fabricRef.current} onSelect={obj=>{setSelectedObj(obj);setActivePanel('props')}}/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Canvas area ── */}
        <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column',alignItems:'center',padding:'24px',background:'#e8e8ea'}}
          onClick={e=>{if(e.target===e.currentTarget&&activePanel==='export')setActivePanel(null)}}>
          {/* Canvas shadow wrapper */}
          <div style={{
            transform:`scale(${zoom})`,transformOrigin:'top center',
            boxShadow:'0 4px 40px rgba(0,0,0,.18),0 1px 6px rgba(0,0,0,.1)',
            borderRadius:2,overflow:'hidden',flexShrink:0,
            outline:'1px solid rgba(0,0,0,.06)',
          }}>
            <canvas ref={canvasEl}/>
          </div>
          {/* Zoom hint */}
          <div style={{marginTop:12,fontSize:10,color:'#9ca3af',fontFamily:'JetBrains Mono,monospace'}}>
            {Math.round(zoom*100)}% · {canvasW}×{canvasH}
          </div>
        </div>

        {/* ── Pages sidebar ── */}
        <div style={{width:128,flexShrink:0,background:'white',borderLeft:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'10px 8px',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
            <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Pages</div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'8px 8px 0'}}>
            {pages.map((_,i)=>(
              <div key={i} style={{marginBottom:8,position:'relative'}}>
                <div className={`pthumb${currentPage===i?' on':''}`} onClick={()=>switchPage(i)}
                  style={{width:'100%',aspectRatio:`${canvasW}/${canvasH}`,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {thumbnails[i]
                    ?<img src={thumbnails[i]} alt={`Page ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    :<span style={{fontSize:10,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace'}}>{i+1}</span>}
                </div>
                {/* Page actions overlay */}
                <div style={{position:'absolute',top:3,right:3,display:'flex',gap:2,opacity:0}} className="page-actions">
                  <button onClick={e=>{e.stopPropagation();duplicatePage(i)}} title="Duplicate" style={{width:18,height:18,background:'white',border:'1px solid #e5e7eb',borderRadius:4,cursor:'pointer',fontSize:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x=".5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M2.5 2.5V1.5A1 1 0 013.5.5h5A1 1 0 019.5 1.5v5A1 1 0 018.5 7.5H7.5" stroke="currentColor" strokeWidth="1"/></svg>
                  </button>
                  {pages.length>1&&<button onClick={e=>{e.stopPropagation();removePage(i)}} title="Delete" style={{width:18,height:18,background:'white',border:'1px solid #fee2e2',borderRadius:4,cursor:'pointer',fontSize:9,color:'#ef4444',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>}
                </div>
                <div style={{fontSize:9,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace',textAlign:'center',marginTop:3}}>{i+1}</div>
              </div>
            ))}
          </div>
          <div style={{padding:'8px',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
            <button onClick={addPage} style={{width:'100%',padding:'8px 0',background:'#f8fafc',border:'1.5px dashed #e5e7eb',borderRadius:9,cursor:'pointer',fontSize:11,color:'#6b7280',fontFamily:'Jost,sans-serif',fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Add page
            </button>
          </div>
        </div>
      </div>

      {/* ── Template modal ────────────────────────────────────────────────────── */}
      {showTplModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'white',borderRadius:20,width:'min(900px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{padding:'24px 28px 16px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#0f172a',fontFamily:'Jost,sans-serif'}}>Start your design</h2>
                <p style={{margin:'4px 0 0',fontSize:13,color:'#64748b',fontFamily:'Jost,sans-serif'}}>Choose a template or start with a blank canvas</p>
              </div>
              {pages.length>0&&<button onClick={()=>setShowTplModal(false)} style={{background:'#f3f4f6',border:'none',cursor:'pointer',color:'#6b7280',padding:8,borderRadius:8}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>}
            </div>
            <div style={{overflow:'auto',padding:'20px 28px',flex:1}}>
              {/* Blank options */}
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>Quick start</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8,marginBottom:24}}>
                {CANVAS_SIZES.map(s=>(
                  <button key={s.id} onClick={()=>startBlank(s.id)}
                    style={{padding:'12px 10px',border:'1.5px solid #e5e7eb',borderRadius:12,background:'white',cursor:'pointer',textAlign:'center',fontFamily:'Jost,sans-serif',transition:'all .12s'}}
                    onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='#4f46e5';(e.currentTarget as HTMLElement).style.background='#fafbff'}}
                    onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='#e5e7eb';(e.currentTarget as HTMLElement).style.background='white'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:9,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace'}}>{s.dims}</div>
                  </button>
                ))}
              </div>
              {/* Template layouts */}
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>Layouts to apply</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
                {LAYOUTS.map(l=>(
                  <div key={l.id} className="card-hover" onClick={()=>{
                    const size=CANVAS_SIZES[0]
                    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
                    const built=l.build(size.w,size.h)
                    pagesRef.current=[built];setPages([built]);setCurrentPage(0);currentPageRef.current=0
                    setShowTplModal(false);setThumbnails({})
                    waitForFabricThenLoad(built,size.w,size.h)
                  }}
                    style={{border:'1.5px solid #e5e7eb',borderRadius:12,overflow:'hidden',cursor:'pointer'}}>
                    <div style={{aspectRatio:'16/9',background:'#f0f4f8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace',padding:8}}>
                      <span>{l.label}</span>
                    </div>
                    <div style={{padding:'8px 10px',fontSize:11,fontWeight:600,color:'#374151',fontFamily:'Jost,sans-serif',borderTop:'1px solid #f1f5f9'}}>
                      {l.label}<span style={{marginLeft:5,fontSize:9,color:'#94a3b8'}}>{l.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Share, Delete, Drafter ─────────────────────────────────────────── */}
      {showShare&&(
        <ShareModal documentId={params.id} links={shareLinks} onClose={()=>setShowShare(false)}
          onRefresh={loadShareLinks} isActive={isActive} onPublish={publishDocument}/>
      )}
      {showDeleteConfirm&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:16,padding:'28px 32px',width:380,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <h3 style={{fontSize:18,fontWeight:700,color:'#0f172a',margin:'0 0 8px',fontFamily:'Jost,sans-serif'}}>Delete document?</h3>
            <p style={{fontSize:13,color:'#6b7280',margin:'0 0 20px',lineHeight:1.6,fontFamily:'Jost,sans-serif'}}>This permanently deletes this document and all its share links. This cannot be undone.</p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowDeleteConfirm(false)} style={sBtn}>Cancel</button>
              <button onClick={deleteDocument} disabled={deleting} style={{padding:'8px 18px',borderRadius:9,border:'none',background:'#ef4444',color:'white',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'Jost,sans-serif',opacity:deleting?.6:1}}>
                {deleting?'Deleting…':'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDrafter&&(
        <AIDrafter documentType={doc?.type??'document'}
          onDraftComplete={(html:string)=>{
            const stripped=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
            const page=pg('#ffffff',[{type:'textbox',left:60,top:60,width:cWRef.current-120,text:stripped,fontSize:16,fontFamily:'Jost',fill:'#0f172a',selectable:true,editable:true}])
            const updated=[...pagesRef.current,page];pagesRef.current=updated;setPages(updated)
            const ni=updated.length-1;setCurrentPage(ni);currentPageRef.current=ni
            fabricRef.current?.loadFromJSON(page,()=>fabricRef.current.renderAll())
            saveCanvas()
          }}
          onClose={()=>setShowDrafter(false)}/>
      )}

      {/* page-actions hover reveal */}
      <style>{`.pthumb:hover .page-actions{opacity:1!important}`}</style>
    </div>
  )
}