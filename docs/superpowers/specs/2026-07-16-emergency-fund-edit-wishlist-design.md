# Emergency Fund + Edit Wishlist Items

## Overview

Two features:

1. **Fondo de Emergencia** — single savings fund per user with configurable goal, using the same transaction-based pattern as wishlists
2. **Editar Deseos** — allow users to edit name, estimated price, and priority of existing wishlist items

---

## 1. Emergency Fund

### Data Model

No new tables. Uses existing `Transaction` model with new categories:

| Action | Transaction type | Category |
|--------|-----------------|----------|
| Deposit to fund | `expense` | `"Fondo Emergencia"` |
| Withdraw from fund | `income` | `"Retiro Fondo Emergencia"` |

**Add to User model:**
- `emergencyFundGoal` — `Decimal?`, nullable, user-configurable goal amount

### Server Actions (`lib/actions/emergency-fund.ts`)

All use the same `toLempiras` conversion as wishlist: `t.currency === "$" && t.exchangeRate ? val * t.exchangeRate : val`.

- `getEmergencyFundBalance()` — sum transactions with category "Fondo Emergencia" (expense) minus "Retiro Fondo Emergencia" (income), with $→L conversion
- `setEmergencyFundGoal(goal: number)` — updates `User.emergencyFundGoal`
- `depositToEmergencyFund(amount: number, currency?: string, exchangeRate?: number)` — creates expense "Fondo Emergencia", checks available balance (same exclusion logic as wishlist). Supports $/L toggle like wishlist
- `withdrawFromEmergencyFund(amount: number)` — creates income "Retiro Fondo Emergencia", checks fund has enough

### Balance Exclusion

Update in `getAvailableBalance()` and `addFundsToWishlist()`:
- Exclude categories: `"Ahorro"`, `"Retiro Ahorro"`, `"Fondo Emergencia"`, `"Retiro Fondo Emergencia"`

### UI

**Dashboard (`app/page.tsx`)** — new card:
- Icon: escudo (Shield from reicon-react)
- Shows: "Fondo de Emergencia" + progress bar (saldo / meta)
- If no meta set: "Establecer meta" link
- Botones: Abonar, Retirar (open small modal like wishlist)
- Uses `convertToPreferred` for currency display

**Wishlist page (`app/wishlist/page.tsx`)** — pinned card at top:
- Same visual style as wishlist items but with shield icon
- Shows: name "Fondo de Emergencia", progress, goal amount
- No delete button
- Same abonar/retirar modal

### Components to Create

- `components/emergency-fund-card.tsx` — card for dashboard
- `components/emergency-fund-modal.tsx` — modal for deposit/withdraw

---

## 2. Edit Wishlist Items

### Server Action

- `updateWishlistItem(id, data)` — updates name, estimatedPrice, priority
- Schema: same as create + id validation

### UI

- ✏️ icon button on each wishlist item (in `wishlist-list.tsx`)
- Opens same modal as create form but with fields pre-filled
- On success: refresh list

### Components to Modify

- `components/wishlist-form.tsx` — add `editItem` prop (optional), pre-fill fields when provided
- `components/wishlist-list.tsx` — add edit button, wire up modal

---

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `emergencyFundGoal` to User |
| `lib/actions/emergency-fund.ts` | New file: all emergency fund actions |
| `lib/actions/wishlist.ts` | Update balance exclusions, add `updateWishlistItem` |
| `lib/auth.ts` | Optional: expose `emergencyFundGoal` in JWT/session |
| `components/emergency-fund-card.tsx` | New: dashboard card |
| `components/emergency-fund-modal.tsx` | New: deposit/withdraw modal |
| `components/wishlist-form.tsx` | Add edit mode |
| `components/wishlist-list.tsx` | Add edit button |
| `app/page.tsx` | Add emergency fund card |
| `app/wishlist/page.tsx` | Add pinned emergency fund card |

---

## Migration

```prisma
model User {
  emergencyFundGoal Decimal? @map("emergency_fund_goal")
}
```

One migration: `npx prisma migrate dev --name emergency_fund_goal`.
