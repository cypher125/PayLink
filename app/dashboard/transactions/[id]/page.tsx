"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import { getUserTransactions, Transaction as ApiTransaction } from "@/lib/api"
import toast from "@/lib/toast"

interface UITransaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  reference: string;
  paymentMethod: string;
  fee: number;
  service_id?: string;
  phone_number?: string;
  email?: string;
  vtpass_reference?: string;
  request_id?: string;
  response_data?: any;
  api_status?: string;
  delivered_status?: string;
  transaction_date?: string;
  formatted_time?: string;
  transaction_type?: string;
  transaction_type_display?: string;
  service_name?: string;
}

// Process API transaction into UI transaction
const processTransaction = (apiTransaction: ApiTransaction): UITransaction => {
  // Extract basic information
  const { 
    id, 
    transaction_type, 
    service_id, 
    amount, 
    phone_number, 
    email, 
    request_id, 
    vtpass_reference, 
    status, 
    response_data, 
    created_at 
  } = apiTransaction;
  
  // Format date
  const date = new Date(created_at);
  const formattedDate = `${date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  })}`;
  
  const formattedTime = `${date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })}`;
  
  // Determine transaction type display name
  let transactionTypeDisplay = '';
  let serviceName = '';
  
  if (transaction_type === 'airtime') {
    transactionTypeDisplay = 'Airtime Purchase';
    const network = service_id?.split('-')[0] || '';
    serviceName = `${network.toUpperCase()} Airtime VTU`;
  } else if (transaction_type === 'data') {
    transactionTypeDisplay = 'Data Bundle Purchase';
    const network = service_id?.split('-')[0] || '';
    serviceName = `${network.toUpperCase()} Data Bundle`;
  } else if (transaction_type === 'tv') {
    transactionTypeDisplay = 'TV Subscription';
    const provider = service_id || '';
    serviceName = `${provider.toUpperCase()} Subscription`;
  } else if (transaction_type === 'electricity') {
    transactionTypeDisplay = 'Electricity Bill Payment';
    const provider = service_id || '';
    serviceName = `${provider.replace('-', ' ').toUpperCase()} Payment`;
  } else {
    transactionTypeDisplay = transaction_type?.charAt(0).toUpperCase() + transaction_type?.slice(1) || 'Unknown';
    serviceName = service_id || 'Unknown Service';
  }
  
  // Determine API status
  let apiStatus = 'Unknown';
  let deliveredStatus = 'Unknown';
  let uiStatus = status || 'pending';
  
  if (response_data) {
    try {
      const responseObj = typeof response_data === 'string' 
        ? JSON.parse(response_data) 
        : response_data;
      
      if (responseObj.code === '000' || responseObj.code === 0 || 
          (responseObj.response_description && responseObj.response_description.includes("SUCCESSFUL"))) {
        apiStatus = 'Delivered';
        deliveredStatus = 'Successful';
        uiStatus = 'completed';
      } else if (responseObj.code === '099') {
        apiStatus = 'Processing';
        deliveredStatus = 'Pending';
      } else {
        apiStatus = 'Failed';
        deliveredStatus = 'Failed';
      }
      
      if (responseObj.content && responseObj.content.transactions) {
        if (responseObj.content.transactions.status) {
          deliveredStatus = responseObj.content.transactions.status;
          if (responseObj.content.transactions.status.toLowerCase() === 'delivered') {
            uiStatus = 'completed';
            apiStatus = 'Delivered';
          }
        }
      }
    } catch (error) {
      console.error('Error parsing response data:', error);
    }
  }
  
  // Map payment method
  let paymentMethod = 'Wallet';
  
  // Calculate transaction fee
  const fee = 0;
  
  if (apiStatus === 'Delivered' && uiStatus === 'failed') {
    uiStatus = 'completed';
  }
  
  return {
    id,
    title: transactionTypeDisplay,
    description: `${transactionTypeDisplay} for ${phone_number || email || 'Unknown'}`,
    amount: Number(amount) || 0,
    date: formattedDate,
    status: uiStatus,
    reference: vtpass_reference || request_id || id.substring(0, 8),
    paymentMethod,
    fee,
    service_id,
    phone_number,
    email,
    vtpass_reference,
    request_id,
    response_data,
    api_status: apiStatus,
    delivered_status: deliveredStatus,
    transaction_date: created_at,
    formatted_time: formattedTime,
    transaction_type,
    transaction_type_display: transactionTypeDisplay,
    service_name: serviceName
  };
};

export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const [transaction, setTransaction] = useState<UITransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)
  
        // Fetch all transactions
        const transactions = await getUserTransactions()
        
        if (!transactions || !Array.isArray(transactions)) {
          throw new Error("Could not fetch transactions")
        }
        
        // Find the transaction with the matching ID
        const foundTransaction = transactions.find(tx => tx.id === id)
        
        if (!foundTransaction) {
          throw new Error("Transaction not found")
        }
        
        // Process the transaction for UI display
        const processedTransaction = processTransaction(foundTransaction)
        setTransaction(processedTransaction)
        
      } catch (error) {
        console.error("Error fetching transaction details:", error)
        setError("Failed to load transaction details")
        toast.error("Failed to load transaction details")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTransactionDetails()
  }, [id])

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/dashboard/transactions" className="inline-flex items-center text-sm text-gray-500 hover:text-primary">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Transactions
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-bold">Transaction Not Found</h2>
          <p className="text-gray-500">{error}</p>
        </Card>
      ) : transaction && (
        <Card className="overflow-hidden">
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{transaction.title}</h1>
              <div className={`rounded-full px-3 py-1 text-sm font-medium
                ${transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'}`}
              >
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Amount</h3>
                  <p className="text-2xl font-bold">₦{transaction.amount.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Date & Time</h3>
                  <p className="font-medium">{transaction.date}</p>
                  <p className="text-sm text-gray-500">{transaction.formatted_time}</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Reference</h3>
                  <p className="font-medium">{transaction.reference}</p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Payment Method</h3>
                  <p className="font-medium">{transaction.paymentMethod}</p>
                </div>
              </div>

              {transaction.phone_number && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Phone Number</h3>
                  <p className="font-medium">{transaction.phone_number}</p>
                </div>
              )}

              {transaction.service_name && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Service</h3>
                  <p className="font-medium">{transaction.service_name}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      
      <BottomMenu />
    </div>
  );
}

