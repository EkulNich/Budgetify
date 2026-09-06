/** Every currency Frankfurter (frankfurter.dev) can quote — anything offered in the app must be on this list. */
export const CURRENCIES = [
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const CURRENCY_MAP = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string) {
  return CURRENCY_MAP.get(code as CurrencyCode);
}
