import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSVRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCSV).join(',')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const documentId = searchParams.get('documentId')
  if (!documentId) return new Response('Missing documentId', { status: 400 })

  const [{ data: doc }, { data: sessions }, { data: pageEvents }] = await Promise.all([
    supabase.from('documents').select('*').eq('id', documentId).single(),
    supabase.from('view_sessions').select('*').eq('document_id', documentId).order('started_at', { ascending: false }),
    supabase.from('page_events').select('*').eq('document_id', documentId).order('timestamp', { ascending: true }),
  ])

  if (!doc) return new Response('Document not found', { status: 404 })

  const lines: string[] = []

  // ---- Document summary ----
  lines.push('DOCUMENT SUMMARY')
  lines.push(toCSVRow(['Title', doc.title]))
  lines.push(toCSVRow(['Type', doc.type]))
  lines.push(toCSVRow(['Status', doc.status]))
  lines.push(toCSVRow(['Total views', doc.total_views]))
  lines.push(toCSVRow(['Total time read (seconds)', doc.total_time_seconds]))
  lines.push(toCSVRow(['Created', doc.created_at]))
  lines.push('')

  // ---- Sessions ----
  lines.push('VIEW SESSIONS')
  lines.push(toCSVRow([
    'Session ID', 'Viewer name', 'Viewer email', 'Started at', 'Ended at',
    'Total time (s)', 'Pages viewed', 'Completion %', 'Engagement score',
    'Device', 'Location', 'Forwarded from', 'Referrer',
  ]))
  for (const s of sessions ?? []) {
    lines.push(toCSVRow([
      s.id,
      s.viewer_name,
      s.viewer_email,
      s.started_at,
      s.ended_at,
      s.total_time_seconds,
      s.pages_viewed,
      Math.round((s.completion_rate ?? 0) * 100),
      s.engagement_score,
      s.device_type,
      s.viewer_location,
      s.parent_session_id ? 'Yes' : 'No',
      s.referrer,
    ]))
  }
  lines.push('')

  // ---- Page events ----
  lines.push('PAGE EVENTS')
  lines.push(toCSVRow(['Session ID', 'Page number', 'Event type', 'Time spent (s)', 'Scroll depth %', 'Timestamp']))
  for (const e of pageEvents ?? []) {
    lines.push(toCSVRow([
      e.session_id,
      e.page_number,
      e.event_type,
      e.time_spent_seconds,
      Math.round((e.scroll_depth ?? 0) * 100),
      e.timestamp,
    ]))
  }

  const csv = lines.join('\n')
  const filename = `folio-analytics-${doc.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}
