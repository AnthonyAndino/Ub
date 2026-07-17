"use client"

import { useEffect, useState, useCallback } from "react"
import { listTransactions, deleteTransaction } from "@/lib/actions/transactions"
import { fetchDefaultRate } from "@/lib/actions/currency"
import { Trash } from "reicon-react"
import ConfirmDialog from "@/components/confirm-dialog"

type Transaction = Awaited<ReturnType<typeof listTransactions>>[number]

function convertAmount(amount: number, txCurrency: string, rate: number | null, preferred: string, defaultRate: number): number {
  if (txCurrency === preferred) return amount
  if (preferred === "L") return amount * (rate ?? defaultRate)
  if (preferred === "$") return amount / (rate ?? defaultRate)
  return amount
}

export function RecentTransactions({ prefCurrency = "L" }: { prefCurrency?: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [defaultRate, setDefaultRate] = useState(25)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [txToDelete, setTxToDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [data, rate] = await Promise.all([listTransactions(), fetchDefaultRate()])
    setTransactions(data)
    setDefaultRate(rate)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    await deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 flex items-center justify-center min-h-[150px]">
        <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-sm text-slate-400 font-medium">Sin movimientos recientes</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-lg font-black text-slate-900">Últimos Movimientos</h2>
          <p className="text-xs text-slate-400 font-medium">Los 5 más recientes</p>
        </div>
        <a href="/historial" className="text-xs font-bold text-[#2563EB] hover:underline">
          Ver historial →
        </a>
      </div>

      <div className="flex flex-col gap-2">
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 bg-slate-50/50">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 ${
                t.type === "income"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                {t.type === "income" ? "I" : "G"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{t.category}</p>
                {t.description && <p className="text-[11px] text-slate-400 truncate">{t.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-end">
                <span className={`text-sm font-black ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                  {t.type === "income" ? "+" : "-"}{t.currency}{t.amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {t.currency !== prefCurrency && t.exchangeRate != null && (
                  <span className="text-[10px] text-slate-400 font-semibold">
                    ≈ {prefCurrency}{convertAmount(t.amount, t.currency, t.exchangeRate, prefCurrency, defaultRate).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <button onClick={() => { setTxToDelete(t.id); setDeleteModalOpen(true) }} className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                <Trash size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => { if (txToDelete) handleDelete(txToDelete); setTxToDelete(null) }}
        title="Eliminar transacción"
        message="¿Estás seguro de que deseas eliminar esta transacción?"
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  )
}
