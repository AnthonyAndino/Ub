"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

const createSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").trim(),
  estimatedPrice: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("El precio debe ser positivo").optional(),
  ),
  priority: z.enum(["baja", "media", "alta"]).default("media"),
})

const idSchema = z.string().min(1, "El ID es requerido")

export async function createWishlistItem(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    estimatedPrice: formData.get("estimatedPrice"),
    priority: formData.get("priority") || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await prisma.wishlistItem.create({
    data: {
      name: parsed.data.name,
      estimatedPrice: parsed.data.estimatedPrice,
      priority: parsed.data.priority,
      userId: session.user.id,
    },
  })

  revalidatePath("/")
  revalidatePath("/wishlist")
  return { success: true }
}

export async function listWishlistItems() {
  const session = await auth()
  if (!session?.user?.id) return []

  const data = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return data.map((item) => ({
    ...item,
    estimatedPrice: item.estimatedPrice?.toNumber() ?? null,
  }))
}

export async function listUnpurchasedWishlistItems() {
  const session = await auth()
  if (!session?.user?.id) return []

  const data = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id, purchased: false },
    orderBy: { createdAt: "desc" },
  })

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    estimatedPrice: item.estimatedPrice?.toNumber() ?? null,
  }))
}

export async function togglePurchased(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const item = await prisma.wishlistItem.findUnique({ where: { id: parsed.data } })
  if (!item) return { error: "El elemento no existe" }
  if (item.userId !== session.user.id) return { error: "No autorizado" }

  await prisma.wishlistItem.update({
    where: { id: parsed.data },
    data: { purchased: !item.purchased },
  })

  revalidatePath("/")
  revalidatePath("/wishlist")
  return { success: true }
}

export async function deleteWishlistItem(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const item = await prisma.wishlistItem.findUnique({ where: { id: parsed.data } })
  if (!item) return { error: "El elemento no existe" }
  if (item.userId !== session.user.id) return { error: "No autorizado" }

  await prisma.wishlistItem.delete({ where: { id: parsed.data } })

  revalidatePath("/")
  revalidatePath("/wishlist")
  return { success: true }
}
