"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, Edit2, Trash2, Mail, Phone, Building, AlertCircle, Loader2 } from "lucide-react"
import { createClient, getClients, updateClient, deleteClient, type Client } from "@/lib/database"

export function ClientsPage() {
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [isEditClientOpen, setIsEditClientOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [clients, setClients] = useState<any[]>([])
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  })

  // Load clients on component mount
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setIsDataLoading(true)
      const data = await getClients()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
      // Fallback to mock data if API fails
      setClients([
        {
          id: "1",
          name: "Acme Corporation",
          email: "contact@acme.com",
          phone: "+1 (555) 123-4567",
          status: "Active",
          company: "Acme Corp",
          invoices: 12,
        },
        {
          id: "2",
          name: "Tech Solutions Inc",
          email: "hello@techsol.com",
          phone: "+1 (555) 987-6543",
          status: "Active",
          company: "Tech Solutions",
          invoices: 8,
        },
        {
          id: "3",
          name: "Global Industries",
          email: "info@global.com",
          phone: "+1 (555) 456-7890",
          status: "Active",
          company: "Global Industries",
          invoices: 15,
        },
        {
          id: "4",
          name: "Digital Ventures",
          email: "sales@digital.com",
          phone: "+1 (555) 321-0987",
          status: "Inactive",
          company: "Digital Ventures",
          invoices: 5,
        },
        {
          id: "5",
          name: "Innovation Labs",
          email: "contact@innov.com",
          phone: "+1 (555) 654-3210",
          status: "Active",
          company: "Innovation Labs",
          invoices: 20,
        },
        {
          id: "6",
          name: "Creative Agency",
          email: "hello@creative.com",
          phone: "+1 (555) 789-0123",
          status: "Active",
          company: "Creative Agency",
          invoices: 3,
        },
      ])
    } finally {
      setIsDataLoading(false)
    }
  }

  const handleAddClient = async () => {
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      // Basic validation
      if (!newClient.name || !newClient.email) {
        setError("Name and email are required")
        setIsLoading(false)
        return
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newClient.email)) {
        setError("Please enter a valid email address")
        setIsLoading(false)
        return
      }

      // Create client
      const clientData = {
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone || undefined,
        company: newClient.company || undefined,
        address: newClient.address || undefined,
        status: 'Active' as const
      }

      await createClient(clientData)

      // Success
      setSuccess(`Client "${newClient.name}" created successfully!`)

      // Reset form
      setNewClient({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
      })

      // Close modal
      setIsAddClientOpen(false)

      // Reload clients
      await loadClients()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)

    } catch (error: any) {
      console.error('Error creating client:', error)
      if (error.code === '23505') {
        setError("A client with this email already exists")
      } else {
        setError(error.message || "Failed to create client")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setNewClient({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      company: client.company || "",
      address: client.address || "",
    })
    setIsEditClientOpen(true)
  }

  const handleUpdateClient = async () => {
    if (!editingClient) return

    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      // Basic validation
      if (!newClient.name || !newClient.email) {
        setError("Name and email are required")
        setIsLoading(false)
        return
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newClient.email)) {
        setError("Please enter a valid email address")
        setIsLoading(false)
        return
      }

      // Update client
      const clientData = {
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone || undefined,
        company: newClient.company || undefined,
        address: newClient.address || undefined,
      }

      await updateClient(editingClient.id!, clientData)

      // Success
      setSuccess(`Client "${newClient.name}" updated successfully!`)

      // Reset form
      setNewClient({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
      })
      setEditingClient(null)

      // Close modal
      setIsEditClientOpen(false)

      // Reload clients
      await loadClients()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)

    } catch (error: any) {
      console.error('Error updating client:', error)
      if (error.code === '23505') {
        setError("A client with this email already exists")
      } else {
        setError(error.message || "Failed to update client")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteClient(id)
      setSuccess(`Client "${name}" deleted successfully!`)
      await loadClients()
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error('Error deleting client:', error)
      setError(error.message || "Failed to delete client")
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-2">Manage your client information and details.</p>
        </div>
        <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white">
              <Plus size={20} />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-orange-900 dark:text-orange-400 flex items-center gap-2">
                <Building size={20} />
                Add New Client
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Enter the client information below to create a new client record.
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
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Name *
                </label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="john@example.com"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Phone
                </label>
                <Input
                  id="phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-foreground">
                  Company
                </label>
                <Input
                  id="company"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Acme Corp"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium text-foreground">
                  Address
                </label>
                <Input
                  id="address"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  disabled={isLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddClientOpen(false)
                  setError("")
                  setNewClient({
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    address: "",
                  })
                }}
                disabled={isLoading}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddClient}
                disabled={isLoading || !newClient.name || !newClient.email}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
              >
                {isLoading ? "Creating..." : "Add Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Client Modal */}
        <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-orange-900 dark:text-orange-400 flex items-center gap-2">
                <Edit2 size={20} />
                Edit Client
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Update the client information below.
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
              <div className="space-y-2">
                <label htmlFor="edit-name" className="text-sm font-medium text-foreground">
                  Name *
                </label>
                <Input
                  id="edit-name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-email" className="text-sm font-medium text-foreground">
                  Email *
                </label>
                <Input
                  id="edit-email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="john@example.com"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-phone" className="text-sm font-medium text-foreground">
                  Phone
                </label>
                <Input
                  id="edit-phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-company" className="text-sm font-medium text-foreground">
                  Company
                </label>
                <Input
                  id="edit-company"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Acme Corp"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-address" className="text-sm font-medium text-foreground">
                  Address
                </label>
                <Input
                  id="edit-address"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  disabled={isLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditClientOpen(false)
                  setError("")
                  setEditingClient(null)
                  setNewClient({
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    address: "",
                  })
                }}
                disabled={isLoading}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateClient}
                disabled={isLoading || !newClient.name || !newClient.email}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
              >
                {isLoading ? "Updating..." : "Update Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Message outside modal */}
      {success && !isAddClientOpen && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
          <AlertCircle size={20} />
          {success}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input placeholder="Search clients..." className="pl-10" />
        </div>
      </div>

      {/* Clients Grid */}
      {isDataLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground text-lg">Loading clients...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
          <Card key={client.id} className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-foreground">{client.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <span
                      className={`text-xs font-medium ${client.status === "Active" ? "text-green-500" : "text-gray-500"}`}
                    >
                      {client.status}
                    </span>
                  </CardDescription>
                  {client.company && (
                    <p className="text-xs text-muted-foreground mt-1">{client.company}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleEditClient(client)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteClient(client.id!, client.name)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail size={16} className="text-muted-foreground" />
                <span>{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone size={16} className="text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-lg font-bold text-foreground">{client.invoices || 0}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12">
          <Building size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No clients yet</h3>
          <p className="text-muted-foreground mb-4">Start by adding your first client</p>
          <Button
            onClick={() => setIsAddClientOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
          >
            <Plus size={20} className="mr-2" />
            Add Your First Client
          </Button>
        </div>
      )}
    </div>
  )
}

export default ClientsPage