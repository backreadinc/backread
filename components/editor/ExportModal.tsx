'use client'
import { useState } from 'react'

const C={panel:'#FFFFFF',border:'#E4E0DB',accent:'#5B50E8',accentLt:'#EEEDFB',accentMd:'#BDB9F4',text:'#0F0F0F',textMd:'#6B6868',textSm:'#9B9898',hover:'#F5F3F0',green:'#16A34A'}
const F="'Inter',-apple-system,sans-serif"
export type ExportFormat='pdf'|'png'|'jpeg'|'webp'
export type ExportOptions={format:ExportFormat;quality:string;pages:'all'|'current';multiplier:number;jpegQuality:number}
const FORMATS=[{id:'pdf',label:'PDF',desc:'Multi-page, print-perfect',icon:'📄'},{id:'png',label:'PNG',desc:'Lossless, transparent',icon:'🖼'},{id:'jpeg',label:'JPEG',desc:'Compressed, universal',icon:'📸'},{id:'webp',label:'WebP',desc:'Modern, best compression',icon:'⚡'}] as const
const QUALITIES=[{id:'screen',label:'Screen',dpi:72,mult:1,desc:'Digital only'},{id:'web',label:'Web',dpi:96,mult:1.5,desc:'Web & social'},{id:'print',label:'Print',dpi:150,mult:2.08,desc:'Standard print'},{id:'highprint',label:'High Print',dpi:300,mult:4.17,desc:'Professional print'},{id:'ultra',label:'Ultra HD',dpi:600,mult:8.33,desc:'Max resolution'}] as const

export default function ExportModal({pageCount,docTitle,onExport,onClose,isExporting=false}:{pageCount:number;docTitle:string;onExport:(o:ExportOptions)=>void;onClose:()=>void;isExporting?:boolean}){
  const [format,setFormat]=useState<ExportFormat>('pdf')
  const [quality,setQuality]=useState('highprint')
  const [pages,setPages]=useState<'all'|'current'>('all')
  const [jpegQ,setJpegQ]=useState(92)
  const selQ=QUALITIES.find(q=>q.id===quality)!
  const selF=FORMATS.find(f=>f.id===format)!
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.52)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(8px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'#fff',borderRadius:20,width:'min(540px,96vw)',boxShadow:'0 32px 80px rgba(0,0,0,.22)',border:`1px solid ${C.border}`}}>
        <div style={{padding:'22px 24px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><h2 style={{margin:'0 0 3px',fontSize:19,fontWeight:800,color:C.text,fontFamily:F}}>Export Document</h2><p style={{margin:0,fontSize:12,color:C.textSm,fontFamily:F}}>{docTitle} · {pageCount} page{pageCount!==1?'s':''}</p></div>
          <button onClick={onClose} style={{width:32,height:32,background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,cursor:'pointer',fontSize:16,color:C.textMd}}>✕</button>
        </div>
        <div style={{padding:'18px 24px 24px'}}>
          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,color:C.textMd,display:'block',marginBottom:10,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Format</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
              {FORMATS.map(f=>(
                <button key={f.id} onClick={()=>setFormat(f.id as ExportFormat)} style={{padding:'12px 8px',border:`2px solid ${format===f.id?C.accent:C.border}`,borderRadius:11,background:format===f.id?C.accentLt:'#FAFAF8',cursor:'pointer',textAlign:'center',transition:'all .12s'}}>
                  <div style={{fontSize:22,marginBottom:5}}>{f.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:format===f.id?C.accent:C.text,fontFamily:F}}>{f.label}</div>
                  <div style={{fontSize:10,color:C.textSm,fontFamily:F,marginTop:2,lineHeight:1.4}}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,color:C.textMd,display:'block',marginBottom:8,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Export Quality / DPI</label>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {QUALITIES.map(q=>(
                <button key={q.id} onClick={()=>setQuality(q.id)} style={{padding:'9px 14px',border:`2px solid ${quality===q.id?C.accent:C.border}`,borderRadius:9,background:quality===q.id?C.accentLt:'#FAFAF8',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all .12s'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:quality===q.id?C.accent:C.border,flexShrink:0}}/>
                  <div style={{flex:1,textAlign:'left'}}>
                    <span style={{fontSize:13,fontWeight:700,color:quality===q.id?C.accent:C.text,fontFamily:F}}>{q.label}</span>
                    <span style={{fontSize:11,color:quality===q.id?C.accentMd:C.textSm,fontFamily:F}}> · {q.dpi} DPI · {q.desc}</span>
                  </div>
                  <span style={{fontSize:10,color:C.textSm,background:C.hover,padding:'1px 7px',borderRadius:20,fontFamily:F,flexShrink:0}}>{q.mult}×</span>
                </button>
              ))}
            </div>
            {selQ&&<div style={{marginTop:8,padding:'8px 12px',background:'#F0FDF4',borderRadius:8,border:'1px solid #BBF7D0'}}><p style={{margin:0,fontSize:11,color:C.green,fontFamily:F,fontWeight:600}}>✓ {selQ.dpi} DPI · {selQ.mult}× pixel density · {selF.desc}</p></div>}
          </div>
          {(format==='jpeg'||format==='webp')&&(
            <div style={{marginBottom:18}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><label style={{fontSize:11,fontWeight:700,color:C.textMd,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Compression</label><span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:C.textMd}}>{jpegQ}%</span></div>
              <input type="range" min={60} max={100} value={jpegQ} onChange={e=>setJpegQ(Number(e.target.value))} style={{width:'100%',accentColor:C.accent}}/>
            </div>
          )}
          {pageCount>1&&(
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:700,color:C.textMd,display:'block',marginBottom:7,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Pages</label>
              <div style={{display:'flex',gap:8}}>
                {[['all',`All ${pageCount} pages`],['current','Current page']].map(([id,lbl])=>(
                  <button key={id} onClick={()=>setPages(id as 'all'|'current')} style={{flex:1,padding:'8px',border:`2px solid ${pages===id?C.accent:C.border}`,borderRadius:8,background:pages===id?C.accentLt:'#FAFAF8',cursor:'pointer',fontSize:13,fontWeight:600,color:pages===id?C.accent:C.textMd,fontFamily:F,transition:'all .12s'}}>{lbl}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:'11px',border:`1.5px solid ${C.border}`,borderRadius:10,background:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,color:C.textMd,fontFamily:F}}>Cancel</button>
            <button onClick={()=>onExport({format,quality,pages,multiplier:selQ.mult,jpegQuality:jpegQ/100})} disabled={isExporting} style={{flex:2,padding:'11px',border:'none',borderRadius:10,background:isExporting?'#94A3B8':C.accent,color:'#fff',fontSize:14,fontWeight:800,cursor:isExporting?'not-allowed':'pointer',fontFamily:F,transition:'all .13s'}}>
              {isExporting?'Exporting…':`${selF.icon} Export ${selF.label.toUpperCase()}${pages==='all'&&pageCount>1?` (${pageCount} pgs)`:''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
