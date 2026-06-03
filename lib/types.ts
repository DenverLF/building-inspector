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

export type InspectionOutcome = 'pass' | 'fail' | 'attention_required' | 'pending'

export interface Inspection {
  id: string
  task_id: string | null
  stage: InspectionStage
  outcome: InspectionOutcome
  address: string | null
  inspector_name: string | null
  created_by: string | null
  notes: string | null
  inspected_at: string
  created_at: string
}

export interface InspectionPhoto {
  id: string
  inspection_id: string
  storage_path: string
  created_at: string
}

export interface KmLog {
  id: string
  trip_date: string
  inspector_name: string | null
  start_location: string
  end_location: string
  distance_km: number
  purpose: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type NoticeStatus = 'draft' | 'sent' | 'resolved'

export interface Notice {
  id: string
  reference_number: string
  inspection_id: string | null
  property_owner_name: string | null
  property_owner_email: string | null
  site_address: string
  inspector_name: string | null
  inspection_date: string | null
  stage: InspectionStage | null
  non_compliance_details: string
  corrective_actions: string
  remedy_deadline: string | null
  status: NoticeStatus
  sent_at: string | null
  owner_signature_path: string | null
  inspector_signature_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type NoticeAttachmentType = 'photo' | 'document'

export interface NoticeAttachment {
  id: string
  notice_id: string
  file_name: string
  storage_path: string
  file_type: NoticeAttachmentType
  created_at: string
}

export type ActivityAction = 'created' | 'updated' | 'status_changed' | 'outcome_changed' | 'deleted'

export interface ActivityLog {
  id: string
  entity_type: 'task' | 'inspection' | 'km_log'
  entity_id: string
  entity_title: string | null
  action: ActivityAction
  description: string
  performed_by: string | null
  performed_by_name: string | null
  created_at: string
}
