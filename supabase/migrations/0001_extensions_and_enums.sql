-- ============================================================================
-- MIGRACIÓN 0001: Extensiones, Enums de Dominio y Utilidades Base
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Roles de aplicación
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('customer', 'admin', 'operations');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de publicación de catálogo
DO $$ BEGIN
  CREATE TYPE public.publication_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5 Ejes de estado independientes para las órdenes (Sección 8)
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending_payment',
    'pending_shipping_quote',
    'confirmed',
    'manual_review',
    'processing',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'partially_refunded',
    'refunded',
    'chargeback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fulfillment_status AS ENUM (
    'unfulfilled',
    'on_hold',
    'ready_to_pick',
    'packed',
    'fulfilled',
    'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shipping_status AS ENUM (
    'not_required',
    'pending_quote',
    'ready_to_ship',
    'label_created',
    'shipped',
    'in_transit',
    'ready_for_pickup',
    'delivered',
    'delivery_failed',
    'returned_to_sender',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_status AS ENUM (
    'pending',
    'partially_invoiced',
    'invoiced'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_movement_type AS ENUM (
    'initial_seed',
    'purchase_entry',
    'manual_adjustment_in',
    'manual_adjustment_out',
    'reservation_hold',
    'reservation_release',
    'sale_commit',
    'return_restock'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reservation_status AS ENUM (
    'active',
    'committed',
    'released',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.return_status AS ENUM (
    'requested',
    'authorized',
    'rejected',
    'received',
    'inspected',
    'resolved',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Función inmutable para búsqueda sin tildes en español
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, extensions
AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;
