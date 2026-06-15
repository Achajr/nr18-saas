#!/usr/bin/env node

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {}

  return Object.fromEntries(
    fs.readFileSync(path, 'utf8')
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        const key = line.slice(0, index)
        const value = line.slice(index + 1).replace(/^['"]|['"]$/g, '')
        return [key, value]
      })
  )
}

function parseArgs() {
  const args = {}
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith('--')) continue
    const [key, ...rest] = arg.slice(2).split('=')
    args[key] = rest.join('=')
  }
  return args
}

function requireArg(args, key) {
  if (!args[key]) {
    throw new Error(`Informe --${key}=...`)
  }
  return args[key]
}

async function findUserByEmail(supabase, email) {
  let page = 1
  const perPage = 100

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < perPage) return null
    page += 1
  }

  return null
}

async function createOrResetUser(supabase, { email, password, name }) {
  const existing = await findUserByEmail(supabase, email)

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })
    if (error) throw error
    return data.user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (error) throw error
  return data.user
}

async function upsertMaster(supabase, user, name) {
  const payload = { id: user.id, full_name: name, email: user.email }
  const { error } = await supabase.from('master_admins').upsert(payload, { onConflict: 'id' })

  if (!error) return
  if (!error.message.includes('email')) throw error

  const { error: retryError } = await supabase
    .from('master_admins')
    .upsert({ id: user.id, full_name: name }, { onConflict: 'id' })
  if (retryError) throw retryError
}

async function ensureConsultoria(supabase, name, userId) {
  const { data: existing, error: selectError } = await supabase
    .from('consultorias')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing?.id) return existing.id

  const { data, error } = await supabase
    .from('consultorias')
    .insert({
      name,
      plan: 'enterprise',
      max_avaliadores: 9999,
      max_empresas: 9999,
      max_obras: 9999,
      active: true,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

async function upsertAvaliador(supabase, user, { name, role, consultoria }) {
  const consultoriaId = await ensureConsultoria(supabase, consultoria, user.id)
  const { error } = await supabase.from('avaliadores').upsert({
    id: user.id,
    consultoria_id: consultoriaId,
    full_name: name,
    email: user.email,
    role,
    active: true,
  }, { onConflict: 'id' })

  if (error) throw error
}

async function main() {
  const fileEnv = readEnvFile('.env.local')
  const env = { ...fileEnv, ...process.env }
  const args = parseArgs()

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const email = requireArg(args, 'email')
  const password = requireArg(args, 'password')
  const name = args.name || 'Administrador'
  const role = args.role || 'master'
  const consultoria = args.consultoria || 'Consultoria Principal'

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL nao encontrado em .env.local')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY nao encontrado no ambiente')
  if (!['master', 'gestor', 'avaliador'].includes(role)) {
    throw new Error('--role deve ser master, gestor ou avaliador')
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const user = await createOrResetUser(supabase, { email, password, name })

  if (role === 'master') {
    await upsertMaster(supabase, user, name)
  } else {
    await upsertAvaliador(supabase, user, { name, role, consultoria })
  }

  console.log(`Acesso pronto: ${email} (${role})`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
