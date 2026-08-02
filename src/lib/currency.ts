export type PriceInPaise = number & { readonly __brand: "paise" };

export function asPriceInPaise(value: number): PriceInPaise {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Price must be a non-negative safe integer in paise");
  }

  return value as PriceInPaise;
}

export function formatPaise(value: PriceInPaise): string {
  const fractionDigits = value % 100 === 0 ? 0 : 2;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value / 100);
}
