/** Valor de respaldo si la API no responde */
export const FALLBACK_EXCHANGE_RATE = 26.75

/** Obtiene la tasa USD → Lempiras desde open.er-api.com (se actualiza automáticamente) */
export async function getDefaultRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    if (typeof data.rates?.HNL === "number" && data.rates.HNL > 0) {
      return data.rates.HNL
    }
  } catch {
    // API no disponible — usar respaldo
  }
  return FALLBACK_EXCHANGE_RATE
}

/** Convierte un monto individual a lempiras (sin redondear) */
export function amountToLempiras(amount: number, currency: string, rate: number): number {
  if (currency === "$") return amount * rate
  return amount
}

/** Convierte un total ya sumado en L a la moneda de visualización (un solo paso) */
export function totalFromLempiras(totalL: number, displayCurrency: string, rate: number): number {
  if (displayCurrency === "$") return totalL / rate
  return totalL
}

/** Redondeo solo para mostrar en pantalla (2 decimales) */
export function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
