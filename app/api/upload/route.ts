import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null
    const docType = (formData.get('type') as string) || 'document'

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Upload PDF, PPTX, or DOCX.' }, { status: 400 })
    }

    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum 20MB.' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: upload, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    // Determine title from filename
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

    // Map MIME to doc type
    const typeMap: Record<string, string> = {
      'application/pdf': 'document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pitch_deck',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    }
    const resolvedType = typeMap[file.type] ?? docType

    // Create the document record
    const { data: doc, error: docError } = await supabase.from('documents').insert({
      title,
      type: resolvedType,
      user_id: userId,
      cover_emoji: resolvedType === 'pitch_deck' ? '🚀' : '📄',
      status: 'draft',
      content: `<p><strong>Uploaded file:</strong> ${file.name}</p><p>This document was uploaded from a file. The original file is stored securely and available at the link below.</p><p><a href="${publicUrl}" target="_blank">View original file</a></p>`,
    }).select().single()

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    return NextResponse.json({ documentId: doc.id, fileUrl: publicUrl, title })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

