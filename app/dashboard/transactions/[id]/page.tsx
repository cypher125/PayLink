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
import { formatDistanceToNow } from "date-fns"

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
  // New fields for VTPass integration
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

export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  // Remove the React.use() call that's causing the error
  const { id } = params;

  const [transaction, setTransaction] = useState<UITransaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      // Extract network name from service_id (e.g., mtn, airtel)
      const network = service_id?.split('-')[0] || '';
      serviceName = `${network.toUpperCase()} Airtime VTU`;
    } else if (transaction_type === 'data') {
      transactionTypeDisplay = 'Data Bundle Purchase';
      // Extract network name from service_id (e.g., mtn-data, airtel-data)
      const network = service_id?.split('-')[0] || '';
      serviceName = `${network.toUpperCase()} Data Bundle`;
    } else if (transaction_type === 'tv') {
      transactionTypeDisplay = 'TV Subscription';
      // Extract provider from service_id (e.g., dstv, gotv)
      const provider = service_id || '';
      serviceName = `${provider.toUpperCase()} Subscription`;
    } else if (transaction_type === 'electricity') {
      transactionTypeDisplay = 'Electricity Bill Payment';
      // Extract provider from service_id (e.g., ikeja-electric)
      const provider = service_id || '';
      serviceName = `${provider.replace('-', ' ').toUpperCase()} Payment`;
    } else {
      transactionTypeDisplay = transaction_type?.charAt(0).toUpperCase() + transaction_type?.slice(1) || 'Unknown';
      serviceName = service_id || 'Unknown Service';
    }
    
    // Determine API status based on VTPass response
    let apiStatus = 'Unknown';
    let deliveredStatus = 'Unknown';
    
    // Default status from database
    let uiStatus = status || 'pending';
    
    if (response_data) {
      try {
        // Parse response data if it's a string
        const responseObj = typeof response_data === 'string' 
          ? JSON.parse(response_data) 
          : response_data;
        
        // Check for VTPass status codes
        if (responseObj.code === '000' || responseObj.code === 0 || 
            (responseObj.response_description && 
             responseObj.response_description.includes("SUCCESSFUL"))) {
          apiStatus = 'Delivered';
          deliveredStatus = 'Successful';
          // FORCE the transaction status to completed when API shows success
          // Regardless of what the database says
          uiStatus = 'completed';
        } else if (responseObj.code === '099') {
          apiStatus = 'Processing';
          deliveredStatus = 'Pending';
        } else {
          apiStatus = 'Failed';
          deliveredStatus = 'Failed';
        }
        
        // Try to get a more specific status from the content if available
        if (responseObj.content && responseObj.content.transactions) {
          if (responseObj.content.transactions.status) {
            deliveredStatus = responseObj.content.transactions.status;
            // If VTPass transaction status is "delivered", override to completed
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
    
    // Map payment method based on transaction type
    let paymentMethod = 'Wallet';
    
    // Calculate transaction fee (usually 0 for now)
    const fee = 0;
    
    // CRITICAL: Override the entire status display
    // If API shows delivered but status is failed, prioritize API status
    if (apiStatus === 'Delivered' && uiStatus === 'failed') {
      uiStatus = 'completed';
      console.log('Overriding failed status to completed because API shows success');
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
  }

  // Helper function to get network name from service ID
  const getNetworkFromServiceId = (serviceId: string): string => {
    const serviceIdLower = serviceId.toLowerCase();
    
    if (serviceIdLower.includes('mtn')) return 'MTN';
    if (serviceIdLower.includes('airtel')) return 'Airtel';
    if (serviceIdLower.includes('glo')) return 'Glo';
    if (serviceIdLower.includes('etisalat') || serviceIdLower.includes('9mobile')) return '9Mobile';
    
    return 'Unknown';
  }

  // Helper function to get provider name from service ID
  const getProviderFromServiceId = (serviceId: string): string => {
    const serviceIdLower = serviceId.toLowerCase();
    
    if (serviceIdLower.includes('dstv')) return 'DSTV';
    if (serviceIdLower.includes('gotv')) return 'GoTV';
    if (serviceIdLower.includes('startimes')) return 'Startimes';
    if (serviceIdLower.includes('showmax')) return 'ShowMax';
    if (serviceIdLower.includes('ikeja')) return 'Ikeja Electric';
    if (serviceIdLower.includes('eko')) return 'Eko Electric';
    if (serviceIdLower.includes('kano')) return 'Kano Electric';
    
    return serviceId; // Return the original if no match
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'success' || statusLower === 'delivered') {
      return 'bg-green-100 text-green-600';
    } else if (statusLower === 'pending' || statusLower === 'processing') {
      return 'bg-yellow-100 text-yellow-600';
    } else {
      return 'bg-red-100 text-red-600';
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'success' || statusLower === 'delivered') {
      return <CheckCircle2 className="h-6 w-6 text-green-600" />;
    } else if (statusLower === 'pending' || statusLower === 'processing') {
      return <Clock className="h-6 w-6 text-yellow-600" />;
    } else {
      return <XCircle className="h-6 w-6 text-red-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/transactions" className="text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold">Transaction Details</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-gray-500">Loading transaction details...</p>
            </div>
          ) : error ? (
            <Card className="p-6 rounded-2xl text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Transaction Not Found</h2>
              <p className="text-gray-500">{error}</p>
              <Button 
                className="mt-6"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </Card>
          ) : transaction ? (
            <>
          {/* Status Card */}
          <Card className="p-6 rounded-2xl text-center">
            <div className={`inline-flex p-3 rounded-full ${
              transaction.api_status === 'Delivered' 
                ? 'bg-green-100 text-green-600' 
                : getStatusColor(transaction.status)
            } mb-4`}>
              {transaction.api_status === 'Delivered' 
                ? <CheckCircle2 className="h-6 w-6 text-green-600" />
                : getStatusIcon(transaction.status)}
            </div>
            <h2 className="text-2xl font-bold mb-2">₦{transaction.amount.toLocaleString()}</h2>
            <div className="flex flex-col gap-2 items-center">
              <p className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                transaction.api_status === 'Delivered' 
                  ? 'bg-green-100 text-green-600' 
                  : getStatusColor(transaction.status)
              }`}>
                {transaction.api_status === 'Delivered' 
                  ? 'Completed' 
                  : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </p>
              {transaction.api_status && (
                <p className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  transaction.api_status === 'Delivered' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  API: {transaction.api_status}
                </p>
              )}
            </div>
          </Card>

          {/* Transaction Overview */}
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Transaction Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Transaction ID</span>
                <span className="font-medium">{transaction.id.substring(0, 12)}...</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Request ID</span>
                <span className="font-medium">{transaction.request_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Service</span>
                <span className="font-medium">{transaction.service_name || transaction.service_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">₦{transaction.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">{transaction.date}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Time</span>
                <span className="font-medium">{transaction.formatted_time}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${
                  transaction.api_status === 'Delivered' 
                    ? 'text-green-600' 
                    : transaction.status === 'completed' 
                      ? 'text-green-600' 
                      : transaction.status === 'pending' 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                }`}>
                  {transaction.api_status === 'Delivered' 
                    ? 'Completed' 
                    : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">API Status</span>
                <span className={`font-medium ${
                  transaction.api_status === 'Delivered' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {transaction.api_status || 'Unknown'}
                </span>
              </div>
              {transaction.phone_number && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Phone Number</span>
                  <span className="font-medium">{transaction.phone_number}</span>
                </div>
              )}
              {transaction.email && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium">{transaction.email}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Additional Details */}
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Transaction Type</span>
                <span className="font-medium">{transaction.transaction_type_display || transaction.transaction_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Service ID</span>
                <span className="font-medium">{transaction.service_id}</span>
              </div>
              {transaction.vtpass_reference && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">VTPass Reference</span>
                  <span className="font-medium">{transaction.vtpass_reference}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium">{transaction.paymentMethod}</span>
              </div>
              {transaction.delivered_status && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Delivery Status</span>
                  <span className="font-medium">{transaction.delivered_status}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Fee</span>
                <span className="font-medium">₦{transaction.fee}</span>
              </div>
            </div>
          </Card>

          {/* Response Data (if available) */}
          {transaction.response_data && Object.keys(transaction.response_data).length > 0 && (
            <Card className="p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">API Response</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => {
                    // Create a text representation of the JSON
                    const jsonString = JSON.stringify(transaction.response_data, null, 2);
                    
                    // Copy to clipboard
                    navigator.clipboard.writeText(jsonString)
                      .then(() => toast.success("JSON copied to clipboard"))
                      .catch(() => toast.error("Failed to copy JSON"));
                  }}
                >
                  Copy JSON
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(transaction.response_data, null, 2)}
                </pre>
              </div>
              
              {/* Summary of key response data */}
              {typeof transaction.response_data === 'object' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium mb-2">Key Information</h4>
                  <div className="space-y-2">
                    {transaction.response_data.code && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Response Code:</span>
                        <span className="text-xs font-medium">{transaction.response_data.code}</span>
                      </div>
                    )}
                    {transaction.response_data.response_description && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Response Message:</span>
                        <span className="text-xs font-medium">{transaction.response_data.response_description}</span>
                      </div>
                    )}
                    {transaction.response_data.requestId && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Request ID:</span>
                        <span className="text-xs font-medium">{transaction.response_data.requestId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Support Button */}
          <div className="flex flex-col gap-3">
          <Button 
            variant="outline"
            className="w-full h-12 text-lg rounded-xl"
          >
            Need Help?
          </Button>
            
            <Button 
              variant="outline"
              className="w-full h-12 text-lg rounded-xl border-green-600 text-green-600 hover:bg-green-50"
            >
              Download Receipt
            </Button>
          </div>
            </>
          ) : null}
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}

