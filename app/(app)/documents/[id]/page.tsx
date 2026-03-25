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

// ─── Constants ────────────────────────────────────────────────────────────────
const UNSPLASH = 'https://source.unsplash.com'
const PEXELS_CURATED = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1280&q=80',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1280&q=80',
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1280&q=80',
  'https://images.unsplash.com/photo-1553484771-047a44eee27b?w=1280&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1280&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1280&q=80',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1280&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1280&q=80',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1280&q=80',
]

const CANVAS_SIZES = [
  { id:'pres-169', label:'Presentation 16:9', w:1280, h:720,  cat:'Presentation', dims:'1280×720' },
  { id:'pres-43',  label:'Presentation 4:3',  w:1024, h:768,  cat:'Presentation', dims:'1024×768' },
  { id:'a4-port',  label:'A4 Portrait',        w:794,  h:1123, cat:'Document',     dims:'794×1123' },
  { id:'a4-land',  label:'A4 Landscape',       w:1123, h:794,  cat:'Document',     dims:'1123×794' },
  { id:'a3-port',  label:'A3 Portrait',        w:1123, h:1587, cat:'Document',     dims:'1123×1587' },
  { id:'us-letter',label:'US Letter',          w:816,  h:1056, cat:'Document',     dims:'816×1056' },
  { id:'square',   label:'Square 1:1',         w:1080, h:1080, cat:'Social',       dims:'1080×1080' },
  { id:'story',    label:'Story / Reel',       w:540,  h:960,  cat:'Social',       dims:'540×960' },
  { id:'linkedin', label:'LinkedIn Banner',    w:1584, h:396,  cat:'Social',       dims:'1584×396' },
  { id:'twitter',  label:'Twitter Header',     w:1500, h:500,  cat:'Social',       dims:'1500×500' },
]

const FONTS = [
  'Jost','Inter','Space Grotesk','DM Sans','Outfit','Plus Jakarta Sans','Syne','Archivo',
  'Nunito Sans','Source Sans 3','IBM Plex Sans','Rubik','Work Sans','Barlow','Mulish','Lato',
  'Open Sans','Raleway','Montserrat','Oswald','Bebas Neue','Anton','Teko','Exo 2',
  'Playfair Display','Cormorant Garamond','Libre Baskerville','Merriweather','EB Garamond',
  'Lora','Crimson Text','Cardo','Spectral','Arvo','PT Serif','Zilla Slab','Bodoni Moda',
  'DM Mono','Roboto Mono','IBM Plex Mono','Space Mono','JetBrains Mono','Fira Code',
  'Source Code Pro','Courier Prime','Oxanium','Chakra Petch','Share Tech Mono',
  'Pacifico','Righteous','Fredoka One','Comfortaa','Caveat','Dancing Script',
  'Great Vibes','Sacramento','Satisfy','Abril Fatface','Alfa Slab One','Passion One',
  'Boogaloo','Lobster','Bungee','Russo One','Cinzel','Noto Sans','Noto Serif',
  'Poppins','Quicksand','Varela Round','Nunito','Josefin Sans','Karla','Manrope',
  'Geist','Ubuntu','Cabin','Maven Pro','Titillium Web','Encode Sans',
]

const TEMPLATES = [
  { id:'pitch',      cat:'startup',   label:'Pitch Deck',           desc:'Seed to Series B',    pages:8,  size:'pres-169' },
  { id:'inv-update', cat:'startup',   label:'Investor Update',      desc:'Monthly/quarterly',   pages:4,  size:'a4-port'  },
  { id:'roadmap',    cat:'startup',   label:'Product Roadmap',      desc:'Quarterly roadmap',   pages:5,  size:'pres-169' },
  { id:'exec-sum',   cat:'startup',   label:'Executive Summary',    desc:'1-page overview',     pages:1,  size:'a4-port'  },
  { id:'proposal',   cat:'freelance', label:'Client Proposal',      desc:'Win more clients',    pages:6,  size:'a4-port'  },
  { id:'invoice',    cat:'freelance', label:'Invoice',              desc:'Professional billing',pages:1,  size:'a4-port'  },
  { id:'scope',      cat:'freelance', label:'Project Scope',        desc:'Define deliverables', pages:3,  size:'a4-port'  },
  { id:'case-study', cat:'freelance', label:'Case Study',           desc:'Showcase your work',  pages:5,  size:'pres-169' },
  { id:'portfolio',  cat:'freelance', label:'Portfolio Deck',       desc:'Show your best work', pages:8,  size:'pres-169' },
  { id:'biz-plan',   cat:'business',  label:'Business Plan',        desc:'Full business plan',  pages:12, size:'a4-port'  },
  { id:'sales-deck', cat:'business',  label:'Sales Deck',           desc:'Close deals faster',  pages:8,  size:'pres-169' },
  { id:'company',    cat:'business',  label:'Company Overview',     desc:'Who you are',         pages:5,  size:'pres-169' },
  { id:'brand',      cat:'marketing', label:'Brand Guidelines',     desc:'Brand system',        pages:8,  size:'pres-169' },
  { id:'media-kit',  cat:'marketing', label:'Press & Media Kit',    desc:'For press/partners',  pages:5,  size:'a4-port'  },
  { id:'mktg-plan',  cat:'marketing', label:'Marketing Plan',       desc:'Campaign strategy',   pages:7,  size:'pres-169' },
  { id:'q-report',   cat:'report',    label:'Quarterly Report',     desc:'Q-over-Q review',     pages:8,  size:'pres-169' },
  { id:'annual',     cat:'report',    label:'Annual Report',        desc:'Year in review',      pages:12, size:'a4-port'  },
  { id:'research',   cat:'report',    label:'Market Research',      desc:'Data-driven insights',pages:6,  size:'pres-169' },
]

const TPL_CATS = [
  { id:'startup',   label:'Startup & Fundraising' },
  { id:'freelance', label:'Freelance & Agency'    },
  { id:'business',  label:'Business & Strategy'   },
  { id:'marketing', label:'Marketing & Brand'     },
  { id:'report',    label:'Reports & Analysis'    },
]

// ─── Layout library with Unsplash images ─────────────────────────────────────
const LAYOUTS = [
  {
    id:'full-bleed-dark', label:'Full Bleed Dark', category:'Hero',
    preview:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=60',
    build:(W:number,H:number,fab:any)=>([
      fab.Image, `https://images.unsplash.com/photo-1497366216548-37526070297c?w=${W}&q=80`,
      {left:0,top:0,scaleX:W/1280,scaleY:H/720,selectable:true,crossOrigin:'anonymous'},
      fab.Rect, {left:0,top:0,width:W,height:H,fill:'rgba(0,0,0,.55)',selectable:false},
      fab.Textbox, 'Your Headline Goes Here', {left:Math.round(W*.07),top:Math.round(H*.35),width:Math.round(W*.56),fontSize:Math.round(W*0.048),fontFamily:'Jost',fontWeight:'700',fill:'#ffffff',editable:true},
      fab.Textbox, 'Supporting subtext that adds context', {left:Math.round(W*.07),top:Math.round(H*.35)+Math.round(W*0.048)+16,width:Math.round(W*.5),fontSize:Math.round(W*0.018),fontFamily:'Jost',fill:'rgba(255,255,255,.75)',editable:true},
    ]),
  },
  {
    id:'split-image-right', label:'Split — Image Right', category:'Split',
    preview:'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=60',
    build:null,
  },
  {
    id:'centered-light', label:'Centered Light', category:'Hero',
    preview:'https://images.unsplash.com/photo-1553484771-047a44eee27b?w=400&q=60',
    build:null,
  },
  {
    id:'magazine', label:'Magazine', category:'Editorial',
    preview:'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=60',
    build:null,
  },
  {
    id:'data-hero', label:'Data Hero', category:'Metrics',
    preview:'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=60',
    build:null,
  },
  {
    id:'team-photo', label:'Team Photo', category:'People',
    preview:'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=60',
    build:null,
  },
  {
    id:'dark-minimal', label:'Dark Minimal', category:'Minimal',
    preview:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=60',
    build:null,
  },
  {
    id:'gradient-hero', label:'Gradient Hero', category:'Hero',
    preview:'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&q=60',
    build:null,
  },
  {
    id:'quote-dark', label:'Pull Quote', category:'Editorial',
    preview:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&q=60',
    build:null,
  },
  {
    id:'three-cols', label:'3 Column', category:'Content',
    preview:'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=60',
    build:null,
  },
  {
    id:'timeline', label:'Timeline', category:'Process',
    preview:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=60',
    build:null,
  },
  {
    id:'invoice-clean', label:'Invoice', category:'Document',
    preview:'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=60',
    build:null,
  },
]

const LAYOUT_CATS = ['All','Hero','Split','Editorial','Metrics','Content','Minimal','Process','Document','People']

// ─── page builder helpers ─────────────────────────────────────────────────────
function pg(bg='#ffffff',objects:any[]=[]) { return {version:'5.3.0',objects,background:bg} }
function tx(text:string,o:any={}):any {
  return {type:'textbox',left:o.l??60,top:o.t??60,width:o.w??400,text,
    fontSize:o.fs??16,fontFamily:o.ff??'Jost',fill:o.fill??'#0f172a',
    fontWeight:o.fw??'400',lineHeight:o.lh??1.4,textAlign:o.ta??'left',
    opacity:1,selectable:true,editable:true}
}
function bx(o:any={}):any {
  return {type:'rect',left:o.l??0,top:o.t??0,width:o.w??200,height:o.h??60,
    fill:o.fill??'#4f46e5',rx:o.rx??0,ry:o.rx??0,selectable:true,opacity:o.op??1}
}
function fs(W:number,base:number):number { return Math.max(Math.round(base*(W/1280)),Math.round(base*0.55)) }

// ─── Template builder ─────────────────────────────────────────────────────────
function buildTemplate(id:string, sizeId:string):any[] {
  const size = CANVAS_SIZES.find(s=>s.id===sizeId)||CANVAS_SIZES[0]
  const W=size.w, H=size.h
  switch(id) {
    case 'pitch':      return pitchDeck(W,H)
    case 'proposal':   return proposal(W,H)
    case 'invoice':    return invoice(W,H)
    case 'q-report':   return qReport(W,H)
    case 'brand':      return brand(W,H)
    case 'case-study': return caseStudy(W,H)
    case 'sales-deck': return salesDeck(W,H)
    default:           return pitchDeck(W,H)
  }
}

function pitchDeck(W:number,H:number):any[] {
  const acc='#4f46e5'
  return [
    // 1 Cover
    pg('#070a1a',[
      bx({l:0,t:0,w:W,h:H,fill:'#070a1a'}),
      bx({l:0,t:H-3,w:W,h:3,fill:acc}),
      bx({l:56,t:Math.round(H*.36),w:3,h:Math.round(H*.28),fill:acc}),
      tx('COMPANY NAME',{l:76,t:Math.round(H*.36),fs:fs(W,46),fw:'800',fill:'#ffffff',w:W-140,ff:'Jost'}),
      tx('The one-sentence pitch that makes investors stop everything.',{l:76,t:Math.round(H*.36)+fs(W,46)+18,fs:fs(W,18),fill:'rgba(255,255,255,.55)',w:Math.round(W*.7),ff:'Jost'}),
      tx('Series A  ·  2025',{l:76,t:H-52,fs:11,fill:acc,w:200,ff:'JetBrains Mono'}),
    ]),
    // 2 Problem
    pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:acc}),
      tx('The Problem',{l:60,t:52,fs:fs(W,36),fw:'700',fill:'#0f172a',w:W-120}),
      bx({l:60,t:52+fs(W,36)+14,w:48,h:3,fill:acc,rx:2}),
      bx({l:60,t:Math.round(H*.34),w:Math.round((W-140)*.48),h:Math.round(H*.44),fill:'#f0f9ff',rx:14}),
      tx('Pain Point One',{l:80,t:Math.round(H*.34)+22,fs:fs(W,17),fw:'700',fill:'#0ea5e9',w:Math.round((W-140)*.48)-40}),
      tx('The specific frustration your users deal with every single day.',{l:80,t:Math.round(H*.34)+22+fs(W,17)+10,fs:13,fill:'#475569',w:Math.round((W-140)*.48)-40,lh:1.65}),
      bx({l:Math.round(W*.53),t:Math.round(H*.34),w:Math.round((W-140)*.48),h:Math.round(H*.44),fill:'#fdf4ff',rx:14}),
      tx('Pain Point Two',{l:Math.round(W*.53)+20,t:Math.round(H*.34)+22,fs:fs(W,17),fw:'700',fill:'#8b5cf6',w:Math.round((W-140)*.48)-40}),
      tx('The compounding secondary problem that makes things worse.',{l:Math.round(W*.53)+20,t:Math.round(H*.34)+22+fs(W,17)+10,fs:13,fill:'#475569',w:Math.round((W-140)*.48)-40,lh:1.65}),
    ]),
    // 3 Solution
    pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:acc}),
      tx('Our Solution',{l:60,t:52,fs:fs(W,36),fw:'700',fill:'#0f172a',w:W-120}),
      bx({l:60,t:52+fs(W,36)+14,w:48,h:3,fill:acc,rx:2}),
      ...[0,1,2].flatMap((i:number)=>{
        const cw=Math.round((W-160)/3), cx=60+i*(cw+20)
        const cols=['#0f172a','#f0fdf4','#f0f9ff']
        const textCols=['#4f46e5','#10b981','#0ea5e9']
        const textFills=['#ffffff','#0f172a','#0f172a']
        return [
          bx({l:cx,t:Math.round(H*.34),w:cw,h:Math.round(H*.44),fill:cols[i],rx:16}),
          tx(`0${i+1}`,{l:cx+20,t:Math.round(H*.34)+18,fs:fs(W,28),fw:'700',fill:textCols[i],w:cw-40,ff:'JetBrains Mono'}),
          tx(`Feature ${i+1}`,{l:cx+20,t:Math.round(H*.34)+18+fs(W,28)+10,fs:fs(W,16),fw:'600',fill:textFills[i],w:cw-40}),
          tx('What it does and the exact benefit it delivers.',{l:cx+20,t:Math.round(H*.34)+18+fs(W,28)+10+fs(W,16)+10,fs:12,fill:textFills[i]==='#ffffff'?'rgba(255,255,255,.6)':'#64748b',w:cw-40,lh:1.5}),
        ]
      }),
    ]),
    // 4 Traction
    pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:acc}),
      tx('Traction',{l:60,t:52,fs:fs(W,36),fw:'700',fill:'#0f172a',w:W-120}),
      bx({l:60,t:52+fs(W,36)+14,w:48,h:3,fill:acc,rx:2}),
      ...[['$0M','ARR','#eff6ff','#4f46e5'],['0K','Customers','#f0fdf4','#10b981'],['0%','Monthly Growth','#fff7ed','#f59e0b'],['#0','NPS Score','#fdf4ff','#8b5cf6']].flatMap(([val,lbl,bg,col]:any,i:number)=>{
        const cw=Math.round((W-160)/4), cx=60+i*(cw+13)
        return [
          bx({l:cx,t:Math.round(H*.34),w:cw,h:130,fill:bg,rx:14}),
          tx(val,{l:cx+16,t:Math.round(H*.34)+16,fs:fs(W,36),fw:'700',fill:col,w:cw-32,ff:'Jost'}),
          tx(lbl,{l:cx+16,t:Math.round(H*.34)+16+fs(W,36)+8,fs:10,fill:'#94a3b8',w:cw-32,ff:'JetBrains Mono'}),
        ]
      }),
    ]),
    // 5 Market
    pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:acc}),
      tx('Market Opportunity',{l:60,t:52,fs:fs(W,36),fw:'700',fill:'#0f172a',w:W-120}),
      bx({l:60,t:52+fs(W,36)+14,w:48,h:3,fill:acc,rx:2}),
      bx({l:60,t:Math.round(H*.3),w:Math.round(W*.42),h:Math.round(H*.5),fill:'#f8fafc',rx:14}),
      tx('TAM',{l:80,t:Math.round(H*.3)+20,fs:10,fw:'700',fill:acc,w:200,ff:'JetBrains Mono'}),
      tx('$XXB',{l:80,t:Math.round(H*.3)+40,fs:fs(W,40),fw:'800',fill:'#0f172a',w:Math.round(W*.42)-40}),
      tx('Total Addressable Market',{l:80,t:Math.round(H*.3)+40+fs(W,40)+8,fs:13,fill:'#64748b',w:Math.round(W*.42)-40}),
      tx('Why now is the right time to solve this problem.',{l:Math.round(W*.53),t:Math.round(H*.3)+10,fs:fs(W,20),fw:'600',fill:'#0f172a',w:Math.round(W*.4),lh:1.4}),
      tx('The macro trend or technology shift that makes your solution possible and timely.',{l:Math.round(W*.53),t:Math.round(H*.3)+10+fs(W,20)+20,fs:14,fill:'#64748b',w:Math.round(W*.4),lh:1.65}),
    ]),
    // 6 Team
    pg('#f8fafc',[
      bx({l:0,t:0,w:W,h:4,fill:acc}),
      tx('The Team',{l:60,t:52,fs:fs(W,36),fw:'700',fill:'#0f172a',w:W-120}),
      bx({l:60,t:52+fs(W,36)+14,w:48,h:3,fill:acc,rx:2}),
      ...[['CEO / Co-Founder','Previously at [Company]. Led X.'],['CTO / Co-Founder','Built [product] used by XM users.'],['Head of Growth','Grew [company] from $0 to $XM ARR.']].flatMap(([role,bio]:any,i:number)=>{
        const cw=Math.round((W-160)/3), cx=60+i*(cw+20)
        return [
          bx({l:cx,t:Math.round(H*.34),w:cw,h:Math.round(H*.46),fill:'#ffffff',rx:16}),
          bx({l:cx+Math.round(cw/2)-30,t:Math.round(H*.34)+20,w:60,h:60,fill:'#e0e7ff',rx:30}),
          tx('Name Here',{l:cx+16,t:Math.round(H*.34)+96,fs:fs(W,16),fw:'700',fill:'#0f172a',w:cw-32,ta:'center'}),
          tx(role,{l:cx+16,t:Math.round(H*.34)+96+fs(W,16)+8,fs:11,fw:'600',fill:acc,w:cw-32,ta:'center'}),
          tx(bio,{l:cx+16,t:Math.round(H*.34)+96+fs(W,16)+32,fs:11,fill:'#64748b',w:cw-32,ta:'center',lh:1.5}),
        ]
      }),
    ]),
    // 7 The Ask
    pg('#ffffff',[
      bx({l:0,t:0,w:W,h:4,fill:acc}),
      tx('The Ask',{l:60,t:52,fs:fs(W,36),fw:'700',fill:'#0f172a',w:W-120}),
      bx({l:60,t:52+fs(W,36)+14,w:48,h:3,fill:acc,rx:2}),
      bx({l:60,t:Math.round(H*.3),w:W-120,h:76,fill:'#0f172a',rx:12}),
      tx('Raising $X.XM Seed Round',{l:80,t:Math.round(H*.3)+18,fs:fs(W,28),fw:'700',fill:'#ffffff',w:W-160}),
      ...['40% — Product & Engineering','30% — Sales & Growth','20% — Marketing','10% — Operations'].flatMap((item:string,i:number)=>[
        tx(item,{l:80+Math.round(i%2)*Math.round((W-180)/2),t:Math.round(H*.5)+i*28,fs:13,fill:i<2?'#0f172a':'#64748b',fw:i<2?'600':'400',w:Math.round((W-180)/2)}),
      ]),
    ]),
    // 8 Thank You
    pg(acc,[
      tx('Thank you.',{l:60,t:Math.round(H*.32),fs:fs(W,68),fw:'800',fill:'#ffffff',w:W-120,ff:'Jost'}),
      tx("Questions? Let's build something great together.",{l:60,t:Math.round(H*.32)+fs(W,68)+22,fs:fs(W,18),fill:'rgba(255,255,255,.65)',w:Math.round(W*.65)}),
      tx('hello@company.com',{l:60,t:H-56,fs:13,fill:'rgba(255,255,255,.5)',w:300,ff:'JetBrains Mono'}),
    ]),
  ]
}

function proposal(W:number,H:number):any[] {
  const acc='#4f46e5'
  return [
    pg('#f8fafc',[
      bx({l:0,t:0,w:Math.round(W*.27),h:H,fill:'#0f172a'}),
      tx('PROJECT\nPROPOSAL',{l:26,t:56,fs:fs(W,22),fw:'800',fill:'#ffffff',w:Math.round(W*.27)-52,lh:1.05,ff:'Jost'}),
      bx({l:26,t:56+fs(W,22)*2+24,w:32,h:3,fill:acc}),
      tx('Prepared for',{l:26,t:56+fs(W,22)*2+44,fs:9,fill:'rgba(255,255,255,.4)',w:Math.round(W*.27)-52,ff:'JetBrains Mono'}),
      tx('Client Name',{l:26,t:56+fs(W,22)*2+60,fs:fs(W,14),fw:'600',fill:'#ffffff',w:Math.round(W*.27)-52}),
      tx('Month YYYY',{l:26,t:H-46,fs:9,fill:'rgba(255,255,255,.3)',w:200,ff:'JetBrains Mono'}),
      tx('Proposal\nTitle Goes\nHere',{l:Math.round(W*.31),t:Math.round(H*.12),fs:fs(W,42),fw:'700',fill:'#0f172a',w:Math.round(W*.62),lh:1.08,ff:'Jost'}),
      tx('A compelling one-sentence summary of what this proposal delivers and why.',{l:Math.round(W*.31),t:Math.round(H*.12)+fs(W,42)*3+20,fs:fs(W,14),fill:'#64748b',w:Math.round(W*.62),lh:1.65}),
    ]),
    pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:acc}),
      tx('Executive Summary',{l:50,t:52,fs:fs(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      bx({l:50,t:52+fs(W,28)+12,w:W-100,h:1,fill:'#e2e8f0'}),
      tx('Describe the context, the core challenge, and what makes this proposal the right solution at the right time.',{l:50,t:52+fs(W,28)+30,fs:fs(W,14),fill:'#475569',w:W-100,lh:1.7}),
      bx({l:50,t:Math.round(H*.5),w:Math.round((W-120)/2),h:120,fill:'#eff6ff',rx:12}),
      tx('Challenge',{l:70,t:Math.round(H*.5)+18,fs:fs(W,15),fw:'700',fill:acc,w:Math.round((W-120)/2)-40}),
      tx('Define the core problem clearly.',{l:70,t:Math.round(H*.5)+18+fs(W,15)+8,fs:12,fill:'#64748b',w:Math.round((W-120)/2)-40,lh:1.5}),
      bx({l:50+Math.round((W-120)/2)+20,t:Math.round(H*.5),w:Math.round((W-120)/2),h:120,fill:'#f0fdf4',rx:12}),
      tx('Solution',{l:70+Math.round((W-120)/2)+20,t:Math.round(H*.5)+18,fs:fs(W,15),fw:'700',fill:'#10b981',w:Math.round((W-120)/2)-40}),
      tx('How this proposal solves it.',{l:70+Math.round((W-120)/2)+20,t:Math.round(H*.5)+18+fs(W,15)+8,fs:12,fill:'#64748b',w:Math.round((W-120)/2)-40,lh:1.5}),
    ]),
    pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:acc}),
      tx('Scope & Deliverables',{l:50,t:52,fs:fs(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      bx({l:50,t:52+fs(W,28)+12,w:W-100,h:1,fill:'#e2e8f0'}),
      ...[
        ['Phase 1 — Discovery & Strategy','Week 1–2','Research brief, competitive analysis'],
        ['Phase 2 — Design & Build','Week 3–6','Wireframes, design system, working product'],
        ['Phase 3 — Launch & Handoff','Week 7–8','QA, documentation, launch support'],
      ].flatMap(([phase,time,del]:string[],i:number)=>[
        bx({l:50,t:Math.round(H*.34)+i*100,w:20,h:20,fill:acc,rx:4}),
        tx(phase,{l:80,t:Math.round(H*.34)+i*100+1,fs:fs(W,16),fw:'600',fill:'#0f172a',w:W-140}),
        tx(`${time}  ·  ${del}`,{l:80,t:Math.round(H*.34)+i*100+1+fs(W,16)+6,fs:12,fill:'#64748b',w:W-140}),
      ]),
    ]),
    pg('#0f172a',[
      tx('Investment',{l:60,t:60,fs:fs(W,32),fw:'700',fill:'#ffffff',w:W-120}),
      bx({l:60,t:60+fs(W,32)+24,w:W-120,h:88,fill:'#1e293b',rx:14}),
      tx('$XX,000',{l:80,t:60+fs(W,32)+40,fs:fs(W,40),fw:'800',fill:acc,w:400,ff:'Jost'}),
      tx('Total project investment',{l:80,t:60+fs(W,32)+40+fs(W,40)+8,fs:11,fill:'#64748b',w:300}),
      tx('50% due on project start  ·  50% on final delivery',{l:60,t:60+fs(W,32)+130,fs:14,fill:'rgba(255,255,255,.5)',w:W-120}),
      tx('All work is guaranteed. Not satisfied? Get your money back.',{l:60,t:60+fs(W,32)+156,fs:14,fill:'rgba(255,255,255,.5)',w:W-120}),
    ]),
  ]
}

function invoice(W:number,H:number):any[] {
  return [
    pg('#ffffff',[
      bx({l:0,t:0,w:W,h:5,fill:'#4f46e5'}),
      tx('INVOICE',{l:60,t:38,fs:fs(W,32),fw:'800',fill:'#0f172a',w:300,ff:'Jost'}),
      tx('#INV-0001',{l:60,t:38+fs(W,32)+8,fs:12,fill:'#4f46e5',w:200,ff:'JetBrains Mono'}),
      tx('Issue date: DD/MM/YYYY\nDue date: DD/MM/YYYY',{l:W-280,t:38,fs:12,fill:'#475569',w:220,ta:'right',lh:1.65,ff:'JetBrains Mono'}),
      bx({l:60,t:140,w:W-120,h:1,fill:'#e2e8f0'}),
      tx('Bill To',{l:60,t:160,fs:9,fw:'700',fill:'#94a3b8',w:200,ff:'JetBrains Mono'}),
      tx('Client Company Name\nContact Person\nclient@email.com\nCity, Country',{l:60,t:178,fs:13,fill:'#0f172a',w:300,lh:1.7}),
      tx('From',{l:W-260,t:160,fs:9,fw:'700',fill:'#94a3b8',w:200,ta:'right',ff:'JetBrains Mono'}),
      tx('Your Name / Company\nyour@email.com\n+00 000 000 0000\nyourwebsite.com',{l:W-260,t:178,fs:13,fill:'#0f172a',w:200,ta:'right',lh:1.7}),
      bx({l:60,t:320,w:W-120,h:38,fill:'#0f172a',rx:7}),
      tx('Description',{l:76,t:330,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.48)}),
      tx('Qty',{l:60+Math.round((W-120)*.48),t:330,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.14),ta:'center'}),
      tx('Rate',{l:60+Math.round((W-120)*.62),t:330,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.18),ta:'right'}),
      tx('Amount',{l:60+Math.round((W-120)*.8),t:330,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.2),ta:'right'}),
      ...[0,1,2].flatMap((i:number)=>[
        bx({l:60,t:368+i*48,w:W-120,h:48,fill:i%2===0?'#f8fafc':'#ffffff'}),
        tx('Service or deliverable description',{l:76,t:378+i*48,fs:12,fill:'#0f172a',w:Math.round((W-120)*.48)}),
        tx('1',{l:60+Math.round((W-120)*.48),t:378+i*48,fs:12,fill:'#0f172a',w:Math.round((W-120)*.14),ta:'center'}),
        tx('$0,000.00',{l:60+Math.round((W-120)*.62),t:378+i*48,fs:12,fill:'#0f172a',w:Math.round((W-120)*.18),ta:'right',ff:'JetBrains Mono'}),
        tx('$0,000.00',{l:60+Math.round((W-120)*.8),t:378+i*48,fs:12,fill:'#0f172a',w:Math.round((W-120)*.2),ta:'right',fw:'600',ff:'JetBrains Mono'}),
      ]),
      bx({l:60,t:368+3*48,w:W-120,h:1,fill:'#e2e8f0'}),
      tx('Total Due',{l:W-260,t:368+3*48+16,fs:13,fw:'700',fill:'#0f172a',w:200,ta:'right'}),
      tx('$0,000.00',{l:W-260,t:368+3*48+38,fs:fs(W,26),fw:'800',fill:'#4f46e5',w:200,ta:'right',ff:'Jost'}),
      tx('Payment terms: Net 30\nBank transfer: Bank · Account: XXXXXXXXXX · Sort: XX-XX-XX',{l:60,t:H-70,fs:10,fill:'#94a3b8',w:W-120,lh:1.5}),
    ]),
  ]
}

function qReport(W:number,H:number):any[] {
  const acc='#10b981'
  return [
    pg('#f8fafc',[
      bx({l:0,t:0,w:6,h:H,fill:acc}),
      tx('QUARTERLY\nREPORT',{l:40,t:60,fs:fs(W,54),fw:'800',fill:'#0f172a',w:Math.round(W*.55),lh:0.98,ff:'Jost'}),
      tx('Q1 2025',{l:40,t:60+fs(W,54)*2+22,fs:fs(W,16),fill:acc,fw:'600',w:200,ff:'JetBrains Mono'}),
      tx('For the period January 1 – March 31, 2025',{l:40,t:60+fs(W,54)*2+50,fs:12,fill:'#64748b',w:400}),
      tx('Backread Platform  ·  Confidential',{l:40,t:H-46,fs:10,fill:'#94a3b8',w:400,ff:'JetBrains Mono'}),
    ]),
    pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:acc}),
      tx('Key Metrics',{l:50,t:52,fs:fs(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      ...[['0','Total Views','#ecfdf5',acc],['0:00','Avg Read Time','#eff6ff','#4f46e5'],['0%','Completion Rate','#fdf4ff','#8b5cf6'],['0','Documents Sent','#fff7ed','#f59e0b']].flatMap(([val,lbl,bg,col]:any,i:number)=>{
        const cw=Math.round((W-160)/4), cx=50+i*(cw+16)
        return [
          bx({l:cx,t:Math.round(H*.3),w:cw,h:140,fill:bg,rx:14}),
          tx(val,{l:cx+18,t:Math.round(H*.3)+18,fs:fs(W,40),fw:'700',fill:col,w:cw-36,ff:'Jost'}),
          tx(lbl,{l:cx+18,t:Math.round(H*.3)+18+fs(W,40)+8,fs:10,fill:'#94a3b8',w:cw-36,ff:'JetBrains Mono'}),
        ]
      }),
    ]),
    pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:acc}),
      tx('Highlights & Insights',{l:50,t:52,fs:fs(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      ...[['Highlight One','Describe what performed well this quarter and why it matters.'],['Highlight Two','A secondary insight worth noting for the period.'],['Area of Focus','Something that needs attention going into Q2.']].flatMap(([title,body]:string[],i:number)=>[
        bx({l:50,t:Math.round(H*.3)+i*100,w:W-100,h:84,fill:i===0?'#ecfdf5':i===1?'#f8fafc':'#fff7ed',rx:10}),
        tx(title,{l:72,t:Math.round(H*.3)+i*100+18,fs:fs(W,16),fw:'700',fill:i===0?acc:i===1?'#0f172a':'#f59e0b',w:W-140}),
        tx(body,{l:72,t:Math.round(H*.3)+i*100+18+fs(W,16)+8,fs:12,fill:'#64748b',w:W-140}),
      ]),
    ]),
  ]
}

function brand(W:number,H:number):any[] {
  return [
    pg('#0a0a0f',[
      bx({l:0,t:0,w:W,h:H,fill:'#0a0a0f'}),
      tx('BRAND\nGUIDELINES',{l:60,t:Math.round(H*.28),fs:fs(W,56),fw:'800',fill:'#ffffff',w:W-120,lh:0.96,ff:'Jost'}),
      bx({l:60,t:Math.round(H*.28)+fs(W,56)*2+28,w:72,h:4,fill:'#4f46e5',rx:2}),
      tx('2025 Brand System  ·  Confidential',{l:60,t:Math.round(H*.28)+fs(W,56)*2+52,fs:fs(W,13),fill:'rgba(255,255,255,.35)',w:500}),
    ]),
    pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      tx('Color System',{l:50,t:52,fs:fs(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      ...[['#0f172a','Obsidian'],['#4f46e5','Indigo'],['#10b981','Emerald'],['#f59e0b','Amber'],['#ef4444','Crimson'],['#ffffff','White']].flatMap(([col,name]:string[],i:number)=>[
        bx({l:50+i*Math.round((W-100)/6),t:Math.round(H*.34),w:Math.round((W-100)/6)-12,h:Math.round((W-100)/6)-12,fill:col,rx:14}),
        tx(name,{l:50+i*Math.round((W-100)/6),t:Math.round(H*.34)+Math.round((W-100)/6),fs:11,fw:'600',fill:'#0f172a',w:Math.round((W-100)/6)-12,ta:'center'}),
        tx(col,{l:50+i*Math.round((W-100)/6),t:Math.round(H*.34)+Math.round((W-100)/6)+18,fs:10,fill:'#94a3b8',w:Math.round((W-100)/6)-12,ta:'center',ff:'JetBrains Mono'}),
      ]),
    ]),
    pg('#f8fafc',[
      bx({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      tx('Typography',{l:50,t:52,fs:fs(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      tx('Display — Jost 800',{l:50,t:Math.round(H*.24),fs:fs(W,52),fw:'800',fill:'#0f172a',w:W-100,ff:'Jost'}),
      tx('Heading — Jost 700',{l:50,t:Math.round(H*.24)+fs(W,52)+16,fs:fs(W,30),fw:'700',fill:'#334155',w:W-100,ff:'Jost'}),
      tx('Body — Jost 400. Clear and readable at all sizes.',{l:50,t:Math.round(H*.24)+fs(W,52)+fs(W,30)+36,fs:fs(W,16),fill:'#64748b',w:W-100}),
      tx('MONO — JetBrains Mono 600. For data, code, labels.',{l:50,t:Math.round(H*.24)+fs(W,52)+fs(W,30)+36+fs(W,16)+16,fs:fs(W,13),fw:'600',fill:'#4f46e5',w:W-100,ff:'JetBrains Mono'}),
    ]),
  ]
}

function caseStudy(W:number,H:number):any[] {
  const acc='#ec4899'
  return [
    pg('#ffffff',[
      bx({l:0,t:0,w:W,h:5,fill:acc}),
      tx('CASE STUDY',{l:60,t:38,fs:10,fw:'700',fill:acc,w:200,ff:'JetBrains Mono'}),
      tx('How [Client] Achieved\nX% Growth with Backread',{l:60,t:64,fs:fs(W,42),fw:'700',fill:'#0f172a',w:W-120,lh:1.08,ff:'Jost'}),
      bx({l:60,t:64+fs(W,42)*2+28,w:W-120,h:1,fill:'#e2e8f0'}),
      ...[['Industry','SaaS / B2B'],['Company Size','50-200 employees'],['Time to Result','3 months'],['Key Metric','+47% engagement']].map(([lbl,val]:string[],i:number)=>
        tx(`${lbl}: ${val}`,{l:60+i*Math.round((W-120)/4),t:64+fs(W,42)*2+46,fs:11,fill:'#64748b',w:Math.round((W-120)/4),ff:'JetBrains Mono'})
      ),
    ]),
    pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:acc}),
      tx('The Challenge',{l:50,t:52,fs:fs(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      tx("Describe the client's core problem in vivid, specific terms. What was happening, what was at stake, and what had they already tried?",{l:50,t:52+fs(W,28)+24,fs:fs(W,15),fill:'#475569',w:W-100,lh:1.7}),
      bx({l:50,t:Math.round(H*.56),w:W-100,h:110,fill:'#fdf2f8',rx:14}),
      tx('"The specific quote from the client describing their pain, in their own words."',{l:72,t:Math.round(H*.56)+24,fs:fs(W,17),fill:acc,fw:'400',w:W-144,ff:'Jost',lh:1.5}),
      tx('— Client Name, Title at Company',{l:72,t:Math.round(H*.56)+24+fs(W,17)*3+12,fs:11,fill:'#94a3b8',w:W-144}),
    ]),
    pg('#0f172a',[
      tx('The Results',{l:60,t:56,fs:fs(W,36),fw:'700',fill:'#ffffff',w:W-120}),
      ...[['0%','Improvement in\nkey metric','#ec4899'],['0x','Faster than\nbefore','#ffffff'],['$0K','Saved per\nquarter','#10b981'],['0','New deals\nclosed','#f59e0b']].flatMap(([val,lbl,col]:any,i:number)=>{
        const cw=Math.round((W-160)/4), cx=60+i*(cw+13)
        return [
          bx({l:cx,t:Math.round(H*.3),w:cw,h:160,fill:'#1e293b',rx:16}),
          tx(val,{l:cx+16,t:Math.round(H*.3)+18,fs:fs(W,40),fw:'800',fill:col,w:cw-32,ff:'Jost'}),
          tx(lbl,{l:cx+16,t:Math.round(H*.3)+18+fs(W,40)+10,fs:12,fill:'#64748b',w:cw-32,lh:1.4}),
        ]
      }),
    ]),
  ]
}

function salesDeck(W:number,H:number):any[] {
  return [
    pg('#ffffff',[
      bx({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      tx('Sales Deck',{l:56,t:46,fs:10,fw:'700',fill:'#4f46e5',w:200,ff:'JetBrains Mono'}),
      tx('Your Product\nfor Their\nProblem',{l:56,t:80,fs:fs(W,48),fw:'700',fill:'#0f172a',w:Math.round(W*.48),lh:1.05,ff:'Jost'}),
      tx("One sentence that crystallizes exactly what you do and for whom.",{l:56,t:80+fs(W,48)*3+20,fs:fs(W,16),fill:'#64748b',w:Math.round(W*.46),lh:1.65}),
    ]),
  ]
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
  const [pages, setPages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTool, setActiveTool] = useState('select')
  const [activePanel, setActivePanel] = useState<string|null>(null)
  const [zoom, setZoom] = useState(0.62)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [fontColor, setFontColor] = useState('#0f172a')
  const [fillColor, setFillColor] = useState('#4f46e5')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('Jost')
  const [canvasW, setCanvasW] = useState(1280)
  const [canvasH, setCanvasH] = useState(720)
  const [isDragging, setIsDragging] = useState(false)
  const [tplCat, setTplCat] = useState('startup')
  const [fontSearch, setFontSearch] = useState('')
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [layoutCat, setLayoutCat] = useState('All')
  const [stockQuery, setStockQuery] = useState('business')
  const [stockImages, setStockImages] = useState<string[]>([])
  const [loadingStock, setLoadingStock] = useState(false)

  const saveTimer = useRef<NodeJS.Timeout|null>(null)
  const pagesRef = useRef<any[]>([])
  const currentPageRef = useRef(0)
  const cWRef = useRef(1280)
  const cHRef = useRef(720)

  useEffect(()=>{pagesRef.current=pages},[pages])
  useEffect(()=>{currentPageRef.current=currentPage},[currentPage])
  useEffect(()=>{cWRef.current=canvasW},[canvasW])
  useEffect(()=>{cHRef.current=canvasH},[canvasH])

  // Bootstrap
  useEffect(()=>{
    ;['https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap',].forEach(href=>{
      const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)
    })
    if(!(window as any).fabric){
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';document.head.appendChild(s)
    }
    if(!(window as any).jspdf){
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';document.head.appendChild(s)
    }
  },[])

  useEffect(()=>{loadDocument();loadShareLinks()},[params.id])

  async function loadDocument(){
    const {data}=await supabase.from('documents').select('*').eq('id',params.id).single()
    if(!data){router.push('/dashboard');return}
    setDoc(data);setTitle(data.title)
    const cd=(data as any).canvas_data
    if(cd?.pages?.length){
      setPages(cd.pages)
      if(cd.canvasW){setCanvasW(cd.canvasW);cWRef.current=cd.canvasW}
      if(cd.canvasH){setCanvasH(cd.canvasH);cHRef.current=cd.canvasH}
      setShowTplModal(false)
    } else setShowTplModal(true)
  }

  async function loadShareLinks(){
    const {data}=await supabase.from('share_links').select('*').eq('document_id',params.id).order('created_at',{ascending:false})
    setShareLinks(data??[])
  }

  // Init Fabric
  useEffect(()=>{
    const check=setInterval(()=>{
      if((window as any).fabric&&canvasEl.current&&!fabricRef.current){
        clearInterval(check)
        const fab=(window as any).fabric
        const fc=new fab.Canvas(canvasEl.current,{width:cWRef.current,height:cHRef.current,backgroundColor:'#ffffff',selection:true,preserveObjectStacking:true})
        fabricRef.current=fc
        fc.on('selection:created',(e:any)=>syncSel(e.selected?.[0]))
        fc.on('selection:updated',(e:any)=>syncSel(e.selected?.[0]))
        fc.on('selection:cleared',()=>setSelectedObj(null))
        fc.on('object:modified',()=>scheduleAutoSave())
        fc.on('object:added',()=>scheduleAutoSave())
        fc.on('object:removed',()=>scheduleAutoSave())
      }
    },100)
    return()=>clearInterval(check)
  },[])

  useEffect(()=>{
    if(!fabricRef.current||!pages[currentPage])return
    fabricRef.current.loadFromJSON(pages[currentPage],()=>fabricRef.current.renderAll())
  },[pages.length]) // eslint-disable-line

  function syncSel(obj:any){
    if(!obj)return
    setSelectedObj(obj)
    if(obj.fontSize)setFontSize(obj.fontSize)
    if(obj.fontFamily)setFontFamily(obj.fontFamily)
  }

  function scheduleAutoSave(){
    if(saveTimer.current)clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(()=>saveCanvas(),1500)
  }

  const saveCanvas=useCallback(async()=>{
    if(!fabricRef.current)return
    setSaving(true)
    const curJson=fabricRef.current.toJSON()
    const all=[...pagesRef.current];all[currentPageRef.current]=curJson
    setPages(all)
    await supabase.from('documents').update({canvas_data:{pages:all,canvasW:cWRef.current,canvasH:cHRef.current},updated_at:new Date().toISOString()} as any).eq('id',params.id)
    setSaving(false);setLastSaved(new Date())
  },[params.id])

  async function saveTitle(){await supabase.from('documents').update({title:title||'Untitled'}).eq('id',params.id)}

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

  // Stock image search using Unsplash source API
  async function searchStockImages(query:string){
    setLoadingStock(true)
    const keywords=['architecture','nature','technology','business','minimal','abstract','office','city','people','creative']
    const imgs=keywords.slice(0,10).map(k=>`https://source.unsplash.com/400x260/?${encodeURIComponent(query||k)}&sig=${Math.random().toString(36).slice(2)}`)
    setStockImages(imgs)
    setLoadingStock(false)
  }

  function addStockImage(url:string){
    const fab=(window as any).fabric;const fc=fabricRef.current;if(!fc||!fab)return
    fab.Image.fromURL(url,(img:any)=>{
      const scale=Math.min(cWRef.current/img.width,cHRef.current/img.height,1)
      img.set({left:0,top:0,scaleX:scale,scaleY:scale,crossOrigin:'anonymous'})
      fc.add(img);fc.setActiveObject(img);fc.renderAll()
    },{crossOrigin:'anonymous'})
  }

  // Page ops
  function switchPage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    setPages(upd);setCurrentPage(idx)
    fabricRef.current.loadFromJSON(upd[idx],()=>fabricRef.current.renderAll())
  }
  function addPage(){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[currentPageRef.current]=fabricRef.current.toJSON()
    const blank=pg(bgColor);const ni=currentPageRef.current+1
    upd.splice(ni,0,blank);setPages(upd);setCurrentPage(ni)
    fabricRef.current.clear();fabricRef.current.backgroundColor=bgColor;fabricRef.current.renderAll()
  }
  function removePage(idx:number){
    if(pagesRef.current.length<=1)return
    const upd=pagesRef.current.filter((_,i)=>i!==idx);setPages(upd)
    const ni=Math.min(currentPageRef.current,upd.length-1);setCurrentPage(ni)
    fabricRef.current?.loadFromJSON(upd[ni],()=>fabricRef.current.renderAll())
  }

  // Template
  function applyTemplate(id:string,sizeId:string){
    const size=CANVAS_SIZES.find(s=>s.id===sizeId)||CANVAS_SIZES[0]
    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
    const built=buildTemplate(id,sizeId)
    setPages(built);setCurrentPage(0);setShowTplModal(false)
    const doLoad=()=>{
      if(fabricRef.current){
        fabricRef.current.setWidth(size.w);fabricRef.current.setHeight(size.h)
        fabricRef.current.loadFromJSON(built[0],()=>fabricRef.current.renderAll())
      } else setTimeout(doLoad,100)
    }
    doLoad()
  }
  function startBlank(sizeId='pres-169'){
    const size=CANVAS_SIZES.find(s=>s.id===sizeId)||CANVAS_SIZES[0]
    setCanvasW(size.w);setCanvasH(size.h);cWRef.current=size.w;cHRef.current=size.h
    const blank=pg();setPages([blank]);setCurrentPage(0);setShowTplModal(false)
    const doLoad=()=>{
      if(fabricRef.current){
        fabricRef.current.setWidth(size.w);fabricRef.current.setHeight(size.h)
        fabricRef.current.clear();fabricRef.current.backgroundColor='#ffffff';fabricRef.current.renderAll()
      } else setTimeout(doLoad,100)
    }
    doLoad()
  }

  // Tools
  function addText(opts:any={}){
    const fab=(window as any).fabric;const fc=fabricRef.current;if(!fc||!fab)return
    const tb=new fab.Textbox(opts.text||'Click to edit',{left:100,top:100,width:opts.w||320,fontSize:opts.fs||24,fontFamily:opts.ff||fontFamily,fill:opts.fill||fontColor,fontWeight:opts.fw||'400',editable:true,lineHeight:1.4})
    fc.add(tb);fc.setActiveObject(tb);fc.renderAll()
  }
  function addShape(type:string,opts:any={}){
    const fab=(window as any).fabric;const fc=fabricRef.current;if(!fc||!fab)return
    const fill=opts.fill||fillColor
    let shape:any
    if(type==='rect')shape=new fab.Rect({left:100,top:100,width:220,height:110,fill,rx:opts.rx||0,ry:opts.rx||0})
    else if(type==='circle')shape=new fab.Circle({left:100,top:100,radius:70,fill})
    else if(type==='triangle')shape=new fab.Triangle({left:100,top:100,width:140,height:120,fill})
    else if(type==='line')shape=new fab.Line([100,200,420,200],{stroke:fill,strokeWidth:2,selectable:true})
    if(shape){fc.add(shape);fc.setActiveObject(shape);fc.renderAll()}
  }
  function addTable(){
    const fab=(window as any).fabric;const fc=fabricRef.current;if(!fc||!fab)return
    const rows=4,cols=3,cw=170,rh=42,x=100,y=100
    for(let i=0;i<rows;i++){
      for(let j=0;j<cols;j++){
        const isH=i===0
        fc.add(new fab.Rect({left:x+j*cw,top:y+i*rh,width:cw,height:rh,fill:isH?'#0f172a':i%2===0?'#f8fafc':'#ffffff',stroke:'#e2e8f0',strokeWidth:1,selectable:false}))
        fc.add(new fab.Textbox(isH?`Column ${j+1}`:`Row ${i}, Col ${j+1}`,{left:x+j*cw+8,top:y+i*rh+11,width:cw-16,fontSize:12,fontFamily:'Jost',fill:isH?'#ffffff':'#374151',fontWeight:isH?'600':'400',editable:true,selectable:false}))
      }
    }
    fc.renderAll()
  }
  function loadGoogleFont(family:string){
    const safe=family.replace(/ /g,'+')
    if(document.querySelector(`link[data-font="${safe}"]`))return
    const l=document.createElement('link');l.rel='stylesheet'
    l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@400;600;700&display=swap`
    l.setAttribute('data-font',safe);document.head.appendChild(l)
  }
  function applyFont(f:string){loadGoogleFont(f);setFontFamily(f);setShowFontPicker(false);updateProp('fontFamily',f)}
  function deleteSelected(){const fc=fabricRef.current;if(!fc)return;fc.getActiveObjects().forEach((o:any)=>fc.remove(o));fc.discardActiveObject();fc.renderAll()}
  function duplicateSelected(){const fc=fabricRef.current;if(!fc)return;fc.getActiveObject()?.clone((c:any)=>{c.set({left:c.left+20,top:c.top+20});fc.add(c);fc.setActiveObject(c);fc.renderAll()})}
  function updateProp(prop:string,value:any){const fc=fabricRef.current;if(!fc)return;const obj=fc.getActiveObject();if(!obj)return;obj.set(prop,value);fc.renderAll();scheduleAutoSave()}
  function uploadImage(file:File){
    const fab=(window as any).fabric;const fc=fabricRef.current;if(!fc||!fab)return
    const r=new FileReader()
    r.onload=e=>fab.Image.fromURL(e.target?.result as string,(img:any)=>{
      const s=Math.min(400/img.width,300/img.height,1)
      img.set({left:120,top:120,scaleX:s,scaleY:s});fc.add(img);fc.setActiveObject(img);fc.renderAll()
    })
    r.readAsDataURL(file)
  }
  function uploadFont(file:File){
    const r=new FileReader()
    r.onload=e=>{
      const name=file.name.replace(/\.[^/.]+$/,'')
      const style=document.createElement('style')
      style.textContent=`@font-face{font-family:'${name}';src:url('${e.target?.result}')}`
      document.head.appendChild(style)
      setFontFamily(name)
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
    const a=document.createElement('a');a.href=fc.toDataURL({format:'png',multiplier:2});a.download=`${title||'page'}.png`;a.click()
  }

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement).tagName
      if(tag==='INPUT'||tag==='TEXTAREA')return
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();saveCanvas()}
      if((e.metaKey||e.ctrlKey)&&e.key==='d'){e.preventDefault();duplicateSelected()}
      if((e.key==='Delete'||e.key==='Backspace')&&fabricRef.current?.getActiveObject())deleteSelected()
      if(e.key==='Escape')setActivePanel(null)
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[saveCanvas])

  const isActive=doc?.status==='active'
  const filteredFonts=FONTS.filter(f=>f.toLowerCase().includes(fontSearch.toLowerCase()))
  const filteredLayouts=layoutCat==='All'?LAYOUTS:LAYOUTS.filter(l=>l.category===layoutCat)

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#f0f0f2',fontFamily:"'Jost',system-ui,sans-serif",color:'#0f172a'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:#9ca3af}
        input[type="color"]{-webkit-appearance:none;border:2px solid #e5e7eb;cursor:pointer;padding:0;border-radius:6px}
        input[type="color"]::-webkit-color-swatch-wrapper{padding:2px}
        input[type="color"]::-webkit-color-swatch{border:none;border-radius:4px}
        .tbtn{width:32px;height:32px;border:none;cursor:pointer;border-radius:8px;background:transparent;color:#6b7280;display:flex;align-items:center;justify-content:center;transition:all .12s;flex-shrink:0}
        .tbtn:hover{background:#f3f4f6;color:#111827}
        .tbtn.on{background:#eef2ff;color:#4f46e5}
        .rail{width:56px;height:52px;border:none;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#6b7280;transition:all .14s;border-radius:10px;font-family:'Jost',sans-serif}
        .rail:hover{background:#f3f4f6;color:#111827}
        .rail.on{background:#eef2ff;color:#4f46e5}
        .rail span{font-size:9px;font-weight:600;letter-spacing:.03em;text-transform:uppercase}
        .pthumb{cursor:pointer;border-radius:9px;border:2px solid #e5e7eb;overflow:hidden;transition:all .14s;background:white}
        .pthumb:hover{border-color:#9ca3af}
        .pthumb.on{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.15)}
        .plbl{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px;padding:0 1px}
        .card-hover{transition:all .16s;cursor:pointer}
        .card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(79,70,229,.12);border-color:#4f46e5!important}
        .sp-inp{width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;color:#0f172a;border-radius:8px;padding:6px 10px;font:400 12px 'Jost',sans-serif;outline:none}
        .sp-inp:focus{border-color:#4f46e5}
        .font-row{padding:7px 10px;cursor:pointer;font-size:13px;border-radius:7px;transition:background .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .font-row:hover{background:#f3f4f6}
        .font-row.on{background:#eef2ff;color:#4f46e5;font-weight:700}
        .divider{width:1px;height:20px;background:#e5e7eb;margin:0 4px;flex-shrink:0}
        .stock-img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all .13s}
        .stock-img:hover{border-color:#4f46e5;transform:scale(1.02)}
      `}</style>

      {/* ── TOPBAR ───────────────────────────────────────────────────────────── */}
      <div style={{height:54,background:'white',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',padding:'0 14px',gap:8,flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
        <button onClick={()=>router.push('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',display:'flex',alignItems:'center',gap:5,fontSize:13,fontFamily:'Jost,sans-serif',fontWeight:500,padding:'5px 8px',borderRadius:8}}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Docs
        </button>
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M1 1l3 4-3 4" stroke="#d1d5db" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{border:'none',outline:'none',fontSize:14,fontWeight:600,color:'#0f172a',background:'transparent',fontFamily:'Jost,sans-serif',flex:1,maxWidth:280}}/>
        <div style={{display:'flex',alignItems:'center',gap:7,marginLeft:'auto'}}>
          <span style={{fontSize:11,color:saving?'#4f46e5':'#94a3b8',fontFamily:'JetBrains Mono,monospace',minWidth:80}}>
            {saving?'● Saving…':lastSaved?`✓ ${lastSaved.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:''}</span>
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
          <button onClick={()=>setActivePanel(activePanel==='export'?null:'export')} style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',color:'#374151',fontFamily:'Jost,sans-serif'}}>Export</button>
          {isActive
            ?<button onClick={()=>setShowShare(true)} style={pBtn}>Share</button>
            :<button onClick={publishDocument} style={pBtn}>Publish & Share</button>}
          <button onClick={()=>setShowDeleteConfirm(true)} title="Delete document" style={{width:32,height:32,border:'none',borderRadius:8,background:'transparent',cursor:'pointer',color:'#ef4444',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 10.5v-5M9.5 10.5v-5M3 3.5l.9 8h6.2l.9-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* ── TOOLBAR ──────────────────────────────────────────────────────────── */}
      <div style={{height:46,background:'white',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',padding:'0 10px',gap:2,flexShrink:0}}>
        {([
          {id:'select',tip:'Select',icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 2l9 5-4.5 1.4-2.2 4.6L3 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>},
          {id:'text',  tip:'Text (T)',icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M7.5 4v8M4.5 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>},
          {id:'rect',  tip:'Rectangle',icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="3" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/></svg>},
          {id:'circle',tip:'Circle',icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/></svg>},
          {id:'line',  tip:'Line',icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 13L13 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>},
          {id:'draw',  tip:'Draw',icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 12.5l2-1L12 4 11 3 3.5 10.5l-1 2zm8-9l1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>},
        ] as const).map(tool=>(
          <button key={tool.id} title={tool.tip} className={`tbtn${activeTool===tool.id?' on':''}`}
            onClick={()=>{
              if(tool.id==='text'){addText();setActiveTool('select');return}
              if(tool.id==='rect'){addShape('rect');return}
              if(tool.id==='circle'){addShape('circle');return}
              if(tool.id==='line'){addShape('line');return}
              setActiveTool(tool.id)
              if(fabricRef.current){fabricRef.current.isDrawingMode=tool.id==='draw';if(tool.id==='draw')fabricRef.current.freeDrawingBrush.color=fontColor}
            }}>{tool.icon}
          </button>
        ))}
        <div className="divider"/>
        <button title="Insert table" className="tbtn" onClick={addTable}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5h13M1 9h13M5 5v8M10 5v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>
        <label title="Upload image" className="tbtn" style={{cursor:'pointer'}}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="6.5" r="1.2" fill="currentColor"/><path d="M1 11l3.5-3L8 11l2.5-2.5L14 12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
          <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
        </label>
        <div className="divider"/>
        {/* Font picker */}
        <div style={{position:'relative'}}>
          <button onClick={()=>{setShowFontPicker(!showFontPicker)}}
            style={{height:32,padding:'0 10px',border:'1.5px solid #e5e7eb',borderRadius:8,background:'white',cursor:'pointer',fontSize:12,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:500,color:'#374151',display:'flex',alignItems:'center',gap:5,minWidth:140}}>
            <span style={{flex:1,textAlign:'left'}}>{fontFamily}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          {showFontPicker&&(
            <div style={{position:'absolute',top:'110%',left:0,background:'white',border:'1px solid #e5e7eb',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:200,width:230}}>
              <div style={{padding:'8px 8px 4px'}}>
                <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search 70+ fonts…" className="sp-inp" autoFocus/>
              </div>
              <div style={{maxHeight:240,overflow:'auto',padding:'4px 8px 6px'}}>
                {filteredFonts.slice(0,60).map(f=>(
                  <div key={f} className={`font-row${fontFamily===f?' on':''}`} style={{fontFamily:`'${f}',sans-serif`}} onClick={()=>applyFont(f)}>{f}</div>
                ))}
              </div>
              <div style={{padding:'8px',borderTop:'1px solid #f3f4f6'}}>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:11,color:'#6b7280',fontFamily:'Jost,sans-serif'}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Upload font (.ttf/.otf/.woff)
                  <input type="file" accept=".ttf,.otf,.woff,.woff2" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFont(f)}}/>
                </label>
              </div>
            </div>
          )}
        </div>
        <input type="number" value={fontSize} min={6} max={300}
          onChange={e=>{const v=parseInt(e.target.value);setFontSize(v);updateProp('fontSize',v)}}
          style={{width:50,height:32,border:'1.5px solid #e5e7eb',borderRadius:8,padding:'0 8px',fontSize:12,fontFamily:'JetBrains Mono,monospace',color:'#374151',outline:'none',textAlign:'center'}}/>
        <button title="Bold" onClick={()=>{const o=fabricRef.current?.getActiveObject();if(o){o.set('fontWeight',o.fontWeight==='bold'?'normal':'bold');fabricRef.current.renderAll()}}} style={{...fmtBtn,fontWeight:700,fontSize:14}}>B</button>
        <button title="Italic" onClick={()=>{const o=fabricRef.current?.getActiveObject();if(o){o.set('fontStyle',o.fontStyle==='italic'?'normal':'italic');fabricRef.current.renderAll()}}} style={{...fmtBtn,fontStyle:'italic',fontSize:14}}>I</button>
        <button title="Underline" onClick={()=>{const o=fabricRef.current?.getActiveObject();if(o){o.set('underline',!o.underline);fabricRef.current.renderAll()}}} style={{...fmtBtn,textDecoration:'underline'}}>U</button>
        <div className="divider"/>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {([{l:'A',v:fontColor,s:(v:string)=>{setFontColor(v);updateProp('fill',v)}},{l:'Fill',v:fillColor,s:(v:string)=>{setFillColor(v);updateProp('fill',v)}},{l:'BG',v:bgColor,s:(v:string)=>{setBgColor(v);if(fabricRef.current){fabricRef.current.backgroundColor=v;fabricRef.current.renderAll()}}}]).map(c=>(
            <div key={c.l} style={{textAlign:'center'}}>
              <input type="color" value={c.v} onChange={e=>c.s(e.target.value)} style={{width:26,height:26,display:'block',borderRadius:7}}/>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:1,fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{c.l}</div>
            </div>
          ))}
        </div>
        <div className="divider"/>
        {[
          {tip:'Duplicate',fn:duplicateSelected,icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4V2.5A1.5 1.5 0 015.5 1H11.5A1.5 1.5 0 0113 2.5V8.5A1.5 1.5 0 0111.5 10H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
          {tip:'Delete',fn:deleteSelected,icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 10.5v-5M9.5 10.5v-5M3 3.5l.9 8h6.2l.9-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {tip:'Bring forward',fn:()=>{const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.bringToFront(o);fabricRef.current.renderAll()}},icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 5l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {tip:'Send backward',fn:()=>{const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.sendToBack(o);fabricRef.current.renderAll()}},icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 9l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>},
        ].map(b=><button key={b.tip} title={b.tip} className="tbtn" onClick={b.fn}>{b.icon}</button>)}
        {/* Zoom */}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:3,background:'#f9fafb',borderRadius:9,padding:'3px 10px',border:'1.5px solid #e5e7eb'}}>
          <button onClick={()=>setZoom(z=>Math.max(.15,z-.1))} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:18,lineHeight:1,padding:'0 2px'}}>−</button>
          <span style={{fontSize:11,color:'#6b7280',minWidth:38,textAlign:'center',fontFamily:'JetBrains Mono,monospace'}}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.min(2.5,z+.1))} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:18,lineHeight:1,padding:'0 2px'}}>+</button>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* Left rail */}
        <div style={{width:58,flexShrink:0,background:'white',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8,gap:2,zIndex:10}}>
          {[
            {id:'layouts', label:'Layouts',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>},
            {id:'photos',  label:'Photos', icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M2 14l5-4 3 3 2.5-2 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>},
            {id:'elements',label:'Shapes', icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M14 1l3.5 5.5H10.5L14 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>},
            {id:'text',    label:'Text',   icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5A1.5 1.5 0 014.5 3.5h11A1.5 1.5 0 0117 5v1.5M10 3.5v13M7 16.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>},
            {id:'bg',      label:'BG',     icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M10 3A7 7 0 0110 17" fill="currentColor" opacity=".2"/></svg>},
            {id:'layers',  label:'Layers', icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 6l8-4 8 4-8 4L2 6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M2 10l8 4 8-4M2 14l8 4 8-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>},
            {id:'export',  label:'Export', icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 14v2a2 2 0 002 2h6a2 2 0 002-2v-2M10 4v10M7 11l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          ].map(item=>(
            <button key={item.id} className={`rail${activePanel===item.id?' on':''}`} onClick={()=>setActivePanel(activePanel===item.id?null:item.id)}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Side panel */}
        {activePanel&&(
          <div style={{width:272,flexShrink:0,background:'white',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden',zIndex:9}}>
            <div style={{height:44,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px',borderBottom:'1px solid #e5e7eb',flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:700,color:'#0f172a',fontFamily:'Jost,sans-serif'}}>
                {activePanel==='layouts'?'Page Layouts':activePanel==='photos'?'Stock Photos':activePanel==='elements'?'Shapes & Tables':activePanel==='text'?'Text Styles':activePanel==='bg'?'Background':activePanel==='layers'?'Layers':'Export'}
              </span>
              <button onClick={()=>setActivePanel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:4,borderRadius:6}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{flex:1,overflow:'auto',padding:14}}>

              {/* ── LAYOUTS PANEL ── */}
              {activePanel==='layouts'&&(
                <div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:14}}>
                    {LAYOUT_CATS.map(cat=>(
                      <button key={cat} onClick={()=>setLayoutCat(cat)}
                        style={{padding:'3px 10px',borderRadius:20,border:`1.5px solid ${layoutCat===cat?'#4f46e5':'#e5e7eb'}`,background:layoutCat===cat?'#4f46e5':'white',color:layoutCat===cat?'white':'#374151',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'Jost,sans-serif',transition:'all .12s'}}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {filteredLayouts.map(layout=>(
                      <div key={layout.id} className="card-hover" style={{borderRadius:10,overflow:'hidden',border:'1.5px solid #e5e7eb',cursor:'pointer'}}
                        onClick={()=>{
                          const fab=(window as any).fabric;const fc=fabricRef.current;if(!fc||!fab)return
                          const saved=[...pagesRef.current];saved[currentPageRef.current]=fc.toJSON()
                          const ni=currentPageRef.current+1
                          saved.splice(ni,0,pg())
                          setPages(saved);setCurrentPage(ni)
                          fc.clear();fc.backgroundColor='#ffffff';fc.renderAll()
                        }}>
                        <div style={{width:'100%',aspectRatio:'16/10',overflow:'hidden',position:'relative'}}>
                          <img src={layout.preview} alt={layout.label}
                            style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                            crossOrigin="anonymous"
                            onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                        </div>
                        <div style={{padding:'6px 8px',background:'white'}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#374151',fontFamily:'Jost,sans-serif'}}>{layout.label}</div>
                          <div style={{fontSize:9,color:'#9ca3af',fontFamily:'JetBrains Mono,monospace'}}>{layout.category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PHOTOS PANEL ── */}
              {activePanel==='photos'&&(
                <div>
                  <div style={{display:'flex',gap:6,marginBottom:12}}>
                    <input value={stockQuery} onChange={e=>setStockQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchStockImages(stockQuery)}
                      placeholder="Search photos…" className="sp-inp" style={{flex:1}}/>
                    <button onClick={()=>searchStockImages(stockQuery)} style={{...pBtn,padding:'0 12px',height:34,fontSize:12}}>
                      {loadingStock?'…':'Go'}
                    </button>
                  </div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
                    {['business','office','team','minimal','abstract','city','nature','tech','people','creative'].map(kw=>(
                      <button key={kw} onClick={()=>{setStockQuery(kw);searchStockImages(kw)}}
                        style={{padding:'3px 9px',borderRadius:20,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:10,fontWeight:600,color:'#6b7280',fontFamily:'Jost,sans-serif',transition:'all .12s'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.color='#4f46e5'}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.color='#6b7280'}}>
                        {kw}
                      </button>
                    ))}
                  </div>
                  {stockImages.length===0?(
                    <div style={{textAlign:'center',padding:'20px 0',color:'#9ca3af',fontSize:12}}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{margin:'0 auto 8px',display:'block',opacity:.4}}><rect x="3" y="6" width="26" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="13" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M3 22l7-6 6 6 4-4 9 8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                      Search for photos above or click a tag
                    </div>
                  ):(
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {stockImages.map((url,i)=>(
                        <div key={i} style={{borderRadius:8,overflow:'hidden',cursor:'pointer',border:'2px solid transparent',transition:'all .13s'}}
                          onClick={()=>addStockImage(url)}
                          onMouseEnter={e=>(e.currentTarget.style.borderColor='#4f46e5')}
                          onMouseLeave={e=>(e.currentTarget.style.borderColor='transparent')}>
                          <img src={url} alt="" className="stock-img" crossOrigin="anonymous" onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none'}}/>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{marginTop:12,fontSize:10,color:'#9ca3af',textAlign:'center',fontFamily:'JetBrains Mono,monospace',lineHeight:1.5}}>
                    Photos from Unsplash.<br/>Click to add to canvas.
                  </div>
                </div>
              )}

              {/* ── SHAPES PANEL ── */}
              {activePanel==='elements'&&(
                <div>
                  <div className="plbl">Basic Shapes</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginBottom:16}}>
                    {[
                      {t:'rect',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/></svg>},
                      {t:'rect',opts:{rx:40},icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="6" stroke="currentColor" strokeWidth="1.4"/></svg>},
                      {t:'circle',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/></svg>},
                      {t:'triangle',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L19 18H1L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>},
                      {t:'line',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 18L18 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>},
                    ].map((s,i)=>(
                      <div key={i} onClick={()=>addShape(s.t,s.opts)} style={{aspectRatio:'1',background:'#f9fafb',borderRadius:8,border:'1.5px solid #e5e7eb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#6b7280',transition:'all .12s'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';(e.currentTarget as HTMLElement).style.color='#4f46e5';e.currentTarget.style.background='#eef2ff'}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';(e.currentTarget as HTMLElement).style.color='#6b7280';e.currentTarget.style.background='#f9fafb'}}>
                        {s.icon}
                      </div>
                    ))}
                  </div>
                  <div className="plbl">Tables</div>
                  {['Standard (4×3)','Striped rows','Minimal border','Header only'].map((lbl,i)=>(
                    <div key={i} onClick={addTable} style={{padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',marginBottom:7,cursor:'pointer',fontSize:12,fontWeight:500,color:'#374151',transition:'all .12s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.background='#eef2ff';e.currentTarget.style.color='#4f46e5'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.background='';e.currentTarget.style.color='#374151'}}>
                      {lbl}
                    </div>
                  ))}
                  <div className="plbl" style={{marginTop:16}}>Upload image</div>
                  <label style={{display:'block',border:'2px dashed #d1d5db',borderRadius:10,padding:'20px',textAlign:'center',cursor:'pointer',transition:'all .13s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.background='#eef2ff'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background=''}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:2}}>Click to upload</div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>PNG, JPG, GIF, SVG, WebP</div>
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
                  </label>
                </div>
              )}

              {/* ── TEXT PANEL ── */}
              {activePanel==='text'&&(
                <div>
                  {[
                    {label:'Display Heading',fs:52,fw:'800',preview:'Display'},
                    {label:'Large Heading',  fs:40,fw:'700',preview:'Heading'},
                    {label:'Heading',        fs:28,fw:'700',preview:'Heading'},
                    {label:'Subheading',     fs:20,fw:'600',preview:'Subheading'},
                    {label:'Body Large',     fs:16,fw:'400',preview:'Body text'},
                    {label:'Body',           fs:13,fw:'400',preview:'Body text'},
                    {label:'Caption',        fs:10,fw:'400',preview:'Caption'},
                    {label:'Label / Mono',   fs:11,fw:'600',preview:'LABEL',ff:'JetBrains Mono'},
                  ].map((preset,i)=>(
                    <div key={i} onClick={()=>addText({text:preset.preview,fs:preset.fs,fw:preset.fw,ff:preset.ff||fontFamily})}
                      style={{padding:'10px 12px',borderRadius:9,border:'1.5px solid #e5e7eb',marginBottom:8,cursor:'pointer',transition:'all .12s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.background='#eef2ff'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.background=''}}>
                      <div style={{fontSize:Math.min(preset.fs*.48,24),fontWeight:parseInt(preset.fw),fontFamily:`'${preset.ff||fontFamily}',sans-serif`,color:'#0f172a',marginBottom:2}}>{preset.label}</div>
                      <div style={{fontSize:9,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace'}}>{preset.fs}pt · weight {preset.fw}{preset.ff?` · ${preset.ff}`:''}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── BG PANEL ── */}
              {activePanel==='bg'&&(
                <div>
                  <div className="plbl">Solid colors</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:7,marginBottom:14}}>
                    {['#ffffff','#f8fafc','#0f172a','#1e293b','#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#f97316'].map(c=>(
                      <div key={c} onClick={()=>{setBgColor(c);if(fabricRef.current){fabricRef.current.backgroundColor=c;fabricRef.current.renderAll()}}}
                        style={{aspectRatio:'1',background:c,borderRadius:7,cursor:'pointer',border:`2px solid ${c===bgColor?'#4f46e5':'#e5e7eb'}`,transition:'transform .1s'}}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.12)'}
                        onMouseLeave={e=>e.currentTarget.style.transform=''}/>
                    ))}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                    <span style={{fontSize:11,color:'#6b7280'}}>Custom:</span>
                    <input type="color" value={bgColor} onChange={e=>{setBgColor(e.target.value);if(fabricRef.current){fabricRef.current.backgroundColor=e.target.value;fabricRef.current.renderAll()}}} style={{width:32,height:32,borderRadius:7,border:'1.5px solid #e5e7eb',cursor:'pointer'}}/>
                  </div>
                  <div className="plbl">Gradients</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
                    {[['#4f46e5','#7c3aed'],['#0ea5e9','#06b6d4'],['#10b981','#34d399'],['#f59e0b','#f97316'],['#ef4444','#ec4899'],['#0f172a','#334155'],['#1e293b','#4f46e5'],['#fce7f3','#ede9fe']].map(([a,b])=>(
                      <div key={a} onClick={()=>{
                        const fab=(window as any).fabric;if(!fabricRef.current||!fab)return
                        fabricRef.current.setBackgroundColor(new fab.Gradient({type:'linear',gradientUnits:'pixels',coords:{x1:0,y1:0,x2:cWRef.current,y2:cHRef.current},colorStops:[{offset:0,color:a},{offset:1,color:b}]}),()=>fabricRef.current.renderAll())
                        scheduleAutoSave()
                      }} style={{height:46,borderRadius:9,background:`linear-gradient(135deg,${a},${b})`,cursor:'pointer',border:'2px solid transparent',transition:'all .13s'}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='#4f46e5'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}/>
                    ))}
                  </div>
                </div>
              )}

              {/* ── LAYERS PANEL ── */}
              {activePanel==='layers'&&(
                <div>
                  <div className="plbl">Objects (top to bottom)</div>
                  {fabricRef.current&&[...fabricRef.current.getObjects()].reverse().map((obj:any,i:number)=>{
                    const ri=fabricRef.current.getObjects().length-1-i
                    const lbl=obj.type==='textbox'?`"${(obj.text||'').substring(0,18)}…"`:`${obj.type} ${ri+1}`
                    return(
                      <div key={i} onClick={()=>{fabricRef.current.setActiveObject(obj);fabricRef.current.renderAll();setSelectedObj(obj)}}
                        style={{display:'flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:7,marginBottom:3,cursor:'pointer',border:`1.5px solid ${selectedObj===obj?'#4f46e5':'transparent'}`,background:selectedObj===obj?'#eef2ff':'transparent',transition:'all .1s'}}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x=".5" y=".5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                        <span style={{fontSize:11,color:'#374151',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'Jost,sans-serif'}}>{lbl}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── EXPORT PANEL ── */}
              {activePanel==='export'&&(
                <div>
                  <div className="plbl">Export document</div>
                  {[
                    {label:'PDF — All pages',desc:'Multi-page PDF file',fn:exportPDF,icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9H3V1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 1v4h3M4.5 8h1a1 1 0 010 2H4.5V7M8 7v3M8 7h1.5M8 9h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>},
                    {label:'PNG — Current page',desc:'High-res 2× PNG',fn:exportPNG,icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="4.5" cy="5.5" r="1" fill="currentColor"/><path d="M1 9.5l3-2.5 3 3 2-2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>},
                    {label:'JSON — Editable',desc:'Import & continue editing',fn:()=>{
                      const saved=[...pagesRef.current];saved[currentPageRef.current]=fabricRef.current?.toJSON()
                      const b=new Blob([JSON.stringify({pages:saved,canvasW,canvasH},null,2)],{type:'application/json'})
                      const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${title||'design'}.json`;a.click()
                    },icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9H3V1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 1v4h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>},
                  ].map(b=>(
                    <button key={b.label} onClick={b.fn} style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',display:'flex',alignItems:'center',gap:10,marginBottom:9,textAlign:'left',fontFamily:'Jost,sans-serif',transition:'all .13s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.background='#eef2ff'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.background='white'}}>
                      <span style={{color:'#4f46e5'}}>{b.icon}</span>
                      <div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{b.label}</div><div style={{fontSize:10,color:'#9ca3af'}}>{b.desc}</div></div>
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Page strip */}
        <div style={{width:140,flexShrink:0,background:'white',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'8px 10px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.06em'}}>Pages</span>
            <button onClick={addPage} title="Add page" style={{background:'#4f46e5',border:'none',borderRadius:6,width:22,height:22,color:'white',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>+</button>
          </div>
          <div style={{flex:1,overflow:'auto',padding:'8px 7px',display:'flex',flexDirection:'column',gap:8}}>
            {pages.map((page,idx)=>(
              <div key={idx} onClick={()=>switchPage(idx)} className={`pthumb${currentPage===idx?' on':''}`}>
                <div style={{width:'100%',aspectRatio:`${canvasW}/${canvasH}`,background:page?.background??'#ffffff',position:'relative'}}>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'2px 5px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,.88)'}}>
                    <span style={{fontSize:9,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{idx+1}</span>
                    {pages.length>1&&<button onClick={e=>{e.stopPropagation();removePage(idx)}} style={{width:13,height:13,borderRadius:3,background:'#ef4444',border:'none',color:'white',fontSize:8,cursor:'pointer',lineHeight:1}}>×</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'5px 10px',borderTop:'1px solid #e5e7eb',fontSize:10,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace'}}>{pages.length}p · {CANVAS_SIZES.find(s=>s.w===canvasW&&s.h===canvasH)?.dims||`${canvasW}×${canvasH}`}</div>
        </div>

        {/* Canvas */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f0f2',overflow:'auto',position:'relative'}}
          onDragOver={e=>{e.preventDefault();setIsDragging(true)}}
          onDragLeave={()=>setIsDragging(false)}
          onDrop={e=>{e.preventDefault();setIsDragging(false);const f=e.dataTransfer.files?.[0];if(f?.type.startsWith('image/'))uploadImage(f)}}>
          {isDragging&&<div style={{position:'absolute',inset:0,zIndex:50,background:'rgba(79,70,229,.05)',border:'2px dashed #4f46e5',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <span style={{background:'white',color:'#4f46e5',fontWeight:700,fontSize:15,padding:'10px 22px',borderRadius:10,boxShadow:'0 4px 12px rgba(0,0,0,.08)'}}>Drop image here</span>
          </div>}
          <div style={{transform:`scale(${zoom})`,transformOrigin:'center center',boxShadow:'0 4px 40px rgba(0,0,0,.1)',borderRadius:2,outline:'1px solid #e5e7eb'}}>
            <canvas ref={canvasEl}/>
          </div>
          {pages.length>1&&(
            <div style={{position:'absolute',bottom:18,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,alignItems:'center',background:'white',borderRadius:22,padding:'5px 14px',boxShadow:'0 2px 12px rgba(0,0,0,.08)',border:'1px solid #e5e7eb'}}>
              <button onClick={()=>currentPage>0&&switchPage(currentPage-1)} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:22,opacity:currentPage===0?.3:1,lineHeight:1}}>‹</button>
              <span style={{fontSize:11,color:'#6b7280',fontFamily:'JetBrains Mono,monospace',minWidth:52,textAlign:'center'}}>{currentPage+1} / {pages.length}</span>
              <button onClick={()=>currentPage<pages.length-1&&switchPage(currentPage+1)} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:22,opacity:currentPage===pages.length-1?.3:1,lineHeight:1}}>›</button>
            </div>
          )}
        </div>

        {/* Properties */}
        {selectedObj&&(
          <div style={{width:192,flexShrink:0,background:'white',borderLeft:'1px solid #e5e7eb',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid #e5e7eb',fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.06em'}}>Properties</div>
            <div style={{padding:14,display:'flex',flexDirection:'column',gap:12,overflow:'auto'}}>
              <PRow label="X"><NIn value={Math.round(selectedObj.left??0)} onChange={v=>updateProp('left',v)}/></PRow>
              <PRow label="Y"><NIn value={Math.round(selectedObj.top??0)} onChange={v=>updateProp('top',v)}/></PRow>
              {selectedObj.width&&<PRow label="Width"><NIn value={Math.round(selectedObj.width??0)} onChange={v=>updateProp('width',v)}/></PRow>}
              <PRow label="Opacity">
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <input type="range" min={0} max={1} step={.01} value={selectedObj.opacity??1} onChange={e=>updateProp('opacity',parseFloat(e.target.value))} style={{flex:1,accentColor:'#4f46e5'}}/>
                  <span style={{fontSize:11,color:'#94a3b8',minWidth:28,fontFamily:'JetBrains Mono,monospace'}}>{Math.round((selectedObj.opacity??1)*100)}</span>
                </div>
              </PRow>
              {(selectedObj.type==='textbox'||selectedObj.type==='text')&&<PRow label="Font size"><NIn value={selectedObj.fontSize??18} onChange={v=>updateProp('fontSize',v)}/></PRow>}
              {selectedObj.type==='rect'&&<PRow label="Radius"><NIn value={selectedObj.rx??0} onChange={v=>{updateProp('rx',v);updateProp('ry',v)}}/></PRow>}
              <PRow label="Color">
                <input type="color" value={typeof selectedObj.fill==='string'?selectedObj.fill:'#4f46e5'} onChange={e=>updateProp('fill',e.target.value)} style={{width:'100%',height:32,borderRadius:8,border:'1.5px solid #e5e7eb',cursor:'pointer'}}/>
              </PRow>
            </div>
          </div>
        )}
      </div>

      {/* ── TEMPLATE MODAL ───────────────────────────────────────────────────── */}
      {showTplModal&&(
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(15,23,42,.65)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
          <div style={{background:'white',borderRadius:22,width:'min(980px,96vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.22)',overflow:'hidden'}}>
            <div style={{padding:'22px 28px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:0,letterSpacing:'-.02em',fontFamily:'Jost,sans-serif'}}>Start your design</h2>
                <p style={{fontSize:13,color:'#6b7280',margin:'3px 0 0',fontFamily:'Jost,sans-serif'}}>Choose a canvas size or pick a professionally built template.</p>
              </div>
              {pages.length>0&&<button onClick={()=>setShowTplModal(false)} style={{background:'#f3f4f6',border:'none',borderRadius:9,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#6b7280'}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>}
            </div>
            <div style={{flex:1,overflow:'auto',padding:'24px 28px'}}>
              {/* Canvas sizes */}
              <div style={{marginBottom:28}}>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:12}}>Canvas size</div>
                {['Presentation','Document','Social'].map(cat=>(
                  <div key={cat} style={{marginBottom:14}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:8}}>{cat}</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {CANVAS_SIZES.filter(s=>s.cat===cat).map(s=>(
                        <button key={s.id} onClick={()=>startBlank(s.id)}
                          style={{padding:'8px 16px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151',fontFamily:'Jost,sans-serif',transition:'all .13s',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:2}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor='#4f46e5';e.currentTarget.style.background='#eef2ff';e.currentTarget.style.color='#4f46e5'}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.background='white';e.currentTarget.style.color='#374151'}}>
                          {s.label}
                          <span style={{fontSize:9,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace',fontWeight:400}}>{s.dims}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Templates */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:12}}>Templates</div>
                <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
                  {TPL_CATS.map(cat=>(
                    <button key={cat.id} onClick={()=>setTplCat(cat.id)}
                      style={{padding:'5px 14px',borderRadius:20,border:`1.5px solid ${tplCat===cat.id?'#4f46e5':'#e5e7eb'}`,background:tplCat===cat.id?'#4f46e5':'white',color:tplCat===cat.id?'white':'#374151',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'Jost,sans-serif',transition:'all .12s'}}>
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
                  {TEMPLATES.filter(t=>t.cat===tplCat).map(tpl=>{
                    const size=CANVAS_SIZES.find(s=>s.id===tpl.size)||CANVAS_SIZES[0]
                    const stockImg=PEXELS_CURATED[TEMPLATES.indexOf(tpl)%PEXELS_CURATED.length]
                    return(
                      <div key={tpl.id} className="card-hover" onClick={()=>applyTemplate(tpl.id,tpl.size)}
                        style={{border:'2px solid #e5e7eb',borderRadius:14,overflow:'hidden',cursor:'pointer',fontFamily:'Jost,sans-serif'}}>
                        <div style={{aspectRatio:`${size.w}/${size.h}`,overflow:'hidden',position:'relative',background:'#f0f0f2'}}>
                          <img src={stockImg} alt={tpl.label} style={{width:'100%',height:'100%',objectFit:'cover',opacity:.7}} crossOrigin="anonymous"
                            onError={e=>{(e.target as HTMLImageElement).style.opacity='0'}}/>
                          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(79,70,229,.7),rgba(16,185,129,.4))',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:10}}>
                            <div style={{fontSize:12,fontWeight:800,color:'white',lineHeight:1.1,textShadow:'0 1px 3px rgba(0,0,0,.5)'}}>{tpl.label}</div>
                          </div>
                        </div>
                        <div style={{padding:'10px 12px',background:'white'}}>
                          <div style={{fontSize:11,color:'#6b7280',marginBottom:7}}>{tpl.desc}</div>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                            <span style={{fontSize:9,color:'#4f46e5',background:'#eef2ff',borderRadius:5,padding:'2px 8px',fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{tpl.pages}p</span>
                            <span style={{fontSize:9,color:'#94a3b8',fontFamily:'JetBrains Mono,monospace'}}>{size.dims}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share, Delete, AI Drafter */}
      {showShare&&<ShareModal documentId={params.id} links={shareLinks} onClose={()=>setShowShare(false)} onRefresh={loadShareLinks} isActive={isActive} onPublish={publishDocument}/>}
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
        <AIDrafter documentType={doc?.type??'document'} onDraftComplete={(html:string)=>{
          const stripped=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
          const page=pg('#ffffff',[tx(stripped,{l:60,t:60,w:cWRef.current-120,fs:16,fill:'#0f172a'})])
          const updated=[...pagesRef.current,page];setPages(updated)
          const ni=updated.length-1;setCurrentPage(ni)
          fabricRef.current?.loadFromJSON(page,()=>fabricRef.current.renderAll());saveCanvas()
        }} onClose={()=>setShowDrafter(false)}/>
      )}
    </div>
  )
}

// ─── Style constants ──────────────────────────────────────────────────────────
const pBtn:React.CSSProperties={padding:'7px 18px',borderRadius:9,fontSize:13,fontWeight:700,border:'none',background:'#4f46e5',color:'white',cursor:'pointer',fontFamily:'Jost,sans-serif',boxShadow:'0 2px 8px rgba(79,70,229,.25)'}
const sBtn:React.CSSProperties={padding:'7px 16px',borderRadius:9,fontSize:13,fontWeight:600,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',color:'#374151',fontFamily:'Jost,sans-serif'}
const fmtBtn:React.CSSProperties={width:28,height:28,border:'none',cursor:'pointer',borderRadius:6,background:'transparent',color:'#6b7280',fontFamily:'Jost,sans-serif'}

function PRow({label,children}:{label:string;children:React.ReactNode}){
  return <div><div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>{label}</div>{children}</div>
}
function NIn({value,onChange}:{value:number;onChange:(v:number)=>void}){
  return <input type="number" value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',background:'#f9fafb',border:'1.5px solid #e5e7eb',color:'#0f172a',borderRadius:8,padding:'5px 9px',fontSize:12,fontFamily:'JetBrains Mono,monospace',outline:'none'}}/>
}

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
    const {error}=await supabase.from('share_links').insert({document_id:documentId,token,label:label||'Share link',require_email:requireEmail,allow_download:allowDownload,password:password||null,is_active:true})
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
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'flex-end'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
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
                    <span style={{padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:link.is_active?'#dcfce7':'#f1f5f9',color:link.is_active?'#15803d':'#64748b',fontFamily:'JetBrains Mono,monospace'}}>{link.is_active?'LIVE':'OFF'}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                    <code style={{flex:1,fontSize:10,color:'#64748b',background:'#f8fafc',padding:'5px 9px',borderRadius:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',fontFamily:'JetBrains Mono,monospace',border:'1px solid #e5e7eb'}}>{buildShareUrl(link.token)}</code>
                    <button onClick={()=>copyLink(link.token)} style={{padding:'5px 11px',background:copied===link.token?'#f0fdf4':'#f8fafc',border:`1.5px solid ${copied===link.token?'#86efac':'#e5e7eb'}`,borderRadius:8,fontSize:11,cursor:'pointer',color:copied===link.token?'#15803d':'#64748b',fontFamily:'Jost,sans-serif',fontWeight:700,whiteSpace:'nowrap'}}>
                      {copied===link.token?'Copied!':'Copy'}
                    </button>
                  </div>
                  <div style={{display:'flex',gap:12,fontSize:11,color:'#94a3b8',flexWrap:'wrap',marginBottom:8,fontFamily:'JetBrains Mono,monospace'}}>
                    <span>{link.view_count||0} views</span>
                    {link.require_email&&<span>Email gate</span>}
                    {link.password&&<span>Password</span>}
                    {link.allow_download&&<span>Downloads on</span>}
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
                <Input label="Link label" placeholder="e.g. Sequoia meeting, Website" value={label} onChange={(e:any)=>setLabel(e.target.value)}/>
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
