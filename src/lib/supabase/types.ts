// Auto-generated types — regenerate via: npm run db:types
// Referência manual enquanto Supabase CLI não estiver configurado

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: { id: string; name: string; slug: string; plan: string; is_active: boolean; settings: Json; created_at: string; updated_at: string };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      customers: {
        Row: { id: string; tenant_id: string; source_system: string; source_id: string; code: string | null; name: string; trade_name: string | null; document: string | null; document_type: string | null; email: string | null; phone: string | null; address: Json; segment: string | null; classification: string | null; credit_limit: number | null; payment_terms: string | null; is_active: boolean; extra: Json; created_at: string; updated_at: string; synced_at: string | null };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      products: {
        Row: { id: string; tenant_id: string; source_system: string; source_id: string; sku: string | null; name: string; description: string | null; category: string | null; subcategory: string | null; brand: string | null; unit: string; unit_weight: number | null; units_per_box: number | null; cost_price: number | null; sale_price: number | null; min_price: number | null; ncm: string | null; ean: string | null; abc_curve: string | null; is_fractionable: boolean; requires_cold: boolean; shelf_life_days: number | null; min_stock: number | null; max_stock: number | null; reorder_point: number | null; is_active: boolean; extra: Json; created_at: string; updated_at: string; synced_at: string | null };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      sales_orders: {
        Row: { id: string; tenant_id: string; source_system: string; source_id: string; customer_id: string | null; customer_source_id: string | null; order_number: string | null; order_date: string; delivery_date: string | null; status: string; payment_terms: string | null; payment_method: string | null; salesperson: string | null; branch: string | null; channel: string | null; subtotal: number; discount_amount: number; tax_amount: number; freight_amount: number; total_amount: number; notes: string | null; extra: Json; created_at: string; updated_at: string; synced_at: string | null };
        Insert: Omit<Database['public']['Tables']['sales_orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sales_orders']['Insert']>;
      };
      accounts_receivable: {
        Row: { id: string; tenant_id: string; source_system: string; source_id: string; customer_id: string | null; invoice_id: string | null; document_number: string | null; parcel: string | null; issue_date: string; due_date: string; payment_date: string | null; days_overdue: number; status: string; face_value: number; paid_amount: number; interest_amount: number; discount_amount: number; balance: number; payment_method: string | null; bank_account: string | null; notes: string | null; extra: Json; created_at: string; updated_at: string; synced_at: string | null };
        Insert: Omit<Database['public']['Tables']['accounts_receivable']['Row'], 'id' | 'created_at' | 'updated_at' | 'days_overdue' | 'balance'>;
        Update: Partial<Database['public']['Tables']['accounts_receivable']['Insert']>;
      };
      accounts_payable: {
        Row: { id: string; tenant_id: string; source_system: string; source_id: string; supplier_source_id: string | null; supplier_name: string | null; supplier_document: string | null; document_number: string | null; parcel: string | null; category: string | null; cost_center: string | null; issue_date: string; due_date: string; payment_date: string | null; days_overdue: number; status: string; face_value: number; paid_amount: number; interest_amount: number; discount_amount: number; balance: number; payment_method: string | null; bank_account: string | null; notes: string | null; extra: Json; created_at: string; updated_at: string; synced_at: string | null };
        Insert: Omit<Database['public']['Tables']['accounts_payable']['Row'], 'id' | 'created_at' | 'updated_at' | 'days_overdue' | 'balance'>;
        Update: Partial<Database['public']['Tables']['accounts_payable']['Insert']>;
      };
      stock_positions: {
        Row: { id: string; tenant_id: string; source_system: string; source_id: string; product_id: string | null; product_source_id: string | null; warehouse: string; location: string | null; qty_available: number; qty_reserved: number; qty_blocked: number; qty_in_transit: number; qty_physical: number; avg_cost: number; total_cost: number; coverage_days: number | null; abc_curve: string | null; ruptura: boolean; position_date: string; extra: Json; created_at: string; updated_at: string; synced_at: string | null };
        Insert: Omit<Database['public']['Tables']['stock_positions']['Row'], 'id' | 'created_at' | 'updated_at' | 'qty_physical' | 'total_cost'>;
        Update: Partial<Database['public']['Tables']['stock_positions']['Insert']>;
      };
      stock_lots: {
        Row: { id: string; tenant_id: string; source_system: string; source_id: string; product_id: string | null; product_source_id: string | null; lot_number: string; warehouse: string; location: string | null; manufacture_date: string | null; expiry_date: string | null; days_to_expiry: number | null; status: string; is_open_box: boolean; units_per_box: number | null; qty_initial: number; qty_current: number; qty_consumed: number; unit_cost: number; total_cost: number; fefo_compliant: boolean; extra: Json; created_at: string; updated_at: string; synced_at: string | null };
        Insert: Omit<Database['public']['Tables']['stock_lots']['Row'], 'id' | 'created_at' | 'updated_at' | 'days_to_expiry' | 'total_cost'>;
        Update: Partial<Database['public']['Tables']['stock_lots']['Insert']>;
      };
    };
    Views: {
      vw_dashboard_sales_summary: { Row: Record<string, unknown> };
      vw_sales_by_day: { Row: Record<string, unknown> };
      vw_sales_by_customer: { Row: Record<string, unknown> };
      vw_sales_by_product: { Row: Record<string, unknown> };
      vw_dashboard_inventory_summary: { Row: Record<string, unknown> };
      vw_stock_by_product: { Row: Record<string, unknown> };
      vw_expiring_lots: { Row: Record<string, unknown> };
      vw_dashboard_finance_summary: { Row: Record<string, unknown> };
      vw_accounts_receivable_open: { Row: Record<string, unknown> };
      vw_accounts_payable_open: { Row: Record<string, unknown> };
    };
    Functions: {
      get_user_tenant_id: { Args: Record<string, never>; Returns: string };
    };
  };
}
