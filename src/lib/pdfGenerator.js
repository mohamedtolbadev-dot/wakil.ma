import PDFDocument from "pdfkit"
import { getInvoicePlanLabel } from "@/lib/invoiceHelpers"

const BRAND_COLOR = "#534AB7"
const BRAND_TINT = "#EFEDFF"
const BORDER_COLOR = "#E6E3F7"
const TEXT_COLOR = "#111827"
const MUTED_COLOR = "#374151"

function drawWakilLogo(doc, x, y) {
  doc.save()
  doc.roundedRect(x, y, 42, 42, 10).fill(BRAND_COLOR)
  doc.roundedRect(x + 7, y + 7, 26, 20, 6).fill("#FFFFFF")
  doc.polygon([x + 10, y + 27], [x + 5, y + 35], [x + 17, y + 27]).fill("#FFFFFF")
  doc.circle(x + 13, y + 17, 2.4).fill(BRAND_COLOR)
  doc.circle(x + 21, y + 17, 2.4).fill(BRAND_COLOR)
  doc.circle(x + 29, y + 17, 2.4).fill(BRAND_COLOR)
  doc.restore()
}

export function generateInvoicePDF(invoice, locale = "fr") {
  return new Promise((resolve, reject) => {
    try {
      const isFr = locale === "fr"

      // ── Labels ──
      const L = isFr ? {
        title:       "FACTURE",
        invoiceNum:  "Facture N°:",
        clientInfo:  "Informations client",
        name:        "Nom",
        store:       "Boutique",
        email:       "Email",
        phone:       "Téléphone",
        details:     "Détails de la facture",
        colDesc:     "Description",
        colAmount:   "Montant",
        plan:        "Plan",
        currency:    "DH",
        issueDate:   "Date d'émission:",
        dueDate:     "Date d'échéance:",
        bankInfo:    "Informations de paiement",
        notes:       "Notes",
        total:       "TOTAL:",
        footer1:     "Merci de votre confiance!",
        footer2:     "Wakil.ma - Agent WhatsApp IA",
        dateLocale:  "fr-MA",
      } : {
        title:       "FACTURE",
        invoiceNum:  "Facture N:",
        clientInfo:  "Client Info",
        name:        "Name",
        store:       "Store",
        email:       "Email",
        phone:       "Phone",
        details:     "Invoice Details",
        colDesc:     "Description",
        colAmount:   "Amount",
        plan:        "Plan",
        currency:    "DH",
        issueDate:   "Issue Date:",
        dueDate:     "Due Date:",
        bankInfo:    "Payment Info",
        notes:       "Notes",
        total:       "TOTAL:",
        footer1:     "Thank you for your trust!",
        footer2:     "Wakil.ma - AI WhatsApp Agent",
        dateLocale:  "en-MA",
      }

      const planLabel = getInvoicePlanLabel(invoice.plan, isFr ? "fr" : "en")
      const dueDateStr = new Date(invoice.dueDate).toLocaleDateString(L.dateLocale, {
        day: "numeric", month: "long", year: "numeric"
      })
      const createdDateStr = new Date(invoice.createdAt).toLocaleDateString(L.dateLocale, {
        day: "numeric", month: "long", year: "numeric"
      })

      const doc = new PDFDocument({ size: "A4", margin: 50 })
      const chunks = []
      doc.on("data", chunk => chunks.push(chunk))
      doc.on("end",  () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // ── Header ──
      drawWakilLogo(doc, 50, 42)
      doc.fontSize(24).fillColor(BRAND_COLOR).text("Wakil.ma", 100, 48, { width: 190 })
      doc.fontSize(8).fillColor("#8A84C9").text("AI WHATSAPP AGENT", 102, 76, { width: 190, characterSpacing: 1.2 })
      doc.fontSize(28).fillColor(BRAND_COLOR).text(L.title, 330, 52, { width: 215, align: "right" })
      doc.fontSize(12).fillColor("#555").text(`${L.invoiceNum} ${invoice.invoiceNumber}`, 330, 84, { width: 215, align: "right" })
      doc.y = 110
      doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke()
      doc.moveDown(1)

      // ── Client Info ──
      doc.fontSize(13).fillColor(TEXT_COLOR).text(L.clientInfo)
      doc.moveDown(0.4)
      doc.fontSize(11).fillColor(MUTED_COLOR)
      doc.text(`${L.name}: ${invoice.client.name}`)
      doc.text(`${L.store}: ${invoice.client.storeName || "-"}`)
      if (invoice.client.email) doc.text(`${L.email}: ${invoice.client.email}`)
      if (invoice.client.phone) doc.text(`${L.phone}: ${invoice.client.phone}`)
      doc.moveDown(1)
      doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke()
      doc.moveDown(1)

      // ── Table ──
      doc.fontSize(13).fillColor(TEXT_COLOR).text(L.details)
      doc.moveDown(0.5)

      const tableY = doc.y
      // header row
      doc.fillColor(BRAND_TINT).rect(50, tableY, 500, 28).fill()
      doc.fillColor(BRAND_COLOR).fontSize(10)
      doc.text(L.colDesc,   60, tableY + 8, { width: 300 })
      doc.text(L.colAmount, 380, tableY + 8, { width: 150, align: "right" })
      // data row
      doc.fillColor("#f9fafb").rect(50, tableY + 28, 500, 28).fill()
      doc.fillColor(MUTED_COLOR).fontSize(11)
      doc.text(`${L.plan}: ${planLabel}`, 60, tableY + 36, { width: 300 })
      doc.text(`${invoice.amount} ${L.currency}`, 380, tableY + 36, { width: 150, align: "right" })

      doc.y = tableY + 65
      doc.moveDown(0.8)

      // ── Dates ──
      doc.fontSize(11).fillColor(MUTED_COLOR)
      doc.text(`${L.issueDate} ${createdDateStr}`)
      doc.text(`${L.dueDate} ${dueDateStr}`)
      doc.moveDown(1)

      // ── Bank Info ──
      if (invoice.bankInfo) {
        doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown(0.8)
        doc.fontSize(13).fillColor(TEXT_COLOR).text(L.bankInfo)
        doc.moveDown(0.4)
        doc.fontSize(11).fillColor(MUTED_COLOR).text(invoice.bankInfo, { lineGap: 3 })
        doc.moveDown(1)
      }

      // ── Notes ──
      if (invoice.notes) {
        doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown(0.8)
        doc.fontSize(13).fillColor(TEXT_COLOR).text(L.notes)
        doc.moveDown(0.4)
        doc.fontSize(11).fillColor(MUTED_COLOR).text(invoice.notes, { lineGap: 3 })
        doc.moveDown(1)
      }

      // ── Total ──
      doc.strokeColor(BRAND_COLOR).lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke()
      doc.moveDown(0.6)
      doc.fontSize(16).fillColor(BRAND_COLOR)
        .text(`${L.total}  ${invoice.amount} ${L.currency}`, { align: "center" })
      doc.moveDown(1.5)

      // ── Footer ──
      doc.fontSize(10).fillColor("#9ca3af")
        .text(L.footer1, { align: "center" })
        .text(L.footer2, { align: "center" })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
