export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_documents: {
        Row: {
          amount_centavos: number
          cae: string | null
          cae_expiration_date: string | null
          created_at: string
          document_number: number
          document_type: string
          file_sha256: string
          id: string
          issue_date: string
          notes: string | null
          order_id: string
          point_of_sale: number
          receiver_doc_number: string
          receiver_doc_type: string
          receiver_name: string
          receiver_tax_condition: string
          related_document_id: string | null
          status: string
          storage_bucket: string
          storage_object_path: string
          uploaded_by: string
        }
        Insert: {
          amount_centavos: number
          cae?: string | null
          cae_expiration_date?: string | null
          created_at?: string
          document_number: number
          document_type: string
          file_sha256: string
          id?: string
          issue_date: string
          notes?: string | null
          order_id: string
          point_of_sale: number
          receiver_doc_number: string
          receiver_doc_type: string
          receiver_name: string
          receiver_tax_condition: string
          related_document_id?: string | null
          status?: string
          storage_bucket?: string
          storage_object_path: string
          uploaded_by: string
        }
        Update: {
          amount_centavos?: number
          cae?: string | null
          cae_expiration_date?: string | null
          created_at?: string
          document_number?: number
          document_type?: string
          file_sha256?: string
          id?: string
          issue_date?: string
          notes?: string | null
          order_id?: string
          point_of_sale?: number
          receiver_doc_number?: string
          receiver_doc_type?: string
          receiver_name?: string
          receiver_tax_condition?: string
          related_document_id?: string | null
          status?: string
          storage_bucket?: string
          storage_object_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_documents_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "billing_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_path: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          quantity: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          quantity: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          coupon_code: string | null
          created_at: string
          expires_at: string
          guest_token_hash: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          expires_at?: string
          guest_token_hash?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          expires_at?: string
          guest_token_hash?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          suggested_attribute_keys: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          suggested_attribute_keys?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          suggested_attribute_keys?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          between_streets: string | null
          created_at: string
          floor_apt: string | null
          id: string
          is_default: boolean
          label: string | null
          locality: string
          party_department: string | null
          phone: string
          postal_code: string
          province: string
          recipient_name: string
          reference_notes: string | null
          street_name: string
          street_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          between_streets?: string | null
          created_at?: string
          floor_apt?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          locality: string
          party_department?: string | null
          phone: string
          postal_code: string
          province: string
          recipient_name: string
          reference_notes?: string | null
          street_name: string
          street_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          between_streets?: string | null
          created_at?: string
          floor_apt?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          locality?: string
          party_department?: string | null
          phone?: string
          postal_code?: string
          province?: string
          recipient_name?: string
          reference_notes?: string | null
          street_name?: string
          street_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          available: number | null
          low_stock_threshold: number
          on_hand: number
          reserved: number
          updated_at: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          available?: number | null
          low_stock_threshold?: number
          on_hand?: number
          reserved?: number
          updated_at?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          available?: number | null
          low_stock_threshold?: number
          on_hand?: number
          reserved?: number
          updated_at?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          on_hand_after: number
          on_hand_before: number
          quantity_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string
          reserved_after: number
          reserved_before: number
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          on_hand_after: number
          on_hand_before: number
          quantity_delta: number
          reason?: string | null
          reference_id?: string | null
          reference_type: string
          reserved_after: number
          reserved_before: number
          variant_id: string
          warehouse_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          on_hand_after?: number
          on_hand_before?: number
          quantity_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string
          reserved_after?: number
          reserved_before?: number
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          attributes_snapshot: Json
          created_at: string
          id: string
          image_url_snapshot: string | null
          line_total_centavos: number
          option_values_snapshot: Json
          order_id: string
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          sku_snapshot: string
          unit_discount_centavos: number
          unit_price_centavos: number
          variant_id: string | null
          variant_title_snapshot: string
        }
        Insert: {
          attributes_snapshot?: Json
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          line_total_centavos: number
          option_values_snapshot?: Json
          order_id: string
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          sku_snapshot: string
          unit_discount_centavos?: number
          unit_price_centavos: number
          variant_id?: string | null
          variant_title_snapshot: string
        }
        Update: {
          attributes_snapshot?: Json
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          line_total_centavos?: number
          option_values_snapshot?: Json
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          sku_snapshot?: string
          unit_discount_centavos?: number
          unit_price_centavos?: number
          variant_id?: string | null
          variant_title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_user_id: string | null
          axis: string
          created_at: string
          from_status: string | null
          id: string
          metadata: Json
          order_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_user_id?: string | null
          axis: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          order_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_user_id?: string | null
          axis?: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_status: Database["public"]["Enums"]["billing_status"]
          buyer_document_number: string
          buyer_document_type: string
          buyer_email: string
          buyer_full_name: string
          buyer_phone: string
          coupon_code_snapshot: string | null
          created_at: string
          currency: string
          customer_notes: string | null
          delivery_modality: string
          discount_centavos: number
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          id: string
          idempotency_key: string
          internal_admin_notes: string | null
          manual_review_reason: string | null
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          parent_order_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          reservation_expires_at: string | null
          shipping_address_snapshot: Json
          shipping_centavos: number
          shipping_quote_snapshot: Json
          shipping_status: Database["public"]["Enums"]["shipping_status"]
          subtotal_centavos: number
          total_centavos: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_status?: Database["public"]["Enums"]["billing_status"]
          buyer_document_number: string
          buyer_document_type?: string
          buyer_email: string
          buyer_full_name: string
          buyer_phone: string
          coupon_code_snapshot?: string | null
          created_at?: string
          currency?: string
          customer_notes?: string | null
          delivery_modality: string
          discount_centavos?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          idempotency_key: string
          internal_admin_notes?: string | null
          manual_review_reason?: string | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          parent_order_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          reservation_expires_at?: string | null
          shipping_address_snapshot: Json
          shipping_centavos?: number
          shipping_quote_snapshot: Json
          shipping_status?: Database["public"]["Enums"]["shipping_status"]
          subtotal_centavos: number
          total_centavos: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_status?: Database["public"]["Enums"]["billing_status"]
          buyer_document_number?: string
          buyer_document_type?: string
          buyer_email?: string
          buyer_full_name?: string
          buyer_phone?: string
          coupon_code_snapshot?: string | null
          created_at?: string
          currency?: string
          customer_notes?: string | null
          delivery_modality?: string
          discount_centavos?: number
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          idempotency_key?: string
          internal_admin_notes?: string | null
          manual_review_reason?: string | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          parent_order_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          reservation_expires_at?: string | null
          shipping_address_snapshot?: Json
          shipping_centavos?: number
          shipping_quote_snapshot?: Json
          shipping_status?: Database["public"]["Enums"]["shipping_status"]
          subtotal_centavos?: number
          total_centavos?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      payment_refunds: {
        Row: {
          amount_centavos: number
          confirmed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          mp_refund_id: string | null
          order_id: string
          payment_id: string
          raw_response: Json | null
          reason: string
          requested_by: string | null
          return_request_id: string | null
          status: string
        }
        Insert: {
          amount_centavos: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          mp_refund_id?: string | null
          order_id: string
          payment_id: string
          raw_response?: Json | null
          reason: string
          requested_by?: string | null
          return_request_id?: string | null
          status: string
        }
        Update: {
          amount_centavos?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          mp_refund_id?: string | null
          order_id?: string
          payment_id?: string
          raw_response?: Json | null
          reason?: string
          requested_by?: string | null
          return_request_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_centavos: number
          approved_at: string | null
          created_at: string
          external_reference: string
          id: string
          installments: number | null
          is_late_payment: boolean
          mp_merchant_order_id: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          net_received_centavos: number | null
          order_id: string
          payment_method_id: string | null
          payment_type_id: string | null
          provider: string
          raw_response: Json | null
          refunded_amount_centavos: number
          status: Database["public"]["Enums"]["payment_status"]
          status_detail: string | null
          updated_at: string
        }
        Insert: {
          amount_centavos: number
          approved_at?: string | null
          created_at?: string
          external_reference: string
          id?: string
          installments?: number | null
          is_late_payment?: boolean
          mp_merchant_order_id?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          net_received_centavos?: number | null
          order_id: string
          payment_method_id?: string | null
          payment_type_id?: string | null
          provider?: string
          raw_response?: Json | null
          refunded_amount_centavos?: number
          status?: Database["public"]["Enums"]["payment_status"]
          status_detail?: string | null
          updated_at?: string
        }
        Update: {
          amount_centavos?: number
          approved_at?: string | null
          created_at?: string
          external_reference?: string
          id?: string
          installments?: number | null
          is_late_payment?: boolean
          mp_merchant_order_id?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          net_received_centavos?: number | null
          order_id?: string
          payment_method_id?: string | null
          payment_type_id?: string | null
          provider?: string
          raw_response?: Json | null
          refunded_amount_centavos?: number
          status?: Database["public"]["Enums"]["payment_status"]
          status_detail?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          height: number | null
          id: string
          is_primary: boolean
          product_id: string
          public_url: string
          sort_order: number
          storage_path: string
          variant_id: string | null
          width: number | null
        }
        Insert: {
          alt_text: string
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          product_id: string
          public_url: string
          sort_order?: number
          storage_path: string
          variant_id?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          product_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
          variant_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          created_at: string
          depth_cm: number
          height_cm: number
          id: string
          is_default: boolean
          option_values: Json
          price_centavos: number
          product_id: string
          promo_ends_at: string | null
          promo_starts_at: string | null
          promotional_price_centavos: number | null
          sku: string
          sort_order: number
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at: string
          weight_grams: number
          width_cm: number
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          depth_cm?: number
          height_cm?: number
          id?: string
          is_default?: boolean
          option_values?: Json
          price_centavos: number
          product_id: string
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          promotional_price_centavos?: number | null
          sku: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
          weight_grams?: number
          width_cm?: number
        }
        Update: {
          barcode?: string | null
          created_at?: string
          depth_cm?: number
          height_cm?: number
          id?: string
          is_default?: boolean
          option_values?: Json
          price_centavos?: number
          product_id?: string
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          promotional_price_centavos?: number | null
          sku?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
          weight_grams?: number
          width_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          brand_id: string | null
          category_id: string
          commercial_name_confirmed: boolean
          contains_flammable_liquid: boolean
          contains_lithium_battery: boolean
          created_at: string
          description: string | null
          has_variants: boolean
          id: string
          is_featured: boolean
          lithium_battery_type: string
          name: string
          option_names: Json
          quality_review_notes: string | null
          requires_special_packaging: boolean
          search_vector: unknown
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
        }
        Insert: {
          attributes?: Json
          brand_id?: string | null
          category_id: string
          commercial_name_confirmed?: boolean
          contains_flammable_liquid?: boolean
          contains_lithium_battery?: boolean
          created_at?: string
          description?: string | null
          has_variants?: boolean
          id?: string
          is_featured?: boolean
          lithium_battery_type?: string
          name: string
          option_names?: Json
          quality_review_notes?: string | null
          requires_special_packaging?: boolean
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Update: {
          attributes?: Json
          brand_id?: string | null
          category_id?: string
          commercial_name_confirmed?: boolean
          contains_flammable_liquid?: boolean
          contains_lithium_battery?: boolean
          created_at?: string
          description?: string | null
          has_variants?: boolean
          id?: string
          is_featured?: boolean
          lithium_battery_type?: string
          name?: string
          option_names?: Json
          quality_review_notes?: string | null
          requires_special_packaging?: boolean
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          document_number: string | null
          document_type: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          hit_count: number
          key: string
          window_expires_at: string
        }
        Insert: {
          hit_count?: number
          key: string
          window_expires_at: string
        }
        Update: {
          hit_count?: number
          key?: string
          window_expires_at?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          id: string
          inspection_condition: string
          order_item_id: string
          quantity_approved_restock: number
          quantity_received: number
          quantity_requested: number
          restocked: boolean
          restocked_movement_id: string | null
          return_request_id: string
          variant_id: string
        }
        Insert: {
          id?: string
          inspection_condition?: string
          order_item_id: string
          quantity_approved_restock?: number
          quantity_received?: number
          quantity_requested: number
          restocked?: boolean
          restocked_movement_id?: string | null
          return_request_id: string
          variant_id: string
        }
        Update: {
          id?: string
          inspection_condition?: string
          order_item_id?: string
          quantity_approved_restock?: number
          quantity_received?: number
          quantity_requested?: number
          restocked?: boolean
          restocked_movement_id?: string | null
          return_request_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_restocked_movement_id_fkey"
            columns: ["restocked_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          created_at: string
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_notes: string | null
          order_id: string
          reason_category: string
          reason_details: string
          replacement_order_id: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          return_number: string
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_notes?: string | null
          order_id: string
          reason_category: string
          reason_details: string
          replacement_order_id?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_number?: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_notes?: string | null
          order_id?: string
          reason_category?: string
          reason_details?: string
          replacement_order_id?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_number?: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_replacement_order_id_fkey"
            columns: ["replacement_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_modality: string
          external_shipment_id: string | null
          id: string
          label_external_url: string | null
          label_storage_path: string | null
          last_error: string | null
          order_id: string
          packages: Json
          provider_code: string
          service_code: string
          service_name: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["shipping_status"]
          tracking_events: Json
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_modality: string
          external_shipment_id?: string | null
          id?: string
          label_external_url?: string | null
          label_storage_path?: string | null
          last_error?: string | null
          order_id: string
          packages?: Json
          provider_code: string
          service_code: string
          service_name: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipping_status"]
          tracking_events?: Json
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_modality?: string
          external_shipment_id?: string | null
          id?: string
          label_external_url?: string | null
          label_storage_path?: string | null
          last_error?: string | null
          order_id?: string
          packages?: Json
          provider_code?: string
          service_code?: string
          service_name?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipping_status"]
          tracking_events?: Json
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_carrier_configs: {
        Row: {
          allows_flammable_liquids_ground: boolean
          allows_lithium_batteries: boolean
          code: string
          conditions_text: string | null
          fixed_cost_centavos: number | null
          is_enabled: boolean
          is_manual_mode: boolean
          max_package_weight_grams: number
          name: string
          pickup_instructions: string | null
          requires_manual_quote: boolean
          updated_at: string
          volumetric_divisor: number
        }
        Insert: {
          allows_flammable_liquids_ground?: boolean
          allows_lithium_batteries?: boolean
          code: string
          conditions_text?: string | null
          fixed_cost_centavos?: number | null
          is_enabled?: boolean
          is_manual_mode?: boolean
          max_package_weight_grams?: number
          name: string
          pickup_instructions?: string | null
          requires_manual_quote?: boolean
          updated_at?: string
          volumetric_divisor?: number
        }
        Update: {
          allows_flammable_liquids_ground?: boolean
          allows_lithium_batteries?: boolean
          code?: string
          conditions_text?: string | null
          fixed_cost_centavos?: number | null
          is_enabled?: boolean
          is_manual_mode?: boolean
          max_package_weight_grams?: number
          name?: string
          pickup_instructions?: string | null
          requires_manual_quote?: boolean
          updated_at?: string
          volumetric_divisor?: number
        }
        Relationships: []
      }
      shipping_quotes: {
        Row: {
          cart_and_address_fingerprint: string
          cart_id: string
          created_at: string
          delivery_modality: string
          destination_locality: string
          destination_postal_code: string
          destination_province: string
          estimated_delivery_max_days: number | null
          estimated_delivery_min_days: number | null
          expires_at: string
          external_quote_id: string | null
          id: string
          packages_snapshot: Json
          pickup_branch_address: string | null
          pickup_branch_id: string | null
          pickup_branch_name: string | null
          price_centavos: number
          provider_code: string
          requires_manual_quote: boolean
          service_code: string
          service_name: string
        }
        Insert: {
          cart_and_address_fingerprint: string
          cart_id: string
          created_at?: string
          delivery_modality: string
          destination_locality: string
          destination_postal_code: string
          destination_province: string
          estimated_delivery_max_days?: number | null
          estimated_delivery_min_days?: number | null
          expires_at: string
          external_quote_id?: string | null
          id?: string
          packages_snapshot: Json
          pickup_branch_address?: string | null
          pickup_branch_id?: string | null
          pickup_branch_name?: string | null
          price_centavos: number
          provider_code: string
          requires_manual_quote?: boolean
          service_code: string
          service_name: string
        }
        Update: {
          cart_and_address_fingerprint?: string
          cart_id?: string
          created_at?: string
          delivery_modality?: string
          destination_locality?: string
          destination_postal_code?: string
          destination_province?: string
          estimated_delivery_max_days?: number | null
          estimated_delivery_min_days?: number | null
          expires_at?: string
          external_quote_id?: string | null
          id?: string
          packages_snapshot?: Json
          pickup_branch_address?: string | null
          pickup_branch_id?: string | null
          pickup_branch_name?: string | null
          price_centavos?: number
          provider_code?: string
          requires_manual_quote?: boolean
          service_code?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_quotes_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          committed_at: string | null
          created_at: string
          expires_at: string
          id: string
          order_id: string
          quantity: number
          released_at: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          variant_id: string
        }
        Insert: {
          committed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          quantity: number
          released_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          variant_id: string
        }
        Update: {
          committed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          quantity?: number
          released_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_reservations_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          cuit: string | null
          id: number
          legal_name: string | null
          mercadopago_enabled: boolean
          origin_locality: string
          origin_party: string
          origin_postal_code: string
          origin_province: string
          reservation_ttl_minutes: number
          store_name: string
          support_email: string
          support_phone: string | null
          tax_condition: string | null
          updated_at: string
        }
        Insert: {
          cuit?: string | null
          id?: number
          legal_name?: string | null
          mercadopago_enabled?: boolean
          origin_locality?: string
          origin_party?: string
          origin_postal_code?: string
          origin_province?: string
          reservation_ttl_minutes?: number
          store_name?: string
          support_email?: string
          support_phone?: string | null
          tax_condition?: string | null
          updated_at?: string
        }
        Update: {
          cuit?: string | null
          id?: number
          legal_name?: string | null
          mercadopago_enabled?: boolean
          origin_locality?: string
          origin_party?: string
          origin_postal_code?: string
          origin_province?: string
          reservation_ttl_minutes?: number
          store_name?: string
          support_email?: string
          support_phone?: string | null
          tax_condition?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          code: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          locality: string
          name: string
          party_department: string
          postal_code: string
          province: string
        }
        Insert: {
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          locality?: string
          name?: string
          party_department?: string
          postal_code?: string
          province?: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          locality?: string
          name?: string
          party_department?: string
          postal_code?: string
          province?: string
        }
        Relationships: []
      }
      webhook_inbox: {
        Row: {
          attempts: number
          created_at: string
          dedup_key: string
          headers: Json
          id: string
          last_error: string | null
          next_retry_at: string
          payload: Json
          processed_at: string | null
          provider: string
          resource_id: string
          signature_valid: boolean
          status: string
          topic: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedup_key: string
          headers: Json
          id?: string
          last_error?: string | null
          next_retry_at?: string
          payload: Json
          processed_at?: string | null
          provider: string
          resource_id: string
          signature_valid?: boolean
          status?: string
          topic: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedup_key?: string
          headers?: Json
          id?: string
          last_error?: string | null
          next_retry_at?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          resource_id?: string
          signature_valid?: boolean
          status?: string
          topic?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_variant_availability: {
        Row: {
          available_qty: number | null
          in_stock: boolean | null
          is_low_stock: boolean | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      generate_order_number: { Args: never; Returns: string }
      generate_return_number: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      process_approved_payment_atomic: {
        Args: {
          p_amount_centavos: number
          p_installments: number
          p_mp_merchant_order_id: string
          p_mp_payment_id: string
          p_mp_preference_id: string
          p_order_id: string
          p_payment_method_id: string
          p_payment_type_id: string
          p_raw_response: Json
        }
        Returns: Json
      }
      release_expired_reservations: {
        Args: { p_variant_ids?: string[] }
        Returns: number
      }
      reserve_stock_for_order_atomic: {
        Args: { p_order_id: string; p_ttl_minutes?: number }
        Returns: string
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "customer" | "admin" | "operations"
      billing_status: "pending" | "partially_invoiced" | "invoiced"
      fulfillment_status:
        | "unfulfilled"
        | "on_hold"
        | "ready_to_pick"
        | "packed"
        | "fulfilled"
        | "returned"
      inventory_movement_type:
        | "initial_seed"
        | "purchase_entry"
        | "manual_adjustment_in"
        | "manual_adjustment_out"
        | "reservation_hold"
        | "reservation_release"
        | "sale_commit"
        | "return_restock"
      order_status:
        | "pending_payment"
        | "pending_shipping_quote"
        | "confirmed"
        | "manual_review"
        | "processing"
        | "completed"
        | "cancelled"
      payment_status:
        | "unpaid"
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "partially_refunded"
        | "refunded"
        | "chargeback"
      publication_status: "draft" | "active" | "archived"
      reservation_status: "active" | "committed" | "released" | "expired"
      return_status:
        | "requested"
        | "authorized"
        | "rejected"
        | "received"
        | "inspected"
        | "resolved"
        | "cancelled"
      shipping_status:
        | "not_required"
        | "pending_quote"
        | "ready_to_ship"
        | "label_created"
        | "shipped"
        | "in_transit"
        | "ready_for_pickup"
        | "delivered"
        | "delivery_failed"
        | "returned_to_sender"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "admin", "operations"],
      billing_status: ["pending", "partially_invoiced", "invoiced"],
      fulfillment_status: [
        "unfulfilled",
        "on_hold",
        "ready_to_pick",
        "packed",
        "fulfilled",
        "returned",
      ],
      inventory_movement_type: [
        "initial_seed",
        "purchase_entry",
        "manual_adjustment_in",
        "manual_adjustment_out",
        "reservation_hold",
        "reservation_release",
        "sale_commit",
        "return_restock",
      ],
      order_status: [
        "pending_payment",
        "pending_shipping_quote",
        "confirmed",
        "manual_review",
        "processing",
        "completed",
        "cancelled",
      ],
      payment_status: [
        "unpaid",
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "partially_refunded",
        "refunded",
        "chargeback",
      ],
      publication_status: ["draft", "active", "archived"],
      reservation_status: ["active", "committed", "released", "expired"],
      return_status: [
        "requested",
        "authorized",
        "rejected",
        "received",
        "inspected",
        "resolved",
        "cancelled",
      ],
      shipping_status: [
        "not_required",
        "pending_quote",
        "ready_to_ship",
        "label_created",
        "shipped",
        "in_transit",
        "ready_for_pickup",
        "delivered",
        "delivery_failed",
        "returned_to_sender",
        "cancelled",
      ],
    },
  },
} as const

