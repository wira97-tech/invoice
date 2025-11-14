import { supabase } from "./supabase"

// Types for database entities
export interface Client {
  id?: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  status?: "Active" | "Inactive" | "Prospect"
  user_id?: string
  created_at?: string
  updated_at?: string
}

export interface InvoiceItem {
  id?: string
  invoice_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price?: number
  created_at?: string
  updated_at?: string
}

export interface Invoice {
  id?: string
  invoice_number?: string
  client_id: string
  description?: string
  issue_date?: string
  due_date: string
  status?: "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled"
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total_amount?: number
  notes?: string
  items?: InvoiceItem[]
  user_id?: string
  created_at?: string
  updated_at?: string
}

export interface InvoiceWithClient extends Invoice {
  client_name?: string
  client_email?: string
  client_company?: string
  client?: Client
  client_address?: string
  client_phone?: string
}

// CLIENT FUNCTIONS
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createClient(
  client: Omit<Client, "id" | "created_at" | "updated_at" | "user_id">
): Promise<Client> {
  // user_id will be automatically set by the trigger
  const { data, error } = await supabase
    .from("clients")
    .insert([client])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateClient(
  id: string,
  updates: Partial<Client>
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id)

  if (error) throw error
}

// INVOICE FUNCTIONS
export async function getInvoices(): Promise<InvoiceWithClient[]> {
  const { data, error } = await supabase
    .from("invoices_with_clients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInvoice(
  id: string
): Promise<InvoiceWithClient | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      client:clients(id, name, email, company),
      items:invoice_items(*)
    `
    )
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createInvoice(
  invoice: Omit<
    Invoice,
    | "id"
    | "invoice_number"
    | "created_at"
    | "updated_at"
    | "user_id"
    | "total_amount"
    | "subtotal"
    | "tax_amount"
  >
): Promise<InvoiceWithClient> {
  // Start a transaction
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .insert([
      {
        client_id: invoice.client_id,
        description: invoice.description,
        due_date: invoice.due_date,
        status: invoice.status || "Draft",
        notes: invoice.notes,
        tax_rate: invoice.tax_rate || 0,
      },
    ])
    .select()
    .single()

  if (invoiceError) throw invoiceError

  // Insert invoice items if provided
  if (invoice.items && invoice.items.length > 0) {
    const itemsWithInvoiceId = invoice.items.map((item) => ({
      ...item,
      invoice_id: invoiceData.id,
    }))

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsWithInvoiceId)

    if (itemsError) throw itemsError
  }

  // Get the complete invoice with client info
  const completeInvoice = await getInvoice(invoiceData.id)
  return completeInvoice!
}

export async function updateInvoice(
  id: string,
  updates: Partial<Invoice>
): Promise<InvoiceWithClient> {
  // First update the invoice basic info
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .update({
      client_id: updates.client_id,
      description: updates.description,
      due_date: updates.due_date,
      status: updates.status,
      notes: updates.notes,
      tax_rate: updates.tax_rate,
    })
    .eq("id", id)
    .select()
    .single()

  if (invoiceError) throw invoiceError

  // Update invoice items if provided
  if (updates.items) {
    // Delete existing items
    await supabase.from("invoice_items").delete().eq("invoice_id", id)

    // Insert new items
    if (updates.items.length > 0) {
      const itemsWithInvoiceId = updates.items.map((item) => ({
        ...item,
        invoice_id: id,
      }))

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsWithInvoiceId)

      if (itemsError) throw itemsError
    }
  }

  // Get the complete updated invoice with client info
  const completeInvoice = await getInvoice(id)
  return completeInvoice!
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id)

  if (error) throw error
}

// INVOICE ITEMS FUNCTIONS
export async function getInvoiceItems(
  invoiceId: string
): Promise<InvoiceItem[]> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export async function createInvoiceItem(
  item: Omit<InvoiceItem, "id" | "created_at" | "updated_at" | "total_price">
): Promise<InvoiceItem> {
  const { data, error } = await supabase
    .from("invoice_items")
    .insert([item])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateInvoiceItem(
  id: string,
  updates: Partial<InvoiceItem>
): Promise<InvoiceItem> {
  const { data, error } = await supabase
    .from("invoice_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteInvoiceItem(id: string): Promise<void> {
  const { error } = await supabase.from("invoice_items").delete().eq("id", id)

  if (error) throw error
}

// INVOICE STATUS UPDATE FUNCTIONS
export async function updateInvoiceStatus(
  id: string,
  status: "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled"
): Promise<InvoiceWithClient> {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  // Get the complete updated invoice with client info
  const completeInvoice = await getInvoice(id)
  return completeInvoice!
}

export async function updateInvoiceStatusByNumber(
  invoiceNumber: string,
  status: "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled"
): Promise<InvoiceWithClient | null> {
  console.log(`[DB] Looking for invoice with number: ${invoiceNumber}`)

  // Try multiple approaches to find the invoice
  let invoiceData = null
  let findError = null

  // 1. Exact match first
  const { data: exactData, error: exactError } = await supabase
    .from("invoices")
    .select("id, invoice_number, status")
    .eq("invoice_number", invoiceNumber)
    .single()

  console.log(`[DB] Exact match result:`, { data: exactData, error: exactError })

  if (exactData && !exactError) {
    invoiceData = exactData
    findError = null
  } else {
    // 2. Try with LIKE if exact match fails
    const { data: likeData, error: likeError } = await supabase
      .from("invoices")
      .select("id, invoice_number, status")
      .ilike("invoice_number", `%${invoiceNumber}%`)
      .limit(5)

    console.log(`[DB] LIKE search result:`, { data: likeData, error: likeError })

    if (likeData && likeData.length > 0 && !likeError) {
      // Take the first match
      invoiceData = likeData[0]
      console.log(`[DB] Using LIKE match: ${invoiceData.invoice_number}`)
      findError = null
    } else {
      // 3. Try to extract numeric ID and search by ID
      const numericMatch = invoiceNumber.match(/\d+/)
      if (numericMatch) {
        const possibleId = numericMatch[0]
        const { data: idData, error: idError } = await supabase
          .from("invoices")
          .select("id, invoice_number, status")
          .eq("id", possibleId)
          .single()

        console.log(`[DB] ID search result:`, { data: idData, error: idError, searchId: possibleId })

        if (idData && !idError) {
          invoiceData = idData
          console.log(`[DB] Using ID match: ${invoiceData.invoice_number}`)
          findError = null
        } else {
          findError = likeError || exactError || new Error(`Invoice with number ${invoiceNumber} not found`)
        }
      } else {
        findError = likeError || exactError || new Error(`Invoice with number ${invoiceNumber} not found`)
      }
    }
  }

  if (findError || !invoiceData) {
    // Log all existing invoice numbers for debugging
    let allInvoices = []
    let listError = null

    try {
      const result = await supabase
        .from("invoices")
        .select("invoice_number, id, created_at")
        .limit(10)
        .order("created_at", { ascending: false })

      allInvoices = result.data || []
      listError = result.error

      console.log(`[DB] Database query result:`, {
        count: allInvoices.length,
        error: listError
      })

    } catch (queryError) {
      console.error(`[DB] Error querying invoices:`, queryError)
      listError = queryError
    }

    console.error(`[DB] Invoice not found: ${invoiceNumber}`)
    console.error(`[DB] Recent invoice numbers:`, allInvoices?.map(inv => inv.invoice_number))
    console.error(`[DB] Total invoices in DB:`, allInvoices.length)

    // Provide more helpful error message
    const recentInvoices = allInvoices?.map(inv => inv.invoice_number).join(', ') || 'none'
    const errorMsg = `Invoice with number "${invoiceNumber}" not found. Database has ${allInvoices.length} invoices. Recent: ${recentInvoices}`

    // For better debugging, show the exact query that was tried
    console.error(`[DB] Queries attempted:`, {
      exactMatch: `invoice_number = '${invoiceNumber}'`,
      likeSearch: `invoice_number ILIKE '%${invoiceNumber}%'`,
      idSearch: invoiceNumber.match(/\d+/) ? `id = '${invoiceNumber.match(/\d+/)[0]}'` : 'No numeric ID found'
    })

    throw new Error(errorMsg)
  }

  console.log(`[DB] Found invoice: ${invoiceData.invoice_number} (ID: ${invoiceData.id}), current status: ${invoiceData.status}`)

  // Update the status using the ID
  return await updateInvoiceStatus(invoiceData.id, status)
}

// DASHBOARD STATISTICS
export async function getDashboardStats() {
  const { data, error } = await supabase
    .from("dashboard_stats")
    .select("*")
    .single()

  if (error) throw error
  return data
}

// UTILITY FUNCTIONS
export function generateInvoiceId(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `INV-${timestamp}-${random}`
}

export function calculateTotal(items: InvoiceItem[]): number {
  return items.reduce((total, item) => {
    return total + item.quantity * item.unit_price
  }, 0)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Dashboard specific functions
export interface DashboardMetrics {
  totalRevenue: number
  totalInvoices: number
  activeClients: number
  revenueChange: number
  invoiceChange: number
  clientChange: number
}

export interface MonthlyData {
  month: string
  revenue: number
  invoices: number
}

export interface InvoiceStatusCount {
  name: string
  value: number
  count: number
}

export interface RecentInvoice {
  id: string
  invoice_number: string
  client_name: string
  total_amount: number
  status: string
  created_at: string
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Get total revenue from PAID invoices only
    const { data: paidInvoicesData, error: paidInvoicesError } = await supabase
      .from("invoices")
      .select("total_amount")
      .eq("status", "Paid")

    if (paidInvoicesError) throw paidInvoicesError

    // Get total invoices count
    const { count: totalInvoices, error: countError } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })

    if (countError) throw countError

    // Get active clients count
    const { count: activeClients, error: clientError } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active")

    if (clientError) throw clientError

    const totalRevenue =
      paidInvoicesData?.reduce(
        (sum, invoice) => sum + (invoice.total_amount || 0),
        0
      ) || 0

    return {
      totalRevenue,
      totalInvoices: totalInvoices || 0,
      activeClients: activeClients || 0,
      revenueChange: 12.5, // Mock percentage - calculate from previous period
      invoiceChange: 8.2, // Mock percentage - calculate from previous period
      clientChange: -2.1, // Mock percentage - calculate from previous period
    }
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    // Return mock data if database fails
    return {
      totalRevenue: 4523189000, // $45,231.89 in Rupiah
      totalInvoices: 1234,
      activeClients: 342,
      revenueChange: 12.5,
      invoiceChange: 8.2,
      clientChange: -2.1,
    }
  }
}

export async function getMonthlyRevenue(
  months: number = 6
): Promise<MonthlyData[]> {
  try {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    // Get only PAID invoices for revenue trend
    const { data, error } = await supabase
      .from("invoices")
      .select("total_amount, created_at")
      .eq("status", "Paid")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true })

    if (error) throw error

    // Group by month
    const monthlyData: {
      [key: string]: { revenue: number; invoices: number }
    } = {}

    data?.forEach((invoice) => {
      const month = new Date(invoice.created_at).toLocaleDateString("en-US", {
        month: "short",
      })
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, invoices: 0 }
      }
      monthlyData[month].revenue += invoice.total_amount || 0
      monthlyData[month].invoices += 1
    })

    // Convert to array format
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      invoices: data.invoices,
    }))
  } catch (error) {
    console.error("Error fetching monthly revenue:", error)
    // Return mock data
    return [
      { month: "Jul", revenue: 60000000, invoices: 24 },
      { month: "Aug", revenue: 45000000, invoices: 21 },
      { month: "Sep", revenue: 30000000, invoices: 29 },
      { month: "Oct", revenue: 42000000, invoices: 20 },
      { month: "Nov", revenue: 29000000, invoices: 23 },
      { month: "Dec", revenue: 36000000, invoices: 34 },
    ]
  }
}

export async function getInvoiceStatusDistribution(): Promise<
  InvoiceStatusCount[]
> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("status")
      .not("status", "is", null)

    if (error) throw error

    // Count by status
    const statusCount =
      data?.reduce((acc, invoice) => {
        const status = invoice.status || "Draft"
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

    const total = Object.values(statusCount).reduce(
      (sum, count) => sum + count,
      0
    )

    // Define standard status order and colors
    const statusOrder = ["Paid", "Pending", "Overdue", "Draft", "Cancelled"]

    // Map status counts and ensure all statuses are included
    const result = statusOrder.map(status => ({
      name: status,
      count: statusCount[status] || 0,
      value: total > 0 ? Math.round(((statusCount[status] || 0) / total) * 100) : 0,
    })).filter(item => item.count > 0) // Only include statuses that have invoices

    return result.length > 0 ? result : [
      { name: "No Data", value: 100, count: 0 }
    ]
  } catch (error) {
    console.error("Error fetching invoice status distribution:", error)
    // Return fallback data indicating no data available
    return [
      { name: "No Data", value: 100, count: 0 }
    ]
  }
}

export async function getRecentInvoices(
  limit: number = 5
): Promise<RecentInvoice[]> {
  try {
    const { data, error } = await supabase
      .from("invoices_with_clients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return (
      data?.map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number || `INV-${invoice.id}`,
        client_name: invoice.client_name || "Unknown Client",
        total_amount: invoice.total_amount || 0,
        status: invoice.status || "Draft",
        created_at: invoice.created_at || new Date().toISOString(),
      })) || []
    )
  } catch (error) {
    console.error("Error fetching recent invoices:", error)
    // Return mock data
    return [
      {
        id: "1",
        invoice_number: "INV-2024-001",
        client_name: "Acme Corp",
        total_amount: 2500000,
        status: "Paid",
        created_at: "2024-12-12T00:00:00Z",
      },
      {
        id: "2",
        invoice_number: "INV-2024-002",
        client_name: "Tech Solutions",
        total_amount: 1800000,
        status: "Pending",
        created_at: "2024-12-10T00:00:00Z",
      },
      {
        id: "3",
        invoice_number: "INV-2024-003",
        client_name: "Global Industries",
        total_amount: 3200000,
        status: "Paid",
        created_at: "2024-12-08T00:00:00Z",
      },
    ]
  }
}
