/**
 * Product URL scraper — extracts product data from any e-commerce page.
 *
 * Strategy:
 *   1. JSON-LD Schema.org Product (strongest — supported by Shopify, Youcan,
 *      WooCommerce, Magento, PrestaShop, most modern stores)
 *   2. Open Graph tags (og:title, og:image, og:price:amount)
 *   3. Twitter cards + microdata fallback
 *
 * Zero external deps — uses native fetch + regex on HTML.
 */

const TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 2_000_000 // 2MB cap to avoid pathological pages

// Browser-like UA to bypass basic bot checks
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0.0.0 Safari/537.36"

/**
 * Fetch + extract product info from a URL.
 * Returns { ok, source, data?, error? }
 */
export async function scrapeProductFromUrl(url) {
  if (!url || typeof url !== "string") return { ok: false, error: "INVALID_URL" }

  let target
  try { target = new URL(url.trim()) }
  catch { return { ok: false, error: "MALFORMED_URL" } }

  if (!/^https?:$/.test(target.protocol)) return { ok: false, error: "UNSUPPORTED_PROTOCOL" }

  // ── 0. Shopify shortcut — works for Allbirds, most Shopify stores, Youcan ──
  //   If URL looks like /products/<slug>, try the hidden .js endpoint first.
  //   This gives COMPLETE data: all images + variants + tags/type (category).
  const shopifySlug = target.pathname.match(/\/products\/([^/?#.]+)/)?.[1]
  if (shopifySlug) {
    try {
      const prefix = target.pathname.split("/products/")[0]
      const jsUrl = `${target.origin}${prefix}/products/${shopifySlug}.js`
      const jsText = await fetchText(jsUrl)
      const data = parseShopifyJson(jsText, target)
      if (data) return { ok: true, source: "shopify", data }
    } catch {/* silently fall through to HTML scraping */}
  }

  // ── Fetch HTML ──────────────────────────────────
  let html = ""
  try {
    html = await fetchText(target.toString())
  } catch (err) {
    return { ok: false, error: err.code || "FETCH_FAILED" }
  }
  if (!html) return { ok: false, error: "NO_PRODUCT_DATA" }

  // 1. JSON-LD (best)
  const fromLD = extractFromJsonLd(html, target)
  if (fromLD && fromLD.name) return { ok: true, source: "json-ld", data: fromLD }

  // 2. Open Graph (with multiple og:image tags)
  const fromOG = extractFromOpenGraph(html, target)
  if (fromOG && fromOG.name) return { ok: true, source: "open-graph", data: fromOG }

  // 3. Heuristic fallback — title + meta description + first large image
  const fromFallback = extractHeuristic(html, target)
  if (fromFallback && fromFallback.name) {
    return { ok: true, source: "heuristic", data: fromFallback }
  }

  return { ok: false, error: "NO_PRODUCT_DATA" }
}

/* ──────────────────────────────────────────────
   Fetch helper with timeout + size cap
   Throws errors with .code ∈ {TIMEOUT, HTTP_xxx, FETCH_FAILED}
   ────────────────────────────────────────────── */
async function fetchText(url) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/json,application/xhtml+xml",
        "Accept-Language": "en;q=0.9,fr;q=0.8,ar;q=0.7",
      },
      redirect: "follow",
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = new Error(`HTTP_${res.status}`)
      err.code = `HTTP_${res.status}`
      throw err
    }
    const reader = res.body.getReader()
    const chunks = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > MAX_HTML_BYTES) break
      chunks.push(value)
    }
    const buf = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) { buf.set(c, offset); offset += c.length }
    return new TextDecoder("utf-8", { fatal: false }).decode(buf)
  } catch (err) {
    if (err.name === "AbortError") { const e = new Error("TIMEOUT"); e.code = "TIMEOUT"; throw e }
    if (err.code) throw err
    const e = new Error("FETCH_FAILED"); e.code = "FETCH_FAILED"; throw e
  } finally {
    clearTimeout(t)
  }
}

/* ──────────────────────────────────────────────
   Shopify /products/slug.js — COMPLETE product data
   ────────────────────────────────────────────── */
function parseShopifyJson(text, baseUrl) {
  if (!text) return null
  let p
  try { p = JSON.parse(text) } catch { return null }
  if (!p || !p.title) return null

  // Images — array of URLs or { src }
  const rawImgs = Array.isArray(p.images) ? p.images : []
  const images = rawImgs
    .map(i => typeof i === "string" ? i : (i && i.src) || "")
    .filter(Boolean)
    .map(s => toAbsolute(s, baseUrl))
    .slice(0, 10)

  // Prices in Shopify are in cents
  const priceNow = p.price != null ? p.price / 100 : null
  const compareAt = p.compare_at_price != null ? p.compare_at_price / 100 : null
  let price = priceNow
  let salePrice = null
  if (compareAt && priceNow && compareAt > priceNow) {
    price = compareAt
    salePrice = priceNow
  }

  // Variants — p.options can be:
  //   Modern: [{ name: "Size", values: ["S","M","L"] }, ...]
  //   Legacy: ["Size", "Color"] — values need to be derived from p.variants
  let variants = []
  if (Array.isArray(p.options) && p.options.length > 0) {
    if (typeof p.options[0] === "object" && p.options[0].values) {
      variants = p.options
        .filter(o => o?.name && Array.isArray(o.values) && o.values.length > 0)
        .map(o => ({
          name: String(o.name).trim(),
          options: o.values.map(v => String(v).trim()).filter(Boolean),
        }))
        .filter(v => v.options.length > 0 && v.name.toLowerCase() !== "title")
    } else if (typeof p.options[0] === "string" && Array.isArray(p.variants)) {
      // Derive values from variants array
      const names = p.options.map(String)
      const seen = names.map(() => new Set())
      for (const v of p.variants) {
        names.forEach((_, idx) => {
          const val = v[`option${idx + 1}`]
          if (val) seen[idx].add(String(val).trim())
        })
      }
      variants = names
        .map((name, idx) => ({ name, options: Array.from(seen[idx]) }))
        .filter(v => v.options.length > 0 && v.name.toLowerCase() !== "title")
    }
  }

  const category = safeStr(p.product_type) ||
    (Array.isArray(p.tags) && p.tags.length > 0 ? safeStr(p.tags[0]) : "")

  const description = stripHtml(p.description || p.body_html || "")

  // Stock — sum all variants' inventory_quantity if exposed (some shops hide it)
  let stock = null
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    const qtys = p.variants
      .map(v => typeof v?.inventory_quantity === "number" ? v.inventory_quantity : null)
      .filter(n => n != null)
    if (qtys.length > 0) stock = Math.max(0, qtys.reduce((a, b) => a + b, 0))
    else if (p.available === true) stock = null // let user decide
    else if (p.available === false) stock = 0
  }

  return {
    name: safeStr(p.title),
    price,
    salePrice,
    description: truncate(description, 1000),
    images,
    category,
    variants,
    stock,
  }
}

/* ──────────────────────────────────────────────
   JSON-LD extraction (Schema.org Product)
   ────────────────────────────────────────────── */

function extractFromJsonLd(html, baseUrl) {
  const scriptRe = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  // Collect all nodes across all ld+json blocks first (so we can find
  // a BreadcrumbList node even if it lives in a separate block from Product).
  const allNodes = []
  let match
  while ((match = scriptRe.exec(html)) !== null) {
    const raw = match[1].trim()
    if (!raw) continue
    let parsed
    try { parsed = JSON.parse(raw) } catch { continue }
    if (Array.isArray(parsed)) allNodes.push(...parsed)
    else if (parsed["@graph"] && Array.isArray(parsed["@graph"])) allNodes.push(...parsed["@graph"])
    else allNodes.push(parsed)
  }
  if (allNodes.length === 0) return null

  const hasType = (node, t) => {
    const x = node?.["@type"]
    return x === t || (Array.isArray(x) && x.includes(t))
  }

  const productNode = allNodes.find(n => n && typeof n === "object" && hasType(n, "Product"))
  if (!productNode) return null

  const name = safeStr(productNode.name)
  if (!name) return null

  const offers = normalizeOffers(productNode.offers)
  // price = the "list" price (compare-at), salePrice = the current price if lower
  const current = pickPrice(offers)                     // lowest listed price
  const compareAt = pickCompareAtPrice(offers)          // highPrice or listPrice
  let price = current
  let salePrice = null
  if (compareAt && current && compareAt > current) {
    price = compareAt
    salePrice = current
  }

  const images = normalizeImages(productNode.image, baseUrl)

  // Category priority: productNode.category → BreadcrumbList last item → brand.name
  let category = safeStr(productNode.category)
  if (!category) {
    const breadcrumb = allNodes.find(n => hasType(n, "BreadcrumbList"))
    if (breadcrumb && Array.isArray(breadcrumb.itemListElement)) {
      const items = breadcrumb.itemListElement
        .map(el => {
          const item = el?.item
          if (typeof item === "string") return ""
          return safeStr(item?.name) || safeStr(el?.name)
        })
        .filter(Boolean)
      // Skip first (usually "Home") and last (usually the product itself)
      if (items.length >= 3) category = items[items.length - 2]
      else if (items.length === 2) category = items[0]
    }
  }

  const description = safeStr(productNode.description)

  // Stock from availability — "InStock" → null (unknown qty, leave to user)
  //                           "OutOfStock" → 0
  const availability = String(productNode.offers?.availability || "").toLowerCase()
  let stock = null
  if (availability.includes("outofstock") || availability.includes("soldout")) stock = 0

  return {
    name,
    price,
    salePrice,
    description: truncate(stripHtml(description), 1000),
    images,
    category,
    variants: [],
    stock,
  }
}

function normalizeOffers(offers) {
  if (!offers) return []
  const arr = Array.isArray(offers) ? offers : [offers]
  // Support AggregateOffer which wraps offers in .offers
  const flat = []
  for (const o of arr) {
    if (!o) continue
    if (Array.isArray(o.offers)) flat.push(...o.offers, o)
    else flat.push(o)
  }
  return flat.filter(Boolean).map(o => ({
    price: toNumber(o.price ?? o.lowPrice),
    priceHigh: toNumber(o.highPrice ?? o.listPrice),
    priceCurrency: o.priceCurrency,
  }))
}

function pickPrice(offers) {
  if (!offers.length) return null
  const prices = offers.map(o => o.price).filter(n => n != null && n >= 0)
  if (!prices.length) return null
  return Math.min(...prices)
}

function pickCompareAtPrice(offers) {
  if (!offers.length) return null
  const highs = offers.map(o => o.priceHigh).filter(n => n != null && n >= 0)
  if (!highs.length) return null
  return Math.max(...highs)
}

/* ──────────────────────────────────────────────
   Open Graph extraction
   ────────────────────────────────────────────── */

function extractFromOpenGraph(html, baseUrl) {
  const get = (prop) => {
    const re = new RegExp(
      `<meta\\s+(?:[^>]*\\b)?property\\s*=\\s*["']${escapeRe(prop)}["'][^>]*content\\s*=\\s*["']([^"']+)["']`,
      "i"
    )
    const m = html.match(re)
    if (m) return m[1]
    // Also try content-first order
    const re2 = new RegExp(
      `<meta\\s+(?:[^>]*\\b)?content\\s*=\\s*["']([^"']+)["'][^>]*property\\s*=\\s*["']${escapeRe(prop)}["']`,
      "i"
    )
    const m2 = html.match(re2)
    return m2 ? m2[1] : null
  }

  const name = decodeHtml(get("og:title") || "")
  if (!name) return null

  const description = decodeHtml(get("og:description") || "")

  // Collect ALL og:image tags — many sites list multiple product images
  const imgRe = /<meta\s+[^>]*property\s*=\s*["']og:image(?::secure_url|:url)?["'][^>]*content\s*=\s*["']([^"']+)["']/gi
  const imgRe2 = /<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image(?::secure_url|:url)?["']/gi
  const imgs = new Set()
  let mImg
  while ((mImg = imgRe.exec(html)) !== null) imgs.add(mImg[1])
  while ((mImg = imgRe2.exec(html)) !== null) imgs.add(mImg[1])
  const images = Array.from(imgs).map(s => toAbsolute(s, baseUrl)).slice(0, 10)

  const price = toNumber(get("product:price:amount") || get("og:price:amount"))
  const category = decodeHtml(get("product:category") || get("article:section") || "")

  // product:availability → stock hint
  const availability = (get("product:availability") || "").toLowerCase()
  const stock = availability.includes("outofstock") || availability.includes("oos") ? 0 : null

  return {
    name,
    price,
    salePrice: null,
    description: truncate(description, 1000),
    images,
    category,
    variants: [],
    stock,
  }
}

/* ──────────────────────────────────────────────
   Heuristic fallback (last resort)
   ────────────────────────────────────────────── */

function extractHeuristic(html, baseUrl) {
  // <title>Product Name — Site</title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const rawTitle = titleMatch ? decodeHtml(titleMatch[1]).trim() : ""
  // Strip " - SiteName" and "| SiteName" suffixes
  const name = rawTitle.split(/\s+[|\-–—]\s+/)[0].trim()
  if (!name) return null

  const descMatch = html.match(
    /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i
  )
  const description = descMatch ? decodeHtml(descMatch[1]) : ""

  // First <img> that looks like a product (avoid tiny/logo images)
  let image = null
  const imgRe = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
  let m
  while ((m = imgRe.exec(html)) !== null) {
    const src = m[1]
    if (/\b(logo|icon|avatar|sprite|favicon|pixel|spacer|placeholder)\b/i.test(src)) continue
    image = src
    break
  }

  return {
    name,
    price: null,
    salePrice: null,
    description: truncate(description, 500),
    images: image ? [toAbsolute(image, baseUrl)] : [],
    category: "",
    variants: [],
    stock: null,
  }
}

/* ──────────────────────────────────────────────
   Strip HTML tags (for description fields)
   Decodes entities FIRST (in case of double-encoded HTML like &lt;p&gt;)
   then strips tags.
   ────────────────────────────────────────────── */
function stripHtml(s) {
  if (!s) return ""
  const decoded = decodeHtml(String(s))
  return decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function safeStr(v) {
  if (v == null) return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "object" && typeof v["@value"] === "string") return v["@value"].trim()
  return String(v).trim()
}

function toNumber(v) {
  if (v == null) return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const s = String(v).replace(/[^0-9.,]/g, "").replace(",", ".")
  const n = parseFloat(s)
  // Accept 0 (free products are valid), reject negative.
  return Number.isFinite(n) && n >= 0 ? n : null
}

function normalizeImages(imageField, baseUrl) {
  if (!imageField) return []
  const arr = Array.isArray(imageField) ? imageField : [imageField]
  return arr
    .map(i => {
      if (typeof i === "string") return i
      if (i && typeof i === "object") return i.url || i.contentUrl || i["@id"] || ""
      return ""
    })
    .filter(Boolean)
    .map(s => toAbsolute(s, baseUrl))
    .filter(s => /^https?:\/\//i.test(s))
    .slice(0, 8) // cap
}

function toAbsolute(src, baseUrl) {
  try {
    return new URL(src, baseUrl).toString()
  } catch {
    return src
  }
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function truncate(s, n) {
  if (!s) return ""
  return s.length > n ? s.slice(0, n).trim() + "…" : s
}

function decodeHtml(s) {
  if (!s) return ""
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      try { return String.fromCharCode(parseInt(n, 10)) } catch { return "" }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try { return String.fromCharCode(parseInt(h, 16)) } catch { return "" }
    })
}
