import toast from "./toast";

// API Base URL - change this to the production URL in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  state?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  bvn?: string;
  preferred_network?: string;
}

export interface SetPinData {
  pin: string;
  pin_confirm: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  state?: string;
  vtpass_account_id?: string;
  vtpass_balance?: number;
  preferred_network?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  has_pin?: boolean;
  kyc_level?: number;
  account_status?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface PurchaseData {
  service_id: string;
  variation_code?: string;
  amount: number;
  phone: string;
  email: string;
  pin: string;
  transaction_type: string;
  request_id?: string;
  auto_retry?: boolean;
  billersCode?: string;
}

export interface Transaction {
  id: string;
  transaction_type: string;
  service_id: string;
  amount: number;
  phone_number?: string;
  email?: string;
  request_id: string;
  vtpass_reference?: string;
  status: string;
  response_data?: Record<string, unknown>;
  created_at: string;
}

// Dashboard Stats Response Type
export interface DashboardStats {
  balance: number;
  this_month_spent: number;
  total_spent: number;
  recent_transactions: Transaction[];
}

export interface KYCStatus {
  kyc_level: number;
  account_status: string;
  is_bvn_verified: boolean;
  requirements: {
    next_level: number;
    missing_fields: string[];
  };
}

interface PinResponse {
  success: boolean;
  message: string;
}

// Custom error interface for our application
export interface AppError extends Error {
  insufficientBalance?: boolean;
  managedError?: boolean;
  handled?: boolean;
  responseData?: unknown;
  response?: {
    status: number;
    data: unknown;
  };
}

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

// Safe includes check (kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const safeIncludes = (haystack: string | null | undefined, needle: string): boolean => {
  if (!haystack) return false;
  try {
    return haystack.includes(needle);
  } catch {
    return false;
  }
};

// Utility functions for token management
export const getTokens = (): AuthTokens | null => {
  if (typeof window !== 'undefined') {
    const tokens = localStorage.getItem('auth_tokens');
    return tokens ? JSON.parse(tokens) : null;
  }
  return null;
};

export const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem('auth_tokens', JSON.stringify(tokens));
};

export const removeTokens = (): void => {
  localStorage.removeItem('auth_tokens');
};

// Helper for making authenticated API requests
export const apiRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: unknown,
  isAuthenticated: boolean = true,
  signal?: AbortSignal
): Promise<unknown> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const tokens = isAuthenticated ? getTokens() : null;
    const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isAuthenticated && tokens) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }

    console.log(`API Request: ${method} ${endpoint}`);
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include', // This enables sending cookies in cross-origin requests
      signal,
    });

    // Check if request was successful
    if (!response.ok) {
      // Special handling for 401 (Unauthorized) - attempt to refresh token
      if (response.status === 401 && isAuthenticated) {
        console.log('Token expired, attempting to refresh...');
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          // Retry the request with the new token
          return apiRequest(endpoint, method, data, isAuthenticated, signal);
        } else {
          const error = new Error('Session expired. Please login again.');
          (error as AppError).response = {
            status: 401,
            data: { detail: 'Authentication credentials were not provided.' }
          };
          throw error;
        }
      }
      
      // Handle insufficient balance errors specifically
      if (response.status === 400) {
        try {
          const errorData = await response.json();
          
          // Check for specific error messages related to insufficient balance
          if (errorData && 
              (safeString(errorData.detail).includes('insufficient balance') || 
               safeString(errorData.detail).includes('Insufficient funds'))) {
            const error = new Error(errorData.detail || 'Insufficient balance to complete this transaction');
            (error as AppError).insufficientBalance = true;
            (error as AppError).response = {
              status: response.status,
              data: errorData
            };
            throw error;
          }
        } catch {
          // If we can't parse the error, continue with generic error handling
        }
      }

      try {
        // Try to get structured error data (JSON)
        const errorData = await response.json();
        const error = new Error(
          errorData.detail || 
          errorData.error || 
          errorData.message || 
          `Request failed with status ${response.status}`
        );
        (error as AppError).response = {
          status: response.status,
          data: errorData
        };
        throw error;
      } catch {
        // If we can't parse JSON, try to get text content
        try {
          const textError = await response.text();
          
          // Check if it's HTML
          if (textError.includes('<!DOCTYPE html>') || textError.includes('<html>')) {
            // Extract title or any useful info from HTML
            const titleMatch = textError.match(/<title>(.*?)<\/title>/);
            const error = new Error(
              titleMatch ? titleMatch[1] : `Server error (HTTP ${response.status})`
            );
            (error as AppError).response = {
              status: response.status,
              data: { error: 'HTML response received' }
            };
            throw error;
          } else {
            const error = new Error(textError || `Request failed with status ${response.status}`);
            (error as AppError).response = {
              status: response.status,
              data: { error: textError }
            };
            throw error;
          }
        } catch {
          // If all else fails, throw generic error with status code
          const error = new Error(`Request failed with status ${response.status}`);
          (error as AppError).response = {
            status: response.status,
            data: { error: `HTTP ${response.status}` }
          };
          throw error;
        }
      }
    }

    try {
      // Try to parse the response as JSON
      const data = await response.json();
      return data;
    } catch {
      // If the response is not valid JSON (e.g. empty response)
      if (response.status >= 200 && response.status < 300) {
        // The request was successful but returned no data
        return { success: true };
      } else {
        const responseError = new Error('Invalid response format');
        (responseError as AppError).response = {
          status: response.status,
          data: { error: 'Invalid response format' }
        };
        throw responseError;
      }
    }
  } catch (unknownError: unknown) {
    // Cast the unknown error to a proper type
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('NetworkError')) {
      const networkError = new Error('Network error. Please check your internet connection.');
      (networkError as AppError).response = {
        status: 0,
        data: { error: 'Network connection failed' }
      };
      throw networkError;
    }
    
    // Handle timeout/abort errors
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Please try again.');
      (timeoutError as AppError).response = {
        status: 0,
        data: { error: 'Request timed out' }
      };
      throw timeoutError;
    }
    
    // If the error is already structured, pass it through
    if ((error as AppError).response) {
      throw error;
    }
    
    // Otherwise, wrap it in our standard format
    const wrappedError = new Error(error.message || 'Unknown error');
    (wrappedError as AppError).response = {
      status: 0,
      data: { error: error.message || 'Unknown error' }
    };
    throw wrappedError;
  }
};

// Authentication API functions
export const refreshToken = async (): Promise<boolean> => {
  const tokens = getTokens();
  if (!tokens?.refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/users/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: tokens.refresh }),
      credentials: 'include', // This enables sending cookies in cross-origin requests
    });

    if (!response.ok) {
      removeTokens();
      return false;
    }

    const data = await response.json();
    setTokens({
      access: data.access,
      refresh: tokens.refresh, // Keep the existing refresh token
    });
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    removeTokens();
    return false;
  }
};

export const login = async (credentials: LoginCredentials): Promise<{user: UserProfile, tokens: AuthTokens}> => {
  try {
    // Get tokens
    const tokensResponse = await apiRequest('/users/login/', 'POST', credentials, false);
    const typedTokensResponse = tokensResponse as { access: string, refresh: string };
    
    setTokens({
      access: typedTokensResponse.access,
      refresh: typedTokensResponse.refresh,
    });

    // Get user profile
    const userProfile = await apiRequest('/users/profile/') as UserProfile;
    
    return {
      user: userProfile,
      tokens: {
        access: typedTokensResponse.access,
        refresh: typedTokensResponse.refresh,
      }
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const register = async (userData: RegisterData): Promise<{
  user: UserProfile, 
  tokens: AuthTokens, 
  vtpass_account: unknown
}> => {
  try {
    const response = await apiRequest('/users/register/', 'POST', userData, false);
    const typedResponse = response as {
      user: UserProfile,
      tokens: { access: string, refresh: string },
      vtpass_account: unknown
    };
    
    // Set tokens in localStorage
    setTokens({
      access: typedResponse.tokens.access,
      refresh: typedResponse.tokens.refresh,
    });
    
    return {
      user: typedResponse.user,
      tokens: typedResponse.tokens,
      vtpass_account: typedResponse.vtpass_account
    };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    // Get the tokens before we remove them
    const tokens = getTokens();
    
    // If tokens exist, attempt to blacklist the refresh token
    if (tokens && tokens.refresh) {
      try {
        // Try to call a logout endpoint to blacklist the token
        // This is a "best effort" approach - we'll still log the user out even if this fails
        await fetch(`${API_BASE_URL}/users/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access}`
          },
          body: JSON.stringify({ refresh_token: tokens.refresh }),
        });
      } catch (error) {
        // Silently handle errors - we still want to logout the user locally
        console.log('Error blacklisting token:', error);
      }
    }
  } finally {
    // Always remove tokens locally
    removeTokens();
  }
};

export const getProfile = async (): Promise<UserProfile> => {
  const result = await apiRequest('/users/profile/');
  return result as UserProfile;
};

export const updateProfile = async (userData: Partial<UserProfile>): Promise<UserProfile> => {
  const result = await apiRequest('/users/profile/', 'PATCH', userData);
  return result as UserProfile;
};

export const getKYCStatus = async (): Promise<KYCStatus> => {
  const result = await apiRequest('/users/kyc-status/');
  return result as KYCStatus;
};

export const setPin = async (pinData: SetPinData): Promise<PinResponse> => {
  try {
    // Make sure pin_confirm is exactly the same as pin
    const dataToSend = {
      pin: pinData.pin,
      pin_confirm: pinData.pin_confirm
    };
    
    const response = await apiRequest('/users/set-pin/', 'PUT', dataToSend);
    const typedResponse = response as PinResponse;
    
    // Set a cookie to indicate the PIN has been set
    if (typedResponse && typedResponse.success) {
      document.cookie = `pin_set=true; path=/; SameSite=Lax`;
    }
    
    return typedResponse;
  } catch (unknownError) {
    console.error('Error setting PIN:', unknownError);
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    // Return a standardized error response
    return {
      success: false,
      message: error.message || 'Failed to set PIN. Please try again.'
    };
  }
};

// VTPass API functions
export const getVTPassBalance = async (): Promise<{ balance: number }> => {
  try {
    const response = await apiRequest('/users/balance/');
    const typedResponse = response as { 
      data?: { balance?: string | number },
      balance?: string | number
    };
    
    // Ensure we're returning a properly formatted balance object
    if (typedResponse.data && typeof typedResponse.data.balance === 'string') {
      // Convert string balance to number
      return { balance: parseFloat(typedResponse.data.balance) };
    } else if (typedResponse.data && typeof typedResponse.data.balance === 'number') {
      // Already a number
      return { balance: typedResponse.data.balance };
    } else if (typeof typedResponse.balance === 'number') {
      // Direct balance property
      return { balance: typedResponse.balance };
    } else if (typeof typedResponse.balance === 'string') {
      // Balance as string
      return { balance: parseFloat(typedResponse.balance) };
    }
    
    // Default fallback
    return { balance: 0 };
  } catch (error) {
    console.error('Error fetching balance:', error);
    return { balance: 0 };
  }
};

export const getVTPassServices = async (serviceType: string): Promise<unknown> => {
  interface VTPassServiceResponse {
    code?: string;
    response_description?: string;
    content?: { 
      message?: string;
      useDefaults?: boolean;
      [key: string]: unknown;
    };
  }

  try {
    console.log(`Fetching VTPass services for type: ${serviceType}`);
    
    // Add timeout to prevent hanging requests - increase to 20 seconds to give more time
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    try {
      const rawResponse = await apiRequest(`/users/services/${serviceType}/`, 'GET', undefined, true, controller.signal);
      clearTimeout(timeoutId);
      
      // Type casting for safe property access
      const response = rawResponse as VTPassServiceResponse;
      
      // Check for empty or invalid response
      if (!response || !response.content) {
        console.warn(`Empty or invalid response from VTPass for ${serviceType}`);
        return {
          code: "error",
          response_description: "Invalid response from VTPass",
          content: { 
            message: "Using default bundles",
            useDefaults: true 
          }
        };
      }
      
      console.log(`VTPass services response for ${serviceType}:`, response);
      return response;
    } catch (unknownErr) {
      clearTimeout(timeoutId);
      
      // Type casting for error
      const err = unknownErr instanceof Error ? unknownErr : new Error(String(unknownErr));
      
      if (err.name === 'AbortError') {
        console.error(`VTPass services request timed out for ${serviceType}`);
        // Return a "soft error" response instead of throwing
        return {
          code: "timeout", 
          response_description: "Request timed out", 
          content: { 
            message: "Using default bundles",
            useDefaults: true 
          }
        };
      }
      
      // Return a nicely formatted error that won't crash the UI
      return {
        code: "error",
        response_description: err.message || "Connection error",
        content: { 
          message: "Using default bundles",
          useDefaults: true 
        }
      };
    }
  } catch (unknownError) {
    console.error(`Error fetching VTPass services for ${serviceType}:`, unknownError);
    
    // Type casting for error
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    
    // Return a "soft error" response instead of throwing
    return {
      code: "error",
      response_description: error.message || "Unknown error",
      content: { 
        message: "Using default bundles",
        useDefaults: true 
      }
    };
  }
};

export const purchaseService = async (purchaseData: PurchaseData, signal?: AbortSignal): Promise<unknown> => {
  try {
    console.log("API: Sending purchase request with data:", purchaseData);
    
    // Create request options with signal if provided
    const options: {
      method: string;
      data: PurchaseData;
      signal?: AbortSignal;
    } = {
      method: 'POST',
      data: purchaseData
    };
    
    if (signal) {
      options.signal = signal;
    }
    
    const rawResponse = await apiRequest('/users/purchase/', 'POST', purchaseData, true, signal);
    console.log("API: Purchase response received:", rawResponse);
    
    // Type assertion for response to access properties safely
    interface VTPassResponse {
      code?: string;
      content?: {
        transactions?: {
          status?: string;
        }
      };
      response?: {
        code?: string;
        content?: {
          transactions?: {
            status?: string;
          }
        };
        response_description?: string;
        error_message?: string;
      };
    }
    
    // Cast the response to our expected type
    const response = rawResponse as VTPassResponse;
    
    // Check for successful transaction codes
    if (response) {
      if (response.code === '000' || 
          response.code === '01' || 
          (response.content?.transactions && 
           (response.content.transactions.status === 'delivered' || 
            response.content.transactions.status === 'successful'))) {
        // This is a successful transaction
        console.log("API: Detected successful transaction with code:", response.code);
        return response;
      }
      
      // Check if the transaction failed but still has a response
      if (response.response) {
        const vtpassResponse = response.response;
        
        // Success check - VTPass sometimes puts success info in the response field
        if (vtpassResponse.code === "000" || 
            (vtpassResponse.content?.transactions && 
             (vtpassResponse.content.transactions.status === 'delivered' || 
              vtpassResponse.content.transactions.status === 'successful'))) {
          console.log("API: Detected successful transaction in response field");
          return vtpassResponse;
        }
        
        // Handle VTPass specific error codes
        if (vtpassResponse.code === "016" || 
            vtpassResponse.code === "010" || 
            (vtpassResponse.content?.transactions && 
             vtpassResponse.content.transactions.status === "failed")) {
          // Create a detailed error message with information from VTPass
          const errorMessage = vtpassResponse.response_description || vtpassResponse.error_message || "Transaction failed on VTPass";
          const error = new Error(errorMessage);
          (error as AppError).responseData = vtpassResponse;
          (error as AppError).managedError = true;
          (error as AppError).handled = true;
          
          // Prevent the error from showing in console
          const errorWithPrevent = error as unknown as { preventDefault: () => void };
          errorWithPrevent.preventDefault = () => {};
          
          throw error;
        }
      }
    }
    
    return rawResponse;
  } catch (unknownError) {
    console.error("API purchaseService error:", unknownError);
    
    // Cast the unknown error to a proper type
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    
    // Handle timeout/abort errors specifically
    if (error.name === 'AbortError') {
      throw error; // Let the timeout be handled by the caller
    }
    
    // Mark the error as handled to prevent console errors
    const handledError = error as unknown as { handled?: boolean };
    handledError.handled = true;
    
    // Prevent error from showing in console
    const errorWithPrevent = error as unknown as { preventDefault?: () => void };
    if (typeof errorWithPrevent.preventDefault !== 'function') {
      errorWithPrevent.preventDefault = () => {};
    }
    
    // Rethrow error for handling in the component
    throw error;
  }
};

export const getTransactionStatus = async (requestId: string): Promise<unknown> => {
  return apiRequest(`/users/transaction-status/${requestId}/`);
};

export const getUserTransactions = async (): Promise<Transaction[]> => {
  const result = await apiRequest('/users/transactions/');
  return result as Transaction[];
};

/**
 * Fetch dashboard statistics
 * @returns Dashboard statistics or null if there was an error
 */
export const getDashboardStats = async (): Promise<DashboardStats | null> => {
  try {
    const tokens = getTokens();
    if (!tokens) {
      toast.error('You need to be logged in to fetch dashboard statistics');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/users/dashboard/stats/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.access}`
      }
    });

    if (!response.ok) {
      console.error('Error fetching dashboard statistics:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return null;
  }
};

export interface FundWalletData {
  amount: number;
  payment_method: 'bank_transfer' | 'card' | 'ussd';
  transaction_reference?: string;
}

export interface FundingResponse {
  success: boolean;
  message: string;
  transaction: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
  };
  updated_balance?: number;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: string;
  message: string;
  transaction?: Transaction;
}

// Wallet Funding APIs
export const fundWallet = async (fundingData: FundWalletData): Promise<FundingResponse> => {
  const result = await apiRequest('/users/fund-wallet/', 'POST', fundingData);
  return result as FundingResponse;
};

export const checkPaymentStatus = async (transactionReference: string): Promise<PaymentStatusResponse> => {
  const result = await apiRequest(`/users/payment-status/${transactionReference}/`);
  return result as PaymentStatusResponse;
};