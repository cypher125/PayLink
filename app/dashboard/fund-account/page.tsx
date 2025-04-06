"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowLeft, CreditCard, Building, Smartphone, Copy, CheckCheck, ChevronRight } from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import { useRouter } from "next/navigation"
import { useUserProfile } from "@/lib/hooks"
import toast from "@/lib/toast"
import { fundWallet, FundWalletData } from "@/lib/api"

// This would come from your user's data/API in a real app
const defaultVirtualAccount = {
  accountNumber: "1234567890",
  accountName: "PAYLINK/JOHN DOE",
  bankName: "Wema Bank",
}

const fundingMethods = [
  { 
    id: "bank_transfer", 
    name: "Bank Transfer", 
    icon: Building,
    description: "Fund via bank transfer (Always succeeds in this demo)"
  },
  { 
    id: "card", 
    name: "Debit Card", 
    icon: CreditCard,
    description: "Fund instantly using your debit card (Always fails in this demo)"
  },
  { 
    id: "ussd", 
    name: "USSD", 
    icon: Smartphone,
    description: "Fund using USSD code (Always fails in this demo)"
  },
]

export default function FundAccountPage() {
  const router = useRouter()
  const { userProfile } = useUserProfile()
  const [amount, setAmount] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [virtualAccount, setVirtualAccount] = useState(defaultVirtualAccount)
  const [currentStep, setCurrentStep] = useState(1) // Step 1: amount selection, Step 2: payment details
  const [showBankTransferDetails, setShowBankTransferDetails] = useState(false)

  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000]

  // Fetch and set virtual account details from user profile
  useEffect(() => {
    if (userProfile) {
      // In a real app, these details would come from the API
      // Here we're using the user profile name to personalize the account name
      const fullName = `${userProfile.first_name} ${userProfile.last_name}`.toUpperCase()
      setVirtualAccount({
        ...defaultVirtualAccount,
        accountName: `PAYLINK/${fullName}`,
      })
    }
  }, [userProfile])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    
    // If bank transfer is selected, show details right away
    if (methodId === 'bank_transfer') {
      setShowBankTransferDetails(true);
    } else {
      setShowBankTransferDetails(false);
    }
  }

  const handleProceed = async () => {
    if (!amount || !selectedMethod) {
      toast.error("Please enter an amount and select a payment method")
      return
    }

    try {
      setIsProcessing(true)

      // Create the funding data object
      const fundingData: FundWalletData = {
        amount: parseFloat(amount),
        payment_method: selectedMethod as 'bank_transfer' | 'card' | 'ussd',
        transaction_reference: `TR${Date.now()}`
      }

      // Call the API to fund the wallet
      await fundWallet(fundingData)
      
      // For bank transfers, show a special path
      if (selectedMethod === 'bank_transfer') {
        // Redirect to the bank transfer confirmation page
        handleTransferCompleted();
        return;
      }
      
      // For other methods, redirect to the processing page
      router.push(`/dashboard/fund-account/processing?reference=${fundingData.transaction_reference}&method=${selectedMethod}&amount=${amount}`)
    } catch (error) {
      console.error("Error initiating payment:", error)
      toast.error("Failed to initiate payment. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Function to handle bank transfer completion
  const handleTransferCompleted = () => {
    const reference = `TR${Date.now()}`;
    // Navigate to the transfer-verification page
    router.push(`/dashboard/fund-account/transfer-verification?reference=${reference}&amount=${amount}`);
  }

  // Show different content based on current step
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
        <header className="bg-white border-b">
          <div className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentStep(1)} className="text-gray-600">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold">Confirm Bank Transfer</h1>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="text-center mb-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                  <Building className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Complete Your Bank Transfer</h2>
                <p className="text-gray-600">
                  Transfer exactly ₦{parseFloat(amount).toLocaleString()} to the account details below
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {[
                  { label: "Account Number", value: virtualAccount.accountNumber },
                  { label: "Account Name", value: virtualAccount.accountName },
                  { label: "Bank Name", value: virtualAccount.bankName },
                  { label: "Amount", value: `₦${parseFloat(amount).toLocaleString()}` },
                ].map((detail) => (
                  <div key={detail.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">{detail.label}</p>
                      <p className="font-medium">{detail.value}</p>
                    </div>
                    {detail.label !== "Amount" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(detail.value, detail.label)}
                        className="flex items-center gap-2"
                      >
                        {copiedField === detail.label ? (
                          <CheckCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <Button 
                  className="w-full h-12 text-lg rounded-xl bg-green-600 hover:bg-green-700"
                  onClick={handleTransferCompleted}
                >
                  I&apos;ve Completed The Transfer
                </Button>
                <Button 
                  variant="outline"
                  className="w-full h-12 text-lg rounded-xl"
                  onClick={() => setCurrentStep(1)}
                >
                  Back to Payment Methods
                </Button>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl shadow-sm">
              <h3 className="font-medium mb-4">Important Information</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <span>Transfer the exact amount shown above</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <span>Use your bank app or visit any bank branch to make the transfer</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <span>After completing the transfer, click the green button above</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                  <span>Your account will be credited once the transfer is confirmed</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        <BottomMenu />
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
            <h1 className="text-xl font-semibold">Fund Wallet</h1>
          </div>
          <Link href="/dashboard/profile" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
              <span className="text-sm font-medium">
                {userProfile ? userProfile.first_name?.[0] + (userProfile.last_name?.[0] || '') : 'U'}
              </span>
            </div>
          </Link>
        </div>
      </header>

        <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {showBankTransferDetails ? (
            <>
              {/* Virtual Account Details Card for Bank Transfer */}
              <Card className="p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-medium mb-4">Your Virtual Account Details</h2>
                <div className="space-y-4">
                  {[
                    { label: "Account Number", value: virtualAccount.accountNumber },
                    { label: "Account Name", value: virtualAccount.accountName },
                    { label: "Bank Name", value: virtualAccount.bankName },
                  ].map((detail) => (
                    <div key={detail.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">{detail.label}</p>
                        <p className="font-medium">{detail.value}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(detail.value, detail.label)}
                        className="flex items-center gap-2"
                      >
                        {copiedField === detail.label ? (
                          <CheckCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Transfer the specified amount to this account to fund your wallet. The account is unique to you.
                </p>
              </Card>
            </>
          ) : (
            // Show the virtual account card only if bank transfer details are not visible
          <Card className="p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-medium mb-4">Your Virtual Account Details</h2>
            <div className="space-y-4">
              {[
                { label: "Account Number", value: virtualAccount.accountNumber },
                { label: "Account Name", value: virtualAccount.accountName },
                { label: "Bank Name", value: virtualAccount.bankName },
              ].map((detail) => (
                <div key={detail.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{detail.label}</p>
                    <p className="font-medium">{detail.value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(detail.value, detail.label)}
                    className="flex items-center gap-2"
                  >
                    {copiedField === detail.label ? (
                      <CheckCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Transfer any amount to this account to fund your wallet instantly. The account is unique to you.
            </p>
          </Card>
          )}

          {/* Amount Card */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-medium mb-4">Enter Amount</h2>
            <div className="mb-6">
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-12 text-2xl font-bold pl-8 rounded-xl"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold">₦</span>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  onClick={() => setAmount(amt.toString())}
                  className="rounded-xl h-12"
                >
                  ₦{amt.toLocaleString()}
                </Button>
              ))}
            </div>
          </Card>

          {/* Payment Methods */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-medium mb-4">Select Payment Method</h2>
            <div className="space-y-3">
              {fundingMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleSelectMethod(method.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    selectedMethod === method.id
                      ? "border-[#0A2357] bg-[#0A2357]/5"
                      : "hover:border-gray-300"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${
                    selectedMethod === method.id ? "bg-[#0A2357] text-white" : "bg-gray-100"
                  }`}>
                    <method.icon className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-medium">{method.name}</h3>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
            </div>
          </Card>

              {/* Proceed Button */}
          <Button 
            className="w-full h-12 text-lg rounded-xl bg-[#0A2357] hover:bg-[#0A2357]/90"
            disabled={!amount || !selectedMethod || isProcessing}
            onClick={handleProceed}
          >
            {isProcessing ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}

