"use client"

import Modal from "@/components/modal"
import { AlertTriangle, Refresh } from "reicon-react"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  variant?: "danger" | "info"
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={
        variant === "danger" ? (
          <AlertTriangle size={24} color="#EF4444" />
        ) : (
          <Refresh size={24} color="#2563EB" />
        )
      }
    >
      <p className="text-sm text-slate-500 font-medium leading-relaxed text-center">
        {message}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition-all cursor-pointer ${
            variant === "danger"
              ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
              : "bg-[#2563EB] hover:bg-blue-700 shadow-lg shadow-blue-500/20"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
