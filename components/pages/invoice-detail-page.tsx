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
import { generateInvoicePDF, type InvoicePDFData } from "@/lib/pdf-generator"
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

  const handleDownloadPDF = async () => {
    if (!invoice) return

    try {
      const clientData = invoice.client as any

      const pdfData: InvoicePDFData = {
        invoice: {
          invoice_number: invoice.invoice_number || `INV-${invoice.id}`,
          issue_date:
            invoice.issue_date ||
            invoice.created_at ||
            new Date().toISOString(),
          due_date: invoice.due_date,
          description: invoice.description || "",
          status: invoice.status || "Draft",
          total_amount: invoice.total_amount || 0,
          subtotal: invoice.subtotal,
          tax_rate: invoice.tax_rate,
          tax_amount: invoice.tax_amount,
          notes: invoice.notes,
        },
        client: {
          name: clientData?.name || invoice.client_name || "",
          email: clientData?.email || invoice.client_email || "",
          company: clientData?.company || invoice.client_company || "",
          address: clientData?.address || "",
          phone: clientData?.phone || "",
        },
        items:
          invoice.items?.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price || item.quantity * item.unit_price,
          })) || [],
      }

      await generateInvoicePDF(pdfData)
    } catch (error: any) {
      console.error("Error downloading PDF:", error)
      setError(error.message || "Failed to download PDF")
    }
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
          failed_url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/payment/failed`,
          auto_redirect: false,
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

      // buka di tab baru (atau window.location.href = paymentUrl untuk redirect)
      window.open(paymentUrl, "_blank")
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
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
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
