export const DEFAULT_BATCH_SIZE = 25
export const MAX_BATCH_SIZE = 100
export const DEFAULT_EXCLUDE_CONTACT_DAYS = 7

export const CAMPAIGN_AUDIENCE_TYPES = [
  "ALL_BUYERS",
  "SAME_PRODUCT_BUYERS",
  "SAME_CATEGORY_BUYERS",
  "TAG_BUYERS",
  "RECENT_BUYERS",
]

export const CAMPAIGN_MUTABLE_STATUSES = [
  "DRAFT",
  "READY",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]

export const TEMPLATE_VARIABLE_DEFS = [
  { key: "customer_name", label: "Customer name" },
  { key: "product_name", label: "Product name" },
  { key: "product_price", label: "Product price" },
  { key: "product_sale_price", label: "Product sale price" },
  { key: "store_name", label: "Store name" },
  { key: "customer_tag", label: "Customer tag" },
  { key: "category", label: "Product category" },
  { key: "last_order_total", label: "Last order total" },
]

export const TEMPLATE_VARIABLE_KEYS = TEMPLATE_VARIABLE_DEFS.map((item) => item.key)

export const RECIPIENT_SKIP_REASONS = {
  MISSING_PHONE: "missing_phone",
  OPTED_OUT: "opted_out",
  RECENTLY_CONTACTED: "recently_contacted",
  DUPLICATE_PHONE: "duplicate_phone",
}

export const MARKETING_STOP_KEYWORDS = [
  "stop",
  "unsubscribe",
  "opt out",
  "remove me",
  "باراكا",
  "حبس",
  "وقف",
  "ما تبقاش تصيفط",
  "حبس الرسائل",
  "ما نبغيش الرسائل",
]
