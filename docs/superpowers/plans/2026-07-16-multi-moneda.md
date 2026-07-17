# Multi-moneda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each transaction to be recorded in $ or L with its exchange rate, and convert totals to the user's preferred currency.

**Architecture:** Each transaction stores `currency` ($ or L) and `exchangeRate` (L per $). The user has a preferred `currency` on their profile. Dashboard/historial/gráficos convert all amounts to the preferred currency using each transaction's historical rate.

**Tech Stack:** Prisma 7, PostgreSQL, Next.js 16, react-datepicker

## Global Constraints

- Currency values: only `"$"` or `"L"`
- Exchange rate: positive Decimal(10,4), stored per-transaction
- User preferred currency: stored on User model (already exists)
- Conversion: amount * rate ($→L), amount / rate (L→$)
- All amounts displayed must show the correct currency symbol

---

### Task 1: Prisma schema — add currency + exchangeRate to Transaction

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration (via prisma migrate dev)

**Interfaces:**
- Produces: `Transaction.currency` (String, default "L"), `Transaction.exchangeRate` (Decimal?, nullable)

- [ ] **Step 1: Add fields to schema**

In `prisma/schema.prisma`, add to `model Transaction`:

```
currency     String      @default("L")
exchangeRate Decimal?    @db.Decimal(10, 4)
```

- [ ] **Step 2: Create migration**

```bash
npx prisma migrate dev --name add_currency_to_transaction
```

- [ ] **Step 3: Generate client**

```bash
npx prisma generate
```

---

### Task 2: Transaction actions — include currency + exchangeRate

**Files:**
- Modify: `lib/actions/transactions.ts`

**Interfaces:**
- Consumes: `Transaction.currency`, `Transaction.exchangeRate` (from Prisma)
- Produces: `createTransaction` accepts currency/exchangeRate from form; `listTransactions`, `listAllTransactions`, `listTrashedTransactions` return currency/exchangeRate in the mapped response

- [ ] **Step 1: Update createSchema validation**

Add to the zod schema in `createSchema`:
```typescript
currency: z.enum(["$", "L"]).default("L"),
exchangeRate: z.string().optional(),
```

- [ ] **Step 2: Update formData parsing in createTransaction**

Add after the existing parsed fields:
```typescript
currency: formData.get("currency") || "L",
exchangeRate: formData.get("exchangeRate") || undefined,
```

- [ ] **Step 3: Update prisma create call**

Add to the `data:` object in `prisma.transaction.create`:
```typescript
currency: parsed.data.currency,
exchangeRate: parsed.data.exchangeRate ? Number(parsed.data.exchangeRate) : null,
```

- [ ] **Step 4: Update listTransactions return**

Add to the map return:
```typescript
currency: t.currency,
exchangeRate: t.exchangeRate?.toNumber() ?? null,
```

- [ ] **Step 5: Update listAllTransactions return**

Add `currency` and `exchangeRate` to the returned object.

- [ ] **Step 6: Update listTrashedTransactions return**

Add `currency` and `exchangeRate` to the returned object.

---

### Task 3: Transaction form — currency toggle + exchange rate

**Files:**
- Modify: `components/transaction-form.tsx`

**Interfaces:**
- Consumes: formData with `currency`, `exchangeRate` (sent to createTransaction)
- Produces: UI with $/L toggle and exchange rate input

- [ ] **Step 1: Add currency state**

Add to the component:
```typescript
const [txCurrency, setTxCurrency] = useState("L")
```

- [ ] **Step 2: Add currency toggle UI after the type selector**

After the type selector (income/expense), add:
```tsx
<div className="flex flex-col gap-2">
  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Moneda</label>
  <div className="flex gap-4">
    <label
      onClick={() => setTxCurrency("L")}
      className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
        txCurrency === "L"
          ? "border-blue-500 bg-blue-50/50"
          : "border-slate-100 bg-slate-50 hover:bg-slate-100/50"
      }`}
    >
      <input type="radio" name="currency" value="L" defaultChecked className="hidden" />
      <span className={`text-sm font-black ${txCurrency === "L" ? "text-blue-700" : "text-slate-700"}`}>Lempiras (L)</span>
    </label>
    <label
      onClick={() => setTxCurrency("$")}
      className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
        txCurrency === "$"
          ? "border-green-500 bg-green-50/50"
          : "border-slate-100 bg-slate-50 hover:bg-slate-100/50"
      }`}
    >
      <input type="radio" name="currency" value="$" className="hidden" />
      <span className={`text-sm font-black ${txCurrency === "$" ? "text-green-700" : "text-slate-700"}`}>Dólares ($)</span>
    </label>
  </div>
</div>
```

- [ ] **Step 3: Add exchange rate field (only when currency is $)**

After the currency toggle (or after description), add:
```tsx
{txCurrency === "$" && (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tasa de cambio (L por $)</label>
    <input
      name="exchangeRate"
      type="number"
      step="0.01"
      min="0.01"
      required
      placeholder="Ej. 25.50"
      defaultValue="25.00"
      className="w-full bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 py-3.5 px-4 text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
    />
  </div>
)}
```

- [ ] **Step 4: Update the amount field placeholder/prefix based on currency**

Change the `$` prefix next to the amount input to use `txCurrency` instead of hardcoded `$`.

---

### Task 4: Dashboard cards — accept currency prop

**Files:**
- Modify: `components/dashboard-cards.tsx`

- [ ] **Step 1: Add currency prop**

```typescript
export function DashboardCards({
  ingresos,
  gastos,
  balance,
  currency = "$",
}: {
  ingresos: number
  gastos: number
  balance: number
  currency?: string
}) {
```

- [ ] **Step 2: Replace hardcoded $ with currency**

Replace `$` in all amount displays with `{currency}`.

---

### Task 5: Dashboard page — convert amounts to preferred currency

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Fetch user preferred currency**

Already done (line 13-17):
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { currency: true },
})
const currency = user?.currency ?? "$"
```

- [ ] **Step 2: Convert transactions to preferred currency**

Before summing, convert each transaction amount to the user's preferred currency:
```typescript
function convertToPreferred(amount: number, txCurrency: string, rate: number | null, preferred: string): number {
  if (txCurrency === preferred) return amount
  if (preferred === "L") return amount * (rate ?? 1)  // $ → L
  return amount / (rate ?? 1)  // L → $
}
```

- [ ] **Step 3: Apply conversion when summing**

In the dashboard, when summing income/expense, convert each transaction:
```typescript
transaccionesMes.forEach((t) => {
  const monto = convertToPreferred(
    t.amount.toNumber(),
    t.currency,
    t.exchangeRate?.toNumber() ?? null,
    currency
  )
  // ...existing logic using monto instead of t.amount...
})
```

- [ ] **Step 4: Pass currency to DashboardCards and other components**

Update all component usages to pass `currency={currency}`.

---

### Task 6: Transaction list — show currency sign per transaction

**Files:**
- Modify: `components/transaction-list.tsx`

- [ ] **Step 1: Update amount display**

Replace the hardcoded `{currency}` with the transaction's own currency:
```typescript
{t.currency}{t.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
```

- [ ] **Step 2: Show equivalent in preferred currency**

If the transaction currency differs from the display currency, show the equivalent:
```typescript
{t.currency}{t.amount.toLocaleString("es-MX", ...)}
{txCurrency !== preferredCurrency && (
  <span className="text-xs text-slate-400">
    (~{preferredCurrency}{equivalent.toFixed(2)})
  </span>
)}
```

---

### Task 7: Historial — convert and show currencies

**Files:**
- Modify: `app/historial/page.tsx`

- [ ] **Step 1: Fetch user preferred currency**

Add after session check:
```typescript
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { currency: true },
})
const preferredCurrency = user?.currency ?? "$"
```

But historial is a client component... We need to fetch it differently. Either:
- Pass preferred currency via a server component wrapper
- Or fetch it in the client via an API call

Actually, the simplest approach: add `currency` to the server action response so the client knows.

Wait, the historial page is `"use client"`. Let me rethink this.

Actually for the historial, since it's client-side, I should either:
a) Add a server action to get user currency
b) Include currency in the transaction list response and let the sidebar toggle handle it

The user already has a preferred currency on the User model, and the sidebar toggle calls `updateUserCurrency`. The historial page can get the currency from the session user data.

Actually, the simplest approach: include `currency` in the response from `listAllTransactions` (the user's preferred currency), or create a simple server action `getUserCurrency`.

Actually, even simpler: in the sidebar, when the user toggles currency, it updates the DB. In the historial, just pass the preferred currency from the session. But historial is a client component...

Let me simplify: Add a new server action `getUserPreferences` that returns `{ currency }`, and call it in the historial page. Or, even simpler, include the user's preferred currency in the `listAllTransactions` response.

Actually the simplest: just include the transaction's own currency in the response (already done in Task 2), and let the component display it. The sidebar toggle already updates the user's preferred currency in DB. We can have a lightweight action to get it.

Let me add a step: create a `getUserCurrency` server action.

---

### Task 8: Seed — update demo data

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add currency and exchangeRate to seed transactions**

Most seed transactions should be "L" with no rate, but add some "$" transactions with rate 25.00.

---

### Task 9: Gráficos — convert amounts

**Files:**
- Modify: `app/graficos/page.tsx`

- [ ] **Step 1: Convert transactions to preferred currency**

Same conversion logic as dashboard (Task 5). Apply `convertToPreferred` to all transaction amounts before aggregating into charts.

---

### Task 10: Historial — convert amounts client-side

**Files:**
- Create: `lib/actions/preferences.ts`
- Modify: `app/historial/page.tsx`

- [ ] **Step 1: Create getUserCurrency action**

`lib/actions/preferences.ts`:
```typescript
"use server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function getUserCurrency() {
  const session = await auth()
  if (!session?.user?.id) return "$"
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true },
  })
  return user?.currency ?? "$"
}
```

- [ ] **Step 2: Call it from historial page**

```typescript
const [prefCurrency, setPrefCurrency] = useState("$")
useEffect(() => {
  getUserCurrency().then(setPrefCurrency)
}, [])
```

- [ ] **Step 3: Convert transaction amounts in the table**

Before rendering, convert amounts to preferred currency using each transaction's rate.

---

### Task 11: Sidebar — pass currency to transaction-list and remove old toggle

**Files:**
- Modify: `components/sidebar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: The currency toggle on the sidebar already calls `updateUserCurrency`**

Already exists in sidebar.tsx. No changes needed.

- [ ] **Step 2: Pass preferred currency to TransactionList**

In `app/page.tsx`, pass `currency` to the `TransactionList` component (it already accepts it as a prop).
