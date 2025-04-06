"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import { getUserTransactions, Transaction as ApiTransaction } from "@/lib/api"
import toast from "@/lib/toast"
import { formatDistanceToNow } from "date-fns"
import TransactionDetailsClient from "./TransactionDetailsClient"

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

interface UITransaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  reference: string;
  paymentMethod: string;
  fee: number;
  service_id?: string;
  phone_number?: string;
  email?: string;
  // New fields for VTPass integration
  vtpass_reference?: string;
  request_id?: string;
  response_data?: any;
  api_status?: string;
  delivered_status?: string;
  transaction_date?: string;
  formatted_time?: string;
  transaction_type?: string;
  transaction_type_display?: string;
  service_name?: string;
}

// Create a new file that doesn't implement any PageProps interface
// Instead, just accept the id as a direct parameter
export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  // We need to access the id from the params object
  const { id } = params;

  const [transaction, setTransaction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)
  
        // Fetch all transactions
        const transactions = await getUserTransactions()
        
        if (!transactions || !Array.isArray(transactions)) {
          throw new Error("Could not fetch transactions")
        }
        
        // Find the transaction with the matching ID
        const foundTransaction = transactions.find(tx => tx.id === id)
        
        if (!foundTransaction) {
          throw new Error("Transaction not found")
        }
        
        // Process the transaction for UI display
        const processedTransaction = processTransaction(foundTransaction)
        setTransaction(processedTransaction)
        
      } catch (error) {
        console.error("Error fetching transaction details:", error)
        setError("Failed to load transaction details")
        toast.error("Failed to load transaction details")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTransactionDetails()
  }, [id])

  return <TransactionDetailsClient id={id} />;
}

