"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "reicon-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  icon?: ReactNode
}

export default function Modal({ open, onClose, title, children, icon }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl border border-slate-200/60 shadow-[0_25px_50px_rgba(0,0,0,0.15)] w-full max-w-md p-6 md:p-8 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X size={18} />
        </button>
        <div className="flex flex-col gap-4">
          {icon && (
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100">
              {icon}
            </div>
          )}
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  )
}
