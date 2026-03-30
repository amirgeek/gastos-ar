import { getKnownAccount } from './catalog';

export function buildAccountsWithYield(accounts, rates) {
  return accounts
    .map((acc) => {
      const rate = rates.find((r) => r.provider === acc.provider);
      const meta = getKnownAccount(acc.provider);
      if (!rate) return null;
      return {
        ...acc,
        tna: rate.tna,
        label: rate.label,
        category: rate.category || meta?.yieldType || 'Cuenta remunerada',
        source: rate.source || meta?.source || 'Carga manual',
        limit: rate.limit || meta?.limit || null,
        isMock: typeof rate.isMock === 'boolean' ? rate.isMock : String(rate.source || meta?.source || '').toLowerCase().includes('mock'),
      };
    })
    .filter(Boolean);
}

export function getBestYield(rates = []) {
  return rates.length ? [...rates].sort((a, b) => b.tna - a.tna)[0] : null;
}

export function buildYieldRecommendation({ bestYield, liquidAccounts, monthlyFreeCash }) {
  if (!bestYield || !liquidAccounts.length) return null;
  const moveableAccounts = liquidAccounts.filter((acc) => bestYield.provider !== acc.provider && acc.balance > 0);
  if (!moveableAccounts.length) return null;
  const highestBalanceAccount = [...moveableAccounts].sort((a, b) => b.balance - a.balance)[0];
  const diff = bestYield.tna - (highestBalanceAccount?.tna || 0);
  const suggestedMove = Math.max(0, Math.min(highestBalanceAccount?.balance || 0, monthlyFreeCash || highestBalanceAccount?.balance || 0));
  const monthlyGain = suggestedMove > 0 ? (suggestedMove * Math.max(diff, 0) / 100) / 12 : 0;
  const annualGain = monthlyGain * 12;
  const confidence = diff >= 3 ? 'alta' : diff >= 1 ? 'media' : 'baja';
  return { bestYield, highestBalanceAccount, diff, suggestedMove, monthlyGain, annualGain, monthlyFreeCash, confidence };
}

export function buildSetupChecklist(data) {
  const counts = {
    accounts: data.accounts.length,
    transactions: data.transactions.length,
    debts: data.debts.length,
    installments: data.installments.length,
    cards: data.creditCards.length,
    budgets: data.budgets.length,
  };
  return [
    { id: 'accounts', label: 'Cargá al menos 2 cuentas o billeteras', done: counts.accounts >= 2 },
    { id: 'transactions', label: 'Sumá 3 movimientos para leer tu mes', done: counts.transactions >= 3 },
    { id: 'cards', label: 'Registrá una tarjeta o una compra en cuotas', done: counts.cards >= 1 || counts.installments >= 1 },
    { id: 'planning', label: 'Definí 1 presupuesto o deuda a seguir', done: counts.budgets >= 1 || counts.debts >= 1 },
  ];
}

export function buildEmptyState(activeTab) {
  const map = {
    accounts: {
      title: 'Todavía no cargaste cuentas',
      body: 'Empezá por tus billeteras o banco principal. En cuanto haya saldos, pesito.ar ya te muestra caja real y oportunidades de rendimiento.',
      cta: 'Agregar cuenta',
      type: 'account',
    },
    transactions: {
      title: 'Sin movimientos no hay lectura del mes',
      body: 'Cargá tus ingresos, tus gastos principales y al menos una cuenta. Con eso ya vas a ver una foto clara de tu mes.',
      cta: 'Cargar movimiento',
      type: 'transaction',
    },
    debts: {
      title: 'Deudas y préstamos en cero visible',
      body: 'Si le debés a alguien o te deben plata, registrarlo acá evita olvidos y te ordena el flujo real.',
      cta: 'Agregar deuda',
      type: 'debt',
    },
    installments: {
      title: 'Tus cuotas todavía no están bajo control',
      body: 'Cargá una compra en cuotas y dejá de adivinar cuánto te queda comprometido los próximos meses.',
      cta: 'Agregar cuota',
      type: 'installment',
    },
    cards: {
      title: 'Falta tu primera tarjeta',
      body: 'Con cierre y vencimiento cargados, pesito.ar te anticipa el próximo resumen y cuánto margen te queda de verdad.',
      cta: 'Agregar tarjeta',
      type: 'card',
    },
    planning: {
      title: 'Todavía no cargaste tu planificación',
      body: 'Sumá un presupuesto o cargá una tasa de rendimiento para empezar a comparar opciones y tomar mejores decisiones.',
      cta: 'Crear presupuesto',
      type: 'budget',
    },
  };
  return map[activeTab] || null;
}
