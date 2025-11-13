export async function createDokuPayment(payload: any) {
  const res = await fetch("/api/create-doku-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error || "Failed to create DOKU payment")
  }
  return json
}
