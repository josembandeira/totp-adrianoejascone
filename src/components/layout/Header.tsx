'use client'

import { Menu, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TeamSwitcher } from '@/components/layout/TeamSwitcher'
import { useServicesStore } from '@/store/services'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onMenuToggle?: () => void
}

export function Header({ title, subtitle, actions, onMenuToggle }: HeaderProps) {
  const { search, setSearch } = useServicesStore()

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <button
        className="shrink-0 text-muted-foreground hover:text-foreground md:hidden"
        onClick={onMenuToggle}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <TeamSwitcher />

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-40 pl-9 text-sm md:w-56"
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
