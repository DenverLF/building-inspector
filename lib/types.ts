export type UserRole = 'admin' | 'inspector'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}
