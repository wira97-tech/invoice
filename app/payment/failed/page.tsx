"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw, ArrowRight, CreditCard, Home, HelpCircle } from "lucide-react"

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [invoiceNumber, setInvoiceNumber] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [errorCode, setErrorCode] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    // Extract payment details from URL parameters
    const invoice = searchParams.get("invoice")
    const paymentAmount = searchParams.get("amount")
    const code = searchParams.get("error_code")
    const message = searchParams.get("error_message")

    setInvoiceNumber(invoice || "")
    setAmount(paymentAmount || "")
    setErrorCode(code || "PAYMENT_FAILED")
    setErrorMessage(message || "Payment could not be processed")

    // Simulate processing time
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

  const getErrorDescription = (code: string) => {
    switch (code) {
      case "PAYMENT_FAILED":
        return "The payment was declined by your bank or payment provider."
      case "INSUFFICIENT_FUNDS":
        return "Your account has insufficient funds to complete this transaction."
      case "CARD_DECLINED":
        return "Your card was declined. Please check your card details or try another card."
      case "EXPIRED_CARD":
        return "Your card has expired. Please use a different card."
      case "INVALID_CVV":
        return "The CVV code you entered is incorrect."
      case "TIMEOUT":
        return "The payment session has expired. Please try again."
      case "FRAUD_DETECTED":
        return "Transaction flagged for potential fraud. Please contact your bank."
      default:
        return "An unexpected error occurred during payment processing."
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-red-600 font-medium">Processing payment status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Error Animation Card */}
        <Card className="mb-6 border-red-200 shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-800 mb-2">
              Payment Failed
            </h1>
            <p className="text-red-600">
              We couldn't process your payment. Please try again.
            </p>
          </CardContent>
        </Card>

        {/* Error Details Card */}
        <Card className="border-red-200 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-red-800">Error Details</CardTitle>
            <CardDescription>
              Information about the failed transaction
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
                <span className="text-gray-600">Attempted Amount:</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Error Code:</span>
              <span className="font-medium text-red-600">{errorCode}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Error Message:</span>
              <span className="font-medium text-sm text-red-600">{errorMessage}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Failed At:</span>
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
          </CardContent>
        </Card>

        {/* Error Description Card */}
        <Card className="border-red-200 bg-red-50/50 mb-6">
          <CardHeader>
            <CardTitle className="text-red-800 text-lg">What Happened?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-4">
              {getErrorDescription(errorCode)}
            </p>
            <div className="bg-white rounded-lg p-3 border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Suggested Solutions:</h4>
              <ul className="space-y-1 text-sm text-red-700">
                <li>• Check your card details and try again</li>
                <li>• Ensure you have sufficient funds</li>
                <li>• Try a different payment method</li>
                <li>• Contact your bank if the problem persists</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => invoiceNumber ? router.push(`/invoices/${invoiceNumber}`) : router.push('/invoices')}
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Payment Again
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/invoices">
              <Button variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                All Invoices
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </div>

          <div className="w-full">
            <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              Use Different Payment Method
            </Button>
          </div>
        </div>

        {/* Help Section */}
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Need Assistance?</p>
                <p className="text-red-700">
                  If the problem continues, please contact our support team for help with your payment.
                </p>
                <div className="mt-2">
                  <Link href="#" className="text-red-600 underline hover:text-red-700 text-sm">
                    Contact Support →
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}