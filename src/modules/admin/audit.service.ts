import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';

export async function recordAuditLog(params: {
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await supabase.from('audit_logs').insert({
    actor_user_id: params.actorUserId,
    actor_role: params.actorRole,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    before_state: (params.beforeState as Json) ?? null,
    after_state: (params.afterState as Json) ?? null,
    metadata: (params.metadata as Json) ?? null,
  });
}
