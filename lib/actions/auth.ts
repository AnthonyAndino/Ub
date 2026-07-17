"use server"

import { signIn, auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function authenticate(
  _prevState: { error?: string } | null,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    })

    return { success: true }
  } catch (error) {
    console.error("Error in authenticate Server Action:", error)
    return { error: "Credenciales inválidas" }
  }
}

export async function updateUserCurrency(currency: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  if (currency !== "$" && currency !== "L") {
    return { error: "Moneda no válida" }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { currency },
  })

  revalidatePath("/")
  revalidatePath("/transacciones")
  revalidatePath("/historial")
  revalidatePath("/graficos")
  revalidatePath("/wishlist")
  revalidatePath("/papelera")
  return { success: true }
}
