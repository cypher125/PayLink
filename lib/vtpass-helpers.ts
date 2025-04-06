/**
 * VTPass API Helper Functions
 * 
 * This file contains helper functions for working with the VTPass API
 * to ensure consistent error handling and correct variation codes.
 */

/**
 * Generates a unique request ID to prevent duplicate transactions
 */
export const generateUniqueRequestId = (prefix: string = 'tx'): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${randomStr}`;
};

// Define type for VTPass response for better type safety
export interface VTPassResponseData {
  code?: string;
  response_description?: string;
  content?: {
    transactions?: {
      status?: string;
      product_name?: string;
      amount?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  requestId?: string;
  amount?: number;
  transaction_date?: string;
  purchased_code?: string;
  error_message?: string;
  suggested_action?: string;
  [key: string]: unknown;
}

/**
 * Correct VTPass variation codes for different networks
 */
export const VTPASS_VARIATION_CODES: Record<string, Record<string, Record<string, string>>> = {
  // MTN Data Bundles
  MTN: {
    DATA: {
      "500MB-1Day": "mtn-daily-500mb",
      "1GB-7Days": "mtn-weekly-1gb",
      "2GB-30Days": "mtn-monthly-2gb",
      "3GB-30Days": "mtn-monthly-3gb",
      "5GB-30Days": "mtn-monthly-5gb",
      "10GB-30Days": "mtn-monthly-10gb"
    }
  },
  // Airtel Data Bundles
  AIRTEL: {
    DATA: {
      "750MB": "airtel-750mb",
      "1.5GB": "airtel-1.5gb",
      "3GB": "airtel-3gb",
      "4.5GB": "airtel-4.5gb",
      "10GB": "airtel-10gb"
    }
  },
  // Glo Data Bundles
  GLO: {
    DATA: {
      "1GB": "glo-1gb",
      "2GB": "glo-2gb",
      "5GB": "glo-5gb",
      "10GB": "glo-10gb"
    }
  },
  // 9Mobile Data Bundles
  "9MOBILE": {
    DATA: {
      "1GB": "etisalat-1gb",
      "2.5GB": "etisalat-2.5gb",
      "11.5GB": "etisalat-11.5gb"
    }
  }
};

/**
 * Service IDs for different providers and services
 */
export const VTPASS_SERVICE_IDS: Record<string, Record<string, string>> = {
  MTN: {
    AIRTIME: "mtn",
    DATA: "mtn-data"
  },
  AIRTEL: {
    AIRTIME: "airtel",
    DATA: "airtel-data"
  },
  GLO: {
    AIRTIME: "glo",
    DATA: "glo-data"
  },
  "9MOBILE": {
    AIRTIME: "etisalat",
    DATA: "etisalat-data"
  }
};

/**
 * Extract a meaningful error message from VTPass API response
 */
export const extractVTPassErrorMessage = (responseData: VTPassResponseData): string => {
  // Check if this is actually a successful transaction
  if (responseData?.code === '000' && 
      responseData?.response_description?.includes('TRANSACTION SUCCESSFUL')) {
    return 'Transaction completed successfully!';
  }
  
  // Now handle error cases
  let errorMessage = 'An error occurred with your transaction.';
  
  // Try to get the most specific error message
  if (responseData?.error_message) {
    errorMessage = responseData.error_message;
  } else if (responseData?.response_description) {
    errorMessage = responseData.response_description;
  }
  
  // Handle specific error codes - adding more VTPass error codes
  switch (responseData?.code) {
    case "000":
      if (responseData?.response_description?.includes('SUCCESSFUL')) {
        return 'Transaction completed successfully!';
      }
      break;
    case "099":
      return "Transaction is pending. Please wait for confirmation.";
    case "016":
      errorMessage = "Transaction failed: " + (errorMessage || "Unknown reason");
      break;
    case "014":
      errorMessage = "Insufficient funds in your account. Please add funds and try again.";
      break;
    case "010":
      errorMessage = "The selected variation code does not exist for this product. Please try a different bundle.";
      break;
    case "009":
      errorMessage = "Duplicate transaction detected. Please check if your previous transaction was successful.";
      break;
    case "018":
      errorMessage = "Invalid phone number format. Please check and try again.";
      break;
    case "020":
      errorMessage = "Transaction verification failed. Please contact support.";
      break;
    case "021":
      errorMessage = "Network error or service unavailable. Please try again later.";
      break;
    case "025":
      errorMessage = "Invalid amount for this service. Please enter a valid amount.";
      break;
    case "026":
      errorMessage = "Invalid variation code. Please select a different bundle.";
      break;
  }
  
  // Add suggested action if available
  if (responseData?.suggested_action) {
    errorMessage = `${errorMessage} ${responseData.suggested_action}`;
  }
  
  return errorMessage;
};

/**
 * Check if a VTPass response indicates success
 */
export const isVTPassSuccess = (response: VTPassResponseData): boolean => {
  // Check for success codes
  return !!(
    response && 
    (response.code === '000' || 
     response.code === '01' || 
     (response.response_description && 
      response.response_description.includes('SUCCESSFUL')))
  );
};

/**
 * Convert old variation codes to the new format required by VTPass
 */
export const getCorrectVariationCode = (
  networkId: string, 
  service: 'DATA', 
  oldCode: string
): string => {
  // Convert network ID to uppercase for lookup
  const networkKey = networkId.toUpperCase();
  
  // Check if we have the conversion
  if (VTPASS_VARIATION_CODES[networkKey]?.[service]?.[oldCode]) {
    return VTPASS_VARIATION_CODES[networkKey][service][oldCode];
  }
  
  // Return the original code if no mapping found
  return oldCode;
};

/**
 * Get the correct service ID for a provider and service type
 */
export const getCorrectServiceId = (
  networkId: string,
  service: 'AIRTIME' | 'DATA'
): string => {
  // Convert network ID to uppercase for lookup
  const networkKey = networkId.toUpperCase();
  
  // Return the service ID if found, or fallback
  return VTPASS_SERVICE_IDS[networkKey]?.[service] || `${networkId}-${service.toLowerCase()}`;
}; 