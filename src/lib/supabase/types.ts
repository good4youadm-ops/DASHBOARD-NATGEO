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
    };

    Functions: {
      get_user_tenant_id: { Args: Record<string, never>; Returns: string };
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
