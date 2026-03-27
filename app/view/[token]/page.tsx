'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatRelativeTime, formatDuration } from '@/lib/utils'
import type { Database } from '@/lib/supabase/client'

type Doc       = Database['public']['Tables']['documents']['Row']
type Session   = Database['public']['Tables']['view_sessions']['Row']
type PageEvent = Database['public']['Tables']['page_events']['Row']

const C = {
  bg:'#DEDAD4', panel:'#FFFFFF', hover:'#F5F3F0',
  border:'#D4CFC9', borderMd:'#C2BCB5',
  accent:'#4F46E5', accentLt:'#EEF2FF', accentMd:'#C7D2FE',
  text:'#111111', textMd:'#3D3D3D', textSm:'#6B6B6B',
  green:'#10B981', red:'#EF4444', amber:'#F59E0B',
}
const F  = "'Inter', system-ui, sans-serif"
const Fm = "'JetBrains Mono', monospace"
type Tab = 'sessions'|'heatmap'|'forwarding'|'insights'

function engBadge(score:number){
  if(score>=80)return{label:'Hot',      bg:'#FEE2E2',color:'#991B1B',dot:'#EF4444'}
  if(score>=60)return{label:'Engaged',  bg:'#FFF7ED',color:'#92400E',dot:'#F59E0B'}
  if(score>=40)return{label:'Warm',     bg:'#FFFBEB',color:'#78350F',dot:'#D97706'}
  if(score>=20)return{label:'Cold',     bg:'#F1F5F9',color:'#475569',dot:'#94A3B8'}
  return            {label:'Bounced',  bg:'#F8FAFC',color:'#94A3B8',dot:'#CBD5E1'}
}

function buildPageStats(evts:PageEvent[]):Record<string,{avgTime:number;views:number}>{
  const by:Record<string,{total:number;count:number}>= {}
  evts.filter(e=>e.event_type==='exit').forEach(e=>{
    const k=String(e.page_number)
    if(!by[k])by[k]={total:0,count:0}
    by[k].total+=e.time_spent_seconds; by[k].count++
  })
  return Object.fromEntries(Object.entries(by).map(([k,v])=>[k,{avgTime:Math.round(v.total/v.count),views:v.count}]))
}

function Empty({icon,title,sub}:{icon:string;title:string;sub:string}){
  return(
    <div style={{padding:'60px 20px',textAlign:'center',background:C.panel,borderRadius:14,border:`1px solid ${C.border}`}}>
      <div style={{fontSize:40,marginBottom:12}}>{icon}</div>
      <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6,fontFamily:F}}>{title}</div>
      <div style={{fontSize:13,color:C.textSm,lineHeight:1.6,fontFamily:F}}>{sub}</div>
    </div>
  )
}

export default function AnalyticsPage({params}:{params:{id:string}}){
  const [doc,setDoc]         = useState<Doc|null>(null)
  const [sessions,setSessions] = useState<Session[]>([])
  const [events,setEvents]   = useState<PageEvent[]>([])
  const [insights,setInsights] = useState<any[]>([])
  const [selected,setSelected] = useState<Session|null>(null)
  const [tab,setTab]         = useState<Tab>('sessions')
  const [loading,setLoading] = useState(true)
  const [exporting,setExporting]=useState(false)
  const chanRef = useRef<any>(null)

  useEffect(()=>{loadAll();return()=>{chanRef.current?.unsubscribe()}},[params.id]) // eslint-disable-line

  async function loadAll(){
    const [r1,r2,r3,r4]=await Promise.all([
      supabase.from('documents').select('*').eq('id',params.id).single(),
      supabase.from('view_sessions').select('*').eq('document_id',params.id).order('started_at',{ascending:false}),
      supabase.from('page_events').select('*').eq('document_id',params.id),
      supabase.from('ai_insights').select('*').eq('document_id',params.id).order('created_at',{ascending:false}),
    ])
    setDoc(r1.data); setSessions(r2.data??[]); setEvents(r3.data??[]); setInsights(r4.data??[])
    setLoading(false)
    const ch=supabase.channel(`analytics-${params.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'view_sessions',filter:`document_id=eq.${params.id}`},p=>setSessions(prev=>[p.new as Session,...prev]))
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'view_sessions',filter:`document_id=eq.${params.id}`},p=>{setSessions(prev=>prev.map(s=>s.id===p.new.id?p.new as Session:s));setSelected(prev=>prev?.id===p.new.id?{...prev,...p.new as Session}:prev)})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'ai_insights',filter:`document_id=eq.${params.id}`},p=>setInsights(prev=>[p.new,...prev]))
      .subscribe()
    chanRef.current=ch
  }

  async function exportCSV(){
    setExporting(true)
    const res=await fetch(`/api/export?documentId=${params.id}`)
    const blob=await res.blob()
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download=`folio-${params.id}.csv`;a.click()
    URL.revokeObjectURL(url);setExporting(false)
  }

  const pageStats   = buildPageStats(events)
  const totalViews  = sessions.length
  const avgTime     = totalViews?Math.round(sessions.reduce((a,s)=>a+s.total_time_seconds,0)/totalViews):0
  const avgCompl    = totalViews?Math.round(sessions.reduce((a,s)=>a+s.completion_rate,0)/totalViews*100):0
  const avgScore    = totalViews?Math.round(sessions.reduce((a,s)=>a+s.engagement_score,0)/totalViews):0
  const fwdCount    = sessions.filter(s=>s.parent_session_id).length
  const liveCount   = sessions.filter(s=>!s.ended_at).length
  const unread      = insights.filter(i=>!i.is_read).length

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:C.textSm,fontFamily:F}}>Loading…</div>

  return(
    <div style={{padding:'28px 36px',maxWidth:1200,margin:'0 auto',fontFamily:F}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Link href={`/documents/${params.id}`} style={{color:C.textSm,textDecoration:'none',display:'flex',alignItems:'center',gap:4,fontSize:13,fontWeight:500}}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 2L3 6.5l5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {doc?.title}
          </Link>
          <span style={{color:C.borderMd}}>/</span>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,margin:0,letterSpacing:'-.02em'}}>Analytics</h1>
          {liveCount>0&&<span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:C.green,background:'#F0FDF4',padding:'3px 10px',borderRadius:20,border:'1px solid #BBF7D0'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:C.green,display:'inline-block',animation:'pulse 1.5s infinite'}}/>
            {liveCount} reading now
          </span>}
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href={`/documents/${params.id}/present`} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,textDecoration:'none',fontWeight:600}}>Present</Link>
          <button onClick={exportCSV} disabled={exporting} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,cursor:'pointer',fontFamily:F,fontWeight:600,opacity:exporting?0.5:1}}>
            {exporting?'Exporting…':'↓ Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:24}}>
        {[
          {l:'Total views',    v:String(totalViews),       s:'all sessions'},
          {l:'Avg read time',  v:formatDuration(avgTime),  s:'per session'},
          {l:'Avg completion', v:`${avgCompl}%`,           s:'of pages seen'},
          {l:'Avg score',      v:`${avgScore}/100`,        s:'engagement'},
          {l:'Forwards',       v:String(fwdCount),         s:'forwarded links'},
          {l:'Live now',       v:String(liveCount),        s:'active viewers'},
        ].map(s=>(
          <div key={s.l} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:2,letterSpacing:'-.02em',fontFamily:Fm}}>{s.v}</div>
            <div style={{fontSize:11,color:C.textSm}}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,marginBottom:24}}>
        {([{id:'sessions',l:'Sessions',n:totalViews},{id:'heatmap',l:'Page Heatmap',n:0},{id:'forwarding',l:'Forwarding',n:fwdCount},{id:'insights',l:'AI Insights',n:unread}] as const).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as Tab)} style={{padding:'9px 18px',background:'none',border:'none',borderBottom:`2px solid ${tab===t.id?C.accent:'transparent'}`,cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.text:C.textMd,fontFamily:F,marginBottom:-1,display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
            {t.l}
            {t.n>0&&<span style={{fontSize:10,fontWeight:700,padding:'1px 6px',background:t.id==='insights'&&unread>0?C.accent:C.accentLt,color:t.id==='insights'&&unread>0?'#fff':C.accent,borderRadius:99}}>{t.n}</span>}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {tab==='sessions'&&(
        <div style={{display:'grid',gridTemplateColumns:selected?'1fr 308px':'1fr',gap:16,alignItems:'start'}}>
          <div>
            {sessions.length===0?<Empty icon="👁" title="No views yet" sub="Share your document to start collecting engagement data"/>:(
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 90px 72px 72px 88px',gap:8,padding:'10px 16px',borderBottom:`1px solid ${C.border}`,background:C.hover}}>
                  {['Viewer','Time','Pages','Score','Status'].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.07em',fontFamily:F}}>{h}</span>)}
                </div>
                {sessions.map((s,i)=>{
                  const badge=engBadge(s.engagement_score)
                  const isActive=selected?.id===s.id
                  return(
                    <div key={s.id} onClick={()=>setSelected(isActive?null:s)}
                      style={{display:'grid',gridTemplateColumns:'1fr 90px 72px 72px 88px',gap:8,padding:'12px 16px',borderBottom:i<sessions.length-1?`1px solid ${C.border}`:'none',cursor:'pointer',background:isActive?C.accentLt:'transparent',transition:'background .1s'}}
                      onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background=C.hover}}
                      onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background='transparent'}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6}}>
                          {s.viewer_name??s.viewer_email??'Anonymous'}
                          {!s.ended_at&&<span style={{fontSize:9,fontWeight:700,color:C.green,background:'#F0FDF4',padding:'1px 5px',borderRadius:99,border:'1px solid #BBF7D0',flexShrink:0}}>LIVE</span>}
                          {!!s.parent_session_id&&<span style={{fontSize:9,fontWeight:700,color:C.amber,background:'#FFFBEB',padding:'1px 5px',borderRadius:99,border:'1px solid #FDE68A',flexShrink:0}}>FWD</span>}
                        </div>
                        <div style={{fontSize:11,color:C.textSm,marginTop:2}}>{formatRelativeTime(s.started_at)}{s.viewer_location&&` · ${s.viewer_location}`}</div>
                      </div>
                      <span style={{fontSize:13,color:C.textMd,fontFamily:Fm,fontWeight:500,alignSelf:'center'}}>{formatDuration(s.total_time_seconds)}</span>
                      <span style={{fontSize:13,color:C.textMd,fontFamily:Fm,fontWeight:500,alignSelf:'center'}}>{s.pages_viewed}</span>
                      <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:Fm,alignSelf:'center'}}>{s.engagement_score}</span>
                      <span style={{fontSize:11,fontWeight:700,color:badge.color,background:badge.bg,padding:'2px 8px',borderRadius:99,display:'inline-flex',alignItems:'center',gap:4,height:20,width:'fit-content',alignSelf:'center'}}>
                        <span style={{width:5,height:5,borderRadius:'50%',background:badge.dot,display:'inline-block',flexShrink:0}}/>{badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {selected&&<DeepDive session={selected} events={events.filter(e=>e.session_id===selected.id)} sessions={sessions} onClose={()=>setSelected(null)}/>}
        </div>
      )}

      {/* Heatmap */}
      {tab==='heatmap'&&(
        <div style={{maxWidth:680}}>
          {Object.keys(pageStats).length===0?<Empty icon="🗺" title="No page data yet" sub="Heatmap appears after viewers engage with your document"/>:(
            <>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden',marginBottom:16}}>
                <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <h3 style={{fontSize:14,fontWeight:700,color:C.text,margin:0,fontFamily:F}}>Page Attention Heatmap</h3>
                  <span style={{fontSize:11,color:C.textSm,fontFamily:F}}>{totalViews} sessions · {Object.keys(pageStats).length} pages</span>
                </div>
                {Object.entries(pageStats).sort(([a],[b])=>Number(a)-Number(b)).map(([pg,stat],i,arr)=>{
                  const maxT=Math.max(...Object.values(pageStats).map(p=>p.avgTime),1)
                  const r=stat.avgTime/maxT
                  const h=r>.8?{bg:'#FEF2F2',bar:'#EF4444',lbl:'Hotspot'}:r>.5?{bg:'#FFF7ED',bar:'#F59E0B',lbl:'Strong'}:r>.2?{bg:'#FFFBEB',bar:'#D97706',lbl:'Moderate'}:{bg:'#F8FAFC',bar:'#CBD5E1',lbl:'Low'}
                  return(
                    <div key={pg} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 18px',background:h.bg,borderBottom:i<arr.length-1?`1px solid rgba(0,0,0,.04)`:'none'}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.textMd,width:58,flexShrink:0,fontFamily:Fm}}>Page {pg}</span>
                      <div style={{flex:1,height:8,background:'rgba(0,0,0,.06)',borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${r*100}%`,background:h.bar,borderRadius:4,transition:'width .5s ease'}}/>
                      </div>
                      <span style={{fontSize:13,color:C.text,fontWeight:600,width:52,textAlign:'right',flexShrink:0,fontFamily:Fm}}>{formatDuration(stat.avgTime)}</span>
                      <span style={{fontSize:11,color:C.textSm,width:40,textAlign:'right',flexShrink:0}}>{stat.views}×</span>
                      <span style={{fontSize:10,fontWeight:700,color:h.bar,width:60,textAlign:'right',flexShrink:0,textTransform:'uppercase',letterSpacing:'.04em',fontFamily:F}}>{h.lbl}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                {[{c:'#EF4444',l:'Hotspot'},{c:'#F59E0B',l:'Strong'},{c:'#D97706',l:'Moderate'},{c:'#CBD5E1',l:'Low'}].map(x=>(
                  <div key={x.l} style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:x.c}}/><span style={{fontSize:11,color:C.textSm,fontFamily:F}}>{x.l}</span></div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Forwarding */}
      {tab==='forwarding'&&(
        <div style={{maxWidth:800}}>
          {fwdCount===0?<Empty icon="🔗" title="No forwarding detected" sub="When your document gets shared to new viewers, the chain appears here"/>:(
            <>
              <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:12,padding:'14px 18px',marginBottom:20,display:'flex',gap:12,alignItems:'flex-start'}}>
                <span style={{fontSize:20,flexShrink:0}}>🔗</span>
                <div>
                  <p style={{margin:'0 0 3px',fontSize:13,fontWeight:700,color:'#78350F',fontFamily:F}}>Forwarding detected</p>
                  <p style={{margin:0,fontSize:13,color:'#92400E',lineHeight:1.6,fontFamily:F}}>{fwdCount} view{fwdCount!==1?'s':''} came from a forwarded link. This document is circulating inside an organisation — follow up with the original recipient now.</p>
                </div>
              </div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
                <div style={{fontSize:11,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:14,fontFamily:F}}>Share chain</div>
                {sessions.filter(s=>!s.parent_session_id).map(root=><TreeNode key={root.id} session={root} sessions={sessions} depth={0}/>)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Insights */}
      {tab==='insights'&&(
        <div style={{maxWidth:760}}>
          {insights.length===0?<Empty icon="💡" title="No insights yet" sub="AI insights appear automatically after viewers engage"/>:(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {insights.map(ins=>(
                <div key={ins.id}
                  style={{background:C.panel,border:`1px solid ${ins.priority==='critical'?'#FECACA':ins.priority==='high'?'#FDE68A':C.border}`,borderRadius:12,padding:'16px 18px',display:'flex',gap:12}}
                  onMouseEnter={async()=>{if(!ins.is_read){await supabase.from('ai_insights').update({is_read:true}).eq('id',ins.id);setInsights(prev=>prev.map(i=>i.id===ins.id?{...i,is_read:true}:i))}}}>
                  <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{ins.insight_type==='action'?'💡':ins.insight_type==='benchmark'?'📊':ins.insight_type==='anomaly'?'⚡':'👁'}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                      <p style={{margin:0,fontSize:14,fontWeight:700,color:C.text,flex:1,fontFamily:F}}>{ins.title}</p>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',background:ins.priority==='critical'?'#FEE2E2':ins.priority==='high'?'#FFF7ED':C.accentLt,color:ins.priority==='critical'?'#991B1B':ins.priority==='high'?'#92400E':C.accent,borderRadius:99,textTransform:'uppercase',letterSpacing:'.06em'}}>{ins.priority}</span>
                      {!ins.is_read&&<div style={{width:7,height:7,borderRadius:'50%',background:C.accent,flexShrink:0}}/>}
                    </div>
                    <p style={{margin:'0 0 6px',fontSize:13,color:C.textMd,lineHeight:1.65,fontFamily:F}}>{ins.body}</p>
                    <p style={{margin:0,fontSize:11,color:C.textSm,fontFamily:F}}>{formatRelativeTime(ins.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TreeNode({session,sessions,depth}:{session:Session;sessions:Session[];depth:number}){
  const children=sessions.filter(s=>s.parent_session_id===session.id)
  const badge=engBadge(session.engagement_score)
  return(
    <div style={{marginLeft:depth*24,marginBottom:4}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,width:'fit-content',maxWidth:420}}>
        {depth>0&&<span style={{fontSize:12,color:C.textSm}}>↳</span>}
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',system-ui,sans-serif"}}>{session.viewer_name??session.viewer_email??'Anonymous'}</div>
          <div style={{fontSize:11,color:C.textSm,fontFamily:"'Inter',system-ui,sans-serif"}}>{formatDuration(session.total_time_seconds)} · {formatRelativeTime(session.started_at)}</div>
        </div>
        <span style={{fontSize:11,fontWeight:700,color:badge.color,background:badge.bg,padding:'2px 8px',borderRadius:99,marginLeft:'auto',flexShrink:0}}>{badge.label}</span>
      </div>
      {children.map(c=><TreeNode key={c.id} session={c} sessions={sessions} depth={depth+1}/>)}
    </div>
  )
}

function DeepDive({session,events,sessions,onClose}:{session:Session;events:PageEvent[];sessions:Session[];onClose:()=>void}){
  const badge=engBadge(session.engagement_score)
  const pageMap=buildPageStats(events)
  const maxT=Math.max(...Object.values(pageMap).map(p=>p.avgTime),1)
  const children=sessions.filter(s=>s.parent_session_id===session.id)
  return(
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20,position:'sticky',top:20,maxHeight:'calc(100vh - 100px)',overflow:'auto'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:3,display:'flex',alignItems:'center',gap:7,fontFamily:"'Inter',system-ui,sans-serif"}}>
            {session.viewer_name??session.viewer_email??'Anonymous'}
            {!session.ended_at&&<span style={{fontSize:10,fontWeight:700,color:C.green,background:'#F0FDF4',padding:'1px 6px',borderRadius:99}}>LIVE</span>}
          </div>
          {session.viewer_email&&<div style={{fontSize:12,color:C.textSm,fontFamily:"'Inter',system-ui,sans-serif"}}>{session.viewer_email}</div>}
        </div>
        <button onClick={onClose} style={{width:26,height:26,border:`1px solid ${C.border}`,borderRadius:6,background:C.hover,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.textMd,flexShrink:0}}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:badge.bg,borderRadius:9,marginBottom:14}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:badge.dot,display:'inline-block',flexShrink:0}}/>
        <span style={{fontSize:14,fontWeight:800,color:badge.color,fontFamily:"'Inter',system-ui,sans-serif"}}>{badge.label} · {session.engagement_score}/100</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:16}}>
        {[{l:'Total time',v:formatDuration(session.total_time_seconds)},{l:'Pages seen',v:String(session.pages_viewed)},{l:'Completion',v:`${Math.round(session.completion_rate*100)}%`},{l:'Device',v:session.device_type??'—'},{l:'Location',v:session.viewer_location??'—'},{l:'First seen',v:formatRelativeTime(session.started_at)}].map(item=>(
          <div key={item.l} style={{background:C.hover,borderRadius:8,padding:'8px 10px'}}>
            <div style={{fontSize:10,fontWeight:600,color:C.textSm,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3,fontFamily:"'Inter',system-ui,sans-serif"}}>{item.l}</div>
            <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',system-ui,sans-serif"}}>{item.v}</div>
          </div>
        ))}
      </div>
      {Object.keys(pageMap).length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8,fontFamily:"'Inter',system-ui,sans-serif"}}>Page breakdown</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {Object.entries(pageMap).sort(([a],[b])=>Number(a)-Number(b)).map(([pg,stat])=>{
              const r=stat.avgTime/maxT
              const bar=r>.7?C.red:r>.4?C.amber:C.accentMd
              return(
                <div key={pg} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:C.textSm,width:46,flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>Pg {pg}</span>
                  <div style={{flex:1,height:6,background:C.hover,borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${r*100}%`,background:bar,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:11,color:C.textMd,width:38,textAlign:'right',flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>{formatDuration(stat.avgTime)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {children.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.textSm,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8,fontFamily:"'Inter',system-ui,sans-serif"}}>Forwarded to</div>
          {children.map(c=><div key={c.id} style={{padding:'8px 10px',background:C.hover,borderRadius:8,marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',system-ui,sans-serif"}}>{c.viewer_name??c.viewer_email??'Unknown'}</div>
            <div style={{fontSize:11,color:C.textSm,fontFamily:"'Inter',system-ui,sans-serif"}}>{formatRelativeTime(c.started_at)} · {formatDuration(c.total_time_seconds)}</div>
          </div>)}
        </div>
      )}
      {session.viewer_email&&(
        <a href={`mailto:${session.viewer_email}`} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'9px',background:C.accentLt,border:`1px solid ${C.accentMd}`,borderRadius:8,fontSize:13,color:C.accent,fontWeight:700,textDecoration:'none',fontFamily:"'Inter',system-ui,sans-serif"}}>
          ✉ Follow up via email
        </a>
      )}
    </div>
  )
}