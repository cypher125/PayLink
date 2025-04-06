"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  CheckCircle2,
  XCircle,
  User,
  Home,
  Zap
} from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import { useVTPass } from "@/contexts/VTPassContext"
import { useUserProfile } from "@/lib/hooks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import toast from "@/lib/toast"
import { 
  generateUniqueRequestId, 
  extractVTPassErrorMessage,
  isVTPassSuccess 
} from "@/lib/vtpass-helpers"

// Define interfaces
interface ElectricityProvider {
  id: string;
  name: string;
  serviceID: string;
  meterTypes: {
    id: string;
    name: string;
    variationCode: string;
  }[];
}

interface CustomerInfo {
  name: string;
  address: string;
  minimumAmount?: number;
  meterNumber: string;
  type?: string;
}

interface FailedTransaction {
  service_id: string;
  variation_code: string;
  billersCode?: string;
  biller_code?: string;
  meter_number?: string;
  amount: number;
  phone: string;
  email: string;
  pin: string;
  request_id: string;
  transaction_type: string;
}

// Define electricity providers
const providers: ElectricityProvider[] = [
  { 
    id: "ikeja", 
    name: "Ikeja Electricity", 
    serviceID: "ikeja-electric",
    meterTypes: [
      { id: "prepaid", name: "Prepaid Meter", variationCode: "prepaid" },
      { id: "postpaid", name: "Postpaid Meter", variationCode: "postpaid" }
    ]
  },
  { 
    id: "eko", 
    name: "Eko Electricity", 
    serviceID: "eko-electric",
    meterTypes: [
      { id: "prepaid", name: "Prepaid Meter", variationCode: "prepaid" },
      { id: "postpaid", name: "Postpaid Meter", variationCode: "postpaid" }
    ]
  },
  { 
    id: "abuja", 
    name: "Abuja Electricity", 
    serviceID: "abuja-electric",
    meterTypes: [
      { id: "prepaid", name: "Prepaid Meter", variationCode: "prepaid" },
      { id: "postpaid", name: "Postpaid Meter", variationCode: "postpaid" }
    ]
  },
  { 
    id: "portharcourt", 
    name: "Port Harcourt Electricity", 
    serviceID: "portharcourt-electric",
    meterTypes: [
      { id: "prepaid", name: "Prepaid Meter", variationCode: "prepaid" },
      { id: "postpaid", name: "Postpaid Meter", variationCode: "postpaid" }
    ]
  },
];

// Main component
export default function ElectricityPage() {
  // User state
  const userProfile = useUserProfile();
  const vtpassContext = useVTPass();
  const { makePurchase, fetchBalance } = vtpassContext || {};
  
  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectedMeterType, setSelectedMeterType] = useState<string>("")
  const [meterNumber, setMeterNumber] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [pin, setPin] = useState<string>("")
  
  // UI state
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [transactionSuccessful, setTransactionSuccessful] = useState<boolean>(false)
  const [transactionFailed, setTransactionFailed] = useState<boolean>(false)
  const [balance, setBalance] = useState<number>(0)
  const [balanceLoading, setBalanceLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [failedMessage, setFailedMessage] = useState<string>("")
  const [failedTransaction, setFailedTransaction] = useState<FailedTransaction | null>(null)
  
  // Set initial form values from user profile when it loads
  useEffect(() => {
    if (userProfile?.userProfile) {
      setEmail(userProfile.userProfile.email || "")
      setPhoneNumber(userProfile.userProfile.phone_number || "")
      
      // Get balance if available
      if (userProfile.userProfile.vtpass_balance !== undefined) {
        setBalance(Number(userProfile.userProfile.vtpass_balance))
        setBalanceLoading(false)
      }
    }
  }, [userProfile?.userProfile])
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount).replace(/NGN/g, '₦');
  };
  
  // Function to refresh balance
  const refreshBalance = async () => {
    setBalanceLoading(true);
    
    try {
      if (typeof fetchBalance === 'function') {
        await fetchBalance();
      }
      
      // Get balance from user profile
      if (userProfile?.userProfile?.vtpass_balance !== undefined) {
        const vtpassBalance = Number(userProfile.userProfile.vtpass_balance);
        setBalance(vtpassBalance);
        console.log("Refreshed balance from vtpass_balance:", vtpassBalance);
      } else {
        setBalance(0);
        console.warn("vtpass_balance not found in user profile during refresh");
      }
      
      toast.success("Balance refreshed");
    } catch (error) {
      console.error("Error refreshing balance:", error);
      setBalance(0);
      toast.error("Could not refresh balance");
    } finally {
      setBalanceLoading(false);
    }
  };
  
  // Get the selected provider details
  const getSelectedProvider = () => {
    return providers.find(p => p.id === selectedProvider);
  };
  
  // Get the selected meter type details
  const getSelectedMeterType = () => {
    const provider = getSelectedProvider();
    if (!provider) return null;
    
    return provider.meterTypes.find(m => m.id === selectedMeterType);
  };

  // Clear form and states
  const resetForm = () => {
    setTransactionSuccessful(false);
    setTransactionFailed(false);
    setCustomerInfo(null);
    setMeterNumber("");
    setAmount("");
    setPin("");
    setSelectedMeterType("");
    setSelectedProvider("");
    setErrorMessage("");
    setFailedMessage("");
    setFailedTransaction(null);
  };

  // Handle retry for failed transactions
  const handleRetry = async () => {
    if (!failedTransaction) return;
    
    setIsPurchasing(true);
    setTransactionFailed(false);
    setErrorMessage("");
    
    try {
      // Generate a new request ID for the retry
      const retryRequestId = generateUniqueRequestId('elect-retry');
      
      // Update the request ID in the failed transaction data
      const retryData = {
        ...failedTransaction,
        request_id: retryRequestId
      };
      
      console.log("Retrying transaction with data:", {
        ...retryData,
        pin: "****" // Mask PIN for security
      });
      
      // Call the purchase function with the retry data
      const response = await makePurchase(retryData);
      console.log("Retry response:", response);
      
      if (isVTPassSuccess(response)) {
        setTransactionSuccessful(true);
        setIsPurchasing(false);
        toast.success("Payment successful!");
        
        // Refresh balance
        refreshBalance();
      } else {
        setTransactionFailed(true);
        setIsPurchasing(false);
        
        const errorMsg = extractVTPassErrorMessage(response);
        setFailedMessage(errorMsg);
        toast.error(errorMsg || "Retry failed. Please try again.");
      }
    } catch (error) {
      console.error("Error retrying payment:", error);
      setTransactionFailed(true);
      setIsPurchasing(false);
      
      if (error instanceof Error) {
        setErrorMessage(error.message);
        toast.error(error.message);
      } else {
        setErrorMessage("An unknown error occurred");
        toast.error("An unknown error occurred");
      }
    }
  };

  // Handle making payment
  const handlePurchase = async () => {
    if (!selectedProvider || !selectedMeterType || !meterNumber.trim() || !amount) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    // Check if user has sufficient balance
    if (numAmount > balance) {
      toast.error("Insufficient balance. Please fund your wallet.");
      return;
    }
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    
    // Validate email
    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Validate transaction PIN
    if (!pin || pin.length !== 4) {
      toast.error("Please enter your 4-digit transaction PIN");
      return;
    }
    
    const provider = getSelectedProvider();
    const meterType = getSelectedMeterType();
    
    if (!provider || !meterType) {
      toast.error("Invalid provider or meter type");
      return;
    }
    
    setIsPurchasing(true);
    setTransactionFailed(false);
    setTransactionSuccessful(false);
    setErrorMessage("");
    setFailedMessage("");
    
    try {
      // Generate a unique request ID
      const purchaseRequestId = generateUniqueRequestId('electricity');
      
      // Create purchase data with ALL possible field variations for compatibility
      const purchaseData = {
        // Service and variation identifiers
        service_id: provider.serviceID,
        serviceID: provider.serviceID,
        variation_code: meterType.variationCode,
        variationCode: meterType.variationCode,
        
        // Meter number in multiple formats
        billersCode: meterNumber.trim(),
        billers_code: meterNumber.trim(),
        biller_code: meterNumber.trim(),
        meter_number: meterNumber.trim(),
        meterNumber: meterNumber.trim(),
        customer_id: meterNumber.trim(),
        
        // Payment details
        amount: numAmount,
        amountString: String(numAmount),
        phone: phoneNumber, 
        email: email,
        
        // PIN in multiple formats
        pin: pin,
        transaction_pin: pin,
        
        // Transaction metadata
        transaction_type: "electricity",
        type: "electricity",
        request_id: purchaseRequestId
      };
      
      // Log purchase data for debugging (mask the PIN for security)
      const logData = {
        ...purchaseData,
        pin: "****", // Mask PIN in logs
        transaction_pin: "****"
      };
      console.log(`Making ${provider.name} ${meterType.name} payment:`, JSON.stringify(logData, null, 2));
      
      // Call the purchase endpoint
      if (typeof makePurchase !== 'function') {
        throw new Error("Purchase functionality is not available");
      }
      
      const response = await makePurchase(purchaseData);
      console.log("Electricity payment response:", JSON.stringify(response, null, 2));
      
      if (isVTPassSuccess(response)) {
        // Extract customer info from response if available
        const customerName = response?.content?.CustomerName || response?.content?.Customer_Name || response?.content?.customer_name || "Customer";
        const customerAddress = response?.content?.Address || response?.content?.CustomerAddress || response?.content?.customer_address || "Address not available";
        
        // Set customer info
        setCustomerInfo({
          name: customerName,
          address: customerAddress,
          meterNumber: meterNumber.trim(),
          type: meterType.name
        });
        
        // Transaction successful
        setTransactionSuccessful(true);
        setIsPurchasing(false);
        toast.success("Payment successful!");
        
        // Refresh balance
        refreshBalance();
      } else {
        // Transaction failed
        setTransactionFailed(true);
        setIsPurchasing(false);
        
        // Save failed transaction data for retry
        setFailedTransaction({
          service_id: provider.serviceID,
          variation_code: meterType.variationCode,
          billersCode: meterNumber.trim(),
          biller_code: meterNumber.trim(),
          meter_number: meterNumber.trim(),
          amount: numAmount,
          phone: phoneNumber, 
          email: email,
          pin: pin,
          transaction_type: "electricity",
          request_id: purchaseRequestId
        });
        
        // Extract error message
        const errorMsg = extractVTPassErrorMessage(response);
        setFailedMessage(errorMsg);
        toast.error(errorMsg || "Payment failed. Please try again.");
        
        // Log the error details
        console.error("Electricity payment failed:", response);
      }
    } catch (error) {
      console.error("Error making payment:", error);
      setTransactionFailed(true);
      setIsPurchasing(false);
      
      // Set error message
      if (error instanceof Error) {
        setErrorMessage(error.message);
        toast.error(error.message);
      } else {
        setErrorMessage("An unknown error occurred");
        toast.error("An unknown error occurred");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between p-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold">Pay Electricity Bill</h1>
          </div>
          <Link href="/dashboard/profile" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
                <span className="text-sm font-medium">{userProfile?.userProfile ? userProfile.userProfile.first_name?.[0] + (userProfile.userProfile.last_name?.[0] || '') : 'U'}</span>
            </div>
          </Link>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Balance Card */}
          <div className="mb-6 bg-[#0A2357] text-white p-4 rounded-xl">
            <div className="text-sm opacity-80 mb-1">Available Balance</div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">
                {balanceLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  formatCurrency(balance || 0)
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshBalance}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Link href="/dashboard/fund-account">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    Fund Wallet
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {transactionSuccessful ? (
            // Success State
            <Card className="p-6 rounded-2xl">
              <div className="text-center">
                <div className="bg-green-100 text-green-600 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-4">
                  Your electricity bill payment has been processed successfully.
                </p>
                {customerInfo && (
                  <div className="p-4 bg-green-50 rounded-xl mb-6 text-left">
                    <div className="flex items-start gap-2 mb-2">
                      <User className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Customer Name</p>
                        <p className="text-sm text-gray-600">{customerInfo.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <Home className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Address</p>
                        <p className="text-sm text-gray-600">{customerInfo.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <Zap className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Meter Details</p>
                        <p className="text-sm text-gray-600">{customerInfo.meterNumber} ({customerInfo.type})</p>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium text-green-700">Amount Paid: {formatCurrency(Number(amount))}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={resetForm}
                  >
                    Make Another Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <Link href="/dashboard/transactions">View Transactions</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ) : transactionFailed ? (
            // Error State
            <Card className="p-6 rounded-2xl">
              <div className="text-center">
                <div className="bg-red-100 text-red-600 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Payment Failed</h2>
                <p className="text-gray-600 mb-4">
                  {failedMessage || errorMessage || "We couldn't process your payment. Please try again."}
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={handleRetry}
                    disabled={!failedTransaction}
                  >
                    Retry Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={resetForm}
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            // Payment Form
          <Card className="p-6 rounded-2xl shadow-sm">
            {/* Provider Selection */}
              <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Select Provider</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setSelectedMeterType(""); // Reset meter type when provider changes
                      }}
                    className={`flex flex-col items-center rounded-xl p-4 transition-all duration-300 ${
                      selectedProvider === provider.id
                        ? "bg-[#0A2357] text-white shadow-md scale-105"
                        : "bg-white hover:bg-gray-50 hover:shadow-sm border border-gray-100"
                    }`}
                  >
                      <span className="text-sm font-medium">{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

              {/* Meter Type Selection */}
              {selectedProvider && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Meter Type
                  </label>
                  <Select
                    value={selectedMeterType}
                    onValueChange={(value) => {
                      setSelectedMeterType(value);
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select meter type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSelectedProvider()?.meterTypes.map((meterType) => (
                        <SelectItem key={meterType.id} value={meterType.id}>
                          {meterType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {/* Meter Number Input */}
              {selectedProvider && selectedMeterType && (
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Meter Number
              </label>
              <Input
                value={meterNumber}
                    onChange={(e) => {
                      setMeterNumber(e.target.value);
                    }}
                placeholder="Enter meter number"
                    className="h-12 rounded-xl"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your meter number exactly as shown on your meter. 
                    <span className="block mt-1 text-blue-600">For testing, use a valid test meter number from your provider.</span>
                  </p>
                </div>
              )}

              {/* Contact Information */}
              {selectedProvider && selectedMeterType && meterNumber && (
                <>
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                className="h-12 rounded-xl"
              />
            </div>

                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="h-12 rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your receipt will be sent to this email address
                    </p>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Amount
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount to pay"
                className="h-12 rounded-xl"
                      min={0}
              />
            </div>

                  {/* Transaction PIN Input */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Transaction PIN
                    </label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => {
                        // Only allow 4 digits
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        if (value.length <= 4) {
                          setPin(value);
                        }
                      }}
                      placeholder="Enter your 4-digit PIN"
                      className="h-12 rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your transaction PIN to authorize this payment
                    </p>
                  </div>

                  {/* Payment Button */}
            <Button 
                    onClick={handlePurchase}
                    disabled={isPurchasing || !amount || !pin}
              className="w-full h-12 text-lg rounded-xl bg-[#0A2357] hover:bg-[#0A2357]/90"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Make Payment"
                    )}
            </Button>
                </>
              )}
          </Card>
          )}
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}