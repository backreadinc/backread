'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { buildShareUrl, generateToken } from '@/lib/utils'
import AIDrafter from '@/components/editor/AIDrafter'
import type { Database } from '@/lib/supabase/client'

type Doc = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  bg:'#F4F2EF', panel:'#FFFFFF', canvas:'#E6E2DC',
  border:'#E2DDD8', borderMd:'#CFCAC4',
  accent:'#4F46E5', accentLt:'#EEF2FF', accentMd:'#C7D2FE',
  text:'#18181B', textMd:'#71717A', textSm:'#A1A1AA',
  green:'#10B981', red:'#EF4444', amber:'#F59E0B',
}
const Fui = "'Inter',system-ui,sans-serif"
const Fmono = "'JetBrains Mono',monospace"
const UI:React.CSSProperties = { fontFamily: Fui }

// ─── Fabric helpers ───────────────────────────────────────────────────────────
function pg(bg='#ffffff', objects:any[]=[]) { return { version:'5.3.0', objects, background:bg } }
function sc(base:number, W:number) { return Math.max(Math.round(base*(W/1280)), Math.round(base*0.52)) }
function tx(text:string, o:any={}):any {
  return { type:'textbox', left:o.l??60, top:o.t??60, width:o.w??400, text,
    fontSize:o.fs??16, fontFamily:o.ff??'Inter', fill:o.fill??'#18181B',
    fontWeight:o.fw??'400', lineHeight:o.lh??1.35, textAlign:o.ta??'left',
    opacity:1, selectable:true, editable:true }
}
function bx(o:any={}):any {
  return { type:'rect', left:o.l??0, top:o.t??0, width:o.w??200, height:o.h??60,
    fill:o.fill??'#4f46e5', rx:o.rx??0, ry:o.rx??0, selectable:true, opacity:o.op??1 }
}

// ─── Canvas sizes ─────────────────────────────────────────────────────────────
const SIZES = [
  { id:'pres-169', label:'Presentation 16:9', sub:'1280×720',  w:1280, h:720  },
  { id:'pres-43',  label:'Presentation 4:3',  sub:'1024×768',  w:1024, h:768  },
  { id:'a4-p',     label:'A4 Portrait',       sub:'794×1123',  w:794,  h:1123 },
  { id:'a4-l',     label:'A4 Landscape',      sub:'1123×794',  w:1123, h:794  },
  { id:'sq',       label:'Square 1:1',        sub:'1080×1080', w:1080, h:1080 },
  { id:'story',    label:'Story / Reel',      sub:'540×960',   w:540,  h:960  },
  { id:'linkedin', label:'LinkedIn Banner',   sub:'1584×396',  w:1584, h:396  },
  { id:'twitter',  label:'Twitter Header',    sub:'1500×500',  w:1500, h:500  },
]

const FONTS = [
  'Inter','Plus Jakarta Sans','DM Sans','Outfit','Syne','Archivo','Manrope','Nunito Sans',
  'IBM Plex Sans','Rubik','Work Sans','Barlow','Lato','Open Sans','Raleway',
  'Montserrat','Oswald','Bebas Neue','Anton','Teko',
  'Playfair Display','Cormorant Garamond','Libre Baskerville','Merriweather','EB Garamond',
  'Lora','Crimson Text','Bodoni Moda','Arvo','Zilla Slab',
  'DM Mono','Roboto Mono','IBM Plex Mono','Space Mono','JetBrains Mono',
  'Pacifico','Righteous','Caveat','Dancing Script','Satisfy',
  'Poppins','Quicksand','Varela Round','Josefin Sans','Karla','Space Grotesk',
]

const FONT_PAIRS = [
  { label:'Editorial',  h:'Cormorant Garamond', b:'DM Sans' },
  { label:'Modern',     h:'Syne',               b:'Manrope' },
  { label:'Tech',       h:'IBM Plex Mono',      b:'IBM Plex Sans' },
  { label:'Bold',       h:'Bebas Neue',         b:'Work Sans' },
  { label:'Classic',    h:'Playfair Display',   b:'Lato' },
  { label:'Startup',    h:'Plus Jakarta Sans',  b:'Plus Jakarta Sans' },
]

const BLENDS = ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion']

// ─── Layouts ──────────────────────────────────────────────────────────────────
const LAYOUTS = [
  // HERO
  { id:'hero-dark', label:'Hero Dark', cat:'Hero',
    build:(W:number,H:number)=>pg('#0B0F1A',[
      bx({l:0,t:0,w:W,h:H,fill:'#0B0F1A'}),
      bx({l:0,t:H-3,w:W,h:3,fill:'#4F46E5'}),
      bx({l:Math.round(W*.07),t:Math.round(H*.34),w:3,h:Math.round(H*.28),fill:'#4F46E5'}),
      tx('Your Headline',{l:Math.round(W*.07)+20,t:Math.round(H*.35),w:Math.round(W*.6),fs:sc(54,W),fw:'800',fill:'#FFFFFF',ff:'Inter',lh:1.0}),
      tx('Supporting subtext that draws the reader in.',{l:Math.round(W*.07)+20,t:Math.round(H*.35)+sc(54,W)+22,w:Math.round(W*.52),fs:sc(17,W),fill:'rgba(255,255,255,.55)',lh:1.65}),
    ]),
  },
  { id:'hero-light', label:'Hero Light', cat:'Hero',
    build:(W:number,H:number)=>pg('#F8FAFC',[
      tx('CATEGORY · LABEL',{l:Math.round(W*.1),t:Math.round(H*.2)+18,w:Math.round(W*.8),fs:sc(10,W),fw:'700',fill:'#4F46E5',ta:'center',ff:'JetBrains Mono'}),
      tx('Centered Hero\nHeadline',{l:Math.round(W*.08),t:Math.round(H*.2)+42,w:Math.round(W*.84),fs:sc(52,W),fw:'800',fill:'#0F172A',ta:'center',ff:'Inter',lh:1.0}),
      tx('A clear, compelling supporting line that gives the reader context and direction.',{l:Math.round(W*.14),t:Math.round(H*.2)+42+sc(52,W)*2+22,w:Math.round(W*.72),fs:sc(16,W),fill:'#64748B',ta:'center',lh:1.7}),
    ]),
  },
  { id:'hero-gradient', label:'Gradient Hero', cat:'Hero',
    build:(W:number,H:number)=>pg('#4F46E5',[
      bx({l:0,t:0,w:W,h:H,fill:'#4F46E5'}),
      bx({l:Math.round(W*.06),t:Math.round(H*.14),w:56,h:4,fill:'rgba(255,255,255,.4)',rx:2}),
      tx('Bold\nGradient Slide',{l:Math.round(W*.06),t:Math.round(H*.24),w:Math.round(W*.64),fs:sc(56,W),fw:'900',fill:'#FFFFFF',ff:'Inter',lh:.98}),
      tx('Energetic layout for launches, announcements, and key moments.',{l:Math.round(W*.06),t:Math.round(H*.24)+sc(56,W)*2+26,w:Math.round(W*.52),fs:sc(15,W),fill:'rgba(255,255,255,.68)',lh:1.65}),
    ]),
  },
  { id:'hero-split', label:'Split Accent', cat:'Hero',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:Math.round(W*.56),t:0,w:Math.round(W*.44),h:H,fill:'#4F46E5'}),
      tx('Headline\nLeft Side',{l:Math.round(W*.06),t:Math.round(H*.28),w:Math.round(W*.46),fs:sc(48,W),fw:'800',fill:'#0F172A',ff:'Inter',lh:1.0}),
      tx('Supporting description on the left with clear messaging.',{l:Math.round(W*.06),t:Math.round(H*.28)+sc(48,W)*2+22,w:Math.round(W*.44),fs:sc(15,W),fill:'#64748B',lh:1.65}),
      tx('Right\nBlock',{l:Math.round(W*.62),t:Math.round(H*.3),w:Math.round(W*.32),fs:sc(40,W),fw:'700',fill:'#FFFFFF',ff:'Inter',lh:1.0}),
    ]),
  },
  // PITCH
  { id:'pitch-problem', label:'Problem', cat:'Pitch',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:0,w:W,h:4,fill:'#EF4444'}),
      bx({l:Math.round(W*.06),t:Math.round(H*.14),w:56,h:4,fill:'#EF4444',rx:2}),
      tx('The Problem',{l:Math.round(W*.06),t:Math.round(H*.14)+18,w:Math.round(W*.7),fs:sc(42,W),fw:'900',fill:'#0F172A',ff:'Inter',lh:1.0}),
      tx('Describe the pain point your customer faces every single day. Make it real and visceral.',{l:Math.round(W*.06),t:Math.round(H*.14)+18+sc(42,W)+16,w:Math.round(W*.56),fs:sc(17,W),fill:'#374151',lh:1.7}),
      ...(['Wasted time','Lost revenue','Broken workflows'].map((item,i)=>{
        const x=Math.round(W*.06)+i*Math.round(W*.31)
        return [bx({l:x,t:Math.round(H*.62),w:Math.round(W*.28),h:Math.round(H*.22),fill:['#FEF2F2','#FFF7ED','#FFFBEB'][i],rx:12}),tx(item,{l:x+16,t:Math.round(H*.62)+16,w:Math.round(W*.25),fs:sc(14,W),fw:'600',fill:['#991B1B','#92400E','#78350F'][i]})]
      })).flat(),
    ]),
  },
  { id:'pitch-solution', label:'Solution', cat:'Pitch',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:0,w:W,h:4,fill:'#10B981'}),
      bx({l:Math.round(W*.06),t:Math.round(H*.14),w:56,h:4,fill:'#10B981',rx:2}),
      tx('The Solution',{l:Math.round(W*.06),t:Math.round(H*.14)+18,w:Math.round(W*.7),fs:sc(42,W),fw:'900',fill:'#0F172A',ff:'Inter',lh:1.0}),
      tx('Explain exactly how you solve the problem. Be specific about the mechanism.',{l:Math.round(W*.06),t:Math.round(H*.14)+18+sc(42,W)+16,w:Math.round(W*.56),fs:sc(16,W),fill:'#374151',lh:1.7}),
      ...([['01','Core Feature','What it does and why it matters.','#10B981'],['02','Unique Edge','What makes this impossible to copy.','#6366F1'],['03','Outcome','The measurable result for customers.','#F59E0B']].map(([num,title,body,col],i)=>{
        const x=Math.round(W*.06)+i*Math.round(W*.3)
        return [bx({l:x,t:Math.round(H*.6),w:Math.round(W*.27),h:Math.round(H*.28),fill:'#F9FAFB',rx:12}),bx({l:x+16,t:Math.round(H*.6)+16,w:28,h:28,fill:col,rx:8}),tx(num,{l:x+28,t:Math.round(H*.6)+22,w:20,fs:9,fw:'800',fill:'#fff',ta:'center',ff:'JetBrains Mono'}),tx(title,{l:x+14,t:Math.round(H*.6)+60,w:Math.round(W*.24),fs:sc(15,W),fw:'700',fill:'#0F172A'}),tx(body,{l:x+14,t:Math.round(H*.6)+60+sc(15,W)+8,w:Math.round(W*.24),fs:sc(12,W),fill:'#6B7280',lh:1.55})]
      })).flat(),
    ]),
  },
  { id:'pitch-metrics', label:'Traction', cat:'Pitch',
    build:(W:number,H:number)=>pg('#0B0F1A',[
      bx({l:0,t:0,w:W,h:H,fill:'#0B0F1A'}),
      tx('Traction',{l:Math.round(W*.06),t:Math.round(H*.1),w:Math.round(W*.7),fs:sc(36,W),fw:'900',fill:'#FFFFFF',ff:'Inter'}),
      ...([['$0M','ARR','#10B981'],['0K','Customers','#6366F1'],['0%','Growth MoM','#F59E0B'],['0','NPS Score','#EC4899']].map(([val,lbl,col],i)=>{
        const cw=Math.round((W-130)/4), cx=50+i*(cw+13)
        return [bx({l:cx,t:Math.round(H*.28),w:cw,h:Math.round(H*.52),fill:'rgba(255,255,255,.04)',rx:14}),bx({l:cx,t:Math.round(H*.28),w:cw,h:4,fill:col,rx:2}),tx(val,{l:cx+18,t:Math.round(H*.28)+26,w:cw-36,fs:sc(38,W),fw:'800',fill:col,ff:'Inter'}),tx(lbl,{l:cx+18,t:Math.round(H*.28)+26+sc(38,W)+8,w:cw-36,fs:sc(13,W),fw:'500',fill:'rgba(255,255,255,.6)'})]
      })).flat(),
    ]),
  },
  { id:'pitch-team', label:'Team', cat:'Pitch',
    build:(W:number,H:number)=>pg('#FAFAFA',[
      bx({l:0,t:0,w:W,h:4,fill:'#0F172A'}),
      tx('The Team',{l:Math.round(W*.06),t:44,w:Math.round(W*.7),fs:sc(38,W),fw:'900',fill:'#0F172A',ff:'Inter'}),
      ...(['CEO / Founder','CTO / Co-Founder','Head of Growth'].map((role,i)=>{
        const cw=Math.round((W-130)/3), cx=50+i*(cw+13)
        return [bx({l:cx,t:Math.round(H*.4),w:cw,h:Math.round(H*.44),fill:'#FFFFFF',rx:14}),bx({l:cx+Math.round(cw/2)-26,t:Math.round(H*.4)+20,w:52,h:52,fill:'#E0E7FF',rx:26}),tx('Your Name',{l:cx+14,t:Math.round(H*.4)+86,w:cw-28,fs:sc(16,W),fw:'700',fill:'#0F172A',ta:'center'}),tx(role,{l:cx+14,t:Math.round(H*.4)+86+sc(16,W)+6,w:cw-28,fs:sc(11,W),fill:'#6366F1',ta:'center',ff:'JetBrains Mono',fw:'600'}),tx('10+ years building products. Previously at top-tier companies.',{l:cx+14,t:Math.round(H*.4)+86+sc(16,W)+6+sc(11,W)+10,w:cw-28,fs:sc(12,W),fill:'#6B7280',ta:'center',lh:1.55})]
      })).flat(),
    ]),
  },
  { id:'pitch-ask', label:'The Ask', cat:'Pitch',
    build:(W:number,H:number)=>pg('#4F46E5',[
      bx({l:0,t:0,w:W,h:H,fill:'#4F46E5'}),
      tx('We are raising',{l:Math.round(W*.5)-Math.round(W*.35),t:Math.round(H*.2),w:Math.round(W*.7),fs:sc(20,W),fill:'rgba(255,255,255,.6)',ta:'center'}),
      tx('$2M Seed Round',{l:Math.round(W*.5)-Math.round(W*.4),t:Math.round(H*.2)+sc(20,W)+16,w:Math.round(W*.8),fs:sc(64,W),fw:'900',fill:'#FFFFFF',ta:'center',ff:'Inter',lh:.95}),
      bx({l:Math.round(W*.5)-40,t:Math.round(H*.66),w:80,h:4,fill:'rgba(255,255,255,.4)',rx:2}),
      tx('hello@yourcompany.com',{l:Math.round(W*.1),t:Math.round(H*.72),w:Math.round(W*.8),fs:sc(16,W),fill:'rgba(255,255,255,.7)',ta:'center'}),
    ]),
  },
  // PROPOSAL
  { id:'prop-cover', label:'Proposal Cover', cat:'Proposal',
    build:(W:number,H:number)=>pg('#FAFAF8',[
      bx({l:0,t:0,w:W,h:6,fill:'#0F172A'}),
      bx({l:Math.round(W*.06),t:Math.round(H*.16),w:Math.round(W*.06),h:4,fill:'#4F46E5',rx:2}),
      tx('BUSINESS PROPOSAL',{l:Math.round(W*.14),t:Math.round(H*.16)+4,w:300,fs:sc(10,W),fw:'700',fill:'#4F46E5',ff:'JetBrains Mono'}),
      tx('Proposal for\nClient Company',{l:Math.round(W*.06),t:Math.round(H*.25),w:Math.round(W*.6),fs:sc(56,W),fw:'900',fill:'#0F172A',ff:'Cormorant Garamond',lh:.92}),
      bx({l:Math.round(W*.06),t:Math.round(H*.65),w:Math.round(W*.3),h:1,fill:'#E2E8F0'}),
      tx('Prepared by Your Company · hello@company.com',{l:Math.round(W*.06),t:Math.round(H*.67),w:Math.round(W*.5),fs:sc(13,W),fill:'#64748B',lh:1.65}),
      tx(new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),{l:Math.round(W*.06),t:Math.round(H*.82),w:250,fs:sc(11,W),fill:'#94A3B8',ff:'JetBrains Mono'}),
    ]),
  },
  { id:'prop-scope', label:'Scope of Work', cat:'Proposal',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:0,w:4,h:H,fill:'#4F46E5'}),
      tx('Scope of Work',{l:44,t:Math.round(H*.1),w:Math.round(W*.7),fs:sc(34,W),fw:'800',fill:'#0F172A',ff:'Inter'}),
      ...(['Phase 1: Discovery','Phase 2: Design','Phase 3: Delivery'].map((phase,i)=>{
        const y=Math.round(H*.28)+i*Math.round(H*.2)
        return [bx({l:44,t:y,w:Math.round(W*.88),h:Math.round(H*.17),fill:i%2===0?'#F8FAFC':'#FFFFFF',rx:10}),bx({l:60,t:y+16,w:28,h:28,fill:'#4F46E5',rx:8}),tx(String(i+1),{l:60,t:y+20,w:28,fs:13,fw:'800',fill:'#fff',ta:'center',ff:'JetBrains Mono'}),tx(phase,{l:104,t:y+18,w:Math.round(W*.55),fs:sc(16,W),fw:'700',fill:'#0F172A'}),tx('2 weeks',{l:Math.round(W*.76),t:y+20,w:100,fs:sc(11,W),fill:'#94A3B8',ta:'right',ff:'JetBrains Mono'}),tx('Description of deliverables and approach for this phase.',{l:104,t:y+18+sc(16,W)+8,w:Math.round(W*.62),fs:sc(12,W),fill:'#64748B',lh:1.55})]
      })).flat(),
    ]),
  },
  { id:'prop-pricing', label:'Pricing', cat:'Proposal',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:0,w:W,h:4,fill:'#10B981'}),
      tx('Investment',{l:Math.round(W*.06),t:40,w:Math.round(W*.7),fs:sc(36,W),fw:'900',fill:'#0F172A',ff:'Inter'}),
      bx({l:Math.round(W*.06),t:Math.round(H*.26),w:Math.round(W*.88),h:1,fill:'#E2E8F0'}),
      ...([['Discovery & Strategy','$2,500'],['Design & Prototyping','$5,000'],['Development','$12,000'],['Testing & Launch','$2,500']].map(([item,price],i)=>{
        const y=Math.round(H*.28)+i*Math.round(H*.11)
        return [bx({l:Math.round(W*.06),t:y,w:Math.round(W*.88),h:Math.round(H*.09),fill:i%2===0?'#F9FAFB':'#FFFFFF',rx:0}),tx(item,{l:Math.round(W*.08),t:y+Math.round(H*.03),w:Math.round(W*.6),fs:sc(14,W),fw:'500',fill:'#0F172A'}),tx(price,{l:Math.round(W*.78),t:y+Math.round(H*.03),w:Math.round(W*.14),fs:sc(14,W),fw:'700',fill:'#10B981',ta:'right',ff:'JetBrains Mono'})]
      })).flat(),
      bx({l:Math.round(W*.06),t:Math.round(H*.72),w:Math.round(W*.88),h:1,fill:'#0F172A'}),
      tx('Total Investment',{l:Math.round(W*.08),t:Math.round(H*.74),w:Math.round(W*.5),fs:sc(16,W),fw:'700',fill:'#0F172A'}),
      tx('$22,000',{l:Math.round(W*.78),t:Math.round(H*.74),w:Math.round(W*.14),fs:sc(18,W),fw:'800',fill:'#0F172A',ta:'right',ff:'JetBrains Mono'}),
    ]),
  },
  // EDITORIAL
  { id:'editorial', label:'Editorial Cover', cat:'Editorial',
    build:(W:number,H:number)=>pg('#FAFAF8',[
      bx({l:0,t:0,w:W,h:5,fill:'#0F172A'}),bx({l:0,t:H-5,w:W,h:5,fill:'#0F172A'}),
      tx('VOL. 01 · ISSUE 04 · 2025',{l:Math.round(W*.06),t:24,w:Math.round(W*.5),fs:sc(9,W),fw:'600',fill:'#4F46E5',ff:'JetBrains Mono'}),
      tx('The Future\nof Design',{l:Math.round(W*.06),t:Math.round(H*.14),w:Math.round(W*.56),fs:sc(72,W),fw:'900',fill:'#0F172A',ff:'Cormorant Garamond',lh:.9}),
      bx({l:Math.round(W*.06),t:Math.round(H*.64),w:Math.round(W*.24),h:2,fill:'#0F172A'}),
      tx('A deep dive into visual systems that shape how the world works.',{l:Math.round(W*.06),t:Math.round(H*.66),w:Math.round(W*.48),fs:sc(14,W),fill:'#475569',lh:1.7}),
      bx({l:Math.round(W*.64),t:0,w:Math.round(W*.36),h:H,fill:'#0F172A'}),
    ]),
  },
  { id:'pull-quote', label:'Pull Quote', cat:'Editorial',
    build:(W:number,H:number)=>pg('#0F172A',[
      tx('"',{l:Math.round(W*.07),t:Math.round(H*.05),w:100,fs:sc(160,W),fw:'900',fill:'#4F46E5',ff:'Inter',lh:1}),
      tx('The best designs solve real problems elegantly — not just look good.',{l:Math.round(W*.07),t:Math.round(H*.28),w:Math.round(W*.78),fs:sc(34,W),fw:'600',fill:'#FFFFFF',ff:'Cormorant Garamond',lh:1.2}),
      bx({l:Math.round(W*.07),t:Math.round(H*.72),w:44,h:3,fill:'#4F46E5',rx:2}),
      tx('— Author Name, Title',{l:Math.round(W*.07),t:Math.round(H*.72)+18,w:Math.round(W*.6),fs:sc(13,W),fill:'rgba(255,255,255,.4)'}),
    ]),
  },
  { id:'two-col', label:'Two Column', cat:'Editorial',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:0,w:W,h:4,fill:'#0F172A'}),
      tx('Two Column Article',{l:50,t:36,w:W-100,fs:sc(30,W),fw:'800',fill:'#0F172A',ff:'Inter'}),
      bx({l:50,t:36+sc(30,W)+14,w:W-100,h:1,fill:'#E2E8F0'}),
      bx({l:Math.round(W*.5),t:Math.round(H*.26),w:1,h:Math.round(H*.65),fill:'#E2E8F0'}),
      tx('Start your first column here. This layout works beautifully for long-form articles.',{l:50,t:Math.round(H*.26)+14,w:Math.round(W*.43),fs:sc(14,W),fill:'#374151',lh:1.75}),
      tx('The second column continues the story. Use it to elaborate or contrast ideas.',{l:Math.round(W*.52),t:Math.round(H*.26)+14,w:Math.round(W*.43),fs:sc(14,W),fill:'#374151',lh:1.75}),
    ]),
  },
  // MINIMAL
  { id:'minimal-dark', label:'Dark Minimal', cat:'Minimal',
    build:(W:number,H:number)=>pg('#09090B',[
      bx({l:Math.round(W*.07),t:Math.round(H*.44),w:Math.round(W*.86),h:1,fill:'rgba(255,255,255,.08)'}),
      tx('Minimal.',{l:Math.round(W*.07),t:Math.round(H*.2),w:W-100,fs:sc(80,W),fw:'800',fill:'#FFFFFF',ff:'Inter'}),
      tx('Sometimes restraint is everything.',{l:Math.round(W*.07),t:Math.round(H*.2)+sc(80,W)+18,w:Math.round(W*.6),fs:sc(18,W),fill:'rgba(255,255,255,.35)'}),
    ]),
  },
  { id:'minimal-light', label:'Light Minimal', cat:'Minimal',
    build:(W:number,H:number)=>pg('#FAFAF8',[
      tx('Elegant\n& Simple',{l:Math.round(W*.1),t:Math.round(H*.3),w:Math.round(W*.8),fs:sc(64,W),fw:'300',fill:'#0F172A',ff:'Cormorant Garamond',ta:'center',lh:1.0}),
      bx({l:Math.round(W*.5)-24,t:Math.round(H*.66),w:48,h:2,fill:'#CBD5E1',rx:1}),
      tx('Restraint is a design decision, not a limitation.',{l:Math.round(W*.18),t:Math.round(H*.66)+14,w:Math.round(W*.64),fs:sc(14,W),fill:'#94A3B8',ta:'center',lh:1.7}),
    ]),
  },
  // FEATURE / CONTENT
  { id:'three-col', label:'3 Columns', cat:'Feature',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:0,w:W,h:4,fill:'#4F46E5'}),
      tx('Three Column Layout',{l:50,t:40,w:W-100,fs:sc(28,W),fw:'700',fill:'#0F172A',ff:'Inter'}),
      bx({l:50,t:40+sc(28,W)+12,w:W-100,h:1,fill:'#E2E8F0'}),
      ...([['Feature One','#4F46E5','#EEF2FF'],['Feature Two','#10B981','#F0FDF4'],['Feature Three','#F59E0B','#FFFBEB']].map(([title,col,bg],i)=>{
        const cw=Math.round((W-140)/3), cx=50+i*(cw+20)
        return [bx({l:cx,t:Math.round(H*.34),w:cw,h:Math.round(H*.5),fill:bg,rx:14}),bx({l:cx+20,t:Math.round(H*.34)+20,w:44,h:44,fill:col,rx:10}),tx(title,{l:cx+16,t:Math.round(H*.34)+82,w:cw-32,fs:sc(17,W),fw:'700',fill:'#0F172A'}),tx('A clear benefit-oriented description of this feature and why it matters.',{l:cx+16,t:Math.round(H*.34)+82+sc(17,W)+10,w:cw-32,fs:sc(13,W),fill:'#64748B',lh:1.6})]
      })).flat(),
    ]),
  },
  { id:'metrics-dark', label:'KPI Dark', cat:'Feature',
    build:(W:number,H:number)=>pg('#090C14',[
      bx({l:0,t:0,w:W,h:H,fill:'#090C14'}),
      tx('Performance Overview',{l:Math.round(W*.05),t:40,w:Math.round(W*.7),fs:sc(26,W),fw:'700',fill:'#FFFFFF',ff:'Inter'}),
      ...([['↑ 47%','Revenue','+$2.4M','#10B981'],['↑ 23K','Users','Active','#6366F1'],['94%','Retention','Score','#F59E0B'],['4.8★','Rating','App Store','#EC4899']].map(([val,lbl,sub,col],i)=>{
        const cw=Math.round((W-120)/4), cx=50+i*(cw+13)
        return [bx({l:cx,t:Math.round(H*.28),w:cw,h:Math.round(H*.55),fill:'rgba(255,255,255,.04)',rx:12}),bx({l:cx,t:Math.round(H*.28),w:cw,h:3,fill:col,rx:2}),tx(val,{l:cx+16,t:Math.round(H*.28)+24,w:cw-32,fs:sc(34,W),fw:'800',fill:col,ff:'Inter'}),tx(lbl,{l:cx+16,t:Math.round(H*.28)+24+sc(34,W)+8,w:cw-32,fs:sc(14,W),fw:'600',fill:'rgba(255,255,255,.75)'}),tx(sub,{l:cx+16,t:Math.round(H*.28)+24+sc(34,W)+8+sc(14,W)+4,w:cw-32,fs:9,fill:'rgba(255,255,255,.3)',ff:'JetBrains Mono'})]
      })).flat(),
    ]),
  },
  { id:'agenda', label:'Agenda', cat:'Feature',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:0,w:W,h:4,fill:'#6366F1'}),
      tx("Today's Agenda",{l:Math.round(W*.06),t:38,w:Math.round(W*.7),fs:sc(36,W),fw:'900',fill:'#0F172A',ff:'Inter'}),
      ...([['01','Opening & Welcome','10 min'],['02','Product Deep Dive','25 min'],['03','Live Demo','15 min'],['04','Q&A Session','15 min'],['05','Next Steps','5 min']].map(([num,item,time],i)=>{
        const y=Math.round(H*.22)+i*Math.round(H*.13)
        return [bx({l:Math.round(W*.06),t:y,w:Math.round(W*.88),h:Math.round(H*.11),fill:i%2===0?'#F9FAFB':'#FFFFFF',rx:10}),tx(num,{l:Math.round(W*.06)+18,t:y+Math.round(H*.03),w:30,fs:sc(12,W),fw:'800',fill:'#6366F1',ff:'JetBrains Mono'}),tx(item,{l:Math.round(W*.06)+62,t:y+Math.round(H*.03),w:Math.round(W*.6),fs:sc(15,W),fw:'600',fill:'#0F172A'}),tx(time,{l:Math.round(W*.76),t:y+Math.round(H*.03),w:120,fs:sc(11,W),fill:'#94A3B8',ta:'right',ff:'JetBrains Mono'})]
      })).flat(),
    ]),
  },
  // CLOSING
  { id:'testimonial', label:'Testimonial', cat:'Closing',
    build:(W:number,H:number)=>pg('#FAFAFA',[
      bx({l:Math.round(W*.5)-40,t:Math.round(H*.2),w:80,h:2,fill:'#4F46E5',rx:1}),
      tx('"Working with this team transformed our business in ways we never imagined."',{l:Math.round(W*.08),t:Math.round(H*.28),w:Math.round(W*.84),fs:sc(26,W),fw:'500',fill:'#0F172A',ff:'Cormorant Garamond',ta:'center',lh:1.35}),
      bx({l:Math.round(W*.5)-20,t:Math.round(H*.7),w:40,h:40,fill:'#E2E8F0',rx:20}),
      tx('Sarah Chen · Head of Product, Acme Corp',{l:Math.round(W*.08),t:Math.round(H*.7)+52,w:Math.round(W*.84),fs:sc(13,W),fill:'#64748B',ta:'center'}),
    ]),
  },
  { id:'thank-you', label:'Thank You', cat:'Closing',
    build:(W:number,H:number)=>pg('#FFFFFF',[
      bx({l:0,t:H-5,w:W,h:5,fill:'#4F46E5'}),
      tx('Thank\nYou.',{l:Math.round(W*.1),t:Math.round(H*.25),w:Math.round(W*.8),fs:sc(80,W),fw:'900',fill:'#0F172A',ta:'center',ff:'Inter',lh:.95}),
      bx({l:Math.round(W*.5)-36,t:Math.round(H*.7),w:72,h:3,fill:'#4F46E5',rx:2}),
      tx('hello@yourcompany.com · yourwebsite.com',{l:Math.round(W*.12),t:Math.round(H*.72),w:Math.round(W*.76),fs:sc(15,W),fill:'#64748B',ta:'center'}),
    ]),
  },
  { id:'section-break', label:'Section Break', cat:'Closing',
    build:(W:number,H:number)=>pg('#1E1B4B',[
      bx({l:0,t:0,w:W,h:H,fill:'#1E1B4B'}),
      bx({l:Math.round(W*.07),t:Math.round(H*.38),w:Math.round(W*.12),h:2,fill:'rgba(255,255,255,.25)'}),
      tx('SECTION 02',{l:Math.round(W*.07)+Math.round(W*.14),t:Math.round(H*.38)-2,w:200,fs:sc(10,W),fw:'700',fill:'rgba(255,255,255,.3)',ff:'JetBrains Mono'}),
      tx('Deep\nDive',{l:Math.round(W*.07),t:Math.round(H*.48),w:Math.round(W*.7),fs:sc(64,W),fw:'900',fill:'#FFFFFF',ff:'Inter',lh:.95}),
    ]),
  },
]

const LAYOUT_CATS = ['All','Hero','Pitch','Proposal','Editorial','Minimal','Feature','Closing']

// ─── Small UI helpers ─────────────────────────────────────────────────────────
function Sec({label,children,open:defaultOpen=true}:{label:string;children:React.ReactNode;open?:boolean}) {
  const [o,setO]=useState(defaultOpen)
  return (
    <div style={{borderBottom:`1px solid ${C.border}`,padding:'9px 13px 11px'}}>
      <button onClick={()=>setO(!o)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',border:'none',background:'none',cursor:'pointer',padding:'0 0 7px'}}>
        <span style={{fontSize:9,fontWeight:800,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',fontFamily:Fui}}>{label}</span>
        <svg width="9" height="5" viewBox="0 0 9 5" fill="none" style={{transform:o?'rotate(0)':'rotate(-90deg)',transition:'transform .15s'}}><path d="M1 1l3.5 3L8 1" stroke={C.textSm} strokeWidth="1.3" strokeLinecap="round"/></svg>
      </button>
      {o&&children}
    </div>
  )
}

function Num({label,value,onChange,step=1}:{label:string;value:number;onChange:(v:number)=>void;step?:number}){
  return (
    <div>
      <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4,fontFamily:Fui}}>{label}</div>
      <input type="number" value={value} step={step} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{width:'100%',padding:'6px 8px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontFamily:Fmono,color:C.text,background:'#fff',outline:'none'}}
        onFocus={e=>{e.target.style.borderColor=C.accent}} onBlur={e=>{e.target.style.borderColor=C.border}}/>
    </div>
  )
}

function Sld({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void}){
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',fontFamily:Fui}}>{label}</span>
        <span style={{fontSize:10,color:C.textMd,fontFamily:Fmono}}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:C.accent,height:4,cursor:'pointer'}}/>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EDITOR
// ════════════════════════════════════════════════════════════════════════════
export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc, setDoc] = useState<Doc|null>(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date|null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showShare, setShowShare] = useState(false)
  const [showDrafter, setShowDrafter] = useState(false)
  const [showStart, setShowStart] = useState(false)
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

  const [canvasW, setCanvasW] = useState(1280)
  const [canvasH, setCanvasH] = useState(720)
  const [zoom, setZoom] = useState(0.62)

  const [activeTool, setActiveTool] = useState('select')
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [fontColor, setFontColor] = useState('#18181B')
  const [fillColor, setFillColor] = useState('#4F46E5')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('Inter')
  const [fontSearch, setFontSearch] = useState('')
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [stockImages, setStockImages] = useState<string[]>([])

  const histStack = useRef<any[]>([])
  const histIdx = useRef(-1)
  const isUR = useRef(false)
  const saveTimer = useRef<NodeJS.Timeout|null>(null)
  const pagesRef = useRef<any[]>([])
  const cpRef = useRef(0)
  const cWRef = useRef(1280)
  const cHRef = useRef(720)
  const zoomRef = useRef(0.62)

  useEffect(()=>{pagesRef.current=pages},[pages])
  useEffect(()=>{cpRef.current=currentPage},[currentPage])
  useEffect(()=>{cWRef.current=canvasW},[canvasW])
  useEffect(()=>{cHRef.current=canvasH},[canvasH])
  useEffect(()=>{zoomRef.current=zoom},[zoom])

  useEffect(()=>{
    const url='https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap'
    if(!document.querySelector(`link[href="${url}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=url;document.head.appendChild(l)}
  },[])

  useEffect(()=>{
    if(!(window as any).fabric){
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';s.onload=()=>initFabric();document.head.appendChild(s)
    } else { initFabric() }
    if(!(window as any).jspdf){const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';document.head.appendChild(s)}
    loadDoc(); loadLinks()
  },[params.id]) // eslint-disable-line

  async function loadDoc(){
    const{data}=await supabase.from('documents').select('*').eq('id',params.id).single()
    if(!data){router.push('/dashboard');return}
    setDoc(data);setTitle(data.title)
    const cd=(data as any).canvas_data
    if(cd?.pages?.length){
      setPages(cd.pages);pagesRef.current=cd.pages
      if(cd.canvasW){setCanvasW(cd.canvasW);cWRef.current=cd.canvasW}
      if(cd.canvasH){setCanvasH(cd.canvasH);cHRef.current=cd.canvasH}
      loadIntoFabric(cd.pages[0],cd.canvasW||1280,cd.canvasH||720)
    } else { setShowStart(true) }
  }
  async function loadLinks(){const{data}=await supabase.from('share_links').select('*').eq('document_id',params.id).order('created_at',{ascending:false});setShareLinks(data??[])}

  // ── The correct sharp-rendering Fabric init ───────────────────────────────
  // KEY: use enableRetinaScaling:true so Fabric handles DPR internally.
  // Set canvas logical size = canvasW * zoom, set Fabric zoom = zoom.
  // NO CSS transform. NO manual DPR multiplication outside Fabric.
  function initFabric(){
    if(fabricReady.current||!canvasEl.current)return
    if(!(window as any).fabric){setTimeout(initFabric,80);return}
    const fab=(window as any).fabric
    fabricLib.current=fab
    const W=cWRef.current, H=cHRef.current, z=zoomRef.current

    const fc=new fab.Canvas(canvasEl.current,{
      width:Math.round(W*z),
      height:Math.round(H*z),
      backgroundColor:'#ffffff',
      selection:true,
      preserveObjectStacking:true,
      enableRetinaScaling:true,  // Fabric handles DPR — this is the key fix
    })
    fc.setZoom(z)
    fabricRef.current=fc;(window as any).__fabricCanvas=fc
    fabricReady.current=true

    // Smart snapping guides
    let vL:any=null,hL:any=null
    fc.on('object:moving',(e:any)=>{
      if(vL){fc.remove(vL);vL=null};if(hL){fc.remove(hL);hL=null}
      const o=e.target,W=cWRef.current,H=cHRef.current
      const cx=o.left+(o.width*(o.scaleX||1))/2,cy=o.top+(o.height*(o.scaleY||1))/2
      if(Math.abs(cx-W/2)<8){o.set('left',W/2-(o.width*(o.scaleX||1))/2);vL=new fab.Line([W/2,0,W/2,H],{stroke:'#EF4444',strokeWidth:0.5,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.6});fc.add(vL)}
      if(Math.abs(cy-H/2)<8){o.set('top',H/2-(o.height*(o.scaleY||1))/2);hL=new fab.Line([0,H/2,W,H/2],{stroke:'#EF4444',strokeWidth:0.5,strokeDashArray:[4,4],selectable:false,evented:false,opacity:.6});fc.add(hL)}
    })
    fc.on('object:moved',()=>{if(vL){fc.remove(vL);vL=null};if(hL){fc.remove(hL);hL=null};fc.renderAll();scheduleSave()})
    fc.on('object:modified',()=>{scheduleSave();thumb(cpRef.current)})
    fc.on('selection:created',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:updated',(e:any)=>syncSel(e.selected?.[0]))
    fc.on('selection:cleared',()=>setSelectedObj(null))
    fc.on('text:changed',()=>scheduleSave())
    fc.on('path:created',()=>pushHist())
  }

  // ── Zoom — resize canvas + Fabric zoom, NO CSS transform ─────────────────
  function applyZoom(z:number){
    const fc=fabricRef.current; if(!fc)return
    const W=cWRef.current, H=cHRef.current
    fc.setWidth(Math.round(W*z))
    fc.setHeight(Math.round(H*z))
    fc.setZoom(z)
    fc.renderAll()
  }

  function pushHist(){
    if(isUR.current||!fabricRef.current)return
    const s=fabricRef.current.toJSON()
    histStack.current=histStack.current.slice(0,histIdx.current+1)
    if(histStack.current.length>=60)histStack.current.shift()
    histStack.current.push(s);histIdx.current=histStack.current.length-1
  }
  function undo(){if(histIdx.current<=0)return;isUR.current=true;histIdx.current--;fabricRef.current?.loadFromJSON(histStack.current[histIdx.current],()=>{fabricRef.current.renderAll();isUR.current=false})}
  function redo(){if(histIdx.current>=histStack.current.length-1)return;isUR.current=true;histIdx.current++;fabricRef.current?.loadFromJSON(histStack.current[histIdx.current],()=>{fabricRef.current.renderAll();isUR.current=false})}

  function loadIntoFabric(json:any,W:number,H:number,z=zoomRef.current){
    const attempt=()=>{
      if(fabricRef.current){
        fabricRef.current.setWidth(Math.round(W*z))
        fabricRef.current.setHeight(Math.round(H*z))
        fabricRef.current.setZoom(z)
        fabricRef.current.loadFromJSON(json,()=>{fabricRef.current.renderAll();pushHist()})
      } else { setTimeout(attempt,80) }
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

  function thumb(idx:number){
    try{const u=fabricRef.current?.toDataURL({format:'jpeg',quality:.3,multiplier:0.1});if(u)setThumbnails(p=>({...p,[idx]:u}))}catch(e){}
  }

  function scheduleSave(){
    if(saveTimer.current)clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(()=>saveCanvas(),1800)
  }

  const saveCanvas=useCallback(async()=>{
    if(!fabricRef.current)return
    setSaving(true)
    const cur=fabricRef.current.toJSON()
    const all=[...pagesRef.current];all[cpRef.current]=cur
    pagesRef.current=all;setPages([...all])
    await supabase.from('documents').update({canvas_data:{pages:all,canvasW:cWRef.current,canvasH:cHRef.current},updated_at:new Date().toISOString()} as any).eq('id',params.id)
    setSaving(false);setLastSaved(new Date());thumb(cpRef.current)
  },[params.id])

  async function saveTitle(){await supabase.from('documents').update({title:title||'Untitled'}).eq('id',params.id)}
  async function publish(){await supabase.from('documents').update({status:'active'}).eq('id',params.id);setDoc(p=>p?{...p,status:'active'}:p);setShowShare(true)}

  function switchPage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[cpRef.current]=fabricRef.current.toJSON()
    pagesRef.current=upd;setPages([...upd]);setCurrentPage(idx);cpRef.current=idx
    loadIntoFabric(upd[idx],cWRef.current,cHRef.current)
    histStack.current=[];histIdx.current=-1
  }
  function addPage(){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[cpRef.current]=fabricRef.current.toJSON()
    const blank=pg(bgColor),ni=upd.length
    upd.push(blank);pagesRef.current=upd;setPages([...upd]);setCurrentPage(ni);cpRef.current=ni
    loadIntoFabric(blank,cWRef.current,cHRef.current)
    histStack.current=[];histIdx.current=-1
  }
  function dupPage(idx:number){
    if(!fabricRef.current)return
    const upd=[...pagesRef.current];upd[cpRef.current]=fabricRef.current.toJSON()
    const copy=JSON.parse(JSON.stringify(upd[idx]));upd.splice(idx+1,0,copy)
    pagesRef.current=upd;setPages([...upd]);switchPage(idx+1)
  }
  function delPage(idx:number){
    if(pagesRef.current.length<=1)return
    const upd=pagesRef.current.filter((_:any,i:number)=>i!==idx)
    pagesRef.current=upd;setPages([...upd])
    const ni=Math.min(cpRef.current,upd.length-1);setCurrentPage(ni);cpRef.current=ni
    loadIntoFabric(upd[ni],cWRef.current,cHRef.current)
  }

  function applyLayout(l:any){
    if(!fabricRef.current)return
    const built=l.build(cWRef.current,cHRef.current)
    fabricRef.current.loadFromJSON(built,()=>{fabricRef.current.renderAll();pushHist();scheduleSave()})
  }
  function startBlank(sizeId='pres-169'){
    const sz=SIZES.find(s=>s.id===sizeId)||SIZES[0]
    setCanvasW(sz.w);setCanvasH(sz.h);cWRef.current=sz.w;cHRef.current=sz.h
    const blank=pg();pagesRef.current=[blank];setPages([blank])
    setCurrentPage(0);cpRef.current=0;setShowStart(false);setThumbnails({})
    loadIntoFabric(blank,sz.w,sz.h)
  }

  function setTool(t:string){
    setActiveTool(t)
    const fc=fabricRef.current; if(!fc)return
    fc.isDrawingMode=t==='draw'
    if(t==='draw'&&fc.freeDrawingBrush){fc.freeDrawingBrush.color=fontColor;fc.freeDrawingBrush.width=3}
    if(t==='text'){
      const fab=fabricLib.current||(window as any).fabric; if(!fab)return
      const tb=new fab.Textbox('Click to edit',{left:100,top:100,width:340,fontSize:24,fontFamily,fill:fontColor,fontWeight:'400',editable:true,lineHeight:1.35})
      fc.add(tb);fc.setActiveObject(tb);fc.renderAll();pushHist();setActiveTool('select');fc.isDrawingMode=false
    }
  }

  function addShape(type:string,opts:any={}){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    const fill=opts.fill||fillColor
    let shape:any
    if(type==='rect')shape=new fab.Rect({left:120,top:120,width:220,height:110,fill,rx:opts.rx||0})
    else if(type==='circle')shape=new fab.Circle({left:120,top:120,radius:70,fill})
    else if(type==='triangle')shape=new fab.Triangle({left:120,top:120,width:140,height:120,fill})
    else if(type==='line')shape=new fab.Line([100,200,420,200],{stroke:fill,strokeWidth:3,selectable:true})
    else if(type==='star'){const pts=[],or=70,ir=30,cx=140,cy=140;for(let i=0;i<10;i++){const r=i%2===0?or:ir,a=(i*Math.PI/5)-Math.PI/2;pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)})};shape=new fab.Polygon(pts,{fill,left:100,top:100})}
    if(shape){fc.add(shape);fc.setActiveObject(shape);fc.renderAll();pushHist()}
  }

  function addTable(){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    for(let i=0;i<4;i++)for(let j=0;j<3;j++){
      fc.add(new fab.Rect({left:100+j*160,top:100+i*42,width:160,height:42,fill:i===0?'#0F172A':i%2===0?'#F9FAFB':'#FFFFFF',stroke:'#E2E8F0',strokeWidth:1,selectable:true}))
      fc.add(new fab.IText(i===0?`Col ${j+1}`:`R${i}·C${j+1}`,{left:110+j*160,top:114+i*42,width:140,fontSize:12,fontFamily:'Inter',fill:i===0?'#ffffff':'#374151',fontWeight:i===0?'600':'400',editable:true,selectable:true}))
    }
    fc.renderAll();pushHist()
  }

  function uploadImage(file:File){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    const r=new FileReader();r.onload=e=>fab.Image.fromURL(e.target?.result as string,(img:any)=>{const s=Math.min(400/img.width,300/img.height,1);img.set({left:120,top:120,scaleX:s,scaleY:s});fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHist()})
    r.readAsDataURL(file)
  }
  function addStockImg(url:string){
    const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
    fab.Image.fromURL(url,(img:any)=>{const s=Math.min(cWRef.current/img.width,cHRef.current/img.height,1);img.set({left:0,top:0,scaleX:s,scaleY:s,crossOrigin:'anonymous'});fc.add(img);fc.setActiveObject(img);fc.renderAll();pushHist()},{crossOrigin:'anonymous'})
  }
  function loadFont(family:string){
    const safe=family.replace(/ /g,'+');if(document.querySelector(`link[data-f="${safe}"]`))return
    const l=document.createElement('link');l.rel='stylesheet';l.href=`https://fonts.googleapis.com/css2?family=${safe}:wght@300;400;500;600;700;800;900&display=swap`;l.setAttribute('data-f',safe);document.head.appendChild(l)
  }
  function applyFont(f:string){loadFont(f);setFontFamily(f);setShowFontPicker(false);upd('fontFamily',f)}
  function delSel(){const fc=fabricRef.current;if(!fc)return;fc.getActiveObjects().forEach((o:any)=>fc.remove(o));fc.discardActiveObject();fc.renderAll();setSelectedObj(null);pushHist()}
  function dupSel(){const fc=fabricRef.current;if(!fc)return;fc.getActiveObject()?.clone((c:any)=>{c.set({left:c.left+20,top:c.top+20});fc.add(c);fc.setActiveObject(c);fc.renderAll();pushHist()})}
  function grpSel(){const fc=fabricRef.current;if(!fc||fc.getActiveObject()?.type!=='activeSelection')return;fc.getActiveObject().toGroup();fc.renderAll();pushHist()}
  function ungrpSel(){const fc=fabricRef.current;if(!fc||fc.getActiveObject()?.type!=='group')return;fc.getActiveObject().toActiveSelection();fc.renderAll();pushHist()}
  function upd(prop:string,val:any){const fc=fabricRef.current;if(!fc)return;const o=fc.getActiveObject();if(!o)return;o.set(prop,val);fc.renderAll();scheduleSave()}

  // ── Export — render at FULL resolution (no zoom applied) ─────────────────
  async function exportPDF(){
    const fc=fabricRef.current;if(!fc||(window as any).jspdf===undefined)return
    const{jsPDF}=(window as any).jspdf
    const saved=[...pagesRef.current];saved[cpRef.current]=fc.toJSON()
    const pdf=new jsPDF({orientation:cWRef.current>cHRef.current?'landscape':'portrait',unit:'px',format:[cWRef.current,cHRef.current]})
    for(let i=0;i<saved.length;i++){
      if(i>0)pdf.addPage()
      await new Promise<void>(res=>{
        const tmp=document.createElement('canvas');tmp.width=cWRef.current;tmp.height=cHRef.current
        const tfc=new (window as any).fabric.StaticCanvas(tmp,{width:cWRef.current,height:cHRef.current,enableRetinaScaling:false})
        tfc.loadFromJSON(saved[i],()=>{tfc.setZoom(1);tfc.renderAll();pdf.addImage(tfc.toDataURL({format:'jpeg',quality:.95,multiplier:1}),'JPEG',0,0,cWRef.current,cHRef.current);tfc.dispose();res()})
      })
    }
    pdf.save(`${title||'document'}.pdf`)
  }
  async function exportPNG(){
    // Export at full resolution regardless of zoom
    const fc=fabricRef.current;if(!fc)return
    const cur=fc.toJSON()
    const tmp=document.createElement('canvas');tmp.width=cWRef.current;tmp.height=cHRef.current
    const tfc=new (window as any).fabric.StaticCanvas(tmp,{width:cWRef.current,height:cHRef.current,enableRetinaScaling:false})
    tfc.loadFromJSON(cur,()=>{tfc.setZoom(1);tfc.renderAll();const a=document.createElement('a');a.href=tfc.toDataURL({format:'png',multiplier:1});a.download=`${title||'slide'}.png`;a.click();tfc.dispose()})
  }

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement).tagName
      if(tag==='INPUT'||tag==='TEXTAREA')return
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
      if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();redo()}
      if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();saveCanvas()}
      if((e.metaKey||e.ctrlKey)&&e.key==='d'){e.preventDefault();dupSel()}
      if((e.metaKey||e.ctrlKey)&&e.key==='g'){e.preventDefault();grpSel()}
      if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='G'){e.preventDefault();ungrpSel()}
      if((e.key==='Delete'||e.key==='Backspace')&&fabricRef.current?.getActiveObject())delSel()
      if(e.key==='Escape'){setSelectedObj(null);fabricRef.current?.discardActiveObject();fabricRef.current?.renderAll()}
      if(e.key==='v')setTool('select')
      if(e.key==='t')setTool('text')
      if(e.key==='p')setTool('draw')
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        const o=fabricRef.current?.getActiveObject();if(!o)return
        const d=e.shiftKey?10:1
        if(e.key==='ArrowLeft')o.set('left',(o.left||0)-d);if(e.key==='ArrowRight')o.set('left',(o.left||0)+d)
        if(e.key==='ArrowUp')o.set('top',(o.top||0)-d);if(e.key==='ArrowDown')o.set('top',(o.top||0)+d)
        fabricRef.current.renderAll();scheduleSave()
      }
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[saveCanvas]) // eslint-disable-line

  const isActive=doc?.status==='active'
  const filtLayouts=layoutCat==='All'?LAYOUTS:LAYOUTS.filter(l=>l.cat===layoutCat)
  const filtFonts=FONTS.filter(f=>f.toLowerCase().includes(fontSearch.toLowerCase()))

  // ── Layers panel ──────────────────────────────────────────────────────────
  function LayersPanel(){
    const [objs,setObjs]=useState<any[]>([])
    useEffect(()=>{
      const fc=fabricRef.current;if(!fc)return
      const r=()=>setObjs(fc.getObjects().slice().reverse())
      fc.on('object:added',r);fc.on('object:removed',r);fc.on('object:modified',r);fc.on('selection:created',r);fc.on('selection:cleared',r);r()
      return()=>{fc.off('object:added',r);fc.off('object:removed',r);fc.off('object:modified',r)}
    },[])
    if(objs.length===0)return<div style={{padding:'24px 14px',color:C.textSm,fontSize:12,textAlign:'center',fontFamily:Fui}}>No elements</div>
    return(
      <div style={{padding:'4px 6px',display:'flex',flexDirection:'column',gap:1}}>
        {objs.map((obj,i)=>{
          const active=fabricRef.current?.getActiveObject()===obj
          const lbl=obj.text?obj.text.slice(0,20)+(obj.text.length>20?'…':''):obj.type
          return(
            <div key={i} onClick={()=>{fabricRef.current?.setActiveObject(obj);fabricRef.current?.renderAll();syncSel(obj)}}
              style={{display:'flex',alignItems:'center',gap:7,padding:'6px 8px',borderRadius:7,cursor:'pointer',background:active?C.accentLt:'transparent',border:`1px solid ${active?C.accentMd:'transparent'}`,transition:'all .1s'}}>
              <span style={{fontSize:10,color:active?C.accent:C.textSm,width:14,flexShrink:0}}>{obj.type==='textbox'||obj.type==='text'?'T':obj.type==='image'?'▣':'◼'}</span>
              <span style={{flex:1,fontSize:11,fontFamily:Fui,color:active?C.accent:C.textMd,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:active?600:400}}>{lbl}</span>
              <button onClick={e=>{e.stopPropagation();obj.set('visible',!obj.visible);fabricRef.current?.renderAll();setObjs([...objs])}} style={{width:16,height:16,border:'none',background:'none',cursor:'pointer',color:C.textSm,padding:0,fontSize:9}}>{obj.visible===false?'○':'●'}</button>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Right panel ───────────────────────────────────────────────────────────
  function RightPanel(){
    const isT=selectedObj?.type==='textbox'||selectedObj?.type==='i-text'||selectedObj?.type==='text'
    const isI=selectedObj?.type==='image'
    const isS=selectedObj&&!isT&&!isI

    if(!selectedObj) return(
      <div style={{width:228,background:C.panel,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'auto'}}>
        <div style={{padding:'11px 13px 9px',borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:10,fontWeight:700,color:C.textMd,letterSpacing:'.04em',fontFamily:Fui}}>CANVAS</span>
        </div>
        <Sec label="Background">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="color" value={bgColor} onChange={e=>{setBgColor(e.target.value);if(fabricRef.current){fabricRef.current.backgroundColor=e.target.value;fabricRef.current.renderAll();scheduleSave()}}} style={{width:32,height:32,borderRadius:7,border:`1px solid ${C.border}`,cursor:'pointer',padding:0}}/>
            <span style={{fontSize:12,color:C.textMd,fontFamily:Fmono}}>{bgColor}</span>
          </div>
        </Sec>
        <Sec label="Canvas Size">
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {SIZES.map(sz=>(
              <button key={sz.id} onClick={()=>{setCanvasW(sz.w);setCanvasH(sz.h);cWRef.current=sz.w;cHRef.current=sz.h;applyZoom(zoomRef.current)}}
                style={{...UI,padding:'6px 9px',border:`1px solid ${canvasW===sz.w&&canvasH===sz.h?C.accent:C.border}`,borderRadius:8,background:canvasW===sz.w&&canvasH===sz.h?C.accentLt:'#fff',fontSize:11,cursor:'pointer',color:canvasW===sz.w&&canvasH===sz.h?C.accent:C.textMd,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>{sz.label}</span>
                <span style={{fontSize:9,color:C.textSm,fontFamily:Fmono}}>{sz.sub}</span>
              </button>
            ))}
          </div>
        </Sec>
      </div>
    )

    return(
      <div style={{width:228,background:C.panel,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
        <div style={{padding:'10px 13px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <span style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'capitalize',letterSpacing:'.04em',fontFamily:Fui}}>{selectedObj.type}</span>
          <div style={{display:'flex',gap:4}}>
            <button onClick={dupSel} style={{width:25,height:25,border:`1px solid ${C.border}`,borderRadius:5,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textMd}}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1"/><rect x="1" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1" fill="white"/></svg>
            </button>
            <button onClick={delSel} style={{width:25,height:25,border:`1px solid #FEE2E2`,borderRadius:5,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.red}}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5h8M4 2.5V2h3v.5M3.5 8.5V4.5M7.5 8.5V4.5M2 2.5l.7 7h5.6l.7-7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
        <div style={{flex:1,overflow:'auto'}}>
          <Sec label="Position & Size">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              <Num label="X" value={Math.round(selectedObj.left||0)} onChange={v=>upd('left',v)}/>
              <Num label="Y" value={Math.round(selectedObj.top||0)} onChange={v=>upd('top',v)}/>
              <Num label="W" value={Math.round(selectedObj.width||0)} onChange={v=>upd('width',v)}/>
              <Num label="H" value={Math.round(selectedObj.height||0)} onChange={v=>upd('height',v)}/>
            </div>
          </Sec>
          <Sec label="Appearance">
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {!isT&&<div>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5,fontFamily:Fui}}>Fill</div>
                <div style={{display:'flex',gap:7,alignItems:'center'}}>
                  <input type="color" value={typeof selectedObj.fill==='string'?selectedObj.fill:'#4f46e5'} onChange={e=>{setFillColor(e.target.value);upd('fill',e.target.value)}} style={{width:32,height:32,borderRadius:7,border:`1px solid ${C.border}`,cursor:'pointer',padding:0}}/>
                  <span style={{fontSize:12,color:C.textMd,fontFamily:Fmono}}>{typeof selectedObj.fill==='string'?selectedObj.fill:'—'}</span>
                </div>
              </div>}
              {isS&&<div>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5,fontFamily:Fui}}>Stroke</div>
                <div style={{display:'flex',gap:7,alignItems:'center'}}>
                  <input type="color" value={selectedObj.stroke||'#000000'} onChange={e=>upd('stroke',e.target.value)} style={{width:32,height:32,borderRadius:7,border:`1px solid ${C.border}`,cursor:'pointer',padding:0}}/>
                  <Num label="Width" value={selectedObj.strokeWidth||0} onChange={v=>upd('strokeWidth',v)}/>
                </div>
              </div>}
              <Sld label="Opacity" value={Math.round((selectedObj.opacity??1)*100)} min={0} max={100} onChange={v=>upd('opacity',v/100)}/>
              {isS&&selectedObj.type==='rect'&&<Num label="Corner radius" value={selectedObj.rx||0} onChange={v=>{upd('rx',v);upd('ry',v)}}/>}
            </div>
          </Sec>
          {isT&&<Sec label="Typography">
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              <div>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5,fontFamily:Fui}}>Color</div>
                <div style={{display:'flex',gap:7,alignItems:'center'}}>
                  <input type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);upd('fill',e.target.value)}} style={{width:32,height:32,borderRadius:7,border:`1px solid ${C.border}`,cursor:'pointer',padding:0}}/>
                  <span style={{fontSize:12,color:C.textMd,fontFamily:Fmono}}>{fontColor}</span>
                </div>
              </div>
              <div style={{position:'relative'}}>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4,fontFamily:Fui}}>Font</div>
                <button onClick={()=>setShowFontPicker(!showFontPicker)} style={{...UI,width:'100%',padding:'5px 8px',border:`1px solid ${C.border}`,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:500,color:C.text,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fontFamily}</span>
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke={C.textSm} strokeWidth="1.2" strokeLinecap="round"/></svg>
                </button>
                {showFontPicker&&<div style={{position:'absolute',top:'110%',left:0,right:0,background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,boxShadow:'0 8px 28px rgba(0,0,0,.12)',zIndex:200}}>
                  <div style={{padding:'6px 6px 3px'}}>
                    <input value={fontSearch} onChange={e=>setFontSearch(e.target.value)} placeholder="Search…" autoFocus style={{...UI,width:'100%',padding:'5px 8px',border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.text,background:C.bg,outline:'none'}}/>
                  </div>
                  <div style={{maxHeight:190,overflow:'auto',padding:'3px 5px 5px'}}>
                    {filtFonts.slice(0,60).map(f=><div key={f} onClick={()=>applyFont(f)} style={{...UI,padding:'5px 8px',cursor:'pointer',fontSize:12,borderRadius:5,fontFamily:`'${f}',sans-serif`,color:fontFamily===f?C.accent:C.textMd,background:fontFamily===f?C.accentLt:'transparent',fontWeight:fontFamily===f?700:400}}>{f}</div>)}
                  </div>
                </div>}
              </div>
              <Num label="Size" value={fontSize} onChange={v=>{setFontSize(v);upd('fontSize',v)}}/>
              <div>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5,fontFamily:Fui}}>Style</div>
                <div style={{display:'flex',gap:4}}>
                  {[
                    {l:'B',p:'fontWeight',on:'bold',off:'normal',active:selectedObj.fontWeight==='bold'||selectedObj.fontWeight===800,st:{fontWeight:800}},
                    {l:'I',p:'fontStyle',on:'italic',off:'normal',active:selectedObj.fontStyle==='italic',st:{fontStyle:'italic' as const}},
                    {l:'U',p:'underline',on:true,off:false,active:selectedObj.underline===true,st:{textDecoration:'underline' as const}},
                  ].map(f=><button key={f.l} onClick={()=>upd(f.p,f.active?f.off:f.on)} style={{padding:'4px 8px',fontSize:12,fontWeight:600,fontFamily:Fui,border:`1px solid ${f.active?C.accent:C.border}`,borderRadius:6,background:f.active?C.accentLt:'#fff',color:f.active?C.accent:C.textMd,cursor:'pointer',width:30,height:27,...f.st}}>{f.l}</button>)}
                </div>
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5,fontFamily:Fui}}>Align</div>
                <div style={{display:'flex',gap:4}}>
                  {(['left','center','right'] as const).map(a=><button key={a} onClick={()=>upd('textAlign',a)} style={{padding:'4px 8px',fontSize:11,fontFamily:Fui,border:`1px solid ${selectedObj.textAlign===a?C.accent:C.border}`,borderRadius:6,background:selectedObj.textAlign===a?C.accentLt:'#fff',color:selectedObj.textAlign===a?C.accent:C.textMd,cursor:'pointer',width:30,height:27}}>{a[0].toUpperCase()}</button>)}
                </div>
              </div>
              <Sld label="Line height" value={Math.round((selectedObj.lineHeight??1.35)*10)/10} min={0.8} max={3} onChange={v=>upd('lineHeight',v)}/>
            </div>
          </Sec>}
          <Sec label="Transform">
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              <Num label="Rotation" value={Math.round(selectedObj.angle||0)} onChange={v=>upd('angle',v)}/>
              <div>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4,fontFamily:Fui}}>Blend mode</div>
                <select value={selectedObj.globalCompositeOperation||'normal'} onChange={e=>upd('globalCompositeOperation',e.target.value)} style={{...UI,width:'100%',padding:'5px 8px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,color:C.text,background:'#fff',outline:'none'}}>
                  {BLENDS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5,fontFamily:Fui}}>Align to canvas</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3}}>
                  {[{l:'Left',f:()=>upd('left',0)},{l:'Ctr H',f:()=>upd('left',cWRef.current/2-(selectedObj.width*(selectedObj.scaleX||1))/2)},{l:'Right',f:()=>upd('left',cWRef.current-(selectedObj.width*(selectedObj.scaleX||1)))},{l:'Top',f:()=>upd('top',0)},{l:'Ctr V',f:()=>upd('top',cHRef.current/2-(selectedObj.height*(selectedObj.scaleY||1))/2)},{l:'Btm',f:()=>upd('top',cHRef.current-(selectedObj.height*(selectedObj.scaleY||1)))}].map(a=><button key={a.l} onClick={a.f} style={{...UI,padding:'4px 0',border:`1px solid ${C.border}`,borderRadius:5,background:'#fff',fontSize:9,cursor:'pointer',color:C.textMd,fontWeight:500}}>{a.l}</button>)}
                </div>
              </div>
            </div>
          </Sec>
        </div>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:C.bg,...UI,color:C.text,overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.borderMd};border-radius:99px}
        input[type=color]{-webkit-appearance:none;border:none;padding:0;overflow:hidden;border-radius:7px}input[type=color]::-webkit-color-swatch-wrapper{padding:0}input[type=color]::-webkit-color-swatch{border:none}
        .lt{height:38px;border:none;cursor:pointer;background:transparent;font-family:${Fui};font-size:11px;font-weight:600;color:${C.textMd};padding:0 11px;border-bottom:2px solid transparent;transition:all .13s;white-space:nowrap;flex-shrink:0}
        .lt:hover{color:${C.text}}.lt.on{color:${C.accent};border-bottom-color:${C.accent}}
        .tb{width:31px;height:29px;border:none;cursor:pointer;border-radius:6px;background:transparent;color:${C.textMd};display:flex;align-items:center;justify-content:center;transition:all .12s;flex-shrink:0}
        .tb:hover{background:${C.bg};color:${C.text}}.tb.on{background:${C.accentLt};color:${C.accent};border:1px solid ${C.accentMd}}
        .sc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:52px;border:1px solid ${C.border};border-radius:8px;background:#fff;cursor:pointer;font-size:9px;font-weight:700;color:${C.textMd};font-family:${Fui};transition:all .12s}
        .sc:hover{border-color:${C.accent};color:${C.accent};background:${C.accentLt}}
        .pt{cursor:pointer;border-radius:7px;border:1.5px solid ${C.border};overflow:hidden;transition:all .13s;background:#fff;flex-shrink:0;position:relative}
        .pt:hover{border-color:${C.borderMd}}.pt.on{border-color:${C.accent};box-shadow:0 0 0 2px ${C.accentLt}}
        .pt .pa{display:none}.pt:hover .pa{display:flex}
        .lc{transition:all .13s;border:1.5px solid ${C.border};border-radius:9px;overflow:hidden;cursor:pointer;background:#fff}
        .lc:hover{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentLt};transform:translateY(-1px)}
        .dv{width:1px;height:17px;background:${C.border};margin:0 2px;flex-shrink:0}
        .pa-btn{height:29px;padding:0 12px;border-radius:7px;font-size:12px;font-weight:700;border:none;background:${C.accent};color:white;cursor:pointer;font-family:${Fui};display:flex;align-items:center;gap:5px;transition:all .13s;flex-shrink:0}
        .pa-btn:hover{background:#4338CA}
        .sa-btn{height:29px;padding:0 11px;border-radius:7px;font-size:12px;font-weight:600;border:1px solid ${C.border};background:#fff;color:${C.textMd};cursor:pointer;font-family:${Fui};display:flex;align-items:center;gap:5px;transition:all .12s;flex-shrink:0}
        .sa-btn:hover{background:${C.bg};border-color:${C.borderMd};color:${C.text}}
        .cp{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;border:1px solid ${C.border};background:#fff;color:${C.textMd};cursor:pointer;font-family:${Fui};transition:all .11s;white-space:nowrap}
        .cp:hover{background:${C.bg}}.cp.on{background:${C.accentLt};color:${C.accent};border-color:${C.accentMd}}
        .si{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:7px;cursor:pointer;border:2px solid transparent;transition:border-color .13s}
        .si:hover{border-color:${C.accent}}
      `}</style>

      {/* ── TOP BAR ────────────────────────────────────────────────────── */}
      <div style={{height:49,background:C.panel,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 13px',gap:5,flexShrink:0,zIndex:30}}>
        <button onClick={()=>router.push('/dashboard')} style={{...UI,background:'none',border:'none',cursor:'pointer',color:C.textMd,display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:500,padding:'4px 6px',borderRadius:6,flexShrink:0}} onMouseOver={e=>(e.currentTarget.style.color=C.text)} onMouseOut={e=>(e.currentTarget.style.color=C.textMd)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 2L3 6.5l5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Docs
        </button>
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M1 1l3 4-3 4" stroke={C.border} strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled" style={{...UI,border:'none',outline:'none',fontSize:14,fontWeight:600,color:C.text,background:'transparent',maxWidth:180,minWidth:60,letterSpacing:'-.01em'}}/>
        <span style={{fontSize:10,color:saving?C.accent:C.textSm,fontFamily:Fmono,minWidth:50,flexShrink:0}}>{saving?'saving…':lastSaved?'✓ saved':''}</span>
        <span style={{padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,letterSpacing:'.06em',background:isActive?'#ECFDF5':'#F1F5F9',color:isActive?C.green:C.textSm,border:`1px solid ${isActive?'#A7F3D0':C.border}`,flexShrink:0}}>{isActive?'LIVE':'DRAFT'}</span>
        <div style={{flex:1}}/>
        {/* Tools */}
        <div style={{display:'flex',alignItems:'center',gap:1,background:C.bg,borderRadius:7,padding:2,border:`1px solid ${C.border}`}}>
          {[{id:'select',tip:'Select (V)',p:<path d="M2.5 1.5l7.5 4-3.5 1.1-1.6 3.9L2.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>},{id:'text',tip:'Text (T)',p:<><path d="M2 4h8M6 4v5M4 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>},{id:'draw',tip:'Draw (P)',p:<path d="M2 10l2-1 6-6-1-1-6 6-1 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>}].map(tool=>(
            <button key={tool.id} title={tool.tip} className={`tb${activeTool===tool.id?' on':''}`} onClick={()=>setTool(tool.id)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">{tool.p}</svg>
            </button>
          ))}
        </div>
        <div className="dv"/>
        <button onClick={undo} title="Undo ⌘Z" className="tb"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6A4 4 0 016 2.5H4M4 2.5L1.5 5 4 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <button onClick={redo} title="Redo ⌘⇧Z" className="tb"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 6A4 4 0 007 2.5H9M9 2.5l2.5 2.5L9 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div className="dv"/>
        <button onClick={()=>setShowDrafter(true)} className="sa-btn">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1l1.2 3H10L7.4 6l1 3L5.5 7.4 2.6 9l1-3L1 4h3.3L5.5 1z" fill={C.amber} stroke={C.amber} strokeWidth=".5" strokeLinejoin="round"/></svg> AI Draft
        </button>
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowExport(!showExport)} className="sa-btn">
            Export <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          {showExport&&<div style={{position:'absolute',top:'110%',right:0,background:C.panel,border:`1px solid ${C.border}`,borderRadius:9,boxShadow:'0 8px 24px rgba(0,0,0,.1)',zIndex:300,minWidth:144,padding:4}}>
            {[{l:'Export PDF',f:()=>{exportPDF();setShowExport(false)}},{l:'Export PNG',f:()=>{exportPNG();setShowExport(false)}}].map(b=><button key={b.l} onClick={b.f} style={{...UI,display:'flex',width:'100%',padding:'7px 12px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:500,color:C.textMd,borderRadius:6,textAlign:'left'}} onMouseOver={e=>(e.currentTarget.style.background=C.bg)} onMouseOut={e=>(e.currentTarget.style.background='none')}>{b.l}</button>)}
          </div>}
        </div>
        {isActive?<button onClick={()=>setShowShare(true)} className="pa-btn">Share</button>:<button onClick={publish} className="pa-btn">Publish & Share</button>}
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        {/* LEFT */}
        <div style={{width:244,background:C.panel,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,padding:'0 4px',flexShrink:0,overflowX:'auto'}}>
            {(['layouts','elements','text','media','layers'] as const).map(t=><button key={t} className={`lt${leftTab===t?' on':''}`} onClick={()=>setLeftTab(t)} style={{textTransform:'capitalize'}}>{t}</button>)}
          </div>
          <div style={{flex:1,overflow:'auto',padding:9}}>

            {leftTab==='layouts'&&<div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:9}}>
                {LAYOUT_CATS.map(c=><button key={c} className={`cp${layoutCat===c?' on':''}`} onClick={()=>setLayoutCat(c)}>{c}</button>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {filtLayouts.map(l=>(
                  <div key={l.id} className="lc" onClick={()=>applyLayout(l)}>
                    <div style={{aspectRatio:'16/9',background:l.build(160,90).background||'#F8FAFC',padding:4,position:'relative',overflow:'hidden',borderBottom:`1px solid ${C.border}`}}>
                      {l.build(160,90).objects?.slice(0,6).map((o:any,oi:number)=>o.type==='rect'&&<div key={oi} style={{position:'absolute',left:`${(o.left/160)*100}%`,top:`${(o.top/90)*100}%`,width:`${Math.min((o.width/160)*100,100)}%`,height:`${Math.min((o.height/90)*100,100)}%`,background:o.fill,borderRadius:o.rx?2:0,opacity:Math.min(o.opacity??1,1)}}/>)}
                    </div>
                    <div style={{padding:'5px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{...UI,fontSize:10,fontWeight:600,color:C.textMd}}>{l.label}</span>
                      <span style={{fontSize:8,color:C.textSm,background:C.bg,padding:'1px 5px',borderRadius:5}}>{l.cat}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>}

            {leftTab==='elements'&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <p style={{...UI,fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Shapes</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                  {[{id:'rect',l:'Rect',icon:<rect x="2" y="3" width="10" height="8" rx="1.5"/>},{id:'circle',l:'Circle',icon:<circle cx="7" cy="7" r="5"/>},{id:'triangle',l:'Tri',icon:<path d="M7 2l5.5 10H1.5L7 2z" strokeLinejoin="round"/>},{id:'star',l:'Star',icon:<path d="M7 1l1.5 3.5H12L9.2 6.6l1 3.4L7 8.4 3.8 10l1-3.4L2 4.5h3.5L7 1z" strokeLinejoin="round"/>},{id:'line',l:'Line',icon:<path d="M2 12L12 2"/>}].map(sh=>(
                    <button key={sh.id} className="sc" onClick={()=>addShape(sh.id)}>
                      <svg width="17" height="17" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">{sh.icon}</svg>{sh.l}
                    </button>
                  ))}
                  <button className="sc" onClick={addTable}><svg width="15" height="15" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1 5h12M1 9h12M5 5v7M9 5v7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>Table</button>
                  <button className="sc" onClick={()=>addShape('rect',{fill:'#4F46E5',rx:8})}><svg width="15" height="9" viewBox="0 0 15 9" fill="none"><rect x="1" y="1" width="13" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.1"/></svg>Btn</button>
                </div>
              </div>
              <div>
                <p style={{...UI,fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Fill Color</p>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <input type="color" value={fillColor} onChange={e=>setFillColor(e.target.value)} style={{width:34,height:34,borderRadius:8,border:`1px solid ${C.border}`,cursor:'pointer',padding:0}}/>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {['#4F46E5','#10B981','#F59E0B','#EF4444','#0F172A','#FFFFFF','#F8FAFC','#6366F1'].map(cc=><button key={cc} onClick={()=>setFillColor(cc)} style={{width:21,height:21,borderRadius:4,background:cc,border:`1.5px solid ${fillColor===cc?C.accent:C.border}`,cursor:'pointer',padding:0}}/>)}
                  </div>
                </div>
              </div>
            </div>}

            {leftTab==='text'&&<div style={{display:'flex',flexDirection:'column',gap:4}}>
              <p style={{...UI,fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>Add Text</p>
              {[{label:'Heading 1',fs:52,fw:'900',ff:'Inter',text:'Heading 1'},{label:'Heading 2',fs:36,fw:'700',ff:'Inter',text:'Heading 2'},{label:'Heading 3',fs:24,fw:'600',ff:'Inter',text:'Heading 3'},{label:'Body',fs:16,fw:'400',text:'Body text here'},{label:'Caption',fs:11,fw:'400',fill:'#64748B',text:'Caption text'},{label:'Label',fs:10,fw:'700',ff:'JetBrains Mono',fill:'#4F46E5',text:'LABEL'}].map(t=>(
                <button key={t.label} onClick={()=>{
                  const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
                  const tb=new fab.Textbox(t.text,{left:80,top:100,width:420,fontSize:t.fs,fontFamily:(t as any).ff||fontFamily,fill:(t as any).fill||fontColor,fontWeight:t.fw,editable:true,lineHeight:1.35})
                  fc.add(tb);fc.setActiveObject(tb);fc.renderAll();pushHist()
                }} style={{...UI,padding:'8px 11px',border:`1px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left',transition:'border-color .12s'}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.border)}>
                  <span style={{fontSize:Math.min(t.fs>30?16:t.fs>18?13:11,16),fontWeight:t.fw,fontFamily:`'${(t as any).ff||fontFamily}',sans-serif`,color:C.text}}>{t.label}</span>
                </button>
              ))}
              <div style={{marginTop:10}}>
                <p style={{...UI,fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Font Pairings</p>
                {FONT_PAIRS.map(p=>(
                  <button key={p.label} onClick={()=>{loadFont(p.h);loadFont(p.b)}} style={{...UI,padding:'8px 10px',border:`1px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left',width:'100%',marginBottom:4}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.textSm,marginBottom:2}}>{p.label}</div>
                    <div style={{fontSize:13,fontFamily:`'${p.h}',serif`,color:C.text,fontWeight:700}}>{p.h}</div>
                    <div style={{fontSize:10,fontFamily:`'${p.b}',sans-serif`,color:C.textMd}}>{p.b}</div>
                  </button>
                ))}
              </div>
            </div>}

            {leftTab==='media'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
              <label style={{...UI,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:9,border:`1px dashed ${C.borderMd}`,borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:600,color:C.textMd,background:C.bg}} onMouseOver={e=>(e.currentTarget.style.borderColor=C.accent)} onMouseOut={e=>(e.currentTarget.style.borderColor=C.borderMd)}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v7.5M4 4l2.5-3L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M1 9.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>Upload image
                <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/>
              </label>
              <div>
                <p style={{...UI,fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>Stock Photos</p>
                {stockImages.length===0
                  ?<button onClick={()=>setStockImages(['photo-1497366216548-37526070297c','photo-1497366754035-f200968a6e72','photo-1560472354-b33ff0c44a43','photo-1556761175-4b46a572b786','photo-1553484771-047a44eee27b','photo-1522202176988-66273c2fd55f','photo-1504384308090-c894fdcc538d','photo-1551434678-e076c223a692','photo-1573496359142-b8d87734a5a2','photo-1600880292203-757bb62b4baf','photo-1531297484001-80022131f5a1','photo-1519389950473-47ba0277781c'].map(id=>`https://images.unsplash.com/${id}?w=400&q=70&auto=format`))} style={{...UI,width:'100%',padding:'7px',border:`1px solid ${C.border}`,borderRadius:8,background:C.bg,cursor:'pointer',fontSize:11,color:C.textMd,fontWeight:600}}>Load photos</button>
                  :<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>{stockImages.map(url=><img key={url} src={url} alt="" className="si" onClick={()=>addStockImg(url)}/>)}</div>}
              </div>
            </div>}

            {leftTab==='layers'&&<LayersPanel/>}
          </div>
        </div>

        {/* CANVAS + RIGHT */}
        <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>
          <div style={{flex:1,overflow:'auto',background:C.canvas,backgroundImage:`radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)`,backgroundSize:'24px 24px',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'48px 36px',position:'relative'}}>
            {/* The canvas — no CSS transform, Fabric native zoom only */}
            <div style={{flexShrink:0,boxShadow:'0 6px 40px rgba(0,0,0,.12)',borderRadius:1,background:'#fff',lineHeight:0}}>
              <canvas ref={canvasEl}/>
            </div>
            {/* Zoom */}
            <div style={{position:'fixed',bottom:108,right:selectedObj?244:14,display:'flex',alignItems:'center',gap:1,background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:'2px 3px',boxShadow:'0 2px 10px rgba(0,0,0,.07)',zIndex:20}}>
              <button onClick={()=>{const z=Math.max(.1,zoom-.08);setZoom(z);zoomRef.current=z;applyZoom(z)}} style={{width:25,height:25,border:'none',background:'none',cursor:'pointer',borderRadius:5,color:C.textMd,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
              <span style={{...UI,fontSize:10,fontWeight:700,color:C.textMd,minWidth:36,textAlign:'center',fontFamily:Fmono}}>{Math.round(zoom*100)}%</span>
              <button onClick={()=>{const z=Math.min(2.5,zoom+.08);setZoom(z);zoomRef.current=z;applyZoom(z)}} style={{width:25,height:25,border:'none',background:'none',cursor:'pointer',borderRadius:5,color:C.textMd,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
              <div style={{width:1,height:15,background:C.border,margin:'0 1px'}}/>
              <button onClick={()=>{const z=.62;setZoom(z);zoomRef.current=z;applyZoom(z)}} style={{...UI,height:25,padding:'0 6px',border:'none',background:'none',cursor:'pointer',fontSize:9,fontWeight:700,color:C.textSm,borderRadius:4}}>FIT</button>
            </div>
            {/* Floating toolbar on selection */}
            {selectedObj&&<div style={{position:'fixed',top:57,left:'50%',transform:'translateX(-50%)',background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:'0 4px 18px rgba(0,0,0,.09)',padding:'3px 5px',display:'flex',alignItems:'center',gap:2,zIndex:50}}>
              {(selectedObj.type==='textbox'||selectedObj.type==='text'||selectedObj.type==='i-text')&&<>
                <button onClick={()=>setShowFontPicker(!showFontPicker)} style={{...UI,height:25,padding:'0 7px',border:`1px solid ${C.border}`,borderRadius:5,background:C.bg,cursor:'pointer',fontSize:11,fontFamily:`'${fontFamily}',sans-serif`,fontWeight:600,color:C.text,maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fontFamily}</button>
                <input type="number" value={fontSize} min={6} max={400} onChange={e=>{const v=parseInt(e.target.value)||fontSize;setFontSize(v);upd('fontSize',v)}} style={{...UI,width:42,height:25,border:`1px solid ${C.border}`,borderRadius:5,padding:'0 5px',fontSize:11,fontFamily:Fmono,color:C.text,background:C.bg,outline:'none',textAlign:'center'}}/>
                <input type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);upd('fill',e.target.value)}} style={{width:25,height:25,borderRadius:5,border:`1px solid ${C.border}`,cursor:'pointer',padding:0}}/>
                <div className="dv"/>
              </>}
              <button onClick={dupSel} style={{width:25,height:25,border:`1px solid ${C.border}`,borderRadius:5,background:C.bg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textMd}}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1"/><rect x="1" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1" fill="white"/></svg></button>
              <button onClick={delSel} style={{width:25,height:25,border:`1px solid #FEE2E2`,borderRadius:5,background:'#FFF5F5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.red}}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5h8M4 2.5V2h3v.5M3.5 8.5V4.5M7.5 8.5V4.5M2 2.5l.7 7h5.6l.7-7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg></button>
            </div>}
          </div>
          <RightPanel/>
        </div>
      </div>

      {/* ── PAGES ───────────────────────────────────────────────────────── */}
      <div style={{height:98,background:C.panel,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',flexShrink:0}}>
        <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',gap:7,padding:'0 12px',height:'100%'}}>
          {pages.map((_,i)=>{
            const tw=Math.round(canvasW*(68/canvasH))
            return(
              <div key={i} className={`pt${currentPage===i?' on':''}`} style={{width:tw,height:68}} onClick={()=>switchPage(i)}>
                {thumbnails[i]?<img src={thumbnails[i]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',background:'#F9FAFB',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:9,color:C.textSm,fontFamily:Fmono}}>{i+1}</span></div>}
                <div className="pa" style={{position:'absolute',top:3,right:3,gap:2}}>
                  <button onClick={e=>{e.stopPropagation();dupPage(i)}} style={{width:16,height:16,borderRadius:3,background:'rgba(255,255,255,.9)',border:`1px solid ${C.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textMd,padding:0,fontSize:8}}>⧉</button>
                  {pages.length>1&&<button onClick={e=>{e.stopPropagation();delPage(i)}} style={{width:16,height:16,borderRadius:3,background:'rgba(255,255,255,.9)',border:`1px solid #FECACA`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.red,padding:0,fontSize:10}}>×</button>}
                </div>
                <div style={{position:'absolute',bottom:2,left:0,right:0,textAlign:'center',fontSize:8,color:C.textSm,fontFamily:Fmono}}>{i+1}</div>
              </div>
            )
          })}
          <button onClick={addPage} style={{...UI,flexShrink:0,width:46,height:68,border:`1.5px dashed ${C.borderMd}`,borderRadius:7,background:'transparent',cursor:'pointer',fontSize:9,fontWeight:700,color:C.textSm,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all .13s'}} onMouseOver={e=>{(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.color=C.accent}} onMouseOut={e=>{(e.currentTarget).style.borderColor=C.borderMd;(e.currentTarget).style.color=C.textSm}}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Add
          </button>
        </div>
        <div style={{padding:'0 12px',borderLeft:`1px solid ${C.border}`,height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',flexShrink:0}}>
          <span style={{...UI,fontSize:11,fontWeight:700,color:C.textMd}}>{currentPage+1} / {pages.length}</span>
          <span style={{...UI,fontSize:9,color:C.textSm}}>pages</span>
        </div>
      </div>

      {/* ── START MODAL ─────────────────────────────────────────────────── */}
      {showStart&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'}}>
        <div style={{background:C.panel,borderRadius:16,width:'min(860px,96vw)',maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,.18)',border:`1px solid ${C.border}`}}>
          <div style={{padding:'22px 26px 14px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <h2 style={{...UI,margin:'0 0 3px',fontSize:19,fontWeight:800,color:C.text,letterSpacing:'-.02em'}}>Start designing</h2>
            <p style={{...UI,margin:0,fontSize:13,color:C.textMd}}>Choose a canvas size or start with a layout template</p>
          </div>
          <div style={{overflow:'auto',padding:'18px 26px',flex:1}}>
            <p style={{...UI,fontSize:9,fontWeight:800,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:9}}>Blank Canvas</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(112px,1fr))',gap:5,marginBottom:22}}>
              {SIZES.map(sz=>(
                <button key={sz.id} onClick={()=>startBlank(sz.id)} style={{...UI,padding:'10px 7px',border:`1px solid ${C.border}`,borderRadius:9,background:'#fff',cursor:'pointer',textAlign:'center',transition:'all .13s'}} onMouseOver={e=>{(e.currentTarget).style.borderColor=C.accent;(e.currentTarget).style.background=C.accentLt}} onMouseOut={e=>{(e.currentTarget).style.borderColor=C.border;(e.currentTarget).style.background='#fff'}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:2}}>{sz.label}</div>
                  <div style={{fontSize:9,color:C.textSm,fontFamily:Fmono}}>{sz.sub}</div>
                </button>
              ))}
            </div>
            <p style={{...UI,fontSize:9,fontWeight:800,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:9}}>Start with a Layout</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(136px,1fr))',gap:7}}>
              {LAYOUTS.map(l=>(
                <div key={l.id} className="lc" onClick={()=>{
                  const sz=SIZES[0];setCanvasW(sz.w);setCanvasH(sz.h);cWRef.current=sz.w;cHRef.current=sz.h
                  const built=l.build(sz.w,sz.h);pagesRef.current=[built];setPages([built]);setCurrentPage(0);cpRef.current=0;setShowStart(false);setThumbnails({})
                  loadIntoFabric(built,sz.w,sz.h)
                }}>
                  <div style={{aspectRatio:'16/9',background:l.build(160,90).background||'#F8FAFC',padding:4,position:'relative',overflow:'hidden'}}>
                    {l.build(160,90).objects?.slice(0,6).map((o:any,oi:number)=>o.type==='rect'&&<div key={oi} style={{position:'absolute',left:`${(o.left/160)*100}%`,top:`${(o.top/90)*100}%`,width:`${Math.min((o.width/160)*100,100)}%`,height:`${Math.min((o.height/90)*100,100)}%`,background:o.fill,borderRadius:o.rx?2:0,opacity:Math.min(o.opacity??1,1)}}/>)}
                  </div>
                  <div style={{padding:'5px 8px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${C.border}`}}>
                    <span style={{...UI,fontSize:10,fontWeight:600,color:C.textMd}}>{l.label}</span>
                    <span style={{fontSize:8,color:C.textSm,background:C.bg,padding:'1px 5px',borderRadius:5}}>{l.cat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>}

      {/* ── SHARE PANEL ─────────────────────────────────────────────────── */}
      {showShare&&<SharePanel documentId={params.id} links={shareLinks} onClose={()=>setShowShare(false)} onRefresh={loadLinks} isActive={isActive} onPublish={publish}/>}

      {/* ── AI DRAFTER ──────────────────────────────────────────────────── */}
      {showDrafter&&<AIDrafter documentType={doc?.type??'document'} onDraftComplete={(html:string)=>{
        const fab=fabricLib.current||(window as any).fabric; const fc=fabricRef.current; if(!fc||!fab)return
        const stripped=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
        const newPage=pg('#ffffff',[tx(stripped,{l:60,t:60,w:cWRef.current-120,fs:16,ff:'Inter',fill:'#18181B',lh:1.5})])
        const upd=[...pagesRef.current,newPage];pagesRef.current=upd;setPages(upd)
        const ni=upd.length-1;setCurrentPage(ni);cpRef.current=ni;loadIntoFabric(newPage,cWRef.current,cHRef.current);scheduleSave()
      }} onClose={()=>setShowDrafter(false)}/>}
    </div>
  )
}

// ── Share panel (inline, avoids extra import) ──────────────────────────────
function SharePanel({documentId,links,onClose,onRefresh,isActive,onPublish}:{documentId:string;links:ShareLink[];onClose:()=>void;onRefresh:()=>void;isActive:boolean;onPublish:()=>void}){
  const [creating,setCreating]=useState(false)
  const [label,setLabel]=useState('')
  const [reqEmail,setReqEmail]=useState(false)
  const [allowDl,setAllowDl]=useState(false)
  const [pw,setPw]=useState('')
  const [copied,setCopied]=useState<string|null>(null)
  const [showNew,setShowNew]=useState(links.length===0)
  const s:React.CSSProperties={fontFamily:Fui}

  async function create(){
    setCreating(true);const token=generateToken(14)
    await supabase.from('share_links').insert({document_id:documentId,token,label:label||'Share link',require_email:reqEmail,allow_download:allowDl,password:pw||null,is_active:true})
    await onRefresh();setShowNew(false);setLabel('');setPw('');setReqEmail(false);setAllowDl(false);setCreating(false)
  }
  function copy(token:string){navigator.clipboard.writeText(buildShareUrl(token));setCopied(token);setTimeout(()=>setCopied(null),2000)}
  async function toggle(id:string,active:boolean){await supabase.from('share_links').update({is_active:active}).eq('id',id);onRefresh()}
  async function del(id:string){await supabase.from('share_links').delete().eq('id',id);onRefresh()}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.38)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'flex-end',backdropFilter:'blur(4px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{width:416,height:'100vh',background:'#fff',borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',boxShadow:'-16px 0 48px rgba(0,0,0,.1)'}}>
        <div style={{padding:'20px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div><h2 style={{...s,margin:'0 0 2px',fontSize:16,fontWeight:700,color:C.text}}>Share & Track</h2><p style={{...s,margin:0,fontSize:12,color:C.textSm}}>{links.length} link{links.length!==1?'s':''} · {links.reduce((a,l)=>a+(l.view_count||0),0)} total views</p></div>
          <button onClick={onClose} style={{background:C.bg,border:`1px solid ${C.border}`,cursor:'pointer',color:C.textMd,padding:7,borderRadius:7,display:'flex'}}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 2l7 7M9 2L2 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>
        </div>
        {!isActive&&<div style={{margin:'12px 16px',padding:'11px 13px',background:'#FFFBEB',border:`1px solid #FDE68A`,borderRadius:9}}>
          <p style={{...s,fontSize:12,fontWeight:700,color:'#92400E',margin:'0 0 2px'}}>Not published</p>
          <p style={{...s,fontSize:11,color:'#A16207',margin:'0 0 7px'}}>Publish to enable link sharing.</p>
          <button onClick={onPublish} style={{...s,padding:'4px 11px',borderRadius:6,background:C.amber,color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>Publish now</button>
        </div>}
        <div style={{flex:1,overflow:'auto',padding:'14px 16px'}}>
          {links.length>0&&<div style={{marginBottom:16}}>
            <p style={{...s,fontSize:9,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:9}}>Active links</p>
            {links.map(link=>(
              <div key={link.id} style={{border:`1px solid ${C.border}`,borderRadius:11,padding:'12px 14px',marginBottom:7,background:C.bg}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:9}}>
                  <span style={{...s,flex:1,fontSize:13,fontWeight:600,color:C.text}}>{link.label??'Link'}</span>
                  <span style={{padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:700,background:link.is_active?'#ECFDF5':'#F1F5F9',color:link.is_active?C.green:C.textSm,border:`1px solid ${link.is_active?'#A7F3D0':C.border}`}}>{link.is_active?'LIVE':'OFF'}</span>
                </div>
                <div style={{display:'flex',gap:5,marginBottom:9}}>
                  <code style={{...s,flex:1,fontSize:10,color:C.textMd,background:'#fff',padding:'4px 7px',borderRadius:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',border:`1px solid ${C.border}`,fontFamily:Fmono}}>{buildShareUrl(link.token)}</code>
                  <button onClick={()=>copy(link.token)} style={{...s,padding:'4px 10px',background:copied===link.token?'#ECFDF5':'#F8FAFC',border:`1px solid ${copied===link.token?'#A7F3D0':C.border}`,borderRadius:6,fontSize:11,cursor:'pointer',color:copied===link.token?C.green:C.textMd,fontWeight:600,whiteSpace:'nowrap'}}>{copied===link.token?'✓ Copied':'Copy'}</button>
                </div>
                <div style={{display:'flex',gap:9,alignItems:'center'}}>
                  <span style={{...s,fontSize:11,color:C.textSm}}>{link.view_count??0} views</span>
                  {link.require_email&&<span style={{...s,fontSize:11,color:C.textSm}}>· Email gate</span>}
                  <button onClick={()=>toggle(link.id,!link.is_active)} style={{...s,fontSize:11,color:C.accent,background:'none',border:'none',cursor:'pointer',fontWeight:600}}>{link.is_active?'Disable':'Enable'}</button>
                  <button onClick={()=>del(link.id)} style={{...s,fontSize:11,color:C.red,background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Delete</button>
                </div>
              </div>
            ))}
          </div>}
          {showNew?(
            <div style={{border:`1px solid ${C.border}`,borderRadius:11,padding:14,background:C.bg}}>
              <p style={{...s,fontSize:11,fontWeight:700,color:C.text,marginBottom:11}}>New link</p>
              <div style={{display:'flex',flexDirection:'column',gap:9}}>
                <div><p style={{...s,fontSize:10,color:C.textMd,marginBottom:4}}>Label</p><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Investor Meeting" style={{...s,width:'100%',padding:'6px 9px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,color:C.text,background:'#fff',outline:'none'}}/></div>
                <div><p style={{...s,fontSize:10,color:C.textMd,marginBottom:4}}>Password (optional)</p><input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Leave blank for none" style={{...s,width:'100%',padding:'6px 9px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,color:C.text,background:'#fff',outline:'none'}}/></div>
                <div style={{display:'flex',gap:14}}>
                  <label style={{...s,display:'flex',alignItems:'center',gap:5,fontSize:12,color:C.textMd,cursor:'pointer'}}><input type="checkbox" checked={reqEmail} onChange={e=>setReqEmail(e.target.checked)} style={{accentColor:C.accent}}/> Require email</label>
                  <label style={{...s,display:'flex',alignItems:'center',gap:5,fontSize:12,color:C.textMd,cursor:'pointer'}}><input type="checkbox" checked={allowDl} onChange={e=>setAllowDl(e.target.checked)} style={{accentColor:C.accent}}/> Allow download</label>
                </div>
                <div style={{display:'flex',gap:7}}>
                  <button onClick={()=>setShowNew(false)} style={{...s,flex:1,padding:'7px',border:`1px solid ${C.border}`,borderRadius:7,background:'#fff',fontSize:12,cursor:'pointer',fontWeight:500,color:C.textMd}}>Cancel</button>
                  <button onClick={create} disabled={creating} style={{...s,flex:1,padding:'7px',border:'none',borderRadius:7,background:C.accent,color:'#fff',fontSize:12,cursor:'pointer',fontWeight:700,opacity:creating?.6:1}}>{creating?'Creating…':'Create link'}</button>
                </div>
              </div>
            </div>
          ):(
            <button onClick={()=>setShowNew(true)} style={{...s,width:'100%',padding:'9px',border:`1px dashed ${C.borderMd}`,borderRadius:9,background:'transparent',cursor:'pointer',fontSize:12,color:C.textMd,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1.5 5.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>New link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}