'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuthenticatedProfile } from '@/lib/security/auth-guards';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import {
  signInSchema,
  signUpSchema,
  passwordResetRequestSchema,
  updateProfileSchema,
  customerAddressSchema,
  type SignInInput,
  type SignUpInput,
  type UpdateProfileInput,
  type CustomerAddressInput,
} from './schema';
import { ok, fail, toActionError, type ActionResult } from '@/lib/errors';

export async function signInAction(
  input: SignInInput
): Promise<ActionResult<{ userId: string }>> {
  try {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Datos de inicio de sesión inválidos.'
      );
    }

    await enforceRateLimit({
      key: `auth:signin:${parsed.data.email.toLowerCase()}`,
      limit: 10,
      windowSeconds: 60,
    });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return fail(
        'UNAUTHORIZED',
        'Correo electrónico o contraseña incorrectos.'
      );
    }

    revalidatePath('/', 'layout');
    return ok({ userId: data.user.id });
  } catch (err) {
    return toActionError(err);
  }
}

export async function signUpAction(
  input: SignUpInput
): Promise<ActionResult<{ userId: string; requiresEmailConfirmation: boolean }>> {
  try {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Datos de registro inválidos.'
      );
    }

    await enforceRateLimit({
      key: `auth:signup:${parsed.data.email.toLowerCase()}`,
      limit: 5,
      windowSeconds: 300,
    });

    const supabase = await createSupabaseServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${appUrl}/api/auth/callback`,
        data: {
          full_name: parsed.data.fullName,
        },
      },
    });

    if (error || !data.user) {
      return fail(
        'VALIDATION_ERROR',
        error?.message ?? 'No se pudo completar el registro.'
      );
    }

    revalidatePath('/', 'layout');
    return ok({
      userId: data.user.id,
      requiresEmailConfirmation: !data.session,
    });
  } catch (err) {
    return toActionError(err);
  }
}

export async function signOutAction(): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    return ok(null);
  } catch (err) {
    return toActionError(err);
  }
}

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<ActionResult<{ sent: true }>> {
  try {
    const parsed = passwordResetRequestSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Ingresá un correo válido.'
      );
    }

    await enforceRateLimit({
      key: `auth:reset:${parsed.data.email.toLowerCase()}`,
      limit: 3,
      windowSeconds: 300,
    });

    const supabase = await createSupabaseServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl}/api/auth/callback?next=/cuenta`,
    });

    return ok({ sent: true });
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ActionResult<{ updated: true }>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Datos de perfil inválidos.'
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        document_type: parsed.data.documentType,
        document_number: parsed.data.documentNumber,
      })
      .eq('id', profile.id);

    if (error) {
      return fail('INTERNAL_ERROR', 'No se pudo actualizar el perfil.');
    }

    revalidatePath('/cuenta');
    return ok({ updated: true });
  } catch (err) {
    return toActionError(err);
  }
}

export async function createAddressAction(
  input: CustomerAddressInput
): Promise<ActionResult<{ addressId: string }>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const parsed = customerAddressSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Datos de dirección inválidos.'
      );
    }

    const supabase = await createSupabaseServerClient();

    if (parsed.data.isDefault) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', profile.id);
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({
        user_id: profile.id,
        label: parsed.data.label ?? null,
        recipient_name: parsed.data.recipientName,
        phone: parsed.data.phone,
        street_name: parsed.data.streetName,
        street_number: parsed.data.streetNumber,
        floor_apt: parsed.data.floorApt ?? null,
        between_streets: parsed.data.betweenStreets ?? null,
        locality: parsed.data.locality,
        party_department: parsed.data.partyDepartment ?? null,
        province: parsed.data.province,
        postal_code: parsed.data.postalCode,
        reference_notes: parsed.data.referenceNotes ?? null,
        is_default: parsed.data.isDefault,
      })
      .select('id')
      .single();

    if (error || !data) {
      return fail('INTERNAL_ERROR', 'No se pudo guardar la dirección.');
    }

    revalidatePath('/cuenta');
    revalidatePath('/checkout');
    return ok({ addressId: data.id });
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteAddressAction(
  addressId: string
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', profile.id);

    if (error) {
      return fail('INTERNAL_ERROR', 'No se pudo eliminar la dirección.');
    }

    revalidatePath('/cuenta');
    return ok({ deleted: true });
  } catch (err) {
    return toActionError(err);
  }
}
