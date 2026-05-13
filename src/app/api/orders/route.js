import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"
import { applyOrderCountedSideEffects } from "@/lib/orderLifecycle"
import { withOrderConfidence } from "@/lib/orderConfidence"

function normalizeOrderPhone(phone) {
  if (!phone) return ""
  let normalized = String(phone).replace(/\D/g, "")
  if (normalized.length === 10 && normalized.startsWith("0")) {
    normalized = "212" + normalized.slice(1)
  } else if (normalized.length === 9 && normalized.startsWith("6")) {
    normalized = "212" + normalized
  }
  return normalized
}

function parseProductImages(imagesField) {
  if (!imagesField) return []

  const normalizeList = (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map((image) => {
        if (typeof image === "string") return image
        if (image && typeof image === "object") {
          return image.secure_url || image.url || image.src || image.link || ""
        }
        return ""
      })
      .map((image) => String(image || "").trim())
      .filter(Boolean)
  }

  try {
    if (typeof imagesField === "string") {
      const parsed = JSON.parse(imagesField)
      if (typeof parsed === "string") return parseProductImages(parsed)
      return normalizeList(parsed)
    }
    return normalizeList(imagesField)
  } catch {
    return []
  }
}

export async function GET(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") || ""
    const draftParam = searchParams.get("draft")  // "true" | "false" | null
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where = { userId: user.id }
    if (status) where.status = status
    if (draftParam === "true") where.isDraft = true
    if (draftParam === "false") where.isDraft = false
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { productName: { contains: search } },
        { city: { contains: search } },
        { address: { contains: search } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, phone: true, tag: true } },
        },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    const productIds = [...new Set(orders.map((order) => order.productId).filter(Boolean))]
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { userId: user.id, id: { in: productIds } },
          select: { id: true, images: true, category: true },
        })
      : []
    const productMetaById = new Map(products.map((product) => {
      const images = parseProductImages(product.images)
      return [product.id, {
        productImage: images[0] || null,
        productImages: images,
        productCategory: product.category || null,
      }]
    }))

    const normalizedOrders = orders.map((order) => {
      const meta = order.productId ? productMetaById.get(order.productId) : null
      const baseOrder = {
        ...order,
        ...(meta || { productImage: null, productImages: [], productCategory: null }),
      }
      if (order.conversationId) return withOrderConfidence(baseOrder)
      const fallbackConversationId =
        order.notes?.match(/(?:المحادثة|conversation)\s*:\s*([a-z0-9-]+)/i)?.[1] || null
      return withOrderConfidence({
        ...baseOrder,
        conversationId: fallbackConversationId,
      })
    })

    return successResponse({
      orders: normalizedOrders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/orders error:", error)
    return errorResponse("خطأ في جلب الطلبيات", 500)
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  // ✅ Rate limiting — prevent spam orders (max 10 orders per 15min per IP)
  const rateLimitResult = rateLimit(request)
  if (!rateLimitResult.success) {
    return errorResponse(
      `تم تجاوز الحد. حاول بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`,
      429
    )
  }

  try {
    const body = await request.json()
    const { customerName, customerPhone, productName, quantity, totalAmount, city, address, notes, productId, customerId } = body

    if (!customerName || !customerPhone || (!productName && !productId)) {
      return errorResponse("الحقول المطلوبة ناقصة", 400)
    }
    if (!productId && totalAmount === undefined) {
      return errorResponse("المبلغ مطلوب", 400)
    }

    const finalCustomerPhone = normalizeOrderPhone(customerPhone)
    if (!finalCustomerPhone) {
      return errorResponse("رقم الهاتف غير صالح", 400)
    }

    // ✅ Validate quantity (must be >= 1 and <= 100)
    const finalQty = quantity ? Number(quantity) : 1
    if (!Number.isFinite(finalQty) || finalQty < 1 || finalQty > 100) {
      return errorResponse("الكمية يجب أن تكون بين 1 و 100", 400)
    }

    // ✅ إذا جا productId (من المنصة) كنجيب الاسم/الثمن من صفحة المنتجات (DB) ونأمن ownership
    let finalProductId = productId || null
    let finalProductName = productName
    let finalTotalAmount = totalAmount !== undefined ? Number(totalAmount) : 0
    if (totalAmount !== undefined && (!Number.isFinite(finalTotalAmount) || finalTotalAmount < 0)) {
      return errorResponse("المبلغ غير صالح", 400)
    }

    if (finalProductId) {
      const product = await prisma.product.findFirst({
        where: { id: finalProductId, userId: user.id }
      })
      if (!product) return errorResponse("المنتج غير موجود", 404)

      // ✅ Check stock availability
      if (product.stock !== null && product.stock !== undefined && product.stock < finalQty) {
        return errorResponse(
          `المخزون غير كافٍ. المتاح: ${product.stock}، المطلوب: ${finalQty}`,
          400
        )
      }

      finalProductName = product.name
      const unitPrice = product.salePrice != null && product.salePrice < product.price
        ? product.salePrice
        : product.price

      // إذا totalAmount ما واضحش أو =0، نحسبه من ثمن المنتج × الكمية
      if (!finalTotalAmount || Number.isNaN(finalTotalAmount)) {
        finalTotalAmount = Number(unitPrice) * finalQty
      }
    }

    let customer = null
    if (customerId) {
      customer = await prisma.customer.findFirst({
        where: { id: customerId, userId: user.id },
      })
      if (!customer) return errorResponse("الزبون غير موجود", 404)
    } else {
      customer = await prisma.customer.upsert({
        where: { userId_phone: { userId: user.id, phone: finalCustomerPhone } },
        update: {
          name: customerName,
          lastSeen: new Date(),
        },
        create: {
          userId: user.id,
          name: customerName,
          phone: finalCustomerPhone,
        },
      })
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        customerId: customer?.id || null,
        customerName,
        customerPhone: finalCustomerPhone,
        productId: finalProductId,
        productName: finalProductName,
        quantity: finalQty,
        totalAmount: finalTotalAmount,
        city: city || null,
        address: address || null,
        notes: notes || null,
        status: "PENDING",
      },
    })

    await applyOrderCountedSideEffects(order)

    return successResponse(withOrderConfidence(order), 201)
  } catch (error) {
    console.error("POST /api/orders error:", error)
    return errorResponse("خطأ في إنشاء الطلبية", 500)
  }
}
