const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFormatterCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  // If whole dollar amount (e.g. $85.00), allow cleaner $85 or standard $85.00
  return Number.isInteger(value) ? usdFormatterCompact.format(value) : usdFormatter.format(value);
}

export function formatPriceExact(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return usdFormatter.format(value);
}
