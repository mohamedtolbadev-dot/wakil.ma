import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse
} from "@/lib/response"
import { withProductInsight } from "@/lib/productInsights"

export async function GET(request, { params }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const product = await prisma.product.findFirst({
      where: { id, userId: user.id }
    })

    if (!product) return errorResponse("المنتج غير موجود", 404)

    return successResponse(withProductInsight(product))
  } catch (error) {
    return errorResponse("خطأ في جلب المنتج", 500)
  }
}

export async function PUT(request, { params }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { name, price, salePrice, category, variants, askQuantity, description, isActive, images, videos, stock } = body

    const product = await prisma.product.findFirst({
      where: { id, userId: user.id }
    })
    if (!product) return errorResponse("المنتج غير موجود", 404)

    const LOW_STOCK_THRESHOLD = 5

    // Resolve the final price so we can validate salePrice against it
    const finalPrice = (() => {
      if (price === undefined) return product.price
      const parsed = parseFloat(price)
      if (isNaN(parsed) || parsed < 0 || parsed > 1000000) return product.price
      return parsed
    })()

    // Sale price handling: null clears it, number sets it
    let saleUpdate = undefined
    if (salePrice !== undefined) {
      if (salePrice === null || salePrice === "") {
        saleUpdate = null
      } else {
        const n = parseFloat(salePrice)
        if (!isNaN(n) && n >= 0 && n < finalPrice) saleUpdate = n
        else if (!isNaN(n) && n >= finalPrice) return errorResponse("سعر التخفيض يجب أن يكون أقل من السعر الأصلي", 400)
      }
    }

    // Variants handling: array → json, null/[] → clear
    let variantsUpdate = undefined
    if (variants !== undefined) {
      if (variants === null || (Array.isArray(variants) && variants.length === 0)) {
        variantsUpdate = null
      } else if (Array.isArray(variants)) {
        const clean = variants
          .filter(v => v && typeof v === "object" && v.name && Array.isArray(v.options))
          .map(v => ({
            name: String(v.name).trim().slice(0, 40),
            options: v.options.map(o => String(o).trim().slice(0, 40)).filter(Boolean).slice(0, 20),
          }))
          .filter(v => v.name && v.options.length > 0)
        variantsUpdate = clean.length > 0 ? JSON.stringify(clean) : null
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: finalPrice }),
        ...(saleUpdate !== undefined && { salePrice: saleUpdate }),
        ...(category !== undefined && { category: category ? String(category).trim().slice(0, 50) || null : null }),
        ...(variantsUpdate !== undefined && { variants: variantsUpdate }),
        ...(askQuantity !== undefined && { askQuantity: askQuantity === false ? false : true }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(images !== undefined && { images: JSON.stringify(images) }),
        ...(videos !== undefined && { videos: JSON.stringify(videos) }),
        ...(stock !== undefined && {
          stock: (() => {
            const parsed = parseFloat(stock)
            if (isNaN(parsed) || parsed < 0) return product.stock
            return parsed
          })()
        }),
      }
    })

    const prevStock = product.stock
    const newStock  = updated.stock
    const prodName  = updated.name

    if (prevStock > 0 && newStock === 0) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: `fr:Rupture de stock: ${prodName}||ar:نفاذ المخزون: ${prodName}`,
          message: `fr:Le stock du produit "${prodName}" est épuisé. Veuillez réapprovisionner.||ar:نفد مخزون "${prodName}" بالكامل! يرجى إعادة التخزين في أقرب وقت.`,
        }
      })
    } else if (prevStock > LOW_STOCK_THRESHOLD && newStock > 0 && newStock <= LOW_STOCK_THRESHOLD) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: `fr:Alerte stock: ${prodName}||ar:تنبيه مخزون: ${prodName}`,
          message: `fr:Il reste ${newStock} unité(s) de "${prodName}".||ar:المخزون المتبقي من "${prodName}" هو ${newStock} وحدة فقط.`,
        }
      })
    }

    return successResponse(withProductInsight(updated))
  } catch (error) {
    console.error("PUT product error:", error)
    return errorResponse("خطأ في تعديل المنتج", 500)
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const product = await prisma.product.findFirst({
      where: { id, userId: user.id }
    })
    if (!product) return errorResponse("المنتج غير موجود", 404)

    await prisma.product.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("DELETE product error:", error)
    return errorResponse("خطأ في حذف المنتج", 500)
  }
}
