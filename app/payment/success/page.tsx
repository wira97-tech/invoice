"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ArrowRight, Download, FileText, Home } from "lucide-react"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [invoiceNumber, setInvoiceNumber] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [paymentId, setPaymentId] = useState<string>("")

  useEffect(() => {
    // Extract payment details from URL parameters
    const invoice = searchParams.get("invoice")
    const paymentAmount = searchParams.get("amount")
    const sessionId = searchParams.get("session_id") || searchParams.get("doku_session_id")

    setInvoiceNumber(invoice || "")
    setAmount(paymentAmount || "")
    setPaymentId(sessionId || "")

    // If we have session ID but no invoice, try to get it from session storage or localStorage
    if (!invoice && sessionId) {
      const storedInvoice = sessionStorage.getItem('pending_payment_invoice') ||
                          localStorage.getItem('pending_payment_invoice')
      if (storedInvoice) {
        setInvoiceNumber(storedInvoice)
      }
    }

    // Simulate processing time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [searchParams])

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(num || 0)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-600 font-medium">Processing payment confirmation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Success Animation Card */}
        <Card className="mb-6 border-green-200 shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-800 mb-2">
              Payment Successful!
            </h1>
            <p className="text-green-600">
              Your payment has been processed successfully.
            </p>
          </CardContent>
        </Card>

        {/* Payment Details Card */}
        <Card className="border-green-200 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-green-800">Payment Details</CardTitle>
            <CardDescription>
              Transaction completed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoiceNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Number:</span>
                <span className="font-medium">#{invoiceNumber}</span>
              </div>
            )}

            {amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-bold text-green-600 text-lg">
                  {formatCurrency(amount)}
                </span>
              </div>
            )}

            {paymentId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-medium text-sm">{paymentId}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Payment Date:</span>
              <span className="font-medium">
                {new Date().toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Paid
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps Card */}
        <Card className="border-green-200 bg-green-50/50 mb-6">
          <CardHeader>
            <CardTitle className="text-green-800 text-lg">What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>Your invoice status has been updated to "Paid"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>A payment confirmation has been sent to your email</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>You can download your invoice receipt below</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link href="/invoices" className="w-full">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              Back to Invoices
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-50 flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>

            {invoiceNumber && (
              <Link href={`/invoices/${invoiceNumber}`}>
                <Button variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-50 flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  View Invoice
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-green-600">
            Need help?{" "}
            <Link href="#" className="underline hover:text-green-700">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}