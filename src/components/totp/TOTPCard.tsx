'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Check, Trash2, Eye, EyeOff, ExternalLink, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CountdownRing } from './CountdownRing'
import { generateTOTP } from '@/lib/totp'
import type { TOTPService } from '@/types'

interface TOTPCardProps {
  service: TOTPService
  decryptedSeed: string
  onDelete?: (id: string) => void
  onEdit?: (service: TOTPService) => void
}

const SERVICE_COLORS: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  green: 'from-emerald-500 to-emerald-600',
  red: 'from-red-500 to-red-600',
  orange: 'from-orange-500 to-orange-600',
  pink: 'from-pink-500 to-pink-600',
}

function ServiceIcon({ name, color }: { name: string; color?: string }) {
  const gradient = SERVICE_COLORS[color ?? 'blue']
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white font-bold text-sm shadow-sm flex-shrink-0`}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function TOTPCard({ service, decryptedSeed, onDelete, onEdit }: TOTPCardProps) {
  const [code, setCode] = useState('------')
  const [copied, setCopied] = useState(false)
  const [hidden, setHidden] = useState(false)

  const refreshCode = useCallback(async () => {
    if (!decryptedSeed) return
    const newCode = await generateTOTP(decryptedSeed)
    setCode(newCode)
  }, [decryptedSeed])

  useEffect(() => {
    refreshCode()
  }, [refreshCode])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayCode = hidden ? '••• •••' : `${code.slice(0, 3)} ${code.slice(3)}`

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden border-border/50 bg-card transition-all duration-200 hover:border-border hover:shadow-md"
      onClick={handleCopy}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <ServiceIcon name={service.name} color={service.color} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-foreground">{service.name}</p>
              {service.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="truncate text-xs text-muted-foreground">{service.accountName}</p>
          </div>

          <CountdownRing onReset={refreshCode} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
            {displayCode}
          </span>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setHidden((h) => !h) }}
            >
              {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>

            {service.issuer?.startsWith('http') && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); window.open(service.issuer, '_blank', 'noopener,noreferrer') }}
                title={service.issuer}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}

            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onEdit(service) }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); handleCopy() }}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>

            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(service.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
