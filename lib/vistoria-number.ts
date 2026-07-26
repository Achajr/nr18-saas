import { prisma } from '@/lib/db/prisma'

export async function gerarNumeroVistoriaPorObra(obraId: string) {
  const totalObra = await prisma.vistoria.count({ where: { obraId } })
  return `${String(totalObra + 1).padStart(3, '0')}/${new Date().getFullYear()}`
}
