"use client"

import { useEffect, useState, useCallback } from "react"
import { Shield, ArrowDown, ArrowUp } from "reicon-react"
import Modal from "@/components/modal"
import { getEmergencyFundBalance, getEmergencyFundGoal, setEmergencyFundGoal, depositToEmergencyFund, withdrawFromEmergencyFund } from "@/lib/actions/emergency-fund"
import { getAvailableBalance } from "@/lib/actions/wishlist"

function SetGoalButton({ currentGoal, onSet }: { currentGoal: number | null; onSet: () => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(currentGoal?.toString() ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const v = parseFloat(value)
    if (isNaN(v) || v < 0) return
    setSaving(true)
    await setEmergencyFundGoal(v)
    setSaving(false)
    setOpen(false)
    onSet()
  }

  return (
    <>
      <button
        onClick={() => { setValue(currentGoal?.toString() ?? ""); setOpen(true) }}
        className="text-xs font-bold text-[#2563EB] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
      >
        {currentGoal ? "Editar meta" : "Establecer meta"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={currentGoal ? "Editar meta" : "Establecer meta"}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Meta (L)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-white text-slate-900 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#2563EB] text-white font-extrabold text-xs rounded-xl py-3 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar meta"}
          </button>
        </div>
      </Modal>
    </>
  )
}

function FundActionButton({ label, variant, onAction }: {
  label: string
  variant: "primary" | "secondary"
  onAction: (amount: number) => Promise<{ error?: string; success?: boolean }>
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [availableBalance, setAvailableBalance] = useState(0)

  const handleOpen = async () => {
    setAmount("")
    setError("")
    if (label === "Abonar") {
      const bal = await getAvailableBalance()
      setAvailableBalance(bal)
    }
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseFloat(amount)
    if (isNaN(v) || v <= 0) { setError("Ingresa un monto válido."); return }
    setSubmitting(true)
    setError("")
    const r = await onAction(v)
    if (r.error) { setError(r.error); setSubmitting(false) }
    else { setSubmitting(false); setOpen(false); setAmount("") }
  }

  const isPrimary = variant === "primary"

  return (
    <>
      <button
        onClick={handleOpen}
        className={`flex-1 flex items-center justify-center gap-1.5 font-black text-xs rounded-xl py-2.5 px-3 transition-all cursor-pointer active:scale-[0.98] ${
          isPrimary
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white"
            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50"
        }`}
      >
        {isPrimary ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={label === "Abonar" ? "Abonar al Fondo" : "Retirar del Fondo"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-bold">{error}</div>
          )}

          {label === "Abonar" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm">
              <span className="font-bold text-blue-700">Saldo disponible: L{availableBalance.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Monto a {label.toLowerCase()}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">L</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white text-slate-900 rounded-xl border border-slate-200 py-3.5 pl-8 pr-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#2563EB] text-white font-extrabold text-xs rounded-xl py-3 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Procesando..." : label}
          </button>
        </form>
      </Modal>
    </>
  )
}

export function EmergencyFundCard() {
  const [balance, setBalance] = useState(0)
  const [goal, setGoal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [b, g] = await Promise.all([getEmergencyFundBalance(), getEmergencyFundGoal()])
    setBalance(b)
    setGoal(g)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const porcentaje = goal && goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_12px_30px_rgba(0,0,0,0.02)] p-6 flex items-center justify-center min-h-[100px]">
        <div className="w-5 h-5 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_12px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200/30 rounded-2xl">
            <Shield size={22} color="#059669" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900">Fondo de Emergencia</span>
            <span className="text-xs text-slate-400 font-medium">Protegido para imprevistos</span>
          </div>
        </div>
        <SetGoalButton currentGoal={goal} onSet={load} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black text-slate-950">
          L{balance.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {goal != null && goal > 0 && (
          <span className="text-sm font-bold text-slate-400">
            / L{goal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {goal != null && goal > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Progreso</span>
            <span>{porcentaje}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <FundActionButton label="Abonar" variant="primary" onAction={async (amount) => {
          const r = await depositToEmergencyFund(amount)
          if (!r.error) await load()
          return r
        }} />
        {balance > 0 && (
          <FundActionButton label="Retirar" variant="secondary" onAction={async (amount) => {
            const r = await withdrawFromEmergencyFund(amount)
            if (!r.error) await load()
            return r
          }} />
        )}
      </div>
    </div>
  )
}

export function EmergencyFundWishlistCard() {
  const [balance, setBalance] = useState(0)
  const [goal, setGoal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [b, g] = await Promise.all([getEmergencyFundBalance(), getEmergencyFundGoal()])
    setBalance(b)
    setGoal(g)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener("wishlist-updated", handler)
    return () => window.removeEventListener("wishlist-updated", handler)
  }, [load])

  const porcentaje = goal && goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 flex items-center justify-center min-h-[100px] mb-6">
        <div className="w-5 h-5 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200/30 rounded-2xl">
            <Shield size={24} color="#059669" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900">Fondo de Emergencia</span>
            <span className="text-xs text-slate-400 font-medium">Protegido para imprevistos</span>
          </div>
        </div>
        <SetGoalButton currentGoal={goal} onSet={load} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black text-slate-950">
          L{balance.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {goal != null && goal > 0 && (
          <span className="text-sm font-bold text-slate-400">
            / L{goal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {goal != null && goal > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Progreso</span>
            <span>{porcentaje}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <FundActionButton label="Abonar" variant="primary" onAction={async (amount) => {
          const r = await depositToEmergencyFund(amount)
          if (!r.error) await load()
          return r
        }} />
        {balance > 0 && (
          <FundActionButton label="Retirar" variant="secondary" onAction={async (amount) => {
            const r = await withdrawFromEmergencyFund(amount)
            if (!r.error) await load()
            return r
          }} />
        )}
      </div>
    </div>
  )
}
