"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import DashboardPage from "@/components/pages/dashboard-page"
import ClientsPage from "@/components/pages/clients-page"
import InvoicesPage from "@/components/pages/invoices-page"

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />
      case "clients":
        return <ClientsPage />
      case "invoices":
        return <InvoicesPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activePage={currentPage}
        onPageChange={setCurrentPage}
      />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  )
}
