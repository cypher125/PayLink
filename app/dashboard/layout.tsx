"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  Wallet, 
  User, 
  Settings, 
  LogOut,
  Loader2
} from "lucide-react"
import toast from "@/lib/toast"
import { getProfile } from "@/lib/api"
import { UserProfile } from "@/lib/types"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    setMounted(true)
    
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const profileData = await getProfile()
        setUserProfile(profileData)
      } catch (error) {
        console.error("Error fetching user profile:", error)
        // Using setTimeout to avoid React rendering issues with toast
        setTimeout(() => {
          toast.error("Failed to load user profile")
        }, 0)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserProfile()
  }, [])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_tokens');
      document.cookie = 'access_token=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      toast.success("Logged out successfully");
      window.location.href = '/auth/login';
    }
  }

  if (!mounted) {
    return null
  }

  // Get initials from name or use fallback
  const getInitials = () => {
    if (!userProfile) return "U"
    const fullName = `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()
    if (!fullName) return "U"
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Get formatted name
  const getFullName = () => {
    if (!userProfile) return "User"
    return `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || "User"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-100 hidden lg:flex lg:flex-col">
        {/* Logo Section */}
        <div className="p-8 border-b border-gray-100">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-[#0A2357]/20 backdrop-blur-sm"></div>
            <span className="text-2xl font-bold text-[#0A2357]">PayLink</span>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-8 px-6">
          <div className="space-y-1.5">
            {[
              { 
                icon: Home, 
                name: "Dashboard", 
                href: "/dashboard",
                description: "Overview of your account" 
              },
              { 
                icon: Wallet, 
                name: "Wallet", 
                href: "/dashboard/wallet",
                description: "Manage your funds"
              },
              { 
                icon: User, 
                name: "Profile", 
                href: "/dashboard/profile",
                description: "Your personal information"
              },
              { 
                icon: Settings, 
                name: "Settings", 
                href: "/dashboard/settings",
                description: "Configure your account"
              },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-start gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition-all group ${
                  item.name === "Dashboard" 
                    ? "bg-[#0A2357]/5 text-[#0A2357]" 
                    : "text-gray-600"
                }`}
              >
                <div className={`p-2 rounded-xl ${
                  item.name === "Dashboard"
                    ? "bg-[#0A2357] text-white"
                    : "bg-gray-100 group-hover:bg-[#0A2357]/10 group-hover:text-[#0A2357]"
                }`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-medium ${
                    item.name === "Dashboard"
                      ? "text-[#0A2357]"
                      : "text-gray-700 group-hover:text-[#0A2357]"
                  }`}>
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-6 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                  <div>
                    <p className="font-medium text-gray-900">Loading...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
                    <span className="text-sm font-medium">{getInitials()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getFullName()}</p>
                    <p className="text-sm text-gray-500">{userProfile?.email || 'user@example.com'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-3 border-red-100"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {children}
      </main>
    </div>
  )
}