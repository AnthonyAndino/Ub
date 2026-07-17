import {
  isOperationalExpense,
  isOperationalIncome,
  TRANSFER_EXPENSE_CATEGORIES,
  TRANSFER_INCOME_CATEGORIES,
} from "@/lib/transaction-categories"
import { amountToLempiras } from "@/lib/currency"

export interface BalanceTx {
  amount: { toNumber(): number }
  currency: string
  exchangeRate?: { toNumber(): number } | null
  type: string
  category: string
}

export function toLempiras(t: BalanceTx): number {
  return amountToLempiras(t.amount.toNumber(), t.currency)
}

type AmountFn = (t: BalanceTx) => number

function sumBy(
  transactions: BalanceTx[],
  predicate: (t: BalanceTx) => boolean,
  amountOf: AmountFn = toLempiras,
): number {
  return transactions.filter(predicate).reduce((sum, t) => sum + amountOf(t), 0)
}

/** Ingresos reales del mes (excluye retiros de fondo/deseos) */
export function sumOperationalIncome(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
  return sumBy(transactions, (t) => isOperationalIncome(t.type, t.category), amountOf)
}

/** Gastos reales del mes (excluye aportes a fondo/deseos) */
export function sumOperationalExpense(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
  return sumBy(transactions, (t) => isOperationalExpense(t.type, t.category), amountOf)
}

/** Ganancia neta del resumen mensual: solo ingresos y gastos reales */
export function getGananciaNeta(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
  return sumOperationalIncome(transactions, amountOf) - sumOperationalExpense(transactions, amountOf)
}

/** Efectivo libre para abonar (resta lo ya apartado en fondo y deseos) */
export function getAvailableBalance(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
  const savingsOut = sumBy(
    transactions,
    (t) => t.type === "expense" && TRANSFER_EXPENSE_CATEGORIES.has(t.category),
    amountOf,
  )
  const savingsIn = sumBy(
    transactions,
    (t) => t.type === "income" && TRANSFER_INCOME_CATEGORIES.has(t.category),
    amountOf,
  )

  return getGananciaNeta(transactions, amountOf) - savingsOut + savingsIn
}
