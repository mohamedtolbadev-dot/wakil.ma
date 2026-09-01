import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { generateInvoicePDF } from "@/lib/pdfGenerator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request, { params }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const locale = searchParams.get("locale")?.startsWith("ar") ? "ar" : "fr"

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        clientId: user.id,
      },
      include: { client: true },
    })
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    const pdfBuffer = await generateInvoicePDF(invoice, locale)
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return NextResponse.json({ error: "Empty PDF" }, { status: 500 })
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    console.error("GET /api/invoices/[id]/pdf error:", error)
    return NextResponse.json({
      error: "Failed to generate invoice PDF",
      detail: process.env.NODE_ENV === "development" ? error?.message : undefined,
    }, { status: 500 })
  }
}
