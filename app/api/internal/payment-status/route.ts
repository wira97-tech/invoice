// app/api/internal/payment-status/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

async function findPayment({
  requestId,
  invoice,
  sessionId,
}: {
  requestId?: string
  invoice?: string
  sessionId?: string
}) {
  if (!supabase) throw new Error("Supabase not configured")

  // Try by request_id first
  if (requestId) {
    const { data: byReq, error: e1 } = await supabase
      .from("payments")
      .select("*")
      .eq("request_id", requestId)
      .limit(1)
    if (e1) throw e1
    if (byReq && byReq.length > 0) return byReq[0]
  }

  // Then by invoice_number
  if (invoice) {
    const { data: byInv, error: e2 } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_number", invoice)
      .order("created_at", { ascending: false })
      .limit(1)
    if (e2) throw e2
    if (byInv && byInv.length > 0) return byInv[0]
  }

  // Then by session_id
  if (sessionId) {
    const { data: bySess, error: e3 } = await supabase
      .from("payments")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
    if (e3) throw e3
    if (bySess && bySess.length > 0) return bySess[0]
  }

  return null
}

// GET /api/internal/payment-status?invoice=...&requestId=...&session_id=...
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const invoice =
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

    if (!supabase) {
      console.error("[INTERNAL PAYMENT STATUS] Supabase not configured")
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      )
    }

    if (!invoice && !requestId && !sessionId) {
      return NextResponse.json(
        { error: "Provide at least one of invoice/requestId/session_id" },
        { status: 400 }
      )
    }

    const row = await findPayment({ requestId, invoice, sessionId })
    if (!row) {
      return NextResponse.json({ ok: false, found: false }, { status: 404 })
    }

    // Normalize returned status (optional)
    const status = (row.status || "").toString()

    return NextResponse.json(
      {
        ok: true,
        found: true,
        status,
        payment: row,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[INTERNAL PAYMENT STATUS] error:", String(err))
    return NextResponse.json(
      { error: "Internal error", detail: String(err) },
      { status: 500 }
    )
  }
}

// POST /api/internal/payment-status  with JSON { invoice, requestId, session_id }
export async function POST(request: Request) {
  try {
    if (!supabase) {
      console.error("[INTERNAL PAYMENT STATUS] Supabase not configured")
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const invoice = (body.invoice || body.invoice_number || "").toString()
    const requestId = (body.requestId || body.request_id || "").toString()
    const sessionId = (body.session_id || body.sessionId || "").toString()

    if (!invoice && !requestId && !sessionId) {
      return NextResponse.json(
        {
          error: "Provide at least one of invoice/requestId/session_id in body",
        },
        { status: 400 }
      )
    }

    const row = await findPayment({ requestId, invoice, sessionId })
    if (!row)
      return NextResponse.json({ ok: false, found: false }, { status: 404 })

    const status = (row.status || "").toString()
    return NextResponse.json(
      { ok: true, found: true, status, payment: row },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[INTERNAL PAYMENT STATUS] POST error:", String(err))
    return NextResponse.json(
      { error: "Internal error", detail: String(err) },
      { status: 500 }
    )
  }
}

// Optional: return 405 for other methods (Next will do that automatically when no handler exists,
// but we can be explicit if you want to handle others)
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 })
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 })
}
