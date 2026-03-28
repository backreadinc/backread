'use client'
import { useState, useRef, useEffect } from 'react'

const C={border:'#E4E0DB',accent:'#5B50E8',accentLt:'#EEEDFB',text:'#0F0F0F',textMd:'#6B6868',textSm:'#9B9898',hover:'#F5F3F0'}
const F="'Inter',-apple-system,sans-serif"

const PALETTES=[
  {name:'Brand',  colors:['#5B50E8','#7C3AED','#2563EB','#0891B2','#059669']},
  {name:'Vivid',  colors:['#EF4444','#F97316','#F59E0B','#10B981','#3B82F6']},
  {name:'Pastel', colors:['#FCA5A5','#FCD34D','#86EFAC','#93C5FD','#C4B5FD']},
  {name:'Dark',   colors:['#1E293B','#334155','#475569','#64748B','#94A3B8']},
  {name:'Mono',   colors:['#0F172A','#334155','#64748B','#94A3B8','#CBD5E1']},
]

const TYPES=[
  {id:'bar',      label:'Bar',       icon:'▊'},
  {id:'line',     label:'Line',      icon:'╱'},
  {id:'pie',      label:'Pie',       icon:'◉'},
  {id:'doughnut', label:'Donut',     icon:'◎'},
  {id:'area',     label:'Area',      icon:'⬟'},
  {id:'radar',    label:'Radar',     icon:'✦'},
]

export default function ChartBuilder({onAdd,onClose}:{onAdd:(dataUrl:string)=>void;onClose:()=>void}){
  const [type,setType]=useState('bar')
  const [palette,setPalette]=useState(0)
  const [title,setTitle]=useState('Chart Title')
  const [rawData,setRawData]=useState('Q1, 42\nQ2, 67\nQ3, 58\nQ4, 83\nQ5, 71')
  const [chartReady,setChartReady]=useState(false)
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const chartRef=useRef<any>(null)
  const libReady=useRef(false)

  useEffect(()=>{
    if(!(window as any).Chart){
      const s=document.createElement('script')
      s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.3/chart.umd.min.js'
      s.onload=()=>{libReady.current=true;renderChart()}
      document.head.appendChild(s)
    } else {libReady.current=true;renderChart()}
  },[])

  useEffect(()=>{if(libReady.current)renderChart()},[type,palette,title,rawData])

  function parseData():{labels:string[];values:number[]}{
    const lines=rawData.trim().split('\n').map(l=>l.trim()).filter(Boolean)
    const labels:string[]=[]; const values:number[]=[]
    lines.forEach(l=>{
      const parts=l.split(/[,\t]+/)
      labels.push(parts[0]?.trim()||'')
      values.push(parseFloat(parts[1])||0)
    })
    return{labels,values}
  }

  function renderChart(){
    if(!canvasRef.current||!(window as any).Chart) return
    const Chart=(window as any).Chart
    if(chartRef.current){chartRef.current.destroy();chartRef.current=null}
    const{labels,values}=parseData()
    const cols=PALETTES[palette].colors
    const bgColors=labels.map((_,i)=>cols[i%cols.length])
    const ctx=canvasRef.current.getContext('2d')!
    const isArea=type==='area'
    const datasets=[{label:title,data:values,backgroundColor:type==='line'?'transparent':type==='area'?`${bgColors[0]}33`:bgColors,borderColor:type==='line'||type==='area'?bgColors[0]:bgColors,borderWidth:2,fill:isArea,tension:.4,pointRadius:type==='line'||isArea?4:0}]
    chartRef.current=new Chart(ctx,{type:isArea?'line':type,data:{labels,datasets},options:{responsive:false,plugins:{legend:{display:false},title:{display:!!title,text:title,font:{size:14,weight:'bold'},color:'#0F172A'}},scales:type==='pie'||type==='doughnut'||type==='radar'?{}:{x:{grid:{color:'rgba(0,0,0,.05)'},ticks:{color:'#64748B',font:{size:11}}},y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{color:'#64748B',font:{size:11}}}},animation:{onComplete:()=>setChartReady(true)}}})
  }

  function addToCanvas(){
    if(!canvasRef.current)return
    onAdd(canvasRef.current.toDataURL('image/png'))
  }

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.52)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(8px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'#fff',borderRadius:20,width:'min(880px,96vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.22)',border:`1px solid ${C.border}`}}>
        <div style={{padding:'20px 24px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <h2 style={{margin:0,fontSize:19,fontWeight:800,color:C.text,fontFamily:F}}>📊 Chart Builder</h2>
          <button onClick={onClose} style={{width:32,height:32,background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,cursor:'pointer',fontSize:16,color:C.textMd}}>✕</button>
        </div>
        <div style={{flex:1,overflow:'auto',display:'flex',gap:0}}>
          {/* Controls */}
          <div style={{width:280,borderRight:`1px solid ${C.border}`,padding:'16px 18px',flexShrink:0,overflow:'auto'}}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:10,fontWeight:700,color:C.textMd,display:'block',marginBottom:8,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Chart Type</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {TYPES.map(t=>(
                  <button key={t.id} onClick={()=>setType(t.id)} style={{padding:'8px',border:`2px solid ${type===t.id?C.accent:C.border}`,borderRadius:9,background:type===t.id?C.accentLt:'#FAFAF8',cursor:'pointer',fontSize:12,fontWeight:600,color:type===t.id?C.accent:C.textMd,fontFamily:F,transition:'all .12s',display:'flex',alignItems:'center',gap:5,justifyContent:'center'}}>
                    <span style={{fontSize:18,lineHeight:1}}>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:10,fontWeight:700,color:C.textMd,display:'block',marginBottom:7,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Color Palette</label>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {PALETTES.map((p,i)=>(
                  <button key={p.name} onClick={()=>setPalette(i)} style={{padding:'7px 10px',border:`2px solid ${palette===i?C.accent:C.border}`,borderRadius:8,background:palette===i?C.accentLt:'#FAFAF8',cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'all .12s'}}>
                    <div style={{display:'flex',gap:2}}>{p.colors.map((c,j)=><div key={j} style={{width:12,height:12,borderRadius:3,background:c}}/>)}</div>
                    <span style={{fontSize:12,fontWeight:600,color:palette===i?C.accent:C.textMd,fontFamily:F}}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:C.textMd,display:'block',marginBottom:5,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Chart Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} style={{width:'100%',padding:'7px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,fontFamily:F,color:C.text,outline:'none'}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                <label style={{fontSize:10,fontWeight:700,color:C.textMd,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Data (Label, Value)</label>
              </div>
              <textarea value={rawData} onChange={e=>setRawData(e.target.value)} rows={8} placeholder="Q1, 42&#10;Q2, 67&#10;Q3, 83"
                style={{width:'100%',padding:'8px 10px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:C.text,outline:'none',resize:'vertical',lineHeight:1.6}}
                onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
              <p style={{fontSize:11,color:C.textSm,marginTop:4,lineHeight:1.5,fontFamily:F}}>One row per data point. Use comma or tab to separate label and value.</p>
            </div>
          </div>
          {/* Preview */}
          <div style={{flex:1,padding:24,display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFC'}}>
            <div style={{background:'#fff',borderRadius:14,boxShadow:'0 4px 20px rgba(0,0,0,.08)',padding:20}}>
              <canvas ref={canvasRef} width={520} height={360} style={{display:'block'}}/>
            </div>
          </div>
        </div>
        <div style={{padding:'14px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',border:`1.5px solid ${C.border}`,borderRadius:9,background:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,color:C.textMd,fontFamily:F}}>Cancel</button>
          <button onClick={addToCanvas} disabled={!chartReady} style={{flex:2,padding:'10px',border:'none',borderRadius:9,background:chartReady?C.accent:'#94A3B8',color:'#fff',fontSize:14,fontWeight:800,cursor:chartReady?'pointer':'not-allowed',fontFamily:F}}>
            Add Chart to Canvas
          </button>
        </div>
      </div>
    </div>
  )
}
