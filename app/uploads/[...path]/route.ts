import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const ROOT = path.join(process.cwd(), 'public', 'uploads')

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

function safeUploadPath(parts: string[]) {
  const relative = path.normalize(path.join(...parts)).replace(/^\.\.(\/|\\|$)/, '')
  const full = path.join(ROOT, relative)
  if (!full.startsWith(ROOT)) throw new Error('Caminho inválido')
  return full
}

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const full = safeUploadPath(params.path || [])
    const file = await readFile(full)
    const contentType = MIME[path.extname(full).toLowerCase()] || 'application/octet-stream'

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Arquivo não encontrado', { status: 404 })
  }
}
