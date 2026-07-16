import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 md:p-12 w-full max-w-6xl mx-auto min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
        {/* Lado Izquierdo: Marca y Título Estilo Hero */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-slate-900">
            <span className="bg-[#2563EB] text-white px-2 py-0.5 rounded-md text-sm font-black">G</span>
            <span>Control<span className="text-[#2563EB] font-black">Gastos</span></span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] md:leading-[1.05]">
            Controla tus finanzas.{" "}
            <span className="bg-gradient-to-r from-[#2563EB] to-blue-500 bg-clip-text text-transparent">
              Fácil y sin vueltas.
            </span>
          </h1>
          
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-xl">
            Diseñado para llevar el control de tus ingresos, gastos y metas de forma rápida, simple y clara — todo en un solo lugar.
          </p>
        </div>

        {/* Lado Derecho: Tarjeta de Login */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
