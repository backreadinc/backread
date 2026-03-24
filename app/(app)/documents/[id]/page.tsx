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

// ─── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS_W = 960
const CANVAS_H = 540

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0b',
  surface: '#111114',
  border: '#1e1e24',
  accent: '#f97316',
  text: '#f4f4f5',
  muted: '#71717a',
  canvas: '#1a1a1f',
  hover: '#1c1c22',
  danger: '#ef4444',
}

// ─── 6 Starter templates ──────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'pitch-deck',  name: 'Pitch Deck',  icon: '📊', pages: 6, description: 'Investor-ready slides',  color: '#f97316' },
  { id: 'proposal',    name: 'Proposal',    icon: '📋', pages: 4, description: 'Client proposals',       color: '#3b82f6' },
  { id: 'report',      name: 'Report',      icon: '📈', pages: 5, description: 'Data & analysis',        color: '#22c55e' },
  { id: 'media-kit',   name: 'Media Kit',   icon: '🎨', pages: 4, description: 'Brand press kit',        color: '#a855f7' },
  { id: 'case-study',  name: 'Case Study',  icon: '🔬', pages: 5, description: 'Client success story',   color: '#ec4899' },
  { id: 'one-pager',   name: 'One-Pager',   icon: '⚡', pages: 1, description: 'Single page overview',   color: '#f59e0b' },
]

function makePage(bg = '#0a0a0b', objects: any[] = []) {
  return { version: '5.3.0', objects, background: bg }
}
function txt(text: string, o: any = {}) {
  return {
    type: 'textbox', left: o.left ?? 60, top: o.top ?? 60,
    width: o.width ?? 400, text,
    fontSize: o.fontSize ?? 18, fontFamily: 'DM Sans', fill: o.fill ?? '#ffffff',
    fontWeight: o.fontWeight ?? 'normal', opacity: o.opacity ?? 1,
    selectable: true, editable: true,
  }
}
function rct(o: any = {}) {
  return {
    type: 'rect', left: o.left ?? 0, top: o.top ?? 0,
    width: o.width ?? 200, height: o.height ?? 60,
    fill: o.fill ?? '#f97316', rx: o.rx ?? 0, ry: o.ry ?? 0,
    selectable: true, opacity: o.opacity ?? 1,
  }
}

function buildTemplate(id: string): any[] {
  const W = CANVAS_W, H = CANVAS_H
  switch (id) {
    case 'pitch-deck': return [
      makePage('#0f0f13', [rct({left:0,top:H*.7,width:W,height:H*.3,fill:'#f97316',opacity:.15}),rct({left:0,top:0,width:6,height:H,fill:'#f97316'}),txt('YOUR COMPANY',{left:60,top:80,fontSize:48,fontWeight:'700',width:W-120}),txt('The one-line pitch.',{left:60,top:160,fontSize:22,fill:'#a1a1aa',width:W-120}),txt('Series A · 2025',{left:60,top:H-80,fontSize:14,fill:'#f97316'})]),
      makePage('#0f0f13', [rct({left:0,top:0,width:W,height:8,fill:'#f97316'}),txt('The Problem',{left:60,top:50,fontSize:36,fontWeight:'700',width:W-120}),txt('Pain point #1 — describe the core frustration.',{left:60,top:130,fontSize:18,fill:'#d4d4d8',width:W/2-80}),txt('Pain point #2 — the secondary problem.',{left:W/2+20,top:130,fontSize:18,fill:'#d4d4d8',width:W/2-80}),txt('$XXB market with no adequate solution today.',{left:60,top:310,fontSize:20,fill:'#f97316',fontWeight:'600',width:W-120})]),
      makePage('#0f0f13', [rct({left:0,top:0,width:W,height:8,fill:'#f97316'}),txt('Our Solution',{left:60,top:50,fontSize:36,fontWeight:'700',width:W-120}),txt('Feature 1',{left:60,top:140,fontSize:20,fontWeight:'600',fill:'#f97316',width:260}),txt('Describe the capability and why it matters.',{left:60,top:170,fontSize:15,fill:'#a1a1aa',width:260}),txt('Feature 2',{left:360,top:140,fontSize:20,fontWeight:'600',fill:'#f97316',width:260}),txt('Describe the capability and why it matters.',{left:360,top:170,fontSize:15,fill:'#a1a1aa',width:260})]),
      makePage('#0f0f13', [rct({left:0,top:0,width:W,height:8,fill:'#f97316'}),txt('Traction',{left:60,top:50,fontSize:36,fontWeight:'700',width:W-120}),txt('$0M ARR',{left:60,top:150,fontSize:52,fontWeight:'700',fill:'#f97316',width:360}),txt('Annual Recurring Revenue',{left:60,top:215,fontSize:14,fill:'#71717a',width:360}),txt('0K Users',{left:400,top:150,fontSize:52,fontWeight:'700',width:280}),txt('Active accounts',{left:400,top:215,fontSize:14,fill:'#71717a',width:280})]),
      makePage('#0f0f13', [rct({left:0,top:0,width:W,height:8,fill:'#f97316'}),txt('The Ask',{left:60,top:50,fontSize:36,fontWeight:'700',width:W-120}),txt('Raising $X.XM',{left:60,top:130,fontSize:44,fontWeight:'700',fill:'#f97316',width:W-120}),txt('40% Product · 30% Sales · 20% Marketing · 10% Ops',{left:60,top:255,fontSize:16,fill:'#71717a',width:600})]),
      makePage('#f97316', [txt('Thank You',{left:60,top:160,fontSize:72,fontWeight:'700',width:W-120}),txt("Questions? Let's talk.",{left:60,top:270,fontSize:24,fill:'#ffedd5',width:500})]),
    ]
    case 'proposal': return [
      makePage('#0d1117', [rct({left:W-300,top:0,width:300,height:H,fill:'#1a2332',opacity:.8}),txt('PROJECT PROPOSAL',{left:60,top:60,fontSize:13,fill:'#3b82f6',fontWeight:'600'}),txt('Proposal Title\nGoes Here',{left:60,top:110,fontSize:46,fontWeight:'700',width:W-380}),txt('Prepared for: Client Name\nDate: Month YYYY',{left:60,top:310,fontSize:15,fill:'#94a3b8',width:400})]),
      makePage('#0d1117', [rct({left:0,top:0,width:W,height:4,fill:'#3b82f6'}),txt('Executive Summary',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#f8fafc',width:W-120}),txt('Describe the project context and why now is the right time.',{left:60,top:115,fontSize:17,fill:'#94a3b8',width:W-120})]),
      makePage('#0d1117', [rct({left:0,top:0,width:W,height:4,fill:'#3b82f6'}),txt('Scope & Deliverables',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#f8fafc',width:W-120}),txt('Phase 1 — Discovery',{left:60,top:130,fontSize:18,fontWeight:'600',fill:'#3b82f6',width:400}),txt('Week 1–2 · Deliverable: Research brief',{left:60,top:158,fontSize:14,fill:'#64748b',width:400}),txt('Phase 2 — Build',{left:60,top:210,fontSize:18,fontWeight:'600',fill:'#3b82f6',width:400}),txt('Week 3–6 · Deliverable: Working product',{left:60,top:238,fontSize:14,fill:'#64748b',width:400})]),
      makePage('#0d1117', [rct({left:0,top:0,width:W,height:4,fill:'#3b82f6'}),txt('Investment',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#f8fafc',width:W-120}),txt('$XX,000',{left:60,top:130,fontSize:60,fontWeight:'700',fill:'#3b82f6',width:500}),txt('Total project investment · 50% upfront, 50% on delivery',{left:60,top:210,fontSize:16,fill:'#64748b',width:600})]),
    ]
    case 'report': return [
      makePage('#050505', [rct({left:0,top:H-120,width:W,height:120,fill:'#22c55e',opacity:.08}),txt('QUARTERLY REPORT',{left:60,top:60,fontSize:12,fill:'#22c55e'}),txt('Q1 2025\nPerformance\nAnalysis',{left:60,top:100,fontSize:58,fontWeight:'700',width:600}),txt('Backread Platform · Internal',{left:60,top:H-60,fontSize:13,fill:'#52525b'})]),
      makePage('#050505', [rct({left:0,top:0,width:W,height:4,fill:'#22c55e'}),txt('Key Metrics',{left:60,top:50,fontSize:32,fontWeight:'700',width:W-120}),txt('Total Views',{left:60,top:130,fontSize:13,fill:'#71717a'}),txt('0',{left:60,top:150,fontSize:48,fontWeight:'700',fill:'#22c55e',width:220}),txt('Avg. Time',{left:300,top:130,fontSize:13,fill:'#71717a'}),txt('0:00',{left:300,top:150,fontSize:48,fontWeight:'700',width:220})]),
      makePage('#050505', [rct({left:0,top:0,width:W,height:4,fill:'#22c55e'}),txt('Highlights & Insights',{left:60,top:50,fontSize:32,fontWeight:'700',width:W-120}),txt('Highlight 1',{left:60,top:130,fontSize:19,fontWeight:'600',fill:'#22c55e'}),txt('Describe what performed well and why it matters.',{left:60,top:158,fontSize:15,fill:'#a1a1aa',width:400})]),
      makePage('#050505', [rct({left:0,top:0,width:W,height:4,fill:'#22c55e'}),txt('Recommendations',{left:60,top:50,fontSize:32,fontWeight:'700',width:W-120}),txt('Action 1 · Priority: High',{left:60,top:130,fontSize:18,fontWeight:'600',fill:'#22c55e',width:600}),txt('What to do, why, and the expected outcome.',{left:60,top:158,fontSize:15,fill:'#71717a',width:600})]),
      makePage('#050505', [rct({left:0,top:0,width:W,height:4,fill:'#22c55e'}),txt('Next Quarter Goals',{left:60,top:50,fontSize:32,fontWeight:'700',width:W-120}),txt('OKR 1: ...\nOKR 2: ...\nOKR 3: ...',{left:60,top:130,fontSize:20,fill:'#d4d4d8',width:W-120})]),
    ]
    case 'media-kit': return [
      makePage('#1a0535', [rct({left:W/2,top:0,width:W/2,height:H,fill:'#a855f7',opacity:.12}),txt('BACKREAD',{left:60,top:80,fontSize:68,fontWeight:'700',width:W-120}),txt('Brand Media Kit · 2025',{left:60,top:170,fontSize:18,fill:'#c084fc'}),txt('Press & Partnership Resources',{left:60,top:H-80,fontSize:15,fill:'#7c3aed'})]),
      makePage('#1a0535', [rct({left:0,top:0,width:W,height:4,fill:'#a855f7'}),txt('About Us',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#f4f4f5',width:W-120}),txt('Backread is a document intelligence platform that helps teams send, track, and understand how their documents are read.',{left:60,top:115,fontSize:18,fill:'#d4d4d8',width:W-120})]),
      makePage('#1a0535', [rct({left:0,top:0,width:W,height:4,fill:'#a855f7'}),txt('Brand Colors',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#f4f4f5',width:W-120}),rct({left:60,top:120,width:120,height:120,fill:'#f97316',rx:12,ry:12}),txt('Orange\n#F97316',{left:60,top:255,fontSize:13,fill:'#a1a1aa'}),rct({left:220,top:120,width:120,height:120,fill:'#a855f7',rx:12,ry:12}),txt('Purple\n#A855F7',{left:220,top:255,fontSize:13,fill:'#a1a1aa'})]),
      makePage('#1a0535', [rct({left:0,top:0,width:W,height:4,fill:'#a855f7'}),txt('Press Contact',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#f4f4f5',width:W-120}),txt('press@backread.com',{left:60,top:200,fontSize:28,fontWeight:'700',fill:'#a855f7',width:W-120})]),
    ]
    case 'case-study': return [
      makePage('#09090b', [rct({left:0,top:H-8,width:W,height:8,fill:'#ec4899'}),txt('CASE STUDY',{left:60,top:60,fontSize:12,fill:'#ec4899'}),txt('How [Client]\nAchieved X with\nBackread',{left:60,top:100,fontSize:48,fontWeight:'700',fill:'#fafafa',width:W-120})]),
      makePage('#09090b', [rct({left:0,top:0,width:W,height:4,fill:'#ec4899'}),txt('The Challenge',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#fafafa',width:W-120}),txt("Describe the client's core problem.",{left:60,top:120,fontSize:18,fill:'#a1a1aa',width:W-120}),txt('"Quote from the client about their pain."',{left:60,top:290,fontSize:20,fill:'#ec4899',fontWeight:'600',width:W-120})]),
      makePage('#09090b', [rct({left:0,top:0,width:W,height:4,fill:'#ec4899'}),txt('The Solution',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#fafafa',width:W-120}),txt('How Backread was implemented.',{left:60,top:120,fontSize:18,fill:'#a1a1aa',width:W-120})]),
      makePage('#09090b', [rct({left:0,top:0,width:W,height:4,fill:'#ec4899'}),txt('The Results',{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#fafafa',width:W-120}),txt('0%',{left:60,top:140,fontSize:72,fontWeight:'700',fill:'#ec4899',width:280}),txt('Improvement in metric',{left:60,top:230,fontSize:14,fill:'#71717a'}),txt('0x',{left:360,top:140,fontSize:72,fontWeight:'700',fill:'#fafafa',width:280}),txt('Faster than before',{left:360,top:230,fontSize:14,fill:'#71717a'})]),
      makePage('#09090b', [rct({left:0,top:0,width:W,height:4,fill:'#ec4899'}),txt("What's Next",{left:60,top:50,fontSize:32,fontWeight:'700',fill:'#fafafa',width:W-120}),txt("Describe the client's plans going forward.",{left:60,top:120,fontSize:18,fill:'#a1a1aa',width:W-120})]),
    ]
    case 'one-pager':
    default: return [
      makePage('#0a0a0b', [rct({left:0,top:0,width:4,height:H,fill:'#f59e0b'}),txt('BACKREAD',{left:40,top:40,fontSize:22,fontWeight:'700',fill:'#f59e0b',width:300}),txt('Your Headline Here',{left:40,top:100,fontSize:42,fontWeight:'700',fill:'#fafafa',width:W/2-60}),txt('A compelling one-sentence description.',{left:40,top:175,fontSize:16,fill:'#a1a1aa',width:W/2-60}),txt('Key Point 1',{left:40,top:250,fontSize:16,fontWeight:'600',fill:'#f59e0b'}),txt('Short explanation of this benefit.',{left:40,top:273,fontSize:14,fill:'#71717a',width:W/2-60}),txt('Key Point 2',{left:40,top:330,fontSize:16,fontWeight:'600',fill:'#f59e0b'}),txt('Short explanation of this benefit.',{left:40,top:353,fontSize:14,fill:'#71717a',width:W/2-60}),txt('hello@backread.com',{left:W/2+40,top:H-100,fontSize:14,fill:'#f59e0b'})]),
    ]
  }
}

// ─── Tool button style helper ─────────────────────────────────────────────────
const toolBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '2px 4px', borderRadius: 4, fontFamily: 'inherit', fontSize: 14,
}

// ─── Main page component ──────────────────────────────────────────────────────
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

  // Canvas state
  const canvasEl = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [pages, setPages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTool, setActiveTool] = useState('select')
  const [showTemplates, setShowTemplates] = useState(false)
  const [zoom, setZoom] = useState(0.7)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [fontColor, setFontColor] = useState('#ffffff')
  const [fillColor, setFillColor] = useState('#f97316')
  const [bgColor, setBgColor] = useState('#0a0a0b')
  const [isDragging, setIsDragging] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const pagesRef = useRef<any[]>([])
  const currentPageRef = useRef(0)

  // Keep refs in sync
  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])

  // ── Load Fabric.js ────────────────────────────────────────────────────────
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)

    if ((window as any).fabric) return

    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
    document.head.appendChild(s)
  }, [])

  // ── Load document ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadDocument()
    loadShareLinks()
  }, [params.id])

  async function loadDocument() {
    const { data } = await supabase.from('documents').select('*').eq('id', params.id).single()
    if (!data) { router.push('/dashboard'); return }
    setDoc(data)
    setTitle(data.title)
    setEmoji(data.cover_emoji ?? '📄')

    const canvasData = (data as any).canvas_data
    if (canvasData?.pages?.length) {
      setPages(canvasData.pages)
      setShowTemplates(false)
    } else {
      setShowTemplates(true)
    }
  }

  async function loadShareLinks() {
    const { data } = await supabase
      .from('share_links').select('*')
      .eq('document_id', params.id)
      .order('created_at', { ascending: false })
    setShareLinks(data ?? [])
  }

  // ── Init canvas once Fabric is available ──────────────────────────────────
  useEffect(() => {
    const check = setInterval(() => {
      if ((window as any).fabric && canvasEl.current && !fabricRef.current) {
        clearInterval(check)
        const fabric = (window as any).fabric
        const fc = new fabric.Canvas(canvasEl.current, {
          width: CANVAS_W, height: CANVAS_H,
          backgroundColor: '#0a0a0b',
          selection: true, preserveObjectStacking: true,
        })
        fabricRef.current = fc
        fc.on('selection:created', (e: any) => setSelectedObj(e.selected?.[0] ?? null))
        fc.on('selection:updated', (e: any) => setSelectedObj(e.selected?.[0] ?? null))
        fc.on('selection:cleared', () => setSelectedObj(null))
        fc.on('object:modified', () => scheduleAutoSave())
        fc.on('object:added', () => scheduleAutoSave())
        fc.on('object:removed', () => scheduleAutoSave())
      }
    }, 100)
    return () => clearInterval(check)
  }, [])

  // ── Load page into canvas when pages/fabricRef are ready ─────────────────
  useEffect(() => {
    if (!fabricRef.current || !pages[currentPage]) return
    fabricRef.current.loadFromJSON(pages[currentPage], () => fabricRef.current.renderAll())
  }, [pages.length]) // eslint-disable-line

  // ── Auto-save ─────────────────────────────────────────────────────────────
  function scheduleAutoSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveCanvas(), 1500)
  }

  const saveCanvas = useCallback(async () => {
    if (!fabricRef.current) return
    setSaving(true)
    const currentJson = fabricRef.current.toJSON()
    const allPages = [...pagesRef.current]
    allPages[currentPageRef.current] = currentJson
    setPages(allPages)
    await supabase.from('documents').update({
      canvas_data: { pages: allPages },
      updated_at: new Date().toISOString(),
    } as any).eq('id', params.id)
    setSaving(false)
    setLastSaved(new Date())
  }, [params.id])

  // ── Page ops ──────────────────────────────────────────────────────────────
  function switchPage(idx: number) {
    if (!fabricRef.current) return
    const currentJson = fabricRef.current.toJSON()
    const updated = [...pagesRef.current]
    updated[currentPageRef.current] = currentJson
    setPages(updated)
    setCurrentPage(idx)
    fabricRef.current.loadFromJSON(updated[idx], () => fabricRef.current.renderAll())
  }

  function addPage() {
    if (!fabricRef.current) return
    const currentJson = fabricRef.current.toJSON()
    const updated = [...pagesRef.current]
    updated[currentPageRef.current] = currentJson
    const blank = makePage(bgColor)
    const newIdx = currentPageRef.current + 1
    updated.splice(newIdx, 0, blank)
    setPages(updated)
    setCurrentPage(newIdx)
    fabricRef.current.clear()
    fabricRef.current.backgroundColor = bgColor
    fabricRef.current.renderAll()
  }

  function removePage(idx: number) {
    if (pagesRef.current.length <= 1) return
    const updated = pagesRef.current.filter((_, i) => i !== idx)
    setPages(updated)
    const newIdx = Math.min(currentPageRef.current, updated.length - 1)
    setCurrentPage(newIdx)
    fabricRef.current?.loadFromJSON(updated[newIdx], () => fabricRef.current.renderAll())
  }

  // ── Templates ─────────────────────────────────────────────────────────────
  function applyTemplate(id: string) {
    const builtPages = buildTemplate(id)
    setPages(builtPages)
    setCurrentPage(0)
    setShowTemplates(false)
    if (fabricRef.current && builtPages[0]) {
      fabricRef.current.loadFromJSON(builtPages[0], () => fabricRef.current.renderAll())
    } else {
      // Fabric not ready yet — wait for it
      const wait = setInterval(() => {
        if (fabricRef.current) {
          clearInterval(wait)
          fabricRef.current.loadFromJSON(builtPages[0], () => fabricRef.current.renderAll())
        }
      }, 100)
    }
  }

  function startBlank() {
    const blank = makePage('#0a0a0b')
    setPages([blank])
    setCurrentPage(0)
    setShowTemplates(false)
    if (fabricRef.current) {
      fabricRef.current.clear()
      fabricRef.current.backgroundColor = '#0a0a0b'
      fabricRef.current.renderAll()
    }
  }

  // ── Canvas tools ──────────────────────────────────────────────────────────
  function addText() {
    const fabric = (window as any).fabric
    const fc = fabricRef.current
    if (!fc || !fabric) return
    const tb = new fabric.Textbox('Click to edit', {
      left: 100, top: 100, width: 300,
      fontSize: 24, fontFamily: 'DM Sans', fill: fontColor, editable: true,
    })
    fc.add(tb); fc.setActiveObject(tb); fc.renderAll()
  }

  function addShape(type: 'rect' | 'circle' | 'triangle') {
    const fabric = (window as any).fabric
    const fc = fabricRef.current
    if (!fc || !fabric) return
    const shapes: any = {
      rect: new fabric.Rect({ left: 100, top: 100, width: 200, height: 80, fill: fillColor, rx: 4, ry: 4 }),
      circle: new fabric.Circle({ left: 100, top: 100, radius: 60, fill: fillColor }),
      triangle: new fabric.Triangle({ left: 100, top: 100, width: 120, height: 120, fill: fillColor }),
    }
    fc.add(shapes[type]); fc.setActiveObject(shapes[type]); fc.renderAll()
  }

  function deleteSelected() {
    const fc = fabricRef.current
    if (!fc) return
    fc.getActiveObjects().forEach((o: any) => fc.remove(o))
    fc.discardActiveObject(); fc.renderAll()
  }

  function duplicateSelected() {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active) return
    active.clone((cloned: any) => {
      cloned.set({ left: active.left + 20, top: active.top + 20 })
      fc.add(cloned); fc.setActiveObject(cloned); fc.renderAll()
    })
  }

  function updateSelectedProp(prop: string, value: any) {
    const fc = fabricRef.current
    if (!fc) return
    const obj = fc.getActiveObject()
    if (!obj) return
    obj.set(prop, value); fc.renderAll(); scheduleAutoSave()
  }

  function uploadImage(file: File) {
    const fabric = (window as any).fabric
    const fc = fabricRef.current
    if (!fc || !fabric) return
    const reader = new FileReader()
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target?.result as string, (img: any) => {
        const scale = Math.min(400 / img.width, 300 / img.height, 1)
        img.set({ left: 100, top: 100, scaleX: scale, scaleY: scale })
        fc.add(img); fc.setActiveObject(img); fc.renderAll()
      })
    }
    reader.readAsDataURL(file)
  }

  // ── Misc ──────────────────────────────────────────────────────────────────
  async function saveTitle() {
    await supabase.from('documents').update({ title: title || 'Untitled', cover_emoji: emoji }).eq('id', params.id)
  }

  async function publishDocument() {
    await supabase.from('documents').update({ status: 'active' }).eq('id', params.id)
    setDoc(prev => prev ? { ...prev, status: 'active' } : prev)
    setShowShare(true)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveCanvas() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricRef.current?.getActiveObject()) {
        deleteSelected()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveCanvas])

  const isActive = doc?.status === 'active'

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        input[type="color"] { -webkit-appearance: none; border: none; cursor: pointer; padding: 0; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontFamily: 'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Docs
        </button>
        <span style={{ color: C.border }}>／</span>

        {/* Emoji picker */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6 }}>{emoji}</button>
          {showEmojiPicker && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, display: 'flex', flexWrap: 'wrap', gap: 4, width: 240, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { setEmoji(e); setShowEmojiPicker(false); setTimeout(saveTitle, 100) }}
                  style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}>{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={saveTitle}
          placeholder="Untitled"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 500, color: C.text, background: 'transparent', fontFamily: 'inherit' }} />

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>
            {saving ? 'Saving…' : lastSaved ? `✓ ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <Badge variant={isActive ? 'success' : 'default'}>{isActive ? 'Live' : 'Draft'}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)}>Templates</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDrafter(true)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L7.8 5H12L8.6 7.4L9.9 11.5L6.5 9.1L3.1 11.5L4.4 7.4L1 5H5.2L6.5 1Z" fill="currentColor"/></svg>
            AI draft
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/documents/${params.id}/present`)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 11h3M6.5 10v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Present
          </Button>
          {isActive
            ? <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>Share</Button>
            : <Button variant="primary" size="sm" onClick={publishDocument}>Publish &amp; Share</Button>
          }
        </div>
      </div>

      {/* ── Canvas toolbar ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '6px 16px', background: C.surface, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
        {([
          { id: 'select',   icon: '↖', label: 'Select' },
          { id: 'text',     icon: 'T',  label: 'Text' },
          { id: 'rect',     icon: '▭',  label: 'Rectangle' },
          { id: 'circle',   icon: '○',  label: 'Circle' },
          { id: 'triangle', icon: '△',  label: 'Triangle' },
          { id: 'draw',     icon: '✏',  label: 'Draw' },
        ] as const).map(tool => (
          <button key={tool.id} title={tool.label}
            onClick={() => {
              if (tool.id === 'text') { addText(); setActiveTool('select'); return }
              if (tool.id === 'rect') { addShape('rect'); return }
              if (tool.id === 'circle') { addShape('circle'); return }
              if (tool.id === 'triangle') { addShape('triangle'); return }
              setActiveTool(tool.id)
              if (fabricRef.current) {
                fabricRef.current.isDrawingMode = tool.id === 'draw'
                if (tool.id === 'draw') fabricRef.current.freeDrawingBrush.color = fontColor
              }
            }}
            style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6, fontSize: 15, fontWeight: 600, background: activeTool === tool.id ? C.accent : 'transparent', color: activeTool === tool.id ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >{tool.icon}</button>
        ))}

        <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

        {/* Image upload */}
        <label title="Upload image" style={{ width: 32, height: 32, cursor: 'pointer', borderRadius: 6, fontSize: 14, background: 'transparent', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🖼<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
        </label>

        <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

        {([
          { icon: '⧉', label: 'Duplicate', action: duplicateSelected },
          { icon: '🗑', label: 'Delete (Del)', action: deleteSelected },
          { icon: '↑', label: 'Bring to front', action: () => { const o = fabricRef.current?.getActiveObject(); if (o) { fabricRef.current.bringToFront(o); fabricRef.current.renderAll() } } },
          { icon: '↓', label: 'Send to back',  action: () => { const o = fabricRef.current?.getActiveObject(); if (o) { fabricRef.current.sendToBack(o);  fabricRef.current.renderAll() } } },
        ]).map(btn => (
          <button key={btn.label} title={btn.label} onClick={btn.action}
            style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6, fontSize: 13, background: 'transparent', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >{btn.icon}</button>
        ))}

        <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

        {/* Colors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: C.muted }}>A</span>
          <input type="color" value={fontColor} title="Text color"
            onChange={e => { setFontColor(e.target.value); updateSelectedProp('fill', e.target.value) }}
            style={{ width: 22, height: 22, borderRadius: 4 }} />
          <span style={{ fontSize: 11, color: C.muted }}>◼</span>
          <input type="color" value={fillColor} title="Fill color"
            onChange={e => { setFillColor(e.target.value); updateSelectedProp('fill', e.target.value) }}
            style={{ width: 22, height: 22, borderRadius: 4 }} />
          <span style={{ fontSize: 11, color: C.muted }}>bg</span>
          <input type="color" value={bgColor} title="Background color"
            onChange={e => { setBgColor(e.target.value); if (fabricRef.current) { fabricRef.current.backgroundColor = e.target.value; fabricRef.current.renderAll() } }}
            style={{ width: 22, height: 22, borderRadius: 4 }} />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} style={{ ...toolBtnStyle, color: C.muted }}>−</button>
          <span style={{ fontSize: 11, color: C.muted, minWidth: 36, textAlign: 'center', fontFamily: 'monospace' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} style={{ ...toolBtnStyle, color: C.muted }}>+</button>
        </div>
      </div>

      {/* ── Editor body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Page strip */}
        <div style={{ width: 140, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pages</span>
            <button onClick={addPage} style={{ background: C.accent, border: 'none', borderRadius: 4, width: 20, height: 20, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pages.map((page, idx) => (
              <div key={idx} onClick={() => switchPage(idx)}
                style={{ position: 'relative', cursor: 'pointer', borderRadius: 6, border: `2px solid ${currentPage === idx ? C.accent : C.border}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                <div style={{ width: '100%', aspectRatio: `${CANVAS_W}/${CANVAS_H}`, background: page?.background ?? '#0a0a0b', display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ padding: '1px 5px', fontSize: 9, color: C.muted, background: 'rgba(0,0,0,0.5)', width: '100%', fontFamily: 'monospace' }}>{idx + 1}</span>
                </div>
                {pages.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removePage(idx) }}
                    style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 3, background: C.danger, border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: '6px 10px', borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Canvas area */}
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.canvas, overflow: 'auto', position: 'relative' }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) uploadImage(f) }}
        >
          {isDragging && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(249,115,22,0.1)', border: `2px dashed ${C.accent}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>Drop image here</span>
            </div>
          )}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', boxShadow: '0 0 60px rgba(0,0,0,0.6)', borderRadius: 2 }}>
            <canvas ref={canvasEl} />
          </div>
          {pages.length > 1 && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '5px 14px' }}>
              <button onClick={() => currentPage > 0 && switchPage(currentPage - 1)} style={{ ...toolBtnStyle, opacity: currentPage === 0 ? 0.3 : 1, fontSize: 18, color: C.text }}>‹</button>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{currentPage + 1} / {pages.length}</span>
              <button onClick={() => currentPage < pages.length - 1 && switchPage(currentPage + 1)} style={{ ...toolBtnStyle, opacity: currentPage === pages.length - 1 ? 0.3 : 1, fontSize: 18, color: C.text }}>›</button>
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selectedObj && (
          <div style={{ width: 180, flexShrink: 0, background: C.surface, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Properties</div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
              <PropRow label="X"><NumIn value={Math.round(selectedObj.left ?? 0)} onChange={v => updateSelectedProp('left', v)} /></PropRow>
              <PropRow label="Y"><NumIn value={Math.round(selectedObj.top ?? 0)} onChange={v => updateSelectedProp('top', v)} /></PropRow>
              <PropRow label="Opacity">
                <input type="range" min={0} max={1} step={0.01} value={selectedObj.opacity ?? 1}
                  onChange={e => updateSelectedProp('opacity', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: C.accent }} />
              </PropRow>
              {(selectedObj.type === 'textbox' || selectedObj.type === 'text') && (
                <PropRow label="Font size"><NumIn value={selectedObj.fontSize ?? 18} onChange={v => updateSelectedProp('fontSize', v)} /></PropRow>
              )}
              {selectedObj.type === 'rect' && (
                <PropRow label="Radius"><NumIn value={selectedObj.rx ?? 0} onChange={v => { updateSelectedProp('rx', v); updateSelectedProp('ry', v) }} /></PropRow>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Template picker modal ── */}
      {showTemplates && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '36px 40px', width: 'min(820px, 95vw)', maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.accent, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>BACKREAD EDITOR</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em', color: C.text }}>Start with a template</h2>
            <p style={{ fontSize: 15, color: C.muted, marginBottom: 28 }}>Choose a template or start with a blank canvas.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t.id)}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 18px', background: C.bg, cursor: 'pointer', textAlign: 'left', color: C.text, fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = t.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{t.description}</div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: t.color, background: `${t.color}18`, borderRadius: 4, padding: '2px 7px', display: 'inline-block' }}>{t.pages} page{t.pages !== 1 ? 's' : ''}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button onClick={startBlank} style={{ padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>Start blank</button>
              {pages.length > 0 && (
                <button onClick={() => setShowTemplates(false)} style={{ padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Share modal ── */}
      {showShare && (
        <ShareModal documentId={params.id} links={shareLinks} onClose={() => setShowShare(false)} onRefresh={loadShareLinks} />
      )}

      {/* ── AI Drafter modal ── */}
      {showDrafter && (
        <AIDrafter
          documentType={doc?.type ?? 'document'}
          onDraftComplete={(html: string) => {
            const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            const page = makePage('#0a0a0b', [txt(stripped, { left: 60, top: 60, width: CANVAS_W - 120, fontSize: 16, fill: '#f4f4f5' })])
            const updated = [...pagesRef.current, page]
            setPages(updated)
            const newIdx = updated.length - 1
            setCurrentPage(newIdx)
            fabricRef.current?.loadFromJSON(page, () => fabricRef.current.renderAll())
            saveCanvas()
          }}
          onClose={() => setShowDrafter(false)}
        />
      )}
    </div>
  )
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function NumIn({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', background: '#0a0a0b', border: '1px solid #1e1e24', color: '#f4f4f5', borderRadius: 5, padding: '3px 7px', fontSize: 12, fontFamily: 'monospace' }} />
  )
}

// ─── Share modal ──────────────────────────────────────────────────────────────
function ShareModal({ documentId, links, onClose, onRefresh }: {
  documentId: string; links: ShareLink[]; onClose: () => void; onRefresh: () => void
}) {
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
    await supabase.from('share_links').insert({
      document_id: documentId, token,
      label: label || 'Share link',
      require_email: requireEmail,
      allow_download: allowDownload,
      password: password || null,
      is_active: true,
    })
    await onRefresh()
    setCreating(false); setShowNew(false)
    setLabel(''); setPassword(''); setRequireEmail(false); setAllowDownload(false)
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(buildShareUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  async function toggleLink(id: string, active: boolean) {
    await supabase.from('share_links').update({ is_active: active }).eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 420, height: '100vh', background: 'white', borderLeft: '1px solid #E5E0D8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 600, color: '#1C1917' }}>Share document</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#9C9389' }}>{links.length} link{links.length !== 1 ? 's' : ''} created</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {links.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#9C9389', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Active links</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map(link => (
                  <div key={link.id} style={{ border: '1px solid #E5E0D8', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1C1917' }}>{link.label ?? 'Share link'}</span>
                      <Badge variant={link.is_active ? 'success' : 'default'}>{link.is_active ? 'Active' : 'Disabled'}</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <code style={{ flex: 1, fontSize: 11, color: '#6B6559', background: '#F5F3EF', padding: '4px 8px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{buildShareUrl(link.token)}</code>
                      <button onClick={() => copyLink(link.token)}
                        style={{ padding: '4px 10px', background: copied === link.token ? '#F0FDF4' : '#F5F3EF', border: '1px solid', borderColor: copied === link.token ? '#BBF7D0' : '#E5E0D8', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: copied === link.token ? '#16A34A' : '#6B6559', fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {copied === link.token ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9C9389' }}>
                      <span>👁 {link.view_count} views</span>
                      {link.require_email && <span>📧 Email required</span>}
                      {link.password && <span>🔒 Password</span>}
                      {link.allow_download && <span>⬇ Downloads</span>}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => toggleLink(link.id, !link.is_active)}
                        style={{ fontSize: 12, color: link.is_active ? '#DC2626' : '#16A34A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {link.is_active ? 'Disable link' : 'Enable link'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!showNew ? (
            <button onClick={() => setShowNew(true)}
              style={{ width: '100%', padding: '10px', background: 'none', border: '1.5px dashed #D0C9BE', borderRadius: 12, cursor: 'pointer', fontSize: 14, color: '#9C9389', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Create new link
            </button>
          ) : (
            <div style={{ border: '1px solid #E5E0D8', borderRadius: 12, padding: '16px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#1C1917' }}>New share link</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Link label" placeholder="e.g. Sequoia meeting" value={label} onChange={(e: any) => setLabel(e.target.value)} />
                <Input label="Password (optional)" type="password" placeholder="Leave empty for no password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Toggle checked={requireEmail} onChange={setRequireEmail} label="Require email to view" />
                  <Toggle checked={allowDownload} onChange={setAllowDownload} label="Allow download" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" loading={creating} onClick={createLink} size="sm">Create link</Button>
                  <Button variant="ghost" onClick={() => setShowNew(false)} size="sm">Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
