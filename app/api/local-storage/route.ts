import { NextRequest, NextResponse } from 'next/server'
import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'

const ROOT = path.join(process.cwd(), 'public', 'uploads')

function safePath(bucket: string, storagePath: string) {
  const normalized = path.normalize(path.join(bucket, storagePath)).replace(/^\.\.(\/|\\|$)/, '')
  const full = path.join(ROOT, normalized)
  if (!full.startsWith(ROOT)) throw new Error('Caminho inválido')
  return full
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const bucket = String(formData.get('bucket') || '')
    const storagePath = String(formData.get('path') || '')
    const file = formData.get('file')
    if (!bucket || !storagePath || !(file instanceof File)) {
      return NextResponse.json({ error: { message: 'Upload inválido' } }, { status: 400 })
    }

    const full = safePath(bucket, storagePath)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, Buffer.from(await file.arrayBuffer()))
    return NextResponse.json({ data: { path: storagePath }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: { message: err.message || 'Erro ao salvar arquivo' } }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const bucket = String(body.bucket || '')
    const paths = Array.isArray(body.paths) ? body.paths : []
    for (const storagePath of paths) {
      await rm(safePath(bucket, String(storagePath)), { force: true })
    }
    return NextResponse.json({ data: null, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: { message: err.message || 'Erro ao remover arquivo' } }, { status: 500 })
  }
}
