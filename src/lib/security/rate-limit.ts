import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AppError } from '@/lib/errors';

const localMemoryBuckets = new Map<
  string,
  { count: number; expiresAt: number }
>();

export function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  nowMs = Date.now()
): boolean {
  const existing = localMemoryBuckets.get(key);
  if (!existing || existing.expiresAt <= nowMs) {
    localMemoryBuckets.set(key, {
      count: 1,
      expiresAt: nowMs + windowSeconds * 1000,
    });
    return true;
  }

  existing.count += 1;
  return existing.count <= limit;
}

/**
 * Ejecuta rate limiting respaldado por PostgreSQL (`public.check_rate_limit`) sin requerir Redis/Upstash ($0).
 * Si SUPABASE_SERVICE_ROLE_KEY no está configurada aún en entorno local, utiliza el bucket en memoria como respaldo.
 */
export async function enforceRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const { key, limit, windowSeconds } = params;

  let allowed = true;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin.rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });

      if (!error && typeof data === 'boolean') {
        allowed = data;
      } else {
        allowed = checkMemoryRateLimit(key, limit, windowSeconds);
      }
    } catch {
      allowed = checkMemoryRateLimit(key, limit, windowSeconds);
    }
  } else {
    allowed = checkMemoryRateLimit(key, limit, windowSeconds);
  }

  if (!allowed) {
    throw new AppError({
      code: 'RATE_LIMIT_EXCEEDED',
      message:
        'Realizaste demasiados intentos en poco tiempo. Por favor aguardá unos segundos e intentá nuevamente.',
    });
  }
}
