// دوال المصادقة
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET
const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  storeName: true,
  plan: true,
  planExpiresAt: true,
  role: true,
  isActive: true,
  createdAt: true,
  agent: {
    select: {
      id: true,
      name: true,
      domain: true,
      style: true,
      language: true,
      isActive: true,
    }
  }
}

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required")
}

// تشفير كلمة المرور
export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

// مقارنة كلمة المرور
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// توليد JWT Token
export function generateToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: "7d" }  // جلسة أسبوعية — توازن أمان/راحة
  )
}

// التحقق من JWT Token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// ✅ دالة التحقق من التوكن للـ API Routes (format: { success, user, error })
export async function authenticateToken(request) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }
  return { success: true, user }
}

// استخراج User من Request
export async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get("authorization")
    
    if (!authHeader) {
      console.warn("❌ No authorization header")
      return null
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.warn("❌ Invalid authorization format")
      return null
    }

    const token = authHeader.slice(7)
    
    const decoded = verifyToken(token)
    
    if (!decoded?.userId) {
      console.warn("❌ Token verification failed or no userId")
      return null
    }

    console.log(`✅ Token verified, userId: ${decoded.userId}`)

    const { prisma } = await import("@/lib/prisma")
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: AUTH_USER_SELECT
    })

    if (!user) {
      console.error("❌ User not found in database:", decoded.userId)
      return null
    }

    console.log(`✅ User found: ${user.email}`)
    return user
  } catch (error) {
    console.error("❌ getUserFromRequest error:", error?.message || error)
    return null
  }
}

export { AUTH_USER_SELECT }
