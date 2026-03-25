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

// ─── Canvas size presets ──────────────────────────────────────────────────────
const CANVAS_SIZES = [
  { id: 'presentation-169', label: 'Presentation 16:9', w: 1280, h: 720, cat: 'Presentation' },
  { id: 'presentation-43',  label: 'Presentation 4:3',  w: 1024, h: 768, cat: 'Presentation' },
  { id: 'a4-portrait',      label: 'A4 Portrait',       w: 794,  h: 1123, cat: 'Document' },
  { id: 'a4-landscape',     label: 'A4 Landscape',      w: 1123, h: 794,  cat: 'Document' },
  { id: 'a3-portrait',      label: 'A3 Portrait',       w: 1123, h: 1587, cat: 'Document' },
  { id: 'letter-portrait',  label: 'US Letter',         w: 816,  h: 1056, cat: 'Document' },
  { id: 'square',           label: 'Square (1:1)',       w: 1080, h: 1080, cat: 'Social' },
  { id: 'story',            label: 'Story / Reel',      w: 540,  h: 960,  cat: 'Social' },
  { id: 'linkedin',         label: 'LinkedIn Banner',   w: 1584, h: 396,  cat: 'Social' },
  { id: 'twitter',          label: 'Twitter Header',    w: 1500, h: 500,  cat: 'Social' },
]

// ─── Template library ─────────────────────────────────────────────────────────
const TEMPLATE_CATEGORIES = [
  { id: 'startup',    label: 'Startup & Fundraising' },
  { id: 'freelance',  label: 'Freelance & Agency' },
  { id: 'business',   label: 'Business & Strategy' },
  { id: 'marketing',  label: 'Marketing & Brand' },
  { id: 'report',     label: 'Reports & Analysis' },
]

const TEMPLATES = [
  // Startup & Fundraising
  { id: 'pitch-deck',        cat: 'startup',   label: 'Pitch Deck',           desc: 'Seed to Series B investor slides', pages: 10, size: 'presentation-169' },
  { id: 'investor-update',   cat: 'startup',   label: 'Investor Update',      desc: 'Monthly / quarterly investor email', pages: 4,  size: 'a4-portrait' },
  { id: 'product-roadmap',   cat: 'startup',   label: 'Product Roadmap',      desc: 'Quarterly roadmap presentation', pages: 6,  size: 'presentation-169' },
  { id: 'team-deck',         cat: 'startup',   label: 'Team Introduction',    desc: 'Meet the founding team', pages: 5, size: 'presentation-169' },
  { id: 'exec-summary',      cat: 'startup',   label: 'Executive Summary',    desc: 'One-page business overview', pages: 1,  size: 'a4-portrait' },
  { id: 'competitive',       cat: 'startup',   label: 'Competitive Analysis', desc: 'Market landscape comparison', pages: 4,  size: 'presentation-169' },
  // Freelance & Agency
  { id: 'client-proposal',   cat: 'freelance', label: 'Client Proposal',      desc: 'Win new clients with ease', pages: 6,  size: 'a4-portrait' },
  { id: 'invoice',           cat: 'freelance', label: 'Invoice',              desc: 'Professional billing template', pages: 1,  size: 'a4-portrait' },
  { id: 'project-scope',     cat: 'freelance', label: 'Project Scope',        desc: 'Define deliverables clearly', pages: 3,  size: 'a4-portrait' },
  { id: 'case-study',        cat: 'freelance', label: 'Case Study',           desc: 'Showcase your best work', pages: 5,  size: 'presentation-169' },
  { id: 'service-brochure',  cat: 'freelance', label: 'Services Brochure',    desc: 'What you offer, beautifully', pages: 4,  size: 'a4-portrait' },
  { id: 'portfolio',         cat: 'freelance', label: 'Portfolio Deck',       desc: 'Show your best work', pages: 8,  size: 'presentation-169' },
  // Business & Strategy
  { id: 'business-plan',     cat: 'business',  label: 'Business Plan',        desc: 'Full business plan structure', pages: 12, size: 'a4-portrait' },
  { id: 'sales-deck',        cat: 'business',  label: 'Sales Deck',           desc: 'Close deals faster', pages: 8,  size: 'presentation-169' },
  { id: 'partnership',       cat: 'business',  label: 'Partnership Proposal', desc: 'Strategic partnership pitch', pages: 6,  size: 'presentation-169' },
  { id: 'company-overview',  cat: 'business',  label: 'Company Overview',     desc: 'Who you are and what you do', pages: 5,  size: 'presentation-169' },
  // Marketing & Brand
  { id: 'brand-guidelines',  cat: 'marketing', label: 'Brand Guidelines',     desc: 'Comprehensive brand system', pages: 8,  size: 'presentation-169' },
  { id: 'media-kit',         cat: 'marketing', label: 'Press & Media Kit',    desc: 'For journalists and partners', pages: 5,  size: 'a4-portrait' },
  { id: 'marketing-plan',    cat: 'marketing', label: 'Marketing Plan',       desc: 'Campaign strategy & channels', pages: 7,  size: 'presentation-169' },
  { id: 'social-media-kit',  cat: 'marketing', label: 'Social Media Kit',     desc: 'Posts, stories, and banners', pages: 6,  size: 'square' },
  // Reports & Analysis
  { id: 'quarterly-report',  cat: 'report',    label: 'Quarterly Report',     desc: 'Q-over-Q performance review', pages: 8,  size: 'presentation-169' },
  { id: 'annual-report',     cat: 'report',    label: 'Annual Report',        desc: 'Year in review', pages: 12, size: 'a4-portrait' },
  { id: 'market-research',   cat: 'report',    label: 'Market Research',      desc: 'Data-driven market insights', pages: 6,  size: 'presentation-169' },
]

// ─── Google Fonts list (100+) ─────────────────────────────────────────────────
const FONT_LIST = [
  'Jost','Inter','Space Grotesk','DM Sans','Outfit','Plus Jakarta Sans','Syne',
  'Geist','Archivo','Nunito Sans','Source Sans 3','IBM Plex Sans','Rubik',
  'Work Sans','Barlow','Mulish','Lato','Open Sans','Raleway','Montserrat',
  'Oswald','Bebas Neue','Anton','Black Han Sans','Teko','Exo 2',
  'Playfair Display','Cormorant Garamond','Libre Baskerville','Merriweather',
  'EB Garamond','Lora','Crimson Text','Cardo','Neuton','Spectral','Arvo',
  'PT Serif','Zilla Slab','Roboto Slab','Frank Ruhl Libre','Bodoni Moda',
  'DM Mono','Roboto Mono','IBM Plex Mono','Space Mono','JetBrains Mono',
  'Fira Code','Source Code Pro','Courier Prime','Inconsolata','Oxanium',
  'Chakra Petch','Share Tech Mono','VT323','Silkscreen',
  'Pacifico','Righteous','Fredoka One','Comfortaa','Caveat','Dancing Script',
  'Great Vibes','Sacramento','Satisfy','Allura','Pinyon Script','Alex Brush',
  'Abril Fatface','Alfa Slab One','Ultra','Passion One','Graduate','Boogaloo',
  'Lobster','Lobster Two','Knewave','Bungee','Righteous','Russo One',
  'Cinzel','Cinzel Decorative','Metamorphous','MedievalSharp',
  'Noto Sans','Noto Serif','Poppins','Quicksand','Varela Round',
  'Nunito','Josefin Sans','Josefin Slab','Karla','Manrope',
]

// ─── Color palettes ───────────────────────────────────────────────────────────
const BRAND_PALETTE = [
  '#0f172a','#1e293b','#334155','#475569','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#f8fafc','#ffffff',
  '#4f46e5','#6366f1','#818cf8','#a5b4fc','#c7d2fe',
  '#0ea5e9','#38bdf8','#7dd3fc','#bae6fd',
  '#10b981','#34d399','#6ee7b7','#a7f3d0',
  '#f59e0b','#fbbf24','#fcd34d','#fde68a',
  '#ef4444','#f87171','#fca5a5','#fecaca',
  '#ec4899','#f472b6','#f9a8d4','#fbcfe8',
  '#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe',
]

// ─── Page layout library (design styles) ─────────────────────────────────────
const PAGE_LAYOUTS = [
  { id: 'hero-dark',       label: 'Hero Dark',       bg: '#0f172a', thumb: '#0f172a' },
  { id: 'hero-light',      label: 'Hero Light',      bg: '#ffffff', thumb: '#f8fafc' },
  { id: 'hero-accent',     label: 'Hero Accent',     bg: '#4f46e5', thumb: '#4f46e5' },
  { id: 'split-left',      label: 'Split Left',      bg: '#ffffff', thumb: '#e0e7ff' },
  { id: 'split-right',     label: 'Split Right',     bg: '#ffffff', thumb: '#fce7f3' },
  { id: 'metrics',         label: 'Metrics Row',     bg: '#ffffff', thumb: '#f0fdf4' },
  { id: 'timeline',        label: 'Timeline',        bg: '#ffffff', thumb: '#fffbeb' },
  { id: 'team-grid',       label: 'Team Grid',       bg: '#f8fafc', thumb: '#eff6ff' },
  { id: 'quote-block',     label: 'Pull Quote',      bg: '#0f172a', thumb: '#312e81' },
  { id: 'feature-cols',    label: '3-Column',        bg: '#ffffff', thumb: '#fdf4ff' },
  { id: 'table-layout',    label: 'Data Table',      bg: '#ffffff', thumb: '#ecfdf5' },
  { id: 'invoice-layout',  label: 'Invoice',         bg: '#ffffff', thumb: '#fff7ed' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePage(bg = '#ffffff', objects: any[] = []) {
  return { version: '5.3.0', objects, background: bg }
}
function t(text: string, o: any = {}) {
  return { type: 'textbox', left: o.l ?? 60, top: o.t ?? 60, width: o.w ?? 400, text,
    fontSize: o.fs ?? 16, fontFamily: o.ff ?? 'Jost', fill: o.fill ?? '#0f172a',
    fontWeight: o.fw ?? '400', opacity: 1, selectable: true, editable: true,
    lineHeight: o.lh ?? 1.4, textAlign: o.ta ?? 'left' }
}
function r(o: any = {}) {
  return { type: 'rect', left: o.l ?? 0, top: o.t ?? 0, width: o.w ?? 200, height: o.h ?? 60,
    fill: o.fill ?? '#4f46e5', rx: o.rx ?? 0, ry: o.rx ?? 0, selectable: true, opacity: o.op ?? 1 }
}

// Build a template's pages
function buildTemplate(id: string, sizeId: string): any[] {
  const size = CANVAS_SIZES.find(s => s.id === sizeId) || CANVAS_SIZES[0]
  const W = size.w, H = size.h
  const isDoc = H > W // portrait document

  switch (id) {
    case 'pitch-deck': return buildPitchDeck(W, H)
    case 'client-proposal': return buildProposal(W, H)
    case 'invoice': return buildInvoice(W, H)
    case 'quarterly-report': return buildReport(W, H)
    case 'brand-guidelines': return buildBrandGuidelines(W, H)
    case 'sales-deck': return buildSalesDeck(W, H)
    case 'case-study': return buildCaseStudy(W, H)
    default: return buildPitchDeck(W, H)
  }
}

function buildPitchDeck(W: number, H: number): any[] {
  return [
    // Cover
    makePage('#0a0a0f', [
      r({l:0,t:0,w:W,h:H,fill:'#0a0a0f'}),
      r({l:0,t:H-3,w:W,h:3,fill:'#4f46e5'}),
      r({l:60,t:Math.round(H*.38),w:4,h:Math.round(H*.24),fill:'#4f46e5'}),
      t('COMPANY NAME', {l:80,t:Math.round(H*.38),fs:isFS(W,44),fw:'700',fill:'#ffffff',w:W-140,ff:'Jost'}),
      t('The one-sentence pitch that makes investors lean forward.', {l:80,t:Math.round(H*.38)+isFS(W,44)+14,fs:isFS(W,18),fill:'#94a3b8',w:W-160}),
      t('Series A · 2025', {l:80,t:H-50,fs:12,fill:'#4f46e5',ff:'JetBrains Mono'}),
    ]),
    // Problem
    makePage('#ffffff', [
      r({l:0,t:0,w:W,h:4,fill:'#4f46e5'}),
      t('The Problem', {l:60,t:50,fs:isFS(W,34),fw:'700',fill:'#0f172a',w:W-120}),
      r({l:60,t:50+isFS(W,34)+12,w:50,h:3,fill:'#4f46e5',rx:2}),
      r({l:60,t:Math.round(H*.32),w:Math.round((W-140)*.47),h:Math.round(H*.38),fill:'#f0f9ff',rx:12}),
      t('Pain Point One', {l:80,t:Math.round(H*.32)+20,fs:isFS(W,16),fw:'700',fill:'#0ea5e9',w:Math.round((W-140)*.47)-40}),
      t('Describe the core frustration your customers experience daily.', {l:80,t:Math.round(H*.32)+50,fs:13,fill:'#475569',w:Math.round((W-140)*.47)-40,lh:1.6}),
      r({l:Math.round(W*.53),t:Math.round(H*.32),w:Math.round((W-140)*.47),h:Math.round(H*.38),fill:'#fdf4ff',rx:12}),
      t('Pain Point Two', {l:Math.round(W*.53)+20,t:Math.round(H*.32)+20,fs:isFS(W,16),fw:'700',fill:'#8b5cf6',w:Math.round((W-140)*.47)-40}),
      t('The secondary problem that compounds and makes it worse.', {l:Math.round(W*.53)+20,t:Math.round(H*.32)+50,fs:13,fill:'#475569',w:Math.round((W-140)*.47)-40,lh:1.6}),
    ]),
    // Solution
    makePage('#ffffff', [
      r({l:0,t:0,w:W,h:4,fill:'#4f46e5'}),
      t('Our Solution', {l:60,t:50,fs:isFS(W,34),fw:'700',fill:'#0f172a',w:W-120}),
      r({l:60,t:50+isFS(W,34)+12,w:50,h:3,fill:'#4f46e5',rx:2}),
      r({l:60,t:Math.round(H*.32),w:Math.round((W-160)/3),h:Math.round(H*.4),fill:'#0f172a',rx:14}),
      t('01', {l:80,t:Math.round(H*.32)+16,fs:isFS(W,28),fw:'700',fill:'#4f46e5',w:Math.round((W-160)/3)-40,ff:'JetBrains Mono'}),
      t('Feature One', {l:80,t:Math.round(H*.32)+70,fs:isFS(W,15),fw:'600',fill:'#ffffff',w:Math.round((W-160)/3)-40}),
      t('What it does and why it matters.', {l:80,t:Math.round(H*.32)+96,fs:12,fill:'#94a3b8',w:Math.round((W-160)/3)-40,lh:1.5}),
    ]),
    // Traction
    makePage('#ffffff', [
      r({l:0,t:0,w:W,h:4,fill:'#4f46e5'}),
      t('Traction', {l:60,t:50,fs:isFS(W,34),fw:'700',fill:'#0f172a',w:W-120}),
      r({l:60,t:50+isFS(W,34)+12,w:50,h:3,fill:'#4f46e5',rx:2}),
      r({l:60,t:Math.round(H*.32),w:Math.round((W-160)/3),h:130,fill:'#eff6ff',rx:12}),
      t('$0M', {l:80,t:Math.round(H*.32)+14,fs:isFS(W,38),fw:'700',fill:'#4f46e5',w:Math.round((W-160)/3)-40,ff:'Jost'}),
      t('ARR', {l:80,t:Math.round(H*.32)+14+isFS(W,38)+4,fs:11,fill:'#94a3b8',w:Math.round((W-160)/3)-40,ff:'JetBrains Mono'}),
    ]),
    // The Ask
    makePage('#ffffff', [
      r({l:0,t:0,w:W,h:4,fill:'#4f46e5'}),
      t('The Ask', {l:60,t:50,fs:isFS(W,34),fw:'700',fill:'#0f172a',w:W-120}),
      r({l:60,t:Math.round(H*.3),w:W-120,h:70,fill:'#0f172a',rx:10}),
      t('Raising $X.XM Seed Round', {l:80,t:Math.round(H*.3)+18,fs:isFS(W,26),fw:'700',fill:'#ffffff',w:W-160}),
    ]),
    // Thank You
    makePage('#4f46e5', [
      t('Thank you.', {l:60,t:Math.round(H*.35),fs:isFS(W,60),fw:'700',fill:'#ffffff',w:W-120,ff:'Jost'}),
      t('hello@company.com · company.io', {l:60,t:Math.round(H*.35)+isFS(W,60)+20,fs:isFS(W,16),fill:'#c7d2fe',w:W-120}),
    ]),
  ]
}

function buildProposal(W: number, H: number): any[] {
  return [
    makePage('#f8fafc', [
      r({l:0,t:0,w:260,h:H,fill:'#0f172a'}),
      t('PROJECT\nPROPOSAL', {l:30,t:60,fs:isFS(W,24),fw:'700',fill:'#ffffff',w:200,lh:1.1,ff:'Jost'}),
      r({l:30,t:180,w:36,h:3,fill:'#4f46e5'}),
      t('Prepared for', {l:30,t:200,fs:10,fill:'#64748b',w:200}),
      t('Client Name', {l:30,t:218,fs:isFS(W,15),fw:'600',fill:'#ffffff',w:200}),
      t('Month YYYY', {l:30,t:H-50,fs:10,fill:'#475569',w:200,ff:'JetBrains Mono'}),
      t('Proposal Title\nGoes Here', {l:300,t:90,fs:isFS(W,38),fw:'700',fill:'#0f172a',w:W-360,lh:1.1}),
      t('One compelling sentence summarizing the value you will deliver.', {l:300,t:90+isFS(W,38)*2+20,fs:isFS(W,14),fill:'#64748b',w:W-360,lh:1.6}),
    ]),
    makePage('#ffffff', [
      r({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      t('Executive Summary', {l:50,t:50,fs:isFS(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      r({l:50,t:50+isFS(W,28)+10,w:W-100,h:1,fill:'#e2e8f0'}),
      t('Describe the project context, why this is the right time, and what success looks like in clear, specific terms.', {l:50,t:50+isFS(W,28)+28,fs:isFS(W,14),fill:'#475569',w:W-100,lh:1.7}),
    ]),
    makePage('#ffffff', [
      r({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      t('Scope & Deliverables', {l:50,t:50,fs:isFS(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      r({l:50,t:50+isFS(W,28)+10,w:W-100,h:1,fill:'#e2e8f0'}),
    ]),
    makePage('#0f172a', [
      t('Investment', {l:60,t:60,fs:isFS(W,32),fw:'700',fill:'#ffffff',w:W-120}),
      r({l:60,t:60+isFS(W,32)+20,w:W-120,h:90,fill:'#1e293b',rx:14}),
      t('$XX,000', {l:80,t:60+isFS(W,32)+34,fs:isFS(W,40),fw:'700',fill:'#4f46e5',w:400,ff:'Jost'}),
      t('50% upfront · 50% on delivery', {l:80,t:60+isFS(W,32)+34+isFS(W,40)+8,fs:12,fill:'#64748b',w:W-160}),
    ]),
  ]
}

function buildInvoice(W: number, H: number): any[] {
  return [
    makePage('#ffffff', [
      r({l:0,t:0,w:W,h:6,fill:'#4f46e5'}),
      t('INVOICE', {l:60,t:40,fs:isFS(W,32),fw:'700',fill:'#0f172a',w:300,ff:'Jost'}),
      t('#INV-0001', {l:60,t:40+isFS(W,32)+6,fs:13,fill:'#4f46e5',w:200,ff:'JetBrains Mono'}),
      t('Issue date: DD/MM/YYYY\nDue date: DD/MM/YYYY', {l:W-280,t:40,fs:12,fill:'#475569',w:220,ta:'right',lh:1.6,ff:'JetBrains Mono'}),
      r({l:60,t:140,w:W-120,h:1,fill:'#e2e8f0'}),
      t('Bill To', {l:60,t:160,fs:10,fw:'700',fill:'#94a3b8',w:200}),
      t('Client Name\nClient Address\nclient@email.com', {l:60,t:178,fs:13,fill:'#0f172a',w:300,lh:1.6}),
      t('From', {l:W-240,t:160,fs:10,fw:'700',fill:'#94a3b8',w:180,ta:'right'}),
      t('Your Name / Company\nyour@email.com\nyourwebsite.com', {l:W-240,t:178,fs:13,fill:'#0f172a',w:180,ta:'right',lh:1.6}),
      r({l:60,t:310,w:W-120,h:36,fill:'#0f172a',rx:6}),
      t('Description', {l:76,t:320,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.5)}),
      t('Qty', {l:60+Math.round((W-120)*.5),t:320,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.15),ta:'center'}),
      t('Rate', {l:60+Math.round((W-120)*.65),t:320,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.15),ta:'right'}),
      t('Amount', {l:60+Math.round((W-120)*.8),t:320,fs:11,fw:'700',fill:'#ffffff',w:Math.round((W-120)*.2),ta:'right'}),
      t('Service or product description goes here', {l:76,t:366,fs:12,fill:'#0f172a',w:Math.round((W-120)*.5)}),
      t('1', {l:60+Math.round((W-120)*.5),t:366,fs:12,fill:'#0f172a',w:Math.round((W-120)*.15),ta:'center'}),
      t('$0,000.00', {l:60+Math.round((W-120)*.65),t:366,fs:12,fill:'#0f172a',w:Math.round((W-120)*.15),ta:'right',ff:'JetBrains Mono'}),
      t('$0,000.00', {l:60+Math.round((W-120)*.8),t:366,fs:12,fill:'#0f172a',w:Math.round((W-120)*.2),ta:'right',fw:'600',ff:'JetBrains Mono'}),
      r({l:60,t:410,w:W-120,h:1,fill:'#e2e8f0'}),
      t('Total Due', {l:W-240,t:430,fs:14,fw:'700',fill:'#0f172a',w:180,ta:'right'}),
      t('$0,000.00', {l:W-240,t:455,fs:isFS(W,24),fw:'700',fill:'#4f46e5',w:180,ta:'right',ff:'Jost'}),
      t('Payment terms: Net 30\nBank: Bank Name · Account: 000000000 · Sort: 00-00-00', {l:60,t:H-80,fs:11,fill:'#94a3b8',w:W-120,lh:1.5}),
    ]),
  ]
}

function buildReport(W: number, H: number): any[] {
  return [
    makePage('#f8fafc', [
      r({l:0,t:0,w:6,h:H,fill:'#10b981'}),
      t('QUARTERLY\nREPORT', {l:40,t:60,fs:isFS(W,50),fw:'700',fill:'#0f172a',w:550,lh:1.0,ff:'Jost'}),
      t('Q1 2025', {l:40,t:60+isFS(W,50)*2+20,fs:isFS(W,16),fill:'#10b981',fw:'600',w:200,ff:'JetBrains Mono'}),
      t('Backread Platform · Confidential', {l:40,t:H-44,fs:11,fill:'#94a3b8',w:400,ff:'JetBrains Mono'}),
    ]),
    makePage('#ffffff', [
      r({l:0,t:0,w:4,h:H,fill:'#10b981'}),
      t('Key Metrics', {l:50,t:50,fs:isFS(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      r({l:50,t:110,w:Math.round((W-100)/3)-10,h:130,fill:'#ecfdf5',rx:12}),
      t('0', {l:70,t:130,fs:isFS(W,44),fw:'700',fill:'#10b981',w:Math.round((W-100)/3)-50,ff:'Jost'}),
      t('TOTAL VIEWS', {l:70,t:130+isFS(W,44)+6,fs:10,fill:'#6b7280',w:Math.round((W-100)/3)-50,ff:'JetBrains Mono'}),
    ]),
  ]
}

function buildBrandGuidelines(W: number, H: number): any[] {
  return [
    makePage('#0a0a0f', [
      r({l:0,t:0,w:W,h:H,fill:'#0a0a0f'}),
      t('BRAND\nGUIDELINES', {l:60,t:Math.round(H*.3),fs:isFS(W,52),fw:'700',fill:'#ffffff',w:W-120,lh:1.0,ff:'Jost'}),
      r({l:60,t:Math.round(H*.3)+isFS(W,52)*2+24,w:80,h:4,fill:'#4f46e5',rx:2}),
      t('2025 Brand System', {l:60,t:Math.round(H*.3)+isFS(W,52)*2+44,fs:isFS(W,15),fill:'#64748b',w:400}),
    ]),
    makePage('#ffffff', [
      r({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      t('Color System', {l:50,t:50,fs:isFS(W,28),fw:'700',fill:'#0f172a',w:W-100}),
      ...[['#0f172a',50],['#4f46e5',200],['#10b981',350],['#f59e0b',500],['#ef4444',650]].map(([col,x]) =>
        r({l:x as number,t:130,w:120,h:120,fill:col as string,rx:12})
      ),
    ]),
  ]
}

function buildSalesDeck(W: number, H: number): any[] {
  return [
    makePage('#ffffff', [
      r({l:0,t:0,w:W,h:H,fill:'#ffffff'}),
      r({l:0,t:0,w:4,h:H,fill:'#4f46e5'}),
      t('Sales Deck', {l:60,t:50,fs:11,fw:'700',fill:'#4f46e5',w:200,ff:'JetBrains Mono'}),
      t('Your Product\nfor Their Problem', {l:60,t:90,fs:isFS(W,44),fw:'700',fill:'#0f172a',w:W/2-80,lh:1.1,ff:'Jost'}),
      t('One sentence that crystallizes exactly what you do and who it\'s for.', {l:60,t:90+isFS(W,44)*2+16,fs:isFS(W,15),fill:'#64748b',w:W/2-80,lh:1.6}),
    ]),
  ]
}

function buildCaseStudy(W: number, H: number): any[] {
  return [
    makePage('#ffffff', [
      r({l:0,t:0,w:W,h:6,fill:'#ec4899'}),
      t('CASE STUDY', {l:60,t:40,fs:10,fw:'700',fill:'#ec4899',w:200,ff:'JetBrains Mono'}),
      t('How [Client] Achieved\nX% Growth with Backread', {l:60,t:70,fs:isFS(W,40),fw:'700',fill:'#0f172a',w:W-120,lh:1.1,ff:'Jost'}),
    ]),
  ]
}

function isFS(w: number, base: number): number {
  return Math.max(Math.round(base * (w / 1280)), Math.round(base * 0.6))
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
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Canvas
  const canvasEl = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [pages, setPages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTool, setActiveTool] = useState('select')
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.65)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [fontColor, setFontColor] = useState('#0f172a')
  const [fillColor, setFillColor] = useState('#4f46e5')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('Jost')
  const [canvasW, setCanvasW] = useState(1280)
  const [canvasH, setCanvasH] = useState(720)
  const [isDragging, setIsDragging] = useState(false)
  const [templateCat, setTemplateCat] = useState('startup')
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [showFontSearch, setShowFontSearch] = useState(false)
  const [fontSearch, setFontSearch] = useState('')

  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const pagesRef = useRef<any[]>([])
  const currentPageRef = useRef(0)
  const canvasWRef = useRef(1280)
  const canvasHRef = useRef(720)

  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])
  useEffect(() => { canvasWRef.current = canvasW }, [canvasW])
  useEffect(() => { canvasHRef.current = canvasH }, [canvasH])

  // Load Jost + core fonts
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600&display=swap'
    document.head.appendChild(link)
    if (!(window as any).fabric) {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
      document.head.appendChild(s)
    }
    // Load jsPDF for PDF export
    if (!(window as any).jspdf) {
      const s2 = document.createElement('script')
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      document.head.appendChild(s2)
    }
  }, [])

  useEffect(() => { loadDocument(); loadShareLinks() }, [params.id])

  async function loadDocument() {
    const { data } = await supabase.from('documents').select('*').eq('id', params.id).single()
    if (!data) { router.push('/dashboard'); return }
    setDoc(data); setTitle(data.title)
    const canvasData = (data as any).canvas_data
    if (canvasData?.pages?.length) {
      setPages(canvasData.pages)
      if (canvasData.canvasW) { setCanvasW(canvasData.canvasW); canvasWRef.current = canvasData.canvasW }
      if (canvasData.canvasH) { setCanvasH(canvasData.canvasH); canvasHRef.current = canvasData.canvasH }
      setShowTemplateModal(false)
    } else {
      setShowTemplateModal(true)
    }
  }

  async function loadShareLinks() {
    const { data } = await supabase.from('share_links').select('*').eq('document_id', params.id).order('created_at', { ascending: false })
    setShareLinks(data ?? [])
  }

  // Init Fabric
  useEffect(() => {
    const check = setInterval(() => {
      if ((window as any).fabric && canvasEl.current && !fabricRef.current) {
        clearInterval(check)
        const fabric = (window as any).fabric
        const fc = new fabric.Canvas(canvasEl.current, {
          width: canvasWRef.current, height: canvasHRef.current,
          backgroundColor: '#ffffff', selection: true, preserveObjectStacking: true,
        })
        fabricRef.current = fc
        fc.on('selection:created', (e: any) => syncSelection(e.selected?.[0]))
        fc.on('selection:updated', (e: any) => syncSelection(e.selected?.[0]))
        fc.on('selection:cleared', () => setSelectedObj(null))
        fc.on('object:modified', () => scheduleAutoSave())
        fc.on('object:added', () => scheduleAutoSave())
        fc.on('object:removed', () => scheduleAutoSave())
      }
    }, 100)
    return () => clearInterval(check)
  }, [])

  useEffect(() => {
    if (!fabricRef.current || !pages[currentPage]) return
    fabricRef.current.loadFromJSON(pages[currentPage], () => fabricRef.current.renderAll())
  }, [pages.length]) // eslint-disable-line

  function syncSelection(obj: any) {
    if (!obj) return
    setSelectedObj(obj)
    if (obj.fontSize) setFontSize(obj.fontSize)
    if (obj.fontFamily) setFontFamily(obj.fontFamily)
  }

  function scheduleAutoSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveCanvas(), 1500)
  }

  const saveCanvas = useCallback(async () => {
    if (!fabricRef.current) return
    setSaving(true)
    const currentJson = fabricRef.current.toJSON()
    const allPages = [...pagesRef.current]; allPages[currentPageRef.current] = currentJson
    setPages(allPages)
    await supabase.from('documents').update({
      canvas_data: { pages: allPages, canvasW: canvasWRef.current, canvasH: canvasHRef.current },
      updated_at: new Date().toISOString(),
    } as any).eq('id', params.id)
    setSaving(false); setLastSaved(new Date())
  }, [params.id])

  async function saveTitle() {
    await supabase.from('documents').update({ title: title || 'Untitled' }).eq('id', params.id)
  }

  async function deleteDocument() {
    setDeleting(true)
    // Delete share links first
    await supabase.from('share_links').delete().eq('document_id', params.id)
    await supabase.from('documents').delete().eq('id', params.id)
    router.push('/dashboard')
  }

  async function publishDocument() {
    await supabase.from('documents').update({ status: 'active' }).eq('id', params.id)
    setDoc(prev => prev ? { ...prev, status: 'active' } : prev)
    setShowShare(true)
  }

  // Page management
  function switchPage(idx: number) {
    if (!fabricRef.current) return
    const updated = [...pagesRef.current]; updated[currentPageRef.current] = fabricRef.current.toJSON()
    setPages(updated); setCurrentPage(idx)
    fabricRef.current.loadFromJSON(updated[idx], () => fabricRef.current.renderAll())
  }

  function addPage() {
    if (!fabricRef.current) return
    const updated = [...pagesRef.current]; updated[currentPageRef.current] = fabricRef.current.toJSON()
    const blank = makePage(bgColor); const newIdx = currentPageRef.current + 1
    updated.splice(newIdx, 0, blank); setPages(updated); setCurrentPage(newIdx)
    fabricRef.current.clear(); fabricRef.current.backgroundColor = bgColor; fabricRef.current.renderAll()
  }

  function removePage(idx: number) {
    if (pagesRef.current.length <= 1) return
    const updated = pagesRef.current.filter((_, i) => i !== idx); setPages(updated)
    const newIdx = Math.min(currentPageRef.current, updated.length - 1); setCurrentPage(newIdx)
    fabricRef.current?.loadFromJSON(updated[newIdx], () => fabricRef.current.renderAll())
  }

  // Template
  function applyTemplate(id: string, sizeId: string) {
    const size = CANVAS_SIZES.find(s => s.id === sizeId) || CANVAS_SIZES[0]
    setCanvasW(size.w); setCanvasH(size.h)
    canvasWRef.current = size.w; canvasHRef.current = size.h
    const builtPages = buildTemplate(id, sizeId)
    setPages(builtPages); setCurrentPage(0); setShowTemplateModal(false)
    if (fabricRef.current) {
      fabricRef.current.setWidth(size.w); fabricRef.current.setHeight(size.h)
      fabricRef.current.loadFromJSON(builtPages[0], () => fabricRef.current.renderAll())
    }
  }

  function startBlank(sizeId = 'presentation-169') {
    const size = CANVAS_SIZES.find(s => s.id === sizeId) || CANVAS_SIZES[0]
    setCanvasW(size.w); setCanvasH(size.h)
    canvasWRef.current = size.w; canvasHRef.current = size.h
    const blank = makePage('#ffffff'); setPages([blank]); setCurrentPage(0); setShowTemplateModal(false)
    if (fabricRef.current) {
      fabricRef.current.setWidth(size.w); fabricRef.current.setHeight(size.h)
      fabricRef.current.clear(); fabricRef.current.backgroundColor = '#ffffff'; fabricRef.current.renderAll()
    }
  }

  // Canvas tools
  function addText(opts: any = {}) {
    const fabric = (window as any).fabric; const fc = fabricRef.current; if (!fc || !fabric) return
    const tb = new fabric.Textbox(opts.text || 'Click to edit', {
      left: 100, top: 100, width: opts.width || 320,
      fontSize: opts.fs || 24, fontFamily: opts.ff || fontFamily,
      fill: opts.fill || fontColor, fontWeight: opts.fw || '400',
      editable: true, lineHeight: 1.4,
    })
    fc.add(tb); fc.setActiveObject(tb); fc.renderAll()
  }

  function addShape(type: string, opts: any = {}) {
    const fabric = (window as any).fabric; const fc = fabricRef.current; if (!fc || !fabric) return
    const fill = opts.fill || fillColor
    let shape: any
    if (type === 'rect') shape = new fabric.Rect({ left: 100, top: 100, width: 200, height: 100, fill, rx: opts.rx || 0, ry: opts.rx || 0 })
    else if (type === 'circle') shape = new fabric.Circle({ left: 100, top: 100, radius: 70, fill })
    else if (type === 'triangle') shape = new fabric.Triangle({ left: 100, top: 100, width: 140, height: 120, fill })
    else if (type === 'line') shape = new fabric.Line([100, 200, 400, 200], { stroke: fill, strokeWidth: 2, selectable: true })
    if (shape) { fc.add(shape); fc.setActiveObject(shape); fc.renderAll() }
  }

  function addTable() {
    const fabric = (window as any).fabric; const fc = fabricRef.current; if (!fc || !fabric) return
    const rows = 4, cols = 3, cw = 160, rh = 40, x = 100, y = 100
    const group: any[] = []
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const isHeader = i === 0
        group.push(new fabric.Rect({
          left: x + j * cw, top: y + i * rh, width: cw, height: rh,
          fill: isHeader ? '#0f172a' : (i % 2 === 0 ? '#f8fafc' : '#ffffff'),
          stroke: '#e2e8f0', strokeWidth: 1, selectable: false,
        }))
        group.push(new fabric.Textbox(isHeader ? `Header ${j + 1}` : `Cell ${i},${j + 1}`, {
          left: x + j * cw + 8, top: y + i * rh + 10, width: cw - 16,
          fontSize: 12, fontFamily: 'Jost',
          fill: isHeader ? '#ffffff' : '#374151',
          fontWeight: isHeader ? '600' : '400', editable: true, selectable: false,
        }))
      }
    }
    group.forEach(obj => fc.add(obj))
    fc.renderAll()
  }

  function loadGoogleFont(family: string) {
    const safeName = family.replace(/ /g, '+')
    const existing = document.querySelector(`link[data-font="${safeName}"]`)
    if (existing) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${safeName}:wght@400;600;700&display=swap`
    link.setAttribute('data-font', safeName)
    document.head.appendChild(link)
  }

  function applyFont(family: string) {
    loadGoogleFont(family)
    setFontFamily(family); setShowFontSearch(false)
    const fc = fabricRef.current; if (!fc) return
    const obj = fc.getActiveObject(); if (obj) { obj.set('fontFamily', family); fc.renderAll(); scheduleAutoSave() }
  }

  function deleteSelected() {
    const fc = fabricRef.current; if (!fc) return
    fc.getActiveObjects().forEach((o: any) => fc.remove(o))
    fc.discardActiveObject(); fc.renderAll()
  }

  function duplicateSelected() {
    const fc = fabricRef.current; if (!fc) return
    fc.getActiveObject()?.clone((c: any) => {
      c.set({ left: c.left + 20, top: c.top + 20 }); fc.add(c); fc.setActiveObject(c); fc.renderAll()
    })
  }

  function updateProp(prop: string, value: any) {
    const fc = fabricRef.current; if (!fc) return
    const obj = fc.getActiveObject(); if (!obj) return
    obj.set(prop, value); fc.renderAll(); scheduleAutoSave()
  }

  function uploadImage(file: File) {
    const fabric = (window as any).fabric; const fc = fabricRef.current; if (!fc || !fabric) return
    const reader = new FileReader()
    reader.onload = e => fabric.Image.fromURL(e.target?.result as string, (img: any) => {
      const scale = Math.min(400 / img.width, 300 / img.height, 1)
      img.set({ left: 120, top: 120, scaleX: scale, scaleY: scale })
      fc.add(img); fc.setActiveObject(img); fc.renderAll()
    })
    reader.readAsDataURL(file)
  }

  function uploadFont(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const fontName = file.name.replace(/\.[^/.]+$/, '')
      const style = document.createElement('style')
      style.textContent = `@font-face { font-family: '${fontName}'; src: url('${e.target?.result}'); }`
      document.head.appendChild(style)
      setFontFamily(fontName)
    }
    reader.readAsDataURL(file)
  }

  async function exportPDF() {
    const fc = fabricRef.current; if (!fc || !(window as any).jspdf) return
    const { jsPDF } = (window as any).jspdf
    const saved = [...pagesRef.current]; saved[currentPageRef.current] = fc.toJSON()
    const orientation = canvasWRef.current > canvasHRef.current ? 'landscape' : 'portrait'
    const pdf = new jsPDF({ orientation, unit: 'px', format: [canvasWRef.current, canvasHRef.current] })
    for (let i = 0; i < saved.length; i++) {
      if (i > 0) pdf.addPage()
      await new Promise<void>(resolve => {
        const tmp = document.createElement('canvas')
        tmp.width = canvasWRef.current; tmp.height = canvasHRef.current
        const tmpFc = new (window as any).fabric.StaticCanvas(tmp, { width: canvasWRef.current, height: canvasHRef.current })
        tmpFc.loadFromJSON(saved[i], () => {
          tmpFc.renderAll()
          const imgData = tmpFc.toDataURL({ format: 'jpeg', quality: 0.95 })
          pdf.addImage(imgData, 'JPEG', 0, 0, canvasWRef.current, canvasHRef.current)
          tmpFc.dispose()
          resolve()
        })
      })
    }
    pdf.save(`${title || 'document'}.pdf`)
  }

  async function exportPNG() {
    const fc = fabricRef.current; if (!fc) return
    const url = fc.toDataURL({ format: 'png', multiplier: 2 })
    const a = document.createElement('a'); a.href = url; a.download = `${title || 'page'}.png`; a.click()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveCanvas() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicateSelected() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricRef.current?.getActiveObject()) deleteSelected()
      if (e.key === 'Escape') setActivePanel(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveCanvas])

  const isActive = doc?.status === 'active'
  const filteredFonts = FONT_LIST.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()))

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0f2', fontFamily: "'Jost', system-ui, sans-serif", color: '#0f172a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px;}
        ::-webkit-scrollbar-thumb:hover{background:#9ca3af;}
        input[type="color"]{-webkit-appearance:none;border:2px solid #e5e7eb;cursor:pointer;padding:0;border-radius:6px;}
        input[type="color"]::-webkit-color-swatch-wrapper{padding:2px;}
        input[type="color"]::-webkit-color-swatch{border:none;border-radius:4px;}
        .rail-btn{width:56px;height:54px;border:none;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#6b7280;transition:all .15s;border-radius:10px;font-family:'Jost',sans-serif;}
        .rail-btn:hover{background:#f3f4f6;color:#111827;}
        .rail-btn.active{background:#eef2ff;color:#4f46e5;}
        .rail-btn span{font-size:9px;font-weight:600;letter-spacing:.03em;}
        .tool-btn{width:34px;height:34px;border:none;cursor:pointer;border-radius:8px;background:transparent;color:#6b7280;display:flex;align-items:center;justify-content:center;transition:all .14s;}
        .tool-btn:hover{background:#f3f4f6;color:#111827;}
        .tool-btn.active{background:#eef2ff;color:#4f46e5;}
        .page-thumb{cursor:pointer;border-radius:9px;border:2px solid #e5e7eb;overflow:hidden;transition:all .14s;background:white;}
        .page-thumb:hover{border-color:#9ca3af;}
        .page-thumb.active{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.15);}
        .tpl-card{border:2px solid #e5e7eb;border-radius:14px;cursor:pointer;transition:all .16s;font-family:'Jost',sans-serif;}
        .tpl-card:hover{border-color:#4f46e5;transform:translateY(-2px);box-shadow:0 8px 24px rgba(79,70,229,.12);}
        .panel-section{margin-bottom:20px;}
        .panel-label{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;padding:0 2px;}
        select{-webkit-appearance:none;appearance:none;background:white;border:1.5px solid #e5e7eb;border-radius:8px;padding:5px 10px;font:500 12px 'Jost',sans-serif;color:#374151;cursor:pointer;outline:none;}
        select:focus{border-color:#4f46e5;}
        .color-swatch{width:22px;height:22px;border-radius:5px;cursor:pointer;border:2px solid transparent;transition:transform .1s,border-color .1s;flex-shrink:0;}
        .color-swatch:hover{transform:scale(1.15);}
        .font-item{padding:7px 12px;cursor:pointer;font-size:13px;border-radius:7px;transition:background .1s;white-space:nowrap;}
        .font-item:hover{background:#f3f4f6;}
        .font-item.active{background:#eef2ff;color:#4f46e5;font-weight:600;}
        .sp-inp{width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;color:#0f172a;border-radius:8px;padding:6px 10px;font:400 12px 'Jost',sans-serif;outline:none;}
        .sp-inp:focus{border-color:#4f46e5;}
        .export-btn{padding:10px 14px;border-radius:10px;border:1.5px solid #e5e7eb;background:white;cursor:pointer;font:600 12px 'Jost',sans-serif;color:#374151;transition:all .13s;display:flex;align-items:center;gap:6px;}
        .export-btn:hover{border-color:#4f46e5;background:#eef2ff;color:#4f46e5;}
        .tb-divider{width:1px;height:22px;background:#e5e7eb;margin:0 5px;}
      `}</style>

      {/* ── Top bar ────────────────────────────────────────────────────────────── */}
      <div style={{ height: 54, background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontFamily: 'Jost,sans-serif', fontWeight: 500, padding: '5px 8px', borderRadius: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Docs
        </button>
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M1 1l3 4-3 4" stroke="#d1d5db" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{ border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: '#0f172a', background: 'transparent', fontFamily: 'Jost,sans-serif', flex: 1, maxWidth: 280 }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 'auto' }}>
          <span style={{ fontSize: 11, color: saving ? '#4f46e5' : '#9ca3af', fontFamily: 'JetBrains Mono,monospace', minWidth: 80 }}>
            {saving ? '● Saving…' : lastSaved ? `✓ ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', background: isActive ? '#dcfce7' : '#f1f5f9', color: isActive ? '#15803d' : '#64748b' }}>{isActive ? 'LIVE' : 'DRAFT'}</span>
          <button onClick={() => setShowTemplateModal(true)} style={{ ...btnStyle }}>Templates</button>
          <button onClick={() => setShowDrafter(true)} style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.2 4.5H11L8.1 6.8L9.3 10.5L6 8.2L2.7 10.5L3.9 6.8L1 4.5H4.8L6 1Z" fill="#f59e0b"/></svg>AI Draft
          </button>
          <button onClick={() => router.push(`/documents/${params.id}/present`)} style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 11h3M6.5 10v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>Present
          </button>
          <button onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')} style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>Export
          </button>
          {isActive
            ? <button onClick={() => setShowShare(true)} style={{ ...primaryBtnStyle }}>Share</button>
            : <button onClick={publishDocument} style={{ ...primaryBtnStyle }}>Publish & Share</button>}
          <button onClick={() => setShowDeleteConfirm(true)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete document">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 10.5v-5M9.5 10.5v-5M3 3.5l.9 8h6.2l.9-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────────── */}
      <div style={{ height: 46, background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 2, flexShrink: 0 }}>
        {/* Core tools */}
        {[
          { id: 'select',   icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 2l9 5-4.5 1.4-2.2 4.6L3 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>, tip: 'Select' },
          { id: 'text',     icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M7.5 4v8M4.5 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>, tip: 'Text (T)' },
          { id: 'rect',     icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="3" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/></svg>, tip: 'Rectangle' },
          { id: 'circle',   icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/></svg>, tip: 'Circle' },
          { id: 'line',     icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 13L13 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>, tip: 'Line' },
          { id: 'draw',     icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 12.5l2-1L12 4 11 3 3.5 10.5l-1 2zm8-9l1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>, tip: 'Draw' },
        ].map(tool => (
          <button key={tool.id} title={tool.tip} className={`tool-btn${activeTool === tool.id ? ' active' : ''}`}
            onClick={() => {
              if (tool.id === 'text') { addText(); setActiveTool('select'); return }
              if (tool.id === 'rect') { addShape('rect'); return }
              if (tool.id === 'circle') { addShape('circle'); return }
              if (tool.id === 'line') { addShape('line'); return }
              setActiveTool(tool.id)
              if (fabricRef.current) { fabricRef.current.isDrawingMode = tool.id === 'draw'; if (tool.id === 'draw') fabricRef.current.freeDrawingBrush.color = fontColor }
            }}>{tool.icon}
          </button>
        ))}

        <div className="tb-divider"/>

        {/* Table & Image */}
        <button title="Insert table" className="tool-btn" onClick={addTable}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5h13M1 9h13M5 5v8M10 5v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>
        <label title="Upload image" className="tool-btn" style={{ cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="6.5" r="1.2" fill="currentColor"/><path d="M1 11l3.5-3L8 11l2.5-2.5L14 12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}/>
        </label>

        <div className="tb-divider"/>

        {/* Font family with search */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowFontSearch(!showFontSearch)}
            style={{ height: 32, padding: '0 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'Jost,sans-serif', fontWeight: 500, color: '#374151', display: 'flex', alignItems: 'center', gap: 5, minWidth: 130 }}>
            <span style={{ flex: 1, textAlign: 'left', fontFamily: `'${fontFamily}',sans-serif` }}>{fontFamily}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {showFontSearch && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 200, width: 220 }}>
              <div style={{ padding: '8px 8px 4px' }}>
                <input value={fontSearch} onChange={e => setFontSearch(e.target.value)} placeholder="Search fonts…" className="sp-inp" autoFocus style={{ marginBottom: 4 }}/>
              </div>
              <div style={{ maxHeight: 240, overflow: 'auto', padding: '4px 8px 8px' }}>
                {filteredFonts.slice(0, 60).map(f => (
                  <div key={f} className={`font-item${fontFamily === f ? ' active' : ''}`} style={{ fontFamily: `'${f}',sans-serif` }} onClick={() => applyFont(f)}>{f}</div>
                ))}
              </div>
              <div style={{ padding: '8px', borderTop: '1px solid #f3f4f6' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#6b7280', fontFamily: 'Jost,sans-serif' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v10M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Upload custom font (.ttf/.otf/.woff)
                  <input type="file" accept=".ttf,.otf,.woff,.woff2" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFont(f) }}/>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Font size */}
        <input type="number" value={fontSize} min={6} max={300}
          onChange={e => { const v = parseInt(e.target.value); setFontSize(v); updateProp('fontSize', v) }}
          style={{ width: 52, height: 32, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0 8px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: '#374151', outline: 'none', textAlign: 'center' }}/>

        {/* Format buttons */}
        <button title="Bold" onClick={() => { const o = fabricRef.current?.getActiveObject(); if(o){o.set('fontWeight',o.fontWeight==='bold'?'normal':'bold');fabricRef.current.renderAll()} }} style={{ ...fmtBtnStyle, fontWeight: 700, fontSize: 14 }}>B</button>
        <button title="Italic" onClick={() => { const o = fabricRef.current?.getActiveObject(); if(o){o.set('fontStyle',o.fontStyle==='italic'?'normal':'italic');fabricRef.current.renderAll()} }} style={{ ...fmtBtnStyle, fontStyle: 'italic', fontSize: 14 }}>I</button>
        <button title="Underline" onClick={() => { const o = fabricRef.current?.getActiveObject(); if(o){o.set('underline',!o.underline);fabricRef.current.renderAll()} }} style={{ ...fmtBtnStyle, textDecoration: 'underline', fontSize: 13 }}>U</button>

        <div className="tb-divider"/>

        {/* Colors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[
            { label: 'TEXT', val: fontColor, setter: (v: string) => { setFontColor(v); updateProp('fill', v) } },
            { label: 'FILL', val: fillColor, setter: (v: string) => { setFillColor(v); updateProp('fill', v) } },
            { label: 'BG',   val: bgColor,   setter: (v: string) => { setBgColor(v); if (fabricRef.current) { fabricRef.current.backgroundColor = v; fabricRef.current.renderAll() } } },
          ].map(c => (
            <div key={c.label} style={{ textAlign: 'center' }}>
              <input type="color" value={c.val} onChange={e => c.setter(e.target.value)} title={c.label} style={{ width: 26, height: 26, display: 'block' }}/>
              <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <div className="tb-divider"/>

        {/* Actions */}
        {[
          { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4V2.5A1.5 1.5 0 015.5 1H11.5A1.5 1.5 0 0113 2.5V8.5A1.5 1.5 0 0111.5 10H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>, tip: 'Duplicate', fn: duplicateSelected },
          { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 10.5v-5M9.5 10.5v-5M3 3.5l.9 8h6.2l.9-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>, tip: 'Delete', fn: deleteSelected },
          { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 5l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>, tip: 'Bring forward', fn: () => { const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.bringToFront(o);fabricRef.current.renderAll()} } },
          { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 9l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>, tip: 'Send backward', fn: () => { const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.sendToBack(o);fabricRef.current.renderAll()} } },
        ].map(b => <button key={b.tip} title={b.tip} className="tool-btn" onClick={b.fn}>{b.icon}</button>)}

        {/* Zoom */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, background: '#f9fafb', borderRadius: 9, padding: '3px 10px', border: '1.5px solid #e5e7eb' }}>
          <button onClick={() => setZoom(z => Math.max(.15, z - .1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, lineHeight: 1, padding: '0 3px', fontWeight: 300 }}>−</button>
          <span style={{ fontSize: 11, color: '#6b7280', minWidth: 38, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2.5, z + .1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, lineHeight: 1, padding: '0 3px', fontWeight: 300 }}>+</button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left rail */}
        <div style={{ width: 58, flexShrink: 0, background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 2, zIndex: 10 }}>
          {[
            { id: 'pages',   tip: 'Pages',   icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg> },
            { id: 'elements',tip: 'Elements',icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M14 1l3.5 5.5H10.5L14 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
            { id: 'text',    tip: 'Text',    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5A1.5 1.5 0 0 1 4.5 3.5h11A1.5 1.5 0 0 1 17 5v1.5M10 3.5v13M7 16.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
            { id: 'uploads', tip: 'Uploads', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 14v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2M10 4v10M7 7l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { id: 'bg',      tip: 'Background', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M10 3A7 7 0 0 1 10 17" fill="currentColor" opacity=".2"/></svg> },
            { id: 'layers',  tip: 'Layers',  icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 6l8-4 8 4-8 4L2 6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M2 10l8 4 8-4M2 14l8 4 8-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
          ].map(item => (
            <button key={item.id} className={`rail-btn${activePanel === item.id ? ' active' : ''}`} title={item.tip} onClick={() => setActivePanel(activePanel === item.id ? null : item.id)}>
              {item.icon}<span>{item.tip}</span>
            </button>
          ))}
        </div>

        {/* Side panel */}
        {activePanel && (
          <div style={{ width: 260, flexShrink: 0, background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 9 }}>
            <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{activePanel.charAt(0).toUpperCase() + activePanel.slice(1)}</span>
              <button onClick={() => setActivePanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>

              {activePanel === 'pages' && (
                <div>
                  <div className="panel-section">
                    <div className="panel-label">Page layouts</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {PAGE_LAYOUTS.map(layout => (
                        <div key={layout.id} onClick={() => {
                          if (!fabricRef.current) return
                          const saved = [...pagesRef.current]; saved[currentPageRef.current] = fabricRef.current.toJSON()
                          const blank = makePage(layout.bg); const newIdx = currentPageRef.current + 1
                          saved.splice(newIdx, 0, blank); setPages(saved); setCurrentPage(newIdx)
                          fabricRef.current.clear(); fabricRef.current.backgroundColor = layout.bg; fabricRef.current.renderAll()
                        }} style={{ aspectRatio: `${canvasW}/${canvasH}`, background: layout.thumb, borderRadius: 8, border: '1.5px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', transition: 'all .13s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = '#4f46e5')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                          <div style={{ padding: '3px 5px', width: '100%', background: 'rgba(255,255,255,.8)', fontSize: 8, fontWeight: 600, color: '#374151', backdropFilter: 'blur(4px)' }}>{layout.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'elements' && (
                <div>
                  <div className="panel-section">
                    <div className="panel-label">Shapes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {[
                        { type: 'rect', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/></svg> },
                        { type: 'rect', opts: { rx: 40 }, icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="6" stroke="currentColor" strokeWidth="1.4"/></svg> },
                        { type: 'circle', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/></svg> },
                        { type: 'triangle', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L19 18H1L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
                        { type: 'line', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 18L18 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
                      ].map((s, i) => (
                        <div key={i} onClick={() => addShape(s.type, s.opts)} style={{ aspectRatio: '1', background: '#f9fafb', borderRadius: 8, border: '1.5px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'all .12s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#eef2ff' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = '#f9fafb' }}>
                          {s.icon}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel-section">
                    <div className="panel-label">Tables</div>
                    {['Standard', 'Striped', 'Minimal', 'Bordered'].map(style => (
                      <div key={style} onClick={addTable} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', marginBottom: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#374151', transition: 'all .12s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = ''; e.currentTarget.style.color = '#374151' }}>
                        {style} Table
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePanel === 'text' && (
                <div>
                  <div className="panel-section">
                    <div className="panel-label">Add text</div>
                    {[
                      { label: 'Large Heading', fs: 52, fw: '700', text: 'Large Heading' },
                      { label: 'Heading',       fs: 36, fw: '700', text: 'Heading' },
                      { label: 'Subheading',    fs: 24, fw: '600', text: 'Subheading' },
                      { label: 'Body Text',     fs: 15, fw: '400', text: 'Body text goes here' },
                      { label: 'Caption',       fs: 11, fw: '400', text: 'Caption text' },
                    ].map(preset => (
                      <div key={preset.label} onClick={() => addText({ text: preset.text, fs: preset.fs, fw: preset.fw })} style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', marginBottom: 7, cursor: 'pointer', transition: 'all .12s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#eef2ff' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '' }}>
                        <div style={{ fontSize: Math.min(preset.fs * 0.5, 22), fontWeight: parseInt(preset.fw), color: '#0f172a', fontFamily: 'Jost,sans-serif' }}>{preset.label}</div>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{preset.fs}pt · {preset.fw}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePanel === 'uploads' && (
                <div>
                  <div className="panel-section">
                    <label style={{ display: 'block', border: '2px dashed #d1d5db', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all .14s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#eef2ff' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '' }}>
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto 8px', display: 'block', color: '#9ca3af' }}><path d="M5 20v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2M14 4v16M9 9l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 3 }}>Click to upload image</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>PNG, JPG, GIF, WebP, SVG</div>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}/>
                    </label>
                  </div>
                  <div className="panel-section">
                    <div className="panel-label">Add from URL</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input id="imgUrl" className="sp-inp" placeholder="https://…" style={{ flex: 1 }}/>
                      <button onClick={() => {
                        const url = (document.getElementById('imgUrl') as HTMLInputElement)?.value.trim(); if (!url || !fabricRef.current) return
                        const fabric = (window as any).fabric
                        fabric.Image.fromURL(url, (img: any) => {
                          const scale = Math.min(400/img.width, 300/img.height, 1)
                          img.set({ left: 120, top: 120, scaleX: scale, scaleY: scale, crossOrigin: 'anonymous' })
                          fabricRef.current.add(img); fabricRef.current.renderAll()
                        }, { crossOrigin: 'anonymous' })
                      }} style={{ ...primaryBtnStyle, padding: '0 12px', height: 34 }}>Add</button>
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'bg' && (
                <div>
                  <div className="panel-section">
                    <div className="panel-label">Solid colors</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginBottom: 12 }}>
                      {['#ffffff','#f8fafc','#0f172a','#1e293b','#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#f97316'].map(c => (
                        <div key={c} className="color-swatch" style={{ background: c, border: c === bgColor ? '2px solid #4f46e5' : '2px solid #e5e7eb' }} onClick={() => { setBgColor(c); if (fabricRef.current) { fabricRef.current.backgroundColor = c; fabricRef.current.renderAll() } }}/>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Custom:</span>
                      <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); if (fabricRef.current) { fabricRef.current.backgroundColor = e.target.value; fabricRef.current.renderAll() } }} style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #e5e7eb', cursor: 'pointer' }}/>
                    </div>
                  </div>
                  <div className="panel-section">
                    <div className="panel-label">Gradients</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[['#4f46e5','#7c3aed'],['#0ea5e9','#06b6d4'],['#10b981','#34d399'],['#f59e0b','#f97316'],['#ef4444','#ec4899'],['#0f172a','#334155'],['#1e293b','#4f46e5'],['#fce7f3','#ede9fe']].map(([a,b]) => (
                        <div key={a} onClick={() => {
                          if (!fabricRef.current) return
                          const fabric = (window as any).fabric
                          fabricRef.current.setBackgroundColor(new fabric.Gradient({ type: 'linear', gradientUnits: 'pixels', coords: { x1:0,y1:0,x2:canvasWRef.current,y2:canvasHRef.current }, colorStops: [{offset:0,color:a},{offset:1,color:b}] }), () => fabricRef.current.renderAll())
                          scheduleAutoSave()
                        }} style={{ height: 48, borderRadius: 8, background: `linear-gradient(135deg,${a},${b})`, cursor: 'pointer', border: '1.5px solid transparent', transition: 'all .12s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = '#4f46e5')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'layers' && (
                <div>
                  <div className="panel-label">Layers (top to bottom)</div>
                  {fabricRef.current && [...fabricRef.current.getObjects()].reverse().map((obj: any, i: number) => {
                    const realIdx = fabricRef.current.getObjects().length - 1 - i
                    const label = obj.type === 'textbox' ? `"${(obj.text || '').substring(0, 16)}…"` : `${obj.type} ${realIdx + 1}`
                    return (
                      <div key={i} onClick={() => { fabricRef.current.setActiveObject(obj); fabricRef.current.renderAll(); setSelectedObj(obj) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 7, marginBottom: 3, cursor: 'pointer', border: `1.5px solid ${selectedObj === obj ? '#4f46e5' : 'transparent'}`, background: selectedObj === obj ? '#eef2ff' : 'transparent', transition: 'all .1s' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x=".5" y=".5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                        <span style={{ fontSize: 11, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {activePanel === 'export' && (
                <div>
                  <div className="panel-label">Export as</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="export-btn" onClick={exportPDF}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9H3V1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 1v4h3M4.5 8h1a1 1 0 0 1 0 2H4.5V7M8 7v3M8 7h1.5M8 9h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      Export as PDF (all pages)
                    </button>
                    <button className="export-btn" onClick={exportPNG}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="4.5" cy="5.5" r="1" fill="currentColor"/><path d="M1 9.5l3-2.5 3 3 2-2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                      Export current page as PNG
                    </button>
                    <button className="export-btn" onClick={() => {
                      const saved = [...pagesRef.current]; saved[currentPageRef.current] = fabricRef.current?.toJSON()
                      const blob = new Blob([JSON.stringify({ pages: saved, canvasW, canvasH }, null, 2)], { type: 'application/json' })
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title || 'design'}.json`; a.click()
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9H3V1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 1v4h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      Export as JSON (editable)
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Page strip */}
        <div style={{ width: 140, flexShrink: 0, background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>Pages</span>
            <button onClick={addPage} title="Add page" style={{ background: '#4f46e5', border: 'none', borderRadius: 5, width: 20, height: 20, color: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pages.map((page, idx) => (
              <div key={idx} onClick={() => switchPage(idx)} className={`page-thumb${currentPage === idx ? ' active' : ''}`}>
                <div style={{ width: '100%', aspectRatio: `${canvasW}/${canvasH}`, background: page?.background ?? '#ffffff', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.85)' }}>
                    <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>{idx + 1}</span>
                    {pages.length > 1 && <button onClick={e => { e.stopPropagation(); removePage(idx) }} style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444', border: 'none', color: 'white', fontSize: 8, cursor: 'pointer', lineHeight: 1 }}>×</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '5px 10px', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace' }}>{pages.length}p</div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f2', overflow: 'auto', position: 'relative' }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) uploadImage(f) }}>
          {isDragging && <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(79,70,229,.05)', border: '2px dashed #4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ background: 'white', color: '#4f46e5', fontWeight: 700, fontSize: 15, padding: '10px 22px', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>Drop image here</span>
          </div>}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', boxShadow: '0 4px 40px rgba(0,0,0,.1)', borderRadius: 2, outline: '1px solid #e5e7eb' }}>
            <canvas ref={canvasEl}/>
          </div>
          {pages.length > 1 && (
            <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center', background: 'white', borderRadius: 22, padding: '5px 14px', boxShadow: '0 2px 12px rgba(0,0,0,.08)', border: '1px solid #e5e7eb' }}>
              <button onClick={() => currentPage > 0 && switchPage(currentPage - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 22, opacity: currentPage === 0 ? .3 : 1, lineHeight: 1 }}>‹</button>
              <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'JetBrains Mono,monospace', minWidth: 52, textAlign: 'center' }}>{currentPage + 1} / {pages.length}</span>
              <button onClick={() => currentPage < pages.length - 1 && switchPage(currentPage + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 22, opacity: currentPage === pages.length - 1 ? .3 : 1, lineHeight: 1 }}>›</button>
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selectedObj && (
          <div style={{ width: 200, flexShrink: 0, background: 'white', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>Properties</div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
              <PropRow label="X"><NumIn value={Math.round(selectedObj.left ?? 0)} onChange={v => updateProp('left', v)}/></PropRow>
              <PropRow label="Y"><NumIn value={Math.round(selectedObj.top ?? 0)} onChange={v => updateProp('top', v)}/></PropRow>
              {selectedObj.width && <PropRow label="Width"><NumIn value={Math.round(selectedObj.width ?? 0)} onChange={v => updateProp('width', v)}/></PropRow>}
              <PropRow label="Opacity">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <input type="range" min={0} max={1} step={.01} value={selectedObj.opacity ?? 1} onChange={e => updateProp('opacity', parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#4f46e5' }}/>
                  <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 30, fontFamily: 'JetBrains Mono,monospace' }}>{Math.round((selectedObj.opacity ?? 1) * 100)}</span>
                </div>
              </PropRow>
              {(selectedObj.type === 'textbox' || selectedObj.type === 'text') && <PropRow label="Font size"><NumIn value={selectedObj.fontSize ?? 18} onChange={v => updateProp('fontSize', v)}/></PropRow>}
              {selectedObj.type === 'rect' && <PropRow label="Radius"><NumIn value={selectedObj.rx ?? 0} onChange={v => { updateProp('rx', v); updateProp('ry', v) }}/></PropRow>}
              <PropRow label="Color">
                <input type="color" value={typeof selectedObj.fill === 'string' ? selectedObj.fill : '#4f46e5'} onChange={e => updateProp('fill', e.target.value)} style={{ width: '100%', height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', cursor: 'pointer' }}/>
              </PropRow>
            </div>
          </div>
        )}
      </div>

      {/* ── Template modal ──────────────────────────────────────────────────────── */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'white', borderRadius: 22, width: 'min(960px,96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,.2)', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '22px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-.02em', fontFamily: 'Jost,sans-serif' }}>Start your design</h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0', fontFamily: 'Jost,sans-serif' }}>Choose a canvas size or start from a template.</p>
              </div>
              {pages.length > 0 && <button onClick={() => setShowTemplateModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 9, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
              {/* Canvas sizes */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Canvas size</div>
                {['Presentation', 'Document', 'Social'].map(cat => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{cat}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {CANVAS_SIZES.filter(s => s.cat === cat).map(s => (
                        <button key={s.id} onClick={() => startBlank(s.id)}
                          style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'Jost,sans-serif', transition: 'all .13s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#374151' }}>
                          {s.label}
                          <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace', fontWeight: 400 }}>{s.w}×{s.h}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Template categories */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Templates</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setTemplateCat(cat.id)}
                      style={{ padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${templateCat === cat.id ? '#4f46e5' : '#e5e7eb'}`, background: templateCat === cat.id ? '#4f46e5' : 'white', color: templateCat === cat.id ? 'white' : '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Jost,sans-serif', transition: 'all .13s' }}>
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                  {TEMPLATES.filter(t => t.cat === templateCat).map(tpl => {
                    const size = CANVAS_SIZES.find(s => s.id === tpl.size) || CANVAS_SIZES[0]
                    return (
                      <div key={tpl.id} className="tpl-card" onClick={() => applyTemplate(tpl.id, tpl.size)}>
                        <div style={{ aspectRatio: `${size.w}/${size.h}`, background: 'linear-gradient(135deg,#eef2ff,#f0fdf4)', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 32, height: 4, background: '#4f46e5', borderRadius: 2, margin: '0 auto 8px' }}/>
                            <div style={{ width: 60, height: 8, background: '#e5e7eb', borderRadius: 2, margin: '0 auto 4px' }}/>
                            <div style={{ width: 48, height: 6, background: '#f3f4f6', borderRadius: 2, margin: '0 auto' }}/>
                          </div>
                        </div>
                        <div style={{ padding: '12px 14px', background: 'white', borderRadius: '0 0 12px 12px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 3 }}>{tpl.label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{tpl.desc}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 9, color: '#4f46e5', background: '#eef2ff', borderRadius: 5, padding: '2px 8px', fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' }}>{tpl.pages}p</span>
                            <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace' }}>{size.w}×{size.h}</span>
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

      {/* ── Share modal ──────────────────────────────────────────────────────────── */}
      {showShare && <ShareModal documentId={params.id} links={shareLinks} onClose={() => setShowShare(false)} onRefresh={loadShareLinks} isActive={isActive} onPublish={publishDocument}/>}

      {/* ── Delete confirm ───────────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 32px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', fontFamily: 'Jost,sans-serif' }}>Delete document?</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6, fontFamily: 'Jost,sans-serif' }}>This will permanently delete this document and all its share links. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ ...btnStyle }}>Cancel</button>
              <button onClick={deleteDocument} disabled={deleting} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Jost,sans-serif', opacity: deleting ? .6 : 1 }}>
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Drafter ───────────────────────────────────────────────────────────── */}
      {showDrafter && (
        <AIDrafter documentType={doc?.type ?? 'document'} onDraftComplete={(html: string) => {
          const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          const page = makePage('#ffffff', [t(stripped, { l: 60, t: 60, w: canvasWRef.current - 120, fs: 16, fill: '#0f172a' })])
          const updated = [...pagesRef.current, page]; setPages(updated)
          const newIdx = updated.length - 1; setCurrentPage(newIdx)
          fabricRef.current?.loadFromJSON(page, () => fabricRef.current.renderAll()); saveCanvas()
        }} onClose={() => setShowDrafter(false)}/>
      )}
    </div>
  )
}

// ─── Shared style constants ───────────────────────────────────────────────────
const btnStyle: React.CSSProperties = { padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#374151', fontFamily: 'Jost,sans-serif', transition: 'all .12s' }
const primaryBtnStyle: React.CSSProperties = { padding: '7px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none', background: '#4f46e5', color: 'white', cursor: 'pointer', fontFamily: 'Jost,sans-serif', boxShadow: '0 2px 8px rgba(79,70,229,.25)' }
const fmtBtnStyle: React.CSSProperties = { width: 28, height: 28, border: 'none', cursor: 'pointer', borderRadius: 6, background: 'transparent', color: '#6b7280', fontFamily: 'Jost,sans-serif' }

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>{children}</div>
}

function NumIn({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#0f172a', borderRadius: 8, padding: '5px 9px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace', outline: 'none' }}/>
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ documentId, links, onClose, onRefresh, isActive, onPublish }: {
  documentId: string; links: ShareLink[]; onClose: () => void; onRefresh: () => void; isActive: boolean; onPublish: () => void
}) {
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [allowDownload, setAllowDownload] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(links.length === 0)

  async function createLink() {
    if (!isActive) { onPublish(); return }
    setCreating(true)
    const token = generateToken(14)
    const { error } = await supabase.from('share_links').insert({
      document_id: documentId, token, label: label || 'Share link',
      require_email: requireEmail, allow_download: allowDownload,
      password: password || null, is_active: true,
    })
    if (!error) { await onRefresh(); setShowNew(false); setLabel(''); setPassword(''); setRequireEmail(false); setAllowDownload(false) }
    setCreating(false)
  }

  function copyLink(token: string) {
    const url = buildShareUrl(token)
    navigator.clipboard.writeText(url)
    setCopied(token); setTimeout(() => setCopied(null), 2500)
  }

  async function toggleLink(id: string, active: boolean) {
    await supabase.from('share_links').update({ is_active: active }).eq('id', id)
    onRefresh()
  }

  async function deleteLink(id: string) {
    await supabase.from('share_links').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 440, height: '100vh', background: 'white', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,.1)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 700, color: '#0f172a', fontFamily: 'Jost,sans-serif' }}>Share & Track</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontFamily: 'Jost,sans-serif' }}>{links.length} link{links.length !== 1 ? 's' : ''} · {links.reduce((a, l) => a + (l.view_count || 0), 0)} total views</p>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 7, borderRadius: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {!isActive && (
          <div style={{ margin: '16px 20px', padding: '12px 16px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4, fontFamily: 'Jost,sans-serif' }}>Document not published</div>
            <div style={{ fontSize: 11, color: '#b45309', marginBottom: 10, fontFamily: 'Jost,sans-serif' }}>Publish first to create shareable links.</div>
            <button onClick={onPublish} style={{ ...primaryBtnStyle, fontSize: 12, padding: '6px 14px' }}>Publish now</button>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {links.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Active links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {links.map(link => (
                  <div key={link.id} style={{ border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'Jost,sans-serif' }}>{link.label ?? 'Share link'}</span>
                      <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: link.is_active ? '#dcfce7' : '#f1f5f9', color: link.is_active ? '#15803d' : '#64748b', fontFamily: 'JetBrains Mono,monospace' }}>{link.is_active ? 'LIVE' : 'OFF'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <code style={{ flex: 1, fontSize: 10, color: '#64748b', background: '#f8fafc', padding: '5px 9px', borderRadius: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontFamily: 'JetBrains Mono,monospace', border: '1px solid #e5e7eb' }}>{buildShareUrl(link.token)}</code>
                      <button onClick={() => copyLink(link.token)} style={{ padding: '5px 11px', background: copied === link.token ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${copied === link.token ? '#86efac' : '#e5e7eb'}`, borderRadius: 8, fontSize: 11, cursor: 'pointer', color: copied === link.token ? '#15803d' : '#64748b', fontFamily: 'Jost,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {copied === link.token ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap', marginBottom: 8, fontFamily: 'JetBrains Mono,monospace' }}>
                      <span>{link.view_count || 0} views</span>
                      {link.require_email && <span>Email required</span>}
                      {link.password && <span>Password protected</span>}
                      {link.allow_download && <span>Downloads on</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button onClick={() => toggleLink(link.id, !link.is_active)} style={{ fontSize: 11, color: link.is_active ? '#f59e0b' : '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>{link.is_active ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => deleteLink(link.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost,sans-serif', fontWeight: 600 }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showNew
            ? <button onClick={() => setShowNew(true)} style={{ width: '100%', padding: '12px', background: 'none', border: '2px dashed #e5e7eb', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: '#94a3b8', fontFamily: 'Jost,sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Create new link
              </button>
            : <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '18px' }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'Jost,sans-serif' }}>New share link</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Input label="Link label" placeholder="e.g. Sequoia meeting, Website" value={label} onChange={(e: any) => setLabel(e.target.value)}/>
                  <Input label="Password (optional)" type="password" placeholder="Leave empty for no password" value={password} onChange={(e: any) => setPassword(e.target.value)}/>
                  <Toggle checked={requireEmail} onChange={setRequireEmail} label="Require email address to view"/>
                  <Toggle checked={allowDownload} onChange={setAllowDownload} label="Allow document download"/>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" loading={creating} onClick={createLink} size="sm">{isActive ? 'Create link' : 'Publish & create link'}</Button>
                    <Button variant="ghost" onClick={() => setShowNew(false)} size="sm">Cancel</Button>
                  </div>
                </div>
              </div>
          }
        </div>
      </div>
    </div>
  )
}
