import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const TEMPLATES: Record<string, string> = {
  pitch_deck: `You are an expert startup pitch consultant. Create a compelling pitch deck document in rich HTML.

Structure it as a narrative with these sections IN ORDER:
1. **Problem** — The pain point, with a vivid example or stat
2. **Solution** — What you've built, in one clear sentence then elaboration  
3. **Market Size** — TAM/SAM/SOM with real numbers
4. **Product** — Key features and how they work
5. **Traction** — Metrics, customers, or milestones (use placeholders if none provided)
6. **Business Model** — How you make money
7. **Go-to-Market** — First 12 months strategy
8. **Team** — Why this team wins
9. **The Ask** — How much you're raising and what it funds

Write in confident, investor-grade language. Be specific. No fluff. Use real numbers where provided.`,

  proposal: `You are an expert business proposal writer. Create a compelling proposal document in rich HTML.

Structure it with these sections:
1. **Executive Summary** — The situation, your proposed solution, and expected outcome in 3 sentences
2. **Understanding Your Challenge** — Show you understand their specific problem deeply
3. **Our Approach** — Your methodology, process, and timeline
4. **Scope of Work** — Detailed deliverables broken into phases
5. **Investment** — Pricing table with tiers or line items
6. **Why Us** — Specific proof points, not generic claims
7. **Next Steps** — Clear, specific call to action with a deadline

Write in professional but warm language. Make the client feel understood. Be specific about what they get.`,

  document: `You are an expert business writer. Create a well-structured professional document in rich HTML.

Use appropriate structure for the document type requested. Include:
- A clear opening that states the purpose
- Well-organized sections with descriptive headings  
- Concrete details, not vague generalities
- A clear conclusion or call to action

Write in clear, professional prose. Avoid jargon unless it's standard in the field.`,
}

export async function POST(req: NextRequest) {
  try {
    const { type, brief, tone = 'professional', companyName, targetAudience } = await req.json()

    const systemPrompt = TEMPLATES[type] ?? TEMPLATES.document

    const userPrompt = `Create this document based on the following brief:

Company/Project: ${companyName ?? 'Not specified'}
Target Audience: ${targetAudience ?? 'Not specified'}
Tone: ${tone}
Brief: ${brief}

CRITICAL OUTPUT RULES:
- Output ONLY valid HTML. No preamble, no explanation, no markdown fences.
- Use <h1>, <h2>, <h3> for headings
- Use <p> for paragraphs
- Use <ul>/<li> and <ol>/<li> for lists
- Use <strong> for emphasis
- Use <blockquote> for quotes or callouts
- Use <hr> to separate major sections
- Do NOT include <html>, <head>, <body>, or <style> tags
- Make it substantial — at least 600 words
- Use placeholder brackets like [Your metric here] where the user should fill in specifics`

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Stream the response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      }
    })
  } catch (err) {
    console.error('Draft error:', err)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
