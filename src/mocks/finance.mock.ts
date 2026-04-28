const TENANT = '00000000-0000-0000-0000-000000000001';

export const mockFinanceSummary = {
  tenant_id: TENANT,
  ar_open_balance: 485_320.50,
  ar_overdue_balance: 87_450.00,
  ar_received_this_month: 320_000.00,
  ar_due_next_30: 195_000.00,
  ap_open_balance: 280_150.75,
  ap_overdue_balance: 32_000.00,
  ap_paid_this_month: 210_000.00,
  ap_due_next_30: 145_000.00,
  net_position: 205_169.75,
};

export const mockAccountsReceivable = Array.from({ length: 25 }, (_, i) => {
  const daysOverdue = i < 5 ? 0 : i < 10 ? Math.floor(1 + Math.random() * 15) : Math.floor(16 + Math.random() * 75);
  const dueDate = new Date(Date.now() - daysOverdue * 86400000);
  return {
    tenant_id: TENANT,
    id: `ar-${i + 1}`,
    document_number: `NF${String(10000 + i)}`,
    parcel: `1/${Math.ceil(Math.random() * 3)}`,
    customer_id: `cust-${(i % 10) + 1}`,
    customer_name: `Cliente ${(i % 10) + 1} Ltda`,
    customer_document: `12.${String(i + 1).padStart(3, '0')}.000/0001-00`,
    issue_date: new Date(dueDate.getTime() - 30 * 86400000).toISOString().slice(0, 10),
    due_date: dueDate.toISOString().slice(0, 10),
    days_overdue: daysOverdue,
    status: daysOverdue === 0 ? 'open' : 'overdue',
    face_value: 5000 + Math.random() * 20000,
    paid_amount: 0,
    interest_amount: daysOverdue * 2.5,
    discount_amount: 0,
    balance: 5000 + Math.random() * 20000 + daysOverdue * 2.5,
    payment_method: ['Boleto', 'PIX', 'Cheque'][i % 3],
    aging_bucket: daysOverdue === 0 ? 'em_dia' : daysOverdue <= 15 ? 'atraso_1_15' : daysOverdue <= 30 ? 'atraso_16_30' : 'atraso_31_60',
  };
});

export const mockAccountsPayable = Array.from({ length: 20 }, (_, i) => {
  const daysOverdue = i < 8 ? 0 : Math.floor(1 + Math.random() * 45);
  const dueDate = new Date(Date.now() - daysOverdue * 86400000);
  return {
    tenant_id: TENANT,
    id: `ap-${i + 1}`,
    document_number: `FAT${String(5000 + i)}`,
    parcel: '1/1',
    supplier_name: `Fornecedor ${i + 1}`,
    supplier_document: `98.765.${String(i + 1).padStart(3, '0')}/0001-00`,
    category: ['Matéria Prima', 'Serviços', 'Logística', 'Embalagem'][i % 4],
    cost_center: `CC${String(i % 5 + 1).padStart(3, '0')}`,
    issue_date: new Date(dueDate.getTime() - 30 * 86400000).toISOString().slice(0, 10),
    due_date: dueDate.toISOString().slice(0, 10),
    days_overdue: daysOverdue,
    status: daysOverdue === 0 ? 'open' : 'overdue',
    face_value: 3000 + Math.random() * 15000,
    paid_amount: 0,
    interest_amount: daysOverdue * 1.8,
    discount_amount: 0,
    balance: 3000 + Math.random() * 15000 + daysOverdue * 1.8,
    payment_method: ['Boleto', 'TED'][i % 2],
    aging_bucket: daysOverdue === 0 ? 'em_dia' : daysOverdue <= 15 ? 'atraso_1_15' : 'atraso_16_30',
  };
});
