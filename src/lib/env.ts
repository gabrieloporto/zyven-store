import { z } from 'zod';

const optionalString = z.preprocess(
  (val) => (val === '' || val === 'undefined' ? undefined : val),
  z.string().min(1).optional()
);

const optionalUrl = z.preprocess(
  (val) => (val === '' || val === 'undefined' ? undefined : val),
  z.string().url().optional()
);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (val) => (val === '' || val === 'undefined' ? undefined : val),
    z.string().url().default('http://localhost:3000')
  ),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  NEXT_PUBLIC_MP_PUBLIC_KEY: optionalString,
  NEXT_PUBLIC_SENTRY_DSN: optionalString,
  NEXT_PUBLIC_POSTHOG_KEY: optionalString,
  NEXT_PUBLIC_POSTHOG_HOST: z.preprocess(
    (val) => (val === '' || val === 'undefined' ? undefined : val),
    z.string().url().default('https://us.i.posthog.com')
  ),
});

const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.preprocess(
    (val) => (val === '' || val === 'undefined' ? undefined : val),
    z.enum(['development', 'preview', 'production']).optional()
  ),
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  INITIAL_ADMIN_EMAIL: z.preprocess(
    (val) => (val === '' || val === 'undefined' ? undefined : val),
    z.string().email().optional()
  ),
  ORDER_TOKEN_SECRET: optionalString,
  CRON_SECRET: optionalString,
  MP_ACCESS_TOKEN: optionalString,
  MP_WEBHOOK_SECRET: optionalString,
  ENABLE_SHIPPING_SIMULATOR: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.string().default('Zyven Store <no-reply@zyvenstore.com.ar>'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MP_PUBLIC_KEY: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
}

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() no puede invocarse en el navegador.');
  }
  const parsed = serverEnvSchema.parse(process.env);

  const isProd =
    parsed.NODE_ENV === 'production' &&
    (!parsed.VERCEL_ENV || parsed.VERCEL_ENV === 'production');

  if (isProd && parsed.ENABLE_SHIPPING_SIMULATOR) {
    throw new Error(
      'ERROR CRÍTICO DE SEGURIDAD: El simulador logístico (ENABLE_SHIPPING_SIMULATOR) no puede habilitarse en producción.'
    );
  }

  return parsed;
}

export function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production')
  );
}
