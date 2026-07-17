"use server"

import { getDefaultRate } from "@/lib/currency"

export async function fetchDefaultRate(): Promise<number> {
  return getDefaultRate()
}
