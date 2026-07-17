import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DEMO_EMAIL = "demo@test.com"
const FAMILY_DOMAIN = "@cuentas.com"

async function deleteDemoUser() {
  const demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (!demo) {
    console.log("  · demo@test.com no existe — omitido")
    return
  }

  await prisma.transaction.deleteMany({ where: { userId: demo.id } })
  await prisma.wishlistItem.deleteMany({ where: { userId: demo.id } })
  await prisma.user.delete({ where: { id: demo.id } })
  console.log("  ✓ Usuario demo@test.com eliminado de producción")
}

async function rotateFamilyPasswords() {
  const json = process.env.FAMILY_PASSWORDS_JSON
  if (json) {
    let map
    try {
      map = JSON.parse(json)
    } catch {
      console.error("  ✗ FAMILY_PASSWORDS_JSON no es JSON válido")
      process.exit(1)
    }

    let updated = 0
    for (const [email, password] of Object.entries(map)) {
      if (!email.endsWith(FAMILY_DOMAIN)) {
        console.log(`  · ${email} omitido (no es @cuentas.com)`)
        continue
      }
      if (typeof password !== "string" || password.length < 10) {
        console.error(`  ✗ Contraseña inválida para ${email} (mín. 10 caracteres)`)
        process.exit(1)
      }

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        console.log(`  · ${email} no encontrado — omitido`)
        continue
      }

      const hashed = await bcrypt.hash(password, 12)
      await prisma.user.update({ where: { email }, data: { password: hashed } })
      console.log(`  ✓ Contraseña actualizada: ${email}`)
      updated++
    }

    if (updated === 0) console.log("  · Ningún usuario @cuentas.com actualizado")
    return
  }

  const newPassword = process.env.FAMILY_NEW_PASSWORD
  if (!newPassword) {
    console.log("  · Sin FAMILY_PASSWORDS_JSON ni FAMILY_NEW_PASSWORD — contraseñas sin cambiar")
    return
  }

  if (newPassword.length < 10) {
    console.error("  ✗ FAMILY_NEW_PASSWORD debe tener al menos 10 caracteres")
    process.exit(1)
  }

  const familyUsers = await prisma.user.findMany({
    where: { email: { endsWith: FAMILY_DOMAIN } },
    select: { id: true, email: true },
  })

  if (familyUsers.length === 0) {
    console.log("  · No hay usuarios @cuentas.com — omitido")
    return
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.updateMany({
    where: { email: { endsWith: FAMILY_DOMAIN } },
    data: { password: hashed },
  })

  console.log(`  ✓ Contraseña compartida actualizada para ${familyUsers.length} usuario(s) @cuentas.com`)
}

async function main() {
  if (process.env.NODE_ENV !== "production" && !process.env.FORCE_HARDEN) {
    console.log("Hardening omitido (solo producción). Usa FORCE_HARDEN=1 para forzar.")
    return
  }

  console.log("Aplicando hardening de producción...")
  await deleteDemoUser()
  await rotateFamilyPasswords()
  console.log("Hardening completado.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
