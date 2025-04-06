"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Phone, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BottomMenu } from "@/components/BottomMenu"
import toast from "@/lib/toast"
import { useUserProfile } from "@/lib/hooks"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  getVTPassServices, 
  getUserTransactions,
  getVTPassBalance,
  PurchaseData,
  apiRequest
} from "@/lib/api"
import { useVTPass } from "@/contexts/VTPassContext"
import { 
  generateUniqueRequestId, 
  extractVTPassErrorMessage,
  isVTPassSuccess,
  VTPassResponseData
} from "@/lib/vtpass-helpers"

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
  data?: {
    content?: {
      variations?: any[];
      [key: string]: any;
    };
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

// Define interfaces for data types
interface NetworkProvider {
  id: string;
  name: string;
  image: string;
  serviceID: string;
  serviceType?: string;
}

interface DataBundle {
  size: string;
  price: number;
  validity: string;
  variation_code: string;
  original_price_string?: string;
}

interface RecentPhoneNumber {
  number: string;
  network: string;
  image: string;
}

// First, let's define a proper type for VTPass API variation
interface VTPassVariation {
  name: string;
  variation_code: string;
  variation_amount: string;
  fixedPrice: string;
}

// Define types for VTPass API response
interface VTPassServicesResponse {
  code?: string;
  content?: {
    variations?: VTPassVariation[];
    [key: string]: any;
  };
  data?: {
    content?: {
      variations?: VTPassVariation[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  response?: {
    content?: {
      variations?: VTPassVariation[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  response_description?: string;
  [key: string]: any;
}

// Define a local extension of PurchaseData that accepts string amounts
interface DataBundlePurchaseData extends Omit<PurchaseData, 'amount'> {
  amount: string | number;
}

const defaultNetworks: NetworkProvider[] = [
  { id: "mtn", name: "MTN", image: "/providers/mtn.jpg", serviceID: "mtn-data" },
  { id: "airtel", name: "AIRTEL", image: "/providers/airtel.png", serviceID: "airtel-data" },
  { id: "9mobile", name: "9MOBILE", image: "/providers/9mobile.png", serviceID: "etisalat-data" },
  { id: "glo", name: "GLO", image: "/providers/glo.png", serviceID: "glo-data" },
]

// Define default bundles with corrected variation codes according to VTPass API
const defaultBundles: DataBundle[] = [
  // MTN Data Bundles with correct variation codes
  { size: "500MB", price: 150.0, validity: "1 Day", variation_code: "MTN500MB-24hrs" },
  { size: "1GB", price: 250.0, validity: "7 Days", variation_code: "MTN1GB-7days" },
  { size: "2GB", price: 520.0, validity: "30 Days", variation_code: "MTN2GB-30days" },
  { size: "3GB", price: 770.5, validity: "30 Days", variation_code: "MTN3GB-30days" },
  { size: "5GB", price: 1270.5, validity: "30 Days", variation_code: "MTN5GB-30days" },
  { size: "10GB", price: 2750.5, validity: "30 Days", variation_code: "MTN10GB-30days" }
];

// Backup variation code patterns for different networks if API fails
const variationCodePatterns = {
  "mtn": "mtn-data-{SIZE}-N{PRICE}",
  "airtel": "airtel-data-{SIZE}-N{PRICE}",
  "glo": "glo-data-{SIZE}-N{PRICE}",
  "9mobile": "9mobile-data-{SIZE}-N{PRICE}"
};

// Define better typing for network bundles with index signature
interface NetworkBundlesMap {
  [key: string]: DataBundle[];
}

// Define network-specific bundles for each provider
const networkDefaultBundles: NetworkBundlesMap = {
  "mtn": [
    { size: "500MB", price: 150.0, validity: "1 Day", variation_code: "MTN500MB-24hrs" },
    { size: "1GB", price: 250.0, validity: "7 Days", variation_code: "MTN1GB-7days" },
    { size: "2GB", price: 520.0, validity: "30 Days", variation_code: "MTN2GB-30days" },
    { size: "3GB", price: 770.5, validity: "30 Days", variation_code: "MTN3GB-30days" },
    { size: "5GB", price: 1270.5, validity: "30 Days", variation_code: "MTN5GB-30days" },
    { size: "10GB", price: 2750.5, validity: "30 Days", variation_code: "MTN10GB-30days" }
  ],
  "airtel": [
    { size: "750MB", price: 500.0, validity: "14 Days", variation_code: "750MB" },
    { size: "1.5GB", price: 1000.0, validity: "30 Days", variation_code: "1.5GB" },
    { size: "3GB", price: 1500.0, validity: "30 Days", variation_code: "3GB" },
    { size: "4.5GB", price: 2000.0, validity: "30 Days", variation_code: "4.5GB" },
    { size: "10GB", price: 3000.0, validity: "30 Days", variation_code: "10GB" }
  ],
  "9mobile": [
    { size: "1GB", price: 1000.0, validity: "30 Days", variation_code: "1GB" },
    { size: "2.5GB", price: 2000.0, validity: "30 Days", variation_code: "2.5GB" },
    { size: "5GB", price: 3500.0, validity: "30 Days", variation_code: "5GB" },
    { size: "11.5GB", price: 8000.0, validity: "30 Days", variation_code: "11.5GB" }
  ],
  "glo": [
    { size: "1GB", price: 500.0, validity: "30 Days", variation_code: "G1000" },
    { size: "2GB", price: 1000.0, validity: "30 Days", variation_code: "G2000" },
    { size: "4.5GB", price: 2000.0, validity: "30 Days", variation_code: "G4500" },
    { size: "7.2GB", price: 2500.0, validity: "30 Days", variation_code: "G7200" },
    { size: "10GB", price: 3000.0, validity: "30 Days", variation_code: "G10000" }
  ]
};

// Use the helper function as a direct reference
// const extractVTPassErrorMessage = vtpassExtractErrorMessage;

export default function DataBundlePage() {
  const [networks, setNetworks] = useState<NetworkProvider[]>(defaultNetworks)
  const [dataBundles, setDataBundles] = useState<DataBundle[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [pin, setPin] = useState("")
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null)
  const [bundleType, setBundleType] = useState("SME")
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [recentNumbers, setRecentNumbers] = useState<RecentPhoneNumber[]>([])
  const [balance, setBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [transactionFailed, setTransactionFailed] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [autoRetry, setAutoRetry] = useState(false)
  const [bundlesLoading, setBundlesLoading] = useState(false)
  const [transactionSuccessful, setTransactionSuccessful] = useState(false)
  const [failedMessage, setFailedMessage] = useState("")
  const [failedTransaction, setFailedTransaction] = useState<any>(null)
  
  // Use ref to track if initial data has been loaded
  const dataLoadedRef = useRef(false)
  
  const userProfile = useUserProfile()
  
  // Get VTPass context functions
  const { makePurchase, fetchBalance: refreshBalance } = useVTPass();
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount).replace(/NGN/g, '₦')
  }

  // Load data when component mounts
  useEffect(() => {
    // Skip if data is already loaded
    if (dataLoadedRef.current) return;
    
    const loadDataBundleData = async () => {
      try {
        setBalanceLoading(true)
        
        // Fetch networks, transactions, and balance in parallel
        const [transactionsData, balanceData] = await Promise.all([
          getUserTransactions(),
          getVTPassBalance()
        ])
        
        // Process recent transactions for phone numbers
        if (transactionsData && Array.isArray(transactionsData)) {
          const dataTransactions = transactionsData
            .filter(tx => tx.transaction_type?.toLowerCase() === 'data')
            .slice(0, 5)
          
          // Extract phone numbers from transactions
          const phoneNumbers: RecentPhoneNumber[] = dataTransactions.map(tx => {
            // Determine network based on service_id
            const network = defaultNetworks.find(n => n.serviceID === tx.service_id) || defaultNetworks[0]
            
            return {
              number: tx.phone_number || "",
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
        
        // Set balance if available
        if (balanceData?.balance) {
          setBalance(parseFloat(balanceData.balance.toString()))
        } else if (userProfile?.userProfile?.vtpass_balance) {
          setBalance(userProfile.userProfile.vtpass_balance)
        }
      } catch (error) {
        console.error('Error loading data bundle data:', error)
        toast.error('Failed to load data bundle information')
      } finally {
        setBalanceLoading(false)
        // Mark data as loaded
        dataLoadedRef.current = true;
      }
    }
    
    loadDataBundleData()
    
    // Clean up function to prevent memory leaks
    return () => {
      // If needed, cancel any pending requests here
    }
  }, []) // Empty dependency array means this runs once on mount
  
  // Update balance from user profile if needed
  useEffect(() => {
    if (balanceLoading && userProfile?.userProfile?.vtpass_balance !== undefined) {
      setBalance(userProfile.userProfile.vtpass_balance)
      setBalanceLoading(false)
    }
  }, [userProfile, balanceLoading])
  
  // Parse VTPass variation data to our DataBundle format
  const parseVariationsToDataBundles = (variations: any[]): DataBundle[] => {
    if (!variations || !Array.isArray(variations)) {
      return [];
    }
    
    // Map VTPass variations to our DataBundle format
    return variations.map(variation => {
      // Extract size from the name or get a default
      const name = variation.name || 'Unknown Bundle';
      const size = name.match(/(\d+(?:\.\d+)?(?:MB|GB|TB))/i)?.[0] || name;
      
      // Get validity period from name or variation_amount
      let validity = "30 Days"; // Default validity
      if (name.toLowerCase().includes('daily') || name.toLowerCase().includes('1 day')) {
        validity = "1 Day";
      } else if (name.toLowerCase().includes('weekly') || name.toLowerCase().includes('7 day')) {
        validity = "7 Days";
      }
      
      // Return formatted bundle object
      return {
        size: size,
        price: parseFloat(variation.variation_amount || '0'),
        validity: validity,
        variation_code: variation.variation_code,
        original_price_string: variation.variation_amount
      };
    }).filter(bundle => bundle.price > 0) // Filter out invalid bundles
     .sort((a, b) => a.price - b.price); // Sort by price
  };
  
  // Function to handle retry logic for failed transactions
  const handleRetryTransaction = () => {
    // Clear error state
    setTransactionFailed(false);
    setErrorMessage("");
    
    // Find the selected bundle
    const bundle = dataBundles.find(b => b.size === selectedBundle);
    if (!bundle) {
      toast.error("Bundle not found for retry");
      return;
    }
    
    // Create a new unique request ID for the retry
    const requestId = `data-${Date.now()}-retry-${retryCount}${Math.random().toString(36).substring(2, 7)}`;
    
    // Create purchase data with the new request ID, ensuring amount is a number
    const purchaseData: PurchaseData = {
      service_id: networks.find(n => n.id === selectedNetwork)?.serviceID || "",
      variation_code: bundle.variation_code,
      amount: Number(bundle.price), // Explicitly convert to number type
      phone: phoneNumber,
      email: userProfile?.userProfile?.email || "",
      pin: pin,
      transaction_type: "data",
      request_id: requestId,
      auto_retry: true // Enable auto-retry for retries
    };
    
    // Attempt the purchase again
    handlePurchaseWithData(purchaseData);
    
    // Clear failed transaction state
    setFailedTransaction(null);
    setRetryCount(prev => prev + 1);
  };
  
  // Clear failed transaction state
  const clearFailedState = () => {
    setTransactionFailed(false);
    setErrorMessage("");
    setRetryCount(0);
  };
  
  // First, let's add the missing saveRecentPhoneNumber function
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
      const existingRecents = localStorage.getItem('recentDataNumbers');
      let recents: RecentPhoneNumber[] = existingRecents ? JSON.parse(existingRecents) : [];
      
      // Remove the same number if it exists
      recents = recents.filter(r => r.number !== number);
      
      // Add the new one at the beginning
      recents.unshift(newRecent);
      
      // Keep only the last 5
      recents = recents.slice(0, 5);
      
      // Save back to local storage
      localStorage.setItem('recentDataNumbers', JSON.stringify(recents));
    } catch (error) {
      console.error('Error saving recent number:', error);
    }
  };

  // Now update the handlePurchaseWithData function to provide better error handling
  const handlePurchaseWithData = async (purchaseData: PurchaseData) => {
    try {
      console.log("Sending purchase data:", purchaseData);
      
      // Use the makePurchase function from props directly
      const response = await makePurchase(purchaseData);
      console.log("Purchase response:", response);
      
      // Check for successful transaction - VTPass success codes include '000' and '01'
      if (response && 
          (response.code === '000' || 
           response.code === '01' || 
           (response.response_description && response.response_description.includes('SUCCESSFUL')))) {
        // Handle success
        setTransactionSuccessful(true);
        setIsPurchasing(false);
        setSelectedBundle(null);
        setPhoneNumber('');
        setPin('');
        
        // Set success message with details
        let successMessage = `Successfully purchased ${purchaseData.amount} data bundle`;
        if (response.content?.transactions?.product_name) {
          successMessage = `Successfully purchased ${response.content.transactions.product_name}`;
        }
        toast.success(successMessage);
        
        // Update balance if we have the data
        if (response.content?.transactions?.amount) {
          try {
            // Refresh balance after successful purchase
            await refreshBalance();
          } catch (e) {
            console.error("Error refreshing balance:", e);
          }
        }
      } else {
        // Handle failed transaction with a specific error message
        setTransactionFailed(true);
        setIsPurchasing(false);
        
        // Extract error message from response
        const errorMessage = extractVTPassErrorMessage(response);
        setFailedMessage(errorMessage);
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
      setFailedMessage(errorMessage);
      toast.error(errorMessage);
    }
  };
  
  // Handle network selection - update bundles based on network
  const handleNetworkSelect = async (networkId: string) => {
    try {
      setBundlesLoading(true);
      setSelectedNetwork(networkId);
      
      // Find the selected network
      const network = networks.find(n => n.id === networkId) || networks[0];
      
      // Try direct API call first
      try {
        const directAPIResponse = await debugVTPassAPI(networkId);
        // If we get here, the direct API call succeeded
        return;
      } catch (directApiError) {
        console.log(`Error fetching from direct VTPass API for ${network.name}:`, directApiError);
      }
      
      // If direct API call failed, fallback to our backend endpoint
      console.log(`Falling back to backend API for ${network.name} data plans`);
      const servicesData = await getVTPassServices(network.serviceID) as VTPassServicesResponse;
      console.log("Backend VTPass service response:", servicesData);
      
      // Access variations safely by checking all possible paths
      const variations = servicesData?.content?.variations || 
                         servicesData?.data?.content?.variations || 
                         servicesData?.response?.content?.variations || 
                         [];
      
      // Check if we received valid data from the backend API
      if (variations && Array.isArray(variations)) {
        // Map API variations to our data bundle format
        const networkBundles = variations
          .filter((variation: VTPassVariation) => variation.variation_code && variation.variation_amount)
          .map((variation: VTPassVariation) => {
            // Extract details from variation
            let size = variation.name || "Unknown Bundle";
            const sizeMatch = size.match(/(\d+(?:\.\d+)?(?:MB|GB|TB))/i);
            if (sizeMatch) {
              size = sizeMatch[0];
            }
            
            // Determine validity from name
            let validity = "30 Days"; // Default
            if (variation.name?.toLowerCase().includes("daily")) {
              validity = "1 Day";
            } else if (variation.name?.toLowerCase().includes("weekly")) {
              validity = "7 Days";
            }
            
            return {
              size,
              price: parseFloat(variation.variation_amount),
              validity,
              variation_code: variation.variation_code,
              original_price_string: variation.variation_amount
            };
          });
        
        setDataBundles(networkBundles);
      } else {
        // Last resort: use network-specific default bundles
        console.log(`Using default data bundles for ${network.name} - API calls failed`);
        toast.info(`Using default data bundles for ${network.name}`);
        const networkBundles = networkDefaultBundles[networkId] || defaultBundles;
        setDataBundles(networkBundles);
      }
    } catch (error) {
      // Get network name from networkId for the error message
      const networkName = networks.find(n => n.id === networkId)?.name || networkId;
      
      console.error(`Error fetching data bundles for ${networkName}:`, error);
      toast.error(`Failed to load data plans for ${networkName}`);
      
      // Fallback to defaults
      const networkBundles = networkDefaultBundles[networkId] || defaultBundles;
      setDataBundles(networkBundles);
    } finally {
      setBundlesLoading(false);
    }
  }
  
  // Handle purchase of data bundle
  const handlePurchase = async () => {
    // Validate input
    if (!selectedNetwork) {
      toast.error("Please select a network");
      return;
    }
    
    if (!selectedBundle) {
      toast.error("Please select a data bundle");
      return;
    }
    
    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }
    
    if (phoneNumber.length !== 11) {
      toast.error("Please enter a valid 11-digit phone number");
      return;
    }
    
    if (!pin) {
      toast.error("Please enter your transaction PIN");
      return;
    }
    
    if (pin.length !== 4) {
      toast.error("PIN must be 4 digits");
      return;
    }
    
    // Find the selected network and bundle
    const network = networks.find(n => n.id === selectedNetwork);
    const bundle = dataBundles.find(b => b.size === selectedBundle);
    
    if (!network) {
      toast.error("Selected network not found");
      return;
    }
    
    if (!bundle) {
      toast.error("Selected data bundle not found");
      return;
    }
    
    // Check if user has sufficient balance
    if (bundle.price > balance) {
      toast.error(`Insufficient balance. You need ${formatCurrency(bundle.price)} to purchase this bundle.`);
      return;
    }
    
    // Confirm purchase
    if (!window.confirm(`Confirm purchase of ${bundle.size} data bundle for ${phoneNumber} at ${formatCurrency(bundle.price)}?`)) {
      return;
    }
    
    // Save the phone number for future use
    saveRecentPhoneNumber(phoneNumber, selectedNetwork);
    
    // Generate a unique request ID
    const requestId = generateUniqueRequestId('data');
    
    // Create purchase data
    const purchaseData: PurchaseData = {
      service_id: network.serviceID,
      variation_code: bundle.variation_code,
      amount: Number(bundle.price), // Explicitly convert to number
      phone: phoneNumber,
      email: userProfile?.userProfile?.email || "",
      pin: pin,
      transaction_type: "data",
      request_id: requestId
    };
    
    // Proceed with purchase
    handlePurchaseWithData(purchaseData);
  };

  // Enhanced debug function for API response inspection
  const debugVTPassAPI = async (networkId: string) => {
    try {
      // Find the network
      const network = networks.find(n => n.id === networkId);
      if (!network) {
        throw new Error(`Network ${networkId} not found`);
      }
      
      // Set up a timeout to prevent endless processing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for debug calls
      
      try {
        // Use direct API request instead of getVTPassServices to provide a fresh signal
        const servicesData = await apiRequest(`/users/services/${network.serviceID}/`, 'GET', undefined, true, controller.signal) as VTPassServicesResponse;
        clearTimeout(timeoutId);
        
        console.log("📊 DEBUG: RAW VTPass API Response:", JSON.stringify(servicesData, null, 2));
        
        // Extract variations from the response, checking multiple possible paths
        const variations = servicesData?.content?.variations || 
                            servicesData?.data?.content?.variations || 
                            servicesData?.response?.content?.variations;
        
        if (variations) {
          console.log("✅ Available variation codes:");
          console.table(variations.map((v: VTPassVariation) => ({
            name: v.name,
            code: v.variation_code,
            amount: v.variation_amount
          })));
          
          toast.success(`Found ${variations.length} data bundles from API`);
          
          // Just for debugging
          console.log("📋 Copy-paste version for defaultBundles:");
          const suggestedBundles = variations
            .filter((v: VTPassVariation) => v.variation_code && v.variation_amount)
            .map((v: VTPassVariation) => {
              let size = v.name;
              const sizeMatch = v.name.match(/(\d+(?:\.\d+)?(?:MB|GB|TB))/i);
              if (sizeMatch) size = sizeMatch[0];
              
              return {
                size,
                price: parseFloat(v.variation_amount),
                validity: "30 Days",
                variation_code: v.variation_code
              };
            });
          
          console.log(JSON.stringify(suggestedBundles, null, 2));
          
          // Map API variations to our data bundle format
          const networkBundles = variations
            .filter((v: VTPassVariation) => v.variation_code && v.variation_amount)
            .map((v: VTPassVariation) => {
              let size = v.name || "Unknown Bundle";
              const sizeMatch = size.match(/(\d+(?:\.\d+)?(?:MB|GB|TB))/i);
              if (sizeMatch) {
                size = sizeMatch[0];
              }
              
              // Determine validity from name
              let validity = "30 Days"; // Default
              if (v.name.toLowerCase().includes("daily")) {
                validity = "1 Day";
              } else if (v.name.toLowerCase().includes("weekly")) {
                validity = "7 Days";
              }
              
              return {
                size,
                price: parseFloat(v.variation_amount),
                validity,
                variation_code: v.variation_code,
                original_price_string: v.variation_amount
              };
            });
          
          setDataBundles(networkBundles);
          setBundlesLoading(false);
          return servicesData;
        }
        
        throw new Error("No variation data found in API response");
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error("Debug API failed:", error);
      toast.error("Debug direct API call failed");
      throw error;
    }
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
            <h1 className="text-xl font-semibold">Buy Data Bundle</h1>
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
          
          {/* Transaction Failed Card */}
          {transactionFailed && (
            <Card className="p-6 mb-6 rounded-2xl border-red-200 bg-red-50 shadow-sm">
              <div className="flex gap-4">
                <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-500" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-700 mb-1">Transaction Failed</h3>
                  <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleRetryTransaction}
                      disabled={isPurchasing || retryCount >= 3}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry Transaction
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFailedState}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        
          <Card className="p-6 rounded-2xl shadow-sm">
            {/* Network Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Select Network</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    onClick={() => handleNetworkSelect(network.id)}
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
              
              {/* Debug button - Only shown in development */}
              {selectedNetwork && (
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => debugVTPassAPI(selectedNetwork)}
                    className="text-xs bg-gray-100 px-3 py-1 rounded text-gray-600 hover:bg-gray-200"
                  >
                    Debug: Show API Data
                  </button>
                  
                  <button 
                    onClick={() => {
                      // Print helpful debug instructions
                      console.log("===== DATA BUNDLE DEBUG INFORMATION =====");
                      console.log("If you're seeing 'VARIATION CODE DOES NOT EXIST' errors, follow these steps:");
                      console.log("1. Click 'Debug: Show API Data' button above");
                      console.log("2. Look in the console for the correct variation codes");
                      console.log("3. Update the defaultBundles array in the code with the correct codes");
                      console.log("Current default bundles:", defaultBundles);
                      console.log("Current network serviceIDs:", networks.map(n => ({id: n.id, serviceID: n.serviceID})));
                      
                      // Show popup for easy debugging
                      toast.info("Debug info printed to console - Press F12 to view");
                    }}
                    className="text-xs bg-blue-50 px-3 py-1 rounded text-blue-600 hover:bg-blue-100"
                  >
                    Help: Debug Variation Codes
                  </button>
                </div>
              )}
            </div>

            {/* Phone Number Input */}
            <div className="mb-6">
              <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="relative">
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08099545453"
                  className="h-12 pl-12 rounded-xl"
                />
                <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            {/* PIN Input */}
            <div className="mb-6">
              <label htmlFor="pin" className="mb-2 block text-sm font-medium text-gray-700">
                Transaction PIN
              </label>
              <div className="relative">
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your 4-digit PIN"
                  className="h-12 rounded-xl"
                  maxLength={4}
                />
              </div>
            </div>

            {/* Recent Numbers */}
            {recentNumbers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Numbers</h3>
                <div className="flex flex-wrap gap-2">
                  {recentNumbers.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setPhoneNumber(item.number);
                        setSelectedNetwork(item.network);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-1 px-3 text-sm hover:bg-gray-50"
                    >
                      <Image
                        src={item.image}
                        alt={item.network}
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain"
                      />
                      <span>{item.number}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bundle Type Selection */}
            <div className="mb-6 flex gap-4">
              <Button
                variant={bundleType === "SME" ? "default" : "outline"}
                onClick={() => setBundleType("SME")}
                className="flex-1 rounded-xl"
              >
                SME
              </Button>
              <Button
                variant={bundleType === "CORPORATE" ? "default" : "outline"}
                onClick={() => setBundleType("CORPORATE")}
                className="flex-1 rounded-xl"
              >
                CORPORATE GIFTING
              </Button>
            </div>

            {/* Data Bundles */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Select Data Bundle</h3>
              {bundlesLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-gray-500">Loading data plans...</p>
                </div>
              ) : dataBundles.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dataBundles.map((bundle, index) => (
                <button
                      key={`${bundle.variation_code}-${index}`}
                  onClick={() => setSelectedBundle(bundle.size)}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-300 ${
                    selectedBundle === bundle.size ? "border-[#0A2357] bg-[#0A2357]/5" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{bundle.size}</span>
                    <span className="font-semibold">₦{bundle.price.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{bundle.validity}</div>
                </button>
              ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <p className="text-gray-500">
                    {selectedNetwork ? "No data plans available for this network" : "Please select a network provider first"}
                  </p>
                </div>
              )}
            </div>

            {/* Auto-retry option */}
            <div className="mb-6 flex items-start space-x-2">
              <Checkbox 
                id="auto-retry" 
                checked={autoRetry}
                onCheckedChange={(checked) => setAutoRetry(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="auto-retry"
                  className="text-sm font-medium leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Auto-retry
                </label>
                <p className="text-xs text-gray-500">
                  Automatically retry failed transactions up to 3 times
                </p>
              </div>
            </div>

            {/* Purchase Button */}
            <Button 
              className="w-full rounded-xl bg-[#0A2357] py-6"
              onClick={handlePurchase}
              disabled={isPurchasing || !selectedNetwork || !selectedBundle || !phoneNumber || !pin}
            >
              {isPurchasing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Purchase Data Bundle"
              )}
            </Button>
          </Card>
        </div>
      </div>
      <BottomMenu />
    </div>
  )
}

