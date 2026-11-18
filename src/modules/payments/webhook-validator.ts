import crypto from 'crypto';

export interface MercadoPagoSignatureInput {
  xSignatureHeader: string | null;
  xRequestIdHeader: string | null;
  dataIdQueryParam: string | null;
  webhookSecret: string;
  nowMs?: number;
  maxToleranceMs?: number;
}

export interface SignatureValidationResult {
  valid: boolean;
  reason?: string;
  timestampMs?: number;
}

/**
 * Valida la firma HMAC-SHA256 de notificaciones Webhook de Mercado Pago conforme a
 * la documentación oficial vigente (Sección 9):
 *
 * Manifest template: `id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];`
 * - Si `data.id` es alfanumérico con mayúsculas, se convierte a minúsculas antes de armar el manifest.
 * - Si alguno de los campos opcionales no está presente, se omite del manifest.
 * - Comparación en tiempo constante con `crypto.timingSafeEqual`.
 */
export function validateMercadoPagoWebhookSignature(
  input: MercadoPagoSignatureInput
): SignatureValidationResult {
  const {
    xSignatureHeader,
    xRequestIdHeader,
    dataIdQueryParam,
    webhookSecret,
    nowMs = Date.now(),
    maxToleranceMs = 15 * 60 * 1000, // 15 minutos
  } = input;

  if (!webhookSecret || webhookSecret.trim().length === 0) {
    return { valid: false, reason: 'Falta configurar MP_WEBHOOK_SECRET.' };
  }

  if (!xSignatureHeader) {
    return { valid: false, reason: 'Header x-signature ausente.' };
  }

  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of xSignatureHeader.split(',')) {
    const [rawKey, rawValue] = part.split('=', 2);
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (key === 'ts' && value) ts = value;
    if (key === 'v1' && value) v1 = value;
  }

  if (!ts || !v1) {
    return {
      valid: false,
      reason: 'Formato de x-signature inválido (faltan ts o v1).',
    };
  }

  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) {
    return { valid: false, reason: 'Timestamp ts inválido en x-signature.' };
  }

  // Mercado Pago puede enviar ts en segundos o en milisegundos según versión de notificación
  const tsMs = tsNumber < 1e12 ? tsNumber * 1000 : tsNumber;
  if (Math.abs(nowMs - tsMs) > maxToleranceMs) {
    return {
      valid: false,
      reason: 'Notificación webhook fuera de la ventana temporal de tolerancia.',
      timestampMs: tsMs,
    };
  }

  // Construcción del manifest oficial: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
  const manifestParts: string[] = [];

  if (dataIdQueryParam && dataIdQueryParam.trim().length > 0) {
    const normalizedId = dataIdQueryParam.trim().toLowerCase();
    manifestParts.push(`id:${normalizedId};`);
  }

  if (xRequestIdHeader && xRequestIdHeader.trim().length > 0) {
    manifestParts.push(`request-id:${xRequestIdHeader.trim()};`);
  }

  manifestParts.push(`ts:${ts};`);

  const manifest = manifestParts.join('');

  const expectedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(manifest)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const receivedBuf = Buffer.from(v1.toLowerCase(), 'utf8');

  if (
    expectedBuf.byteLength !== receivedBuf.byteLength ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return {
      valid: false,
      reason: 'La firma HMAC-SHA256 no coincide con el manifest de la notificación.',
    };
  }

  return {
    valid: true,
    timestampMs: tsMs,
  };
}
