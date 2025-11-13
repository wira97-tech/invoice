"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ArrowUp, ArrowDown, DollarSign, FileText, Users, Loader2 } from "lucide-react"
import {
  getDashboardMetrics,
  getMonthlyRevenue,
  getInvoiceStatusDistribution,
  getRecentInvoices,
  formatCurrency,
  type DashboardMetrics,
  type MonthlyData,
  type InvoiceStatusCount,
  type RecentInvoice
} from "@/lib/database"

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [statusData, setStatusData] = useState<InvoiceStatusCount[]>([])
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [metricsData, monthlyRevenueData, statusDistributionData, recentInvoicesData] = await Promise.all([
        getDashboardMetrics(),
        getMonthlyRevenue(6),
        getInvoiceStatusDistribution(),
        getRecentInvoices(5)
      ])

      setMetrics(metricsData)
      setMonthlyData(monthlyRevenueData)
      setStatusData(statusDistributionData)
      setRecentInvoices(recentInvoicesData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ["hsl(var(--color-chart-1))", "hsl(var(--color-chart-2))", "hsl(var(--color-destructive))"]

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's your invoice overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics ? formatCurrency(metrics.totalRevenue) : 'Rp0'}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {metrics?.revenueChange && metrics.revenueChange > 0 ? (
                <>
                  <ArrowUp className="w-3 h-3 text-green-500" />
                  +{metrics.revenueChange}% from last month
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                  {metrics?.revenueChange}% from last month
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.totalInvoices.toLocaleString('id-ID') || '0'}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {metrics?.invoiceChange && metrics.invoiceChange > 0 ? (
                <>
                  <ArrowUp className="w-3 h-3 text-green-500" />
                  +{metrics.invoiceChange}% from last month
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                  {metrics?.invoiceChange}% from last month
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.activeClients.toLocaleString('id-ID') || '0'}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {metrics?.clientChange && metrics.clientChange > 0 ? (
                <>
                  <ArrowUp className="w-3 h-3 text-green-500" />
                  +{metrics.clientChange}% from last month
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3 text-red-500" />
                  {metrics?.clientChange}% from last month
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue and invoice count (in Rupiah)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue (Rp)",
                  color: "hsl(var(--color-chart-1))",
                },
                invoices: {
                  label: "Invoices",
                  color: "hsl(var(--color-chart-2))",
                },
              }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--color-muted-foreground))" />
                  <YAxis
                    stroke="hsl(var(--color-muted-foreground))"
                    tickFormatter={(value) => `Rp${(value / 1000000).toFixed(1)}M`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(label) => `${label}`}
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Invoices'
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--color-chart-1))" strokeWidth={2} />
                  <Line type="monotone" dataKey="invoices" stroke="hsl(var(--color-chart-2))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Invoice Status</CardTitle>
            <CardDescription>Distribution of invoices</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer
              config={{
                paid: { label: "Paid", color: "hsl(var(--color-chart-1))" },
                pending: { label: "Pending", color: "hsl(var(--color-chart-2))" },
                overdue: { label: "Overdue", color: "hsl(var(--color-destructive))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, count }) => `${name} (${count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Invoices</CardTitle>
          <CardDescription>Your latest invoice activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No invoices found</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        invoice.status === "Paid"
                          ? "text-green-500"
                          : invoice.status === "Overdue"
                          ? "text-red-500"
                          : invoice.status === "Pending"
                          ? "text-yellow-500"
                          : "text-gray-500"
                      }`}
                    >
                      {invoice.status}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">
                    {new Date(invoice.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
