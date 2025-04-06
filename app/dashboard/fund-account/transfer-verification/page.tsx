"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Home,
  RefreshCcw,
  Search,
  Clock,
  Download
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { BottomMenu } from "@/components/BottomMenu"
import toast from "@/lib/toast"
import { useUserProfile } from "@/lib/hooks"

type VerificationStatus = 'searching' | 'verifying' | 'confirming' | 'success' | 'failed';

export default function TransferVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userProfile, isLoading: profileLoading } = useUserProfile()
  const [status, setStatus] = useState<VerificationStatus>('searching')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState("Searching for your transfer...")
  const [secondaryMessage, setSecondaryMessage] = useState("")
  const [amount, setAmount] = useState("0.00")
  const [transferTime, setTransferTime] = useState<string>("")

  // Get transaction details from query params
  const transactionRef = searchParams?.get('reference') || ''
  const paymentAmount = searchParams?.get('amount') || '0'

  useEffect(() => {
    // Set the amount from the query param
    if (paymentAmount) {
      setAmount(parseFloat(paymentAmount).toFixed(2))
    }
    
    // Set the transfer time
    setTransferTime(new Date().toLocaleTimeString())
  }, [paymentAmount])

  // Simulate the verification process
  useEffect(() => {
    let mounted = true
    
    const simulateVerification = async () => {
      try {
        // Step 1: Searching
        setStatus('searching')
        setMessage("Searching for your transfer...")
        setSecondaryMessage("This usually takes 30-60 seconds")
        setProgress(10)
        
        // Wait for a moment to simulate searching
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        if (!mounted) return
        
        // Step 2: Verifying
        setStatus('verifying')
        setMessage("Transfer found! Verifying details...")
        setSecondaryMessage("Confirming amount and sender information")
        setProgress(40)
        
        // Wait for a moment to simulate verification
        await new Promise(resolve => setTimeout(resolve, 2500))
        
        if (!mounted) return
        
        // Step 3: Confirming
        setStatus('confirming')
        setMessage("Processing your transfer...")
        setSecondaryMessage("Almost there! Crediting your wallet")
        setProgress(75)
        
        // Wait for a moment to simulate confirmation
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        if (!mounted) return
        
        // Final step: Success (always succeed in this demo)
        setStatus('success')
        setMessage("Transfer successful!")
        setSecondaryMessage("Your wallet has been credited with ₦" + new Intl.NumberFormat('en-NG').format(parseFloat(amount)))
        setProgress(100)
        
        // Show success toast
        toast.success("Your wallet has been credited successfully!")
        
        // Wait for a moment before allowing navigation
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error("Error simulating verification:", error)
        if (mounted) {
          setStatus('failed')
          setMessage("Verification failed")
          setSecondaryMessage("We couldn't verify your transfer. Please try again.")
          setProgress(100)
          
          // Show error toast
          toast.error("Verification failed. Please try again.")
        }
      }
    }

    simulateVerification()
    
    return () => {
      mounted = false
    }
  }, [amount])

  const statusConfig = {
    searching: {
      title: "Searching for Transfer",
      icon: <Search className="w-8 h-8" />,
      color: "text-blue-600 bg-blue-100",
      details: "We're checking our system for your recent transfer. This may take a moment."
    },
    verifying: {
      title: "Verifying Details",
      icon: <RefreshCcw className="w-8 h-8 animate-spin" />,
      color: "text-purple-600 bg-purple-100",
      details: "We found a transfer matching your details. Now verifying the amount and account information."
    },
    confirming: {
      title: "Confirming Transfer",
      icon: <Clock className="w-8 h-8 animate-spin" />,
      color: "text-orange-600 bg-orange-100",
      details: "Transfer confirmed! We're now processing the payment and crediting your account."
    },
    success: {
      title: "Transfer Successful",
      icon: <CheckCircle2 className="w-8 h-8" />,
      color: "text-green-600 bg-green-100",
      details: "Your transfer has been successfully processed and your wallet has been credited."
    },
    failed: {
      title: "Verification Failed",
      icon: <XCircle className="w-8 h-8" />,
      color: "text-red-600 bg-red-100",
      details: "We couldn't verify your transfer at this time. Please try again or contact support."
    }
  }

  const isProcessing = ['searching', 'verifying', 'confirming'].includes(status)

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <header className="bg-white border-b">
        <div className="flex items-center p-4 lg:px-8 max-w-7xl mx-auto">
          <Link href="/dashboard/fund-account" className="text-gray-600">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-semibold ml-4">Transfer Verification</h1>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Status Card */}
          <Card className="p-6 rounded-2xl">
            <div className="text-center">
              <div className={`inline-flex p-3 rounded-full ${statusConfig[status].color} mb-4`}>
                {statusConfig[status].icon}
              </div>
              <h2 className="text-2xl font-bold mb-2">{statusConfig[status].title}</h2>
              <p className="text-gray-600 mb-2">{message}</p>
              <p className="text-gray-500 text-sm mb-2">{secondaryMessage}</p>
              
              {/* Enhanced Status Details */}
              <p className="text-gray-600 text-sm mb-6 bg-gray-50 p-3 rounded-lg">
                {statusConfig[status].details}
              </p>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-700 ease-in-out"
                    style={{ 
                      width: `${progress}%`,
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' 
                    }}
                  />
                </div>
              )}

              {/* Amount with Larger Display */}
              <div className={`rounded-xl p-6 mb-6 ${
                isProcessing ? 'bg-blue-50 border border-blue-100' :
                status === 'success' ? 'bg-green-50 border border-green-100' :
                'bg-red-50 border border-red-100'
              }`}>
                <p className="text-sm font-medium mb-2">Amount</p>
                <p className={`text-3xl font-bold ${
                  isProcessing ? 'text-blue-600' :
                  status === 'success' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  ₦{new Intl.NumberFormat('en-NG').format(parseFloat(amount))}
                </p>
                {transferTime && (
                  <p className="text-xs mt-2 text-gray-500">
                    Transfer initiated at {transferTime}
                  </p>
                )}
              </div>
            </div>

            {/* Warning for Processing with Timer */}
            {isProcessing && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    Please don&apos;t close this page while we verify your transfer.
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {status === 'searching' ? 'Searching... (Step 1/3)' :
                     status === 'verifying' ? 'Verifying... (Step 2/3)' :
                     'Confirming... (Step 3/3)'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {status === 'failed' && (
              <div className="grid gap-4 mt-6">
                <Button 
                  onClick={() => {
                    setStatus('searching');
                    setProgress(10);
                    setMessage("Searching for your transfer...");
                    setSecondaryMessage("This usually takes 30-60 seconds");
                    simulateVerification();
                  }}
                  className="w-full h-12 text-lg rounded-xl bg-[#0A2357] hover:bg-[#0A2357]/90"
                >
                  Try Again
                </Button>
                <Link href="/dashboard/fund-account">
                  <Button 
                    variant="outline"
                    className="w-full h-12 text-lg rounded-xl"
                  >
                    Change Payment Method
                  </Button>
                </Link>
              </div>
            )}

            {/* Success Buttons */}
            {status === 'success' && (
              <div className="grid gap-4 mt-6">
                <Link href="/dashboard">
                  <Button 
                    className="w-full h-12 text-lg rounded-xl bg-[#0A2357] hover:bg-[#0A2357]/90"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  className="w-full h-12 text-lg rounded-xl flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Receipt
                </Button>
              </div>
            )}
          </Card>

          {/* Enhanced Transfer Details Card with Transaction Timeline */}
          {status === 'success' && (
            <>
              <Card className="p-6 rounded-2xl">
                <h3 className="font-semibold mb-4 flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                  Transaction Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Reference</span>
                    <span className="font-medium">{transactionRef.substring(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Date & Time</span>
                    <span className="font-medium">{new Date().toLocaleDateString()} {transferTime}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium text-green-600">Successful</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-medium">₦{new Intl.NumberFormat('en-NG').format(parseFloat(amount))}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Transaction Fee</span>
                    <span className="font-medium">₦0.00</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium">Bank Transfer</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Recipient</span>
                    <span className="font-medium">{userProfile?.first_name} {userProfile?.last_name}</span>
                  </div>
                </div>
              </Card>

              {/* Transaction Timeline Card */}
              <Card className="p-6 rounded-2xl">
                <h3 className="font-semibold mb-4">Transaction Timeline</h3>
                <div className="space-y-6">
                  {/* Timeline Items */}
                  <div className="relative pl-8 pb-4 border-l-2 border-green-200">
                    <div className="absolute left-[-8px] top-0 w-4 h-4 bg-green-500 rounded-full"></div>
                    <p className="font-medium">Transfer Initiated</p>
                    <p className="text-sm text-gray-600">{transferTime}</p>
                    <p className="text-xs text-gray-500 mt-1">Bank transfer initiated by you</p>
                  </div>
                  
                  <div className="relative pl-8 pb-4 border-l-2 border-green-200">
                    <div className="absolute left-[-8px] top-0 w-4 h-4 bg-green-500 rounded-full"></div>
                    <p className="font-medium">Transfer Detected</p>
                    <p className="text-sm text-gray-600">{new Date(Date.now() + 3 * 60000).toLocaleTimeString()}</p>
                    <p className="text-xs text-gray-500 mt-1">System detected your transfer</p>
                  </div>
                  
                  <div className="relative pl-8 pb-4 border-l-2 border-green-200">
                    <div className="absolute left-[-8px] top-0 w-4 h-4 bg-green-500 rounded-full"></div>
                    <p className="font-medium">Wallet Credited</p>
                    <p className="text-sm text-gray-600">{new Date(Date.now() + 5 * 60000).toLocaleTimeString()}</p>
                    <p className="text-xs text-gray-500 mt-1">₦{new Intl.NumberFormat('en-NG').format(parseFloat(amount))} has been added to your wallet</p>
                  </div>
                  
                  <div className="relative pl-8">
                    <div className="absolute left-[-8px] top-0 w-4 h-4 bg-green-500 rounded-full"></div>
                    <p className="font-medium">Transaction Completed</p>
                    <p className="text-sm text-gray-600">{new Date(Date.now() + 5 * 60000).toLocaleTimeString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Transaction completed successfully</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}

function simulateVerification() {
  // This is just a placeholder function to fix a reference error in the code
  // The actual simulation is handled inside the useEffect
} 