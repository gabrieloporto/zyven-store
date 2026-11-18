-- ============================================================================
-- MIGRACIÓN 0007: Facturación Manual Privada y Posventa (Devoluciones y Cambios)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'FACTURA_A', 'FACTURA_B', 'FACTURA_C',
      'NOTA_CREDITO_A', 'NOTA_CREDITO_B', 'NOTA_CREDITO_C',
      'NOTA_DEBITO_A', 'NOTA_DEBITO_B', 'NOTA_DEBITO_C',
      'RECIBO_X'
    )
  ),
  point_of_sale INT NOT NULL CHECK (point_of_sale > 0),
  document_number BIGINT NOT NULL CHECK (document_number > 0),
  issue_date DATE NOT NULL,
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  receiver_name TEXT NOT NULL,
  receiver_doc_type TEXT NOT NULL,
  receiver_doc_number TEXT NOT NULL,
  receiver_tax_condition TEXT NOT NULL,
  cae TEXT,
  cae_expiration_date DATE,
  storage_bucket TEXT NOT NULL DEFAULT 'billing-documents',
  storage_object_path TEXT NOT NULL UNIQUE,
  file_sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'voided_by_credit_note')),
  related_document_id UUID REFERENCES public.billing_documents(id),
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_type, point_of_sale, document_number)
);

CREATE INDEX IF NOT EXISTS idx_billing_documents_order ON public.billing_documents(order_id);

-- Impedir eliminación o sobrescritura de archivos de comprobantes emitidos (Sección 12)
CREATE OR REPLACE FUNCTION public.protect_issued_billing_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los comprobantes fiscales emitidos no pueden eliminarse. Registre una Nota de Crédito.';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.storage_object_path IS DISTINCT FROM OLD.storage_object_path
       OR NEW.file_sha256 IS DISTINCT FROM OLD.file_sha256
       OR NEW.document_type IS DISTINCT FROM OLD.document_type
       OR NEW.point_of_sale IS DISTINCT FROM OLD.point_of_sale
       OR NEW.document_number IS DISTINCT FROM OLD.document_number
       OR NEW.amount_centavos IS DISTINCT FROM OLD.amount_centavos THEN
      RAISE EXCEPTION 'Los datos fiscales y el archivo PDF de un comprobante emitido son inmutables.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_billing_documents ON public.billing_documents;
CREATE TRIGGER trg_protect_billing_documents
  BEFORE UPDATE OR DELETE ON public.billing_documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_issued_billing_documents();

CREATE SEQUENCE IF NOT EXISTS public.return_number_seq START WITH 101 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_return_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'RMA-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.return_number_seq')::text, 5, '0');
$$;

CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE DEFAULT public.generate_return_number(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  status public.return_status NOT NULL DEFAULT 'requested',
  reason_category TEXT NOT NULL CHECK (
    reason_category IN (
      'defective',
      'damaged_in_transit',
      'wrong_item_sent',
      'size_or_variant_change',
      'buyer_remorse',
      'other'
    )
  ),
  reason_details TEXT NOT NULL,
  resolution_type TEXT CHECK (
    resolution_type IN ('full_refund', 'partial_refund', 'exchange_order', 'store_rejection')
  ),
  replacement_order_id UUID REFERENCES public.orders(id),
  inspection_notes TEXT,
  inspected_by UUID REFERENCES public.profiles(id),
  inspected_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);

DROP TRIGGER IF EXISTS trg_return_requests_updated_at ON public.return_requests;
CREATE TRIGGER trg_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
  quantity_received INT NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  quantity_approved_restock INT NOT NULL DEFAULT 0 CHECK (
    quantity_approved_restock >= 0 AND quantity_approved_restock <= quantity_received
  ),
  inspection_condition TEXT NOT NULL DEFAULT 'pending' CHECK (
    inspection_condition IN ('pending', 'sealed_resellable', 'opened_damaged', 'defective_supplier')
  ),
  restocked BOOLEAN NOT NULL DEFAULT false,
  restocked_movement_id UUID REFERENCES public.inventory_movements(id)
);

CREATE INDEX IF NOT EXISTS idx_return_items_request ON public.return_items(return_request_id);
