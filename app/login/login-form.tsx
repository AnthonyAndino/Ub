"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { authenticate } from "@/lib/actions/auth"

export function LoginForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; success?: boolean } | null,
      formData: FormData,
    ) => {
      const res = await authenticate(null, formData)
      if (res.success) {
        router.push("/")
        router.refresh()
      }
      return res
    },
    null,
  )

  return (
    <form
      action={formAction}
      className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_20px_50px_rgba(15,23,42,0.06)] w-full max-w-md p-8 md:p-10 flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900">
          Iniciar sesión
        </h2>
        <p className="text-slate-400 text-sm">
          Introduce tus datos para acceder al panel de control.
        </p>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200/80 p-3.5 text-sm text-red-600 text-center font-semibold">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Correo Electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          placeholder="nombre@correo.com"
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#2563EB] text-white font-extrabold tracking-wider text-sm rounded-2xl py-4 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
      >
        {pending ? "Iniciando..." : "Entrar al Sistema"}
      </button>
    </form>
  )
}
