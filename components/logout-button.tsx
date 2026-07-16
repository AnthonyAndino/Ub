"use client"

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-red-500 transition-colors"
    >
      Cerrar sesión
    </button>
  )
}
