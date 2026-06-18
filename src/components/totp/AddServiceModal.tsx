'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ServiceFormData } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  issuer: z.string().min(1, 'Issuer obrigatório'),
  accountName: z.string().min(1, 'Conta obrigatória'),
  seed: z
    .string()
    .min(16, 'Seed deve ter ao menos 16 caracteres')
    .regex(/^[A-Z2-7]+=*$/i, 'Seed deve ser base32 válido'),
  color: z.string().optional(),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const COLORS = [
  { id: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { id: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { id: 'green', label: 'Verde', class: 'bg-emerald-500' },
  { id: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { id: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { id: 'pink', label: 'Rosa', class: 'bg-pink-500' },
]

interface AddServiceModalProps {
  onAdd: (data: ServiceFormData) => Promise<void>
}

export function AddServiceModal({ onAdd }: AddServiceModalProps) {
  const [open, setOpen] = useState(false)
  const [showSeed, setShowSeed] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { color: 'blue' } })

  const selectedColor = watch('color')

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      await onAdd({
        name: values.name,
        issuer: values.issuer,
        accountName: values.accountName,
        seed: values.seed.toUpperCase().replace(/\s/g, ''),
        color: values.color,
        tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })
      reset()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Adicionar serviço</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo serviço TOTP</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do serviço</Label>
              <Input id="name" placeholder="Digite o nome do serviço" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issuer">Link</Label>
              <Input id="issuer" placeholder="https://www..." {...register('issuer')} />
              {errors.issuer && <p className="text-xs text-destructive">{errors.issuer.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accountName">Conta</Label>
            <Input id="accountName" placeholder="Digite o nome da conta" {...register('accountName')} />
            {errors.accountName && (
              <p className="text-xs text-destructive">{errors.accountName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seed">Seed (chave secreta)</Label>
            <div className="relative">
              <Input
                id="seed"
                type={showSeed ? 'text' : 'password'}
                placeholder="JBSWY3DPEHPK3PXP"
                className="pr-10 font-mono"
                {...register('seed')}
              />
              <button
                type="button"
                onClick={() => setShowSeed((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSeed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.seed && <p className="text-xs text-destructive">{errors.seed.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setValue('color', c.id)}
                  className={`h-7 w-7 rounded-full ${c.class} ring-offset-background transition-all ${
                    selectedColor === c.id ? 'ring-2 ring-ring ring-offset-2 scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (opcional, separadas por vírgula)</Label>
            <Input id="tags" placeholder="produção, crítico" {...register('tags')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  )
}
