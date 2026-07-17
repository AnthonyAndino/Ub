"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function getUserCurrency(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) return "L"
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true },
  })
  return user?.currency ?? "L"
}
