import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { documentId, documentType, sessionData, pageStats, totalViews, avgEngagement } = await req.json()

    const prompt = `You are an AI assistant inside a document tracking platform called Folio. You analyze how viewers engage with documents and give the sender specific, confident, actionable advice.

Here is the engagement data for a ${documentType ?? 'document'}:

- Total views: ${totalViews}
- Average engagement score: ${avgEngagement}/100
- Recent session data: ${JSON.stringify(sessionData?.slice(0, 5), null, 2)}
- Page attention stats (seconds per page on average): ${JSON.stringify(pageStats, null, 2)}

Generate 2-3 specific insights. Each insight must be one of these types:
- "action" - a specific next action the sender should take RIGHT NOW
- "benchmark" - how this document compares to what typically converts
- "anomaly" - something unusual in the data worth flagging
- "engagement" - a pattern in how viewers are engaging

Respond ONLY with a JSON array. No preamble, no markdown, no explanation outside the JSON.
Format:
[
  {
    "type": "action" | "benchmark" | "anomaly" | "engagement",
    "priority": "critical" | "high" | "medium" | "low",
    "title": "Short, specific title (max 8 words)",
    "body": "2-3 sentence insight. Be specific and confident. Name concrete actions, time windows, or patterns. Never be vague."
  }
]`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const insights = JSON.parse(clean)

    return NextResponse.json({ insights })
  } catch (err) {
    console.error('AI insights error:', err)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
