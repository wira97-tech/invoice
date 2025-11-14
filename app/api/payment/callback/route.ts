// app/api/payment/callback/route.ts
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

function getHdr(h: Headers, name: string) {
  return (
    h.get(name) ||
    h.get(name.toLowerCase()) ||
    h.get(name.toUpperCase()) ||
    null
  )
}

function verifyDokuSignature(
  rawBody: string,
  headers: Headers,
  secretKey: string,
  requestTarget: string
) {
  try {
    const clientId = getHdr(headers, "Client-Id") || ""
    const requestId = getHdr(headers, "Request-Id") || ""
    const requestTimestamp = getHdr(headers, "Request-Timestamp") || ""
    const signature = getHdr(headers, "Signature") || ""

    if (!clientId || !requestId || !requestTimestamp || !signature) {
      return { ok: false, reason: "missing-headers" }
    }

    const digest = crypto
      .createHash("sha256")
      .update(rawBody, "utf8")
      .digest("base64")
    const component = [
      `Client-Id:${clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${requestTimestamp}`,
      `Request-Target:${requestTarget}`,
      `Digest:${digest}`,
    ].join("\n")

    const expected = crypto
      .createHmac("sha256", secretKey)
      .update(component, "utf8")
      .digest("base64")
    const expectedHeader = `HMACSHA256=${expected}`

    const a = Buffer.from(expectedHeader, "utf8")
    const b = Buffer.from(signature, "utf8")
    if (a.length !== b.length)
      return { ok: false, reason: "signature-length-mismatch" }
    const ok = crypto.timingSafeEqual(a, b)
    return { ok, reason: ok ? undefined : "signature-mismatch" }
  } catch (err: any) {
    return { ok: false, reason: String(err) }
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname
  const rawBody = await request.text().catch(() => "")
  let data: any = null
  try {
    data = JSON.parse(rawBody)
  } catch (e) {
    data = null
  }

  const headersPreview = {
    clientId: getHdr(request.headers, "Client-Id"),
    requestIdHeader: getHdr(request.headers, "Request-Id"),
    requestTimestamp: getHdr(request.headers, "Request-Timestamp"),
    signaturePresent: !!getHdr(request.headers, "Signature"),
    allHeaders: Array.from(request.headers.entries()).slice(0, 50),
  }

  console.info("[DOKU CALLBACK] incoming request path:", path)
  console.info("[DOKU CALLBACK] headers-preview:", headersPreview)
  console.info("[DOKU CALLBACK] raw-body-first-4k:", rawBody.slice(0, 4096))

  // persist raw callback
  try {
    if (supabase) {
      await supabase.from("doku_callbacks").insert([
        {
          invoice_number: data?.order?.invoice_number || null,
          request_id:
            getHdr(request.headers, "Request-Id") ||
            getHdr(request.headers, "request-id") ||
            data?.transaction?.original_request_id ||
            null,
          status: data?.transaction?.status || null,
          doku_payload: data,
          created_at: new Date().toISOString(),
        },
      ])
      console.info("[DOKU CALLBACK] persisted raw callback to doku_callbacks")
    } else {
      console.warn("[DOKU CALLBACK] supabase not configured - skipping persist")
    }
  } catch (persistErr: any) {
    console.error(
      "[DOKU CALLBACK] failed to persist callback:",
      String(persistErr)
    )
  }

  // verify signature in prod (skip in development)
  try {
    if (process.env.NODE_ENV !== "development" && process.env.DOKU_SECRET_KEY) {
      const v = verifyDokuSignature(
        rawBody,
        request.headers,
        process.env.DOKU_SECRET_KEY,
        path
      )
      if (!v.ok) {
        console.error(
          "[DOKU CALLBACK] signature verification failed:",
          v.reason
        )
      } else {
        console.info("[DOKU CALLBACK] signature valid")
      }
    } else {
      console.warn(
        "[DOKU CALLBACK] dev mode or no DOKU_SECRET_KEY - signature check skipped"
      )
    }
  } catch (vErr: any) {
    console.error("[DOKU CALLBACK] signature verify error:", String(vErr))
  }

  // update payments & invoices (best-effort)
  try {
    if (!supabase) throw new Error("Supabase not configured")

    const invoiceNumber = (data?.order?.invoice_number || "").toString()
    const txnStatus = (data?.transaction?.status || "").toString().toUpperCase()
    const originalRequestIdInBody =
      data?.transaction?.original_request_id || null
    const requestIdHeader = getHdr(request.headers, "Request-Id") || null
    const matchRequestId = originalRequestIdInBody || requestIdHeader

    console.info("[DOKU CALLBACK POST] Processing payment update:", {
      invoiceNumber,
      txnStatus,
      originalRequestIdInBody,
      requestIdHeader,
      matchRequestId
    })

    // find payments row by request_id or invoice_number
    let paymentRow: any = null
    if (matchRequestId) {
      const { data: foundByReq } = await supabase
        .from("payments")
        .select("*")
        .eq("request_id", matchRequestId)
        .limit(1)
      if (foundByReq && (foundByReq as any[]).length > 0)
        paymentRow = (foundByReq as any[])[0]
    }
    if (!paymentRow && invoiceNumber) {
      const { data: foundByInv } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_number", invoiceNumber)
        .order("created_at", { ascending: false })
        .limit(1)
      if (foundByInv && (foundByInv as any[]).length > 0)
        paymentRow = (foundByInv as any[])[0]
    }

    if (paymentRow) {
      const updatePayload: any = {
        status: txnStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
        updated_at: new Date().toISOString(),
      }
      if (data?.card_payment?.response_code)
        updatePayload.response_code = data.card_payment.response_code
      if (data?.card_payment?.response_message)
        updatePayload.response_message = data.card_payment.response_message
      updatePayload.meta = { ...(paymentRow.meta || {}), doku_callback: data }
      const { error: updateError } = await supabase
        .from("payments")
        .update(updatePayload)
        .eq("id", paymentRow.id)

      if (updateError) {
        console.error("[DOKU CALLBACK POST] Error updating payment:", updateError)
      } else {
        console.info("[DOKU CALLBACK POST] ✅ Successfully updated payment:", {
          id: paymentRow.id,
          newStatus: updatePayload.status,
          invoiceNumber
        })
      }
    } else {
      console.info(
        "[DOKU CALLBACK] no payments row matched (leave doku_callbacks for recon)"
      )
    }

    // update invoices table if present
    if (invoiceNumber) {
      const { data: invFound } = await supabase
        .from("invoices")
        .select("id,invoice_number,status")
        .eq("invoice_number", invoiceNumber)
        .limit(1)
      if (invFound && (invFound as any[]).length > 0) {
        let mappedInvoiceStatus = "Pending"
        if (
          ["SUCCESS", "PAID", "COMPLETED", "SUCCESSFUL"].includes(txnStatus)
        ) {
          mappedInvoiceStatus = "Paid"
        } else if (["FAILED", "CANCELLED", "REJECTED"].includes(txnStatus)) {
          mappedInvoiceStatus = "Cancelled"
        }
        const invUpdate: any = {
          status: mappedInvoiceStatus,
          updated_at: new Date().toISOString(),
        }
        if (mappedInvoiceStatus === "Paid" && data?.transaction?.date) {
          invUpdate.paid_at = new Date(data.transaction.date).toISOString()
        }
        await supabase
          .from("invoices")
          .update(invUpdate)
          .eq("invoice_number", invoiceNumber)
        console.info(
          `[DOKU CALLBACK] invoice ${invoiceNumber} updated -> ${mappedInvoiceStatus}`
        )
      } else {
        console.warn(
          "[DOKU CALLBACK] invoice not found during callback update:",
          invoiceNumber
        )
      }
    }
  } catch (dbErr: any) {
    console.error(
      "[DOKU CALLBACK] DB processing error (non-fatal):",
      String(dbErr)
    )
  }

  // ACK DOKU
  return new Response("CONTINUE", { status: 200 })
}

// GET handler (browser redirect) — use callback data for direct redirect
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const invoiceNumber =
      url.searchParams.get("invoice") ||
      url.searchParams.get("invoiceNumber") ||
      url.searchParams.get("invoice_number") ||
      ""
    const requestId =
      url.searchParams.get("requestId") ||
      url.searchParams.get("request_id") ||
      url.searchParams.get("request-id") ||
      ""
    const sessionId =
      url.searchParams.get("session_id") ||
      url.searchParams.get("sessionId") ||
      ""

    console.info("[DOKU CALLBACK GET] 📋 Full redirect analysis:", {
      fullUrl: request.url,
      invoiceNumber,
      requestId,
      sessionId,
      allParams: Object.fromEntries(url.searchParams.entries()),
      paramCount: url.searchParams.size,
      hasInvoice: !!invoiceNumber,
      hasRequestId: !!requestId,
      hasSessionId: !!sessionId
    })

    // Get the base URL from the current request or environment variables
    const requestUrl = new URL(request.url)
    const frontendBase = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NGROK_URL ||
      `${requestUrl.protocol}//${requestUrl.host}`
    ).replace(/\/$/, "")

    console.info("[DOKU CALLBACK GET] Using frontend base:", frontendBase)

    // Look for recent callback data in doku_callbacks table
    let callbackData = null
    if (supabase && (requestId || invoiceNumber)) {
      console.log("[DOKU CALLBACK GET] Looking for recent callback data...")

      try {
        // First try by request_id (most reliable)
        if (requestId) {
          const { data: callbackByReq } = await supabase
            .from("doku_callbacks")
            .select("doku_payload, created_at")
            .eq("request_id", requestId)
            .order("created_at", { ascending: false })
            .limit(1)

          if (callbackByReq && callbackByReq.length > 0) {
            callbackData = callbackByReq[0].doku_payload
            console.log("[DOKU CALLBACK GET] ✅ Found callback by request_id")
          }
        }

        // Fallback to invoice_number search
        if (!callbackData && invoiceNumber) {
          const { data: callbackByInv } = await supabase
            .from("doku_callbacks")
            .select("doku_payload, created_at")
            .eq("invoice_number", invoiceNumber)
            .order("created_at", { ascending: false })
            .limit(1)

          if (callbackByInv && callbackByInv.length > 0) {
            callbackData = callbackByInv[0].doku_payload
            console.log("[DOKU CALLBACK GET] ✅ Found callback by invoice_number")
          }
        }
      } catch (err) {
        console.error("[DOKU CALLBACK GET] Error looking up callback data:", err)
      }
    }

    let paymentStatus = null
    let paymentAmount = null

    // Use callback data to determine status
    if (callbackData && callbackData.transaction) {
      paymentStatus = callbackData.transaction.status?.toUpperCase()
      paymentAmount = callbackData.order?.amount

      console.info("[DOKU CALLBACK GET] 📄 Using callback data for redirect:", {
        invoiceNumber: callbackData.order?.invoice_number,
        status: paymentStatus,
        amount: paymentAmount,
        responseCode: callbackData.card_payment?.response_code,
        responseMessage: callbackData.card_payment?.response_message
      })

      // Direct redirect based on callback status
      if (paymentStatus === "SUCCESS") {
        const successUrl = `${frontendBase}/payment/success?invoice=${encodeURIComponent(callbackData.order?.invoice_number || invoiceNumber)}&amount=${encodeURIComponent(paymentAmount || "")}&session_id=${encodeURIComponent(sessionId)}`

        console.info("[DOKU CALLBACK GET] 🎉 Direct redirect to success:", successUrl)

        const response = NextResponse.redirect(successUrl, 302)
        response.headers.set('Location', successUrl)
        return response
      }

      if (["FAILED", "CANCELLED", "REJECTED"].includes(paymentStatus)) {
        const failedUrl = `${frontendBase}/payment/failed?invoice=${encodeURIComponent(callbackData.order?.invoice_number || invoiceNumber)}&amount=${encodeURIComponent(paymentAmount || "")}&session_id=${encodeURIComponent(sessionId)}`

        console.info("[DOKU CALLBACK GET] ❌ Direct redirect to failed:", failedUrl)

        const response = NextResponse.redirect(failedUrl, 302)
        response.headers.set('Location', failedUrl)
        return response
      }
    }

    // Fallback: Try database lookup if no callback data found
    if (supabase && !callbackData) {
      console.log("[DOKU CALLBACK GET] No callback data, trying database lookup...")

      let paymentRow = null
      const maxAttempts = 3 // Reduced attempts since callback data should be primary

      for (let i = 0; i < maxAttempts; i++) {
        if (requestId) {
          const { data: byReq } = await supabase
            .from("payments")
            .select("*")
            .eq("request_id", requestId)
            .limit(1)

          if (byReq && byReq.length > 0) {
            paymentRow = byReq[0]
            break
          }
        }

        if (invoiceNumber && !paymentRow) {
          const { data: byInv } = await supabase
            .from("payments")
            .select("*")
            .eq("invoice_number", invoiceNumber)
            .order("created_at", { ascending: false })
            .limit(1)

          if (byInv && byInv.length > 0) {
            paymentRow = byInv[0]
            break
          }
        }

        if (paymentRow) break
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      if (paymentRow) {
        const txnStatus = (paymentRow.status || "").toString().toUpperCase()
        console.log("[DOKU CALLBACK GET] Using database status:", txnStatus)

        if (["SUCCESS", "PAID", "COMPLETED", "SUCCESSFUL"].includes(txnStatus)) {
          const successUrl = `${frontendBase}/payment/success?invoice=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(paymentRow.amount || "")}&session_id=${encodeURIComponent(sessionId)}`

          console.info("[DOKU CALLBACK GET] ✅ Database redirect to success:", successUrl)
          return NextResponse.redirect(successUrl)
        }
      }
    }

    // If no parameters at all, check for most recent callback data as last resort
    if (!invoiceNumber && !requestId && !sessionId) {
      console.log("[DOKU CALLBACK GET] No parameters, checking for most recent callback...")

      try {
        const { data: recentCallback } = await supabase
          .from("doku_callbacks")
          .select("doku_payload, created_at")
          .order("created_at", { ascending: false })
          .limit(1)

        if (recentCallback && recentCallback.length > 0) {
          const callbackData = recentCallback[0].doku_payload
          const paymentStatus = callbackData.transaction?.status?.toUpperCase()
          const callbackInvoice = callbackData.order?.invoice_number
          const callbackAmount = callbackData.order?.amount

          console.log("[DOKU CALLBACK GET] 📄 Using most recent callback:", {
            invoice: callbackInvoice,
            status: paymentStatus,
            amount: callbackAmount
          })

          if (paymentStatus === "SUCCESS") {
            const successUrl = `${frontendBase}/payment/success?invoice=${encodeURIComponent(callbackInvoice || "")}&amount=${encodeURIComponent(callbackAmount || "")}&session_id=`

            console.info("[DOKU CALLBACK GET] 🎉 Final fallback redirect to success:", successUrl)
            return NextResponse.redirect(successUrl, 302)
          }
        }
      } catch (err) {
        console.error("[DOKU CALLBACK GET] Error getting recent callback:", err)
      }
    }

    // Default fallback to pending
    console.warn("[DOKU CALLBACK GET] ⏳ No success data found, redirecting to pending")
    const pendingUrl = `${frontendBase}/payment/pending?invoice=${encodeURIComponent(invoiceNumber)}&session_id=${encodeURIComponent(sessionId)}`

    const response = NextResponse.redirect(pendingUrl, 302)
    response.headers.set('Location', pendingUrl)
    return response

  } catch (err: any) {
    console.error("[DOKU CALLBACK GET] Error in redirect:", String(err))
    const requestUrl = new URL(request.url)
    const frontendBase = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NGROK_URL ||
      `${requestUrl.protocol}//${requestUrl.host}`
    ).replace(/\/$/, "")
    const fallback = `${frontendBase}/payment/pending`
    return NextResponse.redirect(fallback)
  }
}
