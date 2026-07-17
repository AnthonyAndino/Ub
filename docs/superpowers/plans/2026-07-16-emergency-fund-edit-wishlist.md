# Emergency Fund + Edit Wishlist Items

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a single emergency fund per user using transaction-based patterns (like wishlist) and enable editing wishlist items.

**Architecture:** Emergency fund uses existing Transaction model with categories "Fondo Emergencia"/"Retiro Fondo Emergencia". Goal stored in User.emergencyFundGoal. Edit wishlist reuses the same form with pre-filled data.

**Tech Stack:** Next.js 16, Prisma 7, TypeScript, Tailwind CSS 4, reicon-react

## Global Constraints

- Only user with wishlist currency/exchangeRate on Transaction/WishlistItem
- All amounts default to Lempiras (L), $ amounts convert via exchangeRate
- Balance exclusions must include "Fondo Emergencia"/"Retiro Fondo Emergencia" alongside "Ahorro"/"Retiro Ahorro"
- Follow existing patterns: server actions in lib/actions/, client components in components/

---

### Task 1: Prisma — Add `emergencyFundGoal` to User model

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name emergency_fund_goal`

- [ ] **Step 1: Add field to User model**

```prisma
model User {
  id                String          @id @default(cuid())
  name              String?
  email             String          @unique
  password          String
  currency          String          @default("L")
  emergencyFundGoal Decimal?        @map("emergency_fund_goal")
  transactions      Transaction[]
  wishlistItems     WishlistItem[]
  createdAt         DateTime        @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name emergency_fund_goal
```

---

### Task 2: Server actions — `lib/actions/emergency-fund.ts`

**Files:**
- Create: `lib/actions/emergency-fund.ts`

- [ ] **Step 1: Create file**

```ts
"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

function toLempiras(t: { amount: { toNumber(): number }; currency: string; exchangeRate?: { toNumber(): number } | null }): number {
  const val = t.amount.toNumber()
  return t.currency === "$" && t.exchangeRate ? val * t.exchangeRate.toNumber() : val
}

export async function getEmergencyFundBalance() {
  const session = await auth()
  if (!session?.user?.id) return 0

  const tx = await prisma.transaction.findMany({
    where: { userId: session.user.id, deletedAt: null },
  })

  const deposits = tx
    .filter((t) => t.type === "expense" && t.category === "Fondo Emergencia")
    .reduce((sum, t) => sum + toLempiras(t), 0)

  const withdrawals = tx
    .filter((t) => t.type === "income" && t.category === "Retiro Fondo Emergencia")
    .reduce((sum, t) => sum + toLempiras(t), 0)

  return deposits - withdrawals
}

export async function getEmergencyFundGoal() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emergencyFundGoal: true },
  })

  return user?.emergencyFundGoal?.toNumber() ?? null
}

export async function setEmergencyFundGoal(goal: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  if (goal < 0) return { error: "La meta debe ser mayor o igual a cero" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emergencyFundGoal: goal },
  })

  revalidatePath("/")
  revalidatePath("/wishlist")
  return { success: true }
}

export async function depositToEmergencyFund(amount: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  if (amount <= 0) return { error: "El monto debe ser mayor a cero" }

  // Check available balance (exclude savings and emergency fund)
  const allTransactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, deletedAt: null },
  })

  const totalIncome = allTransactions
    .filter((t) => t.type === "income" && !["Retiro Ahorro", "Retiro Fondo Emergencia"].includes(t.category))
    .reduce((sum, t) => sum + toLempiras(t), 0)

  const totalExpenses = allTransactions
    .filter((t) => t.type === "expense" && !["Ahorro", "Fondo Emergencia"].includes(t.category))
    .reduce((sum, t) => sum + toLempiras(t), 0)

  const saldoDisponible = totalIncome - totalExpenses

  if (amount > saldoDisponible) {
    return {
      error: `Saldo insuficiente. Solo tienes L${saldoDisponible.toFixed(2)} disponible${
        saldoDisponible <= 0 ? ". Primero registra un ingreso." : "."
      }`,
    }
  }

  await prisma.transaction.create({
    data: {
      type: "expense",
      amount,
      category: "Fondo Emergencia",
      description: "Aporte al fondo de emergencia",
      date: new Date(),
      userId: session.user.id,
    },
  })

  revalidatePath("/")
  revalidatePath("/wishlist")
  return { success: true }
}

export async function withdrawFromEmergencyFund(amount: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  if (amount <= 0) return { error: "El monto debe ser mayor a cero" }

  const balance = await getEmergencyFundBalance()

  if (amount > balance) {
    return { error: `Solo tienes L${balance.toFixed(2)} en el fondo de emergencia.` }
  }

  await prisma.transaction.create({
    data: {
      type: "income",
      amount,
      category: "Retiro Fondo Emergencia",
      description: "Retiro del fondo de emergencia",
      date: new Date(),
      userId: session.user.id,
    },
  })

  revalidatePath("/")
  revalidatePath("/wishlist")
  return { success: true }
}
```

---

### Task 3: Update balance exclusion in `lib/actions/wishlist.ts`

**Files:**
- Modify: `lib/actions/wishlist.ts`

- [ ] **Step 1: Update `getAvailableBalance` to exclude emergency fund categories**

```ts
export async function getAvailableBalance() {
  const session = await auth()
  if (!session?.user?.id) return 0

  const allTransactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, deletedAt: null },
  })

  const toLempiras = (t: { amount: { toNumber(): number }; currency: string; exchangeRate?: { toNumber(): number } | null }) => {
    const val = t.amount.toNumber()
    return t.currency === "$" && t.exchangeRate ? val * t.exchangeRate.toNumber() : val
  }

  const totalIncome = allTransactions
    .filter((t) => t.type === "income" && !["Retiro Ahorro", "Retiro Fondo Emergencia"].includes(t.category))
    .reduce((sum, t) => sum + toLempiras(t), 0)

  const totalExpenses = allTransactions
    .filter((t) => t.type === "expense" && !["Ahorro", "Fondo Emergencia"].includes(t.category))
    .reduce((sum, t) => sum + toLempiras(t), 0)

  return totalIncome - totalExpenses
}
```

- [ ] **Step 2: Update `addFundsToWishlist` same exclusion logic**

Same change in `addFundsToWishlist` — replace the toLempiras inline and update exclusion arrays.

---

### Task 4: Add `updateWishlistItem` action

**Files:**
- Modify: `lib/actions/wishlist.ts`

- [ ] **Step 1: Add updateWishlistItem function**

```ts
const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "El nombre es requerido").trim(),
  estimatedPrice: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("El precio debe ser positivo").optional(),
  ),
  priority: z.enum(["baja", "media", "alta"]).default("media"),
  currency: z.enum(["$", "L"]).default("L"),
  exchangeRate: z.string().optional(),
})

export async function updateWishlistItem(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    estimatedPrice: formData.get("estimatedPrice"),
    priority: formData.get("priority") || undefined,
    currency: formData.get("currency") || "L",
    exchangeRate: formData.get("exchangeRate") || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const item = await prisma.wishlistItem.findUnique({ where: { id: parsed.data.id } })
  if (!item) return { error: "El elemento no existe" }
  if (item.userId !== session.user.id) return { error: "No autorizado" }

  await prisma.wishlistItem.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      estimatedPrice: parsed.data.estimatedPrice,
      priority: parsed.data.priority,
      currency: parsed.data.currency,
      exchangeRate: parsed.data.exchangeRate ? Number(parsed.data.exchangeRate) : null,
    },
  })

  revalidatePath("/")
  revalidatePath("/wishlist")
  return { success: true }
}
```

---

### Task 5: Emergency Fund Card component

**Files:**
- Create: `components/emergency-fund-card.tsx`

- [ ] **Step 1: Create component** (used on dashboard)

```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { Shield, ArrowDown, ArrowUp } from "reicon-react"
import Modal from "@/components/modal"
import { getEmergencyFundBalance, getEmergencyFundGoal, setEmergencyFundGoal, depositToEmergencyFund, withdrawFromEmergencyFund } from "@/lib/actions/emergency-fund"

export function EmergencyFundCard() {
  const [balance, setBalance] = useState(0)
  const [goal, setGoal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [b, g] = await Promise.all([getEmergencyFundBalance(), getEmergencyFundGoal()])
    setBalance(b)
    setGoal(g)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const porcentaje = goal && goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0
  const progressWidth = goal && goal > 0 ? `${porcentaje}%` : "0%"

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_12px_30px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200/30 rounded-2xl">
            <Shield size={22} color="#059669" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900">Fondo de Emergencia</span>
            <span className="text-xs text-slate-400 font-medium">Protegido para imprevistos</span>
          </div>
        </div>
        <SetGoalButton currentGoal={goal} onSet={load} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black text-slate-950">
          L{balance.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </span>
        {goal != null && goal > 0 && (
          <span className="text-sm font-bold text-slate-400">
            / L{goal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {goal != null && goal > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Progreso</span>
            <span>{porcentaje}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <FundActionButton label="Abonar" variant="primary" onAction={async (amount) => {
          const r = await depositToEmergencyFund(amount)
          if (!r.error) await load()
          return r
        }} />
        {balance > 0 && (
          <FundActionButton label="Retirar" variant="secondary" onAction={async (amount) => {
            const r = await withdrawFromEmergencyFund(amount)
            if (!r.error) await load()
            return r
          }} />
        )}
      </div>
    </div>
  )
}

function SetGoalButton({ currentGoal, onSet }: { currentGoal: number | null; onSet: () => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(currentGoal?.toString() ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const v = parseFloat(value)
    if (isNaN(v) || v < 0) return
    setSaving(true)
    await setEmergencyFundGoal(v)
    setSaving(false)
    setOpen(false)
    onSet()
  }

  return (
    <>
      <button
        onClick={() => { setValue(currentGoal?.toString() ?? ""); setOpen(true) }}
        className="text-xs font-bold text-[#2563EB] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
      >
        {currentGoal ? "Editar meta" : "Establecer meta"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={currentGoal ? "Editar meta" : "Establecer meta"}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Meta (L)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-white text-slate-900 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#2563EB] text-white font-extrabold text-xs rounded-xl py-3 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar meta"}
          </button>
        </div>
      </Modal>
    </>
  )
}

function FundActionButton({ label, variant, onAction }: {
  label: string
  variant: "primary" | "secondary"
  onAction: (amount: number) => Promise<{ error?: string; success?: boolean }>
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseFloat(amount)
    if (isNaN(v) || v <= 0) { setError("Ingresa un monto válido."); return }
    setSubmitting(true)
    setError("")
    const r = await onAction(v)
    if (r.error) { setError(r.error); setSubmitting(false) }
    else { setSubmitting(false); setOpen(false); setAmount("") }
  }

  const isPrimary = variant === "primary"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex-1 flex items-center justify-center gap-1.5 font-black text-xs rounded-xl py-2.5 px-3 transition-all cursor-pointer active:scale-[0.98] ${
          isPrimary
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white"
            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50"
        }`}
      >
        {isPrimary ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={label === "Abonar" ? "Abonar al Fondo" : "Retirar del Fondo"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-bold">{error}</div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Monto a {label.toLowerCase()}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">L</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white text-slate-900 rounded-xl border border-slate-200 py-3.5 pl-8 pr-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#2563EB] text-white font-extrabold text-xs rounded-xl py-3 px-4 uppercase hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Procesando..." : label}
          </button>
        </form>
      </Modal>
    </>
  )
}
```

---

### Task 6: Dashboard — add Emergency Fund Card

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add import at top**

```tsx
import { EmergencyFundCard } from "@/components/emergency-fund-card"
```

- [ ] **Step 2: Add card after the weekly chart section, inside the main content grid**

Insert after the weekly chart + category section grid (before closing `</main>`):

```tsx
        {/* Fondo de Emergencia */}
        <EmergencyFundCard />
```

---

### Task 7: Wishlist page — add pinned Emergency Fund card

**Files:**
- Modify: `app/wishlist/page.tsx`

- [ ] **Step 1: Add import**

```tsx
import { EmergencyFundWishlistCard } from "@/components/emergency-fund-card"
```

- [ ] **Step 2: Add pinned card at top of the list column**

Inside the `lg:col-span-7` div, before `<WishlistList />`:

```tsx
            <EmergencyFundWishlistCard />
```

But we need to export a `EmergencyFundWishlistCard` from the same component file. Let me add it.

---

### Task 8: Add EmergencyFundWishlistCard to component file

**Files:**
- Modify: `components/emergency-fund-card.tsx`

- [ ] **Step 1: Add the wishlist-specific version**

```tsx
export function EmergencyFundWishlistCard() {
  const [balance, setBalance] = useState(0)
  const [goal, setGoal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [b, g] = await Promise.all([getEmergencyFundBalance(), getEmergencyFundGoal()])
    setBalance(b)
    setGoal(g)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener("wishlist-updated", handler)
    return () => window.removeEventListener("wishlist-updated", handler)
  }, [load])

  const porcentaje = goal && goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200/30 rounded-2xl">
            <Shield size={24} color="#059669" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900">Fondo de Emergencia</span>
            <span className="text-xs text-slate-400 font-medium">Protegido para imprevistos</span>
          </div>
        </div>
        <SetGoalButton currentGoal={goal} onSet={load} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black text-slate-950">
          L{balance.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </span>
        {goal != null && goal > 0 && (
          <span className="text-sm font-bold text-slate-400">
            / L{goal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {goal != null && goal > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Progreso</span>
            <span>{porcentaje}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <FundActionButton label="Abonar" variant="primary" onAction={async (amount) => {
          const r = await depositToEmergencyFund(amount)
          if (!r.error) await load()
          return r
        }} />
        {balance > 0 && (
          <FundActionButton label="Retirar" variant="secondary" onAction={async (amount) => {
            const r = await withdrawFromEmergencyFund(amount)
            if (!r.error) await load()
            return r
          }} />
        )}
      </div>
    </div>
  )
}
```

---

### Task 9: Add ✏️ edit button to wishlist-list.tsx

**Files:**
- Modify: `components/wishlist-list.tsx`

- [ ] **Step 1: Import `updateWishlistItem`**

```tsx
import { listWishlistItems, togglePurchased, deleteWishlistItem, addFundsToWishlist, withdrawFundsFromWishlist, getAvailableBalance, updateWishlistItem } from "@/lib/actions/wishlist"
```

- [ ] **Step 2: Add edit modal state**

```tsx
const [editItem, setEditItem] = useState<Item | null>(null)
```

- [ ] **Step 3: Add edit button next to the trash button (before delete button)**

```tsx
<button
  onClick={() => setEditItem(item)}
  className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
  title="Editar meta"
>
  <Pencil size={16} />
</button>
```

Need `Pencil` from reicon-react.

- [ ] **Step 4: Add edit modal at bottom (before ConfirmDialog)**

```tsx
<Modal open={editItem !== null} onClose={() => setEditItem(null)} title="Editar deseo">
  {editItem && (
    <WishlistForm editItem={editItem} onDone={() => { setEditItem(null); load() }} />
  )}
</Modal>
```

---

### Task 10: Update WishlistForm to support edit mode

**Files:**
- Modify: `components/wishlist-form.tsx`

- [ ] **Step 1: Accept optional editItem and onDone props**

```tsx
import { createWishlistItem, updateWishlistItem } from "@/lib/actions/wishlist"

type Item = { id: string; name: string; estimatedPrice: number | null; priority: string; currency: string; exchangeRate: number | null }

export function WishlistForm({ editItem, onDone }: { editItem?: Item | null; onDone?: () => void }) {
  const action = editItem ? updateWishlistItem : createWishlistItem
  const [state, formAction, pending] = useActionState(action, null)
  const [wCurrency, setWCurrency] = useState(editItem?.currency ?? "L")
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      window.dispatchEvent(new CustomEvent("wishlist-updated"))
      if (onDone) onDone()
    }
  }, [state?.success, onDone])

  // ... rest of component with defaultValue from editItem
}
```

All form fields need `defaultValue` when `editItem` is provided.

---

### Task 11: Update dashboard to import EmergencyFundCard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add import**

```tsx
import { EmergencyFundCard } from "@/components/emergency-fund-card"
```

- [ ] **Step 2: Add component after the weekly chart section**

After the grid closing `</div>` (after weekly chart + categories), before `</main>`:

```tsx
        <EmergencyFundCard />
```
