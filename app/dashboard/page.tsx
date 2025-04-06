"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Home, 
  Wallet, 
  User, 
  Settings, 
  Phone,
  Globe,
  BookOpen,
  Tv,
  Zap,
  Users,
  LogOut,
  Bell, 
  ArrowRight,
  Plus, 
  History,
  Eye,
  EyeOff,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import { BottomMenu } from "@/components/BottomMenu"
import { getDashboardStats, Transaction, DashboardStats } from "@/lib/api"
import toast from "@/lib/toast"
import { useUserProfile } from "@/lib/hooks"

// UI-specific transaction interface that extends the API Transaction
interface UITransaction extends Omit<Transaction, 'transaction_type'> {
  name: string;
  icon: string | null;
  date: string;
  type: string;  // Explicit type property to be used instead of transaction_type
}

// Modified DashboardStats for UI
interface UIDashboardStats extends Omit<DashboardStats, 'recent_transactions'> {
  recent_transactions: UITransaction[];
}

// Helper function to safely handle string operations
const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return String(value);
  } catch {
    return '';
  }
};

export default function Dashboard() {
  const [showBalance, setShowBalance] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [dashboardStats, setDashboardStats] = useState<UIDashboardStats>({
    balance: 0,
    this_month_spent: 0,
    total_spent: 0,
    recent_transactions: []
  })

  // Get user profile data
  const { userProfile, isLoading: profileLoading } = useUserProfile()

  // Check if the user has a PIN set
  useEffect(() => {
    if (!profileLoading && userProfile) {
      // Check if the user object has a has_pin property that is explicitly false
      // This avoids type issues while still checking for the PIN status
      if ('has_pin' in userProfile && userProfile.has_pin === false) {
        console.log('User does not have PIN, redirecting to PIN setting page');
        
        // Update pin_set cookie to ensure middleware knows PIN is not set
        document.cookie = `pin_set=false; path=/; SameSite=Lax`;
        
        // Use setTimeout to avoid navigation during render
        setTimeout(() => {
          // Force a hard navigation to avoid any issues with Next.js navigation
          window.location.href = '/auth/setpin';
        }, 0);
      }
    }
  }, [userProfile, profileLoading]);

  useEffect(() => {
    // Update balance whenever the user profile changes
    if (userProfile && userProfile.vtpass_balance !== undefined) {
      setBalance(userProfile.vtpass_balance)
      setBalanceLoading(false)
    }
  }, [userProfile])
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch dashboard stats
        const stats = await getDashboardStats()
        
        if (stats) {
          // Make sure we have a valid array of transactions
          const safeTransactions = Array.isArray(stats.recent_transactions) 
            ? stats.recent_transactions 
            : [];
          
          // Process transactions to ensure icon field is never empty
          const processedTransactions = safeTransactions.map(transaction => {
            // Ensure transaction is valid
            if (!transaction) {
              return {
                id: `tx-${Math.random().toString(36).substring(2, 9)}`,
                transaction_type: 'unknown',
                service_id: '',
                amount: 0,
                request_id: '',
                status: 'unknown',
                created_at: new Date().toISOString(),
                name: 'Unknown Transaction',
                icon: '/icons/transaction.png',
                date: new Date().toISOString(),
                type: 'unknown'
              };
            }
            
            // Get transaction details with safe fallbacks
            const transactionType = safeString(transaction.transaction_type);
            const serviceId = safeString(transaction.service_id);
            
            // Safely determine icon
            const icon = getTransactionIcon(transactionType);
            
            // Create a display name from transaction data
            const name = serviceId || transactionType || 'Transaction';
            
            // Add UI-specific fields to the transaction
            return {
              ...transaction,
              // Add UI fields that don't exist in the API Transaction type
              name,
              icon,
              type: transactionType,
              date: safeString(transaction.created_at) || new Date().toISOString()
            }
          });
          
          setDashboardStats({
            balance: stats.balance || 0,
            this_month_spent: stats.this_month_spent || 0,
            total_spent: stats.total_spent || 0,
            recent_transactions: processedTransactions
          })
        }
      } catch (error: unknown) {
        console.error("Error fetching dashboard data:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data"
        setTimeout(() => {
          toast.error(errorMessage)
        }, 0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Helper function to determine transaction icon based on type
  const getTransactionIcon = (type: string): string => {
    // Use safeString helper to ensure we have a valid string
    const safeType = safeString(type);
    if (!safeType) {
      return '/icons/transaction.png';
    }
    
    // Safely convert to lowercase
    const typeLower = safeType.toLowerCase();
    
    // Map service types to icon paths
    const iconMap: Record<string, string> = {
      'airtime': '/icons/airtime.png',
      'data': '/icons/data.png',
      'electricity': '/icons/electricity.png',
      'cable': '/icons/tv.png',
      'tv': '/icons/tv.png',
      'education': '/icons/education.png',
      'exam': '/icons/education.png',
      'transfer': '/icons/transfer.png',
      'withdrawal': '/icons/withdrawal.png',
      'deposit': '/icons/deposit.png'
    }
    
    // Find matching icon or use default
    for (const [key, iconPath] of Object.entries(iconMap)) {
      if (typeLower.includes(key)) {
        return iconPath;
      }
    }
    
    // Return default icon path if no match is found
    return '/icons/transaction.png';
  }

  // Format currency in Naira
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount).replace(/NGN/g, '₦')
  }

  // Get initials from name
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

  const quickServices = [
    { 
      icon: Phone, 
      name: "Airtime", 
      href: "/dashboard/airtime",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500"
    },
    { 
      icon: Globe, 
      name: "Data Bundle", 
      href: "/dashboard/data-bundle",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500"
    },
    { 
      icon: BookOpen, 
      name: "Exam Pin", 
      href: "/dashboard/exam",
      iconBg: "bg-green-50",
      iconColor: "text-green-500"
    },
    { 
      icon: Zap, 
      name: "Electricity", 
      href: "/dashboard/electricity",
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-500"
    },
    { 
      icon: Tv, 
      name: "Cable TV", 
      href: "/dashboard/cable-tv",
      iconBg: "bg-red-50",
      iconColor: "text-red-500"
    },
    { 
      icon: Users, 
      name: "Refer&Earn", 
      href: "/dashboard/referral",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-500"
    },
  ]

  const recentTransactions: UITransaction[] = dashboardStats.recent_transactions

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
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
              <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
                <span className="text-sm font-medium">{getInitials()}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{getFullName()}</p>
                <p className="text-sm text-gray-500">{userProfile?.email}</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-3 border-red-100"
            onClick={() => {
              // Clear localStorage tokens
              localStorage.removeItem('auth_tokens');
              
              // Clear cookies by setting an expired date
              document.cookie = 'access_token=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              
              // Redirect to login page
              window.location.href = '/auth/login';
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto">
            <Link href="/dashboard/profile" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
                <span className="text-sm font-medium">{getInitials()}</span>
              </div>
            </Link>
            <button className="relative">
              <Bell className="h-6 w-6 text-gray-600" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </header>

        {/* Main Content Container - Using the same max-width as header */}
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-gradient-to-r from-[#0A2357] to-[#1A3B7C] text-white p-6 rounded-2xl shadow-lg">
              <div className="flex flex-col space-y-4">
                {/* Balance Section */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                  
                    <Button
                      variant="outline" 
                      size="icon"
                      className="rounded-full bg-white/10 text-white border-white/20 hover:bg-white/20 h-10 w-10"
                      asChild
                    >
                      <Link href="/dashboard/fund-account">
                        <Plus className="h-5 w-5" />
                      </Link>
                    </Button>
                
                    <Button
                      variant="outline"
                      size="icon" 
                      className="rounded-full bg-white/10 text-white border-white/20 hover:bg-white/20 h-10 w-10"
                      asChild
                    >
                      <Link href="/dashboard/transactions">
                        <History className="h-5 w-5" />
                      </Link>
                    </Button>
                  
                  </div>
                  <button 
                    onClick={() => setShowBalance(!showBalance)}
                    className="opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>

                {/* Balance Amount */}
                <div className="text-3xl font-bold mb-2">
                  {balanceLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    showBalance ? formatCurrency(balance) : "****"
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-sm opacity-80">This Month</p>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold">{formatCurrency(dashboardStats.this_month_spent)}</p>
                    )}
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-sm opacity-80">Total Spent</p>
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold">{formatCurrency(dashboardStats.total_spent)}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Services Section */}
            <section className="mt-8">
              <h2 className="text-lg font-medium mb-4">Quick Services</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {quickServices.map((service) => (
                  <Link
                    key={service.name}
                    href={service.href}
                    className="bg-white rounded-xl p-4 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${service.iconBg} ${service.iconColor} p-3 rounded-lg`}>
                        <service.icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {service.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Link href="/dashboard/fund-account">
                  <Button
                    variant="outline" 
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Fund Account
                  </Button>
                </Link>
                <Link href="/dashboard/transactions">
                  <Button
                    variant="outline" 
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                  >
                    <History className="w-5 h-5" />
                    Transaction History
                  </Button>
                </Link>
              </div>
            </section>

            {/* Recent Transactions - Enhanced */}
            <section className="mt-8 mb-20 lg:mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Transactions</h2>
                <Link href="/dashboard/transactions">
                  <Button variant="link" className="text-[#0A2357]">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
            </div>
              <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => {
                    // Add additional safety
                    if (!transaction || typeof transaction !== 'object') {
                      return null;
                    }
                    
                    // Safely access transaction properties with destructuring to avoid unused variable warnings
                    const { id = `fallback-${Math.random()}`, name = 'Transaction', date = 'Recent', amount = 0, status = 'pending' } = transaction;
                    
                    // Get the first letter of the name safely
                    const nameInitial = (name && typeof name === 'string' && name.length > 0) 
                      ? name.charAt(0).toUpperCase() 
                      : 'T';
                    
                    return (
                      <div
                        key={id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full ${
                            // Type is now part of the UITransaction interface
                            transaction.type === 'credit'
                              ? 'bg-green-100 text-green-600'
                              : transaction.type === 'debit'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-600'
                          } flex items-center justify-center`}>
                            {transaction.type === 'credit'
                              ? <ArrowDownLeft className="w-5 h-5" />
                              : transaction.type === 'debit'
                                ? <ArrowUpRight className="w-5 h-5" />
                                : nameInitial
                            }
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{name}</h3>
                            <p className="text-sm text-gray-500">{date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={status === 'successful' || status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                          ₦{parseFloat(amount.toString()).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                        <div className={`text-xs ${
                          status === 'successful' || status === 'completed' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {status}
                        </div>
                      </div>
                    </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <p>No transactions found</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      <BottomMenu />
    </div>
  )
}
