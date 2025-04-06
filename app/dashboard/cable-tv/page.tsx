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
  CreditCard,
  Tv
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BottomMenu } from "@/components/BottomMenu"
import { useVTPass } from "@/contexts/VTPassContext"
import { useUserProfile } from "@/lib/hooks"
import toast from "@/lib/toast"
import { 
  generateUniqueRequestId, 
  extractVTPassErrorMessage, 
  isVTPassSuccess 
} from "@/lib/vtpass-helpers"

// Define interfaces
interface CableProvider {
  id: string;
  name: string;
  serviceID: string;
  image: string;
  packages: CablePackage[];
}

interface CablePackage {
  id: string;
  name: string;
  variationCode: string;
  price: number;
  description: string;
}

interface CustomerInfo {
  name: string;
  address?: string;
  smartCardNumber: string;
  package: string;
}

interface FailedTransaction {
  service_id: string;
  variation_code: string;
  billersCode: string;
  amount: number;
  phone: string;
  email: string;
  pin: string;
  request_id: string;
  transaction_type: string;
}

// Define cable TV providers
const providers: CableProvider[] = [
  { 
    id: "dstv", 
    name: "DSTV", 
    serviceID: "dstv",
    image: "/providers/dstv.svg",
    packages: [
      { id: "dstv-padi", name: "DStv Padi", variationCode: "dstv-padi", price: 2500, description: "40+ Channels" },
      { id: "dstv-yanga", name: "DStv Yanga", variationCode: "dstv-yanga", price: 3500, description: "60+ Channels" },
      { id: "dstv-confam", name: "DStv Confam", variationCode: "dstv-confam", price: 6200, description: "100+ Channels" },
      { id: "dstv-compact", name: "DStv Compact", variationCode: "dstv-compact", price: 10500, description: "140+ Channels" },
      { id: "dstv-premium", name: "DStv Premium", variationCode: "dstv-premium", price: 24500, description: "200+ Channels" },
    ]
  },
  { 
    id: "gotv", 
    name: "GOtv", 
    serviceID: "gotv",
    image: "/providers/gotv.svg",
    packages: [
      { id: "gotv-supa", name: "GOtv Supa", variationCode: "gotv-supa", price: 6400, description: "80+ Channels" },
      { id: "gotv-max", name: "GOtv Max", variationCode: "gotv-max", price: 4850, description: "65+ Channels" },
      { id: "gotv-jolli", name: "GOtv Jolli", variationCode: "gotv-jolli", price: 3300, description: "50+ Channels" },
      { id: "gotv-jinja", name: "GOtv Jinja", variationCode: "gotv-jinja", price: 2250, description: "40+ Channels" },
    ]
  },
  { 
    id: "startimes", 
    name: "StarTimes", 
    serviceID: "startimes",
    image: "/providers/startimes.svg",
    packages: [
      { id: "nova", name: "Nova", variationCode: "nova", price: 1200, description: "Basic Entertainment" },
      { id: "basic", name: "Basic", variationCode: "basic", price: 2100, description: "Family Entertainment" },
      { id: "smart", name: "Smart", variationCode: "smart", price: 2800, description: "Complete Entertainment" },
      { id: "classic", name: "Classic", variationCode: "classic", price: 3100, description: "Premium Entertainment" },
    ]
  }
];

export default function CableTVPage() {
  // User state
  const userProfile = useUserProfile();
  const vtpassContext = useVTPass();
  const { makePurchase, fetchBalance } = vtpassContext || {};
  
  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [smartCardNumber, setSmartCardNumber] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [email, setEmail] = useState<string>("")
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
  
  // Get the selected package details
  const getSelectedPackage = () => {
    const provider = getSelectedProvider();
    if (!provider) return null;
    
    return provider.packages.find(p => p.id === selectedPackage);
  };

  // Clear form and states
  const resetForm = () => {
    setTransactionSuccessful(false);
    setTransactionFailed(false);
    setCustomerInfo(null);
    setSmartCardNumber("");
    setPin("");
    setSelectedPackage("");
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
      const retryRequestId = generateUniqueRequestId('cable-retry');
      
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
    if (!selectedProvider || !selectedPackage || !smartCardNumber.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const provider = getSelectedProvider();
    const selectedPkg = getSelectedPackage();
    
    if (!provider || !selectedPkg) {
      toast.error("Invalid provider or package");
      return;
    }
    
    // Validate smart card number
    if (smartCardNumber.trim().length < 5) {
      toast.error("Please enter a valid smart card number");
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
    
    // Check if user has sufficient balance
    if (selectedPkg.price > balance) {
      toast.error("Insufficient balance. Please fund your wallet.");
      return;
    }
    
    setIsPurchasing(true);
    setTransactionFailed(false);
    setTransactionSuccessful(false);
    setErrorMessage("");
    setFailedMessage("");
    
    try {
      // Generate a unique request ID
      const purchaseRequestId = generateUniqueRequestId('cable-tv');
      
      // Create purchase data with ALL possible field variations for compatibility
      const purchaseData = {
        // Service and variation identifiers
        service_id: provider.serviceID,
        serviceID: provider.serviceID,
        variation_code: selectedPkg.variationCode,
        variationCode: selectedPkg.variationCode,
        
        // Smart card number in multiple formats
        billersCode: smartCardNumber.trim(),
        billers_code: smartCardNumber.trim(),
        biller_code: smartCardNumber.trim(),
        smart_card_number: smartCardNumber.trim(),
        smartCardNumber: smartCardNumber.trim(),
        
        // Payment details
        amount: selectedPkg.price,
        price: selectedPkg.price,
        phone: phoneNumber, 
        email: email,
        
        // PIN in multiple formats
        pin: pin,
        transaction_pin: pin,
        
        // Transaction metadata
        subscription_type: "change", // For cable TV this is needed
        transaction_type: "tv-subscription",
        type: "tv-subscription",
        request_id: purchaseRequestId
      };
      
      // Log purchase data for debugging (mask the PIN for security)
      const logData = {
        ...purchaseData,
        pin: "****", // Mask PIN in logs
        transaction_pin: "****"
      };
      console.log(`Making ${provider.name} ${selectedPkg.name} subscription payment:`, JSON.stringify(logData, null, 2));
      
      // Call the purchase endpoint
      if (typeof makePurchase !== 'function') {
        throw new Error("Purchase functionality is not available");
      }
      
      const response = await makePurchase(purchaseData);
      console.log("Cable TV payment response:", JSON.stringify(response, null, 2));
      
      if (isVTPassSuccess(response)) {
        // Extract customer info from response if available
        const customerName = response?.content?.CustomerName || response?.content?.Customer_Name || response?.content?.customer_name || "Customer";
        
        // Set customer info
        setCustomerInfo({
          name: customerName,
          smartCardNumber: smartCardNumber.trim(),
          package: selectedPkg.name
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
          variation_code: selectedPkg.variationCode,
          billersCode: smartCardNumber.trim(),
          amount: selectedPkg.price,
          phone: phoneNumber, 
          email: email,
          pin: pin,
          transaction_type: "tv-subscription",
          request_id: purchaseRequestId
        });
        
        // Extract error message
        const errorMsg = extractVTPassErrorMessage(response);
        setFailedMessage(errorMsg);
        toast.error(errorMsg || "Payment failed. Please try again.");
        
        // Log the error details
        console.error("Cable TV payment failed:", response);
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

  // Get the current provider
  const currentProvider = getSelectedProvider();

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
            <h1 className="text-xl font-semibold">Cable TV</h1>
          </div>
          <Link href="/dashboard/profile" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
                <span className="text-sm font-medium">{userProfile?.userProfile ? userProfile.userProfile.first_name?.[0] + (userProfile.userProfile.last_name?.[0] || '') : 'JD'}</span>
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
                  Your cable TV subscription has been processed successfully.
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
                      <CreditCard className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Smart Card Number</p>
                        <p className="text-sm text-gray-600">{customerInfo.smartCardNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <Tv className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Package</p>
                        <p className="text-sm text-gray-600">{customerInfo.package}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium text-green-700">
                        Amount Paid: {formatCurrency(getSelectedPackage()?.price || 0)}
                      </p>
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
              <div className="grid grid-cols-3 gap-4">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => {
                        setSelectedProvider(provider.id);
                        setSelectedPackage(""); // Reset package when provider changes
                    }}
                    className={`flex flex-col items-center rounded-xl p-4 transition-all duration-300 ${
                      selectedProvider === provider.id
                        ? "bg-[#0A2357] text-white shadow-md scale-105"
                        : "bg-white hover:bg-gray-50 hover:shadow-sm border"
                    }`}
                  >
                    <div className={`mb-2 rounded-xl p-2 ${
                      selectedProvider === provider.id ? "bg-white/10" : "bg-gray-50"
                    }`}>
                      <Image
                        src={provider.image}
                        alt={provider.name}
                        width={48}
                        height={48}
                        className="h-12 w-12"
                      />
                    </div>
                    <span className="text-sm font-medium">{provider.name}</span>
                  </button>
                ))}
              </div>
              </div>

            {/* Smart Card Number */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Smart Card Number
                  </label>
                  <Input
                    value={smartCardNumber}
                    onChange={(e) => setSmartCardNumber(e.target.value)}
                    placeholder="Enter smart card number"
                    className="h-12 rounded-xl"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your smart card number exactly as shown on your decoder or card.
                </p>
                </div>

                {/* Package Selection */}
            {selectedProvider && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Select Package</h3>
                <div className="grid grid-cols-1 gap-3">
                  {currentProvider?.packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectedPackage === pkg.id
                          ? "border-[#0A2357] bg-[#0A2357]/5"
                          : "hover:border-gray-300"
                      }`}
                    >
                <div>
                        <h4 className="font-medium">{pkg.name}</h4>
                        <p className="text-sm text-gray-500">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                          <span className="font-medium text-[#0A2357]">{formatCurrency(pkg.price)}</span>
                        <span className="block text-xs text-gray-500">per month</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

              {/* Contact Information */}
              {selectedProvider && selectedPackage && smartCardNumber && (
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
                    <p className="text-xs text-gray-500 mt-1">
                      You'll receive a confirmation SMS on this number
                    </p>
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
                    disabled={isPurchasing || !selectedPackage || !pin}
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

