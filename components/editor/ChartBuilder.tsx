'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

const C = {
  accent:'#5B50E8', accentLt:'#EEEDFB', accentHv:'#4940D4',
  border:'#E4E0DB', borderSt:'#C8C3BC', text:'#0F0F0F',
  textMd:'#6B6868', textSm:'#9B9898', hover:'#F5F3F0', panel:'#FFFFFF',
  panelSub:'#F7F6F4', green:'#16A34A', amber:'#D97706',
}
const F = "'Inter',-apple-system,sans-serif"
const FM = "'JetBrains Mono',monospace"

// ── PALETTES ──────────────────────────────────────────────────────────────────
const PALETTES: Record<string, string[]> = {
  Vivid:      ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6','#F97316','#06B6D4'],
  Ocean:      ['#0EA5E9','#0284C7','#0369A1','#7DD3FC','#38BDF8','#1D4ED8','#60A5FA','#BAE6FD','#0C4A6E','#075985'],
  Forest:     ['#16A34A','#15803D','#4ADE80','#86EFAC','#059669','#065F46','#34D399','#6EE7B7','#A7F3D0','#022C22'],
  Sunset:     ['#F97316','#EF4444','#F59E0B','#FB923C','#DC2626','#EA580C','#D97706','#FCD34D','#FBBF24','#B45309'],
  Neon:       ['#A855F7','#EC4899','#06B6D4','#10B981','#F59E0B','#3B82F6','#EF4444','#8B5CF6','#14B8A6','#F97316'],
  Mono:       ['#0F172A','#1E293B','#334155','#475569','#64748B','#94A3B8','#CBD5E1','#E2E8F0','#F1F5F9','#F8FAFC'],
  Rose:       ['#E11D48','#BE123C','#F43F5E','#FB7185','#FDA4AF','#FF6B9D','#C62A6A','#9D174D','#831843','#500724'],
  Teal:       ['#0D9488','#0F766E','#14B8A6','#2DD4BF','#99F6E4','#115E59','#134E4A','#5EEAD4','#CCFBF1','#F0FDFA'],
  Gold:       ['#D97706','#B45309','#F59E0B','#FBBF24','#FCD34D','#FDE68A','#92400E','#78350F','#451A03','#FEF3C7'],
  Corporate:  ['#1E3A5F','#2563EB','#3B82F6','#60A5FA','#93C5FD','#BFDBFE','#1E40AF','#1D4ED8','#2946A3','#0EA5E9'],
  Pastel:     ['#A5B4FC','#F9A8D4','#FCD34D','#6EE7B7','#93C5FD','#FCA5A5','#C4B5FD','#67E8F9','#FDE68A','#BBF7D0'],
  Material:   ['#F44336','#9C27B0','#3F51B5','#03A9F4','#009688','#8BC34A','#FF9800','#795548','#607D8B','#E91E63'],
  Dark:       ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#7C3AED','#4F46E5','#065F46','#92400E'],
  Warm:       ['#92400E','#B45309','#D97706','#F59E0B','#EF4444','#DC2626','#991B1B','#F97316','#EA580C','#C2410C'],
  Cool:       ['#0C4A6E','#075985','#0369A1','#0284C7','#0EA5E9','#38BDF8','#7DD3FC','#BAE6FD','#1E3A5F','#164E63'],
  Rainbow:    ['#EF4444','#F97316','#F59E0B','#22C55E','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#6366F1','#84CC16'],
}

// ── CHART TYPES ───────────────────────────────────────────────────────────────
const CHART_2D = [
  {id:'bar',       label:'Bar',          icon:'📊', group:'Basic'},
  {id:'hbar',      label:'H-Bar',        icon:'📉', group:'Basic'},
  {id:'line',      label:'Line',         icon:'📈', group:'Basic'},
  {id:'area',      label:'Area',         icon:'🏔', group:'Basic'},
  {id:'pie',       label:'Pie',          icon:'🥧', group:'Basic'},
  {id:'doughnut',  label:'Doughnut',     icon:'🍩', group:'Basic'},
  {id:'radar',     label:'Radar',        icon:'🕸', group:'Advanced'},
  {id:'polar',     label:'Polar Area',   icon:'🎯', group:'Advanced'},
  {id:'scatter',   label:'Scatter',      icon:'✦',  group:'Advanced'},
  {id:'bubble',    label:'Bubble',       icon:'🫧', group:'Advanced'},
  {id:'stacked',   label:'Stacked Bar',  icon:'🏛', group:'Business'},
  {id:'hstacked',  label:'H-Stacked',    icon:'🏗', group:'Business'},
  {id:'waterfall', label:'Waterfall',    icon:'💧', group:'Business'},
  {id:'funnel',    label:'Funnel',       icon:'📐', group:'Business'},
  {id:'gauge',     label:'Gauge',        icon:'🎛', group:'Business'},
  {id:'treemap',   label:'Treemap',      icon:'🗺', group:'Business'},
]
const CHART_3D = [
  {id:'bar3d',     label:'3D Bar',       icon:'📦', group:'3D'},
  {id:'pie3d',     label:'3D Pie',       icon:'🎂', group:'3D'},
  {id:'area3d',    label:'3D Area',      icon:'⛰', group:'3D'},
  {id:'scatter3d', label:'3D Scatter',   icon:'🔮', group:'3D'},
  {id:'cylinder',  label:'Cylinder',     icon:'🥫', group:'3D'},
  {id:'cone',      label:'Cone',         icon:'🔺', group:'3D'},
]

interface Props { onAdd:(dataUrl:string)=>void; onClose:()=>void }

export default function ChartBuilder({ onAdd, onClose }: Props) {
  const [dimension, setDimension] = useState<'2D'|'3D'>('2D')
  const [type, setType]       = useState('bar')
  const [palette, setPalette] = useState('Vivid')
  const [title, setTitle]     = useState('Revenue by Quarter')
  const [rawData, setRawData] = useState('Q1,Q2,Q3,Q4\n85000,120000,98000,145000\n62000,88000,72000,110000')
  const [legend, setLegend]   = useState(true)
  const [grid, setGrid]       = useState(true)
  const [borderR, setBorderR] = useState(6)
  const [smooth, setSmooth]   = useState(true)
  const [showValues, setShowValues] = useState(false)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [paletteSearch, setPaletteSearch] = useState('')
  const [uploadedImg, setUploadedImg] = useState<string|null>(null)
  const [csvError, setCsvError] = useState('')
  const [activeGroup, setActiveGroup] = useState('Basic')
  const [depth3D, setDepth3D] = useState(18)
  const [opacity3D, setOpacity3D] = useState(0.82)

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const chartRef   = useRef<any>(null)
  const csvRef     = useRef<HTMLInputElement>(null)
  const imgRef     = useRef<HTMLInputElement>(null)

  const CHARTS = dimension === '2D' ? CHART_2D : CHART_3D
  const filtPalettes = Object.entries(PALETTES).filter(([n]) => n.toLowerCase().includes(paletteSearch.toLowerCase()))

  useEffect(() => {
    if (dimension === '3D') { render3D(); return }
    loadChartJs()
  }, [])

  useEffect(() => {
    if (uploadedImg) return
    if (dimension === '3D') render3D()
    else if ((window as any).Chart) renderChart()
  }, [type, palette, title, rawData, legend, grid, borderR, smooth, showValues, bgColor, depth3D, opacity3D, dimension, uploadedImg])

  // ── CSV upload ──────────────────────────────────────────────────────────────
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setCsvError('')
      try {
        const lines = text.trim().split(/\r?\n/)
        if (lines.length < 2) { setCsvError('CSV must have at least 2 rows (header + data)'); return }
        setRawData(lines.slice(0, 10).join('\n')) // cap at 10 rows
        setUploadedImg(null)
      } catch { setCsvError('Could not parse CSV file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Image upload ────────────────────────────────────────────────────────────
  function handleImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setUploadedImg(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Parse CSV data ──────────────────────────────────────────────────────────
  function parseData() {
    const lines = rawData.trim().split('\n')
    const labels = lines[0].split(',').map(s => s.trim())
    const colors = PALETTES[palette]
    if (['scatter','bubble'].includes(type)) {
      // Scatter/bubble: pairs of numbers as x,y
      const datasets = lines.slice(1).map((l, i) => {
        const vals = l.split(',').map(v => parseFloat(v.trim()) || 0)
        const pts = []
        for (let j = 0; j < vals.length - 1; j += 2) {
          pts.push(type === 'bubble'
            ? { x: vals[j], y: vals[j+1], r: Math.abs(vals[j+2] || 8) }
            : { x: vals[j], y: vals[j+1] }
          )
        }
        if (pts.length === 0) pts.push({ x: vals[0] || 0, y: vals[1] || 0 })
        return {
          label: `Series ${i+1}`,
          data: pts,
          backgroundColor: colors[i % colors.length] + 'AA',
          borderColor: colors[i % colors.length],
          borderWidth: 2,
          pointRadius: type === 'bubble' ? undefined : 6,
        }
      })
      return { labels, datasets }
    }
    const datasets = lines.slice(1).map((l, i) => {
      const vals = l.split(',').map(v => parseFloat(v.trim()) || 0)
      const isRound = ['pie','doughnut','polar','pie3d'].includes(type)
      const bgs = isRound
        ? colors.slice(0, labels.length).map(c => c + 'CC')
        : colors[i % colors.length] + 'CC'
      const bds = isRound
        ? colors.slice(0, labels.length)
        : colors[i % colors.length]
      return {
        label: `Series ${i+1}`,
        data: vals,
        backgroundColor: bgs,
        borderColor: bds,
        borderWidth: 2,
        borderRadius: borderR,
        fill: type === 'area',
        tension: smooth ? 0.4 : 0,
        pointRadius: 4,
        pointHoverRadius: 7,
      }
    })
    return { labels, datasets }
  }

  // ── Chart.js load & render ──────────────────────────────────────────────────
  function loadChartJs() {
    if ((window as any).Chart) { renderChart(); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
    s.onload = () => renderChart()
    document.head.appendChild(s)
  }

  function renderChart() {
    const Chart = (window as any).Chart
    if (!Chart || !canvasRef.current) return
    if (uploadedImg) { drawUploadedImg(); return }
    if (['waterfall','funnel','gauge','treemap'].includes(type)) { renderCustom2D(); return }

    if (chartRef.current) { try { chartRef.current.destroy() } catch {} }
    const ctx = canvasRef.current.getContext('2d')!
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 600, 400)

    const { labels, datasets } = parseData()
    let actualType: string = type
    if (type === 'area') actualType = 'line'
    if (type === 'hbar' || type === 'stacked' || type === 'hstacked') actualType = 'bar'

    const isStacked = ['stacked','hstacked'].includes(type)
    const isHoriz = ['hbar','hstacked'].includes(type)
    const isRound = ['pie','doughnut','polar'].includes(type)

    const plugins: any = {
      legend: { display: legend, position: 'bottom', labels: { font: { family:'Inter', size:11 }, padding:14, usePointStyle:true } },
      title:  { display: !!title, text: title, font: { family:'Inter', size:15, weight:'bold' }, padding:{ bottom:14 }, color:'#0F0F0F' },
    }
    if (showValues) {
      plugins.datalabels = { display: true, color: '#fff', font: { weight: 'bold', size: 10 } }
    }

    try {
      chartRef.current = new Chart(ctx, {
        type: actualType,
        data: { labels, datasets },
        options: {
          indexAxis: isHoriz ? 'y' : 'x',
          responsive: false, animation: { duration:0 },
          plugins,
          scales: isRound ? {} : {
            x: { stacked: isStacked, grid: { display:grid, color:'rgba(0,0,0,.04)' }, ticks: { font:{family:'Inter',size:10}, color:'#6B6868' } },
            y: { stacked: isStacked, grid: { display:grid, color:'rgba(0,0,0,.04)' }, ticks: { font:{family:'Inter',size:10}, color:'#6B6868' }, beginAtZero:true },
          },
        },
      })
    } catch(e) { console.warn('Chart.js error', e) }
  }

  // ── Custom 2D charts (waterfall, funnel, gauge, treemap) ───────────────────
  function renderCustom2D() {
    if (!canvasRef.current) return
    if (chartRef.current) { try { chartRef.current.destroy() } catch {} chartRef.current = null }
    const ctx = canvasRef.current.getContext('2d')!
    const W = 600, H = 400
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H)
    const colors = PALETTES[palette]
    const lines = rawData.trim().split('\n')
    const lbls = lines[0].split(',').map(s => s.trim())
    const vals = (lines[1] || '').split(',').map(v => parseFloat(v.trim()) || 0)

    // Title
    if (title) {
      ctx.fillStyle = '#0F0F0F'; ctx.font = 'bold 15px Inter'; ctx.textAlign = 'center'
      ctx.fillText(title, W/2, 28)
    }
    const top = title ? 48 : 18

    if (type === 'funnel') {
      const max = Math.max(...vals)
      const step = (H - top - 20) / vals.length
      vals.forEach((v, i) => {
        const ratio = v / max
        const barW = W * 0.75 * ratio
        const y = top + i * step
        const x = (W - barW) / 2
        ctx.fillStyle = colors[i % colors.length]
        // trapezoid
        const nextRatio = i < vals.length - 1 ? vals[i+1] / max : ratio * 0.7
        const nextW = W * 0.75 * nextRatio
        ctx.beginPath()
        ctx.moveTo(x, y + 4); ctx.lineTo(x + barW, y + 4)
        ctx.lineTo((W - nextW)/2 + nextW, y + step - 2); ctx.lineTo((W - nextW)/2, y + step - 2)
        ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'
        ctx.fillText(`${lbls[i]}: ${v.toLocaleString()}`, W/2, y + step/2 + 4)
      })
    } else if (type === 'waterfall') {
      const pad = 40, barW = Math.max(24, (W - pad*2) / vals.length - 8)
      const max = vals.reduce((a, v) => a + Math.max(0, v), 0)
      const min = vals.reduce((a, v) => a + Math.min(0, v), 0)
      const range = max - min || 1
      const toY = (v: number) => H - 20 - ((v - min) / range) * (H - top - 30)
      let running = 0
      vals.forEach((v, i) => {
        const from = toY(running), to = toY(running + v)
        const x = pad + i * ((W - pad*2) / vals.length)
        ctx.fillStyle = v >= 0 ? colors[0] : colors[3]
        ctx.fillRect(x, Math.min(from, to), barW, Math.abs(from - to))
        // Connector line
        if (i < vals.length - 1) {
          ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1; ctx.setLineDash([4,4])
          ctx.beginPath(); ctx.moveTo(x + barW, toY(running + v)); ctx.lineTo(x + barW + (W - pad*2)/vals.length - barW, toY(running + v)); ctx.stroke()
          ctx.setLineDash([])
        }
        ctx.fillStyle = '#374151'; ctx.font = '10px Inter'; ctx.textAlign = 'center'
        ctx.fillText(lbls[i] || '', x + barW/2, H - 6)
        ctx.fillStyle = v >= 0 ? colors[0] : colors[3]; ctx.font = 'bold 10px Inter'
        ctx.fillText((v >= 0 ? '+' : '') + v.toLocaleString(), x + barW/2, Math.min(from, to) - 4)
        running += v
      })
    } else if (type === 'gauge') {
      const val = vals[0] || 0; const max = vals[1] || 100
      const pct = Math.max(0, Math.min(1, val / max))
      const cx = W/2, cy = H * 0.62, r = Math.min(W, H) * 0.34
      // Background arc
      ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 28; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 2); ctx.stroke()
      // Value arc
      const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy)
      grad.addColorStop(0, colors[2]); grad.addColorStop(0.5, colors[0]); grad.addColorStop(1, colors[1])
      ctx.strokeStyle = grad; ctx.lineWidth = 28
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * pct); ctx.stroke()
      // Needle
      const angle = Math.PI + Math.PI * pct
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 3; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (r - 10) * Math.cos(angle), cy + (r - 10) * Math.sin(angle)); ctx.stroke()
      ctx.fillStyle = '#1E293B'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2); ctx.fill()
      // Labels
      ctx.fillStyle = '#0F0F0F'; ctx.font = 'bold 28px Inter'; ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy + 38)
      ctx.fillStyle = '#6B7280'; ctx.font = '13px Inter'
      ctx.fillText(`${val.toLocaleString()} / ${max.toLocaleString()}`, cx, cy + 58)
      if (lbls[0]) ctx.fillText(lbls[0], cx, top + 12)
    } else if (type === 'treemap') {
      const total = vals.reduce((a, b) => a + Math.abs(b), 0)
      const areas = vals.map(v => (Math.abs(v) / total) * (W - 8) * (H - top - 8))
      // Simple row-based treemap
      let x = 4, y = top + 4, rowH = 0, rowW = 0
      const placed: {x:number;y:number;w:number;h:number;i:number}[] = []
      let remaining = [...areas]
      while (remaining.length) {
        const v = remaining.shift()!
        const i = areas.length - remaining.length - 1
        const w = Math.max(40, (v / ((H - top - 8))) )
        const h = Math.min(H - top - 8, v / Math.max(w, 40))
        if (x + w > W - 4) { x = 4; y += rowH; rowH = 0 }
        rowH = Math.max(rowH, h)
        placed.push({ x, y, w, h, i })
        x += w
      }
      placed.forEach(({x,y,w,h,i}) => {
        ctx.fillStyle = colors[i % colors.length]
        ctx.fillRect(x, y, w - 3, h - 3)
        if (w > 50 && h > 20) {
          ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.min(13, h * 0.35)}px Inter`
          ctx.textAlign = 'center'
          ctx.fillText(lbls[i] || `Item ${i+1}`, x + (w-3)/2, y + (h-3)/2 + 4)
          if (h > 36) { ctx.font = `${Math.min(11, h * 0.25)}px Inter`; ctx.fillText(vals[i].toLocaleString(), x + (w-3)/2, y + (h-3)/2 + 18) }
        }
      })
    }
  }

  // ── 3D CANVAS RENDERING ────────────────────────────────────────────────────
  function render3D() {
    if (!canvasRef.current) return
    if (chartRef.current) { try { chartRef.current.destroy() } catch {} chartRef.current = null }
    const ctx = canvasRef.current.getContext('2d')!
    const W = 600, H = 400
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H)
    const colors = PALETTES[palette]
    const lines = rawData.trim().split('\n')
    const lbls = lines[0].split(',').map(s => s.trim())
    const allSeries = lines.slice(1).map(l => l.split(',').map(v => parseFloat(v.trim()) || 0))
    const vals = allSeries[0] || [40, 70, 55, 90]

    if (title) {
      ctx.fillStyle = '#0F0F0F'; ctx.font = 'bold 15px Inter'; ctx.textAlign = 'center'
      ctx.fillText(title, W/2, 26)
    }
    const top = title ? 44 : 16
    const D = depth3D  // 3D depth offset

    if (type === 'bar3d' || type === 'cylinder') {
      const pad = 44, n = vals.length
      const maxV = Math.max(...vals) || 1
      const slotW = (W - pad*2) / n
      const barW = Math.max(20, slotW * 0.52)
      const chartH = H - top - 48

      // Grid floor
      ctx.fillStyle = `rgba(241,245,249,${opacity3D})`
      ctx.beginPath(); ctx.moveTo(pad - D, H - 40 + D); ctx.lineTo(W - pad - D, H - 40 + D)
      ctx.lineTo(W - pad, H - 40); ctx.lineTo(pad, H - 40); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 0.8; ctx.stroke()

      // Grid lines
      for (let g = 0; g <= 4; g++) {
        const gy = H - 40 - (g / 4) * chartH
        ctx.strokeStyle = grid ? 'rgba(0,0,0,.06)' : 'transparent'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke()
        ctx.fillStyle = '#94A3B8'; ctx.font = '9px Inter'; ctx.textAlign = 'right'
        ctx.fillText(Math.round((g / 4) * maxV).toLocaleString(), pad - 5, gy + 3)
      }

      vals.forEach((v, i) => {
        const x = pad + i * slotW + (slotW - barW) / 2
        const barH = (v / maxV) * chartH
        const y = H - 40 - barH
        const col = colors[i % colors.length]
        const darkCol = shadeColor(col, -0.28)
        const sideCol = shadeColor(col, -0.14)

        if (type === 'cylinder') {
          // Cylinder body (rect with rounded ends)
          const rx = barW / 2
          // Front face gradient
          const grad = ctx.createLinearGradient(x, y, x + barW, y)
          grad.addColorStop(0, shadeColor(col, -0.1))
          grad.addColorStop(0.4, col)
          grad.addColorStop(1, shadeColor(col, -0.2))
          ctx.fillStyle = grad
          ctx.fillRect(x, y, barW, barH)
          // Top ellipse
          ctx.fillStyle = col; ctx.beginPath()
          ctx.ellipse(x + rx, y, rx, rx * 0.28, 0, 0, Math.PI * 2); ctx.fill()
          // Bottom ellipse (lighter)
          ctx.fillStyle = shadeColor(col, 0.1); ctx.beginPath()
          ctx.ellipse(x + rx, y + barH, rx, rx * 0.28, 0, 0, Math.PI, false); ctx.fill()
        } else {
          // 3D box
          // Front face
          ctx.fillStyle = col; ctx.fillRect(x, y, barW, barH)
          // Top face
          ctx.fillStyle = shadeColor(col, 0.18)
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + barW, y)
          ctx.lineTo(x + barW - D, y - D); ctx.lineTo(x - D, y - D); ctx.closePath(); ctx.fill()
          // Right face
          ctx.fillStyle = darkCol
          ctx.beginPath(); ctx.moveTo(x + barW, y); ctx.lineTo(x + barW - D, y - D)
          ctx.lineTo(x + barW - D, y + barH - D); ctx.lineTo(x + barW, y + barH); ctx.closePath(); ctx.fill()
          // Outline
          ctx.strokeStyle = shadeColor(col, -0.35); ctx.lineWidth = 0.6; ctx.strokeRect(x, y, barW, barH)
        }
        // Value label
        if (showValues) {
          ctx.fillStyle = '#1E293B'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'
          ctx.fillText(v.toLocaleString(), x + barW/2, y - 6)
        }
        // X label
        ctx.fillStyle = '#6B7280'; ctx.font = '10px Inter'; ctx.textAlign = 'center'
        ctx.fillText(lbls[i] || '', x + barW/2, H - 24)
      })
    } else if (type === 'pie3d') {
      const total = vals.reduce((a, b) => a + Math.abs(b), 0) || 1
      const cx = W/2, cy = (H + top)/2 - 10, rX = 150, rY = 62, depth = D * 1.4
      let startA = -Math.PI / 2

      // Draw side faces first (back slices)
      vals.forEach((v, i) => {
        const sweep = (v / total) * Math.PI * 2
        const midA = startA + sweep / 2
        if (Math.sin(midA) > 0) { startA += sweep; return }  // skip front slices
        const col = colors[i % colors.length]
        ctx.fillStyle = shadeColor(col, -0.25)
        ctx.beginPath()
        ctx.ellipse(cx, cy + depth, rX, rY, 0, startA, startA + sweep)
        ctx.ellipse(cx, cy, rX, rY, 0, startA + sweep, startA, true)
        ctx.closePath(); ctx.fill()
        startA += sweep
      })
      // Draw top faces
      startA = -Math.PI / 2
      vals.forEach((v, i) => {
        const sweep = (v / total) * Math.PI * 2
        const col = colors[i % colors.length]
        ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(cx, cy)
        ctx.ellipse(cx, cy, rX, rY, 0, startA, startA + sweep)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        // Label
        const midA = startA + sweep / 2
        const lx = cx + (rX + 25) * Math.cos(midA), ly = cy + (rY + 18) * Math.sin(midA)
        ctx.fillStyle = '#374151'; ctx.font = '10px Inter'; ctx.textAlign = 'center'
        ctx.fillText(`${lbls[i] || ''} ${Math.round((v/total)*100)}%`, lx, ly)
        startA += sweep
      })
    } else if (type === 'area3d') {
      const pad = 44, n = vals.length
      const maxV = Math.max(...vals) || 1
      const chartH = H - top - 50, chartW = W - pad*2
      const allDatasets = allSeries.slice(0, 4)
      allDatasets.forEach((series, si) => {
        const svals = series.length ? series : vals
        const col = colors[si % colors.length]
        const offsetX = si * D * 0.6, offsetY = -si * D * 0.5
        // Fill area
        ctx.fillStyle = col + '44'
        ctx.beginPath(); ctx.moveTo(pad + offsetX, H - 50 + offsetY)
        svals.forEach((v, i) => {
          const x = pad + offsetX + (i / (svals.length - 1)) * chartW
          const y = H - 50 + offsetY - (v / maxV) * chartH
          i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.lineTo(pad + offsetX + chartW, H - 50 + offsetY); ctx.closePath(); ctx.fill()
        // Line
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
        ctx.beginPath()
        svals.forEach((v, i) => {
          const x = pad + offsetX + (i / (svals.length - 1)) * chartW
          const y = H - 50 + offsetY - (v / maxV) * chartH
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.stroke()
      })
      // X labels
      lbls.forEach((l, i) => {
        ctx.fillStyle = '#6B7280'; ctx.font = '10px Inter'; ctx.textAlign = 'center'
        ctx.fillText(l, pad + (i / (lbls.length - 1)) * chartW, H - 10)
      })
    } else if (type === 'scatter3d') {
      const cx = W/2, cy = (H + top)/2
      // Draw 3D axes
      ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1.5
      const axLen = 160
      // X axis
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + axLen, cy + axLen * 0.3); ctx.stroke()
      // Y axis
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - axLen); ctx.stroke()
      // Z axis
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - axLen * 0.7, cy + axLen * 0.4); ctx.stroke()
      // Labels
      ctx.fillStyle = '#374151'; ctx.font = 'bold 11px Inter'
      ctx.textAlign = 'center'; ctx.fillText('X', cx + axLen + 10, cy + axLen * 0.3)
      ctx.fillText('Y', cx, cy - axLen - 10); ctx.fillText('Z', cx - axLen * 0.7 - 10, cy + axLen * 0.45)
      // Points
      const lines2 = rawData.trim().split('\n')
      const pts = lines2.slice(1).flatMap((l, si) => {
        const vs = l.split(',').map(v => parseFloat(v.trim()) || 0)
        const result = []
        for (let i = 0; i + 1 < vs.length; i += 3) {
          result.push({ x: vs[i], y: vs[i+1] || 0, z: vs[i+2] || 0, si })
        }
        return result
      })
      if (pts.length === 0) {
        // Demo points
        for (let i = 0; i < 30; i++) {
          const px = Math.random(), py = Math.random(), pz = Math.random()
          const sx = cx + px * axLen - pz * axLen * 0.7
          const sy = cy - py * axLen + px * axLen * 0.3 + pz * axLen * 0.4
          const col = colors[Math.floor(Math.random() * colors.length)]
          const r = 5 + Math.random() * 6
          const grad = ctx.createRadialGradient(sx-r*.3, sy-r*.3, 0, sx, sy, r)
          grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, col)
          ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill()
        }
      }
    } else if (type === 'cone') {
      const pad = 44, n = vals.length
      const maxV = Math.max(...vals) || 1
      const slotW = (W - pad*2) / n
      const barW = slotW * 0.5
      const chartH = H - top - 50
      // Floor
      ctx.fillStyle = '#F1F5F9'; ctx.fillRect(pad - 10, H - 48, W - pad*2 + 20, 8)
      vals.forEach((v, i) => {
        const x = pad + i * slotW + (slotW - barW) / 2
        const barH = (v / maxV) * chartH
        const y = H - 48 - barH
        const col = colors[i % colors.length]
        const cx = x + barW / 2
        // Cone (triangle with ellipse base)
        const grad = ctx.createLinearGradient(x, y, x + barW, y)
        grad.addColorStop(0, shadeColor(col, -0.1))
        grad.addColorStop(0.5, col)
        grad.addColorStop(1, shadeColor(col, -0.25))
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(x, H - 48); ctx.lineTo(x + barW, H - 48); ctx.closePath(); ctx.fill()
        // Ellipse base
        ctx.fillStyle = shadeColor(col, -0.15)
        ctx.beginPath(); ctx.ellipse(cx, H - 48, barW/2, barW*0.18, 0, 0, Math.PI*2); ctx.fill()
        // X label
        ctx.fillStyle = '#6B7280'; ctx.font = '10px Inter'; ctx.textAlign = 'center'
        ctx.fillText(lbls[i] || '', cx, H - 28)
        if (showValues) {
          ctx.fillStyle = '#1E293B'; ctx.font = 'bold 10px Inter'
          ctx.fillText(v.toLocaleString(), cx, y - 6)
        }
      })
    }
  }

  function shadeColor(hex: string, amount: number): string {
    const n = parseInt(hex.replace('#',''), 16)
    const r = Math.max(0, Math.min(255, (n >> 16) + Math.round(255 * amount)))
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amount)))
    const b = Math.max(0, Math.min(255, (n & 0xff) + Math.round(255 * amount)))
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  }

  function drawUploadedImg() {
    if (!canvasRef.current || !uploadedImg) return
    if (chartRef.current) { try { chartRef.current.destroy() } catch {} chartRef.current = null }
    const ctx = canvasRef.current.getContext('2d')!
    const img = new Image(); img.src = uploadedImg
    img.onload = () => {
      ctx.clearRect(0, 0, 600, 400)
      ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 600, 400)
      const scale = Math.min(600/img.width, 400/img.height, 1)
      const dw = img.width * scale, dh = img.height * scale
      ctx.drawImage(img, (600-dw)/2, (400-dh)/2, dw, dh)
    }
  }

  useEffect(() => { if (uploadedImg) drawUploadedImg() }, [uploadedImg, bgColor])

  // ── HQ export ────────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!canvasRef.current) return
    if (uploadedImg || ['waterfall','funnel','gauge','treemap'].includes(type) || dimension === '3D') {
      // For custom charts, scale up the preview canvas
      const hq = document.createElement('canvas'); hq.width = 1200; hq.height = 800
      const ctx2 = hq.getContext('2d')!
      ctx2.drawImage(canvasRef.current, 0, 0, 1200, 800)
      onAdd(hq.toDataURL('image/png', 1.0)); return
    }
    const Chart = (window as any).Chart; if (!Chart) return
    const hq = document.createElement('canvas'); hq.width = 1200; hq.height = 800
    const ctx2 = hq.getContext('2d')!
    ctx2.fillStyle = bgColor; ctx2.fillRect(0, 0, 1200, 800)
    const { labels, datasets } = parseData()
    const isRound = ['pie','doughnut','polar'].includes(type)
    const isHoriz = ['hbar','hstacked'].includes(type)
    const isStacked = ['stacked','hstacked'].includes(type)
    let actualType = type
    if (type === 'area') actualType = 'line'
    if (['hbar','stacked','hstacked'].includes(type)) actualType = 'bar'
    const hqChart = new Chart(ctx2, {
      type: actualType,
      data: { labels, datasets: datasets.map((d:any) => ({...d, borderRadius: borderR })) },
      options: {
        indexAxis: isHoriz ? 'y' : 'x', responsive: false, animation: { duration:0 },
        plugins: {
          legend: { display: legend, position:'bottom', labels:{ font:{family:'Inter',size:18}, padding:20, usePointStyle:true }},
          title: { display: !!title, text:title, font:{family:'Inter',size:26,weight:'bold'}, padding:{bottom:20}, color:'#0F0F0F' },
        },
        scales: isRound ? {} : {
          x: { stacked:isStacked, grid:{display:grid,color:'rgba(0,0,0,.04)'}, ticks:{font:{family:'Inter',size:15},color:'#6B6868'} },
          y: { stacked:isStacked, grid:{display:grid,color:'rgba(0,0,0,.04)'}, ticks:{font:{family:'Inter',size:15},color:'#6B6868'}, beginAtZero:true },
        },
      },
    })
    setTimeout(() => { onAdd(hq.toDataURL('image/png', 1.0)); try { hqChart.destroy() } catch {} }, 120)
  }

  const allTypes = [...CHART_2D, ...CHART_3D]
  const groups = dimension === '2D' ? ['Basic','Advanced','Business'] : ['3D']

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.58)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(8px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'#fff',borderRadius:20,width:'min(1160px,98vw)',maxHeight:'95vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.22)',border:`1px solid ${C.border}`,overflow:'hidden'}}>

        {/* Header */}
        <div style={{padding:'16px 22px 12px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'#FAFAF8'}}>
          <div>
            <h2 style={{margin:'0 0 2px',fontSize:19,fontWeight:800,color:C.text,fontFamily:F}}>Chart Builder</h2>
            <p style={{margin:0,fontSize:11,color:C.textSm,fontFamily:F}}>22 chart types · 2D &amp; 3D · CSV upload · 16 palettes</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {/* 2D / 3D toggle */}
            <div style={{display:'flex',border:`1.5px solid ${C.border}`,borderRadius:9,overflow:'hidden'}}>
              {(['2D','3D'] as const).map(d=>(
                <button key={d} onClick={()=>{setDimension(d);setType(d==='2D'?'bar':'bar3d');setActiveGroup(d==='2D'?'Basic':'3D')}}
                  style={{padding:'6px 18px',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:F,background:dimension===d?C.accent:'transparent',color:dimension===d?'#fff':C.textMd,transition:'all .12s'}}>
                  {d}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{width:30,height:30,background:C.hover,border:`1px solid ${C.border}`,borderRadius:7,cursor:'pointer',fontSize:15,color:C.textMd}}>✕</button>
          </div>
        </div>

        <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>

          {/* LEFT CONTROLS */}
          <div style={{width:316,borderRight:`1px solid ${C.border}`,overflow:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:12,flexShrink:0}}>

            {/* Chart Type */}
            <div>
              <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:7,fontFamily:F}}>Chart Type</p>
              <div style={{display:'flex',gap:5,marginBottom:8}}>
                {groups.map(g=>(
                  <button key={g} onClick={()=>setActiveGroup(g)} style={{padding:'3px 10px',fontSize:10,fontWeight:700,border:`1px solid ${activeGroup===g?C.accent:C.border}`,borderRadius:20,background:activeGroup===g?C.accentLt:'#fff',color:activeGroup===g?C.accent:C.textMd,cursor:'pointer',fontFamily:F}}>
                    {g}
                  </button>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
                {(dimension==='2D'?CHART_2D:CHART_3D).filter(c=>c.group===activeGroup).map(ct=>(
                  <button key={ct.id} onClick={()=>setType(ct.id)} style={{padding:'7px 4px',border:`1.5px solid ${type===ct.id?C.accent:C.border}`,borderRadius:9,background:type===ct.id?C.accentLt:'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,transition:'all .12s'}}>
                    <span style={{fontSize:19}}>{ct.icon}</span>
                    <span style={{fontSize:9.5,fontWeight:700,color:type===ct.id?C.accent:C.textMd,fontFamily:F}}>{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Palette */}
            <div>
              <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:6,fontFamily:F}}>Color Palette</p>
              <input value={paletteSearch} onChange={e=>setPaletteSearch(e.target.value)} placeholder="Search palette…"
                style={{width:'100%',padding:'5px 8px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:11,fontFamily:F,outline:'none',marginBottom:6}}
                onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,maxHeight:180,overflow:'auto'}}>
                {filtPalettes.map(([name, cols])=>(
                  <button key={name} onClick={()=>setPalette(name)} style={{border:`2px solid ${palette===name?C.accent:'transparent'}`,borderRadius:8,padding:'4px 6px',cursor:'pointer',background:palette===name?C.accentLt:'#FAFAF8',display:'flex',flexDirection:'column',gap:2}}>
                    <div style={{display:'flex',gap:1,height:14}}>
                      {cols.slice(0,6).map((col,i)=><div key={i} style={{flex:1,background:col,borderRadius:2}}/>)}
                    </div>
                    <span style={{fontSize:9,fontWeight:700,color:palette===name?C.accent:C.textSm,fontFamily:F,textAlign:'left'}}>{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:5,fontFamily:F}}>Chart Title</p>
              <input value={title} onChange={e=>setTitle(e.target.value)} style={{width:'100%',padding:'6px 9px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:F,color:C.text,outline:'none'}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>

            {/* Data */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',margin:0,fontFamily:F}}>Data (CSV)</p>
                <button onClick={()=>csvRef.current?.click()} style={{padding:'3px 10px',fontSize:10,fontWeight:700,border:`1px solid ${C.accent}`,borderRadius:20,background:C.accentLt,color:C.accent,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:4}}>
                  ⬆ Upload CSV
                </button>
                <input ref={csvRef} type="file" accept=".csv,.txt" style={{display:'none'}} onChange={handleCsvUpload}/>
              </div>
              {csvError && <p style={{fontSize:10,color:C.amber,marginBottom:4,fontFamily:F}}>⚠ {csvError}</p>}
              <p style={{fontSize:9.5,color:C.textSm,marginBottom:4,lineHeight:1.5,fontFamily:F}}>
                Row 1: labels. Row 2+: series values. Scatter: x,y pairs. Bubble: x,y,r triples.
              </p>
              <textarea value={rawData} onChange={e=>{setRawData(e.target.value);setUploadedImg(null)}} rows={6}
                style={{width:'100%',padding:'6px 9px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:10.5,fontFamily:FM,color:C.text,outline:'none',resize:'vertical'}}
                onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>

            {/* Options */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {[
                {label:'Legend',  val:legend,  set:setLegend},
                {label:'Grid',    val:grid,    set:setGrid},
                {label:'Smooth',  val:smooth,  set:setSmooth},
                {label:'Values',  val:showValues, set:setShowValues},
              ].map(o=>(
                <label key={o.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,cursor:'pointer',fontFamily:F,padding:'5px 8px',border:`1px solid ${o.val?C.accent:C.border}`,borderRadius:7,background:o.val?C.accentLt:'#fff',transition:'all .12s'}}>
                  <input type="checkbox" checked={o.val} onChange={e=>o.set(e.target.checked)} style={{accentColor:C.accent,width:12,height:12}}/>{o.label}
                </label>
              ))}
            </div>

            {/* Sliders */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:10,fontWeight:600,color:C.textMd,fontFamily:F}}>Bar Radius</span><span style={{fontSize:10,fontFamily:FM,color:C.textMd}}>{borderR}px</span></div>
                <input type="range" min={0} max={24} value={borderR} onChange={e=>setBorderR(Number(e.target.value))} style={{width:'100%',accentColor:C.accent}}/>
              </div>
              {dimension==='3D'&&(
                <>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:10,fontWeight:600,color:C.textMd,fontFamily:F}}>3D Depth</span><span style={{fontSize:10,fontFamily:FM,color:C.textMd}}>{depth3D}px</span></div>
                    <input type="range" min={6} max={36} value={depth3D} onChange={e=>setDepth3D(Number(e.target.value))} style={{width:'100%',accentColor:C.accent}}/>
                  </div>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:10,fontWeight:600,color:C.textMd,fontFamily:F}}>Opacity</span><span style={{fontSize:10,fontFamily:FM,color:C.textMd}}>{Math.round(opacity3D*100)}%</span></div>
                    <input type="range" min={40} max={100} value={Math.round(opacity3D*100)} onChange={e=>setOpacity3D(Number(e.target.value)/100)} style={{width:'100%',accentColor:C.accent}}/>
                  </div>
                </>
              )}
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:10,fontWeight:600,color:C.textMd,fontFamily:F}}>Background</span></div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {['#ffffff','#F8FAFB','#0F172A','#1E293B','#F9FAFB','transparent'].map(bg=>(
                    <button key={bg} onClick={()=>setBgColor(bg)}
                      style={{width:24,height:24,borderRadius:5,background:bg==='transparent'?'repeating-linear-gradient(45deg,#E5E7EB,#E5E7EB 4px,#fff 4px,#fff 8px)':bg,border:`2px solid ${bgColor===bg?C.accent:'#E4E0DB'}`,cursor:'pointer',padding:0}}/>
                  ))}
                  <input type="color" value={bgColor==='transparent'?'#ffffff':bgColor} onChange={e=>setBgColor(e.target.value)} style={{width:24,height:24,borderRadius:5,border:`1px solid ${C.border}`,cursor:'pointer',padding:1}}/>
                </div>
              </div>
            </div>

            {/* Upload existing chart */}
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              <p style={{fontSize:10,fontWeight:700,color:C.textMd,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:7,fontFamily:F}}>Import Existing Chart</p>
              <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImgUpload}/>
              <button onClick={()=>imgRef.current?.click()} style={{width:'100%',padding:'9px',border:`2px dashed ${C.borderSt}`,borderRadius:10,background:'#FAFAF8',cursor:'pointer',fontSize:12,fontWeight:600,color:C.textMd,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',gap:7,transition:'all .13s'}}
                onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.color=C.accent}}
                onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.color=C.textMd}}>
                🖼 Upload chart image
              </button>
              {uploadedImg&&(
                <button onClick={()=>setUploadedImg(null)} style={{width:'100%',marginTop:5,padding:'6px',border:`1px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',fontSize:11,color:C.amber,fontWeight:600,fontFamily:F}}>
                  ✕ Clear uploaded image
                </button>
              )}
              <p style={{fontSize:9.5,color:C.textSm,marginTop:5,lineHeight:1.5,fontFamily:F}}>Upload a PNG, JPG or SVG of an existing chart to embed it directly onto the canvas.</p>
            </div>
          </div>

          {/* PREVIEW */}
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',background:'#F0EEF8',padding:20}}>
              <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 4px 24px rgba(0,0,0,.10)',border:`1px solid ${C.border}`,position:'relative'}}>
                <canvas ref={canvasRef} width={600} height={400} style={{display:'block',maxWidth:'100%'}}/>
                {uploadedImg&&(
                  <div style={{position:'absolute',top:8,right:8,padding:'2px 8px',background:C.accent,color:'#fff',borderRadius:5,fontSize:9,fontWeight:700,fontFamily:F}}>IMPORTED</div>
                )}
              </div>
            </div>
            <div style={{padding:'11px 16px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8,background:'#fff',flexShrink:0,alignItems:'center'}}>
              <div style={{flex:1,fontSize:11,color:C.textSm,fontFamily:F}}>
                {uploadedImg ? 'Imported chart ready to add to canvas' : `${type.toUpperCase()} · ${dimension} · ${palette} palette`}
              </div>
              <button onClick={onClose} style={{padding:'9px 18px',border:`1.5px solid ${C.border}`,borderRadius:9,background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:C.textMd,fontFamily:F}}>Cancel</button>
              <button onClick={handleAdd} style={{padding:'9px 28px',border:'none',borderRadius:9,background:C.accent,color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:F,transition:'all .13s'}}
                onMouseOver={e=>(e.currentTarget.style.background=C.accentHv)} onMouseOut={e=>(e.currentTarget.style.background=C.accent)}>
                Add to Canvas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}