export const KNOWN_ACCOUNT_OPTIONS = [
  { id: 'mercado-pago', label: 'Mercado Pago', kind: 'wallet', accountType: 'wallet', yieldType: 'Cuenta remunerada', tna: 26.1, limit: 1000000, source: 'Referencia curada rendimientos-ar (manual)' },
  { id: 'naranjax', label: 'Naranja X', kind: 'wallet', accountType: 'wallet', yieldType: 'Cuenta remunerada', tna: 21.0, limit: 1000000, source: 'Referencia curada rendimientos-ar (manual)' },
  { id: 'uala', label: 'Ualá', kind: 'wallet', accountType: 'wallet', yieldType: 'Cuenta remunerada', tna: 23.0, limit: 1000000, source: 'Referencia curada rendimientos-ar (manual)' },
  { id: 'uala-plus1', label: 'Ualá Plus 1', kind: 'wallet', accountType: 'wallet', yieldType: 'Cuenta remunerada', tna: 26.0, limit: 1000000, source: 'Referencia curada rendimientos-ar (manual, tier especial)' },
  { id: 'uala-plus2', label: 'Ualá Plus 2', kind: 'wallet', accountType: 'wallet', yieldType: 'Cuenta remunerada', tna: 29.0, limit: 1000000, source: 'Referencia curada rendimientos-ar (manual, tier especial)' },
  { id: 'personal-pay', label: 'Personal Pay', kind: 'wallet', accountType: 'wallet', yieldType: 'Cuenta remunerada', tna: 24.5, limit: 750000, source: 'Mock curado para pesito.ar' },
  { id: 'claro-pay', label: 'Claro Pay', kind: 'wallet', accountType: 'wallet', yieldType: 'FCI money market', tna: 24.2, source: 'Referencia rendimientos-ar (FCI CAFCI proxy)' },
  { id: 'prex', label: 'Prex', kind: 'wallet', accountType: 'wallet', yieldType: 'FCI money market', tna: 25.4, source: 'Referencia rendimientos-ar (FCI CAFCI proxy)' },
  { id: 'belo', label: 'Belo', kind: 'wallet', accountType: 'wallet', yieldType: 'Cuenta remunerada', tna: 24.8, limit: 1000000, source: 'Mock curado para pesito.ar' },
  { id: 'brubank', label: 'Brubank', kind: 'bank', accountType: 'bank', yieldType: 'Cuenta remunerada', tna: 24.0, limit: 750000, source: 'Mock curado para pesito.ar' },
  { id: 'supervielle-remunerada', label: 'Supervielle remunerada', kind: 'bank', accountType: 'bank', yieldType: 'Cuenta remunerada', tna: 19.5, limit: 1000000, source: 'Referencia curada rendimientos-ar (manual)' },
  { id: 'banco-voii', label: 'Banco Voii', kind: 'bank', accountType: 'bank', yieldType: 'Cuenta remunerada', tna: 20.0, source: 'Referencia curada rendimientos-ar (manual)' },
  { id: 'icbc-alpha', label: 'ICBC Alpha Pesos', kind: 'fci', accountType: 'investment', yieldType: 'FCI money market', tna: 25.1, source: 'Referencia rendimientos-ar (FCI CAFCI proxy)' },
  { id: 'mercado-fondo', label: 'Mercado Fondo', kind: 'fci', accountType: 'investment', yieldType: 'FCI money market', tna: 25.0, source: 'Referencia rendimientos-ar (FCI CAFCI proxy)' },
  { id: 'adcap-ahorro', label: 'Adcap Ahorro Pesos', kind: 'fci', accountType: 'investment', yieldType: 'FCI money market', tna: 25.7, source: 'Referencia rendimientos-ar (FCI CAFCI proxy)' },
  { id: 'plazo-fijo-banco-galicia', label: 'Plazo fijo Banco Galicia', kind: 'fixed-term', accountType: 'investment', yieldType: 'Plazo fijo 30 días', tna: 28.0, source: 'Mock curado tomando estructura rendimientos-ar/BCRA' },
  { id: 'plazo-fijo-banco-nacion', label: 'Plazo fijo Banco Nación', kind: 'fixed-term', accountType: 'investment', yieldType: 'Plazo fijo 30 días', tna: 27.5, source: 'Mock curado tomando estructura rendimientos-ar/BCRA' },
];

export const OTHER_ACCOUNT_OPTION = { id: 'other', label: 'Otra / personalizada', kind: 'custom', accountType: 'wallet' };
export const KNOWN_ACCOUNT_MAP = Object.fromEntries(KNOWN_ACCOUNT_OPTIONS.map((item) => [item.id, item]));
export const DEFAULT_YIELD_RATES = KNOWN_ACCOUNT_OPTIONS.filter((item) => Number.isFinite(item.tna)).map((item, index) => ({
  id: `yield-${index + 1}`,
  provider: item.id,
  label: item.label,
  tna: item.tna,
  category: item.yieldType,
  source: item.source,
  limit: item.limit || null,
  isMock: item.source.toLowerCase().includes('mock'),
}));

export function getKnownAccount(provider) {
  return provider ? KNOWN_ACCOUNT_MAP[provider] || null : null;
}
