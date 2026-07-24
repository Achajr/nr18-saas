export interface BrasilApiCnpj {
  cnpj?: string | null
  razao_social?: string | null
  nome_fantasia?: string | null
  email?: string | null
  ddd_telefone_1?: string | null
  ddd_telefone_2?: string | null
  telefone?: string | null
  cnae_fiscal?: string | number | null
  cnae_fiscal_descricao?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  municipio?: string | null
  uf?: string | null
  qsa?: Array<{ nome_socio?: string | null; qualificacao_socio?: string | null }>
}

type RawCnpjData = Record<string, unknown>

const GRAU_RISCO_2_PREFIXES = [
  '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15',
  '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26',
  '27', '28', '29', '30', '31', '32', '33',
]

const RESPONSAVEL_PRIORITY = [
  'presidente',
  'administrador',
  'socio-administrador',
  'sócio-administrador',
  'titular',
  'empresario',
  'empresário',
  'diretor',
]

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function formatCnpj(value: string) {
  const nums = onlyDigits(value).slice(0, 14)
  if (nums.length > 12) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`
  if (nums.length > 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`
  if (nums.length > 5) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`
  if (nums.length > 2) return `${nums.slice(0, 2)}.${nums.slice(2)}`
  return nums
}

export function formatCep(value?: string | null) {
  const nums = onlyDigits(value || '').slice(0, 8)
  return nums.length === 8 ? `${nums.slice(0, 5)}-${nums.slice(5)}` : nums
}

export function formatPhone(value?: string | null) {
  const nums = onlyDigits(value || '')
  if (nums.length === 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
  if (nums.length === 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`
  return value?.trim() || ''
}

export function getCnaeCode(data: BrasilApiCnpj) {
  return data.cnae_fiscal?.toString() || ''
}

export function calculateGrauRisco(cnaeCode: string) {
  if (['41', '42', '43'].some(prefix => cnaeCode.startsWith(prefix))) return '3'
  if (GRAU_RISCO_2_PREFIXES.some(prefix => cnaeCode.startsWith(prefix))) return '2'
  return '1'
}

export function formatEndereco(data: BrasilApiCnpj) {
  return [data.logradouro, data.numero, data.complemento].filter(Boolean).join(', ')
}

export function getResponsavelFromQsa(data: BrasilApiCnpj) {
  const socios = data.qsa?.filter(socio => socio.nome_socio?.trim()) || []
  const responsavel =
    RESPONSAVEL_PRIORITY
      .map(priority => socios.find(socio => socio.qualificacao_socio?.toLowerCase().includes(priority)))
      .find(Boolean) || socios[0]

  return responsavel?.nome_socio?.trim() || ''
}

function cleanString(value: unknown) {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return ''
  return value.trim()
}

function cleanEmail(value: unknown) {
  const email = cleanString(value).toLowerCase()
  return email.includes('@') ? email : ''
}

function cleanPhone(value: unknown) {
  const phone = onlyDigits(cleanString(value))
  if (phone.length === 10 || phone.length === 11) return phone
  return ''
}

function normalizeQsa(value: unknown): BrasilApiCnpj['qsa'] {
  if (!Array.isArray(value)) return []

  const socios: NonNullable<BrasilApiCnpj['qsa']> = []

  value.forEach(item => {
    if (!item || typeof item !== 'object') return
    const socio = item as RawCnpjData
    const nome_socio = cleanString(socio.nome_socio)
    if (!nome_socio) return

    socios.push({
      nome_socio,
      qualificacao_socio: cleanString(socio.qualificacao_socio) || null,
    })
  })

  return socios
}

export function normalizeCnpjInfo(raw: unknown): BrasilApiCnpj {
  const data = raw && typeof raw === 'object' ? raw as RawCnpjData : {}
  const dddTelefone1 = cleanPhone(data.ddd_telefone_1 ?? data.telefone)
  const dddTelefone2 = cleanPhone(data.ddd_telefone_2)

  return {
    cnpj: onlyDigits(cleanString(data.cnpj)),
    razao_social: cleanString(data.razao_social || data.nome || data.name) || null,
    nome_fantasia: cleanString(data.nome_fantasia || data.fantasia) || null,
    email: cleanEmail(data.email) || null,
    ddd_telefone_1: dddTelefone1 || null,
    ddd_telefone_2: dddTelefone2 || null,
    telefone: dddTelefone1 || dddTelefone2 || null,
    cnae_fiscal: cleanString(data.cnae_fiscal || data.cnae_principal || data.cnae) || null,
    cnae_fiscal_descricao: cleanString(data.cnae_fiscal_descricao) || null,
    cep: onlyDigits(cleanString(data.cep)) || null,
    logradouro: cleanString(data.logradouro || data.endereco) || null,
    numero: cleanString(data.numero) || null,
    complemento: cleanString(data.complemento) || null,
    bairro: cleanString(data.bairro) || null,
    municipio: cleanString(data.municipio || data.cidade) || null,
    uf: cleanString(data.uf).toUpperCase() || null,
    qsa: normalizeQsa(data.qsa),
  }
}

export async function fetchCnpjInfo(cnpj: string) {
  const nums = onlyDigits(cnpj)
  if (nums.length !== 14) return null

  const res = await fetch(`/api/cnpj/${nums}`)
  if (!res.ok) throw new Error('CNPJ não encontrado')
  return res.json() as Promise<BrasilApiCnpj>
}

export interface ConsultarCnpjResult {
  cnpj: string
  name: string
  email: string
  phone: string
  cnae: string
  grau_risco: string
  cep: string
  endereco: string
  cidade: string
  uf: string
}

export async function consultarCnpj(cnpj: string): Promise<ConsultarCnpjResult> {
  const data = await fetchCnpjInfo(cnpj)
  if (!data) throw new Error('CNPJ inválido')

  const cnae = getCnaeCode(data)

  return {
    cnpj: formatCnpj(data.cnpj || cnpj),
    name: data.razao_social || data.nome_fantasia || '',
    email: data.email || '',
    phone: formatPhone(data.telefone || data.ddd_telefone_1 || data.ddd_telefone_2),
    cnae,
    grau_risco: calculateGrauRisco(cnae),
    cep: formatCep(data.cep),
    endereco: formatEndereco(data),
    cidade: data.municipio || '',
    uf: data.uf || '',
  }
}
