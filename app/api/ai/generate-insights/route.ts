export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { sessionId, documentId } = await req.json()

    // Load session + document + all sessions for this doc
    const [{ data: session }, { data: doc }, { data: allSessions }, { data: pageEvents }] = await Promise.all([
      supabase.from('view_sessions').select('*').eq('id', sessionId).single(),
      supabase.from('documents').select('*').eq('id', documentId).single(),
      supabase.from('view_sessions').select('*').eq('document_id', documentId).order('started_at', { ascending: false }).limit(20),
      supabase.from('page_events').select('*').eq('document_id', documentId).eq('session_id', sessionId),
    ])

    if (!session || !doc) return NextResponse.json({ ok: false })

    // Compute page stats from events
    const pageStats: Record<string, number> = {}
    pageEvents?.filter(e => e.event_type === 'exit').forEach(e => {
      pageStats[`Page ${e.page_number}`] = (pageStats[`Page ${e.page_number}`] ?? 0) + e.time_spent_seconds
    })

    const wasForwarded = !!session.parent_session_id
    const totalViews = allSessions?.length ?? 0
    const avgEngagement = allSessions?.length
      ? Math.round(allSessions.reduce((s, v) => s + (v.engagement_score ?? 0), 0) / allSessions.length)
      : 0

    const prompt = `You are an AI analyst inside Folio, a document intelligence platform. Analyze this viewing session and return 1-2 specific, actionable insights for the document sender.

Document: "${doc.title}" (${doc.type})
Total views: ${totalViews}
Average engagement across all views: ${avgEngagement}/100

THIS SESSION:
- Viewer: ${session.viewer_name ?? session.viewer_email ?? 'Anonymous'}
- Time spent: ${session.total_time_seconds}s total
- Pages viewed: ${session.pages_viewed}
- Completion rate: ${Math.round((session.completion_rate ?? 0) * 100)}%
- Engagement score: ${session.engagement_score}/100
- Forwarded: ${wasForwarded ? 'YES - came from a forwarded link' : 'No'}
- Device: ${session.device_type ?? 'unknown'}
- Page attention (seconds per page): ${JSON.stringify(pageStats)}

Return a JSON array of 1-2 insights. ONLY JSON, nothing else:
[
  {
    "type": "action" | "benchmark" | "anomaly" | "engagement",
    "priority": "critical" | "high" | "medium" | "low",
    "title": "Short punchy title (max 7 words)",
    "body": "Specific, confident, actionable insight in 2-3 sentences. Name the viewer. Reference specific numbers. Tell the sender exactly what to do or what it means."
  }
]

Escalate priority to "critical" if: engagement > 80, forwarded=true, or completion=100%.
Use "high" if engagement 60-79.
Use "medium" if engagement 40-59.
Use "low" if engagement < 40.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const insights: Array<{ type: string; priority: string; title: string; body: string }> = JSON.parse(clean)

    // Store insights in DB
    if (insights.length > 0) {
      await supabase.from('ai_insights').insert(
        insights.map(ins => ({
          document_id: documentId,
          session_id: sessionId,
          insight_type: ins.type,
          priority: ins.priority,
          title: ins.title,
          body: ins.body,
          is_read: false,
        }))
      )
    }

    return NextResponse.json({ ok: true, count: insights.length })
  } catch (err) {
    console.error('Generate insights error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
