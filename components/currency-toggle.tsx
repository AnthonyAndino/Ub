"use client"

import { updateUserCurrency } from "@/lib/actions/auth"

export function CurrencyToggle({ defaultCurrency = "L" }: { defaultCurrency?: string }) {
  const handleChange = async (c: string) => {
    await updateUserCurrency(c)
    window.location.reload()
  }

  return (
    <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200/20">
      <button
        type="button"
        onClick={() => handleChange("$")}
        className={`px-2 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
          defaultCurrency === "$"
            ? "bg-[#2563EB] text-white shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        USD ($)
      </button>
      <button
        type="button"
        onClick={() => handleChange("L")}
        className={`px-2 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
          defaultCurrency === "L"
            ? "bg-[#2563EB] text-white shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        LPS (L)
      </button>
    </div>
  )
}
