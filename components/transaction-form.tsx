"use client"

import { useActionState, useState, useEffect } from "react"
import { createTransaction } from "@/lib/actions/transactions"
import { listUnpurchasedWishlistItems } from "@/lib/actions/wishlist"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Calendar } from "reicon-react"

type WishlistItem = { id: string; name: string; estimatedPrice: number | null }

export function TransactionForm() {
  const [state, formAction, pending] = useActionState(createTransaction, null)
  const [type, setType] = useState("income")
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    listUnpurchasedWishlistItems().then(setWishlistItems)
  }, [])

  return (
    <form
      action={formAction}
      className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-black text-slate-900">
          Nueva Transacción
        </h2>
        <p className="text-xs text-slate-400 font-medium">Registra los ingresos o gastos del vehículo.</p>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200/80 p-3.5 text-sm text-red-600 font-semibold text-center">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-xl bg-green-50 border border-green-200/80 p-3.5 text-sm text-green-600 font-semibold text-center">
          ¡Transacción registrada con éxito!
        </div>
      )}

      {/* Selector de Tipo */}
      <div className="flex gap-4">
        <label
          onClick={() => setType("income")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
            type === "income"
              ? "border-green-500 bg-green-50/50"
              : "border-slate-100 bg-slate-50 hover:bg-slate-100/50"
          }`}
        >
          <input type="radio" name="type" value="income" defaultChecked className="hidden" />
          <span className={`text-sm font-black ${type === "income" ? "text-green-700" : "text-slate-700"}`}>
            Ingreso
          </span>
        </label>
        <label
          onClick={() => setType("expense")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
            type === "expense"
              ? "border-red-500 bg-red-50/50"
              : "border-slate-100 bg-slate-50 hover:bg-slate-100/50"
          }`}
        >
          <input type="radio" name="type" value="expense" className="hidden" />
          <span className={`text-sm font-black ${type === "expense" ? "text-red-700" : "text-slate-700"}`}>
            Gasto
          </span>
        </label>
      </div>

      {/* Monto */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Monto ($)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">$</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            className="w-full bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 pl-8 pr-4 text-base font-extrabold outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Categoría</label>
        <input
          name="category"
          type="text"
          required
          placeholder="Ej. Gasolina, Lavado, Comida"
          className="bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Descripción</label>
        <input
          name="description"
          type="text"
          placeholder="Opcional"
          className="bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </div>

      {/* Vincular a deseo (solo gastos) */}
      {type === "expense" && wishlistItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Vincular a deseo
          </label>
          <select
            name="wishlistItemId"
            className="bg-white text-slate-900 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          >
            <option value="">Sin vínculo</option>
            {wishlistItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{item.estimatedPrice ? ` ($${item.estimatedPrice})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fecha */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fecha</label>
        <div className="relative">
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => {
              if (date) setSelectedDate(date)
            }}
            dateFormat="dd/MM/yyyy"
            className="w-full bg-white text-slate-900 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            calendarClassName="!border !border-slate-200 !rounded-2xl !shadow-lg !bg-white !p-2"
            wrapperClassName="w-full"
            popperClassName="!z-50"
          />
          <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="hidden" name="date" value={selectedDate.toISOString().split("T")[0]} />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#2563EB] text-white font-extrabold tracking-wider text-sm rounded-2xl py-4 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
      >
        {pending ? "Guardando..." : "Registrar Transacción"}
      </button>
    </form>
  )
}
