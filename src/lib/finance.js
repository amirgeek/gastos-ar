import { DEFAULT_YIELD_RATES } from './catalog';

export const STORAGE_KEY = 'caja-ar-v1';
export const AUTH_KEY = 'pesito-ar-auth-v1';
export const TABLES = {
  accounts: 'accounts',
  transactions: 'transactions',
  debts: 'debts',
  installments: 'installments',
  creditCards: 'credit_cards',
  cardPurchases: 'card_purchases',
  budgets: 'budgets',
  yields: 'yield_rates',
};

export const palette = ['#1f4fff', '#6d8cff', '#b1c4ff', '#d6dffe', '#eef2ff', '#7e56da', '#d6c8ff'];

export function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function future(days = 0) { return today(days); }
export function formatMoney(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0 }).format(value || 0);
}
export function parseNum(v) { return Number(String(v).replace(',', '.')) || 0; }
export function slugify(value = '') { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
export function formatDate(date) { return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(date); }
export function formatDateValue(date) { return new Date(date).toISOString().slice(0, 10); }
export function daysUntil(date) { return Math.ceil((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000); }
export function futureDateString(months, baseDate = new Date()) {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + months);
  return formatDateValue(next);
}
export function daysInMonth(year, monthIndex) { return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate(); }
export function nextCycleDate(dayOfMonth, from = new Date()) {
  const base = new Date(from);
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  date.setUTCDate(Math.max(1, Math.min(dayOfMonth || 1, daysInMonth(date.getUTCFullYear(), date.getUTCMonth()))));
  const todayUtc = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  if (date < todayUtc) {
    date.setUTCMonth(date.getUTCMonth() + 1);
    date.setUTCDate(Math.max(1, Math.min(dayOfMonth || 1, daysInMonth(date.getUTCFullYear(), date.getUTCMonth()))));
  }
  return date;
}
export function nextDueAfter(closeDate, dueDay) {
  const date = new Date(closeDate);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(Math.max(1, Math.min(dueDay || 1, daysInMonth(date.getUTCFullYear(), date.getUTCMonth()))));
  return date;
}
export function addMonthsIso(isoDate, months = 1) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
export function getInstallmentsRemaining(purchase) {
  return Math.max(0, purchase.installments - purchase.currentInstallment + 1);
}

export const seed = {
  accounts: [
    { id: 'acc-1', name: 'Mercado Pago', type: 'wallet', currency: 'ARS', balance: 280000, provider: 'mercado-pago' },
    { id: 'acc-2', name: 'Naranja X', type: 'wallet', currency: 'ARS', balance: 160000, provider: 'naranjax' },
    { id: 'acc-3', name: 'Ualá', type: 'wallet', currency: 'ARS', balance: 120000, provider: 'uala' },
    { id: 'acc-4', name: 'Santander cuenta sueldo', type: 'bank', currency: 'ARS', balance: 420000, provider: 'santander' },
    { id: 'acc-5', name: 'ICBC Alpha Pesos', type: 'investment', currency: 'ARS', balance: 310000, provider: 'icbc-alpha' },
    { id: 'acc-6', name: 'Plazo fijo Banco Galicia', type: 'investment', currency: 'ARS', balance: 500000, provider: 'plazo-fijo-banco-galicia' },
    { id: 'acc-7', name: 'Efectivo', type: 'cash', currency: 'ARS', balance: 60000, provider: 'cash' },
    { id: 'acc-8', name: 'Dólares ahorro', type: 'savings', currency: 'USD', balance: 540, provider: 'usd' },
  ],
  transactions: [
    { id: 'tx-1', kind: 'income', amount: 1850000, currency: 'ARS', accountId: 'acc-4', category: 'Trabajo', note: 'Sueldo', date: today(-20) },
    { id: 'tx-2', kind: 'income', amount: 280000, currency: 'ARS', accountId: 'acc-1', category: 'Freelance', note: 'Proyecto extra', date: today(-11) },
    { id: 'tx-3', kind: 'expense', amount: 420000, currency: 'ARS', accountId: 'acc-4', category: 'Alquiler', note: 'Depto', date: today(-18) },
    { id: 'tx-4', kind: 'expense', amount: 134000, currency: 'ARS', accountId: 'acc-1', category: 'Supermercado', note: 'Compra del mes', date: today(-14) },
    { id: 'tx-5', kind: 'expense', amount: 58200, currency: 'ARS', accountId: 'acc-3', category: 'Servicios', note: 'Luz, agua, internet', date: today(-9) },
    { id: 'tx-6', kind: 'expense', amount: 39000, currency: 'ARS', accountId: 'acc-2', category: 'Transporte', note: 'SUBE, nafta, peajes', date: today(-8) },
    { id: 'tx-7', kind: 'expense', amount: 86400, currency: 'ARS', accountId: 'acc-1', category: 'Comida', note: 'Pedidos + almuerzos', date: today(-5) },
    { id: 'tx-8', kind: 'expense', amount: 41200, currency: 'ARS', accountId: 'acc-7', category: 'Salidas', note: 'Fin de semana', date: today(-2) },
  ],
  debts: [
    { id: 'debt-1', kind: 'owed', person: 'Mauro', total: 180000, remaining: 120000, currency: 'ARS', dueDate: future(8), note: 'Préstamo puente' },
    { id: 'debt-2', kind: 'receivable', person: 'Sofi', total: 90000, remaining: 90000, currency: 'ARS', dueDate: future(12), note: 'Viaje compartido' },
  ],
  installments: [
    { id: 'inst-1', title: 'Notebook', total: 1200000, installments: 12, paidCount: 5, installmentAmount: 100000, currency: 'ARS', accountId: 'acc-4', category: 'Tecnología' },
    { id: 'inst-2', title: 'Heladera', total: 840000, installments: 9, paidCount: 2, installmentAmount: 93333.33, currency: 'ARS', accountId: 'acc-4', category: 'Hogar' },
  ],
  creditCards: [
    { id: 'card-1', name: 'Visa Santander', bank: 'Santander', closingDay: 24, dueDay: 2, limit: 2200000, available: 1460000, currency: 'ARS' },
    { id: 'card-2', name: 'Amex Galicia', bank: 'Galicia', closingDay: 18, dueDay: 29, limit: 1800000, available: 1190000, currency: 'ARS' },
  ],
  cardPurchases: [
    { id: 'cp-1', cardId: 'card-1', title: 'Seguro del auto', total: 210000, installments: 3, currentInstallment: 1, installmentAmount: 70000, purchaseDate: today(-10), nextDueMonth: future(6), category: 'Auto' },
    { id: 'cp-2', cardId: 'card-1', title: 'Pasajes', total: 540000, installments: 6, currentInstallment: 2, installmentAmount: 90000, purchaseDate: today(-25), nextDueMonth: future(6), category: 'Viajes' },
    { id: 'cp-3', cardId: 'card-2', title: 'Sillón', total: 960000, installments: 12, currentInstallment: 4, installmentAmount: 80000, purchaseDate: today(-54), nextDueMonth: future(3), category: 'Hogar' },
  ],
  budgets: [
    { id: 'bud-1', category: 'Supermercado', amount: 180000 },
    { id: 'bud-2', category: 'Comida', amount: 110000 },
    { id: 'bud-3', category: 'Salidas', amount: 70000 },
    { id: 'bud-4', category: 'Servicios', amount: 70000 },
  ],
  yields: {
    updatedAt: new Date().toISOString(),
    rates: DEFAULT_YIELD_RATES,
  },
};

export function mergeSeed(saved) {
  if (!saved || typeof saved !== 'object') return seed;
  return {
    ...seed,
    ...saved,
    accounts: Array.isArray(saved.accounts) ? saved.accounts : seed.accounts,
    transactions: Array.isArray(saved.transactions) ? saved.transactions : seed.transactions,
    debts: Array.isArray(saved.debts) ? saved.debts : seed.debts,
    installments: Array.isArray(saved.installments) ? saved.installments : seed.installments,
    creditCards: Array.isArray(saved.creditCards) ? saved.creditCards : seed.creditCards,
    cardPurchases: Array.isArray(saved.cardPurchases) ? saved.cardPurchases : seed.cardPurchases,
    budgets: Array.isArray(saved.budgets) ? saved.budgets : seed.budgets,
    yields: saved.yields && typeof saved.yields === 'object' ? { ...seed.yields, ...saved.yields, rates: Array.isArray(saved.yields.rates) ? saved.yields.rates : seed.yields.rates } : seed.yields,
  };
}
export function mergeRemoteData(remote) { return { ...seed, ...remote }; }

export function mapAccountToDb(account, userId) { return { id: account.id, user_id: userId, name: account.name, type: account.type, currency: account.currency, balance: account.balance, provider: account.provider }; }
export function mapTransactionToDb(tx, userId) { return { id: tx.id, user_id: userId, kind: tx.kind, amount: tx.amount, currency: tx.currency, account_id: tx.accountId, category: tx.category, note: tx.note, date: tx.date }; }
export function mapDebtToDb(debt, userId) { return { id: debt.id, user_id: userId, kind: debt.kind, person: debt.person, total: debt.total, remaining: debt.remaining, currency: debt.currency, due_date: debt.dueDate, note: debt.note }; }
export function mapInstallmentToDb(inst, userId) { return { id: inst.id, user_id: userId, title: inst.title, total: inst.total, installments: inst.installments, paid_count: inst.paidCount, installment_amount: inst.installmentAmount, currency: inst.currency, account_id: inst.accountId, category: inst.category }; }
export function mapCreditCardToDb(card, userId) { return { id: card.id, user_id: userId, name: card.name, bank: card.bank, closing_day: card.closingDay, due_day: card.dueDay, limit_amount: card.limit, available_amount: card.available, currency: card.currency }; }
export function mapCardPurchaseToDb(purchase, userId) { return { id: purchase.id, user_id: userId, card_id: purchase.cardId, title: purchase.title, total: purchase.total, installments: purchase.installments, current_installment: purchase.currentInstallment, installment_amount: purchase.installmentAmount, purchase_date: purchase.purchaseDate, next_due_month: purchase.nextDueMonth, category: purchase.category }; }
export function mapBudgetToDb(item, userId) { return { id: item.id, user_id: userId, category: item.category, amount: item.amount }; }
export function mapYieldToDb(item, userId) { return { id: item.id, user_id: userId, provider: item.provider, label: item.label, tna: item.tna, updated_at: new Date().toISOString() }; }
export function fromDbBundle(bundle) {
  const rates = (bundle.yields || []).map((row) => ({ id: row.id, provider: row.provider, label: row.label, tna: Number(row.tna || 0) }));
  return {
    accounts: (bundle.accounts || []).map((row) => ({ id: row.id, name: row.name, type: row.type, currency: row.currency, balance: Number(row.balance || 0), provider: row.provider || '' })),
    transactions: (bundle.transactions || []).map((row) => ({ id: row.id, kind: row.kind, amount: Number(row.amount || 0), currency: row.currency, accountId: row.account_id, category: row.category, note: row.note || '', date: row.date })),
    debts: (bundle.debts || []).map((row) => ({ id: row.id, kind: row.kind, person: row.person, total: Number(row.total || 0), remaining: Number(row.remaining || 0), currency: row.currency, dueDate: row.due_date, note: row.note || '' })),
    installments: (bundle.installments || []).map((row) => ({ id: row.id, title: row.title, total: Number(row.total || 0), installments: Number(row.installments || 0), paidCount: Number(row.paid_count || 0), installmentAmount: Number(row.installment_amount || 0), currency: row.currency, accountId: row.account_id, category: row.category })),
    creditCards: (bundle.creditCards || []).map((row) => ({ id: row.id, name: row.name, bank: row.bank, closingDay: Number(row.closing_day || 0), dueDay: Number(row.due_day || 0), limit: Number(row.limit_amount || 0), available: Number(row.available_amount || 0), currency: row.currency })),
    cardPurchases: (bundle.cardPurchases || []).map((row) => ({ id: row.id, cardId: row.card_id, title: row.title, total: Number(row.total || 0), installments: Number(row.installments || 1), currentInstallment: Number(row.current_installment || 1), installmentAmount: Number(row.installment_amount || 0), purchaseDate: row.purchase_date, nextDueMonth: row.next_due_month, category: row.category })),
    budgets: (bundle.budgets || []).map((row) => ({ id: row.id, category: row.category, amount: Number(row.amount || 0) })),
    yields: { updatedAt: bundle.yields?.[0]?.updated_at || new Date().toISOString(), rates: rates.length ? rates : seed.yields.rates },
  };
}
