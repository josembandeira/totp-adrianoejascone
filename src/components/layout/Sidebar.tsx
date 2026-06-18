import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShieldCheck, Users, Settings, LogOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/services', label: 'Serviços', icon: ShieldCheck },
  { href: '/dashboard/teams', label: 'Equipes', icon: Users },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
]

const isActive = (pathname: string, href: string) =>
  href === '/dashboard' ? pathname === href : pathname.startsWith(href)

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <aside
      className={cn(
        'flex h-screen w-60 flex-col border-r border-border bg-card',
        // Mobile: fixed overlay, desliza para dentro/fora
        'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: sempre visível, no fluxo normal
        'md:relative md:translate-x-0',
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground">TOTP Teams</span>
        <button
          className="ml-auto text-muted-foreground hover:text-foreground md:hidden"
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Separator />

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive(pathname, href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'US'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? 'Usuário'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
