import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  const withinLimit = rateLimit(`export:${ip}`, 30, 60_000)
  if (!withinLimit.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  const month = req.nextUrl.searchParams.get("month")
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Formato inválido. Usa YYYY-MM" },
      { status: 400 },
    )
  }

  const [yearStr, monthStr] = month.split("-")
  const year = parseInt(yearStr, 10)
  const monthNum = parseInt(monthStr, 10)

  const start = new Date(year, monthNum - 1, 1)
  const end = new Date(year, monthNum, 1)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      date: { gte: start, lt: end },
    },
    orderBy: { date: "asc" },
  })

  const incomes = transactions.filter((t) => t.type === "income")
  const expenses = transactions.filter((t) => t.type === "expense")

  const totalIncome = incomes.reduce((s, t) => s + t.amount.toNumber(), 0)
  const totalExpense = expenses.reduce((s, t) => s + t.amount.toNumber(), 0)
  const balance = totalIncome - totalExpense

  const wb = new ExcelJS.Workbook()
  wb.creator = "Control de Gastos"
  wb.created = new Date()

  const monthName = new Date(year, monthNum - 1).toLocaleString("es-MX", {
    month: "long",
    year: "numeric",
  })

  // ─── COLOR / FONT CONSTANTS ───
  const darkBlueFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } }
  const darkRedFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } }
  const zebraFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" }
  const dataFont = { size: 10, name: "Calibri", color: { argb: "FF1E293B" } }
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  }

  // ─── HOJA DE RESUMEN ────────────────
  const ws = wb.addWorksheet("Resumen")
  ws.columns = [
    { width: 3 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 3 },
  ]

  // Título
  ws.mergeCells("B2:E2")
  const tCell = ws.getCell("B2")
  tCell.value = "Control de Gastos"
  tCell.font = { bold: true, size: 22, color: { argb: "FF2563EB" }, name: "Calibri" }
  ws.getRow(2).height = 44

  ws.mergeCells("B3:E3")
  const subCell = ws.getCell("B3")
  subCell.value = `Reporte Mensual — ${monthName}`
  subCell.font = { size: 12, color: { argb: "FF64748B" }, name: "Calibri" }

  ws.mergeCells("B4:E4")
  const genCell = ws.getCell("B4")
  genCell.value = `Generado: ${formatDate(new Date())}`
  genCell.font = { italic: true, size: 9, color: { argb: "FF94A3B8" }, name: "Calibri" }

  // ── Métricas: Ingreso, Gasto, Balance ──
  const metricCols = [
    { label: "Ingreso Total", value: totalIncome, fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF059669" } } },
    { label: "Gasto Total", value: totalExpense, fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFDC2626" } } },
    { label: "Balance", value: balance, fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: balance >= 0 ? "FF059669" : "FFDC2626" } } },
  ]

  const metricRow = 7
  ws.getRow(metricRow).height = 50

  metricCols.forEach((m, i) => {
    const c = i + 2
    ws.mergeCells(metricRow, c, metricRow, c)
    const cell = ws.getCell(metricRow, c)
    cell.fill = m.fill
    cell.font = { bold: true, size: 22, color: { argb: "FFFFFFFF" }, name: "Calibri" }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.value = `$${m.value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
    cell.border = {
      top: { style: "medium", color: { argb: "FFE2E8F0" } },
      bottom: { style: "medium", color: { argb: "FFE2E8F0" } },
      left: { style: "medium", color: { argb: "FFE2E8F0" } },
      right: { style: "medium", color: { argb: "FFE2E8F0" } },
    }
  })

  // Labels below metrics
  metricCols.forEach((m, i) => {
    const cell = ws.getCell(metricRow + 1, i + 2)
    cell.value = m.label
    cell.font = { bold: true, size: 9, color: { argb: "FF64748B" }, name: "Calibri" }
    cell.alignment = { horizontal: "center" }
  })

  // ── Resumen en tabla ──
  const sumRow = metricRow + 4
  ws.getCell(`A${sumRow}`).value = "Resumen General"
  ws.getCell(`A${sumRow}`).font = { bold: true, size: 13, color: { argb: "FF0F172A" }, name: "Calibri" }

  const labels = [
    ["Total Ingresos", totalIncome, "FF059669"],
    ["Total Gastos", totalExpense, "FFDC2626"],
    ["Balance Neto", balance, balance >= 0 ? "FF059669" : "FFDC2626"],
    ["Cantidad de Movimientos", transactions.length, "FF2563EB"],
  ]

  labels.forEach(([label, val, color], i) => {
    const r = sumRow + 1 + i
    const c1 = ws.getCell(`A${r}`)
    c1.value = label
    c1.font = { bold: true, size: 10, color: { argb: "FF475569" }, name: "Calibri" }
    const c2 = ws.getCell(`B${r}`)
    if (typeof val === "number" && label !== "Cantidad de Movimientos") {
      c2.value = val
      c2.numFmt = '"$"#,##0.00'
    } else {
      c2.value = val
    }
    c2.font = { bold: true, size: 11, color: { argb: color as string }, name: "Calibri" }
  })

  // ─── BUILD DETAIL SHEET (Ingresos / Gastos) ───
  function buildDetailSheet(
    sheet: ExcelJS.Worksheet,
    rows: typeof transactions,
    title: string,
    headerFill: ExcelJS.Fill,
    accentColor: string,
  ) {
    // Column widths (auto-fit)
    sheet.columns = [
      { width: 4 },
      { width: 16 },
      { width: 26 },
      { width: 42 },
      { width: 18 },
    ]

    // Title row
    sheet.mergeCells("B1:D1")
    const titleCell = sheet.getCell("B1")
    titleCell.value = title
    titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" }, name: "Calibri" }
    sheet.getRow(1).height = 36

    // Header row
    const hRow = sheet.getRow(3)
    hRow.height = 30
    const headers = ["Fecha", "Categoría", "Descripción", "Monto"]
    headers.forEach((h, i) => {
      const cell = hRow.getCell(i + 2)
      cell.value = h
      cell.font = headerFont
      cell.fill = headerFill
      cell.alignment = { horizontal: "center", vertical: "middle" }
      cell.border = thinBorder
    })

    // Freeze header + autofilter
    sheet.views = [{ state: "frozen", ySplit: 3 }]
    sheet.autoFilter = {
      from: { row: 3, column: 2 },
      to: { row: 3, column: 5 },
    }

    // Data rows
    let rowIdx = 4
    rows.forEach((t, i) => {
      const row = sheet.getRow(rowIdx)

      row.getCell(2).value = formatDate(t.date)
      row.getCell(2).font = dataFont
      row.getCell(2).alignment = { horizontal: "center" }

      row.getCell(3).value = t.category
      row.getCell(3).font = dataFont

      row.getCell(4).value = t.description ?? ""
      row.getCell(4).font = dataFont

      row.getCell(5).value = t.amount.toNumber()
      row.getCell(5).numFmt = '"$"#,##0.00'
      row.getCell(5).font = { bold: true, size: 10, color: { argb: accentColor }, name: "Calibri" }
      row.getCell(5).alignment = { horizontal: "right" }

      // Zebra striping
      if (i % 2 === 1) {
        for (let c = 2; c <= 5; c++) {
          row.getCell(c).fill = zebraFill
        }
      }

      // Borders
      for (let c = 2; c <= 5; c++) {
        row.getCell(c).border = thinBorder
      }

      rowIdx++
    })

    // Total row
    const totalVal = rows.reduce((s, t) => s + t.amount.toNumber(), 0)
    const totalRow = sheet.getRow(rowIdx + 1)
    totalRow.getCell(3).value = "TOTAL"
    totalRow.getCell(3).font = { bold: true, size: 12, color: { argb: "FF0F172A" }, name: "Calibri" }
    totalRow.getCell(3).alignment = { horizontal: "right" }
    totalRow.getCell(5).value = totalVal
    totalRow.getCell(5).numFmt = '"$"#,##0.00'
    totalRow.getCell(5).font = { bold: true, size: 13, color: { argb: accentColor }, name: "Calibri" }

    // Double top border on total row
    for (let c = 2; c <= 5; c++) {
      totalRow.getCell(c).border = {
        ...thinBorder,
        top: { style: "double", color: { argb: "FF475569" } },
      }
    }

    // Summary below total
    const count = rows.length
    const avg = count > 0 ? totalVal / count : 0
    const sRow = rowIdx + 4

    sheet.getCell(`B${sRow}`).value = "Resumen"
    sheet.getCell(`B${sRow}`).font = { bold: true, size: 11, color: { argb: "FF0F172A" }, name: "Calibri" }
    sheet.getCell(`C${sRow}`).value = `${count} transacciones`
    sheet.getCell(`C${sRow}`).font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF475569" } }

    sheet.getCell(`B${sRow + 1}`).value = "Promedio por transacción:"
    sheet.getCell(`B${sRow + 1}`).font = { size: 10, name: "Calibri", color: { argb: "FF64748B" } }
    sheet.getCell(`C${sRow + 1}`).value = avg
    sheet.getCell(`C${sRow + 1}`).numFmt = '"$"#,##0.00'
    sheet.getCell(`C${sRow + 1}`).font = { bold: true, size: 10, name: "Calibri", color: { argb: accentColor } }
  }

  const wsIncomes = wb.addWorksheet("Ingresos")
  buildDetailSheet(wsIncomes, incomes, `Ingresos — ${monthName}`, darkBlueFill, "FF1D4ED8")

  const wsExpenses = wb.addWorksheet("Gastos")
  buildDetailSheet(wsExpenses, expenses, `Gastos — ${monthName}`, darkRedFill, "FFDC2626")

  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Control-Gastos-${month}.xlsx"`,
    },
  })
}
