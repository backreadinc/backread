'use client'
import { useState } from 'react'

const C = {
  border:'#E4E0DB', accent:'#5B50E8', accentLt:'#EEEDFB', accentMd:'#BDB9F4',
  text:'#0F0F0F', textMd:'#6B6868', textSm:'#9B9898', hover:'#F5F3F0', green:'#16A34A',
  panel:'#FFFFFF', panelSub:'#F7F6F4',
}
const F = "'Inter',-apple-system,sans-serif"

export type ExportFormat = 'png'|'jpg'|'svg'|'pdf-standard'|'pdf-print'|'pptx'|'docx'|'webp'
export type ExportQuality = { id:string; label:string; dpi:number; mult:number; desc:string; tag:string }
export type ExportOptions = { format:ExportFormat; quality:ExportQuality; pages:'all'|'current'; jpegQuality:number }

export const EXPORT_FORMATS = [
  { id:'png',         label:'PNG',        desc:'Lossless, transparent',    icon:'🖼',  group:'Image'    },
  { id:'jpg',         label:'JPG',        desc:'Compressed photo format',  icon:'📸',  group:'Image'    },
  { id:'webp',        label:'WebP',       desc:'Modern web format',        icon:'⚡',  group:'Image'    },
  { id:'svg',         label:'SVG',        desc:'Vector, infinite scale',   icon:'✦',   group:'Image'    },
  { id:'pdf-standard',label:'PDF',        desc:'Standard digital PDF',     icon:'📄',  group:'Document' },
  { id:'pdf-print',   label:'PDF Print',  desc:'Print-quality PDF',        icon:'🖨',  group:'Document' },
  { id:'pptx',        label:'PPTX',       desc:'Microsoft PowerPoint',     icon:'📊',  group:'Office'   },
  { id:'docx',        label:'DOCX',       desc:'Microsoft Word',           icon:'📝',  group:'Office'   },
] as const

export const EXPORT_QUALITIES: ExportQuality[] = [
  { id:'low',     label:'Low',         dpi:72,   mult:1,    desc:'Small file size, screen only',   tag:'72 DPI'    },
  { id:'medium',  label:'Standard',    dpi:96,   mult:1.33, desc:'Good for web and email',         tag:'96 DPI'    },
  { id:'high',    label:'High',        dpi:150,  mult:2.08, desc:'Minimum recommended quality',    tag:'150 DPI'   },
  { id:'print',   label:'Print',       dpi:300,  mult:4.17, desc:'Professional print quality',     tag:'300 DPI'   },
  { id:'hq',      label:'High Print',  dpi:600,  mult:8.33, desc:'Large format print',             tag:'600 DPI'   },
  { id:'uhd',     label:'Ultra HD',    dpi:1200, mult:16.67,desc:'Poster / billboard quality',     tag:'1200 DPI'  },
  { id:'max',     label:'Maximum',     dpi:3000, mult:41.67,desc:'Absolute maximum resolution',    tag:'3000 DPI'  },
]

interface Props {
  pageCount: number
  docTitle: string
  onExport: (opts: ExportOptions) => void
  onClose: () => void
  isExporting?: boolean
}

export default function ExportModal({ pageCount, docTitle, onExport, onClose, isExporting=false }: Props) {
  const [format, setFormat]   = useState<ExportFormat>('png')
  const [quality, setQuality] = useState<ExportQuality>(EXPORT_QUALITIES[2]) // 150 DPI default
  const [pages, setPages]     = useState<'all'|'current'>('all')
  const [jpegQ, setJpegQ]     = useState(92)
  const [activeGroup, setActiveGroup] = useState('Image')

  const groups = ['Image','Document','Office']
  const filtFmts = EXPORT_FORMATS.filter(f => f.group === activeGroup)

  const warningDPI = quality.dpi >= 1200
  const fileSizeWarning = quality.dpi === 3000 ? 'Warning: 3000 DPI will produce very large files (100MB+).' : 
                          quality.dpi === 1200 ? 'Note: 1200 DPI produces large files (20-50MB).' : null

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.54)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(8px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'#fff',borderRadius:20,width:'min(640px,96vw)',maxHeight:'94vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.22)',border:`1px solid ${C.border}`}}>
        
        {/* Header */}
        <div style={{padding:'22px 24px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <h2 style={{margin:'0 0 3px',fontSize:19,fontWeight:800,color:C.text,fontFamily:F}}>Export</h2>
            <p style={{margin:0,fontSize:12,color:C.textSm,fontFamily:F}}>{docTitle} · {pageCount} page{pageCount!==1?'s':''}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,cursor:'pointer',fontSize:16,color:C.textMd,fontFamily:F}}>✕</button>
        </div>

        <div style={{flex:1,overflow:'auto',padding:'18px 24px 24px'}}>
          
          {/* Format Groups */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:C.textMd,display:'block',marginBottom:10,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>File Format</label>
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              {groups.map(g=>(
                <button key={g} onClick={()=>{setActiveGroup(g);const first=EXPORT_FORMATS.find(f=>f.group===g);if(first)setFormat(first.id as ExportFormat)}}
                  style={{padding:'5px 14px',border:`2px solid ${activeGroup===g?C.accent:C.border}`,borderRadius:20,background:activeGroup===g?C.accentLt:'#fff',fontSize:12,fontWeight:700,color:activeGroup===g?C.accent:C.textMd,cursor:'pointer',fontFamily:F,transition:'all .12s'}}>
                  {g}
                </button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
              {filtFmts.map(f=>(
                <button key={f.id} onClick={()=>setFormat(f.id as ExportFormat)}
                  style={{padding:'11px 6px',border:`2px solid ${format===f.id?C.accent:C.border}`,borderRadius:11,background:format===f.id?C.accentLt:'#FAFAF8',cursor:'pointer',textAlign:'center',transition:'all .12s'}}>
                  <div style={{fontSize:22,marginBottom:5}}>{f.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:format===f.id?C.accent:C.text,fontFamily:F}}>{f.label}</div>
                  <div style={{fontSize:9.5,color:C.textSm,fontFamily:F,marginTop:2,lineHeight:1.4}}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality — only for raster formats */}
          {!['svg','pptx','docx'].includes(format) && (
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:C.textMd,display:'block',marginBottom:8,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Export Quality</label>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {EXPORT_QUALITIES.map(q=>(
                  <button key={q.id} onClick={()=>setQuality(q)}
                    style={{padding:'9px 13px',border:`2px solid ${quality.id===q.id?C.accent:C.border}`,borderRadius:9,background:quality.id===q.id?C.accentLt:'#FAFAF8',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all .12s',textAlign:'left'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:quality.id===q.id?C.accent:C.border,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <span style={{fontSize:13,fontWeight:700,color:quality.id===q.id?C.accent:C.text,fontFamily:F}}>{q.label}</span>
                      <span style={{fontSize:11,color:quality.id===q.id?C.accentMd:C.textSm,fontFamily:F}}> · {q.desc}</span>
                    </div>
                    <span style={{fontSize:10,color:C.textSm,background:C.hover,padding:'2px 8px',borderRadius:20,fontFamily:`'JetBrains Mono',monospace`,flexShrink:0,fontWeight:600}}>{q.tag}</span>
                  </button>
                ))}
              </div>
              {fileSizeWarning && (
                <div style={{marginTop:8,padding:'8px 12px',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8}}>
                  <p style={{margin:0,fontSize:11,color:'#92400E',fontFamily:F}}>⚠ {fileSizeWarning}</p>
                </div>
              )}
            </div>
          )}

          {/* JPEG/WebP Quality slider */}
          {['jpg','webp'].includes(format) && (
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <label style={{fontSize:11,fontWeight:700,color:C.textMd,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Compression</label>
                <span style={{fontSize:12,fontFamily:`'JetBrains Mono',monospace`,color:C.textMd}}>{jpegQ}%</span>
              </div>
              <input type="range" min={60} max={100} value={jpegQ} onChange={e=>setJpegQ(Number(e.target.value))} style={{width:'100%',accentColor:C.accent}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:C.textSm,fontFamily:F,marginTop:3}}>
                <span>Smaller file</span><span>Best quality</span>
              </div>
            </div>
          )}

          {/* Pages */}
          {pageCount > 1 && !['pptx','docx'].includes(format) && (
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:C.textMd,display:'block',marginBottom:7,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>Pages</label>
              <div style={{display:'flex',gap:8}}>
                {[['all',`All ${pageCount} pages`],['current','Current page only']].map(([id,lbl])=>(
                  <button key={id} onClick={()=>setPages(id as 'all'|'current')} style={{flex:1,padding:'8px',border:`2px solid ${pages===id?C.accent:C.border}`,borderRadius:8,background:pages===id?C.accentLt:'#FAFAF8',cursor:'pointer',fontSize:12,fontWeight:600,color:pages===id?C.accent:C.textMd,fontFamily:F,transition:'all .12s'}}>{lbl}</button>
                ))}
              </div>
            </div>
          )}

          {/* Summary box */}
          <div style={{padding:'10px 13px',background:'#F0FDF4',borderRadius:9,border:'1px solid #BBF7D0',marginBottom:16}}>
            <p style={{margin:0,fontSize:11,color:C.green,fontFamily:F,fontWeight:600}}>
              ✓ {format.toUpperCase().replace('-','  ')} · {['svg','pptx','docx'].includes(format)?'Vector/Office format':quality.tag+' · '+quality.mult.toFixed(1)+'× pixel density'} · {pages==='all'?`${pageCount} page${pageCount>1?'s':''}`:'Current page'}
            </p>
          </div>

          {/* Actions */}
          <div style={{display:'flex',gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:'12px',border:`1.5px solid ${C.border}`,borderRadius:10,background:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,color:C.textMd,fontFamily:F}}>Cancel</button>
            <button onClick={()=>onExport({format,quality,pages,jpegQuality:jpegQ/100})} disabled={isExporting}
              style={{flex:2,padding:'12px',border:'none',borderRadius:10,background:isExporting?'#94A3B8':C.accent,color:'#fff',fontSize:14,fontWeight:800,cursor:isExporting?'not-allowed':'pointer',fontFamily:F,transition:'all .13s'}}>
              {isExporting?'Exporting…':'Export '+format.toUpperCase().replace('-',' ')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}