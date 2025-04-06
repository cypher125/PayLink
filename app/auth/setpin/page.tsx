"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import toast from "@/lib/toast"
import { z } from "zod"
import { Loader2 } from "lucide-react"

// PIN validation schema
const pinSchema = z.object({
  pin: z.string().length(4).regex(/^\d+$/, "PIN must contain only numbers")
})

export default function SetPinPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [pin, setInputPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Redirect to dashboard if user already has a PIN
  useEffect(() => {
    if (!authLoading && user && user.has_pin) {
      // Use setTimeout to avoid state updates during render cycle
      setTimeout(() => {
        // Use direct window.location for more reliable navigation
        window.location.href = "/dashboard"
      }, 0)
    }
  }, [user, authLoading, router])

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate PINs
    if (pin !== confirmPin) {
      setError("PINs do not match")
      return
    }

    try {
      // Validate using zod
      pinSchema.parse({ pin })
      
      setIsSubmitting(true)
      
      // Using a direct fetch call to avoid JSON parsing issues
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/users/set-pin/`
      const tokens = localStorage.getItem('auth_tokens')
      const parsedTokens = tokens ? JSON.parse(tokens) : null
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parsedTokens?.access || ''}`
        },
        body: JSON.stringify({
          pin: pin,
          pin_confirm: confirmPin
        }),
        credentials: 'include'
      })
      
      let success = false
      let message = ''
      
      try {
        const data = await response.json()
        success = data.success || response.ok
        message = data.message || 'PIN set successfully'
      } catch (jsonError) {
        console.error('Error parsing response:', jsonError)
        success = response.ok
        message = response.ok ? 'PIN set successfully' : 'Failed to set PIN'
      }
      
      setIsSubmitting(false)
      
      if (success) {
        // Set pin_set cookie
        document.cookie = `pin_set=true; path=/; SameSite=Lax`
        
        // Use setTimeout to avoid React state updates during render
        setTimeout(() => {
          toast.success("PIN set successfully!")
          
          // Wait before redirecting to avoid React render cycle issues
          setTimeout(() => {
            // Force a hard navigation to dashboard
            window.location.href = "/dashboard"
          }, 300)
        }, 0)
      } else {
        setError(message || "Failed to set PIN")
        // Use setTimeout to avoid React state updates during render
        setTimeout(() => {
          toast.error(message || "Failed to set PIN")
        }, 0)
      }
    } catch (error: any) {
      console.error("Error setting PIN:", error)
      let errorMessage = "Failed to set PIN"
      
      if (error.errors) {
        // Handle zod validation errors
        errorMessage = error.errors[0]?.message || errorMessage
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      setIsSubmitting(false)
      
      // Use setTimeout to avoid React state updates during render
      setTimeout(() => {
        toast.error(errorMessage)
      }, 0)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-sm">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-[#0A2357]/10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-[#0A2357]"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Set Transaction PIN</h2>
          <p className="mt-2 text-gray-600">
            Create a 4-digit PIN for authorizing transactions
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSetPin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                PIN (4 digits)
              </label>
              <Input
                id="pin"
                name="pin"
                type="password"
                maxLength={4}
                autoComplete="new-password"
                required
                value={pin}
                onChange={(e) => setInputPin(e.target.value)}
                className="mt-1 h-12"
                placeholder="Enter 4-digit PIN"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700">
                Confirm PIN
              </label>
              <Input
                id="confirmPin"
                name="confirmPin"
                type="password"
                maxLength={4}
                autoComplete="new-password"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="mt-1 h-12"
                placeholder="Confirm 4-digit PIN"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm pt-2">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full h-12 bg-[#0A2357] hover:bg-[#0A2357]/90"
              disabled={isSubmitting || pin.length !== 4 || confirmPin.length !== 4}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting PIN...
                </div>
              ) : (
                "Set PIN & Continue"
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm">
          <p className="text-gray-600">
            Your PIN is used to authorize transactions and 
            cannot be recovered if forgotten.
          </p>
        </div>
      </div>
    </div>
  )
}
