// app/api/create-doku-payment/route.ts
import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

type DokuPayload = any

const CONFIG = {
  clientId: (process.env.DOKU_CLIENT_ID || "").trim(),
  secretKey: (process.env.DOKU_SECRET_KEY || "").trim(),
  baseUrl:
    process.env.NODE_ENV === "production"
      ? "https://api.doku.com"
      : "https://api-sandbox.doku.com",
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

function newRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `req-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}
function utcIsoNoMs() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
}
function sha256Base64(raw: string) {
  return crypto.createHash("sha256").update(raw, "utf8").digest("base64")
}
function hmacSha256Base64(secret: string, data: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(data, "utf8")
    .digest("base64")
}
async function sendToDoku(
  url: string,
  headers: Record<string, string>,
  body: string
) {
  const resp = await fetch(url, { method: "POST", headers, body })
  const text = await resp.text().catch(() => "")
  return {
    ok: resp.ok,
    status: resp.status,
    text,
    headers: Object.fromEntries(resp.headers.entries()),
  }
}
function validatePayload(payload: DokuPayload) {
  const errors: string[] = []
  const order = payload?.order ?? {}
  if (!order.invoice_number || typeof order.invoice_number !== "string") {
    errors.push("order.invoice_number is required and must be a string")
  } else if (order.invoice_number.length > 64) {
    errors.push("order.invoice_number max length is 64")
  }
  const amount = Number(order.amount)
  if (
    !Number.isFinite(amount) ||
    Math.round(amount) !== amount ||
    amount <= 0
  ) {
    errors.push("order.amount must be a positive integer (IDR, no decimal)")
  }
  const customer = payload?.customer ?? {}
  if (!customer.email && !customer.phone) {
    errors.push("one of customer.email or customer.phone must be provided")
  }
  return { ok: errors.length === 0, errors }
}

export async function POST(request: Request) {
  if (!CONFIG.clientId || !CONFIG.secretKey) {
    console.error("[DOKU] missing credentials")
    return NextResponse.json(
      { error: "Missing DOKU credentials" },
      { status: 500 }
    )
  }

  let payload: DokuPayload
  try {
    payload = await request.json()
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { ok, errors } = validatePayload(payload)
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid payload", detail: errors },
      { status: 400 }
    )
  }

  const requestId = newRequestId()
  const requestTimestamp = utcIsoNoMs()
  const targetPath = "/credit-card/v1/payment-page"
  const invoiceNumber =
    (payload.order && payload.order.invoice_number) || `INV-${requestId}`

  const publicBase = (
    process.env.NGROK_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "")

  // ensure session_id (use requestId)
  const sessionId = requestId
  const forcedCallback = publicBase
    ? `${publicBase}/api/payment/callback`
    : `/api/payment/callback`

  // Point DOKU callbacks to our callback URL (for POST updates)
  // The GET handler will handle direct redirects to success/failed pages
  const callbackUrlParams = `invoice=${encodeURIComponent(invoiceNumber)}&requestId=${encodeURIComponent(requestId)}&session_id=${encodeURIComponent(sessionId)}`

  const successCallbackTarget = publicBase
    ? `${publicBase}/api/payment/callback?${callbackUrlParams}`
    : `/api/payment/callback?${callbackUrlParams}`

  const failedCallbackTarget = successCallbackTarget

  payload.additional_info = {
    ...(payload.additional_info || {}),
    override_notification_url:
      payload.additional_info?.override_notification_url || forcedCallback,
  }

  payload.order = {
    ...(payload.order || {}),
    invoice_number: invoiceNumber,
    session_id: sessionId,
    callback_url: forcedCallback,
    success_url: successCallbackTarget,
    failed_url: failedCallbackTarget,
    auto_redirect: payload.order?.auto_redirect ?? true,
  }

  const url = `${CONFIG.baseUrl}${targetPath}`
  const rawBody = JSON.stringify(payload)
  const digestValue = sha256Base64(rawBody)
  const componentSignature = [
    `Client-Id:${CONFIG.clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${requestTimestamp}`,
    `Request-Target:${targetPath}`,
    `Digest:${digestValue}`,
  ].join("\n")
  const signatureBase64 = hmacSha256Base64(CONFIG.secretKey, componentSignature)
  const signatureHeader = `HMACSHA256=${signatureBase64}`

  console.error("[DOKU DEBUG] create request", {
    requestId,
    sessionId,
    invoiceNumber,
    callback_url: payload.order.callback_url,
    success_url: payload.order.success_url,
    failed_url: payload.order.failed_url,
    bodyPreview: rawBody.slice(0, 800),
    signaturePreview: signatureHeader.slice(0, 48) + "...",
  })

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Client-Id": CONFIG.clientId,
    "Request-Id": requestId,
    "Request-Timestamp": requestTimestamp,
    Signature: signatureHeader,
  }

  try {
    const res = await sendToDoku(url, headers, rawBody)
    console.error("[DOKU RESPONSE STATUS]:", res.status)
    console.error("[DOKU RESPONSE BODY]:", res.text)

    let parsed: any
    try {
      parsed = JSON.parse(res.text)
    } catch {
      parsed = res.text
    }

    const paymentUrl =
      parsed?.credit_card_payment_page?.url ||
      parsed?.session?.url ||
      parsed?.payment_url ||
      (typeof parsed === "string" && parsed.includes("http") ? parsed : null)

    try {
      if (supabase) {
        await supabase.from("payments").insert([
          {
            invoice_number: invoiceNumber,
            request_id: requestId,
            session_id: sessionId,
            amount: payload.order?.amount || null,
            payment_url: paymentUrl,
            status: res.ok ? "PENDING" : "ERROR",
            meta: parsed,
            created_at: new Date().toISOString(),
          },
        ])
        console.info("[CREATE PAYMENT] saved payments record to Supabase")
      } else {
        console.warn("[CREATE PAYMENT] Supabase not configured - skipping save")
      }
    } catch (saveErr: any) {
      console.error("[CREATE PAYMENT] failed saving payments:", String(saveErr))
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "DOKU API error", status: res.status, detail: parsed },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { ok: true, data: parsed, payment_url: paymentUrl },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[DOKU FETCH ERROR]:", String(err))
    return NextResponse.json(
      { error: "Fetch Error", detail: String(err) },
      { status: 502 }
    )
  }
}
