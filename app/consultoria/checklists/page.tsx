'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChecklistsPage() {
  const router = useRouter()

  useEffect(() => {
    toast.error('A consultoria não pode alterar as perguntas do checklist')
    router.replace('/consultoria')
  }, [router])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <Loader2 size={30} className="animate-spin text-[var(--brand)]" />
    </div>
  )
}
