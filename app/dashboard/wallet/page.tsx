"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Eye, 
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Copy,
  CheckCheck,
  History,
  ArrowLeft,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import { getUserTransactions, Transaction } from "@/lib/api"
import { useUserProfile } from "@/lib/hooks"
import toast from "@/lib/toast"

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

export default function WalletPage() {
  const [showBalance, setShowBalance] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  // Get user profile data
  const { userProfile, isLoading: profileLoading } = useUserProfile()

  // Update balance whenever user profile changes
  useEffect(() => {
    if (userProfile && userProfile.vtpass_balance !== undefined) {
      setBalance(userProfile.vtpass_balance)
      setBalanceLoading(false)
    }
  }, [userProfile])

  // Fetch wallet transactions
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch transactions
        const transactionsData = await getUserTransactions()
        setTransactions(transactionsData || [])
      } catch (error) {
        console.error("Error fetching wallet data:", error)
        setTimeout(() => {
          toast.error("Failed to load wallet data")
        }, 0)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchWalletData()
  }, [])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
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

  // Format transaction date
  const formatTransactionDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const isToday = date.toDateString() === today.toDateString()
      const isYesterday = date.toDateString() === yesterday.toDateString()
      
      const time = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
      
      if (isToday) {
        return `Today, ${time}`
      } else if (isYesterday) {
        return `Yesterday, ${time}`
      } else {
        return `${date.toLocaleDateString('en-NG', { 
          month: 'short', 
          day: 'numeric' 
        })}, ${time}`
      }
    } catch {
      return dateString
    }
  }

  // Get transaction type (credit/debit)
  const getTransactionType = (transaction: Transaction) => {
    // Safely access transaction_type
    if (!transaction || typeof transaction !== 'object') {
      return 'debit'; // Default fallback
    }
    
    const creditTypes = ['fund_wallet', 'wallet_funding'];
    const transactionType = safeString(transaction.transaction_type).toLowerCase();
    
    return creditTypes.includes(transactionType) ? 'credit' : 'debit';
  }

  // Get transaction title and description
  const getTransactionInfo = (transaction: Transaction) => {
    // Safely access transaction data
    if (!transaction || typeof transaction !== 'object') {
      return {
        title: 'Transaction',
        description: ''
      };
    }
    
    const type = safeString(transaction.transaction_type).toLowerCase();
    
    if (type.includes('airtime')) {
      return {
        title: 'Airtime Purchase',
        description: safeString(transaction.phone_number)
      };
    } else if (type.includes('data')) {
      return {
        title: 'Data Purchase',
        description: safeString(transaction.phone_number)
      };
    } else if (type.includes('tv') || type.includes('cable')) {
      return {
        title: 'TV Subscription',
        description: safeString(transaction.service_id)
      };
    } else if (type.includes('electricity')) {
      return {
        title: 'Electricity Bill',
        description: safeString(transaction.service_id)
      };
    } else if (type.includes('fund') || type.includes('wallet')) {
      return {
        title: 'Wallet Funding',
        description: 'Bank Transfer'
      };
    } else {
      return {
        title: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: safeString(transaction.service_id)
      };
    }
  }

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Loading wallet data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold">Wallet</h1>
          </div>
          <Link href="/dashboard/profile" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
              <span className="text-sm font-medium">{getInitials()}</span>
            </div>
          </Link>
        </div>
      </header>

      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-[#0A2357] to-[#1A3B7C] text-white p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium opacity-90">Available Balance</h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="opacity-80 hover:opacity-100 transition-opacity"
              >
                {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-3xl font-bold">
              {balanceLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading...</span>
                </div>
              ) : (
                showBalance ? formatCurrency(balance) : "****"
              )}
            </div>
            <Link href="/dashboard/fund-account">
              <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 mt-4">
                <Plus className="w-5 h-5 mr-2" />
                Fund Wallet
              </Button>
            </Link>
          </div>
        </Card>

        {/* Account Details */}
        <Card className="p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4">Account Details</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Account Number</p>
                <p className="font-medium">1234567890</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard("1234567890", "accountNumber")}
                className="text-gray-600"
              >
                {copiedField === "accountNumber" ? (
                  <CheckCheck className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Account Name</p>
                <p className="font-medium">
                  {`PAYLINK/${userProfile?.first_name?.toUpperCase() || ""} ${userProfile?.last_name?.toUpperCase() || ""}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(
                  `PAYLINK/${userProfile?.first_name?.toUpperCase() || ""} ${userProfile?.last_name?.toUpperCase() || ""}`, 
                  "accountName"
                )}
                className="text-gray-600"
              >
                {copiedField === "accountName" ? (
                  <CheckCheck className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Bank Name</p>
                <p className="font-medium">Wema Bank</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard("Wema Bank", "bankName")}
                className="text-gray-600"
              >
                {copiedField === "bankName" ? (
                  <CheckCheck className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Transfer any amount to this account to fund your wallet instantly. This is your unique PayLink virtual account.</p>
        </Card>

        {/* Recent Transactions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <Link href="/dashboard/transactions" className="text-sm text-[#0A2357] flex items-center">
              <History className="w-4 h-4 mr-1" />
              <span>View All</span>
            </Link>
          </div>

          {transactions.length === 0 ? (
            <Card className="p-6 rounded-2xl text-center">
              <p className="text-gray-500">No transactions yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => {
                const transactionType = getTransactionType(transaction);
                const { title, description } = getTransactionInfo(transaction);
                
                return (
                  <Link href={`/dashboard/transactions/${transaction.id}`} key={transaction.id}>
                    <Card className="p-4 rounded-2xl hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transactionType === 'credit' 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {transactionType === 'credit' 
                              ? <ArrowDownLeft className="w-5 h-5" /> 
                              : <ArrowUpRight className="w-5 h-5" />
                            }
                          </div>
                          <div>
                            <p className="font-medium">{title}</p>
                            <p className="text-sm text-gray-600">{description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transactionType === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transactionType === 'credit' ? '+ ' : '- '}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-600">{formatTransactionDate(transaction.created_at)}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}
