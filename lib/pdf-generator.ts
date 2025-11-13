import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatCurrency } from './database'
import { COMPANY_INFO } from './company-config'

export interface InvoicePDFData {
  invoice: {
    invoice_number: string
    issue_date: string
    due_date: string
    description: string
    status: string
    total_amount: number
    subtotal?: number
    tax_rate?: number
    tax_amount?: number
    notes?: string
  }
  client: {
    name: string
    email: string
    company?: string
    address?: string
    phone?: string
  }
  items: {
    description: string
    quantity: number
    unit_price: number
    total_price: number
  }[]
}

export const generateInvoicePDF = async (invoiceData: InvoicePDFData): Promise<void> => {
  // Create PDF document
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)

  // Colors
  const primaryColor = [255, 140, 0] // Orange color theme
  const lightGray = [245, 245, 245]
  const textGray = [100, 100, 100]
  const textDark = [50, 50, 50]

  let yPosition = 20

  // Header Section with company info
  pdf.setFillColor(...primaryColor)
  pdf.rect(0, 0, pageWidth, 70, 'F')

  pdf.setFontSize(24)
  pdf.setTextColor(255, 255, 255)
  pdf.text(COMPANY_INFO.name, pageWidth / 2, 35, { align: 'center' })

  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.text(COMPANY_INFO.address, pageWidth / 2, 45, { align: 'center' })
  pdf.text(`${COMPANY_INFO.phone} | ${COMPANY_INFO.email}`, pageWidth / 2, 53, { align: 'center' })
  pdf.text(COMPANY_INFO.website, pageWidth / 2, 61, { align: 'center' })

  yPosition = 90

  // Invoice Title and Number - Left side
  pdf.setFontSize(28)
  pdf.setTextColor(...primaryColor)
  pdf.text("INVOICE", margin, yPosition)

  pdf.setFontSize(16)
  pdf.setTextColor(...textGray)
  pdf.text(`#${invoiceData.invoice.invoice_number}`, margin, yPosition + 15)

  // Invoice Details - Right side
  const detailsX = pageWidth - 120
  pdf.setFontSize(10)
  pdf.setTextColor(...textDark)
  pdf.text("Invoice Date:", detailsX, yPosition)
  pdf.setTextColor(...textGray)
  pdf.text(new Date(invoiceData.invoice.issue_date).toLocaleDateString('id-ID'), detailsX, yPosition + 8)

  pdf.setTextColor(...textDark)
  pdf.text("Due Date:", detailsX, yPosition + 18)
  pdf.setTextColor(...textGray)
  pdf.text(new Date(invoiceData.invoice.due_date).toLocaleDateString('id-ID'), detailsX, yPosition + 26)

  pdf.setTextColor(...textDark)
  pdf.text("Status:", detailsX, yPosition + 36)

  // Status badge color
  const statusColor = invoiceData.invoice.status === 'Paid' ? [34, 197, 94] :
                     invoiceData.invoice.status === 'Pending' ? [255, 140, 0] :
                     [156, 163, 175]
  pdf.setFillColor(...statusColor)
  pdf.rect(detailsX + 25, yPosition + 28, 60, 12, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(9)
  pdf.text(invoiceData.invoice.status.toUpperCase(), detailsX + 55, yPosition + 36, { align: 'center' })

  yPosition += 70

  // Bill To Section
  pdf.setFillColor(...lightGray)
  pdf.rect(margin, yPosition, contentWidth, 45, 'F')

  pdf.setFontSize(12)
  pdf.setTextColor(...primaryColor)
  pdf.text("BILL TO:", margin + 10, yPosition + 15)

  pdf.setFontSize(11)
  pdf.setTextColor(...textDark)
  pdf.text(invoiceData.client.name, margin + 10, yPosition + 28)

  pdf.setFontSize(10)
  pdf.setTextColor(...textGray)
  let clientYPosition = yPosition + 38

  if (invoiceData.client.company) {
    pdf.text(invoiceData.client.company, margin + 10, clientYPosition)
    clientYPosition += 8
  }
  if (invoiceData.client.email) {
    pdf.text(invoiceData.client.email, margin + 10, clientYPosition)
    clientYPosition += 8
  }
  if (invoiceData.client.phone) {
    pdf.text(invoiceData.client.phone, margin + 10, clientYPosition)
    clientYPosition += 8
  }
  if (invoiceData.client.address) {
    pdf.text(invoiceData.client.address, margin + 10, clientYPosition)
  }

  yPosition += 60

  // Items Table Header
  pdf.setFillColor(...primaryColor)
  pdf.rect(margin, yPosition, contentWidth, 15, 'F')

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.text("Description", margin + 10, yPosition + 10)
  pdf.text("Quantity", margin + 120, yPosition + 10, { align: 'center' })
  pdf.text("Unit Price", margin + 150, yPosition + 10, { align: 'center' })
  pdf.text("Total", pageWidth - margin - 10, yPosition + 10, { align: 'right' })

  yPosition += 15

  // Table Items
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...textDark)
  pdf.setFontSize(10)

  invoiceData.items.forEach((item, index) => {
    const rowHeight = 15

    // Alternate row colors
    if (index % 2 === 0) {
      pdf.setFillColor(...lightGray)
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F')
    }

    // Table row borders
    pdf.setDrawColor(...textGray)
    pdf.rect(margin, yPosition, contentWidth, rowHeight)

    // Description with text wrapping
    pdf.setTextColor(...textDark)
    const descriptionLines = pdf.splitTextToSize(item.description, 80)
    pdf.text(descriptionLines[0], margin + 10, yPosition + 10)

    // Quantity
    pdf.text(item.quantity.toString(), margin + 120, yPosition + 10, { align: 'center' })

    // Unit Price
    pdf.text(formatCurrency(item.unit_price), margin + 150, yPosition + 10, { align: 'center' })

    // Total
    pdf.text(formatCurrency(item.total_price), pageWidth - margin - 10, yPosition + 10, { align: 'right' })

    yPosition += rowHeight
  })

  // Summary Section
  yPosition += 20

  // Summary Box
  const summaryBoxWidth = 150
  const summaryBoxX = pageWidth - margin - summaryBoxWidth

  pdf.setDrawColor(...textGray)
  pdf.setFillColor(...lightGray)
  pdf.rect(summaryBoxX, yPosition, summaryBoxWidth, 80, 'FD')

  pdf.setFontSize(11)
  pdf.setTextColor(...textDark)

  // Subtotal
  pdf.text("Subtotal:", summaryBoxX + 10, yPosition + 20)
  pdf.text(formatCurrency(invoiceData.invoice.subtotal || 0), summaryBoxX + summaryBoxWidth - 10, yPosition + 20, { align: 'right' })

  // Tax (if applicable)
  if (invoiceData.invoice.tax_rate && invoiceData.invoice.tax_rate > 0) {
    yPosition += 15
    pdf.text(`Tax (${invoiceData.invoice.tax_rate}%):`, summaryBoxX + 10, yPosition + 5)
    pdf.text(formatCurrency(invoiceData.invoice.tax_amount || 0), summaryBoxX + summaryBoxWidth - 10, yPosition + 5, { align: 'right' })
  }

  // Total
  yPosition += 20
  pdf.setFillColor(...primaryColor)
  pdf.rect(summaryBoxX, yPosition, summaryBoxWidth, 30, 'F')
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.text("TOTAL:", summaryBoxX + 10, yPosition + 20)
  pdf.text(formatCurrency(invoiceData.invoice.total_amount), summaryBoxX + summaryBoxWidth - 10, yPosition + 20, { align: 'right' })

  pdf.setFont('helvetica', 'normal')

  // Notes (if any)
  if (invoiceData.invoice.notes) {
    yPosition += 50
    pdf.setFontSize(12)
    pdf.setTextColor(...primaryColor)
    pdf.text("Notes:", margin, yPosition)

    pdf.setFontSize(10)
    pdf.setTextColor(...textGray)
    const noteLines = pdf.splitTextToSize(invoiceData.invoice.notes, contentWidth)
    pdf.text(noteLines, margin, yPosition + 10)
    yPosition += (noteLines.length * 5) + 20
  }

  // Payment Information Section
  yPosition = pageHeight - 100
  pdf.setFillColor(...lightGray)
  pdf.rect(margin, yPosition, contentWidth, 60, 'F')

  pdf.setFontSize(12)
  pdf.setTextColor(...primaryColor)
  pdf.setFont('helvetica', 'bold')
  pdf.text("Payment Information", margin + 10, yPosition + 15)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...textDark)

  const paymentInfoY = yPosition + 35
  pdf.text("Bank:", margin + 10, paymentInfoY)
  pdf.text(COMPANY_INFO.bankName, margin + 50, paymentInfoY)

  pdf.text("Account Number:", margin + 10, paymentInfoY + 12)
  pdf.text(COMPANY_INFO.bankAccount, margin + 50, paymentInfoY + 12)

  pdf.text("Account Name:", margin + 10, paymentInfoY + 24)
  pdf.text(COMPANY_INFO.accountName, margin + 50, paymentInfoY + 24)

  // Footer
  yPosition = pageHeight - 20
  pdf.setFontSize(8)
  pdf.setTextColor(...textGray)
  pdf.text("Thank you for your business!", pageWidth / 2, yPosition, { align: 'center' })

  // Save the PDF
  pdf.save(`Invoice-${invoiceData.invoice.invoice_number}.pdf`)
}