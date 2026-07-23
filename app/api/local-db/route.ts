import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TABLES = [
  'master_admins',
  'consultorias',
  'avaliadores',
  'empresas_clientes',
  'obras',
  'obra_empreiteiras',
  'vistorias',
  'vistoria_itens',
  'vistoria_item_empresas',
  'vistoria_fotos',
] as const

type Filter = { op: 'eq' | 'neq' | 'gte' | 'lte' | 'in'; field: string; value: any }
type QueryBody = {
  action: 'select' | 'insert' | 'update' | 'delete'
  table: string
  payload?: any
  filters?: Filter[]
  orFilters?: Filter[][]
  order?: { field: string; ascending?: boolean }
  limit?: number
  single?: boolean
  count?: 'exact'
  head?: boolean
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function delegate(table: string) {
  if (!TABLES.includes(table as any)) throw new Error('Tabela não permitida: ' + table)
  return (prisma as any)[table]
}

function cleanData(input: any): any {
  if (Array.isArray(input)) return input.map(cleanData)
  if (!input || typeof input !== 'object') return input
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

function buildWhere(filters: Filter[] = [], orFilters: Filter[][] = []): Record<string, any> {
  const where: Record<string, any> = {}
  for (const f of filters) {
    if (f.op === 'eq') where[f.field] = f.value
    if (f.op === 'neq') where[f.field] = { not: f.value }
    if (f.op === 'gte') where[f.field] = { ...(where[f.field] || {}), gte: f.value }
    if (f.op === 'lte') where[f.field] = { ...(where[f.field] || {}), lte: f.value }
    if (f.op === 'in') where[f.field] = { in: f.value }
  }
  if (orFilters.length) where.OR = orFilters.map(group => buildWhere(group))
  return where
}

function serialize(value: any): any {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serialize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]))
  }
  return value
}

async function first(table: string, where: Record<string, any>) {
  return delegate(table).findFirst({ where })
}

async function enrich(table: string, rows: any[]) {
  const records = await Promise.all(rows.map(async row => {
    const item = { ...row }

    if (table === 'avaliadores' && item.consultoria_id) {
      item.consultoria = await first('consultorias', { id: item.consultoria_id })
    }

    if (table === 'empresas_clientes' && item.avaliador_responsavel) {
      item.avaliador = await first('avaliadores', { id: item.avaliador_responsavel })
    }

    if (table === 'vistorias') {
      if (item.obra_id) {
        const obra = await first('obras', { id: item.obra_id })
        if (obra?.empresa_cliente_id) {
          obra.empresa_cliente = await first('empresas_clientes', { id: obra.empresa_cliente_id })
        }
        item.obra = obra
      }
      if (item.avaliador_id) {
        const avaliador = await first('avaliadores', { id: item.avaliador_id })
        if (avaliador?.consultoria_id) {
          avaliador.consultoria = await first('consultorias', { id: avaliador.consultoria_id })
        }
        item.avaliador = avaliador
      }
    }

    return item
  }))
  return serialize(records)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QueryBody
    const model = delegate(body.table)
    const where = buildWhere(body.filters, body.orFilters)

    if (body.action === 'select') {
      const total = body.count === 'exact' ? await model.count({ where }) : null
      if (body.head) return json({ data: null, error: null, count: total })

      const args: any = { where }
      if (body.order?.field) args.orderBy = { [body.order.field]: body.order.ascending === false ? 'desc' : 'asc' }
      if (body.limit) args.take = body.limit
      const rows = await model.findMany(args)
      const data = await enrich(body.table, rows)
      return json({ data: body.single ? (data[0] || null) : data, error: null, count: total })
    }

    if (body.action === 'insert') {
      const data = cleanData(body.payload)
      const created = Array.isArray(data)
        ? await model.createManyAndReturn({ data })
        : await model.create({ data })
      const rows = Array.isArray(created) ? created : [created]
      const enriched = await enrich(body.table, rows)
      return json({ data: body.single ? enriched[0] : enriched, error: null, count: null })
    }

    if (body.action === 'update') {
      await model.updateMany({ where, data: cleanData(body.payload) })
      const rows = await model.findMany({ where })
      const data = await enrich(body.table, rows)
      return json({ data: body.single ? (data[0] || null) : data, error: null, count: null })
    }

    if (body.action === 'delete') {
      const rows = await model.findMany({ where })
      await model.deleteMany({ where })
      const data = await enrich(body.table, rows)
      return json({ data: body.single ? (data[0] || null) : data, error: null, count: null })
    }

    return json({ data: null, error: { message: 'Ação inválida' }, count: null }, 400)
  } catch (err: any) {
    return json({ data: null, error: { message: err.message || 'Erro no banco local' }, count: null }, 500)
  }
}
