export interface CurrencyMeta {
  code: string;
  symbol: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'CAD', symbol: '$' },
  { code: 'AUD', symbol: '$' },
  { code: 'JPY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
];

export const DEFAULT_CURRENCY_CODE = CURRENCIES[0].code;

export const CURRENCY_BY_CODE: Record<string, CurrencyMeta> = Object.fromEntries(
  CURRENCIES.map((currency) => [currency.code, currency])
);

export function currencySymbol(code: string | null | undefined) {
  return (code ? CURRENCY_BY_CODE[code]?.symbol : undefined) ?? '$';
}
