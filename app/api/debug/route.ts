export const dynamic = "force-dynamic"

export async function GET() {
  const vars: Record<string, string> = {}
  for (const v of ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_PASSWORD", "POSTGRES_HOST", "POSTGRES_USER", "POSTGRES_DATABASE"]) {
    const val = process.env[v]
    vars[v] = val ? `SET` : "NOT SET"
  }
  vars["DATABASE_URL_val"] = (process.env.DATABASE_URL || "NOT SET").slice(0, 60)
  vars["POSTGRES_PASSWORD_val"] = process.env.POSTGRES_PASSWORD ? "SET (length=" + process.env.POSTGRES_PASSWORD.length + ")" : "NOT SET"
  vars["POSTGRES_URL_val"] = (process.env.POSTGRES_URL || "NOT SET").slice(0, 60)
  return Response.json(vars)
}
