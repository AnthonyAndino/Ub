"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  listWishlistItems,
  togglePurchased,
  deleteWishlistItem,
  addFundsToWishlist,
  withdrawFundsFromWishlist,
  getAvailableBalance,
  updateWishlistItem,
} from "@/lib/actions/wishlist"
import { Trash, CheckCircle, Star, Edit2 } from "reicon-react"
import Modal from "@/components/modal"
import ConfirmDialog from "@/components/confirm-dialog"
import { WishlistForm } from "@/components/wishlist-form"

type Item = Awaited<ReturnType<typeof listWishlistItems>>[number]

export function WishlistList() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // Estados del modal de ahorros
  const [modalOpen, setModalOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<Item | null>(null)
  const [actionType, setActionType] = useState<"add" | "withdraw">("add")
  const [amount, setAmount] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [availableBalance, setAvailableBalance] = useState(0)

  // Estados del modal de edición
  const [editItem, setEditItem] = useState<Item | null>(null)

  // Estados del modal de confirmación de borrado
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  // Estados de filtros y paginación
  const [filter, setFilter] = useState<"active" | "completed">("active")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 3

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listWishlistItems()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const handleUpdate = () => load()
    window.addEventListener("wishlist-updated", handleUpdate)
    return () => window.removeEventListener("wishlist-updated", handleUpdate)
  }, [load])

  const handleToggle = async (id: string) => {
    await togglePurchased(id)
    load()
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    await deleteWishlistItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    router.refresh()
  }

  const handleFilterChange = (newFilter: "active" | "completed") => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const handleOpenModal = async (item: Item, type: "add" | "withdraw") => {
    setActiveItem(item)
    setActionType(type)
    setAmount("")
    setErrorMsg("")
    const balance = await getAvailableBalance()
    setAvailableBalance(balance)
    setModalOpen(true)
  }

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeItem) return
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Ingresa un monto válido.")
      return
    }

    setSubmitting(true)
    setErrorMsg("")

    let result
    if (actionType === "add") {
      result = await addFundsToWishlist(activeItem.id, numericAmount)
    } else {
      result = await withdrawFundsFromWishlist(activeItem.id, numericAmount)
    }

    if (result && result.error) {
      setErrorMsg(result.error)
      setSubmitting(false)
    } else {
      setSubmitting(false)
      setModalOpen(false)
      setAmount("")
      load()
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
          Añade las metas u objetivos que quieres adquirir con tus ingresos.
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

  // Cálculos globales
  const totalItems = items.length
  const purchasedItems = items.filter((i) => i.purchased).length
  const porcentajeProgreso = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0

  // Filtrado y paginación en el cliente
  const filteredItems = items.filter((item) => {
    if (filter === "active") return !item.purchased
    return item.purchased
  })

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedItems = filteredItems.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
  )

  const activeCount = items.filter((i) => !i.purchased).length
  const completedCount = items.filter((i) => i.purchased).length

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

      {/* Pestañas de Filtrado (Tabs) */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/40 w-full">
        <button
          onClick={() => handleFilterChange("active")}
          className={`flex-1 text-center font-extrabold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer ${
            filter === "active"
              ? "bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Activas ({activeCount})
        </button>
        <button
          onClick={() => handleFilterChange("completed")}
          className={`flex-1 text-center font-extrabold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer ${
            filter === "completed"
              ? "bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Completadas ({completedCount})
        </button>
      </div>

      <div className="flex flex-col">
        <h2 className="text-xl font-black text-slate-900">
          {filter === "active" ? "Objetivos de Compra" : "Metas Cumplidas"}
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          {filter === "active" ? "Cosas que quieres comprar con tus ingresos." : "Objetivos que ya lograste comprar."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {paginatedItems.length === 0 ? (
          <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-sm text-slate-455 font-medium text-slate-400">
              No hay metas {filter === "active" ? "activas" : "completadas"} en este momento.
            </p>
          </div>
        ) : (
          paginatedItems.map((item) => {
            const pr = priorityLabel(item.priority)
            const totalEstimado = item.estimatedPrice ?? 0
            const ahorroActual = item.savedAmount ?? 0
            const itemCurrency = item.currency ?? "L"
            const itemRate = item.exchangeRate ?? null
            const estimatedInL = (itemCurrency === "$" && itemRate)
              ? totalEstimado * itemRate
              : totalEstimado
            const porcentajeMeta = estimatedInL > 0 ? Math.min(100, Math.round((ahorroActual / estimatedInL) * 100)) : 0

            return (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${
                  item.purchased
                    ? "border-green-200 bg-green-50/10"
                    : "border-slate-150 hover:bg-slate-50/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
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

                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-extrabold truncate ${
                            item.purchased
                              ? "line-through text-slate-455 font-bold"
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
                      {totalEstimado > 0 ? (
                        <p className={`text-xs font-bold ${
                          item.purchased ? "text-slate-400" : "text-slate-500"
                        }`}>
                          Meta de ahorro: {itemCurrency}{totalEstimado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {itemCurrency === "$" && itemRate && (
                            <span className="text-slate-400 font-medium ml-1">
                              (≈ L{estimatedInL.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-slate-400">Sin precio estimado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-0.5">
                    <button
                      onClick={() => setEditItem(item)}
                      className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                      title="Editar meta"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { setItemToDelete(item.id); setDeleteModalOpen(true) }}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                      title="Eliminar meta"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Barra de progreso de ahorro para esta meta */}
                {estimatedInL > 0 && (
                  <div className="flex flex-col gap-1.5 w-full bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                      <span>Ahorrado:</span>
                      <span className={item.purchased ? "text-green-600 font-extrabold" : "text-[#2563EB] font-extrabold"}>
                        L{ahorroActual.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de {itemCurrency === "$" && itemRate ? `L${estimatedInL.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${itemCurrency}${estimatedInL.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} ({porcentajeMeta}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden border border-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                          item.purchased ? "from-green-500 to-emerald-400" : "from-[#2563EB] to-blue-500"
                        }`}
                        style={{ width: `${porcentajeMeta}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Botonera de Ahorro y Retiro */}
                {!item.purchased && (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => handleOpenModal(item, "add")}
                      className="flex-1 bg-blue-50 hover:bg-[#2563EB] hover:text-white text-[#2563EB] font-black text-xs rounded-xl py-2 px-3 transition-all duration-200 cursor-pointer text-center active:scale-[0.98]"
                    >
                      + Ahorrar
                    </button>
                    {ahorroActual > 0 && (
                      <button
                        onClick={() => handleOpenModal(item, "withdraw")}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl py-2 px-3 transition-all duration-200 cursor-pointer text-center border border-slate-200/50 active:scale-[0.98]"
                      >
                        - Retirar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-150 pt-5 mt-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={activePage === 1}
            className="bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-extrabold text-xs rounded-xl py-2 px-4 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            Anterior
          </button>
          <span className="text-xs font-bold text-slate-500 select-none">
            Página {activePage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={activePage === totalPages}
            className="bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-extrabold text-xs rounded-xl py-2 px-4 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal interactivo de Ahorro/Retiro */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={actionType === "add" ? `Abonar a: ${activeItem?.name}` : `Retirar de: ${activeItem?.name}`}
      >
        <form onSubmit={handleActionSubmit} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {actionType === "add" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm">
              <span className="font-bold text-blue-700">Saldo disponible: L{availableBalance.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Monto a {actionType === "add" ? "Ahorrar" : "Retirar"}
            </label>
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
                className="w-full bg-white text-slate-900 rounded-xl border border-slate-200 py-3.5 pl-8 pr-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#2563EB] text-white font-extrabold text-xs rounded-xl py-3 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Procesando..." : actionType === "add" ? "Abonar Ahorro" : "Retirar Fondos"}
          </button>
        </form>
      </Modal>

      {/* Modal de edición */}
      <Modal
        open={editItem !== null}
        onClose={() => setEditItem(null)}
        title="Editar deseo"
      >
        {editItem && (
          <WishlistForm editItem={editItem} onDone={() => { setEditItem(null); load() }} />
        )}
      </Modal>

      {/* Confirmación de borrado */}
      <ConfirmDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => { if (itemToDelete) handleDelete(itemToDelete); setItemToDelete(null) }}
        title="Eliminar meta"
        message="¿Estás seguro de que deseas eliminar esta meta? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  )
}
