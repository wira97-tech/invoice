"use client"

import { ChevronRight, Home, Users, FileText, Menu, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/auth-context"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  activePage: string
  onPageChange: (page: string) => void
}

export function Sidebar({ isOpen, onToggle, activePage, onPageChange }: SidebarProps) {
  const { user, signOut } = useAuth()

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "clients", label: "Clients", icon: Users },
    { id: "invoices", label: "Invoices", icon: FileText },
  ]

  const handleLogout = async () => {
    console.log('Logout button clicked')

    // First try proper logout
    try {
      console.log('Calling signOut...')
      const result = await signOut()
      console.log('SignOut result:', result)
    } catch (error) {
      console.error('Logout error:', error)
    }

    // Always redirect regardless of outcome
    console.log('Redirecting to login...')
    window.location.href = '/auth/login'
  }

  const getUserInitials = () => {
    if (user?.user_metadata?.name) {
      const names = user.user_metadata.name.split(' ')
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserName = () => {
    return user?.user_metadata?.name || 'User'
  }

  const getUserEmail = () => {
    return user?.email || 'user@example.com'
  }

  return (
    <div
      className={`flex transition-all duration-300 ease-out ${isOpen ? "w-64" : "w-20"} bg-sidebar border-r border-sidebar-border`}
    >
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {isOpen && <h1 className="text-lg font-bold text-sidebar-foreground">InvoiceHub</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
                {isOpen && isActive && <ChevronRight size={16} className="ml-auto" />}
              </button>
            )
          })}
        </nav>

        {/* Footer with User Profile, Theme Toggle and Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {/* User Profile Button */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 ${!isOpen && "justify-center"}`}
          >
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xs flex-shrink-0">
              {getUserInitials()}
            </div>
            {isOpen && (
              <div className="text-left overflow-hidden">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{getUserName()}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">{getUserEmail()}</p>
              </div>
            )}
          </button>

          <ThemeToggle />

          <button
            onClick={(e) => {
              console.log('Logout button clicked!', e)
              handleLogout()
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 ${!isOpen && "justify-center"}`}
            type="button"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {isOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
