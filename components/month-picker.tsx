"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, ChevronDown } from "reicon-react"

interface MonthPickerProps {
  value: string
  onChange: (value: string) => void
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [year, month] = value.split("-").map(Number)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(year)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const selectMonth = (m: number) => {
    onChange(`${viewYear}-${String(m + 1).padStart(2, "0")}`)
    setOpen(false)
  }

  const prevYear = () => setViewYear((y) => y - 1)
  const nextYear = () => setViewYear((y) => y + 1)

  const currentLabel = `${MONTHS[month - 1]} / ${year}`

  return (
    <div ref={ref} className="relative w-64">
      <button
        type="button"
        onClick={() => {
          setViewYear(year)
          setOpen(!open)
        }}
        className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition-colors cursor-pointer w-full"
      >
        <span className="capitalize truncate">{currentLabel}</span>
        <ChevronDown size={12} className={`text-slate-500 shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 w-full">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevYear}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-800">{viewYear}</span>
            <button
              type="button"
              onClick={nextYear}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const selected = viewYear === year && i === month - 1
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMonth(i)}
                  className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    selected
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
