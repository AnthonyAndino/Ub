import {
  isOperationalExpense,
  isOperationalIncome,
  TRANSFER_EXPENSE_CATEGORIES,
  TRANSFER_INCOME_CATEGORIES,
} from "@/lib/transaction-categories"

export interface BalanceTx {
  amount: { toNumber(): number }
  currency: string
  exchangeRate?: { toNumber(): number } | null
  type: string
  category: string
}

export function toLempiras(t: BalanceTx): number {
  const val = t.amount.toNumber()
  return t.currency === "$" && t.exchangeRate ? val * t.exchangeRate.toNumber() : val
}

type AmountFn = (t: BalanceTx) => number

function sumBy(
  transactions: BalanceTx[],
  predicate: (t: BalanceTx) => boolean,
  amountOf: AmountFn = toLempiras,
): number {
  return transactions.filter(predicate).reduce((sum, t) => sum + amountOf(t), 0)
}

/** Real income (chamba, etc.) — excludes savings withdrawals */
export function sumOperationalIncome(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
  return sumBy(transactions, (t) => isOperationalIncome(t.type, t.category), amountOf)
}

/** Real spending (gas, food, etc.) — excludes savings deposits */
export function sumOperationalExpense(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
  return sumBy(transactions, (t) => isOperationalExpense(t.type, t.category), amountOf)
}

/**
 * Cash left after real income/expenses and money locked in fondo/deseos.
 * Abonar reduces this; retirar increases it.
 */
export function getGananciaNeta(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
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

  return sumOperationalIncome(transactions, amountOf) - sumOperationalExpense(transactions, amountOf) - savingsOut + savingsIn
}

/** Same as ganancia neta — money available to spend or allocate */
export function getAvailableBalance(transactions: BalanceTx[], amountOf: AmountFn = toLempiras): number {
  return getGananciaNeta(transactions, amountOf)
}
