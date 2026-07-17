export async function getDefaultRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    if (data.rates?.HNL) {
      return data.rates.HNL as number
    }
  } catch {
    // API fallo, usar valor por defecto
  }
  return 25
}
