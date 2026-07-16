"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { listTrashedTransactions, recoverTransaction, permanentDeleteTransaction } from "@/lib/actions/transactions"
import { Sidebar } from "@/components/sidebar"
import ConfirmDialog from "@/components/confirm-dialog"
import Modal from "@/components/modal"
import { Trash2, Refresh, AlertTriangle, ChevronLeft, Trash } from "reicon-react"

type Tx = Awaited<ReturnType<typeof listTrashedTransactions>>[number]

export default function PapeleraPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [recoverId, setRecoverId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listTrashedTransactions()
    setTransactions(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleRecover = async () => {
    if (!recoverId) return
    await recoverTransaction(recoverId)
    setTransactions((prev) => prev.filter((t) => t.id !== recoverId))
    setRecoverId(null)
    showToast("Transacción recuperada con éxito")
    router.refresh()
  }

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return
    await permanentDeleteTransaction(permanentDeleteId)
    setTransactions((prev) => prev.filter((t) => t.id !== permanentDeleteId))
    setPermanentDeleteId(null)
    showToast("Transacción eliminada permanentemente")
    router.refresh()
  }

  return (
    <div className="flex flex-1 flex-col w-full min-h-screen lg:pl-64 pb-16 lg:pb-0">
      <Sidebar />

      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-slate-900 hover:opacity-95 transition-opacity">
            <span className="bg-[#2563EB] text-white px-2 py-0.5 rounded-md text-sm font-black">G</span>
            <span>Control<span className="text-[#2563EB] font-black">Gastos</span></span>
          </a>
          <a href="/historial" className="text-sm font-bold text-[#2563EB] hover:underline">
            ← Volver
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
            <Trash2 size={20} color="#EF4444" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
              Papelera
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Las transacciones aquí pueden recuperarse o eliminarse definitivamente.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-12 flex flex-col items-center gap-4">
            <Trash2 size={40} color="#CBD5E1" />
            <p className="text-slate-400 text-sm font-medium">La papelera está vacía</p>
            <a href="/historial" className="text-sm font-bold text-[#2563EB] hover:underline">
              Ir al historial
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Categoría</th>
                    <th className="text-left px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Descripción</th>
                    <th className="text-right px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Monto</th>
                    <th className="text-center px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider w-24">Eliminado</th>
                    <th className="text-center px-4 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider w-24">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t, i) => (
                    <tr key={t.id} className={`transition-colors hover:bg-slate-50 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                      <td className="px-4 py-3.5 text-slate-600 font-semibold whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          t.type === "income"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}>
                          {t.type === "income" ? "Ingreso" : "Gasto"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-bold">{t.category}</td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-[200px] truncate">{t.description || "—"}</td>
                      <td className={`px-4 py-3.5 text-right font-extrabold tabular-nums whitespace-nowrap ${
                        t.type === "income" ? "text-green-600" : "text-red-500"
                      }`}>
                        {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs text-slate-400 font-medium tabular-nums">
                          {new Date(t.deletedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setRecoverId(t.id)}
                            className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                            title="Recuperar"
                          >
                            <Refresh size={16} />
                          </button>
                          <button
                            onClick={() => setPermanentDeleteId(t.id)}
                            className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-all cursor-pointer"
                            title="Eliminar permanentemente"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!recoverId}
        onClose={() => setRecoverId(null)}
        onConfirm={handleRecover}
        title="Recuperar transacción"
        message="Esta transacción volverá a aparecer en el historial como si nunca se hubiera eliminado."
        confirmLabel="Recuperar"
        variant="info"
      />

      <ConfirmDialog
        open={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={handlePermanentDelete}
        title="Eliminar permanentemente"
        message="Esta acción no se puede deshacer. La transacción se borrará para siempre."
        confirmLabel="Eliminar definitivamente"
        variant="danger"
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          {toast}
        </div>
      )}
    </div>
  )
}
