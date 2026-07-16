import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import sharp from "sharp"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"

// ─── HELPERS ─────────────────────────────────

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── CHART COLORS ────────────────────────────

const CHART_COLORS = [
  "#2563EB", "#059669", "#DC2626", "#F59E0B", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
]

// ─── SVG CHART GENERATORS ────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  }
}

function generateDonutSVG(
  segments: { label: string; value: number; color: string }[],
  title: string,
): string {
  const width = 640
  const height = Math.max(400, segments.length * 40 + 80)
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#94A3B8">Sin datos</text></svg>`
  }

  const cx = 175
  const cy = height / 2
  const outerR = 130
  const innerR = 75

  let currentAngle = 0
  const paths: string[] = []

  segments.forEach((seg) => {
    const sliceAngle = (seg.value / total) * Math.PI * 2
    if (sliceAngle < 0.001) { currentAngle += sliceAngle; return }

    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle
    const outerStart = polarToCartesian(cx, cy, outerR, startAngle)
    const outerEnd = polarToCartesian(cx, cy, outerR, endAngle)
    const innerStart = polarToCartesian(cx, cy, innerR, endAngle)
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle)
    const largeArc = sliceAngle > Math.PI ? 1 : 0

    const path = [
      `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
      `L ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
      `Z`,
    ].join(" ")

    paths.push(`<path d="${path}" fill="${seg.color}" />`)
    currentAngle = endAngle
  })

  // Legend items
  const legendX = 345
  const legendStartY = 55
  const legendItems = segments.map((seg, i) => {
    const y = legendStartY + i * 36
    const pct = ((seg.value / total) * 100).toFixed(1)
    return `
      <rect x="${legendX}" y="${y}" width="12" height="12" rx="3" fill="${seg.color}" />
      <text x="${legendX + 20}" y="${y + 11}" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="#334155">${seg.label}</text>
      <text x="${legendX + 20}" y="${y + 26}" font-family="Arial,sans-serif" font-size="10" fill="#94A3B8">${fmtMoney(seg.value)} (${pct}%)</text>
    `
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="white" rx="12" />
    <text x="24" y="34" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="#0F172A">${title}</text>
    ${paths.join("\n")}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#64748B">Total</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="#1E293B">${fmtMoney(total)}</text>
    ${legendItems.join("\n")}
  </svg>`
}

function generateBarChartSVG(
  data: { label: string; value: number; color: string }[],
  title: string,
): string {
  const width = 480
  const height = 340
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const chartLeft = 90
  const chartRight = width - 40
  const chartTop = 65
  const chartBottom = height - 55
  const chartHeight = chartBottom - chartTop
  const barWidth = Math.min(90, ((chartRight - chartLeft) / data.length) * 0.55)
  const totalBarsWidth = barWidth * data.length
  const gap = ((chartRight - chartLeft) - totalBarsWidth) / (data.length + 1)

  // Grid lines
  const gridLines: string[] = []
  for (let i = 0; i <= 4; i++) {
    const y = chartBottom - (i / 4) * chartHeight
    const val = (maxValue * i) / 4
    gridLines.push(`<line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="#E2E8F0" stroke-width="1" />`)
    gridLines.push(`<text x="${chartLeft - 10}" y="${y + 4}" text-anchor="end" font-family="Arial,sans-serif" font-size="10" fill="#94A3B8">${fmtMoney(val)}</text>`)
  }

  // Bars
  const bars = data.map((d, i) => {
    const barH = Math.max(2, (d.value / maxValue) * chartHeight)
    const x = chartLeft + gap + i * (barWidth + gap)
    const y = chartBottom - barH
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${d.color}" rx="6" />
      <text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="${d.color}">${fmtMoney(d.value)}</text>
      <text x="${x + barWidth / 2}" y="${chartBottom + 22}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#475569">${d.label}</text>
    `
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="white" rx="12" />
    <text x="24" y="34" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="#0F172A">${title}</text>
    ${gridLines.join("\n")}
    <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#CBD5E1" stroke-width="1" />
    ${bars.join("\n")}
  </svg>`
}

function generateHBarChartSVG(
  data: { label: string; value: number; color: string }[],
  title: string,
): string {
  const barH = 26
  const barGap = 14
  const width = 600
  const height = data.length * (barH + barGap) + 80
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const chartLeft = 130
  const chartRight = width - 90
  const chartWidth = chartRight - chartLeft

  const bars = data.map((d, i) => {
    const y = 60 + i * (barH + barGap)
    const bw = Math.max(2, (d.value / maxValue) * chartWidth)
    return `
      <text x="${chartLeft - 10}" y="${y + barH / 2 + 4}" text-anchor="end" font-family="Arial,sans-serif" font-size="11" fill="#475569">${d.label}</text>
      <rect x="${chartLeft}" y="${y}" width="${bw}" height="${barH}" fill="${d.color}" rx="4" opacity="0.85" />
      <text x="${chartLeft + bw + 8}" y="${y + barH / 2 + 4}" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="${d.color}">${fmtMoney(d.value)}</text>
    `
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="white" rx="12" />
    <text x="24" y="34" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="#0F172A">${title}</text>
    ${bars.join("\n")}
  </svg>`
}

async function svgToPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer() as unknown as Promise<Buffer>
}

// ─── STYLE CONSTANTS ─────────────────────────

const BLUE_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } }
const RED_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } }
const ZEBRA_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" }
const DATA_FONT: Partial<ExcelJS.Font> = { size: 10, name: "Calibri", color: { argb: "FF334155" } }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
}

// ─── AGGREGATE BY CATEGORY ───────────────────

function aggregateByCategory(
  txs: { category: string; amount: { toNumber(): number } }[],
): { label: string; value: number; color: string }[] {
  const map = new Map<string, number>()
  txs.forEach((t) => {
    map.set(t.category, (map.get(t.category) || 0) + t.amount.toNumber())
  })
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value: Math.round(value * 100) / 100,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
}

// ─── BUILD DETAIL SHEET ──────────────────────

function buildDetailSheet(
  sheet: ExcelJS.Worksheet,
  rows: { date: Date; category: string; description: string | null; amount: { toNumber(): number }; type: string }[],
  title: string,
  headerFill: ExcelJS.Fill,
  accentColor: string,
) {
  sheet.columns = [
    { width: 4 },
    { width: 5 },
    { width: 16 },
    { width: 28 },
    { width: 42 },
    { width: 18 },
  ]

  // Title
  sheet.mergeCells("B1:E1")
  const titleCell = sheet.getCell("B1")
  titleCell.value = title
  titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" }, name: "Calibri" }
  sheet.getRow(1).height = 36

  // Count & total subtitle
  const total = rows.reduce((s, t) => s + t.amount.toNumber(), 0)
  sheet.mergeCells("B2:E2")
  const subCell = sheet.getCell("B2")
  subCell.value = `${rows.length} transacciones  •  Total: ${fmtMoney(total)}`
  subCell.font = { size: 11, color: { argb: "FF64748B" }, name: "Calibri" }

  // Header row
  const hRow = sheet.getRow(4)
  hRow.height = 30
  const headers = ["#", "Fecha", "Categoría", "Descripción", "Monto"]
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 2)
    cell.value = h
    cell.font = HEADER_FONT
    cell.fill = headerFill
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = THIN_BORDER
  })

  // Freeze header + autofilter
  sheet.views = [{ state: "frozen", ySplit: 4 }]
  sheet.autoFilter = { from: { row: 4, column: 2 }, to: { row: 4, column: 6 } }

  // Data rows
  let rowIdx = 5
  rows.forEach((t, i) => {
    const row = sheet.getRow(rowIdx)

    // Row number
    row.getCell(2).value = i + 1
    row.getCell(2).font = { size: 9, color: { argb: "FF94A3B8" }, name: "Calibri" }
    row.getCell(2).alignment = { horizontal: "center" }

    // Date
    row.getCell(3).value = formatDate(t.date)
    row.getCell(3).font = DATA_FONT
    row.getCell(3).alignment = { horizontal: "center" }

    // Category
    row.getCell(4).value = t.category
    row.getCell(4).font = { ...DATA_FONT, bold: true }

    // Description
    row.getCell(5).value = t.description ?? "—"
    row.getCell(5).font = DATA_FONT

    // Amount
    row.getCell(6).value = t.amount.toNumber()
    row.getCell(6).numFmt = '"$"#,##0.00'
    row.getCell(6).font = { bold: true, size: 11, color: { argb: accentColor }, name: "Calibri" }
    row.getCell(6).alignment = { horizontal: "right" }

    // Zebra striping
    if (i % 2 === 1) {
      for (let c = 2; c <= 6; c++) row.getCell(c).fill = ZEBRA_FILL
    }
    // Borders
    for (let c = 2; c <= 6; c++) row.getCell(c).border = THIN_BORDER

    rowIdx++
  })

  // Total row
  const totalRow = sheet.getRow(rowIdx + 1)
  totalRow.getCell(4).value = "TOTAL"
  totalRow.getCell(4).font = { bold: true, size: 12, color: { argb: "FF0F172A" }, name: "Calibri" }
  totalRow.getCell(4).alignment = { horizontal: "right" }
  totalRow.getCell(6).value = total
  totalRow.getCell(6).numFmt = '"$"#,##0.00'
  totalRow.getCell(6).font = { bold: true, size: 13, color: { argb: accentColor }, name: "Calibri" }
  for (let c = 2; c <= 6; c++) {
    totalRow.getCell(c).border = {
      ...THIN_BORDER,
      top: { style: "double", color: { argb: "FF475569" } },
    }
  }

  // Summary stats
  const count = rows.length
  const avg = count > 0 ? total / count : 0
  const sRow = rowIdx + 4
  sheet.getCell(`C${sRow}`).value = "Resumen"
  sheet.getCell(`C${sRow}`).font = { bold: true, size: 12, color: { argb: "FF0F172A" }, name: "Calibri" }

  sheet.getCell(`C${sRow + 1}`).value = "Transacciones:"
  sheet.getCell(`C${sRow + 1}`).font = { size: 10, name: "Calibri", color: { argb: "FF64748B" } }
  sheet.getCell(`D${sRow + 1}`).value = count
  sheet.getCell(`D${sRow + 1}`).font = { bold: true, size: 11, name: "Calibri", color: { argb: "FF1E293B" } }

  sheet.getCell(`C${sRow + 2}`).value = "Promedio:"
  sheet.getCell(`C${sRow + 2}`).font = { size: 10, name: "Calibri", color: { argb: "FF64748B" } }
  sheet.getCell(`D${sRow + 2}`).value = avg
  sheet.getCell(`D${sRow + 2}`).numFmt = '"$"#,##0.00'
  sheet.getCell(`D${sRow + 2}`).font = { bold: true, size: 11, name: "Calibri", color: { argb: accentColor } }
}

// ─── MAIN EXPORT HANDLER ─────────────────────

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
    return NextResponse.json({ error: "Formato inválido. Usa YYYY-MM" }, { status: 400 })
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

  const expenseCategories = aggregateByCategory(expenses)
  const incomeCategories = aggregateByCategory(incomes)

  const monthName = new Date(year, monthNum - 1).toLocaleString("es-MX", {
    month: "long",
    year: "numeric",
  })

  // ─── GENERATE CHART IMAGES ──────────────────
  const [donutPng, barPng, hBarPng] = await Promise.all([
    svgToPng(generateDonutSVG(expenseCategories, "Gastos por Categoría")),
    svgToPng(
      generateBarChartSVG(
        [
          { label: "Ingresos", value: totalIncome, color: "#059669" },
          { label: "Gastos", value: totalExpense, color: "#DC2626" },
          { label: "Balance", value: Math.abs(balance), color: balance >= 0 ? "#2563EB" : "#F59E0B" },
        ],
        "Ingresos vs Gastos",
      ),
    ),
    incomeCategories.length > 0
      ? svgToPng(generateHBarChartSVG(incomeCategories, "Ingresos por Categoría"))
      : null,
  ])

  // ─── CREATE WORKBOOK ────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = "Control de Gastos"
  wb.created = new Date()

  // ━━━ HOJA 1: RESUMEN ━━━━━━━━━━━━━━━━━━━━━━
  const ws = wb.addWorksheet("Resumen", {
    properties: { tabColor: { argb: "FF2563EB" } },
  })
  ws.columns = [
    { width: 3 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 3 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ]

  // Title
  ws.mergeCells("B2:E2")
  const tCell = ws.getCell("B2")
  tCell.value = "Control de Gastos"
  tCell.font = { bold: true, size: 24, color: { argb: "FF2563EB" }, name: "Calibri" }
  ws.getRow(2).height = 44

  ws.mergeCells("B3:E3")
  ws.getCell("B3").value = `Reporte Mensual — ${monthName}`
  ws.getCell("B3").font = { size: 13, color: { argb: "FF64748B" }, name: "Calibri" }

  ws.mergeCells("B4:E4")
  ws.getCell("B4").value = `Generado: ${formatDate(new Date())}  •  ${transactions.length} movimientos`
  ws.getCell("B4").font = { italic: true, size: 10, color: { argb: "FF94A3B8" }, name: "Calibri" }

  // ── Metric Cards ──
  const metrics = [
    { label: "Ingresos", value: totalIncome, argb: "FF059669" },
    { label: "Gastos", value: totalExpense, argb: "FFDC2626" },
    { label: "Balance", value: balance, argb: balance >= 0 ? "FF059669" : "FFDC2626" },
  ]

  ws.getRow(7).height = 22
  ws.getRow(8).height = 48
  ws.getRow(9).height = 22

  metrics.forEach((m, i) => {
    const col = 2 + i
    // Label above
    const labelCell = ws.getCell(7, col)
    labelCell.value = m.label
    labelCell.font = { bold: true, size: 10, color: { argb: "FF64748B" }, name: "Calibri" }
    labelCell.alignment = { horizontal: "center" }

    // Value
    const valueCell = ws.getCell(8, col)
    valueCell.value = m.value
    valueCell.numFmt = '"$"#,##0.00'
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: m.argb } }
    valueCell.font = { bold: true, size: 20, color: { argb: "FFFFFFFF" }, name: "Calibri" }
    valueCell.alignment = { horizontal: "center", vertical: "middle" }
    valueCell.border = {
      top: { style: "medium", color: { argb: "FFE2E8F0" } },
      bottom: { style: "medium", color: { argb: "FFE2E8F0" } },
      left: { style: "medium", color: { argb: "FFE2E8F0" } },
      right: { style: "medium", color: { argb: "FFE2E8F0" } },
    }

    // Count below
    const countCell = ws.getCell(9, col)
    const count = i === 0 ? incomes.length : i === 1 ? expenses.length : transactions.length
    countCell.value = `${count} transacciones`
    countCell.font = { size: 9, color: { argb: "FF94A3B8" }, name: "Calibri" }
    countCell.alignment = { horizontal: "center" }
  })

  // ── Embed Charts ──
  const donutImgId = wb.addImage({ buffer: donutPng as any, extension: "png" })
  ws.addImage(donutImgId, {
    tl: { col: 1, row: 11 },
    ext: { width: 580, height: Math.max(360, expenseCategories.length * 36 + 80) },
  })

  const barImgId = wb.addImage({ buffer: barPng as any, extension: "png" })
  ws.addImage(barImgId, {
    tl: { col: 1, row: 11 + Math.ceil(Math.max(360, expenseCategories.length * 36 + 80) / 20) + 2 },
    ext: { width: 440, height: 310 },
  })

  if (hBarPng) {
    const hBarImgId = wb.addImage({ buffer: hBarPng as any, extension: "png" })
    ws.addImage(hBarImgId, {
      tl: { col: 1, row: 11 + Math.ceil(Math.max(360, expenseCategories.length * 36 + 80) / 20) + 2 + Math.ceil(310 / 20) + 2 },
      ext: { width: 560, height: incomeCategories.length * 40 + 80 },
    })
  }

  // ── Category Breakdown Table on right side ──
  const catStartRow = 7
  const catStartCol = 6

  ws.getCell(catStartRow, catStartCol).value = "Desglose por Categoría (Gastos)"
  ws.getCell(catStartRow, catStartCol).font = { bold: true, size: 13, color: { argb: "FF0F172A" }, name: "Calibri" }

  // Category table header
  const catHRow = catStartRow + 1
  const catHeaders = ["Categoría", "Monto", "% del Total", "Transacciones"]
  catHeaders.forEach((h, i) => {
    const cell = ws.getCell(catHRow, catStartCol + i)
    cell.value = h
    cell.font = HEADER_FONT
    cell.fill = RED_FILL
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = THIN_BORDER
  })
  ws.getRow(catHRow).height = 28

  // Category data rows
  expenseCategories.forEach((cat, i) => {
    const r = catHRow + 1 + i
    const row = ws.getRow(r)
    const txCount = expenses.filter((t) => t.category === cat.label).length
    const pct = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0

    row.getCell(catStartCol).value = cat.label
    row.getCell(catStartCol).font = { ...DATA_FONT, bold: true }

    row.getCell(catStartCol + 1).value = cat.value
    row.getCell(catStartCol + 1).numFmt = '"$"#,##0.00'
    row.getCell(catStartCol + 1).font = { bold: true, size: 11, color: { argb: "FFDC2626" }, name: "Calibri" }
    row.getCell(catStartCol + 1).alignment = { horizontal: "right" }

    row.getCell(catStartCol + 2).value = pct / 100
    row.getCell(catStartCol + 2).numFmt = "0.0%"
    row.getCell(catStartCol + 2).font = DATA_FONT
    row.getCell(catStartCol + 2).alignment = { horizontal: "center" }

    row.getCell(catStartCol + 3).value = txCount
    row.getCell(catStartCol + 3).font = DATA_FONT
    row.getCell(catStartCol + 3).alignment = { horizontal: "center" }

    // Zebra + borders
    for (let c = catStartCol; c < catStartCol + 4; c++) {
      if (i % 2 === 1) row.getCell(c).fill = ZEBRA_FILL
      row.getCell(c).border = THIN_BORDER
    }
  })

  // Income categories below
  const incCatStartRow = catHRow + expenseCategories.length + 3
  ws.getCell(incCatStartRow, catStartCol).value = "Desglose por Categoría (Ingresos)"
  ws.getCell(incCatStartRow, catStartCol).font = { bold: true, size: 13, color: { argb: "FF0F172A" }, name: "Calibri" }

  const incHRow = incCatStartRow + 1
  catHeaders.forEach((h, i) => {
    const cell = ws.getCell(incHRow, catStartCol + i)
    cell.value = h
    cell.font = HEADER_FONT
    cell.fill = BLUE_FILL
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = THIN_BORDER
  })
  ws.getRow(incHRow).height = 28

  incomeCategories.forEach((cat, i) => {
    const r = incHRow + 1 + i
    const row = ws.getRow(r)
    const txCount = incomes.filter((t) => t.category === cat.label).length
    const pct = totalIncome > 0 ? (cat.value / totalIncome) * 100 : 0

    row.getCell(catStartCol).value = cat.label
    row.getCell(catStartCol).font = { ...DATA_FONT, bold: true }

    row.getCell(catStartCol + 1).value = cat.value
    row.getCell(catStartCol + 1).numFmt = '"$"#,##0.00'
    row.getCell(catStartCol + 1).font = { bold: true, size: 11, color: { argb: "FF1D4ED8" }, name: "Calibri" }
    row.getCell(catStartCol + 1).alignment = { horizontal: "right" }

    row.getCell(catStartCol + 2).value = pct / 100
    row.getCell(catStartCol + 2).numFmt = "0.0%"
    row.getCell(catStartCol + 2).font = DATA_FONT
    row.getCell(catStartCol + 2).alignment = { horizontal: "center" }

    row.getCell(catStartCol + 3).value = txCount
    row.getCell(catStartCol + 3).font = DATA_FONT
    row.getCell(catStartCol + 3).alignment = { horizontal: "center" }

    for (let c = catStartCol; c < catStartCol + 4; c++) {
      if (i % 2 === 1) row.getCell(c).fill = ZEBRA_FILL
      row.getCell(c).border = THIN_BORDER
    }
  })

  // ━━━ HOJA 2: INGRESOS ━━━━━━━━━━━━━━━━━━━━━
  const wsIncomes = wb.addWorksheet("Ingresos", {
    properties: { tabColor: { argb: "FF1E40AF" } },
  })
  buildDetailSheet(wsIncomes, incomes, `Ingresos — ${monthName}`, BLUE_FILL, "FF1D4ED8")

  // ━━━ HOJA 3: GASTOS ━━━━━━━━━━━━━━━━━━━━━━━
  const wsExpenses = wb.addWorksheet("Gastos", {
    properties: { tabColor: { argb: "FFB91C1C" } },
  })
  buildDetailSheet(wsExpenses, expenses, `Gastos — ${monthName}`, RED_FILL, "FFDC2626")

  // ─── WRITE & RESPOND ───────────────────────
  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Control-Gastos-${month}.xlsx"`,
    },
  })
}
