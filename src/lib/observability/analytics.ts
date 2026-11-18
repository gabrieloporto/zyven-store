/**
 * Módulo de Analítica (PostHog Free) y Monitoreo (Sentry Free) — Sección 18.
 *
 * REGLA ESTRICTA DE PRIVACIDAD:
 * - Solo se permiten los 7 eventos de embudo comercial definidos.
 * - Se filtran y bloquean contraseñas, tokens, tarjetas, DNI/CUIT, emails y direcciones.
 */

export type AllowedAnalyticsEvent =
  | 'product_viewed'
  | 'search_performed'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_started'
  | 'payment_initiated'
  | 'purchase_completed';

const FORBIDDEN_PII_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'secret',
  'card_number',
  'cvv',
  'cvc',
  'cuit',
  'cuil',
  'dni',
  'document_number',
  'email',
  'buyer_email',
  'phone',
  'buyer_phone',
  'street_name',
  'street_number',
  'cae',
]);

export function sanitizeTelemetryProperties(
  rawProps: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(rawProps)) {
    const normalizedKey = key.toLowerCase();
    if (FORBIDDEN_PII_KEYS.has(normalizedKey)) {
      continue;
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      clean[key] = value;
    }
  }

  return clean;
}
