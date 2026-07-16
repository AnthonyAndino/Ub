"use server"

import { signIn } from "@/lib/auth"

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
  } catch {
    return { error: "Credenciales inválidas" }
  }
}
