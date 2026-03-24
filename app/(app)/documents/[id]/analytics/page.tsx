'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatRelativeTime, formatDuration, getEngagementLabel } from '@/lib/utils'
import { StatCard, Badge, Avatar, EmptyState } from '@/components/ui'
import ForwardingGraph from '@/components/analytics/ForwardingGraph'
import type { Database } from '@/lib/supabase/client'

type Document  = Database['public']['Tables']['documents']['Row']
type Session   = Database['public']['Tables']['view_sessions']['Row']
type PageEvent = Database['public']['Tables']['page_events']['Row']

const TABS = ['Sessions','Page heatmap','Forwarding','Insights'] as const
type Tab = typeof TABS[number]

export default function AnalyticsPage({ params }: { params: { id: string } }) {
  const [doc,      setDoc]      = useState<Document | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [events,   setEvents]   = useState<PageEvent[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [selected, setSelected] = useState<Session | null>(null)
  const [tab,      setTab]      = useState<Tab>('Sessions')
  const [loading,  setLoading]  = useState(true)
  const [exporting,setExporting]= useState(false)
  const chanRef = useRef<ReturnType<typeof supabase.channel>|null>(null)

  useEffect(() => { loadAll(); return () => { chanRef.current?.unsubscribe() } }, [params.id])

  async function loadAll() {
    const [{ data: d },{ data: s },{ data: e },{ data: i }] = await Promise.all([
      supabase.from('documents').select('*').eq('id', params.id).single(),
      supabase.from('view_sessions').select('*').eq('document_id', params.id).order('started_at',{ ascending: false }),
      supabase.from('page_events').select('*').eq('document_id', params.id),
      supabase.from('ai_insights').select('*').eq('document_id', params.id).order('created_at',{ ascending: false }),
    ])
    setDoc(d); setSessions(s??[]); setEvents(e??[]); setInsights(i??[])
    setLoading(false)
    const ch = supabase.channel(`analytics-${params.id}`)
      .on('postgres_changes',{ event:'INSERT', schema:'public', table:'view_sessions', filter:`document_id=eq.${params.id}` }, p => setSessions(prev => [p.new as Session,...prev]))
      .on('postgres_changes',{ event:'UPDATE', schema:'public', table:'view_sessions', filter:`document_id=eq.${params.id}` }, p => setSessions(prev => prev.map(s => s.id===p.new.id ? p.new as Session : s)))
      .on('postgres_changes',{ event:'INSERT', schema:'public', table:'ai_insights',   filter:`document_id=eq.${params.id}` }, p => setInsights(prev => [p.new,...prev]))
      .subscribe()
    chanRef.current = ch
  }

  async function exportCSV() {
    setExporting(true)
    const res  = await fetch(`/api/export?documentId=${params.id}`)
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `folio-analytics-${params.id}.csv`; a.click()
    URL.revokeObjectURL(url); setExporting(false)
  }

  const pageStats    = computePageStats(events)
  const maxTime      = Math.max(...Object.values(pageStats).map(p=>p.avgTime),1)
  const totalViews   = sessions.length
  const avgTime      = totalViews ? Math.round(sessions.reduce((s,v)=>s+v.total_time_seconds,0)/totalViews) : 0
  const avgCompl     = totalViews ? Math.round(sessions.reduce((s,v)=>s+v.completion_rate,0)/totalViews*100) : 0
  const avgEng       = totalViews ? Math.round(sessions.reduce((s,v)=>s+v.engagement_score,0)/totalViews) : 0
  const unread       = insights.filter(i=>!i.is_read).length

  if (!doc && !loading) return <div style={{ padding:40, textAlign:'center', color:'#9C9389' }}>Document not found</div>

  return (
    <div style={{ padding:'32px 40px', maxWidth:1200, margin:'0 auto', width:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Link href={`/documents/${params.id}`} style={{ color:'#9C9389', textDecoration:'none', display:'flex', alignItems:'center', gap:4, fontSize:13 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {doc?.title}
          </Link>
          <span style={{ color:'#E5E0D8' }}>/</span>
          <h1 style={{ fontFamily:"'DM Serif Display', serif", fontSize:26, color:'#1C1917', margin:0, letterSpacing:'-0.02em' }}>Analytics</h1>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#16A34A', fontWeight:500 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#16A34A', display:'inline-block' }}/>Live
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link href={`/documents/${params.id}/present`}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'white', border:'1px solid #E5E0D8', borderRadius:9, fontSize:13, color:'#6B6559', textDecoration:'none', fontWeight:500 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Present
          </Link>
          <button onClick={exportCSV} disabled={exporting}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'white', border:'1px solid #E5E0D8', borderRadius:9, fontSize:13, color:'#6B6559', cursor:'pointer', fontFamily:'inherit', fontWeight:500, opacity:exporting?0.6:1 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v7M4 7l2.5 2.5L9 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10.5v1a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:28 }}>
        <StatCard label="Total views"     value={totalViews}                   />
        <StatCard label="Avg read time"   value={formatDuration(avgTime)}      />
        <StatCard label="Avg completion"  value={`${avgCompl}%`}               />
        <StatCard label="Avg engagement"  value={`${avgEng}/100`}              />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid #E5E0D8', marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'8px 18px', background:'none', border:'none', borderBottom: tab===t ? '2px solid #DC6B19' : '2px solid transparent', cursor:'pointer', fontSize:13, fontWeight: tab===t ? 600 : 400, color: tab===t ? '#1C1917' : '#9C9389', fontFamily:'inherit', marginBottom:-1, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
            {t}
            {t==='Insights' && unread>0     && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', background:'#DC6B19', color:'white', borderRadius:99 }}>{unread}</span>}
            {t==='Sessions' && totalViews>0 && <span style={{ fontSize:10, padding:'1px 6px', background:'#F5F3EF', color:'#9C9389', borderRadius:99 }}>{totalViews}</span>}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {tab==='Sessions' && (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap:20, alignItems:'start' }}>
          <div>
            {sessions.length===0
              ? <EmptyState icon="👁" title="No views yet" description="Share your document to start collecting engagement data" />
              : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {sessions.map(s => <SessionRow key={s.id} session={s} selected={selected?.id===s.id} onSelect={setSelected} />)}
                </div>
            }
          </div>
          {selected && <SessionDetail session={selected} />}
        </div>
      )}

      {/* Heatmap */}
      {tab==='Page heatmap' && (
        <div style={{ maxWidth:640 }}>
          {Object.keys(pageStats).length===0
            ? <EmptyState icon="🗺" title="No page data yet" description="Page attention appears after viewers engage with your document" />
            : <>
                <div style={{ background:'white', border:'1px solid #E5E0D8', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                  {Object.entries(pageStats).sort(([a],[b])=>Number(a)-Number(b)).map(([pg,stat],i,arr)=>{
                    const x   = stat.avgTime/maxTime
                    const bg  = x>.8?'#FEE2E2':x>.5?'#FFF3E8':x>.2?'#FFFBEB':'#F5F3EF'
                    const bar = x>.8?'#DC2626':x>.5?'#DC6B19':x>.2?'#D97706':'#CBD5E1'
                    return (
                      <div key={pg} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', background:bg, borderBottom: i<arr.length-1?'1px solid rgba(0,0,0,0.04)':'none' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#9C9389', width:54, flexShrink:0 }}>Page {pg}</span>
                        <div style={{ flex:1, height:8, background:'rgba(0,0,0,0.06)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${x*100}%`, background:bar, borderRadius:4, transition:'width 0.5s ease' }}/>
                        </div>
                        <span style={{ fontSize:13, color:'#1C1917', fontWeight:500, width:52, textAlign:'right', flexShrink:0 }}>{formatDuration(stat.avgTime)}</span>
                        <span style={{ fontSize:12, color:'#9C9389', width:42, textAlign:'right', flexShrink:0 }}>{stat.views}×</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                  {[{c:'#DC2626',l:'Hotspot (top 20%)'},{c:'#DC6B19',l:'Strong (50–80%)'},{c:'#D97706',l:'Moderate (20–50%)'},{c:'#CBD5E1',l:'Low'}].map(l=>(
                    <div key={l.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:l.c }}/>
                      <span style={{ fontSize:11, color:'#9C9389' }}>{l.l}</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      )}

      {/* Forwarding graph */}
      {tab==='Forwarding' && (
        <div style={{ maxWidth:800 }}>
          <p style={{ fontSize:13, color:'#6B6559', marginBottom:20, lineHeight:1.6 }}>
            When a viewer forwards your link to someone else, a new connected node appears below them. Circle colour = engagement score. A deep forwarding tree means your document is actively circulating inside an organisation.
          </p>
          <ForwardingGraph sessions={sessions} />
          {sessions.some(s=>s.parent_session_id) && (
            <div style={{ marginTop:20, background:'#FFF3E8', border:'1px solid #FED7AA', borderRadius:12, padding:'14px 16px' }}>
              <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, color:'#DC6B19' }}>🔗 Forwarding detected</p>
              <p style={{ margin:0, fontSize:13, color:'#6B6559', lineHeight:1.5 }}>
                {sessions.filter(s=>s.parent_session_id).length} view{sessions.filter(s=>s.parent_session_id).length!==1?'s':''} came from a forwarded link. This is a strong signal — follow up with the original recipient now.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {tab==='Insights' && (
        <div style={{ maxWidth:760 }}>
          {insights.length===0
            ? <EmptyState icon="💡" title="No insights yet" description="AI insights appear automatically after viewers engage with your document" />
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {insights.map(ins => <InsightCard key={ins.id} insight={ins} onRead={async(id)=>{
                  await supabase.from('ai_insights').update({ is_read:true }).eq('id',id)
                  setInsights(prev=>prev.map(i=>i.id===id?{...i,is_read:true}:i))
                }}/>)}
              </div>
          }
        </div>
      )}
    </div>
  )
}

function SessionRow({ session, selected, onSelect }: { session:Session; selected:boolean; onSelect:(s:Session)=>void }) {
  const name = session.viewer_name ?? session.viewer_email ?? 'Anonymous viewer'
  const eng  = getEngagementLabel(session.engagement_score)
  const live = !session.ended_at
  return (
    <div onClick={()=>onSelect(session)}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:selected?'#FFF3E8':'white', border:`1px solid ${selected?'#FED7AA':'#E5E0D8'}`, borderRadius:10, cursor:'pointer', transition:'all 0.1s' }}
      onMouseEnter={e=>{ if(!selected)(e.currentTarget as HTMLElement).style.background='#FAFAF8' }}
      onMouseLeave={e=>{ if(!selected)(e.currentTarget as HTMLElement).style.background='white' }}>
      <Avatar name={name} size="sm"/>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:'0 0 1px', fontSize:13, fontWeight:500, color:'#1C1917', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
        <p style={{ margin:0, fontSize:11, color:'#9C9389' }}>{formatRelativeTime(session.started_at)} · {formatDuration(session.total_time_seconds)}</p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {live && <span style={{ fontSize:10, fontWeight:600, color:'#16A34A', display:'flex', alignItems:'center', gap:3 }}><span style={{ width:5,height:5,borderRadius:'50%',background:'#16A34A',display:'inline-block'}}/>Live</span>}
        {session.parent_session_id && <span style={{ fontSize:10, color:'#DC6B19', fontWeight:600 }}>↗ Fwd</span>}
        <span style={{ fontSize:12, fontWeight:600, color:eng.color }}>{session.engagement_score}/100</span>
      </div>
    </div>
  )
}

function SessionDetail({ session }: { session: Session }) {
  return (
    <div style={{ background:'white', border:'1px solid #E5E0D8', borderRadius:12, padding:'18px', position:'sticky', top:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <Avatar name={session.viewer_name ?? session.viewer_email ?? 'A'} size="md"/>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#1C1917' }}>{session.viewer_name ?? session.viewer_email ?? 'Anonymous'}</p>
          <p style={{ margin:0, fontSize:12, color:'#9C9389' }}>{formatRelativeTime(session.started_at)}</p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        {[
          { label:'Time',       val:formatDuration(session.total_time_seconds) },
          { label:'Pages',      val:`${session.pages_viewed}` },
          { label:'Completion', val:`${Math.round(session.completion_rate*100)}%` },
          { label:'Engagement', val:`${session.engagement_score}/100` },
          { label:'Device',     val:session.device_type??'—' },
          { label:'Location',   val:session.viewer_location??'—' },
        ].map(item=>(
          <div key={item.label} style={{ background:'#F5F3EF', borderRadius:8, padding:'8px 10px' }}>
            <p style={{ margin:'0 0 1px', fontSize:10, color:'#9C9389', textTransform:'uppercase', letterSpacing:'0.04em' }}>{item.label}</p>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color:'#1C1917' }}>{item.val}</p>
          </div>
        ))}
      </div>
      {session.viewer_email && (
        <a href={`mailto:${session.viewer_email}`}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'8px', background:'#FFF3E8', border:'1px solid #FED7AA', borderRadius:9, fontSize:13, color:'#DC6B19', fontWeight:500, textDecoration:'none', marginBottom:10, boxSizing:'border-box' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 4l5.5 4L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Follow up via email
        </a>
      )}
      {session.parent_session_id && (
        <div style={{ padding:'8px 10px', background:'#FFF3E8', border:'1px solid #FED7AA', borderRadius:8 }}>
          <p style={{ margin:0, fontSize:12, color:'#DC6B19', fontWeight:500 }}>🔗 Came via forwarded link</p>
          <p style={{ margin:'2px 0 0', fontSize:11, color:'#9C9389' }}>Not the original recipient</p>
        </div>
      )}
    </div>
  )
}

function InsightCard({ insight, onRead }: { insight: any; onRead:(id:string)=>void }) {
  const icons: Record<string,string> = { action:'💡', benchmark:'📊', anomaly:'⚡', engagement:'👁' }
  const border = insight.priority==='critical'?'#FCA5A5': insight.priority==='high'?'#FED7AA':'#E5E0D8'
  return (
    <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px', display:'flex', gap:12 }}
      onMouseEnter={()=>{ if(!insight.is_read) onRead(insight.id) }}>
      <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{icons[insight.insight_type]??'📊'}</span>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#1C1917', flex:1 }}>{insight.title}</p>
          <Badge variant={insight.priority==='critical'?'danger':insight.priority==='high'?'warning':insight.priority==='medium'?'brand':'default'}>{insight.priority}</Badge>
          {!insight.is_read && <div style={{ width:7, height:7, borderRadius:'50%', background:'#DC6B19', flexShrink:0 }}/>}
        </div>
        <p style={{ margin:'0 0 6px', fontSize:13, color:'#6B6559', lineHeight:1.6 }}>{insight.body}</p>
        <p style={{ margin:0, fontSize:11, color:'#C4BDB4' }}>{formatRelativeTime(insight.created_at)}</p>
      </div>
    </div>
  )
}

function computePageStats(evts: PageEvent[]): Record<string,{avgTime:number; views:number}> {
  const by: Record<string,{total:number; count:number}> = {}
  evts.filter(e=>e.event_type==='exit').forEach(e=>{
    const k = String(e.page_number)
    if(!by[k]) by[k]={total:0,count:0}
    by[k].total += e.time_spent_seconds; by[k].count++
  })
  return Object.fromEntries(Object.entries(by).map(([k,v])=>[k,{avgTime:Math.round(v.total/v.count), views:v.count}]))
}
