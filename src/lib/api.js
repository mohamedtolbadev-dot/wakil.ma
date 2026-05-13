// API Client - wrapper for fetch with auth

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// Get token from localStorage
function getToken() {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("token")
    const token = typeof raw === "string" ? raw.trim() : ""
    if (!token || token === "undefined" || token === "null") return null
    return token
  } catch {
    return null
  }
}

// Main fetch wrapper
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getToken()

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  // Always add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const fetchOptions = {
      ...options,
      headers,
      // Ensure credentials are included for same-origin requests
      credentials: "same-origin",
    }

    const response = await fetch(url, fetchOptions)
    
    // Handle non-JSON responses
    let data
    const contentType = response.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      data = await response.json()
    } else {
      data = { error: "Invalid response format" }
    }

    if (!response.ok) {
      // If auth is invalid/expired → redirect to login immediately
      if (response.status === 401 && typeof window !== "undefined") {
        try {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
        } catch {}
        // Redirect only once (avoid multiple redirects from parallel requests)
        if (!window.__redirectingToLogin) {
          window.__redirectingToLogin = true
          window.location.href = "/login"
        }
      }
      throw new Error(data.message || data.error || "Request failed")
    }

    return data
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error)
    throw error
  }
}

// Auth APIs
export const authAPI = {
  login: (email, password) =>
    fetchAPI("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  googleLogin: (token) =>
    fetchAPI("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  register: (userData) =>
    fetchAPI("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  me: () => fetchAPI("/api/auth/me"),

  sendOtp: (data) =>
    fetchAPI("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyOtp: (data) =>
    fetchAPI("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resendOtp: (email) =>
    fetchAPI("/api/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email) =>
    fetchAPI("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, password) =>
    fetchAPI("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  phoneSetupSend: (phone) =>
    fetchAPI("/api/auth/phone-setup/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  phoneSetupVerify: (phone, code) =>
    fetchAPI("/api/auth/phone-setup/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
}

// Stats API
export const statsAPI = {
  getStats: (period = "week") => fetchAPI(`/api/stats?period=${period}`),
}

// Products APIs
export const productsAPI = {
  getAll: (params = {}) => {
    // Filter out undefined/null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null)
    )
    const query = new URLSearchParams(cleanParams).toString()
    return fetchAPI(`/api/products${query ? `?${query}` : ""}`)
  },
  getById: (id) => fetchAPI(`/api/products/${id}`),
  create: (data) =>
    fetchAPI("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/api/products/${id}`, {
      method: "DELETE",
    }),
}

// Conversations APIs
export const conversationsAPI = {
  getAll: (params = {}) => {
    // Filter out undefined/null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null)
    )
    const query = new URLSearchParams(cleanParams).toString()
    return fetchAPI(`/api/conversations${query ? `?${query}` : ""}`)
  },
  getById: (id) => fetchAPI(`/api/conversations/${id}`),
  update: (id, data) =>
    fetchAPI(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/api/conversations/${id}`, {
      method: "DELETE",
    }),
}

// Customers APIs
export const customersAPI = {
  getAll: (params = {}) => {
    // Filter out undefined/null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null)
    )
    const query = new URLSearchParams(cleanParams).toString()
    return fetchAPI(`/api/customers${query ? `?${query}` : ""}`)
  },
  getById: (id) => fetchAPI(`/api/customers/${id}`),
  update: (id, data) =>
    fetchAPI(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/api/customers/${id}`, { method: "DELETE" }),
}

// Agent APIs
export const agentAPI = {
  get: () => fetchAPI("/api/agent"),
  update: (data) =>
    fetchAPI("/api/agent", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getObjections: () => fetchAPI("/api/agent/objections"),
  addObjection: (data) =>
    fetchAPI("/api/agent/objections", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateObjection: (id, data) =>
    fetchAPI(`/api/agent/objections/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteObjection: (id) =>
    fetchAPI(`/api/agent/objections/${id}`, {
      method: "DELETE",
    }),
}

// Notifications APIs
export const notificationsAPI = {
  getAll: (params = {}) => {
    // Filter out undefined/null values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null)
    )
    const query = new URLSearchParams(cleanParams).toString()
    return fetchAPI(`/api/notifications${query ? `?${query}` : ""}`)
  },
  markAsRead: (id) =>
    fetchAPI(`/api/notifications/${id}/read`, {
      method: "PUT",
    }),
  markAllAsRead: () =>
    fetchAPI("/api/notifications/read-all", {
      method: "PUT",
    }),
}

// Campaigns APIs
export const campaignsAPI = {
  getAll: () => fetchAPI("/api/campaigns"),
  getById: (id) => fetchAPI(`/api/campaigns/${id}`),
  create: (data) =>
    fetchAPI("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchAPI(`/api/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  preview: (data) =>
    fetchAPI("/api/campaigns/preview", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  dispatch: (id) =>
    fetchAPI(`/api/campaigns/${id}/dispatch`, {
      method: "POST",
    }),
  restart: (id) =>
    fetchAPI(`/api/campaigns/${id}/restart`, {
      method: "POST",
    }),
  delete: (id) =>
    fetchAPI(`/api/campaigns/${id}`, {
      method: "DELETE",
    }),
  getTemplates: () => fetchAPI("/api/campaigns/templates"),
  createTemplate: (data) =>
    fetchAPI("/api/campaigns/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTemplate: (id, data) =>
    fetchAPI(`/api/campaigns/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTemplate: (id) =>
    fetchAPI(`/api/campaigns/templates/${id}`, {
      method: "DELETE",
    }),
}

// WhatsApp APIs
export const whatsappAPI = {
  connect: (data) =>
    fetchAPI("/api/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  send: (data) =>
    fetchAPI("/api/whatsapp/send", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  test: (data) =>
    fetchAPI("/api/whatsapp/test", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// Orders APIs
export const ordersAPI = {
  getAll: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null)
    )
    const query = new URLSearchParams(cleanParams).toString()
    return fetchAPI(`/api/orders${query ? `?${query}` : ""}`)
  },
  getById: (id) => fetchAPI(`/api/orders/${id}`),
  create: (data) =>
    fetchAPI("/api/orders", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    fetchAPI(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateStatus: (id, status, extra = {}) =>
    fetchAPI(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...extra }),
    }),
  exportDelivery: (data = {}) =>
    fetchAPI("/api/orders/delivery/export", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  importDeliveryTracking: (data = {}) =>
    fetchAPI("/api/orders/delivery/import", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  bulkDeliveryStatus: (data = {}) =>
    fetchAPI("/api/orders/delivery/bulk-status", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchAPI(`/api/orders/${id}`, { method: "DELETE" }),
}

// Invoices API (client view)
export const invoicesAPI = {
  getAll: () => fetchAPI("/api/invoices"),
  requestPlan: (plan) =>
    fetchAPI("/api/billing/plan-request", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
}

// Admin APIs
export const adminAPI = {
  getUsers: () => fetchAPI("/api/admin/users"),
  deleteUser: (id) => fetchAPI(`/api/admin/users?id=${id}`, { method: "DELETE" }),
  getBlogs: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v))
    ).toString()
    return fetchAPI(`/api/admin/blogs${query ? `?${query}` : ""}`)
  },
  createBlog: (data) =>
    fetchAPI("/api/admin/blogs", { method: "POST", body: JSON.stringify(data) }),
  updateBlog: (id, data) =>
    fetchAPI(`/api/admin/blogs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBlog: (id) =>
    fetchAPI(`/api/admin/blogs/${id}`, { method: "DELETE" }),
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v))
    ).toString()
    return fetchAPI(`/api/admin/invoices${query ? `?${query}` : ""}`)
  },
  createInvoice: (data) =>
    fetchAPI("/api/admin/invoices", { method: "POST", body: JSON.stringify(data) }),
  updateInvoice: (id, data) =>
    fetchAPI(`/api/admin/invoices/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteInvoice: (id) =>
    fetchAPI(`/api/admin/invoices/${id}`, { method: "DELETE" }),
  sendInvoice: (id, locale = "fr") =>
    fetchAPI(`/api/admin/invoices/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ locale }),
    }),
}

// Generic API request wrapper (alias for fetchAPI)
export { fetchAPI as apiRequest }

export default fetchAPI
