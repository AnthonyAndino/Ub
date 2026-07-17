/** Internal transfers — not real income or spending for P&L / ganancia neta */
export const TRANSFER_EXPENSE_CATEGORIES = new Set(["Ahorro", "Fondo Emergencia"])
export const TRANSFER_INCOME_CATEGORIES = new Set(["Retiro Ahorro", "Retiro Fondo Emergencia"])

export function isOperationalIncome(type: string, category: string): boolean {
  return type === "income" && !TRANSFER_INCOME_CATEGORIES.has(category)
}

export function isOperationalExpense(type: string, category: string): boolean {
  return type === "expense" && !TRANSFER_EXPENSE_CATEGORIES.has(category)
}
