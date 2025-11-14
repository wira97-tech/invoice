"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Download,
  Calendar,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Lock,
} from "lucide-react"
import {
  getInvoice,
  formatCurrency,
  type InvoiceWithClient,
  type InvoiceItem,
} from "@/lib/database"
import { COMPANY_INFO } from "@/lib/company-config"
import {
  createPayment,
  type PaymentRequest,
  type PaymentResponse,
} from "@/lib/payment-config"
import { createDokuPayment } from "@/lib/doku-client"

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceWithClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  useEffect(() => {
    if (params?.slug) {
      loadInvoice(params.slug as string)
    }
  }, [params?.slug])

  const loadInvoice = async (id: string) => {
    try {
      setIsLoading(true)
      const data = await getInvoice(id)
      setInvoice(data)
    } catch (error: any) {
      console.error("Error loading invoice:", error)
      setError(error.message || "Failed to load invoice")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrintPDF = () => {
    if (!invoice) return

    // Create print styles
    const printStyles = document.createElement('style')
    printStyles.textContent = `
      @media print {
        /* Hide screen-only elements */
        .container.mx-auto.py-8.px-4.max-w-6xl > div:first-child {
          display: none !important;
        }

        .container.mx-auto.py-8.px-4.max-w-6xl > div:last-child {
          display: none !important;
        }

        /* Hide payment dialog */
        .fixed.inset-0 {
          display: none !important;
        }

        /* Remove shadows and adjust borders */
        .shadow-lg {
          box-shadow: none !important;
        }

        /* Ensure proper spacing and layout */
        .bg-white.rounded-lg.shadow-lg.border.p-8 {
          box-shadow: none !important;
          border: 1px solid #e5e7eb !important;
          page-break-inside: avoid;
          margin: 0 !important;
          max-width: 100% !important;
        }

        /* Force colors to print */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Table styling */
        table {
          border-collapse: collapse !important;
          width: 100% !important;
        }

        th, td {
          border: 1px solid #e5e7eb !important;
          padding: 12px !important;
        }

        th {
          background-color: #f9fafb !important;
          font-weight: 600 !important;
        }

        /* Ensure colors are preserved */
        .bg-orange-500 {
          background-color: #f97316 !important;
          color: white !important;
        }

        .text-orange-500 {
          color: #f97316 !important;
        }

        .text-orange-600 {
          color: #ea580c !important;
        }

        .bg-green-100 {
          background-color: #dcfce7 !important;
          color: #166534 !important;
        }

        .bg-orange-100 {
          background-color: #fed7aa !important;
          color: #9a3412 !important;
        }

        .bg-red-100 {
          background-color: #fee2e2 !important;
          color: #991b1b !important;
        }

        .bg-gray-100 {
          background-color: #f3f4f6 !important;
          color: #374151 !important;
        }

        .bg-gray-50 {
          background-color: #f9fafb !important;
        }

        /* Remove hover effects */
        .hover\\:bg-gray-50:hover {
          background-color: inherit !important;
        }

        /* Page setup */
        @page {
          margin: 20mm;
          size: A4;
        }

        body {
          margin: 0;
          padding: 15px;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        }

        /* Prevent page breaks inside important elements */
        .bg-white.rounded-lg.shadow-lg.border.p-8,
        .border.rounded-lg.overflow-hidden,
        .card {
          page-break-inside: avoid;
        }

        /* Ensure Tailwind classes work in print */
        .grid {
          display: grid !important;
        }

        .grid-cols-1 {
          grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
        }

        .grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .flex {
          display: flex !important;
        }

        .items-center {
          align-items: center !important;
        }

        .justify-between {
          justify-content: space-between !important;
        }

        .justify-end {
          justify-content: flex-end !important;
        }

        .text-right {
          text-align: right !important;
        }

        .text-center {
          text-align: center !important;
        }

        .w-full {
          width: 100% !important;
        }

        .w-80 {
          width: 20rem !important;
        }

        .w-24 {
          width: 6rem !important;
        }

        .h-24 {
          height: 6rem !important;
        }

        .p-8 {
          padding: 2rem !important;
        }

        .p-6 {
          padding: 1.5rem !important;
        }

        .p-4 {
          padding: 1rem !important;
        }

        .px-6 {
          padding-left: 1.5rem !important;
          padding-right: 1.5rem !important;
        }

        .py-4 {
          padding-top: 1rem !important;
          padding-bottom: 1rem !important;
        }

        .mb-8 {
          margin-bottom: 2rem !important;
        }

        .mb-6 {
          margin-bottom: 1.5rem !important;
        }

        .mb-4 {
          margin-bottom: 1rem !important;
        }

        .mt-3 {
          margin-top: 0.75rem !important;
        }

        .gap-2 {
          gap: 0.5rem !important;
        }

        .gap-3 {
          gap: 0.75rem !important;
        }

        .gap-4 {
          gap: 1rem !important;
        }

        .gap-8 {
          gap: 2rem !important;
        }

        .text-3xl {
          font-size: 1.875rem !important;
          line-height: 2.25rem !important;
        }

        .text-2xl {
          font-size: 1.5rem !important;
          line-height: 2rem !important;
        }

        .text-lg {
          font-size: 1.125rem !important;
          line-height: 1.75rem !important;
        }

        .text-sm {
          font-size: 0.875rem !important;
          line-height: 1.25rem !important;
        }

        .font-bold {
          font-weight: 700 !important;
        }

        .font-medium {
          font-weight: 500 !important;
        }

        .font-semibold {
          font-weight: 600 !important;
        }

        .rounded-lg {
          border-radius: 0.5rem !important;
        }

        .border {
          border: 1px solid #e5e7eb !important;
        }

        .divide-y > :not([hidden]) ~ :not([hidden]) {
          border-top: 1px solid #e5e7eb !important;
        }
      }
    `

    // Add print styles to document head
    document.head.appendChild(printStyles)

    // Trigger print dialog
    window.print()

    // Remove print styles after print dialog closes (with a delay)
    setTimeout(() => {
      if (document.head.contains(printStyles)) {
        document.head.removeChild(printStyles)
      }
    }, 1000)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      Paid: {
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="w-4 h-4" />,
      },
      Pending: {
        color: "bg-orange-100 text-orange-800",
        icon: <Clock className="w-4 h-4" />,
      },
      Overdue: {
        color: "bg-red-100 text-red-800",
        icon: <AlertCircle className="w-4 h-4" />,
      },
      Draft: {
        color: "bg-gray-100 text-gray-800",
        icon: <AlertCircle className="w-4 h-4" />,
      },
    }

    const variant = variants[status] || variants["Draft"]

    return (
      <Badge className={variant.color}>
        <span className="flex items-center gap-1">
          {variant.icon}
          {status}
        </span>
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invoice Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {error || "The invoice you're looking for doesn't exist."}
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const clientData = invoice.client as any
  const subtotal =
    invoice.subtotal ||
    invoice.items?.reduce(
      (sum, item) =>
        sum + (item.total_price || item.unit_price * item.quantity),
      0
    ) ||
    0
  const taxAmount =
    invoice.tax_amount ||
    (invoice.tax_rate ? subtotal * (invoice.tax_rate / 100) : 0)
  const totalAmount = invoice.total_amount || subtotal + taxAmount

  const handlePayment = async () => {
    if (!invoice) return

    // Store invoice info in session storage for payment completion
    const invoiceNumber = invoice.invoice_number || `INV-${invoice.id}`
    sessionStorage.setItem('pending_payment_invoice', invoiceNumber)

    // Verify invoice exists in database before sending to DOKU
    try {
      console.log(`[PAYMENT] Verifying invoice ${invoiceNumber} exists in database...`)
      // We'll verify this on the server side to avoid client-side DB calls

      // Add a small delay to ensure database is ready (especially for newly created invoices)
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error("[PAYMENT] Error during pre-payment verification:", error)
      setError("Failed to verify invoice. Please try again.")
      return
    }

    try {
      const clientData = (invoice as any).client ?? {
        name: invoice.client_name || "Customer",
        email: invoice.client_email || "",
        phone: invoice.client_phone || "",
        address: invoice.client_address || "",
      }

      const subtotal =
        invoice.subtotal ??
        (invoice.items?.reduce(
          (s: number, it: any) =>
            s + (it.total_price ?? it.unit_price * it.quantity),
          0
        ) ||
          0)
      const taxAmount =
        invoice.tax_amount ??
        (invoice.tax_rate ? subtotal * (invoice.tax_rate / 100) : 0)
      const totalAmount = invoice.total_amount ?? subtotal + taxAmount

      const payload = {
        order: {
          invoice_number: invoice.invoice_number || `INV-${invoice.id}`,
          amount: Math.round(totalAmount), // ensure integer
          line_items:
            invoice.items?.map((it: any) => ({
              name: it.description,
              price: it.unit_price,
              quantity: it.quantity,
            })) || [],
          callback_url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/api/payment/callback`,
          success_url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/payment/success?invoice=${encodeURIComponent(invoice.invoice_number || `INV-${invoice.id}`)}&amount=${totalAmount}&session_id=`,
          failed_url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/payment/failed?invoice=${encodeURIComponent(invoice.invoice_number || `INV-${invoice.id}`)}&amount=${totalAmount}`,
          auto_redirect: true,
          descriptor: invoice.description?.slice(0, 20) || "Invoice Payment",
        },
        // card token optional; for card page usually not needed (DOKU will show card form)
        card: { save: false },
        customer: {
          id: invoice.client_id || `CUST-${invoice.id}`,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          country: "ID",
        },
        payment: {
          type: "SALE",
        },
        // optional override_configuration & additional_info — gunakan bila perlu
      }

      const result = await createDokuPayment(payload)

      const paymentUrl = result.payment_url || result.data?.session?.url
      if (!paymentUrl) throw new Error("Payment URL not returned by DOKU")

      // Redirect ke payment page untuk auto_redirect handling yang lebih baik
      window.location.href = paymentUrl
    } catch (error: any) {
      console.error("Payment error:", error)
      setError(error.message || "Failed to process payment")
    }
  }

  const showPaymentOptionsDialog = (paymentResponse: PaymentResponse) => {
    const cardOnly = {
      session_id: paymentResponse.session_id,
      payment_url: paymentResponse.payment_url,
      credit_card_enabled: paymentResponse.credit_card_enabled ?? true,
      card_payment_methods: Array.isArray(paymentResponse.card_payment_methods)
        ? paymentResponse.card_payment_methods
        : [],
      // kita intentionally omit installment_options, va_numbers, ewallet, dll.
    } as PaymentResponse

    setSelectedPayment(cardOnly)
    setShowPaymentOptions(true)
  }

  const handlePaymentMethodSelect = (url: string) => {
    if (url) {
      window.open(url, "_blank")
    } else {
      setError("Payment method not available")
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePrintPDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Print PDF
          </Button>

          {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
            <Button onClick={handlePayment} className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pay Now
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white rounded-lg shadow-lg border p-8">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8">
          {/* Company Info */}
          <div className="flex-1">
            <div className="w-24 h-24 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">ISI</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {COMPANY_INFO.name}
            </h1>
            <p className="text-gray-600">{COMPANY_INFO.address}</p>
            <p className="text-gray-600">
              {COMPANY_INFO.phone} | {COMPANY_INFO.email}
            </p>
            <p className="text-gray-600">{COMPANY_INFO.website}</p>
          </div>

          {/* Invoice Info */}
          <div className="text-right">
            <h2 className="text-3xl font-bold text-orange-500 mb-2">INVOICE</h2>
            <p className="text-xl text-gray-600 mb-4">
              #{invoice.invoice_number}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Issued:{" "}
                  {new Date(
                    invoice.issue_date || invoice.created_at || ""
                  ).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Due: {new Date(invoice.due_date).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="mt-3">
                {getStatusBadge(invoice.status || "Draft")}
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bill To Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Bill To
            </h3>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">
                {clientData?.name || invoice.client_name}
              </p>
              {clientData?.company && (
                <p className="text-gray-600 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {clientData.company}
                </p>
              )}
              {clientData?.email && (
                <p className="text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {clientData.email}
                </p>
              )}
              {clientData?.phone && (
                <p className="text-gray-600 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {clientData.phone}
                </p>
              )}
              {clientData?.address && (
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {clientData.address}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Description
            </h3>
            <p className="text-gray-600">
              {invoice.description || "No description provided"}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Invoice Items
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Description
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                    Unit Price
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items?.map((item: InvoiceItem, index: number) => (
                  <tr key={item.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(
                        item.total_price || item.quantity * item.unit_price
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-full md:w-80">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {invoice.tax_rate && invoice.tax_rate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Tax ({invoice.tax_rate}%):
                      </span>
                      <span className="font-medium">
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold text-orange-600">
                    <span>Total:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-600">{invoice.notes}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-600">Bank:</span>
              <p className="font-medium">{COMPANY_INFO.bankName}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Account Number:</span>
              <p className="font-medium">{COMPANY_INFO.bankAccount}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Account Name:</span>
              <p className="font-medium">{COMPANY_INFO.accountName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Options Dialog */}
      {/* Payment Options Dialog (English) */}
      {/* Payment Options Dialog (Card-only, simplified) */}
      <Dialog open={showPaymentOptions} onOpenChange={setShowPaymentOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment
            </DialogTitle>
            <DialogDescription>
              Invoice #{invoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Order ID: {selectedPayment.session_id}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Description Only */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">
                  You can complete your payment using a credit or debit card.
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Supported cards: Visa, Mastercard, JCB, and selected debit
                  cards.
                </p>
              </div>

              {/* Security Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Secure Payment</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Your transaction is protected with SSL and 3D Secure
                  technology.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowPaymentOptions(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={() =>
                handlePaymentMethodSelect(selectedPayment?.payment_url)
              }
            >
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>Thank you for your business!</p>
        <p>For questions, contact us at {COMPANY_INFO.email}</p>
      </div>
    </div>
  )
}
