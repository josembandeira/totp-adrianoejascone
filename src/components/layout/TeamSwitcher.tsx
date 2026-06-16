import { Check, ChevronDown, Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/auth'
import { useServicesStore } from '@/store/services'

export function TeamSwitcher() {
  const user = useAuthStore((s) => s.user)
  const { activeTeamId, setActiveTeam } = useServicesStore()

  const teams = user?.teams ?? []
  if (teams.length < 2) return null

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
      >
        <Users className="h-3.5 w-3.5" />
        <span className="max-w-32 truncate">{activeTeam.name}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Suas equipes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {teams.map((team) => (
            <DropdownMenuItem key={team.id} onClick={() => setActiveTeam(team.id)}>
              <span className="flex-1 truncate">{team.name}</span>
              {team.id === activeTeam.id && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
