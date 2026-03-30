import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
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

const seed = {
  accounts: [
    { id: 'acc-1', name: 'Mercado Pago', type: 'wallet', currency: 'ARS', balance: 200000, provider: 'mercado-pago' },
    { id: 'acc-2', name: 'Belo', type: 'wallet', currency: 'ARS', balance: 200000, provider: 'belo' },
    { id: 'acc-3', name: 'Santander', type: 'bank', currency: 'ARS', balance: 85000, provider: 'santander' },
    { id: 'acc-4', name: 'Efectivo', type: 'cash', currency: 'ARS', balance: 35000, provider: 'cash' },
    { id: 'acc-5', name: 'Dólares ahorro', type: 'savings', currency: 'USD', balance: 320, provider: 'usd' },
  ],
  transactions: [
    { id: 'tx-1', kind: 'income', amount: 1200000, currency: 'ARS', accountId: 'acc-3', category: 'Trabajo', note: 'Cobro mensual', date: today(-18) },
    { id: 'tx-2', kind: 'expense', amount: 185000, currency: 'ARS', accountId: 'acc-3', category: 'Alquiler', note: 'Departamento', date: today(-17) },
    { id: 'tx-3', kind: 'expense', amount: 56200, currency: 'ARS', accountId: 'acc-1', category: 'Supermercado', note: 'Compra grande', date: today(-14) },
    { id: 'tx-4', kind: 'expense', amount: 24500, currency: 'ARS', accountId: 'acc-1', category: 'Salidas', note: 'Cena', date: today(-12) },
    { id: 'tx-5', kind: 'income', amount: 95000, currency: 'ARS', accountId: 'acc-2', category: 'Extra', note: 'Proyecto freelance', date: today(-10) },
    { id: 'tx-6', kind: 'expense', amount: 14200, currency: 'ARS', accountId: 'acc-4', category: 'Transporte', note: 'Nafta / viajes', date: today(-8) },
    { id: 'tx-7', kind: 'expense', amount: 18900, currency: 'ARS', accountId: 'acc-1', category: 'Suscripciones', note: 'Apps y servicios', date: today(-6) },
    { id: 'tx-8', kind: 'expense', amount: 37200, currency: 'ARS', accountId: 'acc-2', category: 'Comida', note: 'Pedidos + almacén', date: today(-3) },
  ],
  debts: [
    { id: 'debt-1', kind: 'owed', person: 'Juan', total: 80000, remaining: 50000, currency: 'ARS', dueDate: future(6), note: 'Préstamo personal' },
    { id: 'debt-2', kind: 'receivable', person: 'Lucía', total: 25000, remaining: 25000, currency: 'ARS', dueDate: future(3), note: 'Le presté para un viaje' },
  ],
  installments: [
    { id: 'inst-1', title: 'Notebook', total: 450000, installments: 6, paidCount: 2, installmentAmount: 75000, currency: 'ARS', accountId: 'acc-3', category: 'Tecnología' },
    { id: 'inst-2', title: 'Air fryer', total: 180000, installments: 3, paidCount: 1, installmentAmount: 60000, currency: 'ARS', accountId: 'acc-3', category: 'Hogar' },
  ],
  budgets: [
    { id: 'bud-1', category: 'Supermercado', amount: 180000 },
    { id: 'bud-2', category: 'Salidas', amount: 80000 },
    { id: 'bud-3', category: 'Transporte', amount: 50000 },
  ],
  yields: {
    updatedAt: new Date().toISOString(),
    rates: [
      { provider: 'mercado-pago', label: 'Mercado Pago', tna: 28.4 },
      { provider: 'belo', label: 'Belo', tna: 31.2 },
      { provider: 'naranja-x', label: 'Naranja X', tna: 30.0 },
      { provider: 'uala', label: 'Ualá', tna: 29.1 },
      { provider: 'personal-pay', label: 'Personal Pay', tna: 29.7 },
    ],
  },
};

const STORAGE_KEY = 'caja-ar-v1';
const AUTH_KEY = 'pesito-ar-auth-v1';
const accountIcons = {
  wallet: Wallet,
  bank: Landmark,
  cash: Banknote,
  savings: PiggyBank,
  card: CreditCard,
};
const palette = ['#1f4fff', '#6d8cff', '#b1c4ff', '#d6dffe', '#eef2ff', '#7e56da', '#d6c8ff'];

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function future(days = 0) {
  return today(days);
}
function formatMoney(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(value || 0);
}
function parseNum(v) {
  return Number(String(v).replace(',', '.')) || 0;
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seed;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showInstForm, setShowInstForm] = useState(false);
  const [yieldStatus, setYieldStatus] = useState('idle');
  const [subStatus, setSubStatus] = useState('idle');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_KEY);
  }, [auth]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        setAuth({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          plan: 'free',
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setAuth({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          plan: 'free',
        });
      } else {
        setAuth(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const arsAccounts = data.accounts.filter((a) => a.currency === 'ARS');
  const arsTotal = arsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const usdTotal = data.accounts.filter((a) => a.currency === 'USD').reduce((sum, acc) => sum + acc.balance, 0);

  const monthTransactions = data.transactions.filter((tx) => tx.date.slice(0, 7) === today().slice(0, 7));
  const incomeMonth = monthTransactions.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseMonth = monthTransactions.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
  const debtOut = data.debts.filter((d) => d.kind === 'owed').reduce((s, d) => s + d.remaining, 0);
  const debtIn = data.debts.filter((d) => d.kind === 'receivable').reduce((s, d) => s + d.remaining, 0);
  const monthlyInstallments = data.installments.reduce((s, i) => s + (i.paidCount < i.installments ? i.installmentAmount : 0), 0);

  const categoryData = useMemo(() => {
    const map = new Map();
    monthTransactions.filter((t) => t.kind === 'expense').forEach((tx) => {
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [monthTransactions]);

  const accountsPie = arsAccounts.map((acc) => ({ name: acc.name, value: acc.balance }));

  const monthlyBars = useMemo(() => {
    const months = {};
    data.transactions.forEach((tx) => {
      const key = tx.date.slice(0, 7);
      if (!months[key]) months[key] = { month: key, ingresos: 0, gastos: 0 };
      months[key][tx.kind === 'income' ? 'ingresos' : 'gastos'] += tx.amount;
    });
    return Object.values(months).slice(-6);
  }, [data.transactions]);

  const timeline = useMemo(() => {
    let running = 0;
    return [...monthTransactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((tx) => {
        running += tx.kind === 'income' ? tx.amount : -tx.amount;
        return { date: tx.date.slice(5), saldo: running };
      });
  }, [monthTransactions]);

  const bestYield = useMemo(() => {
    if (!data.yields?.rates?.length) return null;
    return [...data.yields.rates].sort((a, b) => b.tna - a.tna)[0];
  }, [data.yields]);

  const currentYieldAccounts = arsAccounts
    .map((acc) => {
      const rate = data.yields.rates.find((r) => r.provider === acc.provider);
      return rate ? { ...acc, tna: rate.tna, label: rate.label } : null;
    })
    .filter(Boolean);

  const recommendation = useMemo(() => {
    if (!bestYield || !currentYieldAccounts.length) return null;
    const highestBalanceAccount = [...currentYieldAccounts].sort((a, b) => b.balance - a.balance)[0];
    const diff = bestYield.tna - (highestBalanceAccount?.tna || 0);
    const monthlyGain = highestBalanceAccount ? (highestBalanceAccount.balance * diff / 100) / 12 : 0;
    return {
      bestYield,
      highestBalanceAccount,
      diff,
      monthlyGain,
    };
  }, [bestYield, currentYieldAccounts]);

  async function refreshYields() {
    setYieldStatus('loading');
    try {
      // Placeholder configurable. If Rendimientos AR exposes wallet rates later, replace here.
      const fresh = {
        updatedAt: new Date().toISOString(),
        rates: seed.yields.rates,
      };
      setData((prev) => ({ ...prev, yields: fresh }));
      setYieldStatus('done');
    } catch {
      setYieldStatus('error');
    }
  }

  function addAccount(form) {
    const account = {
      id: crypto.randomUUID(),
      name: form.name,
      type: form.type,
      currency: form.currency,
      balance: parseNum(form.balance),
      provider: form.provider || form.name.toLowerCase().replace(/\s+/g, '-'),
    };
    setData((prev) => ({ ...prev, accounts: [account, ...prev.accounts] }));
    setShowAccountForm(false);
  }
  function addTransaction(form) {
    const tx = {
      id: crypto.randomUUID(),
      kind: form.kind,
      amount: parseNum(form.amount),
      currency: form.currency,
      accountId: form.accountId,
      category: form.category,
      note: form.note,
      date: form.date,
    };
    setData((prev) => ({
      ...prev,
      transactions: [tx, ...prev.transactions],
      accounts: prev.accounts.map((acc) =>
        acc.id === form.accountId
          ? { ...acc, balance: acc.balance + (form.kind === 'income' ? parseNum(form.amount) : -parseNum(form.amount)) }
          : acc
      ),
    }));
    setShowTxForm(false);
  }
  function addDebt(form) {
    const debt = {
      id: crypto.randomUUID(),
      kind: form.kind,
      person: form.person,
      total: parseNum(form.total),
      remaining: parseNum(form.total),
      currency: form.currency,
      dueDate: form.dueDate,
      note: form.note,
    };
    setData((prev) => ({ ...prev, debts: [debt, ...prev.debts] }));
    setShowDebtForm(false);
  }
  function addInstallment(form) {
    const total = parseNum(form.total);
    const installments = parseNum(form.installments);
    const plan = {
      id: crypto.randomUUID(),
      title: form.title,
      total,
      installments,
      paidCount: parseNum(form.paidCount),
      installmentAmount: total / installments,
      currency: form.currency,
      accountId: form.accountId,
      category: form.category,
    };
    setData((prev) => ({ ...prev, installments: [plan, ...prev.installments] }));
    setShowInstForm(false);
  }

  async function startSubscription() {
    try {
      setSubStatus('loading');
      const response = await fetch('/api/create-subscription-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth?.email || '', userId: auth?.id || null }),
      });
      const data = await response.json();
      const checkoutUrl = data.checkoutUrl || data.url || data.initPoint || data.link;
      if (!response.ok || !checkoutUrl) throw new Error(data.error || 'No se pudo generar el link');
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(error);
      setSubStatus('error');
    }
  }

  async function handleAuth(payload, mode) {
    if (supabase) {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: { data: { name: payload.name } },
        });
        if (error) throw error;
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });
      if (error) throw error;
      return;
    }

    setAuth({ ...payload, plan: 'free' });
  }

  if (!auth) {
    return <LandingScreen onAuth={handleAuth} />;
  }

  return (
    <div className="app-shell">
      <div className="noise" />
      <aside className="sidebar">
        <div>
          <span className="eyebrow">Control financiero</span>
          <h1>pesito.ar</h1>
          <p>Una app argentina para ver tu plata real, tus deudas, tus cuotas y dónde te conviene tener los pesos.</p>
          <div className="user-chip">{auth.name || auth.email}</div>
        </div>
        <nav className="sidebar-nav">
          {[
            ['dashboard', 'Dashboard'],
            ['accounts', 'Cuentas'],
            ['transactions', 'Movimientos'],
            ['debts', 'Deudas'],
            ['installments', 'Cuotas'],
          ].map(([id, label]) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>ARS hoy</strong>
          <span>{formatMoney(arsTotal)}</span>
          <small>{bestYield ? `Mejor TNA actual: ${bestYield.label} · ${bestYield.tna}%` : 'Sin datos de rendimiento'}</small>
        </div>
        <div className="subscription-card">
          <span className="eyebrow">Suscripción</span>
          <h3>pesito.ar Pro</h3>
          <p>$6.000 por mes para usar la app con seguimiento completo.</p>
          <button className="submit-btn full-btn" onClick={startSubscription}>
            {subStatus === 'loading' ? 'Generando link…' : 'Suscribirme'}
          </button>
          {subStatus === 'error' && <small className="error-text">No pude generar el link de pago. Revisá el backend/API key.</small>}
          <button className="logout-btn" onClick={async () => { if (supabase) await supabase.auth.signOut(); setAuth(null); }}>Cerrar sesión</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="page-topbar">
          <div>
            <span className="eyebrow">Resumen en vivo</span>
            <h2>{activeTab === 'dashboard' ? 'Tu centro de control financiero' : activeTab === 'accounts' ? 'Cuentas y billeteras' : activeTab === 'transactions' ? 'Movimientos' : activeTab === 'debts' ? 'Deudas' : 'Cuotas'}</h2>
          </div>
          <div className="quick-actions">
            <button className="ghost" onClick={() => setShowAccountForm(true)}><Plus size={16} /> Cuenta</button>
            <button className="ghost" onClick={() => setShowTxForm(true)}><Plus size={16} /> Movimiento</button>
            <button className="ghost" onClick={() => setShowDebtForm(true)}><Plus size={16} /> Deuda</button>
            <button className="ghost" onClick={() => setShowInstForm(true)}><Plus size={16} /> Cuota</button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <section className="hero-summary">
              <MetricCard title="Saldo total ARS" value={formatMoney(arsTotal)} icon={Wallet} tone="blue" detail={`USD disponibles: ${formatMoney(usdTotal, 'USD')}`} />
              <MetricCard title="Ingresos del mes" value={formatMoney(incomeMonth)} icon={ArrowUpRight} tone="green" detail="Plata que entró este mes" />
              <MetricCard title="Gastos del mes" value={formatMoney(expenseMonth)} icon={ArrowDownLeft} tone="red" detail={`Compromisos por cuotas: ${formatMoney(monthlyInstallments)}`} />
              <MetricCard title="Deuda neta" value={formatMoney(debtOut - debtIn)} icon={BadgeDollarSign} tone="violet" detail={`Te deben ${formatMoney(debtIn)} · Debés ${formatMoney(debtOut)}`} />
            </section>

            <section className="recommendation-grid">
              <article className="recommendation-card yield-card">
                <div className="card-head">
                  <div>
                    <span className="eyebrow">Rendimiento ARS</span>
                    <h3>¿Dónde conviene tener tu plata?</h3>
                  </div>
                  <button className="refresh-btn" onClick={refreshYields}>{yieldStatus === 'loading' ? 'Actualizando…' : 'Actualizar'}</button>
                </div>
                {recommendation ? (
                  <>
                    <div className="yield-main">
                      <div>
                        <span className="eyebrow muted">Mejor opción hoy</span>
                        <strong>{recommendation.bestYield.label}</strong>
                        <p>{recommendation.bestYield.tna}% TNA</p>
                      </div>
                      <div className="yield-pill">Fuente base: rendimientos AR</div>
                    </div>
                    <div className="yield-text">
                      {recommendation.highestBalanceAccount ? (
                        <p>
                          Tenés más saldo en <strong>{recommendation.highestBalanceAccount.name}</strong>. Si movieras ese monto a <strong>{recommendation.bestYield.label}</strong>, la mejora estimada sería de <strong>{formatMoney(recommendation.monthlyGain)}</strong> por mes con la diferencia actual de tasas.
                        </p>
                      ) : (
                        <p>No hay cuentas compatibles para comparar rendimientos.</p>
                      )}
                    </div>
                    <div className="yield-table">
                      {currentYieldAccounts.map((acc) => (
                        <div key={acc.id} className="yield-row">
                          <span>{acc.name}</span>
                          <strong>{acc.tna}%</strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p>Agregá cuentas ARS y rendimientos para recibir una sugerencia.</p>
                )}
              </article>

              <article className="recommendation-card next-card">
                <span className="eyebrow">Lo próximo</span>
                <h3>Compromisos cercanos</h3>
                <div className="stack-list">
                  {data.debts.slice(0, 3).map((debt) => (
                    <div className="stack-item" key={debt.id}>
                      <div>
                        <strong>{debt.person}</strong>
                        <small>{debt.kind === 'owed' ? 'Le debés' : 'Te debe'}</small>
                      </div>
                      <span>{formatMoney(debt.remaining)}</span>
                    </div>
                  ))}
                  {data.installments.slice(0, 3).map((inst) => (
                    <div className="stack-item" key={inst.id}>
                      <div>
                        <strong>{inst.title}</strong>
                        <small>{inst.paidCount}/{inst.installments} pagas</small>
                      </div>
                      <span>{formatMoney(inst.installmentAmount)}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="charts-grid">
              <ChartCard title="Gastos por categoría">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={110} paddingAngle={3}>
                      {categoryData.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Ingresos vs egresos">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8def7" />
                    <XAxis dataKey="month" />
                    <YAxis hide />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Bar dataKey="ingresos" fill="#3e6bff" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="gastos" fill="#c8d5ff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Plata por cuenta (ARS)">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={accountsPie} dataKey="value" nameKey="name" outerRadius={110}>
                      {accountsPie.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Evolución de caja del mes">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8def7" />
                    <XAxis dataKey="date" />
                    <YAxis hide />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Area type="monotone" dataKey="saldo" stroke="#3e6bff" fill="#cfd8ff" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          </>
        )}

        {activeTab === 'accounts' && (
          <section className="table-shell">
            <div className="table-header">
              <h3>Tus cuentas y billeteras</h3>
              <button className="ghost" onClick={() => setShowAccountForm(true)}><Plus size={16} /> Agregar cuenta</button>
            </div>
            <div className="account-grid">
              {data.accounts.map((acc) => {
                const Icon = accountIcons[acc.type] || Wallet;
                const rate = data.yields.rates.find((r) => r.provider === acc.provider);
                return (
                  <article key={acc.id} className="account-card">
                    <div className="account-head">
                      <div className="icon-wrap"><Icon size={18} /></div>
                      <div>
                        <strong>{acc.name}</strong>
                        <small>{acc.currency} · {acc.type}</small>
                      </div>
                    </div>
                    <div className="account-balance">{formatMoney(acc.balance, acc.currency)}</div>
                    <div className="account-foot">{rate ? `${rate.tna}% TNA estimada` : 'Sin rendimiento asociado'}</div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'transactions' && (
          <section className="table-shell">
            <div className="table-header">
              <h3>Movimientos recientes</h3>
              <button className="ghost" onClick={() => setShowTxForm(true)}><Plus size={16} /> Cargar movimiento</button>
            </div>
            <div className="tx-list">
              {data.transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((tx) => {
                const account = data.accounts.find((a) => a.id === tx.accountId);
                return (
                  <div className="tx-row" key={tx.id}>
                    <div>
                      <strong>{tx.note || tx.category}</strong>
                      <small>{tx.category} · {account?.name} · {tx.date}</small>
                    </div>
                    <span className={tx.kind === 'income' ? 'income' : 'expense'}>
                      {tx.kind === 'income' ? '+' : '-'} {formatMoney(tx.amount, tx.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'debts' && (
          <section className="table-shell split-shell">
            <div>
              <div className="table-header">
                <h3>Deudas y préstamos</h3>
                <button className="ghost" onClick={() => setShowDebtForm(true)}><Plus size={16} /> Agregar deuda</button>
              </div>
              <div className="tx-list">
                {data.debts.map((debt) => (
                  <div className="tx-row" key={debt.id}>
                    <div>
                      <strong>{debt.person}</strong>
                      <small>{debt.kind === 'owed' ? 'Le debés' : 'Te debe'} · vence {debt.dueDate}</small>
                    </div>
                    <span>{formatMoney(debt.remaining, debt.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="debt-summary">
              <MetricMini title="Debés" value={formatMoney(debtOut)} />
              <MetricMini title="Te deben" value={formatMoney(debtIn)} />
              <MetricMini title="Balance" value={formatMoney(debtIn - debtOut)} />
            </div>
          </section>
        )}

        {activeTab === 'installments' && (
          <section className="table-shell">
            <div className="table-header">
              <h3>Compras en cuotas</h3>
              <button className="ghost" onClick={() => setShowInstForm(true)}><Plus size={16} /> Agregar plan</button>
            </div>
            <div className="installment-grid">
              {data.installments.map((inst) => (
                <article key={inst.id} className="installment-card">
                  <strong>{inst.title}</strong>
                  <small>{inst.category}</small>
                  <div className="progress-line"><span style={{ width: `${(inst.paidCount / inst.installments) * 100}%` }} /></div>
                  <div className="installment-meta">
                    <span>{inst.paidCount}/{inst.installments} pagas</span>
                    <span>{formatMoney(inst.installmentAmount)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {showAccountForm && <Modal title="Nueva cuenta" onClose={() => setShowAccountForm(false)}><AccountForm onSubmit={addAccount} /></Modal>}
      {showTxForm && <Modal title="Nuevo movimiento" onClose={() => setShowTxForm(false)}><TransactionForm accounts={data.accounts} onSubmit={addTransaction} /></Modal>}
      {showDebtForm && <Modal title="Nueva deuda" onClose={() => setShowDebtForm(false)}><DebtForm onSubmit={addDebt} /></Modal>}
      {showInstForm && <Modal title="Nuevo plan en cuotas" onClose={() => setShowInstForm(false)}><InstallmentForm accounts={data.accounts} onSubmit={addInstallment} /></Modal>}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, tone, detail }) {
  return <article className={`metric-card ${tone}`}><div className="metric-head"><span>{title}</span><Icon size={18} /></div><strong>{value}</strong><small>{detail}</small></article>;
}
function MetricMini({ title, value }) {
  return <article className="mini-card"><span>{title}</span><strong>{value}</strong></article>;
}
function ChartCard({ title, children }) {
  return <article className="chart-card"><div className="card-head simple"><h3>{title}</h3></div>{children}</article>;
}
function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-shell" onClick={(e) => e.stopPropagation()}><div className="modal-top"><h3>{title}</h3><button onClick={onClose}>✕</button></div>{children}</div></div>;
}
function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}
function SelectField({ label, options, ...props }) {
  return <label className="field"><span>{label}</span><select {...props}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function AccountForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', type: 'wallet', currency: 'ARS', balance: '', provider: '' });
  return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
    <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
    <SelectField label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[['wallet','Billetera'],['bank','Banco'],['cash','Efectivo'],['savings','Ahorro']].map(([value,label])=>({value,label}))} />
    <SelectField label="Moneda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={[{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }]} />
    <Field label="Saldo actual" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} required />
    <Field label="Provider (opcional)" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
    <button className="submit-btn">Guardar cuenta</button>
  </form>;
}

function TransactionForm({ accounts, onSubmit }) {
  const [form, setForm] = useState({ kind: 'expense', amount: '', currency: 'ARS', accountId: accounts[0]?.id || '', category: 'Comida', note: '', date: today() });
  return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
    <SelectField label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} options={[{ value: 'income', label: 'Ingreso' }, { value: 'expense', label: 'Gasto' }]} />
    <Field label="Monto" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
    <SelectField label="Cuenta" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
    <Field label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
    <Field label="Nota" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
    <Field label="Fecha" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
    <button className="submit-btn">Guardar movimiento</button>
  </form>;
}

function DebtForm({ onSubmit }) {
  const [form, setForm] = useState({ kind: 'owed', person: '', total: '', currency: 'ARS', dueDate: future(7), note: '' });
  return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
    <SelectField label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} options={[{ value: 'owed', label: 'Yo debo' }, { value: 'receivable', label: 'Me deben' }]} />
    <Field label="Persona" value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} required />
    <Field label="Monto" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required />
    <Field label="Fecha de vencimiento" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
    <Field label="Nota" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
    <button className="submit-btn">Guardar deuda</button>
  </form>;
}

function InstallmentForm({ accounts, onSubmit }) {
  const [form, setForm] = useState({ title: '', total: '', installments: 3, paidCount: 0, currency: 'ARS', accountId: accounts[0]?.id || '', category: 'Compras' });
  return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
    <Field label="Compra" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
    <Field label="Monto total" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required />
    <Field label="Cantidad de cuotas" type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} required />
    <Field label="Cuotas ya pagas" type="number" value={form.paidCount} onChange={(e) => setForm({ ...form, paidCount: e.target.value })} required />
    <SelectField label="Cuenta" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
    <Field label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
    <button className="submit-btn">Guardar plan</button>
  </form>;
}

function LandingScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openAuth, setOpenAuth] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [hoveredStat, setHoveredStat] = useState('saldo');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onAuth(form, mode);
    } catch (err) {
      setError(err.message || 'No se pudo continuar');
    } finally {
      setLoading(false);
    }
  }

  function openAuthFlow(nextMode) {
    setMode(nextMode);
    setOpenAuth(true);
    setMobileMenu(false);
  }

  const statCopy = {
    saldo: 'Entre todas tus billeteras y cuentas.',
    tasa: 'Mejor opción para mover pesos ahora.',
    cuotas: 'Cuotas activas + gastos fijos del mes.',
    lectura: 'Entró el sueldo, se fue el alquiler. Las suscripciones ya están pesando.',
  };

  return (
    <div className="landing-shell argentina-tech">
      <div className="landing-noise" />
      <header className="landing-topbar">
        <div>
          <span className="eyebrow">Finanzas personales para Argentina</span>
          <div className="landing-brand">pesito.ar</div>
          <small className="brand-subline">Hecha por argentinos, para argentinos</small>
        </div>
        <nav className="landing-nav desktop-nav">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#billeteras">Billeteras</a>
          <a href="#confianza">Rendimientos</a>
          <a href="#precio">Precio</a>
        </nav>
        <div className="landing-actions desktop-actions">
          <button className="ghost" onClick={() => openAuthFlow('login')}>Ingresar</button>
          <button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Empezar gratis</button>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMobileMenu((v) => !v)}>{mobileMenu ? 'Cerrar' : 'Menú'}</button>
      </header>

      {mobileMenu && (
        <div className="mobile-nav-drawer">
          <a href="#como-funciona" onClick={() => setMobileMenu(false)}>Cómo funciona</a>
          <a href="#billeteras" onClick={() => setMobileMenu(false)}>Billeteras</a>
          <a href="#confianza" onClick={() => setMobileMenu(false)}>Rendimientos</a>
          <a href="#precio" onClick={() => setMobileMenu(false)}>Precio</a>
          <button className="ghost" onClick={() => openAuthFlow('login')}>Ingresar</button>
          <button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Empezar gratis</button>
        </div>
      )}

      <main className="landing-main">
        <section className="ticker-strip">
          <span>ARS</span>
          <span>cuotas</span>
          <span>deudas</span>
          <span>billeteras</span>
          <span>flujo mensual</span>
          <span>rendimiento</span>
          <span>caja real</span>
        </section>

        <section className="landing-hero argentina-grid">
          <div className="landing-copy hero-copy-block">
            <span className="eyebrow">Hecha acá, para la economía de acá</span>
            <h1>Toda tu plata en un lugar. Tus cuentas, tus billeteras, efectivo y cuotas.</h1>
            <p>
              Pesito.ar te muestra cuánto tenés, cuánto debés, qué se vence y dónde conviene tener la plata hoy. Sin planillas, sin vueltas.
            </p>
            <small className="hero-note">Una app hecha por argentinos que también viven con billeteras, cuotas y pesos.</small>
            <div className="hero-cta-row hero-cta-priority">
              <button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Crear cuenta gratis</button>
              <button className="ghost" onClick={() => openAuthFlow('login')}>Ya tengo acceso</button>
            </div>
            <div className="micro-pills tape-pills">
              <span>Tus billeteras, tu banco, efectivo y más</span>
              <span>Cuotas y deudas con seguimiento real</span>
              <span>Te dice dónde rinde más tu plata hoy</span>
            </div>
          </div>

          <div className="landing-preview command-center">
            <div className="console-card hero-console interactive-console">
              <div className="console-top">
                <span className="eyebrow">Tu resumen de hoy</span>
                <span className="console-dot" />
              </div>
              <button className={`stat-hotspot ${hoveredStat === 'saldo' ? 'active' : ''}`} onMouseEnter={() => setHoveredStat('saldo')} onFocus={() => setHoveredStat('saldo')}>
                <div className="big-peso">$485.000</div>
                <p>Entre todas tus billeteras y cuentas.</p>
              </button>
              <div className="signal-row signal-row-rich">
                <button className={`console-metric ${hoveredStat === 'tasa' ? 'active' : ''}`} onMouseEnter={() => setHoveredStat('tasa')} onFocus={() => setHoveredStat('tasa')}>
                  <span>TNA más alta</span><strong>Belo 31.2%</strong><small>Mejor opción para mover pesos ahora</small>
                </button>
                <button className={`console-metric ${hoveredStat === 'cuotas' ? 'active' : ''}`} onMouseEnter={() => setHoveredStat('cuotas')} onFocus={() => setHoveredStat('cuotas')}>
                  <span>Compromiso mensual</span><strong>$135.000</strong><small>Cuotas activas + gastos fijos del mes</small>
                </button>
              </div>
              <div className="stat-tooltip">{statCopy[hoveredStat]}</div>
            </div>
            <div className="preview-grid offset-grid mobile-stacked-preview">
              <div className="console-card narrow enriched-card">
                <span className="eyebrow">Deuda neta</span>
                <strong>$50.000</strong>
                <small>Lo que debés menos lo que te deben</small>
              </div>
              <div className="console-card narrow enriched-card">
                <span className="eyebrow">Cuotas vivas</span>
                <strong>4 meses</strong>
                <small>Con vencimientos ya marcados en tu flujo</small>
              </div>
              <div className="console-card wide trend-card" onMouseEnter={() => setHoveredStat('lectura')} onFocus={() => setHoveredStat('lectura')}>
                <span className="eyebrow">Lectura del mes</span>
                <strong>Entró el sueldo, se fue el alquiler. Las suscripciones ya están pesando.</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section manifesto-band" id="como-funciona">
          <div className="manifesto-left">
            <span className="eyebrow">Hecha para la economía real</span>
            <h2>No somos una app de Silicon Valley. Somos una app para el que vive con pesos, cuotas y tres billeteras.</h2>
          </div>
          <div className="manifesto-right bullet-stack editorial-stack">
            <div><strong>Cada bolsillo es un bolsillo</strong><p>Tu billetera digital no es lo mismo que tu banco ni que el efectivo del cajero. Acá registrás cada cuenta por separado y ves el total sin mezclar nada.</p></div>
            <div><strong>Las cuotas son ciudadanas de primera</strong><p>Registrás una compra en cuotas y pesito.ar la distribuye mes a mes en tu flujo. Sabés cuánto comprometiste antes de comprometer más.</p></div>
            <div><strong>Te dice dónde poner la plata</strong><p>No alcanza con saber cuánto tenés. Pesito.ar compara las tasas actuales de tus billeteras y te dice si estás dejando rendimiento sobre la mesa.</p></div>
          </div>
        </section>

        <section className="landing-section social-proof" id="confianza">
          <div className="proof-intro">
            <span className="eyebrow">Por qué funciona acá</span>
            <h2>Pensada para el que usa varias cuentas, billeteras y efectivo al mismo tiempo.</h2>
          </div>
          <div className="proof-grid">
            <div className="proof-stat"><strong>Tus cuentas, como vos las uses</strong><small>Registrá cada billetera por separado y mantené el control total</small></div>
            <div className="proof-stat"><strong>Foto mensual completa</strong><small>Ingresos, gastos, cuotas y deuda en un mismo tablero, sin pestañas perdidas</small></div>
            <div className="proof-quote">"Por fin puedo ver en un solo lugar lo que tengo, lo que debo y lo que ya comprometí este mes."</div>
          </div>
        </section>

        <section className="landing-section asym-grid features-rail" id="billeteras">
          <article className="landing-card feature-block equal-card">
            <span className="eyebrow">01 · LECTURA</span>
            <h3>Dashboard con criterio argentino</h3>
            <p>Ingresos, egresos, saldo en ARS y USD, presión de cuotas y deudas. Todo visible de entrada, sin esconder lo importante.</p>
          </article>
          <article className="landing-card feature-block equal-card">
            <span className="eyebrow">02 · MOVIMIENTO</span>
            <h3>Todas tus billeteras, un solo lugar</h3>
            <p>Creás tus propias billeteras y cuentas dentro de la app. Cada peso sabe de dónde viene y dónde está.</p>
          </article>
          <article className="landing-card feature-block equal-card">
            <span className="eyebrow">03 · RENDIMIENTO</span>
            <h3>¿Dónde conviene tener la plata hoy?</h3>
            <p>Pesito.ar compara tasas en tiempo real y te avisa si tu plata puede rendir más en otra billetera. Decidís con datos, no con intuición.</p>
          </article>
        </section>

        <section className="pricing-strip founder-strip" id="precio">
          <div>
            <span className="eyebrow">Precio fundador</span>
            <h2>$6.000 por mes</h2>
            <p>Para el que quiere claridad de verdad, no una app linda que no sirve para Argentina.</p>
            <ul className="pricing-list">
              <li>Registrá todas tus cuentas y billeteras: cada una tiene su propio espacio</li>
              <li>Seguimiento de cuotas y deudas</li>
              <li>Comparador de rendimientos en ARS actualizado</li>
              <li>Lectura mensual automática de tu situación</li>
              <li>Acceso web + app en un solo flujo</li>
            </ul>
          </div>
          <div className="pricing-actions pricing-actions-stack">
            <button className="submit-btn accent-btn" onClick={() => openAuthFlow('register')}>Empezar ahora</button>
            <small>Login, suscripción y app en un solo paso. Sin letra chica.</small>
          </div>
        </section>
      </main>

      <div className="mobile-sticky-cta">
        <button className="submit-btn accent-btn full-btn" onClick={() => openAuthFlow('register')}>Empezar gratis</button>
      </div>

      {openAuth && (
        <div className="modal-backdrop" onClick={() => setOpenAuth(false)}>
          <div className="modal-shell auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>{mode === 'login' ? 'Ingresar a pesito.ar' : 'Crear tu cuenta'}</h3>
              <button onClick={() => setOpenAuth(false)}>✕</button>
            </div>
            <form className="form-grid" onSubmit={submit}>
              {mode === 'register' && <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
              <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Field label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <button className="submit-btn full-btn accent-btn">{loading ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
              {error && <small className="error-text">{error}</small>}
              {mode === 'register' && supabase && <small className="hint-text">Si activás confirmación por email en Supabase, el alta va a requerir validación.</small>}
            </form>
            <button className="switch-auth" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
