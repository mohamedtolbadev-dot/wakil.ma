import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

export async function getSuperAdminFromRequest(request) {
  const token = request.headers.get("authorization")?.split(" ")[1]
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded?.userId) return null

  const admin = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, role: true },
  })

  if (admin?.role !== "SUPER_ADMIN") return null
  return decoded
}
