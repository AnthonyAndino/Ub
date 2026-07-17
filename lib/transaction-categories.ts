/**
 * Movimientos internos (fondo de emergencia y ahorro de Deseos).
 * Se registran como Ingreso/Gasto pero no deben inflar el resumen mensual.
 *
 * Categorías en BD:
 * - Fondo Emergencia / Retiro Fondo Emergencia
 * - Ahorro / Retiro Ahorro (aportes a metas en Deseos)
 */
export const INTERNAL_TRANSFER_CATEGORIES = new Set([
  "Fondo Emergencia",
  "Retiro Fondo Emergencia",
  "Ahorro",
  "Retiro Ahorro",
])

export const TRANSFER_EXPENSE_CATEGORIES = new Set(["Ahorro", "Fondo Emergencia"])
export const TRANSFER_INCOME_CATEGORIES = new Set(["Retiro Ahorro", "Retiro Fondo Emergencia"])

export function isExcludedFromMonthlySummary(category: string): boolean {
  return INTERNAL_TRANSFER_CATEGORIES.has(category)
}

export function isOperationalIncome(type: string, category: string): boolean {
  return type === "income" && !isExcludedFromMonthlySummary(category)
}

export function isOperationalExpense(type: string, category: string): boolean {
  return type === "expense" && !isExcludedFromMonthlySummary(category)
}
