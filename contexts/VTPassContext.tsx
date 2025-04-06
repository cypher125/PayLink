"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { 
  getVTPassBalance, 
  getVTPassServices, 
  purchaseService, 
  getTransactionStatus,
  getUserTransactions,
  PurchaseData,
  Transaction
} from '@/lib/api';
import { useAuth } from './AuthContext';

// Add interface definitions for API responses
interface VTPassBalanceResponse {
  code?: string;
  data?: {
    balance: string;
  };
  balance?: number;
}

interface VTPassServicesResponse {
  code?: string;
  content?: any[];
  response?: {
    content?: any[];
  };
}

interface VTPassTransactionResponse {
  transaction?: {
    status?: string;
  };
  response?: {
    transaction?: {
      status?: string;
    }
  };
  code?: string;
}

interface VTPassContextType {
  balance: string | null;
  services: any[];
  transactions: Transaction[];
  isLoadingBalance: boolean;
  isLoadingServices: boolean;
  isLoadingTransactions: boolean;
  fetchBalance: () => Promise<void>;
  fetchServices: (serviceType: string) => Promise<any[]>;
  makePurchase: (purchaseData: PurchaseData) => Promise<any>;
  checkTransactionStatus: (requestId: string) => Promise<any>;
  fetchTransactions: () => Promise<void>;
}

const VTPassContext = createContext<VTPassContextType | undefined>(undefined);

export const useVTPass = () => {
  const context = useContext(VTPassContext);
  if (context === undefined) {
    throw new Error('useVTPass must be used within a VTPassProvider');
  }
  return context;
};

interface VTPassProviderProps {
  children: ReactNode;
}

export const VTPassProvider: React.FC<VTPassProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);

  const fetchBalance = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingBalance(true);
    try {
      const response = await getVTPassBalance() as unknown as VTPassBalanceResponse;
      if (response.code === "success" && response.data) {
        setBalance(response.data.balance);
      } else if (response.balance !== undefined) {
        // Handle direct balance response format
        setBalance(response.balance.toString());
      } else {
        setBalance("0.00");
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      toast.error('Failed to fetch balance');
      setBalance("0.00");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchServices = async (serviceType: string): Promise<any[]> => {
    if (!isAuthenticated) return [];
    
    setIsLoadingServices(true);
    try {
      const response = await getVTPassServices(serviceType) as unknown as VTPassServicesResponse;
      if (response.code === "success" && response.content) {
        setServices(response.content);
        return response.content;
      } else if (response.response?.content) {
        // Handle nested response format
        setServices(response.response.content);
        return response.response.content;
      } else {
        setServices([]);
        return [];
      }
    } catch (error) {
      console.error(`Failed to fetch ${serviceType} services:`, error);
      toast.error(`Failed to fetch services`);
      setServices([]);
      return [];
    } finally {
      setIsLoadingServices(false);
    }
  };

  const makePurchase = async (purchaseData: PurchaseData) => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to make a purchase');
      return null;
    }

    try {
      console.log("VTPassContext: Making purchase with data:", purchaseData);
      
      // Add timeout to prevent endless processing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await purchaseService(purchaseData, controller.signal) as unknown as VTPassTransactionResponse;
        clearTimeout(timeoutId);
        
        console.log("VTPassContext: Purchase response:", response);
        
        // Check different possible response formats
        const isSuccessful = 
          (response.transaction?.status === 'successful') || 
          (response.response?.transaction?.status === 'successful');
        
        if (response && isSuccessful) {
          toast.success('Purchase successful!');
          // Refresh transactions and balance
          fetchTransactions();
          fetchBalance();
        } else if (response) {
          toast.info('Purchase is being processed. Check transactions for updates.');
        }
        
        return response;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        
        if ((err as any).name === 'AbortError') {
          console.error('Purchase request timed out');
          throw new Error('The purchase request timed out. Please check your network connection and try again.');
        }
        
        throw err;
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      
      // Create a proper error response object if one doesn't exist
      let errorResponse = { 
        code: "error", 
        response_description: error.message || "Purchase failed", 
        error_message: error.message || "An unknown error occurred"
      };
      
      // Return the error response to be handled by the caller
      return errorResponse;
    }
  };

  const checkTransactionStatus = async (requestId: string) => {
    if (!isAuthenticated) return null;

    try {
      const response = await getTransactionStatus(requestId);
      // Refresh transactions and balance
      fetchTransactions();
      fetchBalance();
      return response;
    } catch (error) {
      console.error('Failed to check transaction status:', error);
      toast.error('Failed to check transaction status');
      return null;
    }
  };

  const fetchTransactions = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingTransactions(true);
    try {
      const response = await getUserTransactions();
      setTransactions(response);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  return (
    <VTPassContext.Provider
      value={{
        balance,
        services,
        transactions,
        isLoadingBalance,
        isLoadingServices,
        isLoadingTransactions,
        fetchBalance,
        fetchServices,
        makePurchase,
        checkTransactionStatus,
        fetchTransactions
      }}
    >
      {children}
    </VTPassContext.Provider>
  );
};
