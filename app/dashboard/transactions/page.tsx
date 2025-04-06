"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Search, 
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Download,
  Calendar,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import { getUserTransactions, Transaction as ApiTransaction } from "@/lib/api"
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

interface UITransaction {
  id: string
  type: 'credit' | 'debit'
  title: string
  description: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
  category: string
}

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<UITransaction[]>([])
  
  // Fetch real transactions from the API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        
        // Get transactions from the API
        const apiTransactions = await getUserTransactions()
        
        if (apiTransactions && Array.isArray(apiTransactions)) {
          // Transform API transactions to UI format
          const transformedTransactions = apiTransactions.map((transaction: ApiTransaction) => {
            // Determine if it's a credit or debit
            const isCredit = ['fund_wallet', 'wallet_funding', 'referral', 'bonus'].some(
              term => safeString(transaction.transaction_type).toLowerCase().includes(term)
            )

            // Create a title based on transaction_type
            let title = 'Transaction'
            let category = 'other'
            const type = safeString(transaction.transaction_type).toLowerCase()
            
            if (type.includes('airtime')) {
              title = 'Airtime Purchase'
              category = 'airtime'
            } else if (type.includes('data')) {
              title = 'Data Purchase'
              category = 'data'
            } else if (type.includes('tv') || type.includes('cable')) {
              title = 'TV Subscription'
              category = 'tv'
            } else if (type.includes('electricity')) {
              title = 'Electricity Bill'
              category = 'electricity'
            } else if (type.includes('fund') || type.includes('wallet')) {
              title = 'Wallet Funding'
              category = 'funding'
            } else if (type.includes('referral')) {
              title = 'Referral Bonus'
              category = 'referral'
            }
            
            // Format date
            const date = new Date(transaction.created_at)
            const today = new Date()
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            
            let formattedDate
            if (date.toDateString() === today.toDateString()) {
              formattedDate = `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
            } else if (date.toDateString() === yesterday.toDateString()) {
              formattedDate = 'Yesterday'
            } else {
              formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
            
            // Map status
            let uiStatus: 'completed' | 'pending' | 'failed' = 'pending'
            const apiStatus = safeString(transaction.status).toLowerCase()
            if (apiStatus.includes('success') || apiStatus.includes('complete')) {
              uiStatus = 'completed'
            } else if (apiStatus.includes('fail') || apiStatus.includes('error')) {
              uiStatus = 'failed'
            }
            
            // Create description
            let description = ''
            if (transaction.phone_number) {
              description = safeString(transaction.phone_number)
            } else if (transaction.service_id) {
              description = safeString(transaction.service_id)
            } else if (category === 'funding') {
              description = 'Bank Transfer'
            }
            
            return {
              id: transaction.id,
              type: isCredit ? 'credit' : 'debit',
              title,
              description,
              amount: transaction.amount,
              date: formattedDate,
              status: uiStatus,
              category
            } as UITransaction
          })
          
          setTransactions(transformedTransactions)
          setFilteredTransactions(transformedTransactions)
        } else {
          console.error('Invalid transactions data received:', apiTransactions)
          toast.error('Failed to load transaction data')
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
        toast.error('Failed to load transactions')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTransactions()
  }, [])
  
  // Filter transactions based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTransactions(transactions)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = transactions.filter(tx => 
        tx.title.toLowerCase().includes(query) || 
        tx.description.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)
      )
      setFilteredTransactions(filtered)
    }
  }, [searchQuery, transactions])

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="lg:hidden">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-xl font-semibold">Transactions</h1>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
          
          {/* Search and Filter */}
          <div className="p-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 w-full"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-gray-500">Loading your transactions...</p>
            </div>
          ) : filteredTransactions.length > 0 ? (
          <Card className="divide-y rounded-2xl">
              {filteredTransactions.map((transaction) => (
              <Link 
                key={transaction.id}
                href={`/dashboard/transactions/${transaction.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'credit' 
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'credit' 
                      ? <ArrowDownLeft className="w-5 h-5" />
                      : <ArrowUpRight className="w-5 h-5" />
                    }
                  </div>
                  <div>
                    <h4 className="font-medium">{transaction.title}</h4>
                    <p className="text-sm text-gray-500">{transaction.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}₦{parseFloat(transaction.amount.toString()).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </Card>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500">No transactions found</p>
              {searchQuery ? (
                <p className="text-sm text-gray-400 mt-2">Try changing your search criteria</p>
              ) : (
                <p className="text-sm text-gray-400 mt-2">Once you make transactions, they will appear here</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}

