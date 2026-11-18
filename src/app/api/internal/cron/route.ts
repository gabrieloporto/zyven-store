import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Job periódico ejecutado por Vercel Cron / Schedules (Sección 16).
 * 1. Libera reservas de stock vencidas (`release_expired_reservations`).
 * 2. Procesa eventos pendientes en `outbox_events` con backoff exponencial.
 * 3. Limpia cubetas vencidas de `rate_limit_buckets`.
 * 4. Mantiene activo el proyecto de Supabase Free evitando la pausa por inactividad de 7 días.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();

    // 1. Liberar reservas vencidas de manera atómica
    const { data: releasedCount, error: releaseError } = await admin.rpc(
      'release_expired_reservations'
    );

    if (releaseError) {
      throw new Error(`Error liberando reservas: ${releaseError.message}`);
    }

    // 2. Limpiar ventanas expiradas de rate limit
    await admin
      .from('rate_limit_buckets')
      .delete()
      .lt('window_expires_at', new Date().toISOString());

    // 3. Procesar lote de outbox_events pendientes
    const { data: pendingEvents } = await admin
      .from('outbox_events')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(25);

    let processedEvents = 0;

    for (const evt of pendingEvents ?? []) {
      try {
        await admin
          .from('outbox_events')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString(),
            attempts: evt.attempts + 1,
          })
          .eq('id', evt.id);

        processedEvents += 1;
      } catch (err) {
        const nextAttempts = evt.attempts + 1;
        const backoffSeconds = Math.min(3600 * 6, 30 * Math.pow(3, nextAttempts));
        const nextRetryAt = new Date(
          Date.now() + backoffSeconds * 1000
        ).toISOString();

        await admin
          .from('outbox_events')
          .update({
            status:
              nextAttempts >= evt.max_attempts ? 'failed_permanent' : 'pending',
            attempts: nextAttempts,
            next_retry_at: nextRetryAt,
            last_error: err instanceof Error ? err.message : 'Error desconocido',
          })
          .eq('id', evt.id);
      }
    }

    return NextResponse.json({
      ok: true,
      releasedReservations: releasedCount ?? 0,
      processedOutboxEvents: processedEvents,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error en ejecución de cron',
      },
      { status: 500 }
    );
  }
}
