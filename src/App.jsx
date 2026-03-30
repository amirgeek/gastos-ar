import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import { DEFAULT_YIELD_RATES, KNOWN_ACCOUNT_OPTIONS, OTHER_ACCOUNT_OPTION, getKnownAccount } from './lib/catalog';
import { AUTH_KEY, STORAGE_KEY, TABLES, addMonthsIso, daysUntil, formatDate, formatDateValue, formatMoney, fromDbBundle, future, futureDateString, getInstallmentsRemaining, mapAccountToDb, mapBudgetToDb, mapCardPurchaseToDb, mapCreditCardToDb, mapDebtToDb, mapInstallmentToDb, mapTransactionToDb, mapYieldToDb, mergeRemoteData, mergeSeed, nextCycleDate, nextDueAfter, palette, parseNum, seed, slugify, today } from './lib/finance';
import { buildAccountsWithYield, buildEmptyState, buildSetupChecklist, buildYieldRecommendation, getBestYield } from './lib/yieldEngine';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';


const accountIcons = { wallet: Wallet, bank: Landmark, cash: Banknote, savings: PiggyBank, investment: TrendingUp, card: CreditCard };

export default function App() {
  const [auth, setAuth] = useState(() => {
    try { const saved = localStorage.getItem(AUTH_KEY); return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [data, setData] = useState(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? mergeSeed(JSON.parse(saved)) : seed; } catch { return seed; }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [yieldStatus, setYieldStatus] = useState('idle');
  const [subStatus, setSubStatus] = useState('idle');
  const [dataStatus, setDataStatus] = useState('idle');
  const [syncError, setSyncError] = useState('');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); else localStorage.removeItem(AUTH_KEY); }, [auth]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { const user = data.session?.user; if (user) setAuthFromUser(user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) setAuthFromUser(user);
      else {
        setAuth(null); setData(seed); setDataStatus('idle'); setSyncError('');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth?.id) return;
    if (!supabase) { setDataStatus('local'); return; }
    let cancelled = false;
    (async () => {
      setDataStatus('loading'); setSyncError('');
      try {
        const remote = await loadRemoteData(auth.id);
        if (cancelled) return;
        setData(mergeRemoteData(fromDbBundle(remote)));
        if (!cancelled) setDataStatus('ready');
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setDataStatus('error');
        setSyncError(error.message || 'No se pudieron cargar tus datos');
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.id]);

  function setAuthFromUser(user) {
    setAuth({ id: user.id, email: user.email, name: user.user_metadata?.name || user.email, plan: user.user_metadata?.plan || 'free' });
  }

  const arsAccounts = data.accounts.filter((a) => a.currency === 'ARS');
  const arsTotal = arsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const usdTotal = data.accounts.filter((a) => a.currency === 'USD').reduce((sum, acc) => sum + acc.balance, 0);
  const monthTransactions = data.transactions.filter((tx) => tx.date.slice(0, 7) === today().slice(0, 7));
  const incomeMonth = monthTransactions.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseMonth = monthTransactions.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
  const debtOut = data.debts.filter((d) => d.kind === 'owed').reduce((s, d) => s + d.remaining, 0);
  const debtIn = data.debts.filter((d) => d.kind === 'receivable').reduce((s, d) => s + d.remaining, 0);
  const monthlyInstallments = data.installments.reduce((s, i) => s + (i.paidCount < i.installments ? i.installmentAmount : 0), 0);
  const totalCardLimit = data.creditCards.reduce((s, c) => s + c.limit, 0);
  const totalCardAvailable = data.creditCards.reduce((s, c) => s + c.available, 0);

  const budgetsView = useMemo(() => {
    const expensesByCategory = new Map();
    monthTransactions.filter((t) => t.kind === 'expense').forEach((tx) => expensesByCategory.set(tx.category, (expensesByCategory.get(tx.category) || 0) + tx.amount));
    return data.budgets.map((budget) => {
      const spent = expensesByCategory.get(budget.category) || 0;
      const pct = budget.amount ? Math.min(160, (spent / budget.amount) * 100) : 0;
      return { ...budget, spent, remaining: budget.amount - spent, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [data.budgets, monthTransactions]);

  const cardsSummary = useMemo(() => {
    const now = new Date();
    return data.creditCards.map((card) => {
      const purchases = data.cardPurchases.filter((purchase) => purchase.cardId === card.id);
      const nextClosingDate = nextCycleDate(card.closingDay, now);
      const nextDueDate = nextDueAfter(nextClosingDate, card.dueDay);
      const secondDueDate = nextDueAfter(nextCycleDate(card.closingDay, new Date(nextClosingDate.getTime() + 86400000)), card.dueDay);
      const nextStatementAmount = purchases.filter((purchase) => purchase.nextDueMonth && purchase.nextDueMonth <= formatDateValue(nextDueDate) && getInstallmentsRemaining(purchase) > 0).reduce((sum, purchase) => sum + purchase.installmentAmount, 0);
      const followingStatementAmount = purchases.filter((purchase) => purchase.nextDueMonth && purchase.nextDueMonth > formatDateValue(nextDueDate) && purchase.nextDueMonth <= formatDateValue(secondDueDate) && getInstallmentsRemaining(purchase) > 0).reduce((sum, purchase) => sum + purchase.installmentAmount, 0);
      const totalCommitted = purchases.reduce((sum, purchase) => sum + purchase.installmentAmount * getInstallmentsRemaining(purchase), 0);
      const utilization = card.limit ? ((card.limit - card.available) / card.limit) * 100 : 0;
      const urgentPurchases = purchases.filter((purchase) => purchase.nextDueMonth && purchase.nextDueMonth <= formatDateValue(nextDueDate)).sort((a, b) => a.nextDueMonth.localeCompare(b.nextDueMonth));
      return { ...card, purchases, nextClosingDate, nextDueDate, secondDueDate, nextStatementAmount, followingStatementAmount, totalCommitted, utilization, urgentPurchases };
    }).sort((a, b) => a.nextDueDate - b.nextDueDate);
  }, [data.cardPurchases, data.creditCards]);

  const nextCardDue = cardsSummary.reduce((sum, card) => sum + card.nextStatementAmount, 0);
  const closestCard = cardsSummary[0] || null;

  const categoryData = useMemo(() => {
    const map = new Map();
    monthTransactions.filter((t) => t.kind === 'expense').forEach((tx) => map.set(tx.category, (map.get(tx.category) || 0) + tx.amount));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [monthTransactions]);

  const accountsPie = arsAccounts.map((acc) => ({ name: acc.name, value: acc.balance }));
  const monthlyBars = useMemo(() => {
    const months = {};
    data.transactions.forEach((tx) => { const key = tx.date.slice(0, 7); if (!months[key]) months[key] = { month: key, ingresos: 0, gastos: 0 }; months[key][tx.kind === 'income' ? 'ingresos' : 'gastos'] += tx.amount; });
    return Object.values(months).slice(-6);
  }, [data.transactions]);
  const timeline = useMemo(() => {
    let running = 0;
    return [...monthTransactions].sort((a, b) => a.date.localeCompare(b.date)).map((tx) => { running += tx.kind === 'income' ? tx.amount : -tx.amount; return { date: tx.date.slice(5), saldo: running }; });
  }, [monthTransactions]);
  const bestYield = useMemo(() => getBestYield(data.yields?.rates || []), [data.yields]);
  const accountsWithYield = useMemo(() => buildAccountsWithYield(arsAccounts, data.yields.rates), [arsAccounts, data.yields.rates]);
  const liquidAccounts = useMemo(() => accountsWithYield.filter((acc) => acc.type !== 'investment'), [accountsWithYield]);
  const monthlyFreeCash = Math.max(0, incomeMonth - expenseMonth - monthlyInstallments);
  const recommendation = useMemo(() => buildYieldRecommendation({ bestYield, liquidAccounts, monthlyFreeCash }), [bestYield, liquidAccounts, monthlyFreeCash]);
  const setupChecklist = useMemo(() => buildSetupChecklist(data), [data]);
  const setupProgress = useMemo(() => Math.round((setupChecklist.filter((item) => item.done).length / setupChecklist.length) * 100), [setupChecklist]);
  const emptyState = useMemo(() => buildEmptyState(activeTab), [activeTab]);
  const isPro = auth?.plan === 'pro';

  async function loadRemoteData(userId) {
    const [accounts, transactions, debts, installments, creditCards, cardPurchases, budgets, yields] = await Promise.all([
      supabase.from(TABLES.accounts).select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from(TABLES.transactions).select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from(TABLES.debts).select('*').eq('user_id', userId).order('due_date', { ascending: true }),
      supabase.from(TABLES.installments).select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from(TABLES.creditCards).select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from(TABLES.cardPurchases).select('*').eq('user_id', userId).order('purchase_date', { ascending: false }),
      supabase.from(TABLES.budgets).select('*').eq('user_id', userId).order('category', { ascending: true }),
      supabase.from(TABLES.yields).select('*').eq('user_id', userId).order('tna', { ascending: false }),
    ]);
    const firstError = [accounts, transactions, debts, installments, creditCards, cardPurchases, budgets, yields].find((result) => result.error)?.error;
    if (firstError) throw firstError;
    return { accounts: accounts.data || [], transactions: transactions.data || [], debts: debts.data || [], installments: installments.data || [], creditCards: creditCards.data || [], cardPurchases: cardPurchases.data || [], budgets: budgets.data || [], yields: yields.data || [] };
  }

  async function insertRemote(table, payload) { if (!supabase || !auth?.id) return; const { error } = await supabase.from(table).insert(payload); if (error) throw error; }
  async function updateRemote(table, id, payload) { if (!supabase || !auth?.id) return; const { error } = await supabase.from(table).update(payload).eq('id', id).eq('user_id', auth.id); if (error) throw error; }
  async function deleteRemote(table, id) { if (!supabase || !auth?.id) return; const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', auth.id); if (error) throw error; }
  async function syncAccountBalance(accountId, balance) { if (!supabase || !auth?.id || !accountId) return; const { error } = await supabase.from(TABLES.accounts).update({ balance }).eq('id', accountId).eq('user_id', auth.id); if (error) throw error; }
  async function syncCardAvailable(cardId, available) { if (!supabase || !auth?.id || !cardId) return; const { error } = await supabase.from(TABLES.creditCards).update({ available_amount: available }).eq('id', cardId).eq('user_id', auth.id); if (error) throw error; }

  function openCreate(type) { setModal({ type, mode: 'create' }); }
  function openEdit(type, item) { setModal({ type, mode: 'edit', item }); }
  function closeModal() { setModal(null); }
  function fail(error, fallback) { setSyncError(error.message || fallback); }

  async function refreshYields() {
    setYieldStatus('loading');
    try {
      const refreshedRates = DEFAULT_YIELD_RATES.map((rate) => ({ ...rate, tna: Number(rate.tna) }));
      if (supabase && auth?.id) {
        await Promise.all(data.yields.rates.map((rate) => deleteRemote(TABLES.yields, rate.id).catch(() => null)));
        await insertRemote(TABLES.yields, refreshedRates.map((rate) => mapYieldToDb(rate, auth.id)));
      }
      setData((prev) => ({ ...prev, yields: { updatedAt: new Date().toISOString(), rates: refreshedRates } }));
      setYieldStatus('done');
      setSyncError('');
    } catch (error) {
      setYieldStatus('error');
      fail(error, 'No pude actualizar rendimientos');
    }
  }

  async function saveAccount(form, current) {
    const known = form.provider && form.provider !== OTHER_ACCOUNT_OPTION.id ? getKnownAccount(form.provider) : null;
    const customName = (form.customName || '').trim();
    const accountName = known?.label || customName || form.name;
    const accountProvider = known?.id || slugify(customName || form.provider || form.name) || `custom-${crypto.randomUUID().slice(0, 8)}`;
    const account = { id: current?.id || crypto.randomUUID(), name: accountName, type: form.type || known?.accountType || 'wallet', currency: form.currency, balance: parseNum(form.balance), provider: accountProvider };

    try {
      if (current) await updateRemote(TABLES.accounts, current.id, mapAccountToDb(account, auth?.id));
      else await insertRemote(TABLES.accounts, mapAccountToDb(account, auth?.id));
      setData((prev) => ({ ...prev, accounts: current ? prev.accounts.map((item) => item.id === current.id ? account : item) : [account, ...prev.accounts] }));
      closeModal(); setSyncError('');
    } catch (error) { fail(error, 'No pude guardar la cuenta'); }
  }
  async function deleteAccount(item) {
    const hasLinks = data.transactions.some((tx) => tx.accountId === item.id) || data.installments.some((inst) => inst.accountId === item.id);
    if (hasLinks) return setSyncError('No podés borrar una cuenta con movimientos o cuotas asociadas.');
    try { await deleteRemote(TABLES.accounts, item.id); setData((prev) => ({ ...prev, accounts: prev.accounts.filter((acc) => acc.id !== item.id) })); setSyncError(''); } catch (error) { fail(error, 'No pude borrar la cuenta'); }
  }

  async function saveTransaction(form, current) {
    const amount = parseNum(form.amount);
    const tx = { id: current?.id || crypto.randomUUID(), kind: form.kind, amount, currency: form.currency, accountId: form.accountId, category: form.category, note: form.note, date: form.date };
    const balances = new Map(data.accounts.map((acc) => [acc.id, acc.balance]));
    const revert = (item) => item ? (item.kind === 'income' ? -item.amount : item.amount) : 0;
    const apply = (item) => item.kind === 'income' ? item.amount : -item.amount;
    if (current?.accountId) balances.set(current.accountId, (balances.get(current.accountId) || 0) + revert(current));
    if (tx.accountId) balances.set(tx.accountId, (balances.get(tx.accountId) || 0) + apply(tx));
    const nextAccounts = data.accounts.map((acc) => balances.has(acc.id) ? { ...acc, balance: balances.get(acc.id) } : acc);
    try {
      if (current) await updateRemote(TABLES.transactions, current.id, mapTransactionToDb(tx, auth?.id));
      else await insertRemote(TABLES.transactions, mapTransactionToDb(tx, auth?.id));
      await Promise.all(nextAccounts.filter((acc) => balances.has(acc.id)).map((acc) => syncAccountBalance(acc.id, acc.balance)));
      setData((prev) => ({ ...prev, transactions: current ? prev.transactions.map((item) => item.id === current.id ? tx : item) : [tx, ...prev.transactions], accounts: nextAccounts }));
      closeModal(); setSyncError('');
    } catch (error) { fail(error, 'No pude guardar el movimiento'); }
  }
  async function deleteTransaction(item) {
    const nextBalance = (data.accounts.find((acc) => acc.id === item.accountId)?.balance || 0) + (item.kind === 'income' ? -item.amount : item.amount);
    try {
      await deleteRemote(TABLES.transactions, item.id);
      if (item.accountId) await syncAccountBalance(item.accountId, nextBalance);
      setData((prev) => ({ ...prev, transactions: prev.transactions.filter((tx) => tx.id !== item.id), accounts: prev.accounts.map((acc) => acc.id === item.accountId ? { ...acc, balance: nextBalance } : acc) }));
      setSyncError('');
    } catch (error) { fail(error, 'No pude borrar el movimiento'); }
  }

  async function saveDebt(form, current) {
    const total = parseNum(form.total); const remaining = parseNum(form.remaining || form.total);
    const debt = { id: current?.id || crypto.randomUUID(), kind: form.kind, person: form.person, total, remaining, currency: form.currency, dueDate: form.dueDate, note: form.note };
    try { current ? await updateRemote(TABLES.debts, current.id, mapDebtToDb(debt, auth?.id)) : await insertRemote(TABLES.debts, mapDebtToDb(debt, auth?.id)); setData((prev) => ({ ...prev, debts: current ? prev.debts.map((item) => item.id === current.id ? debt : item) : [debt, ...prev.debts] })); closeModal(); setSyncError(''); } catch (error) { fail(error, 'No pude guardar la deuda'); }
  }
  async function deleteDebt(item) { try { await deleteRemote(TABLES.debts, item.id); setData((prev) => ({ ...prev, debts: prev.debts.filter((debt) => debt.id !== item.id) })); setSyncError(''); } catch (error) { fail(error, 'No pude borrar la deuda'); } }

  async function saveInstallment(form, current) {
    const total = parseNum(form.total); const installments = Math.max(1, parseNum(form.installments));
    const plan = { id: current?.id || crypto.randomUUID(), title: form.title, total, installments, paidCount: parseNum(form.paidCount), installmentAmount: total / installments, currency: form.currency, accountId: form.accountId, category: form.category };
    try { current ? await updateRemote(TABLES.installments, current.id, mapInstallmentToDb(plan, auth?.id)) : await insertRemote(TABLES.installments, mapInstallmentToDb(plan, auth?.id)); setData((prev) => ({ ...prev, installments: current ? prev.installments.map((item) => item.id === current.id ? plan : item) : [plan, ...prev.installments] })); closeModal(); setSyncError(''); } catch (error) { fail(error, 'No pude guardar la cuota'); }
  }
  async function deleteInstallment(item) { try { await deleteRemote(TABLES.installments, item.id); setData((prev) => ({ ...prev, installments: prev.installments.filter((inst) => inst.id !== item.id) })); setSyncError(''); } catch (error) { fail(error, 'No pude borrar la cuota'); } }

  async function saveCreditCard(form, current) {
    const card = { id: current?.id || crypto.randomUUID(), name: form.name, bank: form.bank, closingDay: parseNum(form.closingDay), dueDay: parseNum(form.dueDay), limit: parseNum(form.limit), available: parseNum(form.available), currency: form.currency };
    try { current ? await updateRemote(TABLES.creditCards, current.id, mapCreditCardToDb(card, auth?.id)) : await insertRemote(TABLES.creditCards, mapCreditCardToDb(card, auth?.id)); setData((prev) => ({ ...prev, creditCards: current ? prev.creditCards.map((item) => item.id === current.id ? card : item) : [card, ...prev.creditCards] })); closeModal(); setSyncError(''); } catch (error) { fail(error, 'No pude guardar la tarjeta'); }
  }
  async function deleteCreditCard(item) {
    if (data.cardPurchases.some((purchase) => purchase.cardId === item.id)) return setSyncError('No podés borrar una tarjeta con compras asociadas.');
    try { await deleteRemote(TABLES.creditCards, item.id); setData((prev) => ({ ...prev, creditCards: prev.creditCards.filter((card) => card.id !== item.id) })); setSyncError(''); } catch (error) { fail(error, 'No pude borrar la tarjeta'); }
  }

  async function saveCardPurchase(form, current) {
    const total = parseNum(form.total); const installments = Math.max(1, parseNum(form.installments));
    const purchase = { id: current?.id || crypto.randomUUID(), cardId: form.cardId, title: form.title, total, installments, currentInstallment: parseNum(form.currentInstallment) || 1, installmentAmount: total / installments, purchaseDate: form.purchaseDate, nextDueMonth: form.nextDueMonth, category: form.category };
    const previousCard = current ? data.creditCards.find((card) => card.id === current.cardId) : null;
    const nextCard = data.creditCards.find((card) => card.id === form.cardId);
    const cardAvailables = new Map(data.creditCards.map((card) => [card.id, card.available]));
    if (current?.cardId) cardAvailables.set(current.cardId, (cardAvailables.get(current.cardId) || 0) + current.total);
    if (purchase.cardId) cardAvailables.set(purchase.cardId, Math.max(0, (cardAvailables.get(purchase.cardId) || nextCard?.limit || 0) - purchase.total));
    try {
      current ? await updateRemote(TABLES.cardPurchases, current.id, mapCardPurchaseToDb(purchase, auth?.id)) : await insertRemote(TABLES.cardPurchases, mapCardPurchaseToDb(purchase, auth?.id));
      if (previousCard) await syncCardAvailable(previousCard.id, cardAvailables.get(previousCard.id));
      if (nextCard) await syncCardAvailable(nextCard.id, cardAvailables.get(nextCard.id));
      setData((prev) => ({ ...prev, cardPurchases: current ? prev.cardPurchases.map((item) => item.id === current.id ? purchase : item) : [purchase, ...prev.cardPurchases], creditCards: prev.creditCards.map((card) => cardAvailables.has(card.id) ? { ...card, available: cardAvailables.get(card.id) } : card) }));
      closeModal(); setSyncError('');
    } catch (error) { fail(error, 'No pude guardar la compra con tarjeta'); }
  }
  async function deleteCardPurchase(item) {
    const nextAvailable = (data.creditCards.find((card) => card.id === item.cardId)?.available || 0) + item.total;
    try {
      await deleteRemote(TABLES.cardPurchases, item.id);
      await syncCardAvailable(item.cardId, nextAvailable);
      setData((prev) => ({ ...prev, cardPurchases: prev.cardPurchases.filter((purchase) => purchase.id !== item.id), creditCards: prev.creditCards.map((card) => card.id === item.cardId ? { ...card, available: nextAvailable } : card) }));
      setSyncError('');
    } catch (error) { fail(error, 'No pude borrar la compra con tarjeta'); }
  }

  async function saveBudget(form, current) {
    const budget = { id: current?.id || crypto.randomUUID(), category: form.category, amount: parseNum(form.amount) };
    try { current ? await updateRemote(TABLES.budgets, current.id, mapBudgetToDb(budget, auth?.id)) : await insertRemote(TABLES.budgets, mapBudgetToDb(budget, auth?.id)); setData((prev) => ({ ...prev, budgets: current ? prev.budgets.map((item) => item.id === current.id ? budget : item) : [...prev.budgets, budget] })); closeModal(); setSyncError(''); } catch (error) { fail(error, 'No pude guardar el presupuesto'); }
  }
  async function deleteBudget(item) { try { await deleteRemote(TABLES.budgets, item.id); setData((prev) => ({ ...prev, budgets: prev.budgets.filter((budget) => budget.id !== item.id) })); setSyncError(''); } catch (error) { fail(error, 'No pude borrar el presupuesto'); } }
  async function saveYield(form, current) {
    const rate = { id: current?.id || crypto.randomUUID(), provider: form.provider, label: form.label, tna: parseNum(form.tna) };
    try {
      current ? await updateRemote(TABLES.yields, current.id, mapYieldToDb(rate, auth?.id)) : await insertRemote(TABLES.yields, mapYieldToDb(rate, auth?.id));
      setData((prev) => ({ ...prev, yields: { updatedAt: new Date().toISOString(), rates: current ? prev.yields.rates.map((item) => item.id === current.id ? rate : item) : [...prev.yields.rates, rate] } }));
      closeModal(); setSyncError('');
    } catch (error) { fail(error, 'No pude guardar el rendimiento'); }
  }
  async function deleteYield(item) { try { await deleteRemote(TABLES.yields, item.id); setData((prev) => ({ ...prev, yields: { updatedAt: prev.yields.updatedAt, rates: prev.yields.rates.filter((rate) => rate.id !== item.id) } })); setSyncError(''); } catch (error) { fail(error, 'No pude borrar el rendimiento'); } }

  async function startSubscription() {
    try {
      setSubStatus('loading');
      const response = await fetch('/api/create-subscription-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: auth?.email || '', userId: auth?.id || null }) });
      const data = await response.json();
      const checkoutUrl = data.checkoutUrl || data.url || data.initPoint || data.link;
      if (!response.ok || !checkoutUrl) throw new Error(data.error || 'No se pudo generar el link');
      window.location.href = checkoutUrl;
    } catch (error) { console.error(error); setSubStatus('error'); }
  }
  async function handleAuth(payload, mode) {
    if (supabase) {
      if (mode === 'register') { const { error } = await supabase.auth.signUp({ email: payload.email, password: payload.password, options: { data: { name: payload.name } } }); if (error) throw error; return; }
      const { error } = await supabase.auth.signInWithPassword({ email: payload.email, password: payload.password }); if (error) throw error; return;
    }
    setAuth({ ...payload, plan: 'free' });
  }

  if (!auth) return <LandingScreen onAuth={handleAuth} />;

  return <div className="app-shell"><div className="noise" /><aside className="sidebar"><div><span className="eyebrow">Control financiero</span><h1>pesito.ar</h1><p>Una app argentina para ver tu plata real, tus deudas, tus cuotas y dónde te conviene tener los pesos.</p><div className="user-chip">{auth.name || auth.email}</div><div className={`plan-chip ${isPro ? 'pro' : 'free'}`}>{isPro ? 'Plan Pro activo' : 'Plan Free'}</div><small className="sync-chip">{dataStatus === 'loading' ? 'Sincronizando con Supabase…' : dataStatus === 'ready' ? 'Datos guardados por usuario' : dataStatus === 'local' ? 'Modo local sin Supabase' : dataStatus === 'error' ? 'Error de sincronización' : 'Listo'}</small>{syncError && <small className="error-text">{syncError}</small>}<small className="sync-chip">Podés elegir entre opciones conocidas de rendimiento o cargar tus propias cuentas y billeteras.</small></div><nav className="sidebar-nav">{[['dashboard', 'Dashboard'], ['accounts', 'Cuentas'], ['transactions', 'Movimientos'], ['debts', 'Deudas'], ['installments', 'Cuotas'], ['cards', 'Tarjetas'], ['planning', 'Planificación']].map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</nav><div className="sidebar-note"><strong>ARS hoy</strong><span>{formatMoney(arsTotal)}</span><small>{bestYield ? `Mejor TNA actual: ${bestYield.label} · ${bestYield.tna}%` : 'Sin datos de rendimiento'}</small>{closestCard && <small>Próximo vencimiento: {closestCard.name} · {formatDate(closestCard.nextDueDate)}</small>}</div><div className={`subscription-card ${isPro ? 'is-pro' : 'is-free'}`}><span className="eyebrow">Suscripción</span><h3>{isPro ? 'pesito.ar Pro activo' : 'Subí a pesito.ar Pro'}</h3><p>{isPro ? 'Tu cuenta ya tiene acceso completo a herramientas para ordenar, comparar y decidir mejor con tu plata.' : '$6.000 por mes para ordenar tus cuentas, seguir cuotas y tarjetas, y decidir mejor dónde tener la plata.'}</p><div className="subscription-points"><span>Onboarding guiado</span><span>Lectura de caja más clara</span><span>Rendimientos y tarjetas en un mismo flujo</span></div>{!isPro ? <button className="submit-btn full-btn" onClick={startSubscription}>{subStatus === 'loading' ? 'Generando link…' : 'Activar Pro'}</button> : <div className="pro-badge-panel"><strong>Incluye</strong><small>Seguimiento completo, lectura mensual y una experiencia sin fricción visual entre Free y Pro.</small></div>}{subStatus === 'error' && <small className="error-text">No pude generar el link de pago. Revisá el backend/API key.</small>}<button className="logout-btn" onClick={async () => { if (supabase) await supabase.auth.signOut(); setAuth(null); }}>Cerrar sesión</button></div></aside><div className="main-area"><header className="page-topbar"><div><span className="eyebrow">Resumen en vivo</span><h2>{activeTab === 'dashboard' ? 'Tu centro de control financiero' : activeTab === 'accounts' ? 'Cuentas y billeteras' : activeTab === 'transactions' ? 'Movimientos' : activeTab === 'debts' ? 'Deudas' : activeTab === 'installments' ? 'Cuotas' : activeTab === 'cards' ? 'Tarjetas de crédito' : 'Presupuestos y rendimientos'}</h2></div><div className="quick-actions"><button className="ghost" onClick={() => openCreate('account')}><Plus size={16} /> Cuenta</button><button className="ghost" onClick={() => openCreate('transaction')}><Plus size={16} /> Movimiento</button><button className="ghost" onClick={() => openCreate('debt')}><Plus size={16} /> Deuda</button><button className="ghost" onClick={() => openCreate('installment')}><Plus size={16} /> Cuota</button><button className="ghost" onClick={() => openCreate('card')}><Plus size={16} /> Tarjeta</button></div></header>{!isPro && <section className="pro-teaser-band"><div><span className="eyebrow">Free vs Pro</span><strong>Ya podés usar pesito.ar gratis. Pro te ordena mejor y te empuja a decidir.</strong><small>Hoy estás en Free. Con Pro mantenés tus datos, sumás más contexto y tenés una experiencia más completa para ordenar tu plata.</small></div><button className="submit-btn accent-btn" onClick={startSubscription}>{subStatus === 'loading' ? 'Generando link…' : 'Probar Pro'}</button></section>}{activeTab === 'dashboard' && <SetupChecklistCard progress={setupProgress} items={setupChecklist} onAction={openCreate} />}

  {activeTab === 'dashboard' && <><section className="hero-summary"><MetricCard title="Saldo total ARS" value={formatMoney(arsTotal)} icon={Wallet} tone="blue" detail={`USD disponibles: ${formatMoney(usdTotal, 'USD')}`} /><MetricCard title="Ingresos del mes" value={formatMoney(incomeMonth)} icon={ArrowUpRight} tone="green" detail="Plata que entró este mes" /><MetricCard title="Gastos del mes" value={formatMoney(expenseMonth)} icon={ArrowDownLeft} tone="red" detail={`Compromisos por cuotas: ${formatMoney(monthlyInstallments)}`} /><MetricCard title="Tarjeta próximo resumen" value={formatMoney(nextCardDue)} icon={CreditCard} tone="violet" detail={closestCard ? `${closestCard.name} vence ${formatDate(closestCard.nextDueDate)}` : `Disponible estimado: ${formatMoney(totalCardAvailable)} / ${formatMoney(totalCardLimit)}`} /></section><section className="recommendation-grid"><article className="recommendation-card yield-card"><div className="card-head"><div><span className="eyebrow">Rendimiento ARS</span><h3>¿Dónde conviene tener tu plata?</h3></div><button className="refresh-btn" onClick={refreshYields}>{yieldStatus === 'loading' ? 'Actualizando…' : 'Actualizar'}</button></div>{recommendation ? <><div className="yield-main"><div><span className="eyebrow muted">Mejor opción hoy</span><strong>{recommendation.bestYield.label}</strong><p>{recommendation.bestYield.tna}% TNA · {recommendation.bestYield.category || 'Cuenta remunerada'}</p></div><div className="yield-pill">Actualizado {new Date(data.yields.updatedAt).toLocaleDateString('es-AR')}</div></div><div className="yield-text"><p>Hoy te quedan aproximadamente <strong>{formatMoney(recommendation.monthlyFreeCash)}</strong> de caja libre este mes. Si movieras <strong>{formatMoney(recommendation.suggestedMove || recommendation.highestBalanceAccount.balance)}</strong> desde <strong>{recommendation.highestBalanceAccount.name}</strong> hacia <strong>{recommendation.bestYield.label}</strong>, la mejora estimada sería de <strong>{formatMoney(recommendation.monthlyGain)}</strong> por mes.</p><p>La comparación usa diferencia de TNA ({recommendation.diff.toFixed(1)} pts), confianza {recommendation.confidence} y un upside anual de <strong>{formatMoney(recommendation.annualGain)}</strong> si sostuvieras ese cambio.</p></div><div className="yield-table">{accountsWithYield.map((acc) => <div key={acc.id} className="yield-row"><div><strong>{acc.name}</strong><small>{acc.category}{acc.limit ? ` · tope ${formatMoney(acc.limit)}` : ''}{acc.source ? ` · ${acc.source}` : ''}</small></div><strong>{acc.tna}%</strong></div>)}</div></> : <EmptyStateCard {...buildEmptyState('planning')} onAction={openCreate} />}</article><article className="recommendation-card next-card"><span className="eyebrow">Lo próximo</span><h3>Compromisos cercanos</h3><div className="stack-list">{closestCard && <div className="stack-item"><div><strong>{closestCard.name}</strong><small>Resumen estimado · vence {formatDate(closestCard.nextDueDate)} · en {daysUntil(closestCard.nextDueDate)} días</small></div><span>{formatMoney(closestCard.nextStatementAmount)}</span></div>}{budgetsView.slice(0, 2).map((budget) => <div className="stack-item" key={budget.id}><div><strong>{budget.category}</strong><small>{budget.spent > budget.amount ? 'Te pasaste' : 'Te queda margen'}</small></div><span>{formatMoney(budget.remaining)}</span></div>)}{data.debts.slice(0, 2).map((debt) => <div className="stack-item" key={debt.id}><div><strong>{debt.person}</strong><small>{debt.kind === 'owed' ? 'Le debés' : 'Te debe'}</small></div><span>{formatMoney(debt.remaining)}</span></div>)}</div></article></section><section className="charts-grid"><ChartCard title="Gastos por categoría"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={110} paddingAngle={3}>{categoryData.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip formatter={(v) => formatMoney(v)} /></PieChart></ResponsiveContainer></ChartCard><ChartCard title="Ingresos vs egresos"><ResponsiveContainer width="100%" height={300}><BarChart data={monthlyBars}><CartesianGrid strokeDasharray="3 3" stroke="#d8def7" /><XAxis dataKey="month" /><YAxis hide /><Tooltip formatter={(v) => formatMoney(v)} /><Bar dataKey="ingresos" fill="#3e6bff" radius={[8, 8, 0, 0]} /><Bar dataKey="gastos" fill="#c8d5ff" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Plata por cuenta (ARS)"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={accountsPie} dataKey="value" nameKey="name" outerRadius={110}>{accountsPie.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip formatter={(v) => formatMoney(v)} /></PieChart></ResponsiveContainer></ChartCard><ChartCard title="Evolución de caja del mes"><ResponsiveContainer width="100%" height={300}><AreaChart data={timeline}><CartesianGrid strokeDasharray="3 3" stroke="#d8def7" /><XAxis dataKey="date" /><YAxis hide /><Tooltip formatter={(v) => formatMoney(v)} /><Area type="monotone" dataKey="saldo" stroke="#3e6bff" fill="#cfd8ff" strokeWidth={3} /></AreaChart></ResponsiveContainer></ChartCard></section></>}

  {activeTab === 'accounts' && <section className="table-shell"><div className="table-header"><h3>Tus cuentas y billeteras</h3><button className="ghost" onClick={() => openCreate('account')}><Plus size={16} /> Agregar cuenta</button></div>{data.accounts.length ? <div className="account-grid">{data.accounts.map((acc) => { const Icon = accountIcons[acc.type] || Wallet; const rate = data.yields.rates.find((r) => r.provider === acc.provider); return <article key={acc.id} className="account-card"><div className="row-actions"><div className="account-head"><div className="icon-wrap"><Icon size={18} /></div><div><strong>{acc.name}</strong><small>{acc.currency} · {acc.type}</small></div></div><ItemActions onEdit={() => openEdit('account', acc)} onDelete={() => deleteAccount(acc)} /></div><div className="account-balance">{formatMoney(acc.balance, acc.currency)}</div><div className="account-foot">{rate ? `${rate.tna}% TNA estimada` : 'Sin rendimiento asociado'}</div></article>; })}</div> : <EmptyStateCard {...emptyState} onAction={openCreate} />}</section>}

  {activeTab === 'transactions' && <section className="table-shell"><div className="table-header"><h3>Movimientos recientes</h3><button className="ghost" onClick={() => openCreate('transaction')}><Plus size={16} /> Cargar movimiento</button></div>{data.transactions.length ? <div className="tx-list">{data.transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((tx) => { const account = data.accounts.find((a) => a.id === tx.accountId); return <div className="tx-row" key={tx.id}><div><strong>{tx.note || tx.category}</strong><small>{tx.category} · {account?.name} · {tx.date}</small></div><div className="row-inline"><span className={tx.kind === 'income' ? 'income' : 'expense'}>{tx.kind === 'income' ? '+' : '-'} {formatMoney(tx.amount, tx.currency)}</span><ItemActions onEdit={() => openEdit('transaction', tx)} onDelete={() => deleteTransaction(tx)} compact /></div></div>; })}</div> : <EmptyStateCard {...emptyState} onAction={openCreate} />}</section>}

  {activeTab === 'debts' && <section className="table-shell split-shell"><div><div className="table-header"><h3>Deudas y préstamos</h3><button className="ghost" onClick={() => openCreate('debt')}><Plus size={16} /> Agregar deuda</button></div><div className="tx-list">{data.debts.map((debt) => <div className="tx-row" key={debt.id}><div><strong>{debt.person}</strong><small>{debt.kind === 'owed' ? 'Le debés' : 'Te debe'} · vence {debt.dueDate}</small></div><div className="row-inline"><span>{formatMoney(debt.remaining, debt.currency)}</span><ItemActions onEdit={() => openEdit('debt', debt)} onDelete={() => deleteDebt(debt)} compact /></div></div>)}</div></div><div className="debt-summary"><MetricMini title="Debés" value={formatMoney(debtOut)} /><MetricMini title="Te deben" value={formatMoney(debtIn)} /><MetricMini title="Balance" value={formatMoney(debtIn - debtOut)} /></div></section>}

  {activeTab === 'installments' && <section className="table-shell"><div className="table-header"><h3>Compras en cuotas</h3><button className="ghost" onClick={() => openCreate('installment')}><Plus size={16} /> Agregar plan</button></div><div className="installment-grid">{data.installments.map((inst) => <article key={inst.id} className="installment-card"><div className="row-actions"><div><strong>{inst.title}</strong><small>{inst.category}</small></div><ItemActions onEdit={() => openEdit('installment', inst)} onDelete={() => deleteInstallment(inst)} /></div><div className="progress-line"><span style={{ width: `${(inst.paidCount / inst.installments) * 100}%` }} /></div><div className="installment-meta"><span>{inst.paidCount}/{inst.installments} pagas</span><span>{formatMoney(inst.installmentAmount)}</span></div></article>)}</div></section>}

  {activeTab === 'cards' && <section className="table-shell split-shell cards-shell"><div><div className="table-header"><h3>Tarjetas de crédito</h3><div className="quick-actions"><button className="ghost" onClick={() => openCreate('card')}><Plus size={16} /> Nueva tarjeta</button><button className="ghost" onClick={() => openCreate('cardPurchase')}><Plus size={16} /> Compra con tarjeta</button></div></div>{cardsSummary.length ? <div className="account-grid cards-grid">{cardsSummary.map((card) => <article key={card.id} className="account-card credit-card-block"><div className="row-actions"><div className="account-head"><div className="icon-wrap"><CreditCard size={18} /></div><div><strong>{card.name}</strong><small>{card.bank}</small></div></div><ItemActions onEdit={() => openEdit('card', card)} onDelete={() => deleteCreditCard(card)} /></div><div className="account-balance">{formatMoney(card.available)}</div><small>Disponible estimado · {card.utilization.toFixed(0)}% usado</small><div className="card-dates"><span>Próximo cierre <strong>{formatDate(card.nextClosingDate)}</strong> · en {daysUntil(card.nextClosingDate)} días</span><span>Próximo vencimiento <strong>{formatDate(card.nextDueDate)}</strong> · en {daysUntil(card.nextDueDate)} días</span></div><div className="card-summary-grid"><div><small>Resumen a vencer</small><strong>{formatMoney(card.nextStatementAmount)}</strong></div><div><small>Ciclo siguiente</small><strong>{formatMoney(card.followingStatementAmount)}</strong></div></div><div className="installment-meta card-meta-row"><span>Límite {formatMoney(card.limit)}</span><span>{card.purchases.length} compras cargadas</span></div>{card.urgentPurchases.length > 0 && <div className="sublist">{card.urgentPurchases.slice(0, 3).map((purchase) => <div key={purchase.id} className="sublist-row"><span>{purchase.title}</span><strong>{formatMoney(purchase.installmentAmount)}</strong></div>)}</div>}</article>)}</div> : <EmptyStateCard {...emptyState} onAction={openCreate} />}</div><div className="table-shell card-purchases-panel"><div className="table-header"><h3>Compras con tarjeta</h3><button className="ghost" onClick={() => openCreate('cardPurchase')}><Plus size={16} /> Cargar compra</button></div><div className="mini-card card-summary-highlight"><span>Total estimado próximo vencimiento</span><strong>{formatMoney(nextCardDue)}</strong>{closestCard && <small>{closestCard.name} vence {formatDate(closestCard.nextDueDate)}</small>}</div>{data.cardPurchases.length ? <div className="tx-list">{data.cardPurchases.slice().sort((a, b) => (a.nextDueMonth || '').localeCompare(b.nextDueMonth || '')).map((purchase) => { const card = data.creditCards.find((c) => c.id === purchase.cardId); return <div className="tx-row" key={purchase.id}><div><strong>{purchase.title}</strong><small>{card?.name} · {purchase.category} · cuota {purchase.currentInstallment}/{purchase.installments} · vence {purchase.nextDueMonth}</small></div><div className="row-inline"><span>{formatMoney(purchase.installmentAmount)}</span><ItemActions onEdit={() => openEdit('cardPurchase', purchase)} onDelete={() => deleteCardPurchase(purchase)} compact /></div></div>; })}</div> : <EmptyStateCard title="Todavía no cargaste compras con tarjeta" body="Podés empezar sólo con el plástico y sumar consumos después. Cuando los cargues, pesito.ar te arma el próximo resumen sin hacer cuentas mentales." cta="Cargar compra" type="cardPurchase" onAction={openCreate} />}</div></section>}

  {activeTab === 'planning' && <section className="planning-grid"><article className="table-shell"><div className="table-header"><h3>Presupuestos del mes</h3><button className="ghost" onClick={() => openCreate('budget')}><Plus size={16} /> Presupuesto</button></div>{budgetsView.length ? <div className="tx-list">{budgetsView.map((budget) => <div className="budget-row" key={budget.id}><div className="budget-head"><div><strong>{budget.category}</strong><small>{formatMoney(budget.spent)} de {formatMoney(budget.amount)}</small></div><ItemActions onEdit={() => openEdit('budget', budget)} onDelete={() => deleteBudget(budget)} compact /></div><div className="progress-line thin"><span style={{ width: `${Math.min(100, budget.pct)}%` }} /></div><div className="installment-meta"><span>{budget.pct > 100 ? 'Excedido' : 'Restante'}</span><span className={budget.remaining < 0 ? 'expense' : ''}>{formatMoney(budget.remaining)}</span></div></div>)}</div> : <EmptyStateCard {...emptyState} onAction={openCreate} />}</article><article className="table-shell"><div className="table-header"><h3>Rendimientos ARS</h3><div className="quick-actions"><button className="ghost" onClick={() => openCreate('yield')}><Plus size={16} /> Rendimiento</button><button className="refresh-btn" onClick={refreshYields}>{yieldStatus === 'loading' ? 'Actualizando…' : 'Reset base'}</button></div></div><div className="yield-table">{data.yields.rates.slice().sort((a, b) => b.tna - a.tna).map((rate) => <div key={rate.id} className="yield-row"><div><strong>{rate.label}</strong><small>{rate.category || rate.provider}{rate.source ? ` · ${rate.source}` : ''}</small></div><div className="row-inline"><strong>{rate.tna}%</strong><ItemActions onEdit={() => openEdit('yield', rate)} onDelete={() => deleteYield(rate)} compact /></div></div>)}</div><div className="mini-card planning-note"><span>Última actualización</span><strong>{new Date(data.yields.updatedAt).toLocaleString('es-AR')}</strong></div></article></section>}
</div>

  {modal?.type === 'account' && <Modal title={modal.mode === 'edit' ? 'Editar cuenta' : 'Nueva cuenta'} onClose={closeModal}><AccountForm initialData={modal.item} onSubmit={(form) => saveAccount(form, modal.item)} /></Modal>}
  {modal?.type === 'transaction' && <Modal title={modal.mode === 'edit' ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={closeModal}><TransactionForm accounts={data.accounts} initialData={modal.item} onSubmit={(form) => saveTransaction(form, modal.item)} /></Modal>}
  {modal?.type === 'debt' && <Modal title={modal.mode === 'edit' ? 'Editar deuda' : 'Nueva deuda'} onClose={closeModal}><DebtForm initialData={modal.item} onSubmit={(form) => saveDebt(form, modal.item)} /></Modal>}
  {modal?.type === 'installment' && <Modal title={modal.mode === 'edit' ? 'Editar plan en cuotas' : 'Nuevo plan en cuotas'} onClose={closeModal}><InstallmentForm accounts={data.accounts} initialData={modal.item} onSubmit={(form) => saveInstallment(form, modal.item)} /></Modal>}
  {modal?.type === 'card' && <Modal title={modal.mode === 'edit' ? 'Editar tarjeta de crédito' : 'Nueva tarjeta de crédito'} onClose={closeModal}><CreditCardForm initialData={modal.item} onSubmit={(form) => saveCreditCard(form, modal.item)} /></Modal>}
  {modal?.type === 'cardPurchase' && <Modal title={modal.mode === 'edit' ? 'Editar compra con tarjeta' : 'Nueva compra con tarjeta'} onClose={closeModal}><CardPurchaseForm cards={data.creditCards} initialData={modal.item} onSubmit={(form) => saveCardPurchase(form, modal.item)} /></Modal>}
  {modal?.type === 'budget' && <Modal title={modal.mode === 'edit' ? 'Editar presupuesto' : 'Nuevo presupuesto'} onClose={closeModal}><BudgetForm initialData={modal.item} onSubmit={(form) => saveBudget(form, modal.item)} /></Modal>}
  {modal?.type === 'yield' && <Modal title={modal.mode === 'edit' ? 'Editar rendimiento' : 'Nuevo rendimiento'} onClose={closeModal}><YieldForm initialData={modal.item} onSubmit={(form) => saveYield(form, modal.item)} /></Modal>}
</div>;
}

function MetricCard({ title, value, icon: Icon, tone, detail }) { return <article className={`metric-card ${tone}`}><div className="metric-head"><span>{title}</span><Icon size={18} /></div><strong>{value}</strong><small>{detail}</small></article>; }
function MetricMini({ title, value }) { return <article className="mini-card"><span>{title}</span><strong>{value}</strong></article>; }
function ChartCard({ title, children }) { return <article className="chart-card"><div className="card-head simple"><h3>{title}</h3></div>{children}</article>; }
function SetupChecklistCard({ progress, items, onAction }) { return <section className="setup-card"><div className="setup-head"><div><span className="eyebrow">Onboarding</span><h3>Armá valor en menos de 5 minutos</h3></div><div className="setup-progress"><strong>{progress}%</strong><small>completo</small></div></div><div className="progress-line thin"><span style={{ width: `${progress}%` }} /></div><div className="setup-list">{items.map((item) => <button key={item.id} type="button" className={`setup-item ${item.done ? 'done' : ''}`} onClick={() => !item.done && onAction(item.id === 'planning' ? 'budget' : item.id === 'cards' ? 'card' : item.id.slice(0, -1))}><span>{item.done ? '✓' : '○'}</span><strong>{item.label}</strong></button>)}</div></section>; }
function EmptyStateCard({ title, body, cta, type, onAction }) { return <div className="empty-state-card"><span className="eyebrow">Todavía en setup</span><h4>{title}</h4><p>{body}</p>{cta && <button className="submit-btn" type="button" onClick={() => onAction(type)}>{cta}</button>}</div>; }
function Modal({ title, onClose, children }) { return <div className="modal-backdrop" onClick={onClose}><div className="modal-shell" onClick={(e) => e.stopPropagation()}><div className="modal-top"><h3>{title}</h3><button onClick={onClose}>✕</button></div>{children}</div></div>; }
function Field({ label, as = 'input', children, ...props }) { const Tag = as; return <label className="field"><span>{label}</span>{children || <Tag {...props} />}</label>; }
function SelectField({ label, options, ...props }) { return <label className="field"><span>{label}</span><select {...props}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
function ItemActions({ onEdit, onDelete, compact = false }) { return <div className={`item-actions ${compact ? 'compact' : ''}`}><button type="button" className="icon-btn" onClick={onEdit} aria-label="Editar"><Pencil size={14} /></button><button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Borrar"><Trash2 size={14} /></button></div>; }

function AccountForm({ onSubmit, initialData }) {
  const initialKnown = getKnownAccount(initialData?.provider);
  const [form, setForm] = useState({
    provider: initialKnown?.id || (initialData?.provider && getKnownAccount(initialData.provider) ? initialData.provider : OTHER_ACCOUNT_OPTION.id),
    customName: initialKnown ? '' : initialData?.name || '',
    type: initialData?.type || initialKnown?.accountType || 'wallet',
    currency: initialData?.currency || 'ARS',
    balance: initialData?.balance ?? '',
  });
  const selectedKnown = form.provider !== OTHER_ACCOUNT_OPTION.id ? getKnownAccount(form.provider) : null;
  useEffect(() => {
    if (selectedKnown) setForm((prev) => ({ ...prev, type: selectedKnown.accountType || prev.type }));
  }, [selectedKnown?.id]);
  return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
    <label className="field"><span>Entidad conocida o cuenta custom</span><select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>{KNOWN_ACCOUNT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.yieldType}</option>)}<option value={OTHER_ACCOUNT_OPTION.id}>{OTHER_ACCOUNT_OPTION.label}</option></select><small className="field-hint">Podés elegir una billetera/cuenta conocida del catálogo curado o usar “Otra” para cargar una propia.</small></label>
    {selectedKnown ? <div className="known-provider-card"><strong>{selectedKnown.label}</strong><small>{selectedKnown.yieldType} · {selectedKnown.source}{selectedKnown.limit ? ` · tope ${formatMoney(selectedKnown.limit)}` : ''}</small></div> : <Field label="Nombre personalizado" value={form.customName} onChange={(e) => setForm({ ...form, customName: e.target.value })} required />}
    <SelectField label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[['wallet', 'Billetera'], ['bank', 'Banco'], ['investment', 'Inversión / FCI / plazo fijo'], ['cash', 'Efectivo'], ['savings', 'Ahorro']].map(([value, label]) => ({ value, label }))} />
    <SelectField label="Moneda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={[{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }]} />
    <Field label="Saldo actual" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} required />
    <button className="submit-btn">Guardar cuenta</button>
  </form>;
}
function TransactionForm({ accounts, onSubmit, initialData }) { return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); onSubmit({ kind: form.get('kind'), amount: form.get('amount'), currency: form.get('currency'), accountId: form.get('accountId'), category: form.get('category'), note: form.get('note'), date: form.get('date') }); }}><SelectField label="Tipo" name="kind" defaultValue={initialData?.kind || 'expense'} options={[{ value: 'income', label: 'Ingreso' }, { value: 'expense', label: 'Gasto' }]} /><Field label="Monto" name="amount" type="number" defaultValue={initialData?.amount ?? ''} required /><SelectField label="Cuenta / billetera" name="accountId" defaultValue={initialData?.accountId || accounts[0]?.id || ''} options={accounts.map((a) => { const known = getKnownAccount(a.provider); return ({ value: a.id, label: known ? `${a.name} · ${known.yieldType || 'Conocida'}` : `${a.name} · personalizada` }); })} /><Field label="Categoría" name="category" defaultValue={initialData?.category || 'Comida'} required /><Field label="Nota" name="note" defaultValue={initialData?.note || ''} /><Field label="Fecha" name="date" type="date" defaultValue={initialData?.date || today()} required /><small className="field-hint">Los movimientos se cargan sobre cualquiera de tus cuentas: conocida del catálogo o personalizada.</small><button className="submit-btn">Guardar movimiento</button></form>; }
function DebtForm({ onSubmit, initialData }) { const [form, setForm] = useState({ kind: initialData?.kind || 'owed', person: initialData?.person || '', total: initialData?.total ?? '', remaining: initialData?.remaining ?? initialData?.total ?? '', currency: initialData?.currency || 'ARS', dueDate: initialData?.dueDate || future(7), note: initialData?.note || '' }); return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><SelectField label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} options={[{ value: 'owed', label: 'Yo debo' }, { value: 'receivable', label: 'Me deben' }]} /><Field label="Persona" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} required /><Field label="Monto total" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /><Field label="Saldo pendiente" type="number" value={form.remaining} onChange={(e) => setForm({ ...form, remaining: e.target.value })} required /><Field label="Fecha de vencimiento" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /><Field label="Nota" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /><button className="submit-btn">Guardar deuda</button></form>; }
function InstallmentForm({ accounts, onSubmit, initialData }) { const [form, setForm] = useState({ title: initialData?.title || '', total: initialData?.total ?? '', installments: initialData?.installments || 3, paidCount: initialData?.paidCount || 0, currency: initialData?.currency || 'ARS', accountId: initialData?.accountId || accounts[0]?.id || '', category: initialData?.category || 'Compras' }); return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><Field label="Compra" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /><Field label="Monto total" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /><Field label="Cantidad de cuotas" type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} required /><Field label="Cuotas ya pagas" type="number" value={form.paidCount} onChange={(e) => setForm({ ...form, paidCount: e.target.value })} required /><SelectField label="Cuenta" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} options={accounts.map((a) => ({ value: a.id, label: a.name }))} /><Field label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /><button className="submit-btn">Guardar plan</button></form>; }
function CreditCardForm({ onSubmit, initialData }) { const [form, setForm] = useState({ name: initialData?.name || '', bank: initialData?.bank || '', closingDay: initialData?.closingDay || 25, dueDay: initialData?.dueDay || 3, limit: initialData?.limit ?? '', available: initialData?.available ?? '', currency: initialData?.currency || 'ARS' }); return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><Field label="Nombre de la tarjeta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Field label="Banco / emisor" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} required /><Field label="Día de cierre" type="number" value={form.closingDay} onChange={(e) => setForm({ ...form, closingDay: e.target.value })} required /><Field label="Día de vencimiento" type="number" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} required /><Field label="Límite" type="number" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} required /><Field label="Disponible actual" type="number" value={form.available} onChange={(e) => setForm({ ...form, available: e.target.value })} required /><button className="submit-btn">Guardar tarjeta</button></form>; }
function CardPurchaseForm({ cards, onSubmit, initialData }) { const [form, setForm] = useState({ cardId: initialData?.cardId || cards?.[0]?.id || '', title: initialData?.title || '', total: initialData?.total ?? '', installments: initialData?.installments || 1, currentInstallment: initialData?.currentInstallment || 1, purchaseDate: initialData?.purchaseDate || today(), nextDueMonth: initialData?.nextDueMonth || futureDateString(1), category: initialData?.category || 'Consumo' }); if (!cards?.length) return <div className="mini-card"><span>Primero cargá una tarjeta para registrar compras.</span></div>; return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><SelectField label="Tarjeta" value={form.cardId} onChange={(e) => setForm({ ...form, cardId: e.target.value })} options={cards.map((c) => ({ value: c.id, label: c.name }))} /><Field label="Compra" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /><Field label="Monto total" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /><Field label="Cantidad de cuotas" type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} required /><Field label="Cuota actual" type="number" value={form.currentInstallment} onChange={(e) => setForm({ ...form, currentInstallment: e.target.value })} required /><Field label="Fecha de compra" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} required /><Field label="Próximo vencimiento de esa cuota" type="date" value={form.nextDueMonth} onChange={(e) => setForm({ ...form, nextDueMonth: e.target.value })} required /><Field label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /><button className="submit-btn">Guardar compra</button></form>; }
function BudgetForm({ onSubmit, initialData }) { const [form, setForm] = useState({ category: initialData?.category || '', amount: initialData?.amount ?? '' }); return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><Field label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /><Field label="Monto mensual" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /><button className="submit-btn">Guardar presupuesto</button></form>; }
function YieldForm({ onSubmit, initialData }) { const [form, setForm] = useState({ provider: initialData?.provider || '', label: initialData?.label || '', tna: initialData?.tna ?? '' }); return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><Field label="Provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} required /><Field label="Nombre visible" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required /><Field label="TNA" type="number" step="0.1" value={form.tna} onChange={(e) => setForm({ ...form, tna: e.target.value })} required /><button className="submit-btn">Guardar rendimiento</button></form>; }
function LandingScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authNotice, setAuthNotice] = useState(null);
  const [openAuth, setOpenAuth] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [hoveredStat, setHoveredStat] = useState('saldo');
  async function submit(e) { e.preventDefault(); setLoading(true); setError(''); try { await onAuth(form, mode); if (mode === 'register') { setAuthNotice({ title: 'Revisá tu correo', body: `Te enviamos un enlace a ${form.email} para validar tu cuenta y continuar con pesito.ar.` }); } } catch (err) { setError(err.message || 'No se pudo continuar'); } finally { setLoading(false); } }
  function openAuthFlow(nextMode) { setMode(nextMode); setError(''); setAuthNotice(null); setOpenAuth(true); setMobileMenu(false); }
  const statCopy = { saldo: 'Entre todas tus billeteras y cuentas.', tasa: 'Mejor opción para mover pesos ahora.', cuotas: 'Cuotas activas + gastos fijos del mes.', lectura: 'Entró el sueldo, se fue el alquiler. Las suscripciones ya están pesando.' };
  return <div className="landing-shell argentina-tech"><div className="landing-noise" /><header className="landing-topbar"><div><div className="landing-brand">pesito.ar</div><small className="brand-subline">Hecha por argentinos, para argentinos</small></div><nav className="landing-nav desktop-nav"><a href="#como-funciona">Cómo funciona</a><a href="#billeteras">Billeteras</a><a href="#confianza">Rendimientos</a><a href="#precio">Precio</a></nav><div className="landing-actions desktop-actions"><button className="ghost" onClick={() => openAuthFlow('login')}>Ingresar</button><button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Empezar gratis</button></div><button className="mobile-menu-btn" onClick={() => setMobileMenu((v) => !v)}>{mobileMenu ? 'Cerrar' : 'Menú'}</button></header>{mobileMenu && <div className="mobile-nav-drawer"><a href="#como-funciona" onClick={() => setMobileMenu(false)}>Cómo funciona</a><a href="#billeteras" onClick={() => setMobileMenu(false)}>Billeteras</a><a href="#confianza" onClick={() => setMobileMenu(false)}>Rendimientos</a><a href="#precio" onClick={() => setMobileMenu(false)}>Precio</a><button className="ghost" onClick={() => openAuthFlow('login')}>Ingresar</button><button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Empezar gratis</button></div>}<main className="landing-main"><section className="ticker-strip"><span>ARS</span><span>cuotas</span><span>deudas</span><span>billeteras</span><span>flujo mensual</span><span>rendimiento</span><span>caja real</span></section><section className="landing-hero argentina-grid"><div className="landing-copy hero-copy-block"><span className="eyebrow">Hecha acá, para la economía de acá</span><h1>Toda tu plata en un lugar. Tus cuentas, tus billeteras, efectivo y cuotas.</h1><p>Pesito.ar te muestra cuánto tenés, cuánto debés, qué se vence y dónde conviene tener la plata hoy. Sin planillas, sin vueltas.</p><small className="hero-note">Una app hecha por argentinos que también viven con billeteras, cuotas y pesos.</small><div className="hero-cta-row hero-cta-priority"><button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Crear cuenta gratis</button><button className="ghost" onClick={() => openAuthFlow('login')}>Ya tengo acceso</button></div><div className="micro-pills tape-pills"><span>Tus billeteras, tu banco, efectivo y más</span><span>Cuotas y deudas con seguimiento real</span><span>Te dice dónde rinde más tu plata hoy</span></div></div><div className="landing-preview command-center"><div className="console-card hero-console interactive-console"><div className="console-top"><span className="eyebrow">Tu resumen de hoy</span><span className="console-dot" /></div><button className={`stat-hotspot ${hoveredStat === 'saldo' ? 'active' : ''}`} onMouseEnter={() => setHoveredStat('saldo')} onFocus={() => setHoveredStat('saldo')}><div className="big-peso">$485.000</div><p>Entre todas tus billeteras y cuentas.</p></button><div className="signal-row signal-row-rich"><button className={`console-metric ${hoveredStat === 'tasa' ? 'active' : ''}`} onMouseEnter={() => setHoveredStat('tasa')} onFocus={() => setHoveredStat('tasa')}><span>TNA más alta</span><strong>Belo 31.2%</strong><small>Mejor opción para mover pesos ahora</small></button><button className={`console-metric ${hoveredStat === 'cuotas' ? 'active' : ''}`} onMouseEnter={() => setHoveredStat('cuotas')} onFocus={() => setHoveredStat('cuotas')}><span>Compromiso mensual</span><strong>$135.000</strong><small>Cuotas activas + gastos fijos del mes</small></button></div><div className="stat-tooltip">{statCopy[hoveredStat]}</div></div><div className="preview-grid offset-grid mobile-stacked-preview"><div className="console-card narrow enriched-card"><span className="eyebrow">Deuda neta</span><strong>$50.000</strong><small>Lo que debés menos lo que te deben</small></div><div className="console-card narrow enriched-card"><span className="eyebrow">Cuotas vivas</span><strong>4 meses</strong><small>Con vencimientos ya marcados en tu flujo</small></div><div className="console-card wide trend-card" onMouseEnter={() => setHoveredStat('lectura')} onFocus={() => setHoveredStat('lectura')}><span className="eyebrow">Lectura del mes</span><strong>Entró el sueldo, se fue el alquiler. Las suscripciones ya están pesando.</strong></div></div></div></section><section className="landing-section manifesto-band" id="como-funciona"><div className="manifesto-left"><span className="eyebrow">Hecha para la economía real</span><h2>No somos una app de Silicon Valley. Somos una app para el que vive con pesos, cuotas y tres billeteras.</h2></div><div className="manifesto-right bullet-stack editorial-stack"><div><strong>Cada bolsillo es un bolsillo</strong><p>Tu billetera digital no es lo mismo que tu banco ni que el efectivo del cajero. Acá registrás cada cuenta por separado y ves el total sin mezclar nada.</p></div><div><strong>Las cuotas son ciudadanas de primera</strong><p>Registrás una compra en cuotas y pesito.ar la distribuye mes a mes en tu flujo. Sabés cuánto comprometiste antes de comprometer más.</p></div><div><strong>Tarjetas con cierre y vencimiento</strong><p>También podés registrar compras con tarjeta, ver próximo resumen, disponible estimado y cuánto ya comprometiste antes del próximo cierre.</p></div></div></section><section className="landing-section social-proof" id="confianza"><div className="proof-intro"><span className="eyebrow">Por qué funciona acá</span><h2>Pensada para el que usa varias cuentas, billeteras y efectivo al mismo tiempo.</h2></div><div className="proof-grid"><div className="proof-stat"><strong>Tus cuentas, como vos las uses</strong><small>Registrá cada billetera por separado y mantené el control total</small></div><div className="proof-stat"><strong>Foto mensual completa</strong><small>Ingresos, gastos, cuotas y deuda en un mismo tablero, sin pestañas perdidas</small></div><div className="proof-quote">"Por fin puedo ver en un solo lugar lo que tengo, lo que debo y lo que ya comprometí este mes."</div></div></section><section className="landing-section asym-grid features-rail" id="billeteras"><article className="landing-card feature-block equal-card"><span className="eyebrow">01 · LECTURA</span><h3>Dashboard con criterio argentino</h3><p>Ingresos, egresos, saldo en ARS y USD, presión de cuotas y deudas. Todo visible de entrada, sin esconder lo importante.</p></article><article className="landing-card feature-block equal-card"><span className="eyebrow">02 · MOVIMIENTO</span><h3>Todas tus billeteras, un solo lugar</h3><p>Creás tus propias billeteras y cuentas dentro de la app. Cada peso sabe de dónde viene y dónde está.</p></article><article className="landing-card feature-block equal-card"><span className="eyebrow">03 · TARJETAS</span><h3>Compras con tarjeta bajo control</h3><p>Registrás tarjeta, cierre, vencimiento, compras y cuotas. Pesito.ar te muestra próximo resumen y cuánto margen real te queda.</p></article></section><section className="pricing-strip founder-strip" id="precio"><div><span className="eyebrow">Precio fundador</span><h2>$6.000 por mes</h2><p>Para el que quiere claridad de verdad, no una app linda que no sirve para Argentina.</p><ul className="pricing-list"><li>Registrá todas tus cuentas y billeteras: cada una tiene su propio espacio</li><li>Seguimiento de cuotas y deudas</li><li>Comparador de rendimientos en ARS actualizado</li><li>Tarjetas, compras, cierre y vencimiento bajo control</li><li>Lectura mensual automática de tu situación</li><li>Acceso web + app en un solo flujo</li></ul></div><div className="pricing-actions pricing-actions-stack"><button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Empezar ahora</button><small>Login, suscripción y app en un solo paso. Sin letra chica.</small></div></section></main><div className="mobile-sticky-cta"><button className="submit-btn accent-btn full-btn" onClick={() => openAuthFlow('register')}>Empezar gratis</button></div>{openAuth && <div className="modal-backdrop" onClick={() => setOpenAuth(false)}><div className="modal-shell auth-modal" onClick={(e) => e.stopPropagation()}><div className="modal-top"><h3>{authNotice ? authNotice.title : mode === 'login' ? 'Ingresar a pesito.ar' : 'Crear tu cuenta'}</h3><button onClick={() => setOpenAuth(false)}>✕</button></div>{authNotice ? <div className="auth-notice"><p>{authNotice.body}</p><button className="submit-btn full-btn accent-btn" onClick={() => { setAuthNotice(null); setMode('login'); }}>Ir al login</button><button className="switch-auth" onClick={() => setOpenAuth(false)}>Cerrar</button></div> : <><form className="form-grid" onSubmit={submit}>{mode === 'register' && <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}<Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><Field label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /><button className="submit-btn full-btn accent-btn">{loading ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>{error && <small className="error-text">{error}</small>}{mode === 'register' && supabase && <small className="hint-text">Si activás confirmación por email en Supabase, el alta va a requerir validación.</small>}</form><button className="switch-auth" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta'}</button></>}</div></div>}</div>;
}
