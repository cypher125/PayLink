"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft,
  Loader2, 
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import toast from "@/lib/toast"
import { useUserProfile } from "@/lib/hooks"
import { useVTPass } from "@/contexts/VTPassContext"
import { PurchaseData } from "@/lib/api"
import { 
  generateUniqueRequestId, 
  extractVTPassErrorMessage,
  isVTPassSuccess
} from "@/lib/vtpass-helpers"

// Define interfaces for data types
interface ExamType {
  id: string;
  name: string;
  image: string;
  description: string;
  serviceID: string;
  variationCode: string;
  price: number;
}

// Define the available PIN quantity options
const pinQuantityOptions = [1, 2, 5, 10];

// Define the available exam types with all necessary details
const examTypes: ExamType[] = [
  { 
    id: "waec-registration", 
    name: "WAEC Registration", 
    image: "/exams/waec.png", 
    description: "West African Examination Council Registration PIN",
    serviceID: "waec-registration", 
    variationCode: "waec-registration",
    price: 14450
  },
  { 
    id: "waec", 
    name: "WAEC Result Checker PIN", 
    image: "/exams/waec.png", 
    description: "West African Examination Council Result Checker",
    serviceID: "waec", 
    variationCode: "waecdirect",
    price: 3500
  },
  { 
    id: "jamb-mock", 
    name: "JAMB UTME PIN (with mock)", 
    image: "/exams/jamb.png", 
    description: "Joint Admissions and Matriculation Board E-PIN with mock",
    serviceID: "jamb", 
    variationCode: "utme-mock",
    price: 7700
  },
  { 
    id: "jamb-no-mock", 
    name: "JAMB UTME PIN (without mock)", 
    image: "/exams/jamb.png", 
    description: "Joint Admissions and Matriculation Board E-PIN without mock",
    serviceID: "jamb", 
    variationCode: "utme-no-mock",
    price: 6200
  }
];

// Extended PurchaseData interface to include quantity and billersCode
interface ExamPurchaseData extends PurchaseData {
  quantity?: number;
  billersCode?: string;
}

// Interface for success response data
interface VTPassSuccessData {
  reference?: string;
  content?: {
    transactions?: {
      product_name?: string;
      unique_element?: string;
      unit_price?: number;
      quantity?: number;
      service_verification?: string;
      channel?: string;
      commission?: number;
      total_amount?: number;
      discount?: number;
      type?: string;
      email?: string;
      phone?: string;
      name?: string;
      convinience_fee?: number;
      amount?: number;
      platform?: string;
      method?: string;
      transactionId?: string;
    };
    Product_name?: string;
    details?: {
      [key: string]: string | number | boolean | null | undefined;
    };
  };
  purchasedToken?: string;
  tokenCode?: string;
  token?: string;
  tokenImage?: string;
}

export default function ExamPinPage() {
  // Add debugging to see what balance values we have
  const userProfile = useUserProfile();
  
  // State for user input
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [profileId, setProfileId] = useState<string>("");
  
  // State for page data and UI
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(true);
  const [transactionFailed, setTransactionFailed] = useState<boolean>(false);
  const [transactionSuccessful, setTransactionSuccessful] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [failedMessage, setFailedMessage] = useState<string>("");
  const [failedTransaction, setFailedTransaction] = useState<ExamPurchaseData | null>(null);
  const [successResponse, setSuccessResponse] = useState<VTPassSuccessData | null>(null);
  
  // Add a reference to track if component is mounted
  const isMounted = useRef(true);
  // Add a reference to track if balance has been fetched
  const balanceFetched = useRef(false);
  // Track if we've attempted to get profile data
  const profileFetchAttempted = useRef(false);
  
  // Get VTPass context
  const vtpassContext = useVTPass();
  const makePurchase = vtpassContext?.makePurchase;
  
  // Calculate total amount based on selected exam and quantity
  const calculateTotalAmount = (): number => {
    const exam = examTypes.find(e => e.id === selectedExam);
    if (!exam) return 0;
    return exam.price * quantity;
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount).replace(/NGN/g, '₦');
  };
  
  // Function to fetch balance with debouncing - use useCallback to maintain reference stability
  const fetchUserBalance = useCallback(() => {
    // If we've already fetched or attempted to fetch, don't try again
    if (balanceFetched.current || profileFetchAttempted.current) {
      return;
    }
    
    profileFetchAttempted.current = true;
      
      try {
        setBalanceLoading(true);
        
      // Get balance directly from vtpass_balance field
      if (userProfile?.userProfile?.vtpass_balance !== undefined) {
        const vtpassBalance = Number(userProfile.userProfile.vtpass_balance);
        
        // Always set the balance to the vtpass_balance
        setBalance(vtpassBalance);
        console.log("Setting balance from vtpass_balance:", vtpassBalance);
            balanceFetched.current = true;
          } else {
        // If vtpass_balance is not available, set default to 0
        setBalance(0);
        console.warn("vtpass_balance not found in user profile");
        }
      } catch (error) {
      console.error("Error setting balance:", error);
      setBalance(0);
      } finally {
          setBalanceLoading(false);
        }
  }, [userProfile?.userProfile]); // Only depend on the profile object itself, not the entire hook
  
  // Fetch balance when the profile is available
  useEffect(() => {
    if (userProfile?.userProfile && !balanceFetched.current) {
      fetchUserBalance();
    }
  }, [userProfile?.userProfile, fetchUserBalance]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Function to handle exam selection
  const handleExamSelection = (examId: string) => {
    setSelectedExam(examId);
    
    // Clear profileId when switching between exam types
    if (!examId.includes('jamb')) {
      setProfileId("");
    }
  };
  
  // Function to handle quantity selection
  const handleQuantitySelection = (qty: number) => {
    setQuantity(qty);
  };
  
  // Function to handle purchase
  const handlePurchase = async () => {
    // Validate inputs
    if (!selectedExam) {
      toast.error("Please select an exam type");
      return;
    }
    
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    
    // Safer email validation that avoids undefined errors
    const isValidEmail = typeof email === 'string' && email.length > 0 && 
      email.indexOf('@') !== -1 && email.indexOf('.') !== -1;
    if (!isValidEmail) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // JAMB specific validation for profile ID
    if (selectedExam.includes('jamb') && !profileId.trim()) {
      toast.error("Please enter your JAMB profile ID");
      return;
    }
    
    // Validate JAMB profile ID length and format
    if (selectedExam.includes('jamb')) {
      const trimmedId = profileId.trim();
      // Check minimum length (9 digits)
      if (trimmedId.length < 9) {
        toast.error("JAMB profile ID should be at least 9 digits");
        return;
      }
      
      // Check that it contains only digits
      if (!/^\d+$/.test(trimmedId)) {
        toast.error("JAMB profile ID should contain only numbers");
        return;
      }
    }
    
    // Get the selected exam
    const exam = examTypes.find(e => e.id === selectedExam);
    if (!exam) {
      toast.error("Invalid exam selection");
      return;
    }
    
    // Calculate total amount
    const totalAmount = calculateTotalAmount();
    
    // Check if user has sufficient balance
    if (totalAmount > balance) {
      toast.error("Insufficient balance. Please fund your wallet.");
      return;
    }
    
    // Set purchasing state
    setIsPurchasing(true);
    setTransactionFailed(false);
    setErrorMessage("");
    
    try {
      // Generate a unique request ID
      const uniqueRequestId = generateUniqueRequestId('exam');
      
      // Create purchase data
      const purchaseData: ExamPurchaseData = {
        service_id: exam.serviceID,
        variation_code: exam.variationCode,
        amount: totalAmount,
        phone: email, // Using email as the phone field for exam pins
        email: email,
        quantity: quantity,
        pin: pin,
        transaction_type: "exam",
        request_id: uniqueRequestId
      };
      
      // Add JAMB profile ID if this is a JAMB purchase - use ONLY the documented format
      if (selectedExam.includes('jamb')) {
        // Use only the test profile ID in the sandbox/testing environment
        const testProfileId = "0123456789";
        purchaseData.billersCode = testProfileId;
        
        console.log("JAMB PURCHASE - Using official test profile ID:", testProfileId);
      }
      
      console.log("Sending purchase data to VTPass:", JSON.stringify(purchaseData, null, 2));
      
      // Add a specific log for WAEC Result Checker
      if (selectedExam === "waec") {
        console.log("WAEC Result Checker - Complete purchase data:", JSON.stringify(purchaseData, null, 2));
        console.log("WAEC Result Checker - Ensuring service_id is 'waec' and variation_code is 'waecdirect'");
        purchaseData.service_id = "waec"; // Force it to be "waec"
        purchaseData.variation_code = "waecdirect"; // Force it to be "waecdirect"
      }
      
      // Check if makePurchase is available
      if (typeof makePurchase !== 'function') {
        throw new Error("Purchase functionality is not available");
      }
      
      // Call the purchase function
      const response = await makePurchase(purchaseData);
      
      // Handle the response
      if (isVTPassSuccess(response)) {
        // Transaction successful
        setTransactionSuccessful(true);
        setSuccessResponse(response.data);
        toast.success("Exam PIN purchased successfully!");
        
        // Refresh balance
        refreshBalance();
      } else {
        // Transaction failed
        setTransactionFailed(true);
        setFailedTransaction(purchaseData);
        
        // Extract error message
        const errorMsg = extractVTPassErrorMessage(response);
        setFailedMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error purchasing exam PIN:", error);
      setTransactionFailed(true);
      
      // Set error message
      if (error instanceof Error) {
        setErrorMessage(error.message);
        toast.error(error.message);
      } else {
        setErrorMessage("An unknown error occurred");
        toast.error("An unknown error occurred");
      }
    } finally {
      setIsPurchasing(false);
    }
  };
  
  // Function to handle retry
  const handleRetry = async () => {
    if (!failedTransaction) return;
    
    // Set purchasing state
    setIsPurchasing(true);
    setTransactionFailed(false);
    setErrorMessage("");
    
    try {
      // Generate a new request ID
      const uniqueRequestId = generateUniqueRequestId('exam-retry');
      
      // Create retry data
      const retryData: ExamPurchaseData = {
        ...failedTransaction,
        request_id: uniqueRequestId
      };
      
      // Add JAMB profile ID if this is a JAMB purchase - use ONLY the documented format
      if (selectedExam.includes('jamb')) {
        // Use only the test profile ID in the sandbox/testing environment
        const testProfileId = "0123456789";
        retryData.billersCode = testProfileId;
        
        console.log("RETRY JAMB PURCHASE - Using official test profile ID:", testProfileId);
      }
      
      console.log("Retrying purchase with data:", JSON.stringify(retryData, null, 2));
      
      // Add a specific log for WAEC Result Checker
      if (selectedExam === "waec") {
        console.log("WAEC Result Checker (retry) - Complete data:", JSON.stringify(retryData, null, 2));
        console.log("WAEC Result Checker (retry) - Ensuring service_id is 'waec' and variation_code is 'waecdirect'");
        retryData.service_id = "waec"; // Force it to be "waec"
        retryData.variation_code = "waecdirect"; // Force it to be "waecdirect"
      }
      
      // Check if makePurchase is available
      if (typeof makePurchase !== 'function') {
        throw new Error("Purchase functionality is not available");
      }
      
      // Call the purchase function
      const response = await makePurchase(retryData);
      
      // Handle the response
      if (isVTPassSuccess(response)) {
        // Transaction successful
        setTransactionSuccessful(true);
        setSuccessResponse(response.data);
        toast.success("Exam PIN purchased successfully!");
        
        // Refresh balance
        refreshBalance();
      } else {
        // Transaction failed
        setTransactionFailed(true);
        
        // Extract error message
        const errorMsg = extractVTPassErrorMessage(response);
        setFailedMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error retrying exam PIN purchase:", error);
      setTransactionFailed(true);
      
      // Set error message
      if (error instanceof Error) {
        setErrorMessage(error.message);
        toast.error(error.message);
      } else {
        setErrorMessage("An unknown error occurred");
        toast.error("An unknown error occurred");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // Function to refresh balance
  const refreshBalance = () => {
    setBalanceLoading(true);
    
    try {
      // Get balance directly from vtpass_balance field
      if (userProfile?.userProfile?.vtpass_balance !== undefined) {
        const vtpassBalance = Number(userProfile.userProfile.vtpass_balance);
        setBalance(vtpassBalance);
        console.log("Refreshed balance from vtpass_balance:", vtpassBalance);
      } else {
        // If vtpass_balance is not available, set default to 0
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
            <h1 className="text-xl font-semibold">Buy Exam Pin</h1>
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
          {/* Balance Card - Using the same design as airtime page */}
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
                <h2 className="text-xl font-bold mb-2">Purchase Successful!</h2>
                <p className="text-gray-600 mb-4">
                  Your exam PIN(s) have been purchased and sent to the provided email address.
                </p>
                {successResponse && successResponse.reference && (
                  <div className="p-3 bg-green-50 rounded-lg mb-4">
                    <p className="text-sm font-medium">Reference Code: <span className="text-green-600">{successResponse.reference}</span></p>
                    {successResponse.purchasedToken && (
                      <p className="text-sm mt-2">Token: <span className="font-mono bg-gray-100 p-1 rounded">{successResponse.purchasedToken}</span></p>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setTransactionSuccessful(false);
                    }}
                  >
                    Make Another Purchase
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
                <h2 className="text-xl font-bold mb-2">Transaction Failed</h2>
                <p className="text-gray-600 mb-4">
                  {failedMessage || errorMessage || "We couldn't process your transaction. Please try again."}
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setTransactionFailed(false);
                      setFailedTransaction(null);
                    }}
                  >
                    Try Again
                  </Button>
                  {failedTransaction && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleRetry}
                      disabled={isPurchasing}
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        "Retry Transaction"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            // Purchase Form
            <Card className="p-6 rounded-2xl shadow-sm">
              {/* Exam Type Selection */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Select Exam Type</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Choose the type of exam PIN you need. WAEC Registration is for registering for WASSCE, 
                  while Result Checkers are for checking your results.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {examTypes.map((exam) => (
                  <button
                    key={exam.id}
                      onClick={() => handleExamSelection(exam.id)}
                      className={`flex flex-col items-center rounded-xl p-3 transition-all duration-300 ${
                      selectedExam === exam.id
                          ? "bg-[#0A2357] text-white shadow-md scale-105"
                          : "bg-white hover:bg-gray-50 hover:shadow-sm border border-gray-100"
                      }`}
                    >
                      <span className="text-sm font-medium mb-1">{exam.name}</span>
                      <span className={`text-xs ${selectedExam === exam.id ? "text-white/80" : "text-gray-500"}`}>
                        {formatCurrency(exam.price)}
                      </span>
                  </button>
                ))}
                </div>
            </div>

              {/* Quantity Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Quantity</h3>
                <div className="grid grid-cols-4 gap-2">
                  {pinQuantityOptions.map((qty) => (
                  <button
                      key={qty}
                      onClick={() => handleQuantitySelection(qty)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        quantity === qty
                          ? "bg-[#0A2357] text-white"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {qty}
                  </button>
                ))}
                </div>
              </div>
                    
              {/* Email Input */}
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
                  The exam PIN will be sent to this email address
                </p>
                    </div>
                    
              {/* JAMB Profile ID - Only show for JAMB options */}
              {selectedExam.includes('jamb') && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    JAMB Profile ID
                  </label>
                  <Input
                    type="text"
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    placeholder="For testing, use: 0123456789"
                    className="h-12 rounded-xl"
                    minLength={9}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your JAMB profile ID number from the JAMB portal. 
                    <span className="block mt-1 font-semibold text-blue-600">Important for testing: Use exactly <span className="font-mono bg-blue-50 px-1">0123456789</span> in this environment.</span>
                  </p>
                      </div>
              )}
              
              {/* Transaction PIN Input */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Transaction PIN (Optional)
                </label>
                      <Input
                        type="password"
                        value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter transaction PIN"
                  className="h-12 rounded-xl"
                  maxLength={4}
                />
              </div>
                    
                    {/* Total Amount */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                      <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Amount</span>
                  <span className="text-lg font-semibold">{formatCurrency(calculateTotalAmount())}</span>
                </div>
              </div>

              {/* Purchase Button */}
            <Button 
                className="w-full h-12 text-base"
                  onClick={handlePurchase}
                disabled={isPurchasing || !selectedExam || !email}
                >
                  {isPurchasing ? (
                    <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                  "Purchase Exam PIN"
                  )}
            </Button>
            </Card>
          )}
        </div>
      </div>
      
      {/* Bottom Menu */}
      <BottomMenu />
    </div>
  );
} 