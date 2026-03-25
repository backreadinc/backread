'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { buildShareUrl, generateToken } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Badge, Toggle } from '@/components/ui'
import AIDrafter from '@/components/editor/AIDrafter'
import type { Database } from '@/lib/supabase/client'

type Document = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

const EMOJIS = ['📄','🚀','💼','📊','📋','🎯','💡','🔍','📈','🤝','🏢','⚡','🌟','🔒','📝']
const CANVAS_W = 960
const CANVAS_H = 540
const FONTS = ['Inter','Georgia','Playfair Display','Montserrat','Roboto Mono','Lato','Oswald','Raleway']

const TEMPLATES = [
  { id:'pitch-deck',  name:'Pitch Deck',  emoji:'📊', pages:6, description:'Investor-ready slides',  accent:'#f97316', bg:'linear-gradient(135deg,#fff7ed,#ffedd5)' },
  { id:'proposal',    name:'Proposal',    emoji:'📋', pages:4, description:'Client proposals',       accent:'#3b82f6', bg:'linear-gradient(135deg,#eff6ff,#dbeafe)' },
  { id:'report',      name:'Report',      emoji:'📈', pages:5, description:'Data & analysis',        accent:'#10b981', bg:'linear-gradient(135deg,#ecfdf5,#d1fae5)' },
  { id:'media-kit',   name:'Media Kit',   emoji:'🎨', pages:4, description:'Brand press kit',        accent:'#8b5cf6', bg:'linear-gradient(135deg,#f5f3ff,#ede9fe)' },
  { id:'case-study',  name:'Case Study',  emoji:'🔬', pages:5, description:'Client success story',   accent:'#ec4899', bg:'linear-gradient(135deg,#fdf2f8,#fce7f3)' },
  { id:'one-pager',   name:'One-Pager',   emoji:'⚡', pages:1, description:'Single page overview',   accent:'#f59e0b', bg:'linear-gradient(135deg,#fffbeb,#fef3c7)' },
]

function makePage(bg = '#ffffff', objects: any[] = []) {
  return { version: '5.3.0', objects, background: bg }
}
function txt(text: string, o: any = {}) {
  return { type:'textbox', left:o.left??60, top:o.top??60, width:o.width??400, text, fontSize:o.fontSize??18, fontFamily:o.fontFamily??'Inter', fill:o.fill??'#0f172a', fontWeight:o.fontWeight??'normal', opacity:o.opacity??1, selectable:true, editable:true }
}
function rct(o: any = {}) {
  return { type:'rect', left:o.left??0, top:o.top??0, width:o.width??200, height:o.height??60, fill:o.fill??'#f97316', rx:o.rx??0, ry:o.ry??0, selectable:true, opacity:o.opacity??1 }
}

function buildTemplate(id: string): any[] {
  const W = CANVAS_W, H = CANVAS_H
  switch (id) {
    case 'pitch-deck': return [
      makePage('#0f172a',[rct({left:0,top:0,width:W,height:H,fill:'#0f172a'}),rct({left:0,top:H-4,width:W,height:4,fill:'#f97316'}),rct({left:60,top:140,width:3,height:80,fill:'#f97316'}),txt('YOUR COMPANY',{left:80,top:140,fontSize:52,fontWeight:'700',fill:'#ffffff',width:W-140,fontFamily:'Inter'}),txt('The one-line pitch that changes everything.',{left:80,top:215,fontSize:20,fill:'#94a3b8',width:W-140}),txt('Series A · 2025',{left:80,top:H-60,fontSize:13,fill:'#f97316',fontFamily:'Roboto Mono'})]),
      makePage('#ffffff',[rct({left:0,top:0,width:W,height:4,fill:'#f97316'}),txt('The Problem',{left:60,top:48,fontSize:38,fontWeight:'700',fill:'#0f172a',width:500}),rct({left:60,top:120,width:380,height:220,fill:'#fff7ed',rx:12,ry:12}),txt('Pain Point #1',{left:80,top:140,fontSize:18,fontWeight:'600',fill:'#f97316',width:340}),txt('Describe the core frustration your customers face every day.',{left:80,top:170,fontSize:14,fill:'#64748b',width:340}),rct({left:480,top:120,width:420,height:220,fill:'#f8fafc',rx:12,ry:12}),txt('Pain Point #2',{left:500,top:140,fontSize:18,fontWeight:'600',fill:'#0f172a',width:380}),txt('The secondary problem that compounds the first.',{left:500,top:170,fontSize:14,fill:'#64748b',width:380}),txt('$XXB total addressable market with no adequate solution today.',{left:60,top:370,fontSize:16,fill:'#f97316',fontWeight:'600',width:W-120})]),
      makePage('#ffffff',[rct({left:0,top:0,width:W,height:4,fill:'#f97316'}),txt('Our Solution',{left:60,top:48,fontSize:38,fontWeight:'700',fill:'#0f172a',width:500}),rct({left:60,top:120,width:260,height:200,fill:'#0f172a',rx:16,ry:16}),txt('01',{left:80,top:140,fontSize:36,fontWeight:'700',fill:'#f97316',width:220,fontFamily:'Roboto Mono'}),txt('Feature One',{left:80,top:190,fontSize:18,fontWeight:'600',fill:'#ffffff',width:220}),txt('What it does and why it matters.',{left:80,top:216,fontSize:13,fill:'#94a3b8',width:220}),rct({left:360,top:120,width:260,height:200,fill:'#fff7ed',rx:16,ry:16}),txt('02',{left:380,top:140,fontSize:36,fontWeight:'700',fill:'#f97316',width:220,fontFamily:'Roboto Mono'}),txt('Feature Two',{left:380,top:190,fontSize:18,fontWeight:'600',fill:'#0f172a',width:220}),txt('What it does and why it matters.',{left:380,top:216,fontSize:13,fill:'#64748b',width:220}),rct({left:660,top:120,width:240,height:200,fill:'#f8fafc',rx:16,ry:16}),txt('03',{left:680,top:140,fontSize:36,fontWeight:'700',fill:'#f97316',width:200,fontFamily:'Roboto Mono'}),txt('Feature Three',{left:680,top:190,fontSize:18,fontWeight:'600',fill:'#0f172a',width:200}),txt('What it does and why it matters.',{left:680,top:216,fontSize:13,fill:'#64748b',width:200})]),
      makePage('#ffffff',[rct({left:0,top:0,width:W,height:4,fill:'#f97316'}),txt('Traction',{left:60,top:48,fontSize:38,fontWeight:'700',fill:'#0f172a',width:500}),rct({left:60,top:120,width:220,height:160,fill:'#fff7ed',rx:16,ry:16}),txt('$0M',{left:80,top:145,fontSize:44,fontWeight:'700',fill:'#f97316',width:180,fontFamily:'Inter'}),txt('ARR',{left:80,top:200,fontSize:13,fill:'#94a3b8',width:180}),rct({left:320,top:120,width:220,height:160,fill:'#f0fdf4',rx:16,ry:16}),txt('0K',{left:340,top:145,fontSize:44,fontWeight:'700',fill:'#10b981',width:180,fontFamily:'Inter'}),txt('ACTIVE USERS',{left:340,top:200,fontSize:13,fill:'#94a3b8',width:180}),rct({left:580,top:120,width:220,height:160,fill:'#f0f9ff',rx:16,ry:16}),txt('0%',{left:600,top:145,fontSize:44,fontWeight:'700',fill:'#3b82f6',width:180,fontFamily:'Inter'}),txt('MONTH GROWTH',{left:600,top:200,fontSize:13,fill:'#94a3b8',width:180})]),
      makePage('#ffffff',[rct({left:0,top:0,width:W,height:4,fill:'#f97316'}),txt('The Ask',{left:60,top:48,fontSize:38,fontWeight:'700',fill:'#0f172a',width:500}),rct({left:60,top:120,width:W-120,height:80,fill:'#0f172a',rx:12,ry:12}),txt('Raising $X.XM Seed Round',{left:80,top:143,fontSize:32,fontWeight:'700',fill:'#ffffff',width:700}),txt('40% Product & Engineering',{left:60,top:230,fontSize:15,fill:'#0f172a',fontWeight:'600',width:280}),txt('30% Sales & Growth',{left:60,top:256,fontSize:15,fill:'#64748b',width:280}),txt('20% Marketing',{left:360,top:230,fontSize:15,fill:'#0f172a',fontWeight:'600',width:280}),txt('10% Operations',{left:360,top:256,fontSize:15,fill:'#64748b',width:280})]),
      makePage('#f97316',[txt('Thank You',{left:60,top:140,fontSize:80,fontWeight:'700',fill:'#ffffff',width:W-120,fontFamily:'Inter'}),txt("Questions? Let's build something great.",{left:60,top:250,fontSize:22,fill:'#fff7ed',width:600}),txt('hello@backread.com',{left:60,top:H-80,fontSize:16,fill:'#ffedd5',fontFamily:'Roboto Mono'})]),
    ]
    case 'proposal': return [
      makePage('#fafafa',[rct({left:0,top:0,width:320,height:H,fill:'#0f172a'}),txt('PROJECT\nPROPOSAL',{left:40,top:60,fontSize:32,fontWeight:'700',fill:'#ffffff',width:240,fontFamily:'Inter'}),rct({left:40,top:200,width:40,height:3,fill:'#3b82f6'}),txt('Prepared for:',{left:40,top:222,fontSize:12,fill:'#64748b',width:240}),txt('Client Name',{left:40,top:240,fontSize:18,fontWeight:'600',fill:'#ffffff',width:240}),txt('Month YYYY',{left:40,top:H-60,fontSize:12,fill:'#475569',fontFamily:'Roboto Mono',width:240}),txt('Proposal Title\nGoes Here',{left:360,top:100,fontSize:44,fontWeight:'700',fill:'#0f172a',width:540}),txt('A compelling one-sentence summary of what this proposal delivers.',{left:360,top:230,fontSize:16,fill:'#64748b',width:540})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#3b82f6'}),txt('Executive Summary',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:W-80}),rct({left:40,top:108,width:W-80,height:2,fill:'#e2e8f0'}),txt('Describe the project context, the challenge at hand, and why this proposal represents the ideal solution.',{left:40,top:128,fontSize:16,fill:'#475569',width:W-80}),rct({left:40,top:250,width:(W-100)/2,height:120,fill:'#eff6ff',rx:12,ry:12}),txt('Challenge',{left:60,top:268,fontSize:16,fontWeight:'600',fill:'#3b82f6',width:400}),txt('Define the core problem clearly.',{left:60,top:294,fontSize:14,fill:'#64748b',width:400}),rct({left:(W-100)/2+60,top:250,width:(W-100)/2,height:120,fill:'#f0fdf4',rx:12,ry:12}),txt('Solution',{left:(W-100)/2+80,top:268,fontSize:16,fontWeight:'600',fill:'#10b981',width:400}),txt('How this proposal solves it.',{left:(W-100)/2+80,top:294,fontSize:14,fill:'#64748b',width:400})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#3b82f6'}),txt('Scope & Deliverables',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:W-80}),rct({left:40,top:108,width:W-80,height:2,fill:'#e2e8f0'}),rct({left:40,top:130,width:20,height:20,fill:'#3b82f6',rx:4,ry:4}),txt('Phase 1 — Discovery & Strategy',{left:72,top:132,fontSize:16,fontWeight:'600',fill:'#0f172a',width:500}),txt('Week 1–2 · Research brief, competitive analysis, strategy document',{left:72,top:155,fontSize:13,fill:'#64748b',width:600}),rct({left:40,top:200,width:20,height:20,fill:'#3b82f6',rx:4,ry:4}),txt('Phase 2 — Design & Build',{left:72,top:202,fontSize:16,fontWeight:'600',fill:'#0f172a',width:500}),txt('Week 3–6 · Wireframes, design system, working product',{left:72,top:225,fontSize:13,fill:'#64748b',width:600}),rct({left:40,top:270,width:20,height:20,fill:'#3b82f6',rx:4,ry:4}),txt('Phase 3 — Launch & Handoff',{left:72,top:272,fontSize:16,fontWeight:'600',fill:'#0f172a',width:500}),txt('Week 7–8 · QA, documentation, launch support',{left:72,top:295,fontSize:13,fill:'#64748b',width:600})]),
      makePage('#0f172a',[txt('Investment',{left:60,top:60,fontSize:38,fontWeight:'700',fill:'#ffffff',width:W-120}),rct({left:60,top:130,width:W-120,height:100,fill:'#1e293b',rx:16,ry:16}),txt('$XX,000',{left:80,top:153,fontSize:48,fontWeight:'700',fill:'#3b82f6',width:400,fontFamily:'Inter'}),txt('Total investment',{left:80,top:210,fontSize:13,fill:'#64748b',width:300}),txt('50% due on project start · 50% on final delivery',{left:60,top:258,fontSize:15,fill:'#94a3b8',width:W-120}),txt('All work is covered by a 30-day satisfaction guarantee.',{left:60,top:286,fontSize:15,fill:'#94a3b8',width:W-120})]),
    ]
    case 'report': return [
      makePage('#f8fafc',[rct({left:0,top:0,width:6,height:H,fill:'#10b981'}),txt('QUARTERLY\nREPORT',{left:40,top:60,fontSize:58,fontWeight:'700',fill:'#0f172a',width:560,fontFamily:'Inter'}),txt('Q1 2025',{left:40,top:260,fontSize:18,fill:'#10b981',fontWeight:'600',fontFamily:'Roboto Mono'}),txt('Backread Intelligence Platform · Confidential',{left:40,top:H-50,fontSize:12,fill:'#94a3b8',fontFamily:'Roboto Mono',width:500})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#10b981'}),txt('Key Metrics',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:W-80}),rct({left:40,top:110,width:200,height:140,fill:'#ecfdf5',rx:12,ry:12}),txt('0',{left:60,top:128,fontSize:54,fontWeight:'700',fill:'#10b981',width:160,fontFamily:'Inter'}),txt('TOTAL VIEWS',{left:60,top:192,fontSize:11,fill:'#6b7280',width:160,fontFamily:'Roboto Mono'}),rct({left:260,top:110,width:200,height:140,fill:'#f0f9ff',rx:12,ry:12}),txt('0:00',{left:280,top:128,fontSize:54,fontWeight:'700',fill:'#3b82f6',width:160,fontFamily:'Inter'}),txt('AVG READ TIME',{left:280,top:192,fontSize:11,fill:'#6b7280',width:160,fontFamily:'Roboto Mono'}),rct({left:480,top:110,width:200,height:140,fill:'#fdf4ff',rx:12,ry:12}),txt('0%',{left:500,top:128,fontSize:54,fontWeight:'700',fill:'#8b5cf6',width:160,fontFamily:'Inter'}),txt('COMPLETION',{left:500,top:192,fontSize:11,fill:'#6b7280',width:160,fontFamily:'Roboto Mono'})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#10b981'}),txt('Highlights & Insights',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:W-80}),rct({left:40,top:120,width:W-80,height:80,fill:'#ecfdf5',rx:8,ry:8}),txt('✦  Highlight One',{left:60,top:142,fontSize:17,fontWeight:'600',fill:'#065f46',width:W-120}),txt('Describe what performed well and why it matters for the business.',{left:60,top:166,fontSize:13,fill:'#6b7280',width:W-120}),rct({left:40,top:218,width:W-80,height:80,fill:'#f8fafc',rx:8,ry:8}),txt('✦  Highlight Two',{left:60,top:240,fontSize:17,fontWeight:'600',fill:'#0f172a',width:W-120}),txt('A secondary insight worth highlighting this quarter.',{left:60,top:264,fontSize:13,fill:'#6b7280',width:W-120})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#10b981'}),txt('Recommendations',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:W-80}),txt('Action 1',{left:40,top:120,fontSize:20,fontWeight:'600',fill:'#10b981',width:W-80}),txt('What to do, why it matters, and the expected outcome.',{left:40,top:148,fontSize:14,fill:'#64748b',width:W-80}),rct({left:40,top:178,width:60,height:2,fill:'#e2e8f0'}),txt('Action 2',{left:40,top:198,fontSize:20,fontWeight:'600',fill:'#0f172a',width:W-80}),txt('Second recommendation with supporting rationale.',{left:40,top:226,fontSize:14,fill:'#64748b',width:W-80})]),
      makePage('#0f172a',[txt('Q2 Goals',{left:60,top:60,fontSize:44,fontWeight:'700',fill:'#ffffff',width:W-120}),txt('OKR 1: Grow active users by 40%',{left:60,top:160,fontSize:18,fill:'#10b981',fontWeight:'500',width:W-120}),txt('OKR 2: Reduce churn to under 3%',{left:60,top:198,fontSize:18,fill:'#94a3b8',fontWeight:'500',width:W-120}),txt('OKR 3: Launch enterprise tier',{left:60,top:236,fontSize:18,fill:'#94a3b8',fontWeight:'500',width:W-120})]),
    ]
    case 'media-kit': return [
      makePage('#faf5ff',[rct({left:W/2,top:0,width:W/2,height:H,fill:'#8b5cf6',opacity:.07}),txt('BACKREAD',{left:60,top:80,fontSize:72,fontWeight:'700',fill:'#1a1a2e',width:W-120,fontFamily:'Inter'}),rct({left:60,top:170,width:80,height:5,fill:'#8b5cf6'}),txt('Brand Media Kit 2025',{left:60,top:196,fontSize:20,fill:'#8b5cf6',fontWeight:'500'}),txt('Press & Partnership Resources',{left:60,top:H-70,fontSize:14,fill:'#94a3b8'})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#8b5cf6'}),txt('About Backread',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:W-80}),txt('Backread is a document intelligence platform that helps teams send, track, and understand exactly how their documents are read — page by page, second by second.',{left:40,top:115,fontSize:17,fill:'#475569',width:W-80})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#8b5cf6'}),txt('Brand Colors',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:W-80}),rct({left:40,top:120,width:140,height:140,fill:'#f97316',rx:16,ry:16}),txt('Signal Orange',{left:40,top:272,fontSize:13,fontWeight:'600',fill:'#0f172a'}),txt('#F97316',{left:40,top:290,fontSize:12,fill:'#94a3b8',fontFamily:'Roboto Mono'}),rct({left:200,top:120,width:140,height:140,fill:'#8b5cf6',rx:16,ry:16}),txt('Deep Violet',{left:200,top:272,fontSize:13,fontWeight:'600',fill:'#0f172a'}),txt('#8B5CF6',{left:200,top:290,fontSize:12,fill:'#94a3b8',fontFamily:'Roboto Mono'}),rct({left:360,top:120,width:140,height:140,fill:'#0f172a',rx:16,ry:16}),txt('Obsidian',{left:360,top:272,fontSize:13,fontWeight:'600',fill:'#0f172a'}),txt('#0F172A',{left:360,top:290,fontSize:12,fill:'#94a3b8',fontFamily:'Roboto Mono'})]),
      makePage('#8b5cf6',[txt('Get in Touch',{left:60,top:100,fontSize:52,fontWeight:'700',fill:'#ffffff',width:W-120}),txt('For press inquiries, partnerships, and brand licensing.',{left:60,top:190,fontSize:20,fill:'#ede9fe',width:500}),txt('press@backread.com',{left:60,top:320,fontSize:28,fontWeight:'600',fill:'#ffffff',fontFamily:'Inter'})]),
    ]
    case 'case-study': return [
      makePage('#ffffff',[rct({left:0,top:0,width:W,height:6,fill:'#ec4899'}),txt('CASE STUDY',{left:60,top:50,fontSize:11,fill:'#ec4899',fontFamily:'Roboto Mono',fontWeight:'600'}),txt('How [Client]\nAchieved X\nwith Backread',{left:60,top:90,fontSize:52,fontWeight:'700',fill:'#0f172a',width:W-120,fontFamily:'Inter'})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#ec4899'}),txt('The Challenge',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:500}),txt("Describe the client's core problem in vivid detail.",{left:40,top:110,fontSize:16,fill:'#475569',width:W-80}),rct({left:40,top:230,width:W-80,height:100,fill:'#fdf2f8',rx:12,ry:12}),txt('"Quote from the client describing their pain point."',{left:60,top:258,fontSize:18,fill:'#ec4899',fontWeight:'500',fontFamily:'Georgia',width:W-120})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#ec4899'}),txt('The Solution',{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:500}),txt('Explain exactly how Backread was implemented.',{left:40,top:110,fontSize:16,fill:'#475569',width:W-80})]),
      makePage('#0f172a',[txt('The Results',{left:60,top:56,fontSize:38,fontWeight:'700',fill:'#ffffff',width:W-120}),rct({left:60,top:130,width:260,height:160,fill:'#1e293b',rx:16,ry:16}),txt('0%',{left:80,top:150,fontSize:60,fontWeight:'700',fill:'#ec4899',width:220,fontFamily:'Inter'}),txt('improvement in key metric',{left:80,top:222,fontSize:12,fill:'#64748b',width:220}),rct({left:360,top:130,width:260,height:160,fill:'#1e293b',rx:16,ry:16}),txt('0x',{left:380,top:150,fontSize:60,fontWeight:'700',fill:'#ffffff',width:220,fontFamily:'Inter'}),txt('faster than before',{left:380,top:222,fontSize:12,fill:'#64748b',width:220})]),
      makePage('#ffffff',[rct({left:0,top:0,width:4,height:H,fill:'#ec4899'}),txt("What's Next",{left:40,top:48,fontSize:34,fontWeight:'700',fill:'#0f172a',width:500}),txt("Describe the client's plans going forward.",{left:40,top:110,fontSize:16,fill:'#475569',width:W-80})]),
    ]
    case 'one-pager':
    default: return [
      makePage('#ffffff',[rct({left:0,top:0,width:W,height:6,fill:'#f59e0b'}),txt('BACKREAD',{left:40,top:36,fontSize:18,fontWeight:'700',fill:'#f59e0b',width:300,fontFamily:'Inter'}),txt('Your Headline Here',{left:40,top:90,fontSize:48,fontWeight:'700',fill:'#0f172a',width:W/2-60,fontFamily:'Inter'}),txt('A compelling one-sentence pitch that makes someone stop scrolling.',{left:40,top:180,fontSize:16,fill:'#64748b',width:W/2-60}),rct({left:40,top:230,width:130,height:44,fill:'#f59e0b',rx:8,ry:8}),txt('Get Started →',{left:52,top:242,fontSize:14,fontWeight:'600',fill:'#ffffff',width:106}),txt('Key Benefit One',{left:40,top:320,fontSize:16,fontWeight:'600',fill:'#f59e0b'}),txt('Short punchy description here.',{left:40,top:344,fontSize:14,fill:'#64748b',width:W/2-60}),txt('Key Benefit Two',{left:40,top:390,fontSize:16,fontWeight:'600',fill:'#0f172a'}),txt('Short punchy description here.',{left:40,top:414,fontSize:14,fill:'#64748b',width:W/2-60}),rct({left:W/2+20,top:70,width:W/2-60,height:H-140,fill:'#fffbeb',rx:20,ry:20}),txt('hello@backread.com',{left:40,top:H-44,fontSize:13,fill:'#94a3b8',fontFamily:'Roboto Mono'})]),
    ]
  }
}

export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc, setDoc] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('📄')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showShare, setShowShare] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDrafter, setShowDrafter] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const canvasEl = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [pages, setPages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTool, setActiveTool] = useState('select')
  const [zoom, setZoom] = useState(0.68)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [fontColor, setFontColor] = useState('#0f172a')
  const [fillColor, setFillColor] = useState('#f97316')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('Inter')
  const [isDragging, setIsDragging] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const pagesRef = useRef<any[]>([])
  const currentPageRef = useRef(0)

  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;600&family=Playfair+Display:wght@700&family=Montserrat:wght@400;600;700&display=swap'
    document.head.appendChild(link)
    if (!(window as any).fabric) {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => { loadDocument(); loadShareLinks() }, [params.id])

  async function loadDocument() {
    const { data } = await supabase.from('documents').select('*').eq('id', params.id).single()
    if (!data) { router.push('/dashboard'); return }
    setDoc(data); setTitle(data.title); setEmoji(data.cover_emoji ?? '📄')
    const canvasData = (data as any).canvas_data
    if (canvasData?.pages?.length) { setPages(canvasData.pages); setShowTemplates(false) }
    else setShowTemplates(true)
  }

  async function loadShareLinks() {
    const { data } = await supabase.from('share_links').select('*').eq('document_id', params.id).order('created_at', { ascending: false })
    setShareLinks(data ?? [])
  }

  useEffect(() => {
    const check = setInterval(() => {
      if ((window as any).fabric && canvasEl.current && !fabricRef.current) {
        clearInterval(check)
        const fabric = (window as any).fabric
        const fc = new fabric.Canvas(canvasEl.current, { width: CANVAS_W, height: CANVAS_H, backgroundColor: '#ffffff', selection: true, preserveObjectStacking: true })
        fabricRef.current = fc
        fc.on('selection:created', (e: any) => { const o = e.selected?.[0]; setSelectedObj(o); if (o) { setFontSize(o.fontSize || 18); setFontFamily(o.fontFamily || 'Inter') } })
        fc.on('selection:updated', (e: any) => { const o = e.selected?.[0]; setSelectedObj(o); if (o) { setFontSize(o.fontSize || 18); setFontFamily(o.fontFamily || 'Inter') } })
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
    await supabase.from('documents').update({ canvas_data: { pages: allPages }, updated_at: new Date().toISOString() } as any).eq('id', params.id)
    setSaving(false); setLastSaved(new Date())
  }, [params.id])

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

  function applyTemplate(id: string) {
    const builtPages = buildTemplate(id); setPages(builtPages); setCurrentPage(0); setShowTemplates(false)
    const load = () => { if (fabricRef.current) fabricRef.current.loadFromJSON(builtPages[0], () => fabricRef.current.renderAll()); else setTimeout(load, 100) }
    load()
  }

  function startBlank() {
    const blank = makePage('#ffffff'); setPages([blank]); setCurrentPage(0); setShowTemplates(false)
    if (fabricRef.current) { fabricRef.current.clear(); fabricRef.current.backgroundColor = '#ffffff'; fabricRef.current.renderAll() }
  }

  function addText() {
    const fabric = (window as any).fabric; const fc = fabricRef.current; if (!fc || !fabric) return
    const tb = new fabric.Textbox('Click to edit', { left: 120, top: 120, width: 320, fontSize: 24, fontFamily, fill: fontColor, editable: true })
    fc.add(tb); fc.setActiveObject(tb); fc.renderAll()
  }

  function addShape(type: 'rect' | 'circle' | 'triangle') {
    const fabric = (window as any).fabric; const fc = fabricRef.current; if (!fc || !fabric) return
    const shapes: any = {
      rect: new fabric.Rect({ left: 120, top: 120, width: 200, height: 100, fill: fillColor, rx: 8, ry: 8 }),
      circle: new fabric.Circle({ left: 120, top: 120, radius: 70, fill: fillColor }),
      triangle: new fabric.Triangle({ left: 120, top: 120, width: 140, height: 140, fill: fillColor }),
    }
    fc.add(shapes[type]); fc.setActiveObject(shapes[type]); fc.renderAll()
  }

  function deleteSelected() {
    const fc = fabricRef.current; if (!fc) return
    fc.getActiveObjects().forEach((o: any) => fc.remove(o)); fc.discardActiveObject(); fc.renderAll()
  }

  function duplicateSelected() {
    const fc = fabricRef.current; if (!fc) return
    fc.getActiveObject()?.clone((c: any) => { c.set({ left: c.left + 20, top: c.top + 20 }); fc.add(c); fc.setActiveObject(c); fc.renderAll() })
  }

  function updateSelectedProp(prop: string, value: any) {
    const fc = fabricRef.current; if (!fc) return
    const obj = fc.getActiveObject(); if (!obj) return
    obj.set(prop, value); fc.renderAll(); scheduleAutoSave()
  }

  function uploadImage(file: File) {
    const fabric = (window as any).fabric; const fc = fabricRef.current; if (!fc || !fabric) return
    const reader = new FileReader()
    reader.onload = e => fabric.Image.fromURL(e.target?.result as string, (img: any) => {
      const scale = Math.min(400 / img.width, 300 / img.height, 1)
      img.set({ left: 120, top: 120, scaleX: scale, scaleY: scale }); fc.add(img); fc.setActiveObject(img); fc.renderAll()
    })
    reader.readAsDataURL(file)
  }

  async function saveTitle() { await supabase.from('documents').update({ title: title || 'Untitled', cover_emoji: emoji }).eq('id', params.id) }

  async function publishDocument() {
    await supabase.from('documents').update({ status: 'active' }).eq('id', params.id)
    setDoc(prev => prev ? { ...prev, status: 'active' } : prev); setShowShare(true)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveCanvas() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricRef.current?.getActiveObject()) deleteSelected()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveCanvas])

  const isActive = doc?.status === 'active'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f1f5f9', fontFamily:"'Inter',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px;}
        input[type="color"]{-webkit-appearance:none;border:2px solid #e2e8f0;cursor:pointer;padding:0;border-radius:6px;width:28px;height:28px;}
        input[type="color"]::-webkit-color-swatch-wrapper{padding:2px;}
        input[type="color"]::-webkit-color-swatch{border:none;border-radius:4px;}
        .tbtn{width:34px;height:34px;border:none;cursor:pointer;border-radius:8px;background:transparent;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .12s;}
        .tbtn:hover{background:#f1f5f9;color:#0f172a;}
        .tbtn.on{background:#fff7ed;color:#f97316;}
        .page-thumb{cursor:pointer;border-radius:10px;border:2px solid #e2e8f0;overflow:hidden;transition:all .15s;background:white;}
        .page-thumb:hover{border-color:#94a3b8;}
        .page-thumb.on{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.15);}
        .tcard{border:2px solid #e2e8f0;border-radius:16px;cursor:pointer;text-align:left;font-family:inherit;transition:all .18s;}
        .tcard:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(0,0,0,.1);}
        select{-webkit-appearance:none;appearance:none;background:white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E") no-repeat right 8px center;border:1.5px solid #e2e8f0;border-radius:8px;padding:5px 26px 5px 10px;font-size:12px;font-family:inherit;color:#374151;cursor:pointer;outline:none;}
        select:focus{border-color:#f97316;}
      `}</style>

      {/* TOP BAR */}
      <div style={{ borderBottom:'1px solid #e2e8f0', background:'white', padding:'0 16px', height:56, display:'flex', alignItems:'center', gap:10, flexShrink:0, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center', gap:5, fontSize:13, fontFamily:'inherit', padding:'5px 8px', borderRadius:8, fontWeight:500 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Docs
        </button>
        <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M1 1l3 4-3 4" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round"/></svg>

        <div style={{ position:'relative' }}>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ fontSize:20, background:'none', border:'none', cursor:'pointer', padding:'2px 5px', borderRadius:7 }}>{emoji}</button>
          {showEmojiPicker && <div style={{ position:'absolute', top:'110%', left:0, background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:10, display:'flex', flexWrap:'wrap', gap:4, width:246, zIndex:50, boxShadow:'0 8px 32px rgba(0,0,0,.12)' }}>
            {EMOJIS.map(e => <button key={e} onClick={() => { setEmoji(e); setShowEmojiPicker(false); setTimeout(saveTitle, 100) }} style={{ fontSize:20, background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:7 }}>{e}</button>)}
          </div>}
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={saveTitle} placeholder="Untitled"
          style={{ border:'none', outline:'none', fontSize:14, fontWeight:600, color:'#0f172a', background:'transparent', fontFamily:'inherit', flex:1, maxWidth:260 }}/>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto', flexShrink:0 }}>
          <span style={{ fontSize:11, color:saving?'#f97316':'#94a3b8', fontFamily:'Roboto Mono', minWidth:80 }}>
            {saving ? '● Saving…' : lastSaved ? `✓ ${lastSaved.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}` : ''}
          </span>
          <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:'.04em', background:isActive?'#dcfce7':'#f1f5f9', color:isActive?'#15803d':'#64748b' }}>{isActive ? 'LIVE' : 'DRAFT'}</span>
          <button onClick={() => setShowTemplates(true)} style={{ padding:'6px 13px', borderRadius:8, fontSize:13, fontWeight:500, border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', color:'#374151', fontFamily:'inherit' }}>Templates</button>
          <button onClick={() => setShowDrafter(true)} style={{ padding:'6px 13px', borderRadius:8, fontSize:13, fontWeight:500, border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', color:'#374151', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.2 4.5H11L8.1 6.8L9.3 10.5L6 8.2L2.7 10.5L3.9 6.8L1 4.5H4.8L6 1Z" fill="#f97316"/></svg>AI Draft
          </button>
          <button onClick={() => router.push(`/documents/${params.id}/present`)} style={{ padding:'6px 13px', borderRadius:8, fontSize:13, fontWeight:500, border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', color:'#374151', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 11h3M6.5 10v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>Present
          </button>
          {isActive
            ? <button onClick={() => setShowShare(true)} style={{ padding:'7px 18px', borderRadius:9, fontSize:13, fontWeight:600, border:'none', background:'#f97316', color:'white', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(249,115,22,.3)' }}>Share</button>
            : <button onClick={publishDocument} style={{ padding:'7px 18px', borderRadius:9, fontSize:13, fontWeight:600, border:'none', background:'#f97316', color:'white', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(249,115,22,.3)' }}>Publish &amp; Share</button>
          }
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ borderBottom:'1px solid #e2e8f0', padding:'0 12px', background:'white', display:'flex', alignItems:'center', gap:2, flexShrink:0, height:48 }}>
        {[
          { id:'select', tip:'Select (V)', icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 2l9 5-4.5 1.4-2.2 4.6L3 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
          { id:'text',   tip:'Text (T)',  icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M7.5 4v8M4.5 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
          { id:'rect',   tip:'Rectangle',icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="3" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/></svg> },
          { id:'circle', tip:'Ellipse',  icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><ellipse cx="7.5" cy="7.5" rx="5.5" ry="5.5" stroke="currentColor" strokeWidth="1.4"/></svg> },
          { id:'draw',   tip:'Draw',     icon:<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 12.5l2-1 6.5-6.5-1-1L3.5 10.5l-1 2zM10 4l1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        ].map(tool => (
          <button key={tool.id} title={tool.tip} className={`tbtn${activeTool === tool.id ? ' on' : ''}`}
            onClick={() => {
              if (tool.id === 'text') { addText(); setActiveTool('select'); return }
              if (tool.id === 'rect') { addShape('rect'); return }
              if (tool.id === 'circle') { addShape('circle'); return }
              setActiveTool(tool.id)
              if (fabricRef.current) { fabricRef.current.isDrawingMode = tool.id === 'draw'; if (tool.id === 'draw') fabricRef.current.freeDrawingBrush.color = fontColor }
            }}>{tool.icon}
          </button>
        ))}

        <div style={{ width:1, height:24, background:'#e2e8f0', margin:'0 6px' }}/>

        <label title="Upload image" className="tbtn" style={{ cursor:'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="5" cy="6.5" r="1.2" fill="currentColor"/><path d="M1 11l3.5-3L8 11l2.5-2.5L14 12" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}/>
        </label>

        <div style={{ width:1, height:24, background:'#e2e8f0', margin:'0 6px' }}/>

        <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); updateSelectedProp('fontFamily', e.target.value) }} style={{ minWidth:140 }}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <input type="number" value={fontSize} min={6} max={200}
          onChange={e => { const v = parseInt(e.target.value); setFontSize(v); updateSelectedProp('fontSize', v) }}
          style={{ width:54, border:'1.5px solid #e2e8f0', borderRadius:8, padding:'5px 8px', fontSize:12, fontFamily:'inherit', color:'#374151', outline:'none', textAlign:'center' }}/>

        <button title="Bold" onClick={() => { const o = fabricRef.current?.getActiveObject(); if(o){ o.set('fontWeight', o.fontWeight==='bold'?'normal':'bold'); fabricRef.current.renderAll() } }} style={{ ...btnStyle, fontWeight:700, fontSize:15 }}>B</button>
        <button title="Italic" onClick={() => { const o = fabricRef.current?.getActiveObject(); if(o){ o.set('fontStyle', o.fontStyle==='italic'?'normal':'italic'); fabricRef.current.renderAll() } }} style={{ ...btnStyle, fontStyle:'italic', fontSize:15 }}>I</button>
        <button title="Underline" onClick={() => { const o = fabricRef.current?.getActiveObject(); if(o){ o.set('underline', !o.underline); fabricRef.current.renderAll() } }} style={{ ...btnStyle, textDecoration:'underline', fontSize:14 }}>U</button>

        <div style={{ width:1, height:24, background:'#e2e8f0', margin:'0 6px' }}/>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ textAlign:'center' }}>
            <input type="color" value={fontColor} title="Text color" onChange={e => { setFontColor(e.target.value); updateSelectedProp('fill', e.target.value) }}/>
            <div style={{ fontSize:9, color:'#94a3b8', marginTop:1, fontFamily:'Roboto Mono' }}>TEXT</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <input type="color" value={fillColor} title="Fill color" onChange={e => { setFillColor(e.target.value); updateSelectedProp('fill', e.target.value) }}/>
            <div style={{ fontSize:9, color:'#94a3b8', marginTop:1, fontFamily:'Roboto Mono' }}>FILL</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <input type="color" value={bgColor} title="Page background" onChange={e => { setBgColor(e.target.value); if (fabricRef.current) { fabricRef.current.backgroundColor = e.target.value; fabricRef.current.renderAll() } }}/>
            <div style={{ fontSize:9, color:'#94a3b8', marginTop:1, fontFamily:'Roboto Mono' }}>PAGE</div>
          </div>
        </div>

        <div style={{ width:1, height:24, background:'#e2e8f0', margin:'0 6px' }}/>

        {[
          { tip:'Duplicate', fn: duplicateSelected, icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4V2.5A1.5 1.5 0 015.5 1H11.5A1.5 1.5 0 0113 2.5V8.5A1.5 1.5 0 0111.5 10H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
          { tip:'Delete',    fn: deleteSelected,    icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5h4V4M5.5 10.5v-5M8.5 10.5v-5M3 4l.8 7.5h6.4L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          { tip:'Bring forward', fn:()=>{const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.bringToFront(o);fabricRef.current.renderAll()}}, icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 5l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          { tip:'Send backward',fn:()=>{const o=fabricRef.current?.getActiveObject();if(o){fabricRef.current.sendToBack(o);fabricRef.current.renderAll()}},  icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M3 9l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        ].map(b => <button key={b.tip} title={b.tip} className="tbtn" onClick={b.fn}>{b.icon}</button>)}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:3, background:'#f8fafc', borderRadius:9, padding:'3px 10px', border:'1.5px solid #e2e8f0' }}>
          <button onClick={() => setZoom(z => Math.max(.25, z - .1))} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:18, lineHeight:1, padding:'0 3px', fontWeight:300 }}>−</button>
          <span style={{ fontSize:11, color:'#64748b', minWidth:40, textAlign:'center', fontFamily:'Roboto Mono' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + .1))} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:18, lineHeight:1, padding:'0 3px', fontWeight:300 }}>+</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Pages strip */}
        <div style={{ width:150, flexShrink:0, background:'white', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em' }}>Pages</span>
            <button onClick={addPage} title="Add page" style={{ background:'#f97316', border:'none', borderRadius:6, width:22, height:22, color:'white', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, boxShadow:'0 1px 4px rgba(249,115,22,.3)' }}>+</button>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:'10px 8px', display:'flex', flexDirection:'column', gap:8 }}>
            {pages.map((page, idx) => (
              <div key={idx} onClick={() => switchPage(idx)} className={`page-thumb${currentPage === idx ? ' on' : ''}`}>
                <div style={{ width:'100%', aspectRatio:`${CANVAS_W}/${CANVAS_H}`, background:page?.background ?? '#ffffff', position:'relative' }}>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'2px 6px', background:'rgba(255,255,255,.8)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:9, color:'#94a3b8', fontFamily:'Roboto Mono', fontWeight:600 }}>{idx + 1}</span>
                    {pages.length > 1 && <button onClick={e => { e.stopPropagation(); removePage(idx) }} style={{ width:13, height:13, borderRadius:3, background:'#ef4444', border:'none', color:'white', fontSize:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:'7px 12px', borderTop:'1px solid #e2e8f0', fontSize:10, color:'#94a3b8', fontFamily:'Roboto Mono' }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Canvas */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9', overflow:'auto', position:'relative' }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) uploadImage(f) }}>
          {isDragging && <div style={{ position:'absolute', inset:0, zIndex:50, background:'rgba(249,115,22,.05)', border:'2px dashed #f97316', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}><span style={{ color:'#f97316', fontWeight:600, fontSize:16, background:'white', padding:'10px 20px', borderRadius:10, boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>Drop image here</span></div>}
          <div style={{ transform:`scale(${zoom})`, transformOrigin:'center center', boxShadow:'0 8px 48px rgba(0,0,0,.14)', borderRadius:4, outline:'1px solid #e2e8f0' }}>
            <canvas ref={canvasEl}/>
          </div>
          {pages.length > 1 && (
            <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, alignItems:'center', background:'white', borderRadius:22, padding:'6px 16px', boxShadow:'0 2px 16px rgba(0,0,0,.1)', border:'1px solid #e2e8f0' }}>
              <button onClick={() => currentPage > 0 && switchPage(currentPage - 1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:22, opacity:currentPage === 0 ? .3 : 1, lineHeight:1, padding:'0 2px' }}>‹</button>
              <span style={{ fontSize:12, color:'#64748b', fontFamily:'Roboto Mono', minWidth:52, textAlign:'center' }}>{currentPage + 1} / {pages.length}</span>
              <button onClick={() => currentPage < pages.length - 1 && switchPage(currentPage + 1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:22, opacity:currentPage === pages.length - 1 ? .3 : 1, lineHeight:1, padding:'0 2px' }}>›</button>
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selectedObj && (
          <div style={{ width:192, flexShrink:0, background:'white', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #e2e8f0', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em' }}>Properties</div>
            <div style={{ padding:14, display:'flex', flexDirection:'column', gap:14, overflow:'auto' }}>
              <Prop label="X"><NumIn value={Math.round(selectedObj.left ?? 0)} onChange={v => updateSelectedProp('left', v)}/></Prop>
              <Prop label="Y"><NumIn value={Math.round(selectedObj.top ?? 0)} onChange={v => updateSelectedProp('top', v)}/></Prop>
              {selectedObj.width && <Prop label="Width"><NumIn value={Math.round(selectedObj.width ?? 0)} onChange={v => updateSelectedProp('width', v)}/></Prop>}
              <Prop label="Opacity">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input type="range" min={0} max={1} step={.01} value={selectedObj.opacity ?? 1} onChange={e => updateSelectedProp('opacity', parseFloat(e.target.value))} style={{ flex:1, accentColor:'#f97316' }}/>
                  <span style={{ fontSize:11, color:'#94a3b8', minWidth:28, fontFamily:'Roboto Mono' }}>{Math.round((selectedObj.opacity ?? 1) * 100)}</span>
                </div>
              </Prop>
              {(selectedObj.type === 'textbox' || selectedObj.type === 'text') && <Prop label="Font size"><NumIn value={selectedObj.fontSize ?? 18} onChange={v => updateSelectedProp('fontSize', v)}/></Prop>}
              {selectedObj.type === 'rect' && <Prop label="Corner radius"><NumIn value={selectedObj.rx ?? 0} onChange={v => { updateSelectedProp('rx', v); updateSelectedProp('ry', v) }}/></Prop>}
            </div>
          </div>
        )}
      </div>

      {/* TEMPLATE PICKER */}
      {showTemplates && (
        <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(15,23,42,.55)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}>
          <div style={{ background:'white', borderRadius:24, padding:'44px 48px', width:'min(880px,95vw)', maxHeight:'90vh', overflow:'auto', boxShadow:'0 32px 80px rgba(0,0,0,.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:32, height:32, background:'#fff7ed', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✦</div>
              <span style={{ fontSize:11, color:'#f97316', fontWeight:700, letterSpacing:'.1em', fontFamily:'Roboto Mono' }}>BACKREAD EDITOR</span>
            </div>
            <h2 style={{ fontSize:32, fontWeight:700, marginBottom:8, letterSpacing:'-.03em', color:'#0f172a' }}>Start with a template</h2>
            <p style={{ fontSize:15, color:'#64748b', marginBottom:36 }}>Professionally designed starting points. Pick one and make it yours.</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:32 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} className="tcard" onClick={() => applyTemplate(t.id)} style={{ background:t.bg, padding:'26px 24px', color:'#0f172a' }}>
                  <div style={{ fontSize:34, marginBottom:14 }}>{t.emoji}</div>
                  <div style={{ fontWeight:700, fontSize:17, marginBottom:5 }}>{t.name}</div>
                  <div style={{ fontSize:13, color:'#64748b', marginBottom:14 }}>{t.description}</div>
                  <div style={{ fontSize:11, color:t.accent, background:'white', borderRadius:6, padding:'3px 10px', display:'inline-block', fontWeight:700, fontFamily:'Roboto Mono', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>{t.pages} page{t.pages !== 1 ? 's' : ''}</div>
                </button>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:12 }}>
              <button onClick={startBlank} style={{ padding:'11px 32px', borderRadius:10, fontSize:14, fontWeight:600, fontFamily:'inherit', border:'2px solid #e2e8f0', background:'white', color:'#64748b', cursor:'pointer' }}>
                Start blank
              </button>
              {pages.length > 0 && <button onClick={() => setShowTemplates(false)} style={{ padding:'11px 32px', borderRadius:10, fontSize:14, fontWeight:600, fontFamily:'inherit', border:'2px solid #e2e8f0', background:'white', color:'#64748b', cursor:'pointer' }}>Cancel</button>}
            </div>
          </div>
        </div>
      )}

      {showShare && <ShareModal documentId={params.id} links={shareLinks} onClose={() => setShowShare(false)} onRefresh={loadShareLinks}/>}

      {showDrafter && (
        <AIDrafter documentType={doc?.type ?? 'document'}
          onDraftComplete={(html: string) => {
            const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            const page = makePage('#ffffff', [txt(stripped, { left:60, top:60, width:CANVAS_W-120, fontSize:16, fill:'#0f172a' })])
            const updated = [...pagesRef.current, page]; setPages(updated)
            const newIdx = updated.length - 1; setCurrentPage(newIdx)
            fabricRef.current?.loadFromJSON(page, () => fabricRef.current.renderAll()); saveCanvas()
          }}
          onClose={() => setShowDrafter(false)}/>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = { width:28, height:28, border:'none', cursor:'pointer', borderRadius:6, background:'transparent', color:'#64748b', fontFamily:'inherit' }

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>{label}</div>{children}</div>
}

function NumIn({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ width:'100%', background:'#f8fafc', border:'1.5px solid #e2e8f0', color:'#0f172a', borderRadius:8, padding:'5px 10px', fontSize:12, fontFamily:'Roboto Mono', outline:'none' }}/>
}

function ShareModal({ documentId, links, onClose, onRefresh }: { documentId: string; links: ShareLink[]; onClose: () => void; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [allowDownload, setAllowDownload] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(links.length === 0)

  async function createLink() {
    setCreating(true)
    const token = generateToken(14)
    await supabase.from('share_links').insert({ document_id:documentId, token, label:label||'Share link', require_email:requireEmail, allow_download:allowDownload, password:password||null, is_active:true })
    await onRefresh(); setCreating(false); setShowNew(false); setLabel(''); setPassword(''); setRequireEmail(false); setAllowDownload(false)
  }

  function copyLink(token: string) { navigator.clipboard.writeText(buildShareUrl(token)); setCopied(token); setTimeout(() => setCopied(null), 2000) }
  async function toggleLink(id: string, active: boolean) { await supabase.from('share_links').update({ is_active:active }).eq('id', id); onRefresh() }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.4)', zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'flex-end' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width:420, height:'100vh', background:'white', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,.1)' }}>
        <div style={{ padding:'22px 24px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ margin:'0 0 3px', fontSize:17, fontWeight:700, color:'#0f172a' }}>Share document</h2>
            <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>{links.length} link{links.length !== 1 ? 's' : ''} created</p>
          </div>
          <button onClick={onClose} style={{ background:'#f8fafc', border:'none', cursor:'pointer', color:'#64748b', padding:8, borderRadius:8 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
          {links.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Active links</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {links.map(link => (
                  <div key={link.id} style={{ border:'1.5px solid #e2e8f0', borderRadius:14, padding:'14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#0f172a' }}>{link.label ?? 'Share link'}</span>
                      <span style={{ padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:link.is_active?'#dcfce7':'#f1f5f9', color:link.is_active?'#15803d':'#64748b' }}>{link.is_active ? 'Active' : 'Off'}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                      <code style={{ flex:1, fontSize:11, color:'#64748b', background:'#f8fafc', padding:'5px 9px', borderRadius:7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{buildShareUrl(link.token)}</code>
                      <button onClick={() => copyLink(link.token)} style={{ padding:'5px 11px', background:copied === link.token?'#f0fdf4':'#f8fafc', border:'1.5px solid', borderColor:copied === link.token?'#86efac':'#e2e8f0', borderRadius:8, fontSize:12, cursor:'pointer', color:copied === link.token?'#15803d':'#64748b', fontFamily:'inherit', fontWeight:600, whiteSpace:'nowrap' }}>
                        {copied === link.token ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'#94a3b8', flexWrap:'wrap' }}>
                      <span>👁 {link.view_count} views</span>
                      {link.require_email && <span>📧 Email req.</span>}
                      {link.password && <span>🔒 Password</span>}
                      {link.allow_download && <span>⬇ Downloads</span>}
                    </div>
                    <div style={{ marginTop:10, display:'flex', justifyContent:'flex-end' }}>
                      <button onClick={() => toggleLink(link.id, !link.is_active)} style={{ fontSize:12, color:link.is_active?'#ef4444':'#16a34a', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                        {link.is_active ? 'Disable link' : 'Enable link'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!showNew
            ? <button onClick={() => setShowNew(true)} style={{ width:'100%', padding:'12px', background:'none', border:'2px dashed #e2e8f0', borderRadius:14, cursor:'pointer', fontSize:14, color:'#94a3b8', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Create new link
              </button>
            : <div style={{ border:'1.5px solid #e2e8f0', borderRadius:14, padding:'18px' }}>
                <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:'#0f172a' }}>New share link</p>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <Input label="Link label" placeholder="e.g. Sequoia meeting" value={label} onChange={(e: any) => setLabel(e.target.value)}/>
                  <Input label="Password (optional)" type="password" placeholder="Leave empty for no password" value={password} onChange={(e: any) => setPassword(e.target.value)}/>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <Toggle checked={requireEmail} onChange={setRequireEmail} label="Require email to view"/>
                    <Toggle checked={allowDownload} onChange={setAllowDownload} label="Allow download"/>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Button variant="primary" loading={creating} onClick={createLink} size="sm">Create link</Button>
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