import { NextResponse } from "next/server"

// Security headers configuration
const securityHeaders = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // XSS Protection (legacy but still useful)
  "X-XSS-Protection": "1; mode=block",
  
  // Referrer Policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions Policy
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  
  // Strict Transport Security (HSTS) - only in production
  ...(process.env.NODE_ENV === "production" && {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  }),
  
  // Content Security Policy (CSP)
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.cloudinary.com https://api.openai.com https://graph.facebook.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
}

export function withSecurityHeaders(response) {
  const newResponse = NextResponse.next()
  
  // Copy all headers from the original response
  for (const [key, value] of response.headers.entries()) {
    newResponse.headers.set(key, value)
  }
  
  // Add security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    newResponse.headers.set(key, value)
  }
  
  return newResponse
}

// Middleware function for API routes
export function addSecurityHeaders(response) {
  if (!response || !response.headers) {
    return response
  }
  
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
  
  return response
}
