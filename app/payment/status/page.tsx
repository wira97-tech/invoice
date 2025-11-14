"use client"

import React, { JSX, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

type StatusResponse = {
  status?: string
  amount?: number
  payment_url?: string | null
  response_code?: string | null
  response_message?: string | null
  meta?: any
  source?: string
}

export default function PaymentStatusPage(): JSX.Element {
  const sp = useSearchParams()
  const router = useRouter()

  const invoice = sp.get("invoice") || ""
  const requestId = sp.get("requestId") || ""
  const amount = sp.get("amount") || ""

  const [status, setStatus] = useState<string | null>(null)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let cancelled = false
    const maxTries = 30
    const intervalMs = 2000

    async function check() {
      if (cancelled) return
      try {
        const q = new URLSearchParams()
        if (invoice) q.set("invoice", invoice)
        if (requestId) q.set("requestId", requestId)
        const res = await fetch(
          `/api/internal/payment-status?${q.toString()}`,
          { cache: "no-store" }
        )
        const j: StatusResponse = await res.json()
        if (j && j.status) {
          const s = (j.status || "").toString().toUpperCase()
          if (
            ["SUCCESS", "PAID", "COMPLETED", "SUCCESSFUL"].includes(s) ||
            s === "SUCCESS" ||
            j.status === "Paid"
          ) {
            setStatus("SUCCESS")
            setMeta(j)
            setLoading(false)
            const forward = invoice
              ? `/payment/success?invoice=${encodeURIComponent(
                  invoice
                )}&amount=${encodeURIComponent(j.amount || amount)}`
              : "/payment/success"
            setTimeout(() => router.push(forward), 700)
            return
          }
          if (
            ["FAILED", "CANCELLED", "REJECTED"].includes(s) ||
            s === "FAILED"
          ) {
            setStatus("FAILED")
            setMeta(j)
            setLoading(false)
            const forward = invoice
              ? `/payment/failed?invoice=${encodeURIComponent(
                  invoice
                )}&amount=${encodeURIComponent(j.amount || amount)}`
              : "/payment/failed"
            setTimeout(() => router.push(forward), 700)
            return
          }
          setStatus("PENDING")
          setMeta(j)
        } else if (j && (j as any).status === "NOT_FOUND") {
          setStatus("NOT_FOUND")
        } else {
          setStatus("NOT_FOUND")
        }
      } catch (e) {
        console.error("poll error", e)
      } finally {
        setTries((t) => t + 1)
        setLoading(false)
      }
    }

    check()
    const id = setInterval(() => {
      if (cancelled) return
      if (tries >= maxTries) {
        clearInterval(id)
        return
      }
      check()
    }, intervalMs)

    return () => {
      cancelled = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, requestId, tries])

  return (
    <div className="container mx-auto py-12 px-4 max-w-xl text-center">
      <h1 className="text-2xl font-bold mb-4">Payment Status</h1>

      {loading && (
        <div>
          <p className="mb-2">Checking payment status...</p>
          <div className="mb-4">⏳</div>
        </div>
      )}

      {!loading && status === "PENDING" && (
        <div>
          <p className="mb-2">
            Your payment is being processed. This page will update
            automatically.
          </p>
          <p className="text-sm text-gray-600">Invoice: {invoice || "—"}</p>
        </div>
      )}

      {!loading && status === "NOT_FOUND" && (
        <div>
          <p className="mb-2 text-red-600">Payment not found yet.</p>
          <p className="text-sm text-gray-600">
            If you just completed payment, wait a few seconds then refresh.
          </p>
        </div>
      )}

      {!loading && (status === "SUCCESS" || status === "FAILED") && (
        <div>
          <p
            className={`mb-2 ${
              status === "SUCCESS" ? "text-green-600" : "text-red-600"
            }`}
          >
            {status === "SUCCESS" ? "Payment successful" : "Payment failed"}
          </p>
          <pre className="text-left text-xs bg-gray-50 p-3 rounded">
            {JSON.stringify(meta || {}, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 border rounded"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
