// lib/doku-client.ts (client-side)
export type CreateDokuPayload = {
  order: {
    invoice_number: string
    amount: number | string
    [k: string]: any
  }
  [k: string]: any
}

export type CreateDokuResponse = {
  ok?: boolean
  data?: any
  payment_url?: string | null
  error?: string
  status?: number
  detail?: any
}

export async function createDokuPayment(
  payload: CreateDokuPayload
): Promise<CreateDokuResponse> {
  if (!payload?.order?.amount) {
    throw new Error("Missing order.amount")
  }
  const amount = Math.round(Number(payload.order.amount))
  if (!Number.isFinite(amount)) throw new Error("Invalid order.amount")

  const safePayload = {
    ...payload,
    order: { ...payload.order, amount },
  }

  const res = await fetch("/api/create-doku-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safePayload),
  })

  let json: any = null
  try {
    json = await res.json()
  } catch (e) {
    json = { _rawText: await res.text() }
  }

  if (!res.ok) {
    const detail = json?.detail ?? json?._rawText ?? json
    throw new Error(
      `DOKU create failed (status ${res.status}): ${JSON.stringify(detail)}`
    )
  }

  return json as CreateDokuResponse
}
