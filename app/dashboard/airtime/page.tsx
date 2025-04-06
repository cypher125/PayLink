"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Phone, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BottomMenu } from "@/components/BottomMenu"
import { 
  getVTPassServices, 
  getUserTransactions,
  getVTPassBalance,
  PurchaseData,
  AppError
} from "@/lib/api"
import toast from "@/lib/toast"
import { useUserProfile } from "@/lib/hooks"
import { Checkbox } from "@/components/ui/checkbox"
import { useVTPass } from "@/contexts/VTPassContext"
import { 
  generateUniqueRequestId, 
  extractVTPassErrorMessage,
  isVTPassSuccess,
  VTPassResponseData
} from "@/lib/vtpass-helpers"


// Define types for networks and purchase data
interface NetworkProvider {
  id: string;
  name: string;
  image: string;
  serviceID: string;
  serviceType?: string;
}

interface RecentPhoneNumber {
  number: string;
  network: string;
  image: string;
}

// Define interface for VTPass response
interface VTPassResponse {
  code?: string;
  response_description?: string;
  content?: {
    transactions?: {
      status?: string;
      product_name?: string;
      amount?: string;
      [key: string]: any;
    };
    variations?: any[];
    [key: string]: any;
  };
  requestId?: string;
  amount?: number;
  transaction_date?: string;
  purchased_code?: string;
  error_message?: string;
  suggested_action?: string;
  [key: string]: any;
}

// Add this new interface for VTPass services response
interface VTPassServicesResponse {
  code?: string;
  content?: {
    variations?: any[];
    [key: string]: any;
  };
  data?: {
    content?: {
      variations?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  response?: {
    content?: {
      variations?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  response_description?: string;
  [key: string]: any;
}

const defaultNetworks = [
  { id: "mtn", name: "MTN", image: "/providers/mtn.jpg", serviceID: "mtn" },
  { id: "airtel", name: "AIRTEL", image: "/providers/airtel.png", serviceID: "airtel" },
  { id: "9mobile", name: "9MOBILE", image: "/providers/9mobile.png", serviceID: "etisalat" },
  { id: "glo", name: "GLO", image: "/providers/glo.png", serviceID: "glo" },
]

const quickAmounts = ["100", "200", "500", "1000", "2000", "5000"]

export default function AirtimePage() {
  const [networks, setNetworks] = useState<NetworkProvider[]>(defaultNetworks)
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [pin, setPin] = useState("")
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [recentNumbers, setRecentNumbers] = useState<RecentPhoneNumber[]>([])
  const [balance, setBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [transactionFailed, setTransactionFailed] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [autoRetry, setAutoRetry] = useState(false)
  const [transactionSuccessful, setTransactionSuccessful] = useState(false)
  const [failedTransaction, setFailedTransaction] = useState<any>(null)
  
  const userProfile = useUserProfile()
  
  // Get VTPass context functions
  const { makePurchase, fetchBalance } = useVTPass();
  
  // Use ref to track if initial data has been loaded
  const dataLoadedRef = useRef(false)
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount).replace(/NGN/g, '₦');
  }

  // Load network providers and recent numbers
  useEffect(() => {
    // Skip if data is already loaded
    if (dataLoadedRef.current) return;
    
    const loadAirtimeData = async () => {
      try {
        setBalanceLoading(true)
        
        // Fetch networks, transactions, and balance in parallel
        const [servicesData, transactionsData, balanceData] = await Promise.all([
          getVTPassServices('airtime') as unknown as VTPassServicesResponse,
          getUserTransactions(),
          getVTPassBalance()
        ])
        
        // Process network providers if available
        if (servicesData && (servicesData.content?.variations)) {
          // Handle VTPass service data format if needed
          setNetworks(defaultNetworks)
        }
        
        // Process recent transactions for phone numbers
        if (transactionsData && Array.isArray(transactionsData)) {
          const airtimeTransactions = transactionsData
            .filter(tx => tx.transaction_type?.toLowerCase() === 'airtime')
            .slice(0, 5)
          
          // Extract phone numbers from transactions
          const phoneNumbers: RecentPhoneNumber[] = airtimeTransactions.map(tx => {
            // Determine network based on service_id
            const network = defaultNetworks.find(n => n.serviceID === tx.service_id) || defaultNetworks[0]
            
            return {
              number: tx.phone_number || "",  // Use phone_number instead of recipient
              network: network.id,
              image: network.image
            }
          }).filter(item => item.number)
          
          // Remove duplicates and take the first 5
          const uniqueNumbers = phoneNumbers.filter((item, index, self) => 
            index === self.findIndex((t) => t.number === item.number)
          ).slice(0, 5)
          
          setRecentNumbers(uniqueNumbers)
        }
        
        // Set balance - use both API data and userProfile as fallbacks
        if (balanceData && typeof balanceData.balance === 'number') {
          setBalance(balanceData.balance)
        } else if (userProfile?.userProfile?.vtpass_balance !== undefined) {
          setBalance(userProfile.userProfile.vtpass_balance)
        }
      } catch (error: unknown) {
        console.error("Error loading airtime data:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to load airtime data"
          toast.error(errorMessage)
      } finally {
        setBalanceLoading(false)
        // Mark data as loaded
        dataLoadedRef.current = true;
      }
    }
    
    loadAirtimeData()
    
    // Clean up function to prevent memory leaks
    return () => {
      // If needed, cancel any pending requests here
    }
  }, [userProfile]) // Add userProfile as dependency to update if it changes

  // Update balance when userProfile changes
  useEffect(() => {
    if (!balanceLoading && userProfile?.userProfile?.vtpass_balance !== undefined) {
      setBalance(userProfile.userProfile.vtpass_balance)
    }
  }, [userProfile, balanceLoading])

  // Function to extract meaningful error messages from VTPass responses
  const extractVTPassErrorMessage = (responseData: VTPassResponse): string => {
    if (!responseData) return "Unknown VTPass error";
    
    // First check for enhanced error messages added by our backend
    if (responseData.error_message) {
      let message = responseData.error_message;
      if (responseData.suggested_action) {
        message += ` ${responseData.suggested_action}`;
      }
      return message;
    }
    
    // Handle code 016 - transaction failed
    if (responseData.code === "016") {
      // Try to get detailed information from the content if available
      if (responseData.content?.transactions?.status === "failed") {
        return `Transaction failed: ${responseData.response_description || "Unknown reason"}. Please try again or contact support.`;
      }
      return responseData.response_description || "Transaction failed on VTPass";
    }
    
    // Handle code 014 - often insufficient funds
    if (responseData.code === "014") {
      return "Insufficient funds at the provider. Please try again later or contact support.";
    }
    
    // Handle code 009 - often duplicate transactions
    if (responseData.code === "009") {
      return "Duplicate transaction detected. Please check if your previous transaction was successful before trying again.";
    }
    
    // Handle other error codes
    return responseData.response_description || "Error processing transaction";
  }

  // Function to handle retry logic for failed transactions
  const handleRetryTransaction = () => {
    if (!failedTransaction) return;
    
    // Increment retry count
    setRetryCount(prev => prev + 1);
    
    // Set purchasing state
    setIsPurchasing(true);
    
    // Clear failed state
    setTransactionFailed(false);
    setErrorMessage("");
    
    // Generate a new request ID for the retry
    const uniqueRequestId = generateUniqueRequestId('air-retry');
    
    // Create a new purchase data object with the new request ID
    const retryData = {
      ...failedTransaction,
      request_id: uniqueRequestId,
      retryCount: retryCount + 1
    };
    
    // Call the purchase function
    handlePurchaseWithData(retryData);
  };
  
  // Clear failed transaction state
  const clearFailedState = () => {
    setTransactionFailed(false);
    setErrorMessage("");
    setRetryCount(0);
    setFailedTransaction(null);
  };
  
  // Handle purchase with data
  const handlePurchaseWithData = async (purchaseData: PurchaseData) => {
    try {
      console.log("Sending purchase data:", purchaseData);
      
      // Call the makePurchase function from VTPass context
      const response = await makePurchase(purchaseData);
      console.log("Purchase response:", response);
      
      // Check for successful transaction - VTPass success codes include '000' and '01'
      if (isVTPassSuccess(response)) {
        // Handle success
        setTransactionSuccessful(true);
        setIsPurchasing(false);
        setSelectedNetwork("");
        setPhoneNumber("");
        setAmount("");
        setPin("");
        
        // Set success message with details
        let successMessage = `Successfully purchased ₦${purchaseData.amount} airtime for ${purchaseData.phone}`;
        if (response.content?.transactions?.product_name) {
          successMessage = `Successfully purchased ${response.content.transactions.product_name}`;
        }
        toast.success(successMessage);
        
        // Update balance if we have the data
        try {
          // Refresh balance after successful purchase
          await fetchBalance();
        } catch (e) {
          console.error("Error refreshing balance:", e);
        }
      } else {
        // Handle failed transaction with a specific error message
        setTransactionFailed(true);
        setIsPurchasing(false);
        
        // Extract error message from response
        const errorMessage = extractVTPassErrorMessage(response);
        setErrorMessage(errorMessage);
        toast.error(errorMessage);
        
        // Store transaction details for retry
        setFailedTransaction({
          ...purchaseData,
          retryCount: 0
        });
      }
    } catch (error: unknown) {
      console.error("Purchase error:", error);
      
      // Clear processing state
      setIsPurchasing(false);
      setTransactionFailed(true);
      
      // Handle network errors differently
      let errorMessage = "Failed to complete purchase. Please try again.";
      
      if (error instanceof Error) {
        // Handle AppError type or regular Error
        if (typeof (error as any).preventDefault === 'function') {
          (error as any).preventDefault();
        }
        
        if ((error as any).insufficientBalance) {
          errorMessage = "Insufficient balance to complete this transaction.";
        } else if ((error as any).responseData) {
          errorMessage = extractVTPassErrorMessage((error as any).responseData);
        } else {
          errorMessage = error.message || errorMessage;
        }
        
        // For tracking
        (error as any).handled = true;
      }
      
      // Show error and update UI
      setErrorMessage(errorMessage);
      toast.error(errorMessage);
    }
  };
  
  // Handle purchase of airtime
  const handlePurchase = async () => {
    try {
      // Validate form
      if (!selectedNetwork || !amount || !phoneNumber || !pin) {
        toast.error("Please fill all required fields")
      return
    }
    
      // Find the network provider details
      const network = networks.find(provider => provider.id === selectedNetwork)
      if (!network) {
        throw new Error("Selected network not found")
      }
      
      // Check if amount is valid
      const amountValue = parseFloat(amount)
      if (isNaN(amountValue) || amountValue < 50) {
        toast.error("Please enter a valid amount (minimum ₦50)")
        return
      }
      
      // Check if user has sufficient balance
      if (amountValue > balance) {
        toast.error(`Insufficient balance. Required: ₦${amountValue.toFixed(2)}, Available: ₦${balance.toFixed(2)}`);
        return;
      }
      
      // Reset retry state when starting a new transaction
      clearFailedState();
      
      setIsPurchasing(true)
      
      // Set a timeout to prevent endless processing
      const purchaseTimeout = setTimeout(() => {
        if (isPurchasing) {
          setIsPurchasing(false);
          setTransactionFailed(true);
          setErrorMessage("The request is taking too long. Please check your connection and try again.");
          toast.error("The request is taking too long. Please check your connection and try again.");
        }
      }, 25000); // 25 seconds timeout
      
      // Save the recent phone number
      saveRecentPhoneNumber(phoneNumber, selectedNetwork);
      
      // Generate a unique request ID with timestamp to prevent duplicates
      const uniqueRequestId = generateUniqueRequestId('air');
      
      // Create purchase data with a unique request ID
      const purchaseData: PurchaseData = {
        service_id: network.serviceID,
        amount: amountValue,
        phone: phoneNumber,
        email: userProfile?.userProfile?.email || "",
        pin: pin,
        transaction_type: "airtime",
        request_id: uniqueRequestId,
        auto_retry: autoRetry
      }
      
      // Call the API to purchase airtime
      await handlePurchaseWithData(purchaseData);
      
      // Clear timeout since request completed
      clearTimeout(purchaseTimeout);
    } catch (error: unknown) {
      console.error("Airtime purchase error:", error);
      
      // Prevent error from bubbling up to the console display
      if (error instanceof Error) {
        (error as any).preventDefault = () => {};
        (error as any).handled = true;
      }
      
      // Ensure we're not stuck in processing state
      setIsPurchasing(false);
    }
  };

  // Save recent phone number to local storage
  const saveRecentPhoneNumber = (number: string, networkId: string) => {
    try {
      // Find the network to get its image
      const network = networks.find(n => n.id === networkId);
      if (!network) return;
      
      // Create the recent number entry
      const newRecent: RecentPhoneNumber = {
        number,
        network: networkId,
        image: network.image
      };
      
      // Get existing recent numbers
      const existingRecents = localStorage.getItem('recentAirtimeNumbers');
      let recents: RecentPhoneNumber[] = existingRecents ? JSON.parse(existingRecents) : [];
      
      // Remove the same number if it exists
      recents = recents.filter(r => r.number !== number);
      
      // Add the new one at the beginning
      recents.unshift(newRecent);
      
      // Keep only the last 5
      recents = recents.slice(0, 5);
      
      // Save back to local storage
      localStorage.setItem('recentAirtimeNumbers', JSON.stringify(recents));
      
      // Update state
      setRecentNumbers(recents);
    } catch (error) {
      console.error('Error saving recent number:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold">Buy Airtime</h1>
          </div>
          <Link href="/dashboard/profile" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#0A2357] text-white flex items-center justify-center">
              <span className="text-sm font-medium">{userProfile?.userProfile ? userProfile.userProfile.first_name?.[0] + (userProfile.userProfile.last_name?.[0] || '') : 'U'}</span>
            </div>
          </Link>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Balance Display */}
          <div className="mb-6 bg-[#0A2357] text-white p-4 rounded-xl">
            <div className="text-sm opacity-80 mb-1">Available Balance</div>
            <div className="text-2xl font-semibold">
              {balanceLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                formatCurrency(balance)
              )}
            </div>
          </div>
          
          <Card className="p-6 rounded-2xl shadow-sm">
          {/* Network Selection */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Select Network</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {networks.map((network) => (
              <button
                key={network.id}
                onClick={() => setSelectedNetwork(network.id)}
                className={`flex flex-col items-center rounded-xl p-4 transition-all duration-300 ${
                  selectedNetwork === network.id
                    ? "bg-[#0A2357] text-white shadow-md scale-105"
                    : "bg-white hover:bg-gray-50 hover:shadow-sm border border-gray-100"
                }`}
              >
                <div className={`mb-2 rounded-xl p-2 bg-white ${
                  selectedNetwork === network.id ? "bg-opacity-10" : ""
                }`}>
                  <Image
                    src={network.image}
                    alt={network.name}
                    width={40}
                    height={40}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <span className="text-xs font-medium">{network.name}</span>
              </button>
            ))}
          </div>
            </div>

            {/* Recent Numbers */}
            {recentNumbers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Numbers</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentNumbers.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setPhoneNumber(item.number)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                    >
                      <Image
                        src={item.image}
                        alt={item.network}
                        width={16}
                        height={16}
                      />
                      <span className="text-sm whitespace-nowrap">{item.number}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Phone Number Input */}
          <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
              Phone Number
            </label>
            <div className="relative">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="h-12 pl-12 rounded-xl"
              />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
          </div>

            {/* Quick Amount Selection */}
          <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Amount</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      amount === amt
                        ? "bg-[#0A2357] text-white"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    ₦{amt}
                  </button>
                ))}
              </div>
          </div>

            {/* Custom Amount Input */}
          <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
              Amount
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              className="h-12 rounded-xl"
            />
              <div className="mt-2 text-sm text-gray-500">
                Amount to pay: {formatCurrency(parseFloat(amount) || 0)}
              </div>
          </div>
          
          {/* Transaction PIN */}
          <div className="mb-6">
            <label htmlFor="pin" className="text-sm font-medium text-gray-700 mb-2 block">
              Transaction PIN
            </label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your 4-digit PIN"
              maxLength={4}
              className="h-12 rounded-xl"
            />
            <div className="mt-2 text-sm text-gray-500">
              Enter your transaction PIN to authorize this purchase
            </div>
          </div>

          {/* Auto-retry checkbox */}
          <div className="flex items-center space-x-2 mt-4 mb-2">
            <Checkbox 
              id="auto-retry" 
              checked={autoRetry}
              onCheckedChange={(checked) => setAutoRetry(checked === true)}
            />
            <label
              htmlFor="auto-retry"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Auto-retry if transaction fails (up to 2 times)
            </label>
          </div>

          {/* Purchase Button */}
          <div className="mt-8">
            <Button 
              className="w-full py-6 rounded-xl bg-[#0A2357] hover:bg-[#0A2357]/90 text-white"
              disabled={isPurchasing || !selectedNetwork || !phoneNumber || !amount || !pin}
              onClick={handlePurchase}
            >
              {isPurchasing ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <span>Buy Airtime</span>
              )}
          </Button>
          </div>

          {/* Transaction Error Message */}
          {transactionFailed && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-700 font-medium mb-2">Transaction Failed</h3>
              <p className="text-red-600 mb-3 text-sm">{errorMessage}</p>
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-red-500">
                  {retryCount > 0 ? `Retry attempts: ${retryCount}/3` : ''}
                </div>
                <Button 
                  onClick={handleRetryTransaction}
                  variant="outline" 
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={retryCount >= 3 || isPurchasing}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Try Again</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}
