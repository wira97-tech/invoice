"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Eye, Download, Trash2, Edit2, FileText, AlertCircle, Filter, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createInvoice, getInvoices, getClients, deleteInvoice, updateInvoice, getInvoice, formatCurrency, type InvoiceWithClient, type Client, type InvoiceItem } from "@/lib/database"
import { generateInvoicePDF, type InvoicePDFData } from "@/lib/pdf-generator"

export function InvoicesPage() {
  const router = useRouter()
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [newInvoice, setNewInvoice] = useState({
    client_id: "",
    description: "",
    due_date: "",
    status: "Draft",
    items: [{ description: "", quantity: 1, unit_price: "" }],
    tax_rate: 0,
  })

  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithClient | null>(null)
  const [editInvoice, setEditInvoice] = useState({
    client_id: "",
    description: "",
    due_date: "",
    status: "Draft",
    items: [{ description: "", quantity: 1, unit_price: "" }],
    tax_rate: 0,
  })

  // Load data on component mount
  useEffect(() => {
    loadInvoices()
    loadClients()
  }, [])

  const loadInvoices = async () => {
    try {
      setIsDataLoading(true)
      const data = await getInvoices()
      setInvoices(data)
    } catch (error) {
      console.error('Error loading invoices:', error)
      // Fallback to mock data with proper structure
      setInvoices([
        {
          id: "1",
          invoice_number: "INV-2024-001",
          client_id: "1",
          client_name: "Acme Corporation",
          client_email: "contact@acme.com",
          client_company: "Acme Corp",
          description: "Website Development Services",
          issue_date: "2024-12-12",
          due_date: "2024-12-26",
          status: "Paid",
          total_amount: 2500000, // Updated to Rupiah
          created_at: "2024-12-12T00:00:00Z",
        },
        {
          id: "2",
          invoice_number: "INV-2024-002",
          client_id: "2",
          client_name: "Tech Solutions Inc",
          client_email: "hello@techsol.com",
          client_company: "Tech Solutions",
          description: "Consulting Services",
          issue_date: "2024-12-10",
          due_date: "2024-12-24",
          status: "Pending",
          total_amount: 1800000, // Updated to Rupiah
          created_at: "2024-12-10T00:00:00Z",
        },
      ])
    } finally {
      setIsDataLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const data = await getClients()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
      // Fallback to mock data
      setClients([
        { id: "1", name: "Acme Corporation", email: "contact@acme.com" },
        { id: "2", name: "Tech Solutions Inc", email: "hello@techsol.com" },
        { id: "3", name: "Global Industries", email: "info@global.com" },
      ])
    }
  }

  const handleCreateInvoice = async () => {
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      // Basic validation
      if (!newInvoice.client_id || !newInvoice.due_date || !newInvoice.items[0].description) {
        setError("Client, due date, and at least one item are required")
        setIsLoading(false)
        return
      }

      // Prepare invoice data
      const invoiceData = {
        client_id: newInvoice.client_id,
        description: newInvoice.description,
        due_date: newInvoice.due_date,
        status: newInvoice.status as 'Draft' | 'Pending' | 'Paid' | 'Overdue' | 'Cancelled',
        tax_rate: newInvoice.tax_rate,
        items: newInvoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price) || 0,
        }))
      }

      await createInvoice(invoiceData)

      // Success
      setSuccess("Invoice created successfully!")

      // Reset form
      setNewInvoice({
        client_id: "",
        description: "",
        due_date: "",
        status: "Draft",
        items: [{ description: "", quantity: 1, unit_price: "" }],
        tax_rate: 0,
      })

      // Close modal
      setIsCreateInvoiceOpen(false)

      // Reload invoices
      await loadInvoices()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)

    } catch (error: any) {
      console.error('Error creating invoice:', error)
      setError(error.message || "Failed to create invoice")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) {
      return
    }

    try {
      await deleteInvoice(id)
      setSuccess("Invoice deleted successfully!")
      await loadInvoices()
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error('Error deleting invoice:', error)
      setError(error.message || "Failed to delete invoice")
    }
  }

  const handleEditInvoice = async (invoice: InvoiceWithClient) => {
    try {
      const fullInvoice = await getInvoice(invoice.id)
      if (fullInvoice) {
        setEditingInvoice(fullInvoice)
        setEditInvoice({
          client_id: fullInvoice.client_id,
          description: fullInvoice.description || "",
          due_date: fullInvoice.due_date,
          status: fullInvoice.status || "Draft",
          items: fullInvoice.items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price.toString()
          })) || [{ description: "", quantity: 1, unit_price: "" }],
          tax_rate: fullInvoice.tax_rate || 0,
        })
        setIsEditInvoiceOpen(true)
      }
    } catch (error: any) {
      console.error('Error loading invoice for edit:', error)
      setError(error.message || "Failed to load invoice for editing")
    }
  }

  const handleUpdateInvoice = async () => {
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      if (!editingInvoice || !editInvoice.client_id || !editInvoice.due_date || !editInvoice.items[0].description) {
        setError("Client, due date, and at least one item are required")
        setIsLoading(false)
        return
      }

      const updateData = {
        client_id: editInvoice.client_id,
        description: editInvoice.description,
        due_date: editInvoice.due_date,
        status: editInvoice.status as 'Draft' | 'Pending' | 'Paid' | 'Overdue' | 'Cancelled',
        tax_rate: editInvoice.tax_rate,
        items: editInvoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price) || 0,
        }))
      }

      await updateInvoice(editingInvoice.id, updateData)

      setSuccess("Invoice updated successfully!")
      setIsEditInvoiceOpen(false)
      await loadInvoices()
      setTimeout(() => setSuccess(""), 3000)

    } catch (error: any) {
      console.error('Error updating invoice:', error)
      setError(error.message || "Failed to update invoice")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPDF = async (invoice: InvoiceWithClient) => {
    try {
      const fullInvoice = await getInvoice(invoice.id)
      if (fullInvoice) {
        // Extract client data from the nested client object returned by getInvoice
        const clientData = fullInvoice.client as any

        const pdfData: InvoicePDFData = {
          invoice: {
            invoice_number: fullInvoice.invoice_number || `INV-${fullInvoice.id}`,
            issue_date: fullInvoice.issue_date || fullInvoice.created_at || new Date().toISOString(),
            due_date: fullInvoice.due_date,
            description: fullInvoice.description || "",
            status: fullInvoice.status || "Draft",
            total_amount: fullInvoice.total_amount || 0,
            subtotal: fullInvoice.subtotal,
            tax_rate: fullInvoice.tax_rate,
            tax_amount: fullInvoice.tax_amount,
            notes: fullInvoice.notes
          },
          client: {
            name: clientData?.name || fullInvoice.client_name || "",
            email: clientData?.email || fullInvoice.client_email || "",
            company: clientData?.company || fullInvoice.client_company || "",
            address: clientData?.address || "",
            phone: clientData?.phone || ""
          },
          items: fullInvoice.items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price || (item.quantity * item.unit_price)
          })) || []
        }

        await generateInvoicePDF(pdfData)
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      setError(error.message || "Failed to download PDF")
    }
  }

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: "", quantity: 1, unit_price: "" }]
    })
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const updatedItems = [...newInvoice.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setNewInvoice({ ...newInvoice, items: updatedItems })
  }

  const removeItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    })
  }

  const calculateTotal = () => {
    return newInvoice.items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity.toString()) || 0
      const price = parseFloat(item.unit_price.toString()) || 0
      return total + (quantity * price)
    }, 0)
  }

  // Edit invoice item functions
  const addEditItem = () => {
    setEditInvoice({
      ...editInvoice,
      items: [...editInvoice.items, { description: "", quantity: 1, unit_price: "" }]
    })
  }

  const updateEditItem = (index: number, field: string, value: string | number) => {
    const updatedItems = [...editInvoice.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setEditInvoice({ ...editInvoice, items: updatedItems })
  }

  const removeEditItem = (index: number) => {
    setEditInvoice({
      ...editInvoice,
      items: editInvoice.items.filter((_, i) => i !== index)
    })
  }

  const calculateEditTotal = () => {
    return editInvoice.items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity.toString()) || 0
      const price = parseFloat(item.unit_price.toString()) || 0
      return total + (quantity * price)
    }, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-500/10 text-green-700"
      case "Pending":
        return "bg-yellow-500/10 text-yellow-700"
      case "Overdue":
        return "bg-red-500/10 text-red-700"
      default:
        return "bg-gray-500/10 text-gray-700"
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-2">View and manage all your invoices.</p>
        </div>
        <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white">
              <Plus size={20} />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-orange-900 dark:text-orange-400 flex items-center gap-2">
                <FileText size={20} />
                Create New Invoice
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Fill in the invoice details to generate a new invoice.
              </DialogDescription>
            </DialogHeader>

            {/* Error and Success Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
                <AlertCircle size={16} />
                {success}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client">Client *</Label>
                  <Select value={newInvoice.client_id} onValueChange={(value) => setNewInvoice({ ...newInvoice, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                  placeholder="Invoice for services rendered"
                />
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="col-span-6"
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="col-span-2"
                        min="1"
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Harga (IDR)"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        className="col-span-3"
                        min="0"
                        step="0.01"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 col-span-1"
                        disabled={isLoading || newInvoice.items.length === 1}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newInvoice.status} onValueChange={(value) => setNewInvoice({ ...newInvoice, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <Input
                    value={formatCurrency(calculateTotal())}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateInvoiceOpen(false)
                  setError("")
                  setNewInvoice({
                    client_id: "",
                    description: "",
                    due_date: "",
                    status: "Draft",
                    items: [{ description: "", quantity: 1, unit_price: "" }],
                    tax_rate: 0,
                  })
                }}
                disabled={isLoading}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={isLoading || !newInvoice.client_id || !newInvoice.due_date || !newInvoice.items[0].description}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
              >
                {isLoading ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Message outside modal */}
      {success && !isCreateInvoiceOpen && !isEditInvoiceOpen && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
          <AlertCircle size={20} />
          {success}
        </div>
      )}

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditInvoiceOpen} onOpenChange={setIsEditInvoiceOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-orange-900 dark:text-orange-400 flex items-center gap-2">
              <Edit2 size={20} />
              Edit Invoice
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Update the invoice details and items.
            </DialogDescription>
          </DialogHeader>

          {/* Error and Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-client">Client *</Label>
                <Select value={editInvoice.client_id} onValueChange={(value) => setEditInvoice({ ...editInvoice, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-due_date">Due Date *</Label>
                <Input
                  id="edit-due_date"
                  type="date"
                  value={editInvoice.due_date}
                  onChange={(e) => setEditInvoice({ ...editInvoice, due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editInvoice.description}
                onChange={(e) => setEditInvoice({ ...editInvoice, description: e.target.value })}
                placeholder="Invoice for services rendered"
              />
            </div>

            {/* Edit Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEditItem}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <Plus size={16} className="mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {editInvoice.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateEditItem(index, 'description', e.target.value)}
                      className="col-span-6"
                      disabled={isLoading}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateEditItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="col-span-2"
                      min="1"
                      disabled={isLoading}
                    />
                    <Input
                      type="number"
                      placeholder="Harga (IDR)"
                      value={item.unit_price}
                      onChange={(e) => updateEditItem(index, 'unit_price', e.target.value)}
                      className="col-span-3"
                      min="0"
                      step="0.01"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEditItem(index)}
                      className="text-red-600 hover:text-red-700 col-span-1"
                      disabled={isLoading || editInvoice.items.length === 1}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editInvoice.status} onValueChange={(value) => setEditInvoice({ ...editInvoice, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total Amount</Label>
                <Input
                  value={formatCurrency(calculateEditTotal())}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditInvoiceOpen(false)
                setError("")
              }}
              disabled={isLoading}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateInvoice}
              disabled={isLoading || !editInvoice.client_id || !editInvoice.due_date || !editInvoice.items[0].description}
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
            >
              {isLoading ? "Updating..." : "Update Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input placeholder="Search invoices..." className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Filter size={20} />
          Filter
        </Button>
      </div>

      {/* Invoices Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">All Invoices</CardTitle>
          <CardDescription>
            {isDataLoading ? "Loading invoices..." : `${invoices.length} invoices found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-lg">Loading invoices...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Invoice ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-foreground font-medium">
                      <button
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {invoice.invoice_number}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-sm text-foreground">{invoice.client_name}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-foreground">{formatCurrency(invoice.total_amount || 0)}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {new Date(invoice.created_at || "").toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {new Date(invoice.due_date || "").toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getStatusColor(invoice.status || "")}>{invoice.status || "Draft"}</Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                          title="View Invoice Details"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleEditInvoice(invoice)}
                          title="Edit Invoice"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleDownloadPDF(invoice)}
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          title="Delete Invoice"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {!isDataLoading && invoices.length === 0 && (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No invoices yet</h3>
              <p className="text-muted-foreground mb-4">Start by creating your first invoice</p>
              <Button
                onClick={() => setIsCreateInvoiceOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
              >
                <Plus size={20} className="mr-2" />
                Create Your First Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InvoicesPage