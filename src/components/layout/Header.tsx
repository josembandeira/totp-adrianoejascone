'use client'

import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TeamSwitcher } from '@/components/layout/TeamSwitcher'
import { useServicesStore } from '@/store/services'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { search, setSearch } = useServicesStore()

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div>
        <h1 className="font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <TeamSwitcher />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 pl-9 text-sm"
          />
        </div>

        {/* ----------- AINDA NÃO IMPLEMENTADO ----------- */}

        {/* <Button size="icon" variant="ghost" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
        </Button> */}

        {actions}
      </div>
    </header>
  )
}
