export type DadosCnpj = {
  name: string
  cnpj: string
  email: string
  phone: string
  endereco: string
  cidade: string
  uf: string
  cep: string
  cnae: string
  grau_risco: string
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function formatCnpj(value: string) {
  const nums = onlyDigits(value).slice(0, 14)
  if (nums.length <= 2) return nums
  if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`
  if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`
  if (nums.length <= 12) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`
  return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`
}

export function formatCep(value: string) {
  const nums = onlyDigits(value).slice(0, 8)
  return nums.length > 5 ? `${nums.slice(0, 5)}-${nums.slice(5)}` : nums
}

export function inferirGrauRiscoPorCnae(cnae: string) {
  const codigo = normalizarCodigoCnae(cnae)
  const divisao = Number(codigo.slice(0, 2))
  if (!divisao) return '3'

  if (
    (divisao >= 5 && divisao <= 9) ||
    [19, 20, 24, 35, 37, 38, 39, 50, 51].includes(divisao)
  ) return '4'

  if (
    (divisao >= 10 && divisao <= 33) ||
    [36, 41, 42, 43, 49, 52, 53, 61, 86].includes(divisao)
  ) return '3'

  if (
    (divisao >= 1 && divisao <= 3) ||
    (divisao >= 45 && divisao <= 47) ||
    [55, 56].includes(divisao) ||
    (divisao >= 58 && divisao <= 66) ||
    divisao === 68 ||
    (divisao >= 77 && divisao <= 82) ||
    [85, 87, 88, 95, 96].includes(divisao)
  ) return '2'

  return '1'
}

export function normalizarCodigoCnae(cnae: string) {
  const nums = onlyDigits(cnae)
  if (!nums) return ''
  return nums.padStart(7, '0').slice(0, 7)
}

export function formatCnae(cnae: string) {
  const codigo = normalizarCodigoCnae(cnae)
  if (codigo.length !== 7) return cnae
  return `${codigo.slice(0, 2)}.${codigo.slice(2, 5)}-${codigo.slice(6)}`
}

function montarEndereco(data: any) {
  return [data.logradouro, data.numero, data.complemento, data.bairro]
    .filter(Boolean)
    .join(', ')
}

function montarTelefone(data: any) {
  const telefone = data.ddd_telefone_1 || data.ddd_telefone_2 || ''
  return String(telefone || '').trim()
}

export async function consultarCnpj(cnpj: string): Promise<DadosCnpj> {
  const nums = onlyDigits(cnpj)
  if (nums.length !== 14) throw new Error('Informe um CNPJ válido com 14 dígitos.')

  const endpoint = typeof window === 'undefined'
    ? `https://brasilapi.com.br/api/cnpj/v1/${nums}`
    : `/api/cnpj/${nums}`

  const res = await fetch(endpoint, {
    headers: {
      accept: 'application/json',
      'user-agent': 'NR18Check/1.0',
    },
  })
  if (!res.ok) throw new Error('CNPJ não encontrado na base pública.')

  const data = await res.json()
  return normalizarDadosCnpj(data)
}

export function normalizarDadosCnpj(data: any): DadosCnpj {
  if (data?.name && data?.cnpj && data?.grau_risco) return data as DadosCnpj

  const cnaeCodigo = normalizarCodigoCnae(String(data.cnae_fiscal || ''))
  const cnaeDescricao = String(data.cnae_fiscal_descricao || '').trim()
  const cnae = [formatCnae(cnaeCodigo), cnaeDescricao].filter(Boolean).join(' - ')

  return {
    name: data.razao_social || data.nome_fantasia || '',
    cnpj: formatCnpj(String(data.cnpj || '')),
    email: data.email || '',
    phone: montarTelefone(data),
    endereco: montarEndereco(data),
    cidade: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep ? formatCep(String(data.cep)) : '',
    cnae,
    grau_risco: inferirGrauRiscoPorCnae(cnaeCodigo),
  }
}
