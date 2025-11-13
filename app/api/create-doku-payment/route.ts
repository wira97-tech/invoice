// app/api/create-doku-payment/route.ts — use signature = clientId + requestId + amount
import { NextResponse } from "next/server"
import crypto from "crypto"

type DokuPayload = any

const PAYMENT_CONFIG = {
  clientId: process.env.DOKU_CLIENT_ID || "",
  secretKey: process.env.DOKU_SECRET_KEY || "",
  baseUrl:
    process.env.NODE_ENV === "production"
      ? "https://api.doku.com"
      : "https://api-sandbox.doku.com",
}

function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(canonicalize)
  const sorted = Object.keys(obj).sort()
  const out: any = {}
  for (const k of sorted) out[k] = canonicalize(obj[k])
  return out
}
function stableStringify(obj: any): string {
  return JSON.stringify(canonicalize(obj))
}
function generateRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `req-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}
function utcIsoNoMs(d = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z")
}
function hmacBase64(secret: string, data: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64")
}

// Signature B: clientId + requestId + amount
function signatureB(
  clientId: string,
  requestId: string,
  amount: number,
  secret: string
) {
  const dataToSign = `${clientId}${requestId}${amount}`
  return `HMACSHA256=${hmacBase64(secret, dataToSign)}`
}

export async function POST(request: Request) {
  if (!PAYMENT_CONFIG.clientId || !PAYMENT_CONFIG.secretKey) {
    console.error("[DOKU] missing env", {
      DOKU_CLIENT_ID: !!process.env.DOKU_CLIENT_ID,
      DOKU_SECRET_KEY: !!process.env.DOKU_SECRET_KEY,
    })
    return NextResponse.json(
      { error: "DOKU credentials not configured" },
      { status: 500 }
    )
  }

  let payload: DokuPayload
  try {
    payload = await request.json()
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (
    !payload?.order?.invoice_number ||
    typeof payload.order.amount !== "number"
  ) {
    return NextResponse.json(
      { error: "Missing order.invoice_number or order.amount" },
      { status: 400 }
    )
  }

  const url = `${PAYMENT_CONFIG.baseUrl}/credit-card/v1/payment-page`
  const requestId = generateRequestId() // unique per request — important to avoid double_request
  const requestTimestamp = utcIsoNoMs()
  const bodyRaw = stableStringify(payload)

  // compute signature using amount composition (B)
  const sig = signatureB(
    PAYMENT_CONFIG.clientId,
    requestId,
    payload.order.amount,
    PAYMENT_CONFIG.secretKey
  )

  const headers = {
    "Content-Type": "application/json",
    "Client-Id": PAYMENT_CONFIG.clientId,
    "Request-Id": requestId,
    "Request-Timestamp": requestTimestamp,
    Signature: sig,
  }

  console.error(
    "[DOKU OUTGOING] using signature B (clientId+requestId+amount)",
    {
      requestId,
      requestTimestamp,
      sigPrefix: sig.slice(0, 20) + "...",
      bodySample:
        bodyRaw.length > 800 ? bodyRaw.slice(0, 800) + "..." : bodyRaw,
    }
  )

  try {
    const apiRes = await fetch(url, { method: "POST", headers, body: bodyRaw })
    const text = await apiRes.text()
    console.error("[DOKU RESPONSE]", { status: apiRes.status, text })

    if (!apiRes.ok) {
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }
      return NextResponse.json(
        { error: "DOKU API error", status: apiRes.status, detail: parsed },
        { status: 502 }
      )
    }

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    const paymentUrl = data?.session?.url || data?.payment_url || null
    return NextResponse.json(
      { ok: true, data, payment_url: paymentUrl },
      { status: 200 }
    )
  } catch (fetchErr: any) {
    console.error("[DOKU FETCH ERROR]", String(fetchErr))
    return NextResponse.json(
      { error: "DOKU fetch failure", detail: String(fetchErr) },
      { status: 502 }
    )
  }
}
