import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const users = [
  { name: "Uber", email: "uber@cuentas.com", password: "uber123" },
  { name: "Angeles", email: "angeles@cuentas.com", password: "angeles123" },
  { name: "Ethel", email: "ethel@cuentas.com", password: "ethel123" },
  { name: "Renan", email: "renan@cuentas.com", password: "renan123" },
]

async function main() {
  console.log("Seeding users...")

  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password: hashed },
      create: { name: user.name, email: user.email, password: hashed },
    })
    console.log(`  ✓ ${user.name} (${user.email})`)
  }

  console.log("\nDone!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
