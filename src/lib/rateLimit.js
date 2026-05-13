import { NextResponse } from "next/server"

// Store IP attempts: Map<ip, { count: number, resetTime: number }>
const rateLimitStore = new Map()

// Rate limit configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 100 // requests per window
const AUTH_RATE_LIMIT_MAX = 10 // login/register attempts per window

// Clean up old entries every hour
if (typeof global !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(ip)
      }
    }
  }, 60 * 60 * 1000) // 1 hour
}

function getClientIP(request) {
  // Only trust proxy-added IP headers from known hosting layers.
  const trustedHeaders = [
    "x-vercel-forwarded-for",
    "cf-connecting-ip",
    "fly-client-ip",
    "x-real-ip",
  ]

  for (const header of trustedHeaders) {
    const value = request.headers.get(header)
    if (!value) continue

    const candidate = value.split(",")[0].trim()
    if (candidate) return candidate
  }

  // `x-forwarded-for` is trivially spoofable when trusted directly.
  // Only allow it as a best-effort fallback outside production.
  if (process.env.NODE_ENV !== "production") {
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
      const candidate = forwarded.split(",")[0].trim()
      if (candidate) return candidate
    }
  }

  // Fallback (development / unknown proxy chain)
  return "unknown"
}

export function rateLimit(request, isAuthEndpoint = false) {
  const ip = getClientIP(request)
  const now = Date.now()
  const maxRequests = isAuthEndpoint ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX
  
  const record = rateLimitStore.get(ip)
  
  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + RATE_LIMIT_WINDOW
    rateLimitStore.set(ip, {
      count: 1,
      resetTime,
    })
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    }
  }
  
  if (record.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
    }
  }
  
  record.count++
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
    retryAfter: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
  }
}

export function rateLimitMiddleware(handler, isAuthEndpoint = false) {
  return async function (request, ...args) {
    const result = rateLimit(request, isAuthEndpoint)
    
    if (!result.success) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: "تم تجاوز الحد المسموح به من الطلبات",
          message: "الرجاء المحاولة لاحقاً",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
            "Retry-After": String(retryAfter),
          },
        }
      )
    }
    
    // Add rate limit headers to successful response
    const response = await handler(request, ...args)
    
    // Clone response to add headers
    if (response && response.headers) {
      response.headers.set("X-RateLimit-Limit", String(result.limit))
      response.headers.set("X-RateLimit-Remaining", String(result.remaining))
    }
    
    return response
  }
}
