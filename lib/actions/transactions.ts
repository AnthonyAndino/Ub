"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("El monto debe ser positivo"),
  category: z.string().min(1, "La categoría es requerida").trim(),
  description: z.string().optional(),
  date: z.string().min(1, "La fecha es requerida"),
  wishlistItemId: z.string().optional(),
})

export async function createTransaction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const parsed = createSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount") ? Number(formData.get("amount")) : undefined,
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
    wishlistItemId: formData.get("wishlistItemId") || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await prisma.transaction.create({
    data: {
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      userId: session.user.id,
      wishlistItemId: parsed.data.wishlistItemId ?? null,
    },
  })

  revalidatePath("/")
  revalidatePath("/transacciones")
  revalidatePath("/historial")
  return { success: true }
}

export async function listTransactions() {
  const session = await auth()
  if (!session?.user?.id) return []

  const data = await prisma.transaction.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { date: "desc" },
    take: 5,
  })

  return data.map((t) => ({
    ...t,
    amount: t.amount.toNumber(),
  }))
}

export async function listAllTransactions(filters: {
  type?: "income" | "expense" | "all"
  month?: string
  search?: string
}) {
  const session = await auth()
  if (!session?.user?.id) return []

  const where: Record<string, unknown> = { userId: session.user.id, deletedAt: null }

  if (filters.type && filters.type !== "all") {
    where.type = filters.type
  }

  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number)
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
  }

  if (filters.search) {
    where.OR = [
      { category: { contains: filters.search } },
      { description: { contains: filters.search } },
    ]
  }

  const data = await prisma.transaction.findMany({
    where: where as any,
    orderBy: { date: "desc" },
    include: { wishlistItem: { select: { id: true, name: true } } },
  })

  return data.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount.toNumber(),
    category: t.category,
    description: t.description,
    date: t.date.toISOString(),
    wishlistItem: t.wishlistItem,
    createdAt: t.createdAt.toISOString(),
  }))
}

export async function deleteTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const item = await prisma.transaction.findUnique({ where: { id } })
  if (!item) return { error: "La transacción no existe" }
  if (item.userId !== session.user.id) return { error: "No autorizado" }

  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  revalidatePath("/")
  revalidatePath("/transacciones")
  revalidatePath("/historial")
  revalidatePath("/papelera")
  return { success: true }
}

export async function recoverTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const item = await prisma.transaction.findUnique({ where: { id } })
  if (!item) return { error: "La transacción no existe" }
  if (item.userId !== session.user.id) return { error: "No autorizado" }

  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: null },
  })

  revalidatePath("/papelera")
  revalidatePath("/")
  revalidatePath("/historial")
  return { success: true }
}

export async function permanentDeleteTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const item = await prisma.transaction.findUnique({ where: { id } })
  if (!item) return { error: "La transacción no existe" }
  if (item.userId !== session.user.id) return { error: "No autorizado" }

  await prisma.transaction.delete({ where: { id } })

  revalidatePath("/papelera")
  return { success: true }
}

export async function listTrashedTransactions() {
  const session = await auth()
  if (!session?.user?.id) return []

  const data = await prisma.transaction.findMany({
    where: { userId: session.user.id, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: { wishlistItem: { select: { id: true, name: true } } },
  })

  return data.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount.toNumber(),
    category: t.category,
    description: t.description,
    date: t.date.toISOString(),
    wishlistItem: t.wishlistItem,
    deletedAt: t.deletedAt!.toISOString(),
    createdAt: t.createdAt.toISOString(),
  }))
}
