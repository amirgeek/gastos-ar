import { useEffect, useMemo, useState } from 'react';
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
      const response = await fetch('http://localhost:8787/api/create-subscription-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth?.email || '' }),
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

  function handleAuth(payload) {
    setAuth({ ...payload, plan: 'free' });
  }

  if (!auth) {
    return <AuthScreen onAuth={handleAuth} />;
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
          <button className="logout-btn" onClick={() => setAuth(null)}>Cerrar sesión</button>
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

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Bienvenido a pesito.ar</span>
        <h1>Tu plata, clara.</h1>
        <p>Ingresá para controlar gastos, cuentas, cuotas y elegir dónde conviene tener tus pesos.</p>
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onAuth(form); }}>
          {mode === 'register' && <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
          <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Field label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button className="submit-btn full-btn">{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
        </form>
        <button className="switch-auth" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}
