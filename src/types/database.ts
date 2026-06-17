export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string | null
          avatar: string | null
          kdf_salt: string | null
          is_super_admin: boolean
          public_key: string | null
          encrypted_private_key: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email?: string | null
          avatar?: string | null
          kdf_salt?: string | null
          is_super_admin?: boolean
          public_key?: string | null
          encrypted_private_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          avatar?: string | null
          kdf_salt?: string | null
          is_super_admin?: boolean
          public_key?: string | null
          encrypted_private_key?: string | null
          created_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          key_material: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          key_material?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          key_material?: string | null
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
          role: 'admin' | 'member'
          wrapped_key: string | null
          created_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          role?: 'admin' | 'member'
          wrapped_key?: string | null
          created_at?: string
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          wrapped_key?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      services: {
        Row: {
          id: string
          team_id: string
          name: string
          issuer: string
          account_name: string
          encrypted_seed: string
          icon: string | null
          color: string | null
          tags: string[]
          added_by: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          issuer: string
          account_name: string
          encrypted_seed: string
          icon?: string | null
          color?: string | null
          tags?: string[]
          added_by: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          issuer?: string
          account_name?: string
          encrypted_seed?: string
          icon?: string | null
          color?: string | null
          tags?: string[]
          added_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'services_team_id_fkey'
            columns: ['team_id']
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'services_added_by_fkey'
            columns: ['added_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      add_team_member: {
        Args: { p_team_id: string; p_email: string; p_role?: string }
        Returns: void
      }
    }
  }
}
