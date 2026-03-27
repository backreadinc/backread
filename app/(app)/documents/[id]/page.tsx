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

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bgApp:    '#EEECE9',
  bgPanel:  '#FFFFFF',
  bgCanvas: '#E2DFDC',
  border:   '#E0DDD9',
  borderMd: '#D3D0CB',
  accent:   '#4F46E5',
  accentLt: '#EEF2FF',
  accentMd: '#C7D2FE',
  text:     '#1A1917',
  textMd:   '#6B6965',
  textSm:   '#A09D99',
  green:    '#10B981',
  red:      '#EF4444',
  amber:    '#F59E0B',
}

// ─── Canvas sizes ─────────────────────────────────────────────────────────────
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
  'Jost','Plus Jakarta Sans','DM Sans','Outfit','Syne','Archivo','Manrope',
  'Nunito Sans','IBM Plex Sans','Rubik','Work Sans','Barlow','Lato',
  'Open Sans','Raleway','Montserrat','Oswald','Bebas Neue','Anton','Teko',
  'Playfair Display','Cormorant Garamond','Libre Baskerville','Merriweather','EB Garamond',
  'Lora','Crimson Text','Bodoni Moda','Arvo','Zilla Slab',
  'DM Mono','Roboto Mono','IBM Plex Mono','Space Mono','JetBrains Mono','Fira Code',
  'Pacifico','Righteous','Fredoka One','Caveat','Dancing Script','Great Vibes','Satisfy',
  'Poppins','Quicksand','Varela Round','Nunito','Josefin Sans','Karla',
  'Geist','Ubuntu','Cabin','Maven Pro','Space Grotesk',
]

const FONT_PAIRINGS = [
  { label:'Editorial',   heading:'Cormorant Garamond', body:'DM Sans' },
  { label:'Modern',      heading:'Syne',               body:'Manrope' },
  { label:'Tech',        heading:'IBM Plex Mono',      body:'IBM Plex Sans' },
  { label:'Bold',        heading:'Bebas Neue',         body:'Work Sans' },
  { label:'Classic',     heading:'Playfair Display',   body:'Lato' },
  { label:'Startup',     heading:'Plus Jakarta Sans',  body:'Plus Jakarta Sans' },
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
  'photo-1531297484001-80022131f5a1','photo-1519389950473-47ba0277781c',
  'photo-1460925895917-afdab827c52f','photo-1521737604893-d14cc237f11d',
]

const GRADIENT_PRESETS = [
  { label:'Indigo', stops:[{offset:0,color:'#4f46e5'},{offset:1,color:'#7c3aed'}] },
  { label:'Ocean',  stops:[{offset:0,color:'#06b6d4'},{offset:1,color:'#3b82f6'}] },
  { label:'Sunset', stops:[{offset:0,color:'#f59e0b'},{offset:1,color:'#ef4444'}] },
  { label:'Forest', stops:[{offset:0,color:'#10b981'},{offset:1,color:'#059669'}] },
  { label:'Rose',   stops:[{offset:0,color:'#ec4899'},{offset:1,color:'#f43f5e'}] },
  { label:'Night',  stops:[{offset:0,color:'#0f172a'},{offset:1,color:'#1e1b4b'}] },
]

// ─── Fabric JSON helpers ───────────────────────────────────────────────────────
function pg(bg='#ffffff', objects:any[]=[]) { return { version:'5.3.0', objects, background:bg } }
function tx(text:string, o:any={}):any {
  return {
    type:'textbox', left:o.l??60, top:o.t??60, width:o.w??400, text,
    fontSize:o.fs??16, fontFamily:o.ff??'Jost', fill:o.fill??'#0f172a',
    fontWeight:o.fw??'400', lineHeight:o.lh??1.4, textAlign:o.ta??'left',
    opacity:1, selectable:true, editable:true, __zoneId:o.zid??null,
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

// ─── Zone-based layout engine ─────────────────────────────────────────────────
type Zone = {
  id: string
  type: 'text'|'image'|'accent'
  bounds: { x:number; y:number; w:number; h:number }
  priority: number
  style?: { fontSize?:number; fontWeight?:string; textAlign?:string; fill?:string; ff?:string; lh?:number }
  constraints?: { maxLines?:number; minFontSize?:number; maxFontSize?:number }
}

function toAbs(bounds:{x:number;y:number;w:number;h:number}, W:number, H:number) {
  return { left:bounds.x*W, top:bounds.y*H, width:bounds.w*W, height:bounds.h*H }
}

function fitFontSize(text:string, width:number, constraints:{maxFontSize?:number;minFontSize?:number;maxLines?:number}={}) {
  let size = constraints.maxFontSize ?? 48
  const min = constraints.minFontSize ?? 10
  const maxLines = constraints.maxLines ?? 4
  while (size > min) {
    const charsPerLine = Math.floor(width / (size * 0.58))
    if (charsPerLine < 1) { size--; continue }
    const lines = Math.ceil(text.length / charsPerLine)
    if (lines <= maxLines) break
    size--
  }
  return size
}

type ContentBlock = { id:string; type:'text'|'image'; content:any; meta:{ length?:number; importance?:number; isSrc?:string } }

function extractContent(objects:any[]): ContentBlock[] {
  return objects
    .filter((o:any) => o.type === 'textbox' || o.type === 'i-text' || o.type === 'text' || o.type === 'image')
    .map((obj:any, i:number) => {
      if (obj.type === 'image') {
        return { id: obj.__uid ?? `img-${i}`, type:'image' as const, content: obj.src, meta:{ isSrc: obj.src } }
      }
      const importance = (obj.fontSize ?? 16) > 40 ? 3 : (obj.fontSize ?? 16) > 24 ? 2 : 1
      return { id: obj.__uid ?? `txt-${i}`, type:'text' as const, content: obj.text ?? '', meta:{ length: (obj.text??'').length, importance } }
    })
}

function mapContentToZones(blocks:ContentBlock[], zones:Zone[]) {
  const remaining = [...blocks]
  const mapping:{ zone:Zone; block:ContentBlock }[] = []
  const sorted = [...zones].sort((a,b) => a.priority - b.priority)
  for (const zone of sorted) {
    const idx = remaining.findIndex(b => b.type === zone.type || (zone.type === 'text' && b.type === 'text'))
    if (idx !== -1) {
      mapping.push({ zone, block: remaining[idx] })
      remaining.splice(idx, 1)
    }
  }
  return mapping
}

function relayout(objects:any[], newLayout:{ zones:Zone[]; bg?:string }, W:number, H:number) {
  const blocks = extractContent(objects)
  const textBlocks = blocks.filter(b => b.type === 'text').sort((a,b) => (b.meta.importance??1)-(a.meta.importance??1))
  const imageBlocks = blocks.filter(b => b.type === 'image')

  const allBlocks = [...textBlocks, ...imageBlocks]
  const mapping = mapContentToZones(allBlocks, newLayout.zones)

  const newObjects:any[] = []
  for (const { zone, block } of mapping) {
    const pos = toAbs(zone.bounds, W, H)
    if (zone.type === 'text' && block.type === 'text') {
      const fontSize = fitFontSize(block.content, pos.width, zone.constraints)
      newObjects.push(tx(block.content, {
        l: pos.left, t: pos.top, w: pos.width,
        fs: zone.style?.fontSize ?? fontSize,
        fw: zone.style?.fontWeight ?? '400',
        fill: zone.style?.fill ?? '#0f172a',
        ta: zone.style?.textAlign ?? 'left',
        ff: zone.style?.ff ?? 'Jost',
        lh: zone.style?.lh ?? 1.4,
        zid: zone.id,
      }))
    }
  }
  return pg(newLayout.bg ?? '#ffffff', newObjects)
}

// ─── Layout definitions ───────────────────────────────────────────────────────
const LAYOUTS = [
  // ── HERO ──
  {
    id:'full-bleed-dark', label:'Full Bleed Dark', category:'Hero',
    zones:[
      { id:'headline', type:'text', bounds:{x:.07,y:.33,w:.6,h:.22}, priority:1, style:{fontSize:52,fontWeight:'800',fill:'#ffffff',ff:'Jost'}, constraints:{maxLines:2} },
      { id:'body',     type:'text', bounds:{x:.07,y:.62,w:.55,h:.18}, priority:2, style:{fontSize:17,fill:'rgba(255,255,255,.65)'}, constraints:{maxLines:3} },
    ],
    build:(W:number,H:number)=>pg('#070a1a',[
      bx({l:0,t:0,w:W,h:H,fill:'#070a1a'}),
      bx({l:0,t:H-4,w:W,h:4,fill:'#4f46e5'}),
      bx({l:Math.round(W*.07),t:Math.round(H*.34),w:4,h:Math.round(H*.3),fill:'#4f46e5'}),
      tx('Your Headline\nGoes Here',{l:Math.round(W*.07)+20,t:Math.round(H*.35),w:Math.round(W*.6),fs:fs(W,52),fw:'800',fill:'#ffffff',ff:'Jost',lh:1.0}),
      tx('Supporting subtext that adds context and draws the reader in.',{l:Math.round(W*.07)+20,t:Math.round(H*.35)+fs(W,52)*2+18,w:Math.round(W*.55),fs:fs(W,17),fill:'rgba(255,255,255,.6)',lh:1.6}),
    ]),
  },
  {
    id:'centered-light', label:'Centered Light', category:'Hero',
    zones:[
      { id:'label',    type:'text', bounds:{x:.1,y:.2,w:.8,h:.06}, priority:0, style:{fontSize:10,fontWeight:'700',fill:'#4f46e5',ff:'JetBrains Mono',textAlign:'center'}, constraints:{maxLines:1} },
      { id:'headline', type:'text', bounds:{x:.1,y:.27,w:.8,h:.28}, priority:1, style:{fontSize:48,fontWeight:'800',fill:'#0f172a',textAlign:'center',ff:'Jost',lh:1.05}, constraints:{maxLines:3} },
      { id:'body',     type:'text', bounds:{x:.15,y:.6,w:.7,h:.2},  priority:2, style:{fontSize:16,fill:'#64748b',textAlign:'center',lh:1.65}, constraints:{maxLines:3} },
    ],
    build:(W:number,H:number)=>pg('#f8fafc',[
      bx({l:Math.round(W*.5)-32,t:Math.round(H*.2),w:64,h:4,fill:'#4f46e5',rx:2}),
      tx('SUBTITLE · LABEL',{l:Math.round(W*.1),t:Math.round(H*.2)+16,w:Math.round(W*.8),fs:fs(W,10),fw:'700',fill:'#4f46e5',ta:'center',ff:'JetBrains Mono'}),
      tx('Centered Headline\nfor Impact',{l:Math.round(W*.1),t:Math.round(H*.2)+38,w:Math.round(W*.8),fs:fs(W,48),fw:'800',fill:'#0f172a',ta:'center',ff:'Jost',lh:1.05}),
      tx('A supporting line that expands on the headline and gives the reader context.',{l:Math.round(W*.15),t:Math.round(H*.2)+38+fs(W,48)*2+18,w:Math.round(W*.7),fs:fs(W,16),fill:'#64748b',ta:'center',lh:1.65}),
    ]),
  },
  {
    id:'gradient-hero', label:'Gradient Hero', category:'Hero',
    zones:[
      { id:'headline', type:'text', bounds:{x:.06,y:.22,w:.65,h:.3}, priority:1, style:{fontSize:52,fontWeight:'800',fill:'#ffffff',ff:'Jost',lh:1.0}, constraints:{maxLines:3} },
      { id:'body',     type:'text', bounds:{x:.06,y:.58,w:.55,h:.2}, priority:2, style:{fontSize:15,fill:'rgba(255,255,255,.7)',lh:1.65}, constraints:{maxLines:3} },
    ],
    build:(W:number,H:number)=>pg('#4f46e5',[
      bx({l:0,t:0,w:W,h:H,fill:'#4f46e5'}),
      bx({l:Math.round(W*.06),t:Math.round(H*.12),w:60,h:4,fill:'rgba(255,255,255,.5)',rx:2}),
      tx('Bold Gradient\nHero Slide',{l:Math.round(W*.06),t:Math.round(H*.22),w:Math.round(W*.65),fs:fs(W,52),fw:'800',fill:'#ffffff',ff:'Jost',lh:1.0}),
      tx('A bright, energetic layout for product launches, announcements, or key moments.',{l:Math.round(W*.06),t:Math.round(H*.22)+fs(W,52)*2+22,w:Math.round(W*.55),fs:fs(W,15),fill:'rgba(255,255,255,.7)',lh:1.65}),
    ]),
  },

  // ── SPLIT ──
  {
    id:'split-image-right', label:'Split Right', category:'Split',
    zones:[
      { id:'headline', type:'text', bounds:{x:.04,y:.25,w:.44,h:.3}, priority:1, style:{fontSize:44,fontWeight:'800',fill:'#0f172a',ff:'Jost',lh:1.05}, constraints:{maxLines:3} },
      { id:'body',     type:'text', bounds:{x:.04,y:.62,w:.44,h:.25}, priority:2, style:{fontSize:15,fill:'#475569',lh:1.7}, constraints:{maxLines:4} },
    ],
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      bx({l:Math.round(W*.54),t:0,w:Math.round(W*.46),h:H,fill:'#e0e7ff'}),
      tx('Section\nHeading',{l:40,t:Math.round(H*.25),w:Math.round(W*.46),fs:fs(W,44),fw:'800',fill:'#0f172a',ff:'Jost',lh:1.05}),
      tx('Describe what this section is about and why it matters to the reader.',{l:40,t:Math.round(H*.25)+fs(W,44)*2+20,w:Math.round(W*.44),fs:fs(W,15),fill:'#475569',lh:1.7}),
    ]),
  },
  {
    id:'split-image-left', label:'Split Left', category:'Split',
    zones:[
      { id:'headline', type:'text', bounds:{x:.54,y:.25,w:.42,h:.3}, priority:1, style:{fontSize:40,fontWeight:'800',fill:'#0f172a',ff:'Jost',lh:1.05}, constraints:{maxLines:3} },
      { id:'body',     type:'text', bounds:{x:.54,y:.62,w:.42,h:.25}, priority:2, style:{fontSize:15,fill:'#475569',lh:1.7}, constraints:{maxLines:4} },
    ],
    build:(W:number,H:number)=>pg('#f8fafc',[
      bx({l:0,t:0,w:Math.round(W*.48),h:H,fill:'#0f172a'}),
      bx({l:W-4,t:0,w:4,h:H,fill:'#10b981'}),
      tx('Right Side\nHeadline',{l:Math.round(W*.55),t:Math.round(H*.25),w:Math.round(W*.4),fs:fs(W,40),fw:'800',fill:'#0f172a',ff:'Jost',lh:1.05}),
      tx('A split layout with image on the left and content on the right.',{l:Math.round(W*.55),t:Math.round(H*.25)+fs(W,40)*2+18,w:Math.round(W*.4),fs:fs(W,15),fill:'#64748b',lh:1.65}),
    ]),
  },

  // ── EDITORIAL ──
  {
    id:'quote-dark', label:'Pull Quote', category:'Editorial',
    zones:[
      { id:'quote', type:'text', bounds:{x:.07,y:.32,w:.78,h:.38}, priority:1, style:{fontSize:32,fontWeight:'600',fill:'#ffffff',ff:'Jost',lh:1.25}, constraints:{maxLines:4} },
      { id:'attr',  type:'text', bounds:{x:.07,y:.76,w:.6,h:.1},   priority:2, style:{fontSize:13,fill:'rgba(255,255,255,.4)'}, constraints:{maxLines:1} },
    ],
    build:(W:number,H:number)=>pg('#0f172a',[
      tx('"',{l:Math.round(W*.07),t:Math.round(H*.05),w:100,fs:fs(W,140),fw:'800',fill:'#4f46e5',ff:'Jost',lh:1}),
      tx('The best designs solve real problems elegantly, not just look good.',{l:Math.round(W*.07),t:Math.round(H*.32),w:Math.round(W*.78),fs:fs(W,32),fw:'600',fill:'#ffffff',ff:'Jost',lh:1.25}),
      bx({l:Math.round(W*.07),t:Math.round(H*.32)+fs(W,32)*3+28,w:40,h:3,fill:'#4f46e5',rx:2}),
      tx('— Author Name, Title at Company',{l:Math.round(W*.07),t:Math.round(H*.32)+fs(W,32)*3+48,w:Math.round(W*.6),fs:fs(W,13),fill:'rgba(255,255,255,.4)'}),
    ]),
  },
  {
    id:'cover-editorial', label:'Editorial Cover', category:'Editorial',
    zones:[
      { id:'issue',    type:'text', bounds:{x:.07,y:.08,w:.4,h:.07},  priority:0, style:{fontSize:10,fontWeight:'700',fill:'#4f46e5',ff:'JetBrains Mono'}, constraints:{maxLines:1} },
      { id:'headline', type:'text', bounds:{x:.07,y:.16,w:.55,h:.42}, priority:1, style:{fontSize:68,fontWeight:'900',fill:'#0f172a',ff:'Cormorant Garamond',lh:.95}, constraints:{maxLines:4} },
      { id:'body',     type:'text', bounds:{x:.07,y:.65,w:.5,h:.2},   priority:2, style:{fontSize:14,fill:'#64748b',lh:1.7}, constraints:{maxLines:4} },
    ],
    build:(W:number,H:number)=>pg('#FAFAF8',[
      bx({l:0,t:0,w:W,h:6,fill:'#0f172a'}),
      tx('VOL. 01 · ISSUE 04 · 2025',{l:Math.round(W*.07),t:26,w:Math.round(W*.5),fs:fs(W,10),fw:'600',fill:'#4f46e5',ff:'JetBrains Mono'}),
      tx('The Future\nof Design',{l:Math.round(W*.07),t:Math.round(H*.16),w:Math.round(W*.55),fs:fs(W,68),fw:'900',fill:'#0f172a',ff:'Cormorant Garamond',lh:.95}),
      bx({l:Math.round(W*.07),t:Math.round(H*.65)-10,w:Math.round(W*.25),h:2,fill:'#0f172a'}),
      tx('A deep dive into visual systems that shape how the world works, thinks, and creates.',{l:Math.round(W*.07),t:Math.round(H*.65)+6,w:Math.round(W*.5),fs:fs(W,14),fill:'#475569',lh:1.7}),
    ]),
  },

  // ── MINIMAL ──
  {
    id:'dark-minimal', label:'Dark Minimal', category:'Minimal',
    zones:[
      { id:'headline', type:'text', bounds:{x:.07,y:.2,w:.86,h:.3}, priority:1, style:{fontSize:72,fontWeight:'800',fill:'#ffffff',ff:'Jost'}, constraints:{maxLines:2} },
      { id:'body',     type:'text', bounds:{x:.07,y:.56,w:.6,h:.2}, priority:2, style:{fontSize:18,fill:'rgba(255,255,255,.4)'}, constraints:{maxLines:3} },
    ],
    build:(W:number,H:number)=>pg('#0a0a0f',[
      bx({l:Math.round(W*.07),t:Math.round(H*.42),w:Math.round(W*.86),h:1,fill:'rgba(255,255,255,.12)'}),
      tx('Minimal.',{l:Math.round(W*.07),t:Math.round(H*.2),w:W-100,fs:fs(W,72),fw:'800',fill:'#ffffff',ff:'Jost'}),
      tx('Sometimes less is everything.',{l:Math.round(W*.07),t:Math.round(H*.2)+fs(W,72)+16,w:Math.round(W*.6),fs:fs(W,18),fill:'rgba(255,255,255,.4)'}),
    ]),
  },
  {
    id:'light-minimal', label:'Light Minimal', category:'Minimal',
    zones:[
      { id:'headline', type:'text', bounds:{x:.1,y:.3,w:.8,h:.3}, priority:1, style:{fontSize:60,fontWeight:'300',fill:'#0f172a',ff:'Cormorant Garamond',textAlign:'center',lh:1.0}, constraints:{maxLines:2} },
      { id:'body',     type:'text', bounds:{x:.2,y:.66,w:.6,h:.2}, priority:2, style:{fontSize:14,fill:'#94a3b8',textAlign:'center',lh:1.7}, constraints:{maxLines:3} },
    ],
    build:(W:number,H:number)=>pg('#FAFAF8',[
      tx('Elegant\n& Simple',{l:Math.round(W*.1),t:Math.round(H*.3),w:Math.round(W*.8),fs:fs(W,60),fw:'300',fill:'#0f172a',ff:'Cormorant Garamond',ta:'center',lh:1.0}),
      bx({l:Math.round(W*.5)-24,t:Math.round(H*.65)-8,w:48,h:2,fill:'#cbd5e1',rx:1}),
      tx('Restraint is a design decision, not a limitation.',{l:Math.round(W*.2),t:Math.round(H*.65)+6,w:Math.round(W*.6),fs:fs(W,14),fill:'#94a3b8',ta:'center',lh:1.7}),
    ]),
  },

  // ── CONTENT ──
  {
    id:'three-cols', label:'3 Columns', category:'Feature',
    zones:[
      { id:'title', type:'text', bounds:{x:.04,y:.06,w:.8,h:.12}, priority:1, style:{fontSize:28,fontWeight:'700',fill:'#0f172a'}, constraints:{maxLines:1} },
    ],
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:'#4f46e5'}),
      tx('Three Column Layout',{l:50,t:44,w:W-100,fs:fs(W,28),fw:'700',fill:'#0f172a'}),
      bx({l:50,t:44+fs(W,28)+12,w:W-100,h:1,fill:'#e2e8f0'}),
      ...([['Feature One','#4f46e5'],['Feature Two','#10b981'],['Feature Three','#f59e0b']] as [string,string][]).flatMap(([title,col],i:number)=>{
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
    id:'two-cols', label:'Two Columns', category:'Content',
    zones:[
      { id:'headline', type:'text', bounds:{x:.05,y:.1,w:.9,h:.15}, priority:1, style:{fontSize:32,fontWeight:'700',fill:'#0f172a'}, constraints:{maxLines:1} },
      { id:'col1',     type:'text', bounds:{x:.05,y:.3,w:.43,h:.55}, priority:2, style:{fontSize:14,fill:'#374151',lh:1.75}, constraints:{maxLines:12} },
      { id:'col2',     type:'text', bounds:{x:.52,y:.3,w:.43,h:.55}, priority:3, style:{fontSize:14,fill:'#374151',lh:1.75}, constraints:{maxLines:12} },
    ],
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:'#0f172a'}),
      tx('Two Column Article',{l:50,t:44,w:W-100,fs:fs(W,32),fw:'700',fill:'#0f172a'}),
      bx({l:50,t:44+fs(W,32)+12,w:W-100,h:1,fill:'#e2e8f0'}),
      bx({l:Math.round(W*.5)-1,t:Math.round(H*.28),w:1,h:Math.round(H*.62),fill:'#e2e8f0'}),
      tx('Start writing your content here. This column layout works well for long-form articles and detailed explanations that benefit from a magazine-style format.',{l:50,t:Math.round(H*.28)+14,w:Math.round(W*.43),fs:fs(W,14),fill:'#374151',lh:1.75}),
      tx('The second column continues the narrative. You can use this space to elaborate on points, add supporting evidence, or contrast ideas effectively.',{l:Math.round(W*.52),t:Math.round(H*.28)+14,w:Math.round(W*.43),fs:fs(W,14),fill:'#374151',lh:1.75}),
    ]),
  },
  {
    id:'agenda', label:'Agenda / List', category:'Content',
    zones:[
      { id:'title', type:'text', bounds:{x:.06,y:.08,w:.7,h:.14}, priority:1, style:{fontSize:36,fontWeight:'800',fill:'#0f172a'}, constraints:{maxLines:1} },
    ],
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:'#6366f1'}),
      tx('Today\'s Agenda',{l:Math.round(W*.06),t:40,w:Math.round(W*.7),fs:fs(W,36),fw:'800',fill:'#0f172a',ff:'Jost'}),
      ...[['01','Opening & Welcome','10 min'],['02','Product Deep Dive','25 min'],['03','Live Demo','15 min'],['04','Q&A Session','15 min'],['05','Next Steps','5 min']].flatMap(([num,item,time],i)=>{
        const y = Math.round(H*.22)+i*Math.round(H*.13)
        return [
          bx({l:Math.round(W*.06),t:y,w:Math.round(W*.88),h:Math.round(H*.11),fill:i%2===0?'#f8fafc':'#ffffff',rx:10}),
          tx(num,{l:Math.round(W*.06)+18,t:y+Math.round(H*.03),w:30,fs:fs(W,13),fw:'700',fill:'#6366f1',ff:'JetBrains Mono'}),
          tx(item,{l:Math.round(W*.06)+64,t:y+Math.round(H*.03),w:Math.round(W*.6),fs:fs(W,15),fw:'600',fill:'#0f172a'}),
          tx(time,{l:Math.round(W*.06)+Math.round(W*.7),t:y+Math.round(H*.03),w:120,fs:fs(W,12),fill:'#94a3b8',ff:'JetBrains Mono',ta:'right'}),
        ]
      }),
    ]),
  },

  // ── METRICS ──
  {
    id:'metrics', label:'Data Metrics', category:'Metrics',
    zones:[
      { id:'title', type:'text', bounds:{x:.04,y:.06,w:.8,h:.12}, priority:1, style:{fontSize:30,fontWeight:'700',fill:'#0f172a'}, constraints:{maxLines:1} },
    ],
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:'#10b981'}),
      tx('Key Metrics',{l:50,t:48,w:W-100,fs:fs(W,30),fw:'700',fill:'#0f172a'}),
      ...(['$0M','ARR','#ecfdf5','#10b981'] as any[]).slice(0,0),
      ...([['$0M','ARR','#ecfdf5','#10b981'],['0K','Users','#eff6ff','#4f46e5'],['0%','Growth','#fff7ed','#f59e0b'],['0','NPS','#fdf4ff','#8b5cf6']] as [string,string,string,string][]).flatMap(([val,lbl,bg,col],i:number)=>{
        const cw=Math.round((W-160)/4), cx=50+i*(cw+13)
        return [
          bx({l:cx,t:Math.round(H*.38),w:cw,h:Math.round(H*.38),fill:bg,rx:14}),
          tx(val,{l:cx+16,t:Math.round(H*.38)+18,w:cw-32,fs:fs(W,38),fw:'700',fill:col,ff:'Jost'}),
          tx(lbl,{l:cx+16,t:Math.round(H*.38)+18+fs(W,38)+8,w:cw-32,fs:10,fill:'#94a3b8',ff:'JetBrains Mono'}),
        ]
      }),
    ]),
  },
  {
    id:'kpi-dark', label:'KPI Dark', category:'Metrics',
    zones:[
      { id:'title', type:'text', bounds:{x:.05,y:.06,w:.8,h:.12}, priority:1, style:{fontSize:26,fontWeight:'700',fill:'#ffffff',ff:'Jost'}, constraints:{maxLines:1} },
    ],
    build:(W:number,H:number)=>pg('#090c14',[
      bx({l:0,t:0,w:W,h:H,fill:'#090c14'}),
      tx('Performance Overview',{l:Math.round(W*.05),t:40,w:Math.round(W*.7),fs:fs(W,26),fw:'700',fill:'#ffffff',ff:'Jost'}),
      tx(new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'}),{l:Math.round(W*.78),t:44,w:Math.round(W*.17),fs:fs(W,11),fill:'rgba(255,255,255,.35)',ff:'JetBrains Mono',ta:'right'}),
      ...([['↑ 47%','Revenue','+$2.4M','#10b981'],['↑ 23K','Users','Active','#6366f1'],['94%','Retention','Score','#f59e0b'],['4.8★','Rating','App Store','#ec4899']] as [string,string,string,string][]).flatMap(([val,lbl,sub,col],i)=>{
        const cw=Math.round((W-120)/4), cx=50+i*(cw+13)
        return [
          bx({l:cx,t:Math.round(H*.28),w:cw,h:Math.round(H*.55),fill:'rgba(255,255,255,.04)',rx:12}),
          bx({l:cx,t:Math.round(H*.28),w:cw,h:3,fill:col,rx:2}),
          tx(val,{l:cx+16,t:Math.round(H*.28)+24,w:cw-32,fs:fs(W,34),fw:'800',fill:col,ff:'Jost'}),
          tx(lbl,{l:cx+16,t:Math.round(H*.28)+24+fs(W,34)+8,w:cw-32,fs:fs(W,14),fw:'600',fill:'rgba(255,255,255,.75)'}),
          tx(sub,{l:cx+16,t:Math.round(H*.28)+24+fs(W,34)+8+fs(W,14)+4,w:cw-32,fs:9,fill:'rgba(255,255,255,.3)',ff:'JetBrains Mono'}),
        ]
      }),
    ]),
  },

  // ── SOCIAL PROOF ──
  {
    id:'testimonial', label:'Testimonial', category:'Social Proof',
    zones:[
      { id:'quote', type:'text', bounds:{x:.08,y:.28,w:.84,h:.38}, priority:1, style:{fontSize:26,fontWeight:'500',fill:'#0f172a',ff:'Cormorant Garamond',lh:1.35,textAlign:'center'}, constraints:{maxLines:4} },
      { id:'attr',  type:'text', bounds:{x:.08,y:.72,w:.84,h:.1},  priority:2, style:{fontSize:13,fill:'#64748b',textAlign:'center'}, constraints:{maxLines:1} },
    ],
    build:(W:number,H:number)=>pg('#fafafa',[
      bx({l:Math.round(W*.5)-40,t:Math.round(H*.2),w:80,h:2,fill:'#4f46e5',rx:1}),
      tx('"Working with this team transformed our business in ways we never imagined possible."',{l:Math.round(W*.08),t:Math.round(H*.28),w:Math.round(W*.84),fs:fs(W,26),fw:'500',fill:'#0f172a',ff:'Cormorant Garamond',ta:'center',lh:1.35}),
      bx({l:Math.round(W*.5)-20,t:Math.round(H*.7),w:40,h:40,fill:'#e2e8f0',rx:20}),
      tx('Sarah Chen · Head of Product, Acme Corp',{l:Math.round(W*.08),t:Math.round(H*.7)+52,w:Math.round(W*.84),fs:fs(W,13),fill:'#64748b',ta:'center'}),
    ]),
  },

  // ── ANNOUNCEMENTS ──
  {
    id:'announcement', label:'Announcement', category:'Announce',
    zones:[
      { id:'badge',    type:'text', bounds:{x:.5-.15,y:.18,w:.3,h:.07}, priority:0, style:{fontSize:10,fontWeight:'700',fill:'#4f46e5',textAlign:'center',ff:'JetBrains Mono'}, constraints:{maxLines:1} },
      { id:'headline', type:'text', bounds:{x:.08,y:.28,w:.84,h:.3},    priority:1, style:{fontSize:52,fontWeight:'900',fill:'#0f172a',textAlign:'center',ff:'Jost',lh:1.0}, constraints:{maxLines:2} },
      { id:'body',     type:'text', bounds:{x:.15,y:.65,w:.7,h:.2},     priority:2, style:{fontSize:16,fill:'#64748b',textAlign:'center',lh:1.65}, constraints:{maxLines:3} },
    ],
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:Math.round(W*.37),t:Math.round(H*.18),w:Math.round(W*.26),h:Math.round(H*.08),fill:'#eef2ff',rx:99}),
      tx('🚀  NEW RELEASE',{l:Math.round(W*.37),t:Math.round(H*.18)+4,w:Math.round(W*.26),fs:fs(W,10),fw:'700',fill:'#4f46e5',ta:'center',ff:'JetBrains Mono'}),
      tx('Introducing\nVersion 3.0',{l:Math.round(W*.08),t:Math.round(H*.3),w:Math.round(W*.84),fs:fs(W,54),fw:'900',fill:'#0f172a',ta:'center',ff:'Jost',lh:1.0}),
      tx('Everything you love, rebuilt from the ground up. Faster, smarter, and more powerful than ever.',{l:Math.round(W*.15),t:Math.round(H*.67),w:Math.round(W*.7),fs:fs(W,16),fill:'#64748b',ta:'center',lh:1.65}),
    ]),
  },

  // ── TIMELINE ──
  {
    id:'timeline', label:'Timeline', category:'Timeline',
    zones:[
      { id:'title', type:'text', bounds:{x:.05,y:.06,w:.8,h:.12}, priority:1, style:{fontSize:30,fontWeight:'800',fill:'#0f172a'}, constraints:{maxLines:1} },
    ],
    build:(W:number,H:number)=>pg('#fafafa',[
      tx('Our Journey',{l:Math.round(W*.05),t:44,w:Math.round(W*.7),fs:fs(W,32),fw:'800',fill:'#0f172a',ff:'Jost'}),
      bx({l:Math.round(W*.5),t:Math.round(H*.24),w:2,h:Math.round(H*.65),fill:'#e2e8f0'}),
      ...(['2021','2022','2023','2024','2025'] as string[]).flatMap((year,i)=>{
        const y = Math.round(H*.24)+i*Math.round(H*.135)
        const isLeft = i%2===0
        const cx = Math.round(W*.5)
        return [
          bx({l:cx-6,t:y+2,w:12,h:12,fill:'#4f46e5',rx:6}),
          bx({l:isLeft?cx-Math.round(W*.42):cx+16,t:y-6,w:Math.round(W*.38),h:Math.round(H*.1),fill:'#ffffff',rx:10}),
          tx(year,{l:isLeft?cx-Math.round(W*.42)+14:cx+30,t:y+2,w:50,fs:fs(W,11),fw:'700',fill:'#4f46e5',ff:'JetBrains Mono'}),
          tx('Key milestone description for this year goes here.',{l:isLeft?cx-Math.round(W*.42)+14:cx+30,t:y+2+fs(W,11)+4,w:Math.round(W*.32),fs:fs(W,12),fill:'#475569',lh:1.5}),
        ]
      }),
    ]),
  },

  // ── CLOSING ──
  {
    id:'thank-you', label:'Thank You', category:'Closing',
    zones:[
      { id:'main',    type:'text', bounds:{x:.1,y:.28,w:.8,h:.28}, priority:1, style:{fontSize:72,fontWeight:'900',fill:'#0f172a',textAlign:'center',ff:'Jost',lh:1.0}, constraints:{maxLines:2} },
      { id:'contact', type:'text', bounds:{x:.15,y:.64,w:.7,h:.15}, priority:2, style:{fontSize:15,fill:'#64748b',textAlign:'center',lh:1.65}, constraints:{maxLines:2} },
    ],
    build:(W:number,H:number)=>pg('#ffffff',[
      bx({l:0,t:H-5,w:W,h:5,fill:'#4f46e5'}),
      tx('Thank\nYou.',{l:Math.round(W*.1),t:Math.round(H*.28),w:Math.round(W*.8),fs:fs(W,72),fw:'900',fill:'#0f172a',ta:'center',ff:'Jost',lh:1.0}),
      bx({l:Math.round(W*.5)-30,t:Math.round(H*.63),w:60,h:3,fill:'#4f46e5',rx:2}),
      tx('hello@yourcompany.com · yourwebsite.com',{l:Math.round(W*.15),t:Math.round(H*.63)+18,w:Math.round(W*.7),fs:fs(W,15),fill:'#64748b',ta:'center'}),
    ]),
  },
  {
    id:'chapter-break', label:'Section Break', category:'Closing',
    zones:[
      { id:'label',    type:'text', bounds:{x:.07,y:.36,w:.5,h:.1},  priority:0, style:{fontSize:11,fontWeight:'700',fill:'rgba(255,255,255,.35)',ff:'JetBrains Mono'}, constraints:{maxLines:1} },
      { id:'headline', type:'text', bounds:{x:.07,y:.48,w:.7,h:.3},  priority:1, style:{fontSize:60,fontWeight:'800',fill:'#ffffff',ff:'Jost',lh:1.0}, constraints:{maxLines:2} },
    ],
    build:(W:number,H:number)=>pg('#1e1b4b',[
      bx({l:0,t:0,w:W,h:H,fill:'#1e1b4b'}),
      bx({l:Math.round(W*.07),t:Math.round(H*.36)-2,w:Math.round(W*.15),h:2,fill:'rgba(255,255,255,.25)'}),
      tx('SECTION 02',{l:Math.round(W*.07)+Math.round(W*.17),t:Math.round(H*.36)-2,w:200,fs:fs(W,11),fw:'700',fill:'rgba(255,255,255,.3)',ff:'JetBrains Mono'}),
      tx('Deep\nDive',{l:Math.round(W*.07),t:Math.round(H*.48),w:Math.round(W*.7),fs:fs(W,60),fw:'800',fill:'#ffffff',ff:'Jost',lh:1.0}),
    ]),
  },
]

const LAYOUT_CATS = ['All','Hero','Split','Editorial','Minimal','Feature','Content','Metrics','Social Proof','Timeline','Announce','Closing']

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ documentId, links, onClose, onRefresh, isActive, onPublish }:{
  documentId:string; links:ShareLink[]; onClose:()=>void; onRefresh:()=>void; isActive:boolean; onPublish:()=>void
}){
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
    const{error}=await supabase.from('share_links').insert({document_id:documentId,token,label:label||'Share link',require_email:requireEmail,allow_download:allowDownload,password:password||null,is_active:true})
    if(!error){await onRefresh();setShowNew(false);setLabel('');setPassword('');setRequireEmail(false);setAllowDownload(false)}
    setCreating(false)
  }
  function copyLink(token:string){navigator.clipboard.writeText(buildShareUrl(token));setCopied(token);setTimeout(()=>setCopied(null),2500)}
  async function toggleLink(id:string,active:boolean){await supabase.from('share_links').update({is_active:active}).eq('id',id);onRefresh()}
  async function deleteLink(id:string){await supabase.from('share_links').delete().eq('id',id);onRefresh()}

  const ps:React.CSSProperties={fontFamily:"'Plus Jakarta Sans',sans-serif"}
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'flex-end',backdropFilter:'blur(4px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{width:440,height:'100vh',background:'#fff',borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',boxShadow:'-20px 0 60px rgba(0,0,0,.12)'}}>
        <div style={{padding:'22px 24px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <h2 style={{...ps,margin:'0 0 3px',fontSize:17,fontWeight:700,color:T.text,letterSpacing:'-.01em'}}>Share & Track</h2>
            <p style={{...ps,margin:0,fontSize:12,color:T.textSm}}>{links.length} link{links.length!==1?'s':''} · {links.reduce((a,l)=>a+(l.view_count||0),0)} total views</p>
          </div>
          <button onClick={onClose} style={{background:T.bgApp,border:'none',cursor:'pointer',color:T.textMd,padding:8,borderRadius:8,display:'flex',alignItems:'center'}}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 3l7 7M10 3L3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        {!isActive&&(
          <div style={{margin:'16px 20px',padding:'14px 16px',background:'#fffbeb',border:`1px solid #fde68a`,borderRadius:10}}>
            <div style={{...ps,fontSize:12,fontWeight:700,color:'#92400e',marginBottom:4}}>Document not published</div>
            <div style={{...ps,fontSize:11,color:'#a16207',marginBottom:10}}>Publish first to enable link sharing.</div>
            <button onClick={onPublish} style={{...ps,padding:'5px 12px',borderRadius:7,background:'#f59e0b',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>Publish now</button>
          </div>
        )}
        <div style={{flex:1,overflow:'auto',padding:'16px 20px'}}>
          {links.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{...ps,fontSize:9,fontWeight:700,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Active links</div>
              {links.map(link=>(
                <div key={link.id} style={{border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px',marginBottom:8,background:T.bgApp}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{...ps,flex:1,fontSize:13,fontWeight:600,color:T.text}}>{link.label??'Share link'}</span>
                    <span style={{padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700,background:link.is_active?'#ecfdf5':'#f1f5f9',color:link.is_active?T.green:T.textSm,border:`1px solid ${link.is_active?'#a7f3d0':'#e2e8f0'}`}}>{link.is_active?'LIVE':'OFF'}</span>
                  </div>
                  <div style={{display:'flex',gap:6,marginBottom:10}}>
                    <code style={{...ps,flex:1,fontSize:10,color:T.textMd,background:'#fff',padding:'5px 9px',borderRadius:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',border:`1px solid ${T.border}`,fontFamily:"'JetBrains Mono',monospace"}}>{buildShareUrl(link.token)}</code>
                    <button onClick={()=>copyLink(link.token)} style={{...ps,padding:'5px 11px',background:copied===link.token?'#ecfdf5':'#f8fafc',border:`1px solid ${copied===link.token?'#a7f3d0':T.border}`,borderRadius:7,fontSize:11,cursor:'pointer',color:copied===link.token?T.green:T.textMd,fontWeight:600,whiteSpace:'nowrap'}}>
                      {copied===link.token?'Copied ✓':'Copy'}
                    </button>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{...ps,fontSize:11,color:T.textSm}}>{link.view_count??0} views</span>
                    <button onClick={()=>toggleLink(link.id,!link.is_active)} style={{...ps,fontSize:11,color:T.accent,background:'none',border:'none',cursor:'pointer',fontWeight:600}}>{link.is_active?'Disable':'Enable'}</button>
                    <button onClick={()=>deleteLink(link.id)} style={{...ps,fontSize:11,color:T.red,background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showNew?(
            <div style={{border:`1px solid ${T.border}`,borderRadius:12,padding:'16px',background:T.bgApp}}>
              <div style={{...ps,fontSize:11,fontWeight:700,color:T.text,marginBottom:12}}>New share link</div>
              <div style={{marginBottom:10}}>
                <div style={{...ps,fontSize:10,color:T.textMd,marginBottom:5}}>Label</div>
                <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Client Review"
                  style={{...ps,width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.text,background:'#fff',outline:'none'}}/>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{...ps,fontSize:10,color:T.textMd,marginBottom:5}}>Password (optional)</div>
                <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Leave blank for no password"
                  style={{...ps,width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.text,background:'#fff',outline:'none'}}/>
              </div>
              <div style={{display:'flex',gap:16,marginBottom:14}}>
                <label style={{...ps,display:'flex',alignItems:'center',gap:6,fontSize:12,color:T.textMd,cursor:'pointer'}}>
                  <input type="checkbox" checked={requireEmail} onChange={e=>setRequireEmail(e.target.checked)} style={{accentColor:T.accent}}/> Require email
                </label>
                <label style={{...ps,display:'flex',alignItems:'center',gap:6,fontSize:12,color:T.textMd,cursor:'pointer'}}>
                  <input type="checkbox" checked={allowDownload} onChange={e=>setAllowDownload(e.target.checked)} style={{accentColor:T.accent}}/> Allow download
                </label>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setShowNew(false)} style={{...ps,flex:1,padding:'8px',border:`1px solid ${T.border}`,borderRadius:8,background:'#fff',fontSize:12,cursor:'pointer',fontWeight:500,color:T.textMd}}>Cancel</button>
                <button onClick={createLink} disabled={creating} style={{...ps,flex:1,padding:'8px',border:'none',borderRadius:8,background:T.accent,color:'#fff',fontSize:12,cursor:'pointer',fontWeight:700,opacity:creating?.6:1}}>
                  {creating?'Creating…':'Create link'}
                </button>
              </div>
            </div>
          ):(
            <button onClick={()=>setShowNew(true)} style={{...ps,width:'100%',padding:'10px',border:`1px dashed ${T.borderMd}`,borderRadius:10,background:'transparent',cursor:'pointer',fontSize:12,color:T.textMd,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1.5 5.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              New share link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Right Panel Components ───────────────────────────────────────────────────
function LSection({label,children}:{label:string;children:React.ReactNode}){
  const [open,setOpen]=useState(true)
  return(
    <div style={{borderBottom:`1px solid ${T.border}`,padding:'10px 14px 12px'}}>
      <button onClick={()=>setOpen(!open)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',border:'none',background:'none',cursor:'pointer',padding:'0 0 7px'}}>
        <span style={{fontSize:9,fontWeight:800,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{transform:open?'rotate(0)':'rotate(-90deg)',transition:'transform .15s'}}><path d="M1 1l4 4 4-4" stroke={T.textSm} strokeWidth="1.4" strokeLinecap="round"/></svg>
      </button>
      {open&&children}
    </div>
  )
}
function LNum({label,value,onChange,step=1}:{label:string;value:number;onChange:(v:number)=>void;step?:number}){
  return(
    <div>
      <div style={{fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{label}</div>
      <input type="number" value={value} step={step} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{width:'100%',padding:'6px 9px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.text,background:'#fff',outline:'none',transition:'border-color .15s'}}
        onFocus={e=>{e.target.style.borderColor=T.accent}}
        onBlur={e=>{e.target.style.borderColor=T.border}}/>
    </div>
  )
}
function LSlider({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void}){
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{label}</span>
        <span style={{fontSize:10,color:T.textMd,fontFamily:"'JetBrains Mono',monospace"}}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(parseFloat(e.target.value))}
        style={{width:'100%',accentColor:T.accent,height:4,cursor:'pointer'}}/>
    </div>
  )
}
function LBtn(active:boolean):React.CSSProperties{
  return{padding:'5px 10px',fontSize:11,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",border:`1px solid ${active?T.accent:T.border}`,borderRadius:7,background:active?T.accentLt:'#fff',color:active?T.accent:T.textMd,cursor:'pointer',transition:'all .12s'}
}

function ImageFiltersPanel({obj,onChange}:{obj:any;onChange:(p:string,v:any)=>void}){
  const [brightness,setBrightness]=useState(0)
  const [contrast,setContrast]=useState(0)
  const [saturation,setSaturation]=useState(0)
  const [blur,setBlur]=useState(0)
  const [grayscale,setGrayscale]=useState(false)
  const [sepia,setSepia]=useState(false)

  function applyFilters(b=brightness,c=contrast,s=saturation,bl=blur,g=grayscale,se=sepia){
    if(!obj?.filters)return
    const fab=(window as any).fabric
    if(!fab)return
    const filters=[]
    if(b!==0)filters.push(new fab.Image.filters.Brightness({brightness:b/100}))
    if(c!==0)filters.push(new fab.Image.filters.Contrast({contrast:c/100}))
    if(s!==0)filters.push(new fab.Image.filters.Saturation({saturation:s/100}))
    if(bl>0)filters.push(new fab.Image.filters.Blur({blur:bl/100}))
    if(g)filters.push(new fab.Image.filters.Grayscale())
    if(se)filters.push(new fab.Image.filters.Sepia())
    obj.filters=filters;obj.applyFilters()
    const fc=(window as any).__fabricCanvas;if(fc)fc.renderAll()
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <LSlider label="Brightness" value={brightness} min={-100} max={100} onChange={v=>{setBrightness(v);applyFilters(v)}}/>
      <LSlider label="Contrast" value={contrast} min={-100} max={100} onChange={v=>{setContrast(v);applyFilters(brightness,v)}}/>
      <LSlider label="Saturation" value={saturation} min={-100} max={100} onChange={v=>{setSaturation(v);applyFilters(brightness,contrast,v)}}/>
      <LSlider label="Blur" value={blur} min={0} max={100} onChange={v=>{setBlur(v);applyFilters(brightness,contrast,saturation,v)}}/>
      <div style={{display:'flex',gap:5}}>
        <button onClick={()=>{setGrayscale(!grayscale);applyFilters(brightness,contrast,saturation,blur,!grayscale,sepia)}} style={LBtn(grayscale)}>Grayscale</button>
        <button onClick={()=>{setSepia(!sepia);applyFilters(brightness,contrast,saturation,blur,grayscale,!sepia)}} style={LBtn(sepia)}>Sepia</button>
      </div>
      <button onClick={()=>{setBrightness(0);setContrast(0);setSaturation(0);setBlur(0);setGrayscale(false);setSepia(false);applyFilters(0,0,0,0,false,false)}}
        style={{fontSize:11,color:T.red,background:'none',border:'none',cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,textAlign:'left',padding:0}}>Reset filters</button>
    </div>
  )
}

// ─── Layers Panel ─────────────────────────────────────────────────────────────
function LayersPanel({fabric,onSelect}:{fabric:any;onSelect:(obj:any)=>void}){
  const [objs,setObjs]=useState<any[]>([])
  useEffect(()=>{
    if(!fabric)return
    const refresh=()=>setObjs(fabric.getObjects().slice().reverse())
    fabric.on('object:added',refresh);fabric.on('object:removed',refresh);fabric.on('object:modified',refresh)
    fabric.on('selection:created',refresh);fabric.on('selection:cleared',refresh);fabric.on('selection:updated',refresh)
    refresh()
    return()=>{fabric.off('object:added',refresh);fabric.off('object:removed',refresh);fabric.off('object:modified',refresh);fabric.off('selection:created',refresh);fabric.off('selection:cleared',refresh);fabric.off('selection:updated',refresh)}
  },[fabric])
  function getIcon(obj:any){
    if(obj.type==='textbox'||obj.type==='i-text'||obj.type==='text')return<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M6 3v6M3.5 9h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
    if(obj.type==='image')return<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="3.5" cy="4.5" r=".7" fill="currentColor"/><path d="M1 8l2-2 2 2 2-2 4 3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg>
    if(obj.type==='rect')return<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.1"/></svg>
    if(obj.type==='circle')return<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1"/></svg>
    return<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L6 2l4 8H2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
  }
  function getLabel(obj:any){if(obj.text)return obj.text.slice(0,22)+(obj.text.length>22?'…':'');return obj.type.charAt(0).toUpperCase()+obj.type.slice(1)}
  function selectObj(obj:any){fabric.setActiveObject(obj);fabric.renderAll();onSelect(obj)}
  function toggleVisible(obj:any,e:React.MouseEvent){e.stopPropagation();obj.set('visible',!obj.visible);fabric.renderAll();setObjs([...objs])}
  function toggleLock(obj:any,e:React.MouseEvent){e.stopPropagation();const locked=!obj.lockMovementX;obj.set({lockMovementX:locked,lockMovementY:locked,lockRotation:locked,lockScalingX:locked,lockScalingY:locked,selectable:!locked,evented:!locked});fabric.renderAll();setObjs([...objs])}
  function moveUp(obj:any,e:React.MouseEvent){e.stopPropagation();fabric.bringForward(obj);fabric.renderAll();setObjs(fabric.getObjects().slice().reverse())}
  function moveDown(obj:any,e:React.MouseEvent){e.stopPropagation();fabric.sendBackwards(obj);fabric.renderAll();setObjs(fabric.getObjects().slice().reverse())}
  if(objs.length===0)return<div style={{padding:'32px 16px',color:T.textSm,fontSize:12,textAlign:'center',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>No elements yet</div>
  return(
    <div style={{padding:'6px 8px',display:'flex',flexDirection:'column',gap:1}}>
      {objs.map((obj,i)=>{
        const isActive=fabric.getActiveObject()===obj
        return(
          <div key={i} onClick={()=>selectObj(obj)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:8,cursor:'pointer',background:isActive?T.accentLt:'transparent',border:`1px solid ${isActive?T.accentMd:'transparent'}`,transition:'all .1s'}}>
            <span style={{fontSize:12,width:16,textAlign:'center',flexShrink:0,color:isActive?T.accent:T.textMd}}>{getIcon(obj)}</span>
            <span style={{flex:1,fontSize:11,fontFamily:"'Plus Jakarta Sans',sans-serif",color:isActive?T.accent:T.textMd,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:isActive?600:400}}>{getLabel(obj)}</span>
            <div style={{display:'flex',gap:1,opacity:0}} className="layer-actions" onClick={e=>e.stopPropagation()}>
              <button onClick={e=>toggleVisible(obj,e)} style={{width:20,height:20,border:'none',background:'none',cursor:'pointer',color:obj.visible===false?T.textSm:T.textMd,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {obj.visible===false?<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M3 3A5 5 0 019 9M5 2a5 5 0 015 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>:<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2C3 2 1 5.5 1 5.5S3 9 5.5 9 10 5.5 10 5.5 8 2 5.5 2z" stroke="currentColor" strokeWidth="1.2"/><circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/></svg>}
              </button>
              <button onClick={e=>toggleLock(obj,e)} style={{width:20,height:20,border:'none',background:'none',cursor:'pointer',color:obj.lockMovementX?T.amber:T.textMd,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="10" height="11" viewBox="0 0 10 11" fill="none"><rect x="1.5" y="5" width="7" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M3 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.1"/></svg>
              </button>
              <button onClick={e=>moveUp(obj,e)} style={{width:20,height:20,border:'none',background:'none',cursor:'pointer',color:T.textMd,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
              <button onClick={e=>moveDown(obj,e)} style={{width:20,height:20,border:'none',background:'none',cursor:'pointer',color:T.textMd,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
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
  const fabricLib = useRef<any>(null)

  const [pages, setPages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [leftTab, setLeftTab] = useState<'layouts'|'elements'|'text'|'media'|'layers'>('layouts')
  const [zoom, setZoom] = useState(0.62)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [activeToolState, setActiveToolState] = useState('select')
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
  const [showExport, setShowExport] = useState(false)
  const [showRelayout, setShowRelayout] = useState(false)

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

  useEffect(()=>{
    const fontsHref='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'
    if(!document.querySelector(`link[href="${fontsHref}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=fontsHref;document.head.appendChild(l)}
    if(!(window as any).fabric){
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';s.onload=()=>initFabric();document.head.appendChild(s)
    } else {initFabric()}
    if(!(window as any).jspdf){const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';document.head.appendChild(s)}
  },[]) // eslint-disable-line

  useEffect(()=>{loadDocument();loadShareLinks()},[params.id]) // eslint-disable-line

  async function loadDocument(){
    const{data}=await supabase.from('documents').select('*').eq('id',params.id).single()
    if(!data){router.push('/dashboard');return}
    setDoc(data);setTitle(data.title)
    const cd=(data as any).canvas_data
    if(cd?.pages?.length){
      setPages(cd.pages);pagesRef.current=cd.pages
      if(cd.canvasW){setCanvasW(cd.canvasW);cWRef.current=cd.canvasW}
      if(cd.canvasH){setCanvasH(cd.canvasH);cHRef.current=cd.canvasH}
      setShowTplModal(false)
      waitForFabricThenLoad(cd.pages[0],cd.canvasW||1280,cd.canvasH||720)
    }else{setShowTplModal(true)}
  }
  async function loadShareLinks(){const{data}=await supabase.from('share_links').select('*').eq('document_id',params.id).order('created_at',{ascending:false});setShareLinks(data??[])}

  function initFabric(){
    if(fabricReady.current||!canvasEl.current)return
    if(!(window as any).fabric){setTimeout(initFabric,80);return}
    const fab=(window as any).fabric
    fabricLib.current=fab
    const fc=new fab.Canvas(canvasEl.current,{width:cWRef.current,height:cHRef.current,backgroundColor:'#ffffff',selection:true,preserveObjectStacking:true})
    fabricRef.current=fc;(window as any).__fabricCanvas=fc
    fabricReady.current=true

    // Snapping
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
        if(Math.abs(mCx-oCx)<SNAP_THRESHOLD){moving.set('left',oCx-(moving.width*moving.scaleX)/2);vLine=new fab.Line([oCx,0,oCx,cHRef.current],{stroke:T.accent,strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7});fc.add(vLine)}
        if(Math.abs(mCy-oCy)<SNAP_THRESHOLD){moving.set('top',oCy-(moving.height*moving.scaleY)/2);hLine=new fab.Line([0,oCy,cWRef.current,oCy],{stroke:T.accent,strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7});fc.add(hLine)}
        const canvasCx=cWRef.current/2
        if(Math.abs(mCx-canvasCx)<SNAP_THRESHOLD){moving.set('left',canvasCx-(moving.width*moving.scaleX)/2);vLine=new fab.Line([canvasCx,0,canvasCx,cHRef.current],{stroke:'#ef4444',strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7});fc.add(vLine)}
        const canvasCy=cHRef.current/2
        if(Math.abs(mCy-canvasCy)<SNAP_THRESHOLD){moving.set('top',canvasCy-(moving.height*moving.scaleY)/2);hLine=new fab.Line([0,canvasCy,cWRef.current,canvasCy],{stroke:'#ef4444',strokeWidth:1,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.7});fc.add(hLine)}
      }
    })
    fc.on('object:moved',()=>{if(vLine){fc.remove(vLine);vLine=null}if(hLine){fc.remove(hLine);hLine=null};fc.renderAll();scheduleAutoSave()})
    fc.on('object:modified',()=>scheduleAutoSave())
    fc.on('selection:created',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:updated',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:cleared',()=>setSelectedObj(null))
    fc.on('path:created',()=>pushHistory())
    fc.on('text:changed',()=>scheduleAutoSave())
  }

  function pushHistory(){
    if(isUndoRedo.current||!fabricRef.current)return
    const state=fabricRef.current.toJSON()
    historyStack.current=historyStack.current.slice(0,historyIndex.current+1)
    if(historyStack.current.length>=MAX_HISTORY)historyStack.current.shift()
    historyStack.current.push(state);historyIndex.current=historyStack.current.length-1
  }
  function undo(){
    if(historyIndex.current<=0)return
    isUndoRedo.current=true;historyIndex.current--
    const state=historyStack.current[historyIndex.current]
    fabricRef.current?.loadFromJSON(state,()=>{fabricRef.current.renderAll();isUndoRedo.current=false})
  }
  function redo(){
    if(historyIndex.current>=historyStack.current.length-1)return
    isUndoRedo.current=true;historyIndex.current++
    const state=historyStack.current[historyIndex.current]
    fabricRef.current?.loadFromJSON(state,()=>{fabricRef.current.renderAll();isUndoRedo.current=false})
  }
  function waitForFabricThenLoad(pageJson:any,w:number,h:number){
    const attempt=()=>{
      if(fabricRef.current){fabricRef.current.setWidth(w);fabricRef.current.setHeight(h);fabricRef.current.loadFromJSON(pageJson,()=>{fabricRef.current.renderAll();pushHistory()})}
      else{setTimeout(attempt,100)}
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
    if(!fabricRef.current)return
    try{const url=fabricRef.current.toDataURL({format:'jpeg',quality:0.4,multiplier:0.12});setThumbnails(prev=>({...prev,[idx]:url}))}catch(e){}
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
    await supabase.from('documents').update({canvas_data:{pages:all,canvasW:cWRef.current,canvasH:cHRef.current},updated_at:new Date().toISOString()} as any).eq('id',params.id)
    setSaving(false);setLastSaved(new Date())
  },[params.id])
  async function saveTitle(){await supabase.from('documents').update({title:title||'Untitled'}).eq('id',params.id)}
  async function deleteDocument(){setDeleting(true);await supabase.from('share_links').delete().eq('document_id',params.id);await supabase.from('documents').delete().eq('id',params.id);router.push('/dashboard')}
  async function publishDocument(){await supabase.from('documents').update({status:'active'}).eq('id',params.id);setDoc(prev=>prev?{...prev,status:'active'}:prev);setShowShare(true)}

  function setActiveTool(tool:string){
    setActiveToolState(tool)
    const fc=fabricRef.current;if(!fc)return
    if(tool==='text'){
      const fab=fabricLib.current||((window as any).fabric);const fc2=fabricRef.current;if(!fc2||!fab)return
      const tb=new fab.Textbox('Click to edit',{left:100,top:100,width:320,fontSize:24,fontFamily,fill:fontColor,fontWeight:'400',editable:true,lineHeight:1.4})
      fc2.add(tb);fc2.setActiveObject(tb);fc2.renderAll();pushHistory();setActiveToolState('select')
      return
    }
    fc.isDrawingMode=tool==='draw'
    if(tool==='draw'&&fc.freeDrawingBrush){fc.freeDrawingBrush.color=fontColor;fc.freeDrawingBrush.width=3}
  }

  function searchStock(q:string){
    const imgs=UNSPLASH_CURATED.map(id=>`https://images.unsplash.com/${id}?w=400&q=70&auto=format`)
    setStockImages(imgs)
  }
  function switchPage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    pagesRef.current=upd;setPages([...upd]);setCurrentPage(idx);currentPageRef.current=idx
    fabricRef.current.loadFromJSON(upd[idx],()=>fabricRef.current.renderAll())
    historyStack.current=[];historyIndex.current=-1
  }
  function addPage(){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    const blank=pg(bgColor);const ni=currentPageRef.current+1
    upd.splice(ni,0,blank);pagesRef.current=upd;setPages([...upd]);setCurrentPage(ni);currentPageRef.current=ni
    fabricRef.current.clear();fabricRef.current.backgroundColor=bgColor;fabricRef.current.renderAll()
    historyStack.current=[];historyIndex.current=-1
  }
  function duplicatePage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    const copy=JSON.parse(JSON.stringify(upd[idx]));upd.splice(idx+1,0,copy);pagesRef.current=upd;setPages([...upd]);switchPage(idx+1)
  }
  function removePage(idx:number){
    if(pagesRef.current.length<=1)return
    const upd=pagesRef.current.filter((_:any,i:number)=>i!==idx);pagesRef.current=upd;setPages([...upd])
    const ni=Math.min(currentPageRef.current,upd.length-1);setCurrentPage(ni);currentPageRef.current=ni
    fabricRef.current?.loadFromJSON(upd[ni],()=>fabricRef.current.renderAll())
    setThumbnails(prev=>{const next={...prev};delete next[idx];return next})
  }

  function applyLayout(layout:any){
    if(!fabricRef.current)return
    const built=layout.build(cWRef.current,cHRef.current)
    fabricRef.current.loadFromJSON(built,()=>{fabricRef.current.renderAll();pushHistory();scheduleAutoSave()})
  }

  function doRelayout(newLayout:any){
    if(!fabricRef.current)return
    const objects=fabricRef.current.toJSON().objects||[]
    const newPage=relayout(objects,newLayout,cWRef.current,cHRef.current)
    fabricRef.current.loadFromJSON(newPage,()=>{fabricRef.current.renderAll();pushHistory();scheduleAutoSave()})
    setShowRelayout(false)
  }

  function startBlank(sizeId='pres-169'){
    const size=CANVAS_SIZES.find(s=>s.id===sizeId)||CANVAS_SIZES[0]
    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
    const blank=pg();pagesRef.current=[blank];setPages([blank])
    setCurrentPage(0);currentPageRef.current=0;setShowTplModal(false);setThumbnails({})
    waitForFabricThenLoad(blank,size.w,size.h)
  }
  function addShape(type:string,opts:any={}){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    const fill=opts.fill||fillColor
    let shape:any
    if(type==='rect')      shape=new fab.Rect({left:100,top:100,width:220,height:110,fill,rx:opts.rx||0})
    else if(type==='circle')    shape=new fab.Circle({left:100,top:100,radius:70,fill})
    else if(type==='triangle')  shape=new fab.Triangle({left:100,top:100,width:140,height:120,fill})
    else if(type==='star'){
      const points=[];const outerR=70;const innerR=30;const cx=170;const cy=170
      for(let i=0;i<10;i++){const r=i%2===0?outerR:innerR;const angle=(i*Math.PI/5)-Math.PI/2;points.push({x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle)})}
      shape=new fab.Polygon(points,{fill,left:100,top:100})
    }
    else if(type==='line') shape=new fab.Line([100,200,420,200],{stroke:fill,strokeWidth:3,selectable:true})
    else if(type==='arrow'){const path=`M 100 150 L 350 150 M 300 110 L 360 150 L 300 190`;shape=new fab.Path(path,{stroke:fill,strokeWidth:3,fill:'transparent',selectable:true})}
    if(shape){fc.add(shape);fc.setActiveObject(shape);fc.renderAll();pushHistory()}
  }
  function addTable(rows=4,cols=3){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    const cw=160,rh=44,x=100,y=100
    const objs=[]
    for(let i=0;i<rows;i++){for(let j=0;j<cols;j++){
      const isH=i===0
      objs.push(new fab.Rect({left:x+j*cw,top:y+i*rh,width:cw,height:rh,fill:isH?'#0f172a':i%2===0?'#f8fafc':'#ffffff',stroke:'#e2e8f0',strokeWidth:1,selectable:true}))
      objs.push(new fab.IText(isH?`Column ${j+1}`:`Cell ${i},${j+1}`,{left:x+j*cw+10,top:y+i*rh+13,width:cw-20,fontSize:12,fontFamily:'Jost',fill:isH?'#ffffff':'#374151',fontWeight:isH?'600':'400',editable:true,selectable:true}))
    }}
    objs.forEach(o=>fc.add(o));fc.renderAll();pushHistory()
  }
  function loadGoogleFont(family:string){
    const safe=family.replace(/ /g,'+')
    if(document.querySelector(`link[data-font="${safe}"]`))return
    const l=document.createElement('link');l.rel='stylesheet'
    l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@300;400;500;600;700;800&display=swap`
    l.setAttribute('data-font',safe);document.head.appendChild(l)
  }
  function applyFont(f:string){loadGoogleFont(f);setFontFamily(f);setShowFontPicker(false);updateProp('fontFamily',f)}
  function deleteSelected(){const fc=fabricRef.current;if(!fc)return;fc.getActiveObjects().forEach((o:any)=>fc.remove(o));fc.discardActiveObject();fc.renderAll();setSelectedObj(null);pushHistory()}
  function duplicateSelected(){const fc=fabricRef.current;if(!fc)return;fc.getActiveObject()?.clone((c:any)=>{c.set({left:c.left+24,top:c.top+24});fc.add(c);fc.setActiveObject(c);fc.renderAll();pushHistory()})}
  function groupSelected(){const fc=fabricRef.current;if(!fc)return;if(!fc.getActiveObject()||fc.getActiveObject().type!=='activeSelection')return;fc.getActiveObject().toGroup();fc.renderAll();pushHistory()}
  function ungroupSelected(){const fc=fabricRef.current;if(!fc)return;if(!fc.getActiveObject()||fc.getActiveObject().type!=='group')return;fc.getActiveObject().toActiveSelection();fc.renderAll();pushHistory()}
  function updateProp(prop:string,value:any){const fc=fabricRef.current;if(!fc)return;const obj=fc.getActiveObject();if(!obj)return;obj.set(prop,value);fc.renderAll();scheduleAutoSave()}
  function uploadImage(file:File){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    const r=new FileReader()
    r.onload=e=>fab.Image.fromURL(e.target?.result as string,(img:any)=>{const s=Math.min(400/img.width,300/img.height,1);img.set({left:120,top:120,scaleX:s,scaleY:s});fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHistory()})
    r.readAsDataURL(file)
  }
  function addStockImage(url:string){
    const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
    fab.Image.fromURL(url,(img:any)=>{const scale=Math.min(cWRef.current/img.width,cHRef.current/img.height,1);img.set({left:0,top:0,scaleX:scale,scaleY:scale,crossOrigin:'anonymous'});fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHistory()},{crossOrigin:'anonymous'})
  }
  function uploadFont(file:File){
    const r=new FileReader()
    r.onload=e=>{const name=file.name.replace(/\.[^/.]+$/,'');const style=document.createElement('style');style.textContent=`@font-face{font-family:'${name}';src:url('${e.target?.result}')}`;document.head.appendChild(style);setFontFamily(name)}
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
        tfc.loadFromJSON(saved[i],()=>{tfc.renderAll();pdf.addImage(tfc.toDataURL({format:'jpeg',quality:.92}),'JPEG',0,0,cWRef.current,cHRef.current);tfc.dispose();res()})
      })
    }
    pdf.save(`${title||'document'}.pdf`)
  }
  async function exportPNG(){const fc=fabricRef.current;if(!fc)return;const a=document.createElement('a');a.href=fc.toDataURL({format:'png',multiplier:2});a.download=`${title||'page'}.png`;a.click()}

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
      if(e.key==='Escape'){setSelectedObj(null);fabricRef.current?.discardActiveObject();fabricRef.current?.renderAll()}
      if(e.key==='v')setActiveTool('select')
      if(e.key==='t')setActiveTool('text')
      if(e.key==='p')setActiveTool('draw')
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
  const UI:React.CSSProperties={fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}

  // ── Right panel object properties ──────────────────────────────────────────
  function RightPanel(){
    if(!selectedObj) return(
      <div style={{width:240,background:T.bgPanel,borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'14px 14px 10px',borderBottom:`1px solid ${T.border}`}}>
          <div style={{...UI,fontSize:11,fontWeight:700,color:T.textMd}}>Canvas</div>
        </div>
        <LSection label="Background">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="color" value={bgColor} onChange={e=>{setBgColor(e.target.value);if(fabricRef.current){fabricRef.current.backgroundColor=e.target.value;fabricRef.current.renderAll();scheduleAutoSave()}}}
              style={{width:32,height:32,borderRadius:6,border:`1px solid ${T.border}`,cursor:'pointer'}}/>
            <span style={{...UI,fontSize:12,color:T.textMd,fontFamily:"'JetBrains Mono',monospace"}}>{bgColor}</span>
          </div>
        </LSection>
        <LSection label="Canvas Size">
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {CANVAS_SIZES.slice(0,4).map(s=>(
              <button key={s.id} onClick={()=>{setCanvasW(s.w);setCanvasH(s.h);cWRef.current=s.w;cHRef.current=s.h;if(fabricRef.current){fabricRef.current.setWidth(s.w);fabricRef.current.setHeight(s.h);fabricRef.current.renderAll()}}}
                style={{...UI,padding:'6px 10px',border:`1px solid ${canvasW===s.w&&canvasH===s.h?T.accent:T.border}`,borderRadius:8,background:canvasW===s.w&&canvasH===s.h?T.accentLt:'#fff',fontSize:11,cursor:'pointer',color:canvasW===s.w&&canvasH===s.h?T.accent:T.textMd,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {s.label}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.textSm}}>{s.dims}</span>
              </button>
            ))}
          </div>
        </LSection>
      </div>
    )

    const isText=selectedObj.type==='textbox'||selectedObj.type==='i-text'||selectedObj.type==='text'
    const isImage=selectedObj.type==='image'
    const isShape=!isText&&!isImage

    return(
      <div style={{width:240,background:T.bgPanel,borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
        {/* Object type header */}
        <div style={{padding:'12px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <span style={{...UI,fontSize:11,fontWeight:700,color:T.textMd,textTransform:'capitalize'}}>{selectedObj.type}</span>
          <div style={{display:'flex',gap:3}}>
            <button onClick={duplicateSelected} title="Duplicate (⌘D)" style={{width:26,height:26,border:`1px solid ${T.border}`,borderRadius:6,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.textMd}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><rect x="1" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" fill="white"/></svg>
            </button>
            <button onClick={deleteSelected} title="Delete" style={{width:26,height:26,border:`1px solid #fee2e2`,borderRadius:6,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.red}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 9.5V5M7.5 9.5V5M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto'}}>
          {/* Position & Size */}
          <LSection label="Position & Size">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              <LNum label="X" value={Math.round(selectedObj.left||0)} onChange={v=>updateProp('left',v)}/>
              <LNum label="Y" value={Math.round(selectedObj.top||0)} onChange={v=>updateProp('top',v)}/>
              <LNum label="W" value={Math.round(selectedObj.width||0)} onChange={v=>updateProp('width',v)}/>
              <LNum label="H" value={Math.round(selectedObj.height||0)} onChange={v=>updateProp('height',v)}/>
            </div>
          </LSection>

          {/* Appearance */}
          <LSection label="Appearance">
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {!isText&&(
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Fill</div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input type="color" value={typeof selectedObj.fill==='string'?selectedObj.fill:'#4f46e5'} onChange={e=>{setFillColor(e.target.value);updateProp('fill',e.target.value)}}
                      style={{width:32,height:32,borderRadius:6,border:`1px solid ${T.border}`,cursor:'pointer'}}/>
                    <span style={{...UI,fontSize:12,color:T.textMd,fontFamily:"'JetBrains Mono',monospace"}}>{typeof selectedObj.fill==='string'?selectedObj.fill:'—'}</span>
                  </div>
                </div>
              )}
              {isShape&&(
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Stroke</div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input type="color" value={selectedObj.stroke||'#000000'} onChange={e=>updateProp('stroke',e.target.value)} style={{width:32,height:32,borderRadius:6,border:`1px solid ${T.border}`,cursor:'pointer'}}/>
                    <LNum label="Width" value={selectedObj.strokeWidth||0} onChange={v=>updateProp('strokeWidth',v)}/>
                  </div>
                </div>
              )}
              <LSlider label="Opacity" value={Math.round((selectedObj.opacity??1)*100)} min={0} max={100} onChange={v=>updateProp('opacity',v/100)}/>
              {isShape&&selectedObj.type==='rect'&&<LNum label="Corner Radius" value={selectedObj.rx||0} onChange={v=>{updateProp('rx',v);updateProp('ry',v)}}/>}
            </div>
          </LSection>

          {/* Text properties */}
          {isText&&(
            <LSection label="Typography">
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {/* Font color */}
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Color</div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);updateProp('fill',e.target.value)}}
                      style={{width:32,height:32,borderRadius:6,border:`1px solid ${T.border}`,cursor:'pointer'}}/>
                    <span style={{...UI,fontSize:12,color:T.textMd,fontFamily:"'JetBrains Mono',monospace"}}>{fontColor}</span>
                  </div>
                </div>
                {/* Font family */}
                <div style={{position:'relative'}}>
                  <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>Font</div>
                  <button onClick={()=>setShowFontPicker(!showFontPicker)}
                    style={{...UI,width:'100%',padding:'6px 9px',border:`1px solid ${T.border}`,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:500,color:T.text,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fontFamily}</span>
                    <svg width="9" height="5" viewBox="0 0 9 5" fill="none"><path d="M1 1l3.5 3L8 1" stroke={T.textSm} strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </button>
                  {showFontPicker&&(
                    <div style={{position:'absolute',top:'110%',left:0,right:0,background:'#fff',border:`1px solid ${T.border}`,borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,.12)',zIndex:200}}>
                      <div style={{padding:'8px 8px 4px'}}>
                        <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search fonts…" autoFocus
                          style={{...UI,width:'100%',padding:'6px 9px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:11,color:T.text,background:T.bgApp,outline:'none'}}/>
                      </div>
                      <div style={{maxHeight:200,overflow:'auto',padding:'4px 6px 6px'}}>
                        {filteredFonts.slice(0,50).map(f=>(
                          <div key={f} onClick={()=>applyFont(f)} style={{...UI,padding:'6px 8px',cursor:'pointer',fontSize:12,borderRadius:6,fontFamily:`'${f}',sans-serif`,color:fontFamily===f?T.accent:T.textMd,background:fontFamily===f?T.accentLt:'transparent',fontWeight:fontFamily===f?700:400}}>
                            {f}
                          </div>
                        ))}
                      </div>
                      <div style={{padding:'6px 8px',borderTop:`1px solid ${T.border}`}}>
                        <label style={{...UI,display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontSize:11,color:T.textSm}}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          Upload font
                          <input type="file" accept=".ttf,.otf,.woff,.woff2" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFont(f)}}/>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                {/* Font size */}
                <LNum label="Size" value={fontSize} onChange={v=>{setFontSize(v);updateProp('fontSize',v)}}/>
                {/* Style toggles */}
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Style</div>
                  <div style={{display:'flex',gap:4}}>
                    {[
                      {label:'B',style:{fontWeight:800},prop:'fontWeight',on:'bold',off:'normal',active:selectedObj.fontWeight==='bold'||selectedObj.fontWeight===800},
                      {label:'I',style:{fontStyle:'italic',fontFamily:'Georgia,serif'},prop:'fontStyle',on:'italic',off:'normal',active:selectedObj.fontStyle==='italic'},
                      {label:'U',style:{textDecoration:'underline'},prop:'underline',on:true,off:false,active:selectedObj.underline===true},
                    ].map(f=>(
                      <button key={f.label} onClick={()=>updateProp(f.prop,f.active?f.off:f.on)}
                        style={{...LBtn(f.active),...f.style,width:32,height:28,padding:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Align */}
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Align</div>
                  <div style={{display:'flex',gap:4}}>
                    {([['left',<svg key="l" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M2 6h5M2 9h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>],
                      ['center',<svg key="c" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M3.5 6h5M2 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>],
                      ['right',<svg key="r" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 6h5M3 9h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>],
                    ] as [string,React.ReactNode][]).map(([a,icon])=>(
                      <button key={a} onClick={()=>updateProp('textAlign',a)} style={{...LBtn(selectedObj.textAlign===a),width:30,height:28,padding:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>{icon}</button>
                    ))}
                  </div>
                </div>
                {/* Line height */}
                <LSlider label="Line Height" value={Math.round((selectedObj.lineHeight??1.4)*10)/10} min={0.8} max={3} onChange={v=>updateProp('lineHeight',v)}/>
              </div>
            </LSection>
          )}

          {/* Image filters */}
          {isImage&&(
            <LSection label="Filters">
              <ImageFiltersPanel obj={selectedObj} onChange={updateProp}/>
            </LSection>
          )}

          {/* Transform */}
          <LSection label="Transform">
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              <LNum label="Rotation" value={Math.round(selectedObj.angle||0)} onChange={v=>updateProp('angle',v)}/>
              <div>
                <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Blend Mode</div>
                <select value={selectedObj.globalCompositeOperation||'normal'} onChange={e=>updateProp('globalCompositeOperation',e.target.value)}
                  style={{...UI,width:'100%',padding:'6px 9px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none'}}>
                  {BLEND_MODES.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {/* Align buttons */}
              <div>
                <div style={{...UI,fontSize:9,fontWeight:600,color:T.textSm,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Align to Canvas</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
                  {[
                    {label:'Left',fn:()=>updateProp('left',0)},
                    {label:'Center H',fn:()=>updateProp('left',cWRef.current/2-(selectedObj.width*(selectedObj.scaleX||1))/2)},
                    {label:'Right',fn:()=>updateProp('left',cWRef.current-(selectedObj.width*(selectedObj.scaleX||1)))},
                    {label:'Top',fn:()=>updateProp('top',0)},
                    {label:'Center V',fn:()=>updateProp('top',cHRef.current/2-(selectedObj.height*(selectedObj.scaleY||1))/2)},
                    {label:'Bottom',fn:()=>updateProp('top',cHRef.current-(selectedObj.height*(selectedObj.scaleY||1)))},
                  ].map(a=>(
                    <button key={a.label} onClick={a.fn} style={{...UI,padding:'4px 0',border:`1px solid ${T.border}`,borderRadius:6,background:'#fff',fontSize:9,cursor:'pointer',color:T.textMd,fontWeight:500}}>{a.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </LSection>
        </div>
      </div>
    )
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:T.bgApp,...UI,color:T.text,overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.borderMd};border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#C0BDBA}
        input[type="color"]{-webkit-appearance:none;border:none;cursor:pointer;padding:0;border-radius:6px;overflow:hidden}
        input[type="color"]::-webkit-color-swatch-wrapper{padding:0}
        input[type="color"]::-webkit-color-swatch{border:none}
        .layer-row:hover .layer-actions{opacity:1!important}
        .layout-card{transition:all .15s;border:1.5px solid ${T.border};border-radius:10px;overflow:hidden;cursor:pointer;background:#fff}
        .layout-card:hover{border-color:${T.accent};box-shadow:0 0 0 3px ${T.accentLt};transform:translateY(-1px)}
        .page-thumb{cursor:pointer;border-radius:8px;border:1.5px solid ${T.border};overflow:hidden;transition:all .15s;background:#fff}
        .page-thumb:hover{border-color:${T.borderMd}}
        .page-thumb.active{border-color:${T.accent};box-shadow:0 0 0 2px ${T.accentLt}}
        .left-tab{height:40px;border:none;cursor:pointer;background:transparent;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;color:${T.textMd};padding:0 10px;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap}
        .left-tab:hover{color:${T.text}}
        .left-tab.on{color:${T.accent};border-bottom-color:${T.accent};background:transparent}
        .tool-btn{width:34px;height:32px;border:none;cursor:pointer;border-radius:7px;background:transparent;color:${T.textMd};display:flex;align-items:center;justify-content:center;transition:all .14s;flex-shrink:0}
        .tool-btn:hover{background:${T.bgApp};color:${T.text}}
        .tool-btn.on{background:${T.accentLt};color:${T.accent};border:1px solid ${T.accentMd}}
        .shape-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:56px;border:1px solid ${T.border};border-radius:9px;background:#fff;cursor:pointer;font-size:9px;font-weight:700;color:${T.textMd};font-family:'Plus Jakarta Sans',sans-serif;transition:all .14s}
        .shape-card:hover{border-color:${T.accent};color:${T.accent};background:${T.accentLt}}
        .divider-v{width:1px;height:20px;background:${T.border};margin:0 3px;flex-shrink:0}
        .stock-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all .15s}
        .stock-img:hover{border-color:${T.accent}}
        .pri-btn{padding:6px 16px;height:32px;border-radius:8px;font-size:12px;font-weight:700;border:none;background:${T.accent};color:white;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s;display:flex;align-items:center;gap:6px}
        .pri-btn:hover{background:#4338CA;transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,70,229,.3)}
        .sec-btn{padding:6px 14px;height:32px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid ${T.border};background:#fff;color:${T.textMd};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .14s}
        .sec-btn:hover{background:${T.bgApp};border-color:${T.borderMd}}
        .top-action{height:30px;padding:0 11px;border-radius:7px;font-size:12px;font-weight:600;border:1px solid ${T.border};background:#fff;color:${T.textMd};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .14s;display:flex;align-items:center;gap:5px}
        .top-action:hover{background:${T.bgApp};border-color:${T.borderMd};color:${T.text}}
        .cat-pill{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:600;border:1px solid ${T.border};background:#fff;color:${T.textMd};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .12s;white-space:nowrap}
        .cat-pill:hover{background:${T.bgApp}}
        .cat-pill.on{background:${T.accentLt};color:${T.accent};border-color:${T.accentMd}}
      `}</style>

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════════ */}
      <div style={{height:52,background:T.bgPanel,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 16px',gap:8,flexShrink:0,zIndex:30}}>
        {/* Back */}
        <button onClick={()=>router.push('/dashboard')} style={{...UI,background:'none',border:'none',cursor:'pointer',color:T.textMd,display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:500,padding:'4px 6px',borderRadius:6,transition:'color .14s',flexShrink:0}}
          onMouseOver={e=>(e.currentTarget.style.color=T.text)} onMouseOut={e=>(e.currentTarget.style.color=T.textMd)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Docs
        </button>
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M1 1l3 4-3 4" stroke={T.border} strokeWidth="1.5" strokeLinecap="round"/></svg>

        {/* Title */}
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{...UI,border:'none',outline:'none',fontSize:14,fontWeight:600,color:T.text,background:'transparent',flex:1,maxWidth:200,minWidth:60,letterSpacing:'-.01em'}}/>

        {/* Save status */}
        <span style={{fontSize:10,color:saving?T.accent:T.textSm,fontFamily:"'JetBrains Mono',monospace",minWidth:60}}>
          {saving?'saving…':lastSaved?'✓ saved':''}
        </span>

        {/* Status badge */}
        <span style={{padding:'3px 8px',borderRadius:20,fontSize:9,fontWeight:700,letterSpacing:'.06em',background:isActive?'#ecfdf5':'#f1f5f9',color:isActive?T.green:T.textSm,border:`1px solid ${isActive?'#a7f3d0':T.border}`,flexShrink:0}}>
          {isActive?'LIVE':'DRAFT'}
        </span>

        <div style={{flex:1}}/>

        {/* Tool mode */}
        <div style={{display:'flex',alignItems:'center',gap:1,background:T.bgApp,borderRadius:8,padding:2,border:`1px solid ${T.border}`}}>
          {([
            {id:'select',tip:'Select (V)',icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 1.5l8 4.5-3.8 1.2-1.8 4-2.4-9.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>},
            {id:'text',  tip:'Text (T)', icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4h9M6.5 4v6M4 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
            {id:'draw',  tip:'Draw (P)', icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 11l2-1 6.5-6.5-1-1L3 10 2 11zm6.5-7.5l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          ] as {id:string;tip:string;icon:React.ReactNode}[]).map(tool=>(
            <button key={tool.id} title={tool.tip} className={`tool-btn${activeToolState===tool.id?' on':''}`}
              onClick={()=>setActiveTool(tool.id)}>
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="divider-v"/>

        {/* Actions */}
        <button onClick={undo} title="Undo (⌘Z)" className="tool-btn"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5A4 4 0 116.5 2.5H4M4 2.5L1.5 5 4 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <button onClick={redo} title="Redo (⌘⇧Z)" className="tool-btn"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 6.5A4 4 0 106.5 2.5H9M9 2.5L11.5 5 9 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>

        <div className="divider-v"/>

        <button onClick={()=>setShowDrafter(true)} className="top-action">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1L6.8 4.2H10L7.4 6.1 8.3 9.3 5.5 7.4 2.7 9.3 3.6 6.1 1 4.2H4.2L5.5 1z" fill={T.amber} stroke={T.amber} strokeWidth=".6" strokeLinejoin="round"/></svg>
          AI Draft
        </button>

        {/* Export */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowExport(!showExport)} className="top-action">
            Export
            <svg width="9" height="5" viewBox="0 0 9 5" fill="none"><path d="M1 1l3.5 3L8 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
          {showExport&&(
            <div style={{position:'absolute',top:'110%',right:0,background:T.bgPanel,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,.1)',zIndex:300,minWidth:160,padding:4}}>
              {[
                {label:'Export as PDF',fn:()=>{exportPDF();setShowExport(false)},icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 1.5h5.6l2.4 2.4V11c0 .6-.4 1-.9 1H2.5c-.5 0-1-.4-1-1V2.5c0-.5.5-1 1-1z" stroke="currentColor" strokeWidth="1.1"/><path d="M8 1.5v3H11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>},
                {label:'Export as PNG',fn:()=>{exportPNG();setShowExport(false)},icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.1"/><circle cx="4.5" cy="4.5" r="1" fill="currentColor"/><path d="M1.5 9l2.5-2.5L6.5 9l2-2 3 3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg>},
              ].map(b=>(
                <button key={b.label} onClick={b.fn} style={{...UI,display:'flex',width:'100%',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:500,color:T.textMd,borderRadius:7,textAlign:'left',gap:8,alignItems:'center',transition:'background .12s'}}
                  onMouseOver={e=>{(e.target as HTMLElement).closest('button')!.style.background=T.bgApp}}
                  onMouseOut={e=>{(e.target as HTMLElement).closest('button')!.style.background='none'}}>
                  {b.icon}{b.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {isActive
          ?<button onClick={()=>setShowShare(true)} className="pri-btn">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="9" cy="2" r="1.5" stroke="white" strokeWidth="1.2"/><circle cx="9" cy="10" r="1.5" stroke="white" strokeWidth="1.2"/><circle cx="3" cy="6" r="1.5" stroke="white" strokeWidth="1.2"/><path d="M7.5 2.8l-3 2.4M7.5 9.2l-3-2.4" stroke="white" strokeWidth="1.2"/></svg>
            Share
          </button>
          :<button onClick={publishDocument} className="pri-btn">Publish & Share</button>}
      </div>

      {/* ══ BODY ══════════════════════════════════════════════════════════════ */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* ── LEFT RAIL ─────────────────────────────────────────────────── */}
        <div style={{width:252,background:T.bgPanel,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0}}>
          {/* Tabs */}
          <div style={{display:'flex',borderBottom:`1px solid ${T.border}`,padding:'0 4px',overflowX:'auto',flexShrink:0}}>
            {([
              {id:'layouts',  label:'Layouts'},
              {id:'elements', label:'Elements'},
              {id:'text',     label:'Text'},
              {id:'media',    label:'Media'},
              {id:'layers',   label:'Layers'},
            ] as {id:typeof leftTab;label:string}[]).map(t=>(
              <button key={t.id} className={`left-tab${leftTab===t.id?' on':''}`} onClick={()=>setLeftTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{flex:1,overflow:'auto',padding:'10px'}}>

            {/* ── LAYOUTS tab ── */}
            {leftTab==='layouts'&&(
              <div>
                {/* Re-layout button */}
                <button onClick={()=>setShowRelayout(true)} style={{...UI,width:'100%',padding:'9px',border:`1px solid ${T.accent}`,borderRadius:9,background:T.accentLt,cursor:'pointer',fontSize:12,fontWeight:700,color:T.accent,display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:10}}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5C2 4 4 2 6.5 2s4.5 2 4.5 4.5M11 5l.5 1.5L10 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 6.5C11 9 9 11 6.5 11S2 9 2 6.5M2 8l-.5-1.5L3 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Re-Layout Content
                </button>
                {/* Categories */}
                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
                  {LAYOUT_CATS.map(c=>(
                    <button key={c} className={`cat-pill${layoutCat===c?' on':''}`} onClick={()=>setLayoutCat(c)}>{c}</button>
                  ))}
                </div>
                {/* Layout grid */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                  {filteredLayouts.map(l=>(
                    <div key={l.id} className="layout-card" onClick={()=>applyLayout(l)}>
                      <div style={{aspectRatio:'16/9',background:'#f8f9fa',display:'flex',alignItems:'center',justifyContent:'center',padding:6,borderBottom:`1px solid ${T.border}`}}>
                        <div style={{width:'100%',height:'100%',background:l.build(160,90).background||'#fff',borderRadius:4,position:'relative',overflow:'hidden'}}>
                          {/* Mini preview */}
                          {l.build(160,90).objects?.slice(0,4).map((o:any,oi:number)=>(
                            o.type==='rect'&&<div key={oi} style={{position:'absolute',left:`${(o.left/160)*100}%`,top:`${(o.top/90)*100}%`,width:`${(o.width/160)*100}%`,height:`${(o.height/90)*100}%`,background:o.fill,borderRadius:o.rx?`${(o.rx/160)*100}%`:0,opacity:o.opacity??1}}/>
                          ))}
                        </div>
                      </div>
                      <div style={{padding:'6px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{...UI,fontSize:10,fontWeight:600,color:T.textMd}}>{l.label}</span>
                        <span style={{...UI,fontSize:8,color:T.textSm,background:T.bgApp,padding:'1px 5px',borderRadius:8}}>{l.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ELEMENTS tab ── */}
            {leftTab==='elements'&&(
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:700,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Shapes</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                    {([
                      {id:'rect',    label:'Rect',     icon:<rect x="2" y="3" width="10" height="8" rx="1.5"/>},
                      {id:'circle',  label:'Circle',   icon:<circle cx="7" cy="7" r="5"/>},
                      {id:'triangle',label:'Triangle', icon:<path d="M7 2l5.5 10H1.5L7 2z" strokeLinejoin="round"/>},
                      {id:'star',    label:'Star',     icon:<path d="M7 1l1.5 3.5H12L9.2 6.6l1 3.4L7 8.4 3.8 10l1-3.4L2 4.5h3.5L7 1z" strokeLinejoin="round"/>},
                      {id:'line',    label:'Line',     icon:<path d="M2 12L12 2"/>},
                      {id:'arrow',   label:'Arrow',    icon:<><path d="M2 7h9M8 4l3 3-3 3"/></>},
                    ]).map(s=>(
                      <button key={s.id} className="shape-card" onClick={()=>addShape(s.id)}>
                        <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">{s.icon}</svg>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:700,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Components</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {[
                      {label:'Table',   fn:()=>addTable(4,3),icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1 5h11M1 9h11M5 5v6M9 5v6" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>},
                      {label:'Divider', fn:()=>addShape('line',{fill:'#e2e8f0'}),icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 6.5h11M3 3l-1 3.5L3 10M10 3l1 3.5L10 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>},
                      {label:'Button',  fn:()=>{addShape('rect',{fill:'#4f46e5',rx:8,w:140,h:42});},icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="11" height="5" rx="2" stroke="currentColor" strokeWidth="1"/></svg>},
                      {label:'Card',    fn:()=>addShape('rect',{fill:'#f8fafc',rx:12}),icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1"/></svg>},
                    ].map(c=>(
                      <button key={c.label} className="shape-card" style={{height:44}} onClick={c.fn}>
                        {c.icon}
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:700,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Fill Color</div>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <input type="color" value={fillColor} onChange={e=>setFillColor(e.target.value)} style={{width:36,height:36,borderRadius:8,border:`1px solid ${T.border}`,cursor:'pointer'}}/>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {['#4f46e5','#10b981','#f59e0b','#ef4444','#0f172a','#ffffff','#f8fafc','#6366f1'].map(c=>(
                        <button key={c} onClick={()=>setFillColor(c)} style={{width:22,height:22,borderRadius:4,background:c,border:`1.5px solid ${fillColor===c?T.accent:T.border}`,cursor:'pointer',padding:0}}/>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TEXT tab ── */}
            {leftTab==='text'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:700,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Add Text</div>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {[
                      {label:'Heading 1',  opts:{fs:52,fw:'900',ff:'Jost',  text:'Heading 1'}},
                      {label:'Heading 2',  opts:{fs:36,fw:'700',ff:'Jost',  text:'Heading 2'}},
                      {label:'Heading 3',  opts:{fs:24,fw:'600',ff:'Jost',  text:'Heading 3'}},
                      {label:'Body Text',  opts:{fs:16,fw:'400',           text:'Body text goes here'}},
                      {label:'Caption',    opts:{fs:11,fw:'400',fill:'#64748b',text:'Caption text'}},
                      {label:'Label',      opts:{fs:10,fw:'700',ff:'JetBrains Mono',fill:'#4f46e5',text:'LABEL TEXT'}},
                    ].map(t=>(
                      <button key={t.label} onClick={()=>{
                        const fab=fabricLib.current||((window as any).fabric);const fc=fabricRef.current;if(!fc||!fab)return
                        const tb=new fab.Textbox(t.opts.text,{left:80,top:100,width:400,...t.opts,fontFamily:t.opts.ff||fontFamily,fill:(t.opts as any).fill||fontColor,editable:true,lineHeight:1.4})
                        fc.add(tb);fc.setActiveObject(tb);fc.renderAll();pushHistory()
                      }} style={{...UI,padding:'9px 11px',border:`1px solid ${T.border}`,borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left',transition:'border-color .14s'}}
                        onMouseOver={e=>{(e.currentTarget).style.borderColor=T.accent}}
                        onMouseOut={e=>{(e.currentTarget).style.borderColor=T.border}}>
                        <span style={{fontSize:t.opts.fs>30?16:t.opts.fs>20?13:11,fontWeight:t.opts.fw,fontFamily:`'${t.opts.ff||fontFamily}',sans-serif`,color:T.text}}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:700,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Font Pairings</div>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {FONT_PAIRINGS.map(p=>(
                      <button key={p.label} onClick={()=>{loadGoogleFont(p.heading);loadGoogleFont(p.body)}}
                        style={{...UI,padding:'9px 11px',border:`1px solid ${T.border}`,borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left'}}>
                        <div style={{fontSize:10,fontWeight:700,color:T.textSm,marginBottom:2}}>{p.label}</div>
                        <div style={{fontSize:14,fontFamily:`'${p.heading}',serif`,color:T.text,fontWeight:700}}>{p.heading}</div>
                        <div style={{fontSize:11,fontFamily:`'${p.body}',sans-serif`,color:T.textMd}}>{p.body}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── MEDIA tab ── */}
            {leftTab==='media'&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <label style={{...UI,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',border:`1px dashed ${T.borderMd}`,borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:600,color:T.textMd,background:T.bgApp,transition:'border-color .14s'}}
                  onMouseOver={e=>{(e.currentTarget).style.borderColor=T.accent}}
                  onMouseOut={e=>{(e.currentTarget).style.borderColor=T.borderMd}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M1 10v1.5A1.5 1.5 0 002.5 13h9a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  Upload Image
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
                </label>
                <div>
                  <div style={{...UI,fontSize:9,fontWeight:700,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Stock Photos</div>
                  <div style={{display:'flex',gap:5,marginBottom:8}}>
                    <input value={stockQuery} onChange={e=>setStockQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')searchStock(stockQuery)}} placeholder="Search photos…"
                      style={{...UI,flex:1,padding:'6px 9px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:11,color:T.text,background:'#fff',outline:'none'}}/>
                    <button onClick={()=>searchStock(stockQuery)} style={{...UI,padding:'0 10px',border:`1px solid ${T.border}`,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:11,color:T.textMd,fontWeight:600}}>Go</button>
                  </div>
                  {stockImages.length===0&&(
                    <button onClick={()=>searchStock('business')} style={{...UI,width:'100%',padding:'8px',border:`1px solid ${T.border}`,borderRadius:8,background:T.bgApp,cursor:'pointer',fontSize:11,color:T.textMd,fontWeight:600}}>Load photos</button>
                  )}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {stockImages.map(url=>(
                      <img key={url} src={url} alt="" className="stock-img" onClick={()=>addStockImage(url)}/>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── LAYERS tab ── */}
            {leftTab==='layers'&&(
              <LayersPanel fabric={fabricRef.current} onSelect={syncSel}/>
            )}
          </div>
        </div>

        {/* ── CANVAS + RIGHT PANEL ────────────────────────────────────────── */}
        <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>
          {/* Canvas viewport */}
          <div style={{flex:1,overflow:'auto',background:T.bgCanvas,backgroundImage:'radial-gradient(#CCCBC7 1px, transparent 1px)',backgroundSize:'22px 22px',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'48px 32px',position:'relative'}}>

            {/* Canvas container */}
            <div style={{flexShrink:0,boxShadow:'0 4px 40px rgba(0,0,0,.12)',borderRadius:2,transform:`scale(${zoom})`,transformOrigin:'top center',transition:'transform .15s',background:'#fff'}}>
              <canvas ref={canvasEl}/>
            </div>

            {/* Zoom controls */}
            <div style={{position:'fixed',bottom:100,right:selectedObj?260:16,display:'flex',alignItems:'center',gap:2,background:T.bgPanel,border:`1px solid ${T.border}`,borderRadius:9,padding:'3px 4px',boxShadow:'0 2px 10px rgba(0,0,0,.08)',zIndex:20}}>
              <button onClick={()=>setZoom(z=>Math.max(.15,z-.1))} style={{width:26,height:26,border:'none',background:'none',cursor:'pointer',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:T.textMd,fontSize:16,fontWeight:300}}>−</button>
              <span style={{...UI,fontSize:10,fontWeight:700,color:T.textMd,minWidth:36,textAlign:'center',fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(zoom*100)}%</span>
              <button onClick={()=>setZoom(z=>Math.min(3,z+.1))} style={{width:26,height:26,border:'none',background:'none',cursor:'pointer',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:T.textMd,fontSize:16,fontWeight:300}}>+</button>
              <div style={{width:1,height:16,background:T.border,margin:'0 1px'}}/>
              <button onClick={()=>setZoom(.62)} style={{...UI,height:26,padding:'0 6px',border:'none',background:'none',cursor:'pointer',fontSize:9,fontWeight:700,color:T.textSm,borderRadius:6}}>FIT</button>
            </div>

            {/* Floating quick toolbar when object selected */}
            {selectedObj&&(
              <div style={{position:'fixed',top:60,left:'50%',transform:'translateX(-50%)',background:T.bgPanel,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,.1)',padding:'4px 6px',display:'flex',alignItems:'center',gap:2,zIndex:50}}>
                {/* Font family mini */}
                {(selectedObj.type==='textbox'||selectedObj.type==='text'||selectedObj.type==='i-text')&&(
                  <>
                    <div style={{position:'relative'}}>
                      <button onClick={()=>setShowFontPicker(!showFontPicker)} style={{...UI,height:28,padding:'0 8px',border:`1px solid ${T.border}`,borderRadius:6,background:T.bgApp,cursor:'pointer',fontSize:11,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:600,color:T.text,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {fontFamily}
                      </button>
                    </div>
                    <input type="number" value={fontSize} min={6} max={400} onChange={e=>{const v=parseInt(e.target.value);setFontSize(v);updateProp('fontSize',v)}}
                      style={{...UI,width:46,height:28,border:`1px solid ${T.border}`,borderRadius:6,padding:'0 6px',fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:T.text,background:T.bgApp,outline:'none',textAlign:'center'}}/>
                    {[
                      {prop:'fontWeight',on:'bold',off:'normal',label:'B',active:selectedObj.fontWeight==='bold',st:{fontWeight:800}},
                      {prop:'fontStyle', on:'italic',off:'normal',label:'I',active:selectedObj.fontStyle==='italic',st:{fontStyle:'italic'}},
                    ].map(f=>(
                      <button key={f.prop} onClick={()=>updateProp(f.prop,f.active?f.off:f.on)} style={{...LBtn(f.active),...f.st,width:28,height:28,padding:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{f.label}</button>
                    ))}
                    <div style={{width:1,height:18,background:T.border}}/>
                    <input type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);updateProp('fill',e.target.value)}} style={{width:28,height:28,borderRadius:6,border:`1px solid ${T.border}`,cursor:'pointer'}}/>
                  </>
                )}
                {/* Align distribute for all objects */}
                <div style={{width:1,height:18,background:T.border}}/>
                <button onClick={duplicateSelected} title="Duplicate" style={{width:28,height:28,border:`1px solid ${T.border}`,borderRadius:6,background:T.bgApp,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.textMd}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><rect x="1" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" fill="white"/></svg>
                </button>
                <button onClick={deleteSelected} title="Delete" style={{width:28,height:28,border:`1px solid #fee2e2`,borderRadius:6,background:'#fff5f5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.red}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 9.5V5M7.5 9.5V5M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Right panel */}
          <RightPanel/>
        </div>
      </div>

      {/* ══ BOTTOM PAGES STRIP ══════════════════════════════════════════════ */}
      <div style={{height:104,background:T.bgPanel,borderTop:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:0,flexShrink:0}}>
        <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',gap:8,padding:'0 16px',height:'100%'}}>
          {pages.map((_, i)=>(
            <div key={i} className={`page-thumb${currentPage===i?' active':''}`}
              style={{flexShrink:0,width:Math.round(canvasW*(72/canvasH)),height:72,cursor:'pointer',position:'relative'}}
              onClick={()=>switchPage(i)}>
              {thumbnails[i]
                ?<img src={thumbnails[i]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                :<div style={{width:'100%',height:'100%',background:'#f8f9fa',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:9,color:T.textSm,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</span>
                </div>
              }
              <div style={{position:'absolute',top:3,right:3,display:'flex',gap:2,opacity:0,transition:'opacity .15s'}} className="page-actions">
                <button onClick={e=>{e.stopPropagation();duplicatePage(i)}} title="Duplicate" style={{width:18,height:18,borderRadius:4,background:'rgba(255,255,255,.9)',border:`1px solid ${T.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.textMd,padding:0}}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x="3" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1"/><rect x="1" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1" fill="white"/></svg>
                </button>
                {pages.length>1&&<button onClick={e=>{e.stopPropagation();removePage(i)}} title="Delete" style={{width:18,height:18,borderRadius:4,background:'rgba(255,255,255,.9)',border:`1px solid #fecaca`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.red,padding:0}}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </button>}
              </div>
              <div style={{position:'absolute',bottom:2,left:0,right:0,textAlign:'center',fontSize:8,color:T.textSm,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div>
            </div>
          ))}
          <button onClick={addPage} style={{...UI,flexShrink:0,width:52,height:72,border:`1.5px dashed ${T.borderMd}`,borderRadius:8,background:'transparent',cursor:'pointer',fontSize:10,fontWeight:700,color:T.textSm,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,transition:'all .15s'}}
            onMouseOver={e=>{(e.currentTarget).style.borderColor=T.accent;(e.currentTarget).style.color=T.accent}}
            onMouseOut={e=>{(e.currentTarget).style.borderColor=T.borderMd;(e.currentTarget).style.color=T.textSm}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add
          </button>
        </div>
        {/* Page count */}
        <div style={{padding:'0 16px',flexShrink:0,borderLeft:`1px solid ${T.border}`,height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',gap:2}}>
          <span style={{...UI,fontSize:10,fontWeight:700,color:T.textMd}}>{currentPage+1} / {pages.length}</span>
          <span style={{...UI,fontSize:9,color:T.textSm}}>pages</span>
        </div>
      </div>

      {/* ══ START MODAL ══════════════════════════════════════════════════════ */}
      {showTplModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
          <div style={{background:T.bgPanel,borderRadius:16,width:'min(900px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,.2)',border:`1px solid ${T.border}`}}>
            <div style={{padding:'24px 28px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <h2 style={{...UI,margin:'0 0 4px',fontSize:20,fontWeight:800,color:T.text,letterSpacing:'-.02em'}}>Start designing</h2>
                <p style={{...UI,margin:0,fontSize:13,color:T.textMd}}>Choose a canvas size or start with a layout</p>
              </div>
              {pages.length>0&&<button onClick={()=>setShowTplModal(false)} style={{background:T.bgApp,border:`1px solid ${T.border}`,cursor:'pointer',color:T.textMd,padding:8,borderRadius:8,display:'flex',alignItems:'center'}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>}
            </div>
            <div style={{overflow:'auto',padding:'20px 28px',flex:1}}>
              <div style={{...UI,fontSize:9,fontWeight:800,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Blank Canvas</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:6,marginBottom:24}}>
                {CANVAS_SIZES.map(s=>(
                  <button key={s.id} onClick={()=>startBlank(s.id)}
                    style={{...UI,padding:'11px 8px',border:`1px solid ${T.border}`,borderRadius:10,background:'#fff',cursor:'pointer',textAlign:'center',transition:'all .15s'}}
                    onMouseOver={e=>{(e.currentTarget).style.borderColor=T.accent;(e.currentTarget).style.background=T.accentLt}}
                    onMouseOut={e=>{(e.currentTarget).style.borderColor=T.border;(e.currentTarget).style.background='#fff'}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:3}}>{s.label}</div>
                    <div style={{fontSize:9,color:T.textSm,fontFamily:"'JetBrains Mono',monospace"}}>{s.dims}</div>
                  </button>
                ))}
              </div>
              <div style={{...UI,fontSize:9,fontWeight:800,color:T.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Start with a Layout</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:8}}>
                {LAYOUTS.map(l=>(
                  <div key={l.id} className="layout-card" style={{border:`1px solid ${T.border}`}} onClick={()=>{
                    const size=CANVAS_SIZES[0]
                    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
                    const built=l.build(size.w,size.h)
                    pagesRef.current=[built];setPages([built]);setCurrentPage(0);currentPageRef.current=0
                    setShowTplModal(false);setThumbnails({})
                    waitForFabricThenLoad(built,size.w,size.h)
                  }}>
                    <div style={{aspectRatio:'16/9',background:l.build(160,90).background||'#f8f9fa',padding:4,position:'relative',overflow:'hidden'}}>
                      {l.build(160,90).objects?.slice(0,6).map((o:any,oi:number)=>(
                        o.type==='rect'&&<div key={oi} style={{position:'absolute',left:`${(o.left/160)*100}%`,top:`${(o.top/90)*100}%`,width:`${Math.min((o.width/160)*100,100)}%`,height:`${Math.min((o.height/90)*100,100)}%`,background:o.fill,borderRadius:o.rx?2:0,opacity:Math.min(o.opacity??1,1)}}/>
                      ))}
                    </div>
                    <div style={{padding:'6px 9px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${T.border}`}}>
                      <span style={{...UI,fontSize:10,fontWeight:600,color:T.textMd}}>{l.label}</span>
                      <span style={{...UI,fontSize:8,color:T.textSm,background:T.bgApp,padding:'1px 5px',borderRadius:8}}>{l.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ RE-LAYOUT MODAL ═════════════════════════════════════════════════ */}
      {showRelayout&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
          <div style={{background:T.bgPanel,borderRadius:16,width:'min(700px,96vw)',maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,.2)',border:`1px solid ${T.border}`}}>
            <div style={{padding:'20px 24px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <h2 style={{...UI,margin:'0 0 3px',fontSize:17,fontWeight:800,color:T.text}}>Re-Layout Content</h2>
                <p style={{...UI,margin:0,fontSize:12,color:T.textMd}}>Your existing text and images will be mapped into the new layout</p>
              </div>
              <button onClick={()=>setShowRelayout(false)} style={{background:T.bgApp,border:`1px solid ${T.border}`,cursor:'pointer',color:T.textMd,padding:7,borderRadius:8,display:'flex',alignItems:'center'}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{overflow:'auto',padding:'16px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:7}}>
                {LAYOUTS.filter(l=>(l as any).zones?.length>0).map(l=>(
                  <div key={l.id} className="layout-card" onClick={()=>doRelayout(l)}>
                    <div style={{aspectRatio:'16/9',background:l.build(160,90).background||'#f8f9fa',padding:4,position:'relative',overflow:'hidden'}}>
                      {l.build(160,90).objects?.slice(0,6).map((o:any,oi:number)=>(
                        o.type==='rect'&&<div key={oi} style={{position:'absolute',left:`${(o.left/160)*100}%`,top:`${(o.top/90)*100}%`,width:`${Math.min((o.width/160)*100,100)}%`,height:`${Math.min((o.height/90)*100,100)}%`,background:o.fill,borderRadius:o.rx?2:0}}/>
                      ))}
                      {/* Zone overlays */}
                      {(l as any).zones?.map((z:Zone)=>(
                        <div key={z.id} style={{position:'absolute',left:`${z.bounds.x*100}%`,top:`${z.bounds.y*100}%`,width:`${z.bounds.w*100}%`,height:`${z.bounds.h*100}%`,border:`1.5px dashed ${T.accent}`,borderRadius:2,background:'rgba(79,70,229,.06)'}}/>
                      ))}
                    </div>
                    <div style={{padding:'6px 8px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${T.border}`}}>
                      <span style={{...UI,fontSize:10,fontWeight:600,color:T.textMd}}>{l.label}</span>
                      <span style={{...UI,fontSize:7,color:T.accent,fontWeight:700}}>{(l as any).zones?.length} zones</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ SHARE MODAL ═════════════════════════════════════════════════════ */}
      {showShare&&(
        <ShareModal documentId={params.id} links={shareLinks} onClose={()=>setShowShare(false)} onRefresh={loadShareLinks} isActive={isActive} onPublish={publishDocument}/>
      )}

      {/* ══ DELETE CONFIRM ══════════════════════════════════════════════════ */}
      {showDeleteConfirm&&(
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.3)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)'}}>
          <div style={{background:T.bgPanel,borderRadius:14,padding:'28px 30px',width:380,boxShadow:'0 20px 60px rgba(0,0,0,.15)',border:`1px solid ${T.border}`}}>
            <div style={{width:40,height:40,borderRadius:10,background:'#fef2f2',border:`1px solid #fecaca`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M8 12.5v.5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <h3 style={{...UI,fontSize:16,fontWeight:800,color:T.text,margin:'0 0 7px',letterSpacing:'-.01em'}}>Delete document?</h3>
            <p style={{...UI,fontSize:13,color:T.textMd,margin:'0 0 22px',lineHeight:1.6}}>This permanently deletes this document and all its share links. This cannot be undone.</p>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowDeleteConfirm(false)} className="sec-btn">Cancel</button>
              <button onClick={deleteDocument} disabled={deleting} style={{...UI,padding:'7px 16px',borderRadius:8,border:'none',background:T.red,color:'white',cursor:'pointer',fontSize:12,fontWeight:700,opacity:deleting?.6:1,transition:'all .14s'}}>
                {deleting?'Deleting…':'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ AI DRAFTER ══════════════════════════════════════════════════════ */}
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
    </div>
  )
}