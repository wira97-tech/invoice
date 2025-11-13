// doku-hmac-check.js
// Run with: DOTENV_CONFIG_PATH=.env.local node -r dotenv/config doku-hmac-check.js
require("dotenv").config({ path: ".env.local" })

const crypto = require("crypto")

const CLIENT_ID = process.env.DOKU_CLIENT_ID
const SECRET = process.env.DOKU_SECRET_KEY

if (!CLIENT_ID || !SECRET) {
  console.error(
    "ENV MISSING: DOKU_CLIENT_ID or DOKU_SECRET_KEY not set in process.env"
  )
  process.exit(1)
}

// Use the same body that your app sends (copy from bodySample in your logs)
const payload = {
  card: { save: false },
  customer: {
    country: "ID",
    email: "contact@algoseabiz.com",
    id: "7f9067d0-6dd4-41aa-93e6-fa231cdab13f",
    name: "Uriah Davies",
  },
  order: {
    amount: 143000,
    auto_redirect: false,
    callback_url: "http://localhost:3000/api/payment/callback",
    descriptor: "Seo Packages",
    failed_url: "http://localhost:3000/payment/failed",
    invoice_number: "INV-2025-0002",
    line_items: [
      { name: "SEO", price: 120000, quantity: 1 },
      { name: "Webdev", price: 23000, quantity: 1 },
    ],
  },
  payment: { type: "SALE" },
}

// stable stringify (deterministic ordering) — match what server sends
function canonicalize(obj) {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(canonicalize)
  const keys = Object.keys(obj).sort()
  const out = {}
  for (const k of keys) out[k] = canonicalize(obj[k])
  return out
}
function stableStringify(obj) {
  return JSON.stringify(canonicalize(obj))
}

const requestId = process.argv[2] || "9676713e-46b3-428a-9d5e-cf9266e53845" // replace or pass as arg
const requestTimestamp =
  process.argv[3] || new Date().toISOString().replace(/\.\d{3}Z$/, "Z")

const bodyRaw = stableStringify(payload)

console.log("CLIENT_ID:", CLIENT_ID)
console.log("SECRET length:", SECRET.length)
console.log("requestId:", requestId)
console.log("requestTimestamp:", requestTimestamp)
console.log("bodyRaw len:", bodyRaw.length)
console.log("bodyRaw sample:", bodyRaw.slice(0, 400))
console.log("---")

function hmac(secretBuf, data) {
  return crypto.createHmac("sha256", secretBuf).update(data).digest("base64")
}

// Candidate keys
const candidates = [
  { name: "raw_utf8", key: Buffer.from(SECRET, "utf8") },
  { name: "trimmed_utf8", key: Buffer.from(SECRET.trim(), "utf8") },
]

// try base64 decode (if secret given base64)
try {
  const b = Buffer.from(SECRET, "base64")
  // only include if plausible (contains non-zero and length > 8)
  if (b.length > 0 && b.toString("base64") !== SECRET) {
    candidates.push({ name: "base64_decoded", key: b })
  }
} catch (e) {
  /* ignore */
}

// try hex decode (if secret maybe hex)
try {
  const h = Buffer.from(SECRET, "hex")
  if (h.length > 0) {
    candidates.push({ name: "hex_decoded", key: h })
  }
} catch (e) {
  /* ignore */
}

// show HMAC for a set of dataToSign options
const datas = [
  { name: "A", data: `${CLIENT_ID}${requestId}${requestTimestamp}${bodyRaw}` },
  { name: "B", data: `${CLIENT_ID}${requestId}${payload.order.amount}` },
  { name: "C", data: `${CLIENT_ID}${requestTimestamp}${requestId}${bodyRaw}` },
  { name: "D", data: `${requestId}${CLIENT_ID}${payload.order.amount}` },
]

for (const cand of candidates) {
  console.log("== candidate key:", cand.name, "keylen=", cand.key.length)
  datas.forEach((d) => {
    const sig = "HMACSHA256=" + hmac(cand.key, d.data)
    console.log("  ", d.name.padEnd(2), "len", d.data.length, "=>", sig)
  })
  console.log("---")
}

console.log(
  "\nCompare the printed signatures with the Signature header prefix you see in your server logs (first 12-16 chars after HMACSHA256=)."
)
console.log(
  "If one matches, that candidate is the correct key+composition. If none match, paste this full output here."
)
