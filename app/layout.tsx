import type { Metadata } from "next"
import { Geist, Geist_Mono, Outfit } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/session-provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Control de Gastos",
  description: "Control de ingresos y gastos familiar",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 grid-bg font-sans relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,rgba(250,250,250,0)_20%,#fafafa_95%)] before:-z-10 before:pointer-events-none">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
