import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { AppError } from '@/lib/errors';
import type { Database } from '@/lib/supabase/database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type AppRole = Database['public']['Enums']['app_role'];

/**
 * Obtiene el perfil autoritativo del usuario autenticado en el request actual.
 * - Deduplicado por request mediante React.cache().
 * - NUNCA confía en user_metadata para determinar el rol; consulta public.profiles.
 * - Incluye bootstrap controlado del administrador inicial (Sección 14): si el email autenticado
 *   coincide exactamente con INITIAL_ADMIN_EMAIL y su rol aún es 'customer', lo promueve a 'admin'.
 */
export const getCurrentProfile = cache(
  async (): Promise<ProfileRow | null> => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_active) {
      return null;
    }

    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    if (
      initialAdminEmail &&
      profile.role === 'customer' &&
      user.email?.toLowerCase() === initialAdminEmail &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      try {
        const admin = createSupabaseAdminClient();
        const { data: promoted } = await admin
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', profile.id)
          .select('*')
          .single();

        if (promoted) {
          await admin.from('audit_logs').insert({
            actor_user_id: promoted.id,
            actor_role: 'admin',
            action: 'auth.initial_admin_bootstrapped',
            entity_type: 'profile',
            entity_id: promoted.id,
            after_state: { email: promoted.email, role: 'admin' },
          });
          return promoted;
        }
      } catch {
        // Si falla la promoción automática, continúa con el perfil actual
      }
    }

    return profile;
  }
);

export function hasAdminPrivileges(
  profile: Pick<ProfileRow, 'role' | 'is_active'> | null | undefined
): boolean {
  if (!profile || !profile.is_active) {
    return false;
  }
  return profile.role === 'admin' || profile.role === 'operations';
}

/**
 * Exige usuario autenticado en Server Actions / servicios. Lanza AppError('UNAUTHORIZED') si no hay sesión.
 */
export async function requireAuthenticatedProfile(): Promise<ProfileRow> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new AppError({
      code: 'UNAUTHORIZED',
      message: 'Debés iniciar sesión para realizar esta operación.',
    });
  }
  return profile;
}

/**
 * Exige rol administrativo ('admin' u 'operations') en Server Actions / Route Handlers.
 */
export async function requireAdminProfile(): Promise<ProfileRow> {
  const profile = await requireAuthenticatedProfile();
  if (!hasAdminPrivileges(profile)) {
    throw new AppError({
      code: 'FORBIDDEN',
      message: 'No tenés permisos administrativos para ejecutar esta acción.',
    });
  }
  return profile;
}

/**
 * Guardia para layouts/páginas RSC administrativas: redirige si no es administrador verificado.
 */
export async function requireAdminPageAccess(): Promise<ProfileRow> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login?next=/admin');
  }
  if (!hasAdminPrivileges(profile)) {
    redirect('/?error=forbidden');
  }
  return profile;
}
