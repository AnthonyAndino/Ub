"use client"

import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Home, CreditCard, Star, Logout, WalletMoney, ChartBar, Clock, Trash2 } from "reicon-react"

const links = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/transacciones", label: "Registrar", icon: CreditCard },
  { href: "/historial", label: "Historial", icon: Clock },
  { href: "/graficos", label: "Gráficos", icon: ChartBar },
  { href: "/wishlist", label: "Deseos", icon: Star },
]

interface SidebarProps {
  userName?: string | null
  userEmail?: string | null
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white border-r border-slate-200/80 z-40">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-100">
          <WalletMoney size={22} color="#2563EB" weight="Filled" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Control<span className="text-[#2563EB]">Gastos</span>
          </span>
        </div>

        {/* User Card */}
        <div className="mx-3 mt-4 mb-2 p-3 rounded-2xl bg-gradient-to-br from-[#2563EB]/5 to-[#2563EB]/10 border border-[#2563EB]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white text-sm font-black shrink-0">
              {(userName ?? userEmail ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                {userName ?? "Usuario"}
              </p>
              <p className="text-[11px] text-slate-500 font-medium truncate leading-tight">
                {userEmail ?? ""}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {links.map((link) => {
            const active = pathname === link.href
            const Icon = link.icon
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  active
                    ? "bg-[#2563EB] text-white shadow-md"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon size={20} weight={active ? "Filled" : "Outline"} />
                {link.label}
              </a>
            )
          })}
        </nav>

        <div className="px-3">
          <a
            href="/papelera"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              pathname === "/papelera"
                ? "bg-[#2563EB] text-white shadow-md"
                : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Trash2 size={20} weight={pathname === "/papelera" ? "Filled" : "Outline"} />
            Papelera
          </a>
        </div>

        <div className="px-3 py-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all w-full"
          >
            <Logout size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {links.map((link) => {
            const active = pathname === link.href
            const Icon = link.icon
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${
                  active
                    ? "text-[#2563EB]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon size={20} weight={active ? "Filled" : "Outline"} />
                {link.label}
              </a>
            )
          })}
          <a
            href="/papelera"
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${
              pathname === "/papelera"
                ? "text-[#2563EB]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Trash2 size={20} weight={pathname === "/papelera" ? "Filled" : "Outline"} />
            Papelera
          </a>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-red-500 transition-all"
          >
            <Logout size={20} />
            Salir
          </button>
        </div>
      </nav>
    </>
  )
}
