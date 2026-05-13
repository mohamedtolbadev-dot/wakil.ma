import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { scrapeProductFromUrl } from "@/lib/productScraper"

/**
 * POST /api/products/import
 *   Body: { url: string }
 *   Response: { name, price, salePrice, description, images, category, source }
 *
 * Scrapes a product page from the user's own site (Shopify/Youcan/WooCommerce/etc.)
 * and returns structured data ready to prefill the Add-Product form.
 * Does NOT create the product — user reviews first.
 */
export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  let url
  try {
    const body = await request.json()
    url = body?.url
  } catch {
    return errorResponse("رابط غير صالح", 400)
  }

  if (!url || typeof url !== "string" || url.length > 2048) {
    return errorResponse("يرجى تقديم رابط صالح", 400)
  }

  const result = await scrapeProductFromUrl(url)

  if (!result.ok) {
    const msgMap = {
      INVALID_URL:         "الرابط غير صالح",
      MALFORMED_URL:       "صيغة الرابط غير صحيحة",
      UNSUPPORTED_PROTOCOL:"يجب أن يبدأ الرابط بـ http أو https",
      TIMEOUT:             "الموقع لا يستجيب (timeout)",
      FETCH_FAILED:        "تعذّر الوصول إلى الموقع",
      NO_PRODUCT_DATA:     "لم نعثر على بيانات منتج في هذه الصفحة",
    }
    const msg = msgMap[result.error] || msgMap[`${result.error}`.replace(/^HTTP_/, "HTTP_")]
    return errorResponse(msg || `تعذّر الاستيراد: ${result.error}`, 400)
  }

  return successResponse({
    source: result.source,
    ...result.data,
  })
}
