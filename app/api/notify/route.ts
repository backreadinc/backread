import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    // Load session + document + share link + owner
    const { data: session } = await supabase
      .from('view_sessions')
      .select('*, documents(*), share_links(*)')
      .eq('id', sessionId)
      .single()

    if (!session) return NextResponse.json({ ok: false })

    const doc = (session as any).documents
    const link = (session as any).share_links

    // Get document owner
    const { data: { user } } = await supabase.auth.admin.getUserById(doc.user_id)
    if (!user?.email) return NextResponse.json({ ok: false })

    const viewerName = session.viewer_name ?? session.viewer_email ?? 'Someone'
    const viewerEmail = session.viewer_email ? ` (${session.viewer_email})` : ''
    const linkLabel = link?.label ?? 'your share link'
    const analyticsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/documents/${doc.id}/analytics`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;border:1px solid #E5E0D8;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #E5E0D8;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:28px;height:28px;background:#DC6B19;border-radius:8px;text-align:center;vertical-align:middle;">
                  <span style="color:white;font-size:14px;font-weight:700;">F</span>
                </td>
                <td style="padding-left:10px;font-size:17px;font-weight:600;color:#1C1917;letter-spacing:-0.02em;">Folio</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            <div style="display:inline-block;background:#FFF3E8;border:1px solid #FED7AA;border-radius:99px;padding:4px 12px;margin-bottom:20px;">
              <span style="font-size:12px;color:#DC6B19;font-weight:500;">👁 Document opened</span>
            </div>
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#1C1917;line-height:1.3;">${viewerName}${viewerEmail} just opened</h1>
            <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#DC6B19;">${doc.cover_emoji} ${doc.title}</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EF;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6B6559;">Via link</td>
                      <td align="right" style="padding:6px 0;font-size:13px;color:#1C1917;font-weight:500;">${linkLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6B6559;">Viewer</td>
                      <td align="right" style="padding:6px 0;font-size:13px;color:#1C1917;font-weight:500;">${viewerName}${viewerEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6B6559;">Time</td>
                      <td align="right" style="padding:6px 0;font-size:13px;color:#1C1917;font-weight:500;">${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6B6559;">Device</td>
                      <td align="right" style="padding:6px 0;font-size:13px;color:#1C1917;font-weight:500;">${session.device_type ?? 'Unknown'}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#DC6B19;border-radius:10px;">
                  <a href="${analyticsUrl}" style="display:inline-block;padding:11px 24px;color:white;font-size:14px;font-weight:500;text-decoration:none;">View full analytics →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #E5E0D8;font-size:12px;color:#9C9389;">
            You're receiving this because you shared this document with Folio. <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color:#DC6B19;text-decoration:none;">Manage notifications</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    await resend.emails.send({
      from: 'Folio <notifications@folio.so>',
      to: user.email,
      subject: `${viewerName} opened "${doc.title}"`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Notify error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
