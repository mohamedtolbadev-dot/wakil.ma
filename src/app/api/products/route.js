import { prisma } from "@/lib/prisma"
import { withProductInsight } from "@/lib/productInsights"

import { getUserFromRequest } from "@/lib/auth"
import { getEffectivePlanEntitlements } from "@/lib/billingPlans"

import {

  successResponse,

  errorResponse,

  unauthorizedResponse

} from "@/lib/response"



export async function GET(request) {

  const user = await getUserFromRequest(request)

  if (!user) return unauthorizedResponse()



  try {

    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search") || ""

    const activeOnly = searchParams.get("active") === "true"



    const products = await prisma.product.findMany({

      where: {

        userId: user.id,

        ...(activeOnly && { isActive: true }),

        ...(search && {

          OR: [

            { name: { contains: search } },

            { description: { contains: search } },

            { category: { contains: search } },

          ]

        }),

      },

      orderBy: { createdAt: "desc" }

    })



    return successResponse(products.map(withProductInsight))

  } catch (error) {

    console.error("GET products error:", error)

    return errorResponse("خطأ في جلب المنتجات", 500)

  }

}



export async function POST(request) {

  const user = await getUserFromRequest(request)

  if (!user) return unauthorizedResponse()



  try {

    const entitlements = getEffectivePlanEntitlements(user)
    if (Number.isInteger(entitlements.productLimit)) {
      const productsCount = await prisma.product.count({ where: { userId: user.id } })
      if (productsCount >= entitlements.productLimit) {
        return errorResponse(
          `Product limit reached for ${entitlements.plan} plan (${entitlements.productLimit} products). Upgrade to add more products.`,
          403
        )
      }
    }

    const body = await request.json()
    const { name, price, salePrice, category, variants, askQuantity, description, images, videos, stock } = body



    if (!name?.trim() || price === undefined || price === null) {

      return errorResponse("الاسم والسعر مطلوبان", 400)

    }



    const parsedPrice = parseFloat(price)

    if (isNaN(parsedPrice) || parsedPrice < 0) {

      return errorResponse("السعر غير صالح", 400)

    }

    if (parsedPrice > 1000000) {

      return errorResponse("السعر مرتفع جداً", 400)

    }



    const parsedStock = stock !== undefined ? parseFloat(stock) : 0

    if (isNaN(parsedStock) || parsedStock < 0) {

      return errorResponse("الكمية غير صالحة", 400)

    }



    // ── Sale price validation (optional) ──
    let parsedSale = null
    if (salePrice !== undefined && salePrice !== null && salePrice !== "") {
      const n = parseFloat(salePrice)
      if (isNaN(n) || n < 0) return errorResponse("سعر التخفيض غير صالح", 400)
      if (n >= parsedPrice) return errorResponse("سعر التخفيض يجب أن يكون أقل من السعر الأصلي", 400)
      parsedSale = n
    }

    // ── Variants validation (optional) ──
    //   Shape: [{ name: "Taille", options: ["S","M","L"] }, ...]
    let variantsJson = null
    if (Array.isArray(variants) && variants.length > 0) {
      const clean = variants
        .filter(v => v && typeof v === "object" && v.name && Array.isArray(v.options))
        .map(v => ({
          name: String(v.name).trim().slice(0, 40),
          options: v.options.map(o => String(o).trim().slice(0, 40)).filter(Boolean).slice(0, 20),
        }))
        .filter(v => v.name && v.options.length > 0)
      if (clean.length > 0) variantsJson = JSON.stringify(clean)
    }

    const product = await prisma.product.create({

      data: {

        userId: user.id,

        name,

        price: parsedPrice,

        salePrice: parsedSale,

        category: category ? String(category).trim().slice(0, 50) || null : null,

        variants: variantsJson,

        askQuantity: askQuantity === false ? false : true,

        description: description || "",

        images: images ? JSON.stringify(images) : null,
        videos: videos ? JSON.stringify(videos) : null,

        stock: parsedStock,

      }

    })



    return successResponse(withProductInsight(product), 201)

  } catch (error) {

    console.error("POST product error:", error)

    return errorResponse("خطأ في إضافة المنتج", 500)

  }

}

