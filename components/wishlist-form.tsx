"use client"

import { useActionState } from "react"
import { createWishlistItem } from "@/lib/actions/wishlist"

export function WishlistForm() {
  const [state, formAction, pending] = useActionState(createWishlistItem, null)

  return (
    <form
      action={formAction}
      className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-black text-slate-900">
          Nuevo Deseo
        </h2>
        <p className="text-xs text-slate-400 font-medium">Agrega metas o compras pendientes del vehículo.</p>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200/80 p-3.5 text-sm text-red-600 font-semibold text-center">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-xl bg-green-50 border border-green-200/80 p-3.5 text-sm text-green-600 font-semibold text-center">
          ¡Deseo agregado con éxito!
        </div>
      )}

      {/* Nombre */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          ¿Qué quieres comprar? (Nombre)
        </label>
        <input
          name="name"
          type="text"
          required
          placeholder="Ej. Llantas delanteras, Celular para Uber"
          className="bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </div>

      {/* Precio Estimado */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Precio Estimado ($)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">$</span>
          <input
            name="estimatedPrice"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00 (Opcional)"
            className="w-full bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 pl-8 pr-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>
      </div>

      {/* Prioridad como selector táctil (Botón Radio) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Prioridad / Urgencia
        </label>
        <div className="flex gap-2 sm:gap-3">
          <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border-2 border-slate-100 py-3 px-2 hover:bg-slate-100/50 cursor-pointer transition-all has-[:checked]:border-slate-500 has-[:checked]:bg-slate-50 group">
            <input
              type="radio"
              name="priority"
              value="baja"
              className="accent-slate-500 w-3.5 h-3.5"
            />
            <span className="text-xs font-black text-slate-600 group-has-[:checked]:text-slate-900">Baja</span>
          </label>
          
          <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border-2 border-slate-100 py-3 px-2 hover:bg-slate-100/50 cursor-pointer transition-all has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50 group">
            <input
              type="radio"
              name="priority"
              value="media"
              defaultChecked
              className="accent-amber-600 w-3.5 h-3.5"
            />
            <span className="text-xs font-black text-slate-600 group-has-[:checked]:text-amber-700">Media</span>
          </label>
          
          <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 rounded-xl border-2 border-slate-100 py-3 px-2 hover:bg-slate-100/50 cursor-pointer transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-50/50 group">
            <input
              type="radio"
              name="priority"
              value="alta"
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
        {pending ? "Guardando..." : "Agregar a la Lista"}
      </button>
    </form>
  )
}
