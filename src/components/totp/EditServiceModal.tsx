'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TOTPService } from '@/types'
import type { ServiceUpdateData } from '@/store/services'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  issuer: z.string().min(1, 'Link obrigatório'),
  accountName: z.string().min(1, 'Conta obrigatória'),
  seed: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v) return true
        const normalized = v.replace(/\s/g, '').toUpperCase()
        return normalized.length >= 16 && /^[A-Z2-7]+=*$/.test(normalized)
      },
      'Seed inválida — deve ser base32 com ao menos 16 caracteres',
    ),
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

interface EditServiceModalProps {
  service: TOTPService
  decryptedSeed: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (id: string, data: ServiceUpdateData) => Promise<void>
}

export function EditServiceModal({
  service,
  decryptedSeed,
  open,
  onOpenChange,
  onEdit,
}: EditServiceModalProps) {
  const [showSeed, setShowSeed] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const selectedColor = watch('color')

  useEffect(() => {
    if (open) {
      reset({
        name: service.name,
        issuer: service.issuer,
        accountName: service.accountName,
        seed: '',
        color: service.color ?? 'blue',
        tags: service.tags?.join(', ') ?? '',
      })
      setShowSeed(false)
    }
  }, [open, service, decryptedSeed, reset])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      await onEdit(service.id, {
        name: values.name,
        issuer: values.issuer,
        accountName: values.accountName,
        seed: values.seed ? values.seed.toUpperCase().replace(/\s/g, '') : undefined,
        color: values.color,
        tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar serviço</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome do serviço</Label>
              <Input id="edit-name" placeholder="Digite o nome do serviço" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-issuer">Link</Label>
              <Input id="edit-issuer" placeholder="https://www..." {...register('issuer')} />
              {errors.issuer && <p className="text-xs text-destructive">{errors.issuer.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-accountName">Conta</Label>
            <Input
              id="edit-accountName"
              placeholder="Digite o nome da conta"
              {...register('accountName')}
            />
            {errors.accountName && (
              <p className="text-xs text-destructive">{errors.accountName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-seed">
              Seed (chave secreta){' '}
              <span className="text-muted-foreground font-normal">— deixe vazio para manter</span>
            </Label>
            <div className="relative">
              <Input
                id="edit-seed"
                type={showSeed ? 'text' : 'password'}
                placeholder="Nova seed (opcional)"
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
                    selectedColor === c.id
                      ? 'ring-2 ring-ring ring-offset-2 scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-tags">Tags (opcional, separadas por vírgula)</Label>
            <Input id="edit-tags" placeholder="produção, crítico" {...register('tags')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
