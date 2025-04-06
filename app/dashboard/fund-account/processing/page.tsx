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
  Home
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { BottomMenu } from "@/components/BottomMenu"
import { checkPaymentStatus } from "@/lib/api"

type PaymentStatus = 'processing' | 'success' | 'failed'

export default function PaymentProcessingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<PaymentStatus>('processing')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState("Please wait while we verify your payment...")
  const [amount, setAmount] = useState("0.00")

  // Get transaction details from query params
  const transactionRef = searchParams?.get('reference') || ''
  const paymentMethod = searchParams?.get('method') || ''
  const paymentAmount = searchParams?.get('amount') || '0'

  useEffect(() => {
    // Set the amount from the query param
    if (paymentAmount) {
      setAmount(parseFloat(paymentAmount).toFixed(2))
    }
  }, [paymentAmount])

  // Check payment status
  useEffect(() => {
    let mounted = true
    
    const checkPayment = async () => {
      try {
        // Start progress animation
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 800)

        // Wait for a moment to simulate processing
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // If transaction reference is not available, go with simulated response
        if (!transactionRef) {
          if (mounted) {
            // For demo: bank_transfer succeeds, others fail
            if (paymentMethod === 'bank_transfer') {
              setStatus('success')
              setMessage("Your wallet has been credited successfully!")
            } else {
              setStatus('failed')
              setMessage("Payment failed. Please try using bank transfer instead.")
            }
          }
          clearInterval(progressInterval)
          return
        }

        // Call the API to check payment status
        const response = await checkPaymentStatus(transactionRef)
        
        if (mounted) {
          if (response.success && response.status === 'successful') {
            setStatus('success')
            setMessage("Your wallet has been credited successfully!")
            
          // Redirect to success page after a brief delay
          setTimeout(() => {
              router.push('/dashboard')
            }, 3000)
          } else {
            setStatus('failed')
            setMessage(response.message || "Payment failed. Please try again.")
          }
          setProgress(100)
        }
        
        clearInterval(progressInterval)
      } catch (error) {
        console.error("Error checking payment status:", error)
        if (mounted) {
        setStatus('failed')
          setMessage("Failed to verify payment. Please check your transactions history.")
          setProgress(100)
        }
      }
    }

    checkPayment()
    
    return () => {
      mounted = false
    }
  }, [transactionRef, paymentMethod, router])

  const statusConfig = {
    processing: {
      title: "Processing Payment",
      description: message,
      icon: <Loader2 className="w-8 h-8 animate-spin" />,
      color: "text-blue-600 bg-blue-100"
    },
    success: {
      title: "Payment Successful",
      description: message,
      icon: <CheckCircle2 className="w-8 h-8" />,
      color: "text-green-600 bg-green-100"
    },
    failed: {
      title: "Payment Failed",
      description: message,
      icon: <XCircle className="w-8 h-8" />,
      color: "text-red-600 bg-red-100"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <header className="bg-white border-b">
        <div className="flex items-center p-4 lg:px-8 max-w-7xl mx-auto">
          <Link href="/dashboard/fund-account" className="text-gray-600">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-semibold ml-4">Payment Status</h1>
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
              <p className="text-gray-600 mb-6">{statusConfig[status].description}</p>

              {/* Progress Bar */}
              {status === 'processing' && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Amount */}
              <div className={`rounded-xl p-4 mb-6 ${
                status === 'processing' ? 'bg-blue-50' :
                status === 'success' ? 'bg-green-50' :
                'bg-red-50'
              }`}>
                <p className={`text-2xl font-bold ${
                  status === 'processing' ? 'text-blue-600' :
                  status === 'success' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  ₦{new Intl.NumberFormat('en-NG').format(parseFloat(amount))}
                </p>
              </div>
            </div>

            {/* Warning for Processing */}
            {status === 'processing' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Please don&apos;t close this page while we verify your payment.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {status === 'failed' && (
              <div className="grid gap-4 mt-6">
                <Button 
                  onClick={() => router.push('/dashboard/fund-account')}
                  className="w-full h-12 text-lg rounded-xl bg-[#0A2357] hover:bg-[#0A2357]/90"
                >
                  Try Again
                </Button>
                <Link href="/dashboard">
                  <Button 
                    variant="outline"
                    className="w-full h-12 text-lg rounded-xl"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            )}

            {/* Success Button */}
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
              </div>
            )}
          </Card>
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
} 