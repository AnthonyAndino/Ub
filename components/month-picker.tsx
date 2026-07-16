"use client"

import { useRef, useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { ChevronDown } from "reicon-react"

interface MonthPickerProps {
  value: string
  onChange: (value: string) => void
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const ref = useRef<DatePicker>(null)
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = new Date(value + "-01T12:00:00")

  const handleChange = (date: Date | null) => {
    if (date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, "0")
      onChange(`${y}-${m}`)
    }
    setIsOpen(false)
  }

  const label = selectedDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" })

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition-colors cursor-pointer min-w-[160px]"
      >
        <span className="capitalize">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className={`absolute top-full left-0 mt-1 z-50 ${isOpen ? "block" : "hidden"}`}>
        <DatePicker
          ref={ref}
          selected={selectedDate}
          onChange={handleChange}
          dateFormat="yyyy-MM"
          showMonthYearPicker
          inline
          calendarClassName="!border !border-slate-200 !rounded-2xl !shadow-lg !bg-white !p-2"
          renderCustomHeader={({ date, decreaseYear, increaseYear }) => (
            <div className="flex items-center justify-between px-2 py-1.5">
              <button
                type="button"
                onClick={decreaseYear}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronDown size={14} className="rotate-90" />
              </button>
              <span className="text-sm font-bold text-slate-800">
                {date.toLocaleDateString("es-MX", { year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={increaseYear}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>
          )}
        />
      </div>
    </div>
  )
}
