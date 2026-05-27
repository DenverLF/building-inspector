export type UserRole = 'admin' | 'inspector'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type InspectionStage = 'fire_installation' | 'trench' | 'drainage' | 'permission_to_use' | 'occupation'

export interface Task {
  id: string
  title: string
  description: string | null
  address: string | null
  assigned_inspector: string | null
  created_by: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  inspection_stage: InspectionStage | null
  created_at: string
  updated_at: string
}
