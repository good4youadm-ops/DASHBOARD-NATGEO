// Auto-generated types — regenerate via: npm run db:types
// Mantido manualmente — cobre todas as tabelas + views das migrations 001-012

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── Helpers ───────────────────────────────────────────────────────────────────
type Generated<T> = T; // colunas GENERATED ALWAYS AS — excluídas do Insert
type OmitGenerated<T, K extends keyof T> = Omit<T, K>;

export interface Database {
  public: {
    Tables: {

      // ── 001: Identidade ──────────────────────────────────────────────────────
      tenants: {
        Row: {
          id: string; name: string; slug: string;
          plan: 'starter' | 'pro' | 'enterprise';
          is_active: boolean; settings: Json;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };

      user_profiles: {
        Row: {
          id: string; tenant_id: string; full_name: string | null;
          role: 'owner' | 'admin' | 'manager' | 'viewer';
          is_active: boolean; settings: Json;
          last_login_at: string | null;
          failed_login_attempts: number;
          locked_until: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at' | 'failed_login_attempts'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };

      // ── 002: Sync/ETL ────────────────────────────────────────────────────────
      sync_sources: {
        Row: {
          id: string; tenant_id: string; name: string;
          type: 'oracle' | 'postgres' | 'mysql' | 'api' | 'csv';
          is_active: boolean; config: Json;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sync_sources']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sync_sources']['Insert']>;
      };

      sync_state: {
        Row: {
          id: string; tenant_id: string; source_name: string; entity_name: string;
          last_synced_at: string | null; last_source_updated_at: string | null;
          last_source_id: string | null; cursor: Json;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sync_state']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sync_state']['Insert']>;
      };

      sync_runs: {
        Row: {
          id: string; tenant_id: string; source_name: string; entity_name: string;
          status: 'running' | 'success' | 'failed' | 'partial';
          started_at: string; finished_at: string | null;
          rows_read: number; rows_inserted: number; rows_updated: number; rows_failed: number;
          error_message: string | null; metadata: Json; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sync_runs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sync_runs']['Insert']>;
      };

      sync_errors: {
        Row: {
          id: string; sync_run_id: string; tenant_id: string; entity_name: string;
          source_id: string | null; error_message: string; raw_payload: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sync_errors']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sync_errors']['Insert']>;
      };

      raw_oracle_records: {
        Row: {
          id: string; tenant_id: string; source_name: string; entity_name: string;
          source_id: string; payload: Json; received_at: string; processed: boolean;
        };
        Insert: Omit<Database['public']['Tables']['raw_oracle_records']['Row'], 'id' | 'received_at'>;
        Update: Partial<Database['public']['Tables']['raw_oracle_records']['Insert']>;
      };

      // ── 003: Clientes e Produtos ─────────────────────────────────────────────
      customers: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          code: string | null; name: string; trade_name: string | null;
          document: string | null; document_type: 'cpf' | 'cnpj' | 'outros' | null;
          email: string | null; phone: string | null; address: Json;
          segment: string | null; classification: string | null;
          credit_limit: number | null; payment_terms: string | null;
          is_active: boolean; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };

      products: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          sku: string | null; name: string; description: string | null;
          category: string | null; subcategory: string | null; brand: string | null;
          supplier_id: string | null; supplier_name: string | null;
          unit: string; unit_weight: number | null; units_per_box: number | null;
          cost_price: number | null; sale_price: number | null; min_price: number | null;
          ncm: string | null; ean: string | null;
          abc_curve: 'A' | 'B' | 'C' | 'D' | null;
          is_fractionable: boolean; requires_cold: boolean;
          shelf_life_days: number | null;
          min_stock: number | null; max_stock: number | null; reorder_point: number | null;
          is_active: boolean; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };

      // ── 004: Comercial ───────────────────────────────────────────────────────
      sales_orders: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          customer_id: string | null; customer_source_id: string | null;
          order_number: string | null; order_date: string; delivery_date: string | null;
          status: 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'partial';
          payment_terms: string | null; payment_method: string | null;
          salesperson: string | null; branch: string | null; channel: string | null;
          subtotal: number; discount_amount: number; tax_amount: number;
          freight_amount: number; total_amount: number;
          notes: string | null; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['sales_orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sales_orders']['Insert']>;
      };

      sales_order_items: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          sales_order_id: string | null; order_source_id: string | null;
          product_id: string | null; product_source_id: string | null;
          line_number: number | null; product_code: string | null; product_name: string | null;
          unit: string; quantity: number; quantity_shipped: number;
          unit_price: number; discount_pct: number; discount_amount: number; total_amount: number;
          status: string | null; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['sales_order_items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sales_order_items']['Insert']>;
      };

      invoices: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          sales_order_id: string | null; order_source_id: string | null;
          customer_id: string | null; customer_source_id: string | null;
          invoice_number: string | null; series: string | null;
          issue_date: string; access_key: string | null;
          status: 'draft' | 'issued' | 'cancelled' | 'returned';
          subtotal: number; tax_amount: number; freight_amount: number; total_amount: number;
          extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };

      // ── 005: Estoque ─────────────────────────────────────────────────────────
      stock_positions: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          product_id: string | null; product_source_id: string | null;
          warehouse: string; location: string | null;
          qty_available: number; qty_reserved: number; qty_blocked: number; qty_in_transit: number;
          qty_physical: Generated<number>;   // GENERATED: qty_available + qty_reserved + qty_blocked
          avg_cost: number;
          total_cost: Generated<number>;     // GENERATED: qty_physical * avg_cost
          coverage_days: number | null; abc_curve: 'A' | 'B' | 'C' | 'D' | null;
          ruptura: boolean; position_date: string; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['stock_positions']['Row'], 'id' | 'created_at' | 'updated_at' | 'qty_physical' | 'total_cost'>;
        Update: Partial<Database['public']['Tables']['stock_positions']['Insert']>;
      };

      stock_lots: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          product_id: string | null; product_source_id: string | null;
          lot_number: string; warehouse: string; location: string | null;
          manufacture_date: string | null; expiry_date: string | null;
          days_to_expiry: number | null;    // coluna simples (calculada pela sync/view)
          status: 'available' | 'blocked' | 'expired' | 'consumed' | 'open_box';
          is_open_box: boolean; units_per_box: number | null;
          qty_initial: number; qty_current: number; qty_consumed: number;
          unit_cost: number;
          total_cost: Generated<number>;    // GENERATED: qty_current * unit_cost
          fefo_compliant: boolean; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['stock_lots']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_cost'>;
        Update: Partial<Database['public']['Tables']['stock_lots']['Insert']>;
      };

      inventory_movements: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          product_id: string | null; product_source_id: string | null;
          sales_order_item_id: string | null;
          lot_source_id: string | null; movement_date: string;
          movement_type: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'devolucao' | 'perda' | 'avaria' | 'inventario';
          direction: 'in' | 'out';
          warehouse_from: string | null; warehouse_to: string | null;
          document_ref: string | null; quantity: number;
          unit_cost: number | null; total_cost: number | null;
          reason: string | null; operator: string | null; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['inventory_movements']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['inventory_movements']['Insert']>;
      };

      // ── 010: Histórico de preços ─────────────────────────────────────────────
      product_price_history: {
        Row: {
          id: string; tenant_id: string; product_id: string;
          cost_price: number | null; sale_price: number | null; min_price: number | null;
          effective_from: string; effective_to: string | null;
          source: 'oracle_sync' | 'manual';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_price_history']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['product_price_history']['Insert']>;
      };

      // ── 009: Fornecedores ────────────────────────────────────────────────────
      suppliers: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          name: string; trade_name: string | null;
          document: string | null; document_type: 'cpf' | 'cnpj' | null;
          email: string | null; phone: string | null; address: Json;
          category: string | null; payment_terms: string | null;
          credit_limit: number | null; is_active: boolean; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
      };

      // ── 012: Logística ──────────────────────────────────────────────────────
      drivers: {
        Row: {
          id: string; tenant_id: string; name: string;
          document: string | null;
          phone: string | null; email: string | null;
          cnh_number: string | null; cnh_category: string | null; cnh_expiry: string | null;
          is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['drivers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>;
      };

      vehicles: {
        Row: {
          id: string; tenant_id: string;
          plate: string; model: string | null; brand: string | null; year: number | null;
          type: 'car' | 'van' | 'truck' | 'motorcycle';
          capacity_kg: number | null;
          is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };

      delivery_routes: {
        Row: {
          id: string; tenant_id: string;
          route_date: string; driver_id: string | null; vehicle_id: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          total_stops: number | null; total_weight_kg: number | null; notes: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['delivery_routes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['delivery_routes']['Insert']>;
      };

      route_stops: {
        Row: {
          id: string; tenant_id: string;
          route_id: string; sales_order_id: string | null;
          stop_order: number; customer_name: string | null; address: string | null;
          status: 'pending' | 'delivered' | 'failed' | 'skipped';
          delivered_at: string | null; notes: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['route_stops']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['route_stops']['Insert']>;
      };

      // ── 013: RBAC ───────────────────────────────────────────────────────────
      branches: {
        Row: {
          id: string; tenant_id: string; name: string; code: string | null;
          address: Json; phone: string | null; email: string | null;
          is_active: boolean; is_headquarters: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
      };

      permissions: {
        Row: {
          id: string; code: string; resource: string; action: string;
          description: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['permissions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['permissions']['Insert']>;
      };

      roles: {
        Row: {
          id: string; tenant_id: string | null; name: string; display_name: string;
          description: string | null; is_system: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['roles']['Insert']>;
      };

      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: Database['public']['Tables']['role_permissions']['Row'];
        Update: Partial<Database['public']['Tables']['role_permissions']['Row']>;
      };

      user_roles: {
        Row: {
          id: string; user_id: string; role_id: string;
          granted_by: string | null; granted_at: string; expires_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['user_roles']['Row'], 'id' | 'granted_at'>;
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
      };

      sessions: {
        Row: {
          id: string; tenant_id: string; user_id: string;
          ip_address: string | null; user_agent: string | null;
          login_at: string; logout_at: string | null;
          last_activity_at: string; is_active: boolean; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'login_at' | 'last_activity_at' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>;
      };

      // ── 014: Master Data ────────────────────────────────────────────────────
      brands: {
        Row: {
          id: string; tenant_id: string; name: string; code: string | null;
          logo_url: string | null; is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['brands']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['brands']['Insert']>;
      };

      categories: {
        Row: {
          id: string; tenant_id: string; parent_id: string | null;
          name: string; code: string | null; level: number; is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };

      product_skus: {
        Row: {
          id: string; tenant_id: string; product_id: string;
          sku_code: string; barcode: string | null; name: string;
          attributes: Json; stock_qty: number; is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_skus']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['product_skus']['Insert']>;
      };

      price_tables: {
        Row: {
          id: string; tenant_id: string; name: string; code: string | null;
          description: string | null; is_default: boolean; is_active: boolean;
          valid_from: string | null; valid_to: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['price_tables']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['price_tables']['Insert']>;
      };

      price_table_items: {
        Row: {
          id: string; tenant_id: string; price_table_id: string; product_id: string;
          unit_price: number; min_qty: number; discount_pct: number;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['price_table_items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['price_table_items']['Insert']>;
      };

      payment_methods: {
        Row: {
          id: string; tenant_id: string; name: string; code: string;
          type: 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'boleto' | 'pix' | 'check' | 'other';
          installments: number; grace_days: number; is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payment_methods']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payment_methods']['Insert']>;
      };

      sales_reps: {
        Row: {
          id: string; tenant_id: string; user_id: string | null;
          name: string; code: string | null; email: string | null; phone: string | null;
          region: string | null; commission_pct: number; is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sales_reps']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sales_reps']['Insert']>;
      };

      carriers: {
        Row: {
          id: string; tenant_id: string; name: string; code: string | null;
          document: string | null; email: string | null; phone: string | null;
          modality: 'road' | 'air' | 'sea' | 'express' | 'own' | null;
          api_key: string | null; is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['carriers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['carriers']['Insert']>;
      };

      cost_centers: {
        Row: {
          id: string; tenant_id: string; parent_id: string | null;
          name: string; code: string; description: string | null; is_active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cost_centers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cost_centers']['Insert']>;
      };

      // ── 015: Comercial ───────────────────────────────────────────────────────
      quotes: {
        Row: {
          id: string; tenant_id: string; customer_id: string; sales_rep_id: string | null;
          price_table_id: string | null; quote_number: string;
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
          subtotal: number; discount_pct: number; discount_value: number; total: number;
          valid_until: string | null; notes: string | null; converted_to: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>;
      };

      quote_items: {
        Row: {
          id: string; tenant_id: string; quote_id: string; product_id: string;
          quantity: number; unit_price: number; discount_pct: number; total: number;
          notes: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quote_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['quote_items']['Insert']>;
      };

      returns: {
        Row: {
          id: string; tenant_id: string; order_id: string | null; customer_id: string;
          return_number: string;
          reason: 'defect' | 'wrong_item' | 'excess' | 'customer_request' | 'other';
          status: 'pending' | 'approved' | 'rejected' | 'completed' | 'refunded';
          total: number; refund_method: 'credit' | 'cash' | 'exchange' | null;
          notes: string | null; approved_by: string | null; approved_at: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['returns']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['returns']['Insert']>;
      };

      return_items: {
        Row: {
          id: string; tenant_id: string; return_id: string; product_id: string;
          quantity: number; unit_price: number; total: number;
          condition: 'good' | 'damaged' | 'destroyed' | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['return_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['return_items']['Insert']>;
      };

      goals: {
        Row: {
          id: string; tenant_id: string; sales_rep_id: string | null; branch_id: string | null;
          period_type: 'monthly' | 'quarterly' | 'yearly';
          period_year: number; period_month: number | null; period_quarter: number | null;
          target_revenue: number; target_orders: number | null; target_customers: number | null;
          notes: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['goals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['goals']['Insert']>;
      };

      commissions: {
        Row: {
          id: string; tenant_id: string; sales_rep_id: string; order_id: string | null;
          period_year: number; period_month: number;
          base_amount: number; commission_pct: number; commission_value: number;
          bonus_value: number; total_value: number;
          status: 'pending' | 'approved' | 'paid' | 'cancelled';
          paid_at: string | null; notes: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['commissions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['commissions']['Insert']>;
      };

      campaigns: {
        Row: {
          id: string; tenant_id: string; name: string; description: string | null;
          type: 'discount' | 'bonus' | 'cashback' | 'gift' | 'points';
          status: 'draft' | 'active' | 'paused' | 'finished' | 'cancelled';
          starts_at: string; ends_at: string | null;
          min_order_value: number | null; discount_pct: number | null; discount_value: number | null;
          conditions: Json; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };

      bonuses: {
        Row: {
          id: string; tenant_id: string; campaign_id: string | null;
          sales_rep_id: string; order_id: string | null;
          value: number; type: 'cash' | 'product' | 'points';
          status: 'pending' | 'approved' | 'paid' | 'cancelled';
          notes: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bonuses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bonuses']['Insert']>;
      };

      // ── 016: Estoque Estendido ────────────────────────────────────────────────
      stock_reservations: {
        Row: {
          id: string; tenant_id: string; product_id: string;
          order_id: string | null; quote_id: string | null;
          warehouse: string; reserved_qty: number;
          status: 'active' | 'released' | 'consumed' | 'expired';
          expires_at: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stock_reservations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['stock_reservations']['Insert']>;
      };

      inventory_counts: {
        Row: {
          id: string; tenant_id: string; count_number: string;
          status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          warehouse: string; notes: string | null;
          started_at: string | null; finished_at: string | null;
          created_by: string | null; finished_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory_counts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['inventory_counts']['Insert']>;
      };

      inventory_count_items: {
        Row: {
          id: string; tenant_id: string; count_id: string; product_id: string;
          expected_qty: number | null; counted_qty: number | null;
          difference: Generated<number | null>;
          notes: string | null; counted_at: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory_count_items']['Row'], 'id' | 'created_at' | 'difference'>;
        Update: Partial<Database['public']['Tables']['inventory_count_items']['Insert']>;
      };

      // ── 017: Financeiro Estendido ─────────────────────────────────────────────
      financial_categories: {
        Row: {
          id: string; tenant_id: string; parent_id: string | null;
          name: string; code: string; type: 'revenue' | 'expense' | 'transfer';
          is_active: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['financial_categories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['financial_categories']['Insert']>;
      };

      bank_accounts: {
        Row: {
          id: string; tenant_id: string; name: string; bank_name: string;
          bank_code: string | null; agency: string | null; account: string | null;
          account_type: 'checking' | 'savings' | 'investment' | 'cash';
          currency: string; initial_balance: number; current_balance: number;
          is_active: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bank_accounts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bank_accounts']['Insert']>;
      };

      transactions: {
        Row: {
          id: string; tenant_id: string; bank_account_id: string;
          category_id: string | null; cost_center_id: string | null;
          receivable_id: string | null; payable_id: string | null;
          type: 'credit' | 'debit' | 'transfer';
          amount: number; balance_after: number | null;
          description: string; reference: string | null;
          transaction_date: string; reconciled: boolean; reconciled_at: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };

      // ── 018: Fiscal ───────────────────────────────────────────────────────────
      invoice_items: {
        Row: {
          id: string; tenant_id: string; invoice_id: string;
          product_id: string | null; order_item_id: string | null;
          sequence: number; description: string; ncm: string | null; cfop: string;
          unit: string; quantity: number; unit_price: number; total: number;
          icms_cst: string | null; icms_base: number; icms_rate: number; icms_value: number;
          pis_cst: string | null; pis_rate: number; pis_value: number;
          cofins_cst: string | null; cofins_rate: number; cofins_value: number;
          ipi_cst: string | null; ipi_rate: number; ipi_value: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>;
      };

      fiscal_configs: {
        Row: {
          id: string; tenant_id: string; cnpj: string; ie: string | null;
          crt: '1' | '2' | '3' | '4';
          ambiente: 'homologacao' | 'producao';
          serie: string; next_nfe_number: number;
          certificado_validade: string | null; logo_url: string | null;
          settings: Json; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fiscal_configs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['fiscal_configs']['Insert']>;
      };

      tax_rules: {
        Row: {
          id: string; tenant_id: string; ncm: string | null; cfop: string | null;
          uf_origin: string | null; uf_dest: string | null;
          icms_cst: string | null; icms_rate: number;
          pis_cst: string | null; pis_rate: number;
          cofins_cst: string | null; cofins_rate: number;
          ipi_cst: string | null; ipi_rate: number;
          is_active: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tax_rules']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tax_rules']['Insert']>;
      };

      // ── 019: Logística Estendida ──────────────────────────────────────────────
      deliveries: {
        Row: {
          id: string; tenant_id: string; route_id: string | null; order_id: string | null;
          driver_id: string | null; vehicle_id: string | null; carrier_id: string | null;
          tracking_code: string | null;
          status: 'pending' | 'pickup' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
          scheduled_date: string | null; delivered_at: string | null;
          latitude: number | null; longitude: number | null;
          proof_url: string | null; notes: string | null; recipient_name: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['deliveries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['deliveries']['Insert']>;
      };

      shipping_events: {
        Row: {
          id: string; tenant_id: string; delivery_id: string;
          event_type: 'created' | 'dispatched' | 'in_hub' | 'in_transit' | 'out_for_delivery' | 'delivery_attempt' | 'delivered' | 'failed' | 'returned' | 'cancelled';
          description: string | null; latitude: number | null; longitude: number | null;
          location_name: string | null; occurred_at: string; source: string;
        };
        Insert: Omit<Database['public']['Tables']['shipping_events']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['shipping_events']['Insert']>;
      };

      // ── 020: Integrações ──────────────────────────────────────────────────────
      import_jobs: {
        Row: {
          id: string; tenant_id: string; entity: string; source: string;
          status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
          file_name: string | null; file_url: string | null;
          total_rows: number | null; processed_rows: number; success_rows: number; error_rows: number;
          started_at: string | null; finished_at: string | null;
          created_by: string | null; options: Json;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['import_jobs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['import_jobs']['Insert']>;
      };

      import_errors: {
        Row: {
          id: string; tenant_id: string; job_id: string;
          row_number: number | null; row_data: Json | null;
          error_code: string | null; error_msg: string; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['import_errors']['Row'], 'id' | 'created_at'>;
        Update: never;
      };

      webhooks_log: {
        Row: {
          id: string; tenant_id: string | null; source: string; event_type: string;
          payload: Json; headers: Json;
          status: 'received' | 'processed' | 'failed' | 'ignored';
          error_msg: string | null; processed_at: string | null;
          ip_address: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['webhooks_log']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['webhooks_log']['Insert']>;
      };

      api_keys: {
        Row: {
          id: string; tenant_id: string; name: string;
          key_hash: string; prefix: string; scopes: string[];
          is_active: boolean; expires_at: string | null; last_used_at: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['api_keys']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>;
      };

      // ── 006: Financeiro ──────────────────────────────────────────────────────
      accounts_receivable: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          customer_id: string | null; customer_source_id: string | null;
          invoice_id: string | null; invoice_source_id: string | null;
          document_number: string | null; parcel: string | null;
          issue_date: string; due_date: string; payment_date: string | null;
          days_overdue: number | null;      // coluna simples (calculada pela view)
          status: 'open' | 'paid' | 'partial' | 'overdue' | 'written_off' | 'negotiating';
          face_value: number; paid_amount: number;
          interest_amount: number; discount_amount: number;
          payment_method: string | null; bank_account: string | null;
          notes: string | null; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['accounts_receivable']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['accounts_receivable']['Insert']>;
      };

      accounts_payable: {
        Row: {
          id: string; tenant_id: string; source_system: string; source_id: string;
          supplier_source_id: string | null; supplier_name: string | null; supplier_document: string | null;
          document_number: string | null; parcel: string | null;
          category: string | null; cost_center: string | null;
          issue_date: string; due_date: string; payment_date: string | null;
          days_overdue: number | null;      // coluna simples (calculada pela view)
          status: 'open' | 'paid' | 'partial' | 'overdue' | 'cancelled';
          face_value: number; paid_amount: number;
          interest_amount: number; discount_amount: number;
          payment_method: string | null; bank_account: string | null;
          notes: string | null; extra: Json;
          created_at: string; updated_at: string; synced_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['accounts_payable']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['accounts_payable']['Insert']>;
      };

      audit_logs: {
        Row: {
          id: string; tenant_id: string; user_id: string | null;
          action: string; table_name: string | null; record_id: string | null;
          old_data: Json | null; new_data: Json | null;
          ip_address: string | null; user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: never; // audit logs são imutáveis
      };
    };

    Views: {
      vw_dashboard_sales_summary: {
        Row: {
          tenant_id: string; month: string;
          total_orders: number; unique_customers: number;
          gross_revenue: number; total_discounts: number; net_revenue: number;
          total_freight: number; avg_ticket: number;
          delivered_orders: number; cancelled_orders: number; pending_orders: number;
        };
      };
      vw_sales_by_day: {
        Row: {
          tenant_id: string; order_date: string;
          orders_count: number; revenue: number; discounts: number; avg_ticket: number;
        };
      };
      vw_sales_by_customer: {
        Row: {
          tenant_id: string; customer_id: string | null;
          customer_name: string | null; customer_document: string | null;
          abc_curve: string | null; segment: string | null;
          total_orders: number; total_revenue: number; avg_ticket: number;
          last_order_date: string | null; first_order_date: string | null;
        };
      };
      vw_sales_by_product: {
        Row: {
          tenant_id: string; product_id: string | null;
          sku: string | null; product_name: string | null;
          category: string | null; brand: string | null; abc_curve: string | null;
          total_qty_sold: number; total_revenue: number;
          avg_unit_price: number; order_count: number;
        };
      };
      vw_dashboard_inventory_summary: {
        Row: {
          tenant_id: string; warehouse: string;
          sku_count: number; total_qty_available: number;
          total_qty_reserved: number; total_qty_blocked: number;
          total_inventory_value: number; ruptura_count: number;
          sku_a_count: number; sku_b_count: number; sku_c_count: number;
          avg_coverage_days: number | null;
        };
      };
      vw_stock_by_product: {
        Row: {
          tenant_id: string; product_id: string | null;
          sku: string | null; product_name: string | null;
          category: string | null; brand: string | null; abc_curve: string | null;
          min_stock: number | null; max_stock: number | null; reorder_point: number | null;
          warehouse: string; qty_available: number; qty_reserved: number;
          qty_blocked: number; qty_in_transit: number; qty_physical: number;
          avg_cost: number; total_cost: number;
          coverage_days: number | null; ruptura: boolean; position_date: string;
          stock_alert: 'sem_estoque' | 'ponto_pedido' | 'estoque_minimo' | 'normal';
        };
      };
      vw_expiring_lots: {
        Row: {
          tenant_id: string; product_id: string | null;
          sku: string | null; product_name: string | null; category: string | null;
          lot_number: string; warehouse: string;
          expiry_date: string | null; days_to_expiry: number | null;
          qty_current: number; unit_cost: number; total_cost: number;
          status: string;
          expiry_alert: 'vencido' | 'critico' | 'urgente' | 'atencao' | 'ok';
        };
      };
      vw_dashboard_finance_summary: {
        Row: {
          tenant_id: string;
          ar_open_balance: number; ar_overdue_balance: number;
          ar_received_this_month: number; ar_due_next_30: number;
          ap_open_balance: number; ap_overdue_balance: number;
          ap_paid_this_month: number; ap_due_next_30: number;
          net_position: number;
        };
      };
      vw_accounts_receivable_open: {
        Row: {
          tenant_id: string; id: string;
          document_number: string | null; parcel: string | null;
          customer_id: string | null; customer_name: string | null; customer_document: string | null;
          invoice_id: string | null;
          issue_date: string; due_date: string; days_overdue: number;
          status: string; face_value: number; paid_amount: number;
          interest_amount: number; discount_amount: number; balance: number;
          payment_method: string | null;
          aging_bucket: 'em_dia' | 'atraso_1_15' | 'atraso_16_30' | 'atraso_31_60' | 'atraso_61_90' | 'atraso_90_mais';
        };
      };
      vw_accounts_payable_open: {
        Row: {
          tenant_id: string; id: string;
          document_number: string | null; parcel: string | null;
          supplier_name: string | null; supplier_document: string | null;
          category: string | null; cost_center: string | null;
          issue_date: string; due_date: string; days_overdue: number;
          status: string; face_value: number; paid_amount: number;
          interest_amount: number; discount_amount: number; balance: number;
          payment_method: string | null;
          aging_bucket: 'em_dia' | 'atraso_1_15' | 'atraso_16_30' | 'atraso_31_60' | 'atraso_61_90' | 'atraso_90_mais';
        };
      };

      // ── 021: BI Views ────────────────────────────────────────────────────────
      vw_sales_rep_performance: {
        Row: {
          tenant_id: string; sales_rep_id: string; sales_rep_name: string;
          region: string | null; month: string;
          total_orders: number; unique_customers: number;
          total_revenue: number; avg_order_value: number;
          revenue_per_customer: number | null;
          cancelled_orders: number; delivery_rate_pct: number | null;
        };
      };

      vw_product_ranking: {
        Row: {
          tenant_id: string; product_id: string; product_name: string;
          sku: string | null; category_id: string | null; month: string;
          total_qty_sold: number; total_revenue: number;
          order_count: number; customer_count: number; revenue_rank: number;
        };
      };

      vw_customer_ranking: {
        Row: {
          tenant_id: string; customer_id: string; customer_name: string;
          customer_document: string | null; month: string;
          total_orders: number; total_revenue: number; avg_ticket: number;
          last_order_date: string | null; revenue_rank: number;
        };
      };

      vw_daily_kpis: {
        Row: {
          tenant_id: string; kpi_date: string;
          new_orders: number; gross_revenue: number;
          cancelled_orders: number; cancelled_revenue: number | null;
          active_customers: number;
          deliveries_done: number; pending_deliveries: number;
        };
      };

      vw_ar_aging: {
        Row: {
          tenant_id: string; id: string; customer_id: string; customer_name: string;
          document_number: string | null; amount: number; amount_paid: number;
          balance: number; due_date: string; days_overdue: number;
          aging_bucket: 'paid' | 'current' | '1-30' | '31-60' | '61-90' | '90+';
          status: string;
        };
      };

      vw_goals_vs_actual: {
        Row: {
          tenant_id: string; sales_rep_id: string; sales_rep_name: string;
          period_year: number; period_month: number;
          target_revenue: number; target_orders: number | null;
          actual_revenue: number; actual_orders: number;
          revenue_attainment_pct: number | null; orders_attainment_pct: number | null;
        };
      };

      vw_critical_stock: {
        Row: {
          tenant_id: string; product_id: string; product_name: string;
          sku: string | null; warehouse: string; current_stock: number;
          min_stock: number | null; max_stock: number | null;
          stock_status: 'out_of_stock' | 'critical' | 'low' | 'ok';
          qty_to_reorder: number | null;
        };
      };

      vw_stock_reservations_summary: {
        Row: {
          tenant_id: string; product_id: string; product_name: string;
          product_sku: string | null; warehouse: string; total_reserved: number;
        };
      };

      vw_inventory_count_summary: {
        Row: {
          tenant_id: string; id: string; count_number: string; status: string;
          warehouse: string; started_at: string | null; finished_at: string | null;
          total_items: number; counted_items: number; total_divergence: number;
        };
      };

      vw_cash_flow: {
        Row: {
          tenant_id: string; bank_account_id: string; account_name: string;
          flow_date: string; credits: number; debits: number;
          net: number; running_balance: number;
        };
      };

      vw_financial_summary: {
        Row: {
          tenant_id: string; month: string;
          total_receivable: number; total_received: number; balance_receivable: number;
          overdue_count: number; overdue_amount: number | null;
        };
      };

      vw_deliveries_summary: {
        Row: {
          tenant_id: string; status: string; total: number;
          overdue: number; avg_delivery_hours: number | null;
        };
      };
    };

    Functions: {
      get_user_tenant_id: { Args: Record<string, never>; Returns: string };
      log_audit: {
        Args: {
          p_tenant_id: string; p_user_id: string; p_action: string;
          p_entity: string; p_entity_id: string; p_changes?: Json;
        };
        Returns: void;
      };
    };
  };
}

// ── Atalhos de conveniência ────────────────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
