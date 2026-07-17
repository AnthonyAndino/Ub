"use client"

import { useActionState, useState, useEffect, useRef } from "react"
import { createWishlistItem, updateWishlistItem } from "@/lib/actions/wishlist"

type Item = { id: string; name: string; estimatedPrice: number | null; priority: string; currency: string; exchangeRate: number | null }

export function WishlistForm({ editItem, onDone, defaultRate = 25 }: { editItem?: Item | null; onDone?: () => void; defaultRate?: number }) {
  const action = editItem ? updateWishlistItem : createWishlistItem
  const [state, formAction, pending] = useActionState(action, null)
  const [wCurrency, setWCurrency] = useState(editItem?.currency ?? "L")
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      window.dispatchEvent(new CustomEvent("wishlist-updated"))
      if (onDone) onDone()
    }
  }, [state?.success, onDone])

  return (
    <form
      ref={formRef}
      action={formAction}
      className={`bg-white flex flex-col gap-6 ${
        editItem ? "" : "rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 md:p-8"
      }`}
    >
      {!editItem && (
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-black text-slate-900">
            Nuevo Deseo
          </h2>
          <p className="text-xs text-slate-400 font-medium">Agrega metas u compras pendientes.</p>
        </div>
      )}

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200/80 p-3.5 text-sm text-red-600 font-semibold text-center">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-xl bg-green-50 border border-green-200/80 p-3.5 text-sm text-green-600 font-semibold text-center">
          {editItem ? "Deseo actualizado con éxito!" : "¡Deseo agregado con éxito!"}
        </div>
      )}

      {editItem && <input type="hidden" name="id" value={editItem.id} />}

      {/* Nombre */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          ¿Qué quieres comprar? (Nombre)
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={editItem?.name ?? ""}
          placeholder="Ej. Llantas delantera, Celular nuevo"
          className="bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </div>

      {/* Moneda */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Moneda</label>
        <div className="flex gap-4">
          <label
            onClick={() => setWCurrency("L")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
              wCurrency === "L"
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <input type="radio" name="currency" value="L" defaultChecked={(editItem?.currency ?? "L") === "L"} className="hidden" />
            <span className={`text-sm font-black ${wCurrency === "L" ? "text-blue-700" : "text-slate-600"}`}>
              Lempiras (L)
            </span>
          </label>
          <label
            onClick={() => setWCurrency("$")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
              wCurrency === "$"
                ? "border-green-500 bg-green-50/50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <input type="radio" name="currency" value="$" defaultChecked={editItem?.currency === "$"} className="hidden" />
            <span className={`text-sm font-black ${wCurrency === "$" ? "text-green-700" : "text-slate-600"}`}>
              Dólares ($)
            </span>
          </label>
        </div>
      </div>

      {/* Precio Estimado */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Precio Estimado ({wCurrency})
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">{wCurrency}</span>
          <input
            name="estimatedPrice"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={editItem?.estimatedPrice ?? ""}
            placeholder="0.00 (Opcional)"
            className="w-full bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 pl-8 pr-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>
      </div>

      {/* Tasa de cambio (solo dólares) */}
      {wCurrency === "$" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tasa de cambio (L por $)</label>
          <input
            name="exchangeRate"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={editItem?.exchangeRate ?? defaultRate.toFixed(2)}
            placeholder="Ej. 25.00"
            className="bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>
      )}

      {/* Prioridad como selector táctil (Botón Radio) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Prioridad / Urgencia
        </label>
        <div className="flex gap-2 sm:gap-3">
          <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border-2 border-slate-100 py-3 px-2 cursor-pointer transition-all has-[:checked]:border-slate-500 has-[:checked]:bg-slate-50 group">
            <input
              type="radio"
              name="priority"
              value="baja"
              defaultChecked={editItem?.priority === "baja"}
              className="accent-slate-500 w-3.5 h-3.5"
            />
            <span className="text-xs font-black text-slate-600 group-has-[:checked]:text-slate-900">Baja</span>
          </label>

          <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border-2 border-slate-100 py-3 px-2 cursor-pointer transition-all has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50 group">
            <input
              type="radio"
              name="priority"
              value="media"
              defaultChecked={editItem ? editItem.priority === "media" : true}
              className="accent-amber-600 w-3.5 h-3.5"
            />
            <span className="text-xs font-black text-slate-600 group-has-[:checked]:text-amber-700">Media</span>
          </label>

          <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border-2 border-slate-100 py-3 px-2 cursor-pointer transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-50/50 group">
            <input
              type="radio"
              name="priority"
              value="alta"
              defaultChecked={editItem?.priority === "alta"}
              className="accent-red-600 w-3.5 h-3.5"
            />
            <span className="text-xs font-black text-slate-600 group-has-[:checked]:text-red-700">Alta</span>
          </label>
        </div>
      </div>

      {/* Botón de Enviar */}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#2563EB] text-white font-extrabold tracking-wider text-sm rounded-2xl py-4 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
      >
        {pending ? "Guardando..." : editItem ? "Guardar cambios" : "Agregar a la Lista"}
      </button>
    </form>
  )
}
