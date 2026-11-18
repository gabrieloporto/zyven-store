import 'server-only';
import crypto from 'crypto';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminProfile } from '@/lib/security/auth-guards';
import { recordAuditLog } from '@/modules/admin/audit.service';
import { resolveBillingStatusFromDocuments } from '@/modules/orders/state-machine';
import { pesosToCentavos } from '@/lib/money';
import { AppError } from '@/lib/errors';

export const billingDocumentTypeSchema = z.enum([
  'FACTURA_A',
  'FACTURA_B',
  'FACTURA_C',
  'NOTA_CREDITO_A',
  'NOTA_CREDITO_B',
  'NOTA_CREDITO_C',
  'NOTA_DEBITO_A',
  'NOTA_DEBITO_B',
  'NOTA_DEBITO_C',
  'RECIBO_X',
]);

export const registerBillingDocumentSchema = z.object({
  orderId: z.string().uuid(),
  documentType: billingDocumentTypeSchema,
  pointOfSale: z.number().int().positive().max(99999),
  documentNumber: z.number().int().positive(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de emisión inválida (YYYY-MM-DD).'),
  amountPesos: z.number().positive(),
  receiverName: z.string().trim().min(2).max(150),
  receiverDocType: z.enum(['DNI', 'CUIT', 'CUIL']),
  receiverDocNumber: z.string().trim().regex(/^\d{7,11}$/),
  receiverTaxCondition: z
    .enum([
      'Consumidor Final',
      'Responsable Inscripto',
      'Monotributista',
      'Exento',
    ])
    .default('Consumidor Final'),
  cae: z.string().trim().max(32).optional(),
  caeExpirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relatedDocumentId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional(),
});

export type RegisterBillingDocumentInput = z.infer<
  typeof registerBillingDocumentSchema
>;

/**
 * Construye una ruta de objeto inmutable y única dentro del bucket privado `billing-documents`.
 * Nunca permite sobrescribir comprobantes emitidos (Sección 12).
 */
export function buildImmutableBillingStoragePath(params: {
  orderId: string;
  documentType: string;
  pointOfSale: number;
  documentNumber: number;
  fileSha256: string;
}): string {
  const posFormatted = String(params.pointOfSale).padStart(5, '0');
  const numFormatted = String(params.documentNumber).padStart(8, '0');
  const shortHash = params.fileSha256.slice(0, 12);
  return `orders/${params.orderId}/${params.documentType}_${posFormatted}-${numFormatted}_${shortHash}.pdf`;
}

/**
 * Registra un comprobante fiscal manual, sube su PDF al bucket privado `billing-documents`
 * con `upsert: false` (prohibiendo sobrescritura) y recalcula el `billing_status` de la orden.
 */
export async function uploadManualBillingDocumentServer(params: {
  metadata: RegisterBillingDocumentInput;
  pdfBuffer: Buffer;
}): Promise<{ documentId: string; newBillingStatus: string }> {
  const adminProfile = await requireAdminProfile();
  const parsed = registerBillingDocumentSchema.safeParse(params.metadata);
  if (!parsed.success) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message:
        parsed.error.issues[0]?.message ?? 'Datos del comprobante inválidos.',
    });
  }

  if (
    params.pdfBuffer.byteLength < 100 ||
    params.pdfBuffer.subarray(0, 4).toString('ascii') !== '%PDF'
  ) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'El archivo adjunto debe ser un documento PDF válido.',
    });
  }

  const d = parsed.data;
  const amountCentavos = pesosToCentavos(d.amountPesos);
  const fileSha256 = crypto
    .createHash('sha256')
    .update(params.pdfBuffer)
    .digest('hex');

  const objectPath = buildImmutableBillingStoragePath({
    orderId: d.orderId,
    documentType: d.documentType,
    pointOfSale: d.pointOfSale,
    documentNumber: d.documentNumber,
    fileSha256,
  });

  const admin = createSupabaseAdminClient();

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, total_centavos, billing_status')
    .eq('id', d.orderId)
    .single();

  if (orderErr || !order) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: 'La orden asociada al comprobante no existe.',
    });
  }

  // Subir al bucket privado con upsert: false para impedir sobrescritura de comprobantes
  const { error: uploadErr } = await admin.storage
    .from('billing-documents')
    .upload(objectPath, params.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadErr) {
    throw new AppError({
      code: 'CONFLICT',
      message: `No se pudo almacenar el PDF fiscal (no se permite sobrescribir comprobantes): ${uploadErr.message}`,
    });
  }

  const { data: createdDoc, error: insertErr } = await admin
    .from('billing_documents')
    .insert({
      order_id: d.orderId,
      document_type: d.documentType,
      point_of_sale: d.pointOfSale,
      document_number: d.documentNumber,
      issue_date: d.issueDate,
      amount_centavos: amountCentavos,
      receiver_name: d.receiverName,
      receiver_doc_type: d.receiverDocType,
      receiver_doc_number: d.receiverDocNumber,
      receiver_tax_condition: d.receiverTaxCondition,
      cae: d.cae ?? null,
      cae_expiration_date: d.caeExpirationDate ?? null,
      storage_bucket: 'billing-documents',
      storage_object_path: objectPath,
      file_sha256: fileSha256,
      status: 'valid',
      related_document_id: d.relatedDocumentId ?? null,
      notes: d.notes ?? null,
      uploaded_by: adminProfile.id,
    })
    .select('id')
    .single();

  if (insertErr || !createdDoc) {
    throw new AppError({
      code: 'CONFLICT',
      message: `Error al registrar el comprobante en base de datos: ${insertErr?.message ?? ''}`,
    });
  }

  // Recalcular estado de facturación independiente del estado de pago
  const { data: allDocs } = await admin
    .from('billing_documents')
    .select('document_type, amount_centavos, status')
    .eq('order_id', d.orderId);

  const newBillingStatus = resolveBillingStatusFromDocuments({
    orderTotalCentavos: order.total_centavos,
    documents: (allDocs ?? []).map((doc) => ({
      documentType: doc.document_type,
      amountCentavos: doc.amount_centavos,
      status: doc.status,
    })),
  });

  await admin
    .from('orders')
    .update({ billing_status: newBillingStatus })
    .eq('id', d.orderId);

  await recordAuditLog({
    actorUserId: adminProfile.id,
    actorRole: adminProfile.role,
    action: 'billing.document_uploaded',
    entityType: 'billing_document',
    entityId: createdDoc.id,
    afterState: {
      orderId: d.orderId,
      documentType: d.documentType,
      pointOfSale: d.pointOfSale,
      documentNumber: d.documentNumber,
      amountCentavos,
      newBillingStatus,
    },
  });

  return {
    documentId: createdDoc.id,
    newBillingStatus,
  };
}

/**
 * Genera una URL firmada efímera (60 segundos) verificando primero permisos administrativos en servidor.
 * Nunca existen enlaces públicos a comprobantes fiscales (Sección 12).
 */
export async function getBillingDocumentSignedUrlServer(
  billingDocumentId: string
): Promise<{ signedUrl: string; expiresInSeconds: number }> {
  const adminProfile = await requireAdminProfile();
  const admin = createSupabaseAdminClient();

  const { data: doc, error } = await admin
    .from('billing_documents')
    .select('id, storage_bucket, storage_object_path')
    .eq('id', billingDocumentId)
    .single();

  if (error || !doc) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: 'Comprobante fiscal no encontrado.',
    });
  }

  const expiresInSeconds = 60;
  const { data: signed, error: signErr } = await admin.storage
    .from(doc.storage_bucket)
    .createSignedUrl(doc.storage_object_path, expiresInSeconds);

  if (signErr || !signed?.signedUrl) {
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message: 'No se pudo generar la URL firmada temporal para el PDF.',
    });
  }

  await recordAuditLog({
    actorUserId: adminProfile.id,
    actorRole: adminProfile.role,
    action: 'billing.document_accessed',
    entityType: 'billing_document',
    entityId: doc.id,
  });

  return {
    signedUrl: signed.signedUrl,
    expiresInSeconds,
  };
}
