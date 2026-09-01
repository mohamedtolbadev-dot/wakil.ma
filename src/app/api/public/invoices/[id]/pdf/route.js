import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateInvoicePDF } from "@/lib/pdfGenerator"
import { verifyInvoicePdfToken } from "@/lib/invoicePdfToken"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const tokenData = verifyInvoicePdfToken(searchParams.get("token"), id)
    if (!tokenData) return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    })
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    const pdfBuffer = await generateInvoicePDF(invoice, tokenData.locale === "ar" ? "ar" : "fr")
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return NextResponse.json({ error: "Empty PDF" }, { status: 500 })
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, max-age=900",
      },
    })
  } catch (error) {
    console.error("GET /api/public/invoices/[id]/pdf error:", error)
    return NextResponse.json({
      error: "Failed to generate invoice PDF",
      detail: process.env.NODE_ENV === "development" ? error?.message : undefined,
    }, { status: 500 })
  }
}
