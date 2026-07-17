/** Tasa fija USD → Lempiras en todo el sistema */
export const EXCHANGE_RATE = 26.75

export async function getDefaultRate(): Promise<number> {
  return EXCHANGE_RATE
}

/** Convierte un monto individual a lempiras (sin redondear) */
export function amountToLempiras(amount: number, currency: string): number {
  if (currency === "$") return amount * EXCHANGE_RATE
  return amount
}

/** Convierte un total ya sumado en L a la moneda de visualización (un solo paso) */
export function totalFromLempiras(totalL: number, displayCurrency: string): number {
  if (displayCurrency === "$") return totalL / EXCHANGE_RATE
  return totalL
}

/** Redondeo solo para mostrar en pantalla (2 decimales) */
export function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
