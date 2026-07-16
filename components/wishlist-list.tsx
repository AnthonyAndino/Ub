"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  listWishlistItems,
  togglePurchased,
  deleteWishlistItem,
} from "@/lib/actions/wishlist"
import { Trash, CheckCircle, Star } from "reicon-react"

type Item = Awaited<ReturnType<typeof listWishlistItems>>[number]

export function WishlistList() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listWishlistItems()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (id: string) => {
    await togglePurchased(id)
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, purchased: !i.purchased } : i)),
    )
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta meta?")) {
      await deleteWishlistItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 flex items-center justify-center min-h-[150px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cargando metas...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
        <Star size={40} color="#eab308" />
        <h2 className="text-lg font-black text-slate-900 mb-1">
          Sin metas registradas
        </h2>
        <p className="text-sm text-slate-400 max-w-xs font-medium">
          Añade las metas u objetos que quieres adquirir con tus ganancias del Uber.
        </p>
      </div>
    )
  }

  const priorityLabel = (p: string) => {
    switch (p) {
      case "alta":
        return { label: "Alta", colors: "border-red-200 bg-red-50 text-red-700" }
      case "media":
        return { label: "Media", colors: "border-amber-200 bg-amber-50 text-amber-700" }
      default:
        return { label: "Baja", colors: "border-slate-200 bg-slate-50 text-slate-600" }
    }
  }

  // Cálculos de metas y progreso
  const totalItems = items.length
  const purchasedItems = items.filter((i) => i.purchased).length
  const porcentajeProgreso = Math.round((purchasedItems / totalItems) * 100)

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-6">
      {/* Progreso General */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex justify-between items-center text-sm font-bold text-slate-800">
          <span>Metas Cumplidas</span>
          <span className="bg-[#2563EB]/10 text-[#2563EB] px-2.5 py-0.5 rounded-full text-xs font-black">
            {purchasedItems} de {totalItems} ({porcentajeProgreso}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-[#2563EB] transition-all duration-500"
            style={{ width: `${porcentajeProgreso}%` }}
          ></div>
        </div>
      </div>

      <div className="flex flex-col">
        <h2 className="text-xl font-black text-slate-900">
          Objetivos de Compra
        </h2>
        <p className="text-xs text-slate-400 font-medium">Cosas que quieres comprar con las ganancias del carro.</p>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const pr = priorityLabel(item.priority)
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                item.purchased
                  ? "border-green-200 bg-green-50/20"
                  : "border-slate-150 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Botón táctil para marcar comprado/no comprado (Checkbox circular) */}
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    item.purchased
                      ? "border-green-500 bg-green-50"
                      : "border-slate-300 hover:border-blue-500"
                  }`}
                  title={item.purchased ? "Marcar como pendiente" : "Marcar como comprado"}
                >
                  {item.purchased && <CheckCircle size={16} color="#16a34a" weight="Filled" />}
                </button>

                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-extrabold truncate ${
                        item.purchased
                          ? "line-through text-slate-400"
                          : "text-slate-800"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${pr.colors}`}
                    >
                      {pr.label}
                    </span>
                  </div>
                  {item.estimatedPrice && (
                    <p className={`text-xs font-bold ${
                      item.purchased ? "text-slate-400" : "text-[#2563EB]"
                    }`}>
                      Precio estimado: ${item.estimatedPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 cursor-pointer"
                  title="Eliminar meta"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
