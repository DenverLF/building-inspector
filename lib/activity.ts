import { createClient } from '@/lib/supabase/client'
import type { ActivityAction } from '@/lib/types'

export async function logActivity(params: {
  entity_type: 'task' | 'inspection' | 'km_log'
  entity_id: string
  entity_title: string
  action: ActivityAction
  description: string
  performed_by_name?: string | null
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_logs').insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      entity_title: params.entity_title,
      action: params.action,
      description: params.description,
      performed_by: user?.id ?? null,
      performed_by_name: params.performed_by_name ?? null,
    })
  } catch {
    // Never break the main flow
  }
}
